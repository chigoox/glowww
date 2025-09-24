/**
 * Template Marketplace System
 * Handles template storage, ratings, comments, and quality scoring
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// Template Categories
export const TEMPLATE_CATEGORIES = {
  LANDING: 'landing',
  BUSINESS: 'business', 
  PORTFOLIO: 'portfolio',
  ECOMMERCE: 'ecommerce',
  BLOG: 'blog',
  EVENTS: 'events',
  PERSONAL: 'personal',
  OTHER: 'other'
};

// Template Types
export const TEMPLATE_TYPES = {
  FREE: 'free',
  PAID: 'paid',
  PREMIUM: 'premium'
};

// Quality Score Thresholds
export const QUALITY_THRESHOLDS = {
  MIN_RATINGS_FOR_AI: 10, // Minimum ratings needed for AI to use template
  MIN_SCORE_FOR_AI: 3.5,  // Minimum average rating for AI usage
  FEATURED_THRESHOLD: 4.5, // Score needed to be featured
  MIN_RATINGS_FOR_FEATURED: 20
};

/**
 * Calculate quality score for a template
 * Uses Wilson Score Interval for better ranking with fewer ratings
 */
export const calculateQualityScore = (ratings) => {
  if (!ratings || ratings.length === 0) return 0;

  const n = ratings.length;
  const sum = ratings.reduce((acc, rating) => acc + rating.score, 0);
  const average = sum / n;
  
  // Wilson Score Interval calculation
  const z = 1.96; // 95% confidence interval
  const phat = average / 5; // Convert to 0-1 scale
  
  const score = (phat + z*z/(2*n) - z * Math.sqrt((phat*(1-phat)+z*z/(4*n))/n))/(1+z*z/n);
  
  return {
    average: parseFloat(average.toFixed(2)),
    wilson: parseFloat((score * 5).toFixed(2)), // Convert back to 1-5 scale
    totalRatings: n,
    isQualityForAI: n >= QUALITY_THRESHOLDS.MIN_RATINGS_FOR_AI && average >= QUALITY_THRESHOLDS.MIN_SCORE_FOR_AI,
    isFeatured: n >= QUALITY_THRESHOLDS.MIN_RATINGS_FOR_FEATURED && average >= QUALITY_THRESHOLDS.FEATURED_THRESHOLD
  };
};

/**
 * Save template to marketplace
 */
export const saveTemplate = async (templateData) => {
  try {
    const template = {
      // Basic Info
      name: templateData.name,
      description: templateData.description,
      category: templateData.category,
      tags: templateData.tags || [],
      
      // Template Data
      jsonData: templateData.jsonData, // Compressed .glow format
      thumbnail: templateData.thumbnail,
      previewImages: templateData.previewImages || [],
      
      // Creator Info
      createdBy: templateData.createdBy,
      creatorDisplayName: templateData.creatorDisplayName,
      
      // Marketplace Info
      type: templateData.type || TEMPLATE_TYPES.FREE,
      price: templateData.price || 0,
      isListed: templateData.isListed || false,
      
      // Analytics
      usageCount: 0,
      downloadCount: 0,
      viewCount: 0,
      
      // Ratings & Comments
      ratings: [],
      comments: [],
      averageRating: 0,
      totalRatings: 0,
      qualityScore: 0,
      
      // AI Metadata
      aiMetadata: {
        componentTypes: templateData.aiMetadata?.componentTypes || [],
        layoutStyle: templateData.aiMetadata?.layoutStyle || '',
        businessTypes: templateData.aiMetadata?.businessTypes || [],
        colorScheme: templateData.aiMetadata?.colorScheme || '',
        isResponsive: templateData.aiMetadata?.isResponsive || true
      },
      
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      
      // Flags
      isActive: true,
      isFlagged: false,
      flagReasons: []
    };

    const docRef = await addDoc(collection(db, 'pageTemplates'), template);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error saving template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get templates with filtering and pagination
 */
export const getTemplates = async (options = {}) => {
  try {
    const {
      category = null,
      type = null,
      userId = null,
      onlyQuality = false,
      onlyFeatured = false,
      searchQuery = '',
      sortBy = 'newest', // newest, popular, rating, usage
      limitCount = 20,
      lastDoc = null
    } = options;

    let q = collection(db, 'pageTemplates');
    
    // Build query
    const conditions = [where('isActive', '==', true)];
    
    if (category) conditions.push(where('category', '==', category));
    if (type) conditions.push(where('type', '==', type));
    if (userId) conditions.push(where('createdBy', '==', userId));
    if (onlyQuality) conditions.push(where('qualityScore.isQualityForAI', '==', true));
    if (onlyFeatured) conditions.push(where('qualityScore.isFeatured', '==', true));
    
    // Add sorting
    let orderField, orderDirection;
    switch (sortBy) {
      case 'popular':
        orderField = 'usageCount';
        orderDirection = 'desc';
        break;
      case 'rating':
        orderField = 'averageRating';
        orderDirection = 'desc';
        break;
      case 'usage':
        orderField = 'downloadCount';
        orderDirection = 'desc';
        break;
      default: // newest
        orderField = 'createdAt';
        orderDirection = 'desc';
    }
    
    conditions.push(orderBy(orderField, orderDirection));
    
    // Apply conditions
    q = query(q, ...conditions, limit(limitCount));
    
    // Pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const querySnapshot = await getDocs(q);
    const templates = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filter by search query if provided
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          data.name.toLowerCase().includes(searchLower) ||
          data.description.toLowerCase().includes(searchLower) ||
          data.tags.some(tag => tag.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return;
      }
      
      templates.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      });
    });
    
    return {
      success: true,
      templates,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
    };
  } catch (error) {
    console.error('Error getting templates:', error);
    return { success: false, error: error.message, templates: [] };
  }
};

/**
 * Add rating to template
 */
export const rateTemplate = async (templateId, userId, rating, comment = '') => {
  try {
    const templateRef = doc(db, 'pageTemplates', templateId);
    const templateDoc = await getDoc(templateRef);
    
    if (!templateDoc.exists()) {
      return { success: false, error: 'Template not found' };
    }
    
    const templateData = templateDoc.data();
    const existingRatings = templateData.ratings || [];
    
    // Check if user already rated
    const existingRatingIndex = existingRatings.findIndex(r => r.userId === userId);
    
    const ratingData = {
      userId,
      score: rating,
      comment: comment.trim(),
      createdAt: new Date(),
      isHelpful: 0,
      reportCount: 0
    };
    
    let updatedRatings;
    if (existingRatingIndex >= 0) {
      // Update existing rating
      updatedRatings = [...existingRatings];
      updatedRatings[existingRatingIndex] = ratingData;
    } else {
      // Add new rating
      updatedRatings = [...existingRatings, ratingData];
    }
    
    // Calculate new quality score
    const scores = updatedRatings.map(r => r.score);
    const qualityScore = calculateQualityScore(scores);
    const averageRating = qualityScore.average;
    
    await updateDoc(templateRef, {
      ratings: updatedRatings,
      averageRating,
      totalRatings: updatedRatings.length,
      qualityScore,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, qualityScore };
  } catch (error) {
    console.error('Error rating template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add comment to template
 */
export const addTemplateComment = async (templateId, userId, userDisplayName, comment) => {
  try {
    const templateRef = doc(db, 'pageTemplates', templateId);
    
    const commentData = {
      id: Date.now().toString(),
      userId,
      userDisplayName,
      comment: comment.trim(),
      createdAt: new Date(),
      isHelpful: 0,
      replies: [],
      reportCount: 0
    };
    
    await updateDoc(templateRef, {
      comments: arrayUnion(commentData),
      updatedAt: serverTimestamp()
    });
    
    return { success: true, comment: commentData };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Track template usage for analytics
 */
export const trackTemplateUsage = async (templateId, actionType = 'usage') => {
  try {
    const templateRef = doc(db, 'pageTemplates', templateId);
    
    const updateData = {
      updatedAt: serverTimestamp()
    };
    
    switch (actionType) {
      case 'usage':
        updateData.usageCount = increment(1);
        break;
      case 'download':
        updateData.downloadCount = increment(1);
        break;
      case 'view':
        updateData.viewCount = increment(1);
        break;
    }
    
    await updateDoc(templateRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error tracking template usage:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get templates suitable for AI usage (high quality only)
 */
export const getQualityTemplatesForAI = async (category = null) => {
  try {
    const result = await getTemplates({
      category,
      onlyQuality: true,
      sortBy: 'rating',
      limitCount: 50
    });
    
    if (result.success) {
      // Further filter for AI usage
      const aiSuitableTemplates = result.templates.filter(template => {
        const qs = template.qualityScore;
        return qs && qs.isQualityForAI && qs.totalRatings >= QUALITY_THRESHOLDS.MIN_RATINGS_FOR_AI;
      });
      
      return {
        success: true,
        templates: aiSuitableTemplates
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error getting quality templates for AI:', error);
    return { success: false, error: error.message, templates: [] };
  }
};

/**
 * Update template listing status and pricing
 */
export const updateTemplateMarketplace = async (templateId, updateData) => {
  try {
    const templateRef = doc(db, 'pageTemplates', templateId);
    
    const allowedUpdates = ['isListed', 'price', 'type', 'description', 'tags'];
    const filteredUpdates = {};
    
    allowedUpdates.forEach(field => {
      if (updateData.hasOwnProperty(field)) {
        filteredUpdates[field] = updateData[field];
      }
    });
    
    filteredUpdates.updatedAt = serverTimestamp();
    
    await updateDoc(templateRef, filteredUpdates);
    return { success: true };
  } catch (error) {
    console.error('Error updating template marketplace:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get templates by moderation status
 */
export const getTemplatesByStatus = async (status = null) => {
  try {
    let q = collection(db, 'pageTemplates');
    const conditions = [];
    
    if (status) {
      conditions.push(where('moderationStatus', '==', status));
    }
    
    conditions.push(orderBy('createdAt', 'desc'));
    
    if (conditions.length > 0) {
      q = query(q, ...conditions);
    }
    
    const querySnapshot = await getDocs(q);
    const templates = [];
    
    querySnapshot.forEach((doc) => {
      templates.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      });
    });
    
    return { success: true, templates };
  } catch (error) {
    console.error('Error getting templates by status:', error);
    return { success: false, error: error.message, templates: [] };
  }
};

/**
 * Update template moderation status
 */
export const updateTemplateStatus = async (templateId, status, reviewData = {}) => {
  try {
    const templateRef = doc(db, 'pageTemplates', templateId);
    
    const updateData = {
      moderationStatus: status,
      moderatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    if (reviewData.reviewNotes) {
      updateData.reviewNotes = reviewData.reviewNotes;
    }
    
    if (reviewData.moderatorId) {
      updateData.moderatedBy = reviewData.moderatorId;
    }
    
    // If approved, make it active and listed
    if (status === 'approved') {
      updateData.isActive = true;
      updateData.isListed = true;
    } else if (status === 'rejected') {
      updateData.isActive = false;
      updateData.isListed = false;
    }
    
    await updateDoc(templateRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating template status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete template
 */
export const deleteTemplate = async (templateId) => {
  try {
    const templateRef = doc(db, 'pageTemplates', templateId);
    await deleteDoc(templateRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting template:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get template marketplace statistics
 */
export const getTemplateStats = async () => {
  try {
    const templatesRef = collection(db, 'pageTemplates');
    const allTemplatesSnapshot = await getDocs(templatesRef);
    
    let stats = {
      totalTemplates: 0,
      pendingReview: 0,
      approved: 0,
      rejected: 0,
      featured: 0,
      totalDownloads: 0,
      totalRevenue: 0,
      averageRating: 0
    };
    
    let totalRatings = 0;
    let sumRatings = 0;
    
    allTemplatesSnapshot.forEach((doc) => {
      const data = doc.data();
      stats.totalTemplates++;
      
      switch (data.moderationStatus) {
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
      
      if (data.isFeatured) stats.featured++;
      if (data.downloadCount) stats.totalDownloads += data.downloadCount;
      if (data.price && data.downloadCount) stats.totalRevenue += data.price * data.downloadCount;
      if (data.averageRating) {
        sumRatings += data.averageRating * (data.totalRatings || 1);
        totalRatings += (data.totalRatings || 1);
      }
    });
    
    if (totalRatings > 0) {
      stats.averageRating = parseFloat((sumRatings / totalRatings).toFixed(2));
    }
    
    return { success: true, stats };
  } catch (error) {
    console.error('Error getting template stats:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get featured templates
 */
export const getFeaturedTemplates = async () => {
  try {
    const q = query(
      collection(db, 'pageTemplates'),
      where('isFeatured', '==', true),
      where('isActive', '==', true),
      orderBy('averageRating', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const templates = [];
    
    querySnapshot.forEach((doc) => {
      templates.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      });
    });
    
    return { success: true, templates };
  } catch (error) {
    console.error('Error getting featured templates:', error);
    return { success: false, error: error.message, templates: [] };
  }
};

/**
 * Set template featured status
 */
export const setTemplateFeatured = async (templateId, featured = true) => {
  try {
    const templateRef = doc(db, 'pageTemplates', templateId);
    
    await updateDoc(templateRef, {
      isFeatured: featured,
      featuredAt: featured ? serverTimestamp() : null,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error setting template featured status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get template reports (placeholder - would need reports collection)
 */
export const getTemplateReports = async () => {
  try {
    // This would typically query a separate reports collection
    // For now, return empty array as placeholder
    return { success: true, reports: [] };
  } catch (error) {
    console.error('Error getting template reports:', error);
    return { success: false, error: error.message, reports: [] };
  }
};

/**
 * Get templates by array of IDs
 */
export const getTemplatesByIds = async (templateIds) => {
  try {
    if (!templateIds || templateIds.length === 0) {
      return { success: true, templates: [] };
    }

    const templatePromises = templateIds.map(async (id) => {
      try {
        const templateDoc = await getDoc(doc(db, 'pageTemplates', id));
        if (templateDoc.exists()) {
          const data = templateDoc.data();
          return {
            id: templateDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching template ${id}:`, error);
        return null;
      }
    });

    const templateResults = await Promise.all(templatePromises);
    const templates = templateResults.filter(template => template !== null);
    
    return { success: true, templates };
  } catch (error) {
    console.error('Error getting templates by IDs:', error);
    return { success: false, error: error.message, templates: [] };
  }
};

/**
 * Resolve template report (placeholder)
 */
export const resolveTemplateReport = async (reportId, action) => {
  try {
    // This would typically update a reports collection
    // For now, return success as placeholder
    return { success: true };
  } catch (error) {
    console.error('Error resolving template report:', error);
    return { success: false, error: error.message };
  }
};