'use client'

import React, { useRef, useEffect, useState } from "react";
import { useNode, useEditor, Element } from "@craftjs/core";
import { EditOutlined } from '@ant-design/icons';
import { Text } from "./Text";

export const Button = ({
  // Button Content
  text = "Click Me",
  
  // Layout & Dimensions
  width = "auto",
  height = "auto",
  minWidth = 80,
  maxWidth,
  minHeight = 32,
  maxHeight,
  
  // Positioning
  position = "relative",
  top,
  left,
  right,
  bottom,
  zIndex = 1,
  
  // Spacing
  margin = "5px 0",
  padding = "8px 16px",
  
  // Typography
  fontFamily = "Arial",
  fontSize = 14,
  fontWeight = "400",
  color = "#ffffff",
  textAlign = "center",
  textDecoration = "none",
  
  // Background & Colors
  backgroundColor = "#1890ff",
  background,
  backgroundImage,
  
  // Border
  border = "1px solid #1890ff",
  borderRadius = 6,
  borderWidth = 1,
  borderStyle = "solid",
  borderColor = "#1890ff",
  
  // Visual Effects
  boxShadow = "0 2px 4px rgba(0,0,0,0.1)",
  opacity = 1,
  transform = "none",
  transition = "all 0.3s ease",
  
  // Button Behavior
  disabled = false,
  href,
  target = "_blank",
  rel = "noopener noreferrer",
  
  // Button Type/Style
  buttonType = "primary", // primary, secondary, outline, ghost
  size = "medium", // small, medium, large
  
  // Layout for children
  flexDirection = "row",
  alignItems = "center",
  justifyContent = "center",
  gap = 8,
  
  // HTML Attributes
  title,
  className = "",
  id,
  
  // Accessibility
  role = "button",
  ariaLabel,
  tabIndex = 0,
  
  // Children
  children,
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
  
  const buttonRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setLocalText(text);
    }
  }, [text, isEditing]);

  useEffect(() => {
    if (buttonRef.current) {
      connect(drag(buttonRef.current));
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

  const handleBlur = () => {
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
      buttonRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setLocalText(text);
      buttonRef.current?.blur();
    }
  };

  // Button click handler
  const handleClick = (e) => {
    if (isEditing) return;
    
    if (href) {
      if (target === '_blank') {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = href;
      }
    }
    
    console.log('Button clicked:', text);
  };

  // Helper function to process values
  const processValue = (value, property) => {
    if (typeof value === 'number' && !['opacity', 'zIndex'].includes(property)) {
      return `${value}px`;
    }
    return value;
  };

  // Get button type styles
  const getButtonTypeStyles = () => {
    const baseStyles = {
      primary: {
        backgroundColor: backgroundColor || "#1890ff",
        color: color || "#ffffff",
        border: border || "1px solid #1890ff"
      },
      secondary: {
        backgroundColor: "#f0f0f0",
        color: "#333333",
        border: "1px solid #d9d9d9"
      },
      outline: {
        backgroundColor: "transparent",
        color: borderColor || "#1890ff",
        border: `1px solid ${borderColor || "#1890ff"}`
      },
      ghost: {
        backgroundColor: "transparent",
        color: color || "#1890ff",
        border: "none"
      }
    };
    
    return baseStyles[buttonType] || baseStyles.primary;
  };

  // Get size styles
  const getSizeStyles = () => {
    const sizeStyles = {
      small: {
        padding: "4px 8px",
        fontSize: "12px",
        minHeight: "24px"
      },
      medium: {
        padding: padding || "8px 16px",
        fontSize: fontSize || "14px",
        minHeight: minHeight || "32px"
      },
      large: {
        padding: "12px 24px",
        fontSize: "16px",
        minHeight: "40px"
      }
    };
    
    return sizeStyles[size] || sizeStyles.medium;
  };

  const typeStyles = getButtonTypeStyles();
  const sizeStyles = getSizeStyles();

  const computedStyles = {
    // Layout & Dimensions
    width: processValue(width, 'width'),
    height: processValue(height, 'height'),
    minWidth: processValue(minWidth, 'minWidth'),
    maxWidth: maxWidth && processValue(maxWidth, 'maxWidth'),
    minHeight: processValue(minHeight, 'minHeight'),
    maxHeight: maxHeight && processValue(maxHeight, 'maxHeight'),
    
    // Positioning
    position,
    top: top !== undefined ? processValue(top, 'top') : undefined,
    left: left !== undefined ? processValue(left, 'left') : undefined,
    right: right !== undefined ? processValue(right, 'right') : undefined,
    bottom: bottom !== undefined ? processValue(bottom, 'bottom') : undefined,
    zIndex,
    
    // Spacing
    margin: processValue(margin, 'margin'),
    padding: sizeStyles.padding,
    
    // Typography
    fontFamily,
    fontSize: sizeStyles.fontSize,
    fontWeight,
    color: typeStyles.color,
    textAlign,
    textDecoration,
    
    // Background & Colors
    backgroundColor: typeStyles.backgroundColor,
    background,
    backgroundImage,
    
    // Border
    border: typeStyles.border,
    borderRadius: processValue(borderRadius, 'borderRadius'),
    
    // Visual Effects
    boxShadow: disabled ? 'none' : boxShadow,
    opacity: disabled ? 0.6 : opacity,
    transform,
    transition,
    
    // Interaction
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    outline: 'none',
    
    // Flex layout for children
    display: 'inline-flex',
    flexDirection,
    alignItems,
    justifyContent,
    gap: processValue(gap, 'gap'),
    
    // Hover effects
    ...(isHovered && !disabled && {
      transform: `${transform} scale(1.02)`,
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
    })
  };

  const ButtonElement = href ? 'a' : 'button';

  return (
    <ButtonElement
      className={`${selected ? 'ring-2 ring-blue-500' : ''} ${className}`}
      ref={buttonRef}
      style={computedStyles}
      disabled={disabled && !href}
      href={href}
      target={href ? target : undefined}
      rel={href ? rel : undefined}
      title={title}
      id={id}
      role={role}
      aria-label={ariaLabel || text}
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
      
      {/* Button content - text and children */}
      {text && !children?.length && (
  <span
    contentEditable={isEditing}
    onBlur={handleBlur}
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
)}

      
      {/* Render children */}
      {children}
    </ButtonElement>
  );
};

// CraftJS configuration
Button.craft = {
  props: {
    text: "Click Me",
    width: "auto",
    height: "auto",
    minWidth: 80,
    maxWidth: "",
    minHeight: 32,
    maxHeight: "",
    position: "relative",
    top: "",
    left: "",
    right: "",
    bottom: "",
    zIndex: 1,
    margin: "5px 0",
    padding: "8px 16px",
    fontFamily: "Arial",
    fontSize: 14,
    fontWeight: "400",
    color: "#ffffff",
    textAlign: "center",
    textDecoration: "none",
    backgroundColor: "#1890ff",
    background: "",
    backgroundImage: "",
    border: "1px solid #1890ff",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#1890ff",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    opacity: 1,
    transform: "none",
    transition: "all 0.3s ease",
    disabled: false,
    href: "",
    target: "_blank",
    rel: "noopener noreferrer",
    buttonType: "primary",
    size: "medium",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    title: "",
    className: "",
    id: "",
    role: "button",
    ariaLabel: "",
    tabIndex: 0,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,     // Now accepts children
    canMoveIn: () => true,   // Children can be moved in
    canMoveOut: () => true,
    
    
  },
  custom: {
    styleMenu: {
      supportedProps: [
        // Content
        "text",
        
        // Layout & Dimensions
        "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight",
        "position", "top", "left", "right", "bottom", "zIndex",
        
        // Spacing
        "margin", "padding",
        
        // Typography
        "fontFamily", "fontSize", "fontWeight", "color", "textAlign", "textDecoration",
        
        // Background & Colors
        "backgroundColor", "background", "backgroundImage",
        
        // Border
        "border", "borderRadius",
        
        // Visual Effects
        "boxShadow", "opacity", "transform", "transition",
        
        // Flexbox Layout (for children)
        "flexDirection", "alignItems", "justifyContent", "gap",
        
        // Button Properties
        "buttonType", "size", "disabled", "href", "target",
        
        // HTML Attributes
        "title", "className", "id", "ariaLabel"
      ]
    }
  }
};