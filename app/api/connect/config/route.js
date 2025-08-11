export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function stripeConfig() {
  const missing = [];
  if (!process.env.STRIPE_CONNECT_CLIENT_ID) missing.push('STRIPE_CONNECT_CLIENT_ID');
  // Optional but helpful in local dev
  if (!process.env.STRIPE_CONNECT_REDIRECT_URL) missing.push('STRIPE_CONNECT_REDIRECT_URL');
  return { configured: missing.length === 0, missing };
}

function paypalConfig() {
  const missing = [];
  const hasPartnerUrl = !!process.env.PAYPAL_PARTNER_REFERRAL_URL;
  if (!process.env.PAYPAL_CLIENT_ID) missing.push('PAYPAL_CLIENT_ID');
  if (!hasPartnerUrl) {
    if (!process.env.PAYPAL_CLIENT_SECRET) missing.push('PAYPAL_CLIENT_SECRET');
    if (!process.env.PAYPAL_ENV) missing.push('PAYPAL_ENV');
  }
  return { configured: missing.length === 0, missing };
}

export async function GET() {
  try {
    const stripe = stripeConfig();
    const paypal = paypalConfig();
    return new Response(JSON.stringify({ stripe, paypal }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
