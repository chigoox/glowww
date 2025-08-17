import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    const { currency = 'USD', items = [], discounts: clientDiscounts = [], meta, sellerUserId, siteId } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'No items' }, { status: 400 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    // Lookup connected account (if provided) for seller
    let accountId = null;
    if (sellerUserId) {
      try {
        const doc = await adminDb.collection('stripe_connect').doc(sellerUserId).get();
        if (doc.exists) accountId = doc.data().accountId || null;
      } catch (e) {
        console.warn('[cart-checkout] connected account lookup failed', e.message);
      }
    }

    // Optional fee (basis points). If > 0 we use destination charge pattern; else direct charge on connected account.
    const feeBps = parseInt(process.env.STRIPE_PLATFORM_FEE_BPS || '0', 10);
    const useFee = accountId && feeBps > 0;

    const line_items = items.map(it => ({
      price_data: {
        currency: currency.toLowerCase(),
        product_data: { name: it.name || 'Item' },
        unit_amount: it.amount // cents
      },
      quantity: it.qty || 1
    }));

  const discounts = [];
  // Placeholder: No direct Stripe coupon integration yet. clientDiscounts available if needed.

    // Build base session params
    const sessionParams = {
      mode: 'payment',
      line_items,
      discounts: discounts.length ? discounts : undefined,
      success_url: process.env.NEXT_PUBLIC_CHECKOUT_SUCCESS_URL || 'https://example.com/success',
      cancel_url: process.env.NEXT_PUBLIC_CHECKOUT_CANCEL_URL || 'https://example.com/cancel',
      metadata: {
        ...(meta?.orderId ? { orderId: meta.orderId } : {}),
        ...(sellerUserId ? { sellerUserId } : {}),
        ...(siteId ? { siteId } : {}),
        ...(accountId ? { connectedAccount: accountId } : {}),
        chargeMode: accountId ? (useFee ? 'destination_fee' : 'direct') : 'platform'
      }
    };

    let session;
    if (accountId) {
      if (useFee) {
        // Destination charge on platform with transfer to seller & fee
        const subtotalCents = line_items.reduce((s, li) => s + (li.price_data.unit_amount * (li.quantity || 1)), 0);
        const application_fee_amount = Math.floor((subtotalCents * feeBps) / 10000);
        session = await stripe.checkout.sessions.create({
          ...sessionParams,
          payment_intent_data: {
            transfer_data: { destination: accountId },
            application_fee_amount: application_fee_amount > 0 ? application_fee_amount : undefined
          }
        });
      } else {
        // Direct charge in connected account context (seller pays Stripe fees directly)
        session = await stripe.checkout.sessions.create(sessionParams, { stripeAccount: accountId });
      }
    } else {
      // Platform fallback
      session = await stripe.checkout.sessions.create(sessionParams);
    }

    return Response.json({ url: session.url });
  } catch (e) {
    console.error('cart-checkout error', e);
    return Response.json({ error: e.message || 'Checkout failed' }, { status: 500 });
  }
}
