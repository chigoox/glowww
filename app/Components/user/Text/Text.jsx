'use client'

import { useEditor, useNode } from "@craftjs/core";
import { useEffect, useRef, useState, useCallback } from "react";
import ContextMenu from "../../utils/context/ContextMenu";
import { useMultiSelect } from '../../utils/context/MultiSelectContext';
import useEditorDisplay from "../../utils/context/useEditorDisplay";
import { useCraftSnap } from "../../utils/craft/useCraftSnap";
import PortalControls from "../support/PortalControls";
import { useUserProps } from '../../utils/userprops/useUserProps';
import BindSelector from '../support/BindSelector';

export const Text = ({
  // Content
  text = "Edit this text",
  
  // Layout & Position
  width = "16rem",
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
  // Border defaults and individual sides
  border = "none",
  borderWidth,
  borderStyle = "solid",
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
  // Glyph stroke (text border)
  textStrokeEnabled = false,
  textStrokeWidth = 0,
  textStrokeColor = '#000000',
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
  dataAttributes = {},
  // Binding (optional)
  textBindingPath = '',
  textBindingScope = 'local'
}) => {
  const { id: nodeId, connectors: { connect, drag }, actions: { setProp }, selected: isSelected, parent, userPropsWatcherSnapshot } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
    parent: node.data.parent,
    userPropsWatcherSnapshot: node.data.props.userPropsWatcherSnapshot
  }));
  const { actions: editorActions, query } = useEditor();
  // User props API (must be after nodeId available)
  const userPropsApi = useUserProps(nodeId);
  const { globalVersion } = userPropsApi || {}; // trigger reads on global store updates
  const userPropsApiRef = useRef(userPropsApi); // stable ref
  useEffect(() => { userPropsApiRef.current = userPropsApi; }, [userPropsApi]);
  
  // Use snap functionality
  const { connectors: { snapConnect, snapDrag } } = useCraftSnap(nodeId);
  
  // Use multi-selection functionality
  const { addToSelection, addToSelectionWithKeys, removeFromSelection, isSelected: isMultiSelected, isMultiSelecting } = useMultiSelect();
  
  // Use our shared editor display hook
  const { hideEditorUI } = useEditorDisplay();

  // Outer wrapper (for measuring & selection) and inner editable paragraph
  const wrapperRef = useRef(null);
  const textRef = useRef(null);
  const dragRef = useRef(null);
  const contentRef = useRef(null);
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // removed border panel state (text-stroke is kept)
  const [localText, setLocalText] = useState(text);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [textShadowPreset, setTextShadowPreset] = useState('none');
  const [textShadowBlur, setTextShadowBlur] = useState(2);
  const [textShadowColor, setTextShadowColor] = useState(textShadow || '#000000');
  const [boxShadowPreset, setBoxShadowPreset] = useState('none');
  const [boxShadowBlur, setBoxShadowBlur] = useState(8);
  // Offsets and colors for shadows
  const [textShadowOffsetX, setTextShadowOffsetX] = useState(0);
  const [textShadowOffsetY, setTextShadowOffsetY] = useState(0);
  const [boxShadowOffsetX, setBoxShadowOffsetX] = useState(0);
  const [boxShadowOffsetY, setBoxShadowOffsetY] = useState(0);
  const [boxShadowColor, setBoxShadowColor] = useState('#000000');
  // Which dropdown is currently open ('textShadow' | 'boxShadow' | null)
  const [openDropdown, setOpenDropdown] = useState(null);
  // When bound, watch user prop value and sync component text (one-way source of truth)
  useEffect(() => {
    if (!textBindingPath) return;
    try {
      const api = userPropsApiRef.current;
      const scopeNode = textBindingScope === 'global' ? 'ROOT' : nodeId;
  let val = api.getValueAtPath(textBindingPath, scopeNode);
      // If global scope and no local alias yet (undefined), attempt direct global lookup
      if (textBindingScope === 'global' && (val === undefined || val === null)) {
        if (api.getGlobalValue) {
          const gv = api.getGlobalValue(textBindingPath);
    // Coerce primitives to string for Text rendering
    if (gv !== undefined && gv !== null) val = String(gv);
        }
      }
  if (val !== undefined && val !== null && String(val) !== text) {
    const s = String(val);
    setProp(p => { p.text = s; });
    if (!isEditing) setLocalText(s);
      }
    } catch {/* ignore */}
  }, [textBindingPath, textBindingScope, nodeId, isEditing, text, userPropsWatcherSnapshot, globalVersion, setProp]);

  // When editing a bound text, push edits back to user prop path (live)
  useEffect(() => {
    if (!isEditing) return;
    if (!textBindingPath) return;
    const handle = setTimeout(() => {
      try {
        const api = userPropsApiRef.current;
        if (textBindingScope === 'global' && api.createGlobalPrimitive) {
          // Write-through to global store when bound globally
          api.createGlobalPrimitive(textBindingPath, 'string', localText);
        } else {
          const scopeNode = nodeId; // always write to this node's local tree otherwise
          api.setPrimitiveSmartAtPath(textBindingPath, localText, { respectExistingType: true }, scopeNode);
        }
      } catch {/* ignore */}
    }, 150); // debounce
    return () => clearTimeout(handle);
  }, [localText, isEditing, textBindingPath, textBindingScope, nodeId]);
  // Safe numeric min constraints (respect explicit 0 instead of falsy fallback)
  const safeMinWidth = (() => {
    if (typeof minWidth === 'number') return minWidth;
    const parsed = Number.parseInt(minWidth, 10);
    return Number.isFinite(parsed) ? parsed : 50;
  })();
  const safeMinHeight = (() => {
    if (typeof minHeight === 'number') return minHeight;
    const parsed = Number.parseInt(minHeight, 10);
    return Number.isFinite(parsed) ? parsed : 20;
  })();

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
  const updateBoxPosition = useCallback(() => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setBoxPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
    }
  }, []);

  // Helper to apply live style updates to the actual text element (span/p)
  const applyToContent = (fn) => {
    try {
      const el = contentRef.current || (textRef.current && textRef.current.querySelector && textRef.current.querySelector('p')) || textRef.current;
      if (el) fn(el);
    } catch (err) {
      // ignore
    }
  };

  // Generate a multi-layer text-shadow to approximate a stroke for non-webkit browsers
  const generateStrokeTextShadow = (width = 1, color = '#000000') => {
    // Limit width for performance
    const w = Math.min(6, Math.max(0, Math.round(width)));
    if (w === 0) return '';
    const steps = [];
    // create offsets around the glyph (8 directions) for each radius step
    for (let r = 1; r <= w; r++) {
      const offsets = [
        `${-r}px ${-r}px 0 ${color}`,
        `${-r}px 0px 0 ${color}`,
        `${-r}px ${r}px 0 ${color}`,
        `0px ${-r}px 0 ${color}`,
        `0px ${r}px 0 ${color}`,
        `${r}px ${-r}px 0 ${color}`,
        `${r}px 0px 0 ${color}`,
        `${r}px ${r}px 0 ${color}`
      ];
      steps.push(...offsets);
    }
    return steps.join(', ');
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  // initialize shadow presets from props
  useEffect(() => {
    if (textShadow && textShadow !== '') {
      setTextShadowPreset('soft');
      // try to parse a blur value
      const m = textShadow.match(/\s(\d+)px\s(\d+)px/);
      if (m) setTextShadowBlur(Number(m[2]));
    }
    if (boxShadow && boxShadow !== 'none') {
      setBoxShadowPreset('soft');
      const m = boxShadow.match(/\s(\d+)px\s(\d+)px/);
      if (m) setBoxShadowBlur(Number(m[2]));
    }
  }, []);

  // Apply stroke and derived styles to content on mount / prop change
  useEffect(() => {
    if (!contentRef.current) return;
    applyToContent((el) => {
      try {
        if (textStrokeEnabled) {
          // apply webkit stroke when available
          el.style.webkitTextStroke = `${textStrokeWidth}px ${textStrokeColor}`;
          // also apply a text-shadow fallback for browsers without -webkit-text-stroke
          const fallback = generateStrokeTextShadow(textStrokeWidth, textStrokeColor);
          // merge with any existing textShadow property (preserve drop shadow)
          const originalShadow = textShadow || '';
          el.style.textShadow = [fallback, originalShadow].filter(Boolean).join(', ');
        } else {
          el.style.webkitTextStroke = '';
          el.style.textShadow = textShadow || '';
        }
      } catch (err) {}
    });
  }, [textStrokeEnabled, textStrokeWidth, textStrokeColor, textShadow]);

  useEffect(() => {
    if (!isEditing) {
      setLocalText(text);
    }
  }, [text, isEditing]);

  // Close any open dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!isEditing || !openDropdown) return;
    const handleClick = (e) => {
      const inside = e.target.closest && e.target.closest('[data-font-controls]');
      if (!inside) setOpenDropdown(null);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setOpenDropdown(null); };
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKey, true);
    };
  }, [isEditing, openDropdown]);

  useEffect(() => {
    const connectElements = () => {
      if (wrapperRef.current) {
        snapConnect(wrapperRef.current); // selection & snap registration
      }
      if (dragRef.current) {
        // Use core Craft drag for container moves (like Box/FlexBox) instead of snapDrag
        drag(dragRef.current);
      }
    };

    connectElements();
    if (isSelected) {
      const timer = setTimeout(connectElements, 10);
      return () => clearTimeout(timer);
    }
  }, [snapConnect, drag, isSelected]);

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
    // Delay exit to let the clicked control receive focus first.
    // If the newly focused element is inside our font controls, keep editing open.
    setTimeout(() => {
      const active = document.activeElement;
      const isControlElement = active && (active.tagName === 'BUTTON' || active.tagName === 'SELECT' || active.tagName === 'INPUT' || (active.type === 'color'));
      const isInsideControls = active && active.closest && active.closest('[data-font-controls]');
      if (isControlElement || isInsideControls) {
        // keep editing open
        return;
      }

      // Otherwise commit and exit edit mode
      setIsEditing(false);
      setProp(props => {
        props.text = localText;
      });
    }, 0);
  };

  // Add global click handler to exit edit mode when clicking outside
  useEffect(() => {
    if (!isEditing) return;

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsEditing(false);
        setProp(props => { props.text = localText; });
      }
    };

    const handleGlobalClick = (e) => {
      // Check if click is inside the text element or font controls
  if (!wrapperRef.current) return;

  const isInsideText = wrapperRef.current.contains(e.target);
      const isInsideControls = e.target.closest && (e.target.closest('[data-font-controls]') ||
                              e.target.tagName === 'BUTTON' ||
                              e.target.tagName === 'SELECT' ||
                              e.target.tagName === 'INPUT');

      if (!isInsideText && !isInsideControls) {
        setIsEditing(false);
        setProp(props => { props.text = localText; });
      }
    };

    // Add listeners with a slight delay to avoid immediate closing when opening controls
    const timer = setTimeout(() => {
      document.addEventListener('click', handleGlobalClick, true);
      document.addEventListener('keydown', handleEsc, true);
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleGlobalClick, true);
      document.removeEventListener('keydown', handleEsc, true);
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
    
  // Typography (moved to inner content span to avoid leaking into editor UI)
  fontVariant,
  fontStretch,
  lineHeight,
  letterSpacing: processValue(letterSpacing, 'letterSpacing'),
  wordSpacing: processValue(wordSpacing, 'wordSpacing'),
  textAlign,
  textDecoration,
  textTransform,
  textIndent: processValue(textIndent, 'textIndent'),
  verticalAlign,
  whiteSpace,
  wordBreak,
  wordWrap,
    
  // Colors & Backgrounds (color moved to inner content to avoid UI leakage)
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
    
  // Effects & Filters (boxShadow moved to content to avoid affecting toolbar)
  opacity,
  filter: filter || undefined,
  backdropFilter: backdropFilter || undefined,
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

  // Styles to apply specifically to the inner text element so toolbar won't inherit them
  const contentStyles = {
    fontFamily,
    fontSize: processValue(fontSize, 'fontSize'),
    fontWeight,
    fontStyle,
    color,
    textShadow: textShadow || undefined,
    WebkitTextStroke: textStrokeEnabled ? `${textStrokeWidth}px ${textStrokeColor}` : undefined
  };

  return (
    <div
      className={`${isSelected && !hideEditorUI ? 'ring-2 ring-blue-500' : ''} ${isHovered && !hideEditorUI ? 'ring-1 ring-gray-300' : ''} ${isMultiSelected(nodeId) ? 'ring-2 ring-purple-500 multi-selected-element' : ''} ${className || ''}`}
      ref={wrapperRef}
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
        
        <div>
          <PortalControls
          boxPosition={boxPosition}
          dragRef={dragRef}
          nodeId={nodeId}
          isDragging={isDragging}
          setIsDragging={setIsDragging}
          updateBoxPosition={updateBoxPosition}

          onEditClick={handleEditClick}
          targetRef={textRef}
          editorActions={editorActions}
          craftQuery={query}
          minWidth={safeMinWidth}
          minHeight={safeMinHeight}
          onResize={updateBoxPosition}
          onResizeEnd={updateBoxPosition}
        />
      
        </div>
      )}
      
      {/* Text content - editable span */}
          {isEditing ? (
        <p
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
          <span ref={contentRef} style={contentStyles}>{localText}</span>
        </p>
      ) : (
  <p
          style={{
            display: 'block',
            width: '100%',
            minHeight: '1em'
          }}
        >
          <span ref={contentRef} style={contentStyles}>{text}</span>
        </p>
      )}
      {/* Enhanced editing controls */}
          {isEditing && (
        <div style={{
          position: 'absolute',
          top: -120,
          left: '25%',
          transform: 'translateX(-50%)',
          zIndex: 2147483647,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: 'min(780px, 100%)',
          minWidth: 240,
          padding: '8px'
        }}>
          {/* Top status row removed to keep the editor popup to a single compact row */}

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
              width: '34rem',
              flexWrap: 'nowrap',
              WebkitOverflowScrolling: 'touch',
              whiteSpace: 'nowrap',
              // Prevent the component-level text styles from leaking into the controls
              color: 'initial',
              fontFamily: 'initial',
              fontSize: '13px'
            }}
            onClick={(e) => e.stopPropagation()} // Prevent event bubbling
          >
            {/* Font Family */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '0 0 auto' }}>
              <label style={{ display: 'none' }}>FONT</label>
                <select
                value={fontFamily}
                onChange={(e) => {
                  const v = e.target.value;
                  // persist to props
                  setProp(props => props.fontFamily = v);
                  // apply live while editing so user sees immediate change
                  if (isEditing) {
                    try { applyToContent(el => el.style.fontFamily = v); } catch (e) {}
                  }
                }}
                
                style={{
                  fontSize: '11px',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  background: 'white',
                  cursor: 'pointer',
                  minWidth: '80px',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '0 0 auto' }}>
              <label style={{ display: 'none' }}>SIZE</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="number"
                  value={parseInt(fontSize) || 16}
                  onChange={(e) => {
                    const v = e.target.value;
                    const px = `${v}px`;
                    setProp(props => props.fontSize = px);
                    if (isEditing) {
                      try { applyToContent(el => el.style.fontSize = px); } catch (e) {}
                    }
                  }}
                  
                  style={{
                    fontSize: '11px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    background: 'white',
                    width: '44px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease'
                  }}
                  min="8"
                  max="72"
                  onMouseEnter={(e) => e.target.style.borderColor = '#722ed1'}
                  onMouseLeave={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
                <span style={{ display: 'none' }}>px</span>
              </div>
            </div>

            {/* Font Color */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '0 0 auto' }}>
              <label style={{ display: 'none' }}>COLOR</label>
              <div style={{ 
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    const v = e.target.value;
                    setProp(props => props.color = v);
                    if (isEditing) {
                      try { applyToContent(el => el.style.color = v); } catch (e) {}
                    }
                  }}
                  
                  style={{
                    width: '28px',
                    height: '24px',
                    border: 'none',
                    cursor: 'pointer',
                    background: 'none'
                  }}
                />
              </div>
            </div>

            {/* Style buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: '0 0 auto' }}>
              <label style={{ display: 'none' }}>STYLE</label>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const newWeight = (fontWeight === 'bold') ? 'normal' : 'bold';
                    setProp(props => props.fontWeight = newWeight);
          if (isEditing) try { applyToContent(el => el.style.fontWeight = newWeight); } catch (e) {}
                  }}
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
                    const newStyle = (fontStyle === 'italic') ? 'normal' : 'italic';
                    setProp(props => props.fontStyle = newStyle);
          if (isEditing) try { applyToContent(el => el.style.fontStyle = newStyle); } catch (e) {}
                  }}
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

            {/* Glyph stroke + compact shadow controls: everything fits on a single row using small buttons + dropdowns */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', flexWrap: 'nowrap' }}>
              {/* Glyph stroke compact */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); const v = !textStrokeEnabled; setProp(props => props.textStrokeEnabled = v); if (isEditing) applyToContent(el => { if (v) { el.style.webkitTextStroke = `${textStrokeWidth}px ${textStrokeColor}`; const fallback = generateStrokeTextShadow(textStrokeWidth, textStrokeColor); const original = textShadow || ''; el.style.textShadow = [fallback, original].filter(Boolean).join(', '); } else { el.style.webkitTextStroke = ''; el.style.textShadow = textShadow || ''; } }); }}
                  aria-pressed={!!textStrokeEnabled}
                  title={textStrokeEnabled ? 'Glyph stroke enabled' : 'Enable glyph stroke'}
                  style={{ width: 34, height: 28, borderRadius: 8, border: textStrokeEnabled ? '1px solid #722ed1' : '1px solid #e0e0e0', background: textStrokeEnabled ? 'linear-gradient(135deg, #722ed1, #9254de)' : 'white', color: textStrokeEnabled ? 'white' : '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >S</button>
                <input
                  type="color"
                  value={textStrokeColor || '#000000'}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { const v = e.target.value; setProp(props => props.textStrokeColor = v); if (isEditing && textStrokeEnabled) applyToContent(el => { el.style.webkitTextStroke = `${textStrokeWidth}px ${v}`; const fallback = generateStrokeTextShadow(textStrokeWidth, v); const original = textShadow || ''; el.style.textShadow = [fallback, original].filter(Boolean).join(', '); }); }}
                  style={{ width: 34, height: 28, border: 'none', padding: 2, cursor: 'pointer' }}
                />
                <input type="range" min={0} max={8} value={parseInt(textStrokeWidth) || 0} onClick={(e) => e.stopPropagation()} onChange={(e) => { const v = Number(e.target.value); setProp(props => props.textStrokeWidth = v); if (isEditing && textStrokeEnabled) applyToContent(el => { el.style.webkitTextStroke = `${v}px ${textStrokeColor}`; const fallback = generateStrokeTextShadow(v, textStrokeColor); const original = textShadow || ''; el.style.textShadow = [fallback, original].filter(Boolean).join(', '); }); }} style={{ width: 64 }} />
              </div>

              {/* Text shadow compact popover (controlled) */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'textShadow' ? null : 'textShadow'); }}
                  aria-expanded={openDropdown === 'textShadow'}
                  title="Text shadow"
                  style={{ listStyle: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', background: textShadowPreset !== 'none' ? 'linear-gradient(180deg,#fafafa,#f3f3f3)' : 'white', fontSize: 12, minWidth: 40, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', transition: 'all 120ms ease' }}
                >TS</button>
                {openDropdown === 'textShadow' && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '40px', left: 0, zIndex: 100000, background: 'white', padding: 12, borderRadius: 12, boxShadow: '0 12px 40px rgba(15,15,15,0.12)', minWidth: 260, maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTextShadowPreset('none'); setProp(p => p.textShadow = ''); if (isEditing) applyToContent(el => el.style.textShadow = ''); }} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', background: textShadowPreset === 'none' ? '#fbfbfb' : 'white', cursor: 'pointer', minWidth: 64 }}>None</button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTextShadowPreset('soft'); const v = `0px ${textShadowOffsetY}px ${textShadowBlur}px ${textShadowColor}`; setProp(p => p.textShadow = v); if (isEditing) applyToContent(el => el.style.textShadow = v); }} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', background: textShadowPreset === 'soft' ? '#fbfbfb' : 'white', cursor: 'pointer', minWidth: 64 }}>Soft</button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTextShadowPreset('heavy'); const v = `1px ${textShadowOffsetY}px ${Math.round(textShadowBlur * 1.5)}px ${textShadowColor}`; setProp(p => p.textShadow = v); if (isEditing) applyToContent(el => el.style.textShadow = v); }} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', background: textShadowPreset === 'heavy' ? '#fbfbfb' : 'white', cursor: 'pointer', minWidth: 64 }}>Heavy</button>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <label style={{ display: 'none' }}>Offset X</label>
                      <input type="range" min={-12} max={12} value={textShadowOffsetX} onChange={(e) => { const v = Number(e.target.value); setTextShadowOffsetX(v); const style = textShadowPreset === 'heavy' ? `1px ${textShadowOffsetY}px ${Math.round(textShadowBlur * 1.5)}px ${textShadowColor}` : `0px ${textShadowOffsetY}px ${textShadowBlur}px ${textShadowColor}`; setProp(p => p.textShadow = style); if (isEditing) applyToContent(el => el.style.textShadow = style); }} style={{ width: 140 }} />
                      <label style={{ display: 'none' }}>Offset Y</label>
                      <input type="range" min={-12} max={12} value={textShadowOffsetY} onChange={(e) => { const v = Number(e.target.value); setTextShadowOffsetY(v); const style = textShadowPreset === 'heavy' ? `1px ${v}px ${Math.round(textShadowBlur * 1.5)}px ${textShadowColor}` : `0px ${v}px ${textShadowBlur}px ${textShadowColor}`; setProp(p => p.textShadow = style); if (isEditing) applyToContent(el => el.style.textShadow = style); }} style={{ width: 140 }} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <label style={{ fontSize: 12, color: '#333' }}>Blur</label>
                        <input type="range" min={0} max={24} value={textShadowBlur} onChange={(e) => { const v = Number(e.target.value); setTextShadowBlur(v); const style = textShadowPreset === 'heavy' ? `1px ${textShadowOffsetY}px ${Math.round(v * 1.5)}px ${textShadowColor}` : `0px ${textShadowOffsetY}px ${v}px ${textShadowColor}`; setProp(p => p.textShadow = style); if (isEditing) applyToContent(el => el.style.textShadow = style); }} style={{ width: 160 }} />
                      </div>
                      <input type="color" value={textShadowColor} onChange={(e) => { const v = e.target.value; setTextShadowColor(v); const style = textShadowPreset === 'heavy' ? `1px ${textShadowOffsetY}px ${Math.round(textShadowBlur * 1.5)}px ${v}` : `0px ${textShadowOffsetY}px ${textShadowBlur}px ${v}`; setProp(p => { p.textShadow = style; p.textShadowColor = v; }); if (isEditing) applyToContent(el => el.style.textShadow = style); }} style={{ width: 36, height: 32, border: 'none', padding: 2, cursor: 'pointer', borderRadius: 6 }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Box shadow compact popover (controlled) */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === 'boxShadow' ? null : 'boxShadow'); }}
                  aria-expanded={openDropdown === 'boxShadow'}
                  title="Box shadow"
                  style={{ listStyle: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', background: boxShadowPreset !== 'none' ? 'linear-gradient(180deg,#fafafa,#f3f3f3)' : 'white', fontSize: 12, minWidth: 40, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', transition: 'all 120ms ease' }}
                >BS</button>
                {openDropdown === 'boxShadow' && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: '40px', left: 0, zIndex: 100000, background: 'white', padding: 12, borderRadius: 12, boxShadow: '0 12px 40px rgba(15,15,15,0.12)', minWidth: 260, maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBoxShadowPreset('none'); setProp(p => p.boxShadow = 'none'); if (isEditing) applyToContent(el => el.style.boxShadow = 'none'); }} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', background: boxShadowPreset === 'none' ? '#fbfbfb' : 'white', cursor: 'pointer', minWidth: 64 }}>None</button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBoxShadowPreset('soft'); const v = `${boxShadowOffsetX}px ${boxShadowOffsetY}px ${boxShadowBlur}px ${boxShadowColor}`; setProp(p => p.boxShadow = v); if (isEditing) applyToContent(el => el.style.boxShadow = v); }} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', background: boxShadowPreset === 'soft' ? '#fbfbfb' : 'white', cursor: 'pointer', minWidth: 64 }}>Soft</button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setBoxShadowPreset('deep'); const v = `${boxShadowOffsetX}px ${boxShadowOffsetY}px ${boxShadowBlur * 2}px ${boxShadowColor}`; setProp(p => p.boxShadow = v); if (isEditing) applyToContent(el => el.style.boxShadow = v); }} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.06)', background: boxShadowPreset === 'deep' ? '#fbfbfb' : 'white', cursor: 'pointer', minWidth: 64 }}>Deep</button>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, color: '#333' }}>Offset X</label>
                        <input type="range" min={-40} max={40} value={boxShadowOffsetX} onChange={(e) => { const v = Number(e.target.value); setBoxShadowOffsetX(v); const style = `${v}px ${boxShadowOffsetY}px ${boxShadowBlur}px ${boxShadowColor}`; setProp(p => p.boxShadow = style); if (isEditing) applyToContent(el => el.style.boxShadow = style); }} style={{ width: 160 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, color: '#333' }}>Offset Y</label>
                        <input type="range" min={-12} max={12} value={boxShadowOffsetY} onChange={(e) => { const v = Number(e.target.value); setBoxShadowOffsetY(v); const style = `${boxShadowOffsetX}px ${v}px ${boxShadowBlur}px ${boxShadowColor}`; setProp(p => p.boxShadow = style); if (isEditing) applyToContent(el => el.style.boxShadow = style); }} style={{ width: 140 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 12, color: '#333' }}>Blur</label>
                        <input type="range" min={0} max={80} value={boxShadowBlur} onChange={(e) => { const v = Number(e.target.value); setBoxShadowBlur(v); const style = `${boxShadowOffsetX}px ${boxShadowOffsetY}px ${v}px ${boxShadowColor}`; setProp(p => p.boxShadow = style); if (isEditing) applyToContent(el => el.style.boxShadow = style); }} style={{ width: 140 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                        <label style={{ fontSize: 12, color: '#333' }}>Color</label>
                        <input type="color" value={boxShadowColor} onChange={(e) => { const v = e.target.value; setBoxShadowColor(v); const style = `${boxShadowOffsetX}px ${boxShadowOffsetY}px ${boxShadowBlur}px ${v}`; setProp(p => p.boxShadow = style); if (isEditing) applyToContent(el => el.style.boxShadow = style); }} style={{ width: 40, height: 32, border: 'none', padding: 2, cursor: 'pointer', borderRadius: 6 }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
              {/* Compact exit button moved into the main controls row */}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Binding selector */}
                <BindSelector
                  nodeId={nodeId}
                  variant="toolbar"
                  showLabel={false}
                  binding={(() => {
                    if (!textBindingPath) return null;
                    return { path: textBindingPath, scope: textBindingScope || 'local' };
                  })()}
                  onChange={(b) => {
                    setProp(p => {
                      p.textBindingPath = b?.path || '';
                      p.textBindingScope = b?.scope || 'local';
                    });
                    if (b && b.path) {
                      try {
                        const api = userPropsApiRef.current;
                        const scopeNode = b.scope === 'global' ? 'ROOT' : nodeId;
                        let val = api.getValueAtPath(b.path, scopeNode);
                        if ((val === undefined || val === null) && b.scope === 'global' && api.getGlobalValue) {
                          // Fallback direct global lookup when no local alias exists
                          val = api.getGlobalValue(b.path);
                        }
                        if (typeof val === 'string') {
                          setProp(p => { p.text = val; });
                          setLocalText(val);
                        } else {
                          // Debug logging to help diagnose mis-binding
                          try { console.warn('[Text] Bound path resolved no string value', { path: b.path, scope: b.scope, resolved: val }); } catch {}
                        }
                      } catch {/* ignore */}
                    }
                  }}
                  label="Bind Text"
                  style={{ height: 32 }}
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditing(false);
                    setProp(props => { props.text = localText; });
                  }}
                  title="Exit"
                  style={{ width: 36, height: 28, borderRadius: 8, border: '1px solid #e0e0e0', background: 'linear-gradient(135deg, #ff4d4f, #ff7875)', color: 'white', cursor: 'pointer' }}
                >✕</button>
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


// Define all supported props for the Text component
Text.craft = {
  displayName: "Text",
  props: {
    // Content
    text: "Edit this text",
    
    // Layout & Position
    width: "16rem",
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
  textShadowColor: '#000000',
  textShadowOffsetX: 0,
  textShadowOffsetY: 0,
  // Glyph stroke (text border)
  textStrokeEnabled: false,
  textStrokeWidth: 0,
  textStrokeColor: '#000000',
    boxShadowColor: '#000000',
    boxShadowOffsetX: 0,
    boxShadowOffsetY: 0,
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
  dataAttributes: {},

  // Binding
  textBindingPath: '',
  textBindingScope: 'local'
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