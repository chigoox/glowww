/**
 * API Routes for Template Collections and Discovery System
 * Next.js API routes for managing collections, recommendations, and analytics
 */

import { NextResponse } from 'next/server';
import { 
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { requireAuth } from '../../../lib/apiAuth';
import { getPersonalizedRecommendations } from '../../../lib/templateDiscovery';
import { createTemplateCollection, getTemplateCollections } from '../../../lib/templateCollections';

// GET /api/collections - Get all template collections
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // featured, trending, seasonal, bundle
    const category = searchParams.get('category');
    const featured = searchParams.get('featured') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limitParam = parseInt(searchParams.get('limit') || '20');

    const result = await getTemplateCollections({
      type,
      category,
      featured,
      page,
      limit: limitParam
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      collections: result.collections,
      totalCount: result.totalCount,
      page,
      hasMore: result.hasMore
    });

  } catch (error) {
    console.error('Error in collections GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/collections - Create new template collection (Admin only)
export async function POST(request) {
  try {
    const authResult = await requireAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      templateIds,
      category,
      featured,
      pricing,
      metadata
    } = body;

    // Validate required fields
    if (!name || !description || !type || !templateIds || templateIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, type, templateIds' },
        { status: 400 }
      );
    }

    const result = await createTemplateCollection({
      name,
      description,
      type,
      templateIds,
      category,
      featured,
      pricing,
      metadata,
      createdBy: authResult.user.uid
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      collection: result.collection
    });

  } catch (error) {
    console.error('Error in collections POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}