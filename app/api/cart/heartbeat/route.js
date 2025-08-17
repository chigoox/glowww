import { db } from '@/lib/firebase';
import { doc, setDoc } from '@/lib/firestoreDebug';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/cart/heartbeat { userId }
// Updates lastActivityAt if cart exists; creates minimal doc if absent.
export async function POST(req) {
  try {
    const { userId } = await req.json();
    if(!userId) return Response.json({ error:'Missing userId' }, { status:400 });
    const ref = doc(db, 'users', userId, 'commerce', 'activeCart');
    await setDoc(ref, { lastActivityAt: Date.now(), recoverable: true }, { merge:true });
    return Response.json({ ok:true });
  } catch (e) {
    return Response.json({ error: e.message || 'Heartbeat failed' }, { status:500 });
  }
}
