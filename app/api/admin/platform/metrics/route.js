import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { collection, getDocs, query, where, orderBy, limit, getCountFromServer } from 'firebase/firestore';
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

    // Calculate date range
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const daysBack = daysMap[range] || 30;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Get platform metrics
    const metrics = await getPlatformMetrics(startDate);
    const topSites = await getTopSites(10);
    const recentActivity = await getRecentActivity(20);

    return NextResponse.json({
      ok: true,
      metrics,
      topSites,
      recentActivity
    });

  } catch (error) {
    console.error('Error fetching platform metrics:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch platform metrics',
      details: error.message 
    }, { status: 500 });
  }
}

async function getPlatformMetrics(startDate) {
  try {
    // Get total counts
    const sitesSnapshot = await getCountFromServer(collection(db, 'sites'));
    const usersSnapshot = await getCountFromServer(collection(db, 'users'));
    
    // Get recent counts for growth calculation
    const recentSitesQuery = query(
      collection(db, 'sites'),
      where('createdAt', '>=', startDate)
    );
    const recentSitesSnapshot = await getCountFromServer(recentSitesQuery);

    const recentUsersQuery = query(
      collection(db, 'users'),
      where('createdAt', '>=', startDate)
    );
    const recentUsersSnapshot = await getCountFromServer(recentUsersQuery);

    // Get analytics data for visitors and page views
    const analyticsQuery = query(
      collection(db, 'analytics'),
      where('timestamp', '>=', startDate)
    );
    const analyticsSnapshot = await getDocs(analyticsQuery);
    
    let totalVisitors = 0;
    let totalPageViews = 0;
    let uniqueVisitors = new Set();

    analyticsSnapshot.forEach(doc => {
      const data = doc.data();
      totalPageViews += data.pageViews || 0;
      if (data.visitorId) {
        uniqueVisitors.add(data.visitorId);
      }
    });

    totalVisitors = uniqueVisitors.size;

    // Calculate growth percentages (simplified)
    const totalSites = sitesSnapshot.data().count;
    const totalUsers = usersSnapshot.data().count;
    const recentSites = recentSitesSnapshot.data().count;
    const recentUsers = recentUsersSnapshot.data().count;

    const sitesGrowth = totalSites > recentSites ? 
      ((recentSites / (totalSites - recentSites)) * 100) : 0;
    const usersGrowth = totalUsers > recentUsers ? 
      ((recentUsers / (totalUsers - recentUsers)) * 100) : 0;

    return {
      totalSites,
      totalUsers,
      totalVisitors,
      totalPageViews,
      activeUsers: Math.floor(totalUsers * 0.3), // Estimated active users
      growth: {
        sites: Math.round(sitesGrowth),
        users: Math.round(usersGrowth),
        visitors: 15 // Mock data - implement proper visitor growth calculation
      }
    };

  } catch (error) {
    console.error('Error calculating platform metrics:', error);
    throw error;
  }
}

async function getTopSites(limitCount) {
  try {
    const sitesQuery = query(
      collection(db, 'sites'),
      where('status', '==', 'published'),
      orderBy('totalViews', 'desc'),
      limit(limitCount)
    );

    const sitesSnapshot = await getDocs(sitesQuery);
    const sites = [];

    sitesSnapshot.forEach(doc => {
      const data = doc.data();
      sites.push({
        id: doc.id,
        name: data.name || 'Untitled',
        username: data.username,
        totalViews: data.totalViews || 0,
        thumbnail: data.thumbnail,
        createdAt: data.createdAt?.toDate?.() || new Date()
      });
    });

    return sites;

  } catch (error) {
    console.error('Error fetching top sites:', error);
    return [];
  }
}

async function getRecentActivity(limitCount) {
  try {
    const activities = [];

    // Get recent sites
    const recentSitesQuery = query(
      collection(db, 'sites'),
      orderBy('createdAt', 'desc'),
      limit(Math.floor(limitCount / 3))
    );
    const recentSitesSnapshot = await getDocs(recentSitesQuery);

    recentSitesSnapshot.forEach(doc => {
      const data = doc.data();
      activities.push({
        type: 'site_created',
        description: `New site "${data.name}" created by ${data.username}`,
        timestamp: data.createdAt?.toDate?.() || new Date(),
        metadata: { siteId: doc.id, username: data.username }
      });
    });

    // Get recent users
    const recentUsersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc'),
      limit(Math.floor(limitCount / 3))
    );
    const recentUsersSnapshot = await getDocs(recentUsersQuery);

    recentUsersSnapshot.forEach(doc => {
      const data = doc.data();
      activities.push({
        type: 'user_registered',
        description: `New user ${data.displayName || data.username || 'Anonymous'} registered`,
        timestamp: data.createdAt?.toDate?.() || new Date(),
        metadata: { userId: doc.id, tier: data.tier }
      });
    });

    // Get recent email activities (if email logs exist)
    try {
      const emailLogsQuery = query(
        collection(db, 'emailLogs'),
        orderBy('timestamp', 'desc'),
        limit(Math.floor(limitCount / 3))
      );
      const emailLogsSnapshot = await getDocs(emailLogsQuery);

      emailLogsSnapshot.forEach(doc => {
        const data = doc.data();
        activities.push({
          type: 'email_sent',
          description: `Email "${data.subject}" sent to ${data.recipient}`,
          timestamp: data.timestamp?.toDate?.() || new Date(),
          metadata: { emailId: doc.id, status: data.status }
        });
      });
    } catch (emailError) {
      console.log('Email logs not available:', emailError.message);
    }

    // Sort by timestamp descending and limit
    return activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limitCount);

  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return [];
  }
}
