export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const { userId, email, name, phone, metadata } = await request.json();
    if (!userId || !email) {
      return new Response(JSON.stringify({ error: 'Missing userId or email' }), { status: 400 });
    }
    if (!adminDb) {
      return new Response(JSON.stringify({ error: 'Admin not configured' }), { status: 500 });
    }

    const doc = await adminDb.collection('stripe_connect').doc(userId).get();
    if (!doc.exists) return new Response(JSON.stringify({ error: 'No connected account' }), { status: 400 });
    const data = doc.data();
    const accessToken = data?.access_token;
    if (!accessToken) return new Response(JSON.stringify({ error: 'No connected account token' }), { status: 400 });

    const stripe = new Stripe(accessToken, { apiVersion: '2024-06-20' });

    // Try find existing by email to avoid duplicates
    const exists = await stripe.customers.list({ email, limit: 1 });
    const found = exists.data?.[0];
    if (found) {
      // Optionally update
      const updated = await stripe.customers.update(found.id, {
        name: name || found.name || undefined,
        phone: phone || found.phone || undefined,
        metadata: metadata || found.metadata || undefined,
      });
      return new Response(JSON.stringify({ ok: true, customer: updated, created: false }), { status: 200 });
    }

    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      phone: phone || undefined,
      metadata: metadata || undefined,
    });

    return new Response(JSON.stringify({ ok: true, customer, created: true }), { status: 200 });
  } catch (e) {
    console.error('customers.create error', e);
    return new Response(JSON.stringify({ error: 'Failed to create customer' }), { status: 500 });
  }
}
