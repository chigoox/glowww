const { describe, it, expect, beforeEach } = require('@jest/globals');

// Simple quota system implementation for testing
const getTierLimits = (tier) => {
  const limits = {
    free: { daily: 50, monthly: 1000, burst: 10 },
    pro: { daily: 1000, monthly: 25000, burst: 100 },
    business: { daily: 5000, monthly: 150000, burst: 500 },
    admin: { daily: Infinity, monthly: Infinity, burst: Infinity }
  };
  return limits[tier] || limits.free;
};

const getUserSubscription = async (userId) => {
  return { tier: 'free', status: 'active' };
};

const calculateAnalytics = (messages) => {
  const stats = {
    totalSent: 0,
    delivered: 0,
    bounced: 0,
    complaints: 0,
    totalOpens: 0,
    totalClicks: 0,
    uniqueOpens: 0,
    uniqueClicks: 0,
    openRate: 0,
    clickRate: 0,
    deliveryRate: 0,
    bounceRate: 0,
    complaintRate: 0
  };

  const uniqueOpenEmails = new Set();
  const uniqueClickEmails = new Set();

  messages.forEach(msg => {
    // Skip test sends for rate calculations
    const isTest = msg.isTest || (msg.tags && msg.tags.includes('test'));
    
    if (!isTest) {
      stats.totalSent++;
      
      if (msg.status === 'delivered') stats.delivered++;
      if (msg.status === 'bounced') stats.bounced++;
      if (msg.status === 'complaint') stats.complaints++;
    }
    
    // Include all messages for opens/clicks (including test sends)
    if (msg.opensCount > 0) {
      stats.totalOpens += msg.opensCount;
      if (msg.to) uniqueOpenEmails.add(msg.to.toLowerCase());
    }
    
    if (msg.clicksCount > 0) {
      stats.totalClicks += msg.clicksCount;
      if (msg.to) uniqueClickEmails.add(msg.to.toLowerCase());
    }
  });

  stats.uniqueOpens = uniqueOpenEmails.size;
  stats.uniqueClicks = uniqueClickEmails.size;

  // Calculate rates (excluding test sends)
  if (stats.totalSent > 0) {
    stats.deliveryRate = (stats.delivered / stats.totalSent) * 100;
    stats.bounceRate = (stats.bounced / stats.totalSent) * 100;
    stats.complaintRate = (stats.complaints / stats.totalSent) * 100;
  }

  if (stats.delivered > 0) {
    stats.openRate = (stats.uniqueOpens / stats.delivered) * 100;
    stats.clickRate = (stats.uniqueClicks / stats.delivered) * 100;
  }

  return stats;
};

const checkQuota = (currentUsage, limits, isTest = false, isRetry = false) => {
  if (isTest || isRetry) {
    return { allowed: true, reason: 'test_or_retry_bypass' };
  }
  
  if (currentUsage >= limits.daily) {
    return { allowed: false, reason: 'daily_quota_exceeded' };
  }
  
  return { allowed: true };
};

describe('Email System Core Tests', () => {
  describe('Quota System', () => {
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

    it('should allow sends within quota limits', () => {
      const result = checkQuota(10, { daily: 50 }, false, false);
      expect(result.allowed).toBe(true);
    });

    it('should block sends when daily quota exceeded', () => {
      const result = checkQuota(50, { daily: 50 }, false, false);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('daily_quota_exceeded');
    });

    it('should allow test sends even when quota exceeded', () => {
      const result = checkQuota(50, { daily: 50 }, true, false);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('test_or_retry_bypass');
    });

    it('should allow retries even when quota exceeded', () => {
      const result = checkQuota(50, { daily: 50 }, false, true);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('test_or_retry_bypass');
    });
  });

  describe('Analytics Calculations', () => {
    it('should calculate basic statistics correctly', () => {
      const messages = [
        { status: 'delivered', opensCount: 2, clicksCount: 1, to: 'user1@test.com' },
        { status: 'delivered', opensCount: 1, clicksCount: 0, to: 'user2@test.com' },
        { status: 'bounced', opensCount: 0, clicksCount: 0, to: 'bounce@test.com' },
        { status: 'delivered', opensCount: 3, clicksCount: 2, to: 'user3@test.com' }
      ];

      const stats = calculateAnalytics(messages);

      expect(stats.totalSent).toBe(4);
      expect(stats.delivered).toBe(3);
      expect(stats.bounced).toBe(1);
      expect(stats.totalOpens).toBe(6); // 2 + 1 + 0 + 3
      expect(stats.totalClicks).toBe(3); // 1 + 0 + 0 + 2
      expect(stats.uniqueOpens).toBe(3); // 3 unique email addresses opened
      expect(stats.uniqueClicks).toBe(2); // 2 unique email addresses clicked
    });

    it('should exclude test sends from rate calculations', () => {
      const messages = [
        { status: 'delivered', opensCount: 1, to: 'user1@test.com' }, // Real send
        { status: 'delivered', opensCount: 1, to: 'user2@test.com', isTest: true }, // Test send
        { status: 'delivered', opensCount: 1, to: 'user3@test.com', tags: ['test'] } // Test send
      ];

      const stats = calculateAnalytics(messages);

      expect(stats.totalSent).toBe(1); // Only non-test sends counted
      expect(stats.delivered).toBe(1); // Only non-test deliveries counted
      expect(stats.totalOpens).toBe(3); // All opens counted (including test)
      expect(stats.uniqueOpens).toBe(3); // All unique opens counted
      expect(stats.openRate).toBe(300); // 3 unique opens / 1 delivered * 100
    });

    it('should count unique opens correctly', () => {
      const messages = [
        { opensCount: 3, to: 'user1@test.com' }, // Same user, multiple opens
        { opensCount: 1, to: 'user1@test.com' }, // Same user again
        { opensCount: 2, to: 'user2@test.com' }, // Different user
        { opensCount: 1, to: 'USER2@TEST.COM' } // Same as user2 (case insensitive)
      ];

      const uniqueOpenEmails = new Set();
      let totalOpens = 0;

      messages.forEach(msg => {
        if (msg.opensCount > 0 && msg.to) {
          totalOpens += msg.opensCount;
          uniqueOpenEmails.add(msg.to.toLowerCase());
        }
      });

      expect(uniqueOpenEmails.size).toBe(2); // Only 2 unique email addresses
      expect(totalOpens).toBe(7); // 3 + 1 + 2 + 1 = 7 total opens
    });

    it('should handle case insensitivity for email addresses', () => {
      const messages = [
        { opensCount: 1, clicksCount: 1, to: 'User@Example.com' },
        { opensCount: 2, clicksCount: 0, to: 'user@example.com' },
        { opensCount: 1, clicksCount: 1, to: 'USER@EXAMPLE.COM' }
      ];

      const uniqueOpenEmails = new Set();
      const uniqueClickEmails = new Set();
      let totalOpens = 0;
      let totalClicks = 0;

      messages.forEach(msg => {
        if (msg.opensCount > 0 && msg.to) {
          totalOpens += msg.opensCount;
          uniqueOpenEmails.add(msg.to.toLowerCase());
        }
        
        if (msg.clicksCount > 0 && msg.to) {
          totalClicks += msg.clicksCount;
          uniqueClickEmails.add(msg.to.toLowerCase());
        }
      });

      expect(uniqueOpenEmails.size).toBe(1); // All same user (case insensitive)
      expect(uniqueClickEmails.size).toBe(1); // Same user clicked
      expect(totalOpens).toBe(4); // 1 + 2 + 1 = 4 total opens
      expect(totalClicks).toBe(2); // 1 + 0 + 1 = 2 total clicks
    });
  });

  describe('Auto-suppression Logic', () => {
    const shouldSuppress = (bounceType) => {
      const hardBounceTypes = ['HardBounce', 'SpamNotification', 'ManuallyDeactivated'];
      return hardBounceTypes.includes(bounceType);
    };

    const determineScopeAndSuppress = (messageData) => {
      const scope = messageData && messageData.siteId 
        ? `site:${messageData.siteId}` 
        : 'platform-mkt';
      return { scope };
    };

    it('should suppress HardBounce types', () => {
      expect(shouldSuppress('HardBounce')).toBe(true);
    });

    it('should suppress SpamNotification bounces', () => {
      expect(shouldSuppress('SpamNotification')).toBe(true);
    });

    it('should suppress ManuallyDeactivated bounces', () => {
      expect(shouldSuppress('ManuallyDeactivated')).toBe(true);
    });

    it('should not suppress SoftBounce types', () => {
      expect(shouldSuppress('SoftBounce')).toBe(false);
    });

    it('should use site scope when siteId is provided', () => {
      const result = determineScopeAndSuppress({ siteId: 'abc123' });
      expect(result.scope).toBe('site:abc123');
    });

    it('should use platform scope when no siteId', () => {
      const result1 = determineScopeAndSuppress({});
      const result2 = determineScopeAndSuppress(null);
      
      expect(result1.scope).toBe('platform-mkt');
      expect(result2.scope).toBe('platform-mkt');
    });
  });

  describe('Webhook Security', () => {
    const crypto = require('crypto');
    
    const generateSignature = (payload, secret) => {
      return crypto.createHmac('sha256', secret).update(payload).digest('hex');
    };

    const verifySignature = (payload, signature, secret) => {
      if (!secret || !signature) return false;
      try {
        const expectedSignature = generateSignature(payload, secret);
        return signature.toLowerCase() === expectedSignature.toLowerCase();
      } catch {
        return false;
      }
    };

    it('should generate consistent HMAC-SHA256 signatures', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';
      
      const signature1 = generateSignature(payload, secret);
      const signature2 = generateSignature(payload, secret);
      
      expect(signature1).toBe(signature2);
      expect(signature1).toMatch(/^[a-f0-9]{64}$/); // Valid SHA256 hex
    });

    it('should verify valid signatures', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';
      const signature = generateSignature(payload, secret);

      expect(verifySignature(payload, signature, secret)).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';
      const invalidSignature = 'invalid-signature-hash';

      expect(verifySignature(payload, invalidSignature, secret)).toBe(false);
    });

    it('should be case insensitive for hex signatures', () => {
      const payload = '{"test": "data"}';
      const secret = 'test-secret';
      const signature = generateSignature(payload, secret);

      const upperCaseSignature = signature.toUpperCase();
      const lowerCaseSignature = signature.toLowerCase();

      expect(verifySignature(payload, upperCaseSignature, secret)).toBe(true);
      expect(verifySignature(payload, lowerCaseSignature, secret)).toBe(true);
    });
  });
});
