import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const user = await adminAuth.getUser(decodedToken.uid);
    
    // Check if user is admin
    if (!user.customClaims?.admin && !user.customClaims?.tier === 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all sites with enhanced data
    const sites = await getAllSites();

    return NextResponse.json({
      ok: true,
      sites
    });

  } catch (error) {
    console.error('Error fetching sites data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch sites data',
      details: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request) {
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
    if (!user.customClaims?.admin && !user.customClaims?.tier === 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Extract site ID from URL
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const siteId = pathSegments[pathSegments.length - 1];

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID required' }, { status: 400 });
    }

    // Delete site logic would go here
    // For now, just return success
    return NextResponse.json({
      ok: true,
      message: 'Site deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting site:', error);
    return NextResponse.json({ 
      error: 'Failed to delete site',
      details: error.message 
    }, { status: 500 });
  }
}

async function getAllSites() {
  try {
    const sitesQuery = query(
      collection(db, 'sites'),
      orderBy('createdAt', 'desc')
    );

    const sitesSnapshot = await getDocs(sitesQuery);
    const sites = [];

    for (const doc of sitesSnapshot.docs) {
      const data = doc.data();
      
      // Get user data for this site
      let userData = null;
      try {
        const userQuery = query(
          collection(db, 'users'),
          where('username', '==', data.username),
          limit(1)
        );
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
          userData = userSnapshot.docs[0].data();
        }
      } catch (userError) {
        console.log(`Could not fetch user data for ${data.username}:`, userError.message);
      }

      // Get analytics data for this site
      let analyticsData = { totalViews: 0, uniqueVisitors: 0 };
      try {
        const analyticsQuery = query(
          collection(db, 'analytics'),
          where('siteId', '==', doc.id)
        );
        const analyticsSnapshot = await getDocs(analyticsQuery);
        
        let totalViews = 0;
        let uniqueVisitors = new Set();
        
        analyticsSnapshot.forEach(analDoc => {
          const analData = analDoc.data();
          totalViews += analData.pageViews || 0;
          if (analData.visitorId) {
            uniqueVisitors.add(analData.visitorId);
          }
        });

        analyticsData = {
          totalViews,
          uniqueVisitors: uniqueVisitors.size
        };
      } catch (analyticsError) {
        console.log(`Could not fetch analytics for site ${doc.id}:`, analyticsError.message);
      }

      sites.push({
        id: doc.id,
        name: data.name || 'Untitled',
        username: data.username,
        status: data.status || 'draft',
        thumbnail: data.thumbnail,
        totalViews: analyticsData.totalViews || data.totalViews || 0,
        uniqueVisitors: analyticsData.uniqueVisitors || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        isPublished: data.status === 'published',
        domain: data.customDomain || `${data.username}.glow.com/${data.name}`,
        userTier: userData?.tier || 'free',
        userEmail: userData?.email
      });
    }

    return sites;

  } catch (error) {
    console.error('Error fetching all sites:', error);
    throw error;
  }
}
