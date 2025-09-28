import { BetaAnalyticsDataClient } from '@google-analytics/data';

// Initialize Google Analytics Data client using your existing env vars
let analyticsDataClient = null;

try {
  if (process.env.GA_ENABLED === 'true' && process.env.GA_SA_CLIENT_EMAIL && process.env.GA_SA_PRIVATE_KEY) {
    // Use your existing Google Analytics service account credentials
    analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: process.env.GA_SA_CLIENT_EMAIL,
        private_key: process.env.GA_SA_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      projectId: process.env.GA_PROJECT_ID,
    });
    
    console.log('✅ Google Analytics Data client initialized successfully');
  } else {
    console.warn('⚠️ Google Analytics not enabled or credentials missing');
  }
} catch (error) {
  console.error('❌ Failed to initialize Google Analytics Data client:', error);
}

/**
 * Get platform-level analytics using your default GA property
 */
export async function getPlatformAnalytics({
  startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  endDate = new Date(),
  metrics = ['screenPageViews', 'activeUsers', 'sessions']
} = {}) {
  if (!analyticsDataClient) {
    throw new Error('Google Analytics Data client not initialized');
  }

  const defaultPropertyId = process.env.GA_PROPERTY_ID;
  if (!defaultPropertyId) {
    throw new Error('GA_PROPERTY_ID not configured in environment variables');
  }

  try {
    console.log(`📊 Fetching platform analytics from GA Property: ${defaultPropertyId}`);
    
    const result = await getAnalyticsData({
      propertyId: defaultPropertyId,
      startDate,
      endDate,
      metrics
    });

    if (result.success) {
      return {
        success: true,
        totalPageViews: result.processedMetrics.screenPageViews || 0,
        totalUsers: result.processedMetrics.activeUsers || 0,
        totalSessions: result.processedMetrics.sessions || 0,
        propertyId: defaultPropertyId,
        source: 'google-analytics'
      };
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error fetching platform analytics:', error);
    return {
      success: false,
      error: error.message,
      totalPageViews: 0,
      totalUsers: 0,
      totalSessions: 0,
      source: 'error'
    };
  }
}

/**
 * Test platform Google Analytics connection using your default property
 */
export async function testPlatformAnalyticsConnection() {
  const defaultPropertyId = process.env.GA_PROPERTY_ID;
  if (!defaultPropertyId) {
    return {
      success: false,
      connected: false,
      error: 'GA_PROPERTY_ID not configured in environment variables'
    };
  }

  return await testGoogleAnalyticsConnection(defaultPropertyId);
}

/**
 * Get analytics data for the entire platform using a single property ID
 * @param {Date} startDate - Start date for the report
 * @param {Date} endDate - End date for the report
 * @param {Object} options - Additional options like site filtering
 */
export async function getPlatformAnalyticsData({
  startDate,
  endDate,
  siteId = null, // Optional: filter by specific site
  userId = null, // Optional: filter by specific user
  metrics = ['screenPageViews', 'activeUsers', 'sessions'],
  dimensions = []
}) {
  if (!analyticsDataClient || !propertyId) {
    throw new Error('Google Analytics Data client or property ID not configured');
  }

  try {
    const reportConfig = {
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: formatDateForGA(startDate),
          endDate: formatDateForGA(endDate),
        },
      ],
      metrics: metrics.map(name => ({ name })),
      dimensions: dimensions.map(name => ({ name })),
    };

    // Add dimension filters if filtering by site or user
    if (siteId || userId) {
      reportConfig.dimensionFilter = {
        andGroup: {
          expressions: []
        }
      };

      if (siteId) {
        reportConfig.dimensionFilter.andGroup.expressions.push({
          filter: {
            fieldName: 'customEvent:site_id', // You'll need to send this as custom dimension
            stringFilter: {
              matchType: 'EXACT',
              value: siteId
            }
          }
        });
      }

      if (userId) {
        reportConfig.dimensionFilter.andGroup.expressions.push({
          filter: {
            fieldName: 'customEvent:user_id', // You'll need to send this as custom dimension
            stringFilter: {
              matchType: 'EXACT',
              value: userId
            }
          }
        });
      }
    }

    const [response] = await analyticsDataClient.runReport(reportConfig);

    return {
      success: true,
      data: response,
      processedMetrics: processMetricsResponse(response, metrics)
    };
  } catch (error) {
    console.error('Error fetching Google Analytics data:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
}

/**
 * Get analytics data broken down by site (using custom dimensions)
 * @param {Date} startDate - Start date for the report
 * @param {Date} endDate - End date for the report
 */
export async function getPlatformAnalyticsBySite(startDate, endDate) {
  if (!analyticsDataClient || !propertyId) {
    throw new Error('Google Analytics Data client or property ID not configured');
  }

  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: formatDateForGA(startDate),
          endDate: formatDateForGA(endDate),
        },
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'sessions' }
      ],
      dimensions: [
        { name: 'customEvent:site_id' }, // Custom dimension for site ID
        { name: 'customEvent:user_id' }, // Custom dimension for user ID
        { name: 'customEvent:site_name' } // Custom dimension for site name
      ],
      limit: 100 // Adjust based on number of sites
    });

    // Process the response to group by site
    const siteBreakdown = [];
    let totalPageViews = 0;
    let totalUsers = 0;
    let totalSessions = 0;

    if (response.rows) {
      response.rows.forEach(row => {
        const siteId = row.dimensionValues[0]?.value;
        const userId = row.dimensionValues[1]?.value;
        const siteName = row.dimensionValues[2]?.value;
        const pageViews = parseInt(row.metricValues[0]?.value || 0);
        const users = parseInt(row.metricValues[1]?.value || 0);
        const sessions = parseInt(row.metricValues[2]?.value || 0);

        if (siteId && siteId !== '(not set)') {
          siteBreakdown.push({
            siteId,
            userId,
            siteName,
            pageViews,
            users,
            sessions
          });

          totalPageViews += pageViews;
          totalUsers += users;
          totalSessions += sessions;
        }
      });
    }

    // If no custom dimensions data, get totals without breakdown
    if (siteBreakdown.length === 0 && response.totals) {
      totalPageViews = parseInt(response.totals[0]?.metricValues[0]?.value || 0);
      totalUsers = parseInt(response.totals[0]?.metricValues[1]?.value || 0);
      totalSessions = parseInt(response.totals[0]?.metricValues[2]?.value || 0);
    }

    return {
      success: true,
      totalPageViews,
      totalUsers,
      totalSessions,
      siteBreakdown,
      hasCustomDimensions: siteBreakdown.length > 0
    };

  } catch (error) {
    console.error('Error fetching site breakdown analytics:', error);
    return {
      success: false,
      error: error.message,
      totalPageViews: 0,
      totalUsers: 0,
      totalSessions: 0,
      siteBreakdown: [],
      hasCustomDimensions: false
    };
  }
}

/**
 * Get real-time analytics data for the platform
 */
export async function getPlatformRealtimeData() {
  if (!analyticsDataClient || !propertyId) {
    throw new Error('Google Analytics Data client or property ID not configured');
  }

  try {
    const [response] = await analyticsDataClient.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' }
      ],
      dimensions: [
        { name: 'country' },
        { name: 'city' }
      ]
    });

    return {
      success: true,
      data: response,
      activeUsers: response.totals?.[0]?.metricValues?.[0]?.value || 0,
      currentPageViews: response.totals?.[0]?.metricValues?.[1]?.value || 0
    };
  } catch (error) {
    console.error('Error fetching real-time Google Analytics data:', error);
    return {
      success: false,
      error: error.message,
      activeUsers: 0,
      currentPageViews: 0
    };
  }
}

/**
 * Test Google Analytics connection using the configured property
 */
export async function testPlatformGoogleAnalyticsConnection() {
  if (!propertyId) {
    return {
      success: false,
      connected: false,
      error: 'No GA_PROPERTY_ID configured in environment variables'
    };
  }

  try {
    const result = await getPlatformAnalyticsData({
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endDate: new Date(),
      metrics: ['screenPageViews'],
      dimensions: []
    });

    return {
      success: result.success,
      connected: result.success,
      error: result.error || null,
      propertyId: propertyId
    };
  } catch (error) {
    return {
      success: false,
      connected: false,
      error: error.message,
      propertyId: propertyId
    };
  }
}

// Helper functions
function formatDateForGA(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

function processMetricsResponse(response, requestedMetrics) {
  const processed = {};
  
  if (response.totals && response.totals.length > 0) {
    const totals = response.totals[0];
    requestedMetrics.forEach((metric, index) => {
      processed[metric] = parseInt(totals.metricValues[index].value) || 0;
    });
  }

  return processed;
}

/**
 * Get available properties for the authenticated account
 */
export async function listAvailableProperties() {
  if (!analyticsDataClient) {
    throw new Error('Google Analytics Data client not initialized');
  }

  try {
    // Note: This requires the Google Analytics Admin API, not Data API
    // For now, we'll return a helper message
    return {
      success: false,
      message: 'Property listing requires Google Analytics Admin API. Please manually configure property IDs.',
      availableProperties: []
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      availableProperties: []
    };
  }
}

/**
 * Test Google Analytics connection for a specific property
 */
export async function testGoogleAnalyticsConnection(propertyId) {
  if (!analyticsDataClient) {
    return {
      success: false,
      connected: false,
      error: 'Google Analytics Data client not initialized'
    };
  }

  if (!propertyId) {
    return {
      success: false,
      connected: false,
      error: 'Property ID is required'
    };
  }

  try {
    // Try to get basic data for the last 7 days as a connection test
    const result = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '7daysAgo',
          endDate: 'today',
        },
      ],
      metrics: [{ name: 'screenPageViews' }],
    });

    return {
      success: true,
      connected: true,
      propertyId: propertyId,
      testResult: result
    };
  } catch (error) {
    return {
      success: false,
      connected: false,
      error: error.message,
      propertyId: propertyId
    };
  }
}

/**
 * Get data from multiple Google Analytics properties
 */
export async function getMultiplePropertiesData(propertyIds, options = {}) {
  if (!analyticsDataClient) {
    throw new Error('Google Analytics Data client not initialized');
  }

  if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
    throw new Error('Property IDs array is required and must not be empty');
  }

  const {
    startDate = '7daysAgo',
    endDate = 'today',
    metrics = ['screenPageViews', 'activeUsers', 'sessions'],
    dimensions = []
  } = options;

  const results = {};

  for (const propertyId of propertyIds) {
    try {
      const data = await getAnalyticsData({
        propertyId,
        startDate: new Date(startDate === '7daysAgo' ? Date.now() - 7 * 24 * 60 * 60 * 1000 : startDate),
        endDate: new Date(endDate === 'today' ? Date.now() : endDate),
        metrics,
        dimensions
      });

      results[propertyId] = {
        success: true,
        data: data
      };
    } catch (error) {
      results[propertyId] = {
        success: false,
        error: error.message
      };
    }
  }

  return {
    success: true,
    properties: results,
    totalProperties: propertyIds.length
  };
}
