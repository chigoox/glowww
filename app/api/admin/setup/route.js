import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebaseAdmin';

export async function POST(request) {
  try {
    // Development-only endpoint for setting up admin users
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'This endpoint is only available in development' }, { status: 403 });
    }

    const { userEmail } = await request.json();
    
    if (!userEmail) {
      return NextResponse.json({ error: 'userEmail is required' }, { status: 400 });
    }

    console.log(`🔧 Setting up admin for user: ${userEmail}`);

    // Find user by email in Firestore
    const usersRef = adminDb.collection('users');
    const query = usersRef.where('email', '==', userEmail);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return NextResponse.json({ error: `No user found with email: ${userEmail}` }, { status: 404 });
    }

    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    console.log(`📄 Found user: ${userData.username || userData.email} (ID: ${userId})`);

    // Update user document with admin tier
    await userDoc.ref.update({
      tier: 'admin',
      subscriptionTier: 'admin', // Also set subscriptionTier for compatibility
      adminUpgradeDate: new Date(),
      adminUpgradedBy: 'dev-setup'
    });

    console.log('✅ Updated Firestore document with admin tier');

    // Set custom claims for Firebase Auth
    let claimsSet = false;
    try {
      await adminAuth.setCustomUserClaims(userId, {
        admin: true,
        tier: 'admin',
        platformAdmin: true
      });
      claimsSet = true;
      console.log('✅ Successfully set custom claims');
    } catch (claimsError) {
      console.error('❌ Failed to set custom claims:', claimsError.message);
    }

    return NextResponse.json({
      ok: true,
      message: `Successfully upgraded ${userEmail} to admin`,
      details: {
        userId,
        firestoreUpdated: true,
        customClaimsSet: claimsSet,
        userData: {
          email: userData.email,
          username: userData.username,
          tier: 'admin'
        }
      }
    });

  } catch (error) {
    console.error('Error setting up admin user:', error);
    return NextResponse.json({ 
      error: 'Failed to set up admin user',
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    // Development-only endpoint for listing users
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'This endpoint is only available in development' }, { status: 403 });
    }

    console.log('📋 Listing all users...');

    // Get users from Firestore
    const usersSnapshot = await adminDb.collection('users').limit(50).get();
    const users = [];

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        email: data.email,
        username: data.username,
        tier: data.tier || 'free',
        subscriptionTier: data.subscriptionTier,
        displayName: data.displayName || data.fullName,
        createdAt: data.createdAt
      });
    });

    // Get auth users with custom claims
    const authUsers = [];
    try {
      const listUsersResult = await adminAuth.listUsers(50);
      listUsersResult.users.forEach(userRecord => {
        authUsers.push({
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          customClaims: userRecord.customClaims || {}
        });
      });
    } catch (authError) {
      console.error('Error fetching auth users:', authError);
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
    console.error('Error listing users:', error);
    return NextResponse.json({ 
      error: 'Failed to list users',
      details: error.message 
    }, { status: 500 });
  }
}
