import { NextResponse } from 'next/server';

function parseAddress(components) {
  const find = (type) => components.find(c => c.types.includes(type))?.long_name || '';
  const findShort = (type) => components.find(c => c.types.includes(type))?.short_name || '';
  const street_number = find('street_number');
  const route = find('route');
  const street1 = [street_number, route].filter(Boolean).join(' ');
  const city = find('locality') || find('postal_town') || find('sublocality') || '';
  const state = findShort('administrative_area_level_1') || '';
  const zip = find('postal_code') || '';
  const country = findShort('country') || '';
  return { street1, city, state, zip, country };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const place_id = searchParams.get('place_id');
    const sessiontoken = searchParams.get('sessiontoken') || undefined;
    if (!place_id) return NextResponse.json({ error: 'place_id required' }, { status: 400 });

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return NextResponse.json({ error: 'Missing GOOGLE_MAPS_API_KEY' }, { status: 500 });

    const qs = new URLSearchParams({ place_id, key, fields: 'address_component,formatted_address,geometry' });
    if (sessiontoken) qs.set('sessiontoken', sessiontoken);

    const url = `https://maps.googleapis.com/maps/api/place/details/json?${qs.toString()}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status && data.status !== 'OK') {
      return NextResponse.json({ error: data.error_message || data.status }, { status: 400 });
    }
    const result = data.result || {};
    const comps = result.address_components || [];
    const parsed = parseAddress(comps);
    const location = result.geometry?.location || null;
    return NextResponse.json({ ...parsed, formatted: result.formatted_address || '', location });
  } catch (e) {
    console.error('Places details error:', e);
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 });
  }
}
