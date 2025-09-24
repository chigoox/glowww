/**
 * Debug API to check and fix admin user subscription data
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/apiAuth';
import { getUserSubscription, SUBSCRIPTION_TIERS } from '../../../lib/subscriptions';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export async function GET(request) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    const userId = authResult.user.uid;

    // Get raw user data from Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const rawUserData = userDoc.data();

    // Get processed subscription data
    const subscription = await getUserSubscription(userId);

    return NextResponse.json({
      success: true,
      userId,
      userEmail: authResult.user.email,
      rawUserData: {
        tier: rawUserData?.tier,
        subscriptionTier: rawUserData?.subscriptionTier,
        subscription: rawUserData?.subscription,
        usage: rawUserData?.usage
      },
      processedSubscription: subscription,
      checks: {
        hasAIAccess: subscription.tier !== SUBSCRIPTION_TIERS.FREE,
        isAdmin: subscription.tier === SUBSCRIPTION_TIERS.ADMIN,
        tierMismatch: rawUserData?.tier !== rawUserData?.subscriptionTier
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      error: 'Failed to debug user data',
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    const userId = authResult.user.uid;
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user has tier: 'admin' but missing subscriptionTier: 'admin', fix it
    if (userData.tier === 'admin' && userData.subscriptionTier !== 'admin') {
      const updateData = {
        subscriptionTier: 'admin',
        'usage.sitesCount': -1
      };

      await updateDoc(userRef, updateData);

      return NextResponse.json({
        success: true,
        message: 'Admin subscription tier fixed',
        updated: updateData,
        before: {
          tier: userData.tier,
          subscriptionTier: userData.subscriptionTier
        },
        after: {
          tier: userData.tier,
          subscriptionTier: 'admin'
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'No fixes needed',
      currentData: {
        tier: userData.tier,
        subscriptionTier: userData.subscriptionTier
      }
    });

  } catch (error) {
    console.error('Fix API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fix user data',
      details: error.message 
    }, { status: 500 });
  }
}