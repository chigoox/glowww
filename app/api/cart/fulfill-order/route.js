import { adminDb } from '@/lib/firebaseAdmin';
import { withIdempotency } from '@/lib/idempotency';
import { requireAuth, enforceUserMatch, enforceSellerOwnership } from '@/lib/apiAuth';
import { rateLimit } from '@/lib/rateLimit';
import { fulfillSchema, validate } from '@/lib/validation';

export const runtime='nodejs';
export const dynamic='force-dynamic';

/*
POST /api/cart/fulfill-order { userId, orderId }
Idempotent via Idempotency-Key header. Transitions lifecycleStatus -> fulfilled (if paid)
and decrements product/variant stock, reducing reserved accordingly.
*/
export async function POST(req){
  const idemKey = req.headers.get('Idempotency-Key')?.trim();
  try {
  const body = await req.json();
  const authRes = await requireAuth(req);
  if(authRes.error) return Response.json({ ok:false, ...authRes.error }, { status:401 });
  const { user } = authRes;
  const val = validate(fulfillSchema, body);
  if(val.error) return Response.json({ ok:false, ...val.error }, { status:400 });
  const { userId, orderId } = val.data;
  const match = enforceUserMatch(user, userId);
  if(match.error) return Response.json({ ok:false, ...match.error }, { status:403 });
  const rl = await rateLimit({ keyParts:[user.uid,'fulfill'], limit:30, windowMs:5*60*1000 });
  if(rl.error) return Response.json({ ok:false, ...rl.error }, { status:429 });
    const orderRef = adminDb.collection('users').doc(userId).collection('orders').doc(orderId);
    const { payload, reused } = await withIdempotency(adminDb, idemKey, async () => {
      const snap = await orderRef.get();
      if(!snap.exists) return { error:'Order not found' };
  const order = snap.data();
  const ownership = enforceSellerOwnership({ user, order, allowBuyer:false, action:'fulfill' });
  if(ownership.error) return ownership.error;
      if(order.lifecycleStatus === 'fulfilled') return { ok:true, alreadyFulfilled:true };
      if(order.lifecycleStatus !== 'paid') return { error:'Order not paid' };
      await adminDb.runTransaction(async (t)=>{
        const fresh = await t.get(orderRef);
        if(!fresh.exists) throw new Error('Order disappeared');
        const data = fresh.data();
        if(data.lifecycleStatus === 'fulfilled') return; // idempotent inside txn
        if(data.lifecycleStatus !== 'paid') throw new Error('Order not paid (race)');
        const items = Array.isArray(data.items) ? data.items : [];
        for(const line of items){
          const prodRef = adminDb.collection('products').doc(line.productId);
          const prodSnap = await t.get(prodRef);
          if(!prodSnap.exists) continue;
          const prod = prodSnap.data();
            let variants = Array.isArray(prod.variants) ? [...prod.variants] : null;
            if(line.variantId && variants){
              variants = variants.map(v => {
                if(v.id === line.variantId || v.variantId === line.variantId){
                  const stock = typeof v.stock === 'number' ? v.stock : (typeof v.inventory==='number'? v.inventory: 0);
                  const reserved = typeof v.reserved === 'number' ? v.reserved : 0;
                  const nextStock = Math.max(0, stock - line.qty);
                  return { ...v, stock: nextStock, reserved: Math.max(0, reserved - line.qty) };
                }
                return v;
              });
              t.update(prodRef, { variants });
            } else {
              const stock = typeof prod.stock === 'number' ? prod.stock : (typeof prod.inventory==='number'? prod.inventory: 0);
              const reserved = typeof prod.reserved === 'number' ? prod.reserved : 0;
              const nextStock = Math.max(0, stock - line.qty);
              t.update(prodRef, { stock: nextStock, reserved: Math.max(0, reserved - line.qty) });
            }
        }
        const history = Array.isArray(data.statusHistory) ? [...data.statusHistory] : [];
        history.push({ from: data.lifecycleStatus, to: 'fulfilled', at: Date.now() });
        t.update(orderRef, { lifecycleStatus: 'fulfilled', status: 'fulfilled', fulfilledAt: new Date(), statusHistory: history.slice(-200) });
      });
      return { ok:true };
    });
  if(payload.error) return Response.json({ ok:false, ...payload, idempotencyKey: idemKey, reused }, { status: payload.error === 'Order not found' ? 404 : 409 });
  return Response.json({ ok:true, ...payload, idempotencyKey: idemKey, reused });
  } catch(e){
    console.error('fulfill-order error', e);
  return Response.json({ ok:false, errorCode:'FULFILL_FAILED', message: e.message || 'Failed', idempotencyKey: idemKey }, { status:500 });
  }
}
