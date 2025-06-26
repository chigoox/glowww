'use client'

import React, { useRef, useEffect, useState } from "react";
import { useNode, useEditor } from "@craftjs/core";
import { DragOutlined, EditOutlined } from '@ant-design/icons';

export const Text = ({
  // Content
  text = "Edit this text",
  
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
  scrollBehavior = "auto",
  
  // Spacing
  margin = "5px 0",
  marginTop,
  marginRight,
  marginBottom,
  marginLeft,
  marginX,
  marginY,
  padding = "10px",
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
  backgroundColor = "transparent",
  background,
  backgroundImage = "",
  backgroundSize = "auto",
  backgroundRepeat = "repeat",
  backgroundPosition = "0% 0%",
  backgroundAttachment = "scroll",
  backgroundClip = "border-box",
  backgroundOrigin = "padding-box",
  
  // Flexbox Container Properties
  flexDirection = "row",
  flexWrap = "nowrap",
  alignItems = "stretch",
  alignContent = "stretch",
  justifyContent = "flex-start",
  gap = 0,
  rowGap = 0,
  columnGap = 0,
  
  // Flexbox Item Properties
  flex,
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
  justifyItems = "stretch",
  placeItems,
  placeContent,
  
  // CSS Grid Item Properties
  gridColumn,
  gridRow,
  gridColumnStart,
  gridColumnEnd,
  gridRowStart,
  gridRowEnd,
  gridArea,
  justifySelf,
  placeSelf,
  
  // List Properties
  listStyleType = "disc",
  listStylePosition = "outside",
  listStyleImage = "none",
  
  // Table Properties
  tableLayout = "auto",
  captionSide = "top",
  emptyCells = "show",
  
  // Transform & Animation
  transform = "none",
  transformOrigin = "50% 50%",
  transition = "",
  animation = "",
  
  // Effects & Filters
  opacity = 1,
  filter = "",
  backdropFilter = "",
  boxShadow = "none",
  clipPath = "",
  mask = "",
  mixBlendMode = "normal",
  backgroundBlendMode = "normal",
  
  // Interaction
  cursor = "auto",
  pointerEvents = "auto",
  userSelect = "auto",
  touchAction = "auto",
  
  // Content & Generated Content
  content = "",
  quotes = "",
  counterReset = "",
  counterIncrement = "",
  
  // Object Fitting
  objectFit = "fill",
  objectPosition = "50% 50%",
  
  // Scroll Properties
  scrollSnapType = "none",
  scrollSnapAlign = "none",
  
  // Basic HTML Properties
  src,
  alt,
  href,
  placeholder,
  title,
  id,
  className = "",
  target,
  rel,
  type,
  value,
  name,
  
  // Boolean Attributes
  disabled = false,
  required = false,
  readonly = false,
  multiple = false,
  checked = false,
  selected = false,
  hidden = false,
  contentEditable = false,
  draggable = false,
  spellCheck = true,
  translate = true,
  
  // Other Attributes
  tabIndex = 0,
  accessKey = "",
  dir = "auto",
  lang = "",
  role = "",
  ariaLabel = "",
  ariaDescribedBy = "",
  ariaLabelledBy = "",
  
  // Data Attributes
  dataAttributes = {}
}) => {
  const { id: nodeId, connectors: { connect, drag }, actions: { setProp }, selected: isSelected } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
  }));
  const { actions } = useEditor();

  const textRef = useRef(null);
  const dragHandleRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (textRef.current) {
      connect(textRef.current);
    }
    if (dragHandleRef.current) {
      drag(dragHandleRef.current);
    }
  }, [connect, drag]);

  // Helper function to process values (add px to numbers where appropriate)
  const processValue = (value, property) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === 'number' && !['opacity', 'zIndex', 'lineHeight', 'fontWeight', 'order', 'flexGrow', 'flexShrink'].includes(property)) {
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
    scrollBehavior,
    
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
    backgroundColor: backgroundColor !== "transparent" ? backgroundColor : (background ? background : undefined),
    backgroundImage: backgroundImage || undefined,
    backgroundSize,
    backgroundRepeat,
    backgroundPosition,
    backgroundAttachment,
    backgroundClip,
    backgroundOrigin,
    
    // Flexbox Container
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
    
    // CSS Grid Container
    gridTemplateColumns,
    gridTemplateRows,
    gridTemplateAreas,
    gridAutoFlow,
    gridAutoColumns,
    gridAutoRows,
    justifyItems,
    placeItems,
    placeContent,
    
    // CSS Grid Item
    gridColumn,
    gridRow,
    gridColumnStart,
    gridColumnEnd,
    gridRowStart,
    gridRowEnd,
    gridArea,
    justifySelf,
    placeSelf,
    
    // List Properties
    listStyleType,
    listStylePosition,
    listStyleImage: listStyleImage !== "none" ? listStyleImage : undefined,
    
    // Table Properties
    tableLayout,
    captionSide,
    emptyCells,
    
    // Transform & Animation
    transform: transform !== "none" ? transform : undefined,
    transformOrigin,
    transition: transition || undefined,
    animation: animation || undefined,
    
    // Effects & Filters
    opacity,
    filter: filter || undefined,
    backdropFilter: backdropFilter || undefined,
    boxShadow: boxShadow !== "none" ? boxShadow : undefined,
    clipPath: clipPath || undefined,
    mask: mask || undefined,
    mixBlendMode,
    backgroundBlendMode,
    
    // Interaction
    cursor,
    pointerEvents,
    userSelect,
    touchAction,
    
    // Content (for pseudo elements)
    content: content || undefined,
    quotes: quotes || undefined,
    counterReset: counterReset || undefined,
    counterIncrement: counterIncrement || undefined,
    
    // Object Properties
    objectFit,
    objectPosition,
    
    // Scroll Properties
    scrollSnapType,
    scrollSnapAlign,
  };

  // Remove undefined values
  Object.keys(computedStyles).forEach(key => {
    if (computedStyles[key] === undefined) {
      delete computedStyles[key];
    }
  });

  // Handle data attributes
  const dataAttrs = {};
  Object.entries(dataAttributes).forEach(([key, value]) => {
    dataAttrs[`data-${key}`] = value;
  });

  // Handle text editing
  const handleTextChange = (e) => {
    setProp(props => props.text = e.target.innerText);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  return (
    <div
      className={`${isSelected ? 'ring-2 ring-blue-500' : ''} ${className || ''}`}
      ref={textRef}
      style={{
        position: 'relative',
        ...computedStyles
      }}
      id={id}
      title={title}
      role={role}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-labelledby={ariaLabelledBy}
      tabIndex={tabIndex}
      accessKey={accessKey}
      contentEditable={isEditing}
      draggable={draggable}
      spellCheck={spellCheck}
      translate={translate ? 'yes' : 'no'}
      dir={dir}
      lang={lang}
      hidden={hidden}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      onInput={handleTextChange}
      {...dataAttrs}
      {...(disabled && { disabled: true })}
      {...(required && { required: true })}
      {...(readonly && { readOnly: true })}
      {...(multiple && { multiple: true })}
      {...(checked && { checked: true })}
      {...(selected && { selected: true })}
    >
      {/* Drag handle */}
      {isSelected && (
        <div
          ref={dragHandleRef}
          style={{
            position: "absolute",
            top: -12,
            right: -12,
            width: 24,
            height: 24,
            background: "#1890ff",
            borderRadius: "50%",
            cursor: "grab",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 12,
            border: "2px solid white",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
          }}
          onMouseDown={e => e.stopPropagation()}
          title="Drag Text"
        >
          <DragOutlined />
        </div>
      )}
      
      {/* Edit indicator */}
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
          onClick={handleDoubleClick}
          title="Double-click to edit text"
        >
          <EditOutlined />
        </div>
      )}
      
      {text}
    </div>
  );
};

// Define all supported props for the Text component
Text.craft = {
  props: {
    // Content
    text: "Edit this text",
    
    // Layout & Position
    width: "auto",
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
    visibility: "visible",
    float: "none",
    clear: "none",
    boxSizing: "content-box",
    
    // Overflow & Scroll
    overflow: "visible",
    overflowX: "visible",
    overflowY: "visible",
    resize: "none",
    scrollBehavior: "auto",
    
    // Spacing
    margin: "5px 0",
    marginTop: "",
    marginRight: "",
    marginBottom: "",
    marginLeft: "",
    marginX: "",
    marginY: "",
    padding: "10px",
    paddingTop: "",
    paddingRight: "",
    paddingBottom: "",
    paddingLeft: "",
    paddingX: "",
    paddingY: "",
    
    // Border
    border: "none",
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: "#000000",
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopStyle: "solid",
    borderRightStyle: "solid",
    borderBottomStyle: "solid",
    borderLeftStyle: "solid",
    borderTopColor: "#000000",
    borderRightColor: "#000000",
    borderBottomColor: "#000000",
    borderLeftColor: "#000000",
    borderCollapse: "separate",
    borderSpacing: "0",
    
    // Border Radius
    borderRadius: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    
    // Typography
    fontFamily: "Arial",
    fontSize: 16,
    fontWeight: "400",
    fontStyle: "normal",
    fontVariant: "normal",
    fontStretch: "normal",
    lineHeight: 1.4,
    letterSpacing: 0,
    wordSpacing: 0,
    textAlign: "left",
    textDecoration: "none",
    textTransform: "none",
    textIndent: 0,
    textShadow: "",
    verticalAlign: "baseline",
    whiteSpace: "normal",
    wordBreak: "normal",
    wordWrap: "normal",
    
    // Colors & Backgrounds
    color: "#000000",
    backgroundColor: "transparent",
    background: "",
    backgroundImage: "",
    backgroundSize: "auto",
    backgroundRepeat: "repeat",
    backgroundPosition: "0% 0%",
    backgroundAttachment: "scroll",
    backgroundClip: "border-box",
    backgroundOrigin: "padding-box",
    
    // Flexbox Container
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
    alignContent: "stretch",
    justifyContent: "flex-start",
    gap: 0,
    rowGap: 0,
    columnGap: 0,
    
    // Flexbox Item Properties
    flex: "",
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: "auto",
    alignSelf: "auto",
    order: 0,
    
    // CSS Grid Container Properties
    gridTemplateColumns: "",
    gridTemplateRows: "",
    gridTemplateAreas: "",
    gridAutoFlow: "row",
    gridAutoColumns: "",
    gridAutoRows: "",
    justifyItems: "stretch",
    placeItems: "auto",
    placeContent: "auto",
    
    // CSS Grid Item Properties
    gridColumn: "",
    gridRow: "",
    gridColumnStart: "",
    gridColumnEnd: "",
    gridRowStart: "",
    gridRowEnd: "",
    gridArea: "",
    justifySelf: "auto",
    placeSelf: "auto",
    
    // List Properties
    listStyleType: "disc",
    listStylePosition: "outside",
    listStyleImage: "none",
    
    // Table Properties
    tableLayout: "auto",
    captionSide: "top",
    emptyCells: "show",
    
    // Transform & Animation
    transform: "none",
    transformOrigin: "50% 50%",
    transition: "",
    animation: "",
    
    // Effects & Filters
    opacity: 1,
    filter: "",
    backdropFilter: "",
    boxShadow: "none",
    clipPath: "",
    mask: "",
    mixBlendMode: "normal",
    backgroundBlendMode: "normal",
    
    // Interaction
    cursor: "auto",
    pointerEvents: "auto",
    userSelect: "auto",
    touchAction: "auto",
    
    // Content & Generated Content
    content: "",
    quotes: "",
    counterReset: "",
    counterIncrement: "",
    
    // Object Fitting
    objectFit: "fill",
    objectPosition: "50% 50%",
    
    // Scroll Properties
    scrollSnapType: "none",
    scrollSnapAlign: "none",
    
    // Basic HTML Properties
    src: "",
    alt: "",
    href: "",
    placeholder: "",
    title: "",
    id: "",
    className: "",
    target: "",
    rel: "",
    type: "",
    value: "",
    name: "",
    
    // Boolean Attributes
    disabled: false,
    required: false,
    readonly: false,
    multiple: false,
    checked: false,
    selected: false,
    hidden: false,
    contentEditable: false,
    draggable: false,
    spellCheck: true,
    translate: true,
    
    // Other Attributes
    tabIndex: 0,
    accessKey: "",
    dir: "auto",
    lang: "",
    role: "",
    ariaLabel: "",
    ariaDescribedBy: "",
    ariaLabelledBy: "",
    
    // Data Attributes
    dataAttributes: {}
  },
  rules: {
    canDrag: () => true,
    canDrop: () => false, // Text typically doesn't accept drops
    canMoveIn: () => false,
  },
  custom: {
    styleMenu: {
      supportedProps: [] // Empty array means show ALL properties
    }
  }
};