import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  updateDoc,
  deleteDoc,
  collection, 
  query, 
  where, 
  orderBy,
  limit,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import pako from 'pako';

/**
 * Site Management with Firestore Integration
 * Supports freemium model: 1 free site + paid additional sites
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

/**
 * User Plan Management
 */
export const getUserPlan = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      // Create default user document with free plan
      const defaultUserData = {
        plan: 'free',
        maxSites: 1,
        stripeCustomerId: null,
        subscriptionId: null,
        subscriptionStatus: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', userId), defaultUserData);
      
      return {
        plan: 'free',
        maxSites: 1,
        stripeCustomerId: null,
        subscriptionId: null,
        subscriptionStatus: null
      };
    }
    
    const userData = userDoc.data();
    return {
      plan: userData.plan || 'free',
      maxSites: userData.maxSites || 1,
      stripeCustomerId: userData.stripeCustomerId || null,
      subscriptionId: userData.subscriptionId || null,
      subscriptionStatus: userData.subscriptionStatus || null
    };
  } catch (error) {
    console.error('Error getting user plan:', error);
    // Return default plan on error to prevent app crashes
    return {
      plan: 'free',
      maxSites: 1,
      stripeCustomerId: null,
      subscriptionId: null,
      subscriptionStatus: null
    };
  }
};

export const updateUserPlan = async (userId, planData) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      plan: planData.plan,
      maxSites: planData.maxSites,
      stripeCustomerId: planData.stripeCustomerId,
      subscriptionId: planData.subscriptionId,
      subscriptionStatus: planData.subscriptionStatus,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user plan:', error);
    throw error;
  }
};

/**
 * Site Management
 */

/**
 * Check if user can create a new site
 */
export const canCreateSite = async (userId) => {
  try {
    const userPlan = await getUserPlan(userId);
    const userSites = await getUserSites(userId);
    
    // Admin users have unlimited sites
    if (userPlan.maxSites === Infinity || userPlan.plan === 'admin') {
      return {
        allowed: true,
        currentCount: userSites.length,
        maxSites: Infinity,
        isAdmin: true
      };
    }
    
    if (userSites.length >= userPlan.maxSites) {
      return {
        allowed: false,
        reason: `You've reached your site limit (${userPlan.maxSites}). Upgrade your plan to create more sites.`,
        currentCount: userSites.length,
        maxSites: userPlan.maxSites
      };
    }
    
    return {
      allowed: true,
      currentCount: userSites.length,
      maxSites: userPlan.maxSites
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
    // Check if user can create more sites
    const userPlan = await getUserPlan(userId);
    const userSites = await getUserSites(userId);
    
    // Skip limit check for admin users
    if (userPlan.maxSites !== Infinity && userPlan.plan !== 'admin' && userSites.length >= userPlan.maxSites) {
      throw new Error(`You've reached your site limit (${userPlan.maxSites}). Upgrade your plan to create more sites.`);
    }
    
    // Generate site ID
    const siteId = `site_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate required fields
    if (!siteData.name || typeof siteData.name !== 'string' || siteData.name.trim() === '') {
      throw new Error('Site name is required and must be a valid string');
    }

    // Sanitize the site name for subdomain use
    const sanitizedName = siteData.name.trim().toLowerCase().replace(/[^a-zA-Z0-9-_]/g, '-');
    
    // Create site document
    const site = {
      id: siteId,
      name: siteData.name.trim(),
      description: siteData.description || '',
      subdomain: siteData.subdomain || sanitizedName, // For /u/username/subdomain - default to sanitized site name
      customDomain: siteData.customDomain || null,
      isPublished: false,
      isMainSite: userSites.length === 0, // First site is main site
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userId: userId
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
          props: {},
          displayName: 'Root',
          custom: {},
          hidden: false,
          nodes: [],
          linkedNodes: {}
        }
      }
    });
    
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
    await updateDoc(doc(db, 'users', userId, 'sites', siteId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating site:', error);
    throw error;
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
    
    console.log(`Successfully deleted site ${siteId} for user ${userId}`);
  } catch (error) {
    console.error('Error deleting site:', error);
    throw error;
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
      seoTitle: pageData.seoTitle || pageData.name,
      seoDescription: pageData.seoDescription || '',
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
    
    // Decompress content
    const content = data.content ? JSON.parse(decompressData(data.content)) : {};
    
    return {
      id: pageDoc.id,
      ...data,
      content
    };
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
    // First, find the user by username
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('username', '==', username), limit(1));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      return null;
    }
    
    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;
    
    // Then find the site by name
    const sitesRef = collection(db, 'users', userId, 'sites');
    const siteQuery = query(
      sitesRef, 
      where('name', '==', siteName),
      where('isPublished', '==', true),
      limit(1)
    );
    const siteSnapshot = await getDocs(siteQuery);
    
    if (siteSnapshot.empty) {
      return null;
    }
    
    const siteDoc = siteSnapshot.docs[0];
    return {
      id: siteDoc.id,
      userId: userId,
      ...siteDoc.data()
    };
  } catch (error) {
    console.error('Error getting public site:', error);
    throw error;
  }
};
