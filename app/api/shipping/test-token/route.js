import { NextResponse } from 'next/server';
const shippoFactory = require('shippo');

export async function POST(req) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });
    const shippo = shippoFactory(token);
    // A lightweight call to verify token works: list carrier accounts
    const carriers = await shippo.carrieraccount.list({ page: 1, results: 1 });
    return NextResponse.json({ ok: true, carriers: Array.isArray(carriers?.results) ? carriers.results.length : 0 });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Token test failed' }, { status: 400 });
  }
}
