'use client'

import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNode, useEditor } from "@craftjs/core";
import ContextMenu from "../support/ContextMenu";
import { useContextMenu } from "../support/useContextMenu";
import useEditorDisplay from "../support/useEditorDisplay";

export const GridBox = ({
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
  padding = 2,
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

  const gridBoxRef = useRef(null);
  const dragRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  // Context menu functionality
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
  const { hideEditorUI } = useEditorDisplay();

  // Function to update box position for portal positioning
  const updateBoxPosition = () => {
    if (gridBoxRef.current) {
      const rect = gridBoxRef.current.getBoundingClientRect();
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

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const connectElements = () => {
      if (gridBoxRef.current) {
        connect(gridBoxRef.current); // Connect for selection
      }
      if (dragRef.current) {
        drag(dragRef.current); // Connect the drag handle for Craft.js dragging
      }
    };

    connectElements();
    
    // Also reconnect when the component is selected
    if (isSelected) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(connectElements, 10);
      return () => clearTimeout(timer);
    }
  }, [connect, drag, isSelected]);

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

  // Handle resize start
  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = gridBoxRef.current.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    
    setIsResizing(true);
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      // Calculate new dimensions based on resize direction
      switch (direction) {
        case 'se': // bottom-right
          newWidth = startWidth + deltaX;
          newHeight = startHeight + deltaY;
          break;
        case 'sw': // bottom-left
          newWidth = startWidth - deltaX;
          newHeight = startHeight + deltaY;
          break;
        case 'ne': // top-right
          newWidth = startWidth + deltaX;
          newHeight = startHeight - deltaY;
          break;
        case 'nw': // top-left
          newWidth = startWidth - deltaX;
          newHeight = startHeight - deltaY;
          break;
        case 'e': // right edge
          newWidth = startWidth + deltaX;
          break;
        case 'w': // left edge
          newWidth = startWidth - deltaX;
          break;
        case 's': // bottom edge
          newHeight = startHeight + deltaY;
          break;
        case 'n': // top edge
          newHeight = startHeight - deltaY;
          break;
      }
      
      // Apply minimum constraints
      newWidth = Math.max(newWidth, 50);
      newHeight = Math.max(newHeight, 20);
      
      // Update dimensions using Craft.js setProp
      setProp(props => {
        props.width = Math.round(newWidth);
        props.height = Math.round(newHeight);
      });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle custom drag for position changes
  const handleDragStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const currentTop = parseInt(top) || 0;
    const currentLeft = parseInt(left) || 0;
    
    setIsDragging(true);
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      // Update position using Craft.js setProp
      setProp(props => {
        props.left = currentLeft + deltaX;
        props.top = currentTop + deltaY;
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

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
      className={`${isSelected && !hideEditorUI ? 'ring-2 ring-blue-500' : ''} ${isHovered && !hideEditorUI ? 'ring-1 ring-gray-300' : ''} ${className || ''}`}
      ref={gridBoxRef}
      style={{
        ...computedStyles,
        position: 'relative',
        cursor: 'default'
      }}
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
      onMouseEnter={hideEditorUI ? undefined : () => {
        setIsHovered(true);
        updateBoxPosition();
      }}
      onMouseLeave={hideEditorUI ? undefined : () => setIsHovered(false)}
      onContextMenu={hideEditorUI ? undefined : handleContextMenu}
    >
      {/* Portal controls rendered outside this container to avoid overflow clipping */}
      {isSelected && !hideEditorUI && (
        <PortalControls
          boxPosition={boxPosition}
          dragRef={dragRef}
          handleDragStart={handleDragStart}
          handleResizeStart={handleResizeStart}
        />
      )}
      {children}
      
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

// Portal Controls Component - renders outside of the GridBox to avoid overflow clipping
const PortalControls = ({ 
  boxPosition, 
  dragRef, 
  handleDragStart, 
  handleResizeStart 
}) => {
  if (typeof window === 'undefined') return null; // SSR check
  
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none', // Allow clicks to pass through
        zIndex: 999999
      }}
    >
      {/* Combined pill-shaped drag controls */}
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
          pointerEvents: 'auto' // Re-enable pointer events for this element
        }}
      >
        {/* Left half - MOVE (Craft.js drag) - Now interactive */}
        <div
          ref={dragRef}
          style={{
            background: '#52c41a',
            color: 'white',
            padding: '6px 12px',
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
        
        {/* Right half - POS (Custom position drag) */}
        <div
          style={{
            background: '#1890ff',
            color: 'white',
            padding: '6px 12px',
            borderRadius: '0 14px 14px 0',
            cursor: 'move',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '48px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          onMouseDown={(e) => handleDragStart(e)}
          title="Drag to change position"
        >
          ↕↔ POS
        </div>
      </div>

      {/* Resize handles */}
      {/* Top-left corner */}
      <div
        style={{
          position: 'absolute',
          top: boxPosition.top - 4,
          left: boxPosition.left - 4,
          width: 8,
          height: 8,
          background: 'white',
          border: '2px solid #1890ff',
          borderRadius: '2px',
          cursor: 'nw-resize',
          zIndex: 10001,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'nw')}
        title="Resize"
      />

      {/* Top-right corner */}
      <div
        style={{
          position: 'absolute',
          top: boxPosition.top - 4,
          left: boxPosition.left + boxPosition.width - 4,
          width: 8,
          height: 8,
          background: 'white',
          border: '2px solid #1890ff',
          borderRadius: '2px',
          cursor: 'ne-resize',
          zIndex: 10001,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'ne')}
        title="Resize"
      />

      {/* Bottom-left corner */}
      <div
        style={{
          position: 'absolute',
          top: boxPosition.top + boxPosition.height - 4,
          left: boxPosition.left - 4,
          width: 8,
          height: 8,
          background: 'white',
          border: '2px solid #1890ff',
          borderRadius: '2px',
          cursor: 'sw-resize',
          zIndex: 10001,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'sw')}
        title="Resize"
      />

      {/* Bottom-right corner */}
      <div
        style={{
          position: 'absolute',
          top: boxPosition.top + boxPosition.height - 4,
          left: boxPosition.left + boxPosition.width - 4,
          width: 8,
          height: 8,
          background: 'white',
          border: '2px solid #1890ff',
          borderRadius: '2px',
          cursor: 'se-resize',
          zIndex: 10001,
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'se')}
        title="Resize"
      />

      {/* Edge resize handles - beautiful semi-transparent style */}
      {/* Top edge */}
      <div
        style={{
          position: 'absolute',
          top: boxPosition.top - 4,
          left: boxPosition.left + boxPosition.width / 2 - 10,
          width: 20,
          height: 8,
          background: 'rgba(24, 144, 255, 0.3)',
          cursor: 'n-resize',
          zIndex: 9999,
          borderRadius: '4px',
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'n')}
        title="Resize height"
      />

      {/* Bottom edge */}
      <div
        style={{
          position: 'absolute',
          top: boxPosition.top + boxPosition.height - 4,
          left: boxPosition.left + boxPosition.width / 2 - 10,
          width: 20,
          height: 8,
          background: 'rgba(24, 144, 255, 0.3)',
          cursor: 's-resize',
          zIndex: 9999,
          borderRadius: '4px',
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 's')}
        title="Resize height"
      />

      {/* Left edge */}
      <div
        style={{
          position: 'absolute',
          left: boxPosition.left - 4,
          top: boxPosition.top + boxPosition.height / 2 - 10,
          width: 8,
          height: 20,
          background: 'rgba(24, 144, 255, 0.3)',
          cursor: 'w-resize',
          zIndex: 9999,
          borderRadius: '4px',
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'w')}
        title="Resize width"
      />

      {/* Right edge */}
      <div
        style={{
          position: 'absolute',
          left: boxPosition.left + boxPosition.width - 4,
          top: boxPosition.top + boxPosition.height / 2 - 10,
          width: 8,
          height: 20,
          background: 'rgba(24, 144, 255, 0.3)',
          cursor: 'e-resize',
          zIndex: 9999,
          borderRadius: '4px',
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => handleResizeStart(e, 'e')}
        title="Resize width"
      />
    </div>,
    document.body
  );
};

// Define default props for Craft.js - these will be the initial values
GridBox.craft = {
  displayName: "GridBox",
  props: {
    // Canvas property for containers
    canvas: true,
    
    // Layout & Position
    width: "auto",
    height: "auto",
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
    padding: '2px',
     
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
    canMoveOut: () => true
  },
   custom: {
    styleMenu: {
      supportedProps: [
        // Layout & Position
        'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
        'display', 'position', 'top', 'right', 'bottom', 'left', 'zIndex',
        'visibility', 'float', 'clear', 'boxSizing',
        
        // Overflow & Scroll
        'overflow', 'overflowX', 'overflowY', 'resize',
        
        // Spacing - All sides
        'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'marginX', 'marginY',
        'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'paddingX', 'paddingY',
        
        // Border - All sides and properties
        'border', 'borderWidth', 'borderStyle', 'borderColor',
        'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
        'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
        'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
        'borderCollapse', 'borderSpacing',
        
        // Border Radius - All corners
        'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 
        'borderBottomLeftRadius', 'borderBottomRightRadius',
        
        // Typography
        'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant', 'fontStretch',
        'lineHeight', 'letterSpacing', 'wordSpacing', 'textAlign', 'textDecoration',
        'textTransform', 'textIndent', 'textShadow', 'verticalAlign', 'whiteSpace',
        'wordBreak', 'wordWrap',
        
        // Grid Container Properties
        'gridTemplateColumns', 'gridTemplateRows', 'gridTemplateAreas', 'gridAutoFlow',
        'gridAutoColumns', 'gridAutoRows', 'gap', 'rowGap', 'columnGap',
        'justifyItems', 'alignItems', 'justifyContent', 'alignContent', 'placeItems', 'placeContent',
        
        // Grid Item Properties
        'gridColumn', 'gridRow', 'gridColumnStart', 'gridColumnEnd', 'gridRowStart', 'gridRowEnd',
        'gridArea', 'justifySelf', 'alignSelf', 'placeSelf',
        
        // Colors & Backgrounds
        'color', 'backgroundColor', 'background', 'backgroundImage', 'backgroundSize',
        'backgroundRepeat', 'backgroundPosition', 'backgroundAttachment', 'backgroundClip', 'backgroundOrigin',
        
        // Effects
        'boxShadow', 'opacity', 'transform',
        
        // HTML Attributes
        'id', 'className', 'title', 'hidden', 'tabIndex', 'accessKey',
        'contentEditable', 'draggable', 'spellCheck', 'translate', 'dir', 'lang',
        'role', 'ariaLabel', 'ariaDescribedBy', 'ariaLabelledBy'
      ]
    }
  }
};