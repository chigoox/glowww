export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });
    const doc = await adminDb.collection('paypal_connect').doc(userId).get();
    if (!doc.exists) return new Response(JSON.stringify({ connected: false }), { status: 200 });
    const data = doc.data();
    return new Response(
      JSON.stringify({
        connected: !!data.merchantIdInPayPal,
        merchantIdInPayPal: data.merchantIdInPayPal || null
      }),
      { status: 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
