import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/email/suppressions?scope=...&email=...&siteId=...
// Scope derivation: if scope provided use it; else if siteId -> site:{siteId}; else platform-mkt (default marketing scope)
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const scopeParam = url.searchParams.get('scope');
    const siteId = url.searchParams.get('siteId');
    const email = url.searchParams.get('email');
    const scope = scopeParam || (siteId ? `site:${siteId}` : 'platform-mkt');
    if (!scope) return NextResponse.json({ ok:false, error:'scope required' }, { status:400 });
    let q = adminDb.collection('emailSuppression').where('scope','==', scope).orderBy('createdAt','desc').limit(500);
    if (email) q = q.where('email','==', email.toLowerCase());
    const snap = await q.get();
    const suppressions = [];
    snap.forEach(d=> suppressions.push({ id: d.id, ...d.data() }));
    return NextResponse.json({ ok:true, suppressions, scope });
  } catch (e) {
    console.error('suppressions GET error', e);
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}

// POST { email, reason?, scope?, siteId? }
// Derive scope if not provided (same logic as GET). Adds suppression.
export async function POST(req) {
  try {
    const body = await req.json();
    let { email, reason='manual', scope, siteId } = body;
    if (!email) return NextResponse.json({ ok:false, error:'email required' }, { status:400 });
    email = email.toLowerCase();
    scope = scope || (siteId ? `site:${siteId}` : 'platform-mkt');
    const doc = { email, scope, reason, createdAt: new Date() };
    await adminDb.collection('emailSuppression').add(doc);
    return NextResponse.json({ ok:true });
  } catch (e) {
    console.error('suppressions POST error', e);
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}

// DELETE body: { id } removes suppression document
export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok:false, error:'id required' }, { status:400 });
    await adminDb.collection('emailSuppression').doc(id).delete();
    return NextResponse.json({ ok:true });
  } catch (e) {
    console.error('suppressions DELETE error', e);
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}
