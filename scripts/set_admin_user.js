const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  const hasCert = !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );

  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    const json = JSON.parse(decoded);
    admin.initializeApp({
      credential: admin.credential.cert(json),
    });
  } else if (hasCert) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } else {
    console.error('No Firebase credentials found. Please set up Firebase Admin credentials.');
    process.exit(1);
  }
}

const db = admin.firestore();

async function setUserAsAdmin(userEmail) {
  try {
    // Find user by email
    const usersRef = db.collection('users');
    const query = usersRef.where('email', '==', userEmail);
    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log(`No user found with email: ${userEmail}`);
      return;
    }

    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log(`Found user: ${userData.username || userData.email}`);

    // Update user document with admin tier
    await userDoc.ref.update({
      tier: 'admin',
      subscriptionTier: 'admin', // Also set subscriptionTier for compatibility
      adminUpgradeDate: admin.firestore.FieldValue.serverTimestamp(),
      adminUpgradedBy: 'script'
    });

    // Set custom claims for Firebase Auth
    try {
      await admin.auth().setCustomUserClaims(userId, {
        admin: true,
        tier: 'admin',
        platformAdmin: true
      });
      console.log(`✅ Successfully set custom claims for user ${userEmail}`);
    } catch (claimsError) {
      console.log(`⚠️ Updated Firestore but failed to set custom claims: ${claimsError.message}`);
    }

    console.log(`✅ Successfully upgraded user ${userEmail} to admin tier`);

  } catch (error) {
    console.error('Error setting user as admin:', error);
  }
}

async function listAllUsers() {
  try {
    console.log('📋 Listing all users in Firestore:');
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('No users found in Firestore.');
      return;
    }

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.email || 'No email'} (${data.username || 'No username'}) - Tier: ${data.tier || 'free'} - ID: ${doc.id}`);
    });

    console.log(`\nTotal users: ${usersSnapshot.size}`);
  } catch (error) {
    console.error('Error listing users:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 No email provided, listing all users...\n');
    await listAllUsers();
    console.log('\n🔧 To set a user as admin, run:');
    console.log('node scripts/set_admin_user.js user@example.com');
    return;
  }

  const userEmail = args[0];
  console.log(`🔧 Setting user ${userEmail} as admin...\n`);
  await setUserAsAdmin(userEmail);
}

main().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
