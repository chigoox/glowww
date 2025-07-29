/**
 * Thumbnail Utility Functions
 * 
 * Handles thumbnail generation, caching, and management for website screenshots
 */

/**
 * Generate thumbnail for a website
 * @param {Object} site - Site object with necessary data
 * @param {string} username - Username for the public URL
 * @returns {Promise<string>} - Base64 data URL of the thumbnail
 */
export const generateSiteThumbnail = async (site, username) => {
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
    
    const response = await fetch(`${window.location.origin}/api/thumbnail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        siteId: site.id,
        userId: site.userId,
        username: username,
        siteName: site.subdomain || site.name,
        width: 1200,
        height: 630,
      }),
    });

    console.log('thumbnails.js: API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('thumbnails.js: API error response:', errorData);
      throw new Error(errorData.error || 'Failed to generate thumbnail');
    }

    const data = await response.json();
    console.log('thumbnails.js: API success response:', { 
      success: data.success, 
      hasThumbnail: !!data.thumbnail,
      thumbnailLength: data.thumbnail?.length 
    });
    
    if (data.success && data.thumbnail) {
      // Cache the thumbnail in localStorage with timestamp
      const cacheKey = `thumbnail_${site.id}`;
      const cacheData = {
        thumbnail: data.thumbnail,
        timestamp: Date.now(),
        siteUpdated: site.updatedAt?.toMillis ? site.updatedAt.toMillis() : Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('thumbnails.js: Thumbnail cached successfully');
      
      return data.thumbnail;
    } else {
      console.error('thumbnails.js: Invalid response from thumbnail service:', data);
      throw new Error('Invalid response from thumbnail service');
    }
  } catch (error) {
    console.error('thumbnails.js: Error generating thumbnail:', error);
    throw error;
  }
};

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
