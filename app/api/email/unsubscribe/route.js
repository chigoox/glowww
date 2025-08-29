import { NextResponse } from 'next/server';
import { parseUnsubToken, addSuppression } from '@/lib/email/suppression';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (!token) return NextResponse.json({ ok:false, error:'Missing token' }, { status:400 });
    const parsed = parseUnsubToken(token);
    if (!parsed) return NextResponse.json({ ok:false, error:'Invalid token' }, { status:400 });
    await addSuppression({ email: parsed.email, scope: parsed.scope, reason: 'unsubscribe' });
    return new Response(`<html><body style="font-family:Arial;padding:40px;text-align:center;">You have been unsubscribed from ${parsed.scope}.</body></html>`, { headers: { 'Content-Type':'text/html' } });
  } catch (e) {
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}
