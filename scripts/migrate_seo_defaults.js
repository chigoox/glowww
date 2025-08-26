#!/usr/bin/env node
/**
 * Backfill SEO defaults for existing site documents.
 * Usage: node scripts/migrate_seo_defaults.js
 */
import { adminDb } from '../lib/firebaseAdmin.js';

if (!adminDb) {
  console.error('Firebase Admin not initialized. Set FIREBASE_* env vars.');
  process.exit(1);
}

const batchSize = 300;

function sanitize(str, max) { return (str||'').toString().trim().slice(0, max); }

async function run() {
  console.log('Starting SEO migration...');
  const usersSnap = await adminDb.collection('users').get();
  let updated = 0;
  for (const userDoc of usersSnap.docs) {
    const sitesRef = userDoc.ref.collection('sites');
    const sitesSnap = await sitesRef.get();
    const writes = [];
    for (const s of sitesSnap.docs) {
      const d = s.data() || {};
      const need = (
        d.seoTitle === undefined ||
        d.seoDescription === undefined ||
        d.seoIndex === undefined
      );
      if (!need) continue;
      const payload = {
        seoTitle: sanitize(d.seoTitle || d.name, 70),
        seoDescription: sanitize(d.seoDescription || d.description, 170),
        seoKeywords: Array.isArray(d.seoKeywords) ? d.seoKeywords : [],
        seoIndex: d.seoIndex !== false,
        seoTwitterCard: d.seoTwitterCard || 'summary_large_image',
        seoUpdatedAt: new Date()
      };
      writes.push({ ref: s.ref, data: payload });
      if (writes.length === batchSize) {
        const batch = adminDb.batch();
        writes.splice(0).forEach(w => batch.update(w.ref, w.data));
        await batch.commit();
        updated += batchSize;
        console.log('Committed batch. Total updated:', updated);
      }
    }
    if (writes.length) {
      const batch = adminDb.batch();
      writes.forEach(w => batch.update(w.ref, w.data));
      await batch.commit();
      updated += writes.length;
      console.log('Committed final batch for user', userDoc.id, 'size', writes.length);
    }
  }
  console.log('Migration complete. Total sites updated:', updated);
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
