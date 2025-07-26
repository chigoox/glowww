'use client'

import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Card from "antd/es/card/Card";
import { useNode, useEditor } from "@craftjs/core";
import ContextMenu from "../support/ContextMenu";
import useEditorDisplay from "../support/useEditorDisplay";
import { useCraftSnap } from "../support/useCraftSnap";
import SnapPositionHandle from "../support/SnapPositionHandle";
import { snapGridSystem } from "../support/SnapGridSystem";
import { useMultiSelect } from '../support/MultiSelectContext';

export const FlexBox = ({
  
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
  const { id: nodeId, connectors: { connect, drag }, actions: { setProp }, selected: isSelected, parent } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
    parent: node.data.parent,
  }));
  const { actions: editorActions, query } = useEditor();
  
  // Use snap functionality
  const { connectors: { snapConnect, snapDrag } } = useCraftSnap(nodeId);
  
  // Use multi-selection functionality
  const { addToSelection, addToSelectionWithKeys, removeFromSelection, isSelected: isMultiSelected, isMultiSelecting } = useMultiSelect();
  
  // Use our shared editor display hook
  const { hideEditorUI } = useEditorDisplay();

  const cardRef = useRef(null);
  const dragRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  
  // Track previous parent to detect container changes
  const prevParentRef = useRef(parent);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });

  // Handle context menu (right-click)
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If this element is not already selected, add it to the selection
    if (!isMultiSelected(nodeId)) {
      console.log('🎯 Right-click on unselected element, adding to selection:', nodeId);
      addToSelection(nodeId);
    }
    
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
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setBoxPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
    }
  };

  useEffect(() => {
    const connectElements = () => {
      if (cardRef.current) {
        snapConnect(cardRef.current); // Connect for selection with snap functionality
      }
      if (dragRef.current) {
        snapDrag(dragRef.current); // Connect the drag handle with snap functionality
      }
    };

    connectElements();
    
    // Also reconnect when the component is selected
    if (isSelected) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(connectElements, 10);
      return () => clearTimeout(timer);
    }
  }, [snapConnect, snapDrag, isSelected]);

  // Detect parent changes and reset position properties
  useEffect(() => {
    // Skip the initial render (when prevParentRef.current is first set)
    if (prevParentRef.current !== null && prevParentRef.current !== parent) {
      // Parent has changed - element was moved to a different container
      console.log(`📦 Element ${nodeId} moved from parent ${prevParentRef.current} to ${parent} - resetting position`);
      
      // Reset position properties to default
      editorActions.history.throttle(500).setProp(nodeId, (props) => {
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

  // Handle resize start
  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = cardRef.current.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    
    setIsResizing(true);

    // Register all elements for snapping during resize
    const nodes = query.getNodes();
    Object.entries(nodes).forEach(([id, node]) => {
      if (id !== nodeId && node.dom) {
        const elementRect = node.dom.getBoundingClientRect();
        const editorRoot = document.querySelector('[data-editor="true"]');
        if (editorRoot) {
          const editorRect = editorRoot.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(node.dom);
          
          // Get border widths for reference
          const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
          const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
          const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
          const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
          
          // For visual alignment, we want to align to the full visual bounds (border box)
          // This includes padding and borders as users expect visual alignment to the actual edge
          const registrationBounds = {
            x: elementRect.left - editorRect.left,
            y: elementRect.top - editorRect.top,
            width: elementRect.width,
            height: elementRect.height,
          };
          
          console.log('📝 Registering element with border box bounds:', {
            id,
            elementRect: {
              left: elementRect.left - editorRect.left,
              top: elementRect.top - editorRect.top,
              width: elementRect.width,
              height: elementRect.height,
              right: (elementRect.left - editorRect.left) + elementRect.width,
              bottom: (elementRect.top - editorRect.top) + elementRect.height
            },
            borders: { borderLeft, borderRight, borderTop, borderBottom }
          });
          
          snapGridSystem.registerElement(id, node.dom, registrationBounds);
        }
      }
    });
    
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

      // Get current position for snap calculations
      const currentRect = cardRef.current.getBoundingClientRect();
      const editorRoot = document.querySelector('[data-editor="true"]');
      if (editorRoot) {
        const editorRect = editorRoot.getBoundingClientRect();
        
        // Calculate the intended bounds based on resize direction
        let intendedBounds = {
          left: currentRect.left - editorRect.left,
          top: currentRect.top - editorRect.top,
          width: newWidth,
          height: newHeight
        };

        // Adjust position for edges that move the element's origin
        if (direction.includes('w')) {
          // Left edge resize - element position changes
          const widthDelta = newWidth - currentRect.width;
          intendedBounds.left = (currentRect.left - editorRect.left) - widthDelta;
        }
        
        if (direction.includes('n')) {
          // Top edge resize - element position changes
          const heightDelta = newHeight - currentRect.height;
          intendedBounds.top = (currentRect.top - editorRect.top) - heightDelta;
        }

        // Calculate all edge positions with the new dimensions
        intendedBounds.right = intendedBounds.left + intendedBounds.width;
        intendedBounds.bottom = intendedBounds.top + intendedBounds.height;
        intendedBounds.centerX = intendedBounds.left + intendedBounds.width / 2;
        intendedBounds.centerY = intendedBounds.top + intendedBounds.height / 2;

        console.log('🔧 Resize bounds:', { 
          direction, 
          currentBounds: {
            left: currentRect.left - editorRect.left,
            top: currentRect.top - editorRect.top,
            width: currentRect.width,
            height: currentRect.height
          },
          intendedBounds,
          newDimensions: { newWidth, newHeight }
        });

        // Use resize-specific snap method
        const snapResult = snapGridSystem.getResizeSnapPosition(
          nodeId,
          direction,
          intendedBounds,
          newWidth,
          newHeight
        );

        if (snapResult.snapped) {
          newWidth = snapResult.bounds.width;
          newHeight = snapResult.bounds.height;
          
          console.log('🔧 Applied snap result:', { 
            snappedWidth: newWidth, 
            snappedHeight: newHeight,
            originalDimensions: { width: newWidth, height: newHeight }
          });
        }
      }
      
      // Update dimensions using Craft.js throttled setProp for smooth history
      editorActions.history.throttle(500).setProp(nodeId, (props) => {
        props.width = Math.round(newWidth);
        props.height = Math.round(newHeight);
      });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      
      // Clear snap indicators and cleanup tracked elements
      snapGridSystem.clearSnapIndicators();
      setTimeout(() => {
        snapGridSystem.cleanupTrackedElements();
      }, 100);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle custom drag for position changes - REPLACED by SnapPositionHandle
  // const handleDragStart = (e) => {
  //   e.stopPropagation();
  //   e.preventDefault();
  //   
  //   const startX = e.clientX;
  //   const startY = e.clientY;
  //   const currentTop = parseInt(top) || 0;
  //   const currentLeft = parseInt(left) || 0;
  //   
  //   setIsDragging(true);
  //   
  //   const handleMouseMove = (moveEvent) => {
  //     const deltaX = moveEvent.clientX - startX;
  //     const deltaY = moveEvent.clientY - startY;
  //     
  //     // Update position using Craft.js throttled setProp for smooth history
  //     editorActions.history.throttle(200).setProp(nodeId, (props) => {
  //       props.left = currentLeft + deltaX;
  //       props.top = currentTop + deltaY;
  //     });
  //   };
  //   
  //   const handleMouseUp = () => {
  //     setIsDragging(false);
  //     document.removeEventListener('mousemove', handleMouseMove);
  //     document.removeEventListener('mouseup', handleMouseUp);
  //   };
  //   
  //   document.addEventListener('mousemove', handleMouseMove);
  //   document.addEventListener('mouseup', handleMouseUp);
  // };

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
    
    // Overflow - ensure valid values are always set
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
      className={`${isSelected && !hideEditorUI ? 'ring-2 ring-blue-500' : ''} ${isHovered && !hideEditorUI ? 'ring-1 ring-gray-300' : ''} ${isMultiSelected(nodeId) ? 'ring-2 ring-purple-500 multi-selected-element' : ''} ${className || ''}`}
      ref={cardRef}
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
      onClick={(e) => {
        if (!hideEditorUI) {
          if (e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            e.preventDefault();
            console.log('🎯 Ctrl+click detected on:', nodeId);
            // Toggle selection - works even if no previous selection
            if (isMultiSelected(nodeId)) {
              removeFromSelection(nodeId);
            } else {
              addToSelection(nodeId);
            }
          }
          // For regular clicks, let the global handler manage clearing/selecting
        }
      }}
      onContextMenu={hideEditorUI ? undefined : handleContextMenu}
    >
      {/* Portal controls rendered outside this container to avoid overflow clipping (hide in preview mode) */}
      {isSelected && !hideEditorUI && (
        <PortalControls
          boxPosition={boxPosition}
          dragRef={dragRef}
          handleResizeStart={handleResizeStart}
          nodeId={nodeId}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />
      )}
      {children}
      
      {/* Context Menu - hide in preview mode */}
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

// Portal Controls Component - renders outside of the Box to avoid overflow clipping
const PortalControls = ({ 
  boxPosition, 
  dragRef, 
  handleResizeStart,
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
          pointerEvents: 'auto', // Re-enable pointer events for this element
          zIndex: 10000
        }}
      >
        {/* Left half - MOVE (Craft.js drag) - Now interactive */}
        <div
          ref={dragRef}
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
        
        {/* Right half - POS (Custom position drag with snapping) */}
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
          onDragStart={(e) => {
            setIsDragging(true);
          }}
          onDragMove={(e, { x, y, snapped }) => {
            // Optional: Add visual feedback for snapping
            console.log(`Element moved to ${x}, ${y}, snapped: ${snapped}`);
          }}
          onDragEnd={(e) => {
            setIsDragging(false);
          }}
        >
          ↕↔ POS
        </SnapPositionHandle>
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
FlexBox.craft = {
  displayName: "FlexBox",
  props: {
    // Canvas property for containers
    canvas: true,
    
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
    padding: '0',
    
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
    canDrop: (node, parent) => true,
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
      
      // Flexbox Container Properties
      'flexDirection', 'flexWrap', 'justifyContent', 'alignItems', 'alignContent',
      'gap', 'rowGap', 'columnGap',
      
      // Flexbox Item Properties
      'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'order',
      
      // Colors & Backgrounds
      'color', 'backgroundColor', 'background', 'backgroundImage', 'backgroundSize',
      'backgroundRepeat', 'backgroundPosition', 'backgroundAttachment', 'backgroundClip', 'backgroundOrigin',
      
      // Effects
      'boxShadow', 'opacity', 'transform',
      
      // HTML Attributes
      'id', 'className', 'title', 'hidden', 'tabIndex', 'accessKey',
      'contentEditable', 'draggable', 'spellCheck', 'translate', 'dir', 'lang',
      'role', 'ariaLabel', 'ariaDescribedBy', 'ariaLabelledBy', 
    ]
  }
}
};