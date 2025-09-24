/**
 * Template Marketplace API Endpoints
 * Handles all template marketplace operations with authentication
 */

import { NextResponse } from 'next/server';
import { 
  saveTemplate, 
  getTemplates, 
  rateTemplate, 
  addTemplateComment, 
  trackTemplateUsage,
  getQualityTemplatesForAI,
  updateTemplateMarketplace
} from '../../../lib/templateMarketplace';
import { requireAuth } from '../../../lib/apiAuth';

/**
 * GET /api/templates - Get templates with filtering
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'list':
        return await handleGetTemplates(request);
      case 'quality':
        return await handleGetQualityTemplates(request);
      case 'track-view':
        return await handleTrackView(request);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Template API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/templates - Handle POST requests
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'save':
        return await handleSaveTemplate(request);
      case 'rate':
        return await handleRateTemplate(request);
      case 'comment':
        return await handleAddComment(request);
      case 'track-usage':
        return await handleTrackUsage(request);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Template API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/templates - Handle PUT requests
 */
export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'update':
        return await handleUpdateTemplate(request);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Template API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get templates with filtering
 */
async function handleGetTemplates(request) {
  const { searchParams } = new URL(request.url);
  
  const category = searchParams.get('category');
  const type = searchParams.get('type');
  const userId = searchParams.get('userId');
  const onlyQuality = searchParams.get('onlyQuality') === 'true';
  const onlyFeatured = searchParams.get('onlyFeatured') === 'true';
  const searchQuery = searchParams.get('searchQuery');
  const sortBy = searchParams.get('sortBy') || 'newest';
  const limit = searchParams.get('limit') || '20';
  const cursor = searchParams.get('cursor');

  const options = {
    category,
    type,
    userId,
    onlyQuality,
    onlyFeatured,
    searchQuery,
    sortBy,
    limitCount: parseInt(limit),
    lastDoc: cursor ? JSON.parse(cursor) : null
  };

  const result = await getTemplates(options);
  
  if (result.success) {
    return NextResponse.json({
      success: true,
      templates: result.templates,
      nextCursor: result.lastDoc ? JSON.stringify(result.lastDoc) : null
    });
  }

  return NextResponse.json(result, { status: 500 });
}

/**
 * Get quality templates for AI usage
 */
async function handleGetQualityTemplates(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  
  const result = await getQualityTemplatesForAI(category);
  
  if (result.success) {
    return NextResponse.json({
      success: true,
      templates: result.templates.map(template => ({
        id: template.id,
        name: template.name,
        category: template.category,
        tags: template.tags,
        thumbnail: template.thumbnail,
        jsonData: template.jsonData,
        aiMetadata: template.aiMetadata,
        qualityScore: template.qualityScore,
        averageRating: template.averageRating,
        totalRatings: template.totalRatings
      }))
    });
  }

  return NextResponse.json(result, { status: 500 });
}

/**
 * Save new template
 */
async function handleSaveTemplate(request) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    description,
    category,
    tags,
    jsonData,
    thumbnail,
    previewImages,
    type,
    price,
    isListed,
    aiMetadata
  } = body;

  // Validation
  if (!name || !description || !category || !jsonData) {
    return NextResponse.json({ 
      error: 'Missing required fields: name, description, category, jsonData' 
    }, { status: 400 });
  }

  const templateData = {
    name: name.trim(),
    description: description.trim(),
    category,
    tags: Array.isArray(tags) ? tags : [],
    jsonData,
    thumbnail,
    previewImages: Array.isArray(previewImages) ? previewImages : [],
    createdBy: authResult.user.uid,
    creatorDisplayName: authResult.user.email,
    type: type || 'free',
    price: parseFloat(price) || 0,
    isListed: Boolean(isListed),
    aiMetadata: aiMetadata || {}
  };

  const result = await saveTemplate(templateData);
  
  if (result.success) {
    return NextResponse.json({
      success: true,
      templateId: result.id,
      message: 'Template saved successfully'
    }, { status: 201 });
  }

  return NextResponse.json(result, { status: 500 });
}

/**
 * Rate template
 */
async function handleRateTemplate(request) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { templateId, rating, comment } = body;

  // Validation
  if (!templateId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ 
      error: 'Template ID and valid rating (1-5) required' 
    }, { status: 400 });
  }

  const result = await rateTemplate(
    templateId, 
    authResult.user.uid, 
    parseInt(rating), 
    comment || ''
  );
  
  if (result.success) {
    return NextResponse.json({
      success: true,
      qualityScore: result.qualityScore,
      message: 'Rating submitted successfully'
    });
  }

  return NextResponse.json(result, { status: 500 });
}

/**
 * Add comment to template
 */
async function handleAddComment(request) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { templateId, comment } = body;

  // Validation
  if (!templateId || !comment || comment.trim().length === 0) {
    return NextResponse.json({ 
      error: 'Template ID and comment required' 
    }, { status: 400 });
  }

  if (comment.length > 500) {
    return NextResponse.json({ 
      error: 'Comment too long (max 500 characters)' 
    }, { status: 400 });
  }

  const result = await addTemplateComment(
    templateId,
    authResult.user.uid,
    authResult.user.email,
    comment
  );
  
  if (result.success) {
    return NextResponse.json({
      success: true,
      comment: result.comment,
      message: 'Comment added successfully'
    }, { status: 201 });
  }

  return NextResponse.json(result, { status: 500 });
}

/**
 * Track template usage
 */
async function handleTrackUsage(request) {
  const body = await request.json();
  const { templateId, actionType = 'usage' } = body;

  if (!templateId) {
    return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
  }

  const validActions = ['usage', 'download', 'view'];
  if (!validActions.includes(actionType)) {
    return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
  }

  const result = await trackTemplateUsage(templateId, actionType);
  
  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'Usage tracked successfully'
    });
  }

  return NextResponse.json(result, { status: 500 });
}

/**
 * Track template view
 */
async function handleTrackView(request) {
  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get('templateId');

  if (!templateId) {
    return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
  }

  const result = await trackTemplateUsage(templateId, 'view');
  
  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'View tracked successfully'
    });
  }

  return NextResponse.json(result, { status: 500 });
}

/**
 * Update template marketplace settings
 */
async function handleUpdateTemplate(request) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { templateId, ...updateData } = body;

  if (!templateId) {
    return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
  }

  // Validate price if provided
  if (updateData.price !== undefined) {
    const price = parseFloat(updateData.price);
    if (isNaN(price) || price < 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }
    updateData.price = price;
  }

  const result = await updateTemplateMarketplace(templateId, updateData);
  
  if (result.success) {
    return NextResponse.json({
      success: true,
      message: 'Template updated successfully'
    });
  }

  return NextResponse.json(result, { status: 500 });
}