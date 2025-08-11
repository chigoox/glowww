import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const input = searchParams.get('input') || '';
    const sessiontoken = searchParams.get('sessiontoken') || undefined;
    const country = searchParams.get('country') || undefined; // e.g., US
    if (!input || input.length < 3) return NextResponse.json({ predictions: [] });

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return NextResponse.json({ error: 'Missing GOOGLE_MAPS_API_KEY' }, { status: 500 });

    const qs = new URLSearchParams({ input, key, types: 'address' });
    if (sessiontoken) qs.set('sessiontoken', sessiontoken);
    if (country) qs.set('components', `country:${country}`);

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${qs.toString()}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return NextResponse.json({ error: data.error_message || data.status }, { status: 400 });
    }
    return NextResponse.json({ predictions: data.predictions || [] });
  } catch (e) {
    console.error('Places autocomplete error:', e);
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}
