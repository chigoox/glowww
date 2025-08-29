import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/send';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/email/send
// Body: { to, templateKey, data, tenantId?, siteId?, replyTo?, overrideSubject? }
// NOTE: Phase 1: no auth implemented. Add authentication/authorization before exposing.
export async function POST(req) {
  try {
    // Minimal authentication: if EMAIL_INTERNAL_API_KEY is set, require matching header
    const requiredKey = process.env.EMAIL_INTERNAL_API_KEY;
    if (requiredKey) {
      const provided = req.headers.get('x-email-internal-key');
      if (provided !== requiredKey) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await req.json();
    const { to, templateKey, data, tenantId, siteId, userId, replyTo, overrideSubject } = body || {};

    if (!to || !templateKey) {
      return NextResponse.json({ ok: false, error: 'Missing to or templateKey' }, { status: 400 });
    }

    // Basic production guard suggestion
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_OPEN_EMAIL_SEND_ENDPOINT) {
      return NextResponse.json({ ok: false, error: 'Endpoint disabled in production' }, { status: 403 });
    }

    const idem = req.headers.get('idempotency-key');
    if (idem && adminDb) {
      const idemRef = adminDb.collection('emailIdempotency').doc(idem);
      const existing = await idemRef.get();
      if (existing.exists) {
        const v = existing.data();
        return NextResponse.json({ ok:true, reused:true, messageId: v.messageId, providerMessageId: v.providerMessageId });
      }
    }
    const result = await sendEmail({ to, templateKey, data, tenantId, siteId, userId, replyTo, overrideSubject });
    if (idem && result?.ok) {
      try { await adminDb.collection('emailIdempotency').doc(idem).set({ createdAt:new Date(), messageId: result.messageId, providerMessageId: result.providerMessageId, to, templateKey }); } catch {}
    }
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error?.message || 'Send failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, messageId: result.messageId, providerMessageId: result.providerMessageId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'Unexpected error' }, { status: 500 });
  }
}
