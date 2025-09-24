/**
 * API Route for Template Analytics Dashboard
 * /api/analytics/dashboard - Get comprehensive template analytics (Admin only)
 */

import { NextResponse } from 'next/server';
import { 
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getAggregateFromServer,
  sum,
  average,
  count
} from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { verifyAuth, isAdmin } from '../../../../lib/auth';

// GET /api/analytics/dashboard - Get analytics data
export async function GET(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const authResult = await verifyAuth(token);
    
    if (!authResult.success || !isAdmin(authResult.user)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Generate comprehensive analytics
    const analytics = await generateAnalytics(startDate, endDate);

    return NextResponse.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('Error in analytics dashboard GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateAnalytics(startDate, endDate) {
  try {
    // Date range for queries
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // 1. Overview Statistics
    const overview = await generateOverviewStats();

    // 2. Trending Templates
    const trending = await generateTrendingData();

    // 3. Performance Metrics
    const performance = await generatePerformanceMetrics(start, end);

    // 4. Recommendation Analytics
    const recommendations = await generateRecommendationAnalytics(start, end);

    // 5. User Behavior Analytics
    const userBehavior = await generateUserBehaviorAnalytics(start, end);

    return {
      overview,
      trending,
      performance,
      recommendations,
      userBehavior,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    };

  } catch (error) {
    console.error('Error generating analytics:', error);
    throw error;
  }
}

async function generateOverviewStats() {
  try {
    const templatesRef = collection(db, 'pageTemplates');
    const usersRef = collection(db, 'users');
    
    // Get template count
    const templateSnapshot = await getAggregateFromServer(templatesRef, {
      totalTemplates: count()
    });
    
    // Get approved templates for calculations
    const approvedTemplatesQuery = query(
      templatesRef,
      where('status', '==', 'approved')
    );
    const approvedTemplates = await getDocs(approvedTemplatesQuery);
    
    let totalDownloads = 0;
    let totalViews = 0;
    let totalRating = 0;
    let ratedTemplates = 0;
    
    approvedTemplates.forEach(doc => {
      const data = doc.data();
      totalDownloads += data.downloadCount || 0;
      totalViews += data.viewCount || 0;
      if (data.averageRating && data.averageRating > 0) {
        totalRating += data.averageRating;
        ratedTemplates++;
      }
    });

    // Get active users (simplified - users who logged in in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsersQuery = query(
      usersRef,
      where('lastLogin', '>=', thirtyDaysAgo)
    );
    const activeUsersSnapshot = await getDocs(activeUsersQuery);

    return {
      totalTemplates: templateSnapshot.data().totalTemplates || 0,
      totalDownloads,
      totalViews,
      activeUsers: activeUsersSnapshot.size,
      conversionRate: totalViews > 0 ? ((totalDownloads / totalViews) * 100).toFixed(1) : 0,
      averageRating: ratedTemplates > 0 ? (totalRating / ratedTemplates).toFixed(1) : 0
    };

  } catch (error) {
    console.error('Error generating overview stats:', error);
    return {
      totalTemplates: 0,
      totalDownloads: 0,
      totalViews: 0,
      activeUsers: 0,
      conversionRate: 0,
      averageRating: 0
    };
  }
}

async function generateTrendingData() {
  try {
    // Get top templates by downloads in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const trendingQuery = query(
      collection(db, 'pageTemplates'),
      where('status', '==', 'approved'),
      orderBy('downloadCount', 'desc'),
      limit(15)
    );
    
    const trendingSnapshot = await getDocs(trendingQuery);
    const templates = [];
    
    trendingSnapshot.forEach((doc, index) => {
      const data = doc.data();
      templates.push({
        key: doc.id,
        rank: index + 1,
        name: data.name || 'Untitled Template',
        category: data.category || 'Uncategorized',
        downloads: data.downloadCount || 0,
        rating: data.averageRating || 0,
        conversionRate: data.viewCount > 0 ? Math.round((data.downloadCount / data.viewCount) * 100) : 0,
        trend: Math.floor(Math.random() * 200) - 100, // This would be calculated from historical data
        isPremium: data.isPremium || false,
        thumbnail: data.thumbnailUrl || '/placeholder-template.jpg'
      });
    });

    // Get popular search queries (mock data - would come from analytics collection)
    const searchQueries = [
      { key: '1', query: 'landing page', count: 1247, successRate: 78, avgResults: 23 },
      { key: '2', query: 'portfolio', count: 986, successRate: 82, avgResults: 19 },
      { key: '3', query: 'business card', count: 743, successRate: 91, avgResults: 15 },
      { key: '4', query: 'restaurant menu', count: 567, successRate: 88, avgResults: 12 },
      { key: '5', query: 'blog template', count: 432, successRate: 75, avgResults: 27 }
    ];

    return {
      templates,
      searchQueries
    };

  } catch (error) {
    console.error('Error generating trending data:', error);
    return {
      templates: [],
      searchQueries: []
    };
  }
}

async function generatePerformanceMetrics(startDate, endDate) {
  try {
    // Generate mock performance data
    // In a real implementation, this would query analytics collections
    
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const downloadTrends = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      downloadTrends.push({
        date: date.toISOString().split('T')[0],
        downloads: Math.floor(Math.random() * 500) + 200
      });
    }

    // Category performance
    const categoryPerformance = [
      { category: 'Business', downloads: 12340 },
      { category: 'Creative', downloads: 8765 },
      { category: 'Portfolio', downloads: 6543 },
      { category: 'E-commerce', downloads: 9876 },
      { category: 'Blog', downloads: 4321 }
    ];

    // User engagement
    const userEngagement = [
      { type: 'New Users', value: 35 },
      { type: 'Returning Users', value: 45 },
      { type: 'Power Users', value: 20 }
    ];

    return {
      downloadTrends,
      viewTrends: downloadTrends, // Would be separate in real implementation
      categoryPerformance,
      userEngagement
    };

  } catch (error) {
    console.error('Error generating performance metrics:', error);
    return {
      downloadTrends: [],
      viewTrends: [],
      categoryPerformance: [],
      userEngagement: []
    };
  }
}

async function generateRecommendationAnalytics(startDate, endDate) {
  try {
    // Generate mock recommendation analytics
    // In a real implementation, this would analyze recommendation effectiveness
    
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const effectiveness = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      effectiveness.push(
        { date: dateStr, type: 'Category-based', rate: 60 + Math.random() * 20 },
        { date: dateStr, type: 'Tag-based', rate: 50 + Math.random() * 25 },
        { date: dateStr, type: 'Behavioral', rate: 70 + Math.random() * 15 },
        { date: dateStr, type: 'Collaborative', rate: 55 + Math.random() * 20 }
      );
    }

    const topReasons = [
      { reason: 'Based on your interest in Business templates', usage: 35, successRate: 78 },
      { reason: 'Similar to templates you\'ve used', usage: 28, successRate: 82 },
      { reason: 'Trending in your category', usage: 22, successRate: 71 },
      { reason: 'Recommended by AI', usage: 15, successRate: 85 }
    ];

    return {
      effectiveness,
      userSatisfaction: 82,
      topReasons
    };

  } catch (error) {
    console.error('Error generating recommendation analytics:', error);
    return {
      effectiveness: [],
      userSatisfaction: 0,
      topReasons: []
    };
  }
}

async function generateUserBehaviorAnalytics(startDate, endDate) {
  try {
    // Generate mock user behavior analytics
    
    const searchPatterns = [
      { pattern: 'Category first, then refine', frequency: 45 },
      { pattern: 'Direct template search', frequency: 32 },
      { pattern: 'Browse trending first', frequency: 23 }
    ];

    const downloadPatterns = [
      { pattern: 'Download immediately after viewing', frequency: 38 },
      { pattern: 'Browse multiple, then download', frequency: 42 },
      { pattern: 'Save to favorites first', frequency: 20 }
    ];

    const preferredCategories = [
      { category: 'Business', users: 2840, growthRate: 15 },
      { category: 'Creative', users: 2156, growthRate: 8 },
      { category: 'Portfolio', users: 1892, growthRate: 12 },
      { category: 'E-commerce', users: 1634, growthRate: -3 }
    ];

    const sessionAnalytics = [
      { metric: 'Avg Session Duration', value: '8m 34s', trend: 12, description: 'Time spent browsing templates' },
      { metric: 'Pages per Session', value: '4.2', trend: 5, description: 'Templates viewed per visit' },
      { metric: 'Bounce Rate', value: '32%', trend: -8, description: 'Single-page visits' },
      { metric: 'Download Rate', value: '18%', trend: 15, description: 'Visitors who download templates' }
    ];

    return {
      searchPatterns,
      downloadPatterns,
      preferredCategories,
      sessionAnalytics
    };

  } catch (error) {
    console.error('Error generating user behavior analytics:', error);
    return {
      searchPatterns: [],
      downloadPatterns: [],
      preferredCategories: [],
      sessionAnalytics: []
    };
  }
}