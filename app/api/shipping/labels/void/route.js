import { NextResponse } from 'next/server';
const { getShippoClient, assertEnv, getShippoClientForUserId } = require('@/lib/shippo');

// Void a label/transaction
export async function POST(req) {
  try {
    assertEnv();
    const body = await req.json();
  const { transaction_id, userId } = body || {};
    if (!transaction_id) return NextResponse.json({ error: 'transaction_id required' }, { status: 400 });

  const shippo = userId ? await getShippoClientForUserId(userId) : getShippoClient();
    const result = await shippo.transaction.void(transaction_id);
    return NextResponse.json(result);
  } catch (e) {
    console.error('Shippo label void error:', e);
    return NextResponse.json({ error: e.message || 'Failed to void label' }, { status: 500 });
  }
}
