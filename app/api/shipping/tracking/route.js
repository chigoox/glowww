import { NextResponse } from 'next/server';
const { getShippoClient, assertEnv, getShippoClientForUserId } = require('@/lib/shippo');

export async function GET(req) {
  try {
    assertEnv();
    const { searchParams } = new URL(req.url);
  const carrier = searchParams.get('carrier');
    const tracking_number = searchParams.get('tracking_number');
  const userId = searchParams.get('userId') || undefined;
    if (!carrier || !tracking_number) {
      return NextResponse.json({ error: 'carrier and tracking_number required' }, { status: 400 });
    }
  const shippo = userId ? await getShippoClientForUserId(userId) : getShippoClient();
    const tracking = await shippo.track.get_status(carrier, tracking_number);
    return NextResponse.json(tracking);
  } catch (e) {
    console.error('Shippo tracking error:', e);
    return NextResponse.json({ error: e.message || 'Failed to get tracking' }, { status: 500 });
  }
}
