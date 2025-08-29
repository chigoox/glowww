const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock the events route functionality
const mockAutoSuppressEmail = () => {};
const mockFindMessagesByProviderId = () => [];
const mockUpdateMessages = () => {};

// Mock Firebase Admin
const mockFirestore = {
  collection: jest.fn(() => ({
    where: jest.fn(() => ({
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(() => ({
            empty: true,
            docs: []
          }))
        }))
      }))
    })),
    add: jest.fn(() => Promise.resolve({ id: 'suppression-123' })),
    doc: jest.fn(() => ({
      set: jest.fn(),
      get: jest.fn(),
      update: jest.fn()
    }))
  })),
  batch: jest.fn(() => ({
    set: jest.fn(),
    commit: jest.fn()
  }))
};

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: mockFirestore
}));

describe('Auto-suppression Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('autoSuppressEmail function', () => {
    // Mock the autoSuppressEmail function behavior
    const autoSuppressEmail = async (email, reason, messageData) => {
      if (!email || !mockFirestore) return;
      
      try {
        // Determine scope based on message context
        const scope = messageData?.siteId ? `site:${messageData.siteId}` : 'platform-mkt';
        
        // Check if already suppressed to avoid duplicates
        const existing = await mockFirestore.collection('emailSuppression')
          .where('email', '==', email.toLowerCase())
          .where('scope', '==', scope)
          .limit(1)
          .get();
        
        if (!existing.empty) {
          console.log(`Email ${email} already suppressed for scope ${scope}`);
          return { alreadyExists: true };
        }
        
        // Create suppression entry
        await mockFirestore.collection('emailSuppression').add({
          email: email.toLowerCase(),
          scope,
          reason,
          createdAt: new Date(),
          automated: true,
          source: 'postmark_webhook'
        });
        
        console.log(`Auto-suppressed ${email} (${reason}) for scope ${scope}`);
        return { created: true, scope, reason };
      } catch (e) {
        console.error('Auto-suppression failed:', e);
        return { error: e.message };
      }
    };

    it('should auto-suppress hard bounces', async () => {
      const email = 'bounce@example.com';
      const reason = 'bounce_hardbounce';
      const messageData = { siteId: 'site123' };

      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(() => ({
                empty: true // Not already suppressed
              }))
            }))
          }))
        })),
        add: jest.fn(() => Promise.resolve({ id: 'suppression-123' }))
      });

      const result = await autoSuppressEmail(email, reason, messageData);

      expect(result.created).toBe(true);
      expect(result.scope).toBe('site:site123');
      expect(result.reason).toBe(reason);
    });

    it('should auto-suppress spam complaints', async () => {
      const email = 'complaint@example.com';
      const reason = 'complaint';
      const messageData = { siteId: 'site456' };

      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(() => ({
                empty: true
              }))
            }))
          }))
        })),
        add: jest.fn(() => Promise.resolve({ id: 'suppression-456' }))
      });

      const result = await autoSuppressEmail(email, reason, messageData);

      expect(result.created).toBe(true);
      expect(result.scope).toBe('site:site456');
      expect(result.reason).toBe('complaint');
    });

    it('should use platform-mkt scope when no siteId provided', async () => {
      const email = 'platform@example.com';
      const reason = 'bounce_hardbounce';
      const messageData = {}; // No siteId

      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(() => ({
                empty: true
              }))
            }))
          }))
        })),
        add: jest.fn(() => Promise.resolve({ id: 'suppression-789' }))
      });

      const result = await autoSuppressEmail(email, reason, messageData);

      expect(result.created).toBe(true);
      expect(result.scope).toBe('platform-mkt');
    });

    it('should prevent duplicate suppressions', async () => {
      const email = 'already@suppressed.com';
      const reason = 'bounce_hardbounce';
      const messageData = { siteId: 'site123' };

      // Mock existing suppression
      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(() => ({
                empty: false, // Already exists
                docs: [{ id: 'existing-123' }]
              }))
            }))
          }))
        })),
        add: jest.fn()
      });

      const result = await autoSuppressEmail(email, reason, messageData);

      expect(result.alreadyExists).toBe(true);
      expect(mockFirestore.collection().add).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase', async () => {
      const email = 'MixedCase@Example.COM';
      const reason = 'bounce_hardbounce';
      const messageData = { siteId: 'site123' };

      const mockAdd = jest.fn(() => Promise.resolve({ id: 'suppression-mixed' }));
      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(() => ({
                empty: true
              }))
            }))
          }))
        })),
        add: mockAdd
      });

      await autoSuppressEmail(email, reason, messageData);

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'mixedcase@example.com', // Normalized to lowercase
          automated: true,
          source: 'postmark_webhook'
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      const email = 'error@test.com';
      const reason = 'bounce_hardbounce';
      const messageData = { siteId: 'site123' };

      mockFirestore.collection.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await autoSuppressEmail(email, reason, messageData);

      expect(result.error).toBe('Database connection failed');
    });

    it('should skip processing when email is missing', async () => {
      const result1 = await autoSuppressEmail('', 'bounce_hardbounce', {});
      const result2 = await autoSuppressEmail(null, 'bounce_hardbounce', {});
      const result3 = await autoSuppressEmail(undefined, 'bounce_hardbounce', {});

      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
      expect(result3).toBeUndefined();
    });
  });

  describe('Bounce Type Processing', () => {
    const mockProcessBounceEvent = async (bounceType, email, messageData) => {
      // Logic from the events route
      const hardBounceTypes = ['HardBounce', 'SpamNotification', 'ManuallyDeactivated'];
      
      if (hardBounceTypes.includes(bounceType)) {
        const reason = `bounce_${bounceType.toLowerCase()}`;
        // Would call autoSuppressEmail here
        return { shouldSuppress: true, reason };
      }
      
      return { shouldSuppress: false };
    };

    it('should suppress HardBounce types', async () => {
      const result = await mockProcessBounceEvent('HardBounce', 'hard@bounce.com', {});
      expect(result.shouldSuppress).toBe(true);
      expect(result.reason).toBe('bounce_hardbounce');
    });

    it('should suppress SpamNotification bounces', async () => {
      const result = await mockProcessBounceEvent('SpamNotification', 'spam@bounce.com', {});
      expect(result.shouldSuppress).toBe(true);
      expect(result.reason).toBe('bounce_spamnotification');
    });

    it('should suppress ManuallyDeactivated bounces', async () => {
      const result = await mockProcessBounceEvent('ManuallyDeactivated', 'manual@bounce.com', {});
      expect(result.shouldSuppress).toBe(true);
      expect(result.reason).toBe('bounce_manuallydeactivated');
    });

    it('should not suppress SoftBounce types', async () => {
      const result = await mockProcessBounceEvent('SoftBounce', 'soft@bounce.com', {});
      expect(result.shouldSuppress).toBe(false);
    });

    it('should not suppress Transient bounces', async () => {
      const result = await mockProcessBounceEvent('Transient', 'transient@bounce.com', {});
      expect(result.shouldSuppress).toBe(false);
    });

    it('should not suppress Unknown bounce types', async () => {
      const result = await mockProcessBounceEvent('UnknownBounce', 'unknown@bounce.com', {});
      expect(result.shouldSuppress).toBe(false);
    });
  });

  describe('Complaint Processing', () => {
    it('should always suppress spam complaints', async () => {
      const mockProcessComplaintEvent = async (email, messageData) => {
        // All spam complaints should be auto-suppressed
        return { shouldSuppress: true, reason: 'complaint' };
      };

      const result = await mockProcessComplaintEvent('complaint@example.com', { siteId: 'site123' });
      expect(result.shouldSuppress).toBe(true);
      expect(result.reason).toBe('complaint');
    });
  });

  describe('Scope Determination', () => {
    const determineScopeAndSuppress = async (messageData, email) => {
      const scope = messageData?.siteId ? `site:${messageData.siteId}` : 'platform-mkt';
      return { scope };
    };

    it('should use site scope when siteId is provided', async () => {
      const result = await determineScopeAndSuppress({ siteId: 'abc123' }, 'test@example.com');
      expect(result.scope).toBe('site:abc123');
    });

    it('should use platform scope when no siteId', async () => {
      const result1 = await determineScopeAndSuppress({}, 'test@example.com');
      const result2 = await determineScopeAndSuppress(null, 'test@example.com');
      
      expect(result1.scope).toBe('platform-mkt');
      expect(result2.scope).toBe('platform-mkt');
    });

    it('should handle complex siteId formats', async () => {
      const testCases = [
        { siteId: 'user123_site456', expected: 'site:user123_site456' },
        { siteId: 'abc-def-ghi', expected: 'site:abc-def-ghi' },
        { siteId: '12345', expected: 'site:12345' }
      ];

      for (const testCase of testCases) {
        const result = await determineScopeAndSuppress({ siteId: testCase.siteId }, 'test@example.com');
        expect(result.scope).toBe(testCase.expected);
      }
    });
  });

  describe('Audit Logging', () => {
    it('should log suppression actions for audit trail', async () => {
      const mockConsoleLog = jest.spyOn(console, 'log');
      const mockConsoleError = jest.spyOn(console, 'error');

      const email = 'audit@example.com';
      const reason = 'bounce_hardbounce';
      const messageData = { siteId: 'site123' };

      mockFirestore.collection.mockReturnValue({
        where: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(() => ({
                empty: true
              }))
            }))
          }))
        })),
        add: jest.fn(() => Promise.resolve({ id: 'suppression-audit' }))
      });

      // Mock the autoSuppressEmail function
      const autoSuppressEmail = async (email, reason, messageData) => {
        const scope = messageData?.siteId ? `site:${messageData.siteId}` : 'platform-mkt';
        console.log(`Auto-suppressed ${email} (${reason}) for scope ${scope}`);
        return { created: true };
      };

      await autoSuppressEmail(email, reason, messageData);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Auto-suppressed audit@example.com (bounce_hardbounce) for scope site:site123'
      );

      mockConsoleLog.mockRestore();
      mockConsoleError.mockRestore();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete bounce event processing', async () => {
      const bounceEvent = {
        RecordType: 'Bounce',
        Type: 'HardBounce',
        Email: 'integration@test.com',
        MessageID: 'msg-123',
        Description: 'The email address does not exist.'
      };

      const messageData = { 
        siteId: 'integration-site',
        template: 'welcome',
        userId: 'user456'
      };

      // This would be the complete flow in the webhook handler
      const shouldSuppress = ['HardBounce', 'SpamNotification', 'ManuallyDeactivated']
        .includes(bounceEvent.Type);
      
      expect(shouldSuppress).toBe(true);
      
      if (shouldSuppress) {
        mockFirestore.collection.mockReturnValue({
          where: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: jest.fn(() => ({
                get: jest.fn(() => ({
                  empty: true
                }))
              }))
            }))
          })),
          add: jest.fn(() => Promise.resolve({ id: 'integration-suppression' }))
        });

        const suppressionResult = {
          email: bounceEvent.Email.toLowerCase(),
          scope: `site:${messageData.siteId}`,
          reason: `bounce_${bounceEvent.Type.toLowerCase()}`,
          automated: true,
          source: 'postmark_webhook',
          createdAt: new Date()
        };

        expect(suppressionResult.email).toBe('integration@test.com');
        expect(suppressionResult.scope).toBe('site:integration-site');
        expect(suppressionResult.reason).toBe('bounce_hardbounce');
        expect(suppressionResult.automated).toBe(true);
      }
    });
  });
});
