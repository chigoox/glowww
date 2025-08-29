import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { verifyPostmarkSignature } from '@/lib/email/webhookAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/email/events
// Postmark webhooks (single event payload). Configure in Postmark dashboard.
// Optional security: set POSTMARK_WEBHOOK_SECRET and require header X-Postmark-Webhook-Secret

async function autoSuppressEmail(email, reason, messageData) {
  if (!email || !adminDb) return;
  try {
    // Determine scope based on message context
    const scope = messageData?.siteId ? `site:${messageData.siteId}` : 'platform-mkt';
    
    // Check if already suppressed to avoid duplicates
    const existing = await adminDb.collection('emailSuppression')
      .where('email', '==', email.toLowerCase())
      .where('scope', '==', scope)
      .limit(1)
      .get();
    
    if (!existing.empty) {
      console.log(`Email ${email} already suppressed for scope ${scope}`);
      return;
    }
    
    // Create suppression entry
    await adminDb.collection('emailSuppression').add({
      email: email.toLowerCase(),
      scope,
      reason,
      createdAt: new Date(),
      automated: true,
      source: 'postmark_webhook'
    });
    
    console.log(`Auto-suppressed ${email} (${reason}) for scope ${scope}`);
  } catch (e) {
    console.error('Auto-suppression failed:', e);
  }
}

async function findMessagesByProviderId(providerMessageId) {
  const db = adminDb;
  if (!db) return [];
  try {
    const snap = await db.collection('emailMessages').where('providerMessageId', '==', providerMessageId).get();
    const docs = [];
    snap.forEach(d => docs.push({ id: d.id, data: d.data() }));
    return docs;
  } catch (e) {
    console.error('findMessagesByProviderId error', e);
    return [];
  }
}

async function updateMessages(ids, patch) {
  const db = adminDb;
  if (!db) return;
  const batch = db.batch();
  ids.forEach(id => {
    batch.set(db.collection('emailMessages').doc(id), patch, { merge: true });
  });
  try {
    await batch.commit();
  } catch (e) {
    console.error('updateMessages error', e);
  }
}

export async function POST(req) {
  try {
    // Get raw body for signature verification
    const body = await req.text();
    const payload = JSON.parse(body);
    
    // Verify webhook signature if secret is configured
    const secret = process.env.POSTMARK_WEBHOOK_SECRET;
    if (secret) {
      const signature = req.headers.get('x-postmark-webhook-secret');
      if (!verifyPostmarkSignature(body, signature, secret)) {
        console.warn('Postmark webhook signature verification failed');
        return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
      }
    }

    const recordType = payload.RecordType;
    const messageId = payload.MessageID;

    if (!recordType || !messageId) {
      return NextResponse.json({ ok: false, error: 'Missing RecordType or MessageID' }, { status: 400 });
    }

    const matches = await findMessagesByProviderId(messageId);
    if (!matches.length) {
      // Not found yet (possible race); accept anyway
      return NextResponse.json({ ok: true, note: 'Message not found' });
    }

    const now = new Date();
    let patch = { lastEventAt: now };

    switch (recordType) {
      case 'Bounce': {
        const bounceType = payload.Type; // HardBounce, SoftBounce, etc.
        const email = payload.Email;
        patch.status = 'bounced';
        patch.bounceType = bounceType;
        patch.bounceDescription = payload.Description;
        
        // Auto-suppress for hard bounces and certain soft bounces
        if (email && (bounceType === 'HardBounce' || bounceType === 'SpamNotification' || bounceType === 'ManuallyDeactivated')) {
          const messageData = matches[0]?.data;
          await autoSuppressEmail(email, `bounce_${bounceType.toLowerCase()}`, messageData);
        }
        break;
      }
      case 'SpamComplaint': {
        const email = payload.Email;
        patch.status = 'complaint';
        patch.complaint = { receivedAt: now };
        
        // Auto-suppress all spam complaints
        if (email) {
          const messageData = matches[0]?.data;
          await autoSuppressEmail(email, 'complaint', messageData);
        }
        break;
      }
      case 'Delivery': {
        patch.status = 'delivered';
        patch.deliveredAt = now;
        break;
      }
      case 'Open': {
        // Keep first open timestamp
        matches.forEach(m => {
          if (!m.data.openedAt) {
            // mark first open separately per doc
          }
        });
        patch.openedAt = matches[0].data.openedAt || now; // preserve existing
        patch.opensCount = (matches[0].data.opensCount || 0) + 1;
        break;
      }
      case 'Click': {
        patch.clicksCount = (matches[0].data.clicksCount || 0) + 1;
        if (!matches[0].data.openedAt) patch.openedAt = now; // infer open
        break;
      }
      default: {
        patch.unhandledRecordType = recordType;
      }
    }

    await updateMessages(matches.map(m => m.id), patch);
    return NextResponse.json({ ok: true, updated: matches.length, recordType });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'Handler error' }, { status: 500 });
  }
}
