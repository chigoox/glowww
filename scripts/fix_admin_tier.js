/**
 * Script to fix admin tier display issue
 * Migrates user from old 'tier' field to new 'subscriptionTier' field
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Firebase config (copy from your Firebase/index.js)
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixAdminTier(userId) {
  try {
    console.log(`🔧 Fixing admin tier for user: ${userId}`);
    
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('❌ User not found');
      return;
    }
    
    const userData = userDoc.data();
    console.log('📄 Current user data:', {
      tier: userData.tier,
      subscriptionTier: userData.subscriptionTier,
      subscription: userData.subscription
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
      
      // Verify the update
      const updatedDoc = await getDoc(userRef);
      const updatedData = updatedDoc.data();
      console.log('✅ Updated user data:', {
        tier: updatedData.tier,
        subscriptionTier: updatedData.subscriptionTier,
        usage: updatedData.usage
      });
    } else if (userData.subscriptionTier === 'admin') {
      console.log('✅ User already has correct admin tier');
    } else {
      console.log('❌ User is not an admin');
    }
    
  } catch (error) {
    console.error('❌ Error fixing admin tier:', error);
  }
}

// Get user ID from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Please provide a user ID as an argument');
  console.log('Usage: node fix_admin_tier.js <userId>');
  process.exit(1);
}

fixAdminTier(userId);
