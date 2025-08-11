import Stripe from 'stripe';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { customerId, paymentMethodId } = await req.json();
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    if (!customerId || !paymentMethodId) {
      return Response.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    // Attach the payment method to the customer
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

    // Set as default for invoice & subscription usage
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Also update active subscriptions to use this PM, if any
    const subs = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 100 });
    await Promise.all(subs.data.map(s => stripe.subscriptions.update(s.id, {
      default_payment_method: paymentMethodId,
    })));

    return Response.json({ ok: true });
  } catch (err) {
    console.error('set-default-payment-method error:', err);
    return Response.json({ error: 'Failed to set default payment method' }, { status: 500 });
  }
}
