// Email send quotas based on user subscription tier
import { adminDb } from '../firebaseAdmin';
import { getUserSubscription } from '../subscriptions';

// Daily send limits by tier
const TIER_LIMITS = {
  free: 50,
  pro: 1000,
  business: 5000,
  admin: -1 // unlimited
};

/**
 * Get daily send limit for a user based on their tier
 */
export function getDailyLimit(tier) {
  return TIER_LIMITS[tier] || TIER_LIMITS.free;
}

/**
 * Check if user can send email based on their daily quota
 * @param {string} userId - User ID
 * @param {boolean} isTest - Whether this is a test send (excluded from quota)
 * @param {boolean} isRetry - Whether this is a retry (excluded from quota)
 * @returns {Promise<{allowed: boolean, usage: number, limit: number, tier: string}>}
 */
export async function checkSendQuota(userId, isTest = false, isRetry = false) {
  try {
    // Test sends and retries don't count against quota
    if (isTest || isRetry) {
      return { allowed: true, usage: 0, limit: -1, tier: 'test/retry' };
    }

    // Get user's subscription tier
    const subscription = await getUserSubscription(userId);
    const tier = subscription?.tier || 'free';
    const limit = getDailyLimit(tier);

    // Admin tier has no limits
    if (limit === -1) {
      return { allowed: true, usage: 0, limit: -1, tier };
    }

    // Get today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count sent emails today (excluding test and retries)
    const usage = await getTodayUsage(userId, today, tomorrow);

    return {
      allowed: usage < limit,
      usage,
      limit,
      tier
    };
  } catch (error) {
    console.error('checkSendQuota error:', error);
    // Conservative fallback: allow with free tier limits
    return { allowed: true, usage: 0, limit: TIER_LIMITS.free, tier: 'fallback' };
  }
}

/**
 * Get today's email usage for a user
 */
async function getTodayUsage(userId, startOfDay, endOfDay) {
  if (!adminDb) return 0;
  
  try {
    // Query messages sent today by this user (exclude test:true)
    const snapshot = await adminDb.collection('emailMessages')
      .where('userId', '==', userId)
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<', endOfDay)
      .where('test', '!=', true)
      .get();

    return snapshot.size;
  } catch (error) {
    console.error('getTodayUsage error:', error);
    return 0;
  }
}

/**
 * Record a send attempt (for quota tracking)
 * @param {string} userId - User ID
 * @param {string} siteId - Site ID
 * @param {boolean} isTest - Whether this is a test send
 * @param {boolean} isRetry - Whether this is a retry
 */
export async function recordSendAttempt(userId, siteId, isTest = false, isRetry = false) {
  if (!adminDb || isTest || isRetry) return;

  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const docId = `${userId}_${today}`;
    
    const ref = adminDb.collection('emailQuotaUsage').doc(docId);
    await ref.set({
      userId,
      date: today,
      count: adminDb.FieldValue.increment(1),
      lastUpdated: new Date()
    }, { merge: true });
  } catch (error) {
    console.error('recordSendAttempt error:', error);
  }
}

/**
 * Get quota status for a user
 * @param {string} userId - User ID
 * @returns {Promise<{usage: number, limit: number, tier: string, resetTime: string}>}
 */
export async function getQuotaStatus(userId) {
  try {
    const subscription = await getUserSubscription(userId);
    const tier = subscription?.tier || 'free';
    const limit = getDailyLimit(tier);

    // Get today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const usage = await getTodayUsage(userId, today, tomorrow);

    return {
      usage,
      limit,
      tier,
      resetTime: tomorrow.toISOString()
    };
  } catch (error) {
    console.error('getQuotaStatus error:', error);
    return {
      usage: 0,
      limit: TIER_LIMITS.free,
      tier: 'free',
      resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }
}
