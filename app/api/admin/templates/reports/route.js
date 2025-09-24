/**
 * API endpoints for template reports management
 * GET /api/admin/templates/reports - Get template reports for moderation
 */

import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
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
    const status = searchParams.get('status') || 'pending';

    // Get template reports
    let reportsQuery = collection(db, 'templateReports');
    const constraints = [orderBy('createdAt', 'desc')];

    if (status !== 'all') {
      constraints.unshift(where('status', '==', status));
    }

    reportsQuery = query(reportsQuery, ...constraints);
    const reportsSnapshot = await getDocs(reportsQuery);
    
    const reports = [];
    reportsSnapshot.forEach((doc) => {
      const report = doc.data();
      reports.push({
        id: doc.id,
        ...report,
        createdAt: report.createdAt?.toDate?.()?.toISOString() || report.createdAt,
        resolvedAt: report.resolvedAt?.toDate?.()?.toISOString() || report.resolvedAt
      });
    });

    // Get template details for each report
    const templateIds = [...new Set(reports.map(r => r.templateId))];
    const templateDetails = {};

    for (const templateId of templateIds) {
      try {
        const templateRef = doc(db, 'pageTemplates', templateId);
        const templateDoc = await getDoc(templateRef);
        
        if (templateDoc.exists()) {
          const template = templateDoc.data();
          templateDetails[templateId] = {
            name: template.name,
            creatorName: template.creatorName,
            thumbnail: template.thumbnail,
            status: template.status
          };
        }
      } catch (error) {
        console.warn(`Failed to load template ${templateId}:`, error);
        templateDetails[templateId] = {
          name: 'Unknown Template',
          creatorName: 'Unknown',
          thumbnail: null,
          status: 'unknown'
        };
      }
    }

    // Enrich reports with template details
    const enrichedReports = reports.map(report => ({
      ...report,
      templateName: templateDetails[report.templateId]?.name || 'Unknown Template',
      templateCreator: templateDetails[report.templateId]?.creatorName || 'Unknown',
      templateThumbnail: templateDetails[report.templateId]?.thumbnail,
      templateStatus: templateDetails[report.templateId]?.status
    }));

    return NextResponse.json({
      success: true,
      reports: enrichedReports
    });

  } catch (error) {
    console.error('Error fetching template reports:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch template reports' 
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

    const { reportId, action, notes } = await request.json();

    if (!reportId || !action) {
      return NextResponse.json({
        success: false,
        error: 'Report ID and action are required'
      }, { status: 400 });
    }

    const reportRef = doc(db, 'templateReports', reportId);
    
    const updateData = {
      status: action,
      resolvedAt: new Date(),
      resolvedBy: authResult.user.uid,
      adminNotes: notes || '',
      updatedAt: new Date()
    };

    await updateDoc(reportRef, updateData);

    return NextResponse.json({
      success: true,
      message: `Report ${action} successfully`
    });

  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update report' 
    }, { status: 500 });
  }
}