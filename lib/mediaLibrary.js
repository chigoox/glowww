/**
 * Firebase Media Library Service
 * Handles media storage, retrieval, and management across all user sites
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable
} from 'firebase/storage';
import { db, storage } from './firebase';

/**
 * Storage Location Types
 */
export const STORAGE_TYPES = {
  FIREBASE_STORAGE: 'firebase',
  FIREBASE_URL: 'firebase_url',
  LOCAL: 'local',
  EXTERNAL_URL: 'external'
};

/**
 * Get user's media library from Firestore
 */
export const getUserMediaLibrary = async (userId) => {
  try {
    const mediaRef = collection(db, 'users', userId, 'mediaLibrary');
    const q = query(mediaRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const mediaItems = [];
    querySnapshot.forEach((doc) => {
      mediaItems.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Group by type for easier consumption
    const groupedMedia = {
      images: mediaItems.filter(item => item.type === 'image'),
      videos: mediaItems.filter(item => item.type === 'video')
    };
    
    return groupedMedia;
  } catch (error) {
    console.error('Error getting user media library:', error);
    throw error;
  }
};

/**
 * Upload file to Firebase Storage
 */
export const uploadFileToStorage = async (userId, file, type, onProgress) => {
  try {
    console.log('Starting Firebase Storage upload:', { userId, fileName: file.name, type, fileSize: file.size });
    
    // Check if storage is properly initialized
    if (!storage) {
      throw new Error('Firebase Storage not initialized');
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const fileName = `${timestamp}_${randomId}.${extension}`;
    
    const storagePath = `users/${userId}/media/${type}s/${fileName}`;
    console.log('Storage path:', storagePath);
    
    // Create storage reference
    const storageRef = ref(storage, storagePath);
    
    // Upload file with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          // Progress callback
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload progress:', progress.toFixed(2) + '%');
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('Upload error details:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          reject(error);
        },
        async () => {
          try {
            // Upload completed successfully
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('Upload completed successfully. Download URL:', downloadURL);
            resolve({
              url: downloadURL,
              path: uploadTask.snapshot.ref.fullPath,
              size: uploadTask.snapshot.totalBytes
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Save media item to Firestore
 */
export const saveMediaToLibrary = async (userId, mediaData) => {
  try {
    const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const mediaRef = doc(db, 'users', userId, 'mediaLibrary', mediaId);
    
    const mediaDoc = {
      ...mediaData,
      id: mediaId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(mediaRef, mediaDoc);
    
    return { ...mediaDoc, id: mediaId };
  } catch (error) {
    console.error('Error saving media to library:', error);
    throw error;
  }
};

/**
 * Delete media item from library and storage
 */
export const deleteMediaFromLibrary = async (userId, mediaId, storagePath) => {
  try {
    // Delete from Firestore
    await deleteDoc(doc(db, 'users', userId, 'mediaLibrary', mediaId));
    
    // Delete from Firebase Storage if it's stored there
    if (storagePath) {
      try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      } catch (storageError) {
        console.warn('Could not delete from storage (file may not exist):', storageError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting media:', error);
    throw error;
  }
};

/**
 * Add external URL to media library
 */
export const addExternalUrlToLibrary = async (userId, urlData) => {
  try {
    const mediaData = {
      name: urlData.name,
      url: urlData.url,
      type: urlData.type,
      storageType: STORAGE_TYPES.EXTERNAL_URL,
      thumbnail: urlData.thumbnail,
      isExternal: true,
      metadata: {
        originalUrl: urlData.url,
        addedMethod: 'url_input'
      }
    };
    
    return await saveMediaToLibrary(userId, mediaData);
  } catch (error) {
    console.error('Error adding external URL to library:', error);
    throw error;
  }
};

/**
 * Get local storage media library (fallback)
 */
export const getLocalMediaLibrary = () => {
  try {
    const stored = localStorage.getItem('glow_media_library');
    return stored ? JSON.parse(stored) : { images: [], videos: [] };
  } catch (error) {
    console.error('Error getting local media library:', error);
    return { images: [], videos: [] };
  }
};

/**
 * Save to local storage media library (fallback)
 */
export const saveToLocalMediaLibrary = (mediaData) => {
  try {
    const current = getLocalMediaLibrary();
    const type = mediaData.type === 'video' ? 'videos' : 'images';
    
    // Add storage type indicator
    const mediaWithStorage = {
      ...mediaData,
      storageType: STORAGE_TYPES.LOCAL,
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      createdAt: new Date().toISOString()
    };
    
    current[type].unshift(mediaWithStorage);
    
    // Keep only last 50 items per type to avoid storage bloat
    current[type] = current[type].slice(0, 50);
    
    localStorage.setItem('glow_media_library', JSON.stringify(current));
    return mediaWithStorage;
  } catch (error) {
    console.error('Error saving to local media library:', error);
    throw error;
  }
};

/**
 * Delete from local storage media library
 */
export const deleteFromLocalMediaLibrary = (mediaId) => {
  try {
    const current = getLocalMediaLibrary();
    
    current.images = current.images.filter(item => item.id !== mediaId);
    current.videos = current.videos.filter(item => item.id !== mediaId);
    
    localStorage.setItem('glow_media_library', JSON.stringify(current));
    return true;
  } catch (error) {
    console.error('Error deleting from local media library:', error);
    return false;
  }
};

/**
 * Generate video thumbnail for various platforms
 */
export const generateVideoThumbnail = (videoUrl) => {
  try {
    // YouTube
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      let videoId;
      if (videoUrl.includes('youtu.be/')) {
        videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
      } else if (videoUrl.includes('youtube.com/watch?v=')) {
        videoId = videoUrl.split('v=')[1].split('&')[0];
      }
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    
    // Vimeo
    if (videoUrl.includes('vimeo.com')) {
      const videoId = videoUrl.split('vimeo.com/')[1].split('?')[0];
      if (videoId) {
        return `https://vumbnail.com/${videoId}.jpg`;
      }
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to generate video thumbnail:', error);
    return null;
  }
};

/**
 * Validate file type and size
 */
/**
 * Validate file type and size with optional custom limits
 */
export const validateFile = (file, type = 'image', customLimits = null) => {
  const defaultMaxSizes = {
    image: 10 * 1024 * 1024, // 10MB
    video: 100 * 1024 * 1024 // 100MB
  };
  
  const maxSizes = customLimits || defaultMaxSizes;
  
  const allowedTypes = {
    image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/mov', 'video/avi']
  };
  
  if (file.size > maxSizes[type]) {
    throw new Error(`File size must be less than ${maxSizes[type] / 1024 / 1024}MB`);
  }
  
  if (!allowedTypes[type].includes(file.type)) {
    throw new Error(`File type ${file.type} is not supported for ${type}s`);
  }
  
  return true;
};
