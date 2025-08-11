'use client';

import React, { useEffect, useMemo, useState } from 'react';
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

    const pagesByKey = {};
    allPages.forEach(p => {
      if (p.key) pagesByKey[p.key] = p;
    });

    // Exact matches based on known properties
    const map = {};
    allPages.forEach(p => {
      if (p.path) map[p.path.replace(/^\/+/, '')] = p;
      if (p.key && p.key !== 'home') map[p.key] = p;
      if (p.slug) map[p.slug] = p;
    });
    if (map[urlPath]) return map[urlPath];

    // Hierarchical reconstruction
    for (const p of allPages) {
      if (p.isHome) continue;
      const full = buildPagePath(p, pagesByKey);
      if (full === urlPath) return p;
    }

    // Fallback fuzzy: last segment matches key-ish
    const segments = urlPath.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    const fuzzy = allPages.find(p => p.key === last || (p.title && p.title.toLowerCase().replace(/[^a-z0-9]/g, '-') === last));
    return fuzzy || null;
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Per-site publishing
        const pubSite = await getPublicSite(username, site);
        if (!pubSite) {
          throw new Error('Site not found or not published');
        }
        if (!isMounted) return;
        setSiteInfo(pubSite);

        const pageList = await getSitePages(pubSite.userId, pubSite.id);
        if (!isMounted) return;
        setPages(pageList);

        // Special routes: shop and shop/:itemId
        if (slug[0] === 'shop') {
          setPageContent(null);
          setPageTitle('Shop');
          return;
        }

        // Resolve to a Craft page
        const target = findPageMetaByPath(pageList, slugPath);
        if (!target) {
          throw new Error(`Page not found: /${slugPath}`);
        }
        const fullPage = await getPage(pubSite.userId, pubSite.id, target.id);
        if (!isMounted) return;
        setPageTitle(fullPage.title || target.name || '');
        setPageContent(fullPage.content || null);
      } catch (e) {
        if (!isMounted) return;
        setError(e?.message || 'Failed to load site');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [username, site, slugPath]);

  // Loading state
  if (loading) {
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to load</h2>
          <p className="text-gray-600 whitespace-pre-line">{error}</p>
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

  return (
    <div className="min-h-screen bg-white">
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
