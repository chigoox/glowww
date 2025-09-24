/**
 * API Route for Template Recommendations
 * /api/recommendations - Get personalized template recommendations
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/apiAuth';
import { getPersonalizedRecommendations, smartTemplateSearch } from '../../../lib/templateDiscovery';

// GET /api/recommendations - Get personalized recommendations
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const authResult = await requireAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Login required' },
        { status: 401 }
      );
    }

    const limitParam = parseInt(searchParams.get('limit') || '20');
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    const excludeIds = searchParams.get('exclude')?.split(',').filter(Boolean) || [];
    const minQuality = parseInt(searchParams.get('minQuality') || '60');

    const result = await getPersonalizedRecommendations(authResult.user.uid, {
      limit: limitParam,
      categories,
      excludeTemplateIds: excludeIds,
      minQualityScore: minQuality
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      recommendations: result.recommendations,
      userPreferences: result.userPreferences,
      activityPatterns: result.activityPatterns
    });

  } catch (error) {
    console.error('Error in recommendations GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/recommendations/search - Smart template search
export async function POST(request) {
  try {
    const authResult = await requireAuth(request);
    
    const body = await request.json();
    const { query, filters = {}, sortBy = 'relevance', page = 1, limit = 20 } = body;

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const result = await smartTemplateSearch(query, {
      userId: authResult.success ? authResult.user.uid : null,
      filters,
      sortBy,
      page,
      limit
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      results: result.results,
      suggestions: result.suggestions,
      searchMetadata: result.searchMetadata
    });

  } catch (error) {
    console.error('Error in search POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}