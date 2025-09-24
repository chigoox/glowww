/**
 * Template Moderation System
 * Handles template quality control, approval workflow, and moderation features
 */

import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  Timestamp,
  increment
} from 'firebase/firestore';

// Quality scoring constants
export const QUALITY_THRESHOLDS = {
  EXCELLENT: 85,
  GOOD: 70,
  FAIR: 55,
  POOR: 40
};

// Template status types
export const TEMPLATE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved', 
  REJECTED: 'rejected',
  FLAGGED: 'flagged',
  DRAFT: 'draft'
};

// Moderation actions
export const MODERATION_ACTIONS = {
  APPROVE: 'approve',
  REJECT: 'reject',
  FLAG: 'flag',
  REQUEST_CHANGES: 'request_changes'
};

/**
 * Wilson Score Confidence Interval
 * Provides more accurate quality scoring than simple average
 */
export const calculateWilsonScore = (positive, total, confidence = 0.95) => {
  if (total === 0) return 0;
  
  const z = confidence === 0.95 ? 1.96 : 2.576; // 95% or 99% confidence
  const p = positive / total;
  const n = total;
  
  const numerator = p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  const denominator = 1 + (z * z) / n;
  
  return Math.max(0, Math.min(100, (numerator / denominator) * 100));
};

/**
 * Calculate template quality score based on multiple factors
 */
export const calculateQualityScore = (templateData, userFeedback = {}) => {
  let score = 50; // Base score
  
  // Design quality factors
  if (templateData.previewImage) score += 10;
  if (templateData.description && templateData.description.length > 50) score += 5;
  if (templateData.tags && templateData.tags.length > 0) score += 5;
  if (templateData.category) score += 5;
  
  // User engagement factors
  const downloads = userFeedback.downloads || 0;
  const views = userFeedback.views || 0;
  const favorites = userFeedback.favorites || 0;
  
  if (downloads > 10) score += 10;
  if (views > 100) score += 5;
  if (favorites > 5) score += 10;
  
  // Conversion rate
  const conversionRate = views > 0 ? downloads / views : 0;
  if (conversionRate > 0.1) score += 10;
  if (conversionRate > 0.05) score += 5;
  
  // Wilson score from user ratings
  const ratings = userFeedback.ratings || {};
  const totalRatings = Object.values(ratings).reduce((sum, count) => sum + count, 0);
  const positiveRatings = (ratings['4'] || 0) + (ratings['5'] || 0);
  
  if (totalRatings > 0) {
    const wilsonScore = calculateWilsonScore(positiveRatings, totalRatings);
    score = Math.max(score, wilsonScore);
  }
  
  return Math.min(100, Math.max(0, score));
};

/**
 * Get pending templates for moderation
 */
export const getPendingTemplates = async (limit = 20) => {
  try {
    const templatesRef = collection(db, 'pageTemplates');
    const q = query(
      templatesRef,
      where('status', '==', TEMPLATE_STATUS.PENDING),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );
    
    const snapshot = await getDocs(q);
    const templates = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      templates.push({
        id: docSnap.id,
        ...data,
        qualityScore: calculateQualityScore(data, data.analytics || {})
      });
    }
    
    return templates;
  } catch (error) {
    console.error('Error getting pending templates:', error);
    throw error;
  }
};

/**
 * Moderate a template (approve, reject, flag, etc.)
 */
export const moderateTemplate = async (templateId, action, moderatorId, feedback = '') => {
  try {
    const templateRef = doc(db, 'pageTemplates', templateId);
    const templateDoc = await getDoc(templateRef);
    
    if (!templateDoc.exists()) {
      throw new Error('Template not found');
    }
    
    const templateData = templateDoc.data();
    const now = Timestamp.now();
    
    // Determine new status based on action
    let newStatus = templateData.status;
    switch (action) {
      case MODERATION_ACTIONS.APPROVE:
        newStatus = TEMPLATE_STATUS.APPROVED;
        break;
      case MODERATION_ACTIONS.REJECT:
        newStatus = TEMPLATE_STATUS.REJECTED;
        break;
      case MODERATION_ACTIONS.FLAG:
        newStatus = TEMPLATE_STATUS.FLAGGED;
        break;
      default:
        newStatus = TEMPLATE_STATUS.PENDING;
    }
    
    // Update template
    await updateDoc(templateRef, {
      status: newStatus,
      moderatedAt: now,
      moderatedBy: moderatorId,
      moderationFeedback: feedback,
      qualityScore: calculateQualityScore(templateData, templateData.analytics || {})
    });
    
    // Log moderation action
    const moderationLogRef = collection(db, 'moderationLog');
    await addDoc(moderationLogRef, {
      templateId,
      action,
      moderatorId,
      feedback,
      timestamp: now,
      previousStatus: templateData.status,
      newStatus
    });
    
    return { success: true, newStatus };
  } catch (error) {
    console.error('Error moderating template:', error);
    throw error;
  }
};

/**
 * Get moderation statistics
 */
export const getModerationStats = async (timeRange = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRange);
    const startTimestamp = Timestamp.fromDate(startDate);
    
    // Get moderation actions in time range
    const moderationLogRef = collection(db, 'moderationLog');
    const q = query(
      moderationLogRef,
      where('timestamp', '>=', startTimestamp),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const actions = snapshot.docs.map(doc => doc.data());
    
    // Calculate statistics
    const stats = {
      totalActions: actions.length,
      approved: actions.filter(a => a.action === MODERATION_ACTIONS.APPROVE).length,
      rejected: actions.filter(a => a.action === MODERATION_ACTIONS.REJECT).length,
      flagged: actions.filter(a => a.action === MODERATION_ACTIONS.FLAG).length,
      averageProcessingTime: 0,
      topModerators: {}
    };
    
    // Calculate moderator activity
    actions.forEach(action => {
      if (action.moderatorId) {
        stats.topModerators[action.moderatorId] = (stats.topModerators[action.moderatorId] || 0) + 1;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting moderation stats:', error);
    throw error;
  }
};

/**
 * Get templates by status
 */
export const getTemplatesByStatus = async (status, limit = 20) => {
  try {
    const templatesRef = collection(db, 'pageTemplates');
    const q = query(
      templatesRef,
      where('status', '==', status),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );
    
    const snapshot = await getDocs(q);
    const templates = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      templates.push({
        id: docSnap.id,
        ...data,
        qualityScore: calculateQualityScore(data, data.analytics || {})
      });
    }
    
    return templates;
  } catch (error) {
    console.error('Error getting templates by status:', error);
    throw error;
  }
};

/**
 * Bulk moderation - approve/reject multiple templates
 */
export const bulkModerate = async (templateIds, action, moderatorId, feedback = '') => {
  try {
    const results = [];
    
    for (const templateId of templateIds) {
      try {
        const result = await moderateTemplate(templateId, action, moderatorId, feedback);
        results.push({ templateId, ...result });
      } catch (error) {
        results.push({ templateId, success: false, error: error.message });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error in bulk moderation:', error);
    throw error;
  }
};

/**
 * Flag template for review
 */
export const flagTemplate = async (templateId, reason, reporterId) => {
  try {
    const templateRef = doc(db, 'pageTemplates', templateId);
    const now = Timestamp.now();
    
    // Update template status
    await updateDoc(templateRef, {
      status: TEMPLATE_STATUS.FLAGGED,
      flaggedAt: now,
      flaggedBy: reporterId,
      flagReason: reason
    });
    
    // Add to flagged reports collection
    const flagReportsRef = collection(db, 'flaggedReports');
    await addDoc(flagReportsRef, {
      templateId,
      reason,
      reporterId,
      timestamp: now,
      resolved: false
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error flagging template:', error);
    throw error;
  }
};

/**
 * Get quality score description
 */
export const getQualityDescription = (score) => {
  if (score >= QUALITY_THRESHOLDS.EXCELLENT) {
    return { level: 'Excellent', color: '#52c41a', description: 'High-quality template ready for promotion' };
  } else if (score >= QUALITY_THRESHOLDS.GOOD) {
    return { level: 'Good', color: '#1890ff', description: 'Quality template suitable for marketplace' };
  } else if (score >= QUALITY_THRESHOLDS.FAIR) {
    return { level: 'Fair', color: '#faad14', description: 'Acceptable quality, may need minor improvements' };
  } else {
    return { level: 'Poor', color: '#ff4d4f', description: 'Requires significant improvements' };
  }
};

export default {
  getPendingTemplates,
  moderateTemplate,
  getModerationStats,
  getTemplatesByStatus,
  bulkModerate,
  flagTemplate,
  calculateQualityScore,
  calculateWilsonScore,
  getQualityDescription,
  QUALITY_THRESHOLDS,
  TEMPLATE_STATUS,
  MODERATION_ACTIONS
};