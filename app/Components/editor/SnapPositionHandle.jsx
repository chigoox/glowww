'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { snapGridSystem } from '../utils/grid/SnapGridSystem';

// Utility to get unified coordinates for mouse/touch events
const getEventCoordinates = (e) => {
  if (e.touches && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  }
  if (e.changedTouches && e.changedTouches.length > 0) {
    return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
  }
  return { clientX: e.clientX, clientY: e.clientY };
};

// Enhanced event handler that works with both mouse and touch
const createUnifiedEventHandler = (handler) => {
  return (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Prevent default for touch events to avoid scrolling
    if (e.type.startsWith('touch')) {
      e.preventDefault();
      // Also prevent body scroll during touch drag
      document.body.style.touchAction = 'none';
      document.body.style.overscrollBehavior = 'none';
    }
    handler(e);
  };
};

/**
 * SnapPositionHandle - Custom position handle with full snap integration
 * This replaces Craft.js position handling with snap-aware positioning
 */
const SnapPositionHandle = ({ 
  nodeId, 
  style = {},
  className = '', 
  children,
  onDragStart,
  onDragMove,
  onDragEnd 
}) => {
  const { actions, query } = useEditor();
  const { 
    actions: { setProp },
    dom
  } = useNode((node) => ({
    dom: node.dom
  }));

  const handleRef = useRef(null);
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    startElementX: 0,
    startElementY: 0,
    elementWidth: 0,
    elementHeight: 0,
    canvasRect: null
  });

  const [isDragging, setIsDragging] = useState(false);

  // Get parent container element (immediate parent, not root canvas)
  const getParentContainer = useCallback(() => {
    if (!dom) return null;
    
    try {
      // Get the parent element from Craft.js
      const parentElement = dom.parentElement;
      
      // If parent has position relative/absolute, use it as container
      if (parentElement) {
        const parentStyle = window.getComputedStyle(parentElement);
        if (['relative', 'absolute', 'fixed'].includes(parentStyle.position)) {
          return parentElement;
        }
      }
      
      // Fallback to finding the nearest positioned ancestor
      let current = parentElement;
      while (current && current !== document.body) {
        const computedStyle = window.getComputedStyle(current);
        if (['relative', 'absolute', 'fixed'].includes(computedStyle.position)) {
          return current;
        }
        current = current.parentElement;
      }
      
  // Final fallback to root canvas (removed getDropPlaceholder call due to runtime errors)
  // We rely purely on DOM markers now.
  const fallbackElement = document.querySelector('[data-cy="editor-root"], [data-editor="true"], [data-craft-node-id="ROOT"]') || document.body;
  return fallbackElement;
    } catch (error) {
      console.warn('Error in getParentContainer:', error);
      // Return safe fallback
      return document.querySelector('[data-cy="editor-root"], [data-editor="true"]') || document.body;
    }
  }, [dom, query]);

  // Handle drag start
  const handleMouseDown = useCallback((e) => {
    const coords = getEventCoordinates(e);
    e.preventDefault();
    e.stopPropagation();

    if (!dom) return;

    const container = getParentContainer();
    if (!container) return;

    const elementRect = dom.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(dom);
    
    // Get border widths for current element (we exclude borders from visual alignment)
    const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
    const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;

    // Calculate position relative to parent container, not root canvas
    const currentLeft = elementRect.left - containerRect.left;
    const currentTop = elementRect.top - containerRect.top;

    // Initialize drag state - align to padding box (inside border, including padding)
    dragState.current = {
      isDragging: true,
      startX: coords.clientX,
      startY: coords.clientY,
      startElementX: currentLeft,
      startElementY: currentTop,
      elementWidth: elementRect.width,
      elementHeight: elementRect.height,
      canvasRect: containerRect // Use container rect instead of canvas rect
    };

  // Track whether the pointer actually moved enough to consider this a drag
  dragState.current.hasMoved = false;

    setIsDragging(true);

    // Signal globally that a SnapPositionHandle POS drag is in progress
    try {
      if (typeof window !== 'undefined') {
        window.__GLOW_POS_DRAGGING = nodeId;
        document.documentElement.setAttribute('data-glow-pos-drag', String(nodeId || '1'));
      }
    } catch (_) {}

    // Register all elements for snapping (relative to the same container)
    const nodes = query.getNodes();
    Object.entries(nodes).forEach(([id, node]) => {
      if (id !== nodeId && node && node.dom) {
        try {
          const nodeBounds = node.dom.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(node.dom);
          
          // Get border widths (we exclude borders from visual alignment)
          const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
          const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
          const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
          const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
          
          // For consistent visual alignment, calculate relative to container bounds
          const relativeBounds = {
            x: nodeBounds.left - containerRect.left,
            y: nodeBounds.top - containerRect.top,
            width: nodeBounds.width,
            height: nodeBounds.height
          };
          
          snapGridSystem.registerElement(id, node.dom, relativeBounds);
        } catch (error) {
          console.warn(`Failed to register element ${id} for snapping:`, error);
        }
      }
    });

    // Call external drag start handler
    onDragStart?.(e);

    // Add global mouse and touch handlers
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleMouseMove, { passive: false });
    document.addEventListener('touchend', handleMouseUp);
  }, [dom, nodeId, query, getParentContainer, onDragStart]);

  // Handle drag move with snapping and container detection
  const handleMouseMove = useCallback((e) => {
    if (!dragState.current.isDragging || !dom) return;

    const coords = getEventCoordinates(e);
    const { 
      startX, 
      startY, 
      startElementX, 
      startElementY, 
      elementWidth, 
      elementHeight,
      canvasRect 
    } = dragState.current;

    // For smooth dragging, use traditional delta-based positioning
    const deltaX = coords.clientX - startX;
    const deltaY = coords.clientY - startY;
    const newX = startElementX + deltaX;
    const newY = startElementY + deltaY;

    // Mark as moved only after a small threshold to ignore click/noop
    if (!dragState.current.hasMoved && (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2)) {
      dragState.current.hasMoved = true;
    }

    // Get snap position from snap grid system
    console.log('🚀 About to call snapGridSystem.getSnapPosition', { nodeId, newX, newY, elementWidth, elementHeight });
    const snapResult = snapGridSystem.getSnapPosition(
      nodeId,
      newX,
      newY,
      elementWidth,
      elementHeight
    );
    console.log('🚀 SnapResult:', snapResult);

    // Use snapped position if available, otherwise use calculated position
    let finalX = snapResult.snapped ? snapResult.x : newX;
    let finalY = snapResult.snapped ? snapResult.y : newY;

    // Constrain within container bounds (can't drag outside)
    if (canvasRect) {
      const maxX = Math.max(0, canvasRect.width - elementWidth);
      const maxY = Math.max(0, canvasRect.height - elementHeight);
      finalX = Math.min(Math.max(0, finalX), maxX);
      finalY = Math.min(Math.max(0, finalY), maxY);
    }

    // Store current position and mouse coordinates for enhanced movement on drag end
  dragState.current.currentX = finalX;
  dragState.current.currentY = finalY;
    dragState.current.mouseX = e.clientX;
    dragState.current.mouseY = e.clientY;

    // Immediately update actual position for smooth dragging
    if (dom) {
      // Update the actual style properties directly
      dom.style.position = 'absolute';
      dom.style.left = `${finalX}px`;
      dom.style.top = `${finalY}px`;
      // Freeze the element's visual size during dragging to avoid layout collapse
      // (this prevents rem/% based widths from appearing to change when element is removed from flow)
      try {
        dom.style.width = `${elementWidth}px`;
        dom.style.height = `${elementHeight}px`;
      } catch (_) {}
    }

    // Also update Craft.js state to keep it in sync
    // Update with pixel values during drag for responsiveness (converted to % on mouse up)
    setProp((props) => {
      if (typeof props.left !== 'undefined' || typeof props.top !== 'undefined') {
        props.left = finalX; // temporary px number
        props.top = finalY;  // temporary px number
        props.position = 'absolute';
      } else if (props.style) {
        props.style = {
          ...props.style,
          position: 'absolute',
          left: `${finalX}px`,
          top: `${finalY}px`
        };
      } else {
        props.style = {
          position: 'absolute',
          left: `${finalX}px`,
          top: `${finalY}px`
        };
      }
    });
    
    // Call external drag move handler
    onDragMove?.(e, { x: finalX, y: finalY, snapped: snapResult.snapped });

    // Edge auto-scroll during POS drag (matches Root.jsx global behavior, but local fallback)
    try {
      const cfgSrc = (typeof window !== 'undefined' && window.__GLOW_EDITOR_SCROLL) || {};
      const threshold = cfgSrc.threshold ?? 260;
      const maxSpeed = cfgSrc.maxSpeed ?? 55;
      const ease = cfgSrc.ease ?? 'cubic';
      const coords = getEventCoordinates(e);
      const y = coords.clientY;
      const vh = window.innerHeight;
      let speed = 0;
      if (y < threshold) {
        const t = (threshold - y) / threshold; // 0..1
        const f = ease === 'cubic' ? Math.pow(t, 3) : t;
        speed = -f * maxSpeed;
      } else if (y > vh - threshold) {
        const t = (y - (vh - threshold)) / threshold;
        const f = ease === 'cubic' ? Math.pow(t, 3) : t;
        speed = f * maxSpeed;
      }
      if (speed !== 0) {
        window.scrollBy(0, speed);
      }
    } catch (_) {}

  }, [dom, nodeId, setProp, onDragMove]);

  // Handle drag end: convert stored pixel offsets to % relative to parent container
  const handleMouseUp = useCallback((e) => {
    if (!dragState.current.isDragging) return;

    dragState.current.isDragging = false;
    setIsDragging(false);

    console.log('🎯 SnapPositionHandle drag end - applying final position');

    // Retrieve the container to compute percentage based positioning
    let percentLeft = 0;
    let percentTop = 0;
    const container = getParentContainer();
  const { elementWidth, elementHeight } = dragState.current;
  // If no movement occurred, fall back to the original start positions
  let finalX = (typeof dragState.current.currentX === 'number') ? dragState.current.currentX : dragState.current.startElementX;
  let finalY = (typeof dragState.current.currentY === 'number') ? dragState.current.currentY : dragState.current.startElementY;

    if (container) {
      const containerRect = container.getBoundingClientRect();
      const containerW = containerRect.width || 0;
      // Use original height captured at drag start to avoid collapse (absolute child removal from flow)
      const originalRect = dragState.current.canvasRect; // stored at drag start
      const baseHeight = (originalRect && originalRect.height) || containerRect.height || 0;

      // Clamp again to be safe using current width / stored height
      if (containerW > 0) {
        const maxX = Math.max(0, containerW - elementWidth);
        finalX = Math.min(Math.max(0, finalX), maxX);
        percentLeft = (finalX / containerW) * 100;
      }
      if (baseHeight > 0) {
        const maxY = Math.max(0, baseHeight - elementHeight);
        finalY = Math.min(Math.max(0, finalY), maxY);
        percentTop = (finalY / baseHeight) * 100;
      }
    }

  // Round to 4 decimal places for stability yet precision
  const formatPct = (v) => `${parseFloat(v.toFixed(4))}%`;

    // Decide if we must preserve size to avoid collapse when switching to absolute
  let widthPercent; let heightPercent; let shouldCommitSize = false;
  let commitWidth = false; let commitHeight = false; // Initialize outside try block
  // Track where original sizes lived to write back correctly
  let originalWInStyle = false; let originalWInRoot = false;
  let originalHInStyle = false; let originalHInRoot = false;
  try {
      if (container && dom) {
        const containerRect = container.getBoundingClientRect();
        const originalRect = dragState.current.canvasRect;
        const baseHeight = (originalRect && originalRect.height) || containerRect.height || 0;

        // Compute potential % values
        if (containerRect.width) widthPercent = (elementWidth / containerRect.width) * 100;
        if (baseHeight) heightPercent = (elementHeight / baseHeight) * 100;

        // Detect if props had explicit sizes
        const nodeWrapper = query?.node?.(nodeId);
        let originalWidth, originalHeight, currentPosition;
        try {
          const data = nodeWrapper?.get?.();
          const p = data?.data?.props || {};
          originalWInRoot = typeof p.width !== 'undefined';
          originalHInRoot = typeof p.height !== 'undefined';
          originalWInStyle = !originalWInRoot && typeof p.style?.width !== 'undefined';
          originalHInStyle = !originalHInRoot && typeof p.style?.height !== 'undefined';
          originalWidth = originalWInRoot ? p.width : p.style?.width;
          originalHeight = originalHInRoot ? p.height : p.style?.height;
          currentPosition = p.position || 'static';
        } catch (_) {}

        const hasExplicit = (v) => {
          if (v === undefined || v === null) return false;
          if (typeof v === 'number') return true;
          if (typeof v === 'string') {
            const s = v.trim();
            // Treat px/%/rem/vw/vh as explicit; 'auto'/'initial' are not
            return /(px|%|rem|vw|vh)$/i.test(s) && s !== 'auto' && s !== 'initial';
          }
          return false;
        };

  const hasExplicitW = hasExplicit(originalWidth);
  const hasExplicitH = hasExplicit(originalHeight);

  // CRITICAL: Only preserve size when we're actually repositioning an existing element.
  // Initial placements should go to exact mouse position without size preservation.
  const isBecomingAbsolute = currentPosition !== 'absolute';
  
  // For already-absolute elements (repositioning), always preserve size
  // For relative elements (initial placement), only preserve if they have actual content size
  const isExistingAbsoluteElement = currentPosition === 'absolute';
  const hasReasonableSize = elementWidth >= 100 && elementHeight >= 50; // Suggests real content, not just defaults
  
  // Commit size only when repositioning existing absolute elements or when initial placement of sizable elements
  const commitWidth = (isExistingAbsoluteElement || (isBecomingAbsolute && hasReasonableSize)) && 
                      Number.isFinite(widthPercent) && widthPercent > 0;
  const commitHeight = (isExistingAbsoluteElement || (isBecomingAbsolute && hasReasonableSize)) && 
                       Number.isFinite(heightPercent) && heightPercent > 0;
  shouldCommitSize = commitWidth || commitHeight;
  
  // Debug logging to track size preservation
  console.log('🔍 SIZE PRESERVATION DEBUG [LATEST]:', {
    nodeId,
    isBecomingAbsolute,
    isExistingAbsoluteElement,
    hasReasonableSize,
    currentPosition,
    elementWidth,
    elementHeight,
    widthPercent: widthPercent?.toFixed(2),
    heightPercent: heightPercent?.toFixed(2),
    commitWidth,
    commitHeight,
    shouldCommitSize
  });
      }
    } catch (_) {}

    // Only commit position changes if the user actually dragged the handle.
    if (dragState.current.hasMoved) {
  // Commit position changes and, when necessary, persist size to prevent collapse
      setProp((props) => {
        const commitToRoot = (typeof props.left !== 'undefined' || typeof props.top !== 'undefined');
        const leftVal = formatPct(percentLeft);
        const topVal = formatPct(percentTop);

        if (commitToRoot) {
          props.left = leftVal;
          props.top = topVal;
          props.position = 'absolute';
        } 

        // Ensure style object exists if we’ll write there
        if (!commitToRoot) {
          props.style = { ...(props.style || {}), position: 'absolute', left: leftVal, top: topVal };
        } else if (props.style) {
          // Keep style position for consumers that read from style
          props.style = { ...props.style, position: 'absolute', left: leftVal, top: topVal };
        }

        // Persist size only when there were no explicit sizes originally
        if (shouldCommitSize) {
          console.log('📝 COMMITTING SIZE to props:', { commitWidth, commitHeight, widthPercent, heightPercent });
          if (commitWidth) {
            const wVal = formatPct(widthPercent);
            console.log('📏 Setting width to:', wVal, commitToRoot ? '(root prop)' : '(style prop)');
            if (commitToRoot) {
              props.width = wVal;
            } else {
              props.style = { ...(props.style || {}), width: wVal };
            }
          }
          if (commitHeight) {
            const hVal = formatPct(heightPercent);
            console.log('📏 Setting height to:', hVal, commitToRoot ? '(root prop)' : '(style prop)');
            if (commitToRoot) {
              props.height = hVal;
            } else {
              props.style = { ...(props.style || {}), height: hVal };
            }
          }
        } else {
          console.log('🚫 NOT committing size (shouldCommitSize is false)');
        }
      });
      
      // Clear temporary inline styles, but only if we didn't commit size values
      // If we committed size, let React handle the DOM styles through props
      if (!shouldCommitSize) {
        console.log('🧹 Clearing DOM styles immediately (no size commitment)');
        try {
          if (dom && dom.style) {
            dom.style.width = '';
            dom.style.height = '';
          }
        } catch (_) {}
      } else {
        console.log('🎯 NOT clearing DOM styles (size was committed - let React handle via props)');
        // For size-committed elements, don't clear DOM styles at all
        // Let React's re-render with the new props override the inline styles naturally
      }
    } else {
      // No meaningful move detected: do not modify props. Keep DOM state as-is.
      // Still clear snap indicators and cleanup tracked elements below.
      console.log('SnapPositionHandle: click without drag - skipping position commit');
    }

    // Clear snap indicators after a brief delay to keep them visible
    setTimeout(() => {
      snapGridSystem.clearSnapIndicators();
    }, 300); // Keep visible for 300ms after drag ends

    // Remove global mouse and touch handlers
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('touchmove', handleMouseMove);
    document.removeEventListener('touchend', handleMouseUp);
    
    // Restore touch actions after drag ends
    document.body.style.touchAction = '';
    document.body.style.overscrollBehavior = '';

    // Clean up registered elements
    setTimeout(() => {
      snapGridSystem.cleanupTrackedElements();
    }, 100);

    // Call external drag end handler
    onDragEnd?.(e);

    // Set a short recent-commit cooldown so other systems don't override the new position
    try {
      if (typeof window !== 'undefined') {
        window.__GLOW_POS_RECENT = window.__GLOW_POS_RECENT || {};
        window.__GLOW_POS_RECENT[nodeId] = Date.now() + 1200; // ~1.2s cooldown
        document.documentElement.setAttribute('data-glow-pos-recent', String(nodeId || '1'));
        setTimeout(() => {
          try {
            if (window.__GLOW_POS_RECENT) delete window.__GLOW_POS_RECENT[nodeId];
            if (document.documentElement.getAttribute('data-glow-pos-recent') === String(nodeId || '1')) {
              document.documentElement.removeAttribute('data-glow-pos-recent');
            }
          } catch (_) {}
        }, 1300);
      }
    } catch (_) {}

    // Clear global POS-drag flag
    try {
      if (typeof window !== 'undefined') {
        if (window.__GLOW_POS_DRAGGING === nodeId) {
          window.__GLOW_POS_DRAGGING = null;
        }
        document.documentElement.removeAttribute('data-glow-pos-drag');
      }
    } catch (_) {}

  }, [handleMouseMove, onDragEnd, setProp, nodeId]); // Removed enhancedMove from dependencies

  // Register current element with snap system
  useEffect(() => {
    if (dom && nodeId) {
      const container = getParentContainer();
      if (container) {
        const elementRect = dom.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const relativeBounds = {
          x: elementRect.left - containerRect.left,
          y: elementRect.top - containerRect.top,
          width: elementRect.width,
          height: elementRect.height
        };
        
        snapGridSystem.registerElement(nodeId, dom, relativeBounds);
      }
    }
    
    return () => {
      if (nodeId) {
        snapGridSystem.unregisterElement(nodeId);
      }
    };
  }, [dom, nodeId, getParentContainer]);

  const defaultStyle = {
    background: '#ff6b35',
    color: 'white',
    padding: '2px',
    borderRadius: '2px',
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    fontSize: '10px',
    fontWeight: 'bold',
    border: 'none',
    position: 'relative',
    zIndex: 1000,
    ...style
  };

  return (
    <div
      ref={handleRef}
      className={`snap-position-handle ${className}`}
      style={defaultStyle}
      onMouseDown={handleMouseDown}
      title="Position Handle - Drag to move with snapping"
    >
      {children || '✥'}
    </div>
  );
};

// Debug function for testing container switching
if (typeof window !== 'undefined') {
  window.testContainerSwitching = () => {
    console.log('🧪 Testing Container Switching');
    
    // Check if we have Box components that are canvas containers
    const boxes = document.querySelectorAll('[data-cy*="Box"], [data-testid*="Box"]');
    console.log(`📦 Found ${boxes.length} potential Box containers`);
    
    boxes.forEach((box, index) => {
      console.log(`📦 Box ${index + 1}:`, {
        element: box,
        hasCanvasAttribute: box.hasAttribute('data-cy') || box.hasAttribute('data-testid'),
        children: box.children.length,
        innerHTML: box.innerHTML.substring(0, 100) + '...'
      });
    });
    
    // Check for drag handles
    const handles = document.querySelectorAll('.snap-position-handle');
    console.log(`🔧 Found ${handles.length} position handles`);
    
    return {
      boxes: boxes.length,
      handles: handles.length,
      canTest: boxes.length >= 2 && handles.length > 0
    };
  };
}

export default SnapPositionHandle;
