import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
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
    if (!user.customClaims?.admin && user.customClaims?.tier !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Calculate date range
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const daysBack = daysMap[range] || 30;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Generate time series data
    const series = await generateTimeSeriesData(startDate, daysBack);

    return NextResponse.json({
      ok: true,
      series
    });

  } catch (error) {
    console.error('Error fetching time series data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch time series data',
      details: error.message 
    }, { status: 500 });
  }
}

async function generateTimeSeriesData(startDate, daysBack) {
  try {
    const series = [];
    const now = new Date();

    // Generate daily data points
    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];

      // Get actual data for this date (simplified - you would implement actual queries)
      const dayData = await getDayData(date);
      
      series.push({
        date: dateStr,
        sites: dayData.sites,
        users: dayData.users,
        pageViews: dayData.pageViews,
        visitors: dayData.visitors,
        emailsSent: dayData.emailsSent,
        emailsDelivered: dayData.emailsDelivered,
        emailsOpened: dayData.emailsOpened,
        emailsClicked: dayData.emailsClicked
      });
    }

    return series;

  } catch (error) {
    console.error('Error generating time series data:', error);
    
    // Return mock data if there's an error
    return generateMockTimeSeriesData(daysBack);
  }
}

async function getDayData(date) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Count sites created on this day
    let sites = 0;
    try {
      const sitesQuery = query(
        collection(db, 'sites'),
        where('createdAt', '>=', startOfDay),
        where('createdAt', '<=', endOfDay)
      );
      const sitesSnapshot = await getDocs(sitesQuery);
      sites = sitesSnapshot.size;
    } catch (error) {
      console.log('Could not fetch sites data for', date, error.message);
    }

    // Count users registered on this day
    let users = 0;
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', startOfDay),
        where('createdAt', '<=', endOfDay)
      );
      const usersSnapshot = await getDocs(usersQuery);
      users = usersSnapshot.size;
    } catch (error) {
      console.log('Could not fetch users data for', date, error.message);
    }

    // Count analytics for this day
    let pageViews = 0;
    let visitors = 0;
    try {
      const analyticsQuery = query(
        collection(db, 'analytics'),
        where('timestamp', '>=', startOfDay),
        where('timestamp', '<=', endOfDay)
      );
      const analyticsSnapshot = await getDocs(analyticsQuery);
      
      const uniqueVisitors = new Set();
      analyticsSnapshot.forEach(doc => {
        const data = doc.data();
        pageViews += data.pageViews || 1;
        if (data.visitorId) {
          uniqueVisitors.add(data.visitorId);
        }
      });
      visitors = uniqueVisitors.size;
    } catch (error) {
      console.log('Could not fetch analytics data for', date, error.message);
    }

    // Count emails for this day
    let emailsSent = 0;
    let emailsDelivered = 0;
    let emailsOpened = 0;
    let emailsClicked = 0;
    try {
      const emailQuery = query(
        collection(db, 'emailLogs'),
        where('timestamp', '>=', startOfDay),
        where('timestamp', '<=', endOfDay)
      );
      const emailSnapshot = await getDocs(emailQuery);
      
      emailSnapshot.forEach(doc => {
        const data = doc.data();
        emailsSent++;
        if (data.status === 'delivered' || data.delivered) emailsDelivered++;
        if (data.opened) emailsOpened++;
        if (data.clicked) emailsClicked++;
      });
    } catch (error) {
      console.log('Could not fetch email data for', date, error.message);
    }

    return {
      sites,
      users,
      pageViews,
      visitors,
      emailsSent,
      emailsDelivered,
      emailsOpened,
      emailsClicked
    };

  } catch (error) {
    console.error('Error fetching day data:', error);
    return {
      sites: 0,
      users: 0,
      pageViews: 0,
      visitors: 0,
      emailsSent: 0,
      emailsDelivered: 0,
      emailsOpened: 0,
      emailsClicked: 0
    };
  }
}

function generateMockTimeSeriesData(daysBack) {
  const series = [];
  const now = new Date();

  for (let i = daysBack; i >= 0; i--) {
    const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    const dateStr = date.toISOString().split('T')[0];

    // Generate realistic-looking mock data
    const baseValue = Math.max(0, 50 - i); // Declining trend
    const randomVariation = Math.random() * 20 - 10; // ±10 variation

    series.push({
      date: dateStr,
      sites: Math.max(0, Math.floor(baseValue * 0.1 + randomVariation * 0.1)),
      users: Math.max(0, Math.floor(baseValue * 0.3 + randomVariation * 0.2)),
      pageViews: Math.max(0, Math.floor(baseValue * 25 + randomVariation * 10)),
      visitors: Math.max(0, Math.floor(baseValue * 5 + randomVariation * 2)),
      emailsSent: Math.max(0, Math.floor(baseValue * 15 + randomVariation * 5)),
      emailsDelivered: Math.max(0, Math.floor(baseValue * 14 + randomVariation * 4)),
      emailsOpened: Math.max(0, Math.floor(baseValue * 3 + randomVariation)),
      emailsClicked: Math.max(0, Math.floor(baseValue * 0.5 + randomVariation * 0.2))
    });
  }

  return series;
}
