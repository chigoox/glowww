export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { adminDb } from '@/lib/firebaseAdmin';

// Helper to get a Stripe client for the connected account
async function getStripeForUser(userId) {
  if (!adminDb) throw new Error('Firebase Admin not configured');
  const doc = await adminDb.collection('stripe_connect').doc(userId).get();
  if (!doc.exists) return { connected: false };
  const data = doc.data();
  const accountId = data.accountId;
  const accessToken = data.access_token; // present for Standard OAuth

  if (accessToken) {
    // Use OAuth token for the connected Standard account
    const stripe = new Stripe(accessToken);
    return { connected: true, stripe, accountId, via: 'oauth' };
  }

  // Fallback: use platform secret with Stripe-Account header (works in some contexts)
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error('Stripe not configured');
  const stripe = new Stripe(secret);
  return { connected: true, stripe, accountId, via: 'header' };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const daysRaw = parseInt(searchParams.get('days') || '30', 10);
    const days = [7, 30, 90].includes(daysRaw) ? daysRaw : 30;
    if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400 });

    const conn = await getStripeForUser(userId);
    if (!conn.connected) return new Response(JSON.stringify({ connected: false }), { status: 200 });

    const since = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

    // Pull balance transactions (net amounts) and recent charges for details
    const isHeader = conn.via === 'header';
    const requestOpts = isHeader ? { stripeAccount: conn.accountId } : undefined;

    // List up to 200 balance transactions since "since"
    const bt = await conn.stripe.balanceTransactions.list({
      created: { gte: since },
      limit: 200,
      expand: ['data.source']
    }, requestOpts);

    // List recent charges for details (method, status)
    const charges = await conn.stripe.charges.list({
      created: { gte: since },
      limit: 50
    }, requestOpts);

    const byDay = new Map();
    let net = 0;
    let gross = 0;
    let refunds = 0;
    let payoutTotal = 0;
    let currency = 'USD';

    for (const tx of bt.data) {
      if (tx.currency) currency = tx.currency.toUpperCase();
      const day = new Date(tx.created * 1000).toISOString().slice(0, 10); // YYYY-MM-DD UTC
      const prev = byDay.get(day) || { net: 0, payouts: 0 };
      prev.net += tx.amount || 0; // amount already net of fees for many types
      if (tx.type === 'payout') prev.payouts += Math.abs(tx.amount || 0);
      byDay.set(day, prev);

      net += tx.amount || 0;
      if (tx.type === 'charge') gross += tx.amount || 0;
      if (tx.type === 'refund') refunds += Math.abs(tx.amount || 0);
      if (tx.type === 'payout') payoutTotal += Math.abs(tx.amount || 0);
    }

    // Normalize to an ordered array across the date range
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      const entry = byDay.get(key) || { net: 0, payouts: 0 };
      series.push({ date: key, net: entry.net / 100, payouts: entry.payouts / 100 });
    }

    // Payment method breakdown (from charges)
    const byMethod = {};
    let paymentsCount = 0;
    let paymentsVolume = 0;
    const recentPayments = [];
    for (const c of charges.data) {
      if (c.paid && c.status === 'succeeded') {
        paymentsCount += 1;
        paymentsVolume += c.amount || 0;
      }
      const method = c.payment_method_details?.type || c.payment_method_details?.card ? 'card' : (c.payment_method_details ? Object.keys(c.payment_method_details)[0] : 'unknown');
      const key = method || 'unknown';
      byMethod[key] = (byMethod[key] || 0) + (c.amount || 0);
      recentPayments.push({
        id: c.id,
        amount: (c.amount || 0) / 100,
        currency: (c.currency || 'usd').toUpperCase(),
        created: c.created,
        status: c.status,
        method: key,
        receiptUrl: c.receipt_url || null
      });
    }

    // Sort recent payments by created desc and cap to 10
    recentPayments.sort((a, b) => b.created - a.created);
    const recent = recentPayments.slice(0, 10);

    const methodBreakdown = Object.entries(byMethod).map(([name, amt]) => ({ name, amount: (amt || 0) / 100 }));

    return new Response(JSON.stringify({
      connected: true,
      currency,
      net: net / 100,
      gross: gross / 100,
      refunds: refunds / 100,
      payouts: payoutTotal / 100,
      paymentsCount,
      paymentsVolume: paymentsVolume / 100,
      series,
      methodBreakdown,
      recent
    }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
