// Central email send facade (Phase 1)
// Combines: registry -> branding -> render -> provider -> logging.

import { db } from '../firebaseAdmin';
import { resolveBranding } from './branding';
import { renderEmail } from './render';
import { getTemplateDefinition, assertTemplateData, templateAllowsUnsub } from './registry';
import { sendPostmarkEmail, resolveServerToken } from './provider/postmark';
import { isSuppressed, createUnsubToken } from './suppression';
import { checkWarmupCap } from './warmup';
import { checkSendQuota, recordSendAttempt } from './quotas';

// Basic email shape validation
function assertBasicParams({ to, templateKey }) {
  if (!to) throw new Error('sendEmail: `to` required');
  if (!templateKey) throw new Error('sendEmail: `templateKey` required');
}

// Determine scope and from address for Phase 1 (simplified)
function deriveScopeAndFrom({ audience, branding, tenantId }) {
  if (branding.scope === 'platform') {
    return { scope: 'platform', from: `no-reply@${extractHost(branding.siteUrl)}` };
  }
  // site scope (shared server for now)
  const host = extractHost(branding.siteUrl) || 'notifications.example.com';
  return { scope: 'site-shared', from: `no-reply@${host}` };
}

function extractHost(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch (_) {
    return null;
  }
}

// Deprecated placeholder removed; using warmup checker

// Firestore logging helpers
async function logMessageInit(doc) {
  try {
    const ref = db.collection('emailMessages').doc();
    await ref.set(doc);
    return ref.id;
  } catch (e) {
    console.error('logMessageInit error', e);
    return null;
  }
}

async function updateMessage(id, patch) {
  if (!id) return;
  try {
    await db.collection('emailMessages').doc(id).set(patch, { merge: true });
  } catch (e) {
    console.error('updateMessage error', e);
  }
}

export async function sendEmail({
  to,
  templateKey,
  data = {},
  tenantId = null,
  siteId = null,
  userId = null,
  replyTo,
  overrideSubject,
  headers = {},
  isTest = false,
  isRetry = false
}) {
  assertBasicParams({ to, templateKey });

  // Check send quota if userId provided
  if (userId && !isTest && !isRetry) {
    const quotaCheck = await checkSendQuota(userId, isTest, isRetry);
    if (!quotaCheck.allowed) {
      throw new Error(`Daily send quota exceeded (${quotaCheck.usage}/${quotaCheck.limit} for ${quotaCheck.tier} tier)`);
    }
  }

  const def = getTemplateDefinition(templateKey);
  if (!def) throw new Error(`sendEmail: Unknown templateKey ${templateKey}`);
  assertTemplateData(def, data);

  // Branding resolution
  const branding = await resolveBranding({ siteId });
  const { scope, from } = deriveScopeAndFrom({ audience: def.audience, branding, tenantId });

  // Subject
  let subject;
  try {
    subject = overrideSubject || def.subject(data, branding);
  } catch (e) {
    throw new Error(`sendEmail: subject builder failed for ${templateKey}: ${e.message}`);
  }

  // Combine template props
  const componentProps = { branding, data, to };

  // Render bodies
  const { html, text } = await renderEmail(def.component, componentProps);

  // Warm-up / daily cap (domain-based)
  const fromHost = from.split('@')[1];
  const warmupRes = await checkWarmupCap({ domain: fromHost });
  if (!warmupRes.allowed) {
    throw new Error('sendEmail: domain daily cap exceeded');
  }

  // Suppression (marketing / unsubscribable)
  const unsubScope = templateAllowsUnsub(def)
    ? (tenantId ? `tenant:${tenantId}` : (siteId ? `site:${siteId}` : 'platform-mkt'))
    : null;
  if (unsubScope) {
    const suppressed = await isSuppressed({ email: to, scope: unsubScope });
    if (suppressed) {
      return { ok: false, error: { message: 'suppressed' } };
    }
  }

  // Prepare headers
  const mergedHeaders = {
    'X-Template': templateKey,
    'X-Audience': def.audience,
    ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
    ...(siteId ? { 'X-Site-ID': siteId } : {}),
    ...headers
  };

  // List-Unsubscribe headers if applicable
  if (unsubScope) {
    const token = createUnsubToken({ email: to, scope: unsubScope });
    const baseUrl = process.env.PLATFORM_BASE_URL || 'https://example.com';
    const unsubUrl = `${baseUrl.replace(/\/$/, '')}/api/email/unsubscribe?token=${token}`;
    mergedHeaders['List-Unsubscribe'] = `<${unsubUrl}>`;
    mergedHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  // Log init
  const messageDoc = {
    createdAt: new Date(),
    userId,
    tenantId,
    siteId,
    templateKey,
    category: def.category,
    to,
    from,
    subject,
  data: data || {},
    provider: 'postmark',
    providerMessageId: null,
    status: 'queued',
    lastEventAt: null,
    test: isTest || false
  };
  const messageId = await logMessageInit(messageDoc);

  // Resolve server token
  const token = resolveServerToken({ category: def.category, scope });

  const sendRes = await sendPostmarkEmail({
    token,
    from,
    to,
    subject,
    html,
    text,
    headers: mergedHeaders,
    replyTo: replyTo || branding.supportEmail
  });

  if (sendRes.error) {
    await updateMessage(messageId, {
      status: 'bounced', // treat send failure as bounce-like for now
      error: sendRes.error,
      lastEventAt: new Date()
    });
    return { ok: false, error: sendRes.error };
  }

  await updateMessage(messageId, {
    status: 'sent',
    providerMessageId: sendRes.providerMessageId,
    sentAt: new Date(),
  lastEventAt: new Date(),
  attempts: sendRes.attempts || 1
  });

  // Record send attempt for quota tracking
  if (userId) {
    await recordSendAttempt(userId, siteId, isTest, isRetry);
  }

  return {
    ok: true,
    messageId,
    providerMessageId: sendRes.providerMessageId
  };
}

// Batch helper (simple sequential for Phase 1)
export async function sendBatch(items) {
  const results = [];
  for (const item of items) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await sendEmail(item);
      results.push(res);
    } catch (e) {
      results.push({ ok: false, error: { message: e.message } });
    }
  }
  return results;
}
