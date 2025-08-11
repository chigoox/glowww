export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const { userId } = await request.json();
    if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });

    const doc = await adminDb.collection('stripe_connect').doc(userId).get();
    if (doc.exists) {
      const data = doc.data();
      if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_CONNECT_CLIENT_ID) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        try {
          await stripe.oauth.deauthorize({ client_id: process.env.STRIPE_CONNECT_CLIENT_ID, stripe_user_id: data.accountId });
        } catch {}
      }
      await adminDb.collection('stripe_connect').doc(userId).delete();
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
