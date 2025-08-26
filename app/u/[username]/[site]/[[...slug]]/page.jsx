'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
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

  const triggerManualRetry = () => {
    setAttempt(0);
    setLastErrorInfo(null);
    setReloadNonce(n => n + 1);
  };

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

  // Render Craft page in read-only mode
  const frameData = typeof pageContent === 'string' ? pageContent : JSON.stringify(pageContent);
  // parse to inspect node structure
  let parsedFrame = null;
  try {
    parsedFrame = typeof pageContent === 'string' ? JSON.parse(pageContent) : pageContent;
  } catch (e) {
    parsedFrame = null;
  }
  const rootNodes = parsedFrame?.ROOT?.nodes || [];

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
      {isDebug && (
        <div style={{ position: 'fixed', right: 12, top: 12, zIndex: 99999, background: 'rgba(0,0,0,0.6)', color: 'white', padding: 10, borderRadius: 6, maxWidth: 420 }}>
          <div style={{ fontWeight: '700', marginBottom: 6 }}>DEBUG</div>
          <div style={{ fontSize: 12, maxHeight: 240, overflow: 'auto' }}>
            <pre style={{ color: 'white', fontSize: 11, margin: 0 }}>{JSON.stringify({ siteInfo, pagesCount: pages.length, pageTitle, frameDataPreview: frameData.slice(0, 400) }, null, 2)}</pre>
          </div>
        </div>
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
