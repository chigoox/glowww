/**
 * API endpoints for template moderation and marketplace management
 * GET /api/admin/templates - Get templates by status with pagination
 */

import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, orderBy, limit, startAfter, doc, getDoc, updateDoc } from 'firebase/firestore';
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
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page')) || 1;
    const pageSize = parseInt(searchParams.get('pageSize')) || 20;
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    let templateQuery = collection(db, 'pageTemplates');
    const constraints = [];

    // Add status filter
    if (status && status !== 'all') {
      constraints.push(where('status', '==', status));
    }

    // Add category filter
    if (category && category !== 'all') {
      constraints.push(where('category', '==', category));
    }

    // Add ordering
    if (sortOrder === 'desc') {
      constraints.push(orderBy(sortBy, 'desc'));
    } else {
      constraints.push(orderBy(sortBy, 'asc'));
    }

    // Add pagination
    constraints.push(limit(pageSize));

    if (constraints.length > 0) {
      templateQuery = query(templateQuery, ...constraints);
    }

    const querySnapshot = await getDocs(templateQuery);
    const templates = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      templates.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
        reviewedAt: data.reviewedAt?.toDate?.()?.toISOString() || data.reviewedAt
      });
    });

    // Get total count for pagination
    const totalQuery = query(
      collection(db, 'pageTemplates'),
      ...(status && status !== 'all' ? [where('status', '==', status)] : []),
      ...(category && category !== 'all' ? [where('category', '==', category)] : [])
    );
    const totalSnapshot = await getDocs(totalQuery);
    const totalCount = totalSnapshot.size;

    return NextResponse.json({
      success: true,
      templates,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasNext: page * pageSize < totalCount,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch templates' 
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    // Verify admin access
    const authResult = await verifyAdminAccess(request);
    if (!authResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: authResult.error 
      }, { status: authResult.status });
    }

    const { templateId, action, data } = await request.json();

    if (!templateId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Template ID and action are required'
      }, { status: 400 });
    }

    const templateRef = doc(db, 'pageTemplates', templateId);
    const templateDoc = await getDoc(templateRef);

    if (!templateDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 });
    }

    let updateData = {
      updatedAt: new Date(),
      reviewedBy: authResult.user.uid,
      reviewedAt: new Date()
    };

    switch (action) {
      case 'approve':
        updateData.status = 'approved';
        updateData.approvedAt = new Date();
        break;
      
      case 'reject':
        updateData.status = 'rejected';
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = data?.rejectionReason || 'Template rejected by admin';
        break;
      
      case 'feature':
        updateData.featured = data?.featured !== undefined ? data.featured : true;
        updateData.featuredAt = data?.featured ? new Date() : null;
        break;
      
      case 'update_status':
        updateData.status = data?.status;
        if (data?.reviewNotes) {
          updateData.reviewNotes = data.reviewNotes;
        }
        if (data?.adminRating) {
          updateData.adminRating = data.adminRating;
        }
        break;
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

    // Merge with provided data
    updateData = { ...updateData, ...data };

    await updateDoc(templateRef, updateData);

    return NextResponse.json({
      success: true,
      message: `Template ${action} successful`
    });

  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update template' 
    }, { status: 500 });
  }
}

export async function DELETE(request) {
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
    const templateId = searchParams.get('templateId');

    if (!templateId) {
      return NextResponse.json({
        success: false,
        error: 'Template ID is required'
      }, { status: 400 });
    }

    const templateRef = doc(db, 'pageTemplates', templateId);
    const templateDoc = await getDoc(templateRef);

    if (!templateDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Template not found'
      }, { status: 404 });
    }

    // Soft delete - mark as deleted instead of actually deleting
    await updateDoc(templateRef, {
      status: 'deleted',
      deletedAt: new Date(),
      deletedBy: authResult.user.uid,
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete template' 
    }, { status: 500 });
  }
}