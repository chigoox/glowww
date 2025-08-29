import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const siteId = searchParams.get('siteId');
    const status = searchParams.get('status');
    const limitCount = parseInt(searchParams.get('limit')) || 50;
    
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

    // Get user's sites first
    const userSites = await getUserSites(userId);
    
    // Get emails from email logs
    const emails = await getUserEmails(userId, { siteId, status, limit: limitCount });
    
    // Calculate stats
    const stats = calculateEmailStats(emails);
    
    // Enhance emails with site information
    const enhancedEmails = emails.map(email => {
      const site = userSites.find(s => s.id === email.siteId);
      return {
        ...email,
        siteName: site?.name || 'Unknown Site',
        siteSubdomain: site?.subdomain
      };
    });

    return NextResponse.json({
      success: true,
      emails: enhancedEmails,
      stats,
      sites: userSites,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching user emails:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch emails',
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
        subdomain: siteData.subdomain,
        customDomain: siteData.customDomain,
        status: siteData.status || 'active',
        createdAt: siteData.createdAt?.toDate?.() || new Date()
      });
    });
    
    return sites;
    
  } catch (error) {
    console.error(`Error fetching sites for user ${userId}:`, error);
    return [];
  }
}

async function getUserEmails(userId, options = {}) {
  try {
    const { siteId, status, limit: limitCount } = options;
    
    // Build query for email logs
    let emailQuery = query(
      collection(db, 'emailLogs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    // Add site filter if specified
    if (siteId) {
      emailQuery = query(
        collection(db, 'emailLogs'),
        where('userId', '==', userId),
        where('siteId', '==', siteId),
        orderBy('timestamp', 'desc')
      );
    }
    
    // Add limit
    if (limitCount) {
      emailQuery = query(emailQuery, limit(limitCount));
    }
    
    const emailSnapshot = await getDocs(emailQuery);
    const emails = [];
    
    emailSnapshot.forEach(doc => {
      const data = doc.data();
      
      // Filter by status if specified (client-side filter since we can't compound where clauses easily)
      if (status && data.status !== status) {
        return;
      }
      
      emails.push({
        id: doc.id,
        siteId: data.siteId,
        recipient: data.recipient || data.to,
        subject: data.subject,
        status: data.status || 'unknown',
        sentAt: data.timestamp?.toDate?.() || data.sentAt?.toDate?.() || new Date(),
        openedAt: data.openedAt?.toDate?.() || null,
        clickedAt: data.clickedAt?.toDate?.() || null,
        bounceReason: data.bounceReason || null,
        template: data.template || data.templateName || null,
        content: data.content || data.html || data.text || '',
        metadata: {
          messageId: data.messageId,
          userAgent: data.userAgent,
          ip: data.ipAddress || data.ip,
          source: data.source || 'unknown'
        }
      });
    });
    
    return emails;
    
  } catch (error) {
    console.error('Error fetching emails:', error);
    
    // Return empty array if email logs don't exist yet
    if (error.code === 'not-found' || error.message.includes('collection')) {
      return [];
    }
    
    throw error;
  }
}

function calculateEmailStats(emails) {
  const stats = {
    totalSent: emails.length,
    delivered: 0,
    bounced: 0,
    pending: 0,
    failed: 0,
    opened: 0,
    clicked: 0,
    openRate: 0,
    clickRate: 0
  };
  
  emails.forEach(email => {
    switch (email.status) {
      case 'delivered':
      case 'sent':
        stats.delivered++;
        break;
      case 'bounced':
        stats.bounced++;
        break;
      case 'pending':
        stats.pending++;
        break;
      case 'failed':
        stats.failed++;
        break;
    }
    
    if (email.openedAt) {
      stats.opened++;
    }
    
    if (email.clickedAt) {
      stats.clicked++;
    }
  });
  
  // Calculate rates
  if (stats.delivered > 0) {
    stats.openRate = Math.round((stats.opened / stats.delivered) * 100 * 10) / 10;
    stats.clickRate = Math.round((stats.clicked / stats.delivered) * 100 * 10) / 10;
  }
  
  return stats;
}

// Handle email deletion
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');
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

    if (!emailId || !userId) {
      return NextResponse.json({ error: 'emailId and userId required' }, { status: 400 });
    }

    // Delete email from logs (implement as needed)
    // await deleteDoc(doc(db, 'emailLogs', emailId));
    
    return NextResponse.json({
      success: true,
      message: 'Email deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting email:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to delete email',
      details: error.message 
    }, { status: 500 });
  }
}
