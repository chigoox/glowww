// Webhook signature verification utilities
import crypto from 'crypto';

/**
 * Verify Postmark webhook signature
 * @param {string} body - Raw request body
 * @param {string} signature - X-Postmark-Webhook-Secret header
 * @param {string} secret - POSTMARK_WEBHOOK_SECRET env var
 * @returns {boolean}
 */
export function verifyPostmarkSignature(body, signature, secret) {
  if (!secret || !signature) return false;
  
  try {
    // Postmark uses simple secret comparison (not HMAC)
    return signature === secret;
  } catch (error) {
    console.error('Postmark signature verification error:', error);
    return false;
  }
}

/**
 * Verify inbound email webhook signature (HMAC-SHA256)
 * @param {string} body - Raw request body
 * @param {string} signature - Signature header (format: "sha256=...")
 * @param {string} secret - Webhook secret
 * @returns {boolean}
 */
export function verifyInboundSignature(body, signature, secret) {
  if (!secret || !signature) return false;
  
  try {
    const expectedSignature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch (error) {
    console.error('Inbound signature verification error:', error);
    return false;
  }
}

/**
 * Generate HMAC-SHA256 signature for outgoing webhooks
 * @param {string} body - Request body to sign
 * @param {string} secret - Secret key
 * @returns {string} - Signature in format "sha256=..."
 */
export function generateSignature(body, secret) {
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
}
