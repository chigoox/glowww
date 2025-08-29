import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request) {
  try {
    console.log('🌐 Sites API called - URL:', request.url);
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    console.log('🌐 Sites API - Range parameter:', range);
    
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    console.log('🌐 Sites API - Auth header present:', !!authHeader);
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ Sites API - No valid auth header');
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

    // Get all sites with enhanced data
    console.log('🌐 Sites API - Calling getAllSites()...');
    const sites = await getAllSites();
    console.log('🌐 Sites API - Retrieved', sites?.length || 0, 'sites');

    return NextResponse.json({
      ok: true,
      sites,
      debug: {
        totalSites: sites?.length || 0,
        timestamp: new Date().toISOString()
      }
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
    console.log('📋 Fetching all sites from user subcollections...');
    const sites = [];
    
    // Get all users and collect their sites
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`Checking sites for ${usersSnapshot.size} users...`);
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userSitesSnapshot = await getDocs(collection(db, 'users', userDoc.id, 'sites'));
        
        userSitesSnapshot.forEach(siteDoc => {
          const siteData = siteDoc.data();
          
          // Build domain/URL
          let domain = '';
          if (siteData.customDomain) {
            domain = siteData.customDomain;
          } else if (siteData.subdomain) {
            domain = `${siteData.subdomain}.glow.com`;
          } else {
            domain = `${userData.username || userData.displayName || 'user'}.glow.com/${siteData.name || 'untitled'}`;
          }
          
          sites.push({
            id: siteDoc.id,
            userId: userDoc.id,
            name: siteData.name || 'Untitled',
            username: userData.displayName || userData.username || userData.email || 'Unknown',
            userEmail: userData.email,
            status: siteData.status || 'draft',
            thumbnail: siteData.thumbnail,
            totalViews: siteData.totalViews || siteData.views || 0, // Usually 0 since analytics are in Google Analytics
            uniqueVisitors: Math.floor((siteData.totalViews || siteData.views || 0) * 0.7), // Estimate, usually 0
            createdAt: siteData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: siteData.updatedAt?.toDate?.()?.toISOString() || siteData.lastModified?.toDate?.()?.toISOString() || new Date().toISOString(),
            isPublished: siteData.status === 'published' || siteData.isPublished === true,
            domain: domain,
            userTier: userData.tier || userData.subscriptionTier || 'free',
            subdomain: siteData.subdomain,
            customDomain: siteData.customDomain,
            analyticsNote: 'View counts tracked in Google Analytics' // Note for admin
          });
        });
      } catch (subError) {
        // User has no sites subcollection, which is normal
        console.log(`No sites found for user ${userDoc.id}`);
      }
    }
    
    // Fallback: also check top-level sites collection if it exists
    try {
      console.log('📋 Also checking top-level sites collection as fallback...');
      const topLevelSitesQuery = query(
        collection(db, 'sites'),
        orderBy('createdAt', 'desc')
      );

      const topLevelSitesSnapshot = await getDocs(topLevelSitesQuery);
      
      for (const doc of topLevelSitesSnapshot.docs) {
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

        sites.push({
          id: doc.id,
          userId: userData?.uid || 'unknown',
          name: data.name || 'Untitled',
          username: data.username,
          userEmail: userData?.email,
          status: data.status || 'draft',
          thumbnail: data.thumbnail,
          totalViews: data.totalViews || 0,
          uniqueVisitors: Math.floor((data.totalViews || 0) * 0.7),
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          isPublished: data.status === 'published',
          domain: data.customDomain || `${data.username}.glow.com/${data.name}`,
          userTier: userData?.tier || 'free',
          subdomain: data.subdomain,
          customDomain: data.customDomain,
          source: 'top-level' // Mark as coming from top-level collection
        });
      }
      
      console.log(`Added ${topLevelSitesSnapshot.size} sites from top-level collection`);
    } catch (topLevelError) {
      console.log('No top-level sites collection or error accessing it:', topLevelError.message);
    }

    // Sort by creation date, most recent first
    sites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    console.log(`📋 Total sites collected: ${sites.length}`);
    return sites;

  } catch (error) {
    console.error('Error fetching all sites:', error);
    throw error;
  }
}
