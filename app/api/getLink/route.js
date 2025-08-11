export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';

export async function POST(request) {
  try {
    const { stripeAccountID } = await request.json();
    if (!stripeAccountID) return new Response(JSON.stringify({ error: 'Missing stripeAccountID' }), { status: 400 });

    if (!process.env.STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const link = await stripe.accounts.createLoginLink(stripeAccountID);
    return new Response(JSON.stringify(link?.url), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to get link' }), { status: 500 });
  }
}
