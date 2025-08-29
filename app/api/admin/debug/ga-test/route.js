import { NextResponse } from 'next/server';
import { testPlatformGoogleAnalyticsConnection, getPlatformAnalyticsBySite } from '@/lib/googleAnalytics';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'test';
    
    console.log('🧪 Testing Google Analytics connection...');
    console.log('🧪 Environment check:', {
      GA_ENABLED: process.env.GA_ENABLED,
      GA_PROPERTY_ID: process.env.GA_PROPERTY_ID,
      GA_PROJECT_ID: process.env.GA_PROJECT_ID,
      GA_SA_CLIENT_EMAIL: process.env.GA_SA_CLIENT_EMAIL ? 'SET' : 'NOT SET',
      GA_SA_PRIVATE_KEY: process.env.GA_SA_PRIVATE_KEY ? 'SET' : 'NOT SET'
    });

    if (action === 'test') {
      // Test connection
      const testResult = await testPlatformGoogleAnalyticsConnection();
      
      return NextResponse.json({
        ok: true,
        test: testResult,
        environment: {
          GA_ENABLED: process.env.GA_ENABLED,
          GA_PROPERTY_ID: process.env.GA_PROPERTY_ID,
          GA_PROJECT_ID: process.env.GA_PROJECT_ID,
          credentialsConfigured: !!(process.env.GA_SA_CLIENT_EMAIL && process.env.GA_SA_PRIVATE_KEY)
        },
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'fetch') {
      // Fetch actual data
      const analyticsData = await getPlatformAnalyticsBySite(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        new Date()
      );
      
      return NextResponse.json({
        ok: true,
        analytics: analyticsData,
        environment: {
          GA_ENABLED: process.env.GA_ENABLED,
          GA_PROPERTY_ID: process.env.GA_PROPERTY_ID
        },
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      ok: false,
      error: 'Invalid action. Use ?action=test or ?action=fetch'
    }, { status: 400 });

  } catch (error) {
    console.error('🧪 Google Analytics test error:', error);
    return NextResponse.json({ 
      ok: false,
      error: 'Google Analytics test failed',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
