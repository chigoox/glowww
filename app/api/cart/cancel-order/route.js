import { adminDb } from '@/lib/firebaseAdmin';
import { withIdempotency } from '@/lib/idempotency';
import { requireAuth, enforceUserMatch, enforceSellerOwnership } from '@/lib/apiAuth';
import { rateLimit } from '@/lib/rateLimit';
import { cancelSchema, validate } from '@/lib/validation';

export const runtime='nodejs';
export const dynamic='force-dynamic';

/*
POST /api/cart/cancel-order { userId, orderId }
Idempotent: Releases reservations if still pending_payment.
*/
export async function POST(req){
  const idemKey = req.headers.get('Idempotency-Key')?.trim();
  try {
  const body = await req.json();
  const authRes = await requireAuth(req);
  if(authRes.error) return Response.json({ ok:false, ...authRes.error }, { status:401 });
  const { user } = authRes;
  const val = validate(cancelSchema, body);
  if(val.error) return Response.json({ ok:false, ...val.error }, { status:400 });
  const { userId, orderId } = val.data;
  const match = enforceUserMatch(user, userId);
  if(match.error) return Response.json({ ok:false, ...match.error }, { status:403 });
  const rl = await rateLimit({ keyParts:[user.uid,'cancel'], limit:20, windowMs:5*60*1000 });
  if(rl.error) return Response.json({ ok:false, ...rl.error }, { status:429 });
    const orderRef = adminDb.collection('users').doc(userId).collection('orders').doc(orderId);
    const { payload, reused } = await withIdempotency(adminDb, idemKey, async () => {
      return await adminDb.runTransaction(async (t)=>{
        const snap = await t.get(orderRef);
        if(!snap.exists) return { error:'Order not found' };
  const data = snap.data();
  const ownership = enforceSellerOwnership({ user, order: { ...data, userId, sellerUserId: data.sellerUserId }, allowBuyer:true, action:'cancel' });
  if(ownership.error) return ownership.error;
        if(data.lifecycleStatus === 'canceled') return { ok:true, alreadyCanceled:true };
        if(data.lifecycleStatus !== 'pending_payment') return { error:'Cannot cancel in current state' };
        const items = Array.isArray(data.items)? data.items: [];
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
        const history = Array.isArray(data.statusHistory)? [...data.statusHistory]:[];
        history.push({ from: data.lifecycleStatus, to:'canceled', at: Date.now(), note:'user_cancel' });
        t.update(orderRef, { lifecycleStatus:'canceled', status:'canceled', canceledAt: new Date(), statusHistory: history.slice(-200) });
        return { ok:true };
      });
    });
  if(payload.error) return Response.json({ ok:false, ...payload, idempotencyKey: idemKey, reused }, { status: payload.error === 'Order not found' ? 404 : 409 });
  return Response.json({ ok:true, ...payload, idempotencyKey: idemKey, reused });
  } catch(e){
    console.error('cancel-order error', e);
  return Response.json({ ok:false, errorCode:'CANCEL_FAILED', message: e.message || 'Failed', idempotencyKey: idemKey }, { status:500 });
  }
}
