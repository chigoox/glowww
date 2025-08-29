import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getMultiplePropertiesData, testGoogleAnalyticsConnection } from '@/lib/googleAnalytics';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    const action = searchParams.get('action') || 'metrics'; // 'metrics' or 'test'
    
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const user = await adminAuth.getUser(decodedToken.uid);
    
    // Check if user is admin
    const hasAdminAccess = user.customClaims?.admin || 
                          user.customClaims?.tier === 'admin' || 
                          user.customClaims?.subscriptionTier === 'admin';
    
    if (!hasAdminAccess) {
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

    // Calculate date range
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const daysBack = daysMap[range] || 30;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    if (action === 'test') {
      // Test connection with a sample property ID
      const testPropertyId = searchParams.get('propertyId');
      if (!testPropertyId) {
        return NextResponse.json({ 
          error: 'Property ID required for testing' 
        }, { status: 400 });
      }

      const testResult = await testGoogleAnalyticsConnection(testPropertyId);
      return NextResponse.json({
        ok: true,
        test: testResult
      });
    }

    // Get all sites with their Google Analytics property IDs
    console.log('📊 Fetching Google Analytics data for all sites...');
    const siteConfigs = await getSiteAnalyticsConfigs();
    
    if (siteConfigs.length === 0) {
      console.log('⚠️ No sites configured with Google Analytics property IDs');
      return NextResponse.json({
        ok: true,
        analytics: {
          totalPageViews: 0,
          totalUsers: 0,
          totalSessions: 0,
          siteBreakdown: [],
          errors: ['No sites configured with Google Analytics property IDs']
        },
        message: 'Configure Google Analytics property IDs in site settings'
      });
    }

    // Fetch analytics data for all configured sites
    const analyticsData = await getMultiplePropertiesData(siteConfigs, startDate, now);
    
    console.log('📊 Google Analytics data retrieved:', {
      totalPageViews: analyticsData.totalPageViews,
      totalUsers: analyticsData.totalUsers,
      sitesCount: siteConfigs.length,
      errorsCount: analyticsData.errors.length
    });

    return NextResponse.json({
      ok: true,
      analytics: analyticsData,
      dateRange: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        days: daysBack
      }
    });

  } catch (error) {
    console.error('Error fetching Google Analytics data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Google Analytics data',
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * Get sites with their Google Analytics configurations
 */
async function getSiteAnalyticsConfigs() {
  const configs = [];
  
  try {
    // Get all users and their sites
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userSitesSnapshot = await getDocs(collection(db, 'users', userDoc.id, 'sites'));
        
        userSitesSnapshot.forEach(siteDoc => {
          const siteData = siteDoc.data();
          
          // Check if site has Google Analytics property ID configured
          const propertyId = siteData.googleAnalytics?.propertyId || 
                           siteData.analytics?.googlePropertyId ||
                           siteData.ga4PropertyId;
          
          if (propertyId) {
            configs.push({
              siteId: siteDoc.id,
              userId: userDoc.id,
              siteName: siteData.name || 'Untitled',
              username: userData.displayName || userData.username || 'Unknown',
              propertyId: propertyId.toString(), // Ensure it's a string
              domain: siteData.customDomain || siteData.subdomain || `${userData.username}.glow.com/${siteData.name}`
            });
          }
        });
      } catch (subError) {
        console.log(`Could not process sites for user ${userDoc.id}:`, subError.message);
      }
    }
    
    console.log(`📊 Found ${configs.length} sites with Google Analytics configured`);
    return configs;
  } catch (error) {
    console.error('Error getting site analytics configs:', error);
    return [];
  }
}
