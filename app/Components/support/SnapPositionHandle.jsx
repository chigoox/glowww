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
    try {
      if (!dom || !query) return null;
      
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
      
      // Final fallback to root canvas - safely check query methods
      const dropPlaceholder = query && typeof query.getDropPlaceholder === 'function' ? query.getDropPlaceholder() : null;
      const fallbackElement = dropPlaceholder || document.querySelector('[data-cy="editor-root"], [data-editor="true"]') || document.body;
      
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
    const currentLeft = elementRect.left - containerRect.left + borderLeft;
    const currentTop = elementRect.top - containerRect.top + borderTop;

    // Initialize drag state - align to padding box (inside border, including padding)
    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startElementX: currentLeft,
      startElementY: currentTop,
      elementWidth: elementRect.width - borderLeft - borderRight,
      elementHeight: elementRect.height - borderTop - borderBottom,
      canvasRect: containerRect // Use container rect instead of canvas rect
    };

    setIsDragging(true);

    // Register all elements for snapping (relative to the same container)
    const nodes = query && typeof query.getNodes === 'function' ? query.getNodes() : {};
    if (nodes && typeof nodes === 'object') {
      Object.entries(nodes).forEach(([id, node]) => {
        if (id && id !== nodeId && node && node.dom && typeof node.dom.getBoundingClientRect === 'function') {
          try {
            const nodeBounds = node.dom.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(node.dom);
          
          // Get border widths (we exclude borders from visual alignment)
          const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
          const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
          const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
          const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
          
          // For visual alignment, we want to align to the padding box (inside border, including padding)
          // Calculate relative to the same container
          const relativeBounds = {
            x: nodeBounds.left - containerRect.left + borderLeft,
            y: nodeBounds.top - containerRect.top + borderTop,
            width: nodeBounds.width - borderLeft - borderRight,
            height: nodeBounds.height - borderTop - borderBottom
          };
          
          snapGridSystem.registerElement(id, node.dom, relativeBounds);
        } catch (error) {
          console.warn(`Failed to register element ${id} for snapping:`, error);
        }
      }
      });
    }

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
      // We calculated positions for the padding box (inside border), 
      // but style.left/top sets the border box position, so we need to offset
      const computedStyle = window.getComputedStyle(dom);
      const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
      const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
      
      // Update the actual style properties instead of using transform
      dom.style.position = 'absolute';
      dom.style.left = `${finalX - borderLeft}px`;  // Subtract border to get border box position
      dom.style.top = `${finalY - borderTop}px`;    // Subtract border to get border box position
    }

    // Also update Craft.js state to keep it in sync
    setProp((props) => {
      // We calculated positions for the padding box (inside border), 
      // but Craft.js properties should match the DOM style (border box position)
      const computedStyle = window.getComputedStyle(dom);
      const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
      const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
      
      const borderBoxX = finalX - borderLeft;
      const borderBoxY = finalY - borderTop;
      
      // Handle different position prop structures
      if (typeof props.left !== 'undefined' || typeof props.top !== 'undefined') {
        props.left = borderBoxX;
        props.top = borderBoxY;
        props.position = 'absolute';
      } else if (props.style) {
        props.style = {
          ...props.style,
          position: 'absolute',
          left: `${borderBoxX}px`,
          top: `${borderBoxY}px`
        };
      } else {
        props.style = {
          position: 'absolute',
          left: `${borderBoxX}px`,
          top: `${borderBoxY}px`
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

    // Position is already set during drag, so we don't need to do anything special here
    // Just ensure the final state is committed to Craft.js
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
    if (dom && nodeId && typeof dom.getBoundingClientRect === 'function') {
      const container = getParentContainer && getParentContainer();
      if (container && dom && typeof dom.getBoundingClientRect === 'function' && typeof container.getBoundingClientRect === 'function') {
        try {
          const elementRect = dom.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (elementRect && containerRect) {
            const relativeBounds = {
              x: elementRect.left - containerRect.left,
              y: elementRect.top - containerRect.top,
              width: elementRect.width,
              height: elementRect.height
            };
            snapGridSystem.registerElement(nodeId, dom, relativeBounds);
          }
        } catch (error) {
          console.warn(`Failed to register element ${nodeId} in useEffect:`, error);
        }
      }
    }
    
    return () => {
      if (nodeId) {
        try {
          snapGridSystem.unregisterElement(nodeId);
        } catch (error) {
          console.warn(`Failed to unregister element ${nodeId}:`, error);
        }
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
