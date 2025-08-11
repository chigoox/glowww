import Stripe from 'stripe';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { subscriptionId, newPriceId, proration_behavior = 'create_prorations' } = await req.json();
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    if (!subscriptionId || !newPriceId) return Response.json({ error: 'Missing parameters' }, { status: 400 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const itemId = sub.items.data[0].id;
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior,
    });
    return Response.json({ ok: true, status: updated.status });
  } catch (err) {
    console.error('subscription switch error:', err);
    return Response.json({ error: 'Failed to switch plan' }, { status: 500 });
  }
}
