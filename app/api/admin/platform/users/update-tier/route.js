import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request) {
  try {
    const { userId, newTier } = await request.json();
    
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

    if (!userId || !newTier) {
      return NextResponse.json({ error: 'Missing userId or newTier' }, { status: 400 });
    }

    // Validate tier
    const validTiers = ['free', 'pro', 'business', 'admin'];
    if (!validTiers.includes(newTier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Update user document in Firestore
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      tier: newTier,
      subscriptionTier: newTier, // Update both for compatibility
      'subscription.plan': newTier,
      tierUpdatedAt: new Date(),
      tierUpdatedBy: decodedToken.uid
    });

    // Update Firebase Auth custom claims if admin SDK is available
    if (adminAuth) {
      try {
        const customClaims = {
          tier: newTier,
          subscriptionTier: newTier
        };
        
        // Add admin privileges for admin tier
        if (newTier === 'admin') {
          customClaims.admin = true;
          customClaims.platformAdmin = true;
        }
        
        await adminAuth.setCustomUserClaims(userId, customClaims);
      } catch (claimsError) {
        console.error('Failed to set custom claims:', claimsError);
        // Don't fail the request if claims update fails
      }
    }

    return NextResponse.json({
      ok: true,
      message: `User tier updated to ${newTier}`
    });

  } catch (error) {
    console.error('Error updating user tier:', error);
    return NextResponse.json({ 
      error: 'Failed to update user tier',
      details: error.message 
    }, { status: 500 });
  }
}
