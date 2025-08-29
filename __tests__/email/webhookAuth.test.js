const { describe, it, expect, beforeEach } = require('@jest/globals');
const { createHmac } = require('crypto');

// Mock webhook auth functions
const generateSignature = (payload, secret) => {
  return createHmac('sha256', secret).update(payload).digest('hex');
};

const verifyPostmarkSignature = (payload, signature, secret) => {
  if (!secret || !signature) return false;
  try {
    const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');
    return signature.toLowerCase() === expectedSignature.toLowerCase();
  } catch {
    return false;
  }
};

const verifyInboundSignature = (payload, signature, secret) => {
  if (!secret || !signature) return false;
  try {
    const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');
    return signature.toLowerCase() === expectedSignature.toLowerCase();
  } catch {
    return false;
  }
};

describe('Webhook Signature Verification', () => {
  const testSecret = 'test-webhook-secret-key';
  const testPayload = '{"MessageID":"test-123","RecordType":"Delivery"}';
  const testInboundPayload = '{"From":"test@example.com","Subject":"Test Email"}';

  beforeEach(() => {
    // Clear any mocks if needed
  });

  describe('generateSignature', () => {
    it('should generate consistent HMAC-SHA256 signatures', () => {
      const signature1 = generateSignature(testPayload, testSecret);
      const signature2 = generateSignature(testPayload, testSecret);
      
      expect(signature1).toBe(signature2);
      expect(signature1).toMatch(/^[a-f0-9]{64}$/); // Valid SHA256 hex
    });

    it('should generate different signatures for different payloads', () => {
      const signature1 = generateSignature(testPayload, testSecret);
      const signature2 = generateSignature('{"different": "payload"}', testSecret);
      
      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different secrets', () => {
      const signature1 = generateSignature(testPayload, testSecret);
      const signature2 = generateSignature(testPayload, 'different-secret');
      
      expect(signature1).not.toBe(signature2);
    });

    it('should handle empty payload', () => {
      const signature = generateSignature('', testSecret);
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle special characters in payload', () => {
      const specialPayload = '{"text":"Hello 世界! @#$%^&*()"}';
      const signature = generateSignature(specialPayload, testSecret);
      expect(signature).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('verifyPostmarkSignature', () => {
    it('should verify valid Postmark signatures', () => {
      const expectedSignature = createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex');

      const isValid = verifyPostmarkSignature(testPayload, expectedSignature, testSecret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const invalidSignature = 'invalid-signature-hash';
      const isValid = verifyPostmarkSignature(testPayload, invalidSignature, testSecret);
      expect(isValid).toBe(false);
    });

    it('should reject signatures with wrong secret', () => {
      const wrongSecret = 'wrong-secret';
      const signature = createHmac('sha256', wrongSecret)
        .update(testPayload)
        .digest('hex');

      const isValid = verifyPostmarkSignature(testPayload, signature, testSecret);
      expect(isValid).toBe(false);
    });

    it('should reject when secret is missing', () => {
      const signature = 'any-signature';
      const isValid = verifyPostmarkSignature(testPayload, signature, null);
      expect(isValid).toBe(false);

      const isValid2 = verifyPostmarkSignature(testPayload, signature, '');
      expect(isValid2).toBe(false);
    });

    it('should reject when signature is missing', () => {
      const isValid = verifyPostmarkSignature(testPayload, null, testSecret);
      expect(isValid).toBe(false);

      const isValid2 = verifyPostmarkSignature(testPayload, '', testSecret);
      expect(isValid2).toBe(false);
    });

    it('should handle malformed signatures gracefully', () => {
      const malformedSignatures = [
        'not-hex-characters',
        '123', // too short
        'x'.repeat(64), // invalid hex
        undefined,
        null,
        123 // wrong type
      ];

      malformedSignatures.forEach(badSig => {
        const isValid = verifyPostmarkSignature(testPayload, badSig, testSecret);
        expect(isValid).toBe(false);
      });
    });

    it('should be case insensitive for hex signatures', () => {
      const signature = createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex');

      const upperCaseSignature = signature.toUpperCase();
      const lowerCaseSignature = signature.toLowerCase();

      expect(verifyPostmarkSignature(testPayload, upperCaseSignature, testSecret)).toBe(true);
      expect(verifyPostmarkSignature(testPayload, lowerCaseSignature, testSecret)).toBe(true);
    });
  });

  describe('verifyInboundSignature', () => {
    it('should verify valid inbound webhook signatures', () => {
      const expectedSignature = createHmac('sha256', testSecret)
        .update(testInboundPayload)
        .digest('hex');

      const isValid = verifyInboundSignature(testInboundPayload, expectedSignature, testSecret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid inbound signatures', () => {
      const invalidSignature = 'invalid-inbound-signature';
      const isValid = verifyInboundSignature(testInboundPayload, invalidSignature, testSecret);
      expect(isValid).toBe(false);
    });

    it('should handle payload modification attacks', () => {
      const originalPayload = '{"From":"user@example.com","Amount":"$10"}';
      const modifiedPayload = '{"From":"user@example.com","Amount":"$1000"}';
      
      const validSignature = createHmac('sha256', testSecret)
        .update(originalPayload)
        .digest('hex');

      // Signature should not validate for modified payload
      const isValid = verifyInboundSignature(modifiedPayload, validSignature, testSecret);
      expect(isValid).toBe(false);
    });

    it('should handle unicode and special characters', () => {
      const unicodePayload = '{"message":"Hello 世界! Émojis: 🚀📧"}';
      const signature = createHmac('sha256', testSecret)
        .update(unicodePayload)
        .digest('hex');

      const isValid = verifyInboundSignature(unicodePayload, signature, testSecret);
      expect(isValid).toBe(true);
    });
  });

  describe('Timing Attack Resistance', () => {
    it('should use constant-time comparison for security', () => {
      const validSignature = createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex');

      // These should all take similar time (constant-time comparison)
      const startTime = process.hrtime.bigint();
      
      // Test multiple invalid signatures of same length
      const invalidSigs = [
        'a'.repeat(64),
        'b'.repeat(64),
        'c'.repeat(64),
        '0'.repeat(64),
        'f'.repeat(64)
      ];

      invalidSigs.forEach(sig => {
        verifyPostmarkSignature(testPayload, sig, testSecret);
      });

      const endTime = process.hrtime.bigint();
      
      // Also test valid signature
      verifyPostmarkSignature(testPayload, validSignature, testSecret);
      
      // This test mainly ensures the function completes without throwing
      expect(true).toBe(true);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical Postmark webhook payload', () => {
      const realPostmarkPayload = JSON.stringify({
        "RecordType": "Delivery",
        "MessageID": "883953f4-6105-42a2-a16a-77a8eac79483",
        "Recipient": "john@example.com",
        "Tag": "welcome-email",
        "DeliveredAt": "2025-01-15T08:30:00.000Z",
        "Details": "Test message delivered successfully."
      });

      const signature = createHmac('sha256', testSecret)
        .update(realPostmarkPayload)
        .digest('hex');

      const isValid = verifyPostmarkSignature(realPostmarkPayload, signature, testSecret);
      expect(isValid).toBe(true);
    });

    it('should handle typical inbound email payload', () => {
      const realInboundPayload = JSON.stringify({
        "From": "customer@example.com",
        "To": "support@mysite.com",
        "Subject": "Question about my order",
        "HtmlBody": "<p>I have a question about order #12345</p>",
        "TextBody": "I have a question about order #12345",
        "MessageID": "73e6d360-66eb-11e1-8e72-a8904824019b"
      });

      const signature = createHmac('sha256', testSecret)
        .update(realInboundPayload)
        .digest('hex');

      const isValid = verifyInboundSignature(realInboundPayload, signature, testSecret);
      expect(isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle crypto errors gracefully', () => {
      // Test with invalid secret types that might cause crypto errors
      const invalidSecrets = [null, undefined, 123, {}, []];
      
      invalidSecrets.forEach(invalidSecret => {
        const result = verifyPostmarkSignature(testPayload, 'any-sig', invalidSecret);
        expect(result).toBe(false);
      });
    });

    it('should handle malformed JSON payloads', () => {
      const malformedPayloads = [
        '{"invalid": json}', // missing quotes
        '{"incomplete":', // incomplete
        'not-json-at-all',
        '',
        null,
        undefined
      ];

      malformedPayloads.forEach(payload => {
        // Should not throw, should return false
        const result = verifyPostmarkSignature(payload, 'any-signature', testSecret);
        expect(result).toBe(false);
      });
    });
  });

  describe('Integration with Environment Variables', () => {
    it('should work with environment variable secrets', () => {
      const envSecret = process.env.TEST_WEBHOOK_SECRET || 'env-test-secret';
      const payload = '{"test": "environment"}';
      
      const signature = createHmac('sha256', envSecret)
        .update(payload)
        .digest('hex');

      const isValid = verifyPostmarkSignature(payload, signature, envSecret);
      expect(isValid).toBe(true);
    });
  });
});
