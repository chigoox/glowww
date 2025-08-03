'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { snapGridSystem } from './SnapGridSystem';

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
      
      // Final fallback to root canvas
      return query.getDropPlaceholder() || document.querySelector('[data-cy="editor-root"], [data-editor="true"]') || document.body;
    } catch (e) {
      // Fallback to root canvas
      return query.getDropPlaceholder() || document.querySelector('[data-cy="editor-root"], [data-editor="true"]') || document.body;
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

  // Handle drag move with snapping
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

    // Calculate new position
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
    const finalX = snapResult.snapped ? snapResult.x : newX;
    const finalY = snapResult.snapped ? snapResult.y : newY;

    // Store current position in drag state for final commit
    dragState.current.currentX = finalX;
    dragState.current.currentY = finalY;

    // Immediately update actual position for smooth dragging
    if (dom) {
      // Update the actual style properties directly
      dom.style.position = 'absolute';
      dom.style.left = `${finalX}px`;
      dom.style.top = `${finalY}px`;
    }

    // Also update Craft.js state to keep it in sync
    setProp((props) => {
      // Handle different position prop structures
      if (typeof props.left !== 'undefined' || typeof props.top !== 'undefined') {
        props.left = finalX;
        props.top = finalY;
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

  }, [dom, nodeId, setProp, onDragMove]);

  // Handle drag end
  const handleMouseUp = useCallback((e) => {
    if (!dragState.current.isDragging) return;

    dragState.current.isDragging = false;
    setIsDragging(false);

    // Ensure the final position is properly committed to Craft.js
    const finalX = dragState.current.currentX || 0;
    const finalY = dragState.current.currentY || 0;

    setProp((props) => {
      if (typeof props.left !== 'undefined' || typeof props.top !== 'undefined') {
        props.left = finalX;
        props.top = finalY;
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

  }, [handleMouseMove, onDragEnd, setProp]);

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

export default SnapPositionHandle;
