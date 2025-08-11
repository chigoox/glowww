export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const merchantId = url.searchParams.get('merchantIdInPayPal') || url.searchParams.get('merchantId');
    const trackingId = url.searchParams.get('trackingId') || url.searchParams.get('tracking_id');
    const returnUrl = url.searchParams.get('returnUrl') || '/dashboard';

    if (!merchantId || !trackingId) {
      return new Response('Missing merchant or tracking', { status: 400 });
    }

    await adminDb.collection('paypal_connect').doc(trackingId).set({
      merchantIdInPayPal: merchantId,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });

    return Response.redirect(`${url.origin}${returnUrl}?connect=paypal_success`);
  } catch (e) {
    return new Response(`PayPal callback error: ${e.message}`, { status: 500 });
  }
}
