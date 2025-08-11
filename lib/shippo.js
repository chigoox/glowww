// Simple Shippo client helper.
// Requires env var SHIPPO_API_TOKEN. No multi-provider adapter — Shippo only.

const shippoFactory = require('shippo');
import { adminDb } from './firebaseAdmin';

let shippo = null;

export function getShippoClient() {
  if (!shippo) {
    const token = process.env.SHIPPO_API_TOKEN;
    if (!token) {
      throw new Error('Missing SHIPPO_API_TOKEN environment variable');
    }
    shippo = shippoFactory(token);
  }
  return shippo;
}

export function assertEnv() {
  if (!process.env.SHIPPO_API_TOKEN) {
    throw new Error('Missing SHIPPO_API_TOKEN environment variable');
  }
}

// Create a new client from a provided token (does not cache globally)
export function getShippoClientFromToken(token) {
  if (!token) throw new Error('Shippo token required');
  return shippoFactory(token);
}

// Try to build a client for a given user by looking up token in Firestore.
// Fallback to platform token if none found or admin is not initialized.
export async function getShippoClientForUserId(userId) {
  try {
    if (adminDb && userId) {
      const snap = await adminDb.collection('users').doc(userId).get();
      const data = snap.exists ? snap.data() : null;
      const userToken = data?.shippingShippoToken;
      if (userToken) return getShippoClientFromToken(userToken);
    }
  } catch {}
  return getShippoClient();
}
