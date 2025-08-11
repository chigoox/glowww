import Stripe from 'stripe';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const customerId = searchParams.get('customerId');
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    let cid = customerId;
    if (!cid) {
      if (!email) return Response.json({ error: 'Missing email' }, { status: 400 });
      const customers = await stripe.customers.list({ email, limit: 1 });
      const customer = customers.data[0];
      if (!customer) return Response.json({ data: { status: 'none' } });
      cid = customer.id;
    }

    const subs = await stripe.subscriptions.list({ customer: cid, status: 'all', expand: ['data.default_payment_method', 'data.items.data.price'] });
    const active = subs.data.find(s => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status));

    if (!active) {
      return Response.json({ data: { status: 'none' } });
    }

    const item = active.items.data[0];
    return Response.json({
      data: {
        id: active.id,
        status: active.status,
        cancelAtPeriodEnd: active.cancel_at_period_end,
        currentPeriodEnd: active.current_period_end,
        priceId: item?.price?.id,
        product: item?.price?.product,
      }
    });
  } catch (err) {
    console.error('subscription status error:', err);
    return Response.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}
