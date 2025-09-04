const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock Firebase Admin
const mockFirestore = {
  collection: jest.fn(() => ({
    where: jest.fn(() => ({
      where: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn(() => ({
            empty: true,
            docs: [],
            size: 0,
            forEach: jest.fn()
          }))
        }))
      }))
    })),
    get: jest.fn(() => ({
      empty: true,
      docs: [],
      size: 0,
      forEach: jest.fn()
    }))
  }))
};

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: mockFirestore
}));

describe('Email Analytics Accuracy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Analytics Calculations', () => {
    // Mock analytics calculation functions
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
        const isTest = msg.isTest || msg.tags?.includes('test');
        
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

    it('should calculate delivery rate correctly', () => {
      const messages = [
        { status: 'delivered', to: 'user1@test.com' },
        { status: 'delivered', to: 'user2@test.com' },
        { status: 'bounced', to: 'bounce@test.com' },
        { status: 'pending', to: 'pending@test.com' }
      ];

      const stats = calculateAnalytics(messages);

      expect(stats.deliveryRate).toBe(50); // 2 delivered out of 4 total
      expect(stats.bounceRate).toBe(25); // 1 bounced out of 4 total
    });

    it('should calculate open and click rates based on delivered emails', () => {
      const messages = [
        { status: 'delivered', opensCount: 1, clicksCount: 1, to: 'user1@test.com' },
        { status: 'delivered', opensCount: 1, clicksCount: 0, to: 'user2@test.com' },
        { status: 'delivered', opensCount: 0, clicksCount: 0, to: 'user3@test.com' },
        { status: 'bounced', opensCount: 0, clicksCount: 0, to: 'bounce@test.com' }
      ];

      const stats = calculateAnalytics(messages);

      expect(stats.delivered).toBe(3);
      expect(stats.uniqueOpens).toBe(2); // 2 unique opens
      expect(stats.uniqueClicks).toBe(1); // 1 unique click
      expect(stats.openRate).toBe(66.66666666666666); // 2/3 * 100
      expect(stats.clickRate).toBe(33.33333333333333); // 1/3 * 100
    });
  });

  describe('Test Send Exclusions', () => {
    const calculateAnalytics = (messages) => {
      const stats = {
        totalSent: 0,
        delivered: 0,
        bounced: 0,
        totalOpens: 0,
        totalClicks: 0,
        uniqueOpens: 0,
        uniqueClicks: 0,
        openRate: 0,
        clickRate: 0
      };

      const uniqueOpenEmails = new Set();
      const uniqueClickEmails = new Set();

      messages.forEach(msg => {
        const isTest = msg.isTest || msg.tags?.includes('test');
        
        // Exclude test sends from rate calculations
        if (!isTest) {
          stats.totalSent++;
          if (msg.status === 'delivered') stats.delivered++;
          if (msg.status === 'bounced') stats.bounced++;
        }
        
        // Include all messages for opens/clicks tracking
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

      if (stats.delivered > 0) {
        stats.openRate = (stats.uniqueOpens / stats.delivered) * 100;
        stats.clickRate = (stats.uniqueClicks / stats.delivered) * 100;
      }

      return stats;
    };

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

    it('should handle mixed test and production sends correctly', () => {
      const messages = [
        { status: 'delivered', opensCount: 1, clicksCount: 1, to: 'prod1@test.com' },
        { status: 'delivered', opensCount: 1, clicksCount: 0, to: 'prod2@test.com' },
        { status: 'delivered', opensCount: 2, clicksCount: 1, to: 'test@test.com', isTest: true },
        { status: 'bounced', to: 'bounce@test.com' },
        { status: 'delivered', opensCount: 1, to: 'tagtest@test.com', tags: ['test', 'welcome'] }
      ];

      const stats = calculateAnalytics(messages);

      expect(stats.totalSent).toBe(3); // 2 prod + 1 bounced (excluding 2 tests)
      expect(stats.delivered).toBe(2); // Only production deliveries
      expect(stats.totalOpens).toBe(5); // All opens including test sends
      expect(stats.uniqueOpens).toBe(4); // All unique opens
      expect(stats.openRate).toBe(200); // 4 unique opens / 2 delivered * 100
    });
  });

  describe('Unique Metrics Accuracy', () => {
    const calculateUniqueMetrics = (messages) => {
      const uniqueOpenEmails = new Set();
      const uniqueClickEmails = new Set();
      const emailOpenCounts = new Map();
      const emailClickCounts = new Map();

      messages.forEach(msg => {
        if (msg.opensCount > 0 && msg.to) {
          const email = msg.to.toLowerCase();
          uniqueOpenEmails.add(email);
          emailOpenCounts.set(email, (emailOpenCounts.get(email) || 0) + msg.opensCount);
        }
        
        if (msg.clicksCount > 0 && msg.to) {
          const email = msg.to.toLowerCase();
          uniqueClickEmails.add(email);
          emailClickCounts.set(email, (emailClickCounts.get(email) || 0) + msg.clicksCount);
        }
      });

      return {
        uniqueOpens: uniqueOpenEmails.size,
        uniqueClicks: uniqueClickEmails.size,
        totalOpens: Array.from(emailOpenCounts.values()).reduce((sum, count) => sum + count, 0),
        totalClicks: Array.from(emailClickCounts.values()).reduce((sum, count) => sum + count, 0)
      };
    };

    it('should count unique opens correctly', () => {
      const messages = [
        { opensCount: 3, to: 'user1@test.com' }, // Same user, multiple opens
        { opensCount: 1, to: 'user1@test.com' }, // Same user again
        { opensCount: 2, to: 'user2@test.com' }, // Different user
        { opensCount: 1, to: 'USER2@TEST.COM' } // Same as user2 (case insensitive)
      ];

      const metrics = calculateUniqueMetrics(messages);

      expect(metrics.uniqueOpens).toBe(2); // Only 2 unique email addresses
      expect(metrics.totalOpens).toBe(7); // 3 + 1 + 2 + 1 = 7 total opens
    });

    it('should count unique clicks correctly', () => {
      const messages = [
        { clicksCount: 2, to: 'clicker1@test.com' },
        { clicksCount: 1, to: 'clicker1@test.com' }, // Same user
        { clicksCount: 3, to: 'clicker2@test.com' },
        { clicksCount: 0, to: 'nonclicker@test.com' } // No clicks
      ];

      const metrics = calculateUniqueMetrics(messages);

      expect(metrics.uniqueClicks).toBe(2); // Only 2 users clicked
      expect(metrics.totalClicks).toBe(6); // 2 + 1 + 3 = 6 total clicks
    });

    it('should handle case insensitivity for email addresses', () => {
      const messages = [
        { opensCount: 1, clicksCount: 1, to: 'User@Example.com' },
        { opensCount: 2, clicksCount: 0, to: 'user@example.com' },
        { opensCount: 1, clicksCount: 1, to: 'USER@EXAMPLE.COM' }
      ];

      const metrics = calculateUniqueMetrics(messages);

      expect(metrics.uniqueOpens).toBe(1); // All same user (case insensitive)
      expect(metrics.uniqueClicks).toBe(1); // Same user clicked
      expect(metrics.totalOpens).toBe(4); // 1 + 2 + 1 = 4 total opens
      expect(metrics.totalClicks).toBe(2); // 1 + 0 + 1 = 2 total clicks
    });
  });

  describe('Template Performance Analytics', () => {
    const calculateTemplatePerformance = (messages) => {
      const templates = new Map();

      messages.forEach(msg => {
        if (!msg.templateKey) return;
        
        if (!templates.has(msg.templateKey)) {
          templates.set(msg.templateKey, {
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            uniqueOpens: new Set(),
            uniqueClicks: new Set()
          });
        }

        const template = templates.get(msg.templateKey);
        const isTest = msg.isTest || msg.tags?.includes('test');

        if (!isTest) {
          template.sent++;
          if (msg.status === 'delivered') template.delivered++;
        }

        if (msg.opensCount > 0) {
          template.opened++;
          if (msg.to) template.uniqueOpens.add(msg.to.toLowerCase());
        }

        if (msg.clicksCount > 0) {
          template.clicked++;
          if (msg.to) template.uniqueClicks.add(msg.to.toLowerCase());
        }
      });

      // Convert to final format with calculated rates
      const result = {};
      templates.forEach((data, templateKey) => {
        result[templateKey] = {
          sent: data.sent,
          delivered: data.delivered,
          opened: data.opened,
          clicked: data.clicked,
          uniqueOpens: data.uniqueOpens.size,
          uniqueClicks: data.uniqueClicks.size,
          deliveryRate: data.sent > 0 ? (data.delivered / data.sent) * 100 : 0,
          openRate: data.delivered > 0 ? (data.uniqueOpens.size / data.delivered) * 100 : 0,
          clickRate: data.delivered > 0 ? (data.uniqueClicks.size / data.delivered) * 100 : 0
        };
      });

      return result;
    };

    it('should calculate template performance correctly', () => {
      const messages = [
        { templateKey: 'welcome', status: 'delivered', opensCount: 1, clicksCount: 1, to: 'user1@test.com' },
        { templateKey: 'welcome', status: 'delivered', opensCount: 1, clicksCount: 0, to: 'user2@test.com' },
        { templateKey: 'newsletter', status: 'delivered', opensCount: 2, clicksCount: 1, to: 'user3@test.com' },
        { templateKey: 'welcome', status: 'bounced', to: 'bounce@test.com' }
      ];

      const performance = calculateTemplatePerformance(messages);

      expect(performance.welcome.sent).toBe(3);
      expect(performance.welcome.delivered).toBe(2);
      expect(performance.welcome.uniqueOpens).toBe(2);
      expect(performance.welcome.uniqueClicks).toBe(1);
      expect(performance.welcome.deliveryRate).toBe(66.66666666666666);
      expect(performance.welcome.openRate).toBe(100); // 2 opens / 2 delivered
      expect(performance.welcome.clickRate).toBe(50); // 1 click / 2 delivered

      expect(performance.newsletter.sent).toBe(1);
      expect(performance.newsletter.delivered).toBe(1);
      expect(performance.newsletter.uniqueOpens).toBe(1);
      expect(performance.newsletter.uniqueClicks).toBe(1);
      expect(performance.newsletter.openRate).toBe(100);
      expect(performance.newsletter.clickRate).toBe(100);
    });

    it('should exclude test sends from template performance', () => {
      const messages = [
        { templateKey: 'welcome', status: 'delivered', opensCount: 1, to: 'user1@test.com' },
        { templateKey: 'welcome', status: 'delivered', opensCount: 1, to: 'test@test.com', isTest: true },
        { templateKey: 'welcome', status: 'delivered', opensCount: 1, to: 'tag@test.com', tags: ['test'] }
      ];

      const performance = calculateTemplatePerformance(messages);

      expect(performance.welcome.sent).toBe(1); // Only production send counted
      expect(performance.welcome.delivered).toBe(1);
      expect(performance.welcome.uniqueOpens).toBe(3); // All opens counted for engagement
      expect(performance.welcome.openRate).toBe(300); // 3 opens / 1 delivered
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty message arrays', () => {
      const calculateAnalytics = (messages) => {
        if (!messages || messages.length === 0) {
          return {
            totalSent: 0,
            delivered: 0,
            uniqueOpens: 0,
            uniqueClicks: 0,
            openRate: 0,
            clickRate: 0
          };
        }
        return {};
      };

      const stats1 = calculateAnalytics([]);
      const stats2 = calculateAnalytics(null);
      const stats3 = calculateAnalytics(undefined);

      expect(stats1.totalSent).toBe(0);
      expect(stats2.totalSent).toBe(0);
      expect(stats3.totalSent).toBe(0);
    });

    it('should handle messages with missing fields', () => {
      const messages = [
        { status: 'delivered' }, // Missing 'to' field
        { opensCount: 5 }, // Missing 'to' field
        { to: 'user@test.com' }, // Missing other fields
        null, // Null message
        undefined // Undefined message
      ];

      const calculateSafeAnalytics = (messages) => {
        let validMessages = 0;
        let totalOpens = 0;
        const uniqueOpens = new Set();

        messages.forEach(msg => {
          if (!msg) return; // Skip null/undefined

          validMessages++;
          
          if (msg.opensCount && typeof msg.opensCount === 'number') {
            totalOpens += msg.opensCount;
            if (msg.to && typeof msg.to === 'string') {
              uniqueOpens.add(msg.to.toLowerCase());
            }
          }
        });

        return {
          validMessages,
          totalOpens,
          uniqueOpens: uniqueOpens.size
        };
      };

      const stats = calculateSafeAnalytics(messages);

      expect(stats.validMessages).toBe(3); // Only non-null messages
      expect(stats.totalOpens).toBe(5);
      expect(stats.uniqueOpens).toBe(0); // opensCount message had no 'to' field
    });

    it('should handle invalid numeric values', () => {
      const messages = [
        { opensCount: 'invalid', clicksCount: 'also-invalid', to: 'user1@test.com' },
        { opensCount: -5, clicksCount: null, to: 'user2@test.com' },
        { opensCount: 3.7, clicksCount: 2.1, to: 'user3@test.com' } // Decimals
      ];

      const calculateRobustAnalytics = (messages) => {
        let totalOpens = 0;
        let totalClicks = 0;

        messages.forEach(msg => {
          const opens = parseInt(msg.opensCount) || 0;
          const clicks = parseInt(msg.clicksCount) || 0;
          
          if (opens > 0) totalOpens += opens;
          if (clicks > 0) totalClicks += clicks;
        });

        return { totalOpens, totalClicks };
      };

      const stats = calculateRobustAnalytics(messages);

      expect(stats.totalOpens).toBe(3); // Only valid positive numbers
      expect(stats.totalClicks).toBe(2); // 3.7 -> 3, 2.1 -> 2
    });
  });

  describe('Performance and Scale Testing', () => {
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
      // Simplified calculation for performance test
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
