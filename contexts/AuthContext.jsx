'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserData } from '../lib/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get additional user data from Firestore
        const additionalUserData = await getUserData(firebaseUser.uid);
        setUserData(additionalUserData);

        console.log('🔍 AuthContext Debug - Raw Firebase user data:', {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          additionalUserData
        });

        // Derive subscription tier (new schema prioritizes subscriptionTier)
        const subscriptionTier = additionalUserData?.subscriptionTier ||
          additionalUserData?.tier || // backward compatibility
          additionalUserData?.subscription?.plan || 'free';

        console.log('🔍 AuthContext Debug - Subscription tier calculation:', {
          'additionalUserData?.subscriptionTier': additionalUserData?.subscriptionTier,
          'additionalUserData?.tier': additionalUserData?.tier,
          'additionalUserData?.subscription?.plan': additionalUserData?.subscription?.plan,
          'final subscriptionTier': subscriptionTier
        });

        const isAdmin = subscriptionTier === 'admin';

        // Build normalized subscription object (preserve existing fields)
        const normalizedSubscription = {
          plan: subscriptionTier,
          tier: subscriptionTier,
          status: additionalUserData?.subscription?.status || 'active',
          ...(additionalUserData?.subscription || {})
        };

        // Enhance user object with derived properties
        const enhancedUser = {
          ...firebaseUser,
          username: additionalUserData?.username,
          fullName: additionalUserData?.fullName,
          subscriptionTier,
          isAdmin,
            subscription: normalizedSubscription
        };

        console.log('🔍 AuthContext Debug - Final enhanced user:', {
          subscriptionTier: enhancedUser.subscriptionTier,
          isAdmin: enhancedUser.isAdmin,
          subscription: enhancedUser.subscription
        });

        setUser(enhancedUser);
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    userData,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
