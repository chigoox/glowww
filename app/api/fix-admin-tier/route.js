import { NextResponse } from 'next/server';
import { verifyIdToken } from '../../../lib/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export async function POST(request) {
  try {
    const { userId } = await request.json();
    
    // Verify the requesting user has permission
    const token = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No authentication token' }, { status: 401 });
    }

    const decodedToken = await verifyIdToken(token);
    const requestingUserId = decodedToken.uid;
    
    // For now, only allow users to fix their own tier (can be expanded later)
    if (requestingUserId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log(`🔧 Fixing admin tier for user: ${userId}`);
    
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    console.log('📄 Current user data:', {
      tier: userData.tier,
      subscriptionTier: userData.subscriptionTier,
      usage: userData.usage
    });
    
    // Check if user has 'tier: admin' but missing 'subscriptionTier: admin'
    if (userData.tier === 'admin' && userData.subscriptionTier !== 'admin') {
      console.log('🔄 Migrating admin tier...');
      
      const updateData = {
        subscriptionTier: 'admin',
        'usage.sitesCount': -1,
        'usage.lastUpdated': serverTimestamp()
      };
      
      // If they don't have usage object, initialize it
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
      console.log('✅ Admin tier migration completed!');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Admin tier fixed successfully',
        updated: updateData
      });
    } else if (userData.subscriptionTier === 'admin') {
      return NextResponse.json({ 
        success: true, 
        message: 'User already has correct admin tier'
      });
    } else {
      return NextResponse.json({ 
        error: 'User is not an admin',
        tier: userData.tier,
        subscriptionTier: userData.subscriptionTier
      }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Error fixing admin tier:', error);
    return NextResponse.json({ 
      error: 'Failed to fix admin tier',
      details: error.message 
    }, { status: 500 });
  }
}
