import { adminDb } from '@/lib/firebaseAdmin';
import { requireAuth, enforceUserMatch, enforceSellerOwnership } from '@/lib/apiAuth';
import { rateLimit } from '@/lib/rateLimit';
import { updateOrderStatusSchema, validate } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
POST /api/cart/update-order-status
Body: { userId, orderId, fromStatus?, toStatus?, lifecycleStatus?, refundAmount?, adjustments?:[{type, amount, note}], note? }
- Appends statusHistory entry
- Supports partial refund tracking (stores cumulative refunded + adjustments array)
*/
export async function POST(req){
  try {
    const body = await req.json();
    const authRes = await requireAuth(req);
    if(authRes.error) return Response.json({ ok:false, ...authRes.error }, { status:401 });
    const { user } = authRes;
    const val = validate(updateOrderStatusSchema, body);
    if(val.error) return Response.json({ ok:false, ...val.error }, { status:400 });
    const { userId, orderId, toStatus, lifecycleStatus, refundAmount, adjustments = [], note } = val.data;
    const match = enforceUserMatch(user, userId);
    if(match.error) return Response.json({ ok:false, ...match.error }, { status:403 });
    const rl = await rateLimit({ keyParts:[user.uid,'update_status'], limit:60, windowMs:5*60*1000 });
    if(rl.error) return Response.json({ ok:false, ...rl.error }, { status:429 });
    const orderRef = adminDb.collection('users').doc(userId).collection('orders').doc(orderId);
  const snap = await orderRef.get();
  if(!snap.exists) return Response.json({ ok:false, errorCode:'NOT_FOUND', message:'Order not found' }, { status:404 });
    const now = Date.now();
  const data = snap.data();
  const ownership = enforceSellerOwnership({ user, order: { ...data, userId, sellerUserId: data.sellerUserId }, allowBuyer:false, action:'update status' });
  if(ownership.error) return Response.json({ ok:false, ...ownership.error }, { status:403 });
    const prevLifecycle = data.lifecycleStatus || data.status || 'pending';
    const updates = { updatedAt: now };
    const history = Array.isArray(data.statusHistory) ? [...data.statusHistory] : [];
    if(lifecycleStatus && lifecycleStatus !== prevLifecycle){
      updates.lifecycleStatus = lifecycleStatus;
      if(!toStatus) updates.status = lifecycleStatus === 'paid' ? 'paid' : data.status || 'pending';
      history.push({ from: prevLifecycle, to: lifecycleStatus, at: now, note: note || null });
      updates.statusHistory = history.slice(-200); // cap
    }
    if(typeof refundAmount === 'number' && refundAmount > 0){
      const prevRefunded = typeof data.refundedAmount === 'number' ? data.refundedAmount : 0;
      updates.refundedAmount = prevRefunded + refundAmount;
      history.push({ from: prevLifecycle, to: prevLifecycle, at: now, refundAmount, note: note || 'partial_refund' });
      updates.statusHistory = history.slice(-200);
    }
    if(Array.isArray(adjustments) && adjustments.length){
      const existingAdj = Array.isArray(data.adjustments) ? data.adjustments : [];
      updates.adjustments = [...existingAdj, ...adjustments.map(a => ({ ...a, at: now }))].slice(-500);
    }
    await orderRef.set(updates, { merge:true });
  return Response.json({ ok:true });
  } catch(e){
    console.error('update-order-status error', e);
  return Response.json({ ok:false, errorCode:'UPDATE_STATUS_FAILED', message: e.message || 'Failed' }, { status:500 });
  }
}
