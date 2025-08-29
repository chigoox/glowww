import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Check if user is requesting their own data or is admin
    const requestingUserId = decodedToken.uid;
    const isAdmin = decodedToken.customClaims?.admin || 
                   decodedToken.customClaims?.tier === 'admin' || 
                   decodedToken.customClaims?.subscriptionTier === 'admin';
    
    if (!isAdmin && requestingUserId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
    }

    // Get user's sites
    const sites = await getUserSites(userId);
    
    return NextResponse.json({
      success: true,
      sites,
      count: sites.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching user sites:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch sites',
      details: error.message 
    }, { status: 500 });
  }
}

async function getUserSites(userId) {
  try {
    const sites = [];
    
    // Get sites from user subcollection
    const userSitesSnapshot = await getDocs(collection(db, 'users', userId, 'sites'));
    
    userSitesSnapshot.forEach(siteDoc => {
      const siteData = siteDoc.data();
      sites.push({
        id: siteDoc.id,
        name: siteData.name || 'Untitled',
        description: siteData.description || '',
        subdomain: siteData.subdomain,
        customDomain: siteData.customDomain,
        isPublished: siteData.isPublished || false,
        isMainSite: siteData.isMainSite || false,
        status: siteData.status || 'active',
        createdAt: siteData.createdAt?.toDate?.() || new Date(),
        updatedAt: siteData.updatedAt?.toDate?.() || new Date(),
        analyticsEnabled: siteData.analyticsEnabled !== false
      });
    });
    
    // Sort by creation date (newest first)
    sites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return sites;
    
  } catch (error) {
    console.error(`Error fetching sites for user ${userId}:`, error);
    return [];
  }
}
