import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sites';
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

    // Generate CSV data based on type
    let csvData = '';
    
    switch (type) {
      case 'sites':
        csvData = await exportSitesData();
        break;
      case 'users':
        csvData = await exportUsersData();
        break;
      case 'analytics':
        csvData = await exportAnalyticsData();
        break;
      case 'emails':
        csvData = await exportEmailsData();
        break;
      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    // Return CSV data
    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=platform-${type}-${range}.csv`
      }
    });

  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ 
      error: 'Failed to export data',
      details: error.message 
    }, { status: 500 });
  }
}

async function exportSitesData() {
  try {
    const sitesQuery = query(collection(db, 'sites'));
    const sitesSnapshot = await getDocs(sitesQuery);
    
    let csv = 'Site ID,Site Name,Username,Status,Total Views,Created At,Updated At,Domain\n';
    
    sitesSnapshot.forEach(doc => {
      const data = doc.data();
      const row = [
        doc.id,
        `"${data.name || 'Untitled'}"`,
        data.username || '',
        data.status || 'draft',
        data.totalViews || 0,
        data.createdAt?.toDate?.()?.toISOString() || '',
        data.updatedAt?.toDate?.()?.toISOString() || '',
        data.customDomain || `${data.username}.glow.com/${data.name}`
      ].join(',');
      csv += row + '\n';
    });

    return csv;

  } catch (error) {
    console.error('Error exporting sites data:', error);
    return 'Error,Error exporting sites data\n';
  }
}

async function exportUsersData() {
  try {
    const usersQuery = query(collection(db, 'users'));
    const usersSnapshot = await getDocs(usersQuery);
    
    let csv = 'User ID,Username,Display Name,Email,Tier,Created At,Last Active,Email Verified\n';
    
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      const row = [
        doc.id,
        data.username || '',
        `"${data.displayName || ''}"`,
        data.email || '',
        data.tier || 'free',
        data.createdAt?.toDate?.()?.toISOString() || '',
        data.lastActiveAt?.toDate?.()?.toISOString() || '',
        data.emailVerified || false
      ].join(',');
      csv += row + '\n';
    });

    return csv;

  } catch (error) {
    console.error('Error exporting users data:', error);
    return 'Error,Error exporting users data\n';
  }
}

async function exportAnalyticsData() {
  try {
    const analyticsQuery = query(collection(db, 'analytics'));
    const analyticsSnapshot = await getDocs(analyticsQuery);
    
    let csv = 'Analytics ID,Site ID,Visitor ID,Page Views,Timestamp,User Agent,Referrer\n';
    
    analyticsSnapshot.forEach(doc => {
      const data = doc.data();
      const row = [
        doc.id,
        data.siteId || '',
        data.visitorId || '',
        data.pageViews || 0,
        data.timestamp?.toDate?.()?.toISOString() || '',
        `"${data.userAgent || ''}"`,
        `"${data.referrer || ''}"`
      ].join(',');
      csv += row + '\n';
    });

    return csv;

  } catch (error) {
    console.error('Error exporting analytics data:', error);
    return 'Error,Error exporting analytics data\n';
  }
}

async function exportEmailsData() {
  try {
    const emailQuery = query(collection(db, 'emailLogs'));
    const emailSnapshot = await getDocs(emailQuery);
    
    let csv = 'Email ID,Recipient,Subject,Status,Sent At,Delivered,Opened,Clicked\n';
    
    emailSnapshot.forEach(doc => {
      const data = doc.data();
      const row = [
        doc.id,
        data.recipient || '',
        `"${data.subject || ''}"`,
        data.status || '',
        data.timestamp?.toDate?.()?.toISOString() || '',
        data.delivered || false,
        data.opened || false,
        data.clicked || false
      ].join(',');
      csv += row + '\n';
    });

    return csv;

  } catch (error) {
    console.error('Error exporting emails data:', error);
    return 'Error,Error exporting emails data\n';
  }
}
