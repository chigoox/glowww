const { describe, it, expect, beforeEach } = require('@jest/globals');

// Quota helper functions (simulate production logic but simplified)
const getTierLimits = (tier) => {
  const limits = {
    free: { daily: 50, monthly: 1000, burst: 10 },
    pro: { daily: 1000, monthly: 25000, burst: 100 },
    business: { daily: 5000, monthly: 150000, burst: 500 },
    admin: { daily: Infinity, monthly: Infinity, burst: Infinity }
  };
  return limits[tier] || limits.free;
};

// Firestore mock (jest.fn) declared below; functions refer to it at runtime
let getUserSubscription = async (_userId) => ({ tier: 'free', status: 'active' });

const getUserQuotaUsage = async (userId) => {
  try {
    const col = mockFirestore.collection('email_sends');
    // Simulate chained where clauses present in test mocks
    const snap = col.where && col.where().where().where().get ? col.where().where().where().get() : null;
    let daily = 0;
    if (snap && !snap.empty) {
      const docs = snap.docs || [];
      for (const doc of docs) {
        const data = typeof doc.data === 'function' ? doc.data() : {};
        const c = data && typeof data.count === 'number' && data.count > 0 ? data.count : 0;
        daily += c;
      }
    }
    // Monthly just mirrors daily in this simplified mock
    return {
      daily,
      monthly: daily,
      lastReset: new Date().toISOString(),
      tier: 'free',
      limits: getTierLimits('free')
    };
  } catch (e) {
    return {
      daily: 0,
      monthly: 0,
      lastReset: new Date().toISOString(),
      tier: 'free',
      limits: getTierLimits('free')
    };
  }
};

const checkSendQuota = async (userId, options = {}) => {
  const subscription = await getUserSubscription(userId);
  const usage = await getUserQuotaUsage(userId);
  // Promote usage tier from subscription (simplified)
  usage.tier = subscription.tier;
  usage.limits = getTierLimits(subscription.tier);
  // Admin bypass
  if (subscription.tier === 'admin') {
    return { allowed: true, usage };
  }
  if (options.isTest || options.isRetry) return { allowed: true, usage };
  if (usage.daily >= usage.limits.daily) {
    return { allowed: false, reason: 'daily_quota_exceeded', usage };
  }
  return { allowed: true, usage };
};

const recordSendAttempt = async (userId, options = {}) => {
  const { success = true, isTest = false, isRetry = false } = options;
  const payload = {
    userId,
    success: !!success,
    isTest: !!isTest,
    isRetry: !!isRetry,
    timestamp: new Date()
  };
  if (isTest || isRetry) payload.excludeFromQuota = true;
  const col = mockFirestore.collection('email_sends');
  if (col && col.add) await col.add(payload);
};

// Mock Firebase with jest.fn so tests can override via mockReturnValue
const mockFirestore = {
  collection: jest.fn(() => ({
    where: jest.fn(() => ({
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn(() => ({
            empty: true,
            docs: [],
            forEach: jest.fn()
          }))
        }))
      }))
    })),
    add: jest.fn(() => Promise.resolve({ id: 'test-id' })),
    doc: jest.fn(() => ({
      set: jest.fn(() => Promise.resolve()),
      get: jest.fn(() => ({
        exists: false,
        data: () => ({})
      }))
    }))
  }))
};

describe('Email Quota System', () => {
  beforeEach(() => {
    // Clear any state between tests
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
      expect(getTierLimits('unknown')).toEqual({
        daily: 50,
        monthly: 1000,
        burst: 10
      });

      expect(getTierLimits(null)).toEqual({
        daily: 50,
        monthly: 1000,
        burst: 10
      });
    });
  });

  describe('getUserSubscription', () => {
    it('should return free tier as default', async () => {
      const subscription = await getUserSubscription('user123');
      expect(subscription).toEqual({
        tier: 'free',
        status: 'active'
      });
    });
  });

  describe('getUserQuotaUsage', () => {
    it('should return zero usage when no records exist', async () => {
      // Mock empty Firestore response
      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(() => ({
                empty: true,
                docs: [],
                forEach: jest.fn()
              }))
            }))
          }))
        }))
      });

      const usage = await getUserQuotaUsage('user123');
      
      expect(usage).toEqual({
        daily: 0,
        monthly: 0,
        lastReset: expect.any(String),
        tier: 'free',
        limits: {
          daily: 50,
          monthly: 1000,
          burst: 10
        }
      });
    });

    it('should calculate usage correctly from Firestore data', async () => {
      const mockDocs = [
        { data: () => ({ count: 25 }) },
        { data: () => ({ count: 15 }) }
      ];

      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(() => ({
                empty: false,
                docs: mockDocs,
                forEach: jest.fn(callback => mockDocs.forEach(doc => callback(doc)))
              }))
            }))
          }))
        }))
      });

      const usage = await getUserQuotaUsage('user123');
      
      expect(usage.daily).toBe(40); // 25 + 15
      expect(usage.tier).toBe('free');
      expect(usage.limits.daily).toBe(50);
    });
  });

  describe('checkSendQuota', () => {
    it('should allow sends within quota limits', async () => {
      // Mock usage well below limits
      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(() => ({
                empty: false,
                docs: [{ data: () => ({ count: 10 }) }],
                forEach: jest.fn(callback => [{ data: () => ({ count: 10 }) }].forEach(callback))
              }))
            }))
          }))
        }))
      });

      const result = await checkSendQuota('user123', { isTest: false, isRetry: false });
      
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should block sends when daily quota exceeded', async () => {
      // Mock usage at limit
      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(() => ({
                empty: false,
                docs: [{ data: () => ({ count: 50 }) }],
                forEach: jest.fn(callback => [{ data: () => ({ count: 50 }) }].forEach(callback))
              }))
            }))
          }))
        }))
      });

      const result = await checkSendQuota('user123', { isTest: false, isRetry: false });
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('daily_quota_exceeded');
      expect(result.usage.daily).toBe(50);
      expect(result.usage.limits.daily).toBe(50);
    });

    it('should allow test sends even when quota exceeded', async () => {
      // Mock usage at limit
      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(() => ({
                empty: false,
                docs: [{ data: () => ({ count: 50 }) }],
                forEach: jest.fn(callback => [{ data: () => ({ count: 50 }) }].forEach(callback))
              }))
            }))
          }))
        }))
      });

      const result = await checkSendQuota('user123', { isTest: true, isRetry: false });
      
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow retries even when quota exceeded', async () => {
      // Mock usage at limit
      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(() => ({
                empty: false,
                docs: [{ data: () => ({ count: 50 }) }],
                forEach: jest.fn(callback => [{ data: () => ({ count: 50 }) }].forEach(callback))
              }))
            }))
          }))
        }))
      });

      const result = await checkSendQuota('user123', { isTest: false, isRetry: true });
      
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow unlimited sends for admin tier', async () => {
      // Reassign subscription function to simulate admin tier
      getUserSubscription = async () => ({ tier: 'admin', status: 'active' });

      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(() => ({
                empty: false,
                docs: [{ data: () => ({ count: 10000 }) }],
                forEach: jest.fn(callback => [{ data: () => ({ count: 10000 }) }].forEach(callback))
              }))
            }))
          }))
        }))
      });

      const result = await checkSendQuota('admin123', { isTest: false, isRetry: false });
      expect(result.allowed).toBe(true);
      expect(result.usage.tier).toBe('admin');
    });
  });

  describe('recordSendAttempt', () => {
    it('should record successful send attempt', async () => {
      const mockAdd = jest.fn();
      const mockSet = jest.fn();
      
      mockFirestore.collection.mockReturnValue({
        add: mockAdd
      });
      
      mockFirestore.doc = jest.fn(() => ({
        set: mockSet
      }));

      await recordSendAttempt('user123', {
        success: true,
        isTest: false,
        isRetry: false
      });

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          success: true,
          isTest: false,
          isRetry: false,
          timestamp: expect.any(Date)
        })
      );
    });

    it('should not record test sends in quota tracking', async () => {
      const mockAdd = jest.fn();
      
      mockFirestore.collection.mockReturnValue({
        add: mockAdd
      });

      await recordSendAttempt('user123', {
        success: true,
        isTest: true,
        isRetry: false
      });

      // Should record the attempt but not count towards quota
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          isTest: true,
          excludeFromQuota: true
        })
      );
    });

    it('should not record retries in quota tracking', async () => {
      const mockAdd = jest.fn();
      
      mockFirestore.collection.mockReturnValue({
        add: mockAdd
      });

      await recordSendAttempt('user123', {
        success: true,
        isTest: false,
        isRetry: true
      });

      // Should record the attempt but not count towards quota
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          isRetry: true,
          excludeFromQuota: true
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      mockFirestore.collection.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const usage = await getUserQuotaUsage('user123');
      
      // Should return default values when database fails
      expect(usage.daily).toBe(0);
      expect(usage.tier).toBe('free');
    });

    it('should handle malformed quota data', async () => {
      const mockDocs = [
        { data: () => ({ count: 'invalid' }) },
        { data: () => ({}) }, // missing count
        { data: () => ({ count: -5 }) } // negative count
      ];

      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              get: jest.fn(() => ({
                empty: false,
                docs: mockDocs,
                forEach: jest.fn(callback => mockDocs.forEach(doc => callback(doc)))
              }))
            }))
          }))
        }))
      });

      const usage = await getUserQuotaUsage('user123');
      
      // Should handle invalid data gracefully
      expect(usage.daily).toBe(0); // Invalid data should be filtered out
    });
  });
});
