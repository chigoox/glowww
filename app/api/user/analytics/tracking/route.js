import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateSiteTrackingCode, getAnalyticsSetupStatus } from '@/lib/userAnalytics';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const userId = searchParams.get('userId');
    
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Check if user is requesting their own tracking code or is admin
    const requestingUserId = decodedToken.uid;
    const isAdmin = decodedToken.customClaims?.admin || 
                   decodedToken.customClaims?.tier === 'admin' || 
                   decodedToken.customClaims?.subscriptionTier === 'admin';
    
    if (!isAdmin && requestingUserId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get analytics setup status
    const setupStatus = getAnalyticsSetupStatus();
    
    if (!setupStatus.isConfigured) {
      return NextResponse.json({
        success: false,
        error: 'Google Analytics not configured on platform',
        setupStatus
      });
    }

    let trackingCode = null;
    let siteInfo = null;

    if (siteId && userId) {
      // Get site information
      try {
        const siteDoc = await getDoc(doc(db, 'users', userId, 'sites', siteId));
        
        if (siteDoc.exists()) {
          const siteData = siteDoc.data();
          siteInfo = {
            id: siteDoc.id,
            name: siteData.name || 'Untitled',
            domain: siteData.customDomain || siteData.subdomain,
            status: siteData.status
          };

          // Generate tracking code
          trackingCode = generateSiteTrackingCode({
            siteId,
            userId,
            siteName: siteData.name || 'Untitled'
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Site not found'
          }, { status: 404 });
        }
      } catch (error) {
        console.error('Error fetching site data:', error);
        return NextResponse.json({
          success: false,
          error: 'Error fetching site data'
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      setupStatus,
      siteInfo,
      trackingCode,
      instructions: {
        title: 'Add Analytics Tracking to Your Site',
        steps: [
          'Copy the tracking code below',
          'Add it to the <head> section of your site',
          'Analytics data will appear within 24-48 hours',
          'Use trackSiteEvent() function for custom event tracking'
        ],
        customEvents: {
          example: "trackSiteEvent('button_click', { button_name: 'Contact Us' });",
          parameters: [
            'button_click - Track button interactions',
            'form_submit - Track form submissions',
            'file_download - Track file downloads',
            'video_play - Track video plays'
          ]
        }
      }
    });

  } catch (error) {
    console.error('Error generating tracking code:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to generate tracking code',
      details: error.message 
    }, { status: 500 });
  }
}
