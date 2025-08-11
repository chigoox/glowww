export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { userId, email, returnUrl } = await request.json();
    const missing = [];
    if (!process.env.STRIPE_CONNECT_CLIENT_ID) missing.push('STRIPE_CONNECT_CLIENT_ID');
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    const redirectUri = process.env.STRIPE_CONNECT_REDIRECT_URL || `${new URL(request.url).origin}/api/connect/stripe/oauth/callback`;
    if (missing.length) {
      return new Response(JSON.stringify({ error: `Stripe Connect not configured: missing ${missing.join(', ')}` }), { status: 400 });
    }
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: 'read_write',
      redirect_uri: redirectUri,
      state: JSON.stringify({ userId, email, returnUrl })
    });
    const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  return new Response(JSON.stringify({ url }), { status: 200 });
  } catch (e) {
  return new Response(JSON.stringify({ error: e.message || 'Stripe Connect start failed' }), { status: 500 });
  }
}
