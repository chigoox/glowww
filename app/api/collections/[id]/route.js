/**
 * API Route for individual collection operations
 * /api/collections/[id] - GET, PUT, DELETE specific collections
 */

import { NextResponse } from 'next/server';
import { 
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAuth } from '../../../../lib/apiAuth';

// GET /api/collections/[id] - Get specific collection
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const collectionRef = doc(db, 'templateCollections', id);
    const collectionDoc = await getDoc(collectionRef);
    
    if (!collectionDoc.exists()) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    const collectionData = { id: collectionDoc.id, ...collectionDoc.data() };

    // Get template details for this collection
    const templatePromises = collectionData.templateIds.map(async (templateId) => {
      const templateRef = doc(db, 'pageTemplates', templateId);
      const templateDoc = await getDoc(templateRef);
      if (templateDoc.exists()) {
        return { id: templateDoc.id, ...templateDoc.data() };
      }
      return null;
    });

    const templates = (await Promise.all(templatePromises)).filter(Boolean);

    return NextResponse.json({
      success: true,
      collection: {
        ...collectionData,
        templates
      }
    });

  } catch (error) {
    console.error('Error in collection GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/collections/[id] - Update collection (Admin only)
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const authResult = await requireAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updates = { ...body };
    
    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.createdAt;
    delete updates.createdBy;
    
    // Add update timestamp
    updates.updatedAt = serverTimestamp();
    updates.updatedBy = authResult.user.uid;

    const collectionRef = doc(db, 'templateCollections', id);
    
    // Check if collection exists
    const collectionDoc = await getDoc(collectionRef);
    if (!collectionDoc.exists()) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    await updateDoc(collectionRef, updates);

    // Return updated collection
    const updatedDoc = await getDoc(collectionRef);
    
    return NextResponse.json({
      success: true,
      collection: { id: updatedDoc.id, ...updatedDoc.data() }
    });

  } catch (error) {
    console.error('Error in collection PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/[id] - Delete collection (Admin only)
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const authResult = await requireAuth(request);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const collectionRef = doc(db, 'templateCollections', id);
    
    // Check if collection exists
    const collectionDoc = await getDoc(collectionRef);
    if (!collectionDoc.exists()) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    await deleteDoc(collectionRef);

    return NextResponse.json({
      success: true,
      message: 'Collection deleted successfully'
    });

  } catch (error) {
    console.error('Error in collection DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}