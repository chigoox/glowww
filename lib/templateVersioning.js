/**
 * Template Versioning System
 * Handles template updates, version history, and rollback functionality
 */

import { 
  collection, 
  doc, 
  getDoc, 
  setDoc,
  addDoc,
  updateDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Version types for templates
 */
export const VERSION_TYPES = {
  MAJOR: 'major',      // Breaking changes
  MINOR: 'minor',      // New features
  PATCH: 'patch'       // Bug fixes
};

/**
 * Create a new template version
 */
export const createTemplateVersion = async (templateId, versionData) => {
  try {
    const {
      jsonData,
      versionType = VERSION_TYPES.PATCH,
      changelog = '',
      userId,
      previousVersion = '1.0.0'
    } = versionData;

    // Calculate new version number
    const newVersion = calculateNextVersion(previousVersion, versionType);

    // Create version document
    const versionDoc = {
      templateId,
      version: newVersion,
      versionType,
      jsonData,
      changelog,
      createdBy: userId,
      createdAt: serverTimestamp(),
      isActive: true,
      downloadCount: 0,
      
      // AI metadata for the new version
      aiMetadata: analyzeTemplateForAI(jsonData),
      
      // Changes from previous version
      changesSummary: {
        componentsAdded: [],
        componentsRemoved: [],
        structureChanges: [],
        styleUpdates: []
      }
    };

    // Save version to subcollection
    const versionRef = await addDoc(
      collection(db, 'pageTemplates', templateId, 'versions'), 
      versionDoc
    );

    // Update main template with latest version info
    await updateDoc(doc(db, 'pageTemplates', templateId), {
      currentVersion: newVersion,
      lastUpdated: serverTimestamp(),
      totalVersions: await getVersionCount(templateId) + 1,
      jsonData, // Update main template with latest data
      aiMetadata: versionDoc.aiMetadata
    });

    return {
      success: true,
      versionId: versionRef.id,
      version: newVersion
    };

  } catch (error) {
    console.error('Error creating template version:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get all versions of a template
 */
export const getTemplateVersions = async (templateId) => {
  try {
    const versionsRef = collection(db, 'pageTemplates', templateId, 'versions');
    const q = query(versionsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const versions = [];
    querySnapshot.forEach((doc) => {
      versions.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      });
    });

    return {
      success: true,
      versions
    };

  } catch (error) {
    console.error('Error getting template versions:', error);
    return {
      success: false,
      error: error.message,
      versions: []
    };
  }
};

/**
 * Get specific template version
 */
export const getTemplateVersion = async (templateId, versionId) => {
  try {
    const versionRef = doc(db, 'pageTemplates', templateId, 'versions', versionId);
    const versionDoc = await getDoc(versionRef);

    if (!versionDoc.exists()) {
      return {
        success: false,
        error: 'Version not found'
      };
    }

    return {
      success: true,
      version: {
        id: versionDoc.id,
        ...versionDoc.data(),
        createdAt: versionDoc.data().createdAt?.toDate()
      }
    };

  } catch (error) {
    console.error('Error getting template version:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Rollback template to a previous version
 */
export const rollbackTemplateVersion = async (templateId, targetVersionId, userId) => {
  try {
    // Get the target version
    const targetVersion = await getTemplateVersion(templateId, targetVersionId);
    
    if (!targetVersion.success) {
      return targetVersion;
    }

    // Create a new version based on the rollback
    const rollbackResult = await createTemplateVersion(templateId, {
      jsonData: targetVersion.version.jsonData,
      versionType: VERSION_TYPES.PATCH,
      changelog: `Rolled back to version ${targetVersion.version.version}`,
      userId,
      previousVersion: await getCurrentVersion(templateId)
    });

    if (rollbackResult.success) {
      return {
        success: true,
        message: `Successfully rolled back to version ${targetVersion.version.version}`,
        newVersion: rollbackResult.version
      };
    }

    return rollbackResult;

  } catch (error) {
    console.error('Error rolling back template version:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update template with new version
 */
export const updateTemplateVersion = async (templateId, updateData, userId) => {
  try {
    const {
      jsonData,
      changelog = 'Template updated',
      versionType = VERSION_TYPES.MINOR
    } = updateData;

    // Get current version
    const currentVersion = await getCurrentVersion(templateId);
    
    // Create new version
    const result = await createTemplateVersion(templateId, {
      jsonData,
      versionType,
      changelog,
      userId,
      previousVersion: currentVersion
    });

    return result;

  } catch (error) {
    console.error('Error updating template version:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Compare two template versions
 */
export const compareTemplateVersions = async (templateId, version1Id, version2Id) => {
  try {
    const [v1Result, v2Result] = await Promise.all([
      getTemplateVersion(templateId, version1Id),
      getTemplateVersion(templateId, version2Id)
    ]);

    if (!v1Result.success || !v2Result.success) {
      return {
        success: false,
        error: 'One or both versions not found'
      };
    }

    const v1Data = JSON.parse(v1Result.version.jsonData);
    const v2Data = JSON.parse(v2Result.version.jsonData);

    const comparison = {
      version1: v1Result.version.version,
      version2: v2Result.version.version,
      changes: analyzeChanges(v1Data, v2Data),
      componentsDiff: getComponentsDiff(v1Data, v2Data),
      sizeDiff: {
        v1Size: JSON.stringify(v1Data).length,
        v2Size: JSON.stringify(v2Data).length,
        difference: JSON.stringify(v2Data).length - JSON.stringify(v1Data).length
      }
    };

    return {
      success: true,
      comparison
    };

  } catch (error) {
    console.error('Error comparing template versions:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get version statistics for a template
 */
export const getTemplateVersionStats = async (templateId) => {
  try {
    const versionsResult = await getTemplateVersions(templateId);
    
    if (!versionsResult.success) {
      return versionsResult;
    }

    const versions = versionsResult.versions;
    
    const stats = {
      totalVersions: versions.length,
      currentVersion: versions[0]?.version || '1.0.0',
      firstVersion: versions[versions.length - 1]?.version || '1.0.0',
      versionTypes: {
        major: versions.filter(v => v.versionType === VERSION_TYPES.MAJOR).length,
        minor: versions.filter(v => v.versionType === VERSION_TYPES.MINOR).length,
        patch: versions.filter(v => v.versionType === VERSION_TYPES.PATCH).length
      },
      totalDownloads: versions.reduce((sum, v) => sum + (v.downloadCount || 0), 0),
      lastUpdate: versions[0]?.createdAt || null,
      updateFrequency: calculateUpdateFrequency(versions)
    };

    return {
      success: true,
      stats
    };

  } catch (error) {
    console.error('Error getting template version stats:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper functions

const calculateNextVersion = (currentVersion, versionType) => {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (versionType) {
    case VERSION_TYPES.MAJOR:
      return `${major + 1}.0.0`;
    case VERSION_TYPES.MINOR:
      return `${major}.${minor + 1}.0`;
    case VERSION_TYPES.PATCH:
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
};

const getCurrentVersion = async (templateId) => {
  try {
    const templateRef = doc(db, 'pageTemplates', templateId);
    const templateDoc = await getDoc(templateRef);
    
    if (templateDoc.exists()) {
      return templateDoc.data().currentVersion || '1.0.0';
    }
    
    return '1.0.0';
  } catch (error) {
    console.error('Error getting current version:', error);
    return '1.0.0';
  }
};

const getVersionCount = async (templateId) => {
  try {
    const versionsRef = collection(db, 'pageTemplates', templateId, 'versions');
    const querySnapshot = await getDocs(versionsRef);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting version count:', error);
    return 0;
  }
};

const analyzeTemplateForAI = (jsonData) => {
  try {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    const componentTypes = [];
    const extractComponents = (node) => {
      if (node.type && node.type.resolvedName) {
        if (!componentTypes.includes(node.type.resolvedName)) {
          componentTypes.push(node.type.resolvedName);
        }
      }
      if (node.nodes) {
        node.nodes.forEach(nodeId => {
          if (data[nodeId]) {
            extractComponents(data[nodeId]);
          }
        });
      }
    };
    
    if (data.ROOT) {
      extractComponents(data.ROOT);
    }
    
    return {
      componentTypes,
      layoutStyle: getLayoutStyle(componentTypes),
      complexity: componentTypes.length > 10 ? 'high' : componentTypes.length > 5 ? 'medium' : 'low',
      hasImages: componentTypes.includes('Image'),
      hasButtons: componentTypes.includes('CraftButton'),
      hasText: componentTypes.includes('Text'),
      isResponsive: true
    };
    
  } catch (error) {
    console.error('Error analyzing template:', error);
    return {
      componentTypes: [],
      layoutStyle: 'basic',
      complexity: 'low',
      hasImages: false,
      hasButtons: false,
      hasText: false,
      isResponsive: true
    };
  }
};

const getLayoutStyle = (componentTypes) => {
  if (componentTypes.some(type => type?.includes('Grid'))) return 'grid';
  if (componentTypes.some(type => type?.includes('Flex'))) return 'flexbox';
  return 'basic';
};

const analyzeChanges = (oldData, newData) => {
  const changes = [];
  
  // Compare node counts
  const oldNodeCount = Object.keys(oldData).length;
  const newNodeCount = Object.keys(newData).length;
  
  if (newNodeCount > oldNodeCount) {
    changes.push(`Added ${newNodeCount - oldNodeCount} new components`);
  } else if (newNodeCount < oldNodeCount) {
    changes.push(`Removed ${oldNodeCount - newNodeCount} components`);
  }
  
  // Check for structure changes
  if (JSON.stringify(oldData.ROOT?.nodes) !== JSON.stringify(newData.ROOT?.nodes)) {
    changes.push('Layout structure modified');
  }
  
  return changes;
};

const getComponentsDiff = (oldData, newData) => {
  const oldComponents = extractComponentTypes(oldData);
  const newComponents = extractComponentTypes(newData);
  
  return {
    added: newComponents.filter(c => !oldComponents.includes(c)),
    removed: oldComponents.filter(c => !newComponents.includes(c)),
    unchanged: oldComponents.filter(c => newComponents.includes(c))
  };
};

const extractComponentTypes = (data) => {
  const types = [];
  
  Object.values(data).forEach(node => {
    if (node.type?.resolvedName && !types.includes(node.type.resolvedName)) {
      types.push(node.type.resolvedName);
    }
  });
  
  return types;
};

const calculateUpdateFrequency = (versions) => {
  if (versions.length < 2) return 'New template';
  
  const latestUpdate = versions[0].createdAt;
  const firstVersion = versions[versions.length - 1].createdAt;
  
  const daysDiff = (latestUpdate - firstVersion) / (1000 * 60 * 60 * 24);
  const avgDaysBetweenUpdates = daysDiff / (versions.length - 1);
  
  if (avgDaysBetweenUpdates < 7) return 'Very frequent';
  if (avgDaysBetweenUpdates < 30) return 'Frequent';
  if (avgDaysBetweenUpdates < 90) return 'Regular';
  return 'Occasional';
};