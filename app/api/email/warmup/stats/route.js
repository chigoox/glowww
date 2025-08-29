import { NextResponse } from 'next/server';
import { getWarmupStats } from '@/lib/email/warmup';
import { resolveBranding } from '@/lib/email/branding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/email/warmup/stats?siteId=...&domain=...&ageDays=...
export async function GET(req) {
  try {
    const url = new URL(req.url);
    let domain = url.searchParams.get('domain');
    const siteId = url.searchParams.get('siteId');
    const ageDays = Number(url.searchParams.get('ageDays')) || 30;
    if (!domain && siteId) {
      try {
        const branding = await resolveBranding({ siteId });
        domain = new URL(branding.siteUrl).hostname;
      } catch { /* ignore */ }
    }
    if (!domain) return NextResponse.json({ ok:false, error:'domain or siteId required' }, { status:400 });
    const stats = await getWarmupStats({ domain, domainAgeDays: ageDays });
    return NextResponse.json({ ok:true, domain, ...stats });
  } catch (e) {
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}