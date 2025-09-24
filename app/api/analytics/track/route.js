/**
 * API Route for User Interaction Tracking
 * /api/analytics/track - Track user interactions with templates
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '../../../../lib/apiAuth';
import { trackUserInteraction } from '../../../../lib/templateDiscovery';

// POST /api/analytics/track - Track user interaction
export async function POST(request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const authResult = await requireAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Login required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, templateId, collectionId, category, tags, searchQuery, metadata } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Interaction type is required' },
        { status: 400 }
      );
    }

    const result = await trackUserInteraction(authResult.user.uid, {
      type,
      templateId,
      collectionId,
      category,
      tags,
      searchQuery,
      metadata
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Interaction tracked successfully'
    });

  } catch (error) {
    console.error('Error in analytics track POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}