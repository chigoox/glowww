/**
 * Template Collections Engine
 * Handles template bundles, trending algorithms, collections, and discovery
 */

import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Collection types and categories
 */
export const COLLECTION_TYPES = {
  BUNDLE: 'bundle',           // Paid template bundles
  CURATED: 'curated',         // Admin-curated collections
  SEASONAL: 'seasonal',       // Season/holiday collections
  TRENDING: 'trending',       // Auto-generated trending collections
  CATEGORY: 'category',       // Category-based collections
  CREATOR: 'creator'          // Creator spotlight collections
};

export const SEASONAL_THEMES = {
  SPRING: { name: 'Spring', months: [3, 4, 5], color: '#52c41a' },
  SUMMER: { name: 'Summer', months: [6, 7, 8], color: '#faad14' },
  AUTUMN: { name: 'Autumn', months: [9, 10, 11], color: '#d48806' },
  WINTER: { name: 'Winter', months: [12, 1, 2], color: '#1677ff' },
  HOLIDAY: { name: 'Holiday', months: [11, 12], color: '#722ed1' },
  VALENTINE: { name: 'Valentine\'s', months: [2], color: '#f5222d' },
  SUMMER_SALE: { name: 'Summer Sale', months: [7], color: '#ff7a45' },
  BLACK_FRIDAY: { name: 'Black Friday', months: [11], color: '#2f1b14' }
};

/**
 * Create a new template collection
 */
export const createTemplateCollection = async (collectionData) => {
  try {
    const {
      name,
      description,
      type,
      templateIds,
      createdBy,
      metadata = {},
      pricing = {},
      isPublic = true,
      featured = false
    } = collectionData;

    // Validate required fields
    if (!name || !type || !templateIds?.length) {
      return {
        success: false,
        error: 'Name, type, and template IDs are required'
      };
    }

    // Generate collection ID
    const collectionRef = doc(collection(db, 'templateCollections'));
    const collectionId = collectionRef.id;

    // Prepare collection document
    const collectionDoc = {
      id: collectionId,
      name,
      description: description || '',
      type,
      templateIds,
      templateCount: templateIds.length,
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      
      // Metrics
      viewCount: 0,
      downloadCount: 0,
      saveCount: 0,
      
      // Status
      isPublic,
      featured,
      status: 'active',
      
      // Metadata based on collection type
      metadata: {
        ...metadata,
        ...(type === COLLECTION_TYPES.SEASONAL && {
          season: metadata.season,
          year: metadata.year || new Date().getFullYear(),
          startDate: metadata.startDate,
          endDate: metadata.endDate
        }),
        ...(type === COLLECTION_TYPES.BUNDLE && {
          originalPrice: calculateOriginalPrice(templateIds),
          bundlePrice: pricing.bundlePrice,
          discount: pricing.discount,
          currency: pricing.currency || 'USD'
        }),
        ...(type === COLLECTION_TYPES.TRENDING && {
          algorithm: metadata.algorithm || 'downloads_7d',
          autoUpdate: metadata.autoUpdate !== false,
          lastUpdated: serverTimestamp()
        })
      },

      // SEO and discovery
      tags: metadata.tags || [],
      categories: metadata.categories || [],
      difficulty: metadata.difficulty || 'medium',
      
      // Analytics
      analytics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0
      }
    };

    // Save collection
    await setDoc(collectionRef, collectionDoc);

    // Update template references
    await updateTemplateCollectionReferences(templateIds, collectionId, 'add');

    return {
      success: true,
      collectionId,
      collection: collectionDoc
    };

  } catch (error) {
    console.error('Error creating template collection:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get collections with filtering and pagination
 */
export const getTemplateCollections = async (filters = {}) => {
  try {
    const {
      type,
      category,
      featured,
      isPublic = true,
      limit: queryLimit = 20,
      startAfterDoc,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    // Build query
    let collectionsQuery = collection(db, 'templateCollections');
    const constraints = [];

    // Add filters
    if (type) {
      constraints.push(where('type', '==', type));
    }
    
    if (category) {
      constraints.push(where('categories', 'array-contains', category));
    }
    
    if (featured !== undefined) {
      constraints.push(where('featured', '==', featured));
    }
    
    if (isPublic !== undefined) {
      constraints.push(where('isPublic', '==', isPublic));
    }

    constraints.push(where('status', '==', 'active'));

    // Add sorting
    if (sortOrder === 'desc') {
      constraints.push(orderBy(sortBy, 'desc'));
    } else {
      constraints.push(orderBy(sortBy, 'asc'));
    }

    // Add pagination
    constraints.push(limit(queryLimit));
    
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    // Execute query
    if (constraints.length > 0) {
      collectionsQuery = query(collectionsQuery, ...constraints);
    }

    const querySnapshot = await getDocs(collectionsQuery);
    const collections = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      collections.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      });
    });

    return {
      success: true,
      collections,
      hasMore: collections.length === queryLimit
    };

  } catch (error) {
    console.error('Error getting template collections:', error);
    return {
      success: false,
      error: error.message,
      collections: []
    };
  }
};

/**
 * Generate trending collections automatically
 */
export const generateTrendingCollections = async () => {
  try {
    const algorithms = [
      {
        name: 'Most Downloaded (7 days)',
        key: 'downloads_7d',
        description: 'Templates with highest downloads in the last 7 days'
      },
      {
        name: 'Highest Rated (30 days)',
        key: 'rated_30d',
        description: 'Best rated templates from the last 30 days'
      },
      {
        name: 'Rising Stars',
        key: 'rising_stars',
        description: 'Templates with rapidly growing popularity'
      },
      {
        name: 'New & Notable',
        key: 'new_notable',
        description: 'Recent templates gaining traction'
      }
    ];

    const results = [];

    for (const algorithm of algorithms) {
      try {
        const templates = await getTrendingTemplates(algorithm.key);
        
        if (templates.length >= 5) { // Minimum templates for a trending collection
          const collectionResult = await createTemplateCollection({
            name: algorithm.name,
            description: algorithm.description,
            type: COLLECTION_TYPES.TRENDING,
            templateIds: templates.map(t => t.id),
            createdBy: 'system',
            metadata: {
              algorithm: algorithm.key,
              autoUpdate: true,
              generatedAt: new Date().toISOString()
            },
            isPublic: true,
            featured: algorithm.key === 'downloads_7d' // Feature the most popular
          });

          if (collectionResult.success) {
            results.push({
              algorithm: algorithm.key,
              collectionId: collectionResult.collectionId,
              templateCount: templates.length
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to generate trending collection for ${algorithm.key}:`, error);
      }
    }

    return {
      success: true,
      generated: results
    };

  } catch (error) {
    console.error('Error generating trending collections:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate seasonal collections
 */
export const generateSeasonalCollections = async () => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const activeSeasons = [];

    // Find active seasons
    Object.entries(SEASONAL_THEMES).forEach(([key, season]) => {
      if (season.months.includes(currentMonth)) {
        activeSeasons.push({ key, ...season });
      }
    });

    const results = [];

    for (const season of activeSeasons) {
      try {
        // Get templates that match seasonal criteria
        const templates = await getSeasonalTemplates(season.key.toLowerCase());
        
        if (templates.length >= 3) {
          const collectionResult = await createTemplateCollection({
            name: `${season.name} Collection ${currentYear}`,
            description: `Beautiful ${season.name.toLowerCase()} templates for your projects`,
            type: COLLECTION_TYPES.SEASONAL,
            templateIds: templates.map(t => t.id),
            createdBy: 'system',
            metadata: {
              season: season.key.toLowerCase(),
              year: currentYear,
              startDate: new Date(currentYear, season.months[0] - 1, 1),
              endDate: new Date(currentYear, season.months[season.months.length - 1], 0),
              themeColor: season.color
            },
            isPublic: true,
            featured: true
          });

          if (collectionResult.success) {
            results.push({
              season: season.key,
              collectionId: collectionResult.collectionId,
              templateCount: templates.length
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to generate seasonal collection for ${season.name}:`, error);
      }
    }

    return {
      success: true,
      generated: results
    };

  } catch (error) {
    console.error('Error generating seasonal collections:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create template bundle with pricing
 */
export const createTemplateBundle = async (bundleData) => {
  try {
    const {
      name,
      description,
      templateIds,
      bundlePrice,
      discount,
      createdBy,
      featured = false
    } = bundleData;

    // Calculate original price
    const originalPrice = await calculateOriginalPrice(templateIds);
    const calculatedDiscount = discount || Math.round(((originalPrice - bundlePrice) / originalPrice) * 100);

    const bundleResult = await createTemplateCollection({
      name,
      description,
      type: COLLECTION_TYPES.BUNDLE,
      templateIds,
      createdBy,
      pricing: {
        originalPrice,
        bundlePrice,
        discount: calculatedDiscount,
        currency: 'USD',
        savings: originalPrice - bundlePrice
      },
      metadata: {
        bundleType: 'premium',
        valueProposition: `Save ${calculatedDiscount}% with this bundle!`
      },
      isPublic: true,
      featured
    });

    return bundleResult;

  } catch (error) {
    console.error('Error creating template bundle:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get featured collections for homepage
 */
export const getFeaturedCollections = async () => {
  try {
    const result = await getTemplateCollections({
      featured: true,
      limit: 6,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });

    return result;

  } catch (error) {
    console.error('Error getting featured collections:', error);
    return {
      success: false,
      error: error.message,
      collections: []
    };
  }
};

/**
 * Update collection analytics
 */
export const updateCollectionAnalytics = async (collectionId, action, value = 1) => {
  try {
    const collectionRef = doc(db, 'templateCollections', collectionId);
    
    const updateData = {
      updatedAt: serverTimestamp()
    };

    switch (action) {
      case 'view':
        updateData.viewCount = increment(value);
        updateData['analytics.impressions'] = increment(value);
        break;
      case 'download':
        updateData.downloadCount = increment(value);
        updateData['analytics.conversions'] = increment(value);
        break;
      case 'save':
        updateData.saveCount = increment(value);
        break;
      case 'click':
        updateData['analytics.clicks'] = increment(value);
        break;
      case 'revenue':
        updateData['analytics.revenue'] = increment(value);
        break;
    }

    await updateDoc(collectionRef, updateData);

    return { success: true };

  } catch (error) {
    console.error('Error updating collection analytics:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper functions

const calculateOriginalPrice = async (templateIds) => {
  try {
    let totalPrice = 0;
    
    // In a real implementation, you'd fetch template prices from the database
    // For now, using a default price per template
    const defaultTemplatePrice = 29.99;
    totalPrice = templateIds.length * defaultTemplatePrice;
    
    return totalPrice;
  } catch (error) {
    console.error('Error calculating original price:', error);
    return 0;
  }
};

const updateTemplateCollectionReferences = async (templateIds, collectionId, action) => {
  try {
    const promises = templateIds.map(async (templateId) => {
      const templateRef = doc(db, 'pageTemplates', templateId);
      
      if (action === 'add') {
        await updateDoc(templateRef, {
          collections: arrayUnion(collectionId),
          updatedAt: serverTimestamp()
        });
      } else if (action === 'remove') {
        await updateDoc(templateRef, {
          collections: arrayRemove(collectionId),
          updatedAt: serverTimestamp()
        });
      }
    });

    await Promise.all(promises);
  } catch (error) {
    console.warn('Error updating template collection references:', error);
  }
};

const getTrendingTemplates = async (algorithm) => {
  try {
    // This is a simplified implementation
    // In production, you'd have more sophisticated trending algorithms
    
    let templatesQuery = collection(db, 'pageTemplates');
    const constraints = [
      where('status', '==', 'approved'),
      where('isPublic', '==', true)
    ];

    switch (algorithm) {
      case 'downloads_7d':
        constraints.push(orderBy('downloadCount', 'desc'));
        constraints.push(limit(20));
        break;
      case 'rated_30d':
        constraints.push(orderBy('averageRating', 'desc'));
        constraints.push(where('ratingCount', '>=', 5));
        constraints.push(limit(15));
        break;
      case 'rising_stars':
        // Templates with high growth rate
        constraints.push(orderBy('growthRate', 'desc'));
        constraints.push(limit(12));
        break;
      case 'new_notable':
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        constraints.push(where('createdAt', '>=', oneWeekAgo));
        constraints.push(orderBy('downloadCount', 'desc'));
        constraints.push(limit(10));
        break;
      default:
        constraints.push(orderBy('downloadCount', 'desc'));
        constraints.push(limit(15));
    }

    templatesQuery = query(templatesQuery, ...constraints);
    const querySnapshot = await getDocs(templatesQuery);
    
    const templates = [];
    querySnapshot.forEach((doc) => {
      templates.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return templates;

  } catch (error) {
    console.error('Error getting trending templates:', error);
    return [];
  }
};

const getSeasonalTemplates = async (season) => {
  try {
    // Get templates that match seasonal keywords/tags
    const seasonalKeywords = {
      spring: ['spring', 'flowers', 'bloom', 'fresh', 'green', 'nature'],
      summer: ['summer', 'beach', 'vacation', 'sun', 'bright', 'tropical'],
      autumn: ['autumn', 'fall', 'harvest', 'orange', 'leaves', 'cozy'],
      winter: ['winter', 'snow', 'holiday', 'christmas', 'cold', 'festive'],
      valentine: ['valentine', 'love', 'heart', 'romantic', 'pink', 'red'],
      holiday: ['holiday', 'christmas', 'festive', 'celebration', 'gift']
    };

    const keywords = seasonalKeywords[season] || [];
    
    if (keywords.length === 0) {
      return [];
    }

    // Search for templates with seasonal tags
    const templatesQuery = query(
      collection(db, 'pageTemplates'),
      where('status', '==', 'approved'),
      where('tags', 'array-contains-any', keywords),
      orderBy('qualityScore', 'desc'),
      limit(15)
    );

    const querySnapshot = await getDocs(templatesQuery);
    const templates = [];

    querySnapshot.forEach((doc) => {
      templates.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return templates;

  } catch (error) {
    console.error('Error getting seasonal templates:', error);
    return [];
  }
};

export default {
  createTemplateCollection,
  getTemplateCollections,
  generateTrendingCollections,
  generateSeasonalCollections,
  createTemplateBundle,
  getFeaturedCollections,
  updateCollectionAnalytics,
  COLLECTION_TYPES,
  SEASONAL_THEMES
};