import { NextResponse } from 'next/server';
import { resolveBranding } from '@/lib/email/branding';
import { sendPostmarkEmail, resolveServerToken } from '@/lib/email/provider/postmark';
import { createUnsubToken } from '@/lib/email/suppression';
import { checkWarmupCap } from '@/lib/email/warmup';
import { checkSendQuota, recordSendAttempt } from '@/lib/email/quotas';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST { to, siteId, tenantId, userId, subject, html, text, marketing:boolean }
export async function POST(req) {
  try {
    const { to, siteId, tenantId=null, userId=null, subject, html, text, marketing=false } = await req.json();
    if (!to || !subject || !html) return NextResponse.json({ ok:false, error:'to, subject, html required' }, { status:400 });
    
    // Check send quota if userId provided
    if (userId) {
      const quotaCheck = await checkSendQuota(userId, false, false);
      if (!quotaCheck.allowed) {
        return NextResponse.json({ ok:false, error:`Daily send quota exceeded (${quotaCheck.usage}/${quotaCheck.limit} for ${quotaCheck.tier} tier)` }, { status:429 });
      }
    }
    
    const branding = await resolveBranding({ siteId });
    const host = (()=>{ try { return new URL(branding.siteUrl).hostname; } catch { return 'example.com'; } })();
    const from = `no-reply@${host}`;
    const warm = await checkWarmupCap({ domain: host });
    if (!warm.allowed) return NextResponse.json({ ok:false, error:'Warm-up cap exceeded' }, { status:429 });
    const token = resolveServerToken({ category: marketing ? 'marketing' : 'transactional', scope: siteId ? 'site-shared' : 'platform' });
    const headers = { 'X-Custom': 'true' };
    if (marketing) {
      const unsubScope = siteId ? `site:${siteId}` : 'platform-mkt';
      const uToken = createUnsubToken({ email: to, scope: unsubScope });
      const baseUrl = process.env.PLATFORM_BASE_URL || 'https://example.com';
      const unsubUrl = `${baseUrl.replace(/\/$/, '')}/api/email/unsubscribe?token=${uToken}`;
      headers['List-Unsubscribe'] = `<${unsubUrl}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }
    const wrappedHtml = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;padding:16px;background:#fafafa;color:#222"><h2 style="margin-top:0;font-weight:600">${escapeHtml(subject)}</h2><div>${html}</div><hr style="margin:32px 0"/><div style="font-size:12px;color:#666">Sent by ${branding.brandName}. ${marketing ? 'You can unsubscribe via the link in this email.' : ''}</div></body></html>`;
    const idem = req.headers.get('idempotency-key');
    if (idem && adminDb) {
      const idemRef = adminDb.collection('emailIdempotency').doc(idem);
      const snap = await idemRef.get();
      if (snap.exists) {
        const v = snap.data();
        return NextResponse.json({ ok:true, reused:true, providerMessageId: v.providerMessageId });
      }
    }
    const sendRes = await sendPostmarkEmail({ token, from, to, subject, html: wrappedHtml, text: text || stripHtml(html), headers });
    // log
    try {
      if (adminDb) {
        await adminDb.collection('emailMessages').add({
          createdAt: new Date(),
          userId, tenantId, siteId, to, from, subject,
          templateKey: marketing ? 'custom.marketing' : 'custom',
          category: marketing ? 'marketing' : 'transactional',
          status: sendRes.error ? 'bounced' : 'sent',
          provider: 'postmark',
          providerMessageId: sendRes.providerMessageId || null,
          data: { custom: true, marketing }
        });
        
        // Record send attempt for quota tracking
        if (userId) {
          await recordSendAttempt(userId, siteId, false, false);
        }
        
        if (idem && !sendRes.error) {
          try { await adminDb.collection('emailIdempotency').doc(idem).set({ createdAt:new Date(), providerMessageId: sendRes.providerMessageId, to, subject, custom:true }); } catch {}
        }
      }
    } catch (e) { console.error('custom-send log error', e); }
    if (sendRes.error) return NextResponse.json({ ok:false, error: sendRes.error });
    return NextResponse.json({ ok:true, providerMessageId: sendRes.providerMessageId });
  } catch (e) {
    console.error('custom-send error', e);
    return NextResponse.json({ ok:false, error: e.message }, { status:500 });
  }
}

function stripHtml(h){ return h.replace(/<[^>]+>/g,' '); }
function escapeHtml(s){ return s.replace(/[&<>]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c])); }
