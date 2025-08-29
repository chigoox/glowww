import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyInboundSignature } from '@/lib/email/webhookAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST: Postmark (or other) inbound webhook normalization.
// Store minimal fields for later inspection.
export async function POST(req) {
  try {
    // Get raw body for signature verification
    const bodyText = await req.text();
    const body = JSON.parse(bodyText);
    
    // Verify webhook signature if secret is configured
    const secret = process.env.INBOUND_WEBHOOK_SECRET;
    if (secret) {
      const signature = req.headers.get('x-inbound-signature');
      if (!verifyInboundSignature(bodyText, signature, secret)) {
        console.warn('Inbound webhook signature verification failed');
        return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    // Fallback: legacy header auth (deprecated but maintained for compatibility)
    const legacySecret = process.env.INBOUND_SECRET;
    if (!secret && legacySecret) {
      const provided = req.headers.get('x-inbound-secret');
      if (provided !== legacySecret) {
        return NextResponse.json({ ok:false, error:'unauthorized' }, { status:401 });
      }
    }
    const doc = {
      receivedAt: new Date(),
      from: body.From || body.from || body.sender || null,
      to: body.To || body.to || null,
      subject: body.Subject || body.subject || '',
      text: body.TextBody || body.text || '',
      html: body.HtmlBody || body.html || '',
      headers: body.Headers || body.headers || [],
      raw: process.env.STORE_INBOUND_RAW ? body : undefined
    };
    await adminDb.collection('emailInbound').add(doc);
    return NextResponse.json({ ok:true });
  } catch (e) {
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}

// GET list recent inbound emails
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit'))||50, 200);
    const snap = await adminDb.collection('emailInbound').orderBy('receivedAt','desc').limit(limit).get();
    const items = snap.docs.map(d=> ({ id:d.id, ...d.data() }));
    return NextResponse.json({ ok:true, items });
  } catch (e) {
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}