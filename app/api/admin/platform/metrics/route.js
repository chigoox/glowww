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
    
    // Check if user is admin - check multiple fields
    const hasAdminAccess = user.customClaims?.admin || 
                          user.customClaims?.tier === 'admin' || 
                          user.customClaims?.subscriptionTier === 'admin';
    
    if (!hasAdminAccess) {
      // Also check Firestore user data as fallback
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
    console.log('📊 Calculating platform metrics...');
    
    // Get total counts with fallback
    let totalSites = 0;
    let totalUsers = 0;
    
    // Get sites from user subcollections
    try {
      console.log('Getting sites count from user subcollections...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      totalUsers = usersSnapshot.size;
      
      // Iterate through each user and count their sites
      for (const userDoc of usersSnapshot.docs) {
        try {
          const userSitesSnapshot = await getDocs(collection(db, 'users', userDoc.id, 'sites'));
          totalSites += userSitesSnapshot.size;
          if (userSitesSnapshot.size > 0) {
            console.log(`User ${userDoc.id} has ${userSitesSnapshot.size} sites`);
          }
        } catch (subError) {
          // User has no sites subcollection, which is normal
        }
      }
      
      console.log(`Found ${totalSites} total sites across ${totalUsers} users`);
    } catch (error) {
      console.error('Error getting sites from user subcollections:', error);
      
      // Fallback to old method
      try {
        const sitesSnapshot = await getCountFromServer(collection(db, 'sites'));
        totalSites = sitesSnapshot.data().count;
        console.log(`Fallback: Found ${totalSites} total sites in top-level collection`);
      } catch (sitesError) {
        console.log('Could not get sites count, falling back to getDocs:', sitesError.message);
        const sitesSnapshot = await getDocs(collection(db, 'sites'));
        totalSites = sitesSnapshot.size;
      }

      try {
        const usersSnapshot = await getCountFromServer(collection(db, 'users'));
        totalUsers = usersSnapshot.data().count;
        console.log(`Found ${totalUsers} total users`);
      } catch (usersError) {
        console.log('Could not get users count, falling back to getDocs:', usersError.message);
        const usersSnapshot = await getDocs(collection(db, 'users'));
        totalUsers = usersSnapshot.size;
      }
    }
    
    // Get recent counts for growth calculation from user subcollections
    let recentSites = 0;
    let recentUsers = 0;
    
    try {
      // Count recent sites from user subcollections
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      for (const userDoc of usersSnapshot.docs) {
        try {
          const userSitesQuery = query(
            collection(db, 'users', userDoc.id, 'sites'),
            where('createdAt', '>=', startDate)
          );
          const userRecentSitesSnapshot = await getDocs(userSitesQuery);
          recentSites += userRecentSitesSnapshot.size;
        } catch (subError) {
          // User has no sites subcollection, which is normal
        }
      }
      
      console.log(`Found ${recentSites} recent sites in the specified period`);
    } catch (error) {
      console.log('Could not get recent sites count from user subcollections:', error.message);
      
      // Fallback to old method
      try {
        const recentSitesQuery = query(
          collection(db, 'sites'),
          where('createdAt', '>=', startDate)
        );
        const recentSitesSnapshot = await getCountFromServer(recentSitesQuery);
        recentSites = recentSitesSnapshot.data().count;
      } catch (error) {
        console.log('Could not get recent sites count:', error.message);
        // Fallback to getDocs
        try {
          const recentSitesQuery = query(
            collection(db, 'sites'),
            where('createdAt', '>=', startDate)
          );
          const recentSitesSnapshot = await getDocs(recentSitesQuery);
          recentSites = recentSitesSnapshot.size;
        } catch (fallbackError) {
          console.log('Fallback sites query also failed:', fallbackError.message);
        }
      }
    }

    try {
      const recentUsersQuery = query(
        collection(db, 'users'),
        where('createdAt', '>=', startDate)
      );
      const recentUsersSnapshot = await getCountFromServer(recentUsersQuery);
      recentUsers = recentUsersSnapshot.data().count;
    } catch (error) {
      console.log('Could not get recent users count:', error.message);
      // Fallback to getDocs
      try {
        const recentUsersQuery = query(
          collection(db, 'users'),
          where('createdAt', '>=', startDate)
        );
        const recentUsersSnapshot = await getDocs(recentUsersQuery);
        recentUsers = recentUsersSnapshot.size;
      } catch (fallbackError) {
        console.log('Fallback users query also failed:', fallbackError.message);
      }
    }

    // Get analytics data from Google Analytics API
    let totalVisitors = 0;
    let totalPageViews = 0;
    let analyticsSource = 'estimated';
    
    try {
      console.log('📊 Attempting to fetch real analytics data from Google Analytics...');
      
      // Try to import and use Google Analytics directly
      try {
        const { getPlatformAnalyticsBySite } = await import('@/lib/googleAnalytics');
        
        console.log('📊 Fetching platform analytics from single GA4 property...');
        
        const analyticsData = await getPlatformAnalyticsBySite(startDate, new Date());
        
        if (analyticsData.success) {
          totalPageViews = analyticsData.totalPageViews || 0;
          totalVisitors = analyticsData.totalUsers || 0;
          analyticsSource = 'google-analytics';
          
          console.log(`📊 Google Analytics data: ${totalPageViews} page views, ${totalVisitors} users`);
          
          if (analyticsData.hasCustomDimensions) {
            console.log(`📊 Found ${analyticsData.siteBreakdown.length} sites with custom dimension data`);
          } else {
            console.log(`📊 Using total platform metrics (no custom dimensions configured yet)`);
          }
        } else {
          console.log('⚠️ Google Analytics query failed:', analyticsData.error);
          throw new Error(analyticsData.error || 'Google Analytics query failed');
        }
      } catch (gaImportError) {
        console.log('📊 Google Analytics import/execution failed:', gaImportError.message);
        throw gaImportError;
      }
      
    } catch (googleAnalyticsError) {
      console.log('📊 Google Analytics not available, calculating estimates:', googleAnalyticsError.message);
      analyticsSource = 'estimated';
      
      // Fallback to estimates when Google Analytics is not available
      try {
        // Calculate total page views from user site subcollections (if they have view counts)
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let sitesWithViews = 0;
        
        for (const userDoc of usersSnapshot.docs) {
          try {
            const userSitesSnapshot = await getDocs(collection(db, 'users', userDoc.id, 'sites'));
            userSitesSnapshot.forEach(siteDoc => {
              const siteData = siteDoc.data();
              const views = siteData.totalViews || siteData.views || 0;
              if (views > 0) {
                totalPageViews += views;
                sitesWithViews++;
              }
            });
          } catch (subError) {
            // User has no sites subcollection, which is normal
          }
        }
        
        // If no view data is stored in Firestore, provide estimates
        if (totalPageViews === 0) {
          // Estimate based on number of sites and average activity
          const avgViewsPerSite = 150; // Conservative estimate
          const avgVisitorsPerSite = 50; // Conservative estimate
          
          totalPageViews = totalSites * avgViewsPerSite;
          totalVisitors = totalSites * avgVisitorsPerSite;
          
          console.log(`📊 Using estimates: ${totalSites} sites × ${avgViewsPerSite} avg views = ${totalPageViews} total page views`);
          console.log(`📊 Using estimates: ${totalSites} sites × ${avgVisitorsPerSite} avg visitors = ${totalVisitors} total visitors`);
        } else {
          // Calculate visitors as 70% of page views (standard web analytics ratio)
          totalVisitors = Math.floor(totalPageViews * 0.7);
          console.log(`📊 Found ${totalPageViews} page views from ${sitesWithViews} sites with stored view counts`);
          console.log(`📊 Estimated ${totalVisitors} visitors (70% of page views)`);
        }
        
      } catch (fallbackError) {
        console.log('📊 Fallback analytics calculation failed:', fallbackError.message);
        
        // Final fallback: minimal estimates
        totalVisitors = Math.max(totalUsers * 2, 50); // At least 2 visitors per user, minimum 50
        totalPageViews = Math.max(totalVisitors * 3, 150); // At least 3 page views per visitor, minimum 150
        
        console.log(`📊 Final fallback estimates: ${totalVisitors} visitors, ${totalPageViews} page views`);
      }
    }

    // Calculate growth percentages (simplified)
    const sitesGrowth = totalSites > 0 && recentSites > 0 ? 
      Math.round((recentSites / totalSites) * 100) : 0;
    const usersGrowth = totalUsers > 0 && recentUsers > 0 ? 
      Math.round((recentUsers / totalUsers) * 100) : 0;

    const metrics = {
      totalSites,
      totalUsers,
      totalVisitors,
      totalPageViews,
      activeUsers: Math.floor(totalUsers * 0.3), // Estimated active users
      analyticsSource, // 'google-analytics' or 'estimated'
      growth: {
        sites: sitesGrowth,
        users: usersGrowth,
        visitors: 15 // Mock data - implement proper visitor growth calculation
      }
    };

    console.log('📊 Final metrics:', metrics);
    return metrics;

  } catch (error) {
    console.error('Error calculating platform metrics:', error);
    // Return fallback metrics instead of throwing
    return {
      totalSites: 0,
      totalUsers: 0,
      totalVisitors: 0,
      totalPageViews: 0,
      activeUsers: 0,
      analyticsSource: 'fallback',
      growth: {
        sites: 0,
        users: 0,
        visitors: 0
      }
    };
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
                           siteData.ga4PropertyId ||
                           siteData.analyticsPropertyId;
          
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
    
    return configs;
  } catch (error) {
    console.error('Error getting site analytics configs:', error);
    return [];
  }
}

async function getTopSites(limitCount) {
  try {
    console.log('🏆 Getting top sites from user subcollections...');
    
    let sites = [];
    
    try {
      // Get all users and collect their sites
      const usersSnapshot = await getDocs(collection(db, 'users'));
      console.log(`Checking sites for ${usersSnapshot.size} users...`);
      
      for (const userDoc of usersSnapshot.docs) {
        try {
          const userData = userDoc.data();
          const userSitesSnapshot = await getDocs(collection(db, 'users', userDoc.id, 'sites'));
          
          userSitesSnapshot.forEach(siteDoc => {
            const siteData = siteDoc.data();
            sites.push({
              id: siteDoc.id,
              userId: userDoc.id,
              name: siteData.name || 'Untitled',
              username: userData.displayName || userData.username || 'Unknown',
              totalViews: siteData.totalViews || siteData.views || 0,
              thumbnail: siteData.thumbnail,
              createdAt: siteData.createdAt?.toDate?.() || new Date(),
              status: siteData.status || 'active'
            });
          });
        } catch (subError) {
          // User has no sites subcollection, which is normal
        }
      }
      
      console.log(`Collected ${sites.length} sites from user subcollections`);
      
      // Filter published/active sites and sort by views
      sites = sites
        .filter(site => site.status === 'published' || site.status === 'active')
        .sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0))
        .slice(0, limitCount);
        
      console.log(`Returning top ${sites.length} sites`);
      
    } catch (subcollectionError) {
      console.log('Could not query user subcollections, falling back to top-level sites collection:', subcollectionError.message);
      
      // Fallback to old method
      try {
        const sitesQuery = query(
          collection(db, 'sites'),
          where('status', '==', 'published'),
          orderBy('totalViews', 'desc'),
          limit(limitCount)
        );
        const sitesSnapshot = await getDocs(sitesQuery);
        
        sitesSnapshot.forEach(doc => {
          const data = doc.data();
          sites.push({
            id: doc.id,
            name: data.name || 'Untitled',
            username: data.username || 'Unknown',
            totalViews: data.totalViews || 0,
            thumbnail: data.thumbnail,
            createdAt: data.createdAt?.toDate?.() || new Date()
          });
        });
        
        console.log(`Fallback: Found ${sites.length} published sites`);
      } catch (fallbackError) {
        console.log('Fallback also failed:', fallbackError.message);
        return [];
      }
    }

    return sites;

  } catch (error) {
    console.error('Error fetching top sites:', error);
    return [];
  }
}

async function getRecentActivity(limitCount) {
  try {
    const activities = [];

    // Get recent sites from user subcollections
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const recentSites = [];
      
      for (const userDoc of usersSnapshot.docs) {
        try {
          const userData = userDoc.data();
          const userSitesQuery = query(
            collection(db, 'users', userDoc.id, 'sites'),
            orderBy('createdAt', 'desc'),
            limit(5) // Get a few from each user
          );
          const userSitesSnapshot = await getDocs(userSitesQuery);
          
          userSitesSnapshot.forEach(siteDoc => {
            const siteData = siteDoc.data();
            recentSites.push({
              type: 'site_created',
              description: `New site "${siteData.name || 'Untitled'}" created by ${userData.displayName || userData.username || 'Unknown'}`,
              timestamp: siteData.createdAt?.toDate?.() || new Date(),
              metadata: { siteId: siteDoc.id, userId: userDoc.id, username: userData.username }
            });
          });
        } catch (subError) {
          // User has no sites subcollection, which is normal
        }
      }
      
      // Sort by timestamp and take the most recent
      recentSites.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      activities.push(...recentSites.slice(0, Math.floor(limitCount / 3)));
      
      console.log(`Added ${Math.min(recentSites.length, Math.floor(limitCount / 3))} recent site activities from user subcollections`);
    } catch (sitesError) {
      console.log('Could not get sites from user subcollections, trying top-level collection:', sitesError.message);
      
      // Fallback to old method
      try {
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
      } catch (fallbackError) {
        console.log('Fallback sites query also failed:', fallbackError.message);
      }
    }

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
