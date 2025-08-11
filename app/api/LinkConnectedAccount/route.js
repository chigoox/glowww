export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    const { userName, uid } = await request.json();
    if (!uid) return new Response(JSON.stringify({ error: 'Missing uid' }), { status: 400 });

    // Build Stripe Connect OAuth start URL via existing start route
    const origin = new URL(request.url).origin;
    const resp = await fetch(`${origin}/api/connect/stripe/oauth/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid, returnUrl: '/dashboard', email: undefined })
    });
    const { url, error } = await resp.json();
    if (error) return new Response(JSON.stringify({ error }), { status: 500 });

    // Optionally mark initiating user in Firestore for UX
    try {
      if (adminDb) {
        await adminDb.collection('users').doc(uid).set({
          connectInitiatedAt: new Date().toISOString(),
          username: userName || null,
        }, { merge: true });
      }
    } catch {}

    return new Response(JSON.stringify(url), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Failed to create link' }), { status: 500 });
  }
}
