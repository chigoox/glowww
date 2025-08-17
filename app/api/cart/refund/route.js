import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';
import { withIdempotency } from '@/lib/idempotency';
import { requireAuth, enforceUserMatch, enforceSellerOwnership } from '@/lib/apiAuth';
import { rateLimit } from '@/lib/rateLimit';
import { refundSchema, validate } from '@/lib/validation';

export const runtime='nodejs';
export const dynamic='force-dynamic';

/*
POST /api/cart/refund { userId, orderId, amount } // amount in cents
Idempotent via Idempotency-Key header.
*/
export async function POST(req){
  const idemKey = req.headers.get('Idempotency-Key')?.trim();
  try {
  const body = await req.json();
  const authRes = await requireAuth(req);
  if(authRes.error) return Response.json({ ok:false, ...authRes.error }, { status:401 });
  const { user } = authRes;
  const val = validate(refundSchema, body);
  if(val.error) return Response.json({ ok:false, ...val.error }, { status:400 });
  const { userId, orderId, amount } = val.data;
  const match = enforceUserMatch(user, userId);
  if(match.error) return Response.json({ ok:false, ...match.error }, { status:403 });
  const rl = await rateLimit({ keyParts:[user.uid,'refund'], limit:10, windowMs:5*60*1000 });
  if(rl.error) return Response.json({ ok:false, ...rl.error }, { status:429 });
    const key = process.env.STRIPE_SECRET_KEY;
    if(!key) return Response.json({ error:'Stripe not configured' }, { status:500 });
    const stripe = new Stripe(key, { apiVersion: '2024-06-20' });
    const orderRef = adminDb.collection('users').doc(userId).collection('orders').doc(orderId);

    const { payload, reused } = await withIdempotency(adminDb, idemKey, async () => {
      const snap = await orderRef.get();
      if(!snap.exists) return { error:'Order not found' };
  const order = snap.data();
  const ownership = enforceSellerOwnership({ user, order, allowBuyer:false, action:'refund' });
  if(ownership.error) return ownership.error;
      const pi = order?.stripe?.paymentIntent;
      if(!pi) return { error:'No payment intent recorded' };
      // Create refund
      const refund = await stripe.refunds.create({ payment_intent: pi, amount });
      // Record
      const history = Array.isArray(order.statusHistory) ? [...order.statusHistory] : [];
      history.push({ from: order.lifecycleStatus || order.status || 'paid', to: order.lifecycleStatus || order.status || 'paid', at: Date.now(), refundAmount: amount, note: 'partial_refund_api' });
      const prevRefunded = typeof order.refundedAmount === 'number' ? order.refundedAmount : 0;
      await orderRef.set({ refundedAmount: prevRefunded + amount, statusHistory: history.slice(-200) }, { merge:true });
      return { ok:true, refundId: refund.id };
    });
  if(payload.error) return Response.json({ ok:false, ...payload, idempotencyKey: idemKey, reused }, { status: payload.error === 'Order not found' ? 404 : 409 });
  return Response.json({ ok:true, ...payload, idempotencyKey: idemKey, reused });
  } catch(e){
    console.error('refund error', e);
  return Response.json({ ok:false, errorCode:'REFUND_FAILED', message: e.message || 'Refund failed', idempotencyKey: idemKey }, { status:500 });
  }
}
