import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc,
  deleteDoc,
  collection, 
  collectionGroup,
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import { checkUserLimits, getUserSubscription, updateUserUsage } from './subscriptions';
import pako from 'pako';

/**
 * Site Management with Firestore Integration
 * Integrated with subscription system for FREE/PRO/ADMIN tiers
 */

// Compression utilities (reused from useSaveOperations)
const compressData = (jsonString) => {
  try {
    const compressed = pako.deflate(jsonString);
    return btoa(String.fromCharCode.apply(null, compressed));
  } catch (error) {
    console.error('Compression error:', error);
    throw new Error('Failed to compress data');
  }
};

const decompressData = (compressedString) => {
  try {
    const binaryString = atob(compressedString);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decompressed = pako.inflate(bytes, { to: 'string' });
    return decompressed;
  } catch (error) {
    console.error('Decompression error:', error);
    throw new Error('Failed to decompress data - invalid format');
  }
};

const sanitizeForSubdomain = (s) => s.toString().trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

// --- SEO helpers ---
const trimOrNull = (v, max = 500) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
};

const sanitizeKeywords = (kw) => {
  if (!kw) return [];
  const arr = Array.isArray(kw) ? kw : String(kw).split(/[,\n]/);
  const cleaned = arr
    .map(k => k && String(k).toLowerCase().trim())
    .filter(Boolean);
  const dedup = Array.from(new Set(cleaned)).slice(0, 15);
  return dedup;
};

const allowedTwitterCards = new Set(['summary', 'summary_large_image']);

const sanitizeAdditionalMeta = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map(it => {
      if (!it || typeof it !== 'object') return null;
      const name = trimOrNull(it.name || it.property, 60);
      const value = trimOrNull(it.value, 300);
      if (!name || !value) return null;
      return { name, value };
    })
    .filter(Boolean)
    .slice(0, 25);
};

const sanitizeStructuredData = (json) => {
  if (!json) return null;
  try {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    // Basic safety: remove script tags in string fields recursively
    const clean = (val) => {
      if (Array.isArray(val)) return val.map(clean);
      if (val && typeof val === 'object') {
        const out = {};
        for (const k of Object.keys(val)) out[k] = clean(val[k]);
        return out;
      }
      if (typeof val === 'string') return val.replace(/<\/?script[^>]*>/gi, '');
      return val;
    };
    const safe = clean(obj);
    return JSON.stringify(safe).slice(0, 20000); // cap size
  } catch (e) {
    return null; // ignore invalid JSON
  }
};

const pickAndSanitizeSeoUpdates = (updates) => {
  const out = {};
  if ('seoTitle' in updates) out.seoTitle = trimOrNull(updates.seoTitle, 70);
  if ('seoDescription' in updates) out.seoDescription = trimOrNull(updates.seoDescription, 170);
  if ('seoKeywords' in updates) out.seoKeywords = sanitizeKeywords(updates.seoKeywords);
  if ('seoImage' in updates) out.seoImage = trimOrNull(updates.seoImage, 500);
  if ('seoIndex' in updates) out.seoIndex = !!updates.seoIndex;
  if ('seoCanonical' in updates) out.seoCanonical = trimOrNull(updates.seoCanonical, 500);
  if ('seoSocialTitle' in updates) out.seoSocialTitle = trimOrNull(updates.seoSocialTitle, 100);
  if ('seoSocialDescription' in updates) out.seoSocialDescription = trimOrNull(updates.seoSocialDescription, 200);
  if ('seoTwitterCard' in updates) out.seoTwitterCard = allowedTwitterCards.has(updates.seoTwitterCard) ? updates.seoTwitterCard : 'summary_large_image';
  if ('seoGoogleVerification' in updates) out.seoGoogleVerification = trimOrNull(updates.seoGoogleVerification, 120);
  if ('seoAdditionalMeta' in updates) out.seoAdditionalMeta = sanitizeAdditionalMeta(updates.seoAdditionalMeta);
  if ('seoStructuredData' in updates) out.seoStructuredData = sanitizeStructuredData(updates.seoStructuredData);
  if (Object.keys(out).length) out.seoUpdatedAt = serverTimestamp();
  return out;
};

/**
 * Site Management
 */

/**
 * Check if user can create a new site
 */
export const canCreateSite = async (userId) => {
  try {
    // Get subscription & current stored usage
    const subscription = await getUserSubscription(userId);
    const { limits, usage } = subscription;

    // Fetch real site count for reconciliation (defense-in-depth)
    let realCount = 0;
    try {
      const existingSites = await getUserSites(userId);
      realCount = existingSites.length;
    } catch (e) {
      // Non-fatal; keep realCount = 0 if fetch failed
    }

    // Determine effective count (prefer the larger to avoid accidental over-issuance)
    let effectiveCount = typeof usage?.sitesCount === 'number' ? usage.sitesCount : realCount;
    if (effectiveCount < realCount) {
      effectiveCount = realCount;
    }

    // Re-sync Firestore usage if it differs (and not admin tier)
    if (subscription.tier !== 'admin' && usage?.sitesCount !== realCount) {
      try {
        await updateDoc(doc(db, 'users', userId), { 'usage.sitesCount': realCount });
      } catch (syncErr) {
        console.warn('Failed to sync sitesCount usage', syncErr);
      }
    }

    // Hard limit check using effectiveCount (not just stored usage) to block bypass when usage stale
    // Skip limit check for admin users
    if (subscription.tier !== 'admin' && limits.maxSites !== -1 && effectiveCount >= limits.maxSites) {
      return {
        allowed: false,
        reason: 'site_count_exceeded',
        message: `Site limit reached (${limits.maxSites}). Upgrade for more sites.`,
        currentCount: effectiveCount,
        maxSites: limits.maxSites
      };
    }

    // Secondary standardized permission (still invokes feature flags / future logic)
    const canCreate = await checkUserLimits(userId, 'create_site');
    if (!canCreate.allowed) {
      return {
        allowed: false,
        reason: canCreate.reason || 'site_count_exceeded',
        message: canCreate.message || `Site limit reached (${limits.maxSites}).`,
        currentCount: effectiveCount,
        maxSites: limits.maxSites === -1 ? Infinity : limits.maxSites
      };
    }

    return {
      allowed: true,
      currentCount: effectiveCount,
      maxSites: limits.maxSites === -1 ? Infinity : limits.maxSites
    };
  } catch (error) {
    console.error('Error checking site creation permission:', error);
    return {
      allowed: false,
      reason: 'Unable to verify site limits. Please try again.',
      currentCount: 0,
      maxSites: 1
    };
  }
};

export const createSite = async (userId, siteData) => {
  try {
    // Subscription & real-count based guard (defense-in-depth)
    const subscription = await getUserSubscription(userId);
    const { limits } = subscription;

    // Get existing sites early for limit validation & main-site detection
    const userSites = await getUserSites(userId);

    if (limits.maxSites !== -1 && userSites.length >= limits.maxSites) {
      throw new Error(`Site limit reached (${limits.maxSites}). Upgrade for more sites.`);
    }

    // Also invoke standardized limit checker (may include feature gating)
    const canCreate = await checkUserLimits(userId, 'create_site');
    if (!canCreate.allowed) {
      throw new Error(canCreate.message || canCreate.reason || 'Site limit reached.');
    }

    // Validate required fields
    if (!siteData.name || typeof siteData.name !== 'string' || siteData.name.trim() === '') {
      throw new Error('Site name is required and must be a valid string');
    }

    // Generate site ID
    const siteId = `site_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Sanitize the site name for subdomain use
    const sanitizedName = sanitizeForSubdomain(siteData.name || '');

    // Determine and validate the subdomain requested (user-provided or derived)
    let requested = (siteData.subdomain || sanitizedName || '').toString();
    try {
      requested = validateSubdomain(requested);
    } catch (e) {
      // If provided subdomain is invalid but name-derived one is valid, prefer the derived one
      if (siteData.subdomain) throw e; // user explicitly requested bad subdomain
      requested = validateSubdomain(sanitizedName);
    }

    // Ensure uniqueness across all sites (prevent duplicate subdomains)
    const existing = await getDocs(query(collectionGroup(db, 'sites'), where('subdomain', '==', requested), limit(1)));
    if (!existing.empty) {
      throw new Error('Subdomain already in use');
    }

    // Create site document
    const site = {
      id: siteId,
      name: siteData.name.trim(),
      description: siteData.description || '',
      subdomain: requested, // normalized subdomain
      customDomain: siteData.customDomain || null,
      isPublished: false,
      isMainSite: userSites.length === 0, // First site is main site
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userId: userId,
      // Analytics tracking automatically enabled
      analyticsEnabled: true,
      analyticsAutoSetup: true,
      // SEO defaults
      seoTitle: (siteData.seoTitle || siteData.name || '').toString().slice(0,70),
      seoDescription: (siteData.seoDescription || siteData.description || '').toString().slice(0,170),
      seoKeywords: sanitizeKeywords(siteData.seoKeywords),
      seoImage: siteData.seoImage || null,
      seoIndex: siteData.seoIndex !== false, // default true
      seoCanonical: siteData.seoCanonical || null,
      seoSocialTitle: siteData.seoSocialTitle || null,
      seoSocialDescription: siteData.seoSocialDescription || null,
      seoTwitterCard: allowedTwitterCards.has(siteData.seoTwitterCard) ? siteData.seoTwitterCard : 'summary_large_image',
      seoGoogleVerification: siteData.seoGoogleVerification || null,
      seoAdditionalMeta: sanitizeAdditionalMeta(siteData.seoAdditionalMeta),
      seoStructuredData: sanitizeStructuredData(siteData.seoStructuredData),
      seoUpdatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', userId, 'sites', siteId), site);

    // Create default home page
    await createPage(userId, siteId, {
      name: 'home',
      isHome: true,
      content: {
        ROOT: {
          type: { resolvedName: 'Root' },
          isCanvas: true,
          props: { canvas: true },
          displayName: 'Root',
          custom: {},
          parent: null,
          nodes: [],
          linkedNodes: {}
        }
      }
    });

    // Update site usage in subscription system (increment) AFTER successful writes
    await updateUserUsage(userId, 'site_created');

    // Final safeguard: if for any reason increment failed or usage still below real count, reconcile silently
    try {
      const afterSites = [...userSites, site];
      if (limits.maxSites !== -1 && afterSites.length > limits.maxSites) {
        console.error('Post-create count exceeds maxSites - potential race condition. Consider Firestore security rules to enforce limits.');
      }
      const subscriptionAfter = await getUserSubscription(userId);
      const stored = subscriptionAfter.usage?.sitesCount;
      if (stored < afterSites.length && subscriptionAfter.tier !== 'admin') {
        await updateDoc(doc(db, 'users', userId), { 'usage.sitesCount': afterSites.length });
      }
    } catch (reconErr) {
      console.warn('Reconciliation after site creation failed', reconErr);
    }

    return { ...site, id: siteId };
  } catch (error) {
    console.error('Error creating site:', error);
    throw error;
  }
};

export const getUserSites = async (userId) => {
  try {
    const sitesRef = collection(db, 'users', userId, 'sites');
    const q = query(sitesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user sites:', error);
    throw error;
  }
};

export const getSite = async (userId, siteId) => {
  try {
    const siteDoc = await getDoc(doc(db, 'users', userId, 'sites', siteId));
    if (!siteDoc.exists()) {
      throw new Error('Site not found');
    }
    
    return {
      id: siteDoc.id,
      ...siteDoc.data()
    };
  } catch (error) {
    console.error('Error getting site:', error);
    throw error;
  }
};

export const updateSite = async (userId, siteId, updates) => {
  try {
    const seo = pickAndSanitizeSeoUpdates(updates);
    const clean = { ...updates };
    // remove raw seo keys so we don't double-apply unsanitized
    ['seoTitle','seoDescription','seoKeywords','seoImage','seoIndex','seoCanonical','seoSocialTitle','seoSocialDescription','seoTwitterCard','seoGoogleVerification','seoAdditionalMeta','seoStructuredData'].forEach(k=>{ if(k in clean) delete clean[k]; });
    await updateDoc(doc(db, 'users', userId, 'sites', siteId), {
      ...clean,
      ...seo,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating site:', error);
    throw error;
  }
};

// Payment provider settings helpers
export const getSitePaymentProviders = async (userId, siteId) => {
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'sites', siteId));
    if(!snap.exists()) return { stripe: true, paypal: true }; // default both enabled
    const data = snap.data();
    const raw = data.paymentProviders;
    if(!raw || typeof raw !== 'object') return { stripe: true, paypal: true };
    return { stripe: raw.stripe !== false, paypal: raw.paypal !== false };
  } catch (e) {
    return { stripe: true, paypal: true };
  }
};

export const updateSitePaymentProviders = async (userId, siteId, providers) => {
  try {
    const safe = { stripe: !!providers.stripe, paypal: !!providers.paypal };
    await updateDoc(doc(db, 'users', userId, 'sites', siteId), { paymentProviders: safe, updatedAt: serverTimestamp() });
    return safe;
  } catch (e) {
    console.error('Failed updating payment providers', e);
    throw e;
  }
};

export const deleteSite = async (userId, siteId) => {
  try {
    // Delete all pages first
    const pages = await getSitePages(userId, siteId);
    for (const page of pages) {
      await deleteDoc(doc(db, 'users', userId, 'sites', siteId, 'pages', page.id));
    }
    
    // Delete site data (content)
    try {
      await deleteDoc(doc(db, 'users', userId, 'sites', siteId, 'data', 'content'));
    } catch (dataError) {
      console.warn('Site data not found or already deleted:', dataError);
    }
    
    // Delete site document
    await deleteDoc(doc(db, 'users', userId, 'sites', siteId));
    
  // Update site usage in subscription system (decrease count)
  await updateUserUsage(userId, 'site_deleted');
    
    console.log(`Successfully deleted site ${siteId} for user ${userId}`);
  } catch (error) {
    console.error('Error deleting site:', error);
    throw error;
  }
};

/**
 * Recalculate and synchronize the user's site count usage field.
 * This is a corrective utility in case historical creates/deletes
 * didn't update usage.sitesCount (e.g., legacy data) or counts drifted.
 * It writes an absolute value (never negative) unless ADMIN tier.
 */
export const syncUserSiteCount = async (userId) => {
  try {
    const subscription = await getUserSubscription(userId);
    if (subscription.tier === 'admin') {
      // Admin stays at -1 to represent unlimited
      await updateDoc(doc(db, 'users', userId), { 'usage.sitesCount': -1 });
      return { synced: true, value: -1 };
    }
    const sites = await getUserSites(userId);
    const absolute = sites.length;
    await updateDoc(doc(db, 'users', userId), { 'usage.sitesCount': absolute });
    return { synced: true, value: absolute };
  } catch (e) {
    console.warn('syncUserSiteCount failed', e);
    return { synced: false, error: e?.message };
  }
};

/**
 * Page Management
 */
export const createPage = async (userId, siteId, pageData) => {
  try {
    const pageId = `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Compress the content data
    const compressedContent = compressData(JSON.stringify(pageData.content));
    
    const page = {
      id: pageId,
      name: pageData.name,
      slug: pageData.slug || pageData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      isHome: pageData.isHome || false,
      content: compressedContent,
  // Per-page SEO fields (sanitized similar to site-level)
  seoTitle: trimOrNull(pageData.seoTitle || pageData.name, 70),
  seoDescription: trimOrNull(pageData.seoDescription, 170) || '',
  seoIndex: pageData.seoIndex === false ? false : true,
  seoImage: trimOrNull(pageData.seoImage, 500) || null,
  seoStructuredData: sanitizeStructuredData(pageData.seoStructuredData),
      // CRITICAL: Save hierarchy information for tree structure
      parentKey: pageData.parentKey || null,
      path: pageData.path || '/',
      hierarchy: pageData.hierarchy || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'users', userId, 'sites', siteId, 'pages', pageId), page);
    
    return { ...page, id: pageId };
  } catch (error) {
    console.error('Error creating page:', error);
    throw error;
  }
};

export const getSitePages = async (userId, siteId) => {
  try {
    const pagesRef = collection(db, 'users', userId, 'sites', siteId, 'pages');
    const q = query(pagesRef, orderBy('createdAt', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Don't decompress content in list view for performance
        contentSize: data.content ? data.content.length : 0
      };
    });
  } catch (error) {
    console.error('Error getting site pages:', error);
    throw error;
  }
};

export const getPage = async (userId, siteId, pageId) => {
  try {
    const pageDoc = await getDoc(doc(db, 'users', userId, 'sites', siteId, 'pages', pageId));
    if (!pageDoc.exists()) {
      throw new Error('Page not found');
    }
    
    const data = pageDoc.data();
    let decoded = {};
    if (data.content) {
      const raw = data.content;
      try {
        // Primary: treat as compressed base64
        decoded = JSON.parse(decompressData(raw));
      } catch (deErr) {
        // Fallback: if looks like JSON, try direct parse (legacy uncompressed storage)
        if (typeof raw === 'string' && /^[\[{"]/.test(raw.trim())) {
          try {
            decoded = JSON.parse(raw);
            console.warn('[sites.getPage] Legacy uncompressed page content detected; consider migrating', { pageId });
          } catch (jsonErr) {
            const err = new Error('Failed to decode page content');
            err.code = 'DECOMPRESS_FAIL';
            err.meta = { pageId, deErr: deErr?.message, jsonErr: jsonErr?.message };
            throw err;
          }
        } else {
          const err = new Error('Failed to decode page content');
          err.code = 'DECOMPRESS_FAIL';
          err.meta = { pageId, deErr: deErr?.message };
          throw err;
        }
      }
    }

    return { id: pageDoc.id, ...data, content: decoded };
  } catch (error) {
    console.error('Error getting page:', error);
    throw error;
  }
};

export const updatePage = async (userId, siteId, pageId, updates) => {
  try {
    const updateData = { ...updates };
    
    // Compress content if provided
    if (updates.content) {
      updateData.content = compressData(JSON.stringify(updates.content));
    }

  // Sanitize SEO updates if provided
  if ('seoTitle' in updates) updateData.seoTitle = trimOrNull(updates.seoTitle, 70);
  if ('seoDescription' in updates) updateData.seoDescription = trimOrNull(updates.seoDescription, 170);
  if ('seoIndex' in updates) updateData.seoIndex = updates.seoIndex !== false; // default true
  if ('seoImage' in updates) updateData.seoImage = trimOrNull(updates.seoImage, 500);
  if ('seoStructuredData' in updates) updateData.seoStructuredData = sanitizeStructuredData(updates.seoStructuredData);
    
    updateData.updatedAt = serverTimestamp();
    
    await updateDoc(doc(db, 'users', userId, 'sites', siteId, 'pages', pageId), updateData);
  } catch (error) {
    console.error('Error updating page:', error);
    throw error;
  }
};

export const deletePage = async (userId, siteId, pageId) => {
  try {
    await deleteDoc(doc(db, 'users', userId, 'sites', siteId, 'pages', pageId));
  } catch (error) {
    console.error('Error deleting page:', error);
    throw error;
  }
};

/**
 * Public Site Access (for /u/username routes)
 */
export const getPublicSiteByUsername = async (username) => {
  try {
    // Find user by username
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username.toLowerCase()), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('User not found');
    }
    
    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;
    
    // Get user's main site (published)
    const sitesRef = collection(db, 'users', userId, 'sites');
    const siteQuery = query(
      sitesRef, 
      where('isMainSite', '==', true), 
      where('isPublished', '==', true),
      limit(1)
    );
    const siteSnapshot = await getDocs(siteQuery);
    
    if (siteSnapshot.empty) {
      throw new Error('No published site found');
    }
    
    const siteDoc = siteSnapshot.docs[0];
    const siteData = siteDoc.data();
    
    // Get site pages
    const pages = await getSitePages(userId, siteDoc.id);
    
    return {
      site: {
        id: siteDoc.id,
        ...siteData
      },
      pages,
      user: {
        username: userDoc.data().username,
        fullName: userDoc.data().fullName
      }
    };
  } catch (error) {
    console.error('Error getting public site:', error);
    throw error;
  }
};

export const getPublicPage = async (username, pageSlug = 'home') => {
  try {
    const siteData = await getPublicSiteByUsername(username);
    const { site, pages, user } = siteData;
    
    // Find the requested page
    let page = pages.find(p => p.slug === pageSlug);
    
    // If not found and slug is not 'home', try to find home page
    if (!page && pageSlug !== 'home') {
      page = pages.find(p => p.isHome);
    }
    
    if (!page) {
      throw new Error('Page not found');
    }
    
    // Get full page content
    const fullPage = await getPage(user.id || site.userId, site.id, page.id);
    
    return {
      page: fullPage,
      site,
      user
    };
  } catch (error) {
    console.error('Error getting public page:', error);
    throw error;
  }
};

/**
 * Get site data (content) for editing
 */
export const getSiteData = async (userId, siteId) => {
  try {
    const siteDataRef = doc(db, 'users', userId, 'sites', siteId, 'data', 'content');
    const siteDataDoc = await getDoc(siteDataRef);
    
    if (!siteDataDoc.exists()) {
      return null;
    }
    
    const data = siteDataDoc.data();
    
    // Decompress editor state if it exists
    if (data.editorState) {
      data.editorState = decompressData(data.editorState);
    }
    
    return data;
  } catch (error) {
    console.error('Error getting site data:', error);
    throw error;
  }
};

/**
 * Save site data (content)
 */
export const saveSiteData = async (userId, siteId, data) => {
  try {
    // Compress editor state before saving
    const dataToSave = { ...data };
    if (dataToSave.editorState) {
      dataToSave.editorState = compressData(dataToSave.editorState);
    }
    
    const siteDataRef = doc(db, 'users', userId, 'sites', siteId, 'data', 'content');
    await setDoc(siteDataRef, {
      ...dataToSave,
      lastModified: serverTimestamp()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error saving site data:', error);
    throw error;
  }
};

/**
 * Get public site data for viewing
 */
export const getPublicSiteData = async (userId, siteId) => {
  try {
    const siteDataRef = doc(db, 'users', userId, 'sites', siteId, 'data', 'content');
    const siteDataDoc = await getDoc(siteDataRef);
    
    if (!siteDataDoc.exists()) {
      return null;
    }
    
    const data = siteDataDoc.data();
    
    // Decompress editor state if it exists
    if (data.editorState) {
      data.editorState = decompressData(data.editorState);
    }
    
    return data;
  } catch (error) {
    console.error('Error getting public site data:', error);
    throw error;
  }
};

/**
 * Get public site by username and site name
 */
export const getPublicSite = async (username, siteName) => {
  try {
    // Normalize inputs
    const normalizedUsername = (username || '').toLowerCase();
    const rawSite = (siteName || '').trim();
    const siteCandidates = Array.from(new Set([rawSite, decodeURIComponent(rawSite)]));

    // First, find the user by username (normalized)
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('username', '==', normalizedUsername), limit(1));
    const userSnapshot = await getDocs(userQuery);
    if (userSnapshot.empty) return null;

    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;

    const sitesRef = collection(db, 'users', userId, 'sites');

    // Try to find a published site by name first
    for (const candidate of siteCandidates) {
      const byNameQuery = query(
        sitesRef,
        where('name', '==', candidate),
        where('isPublished', '==', true),
        limit(1)
      );
      const byNameSnap = await getDocs(byNameQuery);
      if (!byNameSnap.empty) {
        const siteDoc = byNameSnap.docs[0];
        return { id: siteDoc.id, userId, ...siteDoc.data() };
      }
    }

    // Fallback: find by subdomain
    for (const candidate of siteCandidates) {
      const bySubQuery = query(
        sitesRef,
        where('subdomain', '==', candidate),
        where('isPublished', '==', true),
        limit(1)
      );
      const bySubSnap = await getDocs(bySubQuery);
      if (!bySubSnap.empty) {
        const siteDoc = bySubSnap.docs[0];
        return { id: siteDoc.id, userId, ...siteDoc.data() };
      }
    }

    // Final fallback: if no published site found, allow returning an unpublished site (useful for home preview/public access)
    // This makes /u/{username}/{site}/home accessible even when the site isn't published.
    for (const candidate of siteCandidates) {
      const byNameQuery = query(
        sitesRef,
        where('name', '==', candidate),
        limit(1)
      );
      const byNameSnap = await getDocs(byNameQuery);
      if (!byNameSnap.empty) {
        const siteDoc = byNameSnap.docs[0];
        return { id: siteDoc.id, userId, ...siteDoc.data() };
      }
    }

    for (const candidate of siteCandidates) {
      const bySubQuery = query(
        sitesRef,
        where('subdomain', '==', candidate),
        limit(1)
      );
      const bySubSnap = await getDocs(bySubQuery);
      if (!bySubSnap.empty) {
        const siteDoc = bySubSnap.docs[0];
        return { id: siteDoc.id, userId, ...siteDoc.data() };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting public site:', error);
    throw error;
  }
};

/**
 * Find a published site by its subdomain across all users.
 * Returns minimal mapping useful for middleware lookups.
 */
export const getPublicSiteBySubdomain = async (subdomain) => {
  try {
    const normalized = (subdomain || '').toString().trim();
    if (!normalized) return null;

    const q = query(
      collectionGroup(db, 'sites'),
      where('subdomain', '==', normalized),
      where('isPublished', '==', true),
      limit(1)
    );
    const snap = await getDocs(q);
    let siteDoc;
    if (snap.empty) {
      // Fallback: allow resolving unpublished site (useful for debugging / preview) – remove if not desired
      const q2 = query(
        collectionGroup(db, 'sites'),
        where('subdomain', '==', normalized),
        limit(1)
      );
      const snap2 = await getDocs(q2);
      if (snap2.empty) return null;
      siteDoc = snap2.docs[0];
    } else {
      siteDoc = snap.docs[0];
    }

    const siteData = siteDoc.data() || {};
    // siteDoc.ref.parent is the 'sites' collection; its parent is the user document
    const userRef = siteDoc.ref.parent.parent;
    const userId = userRef?.id;
  let username = '';
  if (userId) {
      try {
        const userSnap = await getDoc(doc(db, 'users', userId));
        username = userSnap?.data()?.username || '';
      } catch (e) {
        // non-fatal; continue with empty username if lookup fails
      }
    }

    return {
      username,
      site: (siteData.subdomain || siteData.name || '').toString(),
      siteId: siteDoc.id,
      userId: userId || null,
    };
  } catch (e) {
    console.error('getPublicSiteBySubdomain error', e);
    throw e;
  }
};
