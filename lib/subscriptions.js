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
  PRO: 'pro',
  ADMIN: 'admin' // Hidden tier - manually set in Firebase
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
  },
  [SUBSCRIPTION_TIERS.ADMIN]: {
    maxStorage: -1, // Unlimited
    maxImages: -1, // Unlimited
    maxVideos: -1, // Unlimited
    maxSites: -1, // Unlimited
    maxImageSize: -1, // Unlimited
    maxVideoSize: -1, // Unlimited
    features: {
      bulkOperations: true,
      advancedEditor: true,
      prioritySupport: true,
      customDomains: true,
      analytics: true,
      adminPanel: true,
      userManagement: true,
      systemSettings: true,
      fullAccess: true
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

    // Check if user needs subscription initialization
    if (!userData.subscriptionTier && !userData.subscription) {
      console.log('Initializing subscription for user:', userId);
      await initializeUserSubscription(userId);
      // Re-fetch the updated user data
      const updatedDoc = await getDoc(doc(db, 'users', userId));
      const updatedData = updatedDoc.data();
      return getUserSubscription(userId); // Recursive call with updated data
    }

    // Handle both old and new subscription data structures
    const subscriptionTier = userData.subscriptionTier || 
                           userData.tier ||  // Check old 'tier' field for backward compatibility
                           userData.subscription?.plan || 
                           SUBSCRIPTION_TIERS.FREE;
    
    // Migrate old tier field to new subscriptionTier field if needed
    if (!userData.subscriptionTier && userData.tier) {
      console.log('🔄 MIGRATING subscription tier for user:', userId, {
        from: { subscriptionTier: userData.subscriptionTier, tier: userData.tier },
        to: { subscriptionTier: userData.tier }
      });
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        subscriptionTier: userData.tier,
        'usage.lastUpdated': serverTimestamp()
      });
      console.log('✅ Migration completed for user:', userId);
      
      // Re-fetch the updated user data
      const updatedDoc = await getDoc(doc(db, 'users', userId));
      const updatedData = updatedDoc.data();
      return getUserSubscription(userId); // Recursive call with updated data
    }
    
    // If we're falling back to FREE tier and it's not explicitly set, save it to Firebase
    // BUT don't downgrade admin users who have tier='admin' but missing subscriptionTier
    if (!userData.subscriptionTier && subscriptionTier === SUBSCRIPTION_TIERS.FREE && !userData.tier) {
      console.log('⚠️  Setting explicit free tier for user (no tier found):', userId);
      await initializeUserSubscription(userId, SUBSCRIPTION_TIERS.FREE);
      // Re-fetch the updated user data
      const updatedDoc = await getDoc(doc(db, 'users', userId));
      const updatedData = updatedDoc.data();
      return getUserSubscription(userId); // Recursive call with updated data
    }
    
    // PROTECT ADMIN USERS: If user has tier='admin', ensure subscriptionTier is also 'admin'
    if (userData.tier === SUBSCRIPTION_TIERS.ADMIN && subscriptionTier !== SUBSCRIPTION_TIERS.ADMIN) {
      console.log('🛡️  PROTECTING admin user from downgrade:', userId, {
        'userData.tier': userData.tier,
        'calculated subscriptionTier': subscriptionTier,
        'userData.subscriptionTier': userData.subscriptionTier
      });
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        subscriptionTier: SUBSCRIPTION_TIERS.ADMIN,
        'usage.sitesCount': -1,
        'usage.lastUpdated': serverTimestamp(),
        adminProtectionApplied: serverTimestamp()
      });
      console.log('🛡️  Admin protection applied for user:', userId);
      
      // Return corrected subscription data immediately
      const correctedSubscription = {
        tier: SUBSCRIPTION_TIERS.ADMIN,
        limits: TIER_LIMITS[SUBSCRIPTION_TIERS.ADMIN],
        usage: { ...userData.usage, sitesCount: -1 },
        subscriptionExpiry: userData.subscriptionExpiry || null,
        features: TIER_LIMITS[SUBSCRIPTION_TIERS.ADMIN].features
      };
      return correctedSubscription;
    }
    
    const limits = TIER_LIMITS[subscriptionTier];
    
    const result = {
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
    // Ensure admin users reflect unlimited sites with sitesCount = -1
    if (subscriptionTier === SUBSCRIPTION_TIERS.ADMIN) {
      result.usage = {
        ...result.usage,
        sitesCount: -1
      };
      // Also update the database if needed
      if (userData.usage?.sitesCount !== -1) {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          'usage.sitesCount': -1
        });
      }
    }
    
    return result;
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
        
        // Admins have unlimited everything
        if (tier === SUBSCRIPTION_TIERS.ADMIN) {
          return { allowed: true };
        }
        
        // Check storage limit
        if (usage.storageUsed + fileSize > limits.maxStorage) {
          return {
            allowed: false,
            reason: 'storage_exceeded',
            message: `Storage limit exceeded. ${tier === SUBSCRIPTION_TIERS.FREE ? 'Upgrade to Pro for 10GB storage.' : 'Contact support for additional storage.'}`,
            upgradeRequired: tier === SUBSCRIPTION_TIERS.FREE
          };
        }
        
        // Check file size limit
        const maxFileSize = fileType === 'image' ? limits.maxImageSize : limits.maxVideoSize;
        if (fileSize > maxFileSize) {
          return {
            allowed: false,
            reason: 'file_size_exceeded',
            message: `File too large. ${fileType === 'image' ? 'Images' : 'Videos'} must be under ${(maxFileSize / 1024 / 1024).toFixed(0)}MB${tier === SUBSCRIPTION_TIERS.FREE ? '. Upgrade to Pro for larger files.' : '.'}`,
            upgradeRequired: tier === SUBSCRIPTION_TIERS.FREE
          };
        }
        
        // Check file count limits
        if (fileType === 'image' && limits.maxImages !== -1 && usage.imageCount >= limits.maxImages) {
          return {
            allowed: false,
            reason: 'file_count_exceeded',
            message: `Image limit reached (${limits.maxImages}). Upgrade to Pro for unlimited images.`,
            upgradeRequired: true
          };
        }
        
        if (fileType === 'video' && limits.maxVideos !== -1 && usage.videoCount >= limits.maxVideos) {
          return {
            allowed: false,
            reason: 'file_count_exceeded',
            message: `Video limit reached (${limits.maxVideos}). Upgrade to Pro for unlimited videos.`,
            upgradeRequired: true
          };
        }
        
        return { allowed: true };

      case 'create_site':
        // Admins have unlimited sites
        if (tier === SUBSCRIPTION_TIERS.ADMIN) {
          return { allowed: true };
        }
        
        if (limits.maxSites !== -1 && usage.sitesCount >= limits.maxSites) {
          return {
            allowed: false,
            reason: 'site_count_exceeded',
            message: `Site limit reached (${limits.maxSites}). Upgrade to Pro for unlimited sites.`,
            upgradeRequired: true
          };
        }
        return { allowed: true };

      case 'use_feature':
        const { feature } = data;
        
        // Admins have access to all features
        if (tier === SUBSCRIPTION_TIERS.ADMIN) {
          return { allowed: true };
        }
        
        if (!limits.features[feature]) {
          return {
            allowed: false,
            reason: 'feature_restricted',
            message: `${feature} is a Pro feature. Upgrade to access advanced features.`,
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
 * Supports both action-based updates and direct usage updates
 */
export const updateUserUsage = async (userId, actionOrUsageData, data = {}) => {
  try {
    const userRef = doc(db, 'users', userId);
  const subscription = await getUserSubscription(userId);
  const isAdmin = subscription.tier === SUBSCRIPTION_TIERS.ADMIN;
    
    // Check if first parameter is a usage object (new format from MediaLibrary)
  if (typeof actionOrUsageData === 'object' && actionOrUsageData !== null) {
      const usageUpdates = actionOrUsageData;
      const updates = {
        'usage.lastUpdated': serverTimestamp()
      };
      
      // Handle storage changes
      if (usageUpdates.storageUsed !== undefined) {
        updates['usage.storageUsed'] = increment(usageUpdates.storageUsed);
      }
      
      // Handle image count changes
      if (usageUpdates.imageCount !== undefined) {
        updates['usage.imageCount'] = increment(usageUpdates.imageCount);
      }
      
      // Handle video count changes
      if (usageUpdates.videoCount !== undefined) {
        updates['usage.videoCount'] = increment(usageUpdates.videoCount);
      }
      
      // Handle site count changes: admins always -1; clamp non-admins to >= 0
      if (usageUpdates.sitesCount !== undefined) {
        if (isAdmin) {
          updates['usage.sitesCount'] = -1;
        } else {
          const userSnap = await getDoc(userRef);
          const current = userSnap.data()?.usage?.sitesCount || 0;
          const proposed = current + Number(usageUpdates.sitesCount || 0);
          updates['usage.sitesCount'] = Math.max(proposed, 0);
        }
      }
      
      await updateDoc(userRef, updates);
      return;
    }
    
    // Handle action-based updates (legacy format)
  const action = actionOrUsageData;
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
        if (isAdmin) {
          await updateDoc(userRef, {
            'usage.sitesCount': -1,
            'usage.lastUpdated': serverTimestamp()
          });
        } else {
          await updateDoc(userRef, {
            'usage.sitesCount': increment(1),
            'usage.lastUpdated': serverTimestamp()
          });
        }
        break;

      case 'site_deleted':
        if (isAdmin) {
          await updateDoc(userRef, {
            'usage.sitesCount': -1,
            'usage.lastUpdated': serverTimestamp()
          });
        } else {
          const userSnap = await getDoc(userRef);
          const current = userSnap.data()?.usage?.sitesCount || 0;
          const newCount = Math.max(current - 1, 0);
          await updateDoc(userRef, {
            'usage.sitesCount': newCount,
            'usage.lastUpdated': serverTimestamp()
          });
        }
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
    
    // Initialize if document doesn't exist OR if subscription data is missing
    if (!userDoc.exists() || !userDoc.data()?.subscriptionTier) {
    const subscriptionData = {
        subscriptionTier: tier,
        usage: {
          storageUsed: 0,
          imageCount: 0,
          videoCount: 0,
      // Admins show unlimited via -1, others start at 0
      sitesCount: tier === SUBSCRIPTION_TIERS.ADMIN ? -1 : 0,
          lastUpdated: serverTimestamp()
        },
        subscriptionCreated: serverTimestamp()
      };
      
      await setDoc(userRef, subscriptionData, { merge: true });
      console.log('Subscription initialized successfully for user:', userId, 'with tier:', tier);
    } else {
      console.log('User already has subscription data, skipping initialization');
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
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
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

/**
 * Check if user is an admin
 */
export const isUserAdmin = async (userId) => {
  try {
    const subscription = await getUserSubscription(userId);
    return subscription.tier === SUBSCRIPTION_TIERS.ADMIN;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Manually upgrade user to admin (for internal use)
 */
export const upgradeUserToAdmin = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      subscriptionTier: SUBSCRIPTION_TIERS.ADMIN,
  'usage.sitesCount': -1,
      adminUpgradeDate: serverTimestamp(),
      adminUpgradedBy: 'manual' // Could be changed to track who upgraded them
    });
    console.log('User upgraded to admin successfully:', userId);
  } catch (error) {
    console.error('Error upgrading user to admin:', error);
    throw error;
  }
};

/**
 * Ensure user has proper subscription data (useful for dashboard/existing users)
 */
export const ensureUserSubscription = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    // Check if user needs subscription data migration/initialization
    if (!userData.subscriptionTier) {
      console.log('🔧 ENSURE subscription for user:', userId, {
        currentData: {
          tier: userData.tier,
          subscriptionTier: userData.subscriptionTier,
          'subscription.plan': userData.subscription?.plan
        }
      });
      
      // Determine tier from old subscription data or old tier field or default to free
      const tier = userData.tier || userData.subscription?.plan || SUBSCRIPTION_TIERS.FREE;
      
      console.log('🎯 Determined tier for user:', userId, '- tier will be:', tier);
      
      // Preserve existing usage if available, otherwise start fresh
      const existingUsage = userData.usage || {};
      
      const subscriptionData = {
        subscriptionTier: tier,
        usage: {
          storageUsed: existingUsage.storageUsed || 0,
          imageCount: existingUsage.imageCount || 0,
          videoCount: existingUsage.videoCount || 0,
          // Preserve existing count unless admin; admin should be -1
          sitesCount: tier === SUBSCRIPTION_TIERS.ADMIN 
            ? -1 
            : (existingUsage.sitesCount ?? userData.subscription?.sitesUsed ?? 0),
          lastUpdated: serverTimestamp()
        },
        subscriptionCreated: userData.subscriptionCreated || serverTimestamp(),
        // Preserve any existing subscription expiry
        ...(userData.subscriptionExpiry && { subscriptionExpiry: userData.subscriptionExpiry })
      };
      
      await updateDoc(userRef, subscriptionData);
      
      return await getUserSubscription(userId);
    }
    
    // User already has proper subscription data
    return await getUserSubscription(userId);
  } catch (error) {
    console.error('Error ensuring user subscription:', error);
    throw error;
  }
};
