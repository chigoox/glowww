/**
 * Admin Authentication Helper
 * Verifies admin access for API routes
 */

import { auth } from '@/lib/firebaseAdmin';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Verify admin access from request headers
 */
export async function verifyAdminAccess(request) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'No authorization token provided',
        status: 401
      };
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      return {
        success: false,
        error: 'Invalid authorization token',
        status: 401
      };
    }

    // Verify the ID token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Token verification failed:', error);
      return {
        success: false,
        error: 'Invalid or expired token',
        status: 401
      };
    }

    const uid = decodedToken.uid;
    
    // Get user data from Firestore
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return {
        success: false,
        error: 'User not found',
        status: 404
      };
    }

    const userData = userDoc.data();
    
    // Check if user has admin privileges
    const isAdmin = (
      userData?.tier === 'admin' ||
      userData?.subscriptionTier === 'admin' ||
      userData?.subscription?.plan === 'admin' ||
      decodedToken.admin ||
      decodedToken.platformAdmin ||
      userData?.isAdmin ||
      // For development - remove in production
      (process.env.NODE_ENV === 'development' && userData?.email?.includes('admin'))
    );

    if (!isAdmin) {
      return {
        success: false,
        error: 'Insufficient permissions - admin access required',
        status: 403
      };
    }

    return {
      success: true,
      user: {
        uid,
        email: decodedToken.email,
        ...userData
      }
    };

  } catch (error) {
    console.error('Admin access verification failed:', error);
    return {
      success: false,
      error: 'Internal server error during authentication',
      status: 500
    };
  }
}