/**
 * User Subscription and Tier Management Service
 * Handles subscription tiers, limits, and usage tracking
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Subscription Tiers
 */
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro'
};

/**
 * Default limits for each tier
 */
export const TIER_LIMITS = {
  [SUBSCRIPTION_TIERS.FREE]: {
    maxStorage: 100 * 1024 * 1024, // 100MB
    maxImages: 20,
    maxVideos: 5,
    maxSites: 1,
    maxImageSize: 2 * 1024 * 1024, // 2MB
    maxVideoSize: 10 * 1024 * 1024, // 10MB
    features: {
      bulkOperations: false,
      advancedEditor: false,
      prioritySupport: false,
      customDomains: false,
      analytics: false
    }
  },
  [SUBSCRIPTION_TIERS.PRO]: {
    maxStorage: 10 * 1024 * 1024 * 1024, // 10GB
    maxImages: -1, // Unlimited
    maxVideos: -1, // Unlimited
    maxSites: -1, // Unlimited
    maxImageSize: 10 * 1024 * 1024, // 10MB
    maxVideoSize: 100 * 1024 * 1024, // 100MB
    features: {
      bulkOperations: true,
      advancedEditor: true,
      prioritySupport: true,
      customDomains: true,
      analytics: true
    }
  }
};

/**
 * Get user's subscription data
 */
export const getUserSubscription = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    
    if (!userData) {
      throw new Error('User not found');
    }

    // Default to free tier if no subscription data
    const subscriptionTier = userData.subscriptionTier || SUBSCRIPTION_TIERS.FREE;
    const limits = TIER_LIMITS[subscriptionTier];
    
    return {
      tier: subscriptionTier,
      limits,
      usage: userData.usage || {
        storageUsed: 0,
        imageCount: 0,
        videoCount: 0,
        sitesCount: 0
      },
      subscriptionExpiry: userData.subscriptionExpiry || null,
      features: limits.features
    };
  } catch (error) {
    console.error('Error getting user subscription:', error);
    throw error;
  }
};

/**
 * Check if user can perform an action based on their tier limits
 */
export const checkUserLimits = async (userId, action, data = {}) => {
  try {
    const subscription = await getUserSubscription(userId);
    const { limits, usage, tier } = subscription;

    switch (action) {
      case 'upload_file':
        const { fileType, fileSize } = data;
        
        // Check storage limit
        if (usage.storageUsed + fileSize > limits.maxStorage) {
          return {
            allowed: false,
            reason: `Storage limit exceeded. ${tier === SUBSCRIPTION_TIERS.FREE ? 'Upgrade to Pro for 10GB storage.' : 'Contact support for additional storage.'}`,
            upgradeRequired: tier === SUBSCRIPTION_TIERS.FREE
          };
        }
        
        // Check file size limit
        const maxFileSize = fileType === 'image' ? limits.maxImageSize : limits.maxVideoSize;
        if (fileSize > maxFileSize) {
          return {
            allowed: false,
            reason: `File too large. ${fileType === 'image' ? 'Images' : 'Videos'} must be under ${(maxFileSize / 1024 / 1024).toFixed(0)}MB${tier === SUBSCRIPTION_TIERS.FREE ? '. Upgrade to Pro for larger files.' : '.'}`,
            upgradeRequired: tier === SUBSCRIPTION_TIERS.FREE
          };
        }
        
        // Check file count limits
        if (fileType === 'image' && limits.maxImages !== -1 && usage.imageCount >= limits.maxImages) {
          return {
            allowed: false,
            reason: `Image limit reached (${limits.maxImages}). Upgrade to Pro for unlimited images.`,
            upgradeRequired: true
          };
        }
        
        if (fileType === 'video' && limits.maxVideos !== -1 && usage.videoCount >= limits.maxVideos) {
          return {
            allowed: false,
            reason: `Video limit reached (${limits.maxVideos}). Upgrade to Pro for unlimited videos.`,
            upgradeRequired: true
          };
        }
        
        return { allowed: true };

      case 'create_site':
        if (limits.maxSites !== -1 && usage.sitesCount >= limits.maxSites) {
          return {
            allowed: false,
            reason: `Site limit reached (${limits.maxSites}). Upgrade to Pro for unlimited sites.`,
            upgradeRequired: true
          };
        }
        return { allowed: true };

      case 'use_feature':
        const { feature } = data;
        if (!limits.features[feature]) {
          return {
            allowed: false,
            reason: `${feature} is a Pro feature. Upgrade to access advanced features.`,
            upgradeRequired: true
          };
        }
        return { allowed: true };

      default:
        return { allowed: true };
    }
  } catch (error) {
    console.error('Error checking user limits:', error);
    // Allow action if we can't check limits (fail-open for better UX)
    return { allowed: true };
  }
};

/**
 * Update user usage after successful action
 */
export const updateUserUsage = async (userId, action, data = {}) => {
  try {
    const userRef = doc(db, 'users', userId);
    
    switch (action) {
      case 'file_uploaded':
        const { fileType, fileSize } = data;
        const updates = {
          'usage.storageUsed': increment(fileSize),
          'usage.lastUpdated': serverTimestamp()
        };
        
        if (fileType === 'image') {
          updates['usage.imageCount'] = increment(1);
        } else if (fileType === 'video') {
          updates['usage.videoCount'] = increment(1);
        }
        
        await updateDoc(userRef, updates);
        break;

      case 'file_deleted':
        const { fileType: deletedFileType, fileSize: deletedFileSize } = data;
        const deleteUpdates = {
          'usage.storageUsed': increment(-deletedFileSize),
          'usage.lastUpdated': serverTimestamp()
        };
        
        if (deletedFileType === 'image') {
          deleteUpdates['usage.imageCount'] = increment(-1);
        } else if (deletedFileType === 'video') {
          deleteUpdates['usage.videoCount'] = increment(-1);
        }
        
        await updateDoc(userRef, deleteUpdates);
        break;

      case 'site_created':
        await updateDoc(userRef, {
          'usage.sitesCount': increment(1),
          'usage.lastUpdated': serverTimestamp()
        });
        break;

      case 'site_deleted':
        await updateDoc(userRef, {
          'usage.sitesCount': increment(-1),
          'usage.lastUpdated': serverTimestamp()
        });
        break;
    }
  } catch (error) {
    console.error('Error updating user usage:', error);
    // Don't throw - usage tracking shouldn't block functionality
  }
};

/**
 * Initialize user subscription data
 */
export const initializeUserSubscription = async (userId, tier = SUBSCRIPTION_TIERS.FREE) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists() || !userDoc.data().subscriptionTier) {
      await setDoc(userRef, {
        subscriptionTier: tier,
        usage: {
          storageUsed: 0,
          imageCount: 0,
          videoCount: 0,
          sitesCount: 0,
          lastUpdated: serverTimestamp()
        },
        subscriptionCreated: serverTimestamp()
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error initializing user subscription:', error);
    throw error;
  }
};

/**
 * Upgrade user to Pro
 */
export const upgradeUserToPro = async (userId, subscriptionExpiry = null) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      subscriptionTier: SUBSCRIPTION_TIERS.PRO,
      subscriptionExpiry: subscriptionExpiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      upgradeDate: serverTimestamp()
    });
  } catch (error) {
    console.error('Error upgrading user to Pro:', error);
    throw error;
  }
};

/**
 * Get usage percentage for display
 */
export const getUsagePercentage = (used, limit) => {
  if (limit === -1) return 0; // Unlimited
  return Math.min((used / limit) * 100, 100);
};

/**
 * Format storage size for display
 */
export const formatStorageSize = (bytes) => {
  if (bytes === 0) return '0 B';
  if (bytes === -1) return 'Unlimited';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Get upgrade benefits for display
 */
export const getUpgradeBenefits = () => [
  '10GB Cloud Storage (100x more)',
  'Unlimited Images & Videos', 
  'Unlimited Websites',
  'Larger File Uploads (10MB images, 100MB videos)',
  'Bulk Operations & Advanced Editor',
  'Priority Support',
  'Custom Domains',
  'Advanced Analytics'
];
