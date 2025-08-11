export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const stateRaw = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return Response.redirect(`${url.origin}/dashboard?connect=stripe_error&reason=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return new Response('Missing code', { status: 400 });
    }
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_CONNECT_CLIENT_ID) {
      return new Response('Stripe Connect not configured', { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const tokenResp = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code
    });

  const { stripe_user_id, access_token, refresh_token, scope, livemode, token_type, stripe_publishable_key } = tokenResp;

    let state = {};
    try { state = JSON.parse(stateRaw || '{}'); } catch {}

    const userId = state.userId;
    const returnUrl = state.returnUrl || '/dashboard';

    if (!userId) {
      return Response.redirect(`${url.origin}/dashboard?connect=stripe_missing_user`);
    }

    if (!adminDb) {
      return new Response('Firebase Admin not configured (missing credentials). Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.', { status: 500 });
    }
    await adminDb.collection('stripe_connect').doc(userId).set({
      accountId: stripe_user_id,
      access_token,
      refresh_token,
      scope,
      livemode,
      token_type,
      publishable_key: stripe_publishable_key,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });

    return Response.redirect(`${url.origin}${returnUrl || '/dashboard'}?connect=stripe_success`);
  } catch (e) {
    return new Response(`Connect error: ${e.message}`, { status: 500 });
  }
}
