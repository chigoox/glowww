import Stripe from 'stripe';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { subscriptionId } = await req.json();
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    if (!subscriptionId) return Response.json({ error: 'Missing subscriptionId' }, { status: 400 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    const sub = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
    return Response.json({ ok: true, status: sub.status, cancelAtPeriodEnd: sub.cancel_at_period_end });
  } catch (err) {
    console.error('subscription resume error:', err);
    return Response.json({ error: 'Failed to resume' }, { status: 500 });
  }
}
