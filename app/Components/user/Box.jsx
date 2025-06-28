'use client'

import React, { useRef, useEffect, useState } from "react";
import Card from "antd/es/card/Card";
import { useNode, useEditor } from "@craftjs/core";
import { DragOutlined } from '@ant-design/icons';

export const Box = ({
  // Layout & Position
  width = "auto",
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
  visibility = "visible",
  float = "none",
  clear = "none",
  boxSizing = "content-box",
  
  // Overflow & Scroll
  overflow = "visible",
  overflowX = "visible",
  overflowY = "visible",
  resize = "none",
  
  // Spacing
  margin = "5px 0",
  marginTop,
  marginRight,
  marginBottom,
  marginLeft,
  marginX,
  marginY,
  padding = 20,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  paddingX,
  paddingY,
  
  // Border
  border = "none",
  borderWidth = 0,
  borderStyle = "solid",
  borderColor = "#000000",
  borderTopWidth,
  borderRightWidth,
  borderBottomWidth,
  borderLeftWidth,
  borderTopStyle,
  borderRightStyle,
  borderBottomStyle,
  borderLeftStyle,
  borderTopColor,
  borderRightColor,
  borderBottomColor,
  borderLeftColor,
  borderCollapse = "separate",
  borderSpacing = "0",
  
  // Border Radius
  borderRadius = 0,
  borderTopLeftRadius,
  borderTopRightRadius,
  borderBottomLeftRadius,
  borderBottomRightRadius,
  
  // Typography
  fontFamily = "Arial",
  fontSize = 16,
  fontWeight = "400",
  fontStyle = "normal",
  fontVariant = "normal",
  fontStretch = "normal",
  lineHeight = 1.4,
  letterSpacing = 0,
  wordSpacing = 0,
  textAlign = "left",
  textDecoration = "none",
  textTransform = "none",
  textIndent = 0,
  textShadow = "",
  verticalAlign = "baseline",
  whiteSpace = "normal",
  wordBreak = "normal",
  wordWrap = "normal",
  
  // Colors & Backgrounds
  color = "#000000",
  backgroundColor = "white",
  background = "white",
  backgroundImage = "",
  backgroundSize = "auto",
  backgroundRepeat = "repeat",
  backgroundPosition = "0% 0%",
  backgroundAttachment = "scroll",
  backgroundClip = "border-box",
  backgroundOrigin = "padding-box",
  
  // Flexbox
  flexDirection = "row",
  alignItems = "stretch",
  alignContent = "stretch",
  justifyContent = "flex-start",
  gap = 0,

  // Flexbox Item Properties
flex,
flexWrap,
flexGrow,
flexShrink, 
flexBasis,
alignSelf,
order,

  // CSS Grid Container Properties
gridTemplateColumns,
gridTemplateRows,
gridTemplateAreas,
gridAutoFlow = "row",
gridAutoColumns,
gridAutoRows,

// CSS Grid Item Properties
gridColumn,
gridRow,
gridColumnStart,
gridColumnEnd,
gridRowStart,
gridRowEnd,
gridArea,
rowGap ,
columnGap,

// Grid Alignment
justifyItems = "stretch",
justifySelf,
placeSelf,
placeItems,
placeContent,
  
  // Effects
  boxShadow = "none",
  transform = "none",
  opacity = 1,
  
  // Basic Properties
  src,
  alt,
  href,
  placeholder,
  title,
  id,
  className,
  target,
  rel,
  type,
  value,
  name,
  disabled = false,
  required = false,
  readonly = false,
  multiple = false,
  checked = false,
  selected = false,
  hidden = false,
  tabIndex = 0,
  accessKey,
  contentEditable = false,
  draggable = false,
  spellCheck = true,
  translate = 'yes',
  dir = "auto",
  lang,
  role,
  ariaLabel,
  ariaDescribedBy,
  ariaLabelledBy,

  children 
}) => {
  const { id: nodeId, connectors: { connect, drag }, actions: { setProp }, selected: isSelected } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
  }));
  const { actions } = useEditor();

  const cardRef = useRef(null);
  const dragHandleRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) {
      connect(cardRef.current);
    }
    if (dragHandleRef.current) {
      drag(dragHandleRef.current);
    }
  }, [connect, drag]);

  // Helper function to process values (add px to numbers where appropriate)
  const processValue = (value, property) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === 'number' && !['opacity', 'zIndex', 'lineHeight', 'fontWeight'].includes(property)) {
      return `${value}px`;
    }
    return value;
  };

   // Build computed styles
  const computedStyles = {
    // Layout & Position
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
    visibility,
    float,
    clear,
    boxSizing,
    
    // Overflow
    overflow,
    overflowX,
    overflowY,
    resize,
    
    // Spacing - handle individual sides or combined values
    margin: marginTop || marginRight || marginBottom || marginLeft || marginX || marginY 
      ? `${processValue(marginTop, 'marginTop') || 0} ${processValue(marginRight, 'marginRight') || 0} ${processValue(marginBottom, 'marginBottom') || 0} ${processValue(marginLeft, 'marginLeft') || 0}`
      : processValue(margin, 'margin'),
    padding: paddingTop || paddingRight || paddingBottom || paddingLeft || paddingX || paddingY
      ? `${processValue(paddingTop, 'paddingTop') || 0} ${processValue(paddingRight, 'paddingRight') || 0} ${processValue(paddingBottom, 'paddingBottom') || 0} ${processValue(paddingLeft, 'paddingLeft') || 0}`
      : processValue(padding, 'padding'),
    
    // Border - use individual values if set, otherwise use combined
    borderWidth: borderTopWidth !== undefined || borderRightWidth !== undefined || borderBottomWidth !== undefined || borderLeftWidth !== undefined
      ? `${processValue(borderTopWidth || borderWidth, 'borderWidth')} ${processValue(borderRightWidth || borderWidth, 'borderWidth')} ${processValue(borderBottomWidth || borderWidth, 'borderWidth')} ${processValue(borderLeftWidth || borderWidth, 'borderWidth')}`
      : processValue(borderWidth, 'borderWidth'),
    borderStyle: borderTopStyle || borderRightStyle || borderBottomStyle || borderLeftStyle
      ? `${borderTopStyle || borderStyle} ${borderRightStyle || borderStyle} ${borderBottomStyle || borderStyle} ${borderLeftStyle || borderStyle}`
      : borderStyle,
    borderColor: borderTopColor || borderRightColor || borderBottomColor || borderLeftColor
      ? `${borderTopColor || borderColor} ${borderRightColor || borderColor} ${borderBottomColor || borderColor} ${borderLeftColor || borderColor}`
      : borderColor,
    border: border !== "none" ? border : undefined,
    borderCollapse,
    borderSpacing,
    
    // Border Radius
    borderRadius: borderTopLeftRadius !== undefined || borderTopRightRadius !== undefined || borderBottomLeftRadius !== undefined || borderBottomRightRadius !== undefined
      ? `${processValue(borderTopLeftRadius || borderRadius, 'borderRadius')} ${processValue(borderTopRightRadius || borderRadius, 'borderRadius')} ${processValue(borderBottomRightRadius || borderRadius, 'borderRadius')} ${processValue(borderBottomLeftRadius || borderRadius, 'borderRadius')}`
      : processValue(borderRadius, 'borderRadius'),
    
    // Typography
    fontFamily,
    fontSize: processValue(fontSize, 'fontSize'),
    fontWeight,
    fontStyle,
    fontVariant,
    fontStretch,
    lineHeight,
    letterSpacing: processValue(letterSpacing, 'letterSpacing'),
    wordSpacing: processValue(wordSpacing, 'wordSpacing'),
    textAlign,
    textDecoration,
    textTransform,
    textIndent: processValue(textIndent, 'textIndent'),
    textShadow: textShadow || undefined,
    verticalAlign,
    whiteSpace,
    wordBreak,
    wordWrap,
    
    // Colors & Backgrounds
    color,
    backgroundColor: backgroundColor !== "white" ? backgroundColor : (background !== "white" ? background : "white"),
    backgroundImage: backgroundImage || undefined,
    backgroundSize,
    backgroundRepeat,
    backgroundPosition,
    backgroundAttachment,
    backgroundClip,
    backgroundOrigin,
    
    // Flexbox
    flexDirection,
    flexWrap,
    alignItems,
    justifyContent,
    alignContent,
    gap: processValue(gap, 'gap'),
    rowGap: processValue(rowGap, 'gap'),
    columnGap: processValue(columnGap, 'gap'),

    // Flexbox Item Properties  
    flex,
    flexGrow,
    flexShrink,
    flexBasis: processValue(flexBasis, 'flexBasis'),
    alignSelf,
    order,

    // CSS Grid
gridTemplateColumns,
gridTemplateRows,
gridTemplateAreas,
gridAutoFlow,
gridAutoColumns,
gridAutoRows,
gridColumn,
gridRow,
gridColumnStart,
gridColumnEnd,
gridRowStart,
gridRowEnd,
gridArea,
justifyItems,
justifySelf,
placeSelf,
placeItems,
placeContent,
    
    // Effects
    boxShadow: boxShadow !== "none" ? boxShadow : undefined,
    transform: transform !== "none" ? transform : undefined,
    opacity,
  };


  // Remove undefined values
  Object.keys(computedStyles).forEach(key => {
    if (computedStyles[key] === undefined) {
      delete computedStyles[key];
    }
  });

  return (
    <div
      className={`${isSelected ? 'ring-2 ring-blue-500' : ''} ${className || ''}`}
      ref={cardRef}
      style={computedStyles}
      id={id}
      title={title}
      role={role}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-labelledby={ariaLabelledBy}
      tabIndex={tabIndex}
      accessKey={accessKey}
      contentEditable={contentEditable}
      draggable={draggable}
      spellCheck={spellCheck}
      translate={translate}
      dir={dir}
      lang={lang}
      hidden={hidden}
    >
      {/* Drag handle */}
      <div
        ref={dragHandleRef}
        style={{
          position: "absolute",
          top: 4,
          right: 4,
          width: 24,
          height: 24,
          background: "#eee",
          borderRadius: "50%",
          cursor: "grab",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
        onMouseDown={e => e.stopPropagation()}
        title="Drag Container"
      >
        <DragOutlined />
      </div>
      {children}
    </div>
  );
};

// Define default props for Craft.js - these will be the initial values
Box.craft = {
  props: {
    // Layout & Position
    width: "auto",
    height: "auto",
    minHeight: "5rem",
    display: "block",
    position: "relative",
    zIndex: 1,
    visibility: "visible",
    float: "none",
    clear: "none",
    boxSizing: "content-box",
    
    // Overflow
    overflow: "visible",
    overflowX: "visible",
    overflowY: "visible",
    resize: "none",
    
    // Spacing
    margin: "none",
    padding: '2rem',
    
    // Border
    border: "none",
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: "#000000",
    borderCollapse: "separate",
    borderSpacing: "0",
    borderRadius: 0,
    
    // Typography
    fontFamily: "Arial",
    fontSize: 16,
    fontWeight: "400",
    fontStyle: "normal",
    lineHeight: 1.4,
    letterSpacing: 0,
    wordSpacing: 0,
    textAlign: "left",
    textDecoration: "none",
    textTransform: "none",
    textIndent: 0,
    verticalAlign: "baseline",
    whiteSpace: "normal",
    wordBreak: "normal",
    wordWrap: "normal",
    
    // Colors & Backgrounds
    color: "#000000",
    backgroundColor: "white",
    backgroundSize: "auto",
    backgroundRepeat: "repeat",
    backgroundPosition: "0% 0%",
    backgroundAttachment: "scroll",
    
    // Flexbox - Extended
    flexDirection: "row",
    flexWrap: "nowrap", 
    alignItems: "stretch",
    justifyContent: "flex-start",
    alignContent: "stretch",
    gap: 0,
    rowGap: 0,
    columnGap: 0,

    // CSS Grid
    gridAutoFlow: "row",
    justifyItems: "stretch",
    
    // Effects
    boxShadow: "none",
    transform: "none",
    opacity: 1,
    
    // Basic Properties
    className: "",
    disabled: false,
    hidden: false,
    tabIndex: 0,
    contentEditable: false,
    draggable: false,
    spellCheck: true,
    translate: 'yes',
    dir: "auto"
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
   custom: {
    styleMenu: {
      supportedProps: ['width', 'height', 'margin', 'padding', 'backgroundColor', 'borderRadius', 'border', 'overflow']
    }
  }
};