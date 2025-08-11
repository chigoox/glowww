import admin from 'firebase-admin';

// Initialize Admin SDK once, with safe fallbacks for local/dev
if (!admin.apps?.length) {
  const hasCert = !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
  try {
    // Option 1: Base64-encoded service account JSON
    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      const json = JSON.parse(decoded);
      admin.initializeApp({
        credential: admin.credential.cert(json),
      });
    // Option 2: Individual env vars (PEM in FIREBASE_PRIVATE_KEY)
    } else if (hasCert) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
      });
    // Option 3: ADC via GOOGLE_APPLICATION_CREDENTIALS
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
    }
  } catch (e) {
    // Intentionally swallow to avoid crashing import in dev; callers should check for null exports
  }
}

let adminDb = null;
let adminAuth = null;
try {
  if (admin.apps?.length) {
    adminDb = admin.firestore();
    adminAuth = admin.auth();
  }
} catch {}

export { adminDb, adminAuth };
