import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/send';
import { adminDb } from '@/lib/firebaseAdmin';
import { resolveBranding } from '@/lib/email/branding';
import { sendPostmarkEmail, resolveServerToken } from '@/lib/email/provider/postmark';
import { createUnsubToken } from '@/lib/email/suppression';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/email/test-send
// Body (template mode): { mode:'template', templateKey, siteId, data?, subjectOverride? }
// Body (custom mode): { mode:'custom', siteId, subject, html, text? }
// Requires header: x-test-recipient (email of requester)
// Marks message with test:true and adds X-Test-Send header. Suppression + warmup still enforced except we bypass suppression (so user can always preview).
export async function POST(req) {
  try {
    const testRecipient = req.headers.get('x-test-recipient');
    if (!testRecipient) {
      return NextResponse.json({ ok:false, error:'x-test-recipient header required' }, { status:400 });
    }
    const body = await req.json();
    const { mode='template' } = body || {};

    // Idempotency optional
    const idem = req.headers.get('idempotency-key');
    if (idem) {
      const snap = await adminDb.collection('emailIdempotency').doc(idem).get();
      if (snap.exists) {
        const v = snap.data();
        return NextResponse.json({ ok:true, reused:true, messageId:v.messageId, providerMessageId:v.providerMessageId });
      }
    }

    if (mode === 'template') {
      const { templateKey, siteId, data = {}, subjectOverride } = body || {};
      if (!templateKey) return NextResponse.json({ ok:false, error:'templateKey required' }, { status:400 });
      const res = await sendEmail({ to: testRecipient, templateKey, data, siteId, overrideSubject: subjectOverride, isTest: true, headers: { 'X-Test-Send':'true' } });
      if (!res.ok && res.error?.message !== 'suppressed') {
        return NextResponse.json({ ok:false, error: res.error?.message || 'Failed' }, { status:500 });
      }
      if (res.error?.message === 'suppressed') {
        // Bypass suppression for test: try again bypassing suppression by sending custom wrapper
        return await sendBypassSuppressionTemplate({ templateKey, siteId, data, subjectOverride, to:testRecipient });
      }
      if (idem && res.ok) { try { await adminDb.collection('emailIdempotency').doc(idem).set({ createdAt:new Date(), messageId: res.messageId, providerMessageId: res.providerMessageId, test:true }); } catch {} }
      return NextResponse.json({ ok:true, test:true, messageId: res.messageId, providerMessageId: res.providerMessageId });
    }

    if (mode === 'custom') {
      const { siteId, subject, html, text } = body || {};
      if (!subject || !html) return NextResponse.json({ ok:false, error:'subject & html required' }, { status:400 });
      const branding = await resolveBranding({ siteId });
      const host = (()=>{ try { return new URL(branding.siteUrl).hostname; } catch { return 'example.com'; } })();
      const from = `no-reply@${host}`;
      const token = resolveServerToken({ category:'transactional', scope: siteId ? 'site-shared':'platform' });
      const wrappedHtml = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:16px;background:#fafafa;color:#222"><h2 style=\"margin-top:0;font-weight:600\">${escapeHtml(subject)}</h2><div>${html}</div><hr style=\"margin:32px 0\"/><div style=\"font-size:12px;color:#666\">Test preview email — not sent to end users.</div></body></html>`;
      const sendRes = await sendPostmarkEmail({ token, from, to:testRecipient, subject, html: wrappedHtml, text: text || stripHtml(html), headers: { 'X-Test-Send':'true' } });
      if (sendRes.error) return NextResponse.json({ ok:false, error: sendRes.error });
      try {
        await adminDb.collection('emailMessages').add({ createdAt:new Date(), siteId, to:testRecipient, from, subject, templateKey:'custom.test', category:'transactional', status:'sent', provider:'postmark', providerMessageId: sendRes.providerMessageId, test:true, data:{ custom:true, test:true } });
      } catch {}
      if (idem) { try { await adminDb.collection('emailIdempotency').doc(idem).set({ createdAt:new Date(), providerMessageId: sendRes.providerMessageId, test:true }); } catch {} }
      return NextResponse.json({ ok:true, test:true, providerMessageId: sendRes.providerMessageId });
    }

    return NextResponse.json({ ok:false, error:'Unknown mode' }, { status:400 });
  } catch (e) {
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}

async function sendBypassSuppressionTemplate({ templateKey, siteId, data, subjectOverride, to }) {
  // Minimal fallback: mimic sendEmail rendering path without suppression check by re-importing pieces
  try {
    const { getTemplateDefinition, assertTemplateData } = await import('@/lib/email/registry');
    const { resolveBranding } = await import('@/lib/email/branding');
    const { renderEmail } = await import('@/lib/email/render');
    const def = getTemplateDefinition(templateKey);
    if (!def) return NextResponse.json({ ok:false, error:'Unknown templateKey' }, { status:400 });
    assertTemplateData(def, data || {});
    const branding = await resolveBranding({ siteId });
    const host = (()=>{ try { return new URL(branding.siteUrl).hostname; } catch { return 'example.com'; } })();
    const from = `no-reply@${host}`;
    let subject;
    try { subject = subjectOverride || def.subject(data || {}, branding); } catch (e) { subject = `[SUBJECT ERROR] ${templateKey}`; }
    const { html, text } = await renderEmail(def.component, { branding, data: data || {}, to });
    const token = resolveServerToken({ category: def.category, scope: siteId ? 'site-shared':'platform' });
    const sendRes = await sendPostmarkEmail({ token, from, to, subject, html, text, headers: { 'X-Test-Send':'true', 'X-Template': templateKey } });
    if (sendRes.error) return NextResponse.json({ ok:false, error: sendRes.error });
    try { await adminDb.collection('emailMessages').add({ createdAt:new Date(), siteId, to, from, subject, templateKey, category:def.category, status:'sent', provider:'postmark', providerMessageId: sendRes.providerMessageId, test:true, data }); } catch {}
    return NextResponse.json({ ok:true, test:true, providerMessageId: sendRes.providerMessageId });
  } catch (e) {
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}

function stripHtml(h=''){ return h.replace(/<[^>]+>/g,' '); }
function escapeHtml(s=''){ return s.replace(/[&<>]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c])); }