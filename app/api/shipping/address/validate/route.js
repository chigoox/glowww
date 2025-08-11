import { NextResponse } from 'next/server';
const { getShippoClient, assertEnv } = require('@/lib/shippo');

export async function POST(req) {
  try {
    assertEnv();
    const address = await req.json();
    const required = ['street1','city','state','zip','country'];
    for (const k of required) if (!address?.[k]) return NextResponse.json({ error: `Missing ${k}` }, { status: 400 });
    const shippo = getShippoClient();
    const res = await shippo.address.validate(address);
    return NextResponse.json(res);
  } catch (e) {
    console.error('Shippo address validate error:', e);
    return NextResponse.json({ error: e.message || 'Failed to validate address' }, { status: 500 });
  }
}
