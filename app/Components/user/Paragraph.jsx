'use client'

import React, { useRef, useEffect, useState } from "react";
import { useNode } from "@craftjs/core";
import { EditOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';

// Dynamically import the Editor to avoid SSR issues
const Editor = dynamic(() => import('@tinymce/tinymce-react').then(mod => mod.Editor), {
  ssr: false,
  loading: () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading editor...</div>
});

// Create a separate component for TinyMCE initialization
const TinyMCEEditor = dynamic(() => import('../support/Tinymce'), {
  ssr: false,
});

export const Paragraph = ({
  // Content
  content = "<p>Click to edit this paragraph. You can add <strong>bold</strong>, <em>italic</em>, links, lists, and more!</p>",
  
  // Layout & Position
  width = "100%",
  height = "auto",
  minWidth,
  maxWidth,
  minHeight,
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
  
  // Editor Settings
  editorHeight = 300,
  
  // HTML Attributes
  className = "",
  id,
  title,
}) => {
  const { connectors: { connect, drag }, actions: { setProp }, selected: isSelected } = useNode((node) => ({
    selected: node.events.selected,
  }));

  const paragraphRef = useRef(null);
  const editorRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (paragraphRef.current) {
      connect(drag(paragraphRef.current));
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
    setEditorKey(prev => prev + 1);
  };

  const handleSaveEdit = () => {
    if (editorRef.current) {
      const newContent = editorRef.current.getContent();
      setProp(props => props.content = newContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleEditorChange = (content) => {
    setProp(props => props.content = content);
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
      className={`${isSelected ? 'ring-2 ring-blue-500' : ''} ${className || ''}`}
      ref={paragraphRef}
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
          title="Edit paragraph content"
        >
          <EditOutlined />
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
            value={content}
            onInit={(evt, editor) => editorRef.current = editor}
            height={editorHeight}
            onChange={handleEditorChange}
          />
        </div>
      ) : (
        // Display content when not editing
        <div
          dangerouslySetInnerHTML={{ __html: content }}
          style={{
            minHeight: '20px',
            cursor: isSelected ? 'pointer' : 'default'
          }}
          onClick={isSelected ? handleEditClick : undefined}
        />
      )}
    </div>
  );
};

// Craft configuration
Paragraph.craft = {
  props: {
    content: "<p>Click to edit this paragraph. You can add <strong>bold</strong>, <em>italic</em>, links, lists, and more!</p>",
    width: "100%",
    height: "auto",
    minWidth: "",
    maxWidth: "",
    minHeight: "",
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
    canDrop: () => false,
    canMoveIn: () => false,
    canMoveOut: () => true,
  },
  custom: {
    styleMenu: {
      supportedProps: [
        'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
        'display', 'position', 'top', 'right', 'bottom', 'left', 'zIndex',
        'margin', 'padding', 'borderWidth', 'borderStyle', 'borderColor', 'borderRadius',
        'backgroundColor', 'boxShadow', 'opacity', 'editorHeight',
        'className', 'id', 'title',
      ]
    }
  }
};