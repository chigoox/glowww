'use client'

import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNode, useEditor } from "@craftjs/core";
import ContextMenu from "../utils/context/ContextMenu";
import useEditorDisplay from "../utils/craft/useEditorDisplay";
import SnapGridOverlay from "../utils/grid/SnapGridOverlay";
import { useSnapGridCanvas } from "../utils/craft/useCraftSnap";
import MultiSelectBoundingBox from "../utils/selection/MultiSelectBoundingBox";

export const Root = ({
  // Layout & Position
  width = "full",
  height = "auto",
  minWidth = '100%',
  maxWidth = '100%',
  minHeight,
  maxHeight ,
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
  margin = 0,
  marginTop,
  marginRight,
  marginBottom,
  marginLeft,
  marginX,
  marginY,
  padding = 0,
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
placeItems= "",
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
  id='ROOT',
  name='ROOT',
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

  const RootRef = useRef(null);
  const dragRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
//setid props for the root element
    if (RootRef.current) {
      RootRef.current.id = nodeId;
    }
  }, [nodeId]);

  // Use our shared editor display hook
  const { hideEditorUI } = useEditorDisplay();

  // Initialize snap and grid system for canvas
  const { setCanvasRef } = useSnapGridCanvas();

  // Context menu state
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  // Handle context menu (right-click)
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
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
  const updateBoxPosition = () => {
    if (RootRef.current) {
      const rect = RootRef.current.getBoundingClientRect();
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
    const connectElements = () => {
      if (RootRef.current) {
        connect(RootRef.current); // Connect for selection
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
    const rect = RootRef.current.getBoundingClientRect();
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
    if (value === undefined || value === null) return undefined;
    if (value === "") return undefined;
    if (typeof value === 'number' && !['opacity', 'zIndex', 'lineHeight', 'fontWeight', 'flexGrow', 'flexShrink', 'order'].includes(property)) {
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
    
    // Overflow - handle precedence correctly (overflow should override overflowX/Y)
    ...(overflow && overflow !== "visible" 
      ? {
          // When overflow is explicitly set, it overrides X and Y
          overflow: overflow
        }
      : {
          // When overflow is not set or is "visible", use individual X and Y values
          overflowX: overflowX || "visible",
          overflowY: overflowY || "visible"
        }
    ),
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


  // Remove undefined values, but preserve important properties that should always be applied
  const importantProperties = ['overflow', 'overflowX', 'overflowY', 'display', 'position', 'visibility'];
  Object.keys(computedStyles).forEach(key => {
    if (computedStyles[key] === undefined && !importantProperties.includes(key)) {
      delete computedStyles[key];
    }
  });

  return (
    <div
      className={`${false ? 'ring-2 ring-blue-500' : ''} ${false ? 'ring-1 ring-gray-300' : ''} ${className || ''}`}
      ref={(el) => {
        RootRef.current = el;
        setCanvasRef(el); // Initialize snap grid system
      }}
      style={{
        ...computedStyles,
        position: 'relative',
        cursor: 'default'
      }}
      data-cy="editor-root"
      data-editor="true"
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
      name={'ROOT'}
      lang={lang}
      hidden={hidden}
      onMouseEnter={false ? undefined : () => {
        setIsHovered(true);
        updateBoxPosition();
      }}
      onMouseLeave={hideEditorUI ? undefined : () => setIsHovered(false)}
      onContextMenu={hideEditorUI ? undefined : handleContextMenu}
    >
      {/* Snap Grid Overlay - Only visible in edit mode */}
      {!hideEditorUI && (
        <SnapGridOverlay
          canvasRef={RootRef}
          canvasWidth={RootRef.current?.offsetWidth || 1200}
          canvasHeight={RootRef.current?.offsetHeight || 800}
        />
      )}
      
      {/* Empty State Drop Zone Indicator - Only show when no children and in edit mode */}
      {!hideEditorUI && (!children || (React.Children.count(children) === 0)) && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%)',
            border: '3px dashed rgba(99, 102, 241, 0.4)',
            borderRadius: '12px',
            minHeight: '580px',
            margin: '10px'
          }}
        >
          <div className="text-center text-gray-600 p-8">
            <div className="text-8xl mb-6">🎨</div>
            <div className="text-2xl font-bold mb-3 text-gray-800">Ready to Build!</div>
            <div className="text-lg mb-4 text-gray-700">Drag components from the toolbox to start creating your page</div>
            <div className="text-sm text-gray-500 bg-white/80 rounded-lg px-4 py-2 inline-block">
              This empty canvas is ready for your first component
            </div>
          </div>
        </div>
      )}
     
      {children}
      
      {/* Context Menu */}
      {/* Hide context menu in preview mode */}
      {!hideEditorUI && (
        <ContextMenu
          visible={contextMenu.visible}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={closeContextMenu}
          targetNodeId={nodeId}
        />
      )}
      
      {/* Multi-select bounding box - only show in editor mode */}
      {!hideEditorUI && <MultiSelectBoundingBox />}
    </div>
  );
};



// Define default props for Craft.js - these will be the initial values
Root.craft = {
  displayName: "Root",
  // Canvas property for containers - THIS MUST BE AT ROOT LEVEL
  canvas: true,
  props: {
    // Layout & Position
    width: "auto",
    height: "900px",
    minHeight: "900px",
    maxWidth: '100vh',
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
    padding: 0,
    
    // Border
    border: "none",
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: "#000000",
    borderCollapse: "separate",
    borderSpacing: "0",
    borderRadius: 0,
    
    // Typography
    fontFamily: "inherit",
    fontSize: 'inherit',
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
    id: "ROOT", 
    name: "ROOT",
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
    canDrag: () => false,
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
      
       "overflow",
    
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'paddingX', 'paddingY',
      
      // Border - All sides and properties
      'border', 'borderWidth', 'borderStyle', 'borderColor',
      'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
      'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
      'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
      'borderCollapse', 'borderSpacing',
      
 
      // Flexbox Container Properties
      'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'alignContent',
      'gap', 'rowGap', 'columnGap',
      
      // Flexbox Item Properties
      'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'order',
      
      // Colors & Backgrounds
      'color', 'backgroundColor', 'background', 'backgroundImage', 'backgroundSize',
      'backgroundRepeat', 'backgroundPosition', 'backgroundAttachment', 'backgroundClip', 'backgroundOrigin',
      
   
      
      // HTML Attributes
      'id', 'className', 'title', 'hidden', 'tabIndex', 'accessKey',
      'contentEditable', 'draggable', 'spellCheck', 'translate', 'dir', 'lang',
      'role', 'ariaLabel', 'ariaDescribedBy', 'ariaLabelledBy'
    ]
  }
}
};