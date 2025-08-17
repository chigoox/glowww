import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/seller/orders?sellerUserId=abc&limit=20&status=paid&cursor=1699999999999
// Returns orders from sellers/{sellerUserId}/orders ordered by createdAt desc.
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sellerUserId = searchParams.get('sellerUserId');
    if(!sellerUserId) return Response.json({ error:'Missing sellerUserId' }, { status:400 });
    const status = searchParams.get('status');
    const limitRaw = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.min(Math.max(limitRaw, 1), 50);
    const cursor = searchParams.get('cursor'); // createdAt timestamp (number)

    let ref = adminDb.collection('sellers').doc(sellerUserId).collection('orders');
    if(status) ref = ref.where('status','==', status);
    ref = ref.orderBy('createdAt','desc').limit(limit + 1); // fetch one extra for pagination signal
    if(cursor) {
      const cursorNum = Number(cursor);
      if(!Number.isNaN(cursorNum)) {
        ref = ref.where('createdAt','<', cursorNum).orderBy('createdAt','desc');
      }
    }

    const snap = await ref.get();
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    let nextCursor = null;
    if(docs.length > limit) {
      const tail = docs.pop();
      nextCursor = tail.createdAt || null;
    }
    return Response.json({ ok:true, orders: docs, nextCursor });
  } catch (e) {
    console.error('seller orders list error', e);
    return Response.json({ error: e.message || 'Failed to fetch seller orders' }, { status:500 });
  }
}
