/**
 * Thumbnail Utility Functions
 * 
 * Handles thumbnail generation, caching, and management for website screenshots
 */

// --- ETag client cache (memory, per session) ---
const etagCache = new Map(); // session memory cache key -> { etag, ts }
const ETAG_LS_PREFIX = 'thumbnail_etag_';
function buildEtagCacheKey(siteId){ return `etag_${siteId}`; }
function loadPersistedEtag(siteId){
  try { return localStorage.getItem(ETAG_LS_PREFIX + siteId) || null; } catch { return null; }
}
function persistEtag(siteId, etag){
  try { localStorage.setItem(ETAG_LS_PREFIX + siteId, etag); } catch {}
}

function getCachedThumbnail(siteId){
  try {
    const data = localStorage.getItem(`thumbnail_${siteId}`);
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed.thumbnail || null;
  } catch { return null; }
}

/**
 * Generate thumbnail for a website
 * @param {Object} site - Site object with necessary data
 * @param {string} username - Username for the public URL
 * @returns {Promise<string>} - Base64 data URL of the thumbnail
 */
export const generateSiteThumbnail = async (site, username, options = {}) => {
  let { force = false, ttlMinutes, freshHours, delayMs, waitSelector, pageKey, slug } = options;
  // Always default to 'home' if no key/slug provided
  if (!pageKey && !slug) pageKey = 'home';
  try {
    console.log('thumbnails.js: Generating thumbnail for site:', site.name);
    console.log('thumbnails.js: Request payload:', {
      siteId: site.id,
      userId: site.userId,
      username: username,
      siteName: site.subdomain || site.name,
      width: 1200,
      height: 630,
    });
    
  const baseUrl = new URL(`${window.location.origin}/api/thumbnail`);
  if (force) baseUrl.searchParams.set('nocache', '1');
  if (ttlMinutes) baseUrl.searchParams.set('ttlMinutes', String(ttlMinutes));
  if (freshHours) baseUrl.searchParams.set('freshHours', String(freshHours));

  const url = baseUrl.toString();
    const headers = { 'Content-Type': 'application/json' };
    // Supply conditional ETag header if we cached previously (session or persisted)
    const etagKey = buildEtagCacheKey(site.id);
    let previous = etagCache.get(etagKey);
    if (!previous) {
      const persisted = loadPersistedEtag(site.id);
      if (persisted) previous = { etag: persisted, ts: Date.now() };
    }
    if (previous?.etag) headers['If-None-Match'] = previous.etag;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        siteId: site.id,
        userId: site.userId,
        username: username,
        siteName: site.subdomain || site.name,
        width: 1200,
        height: 630,
        delayMs,
        waitSelector,
        pageKey,
        slug,
      }),
    });

    console.log('thumbnails.js: API response status:', response.status);
    if (response.status === 304) {
      console.log('thumbnails.js: 304 Not Modified – using cached thumbnail for', site.name);
      const cached = getCachedThumbnail(site.id);
      if (cached) return cached;
      // If we somehow lack cached data, fall through to fetch body (should not happen normally)
    }

  const etag = response.headers.get('ETag');
  if (etag) { etagCache.set(etagKey, { etag, ts: Date.now() }); persistEtag(site.id, etag); }

    const data = await response.json();

    if (!response.ok && !data.thumbnail) {
      console.error('thumbnails.js: API error response:', data);
      throw new Error(data.error || 'Failed to generate thumbnail');
    }

    console.log('thumbnails.js: API success response:', { 
      success: data.success, 
      hasThumbnail: !!data.thumbnail,
      thumbnailLength: data.thumbnail?.length,
      pending: data.pending,
      placeholder: data.placeholder,
      cached: data.cached,
      layer: data.layer,
      regenerated: data.regenerated,
      force
    });

    // If server indicates generation is pending, return placeholder and schedule a retry
    if (data.pending || data.placeholder) {
      console.log('thumbnails.js: Received placeholder/pending thumbnail; will not cache and will retry');
      scheduleThumbnailRetry(site, username);
      return data.thumbnail || null;
    }

    if (data.thumbnail) {
      cacheThumbnail(site, data.thumbnail, site.updatedAt?.toMillis ? site.updatedAt.toMillis() : Date.now());
      return data.thumbnail;
    }

    throw new Error('Invalid response from thumbnail service');
  } catch (error) {
    console.error('thumbnails.js: Error generating thumbnail:', error);
    throw error;
  }
};

// Helper to cache thumbnail
function cacheThumbnail(site, thumbnail, siteUpdatedTs){
  const cacheKey = `thumbnail_${site.id}`;
  const cacheData = {
    thumbnail,
    timestamp: Date.now(),
    siteUpdated: siteUpdatedTs,
  };
  try { localStorage.setItem(cacheKey, JSON.stringify(cacheData)); } catch(e) { /* ignore */ }
  console.log('thumbnails.js: Thumbnail cached successfully');
}

// Debounced retry map to prevent excessive refetching
const retryTimers = new Map();
function scheduleThumbnailRetry(site, username, attempt = 0){
  const maxAttempts = 5;
  if (attempt >= maxAttempts) return;
  const key = site.id;
  if (retryTimers.has(key)) return; // already scheduled
  const delay = 3000 + attempt * 1500; // backoff
  const timer = setTimeout(async () => {
    retryTimers.delete(key);
    try {
      console.log(`thumbnails.js: Retrying thumbnail fetch (attempt ${attempt+1}) for`, site.name);
  const result = await generateSiteThumbnail(site, username, { force: attempt > 1 });
      if (!result && attempt + 1 < maxAttempts) {
        scheduleThumbnailRetry(site, username, attempt + 1);
      }
    } catch (e){
      if (attempt + 1 < maxAttempts) scheduleThumbnailRetry(site, username, attempt + 1);
    }
  }, delay);
  retryTimers.set(key, timer);
}

/**
 * Get cached thumbnail or generate new one if needed
 * @param {Object} site - Site object
 * @param {string} username - Username for the public URL
 * @returns {Promise<string|null>} - Base64 data URL of the thumbnail or null
 */
export const getCachedOrGenerateThumbnail = async (site, username) => {
  console.log('thumbnails.js: getCachedOrGenerateThumbnail called for:', site.name);
  
  const cacheKey = `thumbnail_${site.id}`;
  const cachedData = localStorage.getItem(cacheKey);
  
  if (cachedData) {
    try {
      const { thumbnail, timestamp, siteUpdated } = JSON.parse(cachedData);
      const now = Date.now();
      const siteLastUpdated = site.updatedAt?.toMillis ? site.updatedAt.toMillis() : 0;
      
      console.log('thumbnails.js: Found cached data, checking validity...', {
        now,
        timestamp,
        age: now - timestamp,
        siteLastUpdated,
        siteUpdated
      });
      
      // Check if thumbnail is still valid (less than 24 hours old and site hasn't been updated)
      const isValid = (
        thumbnail &&
        (now - timestamp) < 24 * 60 * 60 * 1000 && // Less than 24 hours old
        siteLastUpdated <= siteUpdated // Site hasn't been updated since thumbnail
      );
      
      if (isValid) {
        console.log('thumbnails.js: Using cached thumbnail for site:', site.name);
        return thumbnail;
      } else {
        console.log('thumbnails.js: Cached thumbnail is invalid, generating new one');
      }
    } catch (error) {
      console.error('thumbnails.js: Error parsing cached thumbnail:', error);
    }
  } else {
    console.log('thumbnails.js: No cached thumbnail found');
  }
  
  // Generate new thumbnail if not cached or invalid
  try {
    console.log('thumbnails.js: Generating new thumbnail...');
    return await generateSiteThumbnail(site, username);
  } catch (error) {
    console.error('thumbnails.js: Failed to generate thumbnail for site:', site.name, error);
    return null;
  }
};

/**
 * Clear cached thumbnail for a site
 * @param {string} siteId - Site ID
 */
export const clearThumbnailCache = (siteId) => {
  const cacheKey = `thumbnail_${siteId}`;
  localStorage.removeItem(cacheKey);
};

/**
 * Clear all cached thumbnails
 */
export const clearAllThumbnailCache = () => {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('thumbnail_')) {
      localStorage.removeItem(key);
    }
  });
};

/**
 * Get fallback placeholder for sites that can't generate thumbnails
 * @param {Object} site - Site object
 * @returns {string} - SVG data URL for placeholder
 */
export const getThumbnailPlaceholder = (site) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  // Use site name to consistently pick a color
  const colorIndex = site.name.charCodeAt(0) % colors.length;
  const color = colors[colorIndex];
  
  const svg = `
    <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color}88;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <circle cx="200" cy="100" r="30" fill="white" opacity="0.3"/>
      <text x="200" y="105" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="600">
        ${site.name.substring(0, 15)}${site.name.length > 15 ? '...' : ''}
      </text>
      <text x="200" y="125" text-anchor="middle" fill="white" opacity="0.8" font-family="Arial, sans-serif" font-size="10">
        ${site.isPublished ? 'Published' : 'Draft'}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Preload thumbnails for multiple sites
 * @param {Array} sites - Array of site objects
 * @param {string} username - Username for public URLs
 * @param {Function} onProgress - Progress callback function
 */
export const preloadThumbnails = async (sites, username, onProgress) => {
  // Include both published and draft sites
  const allSites = sites;
  let completed = 0;
  
  console.log(`Preloading thumbnails for ${allSites.length} sites (published and draft)`);
  
  // Process sites in batches to avoid overwhelming the server
  const batchSize = 3;
  for (let i = 0; i < allSites.length; i += batchSize) {
    const batch = allSites.slice(i, i + batchSize);
    
    await Promise.allSettled(
      batch.map(async (site) => {
        try {
          await getCachedOrGenerateThumbnail(site, username);
          completed++;
          if (onProgress) onProgress(completed, allSites.length);
        } catch (error) {
          console.error(`Failed to preload thumbnail for ${site.name}:`, error);
          completed++;
          if (onProgress) onProgress(completed, allSites.length);
        }
      })
    );
    
    // Small delay between batches
    if (i + batchSize < allSites.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('Thumbnail preloading completed');
};

/**
 * Check if a thumbnail is fresh using HEAD request (leverages ETag) without downloading body.
 * @param {Object} site
 * @param {string} username
 * @returns {Promise<boolean>} true if fresh (cached), false otherwise
 */
export async function isThumbnailFresh(site, username){
  try {
    const baseUrl = new URL(`${window.location.origin}/api/thumbnail`);
    baseUrl.searchParams.set('username', username);
    baseUrl.searchParams.set('siteName', site.subdomain || site.name);
    baseUrl.searchParams.set('siteId', site.id);
    baseUrl.searchParams.set('userId', site.userId);
    const etagKey = buildEtagCacheKey(site.id);
    let previous = etagCache.get(etagKey) || (loadPersistedEtag(site.id) ? { etag: loadPersistedEtag(site.id), ts: Date.now() } : null);
    const headers = {};
    if (previous?.etag) headers['If-None-Match'] = previous.etag;
    const res = await fetch(baseUrl.toString(), { method: 'HEAD', headers });
    if (res.status === 304) return true;
    const etag = res.headers.get('ETag');
    if (etag) { etagCache.set(etagKey, { etag, ts: Date.now() }); persistEtag(site.id, etag); }
    return res.ok;
  } catch { return false; }
}
