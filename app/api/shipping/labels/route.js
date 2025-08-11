import { NextResponse } from 'next/server';
const { getShippoClient, assertEnv, getShippoClientForUserId } = require('@/lib/shippo');
import { adminDb } from '@/lib/firebaseAdmin';
import Stripe from 'stripe';

// Purchase a label from a selected rate_id
export async function POST(req) {
  try {
    assertEnv();
    const body = await req.json();
    const { rate_id, label_file_type = 'PDF', async = false, userId } = body || {};
    if (!rate_id) return NextResponse.json({ error: 'rate_id required' }, { status: 400 });

    // Determine if user has a custom Shippo token
    let userHasShippoToken = false;
    if (adminDb && userId) {
      try {
        const snap = await adminDb.collection('users').doc(userId).get();
        const data = snap.exists ? snap.data() : null;
        userHasShippoToken = !!data?.shippingShippoToken;
      } catch {}
    }

    const shippo = userHasShippoToken ? await getShippoClientForUserId(userId) : getShippoClient();
    const transaction = await shippo.transaction.create({
      rate: rate_id,
      label_file_type,
      async,
    });

    if (transaction.status === 'ERROR') {
      return NextResponse.json({ error: transaction.messages?.map(m => m.text).join('; ') || 'Label purchase failed' }, { status: 400 });
    }

    // If we fell back to platform token, charge $1 platform fee (best-effort)
    let fee = { attempted: false, status: 'skipped' };
    if (!userHasShippoToken && userId) {
      fee.attempted = true;
      try {
        const secret = process.env.STRIPE_SECRET_KEY;
        if (!secret) throw new Error('Missing STRIPE_SECRET_KEY');
        const stripe = new Stripe(secret, { apiVersion: '2024-06-20' });

        // Look up a stripe customer id on the user
        let stripeCustomerId = null;
        if (adminDb) {
          const snap = await adminDb.collection('users').doc(userId).get();
          const data = snap.exists ? snap.data() : null;
          stripeCustomerId = data?.stripeCustomerId || data?.stripe_customer_id || data?.subscription?.customerId || data?.subscription?.customer?.id || null;
        }

        if (!stripeCustomerId) throw new Error('No Stripe customer on file');

        const pi = await stripe.paymentIntents.create({
          amount: 100,
          currency: 'usd',
          customer: stripeCustomerId,
          confirm: true,
          off_session: true,
          description: 'Shipping label platform fee',
          metadata: {
            userId,
            shippoTransactionId: transaction.object_id,
            type: 'shipping_label_platform_fee'
          }
        });
        fee.status = 'charged';
        fee.paymentIntentId = pi.id;
      } catch (err) {
        fee.status = 'failed';
        fee.error = err?.message || 'Failed to charge $1 fee';
      }
    }

    return NextResponse.json({
      transactionId: transaction.object_id,
      trackingNumber: transaction.tracking_number,
      trackingUrl: transaction.tracking_url_provider,
      labelUrl: transaction.label_url,
      rate: transaction.rate,
      status: transaction.status,
      platformFee: fee,
    });
  } catch (e) {
    console.error('Shippo label purchase error:', e);
    return NextResponse.json({ error: e.message || 'Failed to purchase label' }, { status: 500 });
  }
}
