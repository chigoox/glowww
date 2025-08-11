import { NextResponse } from 'next/server';

// GA4 Measurement Protocol endpoint
// Requires env: GA_MEASUREMENT_ID, GA_API_SECRET

export async function POST(req, { params }) {
  try {
    const { username, site } = params || {};
    const { eventName, params: eventParams, clientId, userProps } = await req.json();

    const MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;
    const API_SECRET = process.env.GA_API_SECRET;
    if (!MEASUREMENT_ID || !API_SECRET) {
      return NextResponse.json({ ok: false, error: 'GA server keys not set' }, { status: 500 });
    }

    const payload = {
      client_id: clientId || `${Date.now()}.${Math.random()}`,
      user_properties: {
        site_id: { value: userProps?.site_id || '(unknown)' },
        site_name: { value: userProps?.site_name || site || '(unknown)' },
        username: { value: userProps?.username || username || '(unknown)' },
        user_uid: { value: userProps?.user_uid || '(unknown)' }
      },
      events: [
        {
          name: eventName || 'page_view',
          params: eventParams || {}
        }
      ]
    };

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
      MEASUREMENT_ID
    )}&api_secret=${encodeURIComponent(API_SECRET)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ ok: false, error: 'GA MP error', detail: text }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
