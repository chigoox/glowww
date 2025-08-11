// POST: add domain, GET: list domains for a site
import { NextResponse } from 'next/server';
import { addDomain, getDomainsForSite } from '../../../lib/domains';

export const runtime = 'nodejs';

function makeToken(len = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req) {
  try {
    const { userId, siteId, domain } = await req.json();
    if (!userId || !siteId || !domain) return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 });
  // Generate verification token
  const verificationToken = 'glow-' + makeToken(12);
    const result = await addDomain(userId, siteId, domain, verificationToken);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const siteId = searchParams.get('siteId');
    if (!userId || !siteId) return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 });
    const domains = await getDomainsForSite(userId, siteId);
    return NextResponse.json({ ok: true, domains });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
