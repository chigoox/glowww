export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const base = process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) throw new Error('Failed to get PayPal token');
  return res.json();
}

export async function POST(request) {
  try {
  const { userId, email, returnUrl } = await request.json();
  const base = process.env.PAYPAL_ENV === 'live' ? 'https://www.paypal.com' : 'https://www.sandbox.paypal.com';

    // If you have a pre-generated partner referral URL, use it
    if (process.env.PAYPAL_PARTNER_REFERRAL_URL) {
      const url = `${process.env.PAYPAL_PARTNER_REFERRAL_URL}&partnerClientId=${encodeURIComponent(process.env.PAYPAL_CLIENT_ID)}&trackingId=${encodeURIComponent(userId)}&sellerNonce=${encodeURIComponent(email || userId)}&returnToPartnerUrl=${encodeURIComponent(returnUrl || `${new URL(request.url).origin}/api/connect/paypal/callback`)}`;
      return new Response(JSON.stringify({ url }), { status: 200 });
    }

    // Otherwise create a partner referral
    const missing = [];
    if (!process.env.PAYPAL_CLIENT_ID) missing.push('PAYPAL_CLIENT_ID');
    if (!process.env.PAYPAL_CLIENT_SECRET) missing.push('PAYPAL_CLIENT_SECRET');
    if (!process.env.PAYPAL_ENV) missing.push('PAYPAL_ENV');
    if (missing.length) {
      return new Response(JSON.stringify({ error: `PayPal not configured: missing ${missing.join(', ')}` }), { status: 400 });
    }
    const { access_token } = await getAccessToken();
    const referralRes = await fetch(`${base}/v2/customer/partner-referrals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      },
      body: JSON.stringify({
        tracking_id: userId,
        partner_config_override: {
          return_url: `${new URL(request.url).origin}/api/connect/paypal/callback`,
          return_url_description: 'Return to app'
        },
        operations: [
          {
            operation: 'API_INTEGRATION',
            api_integration_preference: {
              rest_api_integration: {
                integration_method: 'PAYPAL',
                integration_type: 'THIRD_PARTY',
                third_party_details: {
                  features: ['PAYMENT', 'REFUND']
                }
              }
            }
          }
        ],
        products: ['PPCP']
      })
    });
    const referral = await referralRes.json();
    const link = referral.links?.find(l => l.rel === 'action_url')?.href;
  if (!link) throw new Error('No referral link');
    return new Response(JSON.stringify({ url: link }), { status: 200 });
  } catch (e) {
  return new Response(JSON.stringify({ error: e.message || 'PayPal start failed' }), { status: 500 });
  }
}
