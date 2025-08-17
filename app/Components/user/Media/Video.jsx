'use client'

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useNode, useEditor } from "@craftjs/core";
import { createPortal } from 'react-dom';
import { PlayCircleOutlined } from '@ant-design/icons';
import MediaLibrary from '../../editor/MediaLibrary';
import ContextMenu from "../../utils/context/ContextMenu";
import { useContextMenu } from "../../utils/hooks/useContextMenu";
import useEditorDisplay from "../../utils/context/useEditorDisplay";
import { useMultiSelect } from '../../utils/context/MultiSelectContext';
import SnapPositionHandle from '../../editor/SnapPositionHandle';
import { useCraftSnap } from "../../utils/craft/useCraftSnap";
import ResizeHandles from "../support/ResizeHandles";

export const Video = ({
  // Video Source
  videoSrc = "https://www.youtube.com/watch?v=oASwMQDJPAw",
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
  width = "400px",
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
  backgroundColor = "#ffffff",
  
  // Effects
  boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)",
  opacity = 1,
  
  // HTML Attributes
  className = "",
  id = "",
  title = "",
}) => {
  const { id: nodeId, connectors: { connect, drag }, actions: { setProp }, selected: isSelected, parent } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
    parent: node.data.parent,
  }));
  const { actions: editorActions, query } = useEditor();

  const videoRef = useRef(null);
  const dragRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  
  // Track previous parent to detect container changes
  const prevParentRef = useRef(parent);
  
  // Use our shared editor display hook
  const { hideEditorUI } = useEditorDisplay();

  // Multi-selection hook
  const { isSelected: isMultiSelected, toggleSelection } = useMultiSelect();

  // Snap functionality like GridBox
  const { connectors: { snapConnect, snapDrag } } = useCraftSnap(nodeId);

  // Context menu functionality
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();

  // Function to update box position for portal positioning
  const updateBoxPosition = useCallback(() => {
    if (videoRef.current) {
      const rect = videoRef.current.getBoundingClientRect();
      setBoxPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const connectElements = () => {
      if (videoRef.current) {
        snapConnect(videoRef.current); // Connect for selection with snap functionality
      }
      if (dragRef.current) {
        drag(dragRef.current); // Connect to standard Craft.js drag
      }
    };

    // Always attempt to connect elements
    connectElements();
    
    // Also reconnect when the component is selected or when nodeId changes
    const timer = setTimeout(() => {
      connectElements();
      // Reduce logging frequency for connector re-establishment
      if (Math.random() < 0.1) { // Only log 10% of the time
        console.log('🔗 Connectors re-established for Video node:', nodeId);
      }
    }, 100); // Give DOM time to settle
    
    return () => clearTimeout(timer);
  }, [snapConnect, drag, isSelected, nodeId]); // Exact same dependencies as working components

  // Detect parent changes and reset position properties with GridBox-style logic
  useEffect(() => {
    // Skip the initial render (when prevParentRef.current is first set)
    if (prevParentRef.current !== null && prevParentRef.current !== parent) {
      // Parent has changed - element was moved to a different container
      console.log(`📦 Video ${nodeId} moved from parent ${prevParentRef.current} to ${parent} - checking if position reset is needed`);
      
      // Wait longer than the centered drag positioning (600ms) before resetting
      // This allows useCenteredContainerDrag to apply its centered positioning first
      setTimeout(() => {
        // Check if position was already set by centered drag (absolute position with left/top set)
        const currentNode = query.node(nodeId);
        if (currentNode) {
          const currentProps = currentNode.get().data.props;
          const hasPositioning = currentProps.position === 'absolute' && 
                                (currentProps.left !== undefined || currentProps.top !== undefined);
          
          if (hasPositioning) {
            console.log('🎯 Video position already set by centered drag system, skipping reset');
            return; // Don't reset if centered positioning was applied
          }
        }
        
        // Reset position properties to default only if no positioning was applied
        setProp((props) => {
          // Only reset if position properties were actually set
          if (props.top !== undefined || props.left !== undefined || 
              props.right !== undefined || props.bottom !== undefined) {
            console.log('🔄 Resetting Video position properties after container move (no centered positioning detected)');
            props.top = undefined;
            props.left = undefined;
            props.right = undefined;
            props.bottom = undefined;
            // Keep position as relative for normal flow
            props.position = "relative";
          }
        });
      }, 700); // Wait 700ms to ensure centered drag positioning (600ms) completes first
    }
    
    // Update the ref for next comparison
    prevParentRef.current = parent;
  }, [parent, nodeId, setProp, query]);

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
  }, [isSelected, isHovered, updateBoxPosition]);




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
      className={`${isSelected && !hideEditorUI ? 'ring-2 ring-blue-500' : ''} ${isHovered && !hideEditorUI ? 'ring-1 ring-gray-300' : ''} ${isMultiSelected ? 'ring-2 ring-purple-500' : ''} ${className || ''}`}
      ref={videoRef}
      style={{
        position: 'relative',
        cursor: 'default',
        userSelect: 'none',
        pointerEvents: 'auto',
        ...computedStyles
      }}
      id={id}
      title={title}
      onClick={(e) => {
        if (!hideEditorUI) {
          // Prevent selection during resize operations
          if (isResizing) {
            e.stopPropagation();
            e.preventDefault();
            return;
          }
          
          if (e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            e.preventDefault();
            toggleSelection(nodeId);
          }
        }
      }}
      onMouseEnter={hideEditorUI ? undefined : () => {
        setIsHovered(true);
        updateBoxPosition();
      }}
      onMouseLeave={hideEditorUI ? undefined : () => setIsHovered(false)}
      onContextMenu={hideEditorUI ? undefined : handleContextMenu}
    >
      {/* Portal controls rendered outside this container - hide in preview mode */}
      {isClient && isSelected && !hideEditorUI && (
        <div>
          <PortalControls
          boxPosition={boxPosition}
          dragRef={dragRef}
          handleEditClick={() => setShowMediaLibrary(true)}
          nodeId={nodeId}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />
        <ResizeHandles 
          boxPosition={boxPosition} 
          nodeId={nodeId}
          targetRef={videoRef}
          editorActions={editorActions}
          craftQuery={query}
          minWidth={typeof minWidth === 'number' ? minWidth : parseInt(minWidth) || 50}
          minHeight={typeof minHeight === 'number' ? minHeight : parseInt(minHeight) || 20}
          onResize={updateBoxPosition}
          onResizeEnd={updateBoxPosition}
        />
        </div>
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
  dragRef,
  handleEditClick,
  nodeId,
  isDragging,
  setIsDragging
}) => {
  if (typeof window === 'undefined') return null; // SSR check

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none', // Allow clicks to pass through
        zIndex: 99999 
      }}
    >
      {/* Combined three-section pill-shaped controls: MOVE | EDIT | POS */}
      <div
        style={{
          position: 'absolute',
          top: boxPosition.top - 28,
          left: boxPosition.left + boxPosition.width / 2,
          transform: 'translateX(-50%)',
          display: 'flex',
          background: 'white',
          borderRadius: '16px',
          border: '2px solid #d9d9d9',
          fontSize: '9px',
          fontWeight: 'bold',
          userSelect: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          pointerEvents: 'auto', // Re-enable pointer events for this element
          zIndex: 10000
        }}
      >
        {/* Left section - MOVE (Craft.js drag) */}
        <div
          ref={dragRef}
          data-cy="move-handle"
          data-handle-type="move"
          data-craft-node-id={nodeId}
          className="move-handle"
          style={{
            background: '#52c41a',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '14px 0 0 14px',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '48px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          title="Drag to move between containers"
        >
          📦 MOVE
        </div>
        
        {/* Middle section - EDIT */}
        <div
          style={{
            background: '#722ed1',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '48px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          onClick={handleEditClick}
          title="Change video"
        >
          🎬 EDIT
        </div>
        
        {/* Right section - POS (Custom position drag with snapping) */}
        <SnapPositionHandle
          nodeId={nodeId}
          style={{
            background: '#1890ff',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '0 14px 14px 0',
            cursor: 'move',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '48px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          onDragStart={(e) => {
            setIsDragging(true);
          }}
          onDragMove={(e, { x, y, snapped }) => {
            // Optional: Add visual feedback for snapping
            console.log(`Element moved to ${x}, ${y}, snapped: ${snapped}`);
          }}
          onDragEnd={(e) => {
            setIsDragging(false);
          }}
        >
          ↕↔ POS
        </SnapPositionHandle>
      </div>

     
    </div>,
    document.body
  );
};

// Craft configuration
Video.craft = {
  displayName: "Video",
  props: {
    width: "400px",
    height: "200px",
    videoSrc: "",
    videoType: "url",
    autoplay: false,
    controls: true,
    loop: false,
    muted: false,
    preload: "metadata",
    poster: "",
    objectFit: "cover",
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
    backgroundColor: "#ffffff",
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