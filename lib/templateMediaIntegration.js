/**
 * Template Media Integration Service
 * Extends MediaLibrary functionality for template thumbnails and previews
 */

import { 
  getUserMediaLibrary, 
  saveMediaItem, 
  deleteMediaItem, 
  STORAGE_TYPES 
} from './mediaLibrary';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { storage } from './firebase';

/**
 * Template-specific media categories
 */
export const TEMPLATE_MEDIA_TYPES = {
  THUMBNAIL: 'template_thumbnail',
  PREVIEW: 'template_preview',
  HERO_IMAGE: 'template_hero_image'
};

/**
 * Upload template thumbnail with optimization
 */
export const uploadTemplateThumbnail = async (file, templateId, userId) => {
  try {
    // Validate file
    if (!file || !file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Please upload an image.');
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File size too large. Please upload an image under 5MB.');
    }
    
    // Create optimized filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const filename = `templates/${templateId}/thumbnail_${timestamp}.${extension}`;
    
    // Upload to Firebase Storage
    const storageRef = ref(storage, `users/${userId}/templates/${filename}`);
    const uploadResult = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(uploadResult.ref);
    
    // Save to media library
    const mediaItem = {
      name: `Template Thumbnail - ${templateId}`,
      url: downloadURL,
      type: TEMPLATE_MEDIA_TYPES.THUMBNAIL,
      size: file.size,
      mimeType: file.type,
      storageType: STORAGE_TYPES.FIREBASE_STORAGE,
      templateId: templateId,
      storagePath: filename,
      width: null, // Will be populated by client-side analysis
      height: null,
      tags: ['template', 'thumbnail'],
      isTemplateThumbnail: true
    };
    
    const savedItem = await saveMediaItem(userId, mediaItem);
    
    return {
      success: true,
      mediaItem: savedItem,
      url: downloadURL
    };
    
  } catch (error) {
    console.error('Error uploading template thumbnail:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Upload multiple template preview images
 */
export const uploadTemplatePreviewImages = async (files, templateId, userId) => {
  try {
    if (!files || files.length === 0) {
      return { success: true, mediaItems: [] };
    }
    
    if (files.length > 5) {
      throw new Error('Maximum 5 preview images allowed per template');
    }
    
    const uploadPromises = files.map(async (file, index) => {
      // Validate each file
      if (!file.type.startsWith('image/')) {
        throw new Error(`File ${index + 1} is not a valid image`);
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit for previews
        throw new Error(`File ${index + 1} is too large (max 10MB)`);
      }
      
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const filename = `templates/${templateId}/preview_${index}_${timestamp}.${extension}`;
      
      // Upload to Firebase Storage
      const storageRef = ref(storage, `users/${userId}/templates/${filename}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      // Create media item
      const mediaItem = {
        name: `Template Preview ${index + 1} - ${templateId}`,
        url: downloadURL,
        type: TEMPLATE_MEDIA_TYPES.PREVIEW,
        size: file.size,
        mimeType: file.type,
        storageType: STORAGE_TYPES.FIREBASE_STORAGE,
        templateId: templateId,
        storagePath: filename,
        previewIndex: index,
        tags: ['template', 'preview'],
        isTemplatePreview: true
      };
      
      return await saveMediaItem(userId, mediaItem);
    });
    
    const mediaItems = await Promise.all(uploadPromises);
    
    return {
      success: true,
      mediaItems
    };
    
  } catch (error) {
    console.error('Error uploading template previews:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get all media items for a specific template
 */
export const getTemplateMediaItems = async (userId, templateId) => {
  try {
    const allMedia = await getUserMediaLibrary(userId);
    
    const templateMedia = allMedia.filter(item => 
      item.templateId === templateId &&
      (item.isTemplateThumbnail || item.isTemplatePreview)
    );
    
    // Separate thumbnails and previews
    const thumbnails = templateMedia.filter(item => 
      item.type === TEMPLATE_MEDIA_TYPES.THUMBNAIL
    );
    
    const previews = templateMedia
      .filter(item => item.type === TEMPLATE_MEDIA_TYPES.PREVIEW)
      .sort((a, b) => (a.previewIndex || 0) - (b.previewIndex || 0));
    
    return {
      success: true,
      thumbnail: thumbnails[0] || null,
      previews: previews
    };
    
  } catch (error) {
    console.error('Error getting template media:', error);
    return {
      success: false,
      error: error.message,
      thumbnail: null,
      previews: []
    };
  }
};

/**
 * Delete all media associated with a template
 */
export const deleteTemplateMedia = async (userId, templateId) => {
  try {
    const templateMedia = await getTemplateMediaItems(userId, templateId);
    
    if (!templateMedia.success) {
      return templateMedia;
    }
    
    const mediaToDelete = [
      ...(templateMedia.thumbnail ? [templateMedia.thumbnail] : []),
      ...templateMedia.previews
    ];
    
    const deletePromises = mediaToDelete.map(mediaItem => 
      deleteMediaItem(userId, mediaItem.id)
    );
    
    await Promise.all(deletePromises);
    
    return {
      success: true,
      deletedCount: mediaToDelete.length
    };
    
  } catch (error) {
    console.error('Error deleting template media:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate thumbnail from page screenshot (for auto-thumbnails)
 */
export const generateTemplateScreenshot = async (pageData, templateId, userId) => {
  try {
    // This would integrate with a screenshot service like Puppeteer
    // For now, return a placeholder response
    
    console.log('Screenshot generation would be implemented here');
    
    // Placeholder implementation
    return {
      success: false,
      error: 'Screenshot generation not implemented yet'
    };
    
  } catch (error) {
    console.error('Error generating template screenshot:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Optimize image for template usage
 */
export const optimizeTemplateImage = (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      const aspectRatio = img.width / img.height;
      let newWidth = Math.min(img.width, maxWidth);
      let newHeight = newWidth / aspectRatio;
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to optimize image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Get template media URLs for marketplace display
 */
export const getTemplateMediaUrls = async (templateData) => {
  try {
    // Extract media references from template data
    const parsedData = typeof templateData === 'string' ? 
      JSON.parse(templateData) : templateData;
    
    const imageUrls = [];
    
    // Traverse template nodes to find image URLs
    const traverseNodes = (nodeId) => {
      const node = parsedData[nodeId];
      if (node) {
        // Check for image nodes
        if (node.type?.resolvedName === 'Image' && node.props?.src) {
          imageUrls.push({
            url: node.props.src,
            alt: node.props.alt || '',
            nodeId: nodeId
          });
        }
        
        // Check for background images
        if (node.props?.style?.backgroundImage) {
          const bgUrl = node.props.style.backgroundImage.replace(/url\(['"]?([^'"]+)['"]?\)/, '$1');
          if (bgUrl && bgUrl !== node.props.style.backgroundImage) {
            imageUrls.push({
              url: bgUrl,
              alt: 'Background image',
              nodeId: nodeId
            });
          }
        }
        
        // Traverse child nodes
        if (node.nodes) {
          node.nodes.forEach(childId => traverseNodes(childId));
        }
      }
    };
    
    if (parsedData.ROOT) {
      traverseNodes('ROOT');
    }
    
    return {
      success: true,
      imageUrls
    };
    
  } catch (error) {
    console.error('Error extracting template media URLs:', error);
    return {
      success: false,
      error: error.message,
      imageUrls: []
    };
  }
};