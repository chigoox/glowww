'use client'

import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNode, useEditor } from "@craftjs/core";
import ContextMenu from "../../utils/context/ContextMenu";
import useEditorDisplay from "../../utils/context/useEditorDisplay";
import { useCraftSnap } from "../../utils/craft/useCraftSnap";
import SnapPositionHandle from "../../editor/SnapPositionHandle";
import { snapGridSystem } from "../../utils/grid/SnapGridSystem";
import { useMultiSelect } from '../../utils/context/MultiSelectContext';
import ResizeHandles from "../support/ResizeHandles";
import PortalControls from "../support/PortalControls";

export const FlexBox = ({
  
  // Layout & Position
  width = "200px",
  height = "200px",
  minWidth = "200px",
  maxWidth,
  minHeight = "200px",
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
  
  // Stroke properties
  stroke = "none",
  strokeColor = "#000000",
  
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
  filter = "none",
  
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

  // DEBUG: Test if programmatic move works and test container switching
  useEffect(() => {
    if (typeof window !== 'undefined' && nodeId) {
      window.testCraftMove = (fromNodeId, toNodeId) => {
        try {
          console.log(`Testing programmatic move: ${fromNodeId} -> ${toNodeId}`);
          editorActions.move(fromNodeId, toNodeId, 0);
          console.log('✅ Programmatic move successful');
          return true;
        } catch (error) {
          console.error('❌ Programmatic move failed:', error);
          return false;
        }
      };

      // Test container switching functionality with improved diagnostics
      window.testContainerSwitching = () => {
        try {
          const nodes = query.getNodes();
          console.log('🔍 Available nodes:', Object.keys(nodes));
          
          // Find all FlexBox containers - use only Craft.js isCanvas() method
          const containers = Object.entries(nodes).filter(([id, node]) => {
            const isBox = node.data.displayName === 'FlexBox';
            const canAcceptDrops = query.node(id).isCanvas();
            
            console.log(`📦 Checking node ${id} (${node.data.displayName}):`, {
              isBox,
              canAcceptDrops,
              hasRules: !!query.node(id).rules,
              canDrop: query.node(id).rules?.canDrop?.() || false,
              canMoveIn: query.node(id).rules?.canMoveIn?.() || false,
            });
            return isBox && canAcceptDrops;
          });
          console.log('📦 Canvas-enabled containers:', containers.map(([id, node]) => id));
          
          // Find all draggable elements (exclude ROOT and containers)
          const elements = Object.entries(nodes).filter(([id, node]) => {
            const isNotRoot = node.data.displayName !== 'Root' && id !== 'ROOT';
            const isNotCanvas = !query.node(id).isCanvas();
            const canBeDragged = query.node(id).rules?.canDrag?.() || false;
            
            return isNotRoot && isNotCanvas && canBeDragged;
          });
          console.log('🔧 Draggable elements:', elements.map(([id, node]) => ({ id, name: node.data.displayName })));
          
          // Additional diagnostics: Check connector status
          window.testConnectors = () => {
            elements.forEach(([id, node]) => {
              const domElement = node.dom;
              if (domElement) {
                console.log(`🔗 Connector status for ${id}:`, {
                  hasDom: !!domElement,
                  hasDataCraftNodeId: domElement.getAttribute('data-craft-node-id'),
                  craftDataAttribute: domElement.getAttribute('data-craft'),
                  classList: Array.from(domElement.classList || [])
                });
              }
            });
          };
          
          if (containers.length >= 2 && elements.length >= 1) {
            const [elementId] = elements[0];
            const [containerId] = containers[1]; // Move to second container
            
            console.log(`🚚 Testing container switch: moving ${elementId} (${nodes[elementId].data.displayName}) to ${containerId} (${nodes[containerId].data.displayName})`);
            editorActions.move(elementId, containerId, 0);
            console.log('✅ Container switching test successful');
            return true;
          } else {
            console.log('❌ Not enough canvas containers or draggable elements for testing', {
              containers: containers.length,
              elements: elements.length
            });
            return false;
          }
        } catch (error) {
          console.error('❌ Container switching test failed:', error);
          return false;
        }
      };
    }
  }, [nodeId, editorActions, query]);

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

  // Function to update FlexBox position for portal positioning
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
        drag(dragRef.current); // Connect to standard Craft.js drag
      }
    };

    // Always attempt to connect elements
    connectElements();
    
    // Also reconnect when the component is selected or when nodeId changes
    const timer = setTimeout(() => {
      connectElements();
      // Reduce logging frequency for connector re-establishment
      if (Math.random() < 0.1) { // Only log 10% of the time
        console.log('🔗 Connectors re-established for node:', nodeId);
      }
    }, 100); // Give DOM time to settle
    
    return () => clearTimeout(timer);
  }, [snapConnect, drag, isSelected, nodeId]); // Back to standard Craft.js drag

  // Detect parent changes and reset position properties
  useEffect(() => {
    // Skip the initial render (when prevParentRef.current is first set)
    if (prevParentRef.current !== null && prevParentRef.current !== parent) {
      // Parent has changed - element was moved to a different container
      console.log(`📦 Element ${nodeId} moved from parent ${prevParentRef.current} to ${parent} - checking if position reset is needed`);
      
      // Wait longer than the centered drag positioning (600ms) before resetting
      // This allows useCenteredContainerDrag to apply its centered positioning first
      setTimeout(() => {
        // Check if position was already set by centered drag (absolute position with left/top set)
        const currentNode = query.node(nodeId);
        if (currentNode) {
          const currentProps = currentNode.get().data.props;
          const hasPositioning = currentProps.position === 'absolute' && 
                                (currentProps.left !== undefined || currentProps.top !== undefined);
          
          if (hasPositioning) {
            console.log('🎯 Position already set by centered drag system, skipping reset');
            return; // Don't reset if centered positioning was applied
          }
        }
        
        // Reset position properties to default only if no positioning was applied
        editorActions.history.throttle(500).setProp(nodeId, (props) => {
          // Only reset if position properties were actually set
          if (props.top !== undefined || props.left !== undefined || 
              props.right !== undefined || props.bottom !== undefined) {
            console.log('🔄 Resetting position properties after container move (no centered positioning detected)');
            props.top = undefined;
            props.left = undefined;
            props.right = undefined;
            props.bottom = undefined;
            // Keep position as relative for normal flow
            props.position = "relative";
          }
        });
      }, 700); // Wait 700ms to ensure centered drag positioning (600ms) completes first
    }
    
    // Update the ref for next comparison
    prevParentRef.current = parent;
  }, [parent, nodeId, setProp, query, editorActions]);

  // Update FlexBox position when selected or hovered changes
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

  // Local resize handler removed; using centralized ResizeHandles logic

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
    
    // Stroke properties (using -webkit-text-stroke for text stroke effects or outline for general stroke)
    WebkitTextStroke: stroke !== "none" ? `${processValue(stroke, 'stroke')} ${strokeColor}` : undefined,
    outline: stroke !== "none" ? `${processValue(stroke, 'stroke')} solid ${strokeColor}` : undefined,
    
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
    filter: filter !== "none" ? filter : undefined,
  };


  // Remove undefined values, but preserve important properties that should always be applied
  const importantProperties = ['overflow', 'overflowX', 'overflowY', 'display', 'position', 'visibility'];
  Object.keys(computedStyles).forEach(key => {
    if (computedStyles[key] === undefined && !importantProperties.includes(key)) {
      delete computedStyles[key];
    }
  });

  // Safe min dimension parsing (prevents explicit 0 being coerced to fallback)
  const parseNonNegativeInt = (val) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return undefined; // caller provides fallback
  };
  const safeMinWidth = parseNonNegativeInt(minWidth) ?? 50;  // 50px fallback
  const safeMinHeight = parseNonNegativeInt(minHeight) ?? 20; // 20px fallback

  return (
    <div
  className={`gl-canvas ${isSelected && !hideEditorUI ? 'ring-2 ring-blue-500' : ''} ${isHovered && !hideEditorUI ? 'ring-1 ring-gray-300' : ''} ${isMultiSelected(nodeId) ? 'ring-2 ring-purple-500 multi-selected-element' : ''} ${className || ''}`}
  data-gl-canvas="true"
  data-component="FlexBox"
      ref={cardRef}
      style={{
        ...computedStyles,
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
        <>
          <PortalControls
            boxPosition={boxPosition}
            dragRef={dragRef}
            nodeId={nodeId}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            updateBoxPosition={updateBoxPosition}

            targetRef={cardRef}
            editorActions={editorActions}
            craftQuery={query}
            minWidth={safeMinWidth}
            minHeight={safeMinHeight}
            onResize={updateBoxPosition}
            onResizeEnd={updateBoxPosition}
          />
          
        </>
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



// Define default props for Craft.js - these will be the initial values
FlexBox.craft = {
  displayName: "FlexBox",
  // Canvas property for containers - MUST BE AT ROOT LEVEL FOR CRAFT.JS
  canvas: true,
  props: {
    // Layout & Position
    width: "200px",
    height: "200px",
    minHeight: "200px",
    minWidth: "200px",
    display: "flex",
    position: "relative",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
    
    // Stroke
    stroke: "none",
    strokeColor: "#000000",
    
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