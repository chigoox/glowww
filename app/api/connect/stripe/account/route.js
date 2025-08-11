export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });

    const doc = await adminDb.collection('stripe_connect').doc(userId).get();
    if (!doc.exists) {
      return new Response(JSON.stringify({ connected: false }), { status: 200 });
    }
    const data = doc.data();

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const account = await stripe.accounts.retrieve(data.accountId);

    return new Response(JSON.stringify({
      connected: true,
      accountId: data.accountId,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      email: account.email || null,
      business_profile: account.business_profile || null
    }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
