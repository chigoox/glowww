/**
 * API endpoints for template marketplace statistics
 * GET /api/admin/templates/stats - Get marketplace statistics and analytics
 */

import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { verifyAdminAccess } from '@/lib/adminAuth';

export async function GET(request) {
  try {
    // Verify admin access
    const authResult = await verifyAdminAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: authResult.error 
      }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (range) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get all templates
    const templatesQuery = collection(db, 'pageTemplates');
    const templatesSnapshot = await getDocs(templatesQuery);
    
    const stats = {
      totalTemplates: 0,
      pendingReview: 0,
      approved: 0,
      rejected: 0,
      featured: 0,
      totalDownloads: 0,
      totalRevenue: 0,
      averageRating: 0,
      totalRatings: 0
    };

    const categoryStats = {};
    const creatorStats = {};
    const performanceData = [];
    let totalRatingSum = 0;

    templatesSnapshot.forEach((doc) => {
      const template = doc.data();
      const createdAt = template.createdAt?.toDate?.() || new Date(template.createdAt);
      
      // Count by status
      stats.totalTemplates++;
      
      switch (template.status) {
        case 'pending':
          stats.pendingReview++;
          break;
        case 'approved':
          stats.approved++;
          break;
        case 'rejected':
          stats.rejected++;
          break;
      }

      if (template.featured) {
        stats.featured++;
      }

      // Accumulate metrics
      stats.totalDownloads += template.downloadCount || 0;
      stats.totalRevenue += template.totalRevenue || 0;
      
      if (template.averageRating) {
        totalRatingSum += template.averageRating * (template.ratingCount || 1);
        stats.totalRatings += template.ratingCount || 1;
      }

      // Category statistics
      const category = template.category || 'Uncategorized';
      if (!categoryStats[category]) {
        categoryStats[category] = {
          count: 0,
          downloads: 0,
          revenue: 0
        };
      }
      categoryStats[category].count++;
      categoryStats[category].downloads += template.downloadCount || 0;
      categoryStats[category].revenue += template.totalRevenue || 0;

      // Creator statistics
      const creator = template.creatorId || 'Unknown';
      if (!creatorStats[creator]) {
        creatorStats[creator] = {
          name: template.creatorName || 'Unknown',
          count: 0,
          downloads: 0,
          revenue: 0
        };
      }
      creatorStats[creator].count++;
      creatorStats[creator].downloads += template.downloadCount || 0;
      creatorStats[creator].revenue += template.totalRevenue || 0;

      // Performance data (simplified - in production you'd want more granular data)
      if (createdAt >= startDate) {
        const dayKey = createdAt.toISOString().split('T')[0];
        const existingDay = performanceData.find(d => d.date === dayKey);
        
        if (existingDay) {
          existingDay.templates++;
          existingDay.downloads += template.downloadCount || 0;
          existingDay.revenue += template.totalRevenue || 0;
        } else {
          performanceData.push({
            date: dayKey,
            templates: 1,
            downloads: template.downloadCount || 0,
            revenue: template.totalRevenue || 0
          });
        }
      }
    });

    // Calculate average rating
    if (stats.totalRatings > 0) {
      stats.averageRating = totalRatingSum / stats.totalRatings;
    }

    // Sort performance data by date
    performanceData.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Convert category stats to array and sort by count
    const categoryStatsArray = Object.entries(categoryStats).map(([category, data]) => ({
      category,
      ...data
    })).sort((a, b) => b.count - a.count);

    // Convert creator stats to array and sort by downloads
    const topCreators = Object.entries(creatorStats).map(([id, data]) => ({
      id,
      ...data
    })).sort((a, b) => b.downloads - a.downloads).slice(0, 10);

    // Get top performing templates
    const topTemplatesQuery = query(
      collection(db, 'pageTemplates'),
      where('status', '==', 'approved'),
      orderBy('downloadCount', 'desc'),
      limit(10)
    );
    const topTemplatesSnapshot = await getDocs(topTemplatesQuery);
    const topTemplates = [];
    
    topTemplatesSnapshot.forEach((doc) => {
      const template = doc.data();
      topTemplates.push({
        id: doc.id,
        name: template.name,
        creatorName: template.creatorName,
        downloadCount: template.downloadCount || 0,
        averageRating: template.averageRating || 0,
        totalRevenue: template.totalRevenue || 0,
        thumbnail: template.thumbnail
      });
    });

    // Get recent templates
    const recentTemplatesQuery = query(
      collection(db, 'pageTemplates'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const recentTemplatesSnapshot = await getDocs(recentTemplatesQuery);
    const recentTemplates = [];
    
    recentTemplatesSnapshot.forEach((doc) => {
      const template = doc.data();
      recentTemplates.push({
        id: doc.id,
        name: template.name,
        creatorName: template.creatorName,
        status: template.status,
        createdAt: template.createdAt?.toDate?.()?.toISOString() || template.createdAt,
        thumbnail: template.thumbnail
      });
    });

    return NextResponse.json({
      success: true,
      stats,
      performanceData,
      categoryStats: categoryStatsArray,
      topCreators,
      topTemplates,
      recentTemplates,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        range
      }
    });

  } catch (error) {
    console.error('Error fetching template stats:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch template statistics' 
    }, { status: 500 });
  }
}