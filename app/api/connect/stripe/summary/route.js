export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });

    const doc = await adminDb.collection('stripe_connect').doc(userId).get();
    if (!doc.exists) return new Response(JSON.stringify({ connected: false }), { status: 200 });

    const { accountId } = doc.data();
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500 });

    const stripe = new Stripe(secret);
    const [account, balance] = await Promise.all([
      stripe.accounts.retrieve(accountId),
      stripe.balance.retrieve({ stripeAccount: accountId })
    ]);

    // Basic payout settings (only for Custom/Express expose fully; limited for Standard)
    const payoutsEnabled = !!account.payouts_enabled;
    const chargesEnabled = !!account.charges_enabled;

    const available = (balance.available || []).reduce((sum, b) => sum + (b.amount || 0), 0);
    const pending = (balance.pending || []).reduce((sum, b) => sum + (b.amount || 0), 0);

    return new Response(JSON.stringify({
      connected: true,
      accountId,
      chargesEnabled,
      payoutsEnabled,
      currency: (balance.available?.[0]?.currency || 'usd').toUpperCase(),
      available,
      pending,
      businessType: account.business_type || null,
      businessName: account.business_profile?.name || account.settings?.dashboard?.display_name || account.email || null
    }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
