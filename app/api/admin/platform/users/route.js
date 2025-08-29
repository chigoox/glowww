import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const user = await adminAuth.getUser(decodedToken.uid);
    
    // Check if user is admin - check multiple fields
    const hasAdminAccess = user.customClaims?.admin || 
                          user.customClaims?.tier === 'admin' || 
                          user.customClaims?.subscriptionTier === 'admin';
    
    if (!hasAdminAccess) {
      // Also check Firestore user data as fallback
      const userDocRef = collection(db, 'users');
      const userQuery = query(userDocRef, where('uid', '==', decodedToken.uid));
      const userSnapshot = await getDocs(userQuery);
      
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        const hasFirestoreAdmin = userData.tier === 'admin' || 
                                 userData.subscriptionTier === 'admin' || 
                                 userData.subscription?.plan === 'admin';
        if (!hasFirestoreAdmin) {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    // Get all users with enhanced data
    const users = await getAllUsers();

    return NextResponse.json({
      ok: true,
      users
    });

  } catch (error) {
    console.error('Error fetching users data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch users data',
      details: error.message 
    }, { status: 500 });
  }
}

async function getAllUsers() {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc')
    );

    const usersSnapshot = await getDocs(usersQuery);
    const users = [];

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      
      // Get sites count for this user
      let siteCount = 0;
      let totalViews = 0;
      try {
        const userSitesQuery = query(
          collection(db, 'sites'),
          where('username', '==', data.username || data.uid)
        );
        const userSitesSnapshot = await getDocs(userSitesQuery);
        siteCount = userSitesSnapshot.size;

        // Calculate total views across all user sites
        for (const siteDoc of userSitesSnapshot.docs) {
          const siteData = siteDoc.data();
          totalViews += siteData.totalViews || 0;
        }
      } catch (siteError) {
        console.log(`Could not fetch sites for user ${doc.id}:`, siteError.message);
      }

      users.push({
        uid: doc.id,
        username: data.username,
        displayName: data.displayName,
        email: data.email,
        photoURL: data.photoURL,
        tier: data.tier || data.subscriptionTier || data.subscription?.plan || 'free',
        subscriptionTier: data.subscriptionTier, // Include for compatibility
        subscription: data.subscription, // Include full subscription object
        siteCount,
        totalViews,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        lastActiveAt: data.lastActiveAt?.toDate?.()?.toISOString(),
        emailVerified: data.emailVerified || false,
        subscriptionStatus: data.subscriptionStatus || 'active',
        customClaims: data.customClaims || {}
      });
    }

    return users;

  } catch (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }
}
