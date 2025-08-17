export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { db } from '@/lib/firebase';
import { doc, updateDoc } from '@/lib/firestoreDebug';

export async function POST(req) {
  try {
    const { orderId, userId } = await req.json();
    if (!orderId || !userId) return Response.json({ error: 'Missing orderId or userId' }, { status: 400 });
    try { await updateDoc(doc(db, 'users', userId, 'orders', orderId), { status:'paid', paidAt: Date.now() }); } catch {}
    return Response.json({ status: 'COMPLETED', id: orderId });
  } catch (e) {
    return Response.json({ error: e.message || 'Failed to capture order' }, { status: 500 });
  }
}
