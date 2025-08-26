import { NextResponse } from 'next/server';
import { getPublicSiteBySubdomain } from '@/lib/sites';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sub = (searchParams.get('subdomain') || '').toString().toLowerCase();
    if (!sub) return NextResponse.json({ ok: false, error: 'Missing subdomain' }, { status: 400 });
    const mapping = await getPublicSiteBySubdomain(sub);
    if (!mapping) return NextResponse.json({ ok: true, mapping: null });
    return NextResponse.json({ ok: true, mapping });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
