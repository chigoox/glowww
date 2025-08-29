import { NextResponse } from 'next/server';
import { collection, getDocs, listCollections } from 'firebase/firestore';
import { db, adminDb } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebaseAdmin';

export async function GET() {
  try {
    console.log('🔍 Testing database collections...');
    
    const results = {};
    
    // Test different possible collection names for sites
    const possibleSiteCollections = [
      'sites', 'Sites', 'site', 'Site', 
      'pages', 'Pages', 'websites', 'Websites',
      'projects', 'Projects'
    ];
    
    for (const collectionName of possibleSiteCollections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        if (snapshot.size > 0) {
          results[collectionName] = {
            count: snapshot.size,
            samples: snapshot.docs.slice(0, 2).map(doc => ({
              id: doc.id,
              data: Object.keys(doc.data()) // Just show field names, not full data
            }))
          };
          console.log(`✅ ${collectionName}: ${snapshot.size} documents`);
        } else {
          results[collectionName] = { count: 0 };
          console.log(`📭 ${collectionName}: 0 documents`);
        }
      } catch (error) {
        results[collectionName] = { error: error.message };
        console.log(`❌ ${collectionName}: ${error.message}`);
      }
    }
    
    // Test users collection
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      results.users = {
        count: usersSnapshot.size,
        samples: usersSnapshot.docs.slice(0, 2).map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            fields: Object.keys(data),
            hasSites: data.sites ? 'yes' : 'no',
            hasWebsites: data.websites ? 'yes' : 'no',
            hasProjects: data.projects ? 'yes' : 'no'
          };
        })
      };
      console.log(`✅ Users: ${usersSnapshot.size} documents`);
      
      // Check if any user documents have subcollections
      if (usersSnapshot.docs.length > 0) {
        const firstUser = usersSnapshot.docs[0];
        try {
          // Check for common subcollection names
          const subCollections = ['sites', 'pages', 'websites', 'projects'];
          for (const subCol of subCollections) {
            try {
              const subSnapshot = await getDocs(collection(db, 'users', firstUser.id, subCol));
              if (subSnapshot.size > 0) {
                results[`users/${firstUser.id}/${subCol}`] = {
                  count: subSnapshot.size,
                  note: 'Found as subcollection under user'
                };
                console.log(`✅ Found subcollection: users/${firstUser.id}/${subCol} (${subSnapshot.size} docs)`);
              }
            } catch (subError) {
              // Subcollection doesn't exist, which is normal
            }
          }
        } catch (subError) {
          console.log('Could not check subcollections:', subError.message);
        }
      }
    } catch (error) {
      results.users = { error: error.message };
      console.log(`❌ Users: ${error.message}`);
    }
    
    // Test analytics collection
    try {
      const analyticsSnapshot = await getDocs(collection(db, 'analytics'));
      results.analytics = {
        count: analyticsSnapshot.size
      };
      console.log(`✅ Analytics: ${analyticsSnapshot.size} documents`);
    } catch (error) {
      results.analytics = { error: error.message };
      console.log(`❌ Analytics: ${error.message}`);
    }

    return NextResponse.json({
      ok: true,
      results,
      summary: {
        totalUsers: results.users?.count || 0,
        totalSites: Object.entries(results)
          .filter(([key, val]) => key.includes('site') || key.includes('page') || key.includes('website'))
          .reduce((sum, [key, val]) => sum + (val.count || 0), 0),
        possibleSiteCollections: Object.entries(results)
          .filter(([key, val]) => (key.includes('site') || key.includes('page') || key.includes('website')) && (val.count > 0))
          .map(([key, val]) => ({ collection: key, count: val.count }))
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      error: 'Database test failed',
      details: error.message 
    }, { status: 500 });
  }
}
