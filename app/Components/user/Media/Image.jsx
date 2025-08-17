'use client'

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useNode, useEditor } from "@craftjs/core";
import { createPortal } from 'react-dom';
import MediaLibrary from '../../editor/MediaLibrary';
import ContextMenu from "../../utils/context/ContextMenu";
import useEditorDisplay from "../../utils/craft/useEditorDisplay";
import { useCraftSnap } from "../../utils/craft/useCraftSnap";
import SnapPositionHandle from "../../editor/SnapPositionHandle";
import { useMultiSelect } from '../../utils/context/MultiSelectContext';
import ResizeHandles from "../support/ResizeHandles";

const placeholderURL = 'https://images.unsplash.com/photo-1750797490751-1fc372fdcf88?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

export const Image = ({
  // Basic Image Properties
  src = placeholderURL,
  alt = "Image",
  
  // Layout & Dimensions
  width = 300,
  height = 200,
  minWidth = 50,
  maxWidth,
  minHeight = 50,
  maxHeight,
  display = "block",
  
  // Positioning
  position = "relative",
  top,
  right,
  bottom,
  left,
  zIndex = 1,
  
  // Spacing
  margin = 0,
  padding = 0,
  
  // Border
  borderWidth = 0,
  borderStyle = "solid", 
  borderColor = "#e0e0e0",
  borderRadius = 4,
  
  // Effects
  boxShadow = "none",
  opacity = 1,
  filter = "none",
  
  // Image Specific
  objectFit = "cover",
  objectPosition = "center",
  
  // HTML Attributes
  className = "",
  id,
  title,
}) => {
  const { id: nodeId, connectors: { connect, drag }, actions: { setProp }, selected: isSelected, parent } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
    parent: node.data.parent,
  }));
  const { actions: editorActions, query } = useEditor();
  
  // Snap functionality exactly like working components (GridBox, FlexBox, Box)
  const { connectors: { snapConnect, snapDrag } } = useCraftSnap(nodeId);
  
  // Use multi-selection functionality
  const { addToSelection, addToSelectionWithKeys, removeFromSelection, isSelected: isMultiSelected, isMultiSelecting } = useMultiSelect();
  
  // Track parent changes to reset position properties with GridBox-style logic
  const prevParentRef = useRef(parent);

  useEffect(() => {
    // Only process if parent actually changed (not initial mount)
    if (prevParentRef.current !== null && prevParentRef.current !== parent) {
      // Parent has changed - element was moved to a different container
      console.log(`📦 Image ${nodeId} moved from parent ${prevParentRef.current} to ${parent} - checking if position reset is needed`);
      
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
            console.log('🎯 Image position already set by centered drag system, skipping reset');
            return; // Don't reset if centered positioning was applied
          }
        }
        
        // Reset position properties to default only if no positioning was applied
        setProp(props => {
          // Only reset if position properties were actually set
          if (props.top !== undefined || props.left !== undefined || 
              props.right !== undefined || props.bottom !== undefined) {
            console.log('🔄 Resetting Image position properties after container move (no centered positioning detected)');
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
  
  // Use our shared editor display hook
  const { hideEditorUI } = useEditorDisplay();

  const imageRef = useRef(null);
  const dragRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  // Handle context menu (right-click)
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If this element is not already selected, add it to the selection
    if (!isMultiSelected(nodeId)) {
      console.log('🎯 Right-click on unselected element, adding to selection:', nodeId);
      addToSelection(nodeId);
    }
    
    // Calculate position to keep menu on screen
    const menuWidth = 320;
    const menuHeight = 500;
    let x = e.clientX;
    let y = e.clientY;
    
    // Adjust if menu would go off right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    
    // Adjust if menu would go off bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    // Ensure minimum margins
    x = Math.max(10, x);
    y = Math.max(10, y);
    
    setContextMenu({
      visible: true,
      x: x,
      y: y
    });
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  // Function to update box position for portal positioning
  const updateBoxPosition = useCallback(() => {
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
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
      if (imageRef.current) {
        snapConnect(imageRef.current); // Connect for selection with snap functionality
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
        console.log('🔗 Connectors re-established for Image node:', nodeId);
      }
    }, 100); // Give DOM time to settle
    
    return () => clearTimeout(timer);
  }, [snapConnect, drag, isSelected, nodeId]); // Exact same dependencies as working components

  // Update box position when selected or hovered changes
  useEffect(() => {
    if (isSelected || isHovered) {
      updateBoxPosition();
      
      // Update position on scroll and resize
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
    if (itemType === 'image') {
      setProp(props => {
        props.src = item.url;
        props.alt = item.name || 'Selected image';
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
    boxShadow: boxShadow !== "none" ? boxShadow : undefined,
    opacity,
    filter: filter !== "none" ? filter : undefined,
    objectFit,
    objectPosition,
  };

  // Remove undefined values
  Object.keys(computedStyles).forEach(key => {
    if (computedStyles[key] === undefined) {
      delete computedStyles[key];
    }
  });

  // Don't render until client-side
  if (!isClient) {
    return (
      <div style={computedStyles}>
        <img
          src={src}
          alt={alt}
          style={{ width: '100%', height: '100%', objectFit, objectPosition, }}
        />
      </div>
    );
  }

  return (
    <div
      className={`${isSelected && !hideEditorUI ? 'ring-2 ring-blue-500' : ''} ${isHovered && !hideEditorUI ? 'ring-1 ring-gray-300' : ''} ${isMultiSelected(nodeId) ? 'ring-2 ring-purple-500 multi-selected-element' : ''} ${className || ''}`}
      ref={imageRef}
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
            console.log('🎯 Ctrl+click detected on:', nodeId);
            // Toggle selection - works even if no previous selection
            if (isMultiSelected(nodeId)) {
              removeFromSelection(nodeId);
            } else {
              addToSelection(nodeId);
            }
          }
          // For regular clicks, let the global handler manage clearing/selecting
        }
      }}
      onContextMenu={hideEditorUI ? undefined : handleContextMenu}
    >
      {/* Portal controls rendered outside this container to avoid overflow clipping */}
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
          targetRef={imageRef}
          editorActions={editorActions}
          craftQuery={query}
          minWidth={typeof minWidth === 'number' ? minWidth : parseInt(minWidth) || 50}
          minHeight={typeof minHeight === 'number' ? minHeight : parseInt(minHeight) || 20}
          onResize={updateBoxPosition}
          onResizeEnd={updateBoxPosition}
        />
       </div>
      )}

      {/* Main image */}
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit,
          objectPosition,
          display: 'block',
          pointerEvents: 'none', // Allow clicks to pass through to parent for selection,
          borderRadius: borderRadius,
          opacity: opacity,

        }}
        onError={(e) => {
          // Fallback to placeholder if image fails to load
          e.target.src = placeholderURL;
        }}
      />

      {/* Media Library Modal */}
      <MediaLibrary
        visible={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={handleMediaSelect}
        type="images" // Only show images for Image component
        title="Select Image"
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

// Portal Controls Component - renders outside of the Image to avoid overflow clipping
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
          title="Change image"
        >
          🖼️ EDIT
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

// CraftJS configuration
Image.craft = {
  displayName: "Image",
  props: {
    src: placeholderURL,
    alt: "Image",
    width: 300,
    height: 200,
    minWidth: 50,
    maxWidth: 10000,
    minHeight: 50,
    maxHeight: 10000,
    position: "relative",
    top: 0,
    left: 0,
    zIndex: 1,
    margin: 0,
    padding: 0,
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: "#e0e0e0",
    borderRadius: 4,
    boxShadow: "none",
    opacity: 1,
    objectFit: "cover",
    objectPosition: "center",
    title: "",
    className: "",
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
        // Image Properties
        "src",
        "alt",
        "objectFit",
        "objectPosition",

        'borderRadius','border',
        
        // Size & Position
        "width",
        "height",
        "minWidth",
        "maxWidth", 
        "minHeight",
        "maxHeight",
        "position",
        "top",
        "left",
        "zIndex",
        
        // Spacing
        "margin",
        "padding",
        
        // Visual Styling
        "borderWidth",
        "borderStyle", 
        "borderColor",
        "borderRadius",
        "boxShadow",
        "opacity",

        // Border Radius - All corners
        'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 
        'borderBottomLeftRadius', 'borderBottomRightRadius',
        
        // HTML Attributes
        "title",
        "className"
      ]
    }
  }
};