'use client'

import React, { useRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNode, useEditor } from "@craftjs/core";
import ContextMenu from "../utils/context/ContextMenu";
import { useContextMenu } from "../utils/hooks/useContextMenu";
import useEditorDisplay from "../utils/context/useEditorDisplay";
import { useCraftSnap } from "../utils/craft/useCraftSnap";
import SnapPositionHandle from "../editor/SnapPositionHandle";
import { snapGridSystem } from "../utils/grid/SnapGridSystem";
import { useMultiSelect } from '../utils/context/MultiSelectContext';

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
  const { id: nodeId, connectors: { connect, drag }, actions: { setProp }, selected: isSelected, parent } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
    parent: node.data.parent,
  }));
  const { actions } = useEditor();
  
  // Use snap functionality
  const { connectors: { snapConnect, snapDrag } } = useCraftSnap(nodeId);
  
  // Use multi-selection functionality
  const { addToSelection, addToSelectionWithKeys, removeFromSelection, isSelected: isMultiSelected, isMultiSelecting } = useMultiSelect();
  
  // Use our shared editor display hook
  const { hideEditorUI } = useEditorDisplay();

  const textRef = useRef(null);
  const dragRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  // Track previous parent to detect container changes
  const prevParentRef = useRef(parent);

  // Context menu functionality
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
    if (textRef.current) {
      const rect = textRef.current.getBoundingClientRect();
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
    if (!isEditing) {
      setLocalText(text);
    }
  }, [text, isEditing]);

  useEffect(() => {
    const connectElements = () => {
      if (textRef.current) {
        snapConnect(textRef.current); // Connect for selection with snap functionality
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
      console.log(`📦 Text ${nodeId} moved from parent ${prevParentRef.current} to ${parent} - resetting position`);
      
      // Reset position properties to default
      setProp((props) => {
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
    const rect = textRef.current.getBoundingClientRect();
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

  // Handle text editing functions
  const handleTextChange = (e) => {
    const newText = e.target.textContent || e.target.innerText || '';
    
    // Save cursor position before any changes
    const selection = window.getSelection();
    let cursorPosition = 0;
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      cursorPosition = range.startOffset;
    }
    
    setLocalText(newText);
    
    // Update props without re-rendering the contentEditable
    // This prevents cursor jumping
    requestAnimationFrame(() => {
      setProp(props => {
        props.text = newText;
      });
      
      // Restore cursor position after the update
      if (textRef.current && document.activeElement === textRef.current) {
        const range = document.createRange();
        const selection = window.getSelection();
        
        try {
          const textNode = textRef.current.childNodes[0] || textRef.current;
          const maxLength = textNode.nodeType === Node.TEXT_NODE ? textNode.textContent.length : 0;
          const safePosition = Math.min(cursorPosition, maxLength);
          
          if (textNode.nodeType === Node.TEXT_NODE && maxLength > 0) {
            range.setStart(textNode, safePosition);
          } else {
            range.setStart(textRef.current, 0);
          }
          
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (error) {
          console.log('Cursor position restoration failed:', error);
        }
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      setIsEditing(false);
      setProp(props => {
        props.text = localText;
      });
      textRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setLocalText(text);
      textRef.current?.blur();
    }
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hideEditorUI && !isEditing) {
      setIsEditing(true);
      setLocalText(text);
      // Focus after a short delay
      setTimeout(() => {
        if (textRef.current) {
          textRef.current.focus();
          // Place cursor at the end
          const range = document.createRange();
          const selection = window.getSelection();
          if (textRef.current.childNodes.length > 0) {
            range.setStart(textRef.current.childNodes[0], textRef.current.textContent.length);
          } else {
            range.setStart(textRef.current, 0);
          }
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }, 50);
    }
  };

  const handleEditClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
    setLocalText(text);
    // Focus the text element after state update
    setTimeout(() => {
      if (textRef.current) {
        textRef.current.focus();
        // Place cursor at the end of the text
        const range = document.createRange();
        const selection = window.getSelection();
        if (textRef.current.childNodes.length > 0) {
          range.setStart(textRef.current.childNodes[0], textRef.current.textContent.length);
        } else {
          range.setStart(textRef.current, 0);
        }
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }, 50);
  };

  const handleBlur = (e) => {
    // Don't exit edit mode if clicking on font controls or related elements
    const relatedTarget = e.relatedTarget;
    if (relatedTarget) {
      // Check if the related target is a font control element
      const isControlElement = relatedTarget.tagName === 'BUTTON' || 
                              relatedTarget.tagName === 'SELECT' || 
                              relatedTarget.tagName === 'INPUT' ||
                              relatedTarget.type === 'color' ||
                              relatedTarget.closest('[data-font-controls]');
      
      if (isControlElement) {
        // Keep focus on the text element
        setTimeout(() => {
          if (textRef.current) {
            textRef.current.focus();
          }
        }, 0);
        return;
      }
    }
    
    // Exit editing mode
    setIsEditing(false);
    setProp(props => {
      props.text = localText;
    });
  };

  // Add global click handler to exit edit mode when clicking outside
  useEffect(() => {
    if (!isEditing) return;

    const handleGlobalClick = (e) => {
      // Check if click is inside the text element or font controls
      if (!textRef.current) return;
      
      const isInsideText = textRef.current.contains(e.target);
      const isInsideControls = e.target.closest('[data-font-controls]') || 
                              e.target.tagName === 'BUTTON' ||
                              e.target.tagName === 'SELECT' ||
                              e.target.tagName === 'INPUT';
      
      if (!isInsideText && !isInsideControls) {
        setIsEditing(false);
        setProp(props => {
          props.text = localText;
        });
      }
    };

    // Add listener with a slight delay to avoid immediate closing
    const timer = setTimeout(() => {
      document.addEventListener('click', handleGlobalClick, true);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [isEditing, localText, setProp]);

  // Handle data attributes
  const dataAttrs = {};
  Object.entries(dataAttributes).forEach(([key, value]) => {
    dataAttrs[`data-${key}`] = value;
  });
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

  return (
    <div
      className={`${isSelected && !hideEditorUI ? 'ring-2 ring-blue-500' : ''} ${isHovered && !hideEditorUI ? 'ring-1 ring-gray-300' : ''} ${isMultiSelected(nodeId) ? 'ring-2 ring-purple-500 multi-selected-element' : ''} ${className || ''}`}
      ref={textRef}
      style={{
        ...computedStyles,
        position: 'relative',
        cursor: isEditing ? 'text' : 'default'
      }}
      id={id}
      title={title}
      role={role}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-labelledby={ariaLabelledBy}
      tabIndex={tabIndex}
      accessKey={accessKey}
      draggable={false}
      spellCheck={spellCheck}
      translate={translate ? 'yes' : 'no'}
      dir={dir}
      lang={lang}
      hidden={hidden}
      onDoubleClick={hideEditorUI ? undefined : handleDoubleClick}
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
      onMouseEnter={hideEditorUI ? undefined : () => {
        setIsHovered(true);
        updateBoxPosition();
      }}
      onMouseLeave={hideEditorUI ? undefined : () => setIsHovered(false)}
      onContextMenu={hideEditorUI ? undefined : handleContextMenu}
      {...dataAttrs}
      {...(disabled && { disabled: true })}
      {...(required && { required: true })}
      {...(readonly && { readonly: true })}
      {...(multiple && { multiple: true })}
      {...(checked && { checked: true })}
      {...(selected && { selected: true })}
    >
      {/* Portal controls rendered outside this container to avoid overflow clipping (hide in preview mode) */}
      {isSelected && !isEditing && !hideEditorUI && (
        <PortalControls
          boxPosition={boxPosition}
          dragRef={dragRef}
          handleResizeStart={handleResizeStart}
          handleEditClick={handleEditClick}
          nodeId={nodeId}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
        />
      )}
      
      {/* Text content - editable span */}
      {isEditing ? (
        <span
          ref={textRef}
          contentEditable={true}
          onBlur={handleBlur}
          onInput={handleTextChange}
          onKeyDown={handleKeyDown}
          style={{
            outline: 'none',
            display: 'block',
            width: '100%',
            minHeight: '1em',
            border: '2px dashed #722ed1',
            padding: '4px',
            background: 'rgba(114, 46, 209, 0.05)',
            borderRadius: '4px'
          }}
          suppressContentEditableWarning={true}
        >
          {localText}
        </span>
      ) : (
        <span
          style={{
            display: 'block',
            width: '100%',
            minHeight: '1em'
          }}
        >
          {text}
        </span>
      )}
      {/* Enhanced editing controls */}
      {isEditing && (
        <div style={{
          position: 'absolute',
          top: -120,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2147483647,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '500px',
          minWidth: '500px'
        }}>
          {/* Top row - Exit button and status */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            minWidth: '480px'
          }}>
            <div style={{
              fontSize: '11px',
              background: 'linear-gradient(135deg, #722ed1, #9254de)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(114, 46, 209, 0.3)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              ✏️ EDITING MODE
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsEditing(false);
                setProp(props => {
                  props.text = localText;
                });
              }}
              onMouseDown={(e) => e.preventDefault()}
              style={{
                fontSize: '11px',
                background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(255, 77, 79, 0.3)',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              EXIT
            </button>
          </div>

          {/* Font controls row */}
          <div 
            data-font-controls="true"
            style={{
              display: 'flex',
              gap: '8px',
              background: 'rgba(255, 255, 255, 0.98)',
              padding: '12px',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(16px)',
              alignItems: 'center',
              width: '100%',
              minWidth: '480px'
            }}
            onMouseDown={(e) => e.preventDefault()} // Prevent blur on mouse down
            onClick={(e) => e.stopPropagation()} // Prevent event bubbling
          >
            {/* Font Family */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '9px', color: '#666', fontWeight: '500' }}>FONT</label>
              <select
                value={fontFamily}
                onChange={(e) => setProp(props => props.fontFamily = e.target.value)}
                onMouseDown={(e) => e.preventDefault()}
                onFocus={(e) => e.preventDefault()}
                style={{
                  fontSize: '11px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  background: 'white',
                  cursor: 'pointer',
                  minWidth: '110px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.borderColor = '#722ed1'}
                onMouseLeave={(e) => e.target.style.borderColor = '#e0e0e0'}
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="Helvetica, sans-serif">Helvetica</option>
                <option value="Times New Roman, serif">Times</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Verdana, sans-serif">Verdana</option>
                <option value="Courier New, monospace">Courier</option>
                <option value="Impact, sans-serif">Impact</option>
                <option value="Comic Sans MS, cursive">Comic Sans</option>
              </select>
            </div>

            {/* Font Size */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '9px', color: '#666', fontWeight: '500' }}>SIZE</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  value={parseInt(fontSize) || 16}
                  onChange={(e) => setProp(props => props.fontSize = `${e.target.value}px`)}
                  onMouseDown={(e) => e.preventDefault()}
                  onFocus={(e) => e.preventDefault()}
                  style={{
                    fontSize: '11px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    background: 'white',
                    width: '50px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease'
                  }}
                  min="8"
                  max="72"
                  onMouseEnter={(e) => e.target.style.borderColor = '#722ed1'}
                  onMouseLeave={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
                <span style={{ fontSize: '10px', color: '#999' }}>px</span>
              </div>
            </div>

            {/* Font Color */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '9px', color: '#666', fontWeight: '500' }}>COLOR</label>
              <div style={{ 
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setProp(props => props.color = e.target.value)}
                  onMouseDown={(e) => e.preventDefault()}
                  onFocus={(e) => e.preventDefault()}
                  style={{
                    width: '40px',
                    height: '32px',
                    border: 'none',
                    cursor: 'pointer',
                    background: 'none'
                  }}
                />
              </div>
            </div>

            {/* Style buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '9px', color: '#666', fontWeight: '500' }}>STYLE</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setProp(props => 
                      props.fontWeight = props.fontWeight === 'bold' ? 'normal' : 'bold'
                    );
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  style={{
                    fontSize: '12px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    background: fontWeight === 'bold' ? 'linear-gradient(135deg, #722ed1, #9254de)' : 'white',
                    color: fontWeight === 'bold' ? 'white' : '#000',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease',
                    minWidth: '32px'
                  }}
                  onMouseEnter={(e) => {
                    if (fontWeight !== 'bold') {
                      e.target.style.borderColor = '#722ed1';
                      e.target.style.background = '#f9f9f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (fontWeight !== 'bold') {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.background = 'white';
                    }
                  }}
                >
                  B
                </button>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setProp(props => 
                      props.fontStyle = props.fontStyle === 'italic' ? 'normal' : 'italic'
                    );
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  style={{
                    fontSize: '12px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    background: fontStyle === 'italic' ? 'linear-gradient(135deg, #722ed1, #9254de)' : 'white',
                    color: fontStyle === 'italic' ? 'white' : '#000',
                    cursor: 'pointer',
                    fontStyle: 'italic',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease',
                    minWidth: '32px'
                  }}
                  onMouseEnter={(e) => {
                    if (fontStyle !== 'italic') {
                      e.target.style.borderColor = '#722ed1';
                      e.target.style.background = '#f9f9f9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (fontStyle !== 'italic') {
                      e.target.style.borderColor = '#e0e0e0';
                      e.target.style.background = 'white';
                    }
                  }}
                >
                  I
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      
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

// Portal Controls Component - renders outside of the Text to avoid overflow clipping
const PortalControls = ({ 
  boxPosition, 
  dragRef, 
  handleResizeStart,
  nodeId,
  isDragging,
  setIsDragging,
  handleEditClick
}) => {
  if (typeof window === 'undefined') return null; // SSR check
  
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none', // Allow clicks to pass through
        zIndex: 2147483646
      }}
    >
      {/* Combined three-section pill-shaped controls: MOVE | EDIT | POS */}
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
          zIndex: 10000000
        }}
      >
        {/* Left section - MOVE (Craft.js drag) */}
        <div
          ref={dragRef}
          style={{
            background: '#52c41a',
            color: 'white',
            padding: '4px 8px',
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
        
        {/* Middle section - EDIT */}
        <div
          style={{
            background: '#722ed1',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '48px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleEditClick(e);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          title="Edit text content"
        >
          ✏️ EDIT
        </div>
        
        {/* Right section - POS (Custom position drag with snapping) */}
        <SnapPositionHandle
          nodeId={nodeId}
          style={{
            background: '#1890ff',
            color: 'white',
            padding: '4px 8px',
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

// Define all supported props for the Text component
Text.craft = {
  displayName: "Text",
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
    canDrop: () => true, 
    canMoveIn: () => false,
    canMoveOut: () => true, 
  },
  custom: {
    styleMenu: {
      supportedProps: [
        // Essential Text Properties
        "text",
        
        // Basic Typography
        "fontSize",
        "fontFamily", 
        "fontWeight",
        "color",
        "textAlign",
        
        // Size & Position
        "width",
        "height",
        "padding",
        "margin",
        
        // Background & Border
        "backgroundColor",
        "border",
        "borderRadius",
        
        // Basic Layout
        "display",
        
        // Visual Effects
        "opacity",
        "boxShadow",
        "transform"
      ] // Empty array means show ALL properties
    }
  }
};