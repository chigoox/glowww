import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    console.log('🧪 Simple sites test (no auth)...');
    
    // Get all sites from user subcollections
    const allSites = [];
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`🧪 Checking ${usersSnapshot.size} users for sites...`);
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userSitesSnapshot = await getDocs(collection(db, 'users', userDoc.id, 'sites'));
        
        userSitesSnapshot.forEach(siteDoc => {
          const siteData = siteDoc.data();
          allSites.push({
            id: siteDoc.id,
            userId: userDoc.id,
            name: siteData.name || 'Untitled',
            username: userData.displayName || userData.username || userData.email || 'Unknown',
            userEmail: userData.email,
            userTier: userData.tier || userData.subscriptionTier || 'free',
            status: siteData.status || 'active',
            totalViews: siteData.totalViews || siteData.views || 0,
            thumbnail: siteData.thumbnail,
            createdAt: siteData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: siteData.updatedAt?.toDate?.()?.toISOString() || siteData.lastModified?.toDate?.()?.toISOString() || new Date().toISOString(),
            isPublished: siteData.status === 'published' || siteData.isPublished === true,
            domain: siteData.customDomain || siteData.subdomain || `${userData.username || 'user'}.glow.com/${siteData.name || 'site'}`,
            subdomain: siteData.subdomain,
            customDomain: siteData.customDomain
          });
        });
        
        if (userSitesSnapshot.size > 0) {
          console.log(`🧪 User ${userData.displayName || userData.username || userDoc.id} has ${userSitesSnapshot.size} sites`);
        }
      } catch (subError) {
        // Normal - not all users have sites
      }
    }
    
    console.log(`🧪 Total sites found: ${allSites.length}`);

    return NextResponse.json({
      ok: true,
      sites: allSites,
      debug: {
        totalSites: allSites.length,
        totalUsers: usersSnapshot.size,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('🧪 Simple sites test error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error.message 
    }, { status: 500 });
  }
}
