// Email branding resolution (Phase 1)
// Provides platform vs site branding objects used by templates.
// Later phases: tenant-specific theming overrides, caching invalidation, domain-based branding.

import { db } from '../firebaseAdmin'; // Firestore admin instance

// Simple in-memory cache with TTL to reduce Firestore reads during bursts
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const siteCache = new Map(); // key: siteId -> { expiresAt, data }

function getCachedSite(siteId) {
  const entry = siteCache.get(siteId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    siteCache.delete(siteId);
    return null;
  }
  return entry.data;
}

function setCachedSite(siteId, data) {
  siteCache.set(siteId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function fetchSiteBranding(siteId) {
  if (!siteId) return null;
  const cached = getCachedSite(siteId);
  if (cached) return cached;
  try {
    const snap = await db.collection('sites').doc(siteId).get();
    if (!snap.exists) return null;
    const site = snap.data() || {};
    const branding = buildSiteBrandingFromDoc(site, siteId);
    setCachedSite(siteId, branding);
    return branding;
  } catch (e) {
    console.error('fetchSiteBranding error', e);
    return null;
  }
}

function buildSiteBrandingFromDoc(site, siteId) {
  const {
    name,
    siteName,
    displayName,
    logo,
    logoUrl,
    primaryColor,
    themeColor,
    supportEmail,
    businessAddress,
    domain,
    customDomain,
    slug,
  } = site;

  // Attempt to derive a primary URL; fallback to platform base with path
  const baseUrl = process.env.PLATFORM_BASE_URL || 'https://example.com';
  const domainHost = customDomain || domain;
  let siteUrl = baseUrl;
  if (domainHost) {
    const protocol = domainHost.startsWith('http') ? '' : 'https://';
    siteUrl = protocol + domainHost;
  } else if (slug) {
    siteUrl = baseUrl.replace(/\/$/, '') + '/u/' + slug;
  }

  return {
    scope: 'site',
    siteId,
    brandName: siteName || displayName || name || 'Your Site',
    logoUrl: logoUrl || logo || process.env.PLATFORM_LOGO_URL || '',
    primaryColor: primaryColor || themeColor || '#111111',
    supportEmail: supportEmail || process.env.PLATFORM_SUPPORT_EMAIL || 'support@example.com',
    siteUrl,
    legalAddress: businessAddress || null,
    poweredBy: 'Glowww',
  };
}

export function getPlatformBranding() {
  return {
    scope: 'platform',
    brandName: process.env.PLATFORM_BRAND_NAME || 'Glowww',
    logoUrl: process.env.PLATFORM_LOGO_URL || '',
    primaryColor: process.env.PLATFORM_PRIMARY_COLOR || '#111111',
    supportEmail: process.env.PLATFORM_SUPPORT_EMAIL || 'support@example.com',
    siteUrl: process.env.PLATFORM_BASE_URL || 'https://example.com',
    legalAddress: process.env.PLATFORM_LEGAL_ADDRESS || null,
    poweredBy: 'Glowww',
  };
}

/**
 * Resolve branding for an email send.
 * If siteId provided and found, returns site branding; else platform branding.
 * @param {object} params
 * @param {string|null} [params.siteId]
 * @returns {Promise<object>} branding object
 */
export async function resolveBranding({ siteId } = {}) {
  if (siteId) {
    const siteBranding = await fetchSiteBranding(siteId);
    if (siteBranding) return siteBranding;
  }
  return getPlatformBranding();
}

// Future extension placeholder: domain-based / host header based branding resolution.
