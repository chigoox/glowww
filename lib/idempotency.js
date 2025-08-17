// Simple Firestore-backed idempotency helper.
// Stores operation outcome keyed by supplied idempotency key header.
// Usage: withIdempotency(adminDb, key, async ()=> payload )

export async function withIdempotency(adminDb, key, handler, { ttlMs = 6 * 60 * 60 * 1000 } = {}) {
  if (!key) {
    const payload = await handler();
    return { payload, reused: false };
  }
  const ref = adminDb.collection('idempotency').doc(key);
  let existing;
  try {
    existing = await ref.get();
  } catch (e) {
    // Fallback: run handler without idempotent persistence
    const payload = await handler();
    return { payload, reused: false, degraded: true };
  }
  const now = Date.now();
  if (existing.exists) {
    const data = existing.data();
    if (data.status === 'completed') {
      // Expire old entries
      if (data.completedAt && now - data.completedAt > ttlMs) {
        // Let it pass through & overwrite for fresh window
      } else {
        return { payload: data.response, reused: true };
      }
    } else if (data.status === 'in_progress') {
      return { payload: { ok: false, pending: true, message: 'Operation in progress' }, reused: true, pending: true };
    }
  }
  // Reserve
  await ref.set({ status: 'in_progress', createdAt: now }, { merge: true });
  try {
    const payload = await handler();
    await ref.set({ status: 'completed', completedAt: Date.now(), response: payload }, { merge: true });
    return { payload, reused: false };
  } catch (e) {
    await ref.set({ status: 'failed', failedAt: Date.now(), error: { message: e.message } }, { merge: true });
    throw e;
  }
}
