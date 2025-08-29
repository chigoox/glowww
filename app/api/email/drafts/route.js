import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/email/drafts?siteId=... -> list drafts for site (not sent yet)
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get('siteId');
    if (!siteId) return NextResponse.json({ ok:false, error:'siteId required' }, { status:400 });
    const snap = await adminDb.collection('emailDrafts').where('siteId','==', siteId).orderBy('updatedAt','desc').limit(200).get();
    const drafts = [];
    snap.forEach(d=> drafts.push({ id: d.id, ...d.data() }));
    return NextResponse.json({ ok:true, drafts });
  } catch (e) {
    console.error('drafts GET error', e);
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}

// POST create/update draft
// Body: { id?, siteId, to, subject, body, mode:'template'|'custom', templateKey?, marketing:boolean }
export async function POST(req) {
  try {
    const { id, siteId, to='', subject='', body='', mode='template', templateKey='', marketing=false } = await req.json();
    if (!siteId) return NextResponse.json({ ok:false, error:'siteId required' }, { status:400 });
    if (!subject) return NextResponse.json({ ok:false, error:'subject required' }, { status:400 });
    if (mode === 'template' && !templateKey) return NextResponse.json({ ok:false, error:'templateKey required' }, { status:400 });
    if (mode === 'custom' && !body) return NextResponse.json({ ok:false, error:'body required' }, { status:400 });
    const now = new Date();
    const doc = { siteId, to, subject, body, mode, templateKey: templateKey || null, marketing, createdAt: now, updatedAt: now };
    if (id) {
      await adminDb.collection('emailDrafts').doc(id).set({ ...doc, createdAt: undefined, updatedAt: now }, { merge: true });
      return NextResponse.json({ ok:true, id });
    } else {
      const ref = await adminDb.collection('emailDrafts').add(doc);
      return NextResponse.json({ ok:true, id: ref.id });
    }
  } catch (e) {
    console.error('drafts POST error', e);
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}

// DELETE body: { id }
export async function DELETE(req) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok:false, error:'id required' }, { status:400 });
    await adminDb.collection('emailDrafts').doc(id).delete();
    return NextResponse.json({ ok:true });
  } catch (e) {
    console.error('drafts DELETE error', e);
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}
