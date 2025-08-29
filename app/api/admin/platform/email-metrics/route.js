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

    // Get email metrics
    const metrics = await getEmailMetrics(startDate);

    return NextResponse.json({
      ok: true,
      metrics
    });

  } catch (error) {
    console.error('Error fetching email metrics:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch email metrics',
      details: error.message 
    }, { status: 500 });
  }
}

async function getEmailMetrics(startDate) {
  try {
    // Query email logs from the specified date range
    const emailLogsQuery = query(
      collection(db, 'emailLogs'),
      where('timestamp', '>=', startDate),
      orderBy('timestamp', 'desc')
    );

    const emailLogsSnapshot = await getDocs(emailLogsQuery);
    
    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalBounced = 0;

    emailLogsSnapshot.forEach(doc => {
      const data = doc.data();
      
      totalSent++;
      
      if (data.status === 'delivered' || data.delivered) {
        totalDelivered++;
      }
      
      if (data.opened) {
        totalOpened++;
      }
      
      if (data.clicked) {
        totalClicked++;
      }
      
      if (data.status === 'bounced' || data.bounced) {
        totalBounced++;
      }
    });

    // Calculate rates
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
    const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const clickRate = totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

    // If no email logs exist, return mock data for demonstration
    if (totalSent === 0) {
      return {
        totalSent: 12750,
        deliveryRate: 98.2,
        openRate: 24.7,
        clickRate: 3.8,
        bounceRate: 1.8,
        isMockData: true
      };
    }

    return {
      totalSent,
      deliveryRate: Math.round(deliveryRate * 10) / 10,
      openRate: Math.round(openRate * 10) / 10,
      clickRate: Math.round(clickRate * 10) / 10,
      bounceRate: Math.round(bounceRate * 10) / 10
    };

  } catch (error) {
    console.error('Error calculating email metrics:', error);
    
    // Return mock data if there's an error
    return {
      totalSent: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
      error: error.message
    };
  }
}
