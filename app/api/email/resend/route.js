import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/email/send';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { messageId }
export async function POST(req) {
  try {
    const { messageId } = await req.json();
    if (!messageId) return NextResponse.json({ ok:false, error:'messageId required' }, { status:400 });
    if (!adminDb) return NextResponse.json({ ok:false, error:'Firestore not ready' }, { status:500 });
    const doc = await adminDb.collection('emailMessages').doc(messageId).get();
    if (!doc.exists) return NextResponse.json({ ok:false, error:'Not found' }, { status:404 });
    const data = doc.data();
    if (!data.templateKey) return NextResponse.json({ ok:false, error:'Original not template-based' }, { status:400 });
    const resend = await sendEmail({
      to: data.to,
      templateKey: data.templateKey,
      data: data.data || {},
      tenantId: data.tenantId || null,
      siteId: data.siteId || null,
      overrideSubject: data.subject
    });
    return NextResponse.json(resend);
  } catch (e) {
    console.error('resend error', e);
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}
