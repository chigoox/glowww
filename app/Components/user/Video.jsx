'use client'

import React, { useRef, useEffect, useState } from "react";
import { useNode } from "@craftjs/core";
import { DragOutlined, EditOutlined, PlayCircleOutlined, UploadOutlined, LinkOutlined } from '@ant-design/icons';

export const Video = ({
  // Video Source
  videoSrc = "",
  videoType = "url", // "url" | "file"
  
  // Video Properties
  autoplay = false,
  controls = true,
  loop = false,
  muted = false,
  preload = "metadata", // "none" | "metadata" | "auto"
  poster = "", // Thumbnail image
  
  // Layout & Position
  width = "100%",
  height = "auto",
  minWidth = "",
  maxWidth = "",
  minHeight = "200px",
  maxHeight = "",
  display = "block",
  position = "relative",
  top = "",
  right = "",
  bottom = "",
  left = "",
  zIndex = 1,
  
  // Spacing
  margin = "10px 0",
  padding = "0",
  
  // Border
  borderWidth = 0,
  borderStyle = "solid",
  borderColor = "#e0e0e0",
  borderRadius = 8,
  
  // Background
  backgroundColor = "#000000",
  
  // Effects
  boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)",
  opacity = 1,
  
  // HTML Attributes
  className = "",
  id = "",
  title = "",
}) => {
  const { connectors: { connect, drag }, actions: { setProp }, selected: isSelected } = useNode((node) => ({
    selected: node.events.selected,
  }));

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [localVideoUrl, setLocalVideoUrl] = useState("");
  const [inputUrl, setInputUrl] = useState(videoSrc);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      connect(drag(videoRef.current));
    }
  }, [connect, drag]);

  // Helper function to process values
  const processValue = (value, property) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === 'number' && !['opacity', 'zIndex'].includes(property)) {
      return `${value}px`;
    }
    return value;
  };

  // Build computed styles
  const computedStyles = {
    width: processValue(width, 'width'),
    height: processValue(height, 'height'),
    minWidth: processValue(minWidth, 'minWidth'),
    maxWidth: processValue(maxWidth, 'maxWidth'),
    minHeight: processValue(minHeight, 'minHeight'),
    maxHeight: processValue(maxHeight, 'maxHeight'),
    display,
    position,
    top: processValue(top, 'top'),
    right: processValue(right, 'right'),
    bottom: processValue(bottom, 'bottom'),
    left: processValue(left, 'left'),
    zIndex,
    margin: processValue(margin, 'margin'),
    padding: processValue(padding, 'padding'),
    borderWidth: processValue(borderWidth, 'borderWidth'),
    borderStyle,
    borderColor,
    borderRadius: processValue(borderRadius, 'borderRadius'),
    backgroundColor,
    boxShadow,
    opacity,
  };

  // Remove undefined values
  Object.keys(computedStyles).forEach(key => {
    if (computedStyles[key] === undefined) {
      delete computedStyles[key];
    }
  });

  const handleEditClick = () => {
    setIsEditing(true);
    setInputUrl(videoSrc);
  };

  const handleSaveEdit = () => {
    if (videoType === "url") {
      setProp(props => props.videoSrc = inputUrl);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setInputUrl(videoSrc);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setIsUploading(true);
      setUploadProgress(0);

      // Simulate upload progress (replace with actual upload logic)
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(uploadInterval);
            setIsUploading(false);
            
            // Create local URL for the video
            const url = URL.createObjectURL(file);
            setLocalVideoUrl(url);
            setProp(props => {
              props.videoSrc = url;
              props.videoType = "file";
            });
            
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    }
  };

  const handleUrlSubmit = () => {
    setProp(props => {
      props.videoSrc = inputUrl;
      props.videoType = "url";
    });
    setIsEditing(false);
  };

  const getVideoElement = () => {
  if (!videoSrc) return null;

  // Check if it's a YouTube/Vimeo/other embed URL
  if (videoSrc.includes('youtube.com') || videoSrc.includes('youtu.be')) {
    let embedUrl = videoSrc;
    if (videoSrc.includes('watch?v=')) {
      const videoId = videoSrc.split('watch?v=')[1].split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (videoSrc.includes('youtu.be/')) {
      const videoId = videoSrc.split('youtu.be/')[1].split('?')[0];
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    }
    
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <iframe
          src={embedUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 'inherit',
            pointerEvents: isSelected ? 'none' : 'auto' // Disable pointer events when selected
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title || "Video"}
        />
        {/* Invisible overlay to capture drag events when selected */}
        {isSelected && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
              cursor: 'grab',
              backgroundColor: 'rgba(0,0,0,0.1)', // Slight overlay to show it's selected
              pointerEvents: 'auto'
            }}
            onMouseDown={e => e.stopPropagation()}
          />
        )}
      </div>
    );
  }

  if (videoSrc.includes('vimeo.com')) {
    const videoId = videoSrc.split('vimeo.com/')[1].split('?')[0];
    const embedUrl = `https://player.vimeo.com/video/${videoId}`;
    
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <iframe
          src={embedUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 'inherit',
            pointerEvents: isSelected ? 'none' : 'auto' // Disable pointer events when selected
          }}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={title || "Video"}
        />
        {/* Invisible overlay to capture drag events when selected */}
        {isSelected && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
              cursor: 'grab',
              backgroundColor: 'rgba(0,0,0,0.1)', // Slight overlay to show it's selected
              pointerEvents: 'auto'
            }}
            onMouseDown={e => e.stopPropagation()}
          />
        )}
      </div>
    );
  }

  // Regular video element for direct video files
  return (
    <video
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        borderRadius: 'inherit',
        pointerEvents: isSelected ? 'none' : 'auto' // Disable pointer events when selected
      }}
      autoPlay={autoplay}
      controls={controls}
      loop={loop}
      muted={muted}
      preload={preload}
      poster={poster}
      title={title}
    >
      <source src={videoSrc} />
      Your browser does not support the video tag.
    </video>
  );
};

  return (
    <div
      className={`${isSelected ? 'ring-2 ring-blue-500' : ''} ${className || ''}`}
      ref={videoRef}
      style={{
        position: 'relative',
        cursor: isSelected && !isEditing ? 'grab' : 'default',
        ...computedStyles
      }}
      id={id}
      title={title}
    >
      {/* Edit button */}
      {isSelected && !isEditing && (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: -12,
            width: 24,
            height: 24,
            background: "#52c41a",
            borderRadius: "50%",
            cursor: "pointer",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 12,
            border: "2px solid white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
          }}
          onClick={handleEditClick}
          onMouseDown={e => e.stopPropagation()}
          title="Edit video source"
        >
          <EditOutlined />
        </div>
      )}

      {/* Video Editor */}
      {isEditing && (
        <div style={{
          position: 'absolute',
          top: -60,
          left: 0,
          right: 0,
          zIndex: 1001,
          background: 'white',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
            Video Source
          </div>
          
          {/* Upload buttons */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: '#1890ff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              disabled={isUploading}
            >
              <UploadOutlined /> Upload File
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                Uploading... {uploadProgress}%
              </div>
              <div style={{
                width: '100%',
                height: '4px',
                background: '#f0f0f0',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: '#1890ff',
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>
          )}

          {/* URL input */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '12px', marginBottom: '4px', color: '#666' }}>
              Or paste video URL (YouTube, Vimeo, direct link):
            </div>
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... or direct video URL"
              style={{
                width: '100%',
                padding: '6px 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleCancelEdit}
              style={{
                background: '#ff4d4f',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              style={{
                background: '#52c41a',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Video Content */}
      <div style={{ 
        width: '100%', 
        height: height === 'auto' ? '300px' : '100%',
        minHeight: processValue(minHeight, 'minHeight') || '200px',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'inherit'
      }}>
        {videoSrc ? getVideoElement() : (
          // Placeholder when no video
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            color: '#999',
            fontSize: '48px',
            borderRadius: 'inherit'
          }}>
            <PlayCircleOutlined />
          </div>
        )}
      </div>
    </div>
  );
};

// Craft configuration
Video.craft = {
  props: {
    videoSrc: "",
    videoType: "url",
    autoplay: false,
    controls: true,
    loop: false,
    muted: false,
    preload: "metadata",
    poster: "",
    width: "100%",
    height: "auto",
    minWidth: "",
    maxWidth: "",
    minHeight: "200px",
    maxHeight: "",
    display: "block",
    position: "relative",
    top: "",
    right: "",
    bottom: "",
    left: "",
    zIndex: 1,
    margin: "10px 0",
    padding: "0",
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#000000",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    opacity: 1,
    className: "",
    id: "",
    title: "",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
    canMoveOut: () => true,
  },
  custom: {
    styleMenu: {
      supportedProps: [
        // Video Properties
        'autoplay',
        'controls',
        'loop',
        'muted',
        'preload',
        'poster',
        
        // Layout & Position
        'width',
        'height',
        'minWidth',
        'maxWidth',
        'minHeight',
        'maxHeight',
        'display',
        'position',
        'top',
        'right',
        'bottom',
        'left',
        'zIndex',
        
        // Spacing
        'margin',
        'padding',
        
        // Border
        'border',
        'borderRadius',
        'objectFit',
        
        // Background
        'backgroundColor',
        
        // Effects
        'boxShadow',
        'opacity',
        
        // HTML Attributes
        'className',
        'id',
        'title',
      ]
    }
  }
};