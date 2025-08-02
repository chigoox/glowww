'use client'

import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Upload, Button as AntButton, Button, message, Divider, Progress, Alert, Space, Typography, notification } from 'antd';
import {
  PictureOutlined,
  VideoCameraOutlined,
  UploadOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  LinkOutlined,
  CrownOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  getUserSubscription,
  checkUserLimits,
  updateUserUsage,
  SUBSCRIPTION_TIERS,
  formatStorageSize 
} from '../../../lib/subscriptions';

const { TabPane } = Tabs;
const { Text } = Typography;

// Mock media library data
const MOCK_MEDIA_LIBRARY = {
  images: [
    {
      id: 1,
      name: 'Mountain Landscape',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=60',
      category: 'nature'
    },
    {
      id: 2,
      name: 'City Skyline',
      url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&auto=format&fit=crop&q=60',
      category: 'urban'
    },
    {
      id: 3,
      name: 'Ocean Waves',
      url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&auto=format&fit=crop&q=60',
      category: 'nature'
    },
    {
      id: 4,
      name: 'Forest Path',
      url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop&q=60',
      category: 'nature'
    },
    {
      id: 5,
      name: 'Desert Sunset',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=60',
      category: 'nature'
    },
    {
      id: 6,
      name: 'Modern Architecture',
      url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=60',
      category: 'architecture'
    }
  ],
  videos: [
    {
      id: 1,
      name: 'Nature Documentary',
      url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&auto=format&fit=crop&q=60',
      category: 'nature'
    },
    {
      id: 2,
      name: 'City Timelapse',
      url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&auto=format&fit=crop&q=60',
      category: 'urban'
    },
    {
      id: 3,
      name: 'Ocean Waves',
      url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=400&auto=format&fit=crop&q=60',
      category: 'nature'
    }
  ]
};

// URL Input Form Component
const URLInputForm = ({ onSelect, onClose, onAddToLibrary }) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveToLibrary, setSaveToLibrary] = useState(true);

  const handleSubmit = async () => {
    if (!url.trim()) {
      message.error('Please enter a valid URL');
      return;
    }

    setLoading(true);
    
    try {
      // Auto-detect media type from URL
      const isVideo = url.includes('youtube.com') || url.includes('youtu.be') || 
                     url.includes('vimeo.com') || url.includes('.mp4') || 
                     url.includes('.webm') || url.includes('.mov') ||
                     url.includes('.avi') || url.includes('.mkv');
      
      const mediaData = {
        id: Date.now() + Math.random(),
        name: name.trim() || (isVideo ? 'Video from URL' : 'Image from URL'),
        url: url.trim(),
        isExternal: true,
        isFromURL: true,
        addedDate: new Date().toISOString(),
        // For videos, try to extract thumbnail from YouTube/Vimeo
        thumbnail: isVideo ? generateVideoThumbnail(url.trim()) : url.trim()
      };

      // If saveToLibrary is enabled, add to user uploads for later reuse
      if (saveToLibrary && onAddToLibrary) {
        const mediaType = isVideo ? 'videos' : 'images';
        await onAddToLibrary(mediaData, mediaType);
      }

      // Also immediately select the media
      onSelect(mediaData, isVideo ? 'video' : 'image');
      setUrl('');
      setName('');
      message.success(`${isVideo ? 'Video' : 'Image'} ${saveToLibrary ? 'added to library and ' : ''}selected successfully!`);
    } catch (error) {
      message.error('Failed to add media from URL');
      console.error('URL media error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate thumbnail URL for video platforms
  const generateVideoThumbnail = (videoUrl) => {
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
          // Note: This would need API call for actual thumbnail, using placeholder
          return `https://vumbnail.com/${videoId}.jpg`;
        }
      }
      
      // For direct video files, return null (no thumbnail available)
      return null;
    } catch (error) {
      console.warn('Failed to generate video thumbnail:', error);
      return null;
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
          Media URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/image.jpg or https://youtube.com/watch?v=..."
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
      </div>
      
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
          Display Name (Optional)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name for this media"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            fontSize: '14px'
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={saveToLibrary}
            onChange={(e) => setSaveToLibrary(e.target.checked)}
            style={{ marginRight: 4 }}
          />
          <span style={{ fontWeight: 500 }}>Save to Library</span>
        </label>
        <div style={{ fontSize: '12px', color: '#666', marginLeft: 20, marginTop: 4 }}>
          When enabled, this media will be saved to your uploads for reuse in future projects
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <AntButton onClick={onClose}>
          Cancel
        </AntButton>
        <AntButton 
          type="primary" 
          onClick={handleSubmit}
          loading={loading}
          disabled={!url.trim()}
        >
          Add Media
        </AntButton>
      </div>
    </div>
  );
};

// Main MediaLibrary Component
const MediaLibrary = ({ 
  visible, 
  onClose, 
  onSelect, 
  type = 'both', // 'images', 'videos', or 'both'
  title = 'Media Library'
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(type === 'videos' ? 'videos' : 'images');
  const [uploading, setUploading] = useState(false);
  const [userUploads, setUserUploads] = useState({
    images: [],
    videos: []
  });
  
  // Subscription state
  const [subscription, setSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  
  // Load subscription data
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user?.uid) {
        setLoadingSubscription(false);
        return;
      }
      
      try {
        const subData = await getUserSubscription(user.uid);
        setSubscription(subData);
      } catch (error) {
        console.error('Error loading subscription:', error);
        // Set default free tier if error
        setSubscription({
          tier: SUBSCRIPTION_TIERS.FREE,
          limits: {
            maxStorage: 100 * 1024 * 1024, // 100MB
            maxImages: 20,
            maxVideos: 5,
            maxImageSize: 2 * 1024 * 1024, // 2MB
            maxVideoSize: 10 * 1024 * 1024, // 10MB
          },
          usage: {
            storageUsed: 0,
            imageCount: 0,
            videoCount: 0,
            sitesCount: 0
          }
        });
      } finally {
        setLoadingSubscription(false);
      }
    };
    
    loadSubscription();
  }, [user?.uid]);

  // Load user uploads from localStorage on component mount
  useEffect(() => {
    const savedUploads = localStorage.getItem('glowww_user_uploads');
    if (savedUploads) {
      try {
        const uploads = JSON.parse(savedUploads);
        setUserUploads(uploads);
      } catch (error) {
        console.warn('Failed to parse saved uploads:', error);
      }
    }
  }, []);

  // Save user uploads to localStorage with size management
  const saveUserUploads = (uploads) => {
    try {
      const dataString = JSON.stringify(uploads);
      const sizeInMB = new Blob([dataString]).size / (1024 * 1024);
      
      // If data is too large, remove oldest uploads
      if (sizeInMB > 4) {
        const reducedUploads = {
          images: uploads.images.slice(-10), // Keep last 10 images
          videos: uploads.videos.slice(-5)   // Keep last 5 videos
        };
        localStorage.setItem('glowww_user_uploads', JSON.stringify(reducedUploads));
        setUserUploads(reducedUploads);
        message.warning('Storage limit reached. Older uploads have been removed.');
      } else {
        localStorage.setItem('glowww_user_uploads', dataString);
        setUserUploads(uploads);
      }
    } catch (error) {
      console.warn('Failed to save user uploads to localStorage:', error);
      
      // If quota exceeded, try to save a minimal version
      if (error.name === 'QuotaExceededError') {
        const minimalUploads = {
          images: uploads.images.slice(-5),
          videos: uploads.videos.slice(-2)
        };
        try {
          localStorage.setItem('glowww_user_uploads', JSON.stringify(minimalUploads));
          setUserUploads(minimalUploads);
          message.warning('Storage quota exceeded. Only recent uploads saved.');
        } catch (secondError) {
          message.error('Unable to save uploads. Storage quota exceeded.');
        }
      } else {
        message.error('Failed to save uploads');
      }
    }
  };

  // Compress image before storing
  const compressImage = (file, quality = 0.7) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 800x600)
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.onerror = () => {
        console.warn('Failed to compress image, using original');
        resolve(file);
      };
      
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle file upload
  const handleFileUpload = async (file, fileType) => {
    setUploading(true);
    
    try {
      let fileUrl;
      let finalFileSize = file.size;
      
      // For images, compress them to save space
      if (fileType === 'images' && file.type.startsWith('image/')) {
        const compressedFile = await compressImage(file);
        fileUrl = URL.createObjectURL(compressedFile);
        finalFileSize = compressedFile.size;
      } else {
        fileUrl = URL.createObjectURL(file);
      }
      
      const fileData = {
        id: Date.now() + Math.random(),
        name: file.name,
        url: fileUrl,
        size: finalFileSize,
        type: file.type,
        uploadDate: new Date().toISOString(),
        isUserUpload: true
      };

      // For videos, create a thumbnail if possible
      if (fileType === 'videos' && file.type.startsWith('video/')) {
        try {
          const thumbnail = await createVideoThumbnail(file);
          fileData.thumbnail = thumbnail;
        } catch (error) {
          console.warn('Failed to create video thumbnail:', error);
        }
      }
      
      // Update subscription usage tracking
      if (user?.uid) {
        try {
          await updateUserUsage(user.uid, {
            storageUsed: finalFileSize,
            imageCount: fileType === 'images' ? 1 : 0,
            videoCount: fileType === 'videos' ? 1 : 0
          });
          
          // Reload subscription data to update UI
          const updatedSubscription = await getUserSubscription(user.uid);
          setSubscription(updatedSubscription);
        } catch (error) {
          console.error('Failed to update usage tracking:', error);
          // Continue with upload even if usage tracking fails
        }
      }
      
      const newUploads = {
        ...userUploads,
        [fileType]: [...userUploads[fileType], fileData]
      };
      
      saveUserUploads(newUploads);
      message.success(`${fileType.slice(0, -1)} uploaded successfully!`);
      setUploading(false);
      
      return fileData;
    } catch (error) {
      message.error('Upload failed');
      setUploading(false);
      console.error('Upload error:', error);
      throw error;
    }
  };

  // Create video thumbnail
  const createVideoThumbnail = (videoFile) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.currentTime = 1; // Seek to 1 second
      };
      
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
        URL.revokeObjectURL(video.src);
      };
      
      video.onerror = () => reject(new Error('Failed to create thumbnail'));
      
      video.src = URL.createObjectURL(videoFile);
    });
  };

  // Calculate storage usage
  const getStorageUsage = () => {
    try {
      const savedUploads = localStorage.getItem('glowww_user_uploads');
      if (!savedUploads) return { usedMB: 0, percentage: 0 };
      
      const sizeInBytes = new Blob([savedUploads]).size;
      const usedMB = sizeInBytes / (1024 * 1024);
      const maxMB = 5; // 5MB limit
      const percentage = Math.min((usedMB / maxMB) * 100, 100);
      
      return { usedMB: usedMB.toFixed(2), percentage: percentage.toFixed(1) };
    } catch {
      return { usedMB: 0, percentage: 0 };
    }
  };

  const storageUsage = getStorageUsage();

  // Delete uploaded file
  const deleteUserUpload = async (fileId, fileType) => {
    const fileToDelete = userUploads[fileType].find(file => file.id === fileId);
    if (!fileToDelete) return;
    
    const newUploads = {
      ...userUploads,
      [fileType]: userUploads[fileType].filter(file => file.id !== fileId)
    };
    
    saveUserUploads(newUploads);
    
    // Update subscription usage tracking
    if (user?.uid && fileToDelete.size) {
      try {
        await updateUserUsage(user.uid, {
          storageUsed: -fileToDelete.size, // Negative to decrease usage
          imageCount: fileType === 'images' ? -1 : 0,
          videoCount: fileType === 'videos' ? -1 : 0
        });
        
        // Reload subscription data to update UI
        const updatedSubscription = await getUserSubscription(user.uid);
        setSubscription(updatedSubscription);
      } catch (error) {
        console.error('Failed to update usage tracking:', error);
        // Continue with deletion even if usage tracking fails
      }
    }
    
    message.success('File deleted successfully');
  };

  // Handle adding URL-based media to user library
  const handleAddToLibrary = async (mediaData, mediaType) => {
    try {
      const newUploads = {
        ...userUploads,
        [mediaType]: [...userUploads[mediaType], mediaData]
      };
      saveUserUploads(newUploads);
      console.log(`Added ${mediaType.slice(0, -1)} from URL to library:`, mediaData);
    } catch (error) {
      console.error('Failed to add URL media to library:', error);
      message.error('Failed to save media to library');
      throw error;
    }
  };

  // Handle item selection
  const handleSelect = (item, itemType) => {
    console.log('MediaLibrary - Selecting item:', item, 'Type:', itemType);
    onSelect(item, itemType);
    onClose();
  };

  // Enhanced file size calculation
  const getFileSize = (file) => {
    if (file.type.startsWith('image/')) {
      // For images, we need to estimate compressed size
      return file.size * 0.7; // Assume 30% compression for images
    }
    return file.size; // For videos, use actual size
  };

  // Upload configuration
  const uploadProps = {
    beforeUpload: async (file) => {
      if (!user?.uid || !subscription) {
        notification.error({
          message: 'Authentication Required',
          description: 'Please log in to upload media files.',
        });
        return false;
      }

      const fileType = activeTab;
      const estimatedSize = getFileSize(file);
      
      console.log('Uploading file:', file.name, 'Type:', file.type, 'Tab:', fileType);
      
      // Validate file type
      if (fileType === 'images') {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
          message.error('Please upload a valid image file');
          return false;
        }
      } else if (fileType === 'videos') {
        const isVideo = file.type.startsWith('video/');
        if (!isVideo) {
          message.error('Please upload a valid video file');
          return false;
        }
      }
      
      try {
        // Check subscription limits
        const canUpload = await checkUserLimits(user.uid, 'upload_file', {
          fileType: fileType === 'images' ? 'image' : 'video',
          fileSize: estimatedSize
        });

        if (!canUpload.allowed) {
          // Show appropriate error based on limit type
          if (canUpload.reason === 'storage_exceeded') {
            const storageUsed = formatStorageSize(subscription.usage.storageUsed);
            const storageLimit = formatStorageSize(subscription.limits.maxStorage);
            
            notification.error({
              message: 'Storage Limit Reached',
              description: `You've used ${storageUsed} of your ${storageLimit} storage limit. ${subscription.tier === SUBSCRIPTION_TIERS.FREE ? 'Upgrade to Pro for 10GB storage!' : 'Please delete some files to continue.'}`,
              duration: 6,
            });
          } else if (canUpload.reason === 'file_count_exceeded') {
            const fileCategory = fileType === 'images' ? 'image' : 'video';
            const currentCount = fileCategory === 'image' ? subscription.usage.imageCount : subscription.usage.videoCount;
            const limit = fileCategory === 'image' ? subscription.limits.maxImages : subscription.limits.maxVideos;
            
            notification.error({
              message: `${fileCategory === 'image' ? 'Image' : 'Video'} Limit Reached`,
              description: `You've reached your limit of ${limit} ${fileCategory}s (currently ${currentCount}). ${subscription.tier === SUBSCRIPTION_TIERS.FREE ? 'Upgrade to Pro for unlimited uploads!' : 'Please delete some files to continue.'}`,
              duration: 6,
            });
          } else if (canUpload.reason === 'file_size_exceeded') {
            const fileCategory = fileType === 'images' ? 'image' : 'video';
            const maxSize = fileCategory === 'image' ? subscription.limits.maxImageSize : subscription.limits.maxVideoSize;
            
            notification.error({
              message: 'File Too Large',
              description: `${fileCategory === 'image' ? 'Images' : 'Videos'} must be smaller than ${formatStorageSize(maxSize)}. ${subscription.tier === SUBSCRIPTION_TIERS.FREE ? 'Upgrade to Pro for larger file limits!' : ''}`,
              duration: 6,
            });
          }
          
          return false;
        }
        
        await handleFileUpload(file, fileType);
        return false;
      } catch (error) {
        console.error('File upload failed:', error);
        message.error('Upload failed');
        return false;
      }
    },
    multiple: true,
    showUploadList: false,
    accept: activeTab === 'images' ? 'image/*' : 'video/*'
  };

  // Calculate subscription-aware storage info
  const getSubscriptionStorageInfo = () => {
    if (!subscription) {
      return { usedDisplay: '0 MB', limitDisplay: '100 MB', percentage: 0, isNearLimit: false };
    }
    
    const usedMB = subscription.usage.storageUsed / (1024 * 1024);
    const limitMB = subscription.limits.maxStorage / (1024 * 1024);
    const percentage = Math.min((usedMB / limitMB) * 100, 100);
    
    return {
      usedDisplay: formatStorageSize(subscription.usage.storageUsed),
      limitDisplay: formatStorageSize(subscription.limits.maxStorage),
      percentage: percentage.toFixed(1),
      isNearLimit: percentage > 80
    };
  };

  const storageInfo = getSubscriptionStorageInfo();

  return (
    <Modal
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{title}</span>
          <div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
            {loadingSubscription ? (
              <div>Loading subscription...</div>
            ) : subscription ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span>
                    {subscription.tier === SUBSCRIPTION_TIERS.FREE && '🆓'} 
                    {subscription.tier === SUBSCRIPTION_TIERS.PRO && '⭐'} 
                    {subscription.tier === SUBSCRIPTION_TIERS.ADMIN && '👑'} 
                    {subscription.tier.toUpperCase()}
                  </span>
                  {subscription.tier === SUBSCRIPTION_TIERS.FREE && (
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: '0 4px', height: 'auto', fontSize: '10px' }}
                      onClick={() => window.open('/pricing', '_blank')}
                    >
                      Upgrade
                    </Button>
                  )}
                </div>
                <div>
                  Storage: {storageInfo.usedDisplay} / {storageInfo.limitDisplay} ({storageInfo.percentage}%)
                </div>
                <div style={{ 
                  width: 120, 
                  height: 4, 
                  backgroundColor: '#f0f0f0', 
                  borderRadius: 2, 
                  marginTop: 2,
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: `${storageInfo.percentage}%`, 
                    height: '100%', 
                    backgroundColor: storageInfo.isNearLimit ? '#ff4d4f' : '#52c41a',
                    transition: 'width 0.3s'
                  }} />
                </div>
                <div style={{ fontSize: '10px', marginTop: 2 }}>
                  Images: {subscription.usage.imageCount}/{subscription.limits.maxImages === -1 ? '∞' : subscription.limits.maxImages} • 
                  Videos: {subscription.usage.videoCount}/{subscription.limits.maxVideos === -1 ? '∞' : subscription.limits.maxVideos}
                  {subscription.tier === SUBSCRIPTION_TIERS.ADMIN && (
                    <div style={{ color: '#722ed1', marginTop: 2 }}>
                      👑 Admin - Unlimited Access
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div>No subscription data</div>
            )}
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      style={{ top: 20 }}
      zIndex={99999}
    >
      {/* Subscription Status Alerts */}
      {subscription && (
        <>
          {/* Near Limit Warning */}
          {storageInfo.percentage > 80 && subscription.tier === SUBSCRIPTION_TIERS.FREE && (
            <Alert
              message="Storage Nearly Full"
              description={
                <div>
                  You're using {storageInfo.percentage}% of your storage limit. 
                  <Button 
                    type="link" 
                    size="small" 
                    style={{ padding: '0 4px' }}
                    onClick={() => window.open('/pricing', '_blank')}
                  >
                    Upgrade to Pro
                  </Button> 
                  for 10GB storage!
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          
          {/* File Count Warning */}
          {subscription.tier === SUBSCRIPTION_TIERS.FREE && (
            (subscription.usage.imageCount >= subscription.limits.maxImages * 0.8 || 
             subscription.usage.videoCount >= subscription.limits.maxVideos * 0.8) && (
            <Alert
              message="Upload Limit Approaching"
              description={
                <div>
                  {subscription.usage.imageCount >= subscription.limits.maxImages * 0.8 && 
                    `Images: ${subscription.usage.imageCount}/${subscription.limits.maxImages}. `}
                  {subscription.usage.videoCount >= subscription.limits.maxVideos * 0.8 && 
                    `Videos: ${subscription.usage.videoCount}/${subscription.limits.maxVideos}. `}
                  <Button 
                    type="link" 
                    size="small" 
                    style={{ padding: '0 4px' }}
                    onClick={() => window.open('/pricing', '_blank')}
                  >
                    Upgrade to Pro
                  </Button> 
                  for unlimited uploads!
                </div>
              }
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          ))}
        </>
      )}
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={[
          // Images tab
          ...(type === 'both' || type === 'images' ? [{
            key: 'images',
            label: (
              <span>
                <PictureOutlined />
                Images ({MOCK_MEDIA_LIBRARY.images.length + userUploads.images.length})
              </span>
            ),
            children: (
              <div>
                {/* Upload Section */}
                <div style={{ 
                  marginBottom: 24, 
                  padding: 16, 
                  border: '2px dashed #d9d9d9', 
                  borderRadius: 8,
                  textAlign: 'center',
                  backgroundColor: '#fafafa'
                }}>
                  <Upload {...uploadProps} disabled={uploading}>
                    <AntButton 
                      icon={<UploadOutlined />} 
                      loading={uploading}
                      size="large"
                    >
                      {uploading ? 'Uploading...' : 'Upload Images'}
                    </AntButton>
                  </Upload>
                  <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
                    Supports: JPG, PNG, GIF, WebP • 
                    {subscription ? `Max size: ${formatStorageSize(subscription.limits.maxImageSize)}` : 'Max size: 2MB'} • 
                    Multiple files allowed • Images will be compressed for optimal storage
                    {subscription && subscription.tier === SUBSCRIPTION_TIERS.FREE && (
                      <div style={{ color: '#1890ff', marginTop: 4 }}>
                        ⭐ Upgrade to Pro for larger files and unlimited uploads!
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div style={{ marginTop: 8, color: '#1890ff', fontSize: '12px' }}>
                      Processing file... Please wait.
                    </div>
                  )}
                </div>

                {/* User Uploads */}
                {userUploads.images.length > 0 && (
                  <>
                    <Divider orientation="left">Your Uploads</Divider>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                      {userUploads.images.map(image => (
                        <div
                          key={image.id}
                          style={{
                            position: 'relative',
                            cursor: 'pointer',
                            border: '2px solid transparent',
                            borderRadius: 8,
                            overflow: 'hidden',
                            transition: 'border-color 0.2s'
                          }}
                          onClick={() => handleSelect(image, 'image')}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1890ff'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                        >
                          <img
                            src={image.url}
                            alt={image.name}
                            style={{ width: '100%', height: 120, objectFit: 'cover' }}
                          />
                          <div style={{ 
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            display: 'flex',
                            gap: 4
                          }}>
                            {image.isFromURL && (
                              <div style={{
                                backgroundColor: '#1890ff',
                                color: 'white',
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2
                              }}>
                                <LinkOutlined style={{ fontSize: '8px' }} />
                                URL
                              </div>
                            )}
                            <AntButton
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteUserUpload(image.id, 'images');
                              }}
                              style={{ opacity: 0.8 }}
                            />
                          </div>
                          <div style={{ padding: 8, fontSize: 12, textAlign: 'center' }}>
                            <div>{image.name.length > 20 ? image.name.substring(0, 20) + '...' : image.name}</div>
                            {image.isFromURL && (
                              <div style={{ color: '#1890ff', fontSize: '10px', marginTop: 2 }}>
                                From URL
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Stock Images */}
                <Divider orientation="left">Stock Images</Divider>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {MOCK_MEDIA_LIBRARY.images.map(image => (
                    <div
                      key={image.id}
                      style={{
                        cursor: 'pointer',
                        border: '2px solid transparent',
                        borderRadius: 8,
                        overflow: 'hidden',
                        transition: 'border-color 0.2s'
                      }}
                      onClick={() => handleSelect(image, 'image')}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1890ff'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        style={{ width: '100%', height: 120, objectFit: 'cover' }}
                      />
                      <div style={{ padding: 8, fontSize: 12, textAlign: 'center' }}>
                        {image.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }] : []),

          // Videos tab
          ...(type === 'both' || type === 'videos' ? [{
            key: 'videos',
            label: (
              <span>
                <VideoCameraOutlined />
                Videos ({MOCK_MEDIA_LIBRARY.videos.length + userUploads.videos.length})
              </span>
            ),
            children: (
              <div>
                {/* Upload Section */}
                <div style={{ 
                  marginBottom: 24, 
                  padding: 16, 
                  border: '2px dashed #d9d9d9', 
                  borderRadius: 8,
                  textAlign: 'center',
                  backgroundColor: '#fafafa'
                }}>
                  <Upload {...uploadProps} disabled={uploading}>
                    <AntButton 
                      icon={<UploadOutlined />} 
                      loading={uploading}
                      size="large"
                    >
                      {uploading ? 'Uploading...' : 'Upload Videos'}
                    </AntButton>
                  </Upload>
                  <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
                    Supports: MP4, WebM, MOV, AVI • 
                    {subscription ? `Max size: ${formatStorageSize(subscription.limits.maxVideoSize)}` : 'Max size: 10MB'} • 
                    Multiple files allowed
                    {subscription && subscription.tier === SUBSCRIPTION_TIERS.FREE && (
                      <div style={{ color: '#1890ff', marginTop: 4 }}>
                        ⭐ Upgrade to Pro for larger files and unlimited uploads!
                      </div>
                    )}
                  </div>
                  {uploading && (
                    <div style={{ marginTop: 8, color: '#1890ff', fontSize: '12px' }}>
                      Processing video... This may take a moment for larger files.
                    </div>
                  )}
                </div>

                {/* User Uploads */}
                {userUploads.videos.length > 0 && (
                  <>
                    <Divider orientation="left">Your Uploads</Divider>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
                      {userUploads.videos.map(video => (
                        <div
                          key={video.id}
                          style={{
                            position: 'relative',
                            cursor: 'pointer',
                            border: '2px solid transparent',
                            borderRadius: 8,
                            overflow: 'hidden',
                            transition: 'border-color 0.2s'
                          }}
                          onClick={() => handleSelect(video, 'video')}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1890ff'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                        >
                          <div style={{ position: 'relative' }}>
                            {video.thumbnail ? (
                              <img
                                src={video.thumbnail}
                                alt={video.name}
                                style={{ width: '100%', height: 120, objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{
                                width: '100%',
                                height: 120,
                                background: '#f0f0f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <VideoCameraOutlined style={{ fontSize: 30, color: '#999' }} />
                              </div>
                            )}
                            <PlayCircleOutlined 
                              style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: 30,
                                color: 'white',
                                textShadow: '0 0 10px rgba(0,0,0,0.5)'
                              }}
                            />
                          </div>
                          <div style={{ 
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            display: 'flex',
                            gap: 4
                          }}>
                            {video.isFromURL && (
                              <div style={{
                                backgroundColor: '#1890ff',
                                color: 'white',
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2
                              }}>
                                <LinkOutlined style={{ fontSize: '8px' }} />
                                URL
                              </div>
                            )}
                            <AntButton
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteUserUpload(video.id, 'videos');
                              }}
                              style={{ opacity: 0.8 }}
                            />
                          </div>
                          <div style={{ padding: 8, fontSize: 12, textAlign: 'center' }}>
                            <div>{video.name.length > 25 ? video.name.substring(0, 25) + '...' : video.name}</div>
                            <div style={{ color: '#999', fontSize: '10px' }}>
                              {video.isFromURL ? 'From URL' : `${(video.size / 1024 / 1024).toFixed(1)} MB`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Stock Videos */}
                <Divider orientation="left">Stock Videos</Divider>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {MOCK_MEDIA_LIBRARY.videos.map(video => (
                    <div
                      key={video.id}
                      style={{
                        cursor: 'pointer',
                        border: '2px solid transparent',
                        borderRadius: 8,
                        overflow: 'hidden',
                        transition: 'border-color 0.2s'
                      }}
                      onClick={() => handleSelect(video, 'video')}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1890ff'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                    >
                      <div style={{ position: 'relative' }}>
                        <img
                          src={video.thumbnail}
                          alt={video.name}
                          style={{ width: '100%', height: 120, objectFit: 'cover' }}
                        />
                        <PlayCircleOutlined 
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            fontSize: 30,
                            color: 'white',
                            textShadow: '0 0 10px rgba(0,0,0,0.5)'
                          }}
                        />
                      </div>
                      <div style={{ padding: 8, fontSize: 12, textAlign: 'center' }}>
                        {video.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }] : []),

          // URL tab (show for all types - images, videos, and both)
          {
            key: 'url',
            label: (
              <span>
                <LinkOutlined />
                Add from URL
              </span>
            ),
            children: (
              <div>
                <URLInputForm 
                  onSelect={handleSelect} 
                  onClose={onClose} 
                  onAddToLibrary={handleAddToLibrary}
                />
                
                {/* Quick Test Section */}
                <div style={{ 
                  marginTop: 24, 
                  padding: 16, 
                  backgroundColor: '#f6f8fa', 
                  borderRadius: 6,
                  borderLeft: '4px solid #1890ff'
                }}>
                  <div style={{ fontWeight: 500, marginBottom: 8 }}>Quick Test:</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(type === 'both' || type === 'images') && (
                      <AntButton 
                        size="small"
                        onClick={() => handleSelect({
                          url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
                          name: 'Test Image'
                        }, 'image')}
                      >
                        Add Test Image
                      </AntButton>
                    )}
                    {(type === 'both' || type === 'videos') && (
                      <AntButton 
                        size="small"
                        onClick={() => handleSelect({
                          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                          name: 'Test Video'
                        }, 'video')}
                      >
                        Add Test Video
                      </AntButton>
                    )}
                  </div>
                </div>
              </div>
            )
          }
        ]}
      />
    </Modal>
  );
};

export default MediaLibrary;
