// Suppression & unsubscribe helpers
// Collection: emailSuppression (fields: email, scope, reason, createdAt)
// Token format: base64url(email|scope|ts|hmac)

import { db } from '../firebaseAdmin';
import crypto from 'crypto';

const SUPPRESSION_COLLECTION = 'emailSuppression';

function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}

function hmac(payload) {
  const secret = process.env.EMAIL_UNSUB_HMAC_SECRET || 'dev-secret';
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function createUnsubToken({ email, scope }) {
  const ts = Date.now().toString();
  const base = `${email}|${scope}|${ts}`;
  const sig = hmac(base);
  return b64url(`${base}|${sig}`);
}

export function parseUnsubToken(token) {
  try {
    const raw = Buffer.from(token.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString();
    const [email, scope, ts, sig] = raw.split('|');
    if (!email || !scope || !ts || !sig) return null;
    const base = `${email}|${scope}|${ts}`;
    const expected = hmac(base);
    if (sig !== expected) return null;
    // 30 day token validity (optional)
    if (Date.now() - Number(ts) > 30*24*60*60*1000) return null;
    return { email, scope };
  } catch (_) { return null; }
}

export async function addSuppression({ email, scope, reason='unsubscribe' }) {
  const ref = db.collection(SUPPRESSION_COLLECTION).doc();
  await ref.set({ email: email.toLowerCase(), scope, reason, createdAt: new Date() });
}

export async function isSuppressed({ email, scope }) {
  const snap = await db.collection(SUPPRESSION_COLLECTION)
    .where('email','==', email.toLowerCase())
    .where('scope','==', scope)
    .limit(1)
    .get();
  return !snap.empty;
}
