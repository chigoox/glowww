'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useEditor } from '@craftjs/core';

const MultiSelectContext = createContext();

export const useMultiSelect = () => {
  const context = useContext(MultiSelectContext);
  if (!context) {
    throw new Error('useMultiSelect must be used within a MultiSelectProvider');
  }
  return context;
};

export const MultiSelectProvider = ({ children }) => {
  const { query, actions } = useEditor();
  const [selectedNodes, setSelectedNodes] = useState(new Set());
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [boundingBox, setBoundingBox] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  // Drag selection state
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragSelection, setDragSelection] = useState(null);
  const [recentlyFinishedDragSelecting, setRecentlyFinishedDragSelecting] = useState(false);
  const dragStartRef = useRef(null);
  
  // Drag delay state
  const dragDelayTimerRef = useRef(null);
  const isDragDelayActiveRef = useRef(false);
  const DRAG_DELAY_MS = 300; // 150ms delay before drag selection starts (adjustable)

  // Track key states
  const keysPressed = useRef(new Set());

  // Handle keyboard events for multi-selection
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current.add(e.key.toLowerCase());
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    const handleKeyUp = (e) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Clear all selection
  const clearSelection = useCallback(() => {
    setSelectedNodes(new Set());
    setIsMultiSelecting(false);
    setBoundingBox(null);
  }, []);

  // Calculate bounding box for all selected elements
  const calculateBoundingBox = useCallback(() => {
    if (selectedNodes.size === 0) {
      setBoundingBox(null);
      return;
    }

    const nodes = query.getNodes();
    const rects = [];
    const validNodes = [];

    selectedNodes.forEach(nodeId => {
      const node = nodes[nodeId];
      if (node && node.dom) {
        // Only include elements with actual size (filter out 0-width/height elements)
        const rect = node.dom.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          rects.push(rect);
          validNodes.push(nodeId);
        }
      }
    });

    // If no valid nodes, clear selection and bounding box
    if (validNodes.length === 0) {
      setBoundingBox(null);
      setSelectedNodes(new Set());
      setIsMultiSelecting(false);
      return;
    }

    // If some nodes were invalid, clean up selection
    if (validNodes.length < selectedNodes.size) {
      setSelectedNodes(new Set(validNodes));
      setIsMultiSelecting(validNodes.length > 1);
    }

    // Calculate the combined bounding box
    const minLeft = Math.min(...rects.map(r => r.left));
    const minTop = Math.min(...rects.map(r => r.top));
    const maxRight = Math.max(...rects.map(r => r.right));
    const maxBottom = Math.max(...rects.map(r => r.bottom));

    // Add some padding around the selection
    const padding = 2;
    
    const newBoundingBox = {
      left: minLeft - padding,
      top: minTop - padding,
      width: (maxRight - minLeft) + (padding * 2),
      height: (maxBottom - minTop) + (padding * 2),
      right: maxRight + padding,
      bottom: maxBottom + padding
    };
    
    
    
    setBoundingBox(newBoundingBox);
  }, [selectedNodes, query]);
  // Deselect on left click outside selected elements or bounding box
  useEffect(() => {
    const handleClick = (e) => {
      // Skip if we were drag selecting or recently finished drag selecting
      if (isDragSelecting || recentlyFinishedDragSelecting) {
        console.log('🖱️ Skipping click due to drag selecting or recent drag selection');
        return;
      }
      
      // Skip if this is not a left click
      if (e.button !== 0) {
        return;
      }
      
      // Don't clear selection if Ctrl/Cmd is held (for multi-selection)
      if (e.ctrlKey || e.metaKey) {
        console.log('🖱️ Ctrl/Cmd held, ignoring click');
        return;
      }
      
      // Check if clicking on bounding box or selected element
      const clickedBoundingBox = e.target.closest('.multi-select-bounding-box');
      const clickedSelectedElement = e.target.closest('.multi-selected-element');
      const clickedResizeHandle = e.target.closest('[title*="Resize"]');
      const clickedPortalControl = e.target.closest('.pill-control, [title*="Drag"], [title*="move"]');
      const clickedContextMenu = e.target.closest('.ant-dropdown, .context-menu');
      
      console.log('🖱️ Click analysis:', {
        clickedBoundingBox: !!clickedBoundingBox,
        clickedSelectedElement: !!clickedSelectedElement,
        clickedResizeHandle: !!clickedResizeHandle,
        clickedPortalControl: !!clickedPortalControl,
        clickedContextMenu: !!clickedContextMenu,
        target: e.target.tagName
      });
      
      // If clicking on bounding box, selected element, resize handles, or controls, don't clear
      if (clickedBoundingBox || clickedSelectedElement || clickedResizeHandle || clickedPortalControl || clickedContextMenu) {
        console.log('🖱️ Clicking on interactive element, preserving selection');
        return;
      }
      
      // Only clear if clicking in the editor area
      const editorRoot = document.querySelector('[data-editor="true"]');
      if (editorRoot && editorRoot.contains(e.target)) {
        console.log('🖱️ Clearing selection - clicked outside selected elements');
        clearSelection();
      } else {
        console.log('🖱️ Click outside editor area, ignoring');
      }
    };
    
    document.addEventListener('click', handleClick, true); // Use capture phase
    return () => document.removeEventListener('click', handleClick, true);
  }, [clearSelection, isDragSelecting, recentlyFinishedDragSelecting]);

  // Watch for changes to selected elements (for StyleMenu updates)
  useEffect(() => {
    if (selectedNodes.size === 0) return;

    let updateTimeout;

    // Create a ResizeObserver to watch for size/position changes
    const resizeObserver = new ResizeObserver((entries) => {
      // Debounce the bounding box recalculation to avoid excessive updates
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        
        calculateBoundingBox();
      }, 100);
    });

    // Create a MutationObserver to watch for style changes
    const mutationObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          shouldUpdate = true;
        }
      });

      if (shouldUpdate) {
        // Debounce the bounding box recalculation
        clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          
          calculateBoundingBox();
        }, 100);
      }
    });

    // Observe all selected elements
    selectedNodes.forEach(nodeId => {
      const element = query.node(nodeId).get()?.dom;
      if (element) {
        resizeObserver.observe(element);
        mutationObserver.observe(element, {
          attributes: true,
          attributeFilter: ['style', 'class']
        });
      }
    });

    return () => {
      clearTimeout(updateTimeout);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [selectedNodes, query, calculateBoundingBox]);

  // Update bounding box when selection changes
  useEffect(() => {
    calculateBoundingBox();
  }, [selectedNodes, calculateBoundingBox]);

  // Drag selection functionality
  useEffect(() => {
    
    const handleMouseDown = (e) => {
      
      
      // Skip if this is a right-click
      if (e.button !== 0) {
        return;
      }
      
      // Check if we're in any editor-like container
      const editorRoot = document.querySelector('[data-editor="true"]') || 
                        document.querySelector('.editor-canvas') ||
                        document.querySelector('[data-testid="canvas"]') ||
                        document.body; // Fallback to body for now
      
      
      if (!editorRoot || !editorRoot.contains(e.target)) {
        return;
      }
      
      // Don't start drag selection if clicking on interactive elements
      const clickedBoundingBox = e.target.closest('.multi-select-bounding-box');
      const clickedSelectedElement = e.target.closest('.multi-selected-element');
      
      // Be more lenient - only check for specific interactive elements we know about
      const isButton = e.target.tagName === 'BUTTON' || e.target.closest('button');
      const isInput = e.target.tagName === 'INPUT' || e.target.closest('input');
      const isSelect = e.target.tagName === 'SELECT' || e.target.closest('select');
      
      
      
      // If clicking on specific interactive elements, don't start drag selection
      if (clickedBoundingBox || clickedSelectedElement || isButton || isInput || isSelect) {
        return;
      }
      
      // Clear any existing delay timer
      if (dragDelayTimerRef.current) {
        clearTimeout(dragDelayTimerRef.current);
        dragDelayTimerRef.current = null;
      }
      
      // Prepare for potential drag selection (but don't start yet)
      e.preventDefault(); // Prevent text selection
      
      isDragDelayActiveRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      
      // If not holding Ctrl, prepare to clear existing selection (but don't do it yet)
      const shouldClearSelection = !e.ctrlKey && !e.metaKey;
      
      // Start delay timer for drag selection
      dragDelayTimerRef.current = setTimeout(() => {
        if (isDragDelayActiveRef.current && dragStartRef.current) {
          
          setIsDragSelecting(true);
          
          const initialRect = {
            left: dragStartRef.current.x,
            top: dragStartRef.current.y,
            width: 0,
            height: 0
          };
          setDragSelection(initialRect);
          
          // Clear existing selection if needed
          if (shouldClearSelection) {
            setSelectedNodes(new Set());
            setIsMultiSelecting(false);
          }
        }
        dragDelayTimerRef.current = null;
      }, DRAG_DELAY_MS);
    };

    const handleMouseMove = (e) => {
      if (!isDragSelecting || !dragStartRef.current) return;
      
      
      const startX = dragStartRef.current.x;
      const startY = dragStartRef.current.y;
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      // Calculate selection rectangle
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      
      const selectionRect = { left, top, width, height };
      setDragSelection(selectionRect);
      
      // Only update selection if we've dragged a minimum distance
      if (width > 5 || height > 5) {
        // Find elements within selection rectangle
        const nodes = query.getNodes();
        const selectedInDrag = new Set();
        
        Object.keys(nodes).forEach(nodeId => {
          const node = nodes[nodeId];
          if (node && node.dom && nodeId !== 'ROOT') {
            const rect = node.dom.getBoundingClientRect();
            
            // Check if element intersects with selection rectangle
            const intersects = !(rect.right < left || 
                                rect.left > left + width || 
                                rect.bottom < top || 
                                rect.top > top + height);
            
            if (intersects) {
              selectedInDrag.add(nodeId);
            }
          }
        });
        
        // Update selection (combine with existing if Ctrl is held)
        setSelectedNodes(prev => {
          if (e.ctrlKey || e.metaKey) {
            const combined = new Set([...prev, ...selectedInDrag]);
            setIsMultiSelecting(combined.size > 0);
            return combined;
          } else {
            setIsMultiSelecting(selectedInDrag.size > 0);
            return selectedInDrag;
          }
        });
      }
    };

    const handleMouseUp = (e) => {
      console.log('🖱️ Mouse up, isDragSelecting:', isDragSelecting, 'delayActive:', isDragDelayActiveRef.current);
      
      // If delay is active, clear it (this was a quick click, not a drag)
      if (isDragDelayActiveRef.current && dragDelayTimerRef.current) {
        clearTimeout(dragDelayTimerRef.current);
        dragDelayTimerRef.current = null;
        isDragDelayActiveRef.current = false;
        dragStartRef.current = null;
      }
      
      // If we were actually drag selecting, end it
      if (isDragSelecting) {
        console.log('🖱️ Ending drag selection, setting temporary flag to prevent click handler');
        setIsDragSelecting(false);
        setDragSelection(null);
        isDragDelayActiveRef.current = false;
        dragStartRef.current = null;
        
        // Set flag to prevent immediate click handler from clearing selection
        setRecentlyFinishedDragSelecting(true);
        
        // Clear the flag after a short delay (longer than click event timing)
        setTimeout(() => {
          setRecentlyFinishedDragSelecting(false);
        }, 100);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    
    return () => {
      // Clear any pending delay timer
      if (dragDelayTimerRef.current) {
        clearTimeout(dragDelayTimerRef.current);
        dragDelayTimerRef.current = null;
      }
      isDragDelayActiveRef.current = false;
      
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragSelecting, query]);

  // Add node to selection (simple version for direct calls)
  const addToSelection = useCallback((nodeId) => {
    setSelectedNodes(prev => {
      const newSet = new Set(prev);
      newSet.add(nodeId);
      setIsMultiSelecting(newSet.size > 0);
      return newSet;
    });
  }, []);

  // Add node to selection with key handling (for internal use)
  const addToSelectionWithKeys = useCallback((nodeId) => {
    setSelectedNodes(prev => {
      const newSet = new Set(prev);
      
      // If Ctrl/Cmd is held, add to selection (check multiple key variations)
      const isCtrlHeld = keysPressed.current.has('control') || 
                        keysPressed.current.has('controlkey') || 
                        keysPressed.current.has('ctrl');
      const isCmdHeld = keysPressed.current.has('meta') || 
                       keysPressed.current.has('metakey') || 
                       keysPressed.current.has('cmd');
      
      if (isCtrlHeld || isCmdHeld) {
        if (newSet.has(nodeId)) {
          newSet.delete(nodeId); // Toggle off if already selected
          console.log('⌨️ Toggled OFF:', nodeId);
        } else {
          newSet.add(nodeId);
          console.log('⌨️ Added:', nodeId);
        }
      } else {
        // Replace selection with just this node
        newSet.clear();
        newSet.add(nodeId);
        console.log('⌨️ Replaced selection with:', nodeId);
      }
      
      setIsMultiSelecting(newSet.size > 1);
      console.log('⌨️ Final selection:', Array.from(newSet));
      return newSet;
    });
  }, []);

  // Remove node from selection
  const removeFromSelection = useCallback((nodeId) => {
    console.log('❌ Removing from selection:', nodeId);
    setSelectedNodes(prev => {
      console.log('❌ Current selection before remove:', Array.from(prev));
      const newSet = new Set(prev);
      newSet.delete(nodeId);
      setIsMultiSelecting(newSet.size > 0);
      console.log('❌ New selection after remove:', Array.from(newSet));
      return newSet;
    });
  }, []);

  // Check if node is selected
  const isSelected = useCallback((nodeId) => {
    return selectedNodes.has(nodeId);
  }, [selectedNodes]);

  // Get shared properties among selected nodes
  const getSharedProperties = useCallback(() => {
    if (selectedNodes.size === 0) return {};

    const nodes = query.getNodes();
    const sharedProps = {};
    let isFirst = true;

    selectedNodes.forEach(nodeId => {
      const node = nodes[nodeId];
      if (!node) return;

      const props = node.data.props || {};
      
      if (isFirst) {
        // Initialize with first node's properties
        Object.keys(props).forEach(key => {
          sharedProps[key] = props[key];
        });
        isFirst = false;
      } else {
        // Keep only properties that match across all nodes
        Object.keys(sharedProps).forEach(key => {
          if (sharedProps[key] !== props[key]) {
            delete sharedProps[key];
          }
        });
      }
    });

    return sharedProps;
  }, [selectedNodes, query]);

  // Update shared property across all selected nodes
  const updateSharedProperty = useCallback((propertyName, value) => {
    selectedNodes.forEach(nodeId => {
      actions.setProp(nodeId, (props) => {
        props[propertyName] = value;
      });
    });
  }, [selectedNodes, actions]);

  // Move all selected elements
  const moveSelection = useCallback((deltaX, deltaY) => {
    console.log('🚀 Moving selection by:', { deltaX, deltaY });
    
    selectedNodes.forEach(nodeId => {
      actions.setProp(nodeId, (props) => {
        // Get current position (handle both absolute and relative positioning)
        const currentLeft = props.left || 0;
        const currentTop = props.top || 0;
        
        // Apply delta movement
        const newLeft = currentLeft + deltaX;
        const newTop = currentTop + deltaY;
        
        console.log(`📍 Moving ${nodeId}: (${currentLeft}, ${currentTop}) -> (${newLeft}, ${newTop})`);
        
        // Ensure absolute positioning and update position
        props.position = 'absolute';
        props.left = Math.round(newLeft);
        props.top = Math.round(newTop);
      });
    });

    // Update bounding box after movement
    setTimeout(() => {
      calculateBoundingBox();
    }, 50);
  }, [selectedNodes, actions, calculateBoundingBox]);

  // Scale all selected elements
  const scaleSelection = useCallback((scaleX, scaleY, origin = { x: 0.5, y: 0.5 }) => {
    if (!boundingBox) return;

    console.log('🔍 Scaling selection:', { scaleX, scaleY, origin, boundingBox });

    // Calculate the origin point in editor coordinates
    const originX = boundingBox.left + (boundingBox.width * origin.x);
    const originY = boundingBox.top + (boundingBox.height * origin.y);

    selectedNodes.forEach(nodeId => {
      actions.setProp(nodeId, (props) => {
        // Get current properties
        const currentLeft = props.left || 0;
        const currentTop = props.top || 0;
        const currentWidth = props.width || 100;
        const currentHeight = props.height || 100;

        // Calculate new position relative to scale origin
        const relativeX = currentLeft - originX;
        const relativeY = currentTop - originY;
        
        const newLeft = originX + (relativeX * scaleX);
        const newTop = originY + (relativeY * scaleY);
        const newWidth = currentWidth * scaleX;
        const newHeight = currentHeight * scaleY;

        console.log(`🔍 Scaling ${nodeId}:`, {
          current: { left: currentLeft, top: currentTop, width: currentWidth, height: currentHeight },
          new: { left: newLeft, top: newTop, width: newWidth, height: newHeight }
        });

        // Update properties
        props.position = 'absolute';
        props.left = Math.round(newLeft);
        props.top = Math.round(newTop);
        props.width = Math.round(newWidth);
        props.height = Math.round(newHeight);
      });
    });

    // Update bounding box after scaling
    setTimeout(calculateBoundingBox, 50);
  }, [selectedNodes, actions, boundingBox, calculateBoundingBox]);

  // Simple resize function that only changes width/height proportionally
  const resizeSelection = useCallback((scaleX, scaleY) => {
    console.log('📏 Resizing selection:', { scaleX, scaleY });

    selectedNodes.forEach(nodeId => {
      actions.setProp(nodeId, (props) => {
        // Get current dimensions
        const currentWidth = props.width || 100;
        const currentHeight = props.height || 100;

        // Calculate new dimensions
        const newWidth = Math.max(10, currentWidth * scaleX); // Minimum 10px
        const newHeight = Math.max(10, currentHeight * scaleY); // Minimum 10px

        console.log(`📏 Resizing ${nodeId}:`, {
          current: { width: currentWidth, height: currentHeight },
          new: { width: newWidth, height: newHeight }
        });

        // Only update dimensions, keep position unchanged
        props.width = Math.round(newWidth);
        props.height = Math.round(newHeight);
      });
    });

    // Update bounding box after resizing
    setTimeout(calculateBoundingBox, 100);
  }, [selectedNodes, actions, calculateBoundingBox]);

  const contextValue = {
    selectedNodes,
    isMultiSelecting,
    boundingBox,
    isDragging,
    isResizing,
    isDragSelecting,
    dragSelection,
    setIsDragging,
    setIsResizing,
    addToSelection,
    addToSelectionWithKeys,
    removeFromSelection,
    clearSelection,
    isSelected,
    getSharedProperties,
    updateSharedProperty,
    moveSelection,
    scaleSelection,
    resizeSelection,
    calculateBoundingBox
  };

  return (
    <MultiSelectContext.Provider value={contextValue}>
      {children}
    </MultiSelectContext.Provider>
  );
};
