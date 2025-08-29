import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    console.log('🔍 Direct sites test...');
    
    // Check user subcollections for sites
    const usersSnapshot = await getDocs(collection(db, 'users'));
    console.log(`Found ${usersSnapshot.size} users`);
    
    const allSites = [];
    let userCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userSitesSnapshot = await getDocs(collection(db, 'users', userDoc.id, 'sites'));
        
        if (userSitesSnapshot.size > 0) {
          userCount++;
          console.log(`User ${userData.displayName || userData.username || userDoc.id} has ${userSitesSnapshot.size} sites`);
          
          userSitesSnapshot.forEach(siteDoc => {
            const siteData = siteDoc.data();
            allSites.push({
              id: siteDoc.id,
              userId: userDoc.id,
              name: siteData.name || 'Untitled',
              username: userData.displayName || userData.username || 'Unknown',
              status: siteData.status || 'draft',
              createdAt: siteData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
            });
          });
        }
      } catch (subError) {
        // Normal - not all users have sites
      }
    }
    
    return NextResponse.json({
      ok: true,
      totalUsers: usersSnapshot.size,
      usersWithSites: userCount,
      totalSites: allSites.length,
      sites: allSites,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Direct sites test error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error.message 
    }, { status: 500 });
  }
}
