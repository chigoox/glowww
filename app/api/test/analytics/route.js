import { NextResponse } from 'next/server';
import { getAnalyticsSetupStatus } from '@/lib/userAnalytics';

export async function GET() {
  try {
    // Test the analytics setup
    const setupStatus = getAnalyticsSetupStatus();
    
    // Test connection (without requiring authentication for testing)
    const testResult = {
      message: 'Analytics API Test',
      timestamp: new Date().toISOString(),
      setupStatus,
      environment: {
        GA_ENABLED: process.env.GA_ENABLED,
        GA_PROPERTY_ID: process.env.GA_PROPERTY_ID ? 'configured' : 'not configured',
        GA_PROJECT_ID: process.env.GA_PROJECT_ID ? 'configured' : 'not configured',
        GA_SA_CLIENT_EMAIL: process.env.GA_SA_CLIENT_EMAIL ? 'configured' : 'not configured',
        GA_SA_PRIVATE_KEY: process.env.GA_SA_PRIVATE_KEY ? 'configured' : 'not configured'
      }
    };

    return NextResponse.json({
      success: true,
      ...testResult
    });

  } catch (error) {
    console.error('Analytics test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
