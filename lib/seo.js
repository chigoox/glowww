
// Shared SEO utilities for multi-tenant site + page metadata, sitemap, robots
// Centralizes canonical URL construction, indexability logic, fallback images,
// and Firestore fetch helpers. Keep lightweight to avoid adding client bundle weight.

import { adminDb } from './firebaseAdmin';

// Fallback OG image path (can override with env PLATFORM_DEFAULT_OG)
export const FALLBACK_OG_IMAGE = process.env.PLATFORM_DEFAULT_OG || '/window.svg';

/** Fetch user doc by username (lowercased) */
export async function fetchUserByUsername(username) {
  if (!adminDb || !username) return null;
  const uname = String(username).toLowerCase();
  const snap = await adminDb.collection('users').where('username', '==', uname).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...(doc.data() || {}) };
}

/** Fetch site by username + site param (tries name then subdomain) */
export async function fetchSiteByUsernameAndParam(username, siteParam) {
  if (!adminDb || !username || !siteParam) return null;
  const user = await fetchUserByUsername(username);
  if (!user) return null;
  const sitesRef = adminDb.collection('users').doc(user.id).collection('sites');
  let siteSnap = await sitesRef.where('name', '==', siteParam).limit(1).get();
  if (siteSnap.empty) siteSnap = await sitesRef.where('subdomain', '==', siteParam).limit(1).get();
  if (siteSnap.empty) return null;
  const siteDoc = siteSnap.docs[0];
  return { id: siteDoc.id, userId: user.id, ...(siteDoc.data() || {}) };
}

/** Fetch site + all its pages (optionally lightweight) */
export async function fetchSiteAndPages(username, siteParam) {
  const site = await fetchSiteByUsernameAndParam(username, siteParam);
  if (!site) return { site: null, pages: [] };
  let pages = [];
  try {
    const pagesSnap = await adminDb
      .collection('users').doc(site.userId)
      .collection('sites').doc(site.id)
      .collection('pages')
      .get();
    pages = pagesSnap.docs.map(d => ({ id: d.id, ...(d.data() || {}) }));
  } catch {}
  return { site, pages };
}

/** Build primary host (customDomain preferred, else subdomain + platform) */
export function buildPrimaryHost(site) {
  if (!site) return null;
  if (site.customDomain) return site.customDomain;
  if (site.subdomain && process.env.PLATFORM_DOMAIN) {
    return `${site.subdomain}.${process.env.PLATFORM_DOMAIN}`;
  }
  return null;
}

/** Build canonical URL given site + optional path (no leading slash required) */
export function buildCanonical(site, path = '') {
  const host = buildPrimaryHost(site);
  if (!host) return null;
  const clean = path ? `/${String(path).replace(/^\//, '')}` : '/';
  return `https://${host}${clean}`;
}

/** Determine if site/page should be indexable */
export function isIndexable(site, page) {
  if (!site) return false;
  if (!site.isPublished) return false;
  if (site.seoIndex === false) return false;
  if (page && page.seoIndex === false) return false;
  return true;
}

/** Sanitize additional meta array: expect [{name,value}] safe tokens only */
export function sanitizeAdditionalMeta(arr) {
  if (!Array.isArray(arr)) return {};
  const meta = {};
  for (const m of arr) {
    if (!m || typeof m !== 'object') continue;
    const name = String(m.name || '').trim();
    const value = String(m.value || '').trim();
    if (!name || !value) continue;
    // Basic guard: no angle brackets to reduce risk of injection
    if (/[<>]/.test(name) || /[<>]/.test(value)) continue;
    if (name.length > 60 || value.length > 500) continue;
    meta[name] = value;
  }
  return meta;
}

/** Fallback OG images array */
export function resolveOgImages(siteImage, pageImage) {
  const chosen = pageImage || siteImage || FALLBACK_OG_IMAGE;
  if (!chosen) return undefined;
  return [{ url: chosen }];
}

/**
 * Build site-level metadata object (without page overrides)
 */
export function buildSiteMetadata(site) {
  if (!site) {
    return {
      title: 'Site not found',
      description: 'The requested site could not be located.',
      robots: { index: false, follow: false }
    };
  }
  const title = site.seoTitle || site.name || 'Untitled Site';
  const description = site.seoDescription || site.description || 'Powered by Glowww';
  const canonical = buildCanonical(site, '');
  const ogImages = resolveOgImages(site.seoImage);
  const indexable = isIndexable(site);
  const meta = {
    title,
    description,
    keywords: Array.isArray(site.seoKeywords) ? site.seoKeywords : undefined,
    alternates: canonical ? { canonical } : undefined,
    robots: { index: indexable, follow: indexable },
    openGraph: {
      type: 'website',
      title: site.seoSocialTitle || title,
      description: site.seoSocialDescription || description,
      url: canonical || undefined,
      siteName: site.name || title,
      images: ogImages
    },
    twitter: {
      card: site.seoTwitterCard || 'summary_large_image',
      title: site.seoSocialTitle || title,
      description: site.seoSocialDescription || description,
      images: ogImages ? ogImages.map(i => i.url) : undefined,
      site: site.seoTwitterHandle || undefined
    },
    verification: site.seoGoogleVerification ? { google: site.seoGoogleVerification } : undefined,
    other: sanitizeAdditionalMeta(site.seoAdditionalMeta)
  };
  return meta;
}

/**
 * Build page-level metadata merging site + page overrides.
 */
export function buildPageMetadata(site, page, slugPath) {
  if (!site) return { title: 'Not found', robots: { index: false, follow: false } };
  const siteMeta = buildSiteMetadata(site); // includes site-level fallbacks
  const title = (page?.seoTitle || page?.title || page?.name) ? `${page?.seoTitle || page?.title || page?.name}` : siteMeta.title;
  const description = page?.seoDescription || siteMeta.description;
  const canonical = buildCanonical(site, slugPath || '');
  const ogImages = resolveOgImages(site.seoImage, page?.seoImage);
  const indexable = isIndexable(site, page);
  return {
    ...siteMeta,
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots: { index: indexable, follow: indexable },
    openGraph: {
      ...(siteMeta.openGraph || {}),
      title,
      description,
      url: canonical || undefined,
      images: ogImages
    },
    twitter: {
      ...(siteMeta.twitter || {}),
      title,
      description,
      images: ogImages ? ogImages.map(i => i.url) : undefined
    }
  };
}

/** Build hierarchical path for pages (used in sitemap & slug resolution) */
export function buildHierarchicalPath(page, pagesByKey) {
  if (!page || page.isHome) return '';
  const segments = [];
  let current = page;
  const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '-');
  while (current && !current.isHome) {
    if (current.key) segments.unshift(current.key);
    else if (current.slug) segments.unshift(current.slug);
    else if (current.title) segments.unshift(slugify(current.title));
    else if (current.name) segments.unshift(slugify(current.name));
    current = current.parentKey ? pagesByKey[current.parentKey] : null;
  }
  return segments.join('/');
}

/** Filter pages collection for indexable (used in sitemap) */
export function filterIndexablePages(pages) {
  return (pages || []).filter(p => !p.isHome && !p.isDraft && !p.isDeleted && p.seoIndex !== false);
}

/** Resolve site by request host (supports custom domain or subdomain.platform) */
export async function fetchSiteByHost(host) {
  if (!adminDb || !host) return null;
  const platform = process.env.PLATFORM_DOMAIN;
  let sub = null;
  if (platform && host.endsWith('.' + platform)) {
    sub = host.slice(0, -1 * (platform.length + 1));
  }
  try {
    if (sub) {
      const snap = await adminDb.collectionGroup('sites').where('subdomain', '==', sub).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        return { id: doc.id, userId: doc.ref.parent.parent.id, ...(doc.data() || {}) };
      }
    }
    const custom = await adminDb.collectionGroup('sites').where('customDomain', '==', host).limit(1).get();
    if (!custom.empty) {
      const doc = custom.docs[0];
      return { id: doc.id, userId: doc.ref.parent.parent.id, ...(doc.data() || {}) };
    }
  } catch {
    return null;
  }
  return null;
}

