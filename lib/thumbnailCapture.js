import { ref, uploadBytes, getDownloadURL, getMetadata } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { storage, db } from './firebase';

/**
 * Captures a thumbnail of the current editor viewport
 * Excludes UI elements and focuses on the canvas area
 * @param {string} siteId - Site ID for the thumbnail
 * @param {string} userId - User ID who owns the site
 * @returns {Promise<string|null>} - Firebase Storage URL or null if failed
 */
export const captureEditorThumbnail = async (siteId, userId) => {
  try {
    console.log('🔄 Starting thumbnail capture for site:', siteId, 'user:', userId);
    
    // Only capture if we're actually in the editor
    if (!window.location.pathname.includes('/Editor/site')) {
      console.log('❌ Thumbnail capture only works from the main editor page');
      return null;
    }

    // Check if we should generate a new thumbnail (not more than once per hour)
    const shouldGenerate = await shouldGenerateNewThumbnail(siteId, userId);
    if (!shouldGenerate) {
      console.log('⏱️ Thumbnail recently generated, skipping...');
      return null;
    }

    console.log('✅ Proceeding with thumbnail capture...');

    // Wait for any pending renders or async content
    console.log('⏳ Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Hide UI elements before capture
    const hiddenElements = hideUIElements();

    // Wait a moment for UI changes to take effect
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Capture the canvas area
    const canvas = await captureCanvasArea();
    
    if (!canvas) {
      console.warn('❌ No canvas area found for thumbnail capture');
      restoreUIElements(hiddenElements);
      return null;
    }

    console.log('🎨 Canvas captured successfully, dimensions:', canvas.width, 'x', canvas.height);
    
    // Check if canvas is blank (all white/transparent)
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let isBlank = true;
    let nonWhitePixels = 0;
    
    // Check if we have any non-white/non-transparent pixels
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // If pixel is not white or transparent, canvas has content
      if (!(r === 255 && g === 255 && b === 255) && a > 0) {
        nonWhitePixels++;
        if (nonWhitePixels > 100) { // If we find enough non-white pixels
          isBlank = false;
          break;
        }
      }
    }
    
    console.log('🎨 Canvas analysis:', {
      isBlank,
      nonWhitePixels,
      dataUrlLength: canvas.toDataURL().length
    });
    
    if (isBlank) {
      console.warn('⚠️ Canvas appears to be blank! This usually means:');
      console.warn('   1. The selected element has no visible content');
      console.warn('   2. The content is loaded asynchronously and not ready yet'); 
      console.warn('   3. The CraftJS content is in a different container');
      
      // Try to wait a bit longer and recapture
      console.log('🔄 Waiting 2 seconds and trying to recapture...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try capturing the entire viewport as fallback
      console.log('🔄 Fallback: Capturing entire viewport...');
      const viewportCanvas = await html2canvas(document.body, {
        width: 1200,
        height: 630,
        scale: 0.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      return viewportCanvas;
    }

    // Convert canvas to blob
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.8));
    
    if (!blob) {
      console.error('❌ Failed to create blob from canvas');
      restoreUIElements(hiddenElements);
      return null;
    }

    console.log('📦 Blob created, size:', Math.round(blob.size / 1024), 'KB');

    // Upload to Firebase Storage
    const thumbnailUrl = await uploadThumbnailToStorage(blob, siteId, userId);
    
    // Update site document with thumbnail URL and timestamp
    if (thumbnailUrl) {
      await updateSiteThumbnail(siteId, userId, thumbnailUrl);
      
      // Cache in localStorage for quick access
      cacheThumbnailLocally(siteId, thumbnailUrl);
    }

    // Restore UI elements
    restoreUIElements(hiddenElements);

    console.log('Thumbnail captured and uploaded successfully:', thumbnailUrl);
    return thumbnailUrl;

  } catch (error) {
    console.error('Error capturing editor thumbnail:', error);
    return null;
  }
};

/**
 * Checks if we should generate a new thumbnail
 * @param {string} siteId 
 * @param {string} userId 
 * @returns {Promise<boolean>}
 */
const shouldGenerateNewThumbnail = async (siteId, userId) => {
  try {
    // Check local cache first
    const cacheKey = `thumbnail_meta_${siteId}`;
    const cachedMeta = localStorage.getItem(cacheKey);
    
    if (cachedMeta) {
      const { timestamp } = JSON.parse(cachedMeta);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      if (timestamp > oneHourAgo) {
        return false; // Recent thumbnail exists
      }
    }

    // Check Firebase document
    const siteDoc = await getDoc(doc(db, 'users', userId, 'sites', siteId));
    if (siteDoc.exists()) {
      const siteData = siteDoc.data();
      if (siteData.thumbnailUpdatedAt) {
        const lastUpdate = siteData.thumbnailUpdatedAt.toMillis();
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        if (lastUpdate > oneHourAgo) {
          return false; // Recent thumbnail exists in Firebase
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking thumbnail generation status:', error);
    return true; // Generate on error to be safe
  }
};

/**
 * Hides UI elements that shouldn't appear in thumbnail
 * @returns {Array} - Array of hidden elements for restoration
 */
const hideUIElements = () => {
  const hiddenElements = [];
  
  // List of selectors for UI elements to hide
  const selectors = [
    // Top bar elements
    '[class*="TopBar"]',
    '[data-testid="topbar"]',
    'header:not([class*="canvas"])',
    
    // Toolbox and sidebar elements
    '[class*="ToolBox"]',
    '[data-testid="toolbox"]',
    '.w-80.bg-white.border-l.border-gray-200', // Right sidebar
    
    // Layers panel
    '[class*="Layers"]',
    '[class*="EditorLayers"]',
    '[data-testid="layers"]',
    
    // Style menu
    '[class*="StyleMenu"]',
    '[data-testid="style-menu"]',
    
    // Generic panels and sidebars (excluding main canvas)
    'aside:not([class*="canvas"]):not([class*="Frame"])',
    '[class*="panel"]:not([class*="canvas"]):not([class*="Frame"])',
    '[class*="Panel"]:not([class*="canvas"]):not([class*="Frame"])',
    '[class*="sidebar"]:not([class*="canvas"]):not([class*="Frame"])',
    '[class*="Sidebar"]:not([class*="canvas"]):not([class*="Frame"])',
    
    // Navigation and controls
    'nav:not([class*="canvas"]):not([class*="Frame"])',
    '[class*="controls"]:not([class*="canvas"]):not([class*="Frame"])',
    '[class*="Controls"]:not([class*="canvas"]):not([class*="Frame"])'
  ];

  selectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        // Skip if element is inside the main canvas area or is the Frame itself
        if (!element.closest('.w-full.min-h-\\[600px\\]') && 
            !element.closest('[class*="Frame"]') &&
            !element.classList.contains('Frame')) {
          const originalDisplay = element.style.display;
          const originalVisibility = element.style.visibility;
          element.style.display = 'none';
          element.style.visibility = 'hidden';
          hiddenElements.push({ element, originalDisplay, originalVisibility });
        }
      });
    } catch (error) {
      console.warn('Error hiding elements with selector:', selector, error);
    }
  });

  console.log('Hidden', hiddenElements.length, 'UI elements for thumbnail capture');
  return hiddenElements;
};

/**
 * Restores previously hidden UI elements
 * @param {Array} hiddenElements 
 */
const restoreUIElements = (hiddenElements) => {
  hiddenElements.forEach(({ element, originalDisplay, originalVisibility }) => {
    element.style.display = originalDisplay || '';
    element.style.visibility = originalVisibility || '';
  });
  console.log('Restored', hiddenElements.length, 'UI elements after thumbnail capture');
};

/**
 * Captures the canvas area as a canvas element
 * @returns {Promise<HTMLCanvasElement|null>}
 */
const captureCanvasArea = async () => {
  try {
    console.log('🔍 Searching for canvas element...');
    
    // Debug: List all potential canvas elements
    const potentialElements = [
      document.querySelector('iframe[title="craft-frame"]'),
      document.querySelector('[class*="craft-frame"]'),
      document.querySelector('.w-full.min-h-\\[600px\\]'),
      document.querySelector('[class*="Frame"]'),
      document.querySelector('[data-cy="craft-canvas"]'),
      document.querySelector('[class*="canvas"]'),
      document.querySelector('[class*="Canvas"]'),
      document.querySelector('[data-testid="canvas"]'),
      document.querySelector('main'),
      document.querySelector('[class*="content"]'),
      document.querySelector('[class*="Content"]'),
      document.querySelector('[class*="editor-content"]'),
      document.querySelector('.flex-1.p-4.overflow-auto.bg-gray-100'),
      document.querySelector('[class*="editor"]')
    ];
    
    console.log('🔍 Found potential elements:', potentialElements.filter(Boolean).map(el => ({
      tag: el.tagName,
      classes: el.className,
      id: el.id,
      hasContent: el.children.length > 0 || el.textContent.trim().length > 0
    })));

    // Try CraftJS-specific selectors first - these are the actual rendered content
    let canvasElement = document.querySelector('[data-cy="editor-root"]') ||
                        document.querySelector('[data-editor="true"]') ||
                        document.querySelector('div[data-cy="root-node"]') ||
                        document.querySelector('[data-cy="craft-canvas"]') ||
                        document.querySelector('.craftjs-renderer') ||
                        document.querySelector('[class*="craft"]');

    // If no CraftJS elements, try Frame-based selectors
    if (!canvasElement) {
      canvasElement = document.querySelector('iframe[title="craft-frame"]') ||
                     document.querySelector('[class*="craft-frame"]') ||
                     document.querySelector('.w-full.min-h-\\[600px\\]') ||
                     document.querySelector('[class*="Frame"]');
    }

    // Fallback to content area
    if (!canvasElement) {
      canvasElement = document.querySelector('.flex-1.p-4.overflow-auto.bg-gray-100') ||
                     document.querySelector('[class*="canvas"], [class*="Canvas"], [data-testid="canvas"]') ||
                     document.querySelector('main') ||
                     document.querySelector('[class*="content"], [class*="Content"]') ||
                     document.querySelector('[class*="editor-content"]');
    }

    // Last resort: find the largest content div
    if (!canvasElement) {
      const allDivs = Array.from(document.querySelectorAll('div'));
      canvasElement = allDivs
        .filter(div => div.offsetWidth > 400 && div.offsetHeight > 300)
        .sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight))[0];
    }

    if (!canvasElement) {
      console.warn('❌ No suitable canvas element found');
      return null;
    }

    console.log('🎯 Selected element for capture:', {
      tag: canvasElement.tagName,
      classes: canvasElement.className,
      id: canvasElement.id,
      dimensions: `${canvasElement.offsetWidth}x${canvasElement.offsetHeight}`,
      hasContent: canvasElement.children.length > 0 || canvasElement.textContent.trim().length > 0,
      childCount: canvasElement.children.length
    });

    // Check if element has actual content
    if (canvasElement.children.length === 0 && canvasElement.textContent.trim().length === 0) {
      console.warn('⚠️ Selected element appears to be empty');
      // Try to find a parent with content
      let parent = canvasElement.parentElement;
      while (parent && parent !== document.body) {
        if (parent.children.length > 1 || parent.textContent.trim().length > 50) {
          console.log('🔄 Using parent element with content:', parent.tagName, parent.className);
          canvasElement = parent;
          break;
        }
        parent = parent.parentElement;
      }
    }

    // Use html2canvas to capture the element
    const html2canvas = (await import('html2canvas')).default;
    
    console.log('📸 Starting html2canvas capture...');
    
    const canvas = await html2canvas(canvasElement, {
      width: 1200,
      height: 630,
      scale: 0.8,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      logging: true, // Enable html2canvas logging
      ignoreElements: (element) => {
        // Ignore any remaining UI elements
        const classList = Array.from(element.classList || []);
        const className = element.className || '';
        
        const shouldIgnore = element.style.display === 'none' ||
               element.style.visibility === 'hidden' ||
               classList.some(cls => cls.includes('ui-element') || 
                                   cls.includes('toolbar') || 
                                   cls.includes('menu') ||
                                   cls.includes('panel') ||
                                   cls.includes('sidebar') ||
                                   cls.includes('topbar') ||
                                   cls.includes('toolbox') ||
                                   cls.includes('layers')) ||
               element.closest('[class*="TopBar"], [class*="ToolBox"], [class*="StyleMenu"], [class*="EditorLayers"]') ||
               element.closest('[class*="panel"], [class*="toolbar"], [class*="menu"], [class*="sidebar"]');
               
        if (shouldIgnore) {
          console.log('🚫 Ignoring element:', element.tagName, element.className);
        }
        
        return shouldIgnore;
      }
    });

    console.log('✅ Canvas captured successfully:', {
      width: canvas.width,
      height: canvas.height,
      hasData: canvas.toDataURL().length > 1000 // Check if canvas has meaningful data
    });

    return canvas;
  } catch (error) {
    console.error('❌ Error capturing canvas area:', error);
    return null;
  }
};

/**
 * Uploads thumbnail blob to Firebase Storage
 * @param {Blob} blob 
 * @param {string} siteId 
 * @param {string} userId 
 * @returns {Promise<string|null>}
 */
const uploadThumbnailToStorage = async (blob, siteId, userId) => {
  try {
    const thumbnailRef = ref(storage, `thumbnails/${userId}/${siteId}.png`);
    
    // Upload the blob
    await uploadBytes(thumbnailRef, blob, {
      contentType: 'image/png',
      customMetadata: {
        siteId: siteId,
        userId: userId,
        createdAt: new Date().toISOString()
      }
    });

    // Get download URL
    const downloadURL = await getDownloadURL(thumbnailRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading thumbnail to storage:', error);
    return null;
  }
};

/**
 * Updates site document with thumbnail information
 * @param {string} siteId 
 * @param {string} userId 
 * @param {string} thumbnailUrl 
 */
const updateSiteThumbnail = async (siteId, userId, thumbnailUrl) => {
  try {
    const siteRef = doc(db, 'users', userId, 'sites', siteId);
    await updateDoc(siteRef, {
      thumbnailUrl: thumbnailUrl,
      thumbnailUpdatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating site thumbnail in Firestore:', error);
  }
};

/**
 * Caches thumbnail URL locally for quick access
 * @param {string} siteId 
 * @param {string} thumbnailUrl 
 */
const cacheThumbnailLocally = (siteId, thumbnailUrl) => {
  try {
    const cacheKey = `thumbnail_${siteId}`;
    const metaKey = `thumbnail_meta_${siteId}`;
    
    const cacheData = {
      url: thumbnailUrl,
      timestamp: Date.now(),
      source: 'firebase'
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    localStorage.setItem(metaKey, JSON.stringify({ timestamp: Date.now() }));
  } catch (error) {
    console.error('Error caching thumbnail locally:', error);
  }
};

/**
 * Gets cached thumbnail URL from localStorage or Firebase
 * @param {string} siteId 
 * @param {string} userId 
 * @returns {Promise<string|null>}
 */
export const getCachedThumbnailUrl = async (siteId, userId) => {
  try {
    // Check localStorage first
    const cacheKey = `thumbnail_${siteId}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { url, timestamp } = JSON.parse(cachedData);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      if (timestamp > oneHourAgo && url) {
        return url;
      }
    }

    // Fallback to Firebase
    const siteDoc = await getDoc(doc(db, 'users', userId, 'sites', siteId));
    if (siteDoc.exists()) {
      const siteData = siteDoc.data();
      if (siteData.thumbnailUrl) {
        // Cache it locally
        cacheThumbnailLocally(siteId, siteData.thumbnailUrl);
        return siteData.thumbnailUrl;
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting cached thumbnail URL:', error);
    return null;
  }
};

/**
 * Get a placeholder thumbnail for sites without captured thumbnails
 * @param {Object} site - Site object
 * @returns {string} - SVG data URL for placeholder
 */
export const getThumbnailPlaceholder = (site) => {
  const siteName = site?.name || 'Untitled Site';
  const firstLetter = siteName.charAt(0).toUpperCase();
  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96', '#13c2c2'];
  const colorIndex = siteName.length % colors.length;
  const backgroundColor = colors[colorIndex];
  
  const svg = `
    <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${backgroundColor}" opacity="0.1"/>
      <rect x="20" y="20" width="360" height="160" fill="white" stroke="${backgroundColor}" stroke-width="2" rx="8"/>
      <circle cx="200" cy="100" r="30" fill="${backgroundColor}" opacity="0.2"/>
      <text x="200" y="110" text-anchor="middle" fill="${backgroundColor}" font-family="Arial, sans-serif" font-size="24" font-weight="bold">${firstLetter}</text>
      <text x="200" y="140" text-anchor="middle" fill="#666" font-family="Arial, sans-serif" font-size="12">${siteName}</text>
      <text x="200" y="160" text-anchor="middle" fill="#999" font-family="Arial, sans-serif" font-size="10">Thumbnail will be generated automatically</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

/**
 * Debug function to test element detection
 * Call this from browser console: window.debugThumbnailCapture()
 */
window.debugThumbnailCapture = () => {
  console.log('🔍 Debug: Searching for content elements...');
  
  const selectors = [
    '[data-cy="editor-root"]',
    '[data-editor="true"]', 
    'div[data-cy="root-node"]',
    '[data-cy="craft-canvas"]',
    '.craftjs-renderer',
    '[class*="craft"]',
    'iframe[title="craft-frame"]',
    '[class*="craft-frame"]',
    '.w-full.min-h-\\[600px\\]',
    '[class*="Frame"]',
    '.flex-1.p-4.overflow-auto.bg-gray-100',
    '[class*="canvas"]',
    'main'
  ];
  
  selectors.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`✅ Found element with selector "${selector}":`, {
        tag: element.tagName,
        classes: element.className,
        id: element.id,
        dimensions: `${element.offsetWidth}x${element.offsetHeight}`,
        hasContent: element.children.length > 0,
        childCount: element.children.length,
        textContent: element.textContent.substring(0, 100) + '...'
      });
    } else {
      console.log(`❌ No element found for selector "${selector}"`);
    }
  });
  
  // Also try to manually capture the best element
  const bestElement = document.querySelector('[data-cy="editor-root"]') || 
                     document.querySelector('[data-editor="true"]') ||
                     document.querySelector('.flex-1.p-4.overflow-auto.bg-gray-100');
                     
  if (bestElement) {
    console.log('🎯 Best element for capture:', bestElement);
    return bestElement;
  }
};
