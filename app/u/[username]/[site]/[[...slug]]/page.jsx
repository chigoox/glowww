'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import pako from 'pako';
import { useParams } from 'next/navigation';
import { Editor, Element, Frame } from '@craftjs/core';

// Craft user components (same set used in Preview)
import { Box } from '../../../../Components/user/Layout/Box';
import { FlexBox } from '../../../../Components/user/Layout/FlexBox';
import { Text } from '../../../../Components/user/Text/Text';
import { GridBox } from '../../../../Components/user/Layout/GridBox';
import { Image } from '../../../../Components/user/Media/Image';
import { Button } from '../../../../Components/user/Interactive/Button';
import { Link } from '../../../../Components/user/Interactive/Link';
import { Paragraph } from '../../../../Components/user/Text/Paragraph';
import { Video } from '../../../../Components/user/Media/Video';
import { ShopFlexBox, ShopImage, ShopText } from '../../../../Components/user/Advanced/ShopFlexBox';
import { FormInput } from '../../../../Components/user/Input';
import { Form, FormInputDropArea } from '../../../../Components/user/Advanced/Form';
import { Carousel } from '../../../../Components/user/Media/Carousel';
import { NavBar, NavItem } from '../../../../Components/user/Nav/NavBar';
import { Root } from '../../../../Components/core/Root';

import { getPublicSite, getSitePages, getPage } from '../../../../../lib/sites';
import { MultiSelectProvider } from '../../../../Components/utils/context/MultiSelectContext';
import { PagesProvider } from '../../../../Components/utils/context/PagesContext';
import { init as gaInit, pageView as gaPageView, viewItem as gaViewItem } from '../../../../Components/utils/analytics';

// Lightweight placeholders; you can replace with real components later
const ShopView = ({ username, siteName }) => (
  <div className="min-h-screen bg-white">
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">Shop</h1>
      <p className="text-gray-500 mt-2">/{username}/{siteName}/shop</p>
      {/* TODO: Replace with your dedicated Shop component */}
    </div>
  </div>
);

const ItemView = ({ username, siteName, itemId }) => (
  <div className="min-h-screen bg-white">
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">Item</h1>
      <p className="text-gray-500 mt-2">/{username}/{siteName}/shop/{itemId}</p>
      {/* TODO: Replace with your dedicated Item component; perform product lookup by ID/handle */}
    </div>
  </div>
);

export default function PublishedSitePage() {
  const { username, site, slug: rawSlug } = useParams();

  const slug = useMemo(() => (Array.isArray(rawSlug) ? rawSlug : rawSlug ? [rawSlug] : []), [rawSlug]);
  const slugPath = useMemo(() => slug.join('/'), [slug]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [siteInfo, setSiteInfo] = useState(null); // { id, userId, ... }
  const [pages, setPages] = useState([]); // metadata list
  const [pageContent, setPageContent] = useState(null); // serialized nodes (object or string)
  const [pageTitle, setPageTitle] = useState('');
  // Sanitized frame + error (must be declared before any conditional return to preserve hook order)
  const [sanitizedFrame, setSanitizedFrame] = useState(null);
  const [sanitizeError, setSanitizeError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null); // Store debug info

  // Debug panel state
  const [showDebug, setShowDebug] = useState(false);
  const [debugView, setDebugView] = useState('original'); // 'original' | 'content' | 'frame' | 'compressed'

  // Helpers to find page by path similar to Preview
  const buildPagePath = (page, pagesByIdOrKey) => {
    if (page.isHome) return '';
    const pathSegments = [];
    let current = page;
    while (current && !current.isHome) {
      // Prefer key if present
      if (current.key) pathSegments.unshift(current.key);
      else if (current.slug) pathSegments.unshift(current.slug);
      else if (current.name) pathSegments.unshift(String(current.name).toLowerCase().replace(/[^a-z0-9]/g, '-'));
      current = current.parentKey ? pagesByIdOrKey[current.parentKey] : null;
    }
    return pathSegments.join('/');
  };

  const findPageMetaByPath = (allPages, urlPath) => {
    if (!allPages?.length) return null;
    if (!urlPath) return allPages.find(p => p.isHome);

    // Normalize (remove leading/trailing slashes)
    const norm = urlPath.replace(/^\/+/,'').replace(/\/+$/,'');

    const pagesByKey = {};
    allPages.forEach(p => { if (p.key) pagesByKey[p.key] = p; });

    // Exact matches based on known properties
    const map = {};
    allPages.forEach(p => {
      if (p.path) map[p.path.replace(/^\/+/, '')] = p;
      if (p.key && p.key !== 'home') map[p.key] = p;
      if (p.slug) map[p.slug] = p;
      // Include document id to support routes like /u/user/site/<pageId>
      if (p.id) map[p.id] = p;
    });
    if (map[norm]) return map[norm];

    // Hierarchical reconstruction
    for (const p of allPages) {
      if (p.isHome) continue;
      const full = buildPagePath(p, pagesByKey);
      if (full === norm) return p;
    }

    // Fallback fuzzy: last segment matches key/slugified title/id
    const segments = norm.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]/g,'-');
    const fuzzy = allPages.find(p => p.key === last || p.id === last || (p.title && slugify(p.title) === last) || (p.slug && p.slug === last));
    if (fuzzy) return fuzzy;

    // SECOND PASS (enhanced E): case-insensitive slug compare across full path
    const normLower = norm.toLowerCase();
    const second = allPages.find(p => {
      const candidates = [p.key, p.slug, p.id, p.title && slugify(p.title)];
      return candidates.filter(Boolean).some(c => String(c).toLowerCase() === normLower);
    });
    return second || null;
  };

  // Error classification (D)
  const classifyError = (e) => {
    const msg = (e?.message || '').toLowerCase();
    const code = e?.code || (msg.includes('not found') ? 'NOT_FOUND' : undefined);
    const transientPatterns = ['unavailable', 'deadline', 'resource-exhausted', 'network', 'failed to fetch'];
    const transient = transientPatterns.some(p => msg.includes(p));
    const decompression = e?.code === 'DECOMPRESS_FAIL';
    const notFound = code === 'NOT_FOUND' || msg.includes('site not found') || msg.includes('page not found');
    return { code: decompression ? 'DECOMPRESS_FAIL' : (code || 'UNKNOWN'), transient, decompression, notFound, message: e?.message || 'Unknown error' };
  };

  // Retry helper (B)
  const withRetry = useCallback(async (fn, { attempts = 3, baseDelay = 180 } = {}) => {
    let lastErr;
    for (let i = 1; i <= attempts; i++) {
      try {
        return await fn(i);
      } catch (e) {
        lastErr = e;
        const cls = classifyError(e);
        if (!cls.transient || i === attempts) throw e;
        const delay = baseDelay * i + Math.random() * 120;
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw lastErr;
  }, []);

  const [attempt, setAttempt] = useState(0);
  const [lastErrorInfo, setLastErrorInfo] = useState(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Quick debug toggle: append ?dbg=1 to the URL to show internal state overlay
  const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dbg') === '1';

  // Debug functions
  const debugFunctions = {
    logPageContent: () => {
      console.log('[Debug] Page Content:', pageContent);
    },
    logFrameData: () => {
      console.log('[Debug] Sanitized Frame:', sanitizedFrame);
      const frameData = JSON.stringify(sanitizedFrame);
      console.log('[Debug] Frame Data String:', frameData);
    },
    validateNodes: () => {
      if (sanitizedFrame && typeof sanitizedFrame === 'object') {
        const nodes = Object.keys(sanitizedFrame);
        console.log('[Debug] Node validation:');
        nodes.forEach(nodeId => {
          const node = sanitizedFrame[nodeId];
          const hasType = node?.type?.resolvedName;
          const hasProps = node?.props;
          console.log(`  ${nodeId}: type=${hasType || 'MISSING'}, props=${!!hasProps}`);
        });
      }
    },
    testCraftValidation: () => {
      if (sanitizedFrame) {
        const validateForCraft = (frame) => {
          if (!frame || typeof frame !== 'object') return false;
          try {
            for (const [nodeId, node] of Object.entries(frame)) {
              if (!node || typeof node !== 'object') {
                console.error('[Debug] Invalid node (not object):', nodeId);
                return false;
              }
              if (nodeId !== 'ROOT') {
                if (!node.type) {
                  console.error('[Debug] Missing type:', nodeId);
                  return false;
                }
                const typeObj = node.type;
                const hasResolver = typeof typeObj === 'string' || 
                                   (typeObj && (typeObj.resolvedName || typeObj.displayName || typeObj.name));
                if (!hasResolver) {
                  console.error('[Debug] Invalid type structure:', nodeId, typeObj);
                  return false;
                }
              }
            }
            return true;
          } catch (err) {
            console.error('[Debug] Validation error:', err);
            return false;
          }
        };
        const result = validateForCraft(sanitizedFrame);
        console.log('[Debug] Craft validation result:', result);
      }
    },
    exportDebugData: () => {
      const data = {
        username,
        site,
        slug: rawSlug,
        slugPath,
        pageTitle,
        pageContent,
        sanitizedFrame,
        siteInfo,
        pages: pages.length,
        debugInfo,
        timestamp: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `published-debug-${username}-${site}-${slugPath || 'home'}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const triggerManualRetry = () => {
    setAttempt(0);
    setLastErrorInfo(null);
    setReloadNonce(n => n + 1);
  };

  // --- Decompression + sanitation pipeline ---------------------------------
  // pageContent at this point should already be an object (getPage decompresses).
  // Guard against legacy raw or double-compressed values.
  useEffect(() => {
    try {
      if (!pageContent) {
        setSanitizedFrame(null);
        return;
      }
      
      let frameObj = pageContent;
      // If still a string, attempt JSON parse (no compression expected here now)
      if (typeof frameObj === 'string') {
        try {
          frameObj = JSON.parse(frameObj);
        } catch (parseErr) {
          // Heuristic: maybe it's base64 compressed (should not happen normally)
          if (/^[A-Za-z0-9+/=]+$/.test(frameObj.slice(0, 50))) {
            try {
              const bin = atob(frameObj);
              const bytes = new Uint8Array(bin.length);
              for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
              const inflated = pako.inflate(bytes, { to: 'string' });
              frameObj = JSON.parse(inflated);
            } catch (deepErr) {
              throw deepErr;
            }
          } else {
            throw parseErr;
          }
        }
      }

      if (!frameObj || typeof frameObj !== 'object') throw new Error('Frame not an object');

      // Enhanced node validation and pruning
      const nodes = { ...frameObj };
      const invalidIds = new Set();
      
      console.log('[PublishedSitePage] Starting sanitization, node count:', Object.keys(nodes).length);
      
      // First pass: identify invalid nodes with more thorough checking
      for (const [id, node] of Object.entries(nodes)) {
        if (id === 'ROOT') continue;
        
        // Check if node exists and is an object
        if (!node || typeof node !== 'object') {
          console.log('[PublishedSitePage] Invalid node (not object):', id, node);
          invalidIds.add(id);
          continue;
        }
        
        // Check for type property with various possible structures
        const hasValidType = node.type && (
          typeof node.type === 'string' ||
          (typeof node.type === 'object' && (
            node.type.resolvedName || 
            node.type.displayName || 
            node.type.name ||
            node.type._payload // For lazy components
          ))
        );
        
        if (!hasValidType) {
          console.log('[PublishedSitePage] Invalid node (no valid type):', id, {
            nodeKeys: Object.keys(node),
            typeInfo: node.type
          });
          invalidIds.add(id);
          continue;
        }
        
        // Additional validation: check for circular references or malformed data
        try {
          JSON.stringify(node);
        } catch (circularErr) {
          console.log('[PublishedSitePage] Invalid node (circular ref):', id);
          invalidIds.add(id);
        }
      }
      
      // Second pass: remove invalid nodes
      if (invalidIds.size) {
        console.log('[PublishedSitePage] Removing invalid nodes:', Array.from(invalidIds));
        for (const bad of invalidIds) {
          delete nodes[bad];
        }
      }
      
      // Third pass: clean up references to removed nodes
      for (const [id, node] of Object.entries(nodes)) {
        if (!node || typeof node !== 'object') continue;
        
        // Clean child node references
        if (Array.isArray(node.nodes)) {
          const originalLength = node.nodes.length;
          node.nodes = node.nodes.filter(cid => !invalidIds.has(cid) && nodes[cid]);
          if (node.nodes.length !== originalLength) {
            console.log(`[PublishedSitePage] Cleaned ${originalLength - node.nodes.length} orphan child refs from ${id}`);
          }
        }
        
        // Clean linked node references
        if (Array.isArray(node.linkedNodes)) {
          const originalLength = node.linkedNodes.length;
          node.linkedNodes = node.linkedNodes.filter(cid => !invalidIds.has(cid) && nodes[cid]);
          if (node.linkedNodes.length !== originalLength) {
            console.log(`[PublishedSitePage] Cleaned ${originalLength - node.linkedNodes.length} orphan linked refs from ${id}`);
          }
        }
        
        // Clean parent references
        if (node.parent && (invalidIds.has(node.parent) || !nodes[node.parent])) {
          console.log(`[PublishedSitePage] Cleaned orphan parent ref from ${id}: ${node.parent}`);
          delete node.parent;
        }
      }

      // Fourth pass: inject Button defaults & normalize type objects
      for (const [id, node] of Object.entries(nodes)) {
        if (!node || typeof node !== 'object') continue;
        // Normalize type: if string, convert to object with resolvedName
        if (typeof node.type === 'string') {
          node.type = { resolvedName: node.type };
        } else if (node.type && typeof node.type === 'object' && !node.type.resolvedName) {
          // Promote any known name/displayName to resolvedName
          const candidate = node.type.displayName || node.type.name;
          if (candidate) node.type.resolvedName = candidate;
        }
        if (node.type?.resolvedName === 'Button' || node.type?.resolvedName === 'CraftButton') {
          const props = (node.props && typeof node.props === 'object') ? node.props : (node.props = {});
          const requiredDefaults = {
            text: 'Click Me',
            backgroundColor: '#1890ff',
            color: '#ffffff',
            padding: '8px 16px',
            margin: '5px 0',
            display: 'inline-flex',
            fontSize: 14,
            fontWeight: '400',
            border: '1px solid #1890ff',
            borderRadius: 6,
            buttonType: 'primary',
            size: 'medium',
            hidden: false
          };
          let injected = false;
          for (const [k,v] of Object.entries(requiredDefaults)) {
            if (props[k] === undefined) { props[k] = v; injected = true; }
          }
          if (injected) {
            console.info('[PublishedSitePage] Injected Button defaults for node', id);
          }
        }
      }

      // Fifth pass: ensure all referenced child/linked node IDs exist; create placeholders otherwise
      const referenced = new Set();
      for (const node of Object.values(nodes)) {
        if (!node || typeof node !== 'object') continue;
        if (Array.isArray(node.nodes)) node.nodes.forEach(cid => referenced.add(cid));
        if (Array.isArray(node.linkedNodes)) node.linkedNodes.forEach(cid => referenced.add(cid));
      }
      const missingRefs = Array.from(referenced).filter(id => !nodes[id]);
      if (missingRefs.length) {
        console.warn('[PublishedSitePage] Creating placeholder Text nodes for missing references:', missingRefs);
        missingRefs.forEach(mid => {
          nodes[mid] = {
            type: { resolvedName: 'Text' },
            isCanvas: false,
            props: { text: '[Missing node replaced]' },
            displayName: 'Text',
            custom: {},
            hidden: false,
            parent: 'ROOT',
            nodes: [],
            linkedNodes: {}
          };
          // Attach to ROOT to keep a valid parent chain if not already referenced elsewhere
          if (nodes.ROOT && Array.isArray(nodes.ROOT.nodes) && !nodes.ROOT.nodes.includes(mid)) {
            nodes.ROOT.nodes.push(mid);
          }
        });
      }
      
      // Final validation: ensure ROOT exists and has valid structure
      if (!nodes.ROOT) {
        console.log('[PublishedSitePage] Adding missing ROOT node');
        nodes.ROOT = {
          type: { resolvedName: "Root" },
          isCanvas: true,
          props: {},
          displayName: "Root",
          custom: {},
          hidden: false,
          nodes: [],
          linkedNodes: {}
        };
      }
      
      console.log('[PublishedSitePage] Sanitization complete:', {
        originalNodes: Object.keys(frameObj).length,
        finalNodes: Object.keys(nodes).length,
        removedCount: invalidIds.size,
        rootChildCount: nodes.ROOT?.nodes?.length || 0
      });
      
      setSanitizedFrame(nodes);
      setSanitizeError(null);
    } catch (err) {
      console.error('[PublishedSitePage] sanitize pipeline failed', err);
      setSanitizeError(err.message || 'Sanitize failed');
    }
  }, [pageContent]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      setLastErrorInfo(null);
      try {
        const pubSite = await withRetry(async (i) => {
          setAttempt(i);
          const s = await getPublicSite(username, site);
          if (!s) {
            const err = new Error('Site not found or not published');
            err.code = 'NOT_FOUND';
            throw err;
          }
          return s;
        });
        if (!isMounted) return;
        setSiteInfo(pubSite);

        const pageList = await withRetry(async () => await getSitePages(pubSite.userId, pubSite.id));
        if (!isMounted) return;
        setPages(pageList);
        
        // Store debug info
        setDebugInfo({
          site: pubSite,
          pages: pageList.length,
          loadTime: Date.now(),
          slugPath
        });

        if (slug[0] === 'shop') {
          setPageContent(null);
          setPageTitle('Shop');
          const ctx = { siteId: pubSite.id, siteName: pubSite.name, username, userUid: pubSite.userId };
          gaInit(ctx);
          const itemId = slug[1];
            if (itemId) gaViewItem({ item_id: itemId }, ctx); else gaPageView({}, ctx);
          return;
        }

        const target = findPageMetaByPath(pageList, slugPath);
        if (!target) {
          const nf = new Error(`Page not found: /${slugPath}`);
          nf.code = 'NOT_FOUND';
          throw nf;
        }
        const fullPage = await withRetry(async () => await getPage(pubSite.userId, pubSite.id, target.id));
        if (!isMounted) return;
        const title = fullPage.title || target.name || '';
        setPageTitle(title);
        setPageContent(fullPage.content || null);
        const ctx = { siteId: pubSite.id, siteName: pubSite.name, username, userUid: pubSite.userId };
        gaInit(ctx);
        gaPageView({ page_title: title }, ctx);
      } catch (e) {
        if (!isMounted) return;
        const info = classifyError(e);
        setLastErrorInfo(info);
        setError(info.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [username, site, slugPath, reloadNonce]);

  // Loading state
  if (loading) {
    if (isDebug) {
      return (
        <div style={{ padding: 20, background: '#fff' }}>
          <h3>DEBUG: Loading</h3>
          <pre style={{whiteSpace: 'pre-wrap', maxHeight: '60vh', overflow: 'auto'}}>{JSON.stringify({ username, site, slug, slugPath, loading, error }, null, 2)}</pre>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-700">Loading site…</h2>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    if (isDebug) {
      return (
        <div style={{ padding: 20, background: '#fff' }}>
          <h3>DEBUG: Error</h3>
          <pre style={{whiteSpace: 'pre-wrap'}}>{JSON.stringify({ error, lastErrorInfo, username, site, slugPath }, null, 2)}</pre>
        </div>
      );
    }
    const transient = lastErrorInfo?.transient;
    const notFound = lastErrorInfo?.notFound;
    const decompression = lastErrorInfo?.code === 'DECOMPRESS_FAIL';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {notFound ? 'Not found' : decompression ? 'Content error' : transient ? 'Temporary issue' : 'Unable to load'}
            </h2>
            <p className="text-gray-600 text-sm whitespace-pre-line">
              {notFound && 'The requested site or page could not be located.'}
              {decompression && 'This page\'s content appears corrupted. Try again; if it persists, republish the page.'}
              {transient && 'A temporary network or Firestore issue occurred. It will often work on retry.'}
              {!notFound && !decompression && !transient && error}
            </p>
            {attempt > 1 && transient && (
              <p className="text-xs text-gray-400 mt-2">Attempts: {attempt}</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={triggerManualRetry}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none"
            >
              Retry
            </button>
            {transient && (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 focus:outline-none"
              >Full Reload</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Shop or Item routes
  if (slug[0] === 'shop') {
    const itemId = slug[1];
    if (itemId) {
      return <ItemView username={username} siteName={site} itemId={itemId} />;
    }
    return <ShopView username={username} siteName={site} />;
  }

  // No content found for a matched page
  if (!pageContent) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">No content</h2>
          <p className="text-gray-500 mt-1">This page has no content yet.</p>
        </div>
      </div>
    );
  }

  if (sanitizeError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Content error</h2>
          <p className="text-gray-600 text-sm">{sanitizeError}</p>
        </div>
      </div>
    );
  }

  if (!sanitizedFrame) {
    return null; // interim while sanitizing
  }

  // Render Craft page in read-only mode
  const frameData = JSON.stringify(sanitizedFrame);
  const parsedFrame = sanitizedFrame;
  const rootNodes = parsedFrame?.ROOT?.nodes || [];

  // Final validation before Craft deserialization - this should catch any remaining issues
  const validateForCraft = (frame) => {
    if (!frame || typeof frame !== 'object') return false;
    
    try {
      // Test if Craft.js can handle this structure by validating all nodes
      for (const [nodeId, node] of Object.entries(frame)) {
        if (!node || typeof node !== 'object') {
          console.error('[PublishedSitePage] Pre-Craft validation failed: Invalid node', nodeId);
          return false;
        }
        
        // For non-ROOT nodes, ensure they have valid type structure
        if (nodeId !== 'ROOT') {
          if (!node.type) {
            console.error('[PublishedSitePage] Pre-Craft validation failed: Missing type', nodeId);
            return false;
          }
          
          // Check that type has required properties for Craft deserialization
          const typeObj = node.type;
          const hasResolver = typeof typeObj === 'string' || 
                             (typeObj && (typeObj.resolvedName || typeObj.displayName || typeObj.name));
          
          if (!hasResolver) {
            console.error('[PublishedSitePage] Pre-Craft validation failed: Invalid type structure', nodeId, typeObj);
            return false;
          }
        }
        
        // Validate node structure has required Craft properties
        if (nodeId !== 'ROOT' && (!node.hasOwnProperty('props') || !node.hasOwnProperty('displayName'))) {
          console.error('[PublishedSitePage] Pre-Craft validation failed: Missing required props', nodeId);
          return false;
        }
      }
      
      return true;
    } catch (err) {
      console.error('[PublishedSitePage] Pre-Craft validation error:', err);
      return false;
    }
  };

  // Validate the sanitized frame before attempting Craft deserialization
  const isCraftReady = validateForCraft(sanitizedFrame);
  
  if (!isCraftReady) {
    console.error('[PublishedSitePage] Frame failed Craft validation, showing fallback');
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Content structure error</h2>
          <p className="text-gray-600 text-sm">
            This page's content structure is incompatible with the current renderer. 
            Please edit and republish the page from the editor.
          </p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
            <summary style={{ cursor: 'pointer' }}>Show debug info</summary>
            <pre style={{ maxHeight: 300, overflow: 'auto', fontSize: '12px' }}>
              {JSON.stringify({ 
                nodeCount: Object.keys(sanitizedFrame || {}).length,
                rootChildCount: rootNodes.length,
                nodeIds: Object.keys(sanitizedFrame || {}),
                sampleFrame: frameData?.slice(0, 1000) 
              }, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  // Validate parsed frame structure to avoid Craft deserialization runtime errors
  const findInvalidNodes = (frame) => {
    const invalid = [];
    if (!frame || typeof frame !== 'object') return invalid;
    try {
      for (const [key, node] of Object.entries(frame)) {
        if (!node || typeof node !== 'object') continue;
        // Skip ROOT itself
        if (key === 'ROOT') continue;
        // Node should have a 'type' object with resolvedName or displayName
        if (!node.type || !(node.type.resolvedName || node.type.displayName || node.type.name)) {
          invalid.push({ id: key, node });
        }
      }
    } catch (e) {
      // If something goes wrong, mark as invalid to be safe
      return [{ id: 'PARSE_ERROR', node: String(e) }];
    }
    return invalid;
  };

  const invalidNodes = findInvalidNodes(parsedFrame);
  if (invalidNodes.length > 0) {
    console.error('[PublishedSitePage] Invalid frame nodes detected - aborting Craft mount', invalidNodes, { framePreview: frameData.slice(0, 800) });
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Content parsing error</h2>
          <p className="text-gray-600 text-sm">This page contains malformed content that cannot be rendered. Check the page in the editor and republish.</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>
            <summary style={{ cursor: 'pointer' }}>Show debug info</summary>
            <pre style={{ maxHeight: 300, overflow: 'auto' }}>{JSON.stringify({ invalidNodes: invalidNodes.slice(0,10), framePreview: frameData.slice(0,2000) }, null, 2)}</pre>
          </details>
        </div>
      </div>
    );
  }

  // Determine whether ROOT has visible styles (background, padding, minHeight, border, etc.)
  const rootProps = parsedFrame?.ROOT?.props || {};
  const parseSize = (v) => {
    if (v === undefined || v === null) return 0;
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };
  const hasVisualStyling = (() => {
    try {
      const bg = (rootProps.backgroundColor || rootProps.background || '').toString().trim().toLowerCase();
      const bgImage = !!rootProps.backgroundImage;
      const padding = parseSize(rootProps.padding || rootProps.paddingTop || rootProps.paddingBottom || 0);
      const minH = parseSize(rootProps.minHeight || rootProps.minH || 0);
      const h = parseSize(rootProps.height || 0);
      const borderWidth = parseSize(rootProps.borderWidth || 0);
      const boxShadow = (rootProps.boxShadow || '').toString().trim();
      // Consider visible if background not empty/white/transparent OR has image OR padding/minHeight/height/border/boxShadow
      if (bg && bg !== 'white' && bg !== '#fff' && bg !== 'transparent' && bg !== 'none') return true;
      if (bgImage) return true;
      if (padding > 0) return true;
      if (minH > 0) return true;
      if (h > 0) return true;
      if (borderWidth > 0) return true;
      if (boxShadow && boxShadow !== 'none') return true;
      return false;
    } catch (e) { return false; }
  })();

  // If the frame exists but ROOT has no child nodes and no visual styling, show the No content view
  if (pageContent && Array.isArray(rootNodes) && rootNodes.length === 0 && !hasVisualStyling) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">No content</h2>
          <p className="text-gray-500 mt-1">This page has no content yet.</p>
          {isDebug && (
            <pre style={{ marginTop: 10, textAlign: 'left', maxWidth: 800, overflow: 'auto' }}>{JSON.stringify({ siteInfo, pagesCount: pages.length, rootNodesCount: rootNodes.length }, null, 2)}</pre>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Enhanced Debug Panel */}
      {(isDebug || showDebug) && (
        <div style={{
          position: 'fixed',
          right: 12,
          top: 12,
          zIndex: 99999,
          background: 'rgba(0,0,0,0.9)',
          color: 'white',
          padding: 16,
          borderRadius: 8,
          maxWidth: 600,
          maxHeight: '80vh',
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 'bold' }}>🚀 Published Debug Panel</h3>
            <button
              onClick={() => setShowDebug(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '4px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                marginLeft: 'auto'
              }}
            >
              ✕
            </button>
          </div>
          
          {/* Debug Controls */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <button
                onClick={() => setDebugView('original')}
                style={{
                  background: debugView === 'original' ? '#2563eb' : 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11
                }}
              >
                Original Debug
              </button>
              <button
                onClick={() => setDebugView('content')}
                style={{
                  background: debugView === 'content' ? '#2563eb' : 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11
                }}
              >
                Page Content JSON
              </button>
              <button
                onClick={() => setDebugView('frame')}
                style={{
                  background: debugView === 'frame' ? '#2563eb' : 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11
                }}
              >
                Sanitized Frame
              </button>
              <button
                onClick={() => setDebugView('compressed')}
                style={{
                  background: debugView === 'compressed' ? '#2563eb' : 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 11
                }}
              >
                Compressed Data
              </button>
            </div>
            
            {/* Debug Function Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {Object.entries(debugFunctions).map(([name, fn]) => (
                <button
                  key={name}
                  onClick={fn}
                  style={{
                    background: '#059669',
                    border: 'none',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontSize: 10
                  }}
                >
                  {name.replace(/([A-Z])/g, ' $1').toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Debug Content */}
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {debugView === 'original' && (
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                  Original Debug Info (same as old debug panel):
                </div>
                <pre style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: 8, 
                  borderRadius: 4, 
                  fontSize: 10,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {JSON.stringify({
                    siteInfo: siteInfo,
                    pagesCount: pages.length,
                    pageTitle: pageTitle,
                    frameDataPreview: sanitizedFrame ? JSON.stringify(sanitizedFrame).slice(0, 400) + '...' : 'No frame data',
                    username,
                    site,
                    slugPath
                  }, null, 2)}
                </pre>
              </div>
            )}
            
            {debugView === 'content' && (
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                  Raw Page Content (from database):
                </div>
                <pre style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: 8, 
                  borderRadius: 4, 
                  fontSize: 10,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {pageContent ? JSON.stringify(pageContent, null, 2) : 'No content'}
                </pre>
                
                {debugInfo && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                      Extended Debug Info:
                    </div>
                    <pre style={{ 
                      background: 'rgba(255,255,255,0.1)', 
                      padding: 8, 
                      borderRadius: 4, 
                      fontSize: 10,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {debugView === 'frame' && (
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                  Sanitized Craft.js Frame (after processing):
                </div>
                <pre style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: 8, 
                  borderRadius: 4, 
                  fontSize: 10,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {sanitizedFrame ? JSON.stringify(sanitizedFrame, null, 2) : 'No sanitized frame'}
                </pre>
              </div>
            )}
            
            {debugView === 'compressed' && (
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
                  Frame JSON String (for Craft.js):
                </div>
                <pre style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: 8, 
                  borderRadius: 4, 
                  fontSize: 10,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {sanitizedFrame ? JSON.stringify(sanitizedFrame) : 'No frame data string'}
                </pre>
                
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, marginTop: 12 }}>
                  Original Raw Page Content String:
                </div>
                <pre style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  padding: 8, 
                  borderRadius: 4, 
                  fontSize: 10,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {pageContent ? (typeof pageContent === 'string' ? pageContent : JSON.stringify(pageContent)) : 'No raw content'}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug Toggle Button */}
      {!showDebug && (isDebug || window.location.search.includes('debug') || window.location.search.includes('dbg')) && (
        <button
          onClick={() => setShowDebug(true)}
          style={{
            position: 'fixed',
            right: 12,
            top: 12,
            zIndex: 99998,
            background: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 'bold'
          }}
        >
          🚀 Debug
        </button>
      )}

      <div className="w-full overflow-auto">
        <PagesProvider>
          <Editor
            resolver={{
              Box,
              FlexBox,
              Text,
              GridBox,
              Image,
              Button,
              CraftButton: Button, // Map legacy CraftButton to Button
              Link,
              Paragraph,
              Video,
              ShopFlexBox,
              ShopImage,
              ShopText,
              FormInput,
              Form,
              FormInputDropArea,
              Carousel,
              NavBar,
              NavItem,
              Root,
              Element
            }}
            enabled={false}
          >
            <MultiSelectProvider>
              <Frame data={frameData} className="w-full">
                <Element
                  is={Root}
                  padding={0}
                  background="#ffffff"
                  canvas
                  className="w-full"
                  style={{ maxWidth: '100%', minWidth: '100%', overflow: 'hidden' }}
                />
              </Frame>
            </MultiSelectProvider>
          </Editor>
        </PagesProvider>
      </div>
    </div>
  );
}
