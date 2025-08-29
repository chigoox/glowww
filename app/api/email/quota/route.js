import { NextResponse } from 'next/server';
import { getQuotaStatus } from '@/lib/email/quotas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/email/quota?userId=...
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 });
    }

    const status = await getQuotaStatus(userId);
    return NextResponse.json({ ok: true, ...status });
  } catch (error) {
    console.error('Quota status error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
