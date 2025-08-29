const { describe, it, expect, beforeEach } = require('@jest/globals');

// Simple analytics calculation functions
const calculateEmailAnalytics = (messageData, eventData) => {
  const analytics = {
    totalSent: 0,
    delivered: 0,
    bounced: 0,
    complaints: 0,
    opens: 0,
    clicks: 0,
    uniqueOpens: 0,
    uniqueClicks: 0,
    deliveryRate: 0,
    bounceRate: 0,
    complaintRate: 0,
    openRate: 0,
    clickRate: 0
  };

  // Count messages (exclude test sends for rates)
  const realMessages = messageData.filter(msg => !msg.isTest);
  analytics.totalSent = realMessages.length;

  // Process events
  const uniqueOpensSet = new Set();
  const uniqueClicksSet = new Set();

  eventData.forEach(event => {
    // Skip test events for rate calculations but include in total counts
    const email = event.email ? event.email.toLowerCase() : '';
    
    switch (event.recordType) {
      case 'Delivery':
        if (!event.isTest) analytics.delivered++;
        break;
      case 'Bounce':
        if (!event.isTest) analytics.bounced++;
        break;
      case 'SpamComplaint':
        if (!event.isTest) analytics.complaints++;
        break;
      case 'Open':
        analytics.opens++;
        uniqueOpensSet.add(email);
        break;
      case 'Click':
        analytics.clicks++;
        uniqueClicksSet.add(email);
        break;
    }
  });

  analytics.uniqueOpens = uniqueOpensSet.size;
  analytics.uniqueClicks = uniqueClicksSet.size;

  // Calculate rates (avoid division by zero)
  if (analytics.totalSent > 0) {
    analytics.deliveryRate = (analytics.delivered / analytics.totalSent) * 100;
    analytics.bounceRate = (analytics.bounced / analytics.totalSent) * 100;
    analytics.complaintRate = (analytics.complaints / analytics.totalSent) * 100;
    analytics.openRate = (analytics.uniqueOpens / analytics.totalSent) * 100;
    analytics.clickRate = (analytics.uniqueClicks / analytics.totalSent) * 100;
  }

  return analytics;
};

const filterEventsBySite = (events, siteId) => {
  if (!siteId) return events.filter(e => !e.siteId);
  return events.filter(e => e.siteId === siteId);
};

const excludeTestEvents = (events) => {
  return events.filter(e => !e.isTest);
};

describe('Email Analytics Tests', () => {
  beforeEach(() => {
    // Clear test state
  });

  describe('Basic Analytics Calculations', () => {
    it('should calculate total sent correctly', () => {
      const messageData = [
        { id: '1', isTest: false },
        { id: '2', isTest: false },
        { id: '3', isTest: true } // Should be excluded from totals
      ];
      const eventData = [];

      const analytics = calculateEmailAnalytics(messageData, eventData);
      expect(analytics.totalSent).toBe(2);
    });

    it('should calculate delivery statistics', () => {
      const messageData = [
        { id: '1', isTest: false },
        { id: '2', isTest: false }
      ];
      const eventData = [
        { recordType: 'Delivery', email: 'user1@example.com' },
        { recordType: 'Delivery', email: 'user2@example.com' }
      ];

      const analytics = calculateEmailAnalytics(messageData, eventData);
      expect(analytics.delivered).toBe(2);
      expect(analytics.deliveryRate).toBe(100);
    });

    it('should calculate bounce statistics', () => {
      const messageData = [
        { id: '1', isTest: false },
        { id: '2', isTest: false },
        { id: '3', isTest: false }
      ];
      const eventData = [
        { recordType: 'Delivery', email: 'user1@example.com' },
        { recordType: 'Bounce', email: 'user2@example.com' },
        { recordType: 'Bounce', email: 'user3@example.com' }
      ];

      const analytics = calculateEmailAnalytics(messageData, eventData);
      expect(analytics.delivered).toBe(1);
      expect(analytics.bounced).toBe(2);
      expect(analytics.deliveryRate).toBeCloseTo(33.33, 1);
      expect(analytics.bounceRate).toBeCloseTo(66.67, 1);
    });

    it('should calculate complaint statistics', () => {
      const messageData = [
        { id: '1', isTest: false },
        { id: '2', isTest: false }
      ];
      const eventData = [
        { recordType: 'Delivery', email: 'user1@example.com' },
        { recordType: 'SpamComplaint', email: 'user2@example.com' }
      ];

      const analytics = calculateEmailAnalytics(messageData, eventData);
      expect(analytics.complaints).toBe(1);
      expect(analytics.complaintRate).toBe(50);
    });
  });

  describe('Engagement Analytics', () => {
    it('should count total opens and clicks', () => {
      const messageData = [
        { id: '1', isTest: false },
        { id: '2', isTest: false }
      ];
      const eventData = [
        { recordType: 'Open', email: 'user1@example.com' },
        { recordType: 'Open', email: 'user1@example.com' }, // Same user, multiple opens
        { recordType: 'Click', email: 'user1@example.com' },
        { recordType: 'Click', email: 'user2@example.com' }
      ];

      const analytics = calculateEmailAnalytics(messageData, eventData);
      expect(analytics.opens).toBe(2);
      expect(analytics.clicks).toBe(2);
    });

    it('should count unique opens and clicks correctly', () => {
      const messageData = [
        { id: '1', isTest: false },
        { id: '2', isTest: false },
        { id: '3', isTest: false }
      ];
      const eventData = [
        { recordType: 'Open', email: 'user1@example.com' },
        { recordType: 'Open', email: 'user1@example.com' }, // Duplicate
        { recordType: 'Open', email: 'user2@example.com' },
        { recordType: 'Click', email: 'user1@example.com' },
        { recordType: 'Click', email: 'user1@example.com' }, // Duplicate
        { recordType: 'Click', email: 'user3@example.com' }
      ];

      const analytics = calculateEmailAnalytics(messageData, eventData);
      expect(analytics.opens).toBe(3); // Total opens
      expect(analytics.clicks).toBe(3); // Total clicks
      expect(analytics.uniqueOpens).toBe(2); // Unique users who opened
      expect(analytics.uniqueClicks).toBe(2); // Unique users who clicked
    });

    it('should handle case insensitivity for email addresses', () => {
      const messageData = [
        { id: '1', isTest: false },
        { id: '2', isTest: false }
      ];
      const eventData = [
        { recordType: 'Open', email: 'User1@Example.com' },
        { recordType: 'Open', email: 'user1@example.com' }, // Same user, different case
        { recordType: 'Click', email: 'USER2@EXAMPLE.COM' },
        { recordType: 'Click', email: 'user2@example.com' } // Same user, different case
      ];

      const analytics = calculateEmailAnalytics(messageData, eventData);
      expect(analytics.uniqueOpens).toBe(1); // Should treat as same user
      expect(analytics.uniqueClicks).toBe(1); // Should treat as same user
    });

    it('should calculate engagement rates correctly', () => {
      const messageData = [
        { id: '1', isTest: false },
        { id: '2', isTest: false },
        { id: '3', isTest: false },
        { id: '4', isTest: false }
      ];
      const eventData = [
        { recordType: 'Open', email: 'user1@example.com' },
        { recordType: 'Open', email: 'user2@example.com' },
        { recordType: 'Click', email: 'user1@example.com' }
      ];

      const analytics = calculateEmailAnalytics(messageData, eventData);
      expect(analytics.openRate).toBe(50); // 2 unique opens / 4 sent
      expect(analytics.clickRate).toBe(25); // 1 unique click / 4 sent
    });
  });

  describe('Test Send Exclusions', () => {
    it('should exclude test sends from rate calculations', () => {
      const messageData = [
        { id: '1', isTest: false },
        { id: '2', isTest: false },
        { id: '3', isTest: true }, // Test send - should be excluded
        { id: '4', isTest: true }  // Test send - should be excluded
      ];
      const eventData = [
        { recordType: 'Delivery', email: 'user1@example.com' },
        { recordType: 'Bounce', email: 'user2@example.com' },
        { recordType: 'Delivery', email: 'test1@example.com', isTest: true },
        { recordType: 'Open', email: 'test2@example.com', isTest: true }
      ];

      const analytics = calculateEmailAnalytics(messageData, eventData);
      expect(analytics.totalSent).toBe(2); // Only non-test messages
      expect(analytics.deliveryRate).toBe(50); // 1 delivery / 2 sent
      expect(analytics.bounceRate).toBe(50); // 1 bounce / 2 sent
    });

    it('should still include test events in total counts', () => {
      const messageData = [
        { id: '1', isTest: false },
        { id: '2', isTest: true }
      ];
      const eventData = [
        { recordType: 'Open', email: 'user1@example.com' },
        { recordType: 'Open', email: 'test@example.com', isTest: true },
        { recordType: 'Click', email: 'user1@example.com' },
        { recordType: 'Click', email: 'test@example.com', isTest: true }
      ];

      const analytics = calculateEmailAnalytics(messageData, eventData);
      expect(analytics.opens).toBe(2); // Include all opens
      expect(analytics.clicks).toBe(2); // Include all clicks
      expect(analytics.uniqueOpens).toBe(2); // Include all unique users
      expect(analytics.uniqueClicks).toBe(2); // Include all unique users
    });
  });

  describe('Site Isolation', () => {
    it('should filter events by site correctly', () => {
      const allEvents = [
        { recordType: 'Open', email: 'user1@example.com', siteId: 'site-1' },
        { recordType: 'Open', email: 'user2@example.com', siteId: 'site-2' },
        { recordType: 'Click', email: 'user3@example.com', siteId: 'site-1' },
        { recordType: 'Click', email: 'user4@example.com' } // No siteId (platform)
      ];

      const site1Events = filterEventsBySite(allEvents, 'site-1');
      const site2Events = filterEventsBySite(allEvents, 'site-2');
      const platformEvents = filterEventsBySite(allEvents, null);

      expect(site1Events).toHaveLength(2);
      expect(site2Events).toHaveLength(1);
      expect(platformEvents).toHaveLength(1);
    });

    it('should calculate site-specific analytics', () => {
      const messageData = [
        { id: '1', siteId: 'site-1', isTest: false },
        { id: '2', siteId: 'site-1', isTest: false }
      ];
      const allEvents = [
        { recordType: 'Open', email: 'user1@example.com', siteId: 'site-1' },
        { recordType: 'Open', email: 'user2@example.com', siteId: 'site-2' }, // Different site
        { recordType: 'Click', email: 'user1@example.com', siteId: 'site-1' }
      ];

      const site1Events = filterEventsBySite(allEvents, 'site-1');
      const analytics = calculateEmailAnalytics(messageData, site1Events);

      expect(analytics.uniqueOpens).toBe(1); // Only site-1 opens
      expect(analytics.uniqueClicks).toBe(1); // Only site-1 clicks
      expect(analytics.openRate).toBe(50); // 1 unique open / 2 sent
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty data gracefully', () => {
      const analytics = calculateEmailAnalytics([], []);
      
      expect(analytics.totalSent).toBe(0);
      expect(analytics.delivered).toBe(0);
      expect(analytics.bounced).toBe(0);
      expect(analytics.deliveryRate).toBe(0);
      expect(analytics.bounceRate).toBe(0);
    });

    it('should handle missing email addresses', () => {
      const messageData = [
        { id: '1', isTest: false }
      ];
      const eventData = [
        { recordType: 'Open' }, // Missing email
        { recordType: 'Click', email: null }, // Null email
        { recordType: 'Open', email: '' } // Empty email
      ];

      const analytics = calculateEmailAnalytics(messageData, eventData);
      expect(analytics.opens).toBe(2); // Still counts events
      expect(analytics.clicks).toBe(1);
      expect(analytics.uniqueOpens).toBe(1); // Empty emails treated as same
      expect(analytics.uniqueClicks).toBe(1);
    });

    it('should handle unknown event types', () => {
      const messageData = [
        { id: '1', isTest: false }
      ];
      const eventData = [
        { recordType: 'Unknown', email: 'user@example.com' },
        { recordType: 'CustomEvent', email: 'user@example.com' },
        { recordType: null, email: 'user@example.com' }
      ];

      const analytics = calculateEmailAnalytics(messageData, eventData);
      // Should not crash, should ignore unknown types
      expect(analytics.delivered).toBe(0);
      expect(analytics.opens).toBe(0);
      expect(analytics.clicks).toBe(0);
    });

    it('should handle malformed message data', () => {
      const messageData = [
        null,
        undefined,
        { id: '1' }, // Missing isTest
        { isTest: false }, // Missing id
        { id: '2', isTest: 'invalid' } // Invalid isTest value
      ];
      const eventData = [];

      // Should not crash
      const analytics = calculateEmailAnalytics(messageData.filter(Boolean), eventData);
      expect(typeof analytics.totalSent).toBe('number');
    });

    it('should handle large datasets efficiently', () => {
      // Generate large dataset
      const messageData = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        isTest: i % 100 === 0 // Every 100th is test
      }));

      const eventData = Array.from({ length: 2000 }, (_, i) => ({
        recordType: ['Open', 'Click', 'Delivery', 'Bounce'][i % 4],
        email: `user${i % 500}@example.com` // 500 unique users
      }));

      const startTime = Date.now();
      const analytics = calculateEmailAnalytics(messageData, eventData);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(analytics.totalSent).toBe(990); // 1000 - 10 test messages
      expect(analytics.uniqueOpens).toBeLessThanOrEqual(500);
      expect(analytics.uniqueClicks).toBeLessThanOrEqual(500);
    });
  });

  describe('Real-world Analytics Scenarios', () => {
    it('should handle typical email campaign analytics', () => {
      const messageData = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        isTest: false
      }));

      const eventData = [
        // 90% delivery rate
        ...Array.from({ length: 90 }, (_, i) => ({
          recordType: 'Delivery',
          email: `user${i}@example.com`
        })),
        // 10% bounce rate
        ...Array.from({ length: 10 }, (_, i) => ({
          recordType: 'Bounce',
          email: `bounced${i}@example.com`
        })),
        // 25% open rate (25 unique users)
        ...Array.from({ length: 35 }, (_, i) => ({
          recordType: 'Open',
          email: `user${i % 25}@example.com`
        })),
        // 5% click rate (5 unique users)
        ...Array.from({ length: 8 }, (_, i) => ({
          recordType: 'Click',
          email: `user${i % 5}@example.com`
        })),
        // 1% spam complaints
        { recordType: 'SpamComplaint', email: 'complainer@example.com' }
      ];

      const analytics = calculateEmailAnalytics(messageData, eventData);

      expect(analytics.totalSent).toBe(100);
      expect(analytics.deliveryRate).toBe(90);
      expect(analytics.bounceRate).toBe(10);
      expect(analytics.openRate).toBe(25);
      expect(analytics.clickRate).toBe(5);
      expect(analytics.complaintRate).toBe(1);
      expect(analytics.opens).toBe(35); // Total opens including duplicates
      expect(analytics.uniqueOpens).toBe(25); // Unique users who opened
    });
  });
});
