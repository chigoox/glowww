// Postmark provider wrapper (Phase 1)
// Minimal transactional send + error normalization.

import { ServerClient } from 'postmark';

// Cache clients by token so we can support multiple servers later.
const clientCache = new Map();

function getClient(token) {
  if (!token) throw new Error('postmark: missing server token');
  if (!clientCache.has(token)) {
    clientCache.set(token, new ServerClient(token));
  }
  return clientCache.get(token);
}

export function resolveServerToken({ category = 'transactional', scope = 'platform' } = {}) {
  // For now simple env mapping; later dynamic per-tenant server tokens.
  if (scope === 'platform') return process.env.POSTMARK_TOKEN_PLATFORM_TRANS;
  if (scope === 'site-shared') return process.env.POSTMARK_TOKEN_SITES_TRANS;
  // scope could be a tenant server id in later phases
  return process.env.POSTMARK_TOKEN_PLATFORM_TRANS;
}

export async function sendPostmarkEmail({
  token,
  from,
  to,
  subject,
  html,
  text,
  headers = {},
  replyTo,
  messageStream // optional: Postmark message stream
}) {
  const client = getClient(token);

  const payload = {
    From: from,
    To: to,
    Subject: subject,
    HtmlBody: html,
    TextBody: text,
    MessageStream: messageStream, // undefined is fine
    Headers: Object.entries(headers).map(([Name, Value]) => ({ Name, Value })),
    ReplyTo: replyTo
  };

  const transientCodes = new Set([406, 407, 600, 601, 602]); // sample Postmark transient codes
  const maxAttempts = 3;
  for (let attempt=1; attempt<=maxAttempts; attempt++) {
    try {
      const res = await client.sendEmail(payload);
      return {
        provider: 'postmark',
        providerMessageId: res.MessageID,
        submittedAt: new Date(),
        error: null,
        attempts: attempt
      };
    } catch (err) {
      const norm = normalizeError(err);
      const transient = transientCodes.has(Number(norm.code));
      if (!transient || attempt === maxAttempts) {
        console.error('Postmark send failed', err);
        return {
          provider: 'postmark',
          providerMessageId: null,
          submittedAt: new Date(),
          error: norm,
          attempts: attempt
        };
      }
      // backoff (jitter)
      const delay = 200 * attempt + Math.random()*150;
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r=>setTimeout(r, delay));
    }
  }
}

function normalizeError(err) {
  if (!err) return null;
  return {
    code: err.code || err.ErrorCode || 'POSTMARK_ERROR',
    message: err.message || err.Message || 'Unknown Postmark error'
  };
}
