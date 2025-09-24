/**
 * Quick fix API for admin subscription tier
 * Call this endpoint to fix admin subscription data
 */

import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { requireAuth } from '../../../lib/apiAuth';

export async function POST(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'No authentication token provided. Please log in and try again.',
        instructions: 'This endpoint requires authentication. Make sure you are logged in.'
      }, { status: 401 });
    }

    // Verify authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    const userId = authResult.user.uid;
    const userEmail = authResult.user.email;

    // Get current user data
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User document not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    
    console.log('🔧 Admin Fix API - Current user data:', {
      email: userEmail,
      tier: userData.tier,
      subscriptionTier: userData.subscriptionTier,
      subscription: userData.subscription
    });

    // Check if user needs admin subscription fix
    if (userData.tier === 'admin') {
      const updateData = {
        subscriptionTier: 'admin',
        'usage.sitesCount': -1,
        'usage.lastUpdated': serverTimestamp(),
        adminFixApplied: serverTimestamp()
      };

      // Initialize usage if it doesn't exist
      if (!userData.usage) {
        updateData.usage = {
          storageUsed: 0,
          imageCount: 0,
          videoCount: 0,
          sitesCount: -1,
          lastUpdated: serverTimestamp()
        };
      }

      await updateDoc(userRef, updateData);

      console.log('✅ Admin subscription tier fixed for:', userEmail);

      return NextResponse.json({
        success: true,
        message: 'Admin subscription tier fixed successfully!',
        userEmail,
        before: {
          tier: userData.tier,
          subscriptionTier: userData.subscriptionTier
        },
        after: {
          tier: 'admin',
          subscriptionTier: 'admin'
        },
        instructions: 'Please refresh the page to see the changes.'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'User is not marked as admin in Firebase',
        userEmail,
        currentTier: userData.tier,
        subscriptionTier: userData.subscriptionTier,
        instructions: 'Contact support if you should have admin access.'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Admin fix API error:', error);
    return NextResponse.json({
      error: 'Failed to fix admin subscription',
      details: error.message,
      instructions: 'Check server logs for more details.'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Admin Subscription Fix API',
    usage: 'POST to this endpoint while logged in as admin to fix subscription tier',
    authentication: 'Requires Bearer token in Authorization header'
  });
}