'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { snapGridSystem } from '../utils/grid/SnapGridSystem';

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
      startX: e.clientX,
      startY: e.clientY,
      startElementX: currentLeft,
      startElementY: currentTop,
      elementWidth: elementRect.width,
      elementHeight: elementRect.height,
      canvasRect: containerRect // Use container rect instead of canvas rect
    };

    setIsDragging(true);

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

    // Add global mouse handlers
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [dom, nodeId, query, getParentContainer, onDragStart]);

  // Handle drag move with snapping and container detection
  const handleMouseMove = useCallback((e) => {
    if (!dragState.current.isDragging || !dom) return;

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
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    const newX = startElementX + deltaX;
    const newY = startElementY + deltaY;

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
      const y = e.clientY;
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
    let finalX = dragState.current.currentX || 0;
    let finalY = dragState.current.currentY || 0;

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

    // Also convert element dimensions to percentage to preserve visual center during parent resizing
    let widthPercent; let heightPercent;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const originalRect = dragState.current.canvasRect;
      const baseHeight = (originalRect && originalRect.height) || containerRect.height || 0;
      if (containerRect.width) widthPercent = (elementWidth / containerRect.width) * 100;
      if (baseHeight) heightPercent = (elementHeight / baseHeight) * 100;
    }

    setProp((props) => {
      if (typeof props.left !== 'undefined' || typeof props.top !== 'undefined') {
        props.left = formatPct(percentLeft);
        props.top = formatPct(percentTop);
        props.position = 'absolute';
        if (widthPercent) props.width = formatPct(widthPercent);
        if (heightPercent) props.height = formatPct(heightPercent);
      } else if (props.style) {
        props.style = {
          ...props.style,
          position: 'absolute',
          left: formatPct(percentLeft),
          top: formatPct(percentTop),
          ...(widthPercent ? { width: formatPct(widthPercent) } : {}),
          ...(heightPercent ? { height: formatPct(heightPercent) } : {})
        };
      } else {
        props.style = {
          position: 'absolute',
          left: formatPct(percentLeft),
          top: formatPct(percentTop),
          ...(widthPercent ? { width: formatPct(widthPercent) } : {}),
          ...(heightPercent ? { height: formatPct(heightPercent) } : {})
        };
      }
    });

    // Clear snap indicators after a brief delay to keep them visible
    setTimeout(() => {
      snapGridSystem.clearSnapIndicators();
    }, 300); // Keep visible for 300ms after drag ends

    // Remove global mouse handlers
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    // Clean up registered elements
    setTimeout(() => {
      snapGridSystem.cleanupTrackedElements();
    }, 100);

    // Call external drag end handler
    onDragEnd?.(e);

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
