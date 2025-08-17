import { adminDb } from '@/lib/firebaseAdmin';
import { requireAuth } from '@/lib/apiAuth';

export const runtime='nodejs';
export const dynamic='force-dynamic';

/*
POST /api/cart/reap-reservations { ttlMinutes?:number, limit?:number }
Finds orders in pending_payment older than ttl and releases reservations.
*/
export async function POST(req){
  try {
    const authRes = await requireAuth(req);
    if(authRes.error) return Response.json({ ok:false, ...authRes.error }, { status:401 });
    const adminKey = req.headers.get('x-admin-key');
    if(!adminKey || adminKey !== process.env.INTERNAL_ADMIN_KEY) return Response.json({ ok:false, errorCode:'FORBIDDEN', message:'Admin key required' }, { status:403 });
    const { ttlMinutes = 30, limit = 50 } = await req.json().catch(()=>({}));
    const cutoff = Date.now() - ttlMinutes*60*1000;
    const usersSnap = await adminDb.collection('users').get();
    let processed = 0;
    for(const userDoc of usersSnap.docs){
      if(processed >= limit) break;
      const ordersCol = userDoc.ref.collection('orders');
      const qSnap = await ordersCol.where('lifecycleStatus','==','pending_payment').where('createdAt','<', cutoff).limit(limit-processed).get();
      for(const ord of qSnap.docs){
        if(processed >= limit) break;
        const data = ord.data();
        const items = Array.isArray(data.items)? data.items: [];
        await adminDb.runTransaction(async (t)=>{
          const fresh = await t.get(ord.ref);
          if(!fresh.exists) return;
          const cur = fresh.data();
          if(cur.lifecycleStatus !== 'pending_payment' || cur.createdAt >= cutoff) return;
          for(const line of items){
            const prodRef = adminDb.collection('products').doc(line.productId);
            const prodSnap = await t.get(prodRef);
            if(!prodSnap.exists) continue;
            const prod = prodSnap.data();
            if(line.variantId && Array.isArray(prod.variants)) {
              const variants = prod.variants.map(v => {
                if(v.id === line.variantId || v.variantId === line.variantId){
                  const reserved = typeof v.reserved==='number'? v.reserved:0;
                  return { ...v, reserved: Math.max(0, reserved - line.qty) };
                }
                return v;
              });
              t.update(prodRef, { variants });
            } else {
              const reserved = typeof prod.reserved==='number'? prod.reserved:0;
              t.update(prodRef, { reserved: Math.max(0, reserved - line.qty) });
            }
          }
          const history = Array.isArray(cur.statusHistory)? [...cur.statusHistory]:[];
          history.push({ from: cur.lifecycleStatus, to: 'expired', at: Date.now(), note: 'reservation_reaper' });
          t.update(ord.ref, { lifecycleStatus:'expired', status:'expired', expiredAt: new Date(), statusHistory: history.slice(-200) });
        });
        processed++;
      }
    }
  return Response.json({ ok:true, processed, cutoff });
  } catch(e){
    console.error('reap-reservations error', e);
  return Response.json({ ok:false, errorCode:'REAPER_FAILED', message:e.message || 'Failed' }, { status:500 });
  }
}
