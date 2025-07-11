'use client'

import React, { useRef, useEffect, useState } from "react";
import { useNode } from "@craftjs/core";
import { createPortal } from 'react-dom';
import { PlayCircleOutlined } from '@ant-design/icons';
import MediaLibrary from '../support/MediaLibrary';
import ContextMenu from "../support/ContextMenu";
import { useContextMenu } from "../support/useContextMenu";
import useEditorDisplay from "../support/useEditorDisplay";

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
  objectFit = "cover",
  
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
  const { id: nodeId, connectors: { connect, drag }, actions: { setProp }, selected: isSelected } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
  }));

  const videoRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  
  // Use our shared editor display hook
  const { hideEditorUI } = useEditorDisplay();

  // Context menu functionality
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();

  // Function to update box position for portal positioning
  const updateBoxPosition = () => {
    if (videoRef.current) {
      const rect = videoRef.current.getBoundingClientRect();
      setBoxPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const connectElements = () => {
      if (videoRef.current) {
        connect(drag(videoRef.current));
      }
    };

    connectElements();
    const timer = setTimeout(connectElements, 50);
    return () => clearTimeout(timer);
  }, [connect, drag, isSelected, isClient]);

  // Update box position when selected or hovered changes
  useEffect(() => {
    if (isSelected || isHovered) {
      updateBoxPosition();
      
      const handleScroll = () => updateBoxPosition();
      const handleResize = () => updateBoxPosition();
      
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isSelected, isHovered]);

  // Handle resize start
  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = videoRef.current.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    
    setIsResizing(true);
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      switch (direction) {
        case 'se':
          newWidth = startWidth + deltaX;
          newHeight = startHeight + deltaY;
          break;
        case 'sw':
          newWidth = startWidth - deltaX;
          newHeight = startHeight + deltaY;
          break;
        case 'ne':
          newWidth = startWidth + deltaX;
          newHeight = startHeight - deltaY;
          break;
        case 'nw':
          newWidth = startWidth - deltaX;
          newHeight = startHeight - deltaY;
          break;
        case 'e':
          newWidth = startWidth + deltaX;
          break;
        case 'w':
          newWidth = startWidth - deltaX;
          break;
        case 's':
          newHeight = startHeight + deltaY;
          break;
        case 'n':
          newHeight = startHeight - deltaY;
          break;
      }
      
      newWidth = Math.max(newWidth, 200);
      newHeight = Math.max(newHeight, 150);
      
      setProp(props => {
        props.width = Math.round(newWidth);
        props.height = Math.round(newHeight);
      });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle custom drag for position changes
  const handleDragStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const currentTop = parseInt(top) || 0;
    const currentLeft = parseInt(left) || 0;
    
    setIsDragging(true);
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      setProp(props => {
        props.left = currentLeft + deltaX;
        props.top = currentTop + deltaY;
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle media selection from library
  const handleMediaSelect = (item, itemType) => {
    if (itemType === 'video') {
      setProp(props => {
        props.videoSrc = item.url;
        props.videoType = item.isExternal ? "url" : "file";
        if (item.name) props.title = item.name;
      });
    }
  };

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
              pointerEvents: isSelected ? 'none' : 'auto'
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title || "Video"}
          />
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
                backgroundColor: 'rgba(0,0,0,0.1)',
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
              pointerEvents: isSelected ? 'none' : 'auto'
            }}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={title || "Video"}
          />
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
                backgroundColor: 'rgba(0,0,0,0.1)',
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
          objectFit: objectFit,
          borderRadius: 'inherit',
          pointerEvents: isSelected ? 'none' : 'auto'
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

  // Don't render until client-side
  if (!isClient) {
    return (
      <div style={computedStyles}>
        {videoSrc ? getVideoElement() : (
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
    );
  }

  return (
    <div
      className={`${isSelected && !hideEditorUI ? 'ring-2 ring-blue-500' : ''} ${isHovered && !hideEditorUI ? 'ring-1 ring-gray-300' : ''} ${className || ''}`}
      ref={(el) => {
        videoRef.current = el;
        if (el) {
          connect(drag(el));
        }
      }}
      style={{
        position: 'relative',
        cursor: 'default',
        userSelect: 'none',
        pointerEvents: 'auto',
        ...computedStyles
      }}
      id={id}
      title={title}
      onMouseEnter={hideEditorUI ? undefined : () => {
        setIsHovered(true);
        updateBoxPosition();
      }}
      onMouseLeave={hideEditorUI ? undefined : () => setIsHovered(false)}
      onContextMenu={hideEditorUI ? undefined : handleContextMenu}
    >
      {/* Portal controls rendered outside this container - hide in preview mode */}
      {isClient && isSelected && !hideEditorUI && (
        <PortalControls
          boxPosition={boxPosition}
          handleDragStart={handleDragStart}
          handleResizeStart={handleResizeStart}
          handleEditClick={() => setShowMediaLibrary(true)}
        />
      )}

      {/* Video Content */}
      <div style={{
        width: '100%',
        height: height === 'auto' ? '100%' : '100%',
        minHeight: processValue(minHeight, 'minHeight') || '200px',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'inherit'
      }}>
        {videoSrc ? getVideoElement() : (
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

      {/* Media Library Modal */}
      <MediaLibrary
        visible={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={handleMediaSelect}
        type="videos" // Only show videos for Video component
        title="Select Video"
      />
      
      {/* Context Menu - hide in preview mode */}
      {!hideEditorUI && (
        <ContextMenu
          visible={contextMenu.visible}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={closeContextMenu}
          targetNodeId={nodeId}
        />
      )}
    </div>
  );
};

// Portal Controls Component
const PortalControls = ({ 
  boxPosition, 
  handleDragStart, 
  handleResizeStart,
  handleEditClick 
}) => {
  if (typeof window === 'undefined') return null;

  return createPortal(
    <div style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {/* Control pills */}
      <div style={{
        position: 'absolute',
        top: boxPosition.top - 35,
        left: boxPosition.left,
        display: 'flex',
        pointerEvents: 'auto'
      }}>
        {/* Left - POS */}
        <div
          style={{
            background: '#52c41a',
            color: 'white',
            padding: '6px 8px',
            borderRadius: '14px 0 0 14px',
            cursor: 'move',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '40px',
            justifyContent: 'center',
            transition: 'background 0.2s ease',
            fontSize: '11px',
            fontWeight: 'bold'
          }}
          onMouseDown={(e) => handleDragStart(e)}
          title="Drag to change position"
        >
          ↕↔ POS
        </div>

        {/* Right - EDIT */}
        <div
          style={{
            background: '#faad14',
            color: 'white',
            padding: '6px 8px',
            borderRadius: '0 14px 14px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '45px',
            justifyContent: 'center',
            transition: 'background 0.2s ease',
            fontSize: '11px',
            fontWeight: 'bold'
          }}
          onClick={handleEditClick}
          title="Change video"
        >
          🎥 EDIT
        </div>
      </div>

      {/* Resize handles */}
      {[
        { position: 'nw', cursor: 'nw-resize', top: -4, left: -4 },
        { position: 'ne', cursor: 'ne-resize', top: -4, left: boxPosition.width - 4 },
        { position: 'sw', cursor: 'sw-resize', top: boxPosition.height - 4, left: -4 },
        { position: 'se', cursor: 'se-resize', top: boxPosition.height - 4, left: boxPosition.width - 4 },
        { position: 'n', cursor: 'n-resize', top: -4, left: boxPosition.width / 2 - 4 },
        { position: 's', cursor: 's-resize', top: boxPosition.height - 4, left: boxPosition.width / 2 - 4 },
        { position: 'w', cursor: 'w-resize', top: boxPosition.height / 2 - 4, left: -4 },
        { position: 'e', cursor: 'e-resize', top: boxPosition.height / 2 - 4, left: boxPosition.width - 4 }
      ].map(handle => (
        <div
          key={handle.position}
          style={{
            position: 'absolute',
            top: boxPosition.top + handle.top,
            left: boxPosition.left + handle.left,
            width: 8,
            height: 8,
            background: 'white',
            border: '2px solid #1890ff',
            borderRadius: '2px',
            cursor: handle.cursor,
            zIndex: 10001,
            pointerEvents: 'auto'
          }}
          onMouseDown={(e) => handleResizeStart(e, handle.position)}
        />
      ))}
    </div>,
    document.body
  );
};

// Craft configuration
Video.craft = {
  displayName: "Video",
  props: {
    
    videoSrc: "",
    videoType: "url",
    autoplay: false,
    controls: true,
    loop: false,
    muted: false,
    preload: "metadata",
    poster: "",
    objectFit: "cover",
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
        'videoSrc',
        'autoplay',
        'controls',
        'loop',
        'muted',
        'preload',
        'poster',
        'objectFit',
        
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
        'borderWidth',
        'borderStyle',
        'borderColor',
        'borderRadius',
        
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