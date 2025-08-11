import { NextResponse } from 'next/server';
const { getShippoClient, assertEnv, getShippoClientForUserId } = require('@/lib/shippo');

export async function POST(req) {
  try {
    assertEnv();
    const body = await req.json();
    const {
      address_from,
      address_to,
      parcels,
      carrier_accounts, // optional list to limit carriers
      async = false,
      userId,
    } = body || {};

    if (!address_from || !address_to || !parcels?.length) {
      return NextResponse.json({ error: 'address_from, address_to, parcels[] required' }, { status: 400 });
    }

  const shippo = userId ? await getShippoClientForUserId(userId) : getShippoClient();

    // Create shipment and get rates
    const shipment = await shippo.shipment.create({
      address_from,
      address_to,
      parcels,
      carrier_accounts,
      async,
    });

    return NextResponse.json({ shipmentId: shipment.object_id, rates: shipment.rates || [] });
  } catch (e) {
    console.error('Shippo rates error:', e);
    return NextResponse.json({ error: e.message || 'Failed to get rates' }, { status: 500 });
  }
}
