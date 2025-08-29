import { BetaAnalyticsDataClient } from '@google-analytics/data';

// Initialize Google Analytics Data client using your existing env vars
let analyticsDataClient = null;
let propertyId = process.env.GA_PROPERTY_ID;

try {
  if (process.env.GA_ENABLED === 'true' && process.env.GA_SA_CLIENT_EMAIL && process.env.GA_SA_PRIVATE_KEY) {
    analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: process.env.GA_SA_CLIENT_EMAIL,
        private_key: process.env.GA_SA_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      projectId: process.env.GA_PROJECT_ID,
    });
    
    console.log('✅ User Analytics client initialized successfully');
  } else {
    console.warn('⚠️ Google Analytics not enabled or credentials missing');
  }
} catch (error) {
  console.error('❌ Failed to initialize User Analytics client:', error);
}

/**
 * Get analytics data for a specific user's sites
 */
export async function getUserAnalytics({
  userId,
  startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate = new Date(),
  metrics = ['screenPageViews', 'activeUsers', 'sessions']
}) {
  if (!analyticsDataClient || !propertyId) {
    return {
      success: false,
      error: 'Google Analytics not configured',
      data: null
    };
  }

  try {
    console.log(`📊 Fetching analytics for user: ${userId}`);
    
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: formatDateForGA(startDate),
          endDate: formatDateForGA(endDate),
        },
      ],
      metrics: metrics.map(name => ({ name })),
      dimensions: [
        { name: 'customEvent:user_id' },
        { name: 'customEvent:site_id' },
        { name: 'customEvent:site_name' },
        { name: 'date' }
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'customEvent:user_id',
          stringFilter: {
            matchType: 'EXACT',
            value: userId
          }
        }
      },
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 1000
    });

    // Process the response
    const sites = new Map();
    const dailyData = new Map();
    let totalPageViews = 0;
    let totalUsers = 0;
    let totalSessions = 0;

    if (response.rows) {
      response.rows.forEach(row => {
        const userIdDim = row.dimensionValues[0]?.value;
        const siteId = row.dimensionValues[1]?.value;
        const siteName = row.dimensionValues[2]?.value;
        const date = row.dimensionValues[3]?.value;
        
        const pageViews = parseInt(row.metricValues[0]?.value || 0);
        const users = parseInt(row.metricValues[1]?.value || 0);
        const sessions = parseInt(row.metricValues[2]?.value || 0);

        if (siteId && siteId !== '(not set)') {
          // Aggregate by site
          if (!sites.has(siteId)) {
            sites.set(siteId, {
              siteId,
              siteName: siteName || 'Untitled',
              pageViews: 0,
              users: 0,
              sessions: 0
            });
          }
          
          const site = sites.get(siteId);
          site.pageViews += pageViews;
          site.users += users;
          site.sessions += sessions;
          
          // Track daily data for charts
          const dayKey = `${date}_${siteId}`;
          if (!dailyData.has(dayKey)) {
            dailyData.set(dayKey, {
              date,
              siteId,
              siteName: siteName || 'Untitled',
              pageViews,
              users,
              sessions
            });
          }
        }

        totalPageViews += pageViews;
        totalUsers += users;
        totalSessions += sessions;
      });
    }

    return {
      success: true,
      userId,
      totalPageViews,
      totalUsers,
      totalSessions,
      sites: Array.from(sites.values()),
      dailyData: Array.from(dailyData.values()),
      hasCustomDimensions: sites.size > 0,
      dataSource: 'google-analytics'
    };

  } catch (error) {
    console.error(`Error fetching user analytics for ${userId}:`, error);
    return {
      success: false,
      error: error.message,
      userId,
      totalPageViews: 0,
      totalUsers: 0,
      totalSessions: 0,
      sites: [],
      dailyData: [],
      hasCustomDimensions: false,
      dataSource: 'error'
    };
  }
}

/**
 * Get analytics data for a specific site
 */
export async function getSiteAnalytics({
  siteId,
  userId,
  startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate = new Date(),
  metrics = ['screenPageViews', 'activeUsers', 'sessions']
}) {
  if (!analyticsDataClient || !propertyId) {
    return {
      success: false,
      error: 'Google Analytics not configured',
      data: null
    };
  }

  try {
    console.log(`📊 Fetching analytics for site: ${siteId} (user: ${userId})`);
    
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: formatDateForGA(startDate),
          endDate: formatDateForGA(endDate),
        },
      ],
      metrics: metrics.map(name => ({ name })),
      dimensions: [
        { name: 'date' },
        { name: 'country' },
        { name: 'deviceCategory' }
      ],
      dimensionFilter: {
        andGroup: {
          expressions: [
            {
              filter: {
                fieldName: 'customEvent:site_id',
                stringFilter: {
                  matchType: 'EXACT',
                  value: siteId
                }
              }
            },
            {
              filter: {
                fieldName: 'customEvent:user_id',
                stringFilter: {
                  matchType: 'EXACT',
                  value: userId
                }
              }
            }
          ]
        }
      },
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 1000
    });

    // Process the response
    const dailyData = [];
    const countries = new Map();
    const devices = new Map();
    let totalPageViews = 0;
    let totalUsers = 0;
    let totalSessions = 0;

    if (response.rows) {
      response.rows.forEach(row => {
        const date = row.dimensionValues[0]?.value;
        const country = row.dimensionValues[1]?.value;
        const device = row.dimensionValues[2]?.value;
        
        const pageViews = parseInt(row.metricValues[0]?.value || 0);
        const users = parseInt(row.metricValues[1]?.value || 0);
        const sessions = parseInt(row.metricValues[2]?.value || 0);

        // Daily data
        const existingDay = dailyData.find(d => d.date === date);
        if (existingDay) {
          existingDay.pageViews += pageViews;
          existingDay.users += users;
          existingDay.sessions += sessions;
        } else {
          dailyData.push({
            date,
            pageViews,
            users,
            sessions
          });
        }

        // Country data
        if (country && country !== '(not set)') {
          if (!countries.has(country)) {
            countries.set(country, { country, pageViews: 0, users: 0, sessions: 0 });
          }
          const countryData = countries.get(country);
          countryData.pageViews += pageViews;
          countryData.users += users;
          countryData.sessions += sessions;
        }

        // Device data
        if (device && device !== '(not set)') {
          if (!devices.has(device)) {
            devices.set(device, { device, pageViews: 0, users: 0, sessions: 0 });
          }
          const deviceData = devices.get(device);
          deviceData.pageViews += pageViews;
          deviceData.users += users;
          deviceData.sessions += sessions;
        }

        totalPageViews += pageViews;
        totalUsers += users;
        totalSessions += sessions;
      });
    }

    return {
      success: true,
      siteId,
      userId,
      totalPageViews,
      totalUsers,
      totalSessions,
      dailyData: dailyData.sort((a, b) => new Date(a.date) - new Date(b.date)),
      topCountries: Array.from(countries.values())
        .sort((a, b) => b.pageViews - a.pageViews)
        .slice(0, 10),
      deviceBreakdown: Array.from(devices.values())
        .sort((a, b) => b.pageViews - a.pageViews),
      hasData: totalPageViews > 0,
      dataSource: 'google-analytics'
    };

  } catch (error) {
    console.error(`Error fetching site analytics for ${siteId}:`, error);
    return {
      success: false,
      error: error.message,
      siteId,
      userId,
      totalPageViews: 0,
      totalUsers: 0,
      totalSessions: 0,
      dailyData: [],
      topCountries: [],
      deviceBreakdown: [],
      hasData: false,
      dataSource: 'error'
    };
  }
}

/**
 * Get real-time analytics for a user's sites
 */
export async function getUserRealtimeAnalytics(userId) {
  if (!analyticsDataClient || !propertyId) {
    return {
      success: false,
      error: 'Google Analytics not configured',
      data: null
    };
  }

  try {
    const [response] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' }
      ],
      dimensions: [
        { name: 'customEvent:site_id' },
        { name: 'customEvent:site_name' }
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'customEvent:user_id',
          stringFilter: {
            matchType: 'EXACT',
            value: userId
          }
        }
      }
    });

    const sites = [];
    let totalActiveUsers = 0;
    let totalCurrentViews = 0;

    if (response.rows) {
      response.rows.forEach(row => {
        const siteId = row.dimensionValues[0]?.value;
        const siteName = row.dimensionValues[1]?.value;
        const activeUsers = parseInt(row.metricValues[0]?.value || 0);
        const currentViews = parseInt(row.metricValues[1]?.value || 0);

        if (siteId && siteId !== '(not set)') {
          sites.push({
            siteId,
            siteName: siteName || 'Untitled',
            activeUsers,
            currentViews
          });
        }

        totalActiveUsers += activeUsers;
        totalCurrentViews += currentViews;
      });
    }

    return {
      success: true,
      userId,
      totalActiveUsers,
      totalCurrentViews,
      sites: sites.sort((a, b) => b.activeUsers - a.activeUsers),
      hasData: totalActiveUsers > 0,
      timestamp: new Date()
    };

  } catch (error) {
    console.error(`Error fetching realtime analytics for ${userId}:`, error);
    return {
      success: false,
      error: error.message,
      userId,
      totalActiveUsers: 0,
      totalCurrentViews: 0,
      sites: [],
      hasData: false,
      timestamp: new Date()
    };
  }
}

/**
 * Generate analytics tracking code for a site
 */
export function generateSiteTrackingCode({
  siteId,
  userId,
  siteName,
  gaPropertyId = propertyId
}) {
  if (!gaPropertyId) {
    return null;
  }

  return `
<!-- Google Analytics 4 (Platform Tracking) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${gaPropertyId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${gaPropertyId}', {
    custom_map: {
      'custom_dimension_1': 'site_id',
      'custom_dimension_2': 'user_id',
      'custom_dimension_3': 'site_name'
    }
  });

  // Send custom dimensions with page views
  gtag('event', 'page_view', {
    site_id: '${siteId}',
    user_id: '${userId}',
    site_name: '${siteName}'
  });

  // Track custom events with site context
  window.trackSiteEvent = function(eventName, parameters = {}) {
    gtag('event', eventName, {
      site_id: '${siteId}',
      user_id: '${userId}',
      site_name: '${siteName}',
      ...parameters
    });
  };
</script>
  `.trim();
}

// Helper functions
function formatDateForGA(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Check if analytics should be enabled for a site
 */
export function shouldEnableAnalytics(siteData) {
  // Check if GA is configured on platform
  if (!propertyId || process.env.GA_ENABLED !== 'true') {
    return false;
  }
  
  // Check if analytics is disabled for this specific site
  if (siteData?.analyticsEnabled === false) {
    return false;
  }
  
  // Default to enabled for all sites
  return true;
}

/**
 * Get analytics setup status for a user
 */
export function getAnalyticsSetupStatus() {
  return {
    isConfigured: !!(analyticsDataClient && propertyId),
    propertyId: propertyId || null,
    hasCustomDimensions: true, // We support custom dimensions
    trackingCodeAvailable: !!propertyId,
    autoInjectionEnabled: !!propertyId, // Automatic injection is available
    instructions: {
      step1: 'Analytics tracking is automatically added to all new sites',
      step2: 'No manual setup required - tracking starts immediately',
      step3: 'Analytics data will appear within 24-48 hours'
    }
  };
}
