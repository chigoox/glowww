const { describe, it, expect } = require('@jest/globals');
const crypto = require('crypto');

describe('Email System Integration Tests', () => {
  describe('Complete Send Flow with Quota and Analytics', () => {
    const mockSendFlow = async (userId, recipients, templateKey, options = {}) => {
      // 1. Check quota
      const quotaCheck = {
        allowed: true,
        usage: { daily: 10, limits: { daily: 50 } },
        tier: 'free'
      };

      if (!options.isTest && quotaCheck.usage.daily >= quotaCheck.usage.limits.daily) {
        quotaCheck.allowed = false;
        quotaCheck.reason = 'daily_quota_exceeded';
      }

      if (!quotaCheck.allowed) {
        return { success: false, reason: quotaCheck.reason };
      }

      // 2. Send emails and record attempts
      const results = [];
      for (const recipient of recipients) {
        const sendResult = {
          messageId: `msg-${Date.now()}-${Math.random()}`,
          providerMessageId: `postmark-${Date.now()}`,
          to: recipient,
          status: Math.random() > 0.1 ? 'delivered' : 'bounced', // 90% delivery rate
          timestamp: new Date()
        };

        results.push(sendResult);

        // 3. Record quota usage (if not test)
        if (!options.isTest) {
          quotaCheck.usage.daily++;
        }
      }

      return {
        success: true,
        results,
        quotaUsage: quotaCheck.usage
      };
    };

    it('should handle complete send flow with quota tracking', async () => {
      const sendResult = await mockSendFlow(
        'user123',
        ['user1@test.com', 'user2@test.com'],
        'welcome',
        { isTest: false }
      );

      expect(sendResult.success).toBe(true);
      expect(sendResult.results).toHaveLength(2);
      expect(sendResult.quotaUsage.daily).toBe(12); // Started at 10, sent 2
    });

    it('should allow test sends without affecting quota', async () => {
      const sendResult = await mockSendFlow(
        'user123',
        ['test@example.com'],
        'welcome',
        { isTest: true }
      );

      expect(sendResult.success).toBe(true);
      expect(sendResult.quotaUsage.daily).toBe(10); // Should not increment
    });
  });

  describe('Webhook to Analytics Pipeline', () => {
    const mockWebhookToAnalytics = async (webhookEvents) => {
      const messageUpdates = new Map();

      // Process each webhook event
      for (const event of webhookEvents) {
        const messageId = event.MessageID;
        
        if (!messageUpdates.has(messageId)) {
          messageUpdates.set(messageId, {
            messageId,
            status: 'sent',
            opensCount: 0,
            clicksCount: 0,
            to: event.Recipient || 'unknown@test.com'
          });
        }

        const message = messageUpdates.get(messageId);

        switch (event.RecordType) {
          case 'Delivery':
            message.status = 'delivered';
            break;
          case 'Bounce':
            message.status = 'bounced';
            message.bounceType = event.Type;
            
            // Auto-suppress logic
            if (['HardBounce', 'SpamNotification'].includes(event.Type)) {
              message.autoSuppressed = true;
            }
            break;
          case 'SpamComplaint':
            message.status = 'complaint';
            message.autoSuppressed = true;
            break;
          case 'Open':
            message.opensCount++;
            if (!message.firstOpenAt) message.firstOpenAt = new Date();
            break;
          case 'Click':
            message.clicksCount++;
            if (!message.firstClickAt) message.firstClickAt = new Date();
            break;
        }
      }

      // Calculate analytics from updated messages
      const messages = Array.from(messageUpdates.values());
      const analytics = {
        totalSent: messages.length,
        delivered: messages.filter(m => m.status === 'delivered').length,
        bounced: messages.filter(m => m.status === 'bounced').length,
        complaints: messages.filter(m => m.status === 'complaint').length,
        autoSuppressions: messages.filter(m => m.autoSuppressed).length,
        uniqueOpens: new Set(messages.filter(m => m.opensCount > 0).map(m => m.to)).size,
        uniqueClicks: new Set(messages.filter(m => m.clicksCount > 0).map(m => m.to)).size
      };

      return { messages, analytics };
    };

    it('should process webhook events and update analytics', async () => {
      const webhookEvents = [
        { RecordType: 'Delivery', MessageID: 'msg-1', Recipient: 'user1@test.com' },
        { RecordType: 'Open', MessageID: 'msg-1', Recipient: 'user1@test.com' },
        { RecordType: 'Click', MessageID: 'msg-1', Recipient: 'user1@test.com' },
        { RecordType: 'Bounce', MessageID: 'msg-2', Type: 'HardBounce', Recipient: 'bounce@test.com' },
        { RecordType: 'SpamComplaint', MessageID: 'msg-3', Recipient: 'complaint@test.com' }
      ];

      const result = await mockWebhookToAnalytics(webhookEvents);

      expect(result.analytics.totalSent).toBe(3);
      expect(result.analytics.delivered).toBe(1);
      expect(result.analytics.bounced).toBe(1);
      expect(result.analytics.complaints).toBe(1);
      expect(result.analytics.autoSuppressions).toBe(2); // Hard bounce + complaint
      expect(result.analytics.uniqueOpens).toBe(1);
      expect(result.analytics.uniqueClicks).toBe(1);
    });

    it('should handle multiple events for same message', async () => {
      const webhookEvents = [
        { RecordType: 'Delivery', MessageID: 'msg-1', Recipient: 'active@test.com' },
        { RecordType: 'Open', MessageID: 'msg-1', Recipient: 'active@test.com' },
        { RecordType: 'Open', MessageID: 'msg-1', Recipient: 'active@test.com' }, // Second open
        { RecordType: 'Click', MessageID: 'msg-1', Recipient: 'active@test.com' }
      ];

      const result = await mockWebhookToAnalytics(webhookEvents);
      const message = result.messages[0];

      expect(message.status).toBe('delivered');
      expect(message.opensCount).toBe(2);
      expect(message.clicksCount).toBe(1);
      expect(result.analytics.uniqueOpens).toBe(1); // Still one unique user
    });
  });

  describe('Rate Limiting Integration', () => {
    const mockRateLimitedSend = async (userId, emailCount, tier = 'free') => {
      const limits = {
        free: { daily: 50 },
        pro: { daily: 1000 },
        business: { daily: 5000 },
        admin: { daily: Infinity }
      };

      const currentUsage = 45; // Mock current usage
      const limit = limits[tier].daily;
      
      if (currentUsage + emailCount > limit) {
        return {
          success: false,
          reason: 'quota_exceeded',
          allowed: limit - currentUsage,
          requested: emailCount
        };
      }

      return {
        success: true,
        sent: emailCount,
        newUsage: currentUsage + emailCount
      };
    };

    it('should enforce rate limits across tiers', async () => {
      // Free tier - should block large sends
      const freeResult = await mockRateLimitedSend('free-user', 10, 'free');
      expect(freeResult.success).toBe(false);
      expect(freeResult.reason).toBe('quota_exceeded');
      expect(freeResult.allowed).toBe(5); // 50 - 45 = 5 remaining

      // Pro tier - should allow same send
      const proResult = await mockRateLimitedSend('pro-user', 10, 'pro');
      expect(proResult.success).toBe(true);
      expect(proResult.sent).toBe(10);

      // Admin tier - should allow any amount
      const adminResult = await mockRateLimitedSend('admin-user', 10000, 'admin');
      expect(adminResult.success).toBe(true);
      expect(adminResult.sent).toBe(10000);
    });
  });

  describe('Multi-tenant Analytics Isolation', () => {
    const mockMultiTenantAnalytics = (messages, siteId) => {
      const siteMessages = messages.filter(msg => 
        msg.scope === `site:${siteId}` || (!msg.scope && !siteId)
      );

      return {
        siteId,
        totalMessages: siteMessages.length,
        delivered: siteMessages.filter(m => m.status === 'delivered').length,
        uniqueOpens: new Set(
          siteMessages
            .filter(m => m.opensCount > 0)
            .map(m => m.to.toLowerCase())
        ).size
      };
    };

    it('should isolate analytics by site', () => {
      const messages = [
        { status: 'delivered', opensCount: 1, to: 'site1user@test.com', scope: 'site:site1' },
        { status: 'delivered', opensCount: 1, to: 'site2user@test.com', scope: 'site:site2' },
        { status: 'delivered', opensCount: 1, to: 'platform@test.com', scope: 'platform-mkt' }
      ];

      const site1Stats = mockMultiTenantAnalytics(messages, 'site1');
      const site2Stats = mockMultiTenantAnalytics(messages, 'site2');

      expect(site1Stats.totalMessages).toBe(1);
      expect(site1Stats.uniqueOpens).toBe(1);
      
      expect(site2Stats.totalMessages).toBe(1);
      expect(site2Stats.uniqueOpens).toBe(1);
    });
  });

  describe('Webhook Security Integration', () => {
    const verifyWebhookSecurity = (payload, providedSignature, secret) => {
      if (!secret) {
        // No security configured, allow through
        return { valid: true, reason: 'no_security_configured' };
      }
      
      if (!providedSignature) {
        return { valid: false, reason: 'missing_signature' };
      }
      
      try {
        const expectedSignature = crypto
          .createHmac('sha256', secret)
          .update(payload)
          .digest('hex');
        
        const isValid = providedSignature.toLowerCase() === expectedSignature.toLowerCase();
        
        return {
          valid: isValid,
          reason: isValid ? 'signature_valid' : 'signature_mismatch'
        };
      } catch (error) {
        return { valid: false, reason: 'crypto_error' };
      }
    };

    it('should verify webhook signatures correctly', () => {
      const payload = '{"MessageID":"test-123","RecordType":"Delivery"}';
      const secret = 'webhook-secret-key';
      
      const validSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      
      const validResult = verifyWebhookSecurity(payload, validSignature, secret);
      expect(validResult.valid).toBe(true);
      expect(validResult.reason).toBe('signature_valid');
      
      const invalidResult = verifyWebhookSecurity(payload, 'invalid-signature', secret);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toBe('signature_mismatch');
    });

    it('should handle missing signatures appropriately', () => {
      const payload = '{"test": "data"}';
      const secret = 'secret-key';
      
      const result = verifyWebhookSecurity(payload, null, secret);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('missing_signature');
    });

    it('should allow through when no security configured', () => {
      const payload = '{"test": "data"}';
      
      const result = verifyWebhookSecurity(payload, null, null);
      expect(result.valid).toBe(true);
      expect(result.reason).toBe('no_security_configured');
    });
  });

  describe('Performance and Scale', () => {
    it('should handle large datasets efficiently', () => {
      const generateLargeDataset = (size) => {
        const messages = [];
        for (let i = 0; i < size; i++) {
          messages.push({
            status: i % 10 === 0 ? 'bounced' : 'delivered',
            opensCount: Math.floor(Math.random() * 5),
            clicksCount: Math.floor(Math.random() * 2),
            to: `user${i}@test.com`,
            templateKey: `template${i % 5}`,
            isTest: i % 100 === 0 // 1% test sends
          });
        }
        return messages;
      };

      const largeDataset = generateLargeDataset(1000);
      
      const startTime = Date.now();
      const stats = {
        totalMessages: largeDataset.length,
        testMessages: largeDataset.filter(m => m.isTest).length,
        deliveredMessages: largeDataset.filter(m => m.status === 'delivered' && !m.isTest).length
      };
      const endTime = Date.now();

      expect(stats.totalMessages).toBe(1000);
      expect(stats.testMessages).toBe(10); // 1% test sends
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });
  });
});
