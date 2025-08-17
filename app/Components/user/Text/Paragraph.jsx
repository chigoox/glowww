'use client'

import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNode, useEditor } from "@craftjs/core";
import { EditOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import ContextMenu from "../../utils/context/ContextMenu";
import { useContextMenu } from "../../utils/hooks/useContextMenu";
import useEditorDisplay from "../../utils/context/useEditorDisplay";
import ResizeHandles from "../support/ResizeHandles";
import { useCraftSnap } from "../../utils/craft/useCraftSnap";
import SnapPositionHandle from "../../editor/SnapPositionHandle";

// Dynamically import the Editor to avoid SSR issues
const Editor = dynamic(() => import('@tinymce/tinymce-react').then(mod => mod.Editor), {
  ssr: false,
  loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading editor...</div>
});

// Create a separate component for TinyMCE initialization
const TinyMCEEditor = dynamic(() => import('../../editor/Tinymce'), {
  ssr: false,
});

export const Paragraph = ({
  // Content
  content = "<p>Click to edit this paragraph. You can add <strong>bold</strong>, <em>italic</em>, links, lists, and more!</p>",
  
  // Layout & Position
  width = "32rem",
  height = "auto",
  minWidth,
  maxWidth,
  minHeight  = '5rem',
  maxHeight,
  display = "block",
  position = "relative",
  top,
  right,
  bottom,
  left,
  zIndex = 1,
  
  // Spacing
  margin = "10px 0",
  padding = "15px",
  
  // Border
  borderWidth = 0,
  borderStyle = "solid",
  borderColor = "#e0e0e0",
  borderRadius = 4,
  
  // Background
  backgroundColor = "transparent",
  
  // Effects
  boxShadow = "none",
  opacity = 1,
  filter = "none",
  
  // Editor Settings
  editorHeight = 300,
  
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
  // Snap system (selection + snapping) – mirrors Box/Text pattern
  const { connectors: { snapConnect } } = useCraftSnap(nodeId);
  const { hideEditorUI } = useEditorDisplay();

  const paragraphRef = useRef(null);
  const dragRef = useRef(null); // MOVE handle ref (Craft container drag)
  const editorRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [currentContent, setCurrentContent] = useState(content); // Track current editing content

  // Track previous parent to detect container changes
  const prevParentRef = useRef(parent);

  // Context menu functionality
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();

  // Function to update box position for portal positioning
  const updateBoxPosition = () => {
    if (paragraphRef.current) {
      const rect = paragraphRef.current.getBoundingClientRect();
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

  // Sync currentContent with content prop when not editing
  useEffect(() => {
    if (!isEditing) {
      setCurrentContent(content);
    }
  }, [content, isEditing]);

  // Establish connectors: root uses snapConnect (selection + snapping), MOVE handle uses drag()
  useEffect(() => {
    const establish = () => {
      if (paragraphRef.current) {
        snapConnect(paragraphRef.current);
      }
      if (dragRef.current) {
        drag(dragRef.current);
      }
    };
    establish();
    const timer = setTimeout(establish, 80); // minor delay to ensure DOM settled
    return () => clearTimeout(timer);
  }, [snapConnect, drag, isSelected, isClient]);

  // Detect parent changes and reset position properties
  useEffect(() => {
    // Skip the initial render (when prevParentRef.current is first set)
    if (prevParentRef.current !== null && prevParentRef.current !== parent) {
      // Parent has changed - element was moved to a different container
      console.log(`📦 Paragraph ${nodeId} moved from parent ${prevParentRef.current} to ${parent} - resetting position`);
      
      // Reset position properties to default
      setProp((props) => {
        // Only reset if position properties were actually set
        if (props.top !== undefined || props.left !== undefined || 
            props.right !== undefined || props.bottom !== undefined) {
          console.log('🔄 Resetting position properties after container move');
          props.top = undefined;
          props.left = undefined;
          props.right = undefined;
          props.bottom = undefined;
          // Keep position as relative for normal flow
          props.position = "relative";
        }
      });
    }
    
    // Update the ref for next comparison
    prevParentRef.current = parent;
  }, [parent, nodeId, setProp]);

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
  }, [isSelected, isHovered]);


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
    boxShadow: boxShadow !== "none" ? boxShadow : undefined,
    opacity,
    filter: filter !== "none" ? filter : undefined,
  };

  // Remove undefined values
  Object.keys(computedStyles).forEach(key => {
    if (computedStyles[key] === undefined) {
      delete computedStyles[key];
    }
  });

  const handleEditClick = () => {
    console.log('Edit clicked, starting editing mode');
    setCurrentContent(content); // Set current content for editing
    setIsEditing(true);
    setEditorKey(prev => prev + 1);
    console.log('Edit state set, isEditing should be true');
  };

  const handleSaveEdit = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.getContent();
      setProp(props => {
        props.content = newContent;
      });
      setCurrentContent(newContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    // Revert to original content without saving
    setCurrentContent(content);
    setIsEditing(false);
    setEditorKey(prev => prev + 1); // Force re-render with original content
  };

  const handleEditorChange = (newContent) => {
    // Update the current editing content but don't save to props yet
    setCurrentContent(newContent);
  };

  // Don't render editor until client-side
  if (!isClient) {
    return (
      <div
        style={{
          position: 'relative',
          ...computedStyles
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    );
  }

  return (
    <div
      className={`${isSelected && !hideEditorUI ? 'ring-2 ring-blue-500' : ''} ${isHovered && !hideEditorUI ? 'ring-1 ring-gray-300' : ''} ${className || ''}`}
      ref={(el) => {
        paragraphRef.current = el;
        if (el) {
          snapConnect(el);
        }
      }}
      style={{
        position: 'relative',
        cursor: isEditing ? 'text' : 'default',
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
      // Remove problematic onClick to allow proper Craft.js selection
    >
      {/* Portal controls rendered outside this container to avoid overflow clipping */}
      {isSelected && !isEditing && !hideEditorUI && (
        
        <div>
          <PortalControls
            boxPosition={boxPosition}
            dragRef={dragRef}
            handleEditClick={handleEditClick}
            nodeId={nodeId}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
          />
        <ResizeHandles
          boxPosition={boxPosition} 
          nodeId={nodeId}
          targetRef={paragraphRef}
          editorActions={editorActions}
          craftQuery={query}
          minWidth={typeof minWidth === 'number' ? minWidth : parseInt(minWidth) || 50}
          minHeight={typeof minHeight === 'number' ? minHeight : parseInt(minHeight) || 20}
          onResize={updateBoxPosition}
          onResizeEnd={updateBoxPosition}
        />
        </div>
      )}

      {/* Content display or editor */}
      {isEditing ? (
        <div style={{ position: 'relative' }}>
          {/* Editor controls */}
          <div style={{
            position: 'absolute',
            top: -40,
            right: 0,
            zIndex: 1001,
            display: 'flex',
            gap: '8px'
          }}>
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
          </div>

          {/* TinyMCE Editor - only loads on client */}
          <TinyMCEEditor
            key={editorKey}
            value={currentContent}
            onInit={(evt, editor) => editorRef.current = editor}
            height={editorHeight}
            onChange={handleEditorChange}
          />
        </div>
      ) : (
        // Display content when not editing - allow clicks to pass through for selection
        <div
          dangerouslySetInnerHTML={{ __html: content }}
          style={{
            minHeight: '20px',
            cursor: 'default',
            pointerEvents: 'none' // Allow clicks to pass through to parent for selection
          }}
        />
      )}
      
      {/* Context Menu */}
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

// Portal Controls Component - renders outside of the Paragraph to avoid overflow clipping
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
      {/* Combined pill-shaped controls with Edit button */}
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
        {/* Left - MOVE (Craft.js drag) */}
        <div
          ref={dragRef}
          data-handle-type="move"
            data-craft-node-id={nodeId}
            className="move-handle"
          style={{
            background: '#52c41a',
            color: 'white',
            padding: '2px',
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
        
        {/* Center - EDIT (Edit content) */}
        <div
          style={{
            background: '#722ed1',
            color: 'white',
            padding: '2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '36px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          onClick={handleEditClick}
          title="Edit paragraph content"
        >
          ✏️ EDIT
        </div>

        {/* Right - POS (Custom position drag) */}
        <SnapPositionHandle
          nodeId={nodeId}
          style={{
            background: '#1890ff',
            color: 'white',
            padding: '4px',
            borderRadius: '0 14px 14px 0',
            cursor: 'move',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '48px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          onDragStart={() => setIsDragging && setIsDragging(true)}
          onDragMove={(e, { x, y, snapped }) => {
            if (Math.random() < 0.05) {
              console.log(`Paragraph position -> x:${x} y:${y} snapped:${snapped}`);
            }
          }}
          onDragEnd={() => setIsDragging && setIsDragging(false)}
        >
          ↕↔ POS
        </SnapPositionHandle>
      </div>

    
    </div>,
    document.body
  );
};

// Craft configuration
Paragraph.craft = {
  displayName: "Paragraph",
  props: {
    content: "<p>Click to edit this paragraph. You can add <strong>bold</strong>, <em>italic</em>, links, lists, and more!</p>",
    width: "32rem",
    height: "auto",
    minWidth: "",
    maxWidth: "",
    minHeight: "10rem",
    maxHeight: "",
    display: "block",
    position: "relative",
    top: "",
    right: "",
    bottom: "",
    left: "",
    zIndex: 1,
    margin: "10px 0",
    padding: "15px",
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: "#e0e0e0",
    borderRadius: 4,
    backgroundColor: "transparent",
    boxShadow: "none",
    opacity: 1,
    editorHeight: 300,
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
        // Content
        'content',
        
        // Layout & Position
        'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
        'display', 'position', 'top', 'right', 'bottom', 'left', 'zIndex',
        
        // Spacing
        'margin', 'padding', 
        
        // Border
        'borderWidth', 'borderStyle', 'borderColor', 'borderRadius',
        
        // Background & Effects
        'backgroundColor', 'boxShadow', 'opacity', 
        
        // Editor Settings
        'editorHeight',
        
        // Attributes
        'className', 'id', 'title',
      ]
    }
  }
};