import Stripe from 'stripe';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { email, userId } = await req.json();
    if (!process.env.STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }
    if (!email) {
      return Response.json({ error: 'Missing email' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    // Find or create customer by email
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer = customers.data[0];
    if (!customer) {
      customer = await stripe.customers.create({ email, metadata: userId ? { userId } : undefined });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: userId ? { userId } : undefined,
    });

    return Response.json({ clientSecret: setupIntent.client_secret, customerId: customer.id });
  } catch (err) {
    console.error('create-setup-intent error:', err);
    return Response.json({ error: 'Failed to create setup intent' }, { status: 500 });
  }
}
