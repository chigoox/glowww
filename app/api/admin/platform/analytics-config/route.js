import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { testGoogleAnalyticsConnection } from '@/lib/googleAnalytics';

export async function GET(request) {
  try {
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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all sites and their Google Analytics configurations
    const siteConfigs = [];
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userSitesSnapshot = await getDocs(collection(db, 'users', userDoc.id, 'sites'));
        
        userSitesSnapshot.forEach(siteDoc => {
          const siteData = siteDoc.data();
          
          const propertyId = siteData.googleAnalytics?.propertyId || 
                           siteData.analytics?.googlePropertyId ||
                           siteData.ga4PropertyId ||
                           siteData.analyticsPropertyId;
          
          siteConfigs.push({
            siteId: siteDoc.id,
            userId: userDoc.id,
            siteName: siteData.name || 'Untitled',
            username: userData.displayName || userData.username || 'Unknown',
            userEmail: userData.email,
            propertyId: propertyId || null,
            hasAnalytics: !!propertyId,
            domain: siteData.customDomain || siteData.subdomain || `${userData.username}.glow.com/${siteData.name}`
          });
        });
      } catch (subError) {
        console.log(`Could not process sites for user ${userDoc.id}`);
      }
    }

    return NextResponse.json({
      ok: true,
      sites: siteConfigs,
      summary: {
        totalSites: siteConfigs.length,
        configuredSites: siteConfigs.filter(site => site.hasAnalytics).length,
        unconfiguredSites: siteConfigs.filter(site => !site.hasAnalytics).length
      }
    });

  } catch (error) {
    console.error('Error fetching Google Analytics configurations:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Google Analytics configurations',
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { siteId, userId, propertyId, action = 'update' } = body;

    if (!siteId || !userId) {
      return NextResponse.json({ 
        error: 'Site ID and User ID are required' 
      }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    if (action === 'test' && propertyId) {
      // Test the Google Analytics connection
      const testResult = await testGoogleAnalyticsConnection(propertyId);
      
      return NextResponse.json({
        ok: true,
        test: testResult,
        message: testResult.connected ? 'Connection successful' : 'Connection failed'
      });
    }

    if (action === 'update') {
      // Update site with Google Analytics property ID
      const siteRef = doc(db, 'users', userId, 'sites', siteId);
      
      const updateData = {};
      
      if (propertyId) {
        updateData.googleAnalytics = {
          propertyId: propertyId.toString(),
          configuredAt: new Date(),
          configuredBy: decodedToken.uid
        };
        updateData.ga4PropertyId = propertyId.toString(); // For backward compatibility
      } else {
        // Remove Google Analytics configuration
        updateData.googleAnalytics = null;
        updateData.ga4PropertyId = null;
      }

      await updateDoc(siteRef, updateData);
      
      console.log(`✅ Updated Google Analytics config for site ${siteId}: ${propertyId || 'removed'}`);

      return NextResponse.json({
        ok: true,
        message: propertyId ? 'Google Analytics configured successfully' : 'Google Analytics configuration removed',
        siteId,
        propertyId: propertyId || null
      });
    }

    return NextResponse.json({ 
      error: 'Invalid action. Use "update" or "test"' 
    }, { status: 400 });

  } catch (error) {
    console.error('Error updating Google Analytics configuration:', error);
    return NextResponse.json({ 
      error: 'Failed to update Google Analytics configuration',
      details: error.message 
    }, { status: 500 });
  }
}
