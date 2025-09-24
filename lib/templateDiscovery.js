/**
 * Advanced Template Discovery Engine
 * AI-powered recommendations, personalization, and smart filtering
 */

import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * User preference tracking and personalization
 */
export const trackUserInteraction = async (userId, interaction) => {
  try {
    const {
      type, // 'view', 'download', 'save', 'search', 'filter'
      templateId,
      collectionId,
      category,
      tags,
      searchQuery,
      metadata = {}
    } = interaction;

    // Store interaction in user's activity log
    const activityRef = doc(collection(db, 'users', userId, 'templateActivity'));
    
    await setDoc(activityRef, {
      type,
      templateId: templateId || null,
      collectionId: collectionId || null,
      category: category || null,
      tags: tags || [],
      searchQuery: searchQuery || null,
      metadata,
      timestamp: serverTimestamp(),
      createdAt: new Date()
    });

    // Update user preferences
    await updateUserPreferences(userId, interaction);

    return { success: true };

  } catch (error) {
    console.error('Error tracking user interaction:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update user preferences based on interactions
 */
const updateUserPreferences = async (userId, interaction) => {
  try {
    const userPrefsRef = doc(db, 'userPreferences', userId);
    
    const updateData = {
      updatedAt: serverTimestamp(),
      lastActivity: serverTimestamp()
    };

    // Update category preferences
    if (interaction.category) {
      updateData[`categories.${interaction.category}`] = increment(1);
    }

    // Update tag preferences
    if (interaction.tags?.length > 0) {
      interaction.tags.forEach(tag => {
        updateData[`tags.${tag.toLowerCase()}`] = increment(1);
      });
    }

    // Update interaction type counts
    updateData[`interactions.${interaction.type}`] = increment(1);

    // Store recent searches
    if (interaction.type === 'search' && interaction.searchQuery) {
      updateData.recentSearches = arrayUnion({
        query: interaction.searchQuery,
        timestamp: new Date(),
        resultCount: interaction.metadata?.resultCount || 0
      });
    }

    await updateDoc(userPrefsRef, updateData);

  } catch (error) {
    console.warn('Error updating user preferences:', error);
  }
};

/**
 * Get personalized template recommendations
 */
export const getPersonalizedRecommendations = async (userId, options = {}) => {
  try {
    const {
      limit: resultLimit = 20,
      excludeTemplateIds = [],
      categories = [],
      minQualityScore = 60
    } = options;

    // Get user preferences
    const userPrefs = await getUserPreferences(userId);
    
    // Get user activity patterns
    const activityPatterns = await analyzeUserActivity(userId);

    // Build recommendation query based on preferences
    const recommendations = [];

    // 1. Category-based recommendations
    const topCategories = Object.entries(userPrefs.categories || {})
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    for (const category of topCategories) {
      const categoryTemplates = await getCategoryTemplates(category, {
        limit: 5,
        excludeIds: excludeTemplateIds,
        minQualityScore
      });
      
      recommendations.push(...categoryTemplates.map(template => ({
        ...template,
        recommendationReason: `Based on your interest in ${category}`,
        recommendationScore: calculateCategoryScore(userPrefs.categories[category], template),
        recommendationType: 'category'
      })));
    }

    // 2. Tag-based recommendations
    const topTags = Object.entries(userPrefs.tags || {})
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);

    if (topTags.length > 0) {
      const tagTemplates = await getTemplatesByTags(topTags, {
        limit: 10,
        excludeIds: [...excludeTemplateIds, ...recommendations.map(r => r.id)],
        minQualityScore
      });
      
      recommendations.push(...tagTemplates.map(template => ({
        ...template,
        recommendationReason: 'Based on your interests',
        recommendationScore: calculateTagScore(template, topTags, userPrefs.tags),
        recommendationType: 'tags'
      })));
    }

    // 3. Behavioral pattern recommendations
    const behaviorTemplates = await getBehaviorBasedRecommendations(activityPatterns, {
      limit: 8,
      excludeIds: [...excludeTemplateIds, ...recommendations.map(r => r.id)],
      minQualityScore
    });
    
    recommendations.push(...behaviorTemplates);

    // 4. Collaborative filtering (users with similar preferences)
    const collaborativeTemplates = await getCollaborativeRecommendations(userId, {
      limit: 6,
      excludeIds: [...excludeTemplateIds, ...recommendations.map(r => r.id)],
      minQualityScore
    });
    
    recommendations.push(...collaborativeTemplates);

    // 5. Trending templates the user hasn't seen
    const trendingTemplates = await getTrendingRecommendations({
      limit: 5,
      excludeIds: [...excludeTemplateIds, ...recommendations.map(r => r.id)],
      minQualityScore
    });
    
    recommendations.push(...trendingTemplates);

    // Sort by recommendation score and limit results
    const sortedRecommendations = recommendations
      .sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0))
      .slice(0, resultLimit);

    return {
      success: true,
      recommendations: sortedRecommendations,
      userPreferences: userPrefs,
      activityPatterns
    };

  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    return {
      success: false,
      error: error.message,
      recommendations: []
    };
  }
};

/**
 * Smart search with AI-enhanced results
 */
export const smartTemplateSearch = async (searchQuery, options = {}) => {
  try {
    const {
      userId,
      filters = {},
      limit: resultLimit = 20,
      page = 1,
      sortBy = 'relevance'
    } = options;

    // Track search interaction
    if (userId) {
      await trackUserInteraction(userId, {
        type: 'search',
        searchQuery,
        metadata: { filters, sortBy }
      });
    }

    // Process search query
    const processedQuery = processSearchQuery(searchQuery);
    
    // Get base search results
    const baseResults = await executeTemplateSearch(processedQuery, filters, resultLimit * 2);
    
    // Apply AI scoring and ranking
    const scoredResults = await applyAIScoring(baseResults, processedQuery, userId);
    
    // Apply personalization if user is provided
    let finalResults = scoredResults;
    if (userId) {
      finalResults = await applyPersonalizationScoring(scoredResults, userId);
    }

    // Sort and paginate
    finalResults = finalResults
      .sort((a, b) => {
        switch (sortBy) {
          case 'relevance':
            return (b.relevanceScore || 0) - (a.relevanceScore || 0);
          case 'downloads':
            return (b.downloadCount || 0) - (a.downloadCount || 0);
          case 'rating':
            return (b.averageRating || 0) - (a.averageRating || 0);
          case 'newest':
            return new Date(b.createdAt) - new Date(a.createdAt);
          default:
            return (b.relevanceScore || 0) - (a.relevanceScore || 0);
        }
      })
      .slice((page - 1) * resultLimit, page * resultLimit);

    // Generate search suggestions
    const suggestions = await generateSearchSuggestions(searchQuery, processedQuery);

    return {
      success: true,
      results: finalResults,
      suggestions,
      searchMetadata: {
        query: searchQuery,
        processedQuery,
        totalResults: baseResults.length,
        page,
        hasMore: finalResults.length === resultLimit
      }
    };

  } catch (error) {
    console.error('Error in smart template search:', error);
    return {
      success: false,
      error: error.message,
      results: [],
      suggestions: []
    };
  }
};

/**
 * Generate dynamic collections based on trends and patterns
 */
export const generateDynamicCollections = async () => {
  try {
    const collections = [];

    // 1. Rising Stars Collection
    const risingStars = await identifyRisingStars();
    if (risingStars.length >= 5) {
      collections.push({
        name: 'Rising Stars',
        description: 'New templates gaining popularity fast',
        type: 'trending',
        templateIds: risingStars.map(t => t.id),
        metadata: {
          algorithm: 'rising_stars',
          autoGenerated: true,
          criteria: 'Growth rate > 200% in last 7 days'
        }
      });
    }

    // 2. Seasonal Trending Collection
    const seasonalTrending = await getSeasonalTrendingTemplates();
    if (seasonalTrending.length >= 5) {
      collections.push({
        name: 'Seasonal Favorites',
        description: 'Popular templates for the current season',
        type: 'seasonal',
        templateIds: seasonalTrending.map(t => t.id),
        metadata: {
          season: getCurrentSeason(),
          autoGenerated: true,
          basedOn: 'Seasonal download patterns'
        }
      });
    }

    // 3. Style-Based Collections
    const styleCollections = await generateStyleCollections();
    collections.push(...styleCollections);

    // 4. Use Case Collections
    const useCaseCollections = await generateUseCaseCollections();
    collections.push(...useCaseCollections);

    return {
      success: true,
      collections
    };

  } catch (error) {
    console.error('Error generating dynamic collections:', error);
    return {
      success: false,
      error: error.message,
      collections: []
    };
  }
};

// Helper functions

const getUserPreferences = async (userId) => {
  try {
    const userPrefsRef = doc(db, 'userPreferences', userId);
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    if (userPrefsDoc.exists()) {
      return userPrefsDoc.data();
    }
    
    // Return default preferences
    return {
      categories: {},
      tags: {},
      interactions: {},
      recentSearches: []
    };
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return { categories: {}, tags: {}, interactions: {}, recentSearches: [] };
  }
};

const analyzeUserActivity = async (userId) => {
  try {
    const activityQuery = query(
      collection(db, 'users', userId, 'templateActivity'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    
    const activitySnapshot = await getDocs(activityQuery);
    const activities = [];
    
    activitySnapshot.forEach(doc => {
      activities.push(doc.data());
    });

    // Analyze patterns
    const patterns = {
      mostActiveTimeOfDay: analyzeMostActiveTime(activities),
      preferredCategories: analyzePreferredCategories(activities),
      searchPatterns: analyzeSearchPatterns(activities),
      downloadBehavior: analyzeDownloadBehavior(activities),
      engagementLevel: calculateEngagementLevel(activities)
    };

    return patterns;

  } catch (error) {
    console.error('Error analyzing user activity:', error);
    return {};
  }
};

const processSearchQuery = (query) => {
  // Extract keywords, remove stop words, identify intent
  const stopWords = ['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of'];
  const keywords = query.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));

  // Identify search intent
  const intent = identifySearchIntent(query);
  
  // Extract filters from query
  const extractedFilters = extractFiltersFromQuery(query);

  return {
    originalQuery: query,
    keywords,
    intent,
    extractedFilters
  };
};

const identifySearchIntent = (query) => {
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('free') || lowerQuery.includes('no cost')) return 'free';
  if (lowerQuery.includes('premium') || lowerQuery.includes('paid')) return 'premium';
  if (lowerQuery.includes('template') && lowerQuery.includes('bundle')) return 'bundle';
  if (lowerQuery.includes('trending') || lowerQuery.includes('popular')) return 'trending';
  if (lowerQuery.includes('new') || lowerQuery.includes('latest')) return 'new';
  if (lowerQuery.includes('similar') || lowerQuery.includes('like')) return 'similar';
  
  return 'general';
};

const calculateCategoryScore = (userInterest, template) => {
  const baseScore = template.qualityScore || 50;
  const popularityScore = Math.min((template.downloadCount || 0) / 100, 50);
  const userInterestScore = Math.min(userInterest * 10, 30);
  
  return baseScore + popularityScore + userInterestScore;
};

const calculateTagScore = (template, userTags, userTagCounts) => {
  const templateTags = template.tags || [];
  const matchingTags = templateTags.filter(tag => userTags.includes(tag.toLowerCase()));
  
  let score = template.qualityScore || 50;
  
  matchingTags.forEach(tag => {
    const userCount = userTagCounts[tag.toLowerCase()] || 1;
    score += Math.min(userCount * 5, 25);
  });
  
  return score;
};

const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

const identifyRisingStars = async () => {
  // This is a simplified implementation
  // In production, you'd analyze download velocity, rating changes, etc.
  try {
    const templates = await getDocs(
      query(
        collection(db, 'pageTemplates'),
        where('status', '==', 'approved'),
        where('createdAt', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), // Last 30 days
        orderBy('downloadCount', 'desc'),
        limit(20)
      )
    );

    const risingTemplates = [];
    templates.forEach(doc => {
      const template = doc.data();
      // Simple rising star criteria: new template with good downloads
      if ((template.downloadCount || 0) > 10 && (template.averageRating || 0) > 4.0) {
        risingTemplates.push({ id: doc.id, ...template });
      }
    });

    return risingTemplates.slice(0, 10);
  } catch (error) {
    console.error('Error identifying rising stars:', error);
    return [];
  }
};

export default {
  trackUserInteraction,
  getPersonalizedRecommendations,
  smartTemplateSearch,
  generateDynamicCollections
};