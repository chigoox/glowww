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
  if (!rawProperty || !clientEmail || !privateKey) return null;
  const propertyId = String(rawProperty).startsWith('properties/')
    ? String(rawProperty)
    : `properties/${String(rawProperty).trim()}`;
  const client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
  return { client, propertyId };
}

export async function GET(req, { params }) {
  try {
    const { username, site } = params || {};
    const ga = getGaClient();
    if (!ga) {
      return NextResponse.json({ ok: false, error: 'GA credentials missing' }, { status: 500 });
    }

    const propertyId = ga.propertyId;
    const client = ga.client;

    const endDate = 'today';
    const startDate = '30daysAgo';

    // Filters using user_properties set on hits
    const filter = {
      andGroup: {
        expressions: [
          { filter: { fieldName: 'user.property.username', stringFilter: { value: String(username) } } },
          { filter: { fieldName: 'user.property.site_name', stringFilter: { value: String(site) } } },
        ],
      },
    };

  // 1) Total page_views (using event name page_view)
    const [eventsAgg] = await client.runReport({
      property: propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: filter,
    });

    const totalViews = (eventsAgg.rows || [])
      .filter((r) => r.dimensionValues?.[0]?.value === 'page_view')
      .reduce((sum, r) => sum + Number(r.metricValues?.[0]?.value || 0), 0);

  // 2) 30-day time series of page_view by date
    const [timeseries] = await client.runReport({
      property: propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: 'user.property.username', stringFilter: { value: String(username) } } },
            { filter: { fieldName: 'user.property.site_name', stringFilter: { value: String(site) } } },
            { filter: { fieldName: 'eventName', stringFilter: { value: 'page_view' } } },
          ],
        },
      },
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    const series = (timeseries.rows || []).map((r) => ({
      date: r.dimensionValues?.[0]?.value,
      views: Number(r.metricValues?.[0]?.value || 0),
    }));

    // 3) KPIs: users, sessions, engagement
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
        dimensionFilter: filter,
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
    } catch {}

    // 4) Top pages (by title) for page_view
    let pages = [];
    try {
      const [topPages] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pageTitle' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              { filter: { fieldName: 'user.property.username', stringFilter: { value: String(username) } } },
              { filter: { fieldName: 'user.property.site_name', stringFilter: { value: String(site) } } },
              { filter: { fieldName: 'eventName', stringFilter: { value: 'page_view' } } },
            ],
          },
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 10,
      });
      pages = (topPages.rows || []).map(r => ({
        title: r.dimensionValues?.[0]?.value || '(untitled)',
        views: Number(r.metricValues?.[0]?.value || 0)
      }));
    } catch {}

    // 5) Devices breakdown for page_view
    let devices = [];
    try {
      const [dev] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              { filter: { fieldName: 'user.property.username', stringFilter: { value: String(username) } } },
              { filter: { fieldName: 'user.property.site_name', stringFilter: { value: String(site) } } },
              { filter: { fieldName: 'eventName', stringFilter: { value: 'page_view' } } },
            ],
          },
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      });
      devices = (dev.rows || []).map(r => ({
        category: r.dimensionValues?.[0]?.value || 'unknown',
        views: Number(r.metricValues?.[0]?.value || 0)
      }));
    } catch {}

    // 6) Countries breakdown for page_view
    let countries = [];
    try {
      const [geo] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              { filter: { fieldName: 'user.property.username', stringFilter: { value: String(username) } } },
              { filter: { fieldName: 'user.property.site_name', stringFilter: { value: String(site) } } },
              { filter: { fieldName: 'eventName', stringFilter: { value: 'page_view' } } },
            ],
          },
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 10,
      });
      countries = (geo.rows || []).map(r => ({
        country: r.dimensionValues?.[0]?.value || 'unknown',
        views: Number(r.metricValues?.[0]?.value || 0)
      }));
    } catch {}

    // 7) Traffic sources (sessions) by sessionSourceMedium
    let traffic = [];
    try {
      const [src] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionSourceMedium' }],
        metrics: [{ name: 'sessions' }],
        dimensionFilter: filter,
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      });
      traffic = (src.rows || []).map(r => ({
        sourceMedium: r.dimensionValues?.[0]?.value || '(direct) / (none)',
        sessions: Number(r.metricValues?.[0]?.value || 0)
      }));
    } catch {}

    // 8) Events breakdown (top events incl. custom)
    let events = [];
    try {
      const [ev] = await client.runReport({
        property: propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: filter,
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 15,
      });
      events = (ev.rows || []).map(r => ({
        event: r.dimensionValues?.[0]?.value || 'unknown',
        count: Number(r.metricValues?.[0]?.value || 0)
      }));
    } catch {}

    // 9) Top items by view_item
    const [topItems] = await client.runReport({
      property: propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'itemId' }, { name: 'itemName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: 'user.property.username', stringFilter: { value: String(username) } } },
            { filter: { fieldName: 'user.property.site_name', stringFilter: { value: String(site) } } },
            { filter: { fieldName: 'eventName', stringFilter: { value: 'view_item' } } },
          ],
        },
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 10,
    });

    const items = (topItems.rows || []).map((r) => ({
      item_id: r.dimensionValues?.[0]?.value,
      item_name: r.dimensionValues?.[1]?.value,
      views: Number(r.metricValues?.[0]?.value || 0),
    }));

  // 10) Top referrers based on page_referrer
    const [referrers] = await client.runReport({
      property: propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pageReferrer' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: 'user.property.username', stringFilter: { value: String(username) } } },
            { filter: { fieldName: 'user.property.site_name', stringFilter: { value: String(site) } } },
            { filter: { fieldName: 'eventName', stringFilter: { value: 'page_view' } } },
          ],
        },
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 10,
    });

    const topReferrers = (referrers.rows || []).map((r) => ({
      referrer: r.dimensionValues?.[0]?.value || '(direct)',
      views: Number(r.metricValues?.[0]?.value || 0),
    }));

    return NextResponse.json({
      ok: true,
      totalViews,
      series,
      // New KPIs and breakdowns
      kpis,
      pages,
      devices,
      countries,
      traffic,
      events,
      // Existing fields kept for backward compatibility
      items,
      referrers: topReferrers,
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
