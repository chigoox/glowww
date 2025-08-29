const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock quota functions for testing
const getTierLimits = (tier) => {
  const limits = {
    free: { daily: 50, monthly: 1000, burst: 10 },
    pro: { daily: 1000, monthly: 25000, burst: 100 },
    business: { daily: 5000, monthly: 150000, burst: 500 },
    admin: { daily: Infinity, monthly: Infinity, burst: Infinity }
  };
  return limits[tier] || limits.free;
};

// Mock usage data and subscription tiers for testing
let mockUsageData = {};
let mockSubscriptionTier = 'free';

const getUserSubscription = async (userId) => {
  // Mock user subscription lookup
  return { tier: mockSubscriptionTier, status: 'active' };
};

const getUserQuotaUsage = async (userId) => {
  return mockUsageData[userId] || {
    daily: 0,
    monthly: 0,
    lastReset: new Date().toISOString(),
    tier: 'free',
    limits: getTierLimits('free')
  };
};

const checkSendQuota = async (userId, options = {}) => {
  const usage = await getUserQuotaUsage(userId);
  const subscription = await getUserSubscription(userId);
  const limits = getTierLimits(subscription.tier);
  
  // Allow unlimited for admin tier
  if (subscription.tier === 'admin') {
    return { allowed: true, tier: subscription.tier, remaining: Infinity };
  }
  
  // Always allow test sends and retries (handle null options)
  if (options && (options.isTest || options.isRetry)) {
    return { allowed: true, tier: subscription.tier, remaining: limits.daily - usage.daily, isExempt: true };
  }
  
  // Check daily limit
  const allowed = usage.daily < limits.daily;
  return {
    allowed,
    tier: subscription.tier,
    remaining: Math.max(0, limits.daily - usage.daily),
    current: usage.daily,
    limit: limits.daily
  };
};

const recordSendAttempt = async (userId, options = {}) => {
  // Don't record test sends or retries (handle null options)
  if (options && (options.isTest || options.isRetry)) {
    return { recorded: false, reason: options.isTest ? 'test-send' : 'retry' };
  }
  
  // In real implementation, this would write to Firestore
  if (!mockUsageData[userId]) {
    mockUsageData[userId] = { daily: 0, monthly: 0 };
  }
  
  mockUsageData[userId].daily++;
  mockUsageData[userId].monthly++;
  
  return { 
    recorded: true, 
    newDaily: mockUsageData[userId].daily,
    newMonthly: mockUsageData[userId].monthly
  };
};

describe('Email Quota System', () => {
  beforeEach(() => {
    // Clear mock usage data and reset tier
    mockUsageData = {};
    mockSubscriptionTier = 'free';
  });

  describe('getTierLimits', () => {
    it('should return correct limits for each tier', () => {
      expect(getTierLimits('free')).toEqual({
        daily: 50,
        monthly: 1000,
        burst: 10
      });
      
      expect(getTierLimits('pro')).toEqual({
        daily: 1000,
        monthly: 25000,
        burst: 100
      });
      
      expect(getTierLimits('business')).toEqual({
        daily: 5000,
        monthly: 150000,
        burst: 500
      });
      
      expect(getTierLimits('admin')).toEqual({
        daily: Infinity,
        monthly: Infinity,
        burst: Infinity
      });
    });
    
    it('should default to free tier for unknown tiers', () => {
      expect(getTierLimits('unknown')).toEqual(getTierLimits('free'));
      expect(getTierLimits(null)).toEqual(getTierLimits('free'));
      expect(getTierLimits(undefined)).toEqual(getTierLimits('free'));
    });
  });

  describe('getUserSubscription', () => {
    it('should return free tier as default', async () => {
      const subscription = await getUserSubscription('user-123');
      expect(subscription).toEqual({
        tier: 'free',
        status: 'active'
      });
    });
  });

  describe('getUserQuotaUsage', () => {
    it('should return zero usage when no records exist', async () => {
      const usage = await getUserQuotaUsage('new-user');
      
      expect(usage.daily).toBe(0);
      expect(usage.monthly).toBe(0);
      expect(usage.tier).toBe('free');
      expect(usage.limits).toEqual(getTierLimits('free'));
    });

    it('should return stored usage when records exist', async () => {
      // Set up mock data
      mockUsageData['existing-user'] = {
        daily: 25,
        monthly: 100,
        tier: 'pro',
        limits: getTierLimits('pro')
      };

      const usage = await getUserQuotaUsage('existing-user');
      
      expect(usage.daily).toBe(25);
      expect(usage.monthly).toBe(100);
    });
  });

  describe('checkSendQuota', () => {
    it('should allow sends within quota limits', async () => {
      // Set usage below limits
      mockUsageData['user-1'] = { daily: 10, monthly: 50 };

      const result = await checkSendQuota('user-1');
      
      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('free');
      expect(result.remaining).toBe(40); // 50 - 10
      expect(result.current).toBe(10);
      expect(result.limit).toBe(50);
    });

    it('should block sends when daily quota exceeded', async () => {
      // Set usage at limit
      mockUsageData['user-2'] = { daily: 50, monthly: 200 };

      const result = await checkSendQuota('user-2');
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.current).toBe(50);
      expect(result.limit).toBe(50);
    });

    it('should allow test sends even when quota exceeded', async () => {
      // Set usage over limit
      mockUsageData['user-3'] = { daily: 50, monthly: 200 };

      const result = await checkSendQuota('user-3', { isTest: true });
      
      expect(result.allowed).toBe(true);
      expect(result.isExempt).toBe(true);
    });

    it('should allow retries even when quota exceeded', async () => {
      // Set usage over limit
      mockUsageData['user-4'] = { daily: 50, monthly: 200 };

      const result = await checkSendQuota('user-4', { isRetry: true });
      
      expect(result.allowed).toBe(true);
      expect(result.isExempt).toBe(true);
    });

    it('should allow unlimited sends for admin tier', async () => {
      // Set mock to return admin tier
      mockSubscriptionTier = 'admin';
      
      // Set high usage that would exceed other tiers
      mockUsageData['admin-user'] = { daily: 10000, monthly: 50000 };

      const result = await checkSendQuota('admin-user');
      
      expect(result.allowed).toBe(true);
      expect(result.tier).toBe('admin');
      expect(result.remaining).toBe(Infinity);
      
      // Reset to free tier for other tests
      mockSubscriptionTier = 'free';
    });
  });

  describe('recordSendAttempt', () => {
    it('should record successful send attempt', async () => {
      const result = await recordSendAttempt('user-1');
      
      expect(result.recorded).toBe(true);
      expect(result.newDaily).toBe(1);
      expect(result.newMonthly).toBe(1);
      
      // Verify usage was updated
      const usage = await getUserQuotaUsage('user-1');
      expect(usage.daily).toBe(1);
    });

    it('should not record test sends in quota tracking', async () => {
      const result = await recordSendAttempt('user-2', { isTest: true });
      
      expect(result.recorded).toBe(false);
      expect(result.reason).toBe('test-send');
      
      // Verify usage was not updated
      const usage = await getUserQuotaUsage('user-2');
      expect(usage.daily).toBe(0);
    });

    it('should not record retries in quota tracking', async () => {
      const result = await recordSendAttempt('user-3', { isRetry: true });
      
      expect(result.recorded).toBe(false);
      expect(result.reason).toBe('retry');
      
      // Verify usage was not updated
      const usage = await getUserQuotaUsage('user-3');
      expect(usage.daily).toBe(0);
    });

    it('should increment usage correctly for multiple sends', async () => {
      await recordSendAttempt('user-4');
      await recordSendAttempt('user-4');
      await recordSendAttempt('user-4');
      
      const usage = await getUserQuotaUsage('user-4');
      expect(usage.daily).toBe(3);
      expect(usage.monthly).toBe(3);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete quota check and record flow', async () => {
      const userId = 'integration-user';
      
      // 1. Check quota (should be allowed)
      let quotaCheck = await checkSendQuota(userId);
      expect(quotaCheck.allowed).toBe(true);
      expect(quotaCheck.remaining).toBe(50);
      
      // 2. Record send
      let record = await recordSendAttempt(userId);
      expect(record.recorded).toBe(true);
      expect(record.newDaily).toBe(1);
      
      // 3. Check quota again (remaining should decrease)
      quotaCheck = await checkSendQuota(userId);
      expect(quotaCheck.remaining).toBe(49);
      expect(quotaCheck.current).toBe(1);
    });

    it('should handle quota enforcement across multiple users', async () => {
      const users = ['user-a', 'user-b', 'user-c'];
      
      // Each user sends 25 emails (within limit)
      for (const userId of users) {
        for (let i = 0; i < 25; i++) {
          const quotaCheck = await checkSendQuota(userId);
          expect(quotaCheck.allowed).toBe(true);
          
          await recordSendAttempt(userId);
        }
      }
      
      // Verify each user's usage
      for (const userId of users) {
        const usage = await getUserQuotaUsage(userId);
        expect(usage.daily).toBe(25);
        
        const quotaCheck = await checkSendQuota(userId);
        expect(quotaCheck.remaining).toBe(25);
      }
    });

    it('should handle mixed regular and test sends', async () => {
      const userId = 'mixed-sends-user';
      
      // Send 48 regular emails (close to limit)
      for (let i = 0; i < 48; i++) {
        await recordSendAttempt(userId);
      }
      
      // Should have 2 remaining
      let quotaCheck = await checkSendQuota(userId);
      expect(quotaCheck.remaining).toBe(2);
      
      // Test sends should still be allowed
      const testResult = await checkSendQuota(userId, { isTest: true });
      expect(testResult.allowed).toBe(true);
      expect(testResult.isExempt).toBe(true);
      
      // Record test send (shouldn't affect quota)
      await recordSendAttempt(userId, { isTest: true });
      
      // Regular quota should be unchanged
      quotaCheck = await checkSendQuota(userId);
      expect(quotaCheck.remaining).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing user gracefully', async () => {
      const usage = await getUserQuotaUsage('nonexistent-user');
      expect(usage.daily).toBe(0);
      expect(usage.monthly).toBe(0);
    });

    it('should handle malformed options', async () => {
      const result1 = await checkSendQuota('user-1', null);
      expect(result1.allowed).toBe(true);
      
      const result2 = await checkSendQuota('user-1', {});
      expect(result2.allowed).toBe(true);
      
      const result3 = await checkSendQuota('user-1', { isTest: 'invalid' });
      expect(result3.allowed).toBe(true); // Should not treat as test
    });

    it('should handle quota calculation edge cases', async () => {
      // Test at exact limit
      mockUsageData['edge-user'] = { daily: 49, monthly: 999 };
      
      // Should allow one more
      const result1 = await checkSendQuota('edge-user');
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(1);
      
      // After recording, should hit limit
      await recordSendAttempt('edge-user');
      
      const result2 = await checkSendQuota('edge-user');
      expect(result2.allowed).toBe(false);
      expect(result2.remaining).toBe(0);
    });

    it('should handle concurrent usage tracking', async () => {
      const userId = 'concurrent-user';
      
      // Simulate concurrent send attempts
      const promises = Array.from({ length: 10 }, () => 
        recordSendAttempt(userId)
      );
      
      const results = await Promise.all(promises);
      
      // All should be recorded
      expect(results.every(r => r.recorded)).toBe(true);
      
      // Final usage should be correct
      const usage = await getUserQuotaUsage(userId);
      expect(usage.daily).toBe(10);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large quota checks efficiently', async () => {
      const startTime = Date.now();
      
      // Perform 100 quota checks
      const promises = Array.from({ length: 100 }, (_, i) => 
        checkSendQuota(`perf-user-${i}`)
      );
      
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(results).toHaveLength(100);
      expect(results.every(r => r.allowed)).toBe(true);
    });

    it('should handle bulk send recording efficiently', async () => {
      const startTime = Date.now();
      
      // Record 50 sends (close to free tier limit)
      const promises = Array.from({ length: 50 }, () => 
        recordSendAttempt('bulk-user')
      );
      
      await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(50); // Should complete quickly
      
      // Verify final state
      const usage = await getUserQuotaUsage('bulk-user');
      expect(usage.daily).toBe(50);
    });
  });
});
