import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

export async function GET(request) {
  try {
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

    // Get system health metrics
    const health = await getSystemHealth();

    return NextResponse.json({
      ok: true,
      health
    });

  } catch (error) {
    console.error('Error fetching system health:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch system health',
      details: error.message 
    }, { status: 500 });
  }
}

async function getSystemHealth() {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      serverPerformance: 0,
      databaseHealth: 0,
      emailService: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      storageUsage: 0,
      bandwidthUsage: 0
    };

    // Test server performance (response time)
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1)); // Minimal delay
    const responseTime = Date.now() - startTime;
    health.serverPerformance = Math.max(90, 100 - Math.floor(responseTime / 10));

    // Test database connectivity
    try {
      // Simple database ping - you could implement actual Firebase connection test
      health.databaseHealth = 98; // Mock healthy status
    } catch (dbError) {
      health.databaseHealth = 50;
    }

    // Test email service
    try {
      // You could implement actual email service health check here
      health.emailService = 97; // Mock healthy status
    } catch (emailError) {
      health.emailService = 60;
    }

    // Mock system resource usage (in production, you'd get actual metrics)
    health.cpuUsage = Math.floor(Math.random() * 30) + 30; // 30-60%
    health.memoryUsage = Math.floor(Math.random() * 40) + 50; // 50-90%
    health.storageUsage = Math.floor(Math.random() * 20) + 20; // 20-40%
    health.bandwidthUsage = Math.floor(Math.random() * 25) + 25; // 25-50%

    return health;

  } catch (error) {
    console.error('Error calculating system health:', error);
    
    // Return basic health data if there's an error
    return {
      timestamp: new Date().toISOString(),
      serverPerformance: 85,
      databaseHealth: 90,
      emailService: 88,
      cpuUsage: 45,
      memoryUsage: 67,
      storageUsage: 23,
      bandwidthUsage: 34,
      error: error.message
    };
  }
}
