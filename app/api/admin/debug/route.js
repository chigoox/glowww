import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';

export async function GET(request) {
  try {
    // Check if Firebase Admin is properly configured
    if (!adminDb || !adminAuth) {
      return NextResponse.json({
        error: 'Firebase Admin not configured',
        details: {
          hasAdminDb: !!adminDb,
          hasAdminAuth: !!adminAuth,
          envVars: {
            hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
            hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
            hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
            hasServiceAccountBase64: !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
            hasGoogleAppCreds: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
          }
        }
      }, { status: 500 });
    }

    // List all users from Firestore
    console.log('🔍 Fetching users from Firestore...');
    const usersSnapshot = await adminDb.collection('users').limit(20).get();
    const users = [];

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        email: data.email,
        username: data.username,
        tier: data.tier || 'free',
        subscriptionTier: data.subscriptionTier,
        isAdmin: data.isAdmin,
        displayName: data.displayName || data.fullName,
        customClaims: data.customClaims
      });
    });

    console.log(`📊 Found ${users.length} users in Firestore`);

    // Also try to get Firebase Auth users with custom claims
    const authUsers = [];
    try {
      const listUsersResult = await adminAuth.listUsers(20);
      listUsersResult.users.forEach(userRecord => {
        authUsers.push({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          customClaims: userRecord.customClaims || {},
          disabled: userRecord.disabled
        });
      });
      console.log(`🔐 Found ${authUsers.length} users in Firebase Auth`);
    } catch (authError) {
      console.error('Error fetching Firebase Auth users:', authError);
    }

    return NextResponse.json({
      ok: true,
      firestoreUsers: users,
      authUsers: authUsers,
      counts: {
        firestore: users.length,
        auth: authUsers.length,
        admins: users.filter(u => u.tier === 'admin' || u.subscriptionTier === 'admin').length
      }
    });

  } catch (error) {
    console.error('Error in debug API:', error);
    return NextResponse.json({
      error: 'Failed to fetch debug data',
      details: error.message
    }, { status: 500 });
  }
}
