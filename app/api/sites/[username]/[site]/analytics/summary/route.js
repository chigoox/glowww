import { NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

// Ensure Node runtime for GA Data API
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Expects env:
// GA_PROPERTY_ID: e.g. 'properties/123456789'
// GA_SA_CLIENT_EMAIL, GA_SA_PRIVATE_KEY

function getGaClient() {
  // Accept either a raw numeric ID (e.g. 123456789) or full path (properties/123456789)
  const rawProperty = process.env.GA_PROPERTY_ID;
  const clientEmail = process.env.GA_SA_CLIENT_EMAIL;
  const privateKey = (process.env.GA_SA_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const projectId = process.env.GA_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  
  if (!rawProperty || !clientEmail || !privateKey) {
    console.log('Missing GA credentials:', { 
      hasProperty: !!rawProperty, 
      hasEmail: !!clientEmail, 
      hasKey: !!privateKey,
      hasProject: !!projectId
    });
    return null;
  }
  
  const propertyId = String(rawProperty).startsWith('properties/')
    ? String(rawProperty)
    : `properties/${String(rawProperty).trim()}`;
    
  try {
    const client = new BetaAnalyticsDataClient({
      projectId: projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
        type: 'service_account',
        project_id: projectId,
      },
    });
    return { client, propertyId };
  } catch (error) {
    console.error('Failed to create GA client:', error);
    return null;
  }
}

export async function GET(req, { params }) {
  try {
    // Next.js 15+ requires awaiting params
    const resolvedParams = await params;
    const { username, site } = resolvedParams || {};
    const ga = getGaClient();
    if (!ga) {
      console.log('GA client initialization failed - check credentials');
      return NextResponse.json({ ok: false, error: 'GA credentials missing or invalid' }, { status: 500 });
    }

    const propertyId = ga.propertyId;
    const client = ga.client;

    console.log('GA Analytics request:', { username, site, propertyId });

    const endDate = 'today';
    const startDate = '30daysAgo';

    // Filters using user_properties set on hits
    const filter = {
      andGroup: {
        expressions: [
          { filter: { fieldName: 'customUser:username', stringFilter: { value: String(username) } } },
          { filter: { fieldName: 'customUser:site_name', stringFilter: { value: String(site) } } },
        ],
      },
    };

  // 1) Total page_views (using event name page_view) - Start with a simple query first
    let totalViews = 0;
    try {
      const [eventsAgg] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        // Remove filters initially to test basic connectivity
      });

      totalViews = (eventsAgg.rows || [])
        .filter((r) => r.dimensionValues?.[0]?.value === 'page_view')
        .reduce((sum, r) => sum + Number(r.metricValues?.[0]?.value || 0), 0);
    } catch (error) {
      console.error('Error fetching total views:', error);
      totalViews = 0;
    }

  // 2) 30-day time series of page_view by date - Basic query without filters
    let series = [];
    try {
      const [timeseries] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', stringFilter: { value: 'page_view' } }
        },
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      });

      series = (timeseries.rows || []).map((r) => ({
        date: r.dimensionValues?.[0]?.value,
        views: Number(r.metricValues?.[0]?.value || 0),
      }));
    } catch (error) {
      console.error('Error fetching time series:', error);
      series = [];
    }

    // 3) KPIs: users, sessions, engagement - Basic metrics without filters
    let kpis = { totalUsers: 0, newUsers: 0, sessions: 0, engagedSessions: 0, engagementRate: 0, averageSessionDuration: 0, bounceRate: 0 };
    try {
      const [kpiRes] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        // No dimensions = totals
        metrics: [
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'engagedSessions' },
          { name: 'engagementRate' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' }
        ],
        // Remove filter initially to test basic connectivity
      });
      const mv = (kpiRes.rows?.[0]?.metricValues) || [];
      kpis = {
        totalUsers: Number(mv?.[0]?.value || 0),
        newUsers: Number(mv?.[1]?.value || 0),
        sessions: Number(mv?.[2]?.value || 0),
        engagedSessions: Number(mv?.[3]?.value || 0),
        engagementRate: Number(mv?.[4]?.value || 0),
        averageSessionDuration: Number(mv?.[5]?.value || 0),
        bounceRate: Number(mv?.[6]?.value || 0),
      };
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }

    // 4) Top pages (by title) for page_view - Basic query
    let pages = [];
    try {
      const [topPages] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pageTitle' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', stringFilter: { value: 'page_view' } }
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 10,
      });
      pages = (topPages.rows || []).map(r => ({
        title: r.dimensionValues?.[0]?.value || '(untitled)',
        views: Number(r.metricValues?.[0]?.value || 0)
      }));
    } catch (error) {
      console.error('Error fetching top pages:', error);
    }

    // 5) Devices breakdown for page_view - Basic query  
    let devices = [];
    try {
      const [dev] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', stringFilter: { value: 'page_view' } }
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      });
      devices = (dev.rows || []).map(r => ({
        category: r.dimensionValues?.[0]?.value || 'unknown',
        views: Number(r.metricValues?.[0]?.value || 0)
      }));
    } catch (error) {
      console.error('Error fetching device data:', error);
    }

    // Simplified return with basic data - skip complex queries for now
    return NextResponse.json({
      ok: true,
      totalViews,
      series,
      kpis,
      pages,
      devices,
      countries: [], // Skip complex geo queries for now
      traffic: [],   // Skip traffic source queries for now
      events: [],    // Skip events breakdown for now
      items: [],     // Skip item tracking for now
      referrers: [], // Skip referrer tracking for now
    });
  } catch (e) {
    // Graceful fallback: return empty analytics with error message to avoid 500s in UI
    console.error('Analytics summary error:', e);
    return NextResponse.json({
      ok: false,
      error: e?.message || 'Failed to fetch analytics',
      totalViews: 0,
      series: [],
      kpis: {
        totalUsers: 0,
        newUsers: 0,
        sessions: 0,
        engagedSessions: 0,
        engagementRate: 0,
        averageSessionDuration: 0,
        bounceRate: 0,
      },
      pages: [],
      devices: [],
      countries: [],
      traffic: [],
      events: [],
      items: [],
      referrers: [],
    }, { status: 200 });
  }
}
