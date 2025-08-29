import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/email/send';
import { resolveBranding } from '@/lib/email/branding';
import { sendPostmarkEmail, resolveServerToken } from '@/lib/email/provider/postmark';
import { createUnsubToken } from '@/lib/email/suppression';
import { checkWarmupCap } from '@/lib/email/warmup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { id } -> send draft then delete it
export async function POST(req) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok:false, error:'id required' }, { status:400 });
    const ref = adminDb.collection('emailDrafts').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ ok:false, error:'Draft not found' }, { status:404 });
    const draft = snap.data();
    const { siteId, to, subject, body, mode, templateKey, marketing } = draft;
    if (!to) return NextResponse.json({ ok:false, error:'Draft missing recipient' }, { status:400 });
    if (mode === 'template') {
      // for now we send with empty data object
      const result = await sendEmail({ to, templateKey, data:{}, siteId, overrideSubject: subject });
      if (!result.ok) return NextResponse.json(result, { status:400 });
    } else {
      const branding = await resolveBranding({ siteId });
      const host = (()=>{ try { return new URL(branding.siteUrl).hostname; } catch { return 'example.com'; } })();
      const from = `no-reply@${host}`;
      const warm = await checkWarmupCap({ domain: host });
      if (!warm.allowed) return NextResponse.json({ ok:false, error:'Warm-up cap exceeded' }, { status:429 });
      const token = resolveServerToken({ category: marketing ? 'marketing' : 'transactional', scope: siteId ? 'site-shared' : 'platform' });
      const headers = {};
      if (marketing) {
        const unsubScope = siteId ? `site:${siteId}` : 'platform-mkt';
        const uToken = createUnsubToken({ email: to, scope: unsubScope });
        const baseUrl = process.env.PLATFORM_BASE_URL || 'https://example.com';
        const unsubUrl = `${baseUrl.replace(/\/$/, '')}/api/email/unsubscribe?token=${uToken}`;
        headers['List-Unsubscribe'] = `<${unsubUrl}>`;
        headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
      }
      const wrappedHtml = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:16px;background:#fafafa;color:#222"><h2 style="margin-top:0;font-weight:600">${escapeHtml(subject)}</h2><div>${body}</div><hr style="margin:32px 0"/><div style="font-size:12px;color:#666">Sent by ${branding.brandName}. ${marketing ? 'You can unsubscribe via the link in this email.' : ''}</div></body></html>`;
      const sendRes = await sendPostmarkEmail({ token, from, to, subject, html: wrappedHtml, text: stripHtml(body), headers });
      if (sendRes.error) return NextResponse.json({ ok:false, error: sendRes.error }, { status:400 });
      // log manually (custom send) - reuse pattern from custom-send route
      try {
        await adminDb.collection('emailMessages').add({
          createdAt: new Date(),
          tenantId: null, siteId, to, from, subject,
          templateKey: marketing ? 'custom.marketing' : 'custom',
          category: marketing ? 'marketing' : 'transactional',
            status: 'sent', provider: 'postmark',
          providerMessageId: sendRes.providerMessageId || null,
          data: { custom: true, marketing, draftId: id }
        });
      } catch (e) { console.error('draft custom send log error', e); }
    }
    // delete draft after send
    await ref.delete();
    return NextResponse.json({ ok:true });
  } catch (e) {
    console.error('draft send error', e);
    return NextResponse.json({ ok:false, error:e.message }, { status:500 });
  }
}

function stripHtml(h){ return h.replace(/<[^>]+>/g,' '); }
function escapeHtml(s){ return s.replace(/[&<>]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c])); }
