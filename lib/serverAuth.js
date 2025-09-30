/**
 * Server-only authentication utilities
 * These functions should only be used in API routes, middleware, and server components
 */

import { doc, getDoc } from './firestoreDebug';
import { db } from './firebase';

// Verify authentication header (server-only)
export const verifyAuth = async (request) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'No valid authorization header',
        user: null
      };
    }

    const token = authHeader.split(' ')[1];
    
    // Import Firebase Admin here to avoid bundling issues
    const { auth: adminAuth } = await import('./firebaseAdmin');
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    return {
      success: true,
      user: decodedToken,
      uid: decodedToken.uid
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      user: null
    };
  }
};

// Check if user is admin (server-only)
export const isAdmin = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.subscriptionTier === 'admin' || userData.isAdmin === true;
    }
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Verify ID token directly (server-only)
export const verifyIdToken = async (token) => {
  try {
    // Import Firebase Admin here to avoid bundling issues
    const { auth: adminAuth } = await import('./firebaseAdmin');
    const decodedToken = await adminAuth.verifyIdToken(token);
    return {
      success: true,
      user: decodedToken,
      uid: decodedToken.uid
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      user: null
    };
  }
};