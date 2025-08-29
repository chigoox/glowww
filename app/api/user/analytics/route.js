import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserAnalytics, getSiteAnalytics, getUserRealtimeAnalytics } from '@/lib/userAnalytics';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const siteId = searchParams.get('siteId');
    const range = searchParams.get('range') || '30d';
    const type = searchParams.get('type') || 'overview'; // overview, site, realtime
    
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

    // Calculate date range
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const daysBack = daysMap[range] || 30;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Get user's sites from Firestore
    const userSites = await getUserSites(userId);

    let analyticsData = null;

    switch (type) {
      case 'realtime':
        analyticsData = await getUserRealtimeAnalytics(userId);
        break;
      
      case 'site':
        if (!siteId) {
          return NextResponse.json({ error: 'siteId parameter required for site analytics' }, { status: 400 });
        }
        analyticsData = await getSiteAnalytics({
          siteId,
          userId,
          startDate,
          endDate: now
        });
        break;
      
      case 'overview':
      default:
        analyticsData = await getUserAnalytics({
          userId,
          startDate,
          endDate: now
        });
        break;
    }

    // Add Firestore site data to analytics data
    if (analyticsData.success && analyticsData.sites) {
      analyticsData.sites = analyticsData.sites.map(analyticsSite => {
        const firestoreSite = userSites.find(s => s.id === analyticsSite.siteId);
        return {
          ...analyticsSite,
          name: firestoreSite?.name || analyticsSite.siteName,
          thumbnail: firestoreSite?.thumbnail,
          domain: firestoreSite?.customDomain || firestoreSite?.subdomain,
          status: firestoreSite?.status,
          createdAt: firestoreSite?.createdAt
        };
      });
    }

    return NextResponse.json({
      success: true,
      userId,
      type,
      range,
      analytics: analyticsData,
      userSites,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch user analytics',
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
        thumbnail: siteData.thumbnail,
        customDomain: siteData.customDomain,
        subdomain: siteData.subdomain,
        status: siteData.status || 'active',
        createdAt: siteData.createdAt?.toDate?.() || new Date(),
        totalViews: siteData.totalViews || siteData.views || 0
      });
    });
    
    return sites;
    
  } catch (error) {
    console.error(`Error fetching sites for user ${userId}:`, error);
    return [];
  }
}
