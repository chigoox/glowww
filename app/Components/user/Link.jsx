'use client'

import React, { useRef, useEffect, useState } from "react";
import { useNode, useEditor } from "@craftjs/core";
import { EditOutlined, LinkOutlined } from '@ant-design/icons';

export const Link = ({
  // Link Content
  text = "Click here",
  href = "https://example.com",
  
  // Link Behavior
  target = "_blank",
  rel = "noopener noreferrer",
  download,
  
  // Layout & Dimensions
  width = "auto",
  height = "auto",
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  display = "inline",
  
  // Positioning
  position = "relative",
  top,
  left,
  right,
  bottom,
  zIndex = 1,
  
  // Spacing
  margin = "0",
  padding = "2px 4px",
  
  // Typography
  fontFamily = "Arial",
  fontSize = 14,
  fontWeight = "400",
  fontStyle = "normal",
  lineHeight = 1.4,
  letterSpacing = 0,
  textAlign = "left",
  textDecoration = "underline",
  textTransform = "none",
  
  // Colors
  color = "#1890ff",
  colorHover = "#40a9ff",
  colorVisited = "#722ed1",
  colorActive = "#096dd9",
  
  // Background
  backgroundColor = "transparent",
  background,
  backgroundHover = "rgba(24, 144, 255, 0.1)",
  
  // Border
  border = "none",
  borderRadius = 0,
  borderWidth = 0,
  borderStyle = "solid",
  borderColor = "transparent",
  
  // Visual Effects
  boxShadow = "none",
  opacity = 1,
  transform = "none",
  transition = "all 0.3s ease",
  
  // HTML Attributes
  title,
  id,
  className = "",
  name,
  
  // Accessibility
  role = "link",
  ariaLabel,
  ariaDescribedBy,
  tabIndex = 0,
  
  // Link States
  underlineStyle = "solid", // solid, dotted, dashed, wavy
  showIcon = true,
  iconPosition = "after", // before, after
}) => {
  const { 
    id: nodeId, 
    connectors: { connect, drag }, 
    actions: { setProp }, 
    selected 
  } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
  }));
  
  const { actions } = useEditor();
  
  const linkRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(text);
  const [localHref, setLocalHref] = useState(href);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setLocalText(text);
    }
    if (!isEditingUrl) {
      setLocalHref(href);
    }
  }, [text, href, isEditing, isEditingUrl]);

  useEffect(() => {
    if (linkRef.current) {
      connect(drag(linkRef.current));
    }
  }, [connect, drag]);

  // Handle text editing
  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
    setLocalText(text);
  };

  const handleTextChange = (e) => {
    const newText = e.target.textContent || e.target.innerText;
    setLocalText(newText);
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    setProp(props => {
      props.text = localText;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
      setProp(props => {
        props.text = localText;
      });
      linkRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setLocalText(text);
      linkRef.current?.blur();
    }
  };

  // Handle URL editing
  const handleEditUrl = () => {
    const newUrl = prompt('Enter URL:', href);
    if (newUrl !== null) {
      setProp(props => {
        props.href = newUrl;
      });
    }
  };

  // Handle link click
  const handleClick = (e) => {
    if (isEditing || !href) {
      e.preventDefault();
      return;
    }
    
    // In editor mode, prevent navigation for safety
    if (selected) {
      e.preventDefault();
      console.log('Link clicked (editor mode):', href);
      return;
    }
  };

  // Helper function to process values
  const processValue = (value, property) => {
    if (typeof value === 'number' && !['opacity', 'zIndex'].includes(property)) {
      return `${value}px`;
    }
    return value;
  };

  // Get link icon
 const getLinkIcon = () => {
  if (!showIcon) return null;
  
  const isExternal = href && (href.startsWith('http') || href.startsWith('//'));
  
  if (isExternal) {
    // External link - custom SVG icon with link color
    return (
      <svg 
        width="0.8em" 
        height="0.8em" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2"
        style={{ 
          marginLeft: iconPosition === 'after' ? '4px' : '0',
          marginRight: iconPosition === 'before' ? '4px' : '0',
          color: isHovered ? colorHover : color,
        }}
      >
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15,3 21,3 21,9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>
    );
  }
  
  // Internal link - LinkOutlined with blue color
  return (
    <LinkOutlined 
      style={{ 
        fontSize: '0.8em', 
        marginLeft: iconPosition === 'after' ? '4px' : '0',
        marginRight: iconPosition === 'before' ? '4px' : '0',
        color: '#1890ff', // Blue color for internal links
      }} 
    />
  );
};

  const computedStyles = {
    // Layout & Dimensions
    width: processValue(width, 'width'),
    height: processValue(height, 'height'),
    minWidth: minWidth && processValue(minWidth, 'minWidth'),
    maxWidth: maxWidth && processValue(maxWidth, 'maxWidth'),
    minHeight: minHeight && processValue(minHeight, 'minHeight'),
    maxHeight: maxHeight && processValue(maxHeight, 'maxHeight'),
    display,
    
    // Positioning
    position,
    top: top !== undefined ? processValue(top, 'top') : undefined,
    left: left !== undefined ? processValue(left, 'left') : undefined,
    right: right !== undefined ? processValue(right, 'right') : undefined,
    bottom: bottom !== undefined ? processValue(bottom, 'bottom') : undefined,
    zIndex,
    
    // Spacing
    margin: processValue(margin, 'margin'),
    padding: processValue(padding, 'padding'),
    
    // Typography
    fontFamily,
    fontSize: processValue(fontSize, 'fontSize'),
    fontWeight,
    fontStyle,
    lineHeight,
    letterSpacing: processValue(letterSpacing, 'letterSpacing'),
    textAlign,
    textDecoration: `${textDecoration} ${underlineStyle}`,
    textTransform,
    
    // Colors - dynamic based on state
    color: isHovered ? colorHover : color,
    
    // Background
    backgroundColor: isHovered ? backgroundHover : backgroundColor,
    background,
    
    // Border
    border,
    borderRadius: processValue(borderRadius, 'borderRadius'),
    
    // Visual Effects
    boxShadow,
    opacity,
    transform,
    transition,
    
    // Interaction
    cursor: isEditing ? 'text' : 'pointer',
    outline: 'none',
    
    // Link specific
    textDecorationColor: isHovered ? colorHover : color,
  };

  return (
    <a
      className={`${selected ? 'ring-2 ring-blue-500' : ''} ${className}`}
      ref={linkRef}
      style={computedStyles}
      href={href}
      target={target}
      rel={rel}
      download={download}
      title={title || href}
      id={id}
      name={name}
      role={role}
      aria-label={ariaLabel || `${text} - ${href}`}
      aria-describedby={ariaDescribedBy}
      tabIndex={tabIndex}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Edit indicator */}
      {selected && !isEditing && (
        <div
          style={{
            position: "absolute",
            top: -12,
            right: -12,
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
          onClick={handleDoubleClick}
          title="Double-click to edit text"
        >
          <EditOutlined />
        </div>
      )}

      {/* URL edit button */}
      {selected && !isEditing && (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: -12,
            width: 24,
            height: 24,
            background: "#1890ff",
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
          onClick={handleEditUrl}
          title="Edit URL"
        >
          <LinkOutlined />
        </div>
      )}
      
      {/* Link content */}
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {iconPosition === 'before' && getLinkIcon()}
        
        <span
          contentEditable={isEditing}
          onBlur={handleTextBlur}
          onInput={handleTextChange}
          onKeyDown={handleKeyDown}
          style={{
            outline: 'none',
            minHeight: '1em'
          }}
          suppressContentEditableWarning={true}
        >
          {isEditing ? localText : text}
        </span>
        
        {iconPosition === 'after' && getLinkIcon()}
      </span>
      
      {/* URL preview tooltip */}
      {selected && href && (
        <div
          style={{
            position: "absolute",
            bottom: -25,
            left: 0,
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "11px",
            whiteSpace: "nowrap",
            maxWidth: "200px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            zIndex: 1001
          }}
        >
          {href}
        </div>
      )}
    </a>
  );
};

// CraftJS configuration
Link.craft = {
  props: {
    text: "Click here",
    href: "https://example.com",
    target: "_blank",
    rel: "noopener noreferrer",
    download: "",
    width: "auto",
    height: "auto",
    minWidth: "",
    maxWidth: "",
    minHeight: "",
    maxHeight: "",
    display: "inline",
    position: "relative",
    top: "",
    left: "",
    right: "",
    bottom: "",
    zIndex: 1,
    margin: "0",
    padding: "2px 4px",
    fontFamily: "Arial",
    fontSize: 14,
    fontWeight: "400",
    fontStyle: "normal",
    lineHeight: 1.4,
    letterSpacing: 0,
    textAlign: "left",
    textDecoration: "underline",
    textTransform: "none",
    color: "#1890ff",
    colorHover: "#40a9ff",
    colorVisited: "#722ed1",
    colorActive: "#096dd9",
    backgroundColor: "transparent",
    background: "",
    backgroundHover: "rgba(24, 144, 255, 0.1)",
    border: "none",
    borderRadius: 0,
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: "transparent",
    boxShadow: "none",
    opacity: 1,
    transform: "none",
    transition: "all 0.3s ease",
    title: "",
    id: "",
    className: "",
    name: "",
    role: "link",
    ariaLabel: "",
    ariaDescribedBy: "",
    tabIndex: 0,
    underlineStyle: "solid",
    showIcon: true,
    iconPosition: "after",
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
        // Content & Behavior
        "text", "href", "target", "rel", "download",
        
        // Layout & Dimensions
        "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight",
        "display", "position", "top", "left", "right", "bottom", "zIndex",
        
        // Spacing
        "margin", "padding",
        
        // Typography
        "fontFamily", "fontSize", "fontWeight", "fontStyle", "lineHeight",
        "letterSpacing", "textAlign", "textDecoration", "textTransform",
        
        // Colors
        "color", "colorHover", "colorVisited", "colorActive",
        
        // Background
        "backgroundColor", "background", "backgroundHover",
        
        // Border
        "border", "borderRadius", "borderWidth", "borderStyle", "borderColor",
        
        // Visual Effects
        "boxShadow", "opacity", "transform", "transition",
        
        // Link Properties
        "underlineStyle", "showIcon", "iconPosition",
        
        // HTML Attributes
        "title", "id", "className", "name", "ariaLabel"
      ]
    }
  }
};