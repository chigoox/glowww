// Migration: populate top-level `domains` collection for published sites with subdomain
// Usage: node scripts/publish_subdomains.js

const { adminDb } = require('../lib/firebaseAdmin');
const admin = require('firebase-admin');

async function main() {
  if (!adminDb) {
    console.error('Admin SDK not initialized. Set FIREBASE_SERVICE_ACCOUNT_BASE64 or GOOGLE_APPLICATION_CREDENTIALS.');
    process.exit(1);
  }

  const usersSnap = await adminDb.collection('users').get();
  console.log('Users found:', usersSnap.size);
  let created = 0;
  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const sitesRef = adminDb.collection('users').doc(userId).collection('sites');
    const sitesSnap = await sitesRef.get();
    for (const s of sitesSnap.docs) {
      const data = s.data();
      const sub = (data.subdomain || '').toString().trim().toLowerCase();
      const published = !!data.isPublished;
      if (!sub || !published) continue;
      const domainKey = sub + '.gloweditor.com';
      const domainDocRef = adminDb.collection('domains').doc(domainKey);
      const existing = await domainDocRef.get();
      if (existing.exists) continue;
      try {
        await domainDocRef.set({
          domain: domainKey,
          userId,
          siteId: s.id,
          username: userDoc.data().username || '',
          site: sub,
          status: 'active',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        created++;
        console.log('Created mapping for', domainKey);
      } catch (e) {
        console.warn('Failed to create mapping for', domainKey, e.message || e);
      }
    }
  }
  console.log('Done. Created mappings:', created);
}

main().catch(e=>{ console.error(e); process.exit(1); });
