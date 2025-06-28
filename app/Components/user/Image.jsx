'use client'

import React, { useRef, useEffect, useState } from "react";
import { useNode, useEditor } from "@craftjs/core";
import { EditOutlined, UploadOutlined } from '@ant-design/icons';
import { Upload, message } from 'antd';
import interact from 'interactjs';

const placeholderURL = 'https://images.unsplash.com/photo-1750797490751-1fc372fdcf88?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'

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
  
  // Positioning
  position = "relative",
  top = 0,
  left = 0,
  zIndex = 1,
  
  // Spacing
  margin = "5px 0",
  padding = 0,
  
  // Visual Styling
  border = "none",
  borderWidth = 0,
  borderStyle = "solid", 
  borderColor = "#000000",
  borderRadius = 0,
  boxShadow = "none",
  opacity = 1,
  
  // Image Specific
  objectFit = "cover",
  objectPosition = "center",
  
  // Other props
  title,
  className = "",
  hidden = false,
  draggable = false,
}) => {
  const { 
    id, 
    connectors: { connect, drag }, 
    actions: { setProp }, 
    selected 
  } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
  }));
  
  const { actions } = useEditor();
  
  const imageRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [imageState, setImageState] = useState({
    x: left,
    y: top,
    width,
    height
  });

   // Helper function to build border string
  const getBorderStyle = () => {
    if (border && border !== "none") {
      return border;
    }
    if (borderWidth > 0) {
      return `${borderWidth}px ${borderStyle} ${borderColor}`;
    }
    return "none";
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (imageRef.current) {
      connect(drag(imageRef.current));
    }
  }, [connect, drag]);

  // Handle image upload
  const handleImageUpload = (info) => {
    if (info.file.status === 'done') {
      const imageUrl = URL.createObjectURL(info.file.originFileObj);
      setProp(props => {
        props.src = imageUrl;
      });
      message.success('Image uploaded successfully');
    } else if (info.file.status === 'error') {
      message.error('Image upload failed');
    }
  };

  // Custom upload function
  const customUpload = ({ file, onSuccess }) => {
    // Simulate upload - in real app, upload to your server
    setTimeout(() => {
      onSuccess();
    }, 1000);
  };

  // Handle image URL input
  const handleImageUrlChange = (url) => {
    setProp(props => {
      props.src = url;
    });
  };

  // Resize handles
  const resizeHandles = [
    { key: 'nw', style: { top: -5, left: -5, cursor: 'nw-resize' } },
    { key: 'ne', style: { top: -5, right: -5, cursor: 'ne-resize' } },
    { key: 'sw', style: { bottom: -5, left: -5, cursor: 'sw-resize' } },
    { key: 'se', style: { bottom: -5, right: -5, cursor: 'se-resize' } },
    { key: 'n', style: { top: -5, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
    { key: 's', style: { bottom: -5, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
    { key: 'w', style: { top: '50%', left: -5, transform: 'translateY(-50%)', cursor: 'w-resize' } },
    { key: 'e', style: { top: '50%', right: -5, transform: 'translateY(-50%)', cursor: 'e-resize' } },
  ];

  // Setup resize interaction
  useEffect(() => {
    if (!selected || !imageRef.current) return;

    const element = imageRef.current;
    
    // Make image resizable
    interact(element).resizable({
      edges: { left: true, right: true, bottom: true, top: true },
      listeners: {
        start() {
          setIsResizing(true);
        },
        move(event) {
          const { width: newWidth, height: newHeight } = event.rect;
          
          setImageState(prev => ({
            ...prev,
            width: Math.max(newWidth, minWidth),
            height: Math.max(newHeight, minHeight)
          }));
          
          setProp(props => {
            props.width = Math.max(newWidth, minWidth);
            props.height = Math.max(newHeight, minHeight);
          });
        },
        end() {
          setIsResizing(false);
        }
      },
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: minWidth, height: minHeight },
          max: { width: maxWidth || 2000, height: maxHeight || 2000 }
        })
      ]
    });

    return () => {
      interact(element).unset();
    };
  }, [selected, minWidth, minHeight, maxWidth, maxHeight, setProp]);

  // Helper function to process values
  const processValue = (value, property) => {
    if (typeof value === 'number' && !['opacity', 'zIndex'].includes(property)) {
      return `${value}px`;
    }
    return value;
  };

  return (
    <div
      className={`${selected ? 'ring-2 ring-blue-500' : ''} ${className}`}
      ref={imageRef}
      style={{
        position,
        top: processValue(top, 'top'),
        left: processValue(left, 'left'),
        zIndex,
        margin: processValue(margin, 'margin'),
        padding: processValue(padding, 'padding'),
        border: getBorderStyle(), // Use the computed border
        borderRadius: processValue(borderRadius, 'borderRadius'),
        boxShadow,
        opacity,
        width: processValue(width, 'width'),
        height: processValue(height, 'height'),
        display: 'inline-block',
        overflow: 'visible',
        cursor: isResizing ? 'nwse-resize' : 'pointer',
      }}
      title={title}
      hidden={hidden}
    >
      {/* Image element */}
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit,
          objectPosition,
          display: 'block',
          userSelect: 'none',
          border: getBorderStyle(), // Use the computed border
        borderRadius: processValue(borderRadius, 'borderRadius'),
          
        }}
        draggable={false}
        onError={(e) => {
          e.target.src = placeholderURL;
        }}
      />

      {/* Upload overlay when selected and no image */}
      {selected && (!src || src.includes('placeholder')) && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            textAlign: 'center',
            padding: '20px',
            border: getBorderStyle(), // Use the computed border
          }}
        >
          <Upload
            accept="image/*"
            showUploadList={false}
            customRequest={customUpload}
            onChange={handleImageUpload}
          >
            <div style={{ cursor: 'pointer' }}>
              <UploadOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
              <div>Click to upload image</div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                or drag and drop
              </div>
            </div>
          </Upload>
        </div>
      )}

      {/* Edit button when selected */}
      {selected && src && !src.includes('placeholder') && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 28,
            height: 28,
            background: '#52c41a',
            borderRadius: '50%',
            cursor: 'pointer',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 14,
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
          onClick={() => {
            const newSrc = prompt('Enter image URL:', src);
            if (newSrc) {
              handleImageUrlChange(newSrc);
            }
          }}
          title="Change image"
        >
          <EditOutlined />
        </div>
      )}

      {/* Resize handles */}
      {selected && isClient && resizeHandles.map(handle => (
        <div
          key={handle.key}
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            background: '#1890ff',
            border: '2px solid white',
            borderRadius: '50%',
            zIndex: 1001,
            ...handle.style
          }}
        />
      ))}
    </div>
  );
};

// CraftJS configuration
Image.craft = {
  props: {
    src: placeholderURL,
    alt: "Image",
    width: 300,
    height: 200,
    minWidth: 50,
    maxWidth: 1000,
    minHeight: 50,
    maxHeight: 1000,
    position: "relative",
    top: 0,
    left: 0,
    zIndex: 1,
    margin: "none",
    padding: 0,
    border: "none",
    borderRadius: 0,
    borderWidth: 0,        // ADD THIS
    borderStyle: "solid",  // ADD THIS
    borderColor: "#000000", // ADD THIS
    boxShadow: "none",
    opacity: 1,
    objectFit: "cover",
    objectPosition: "center",
    title: "",
    className: "",
    hidden: false,
    draggable: false,
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
        "border",
        "borderRadius",
        "boxShadow",
        "opacity",
        
        // HTML Attributes
        "title",
        "className"
      ]
    }
  }
};