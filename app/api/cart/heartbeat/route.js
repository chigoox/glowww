import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from '@/lib/firestoreDebug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/cart/heartbeat { userId, siteId? }
// Throttled heartbeat with per-site cart docs (cart__<siteId>) so carts are isolated across sites.
const WRITE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
export async function POST(req) {
  try {
    const { userId, siteId } = await req.json();
    if(!userId) return Response.json({ error:'Missing userId' }, { status:400 });
    const cartDocId = siteId ? `cart__${siteId}` : 'activeCart';
    const ref = doc(db, 'users', userId, 'commerce', cartDocId);
    const now = Date.now();
  // Blind write, rely on client throttle to avoid excessive writes
  await setDoc(ref, { lastActivityAt: now, recoverable: true, siteId: siteId || null }, { merge:true });
  return Response.json({ ok:true, writtenAt: now, siteScoped: !!siteId });
  } catch (e) {
    return Response.json({ error: e.message || 'Heartbeat failed' }, { status:500 });
  }
}
