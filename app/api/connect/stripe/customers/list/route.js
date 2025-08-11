export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const email = url.searchParams.get('email') || undefined;
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 25)));
    const starting_after = url.searchParams.get('starting_after') || undefined;

    if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });
    if (!adminDb) return new Response(JSON.stringify({ error: 'Admin not configured' }), { status: 500 });

    const doc = await adminDb.collection('stripe_connect').doc(userId).get();
    if (!doc.exists) return new Response(JSON.stringify({ connected: false, data: [] }), { status: 200 });
    const data = doc.data();
    const accessToken = data?.access_token;
    if (!accessToken) return new Response(JSON.stringify({ connected: false, data: [] }), { status: 200 });

    const stripe = new Stripe(accessToken, { apiVersion: '2024-06-20' });

    const params = { limit };
    if (email) params.email = email;
    if (starting_after) params.starting_after = starting_after;

    const res = await stripe.customers.list(params);
    return new Response(JSON.stringify({ connected: true, data: res.data, has_more: res.has_more }), { status: 200 });
  } catch (e) {
    console.error('customers.list error', e);
    return new Response(JSON.stringify({ error: 'Failed to fetch customers' }), { status: 500 });
  }
}
