'use client'

import React, { useRef, useEffect, useState } from "react";
import { useNode, useEditor } from "@craftjs/core";
import { EditOutlined } from '@ant-design/icons';

export const TextArea = ({
  // TextArea Content
  value = "Enter your text here...",
  placeholder = "Type something...",
  
  // Layout & Dimensions
  width = 300,
  height = 120,
  minWidth = 100,
  maxWidth,
  minHeight = 60,
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
  padding = "12px",
  
  // Typography
  fontFamily = "Arial",
  fontSize = 14,
  fontWeight = "400",
  color = "#333333",
  lineHeight = 1.5,
  textAlign = "left",
  
  // Background & Colors
  backgroundColor = "#ffffff",
  background,
  
  // Border
  border = "1px solid #d9d9d9",
  borderRadius = 6,
  borderWidth = 1,
  borderStyle = "solid",
  borderColor = "#d9d9d9",
  borderFocusColor = "#1890ff",
  
  // Visual Effects
  boxShadow = "none",
  boxShadowFocus = "0 0 0 2px rgba(24, 144, 255, 0.2)",
  opacity = 1,
  transform = "none",
  transition = "all 0.3s ease",
  
  // TextArea Behavior
  disabled = false,
  readonly = false,
  required = false,
  maxLength,
  rows = 4,
  cols,
  wrap = "soft", // soft, hard, off
  resize = "vertical", // none, both, horizontal, vertical
  
  // HTML Attributes
  name,
  id,
  title,
  className = "",
  form,
  
  // Accessibility
  ariaLabel,
  ariaDescribedBy,
  tabIndex = 0,
  
  // Validation
  pattern,
  autocomplete = "off",
  spellCheck = true,
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
  
  const textAreaRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const [characterCount, setCharacterCount] = useState(value.length);

  useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
      setCharacterCount(value.length);
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (textAreaRef.current) {
      connect(drag(textAreaRef.current));
    }
  }, [connect, drag]);

  // Handle text editing
  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
    setLocalValue(value);
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
        textAreaRef.current.select();
      }
    }, 0);
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    
    // Check maxLength
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    
    setLocalValue(newValue);
    setCharacterCount(newValue.length);
    
    // Update prop in real-time for preview
    setProp(props => {
      props.value = newValue;
    });
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setIsEditing(false);
    setProp(props => {
      props.value = localValue;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      setLocalValue(value);
      textAreaRef.current?.blur();
    }
    // Allow Tab to work normally in textarea
    if (e.key === 'Tab') {
      e.stopPropagation();
    }
  };

  // Helper function to process values
  const processValue = (value, property) => {
    if (typeof value === 'number' && !['opacity', 'zIndex', 'rows', 'cols'].includes(property)) {
      return `${value}px`;
    }
    return value;
  };

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
    padding: processValue(padding, 'padding'),
    
    // Typography
    fontFamily,
    fontSize: processValue(fontSize, 'fontSize'),
    fontWeight,
    color: disabled ? '#999999' : color,
    lineHeight,
    textAlign,
    
    // Background & Colors
    backgroundColor: disabled ? '#f5f5f5' : backgroundColor,
    background,
    
    // Border - dynamic based on focus state
    border: isFocused && !disabled ? `${borderWidth}px ${borderStyle} ${borderFocusColor}` : border,
    borderRadius: processValue(borderRadius, 'borderRadius'),
    
    // Visual Effects
    boxShadow: isFocused && !disabled ? boxShadowFocus : boxShadow,
    opacity: disabled ? 0.6 : opacity,
    transform,
    transition,
    
    // Interaction
    cursor: disabled ? 'not-allowed' : 'text',
    resize: disabled ? 'none' : resize,
    outline: 'none',
    
    // TextArea specific
    verticalAlign: 'top',
    overflow: 'auto',
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <textarea
        className={`${selected ? 'ring-2 ring-blue-500' : ''} ${className}`}
        ref={textAreaRef}
        style={computedStyles}
        value={isEditing ? localValue : value}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readonly && !isEditing}
        required={required}
        maxLength={maxLength}
        rows={rows}
        cols={cols}
        wrap={wrap}
        name={name}
        id={id}
        title={title}
        form={form}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        tabIndex={tabIndex}
        pattern={pattern}
        autoComplete={autocomplete}
        spellCheck={spellCheck}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onDoubleClick={handleDoubleClick}
      />

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

      {/* Character counter */}
      {maxLength && (isEditing || selected) && (
        <div
          style={{
            position: "absolute",
            bottom: -20,
            right: 0,
            fontSize: "12px",
            color: characterCount > maxLength * 0.9 ? "#ff4d4f" : "#999999",
            background: "white",
            padding: "2px 4px",
            borderRadius: "2px",
            boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
          }}
        >
          {characterCount}/{maxLength}
        </div>
      )}

      {/* Required indicator */}
      {required && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "#ff4d4f",
            fontSize: "12px",
            pointerEvents: "none"
          }}
        >
          *
        </span>
      )}
    </div>
  );
};

// CraftJS configuration
TextArea.craft = {
  props: {
    value: "Enter your text here...",
    placeholder: "Type something...",
    width: 300,
    height: 120,
    minWidth: 100,
    maxWidth: "",
    minHeight: 60,
    maxHeight: "",
    position: "relative",
    top: "",
    left: "",
    right: "",
    bottom: "",
    zIndex: 1,
    margin: "5px 0",
    padding: "12px",
    fontFamily: "Arial",
    fontSize: 14,
    fontWeight: "400",
    color: "#333333",
    lineHeight: 1.5,
    textAlign: "left",
    backgroundColor: "#ffffff",
    background: "",
    border: "1px solid #d9d9d9",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#d9d9d9",
    borderFocusColor: "#1890ff",
    boxShadow: "none",
    boxShadowFocus: "0 0 0 2px rgba(24, 144, 255, 0.2)",
    opacity: 1,
    transform: "none",
    transition: "all 0.3s ease",
    disabled: false,
    readonly: false,
    required: false,
    maxLength: "",
    rows: 4,
    cols: "",
    wrap: "soft",
    resize: "vertical",
    name: "",
    id: "",
    title: "",
    className: "",
    form: "",
    ariaLabel: "",
    ariaDescribedBy: "",
    tabIndex: 0,
    pattern: "",
    autocomplete: "off",
    spellCheck: true,
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
        "value",
        "placeholder",
        
        // Layout & Dimensions
        "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight",
        "position", "top", "left", "right", "bottom", "zIndex",
        
        // Spacing
        "margin", "padding",
        
        // Typography
        "fontFamily", "fontSize", "fontWeight", "color", "lineHeight", "textAlign",
        
        // Background & Colors
        "backgroundColor", "background",
        
        // Border
        "border", "borderRadius", "borderWidth", "borderStyle", "borderColor", "borderFocusColor",
        
        // Visual Effects
        "boxShadow", "boxShadowFocus", "opacity", "transform", "transition",
        
        // TextArea Properties
        "disabled", "readonly", "required", "maxLength", "rows", "cols", "wrap", "resize",
        
        // HTML Attributes
        "name", "id", "title", "className", "ariaLabel", "autocomplete", "spellCheck"
      ]
    }
  }
};