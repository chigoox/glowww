'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { snapGridSystem } from '../utils/grid/SnapGridSystem';

/**
 * SnapPositionHandle - Custom position handle with full snap integration
 * This replaces Craft.js position handling with snap-aware positioning
 * Now includes automatic positioning when parent container changes
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
    dom,
    parent
  } = useNode((node) => ({
    dom: node.dom,
    parent: node.data.parent
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
    canvasRect: null,
    lastMousePosition: { x: 0, y: 0 } // Track last known mouse position
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isContainerSwitchInProgress, setIsContainerSwitchInProgress] = useState(false);
  
  // Track previous parent to detect container changes (like useCenteredContainerDrag)
  const prevParentRef = useRef(parent);
  
  // Track mouse position globally for parent change positioning
  const globalMousePosition = useRef({ x: 0, y: 0 });

  // Global mouse tracking for parent change detection
  useEffect(() => {
    const trackGlobalMouse = (e) => {
      globalMousePosition.current = { x: e.clientX, y: e.clientY };
      if (dragState.current.isDragging) {
        dragState.current.lastMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    document.addEventListener('mousemove', trackGlobalMouse, { passive: true });
    return () => document.removeEventListener('mousemove', trackGlobalMouse);
  }, []);

  // Detect parent changes and auto-position (like useCenteredContainerDrag)
  useEffect(() => {
    if (prevParentRef.current !== null && prevParentRef.current !== parent) {
      // Parent has changed - element was moved to a different container
      console.log(`📦 SnapPositionHandle: Element ${nodeId} moved from parent ${prevParentRef.current} to ${parent}`);
      
      // Use the last known mouse position or current global position for centering
      const mousePos = dragState.current.lastMousePosition.x ? 
        dragState.current.lastMousePosition : 
        globalMousePosition.current;
      
      console.log('🎯 Auto-positioning after parent change:', {
        nodeId,
        oldParent: prevParentRef.current,
        newParent: parent,
        mousePosition: mousePos
      });
      
      // Apply auto-positioning with a small delay to let Craft.js complete the move
      setTimeout(() => {
        try {
          autoPositionInNewContainer(parent, mousePos);
        } catch (error) {
          console.error('❌ Auto-positioning after parent change failed:', error);
        }
      }, 100);
    }
    
    prevParentRef.current = parent;
  }, [parent, nodeId]);

  // Auto-position function when moved to new container
  const autoPositionInNewContainer = useCallback((newParentId, mousePosition) => {
    try {
      console.log('🔄 Auto-positioning in new container:', { newParentId, mousePosition });
      
      let containerElement = null;
      
      if (newParentId === 'ROOT') {
        // For ROOT parent, find the main editor canvas
        containerElement = document.querySelector('[data-cy="editor-root"], .craft-renderer, [data-editor="true"]');
        if (!containerElement) {
          containerElement = document.querySelector('.w-full.h-full.min-h-\\[100vh\\]');
        }
        if (!containerElement) {
          containerElement = document.querySelector('[data-page-id]');
        }
      } else {
        // Get specific parent container element
        try {
          const parentNode = query.node(newParentId);
          if (parentNode && parentNode.dom) {
            containerElement = parentNode.dom;
          }
        } catch (parentNodeError) {
          console.warn('⚠️ Error getting parent node DOM:', parentNodeError.message);
        }
      }

      if (containerElement && dom) {
        const containerRect = containerElement.getBoundingClientRect();
        const elementRect = dom.getBoundingClientRect();
        
        // Calculate position to center element at mouse position relative to new container
        const relativeX = mousePosition.x - containerRect.left - (elementRect.width / 2);
        const relativeY = mousePosition.y - containerRect.top - (elementRect.height / 2);
        
        console.log('📍 Calculated auto-position:', {
          mousePosition,
          containerRect: { left: containerRect.left, top: containerRect.top },
          elementSize: { width: elementRect.width, height: elementRect.height },
          relativePosition: { x: relativeX, y: relativeY },
          newParent: newParentId
        });
        
        // Apply the positioning
        try {
          setProp((props) => {
            props.position = 'absolute';
            props.left = Math.max(0, relativeX);
            props.top = Math.max(0, relativeY);
            
            console.log('✅ Auto-positioned successfully:', {
              nodeId,
              x: Math.max(0, relativeX),
              y: Math.max(0, relativeY),
              parentContainer: newParentId,
              reason: 'Parent container changed'
            });
          });
        } catch (setPropError) {
          console.error('❌ Error setting auto-position props:', setPropError.message);
        }
      } else {
        console.warn('⚠️ Could not find new container element for auto-positioning');
      }
    } catch (error) {
      console.error('❌ Error in autoPositionInNewContainer:', error);
    }
  }, [query, dom, setProp, nodeId]);

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
      
  // Final fallback to root canvas (removed getDropPlaceholder usage to prevent noisy errors)
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
    
    // Skip if container switch is in progress
    if (isContainerSwitchInProgress) {
      console.log('⏸️ Skipping SnapPositionHandle drag - container switch in progress');
      return;
    }

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
  }, [dom, nodeId, query, getParentContainer, onDragStart, isContainerSwitchInProgress]);

  // Handle drag move with snapping and container detection
  const handleMouseMove = useCallback((e) => {
    if (!dragState.current.isDragging || !dom) return;
    
    // Skip if container switch is in progress
    if (isContainerSwitchInProgress) {
      return;
    }

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

    // Constrain within container bounds
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
    // Use pixel values during drag (convert to % on mouse up)
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
    
    // Call external drag move handler
    onDragMove?.(e, { x: finalX, y: finalY, snapped: snapResult.snapped });

  }, [dom, nodeId, setProp, onDragMove, isContainerSwitchInProgress]);

  // Handle drag end with enhanced container switching (convert to %)
  const handleMouseUp = useCallback((e) => {
    if (!dragState.current.isDragging) return;

    dragState.current.isDragging = false;
    setIsDragging(false);

    console.log('🎯 SnapPositionHandle drag end - applying final position');

  let finalX = dragState.current.currentX || 0;
  let finalY = dragState.current.currentY || 0;
  const container = getParentContainer();
  const { elementWidth, elementHeight } = dragState.current;
  let percentLeft = 0;
  let percentTop = 0;

    if (container) {
      const rect = container.getBoundingClientRect();
      const originalRect = dragState.current.canvasRect;
      const baseHeight = (originalRect && originalRect.height) || rect.height || 0;
      const maxX = Math.max(0, rect.width - elementWidth);
      const maxY = Math.max(0, baseHeight - elementHeight);
      finalX = Math.min(Math.max(0, finalX), maxX);
      finalY = Math.min(Math.max(0, finalY), maxY);
      percentLeft = rect.width ? (finalX / rect.width) * 100 : 0;
      percentTop = baseHeight ? (finalY / baseHeight) * 100 : 0;
    }

    const formatPct = (v) => `${parseFloat(v.toFixed(4))}%`;

    // Also convert width/height to percentages (keeps element centered proportionally on resize)
    let widthPercent; let heightPercent;
    if (container) {
      const rect = container.getBoundingClientRect();
      const originalRect = dragState.current.canvasRect;
      const baseHeight = (originalRect && originalRect.height) || rect.height || 0;
      if (rect.width) widthPercent = (elementWidth / rect.width) * 100;
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

  }, [handleMouseMove, onDragEnd, setProp, nodeId, isContainerSwitchInProgress]); // Removed enhancedMove from dependencies

  // Monitor for container switch operations
  useEffect(() => {
    let containerSwitchTimeout;
    
    const handleContainerSwitchStart = () => {
      console.log('🔄 Container switch detected - pausing SnapPositionHandle');
      setIsContainerSwitchInProgress(true);
      
      // Clear any existing timeout
      if (containerSwitchTimeout) {
        clearTimeout(containerSwitchTimeout);
      }
      
      // Reset after operation should be complete
      containerSwitchTimeout = setTimeout(() => {
        console.log('✅ Container switch complete - resuming SnapPositionHandle');
        setIsContainerSwitchInProgress(false);
      }, 500); // Give enough time for container switch operations
    };
    
    // Listen for events that indicate container switching
    const handleMouseUp = (e) => {
      // Check if this might be a container switch operation
      const target = e.target?.closest('[data-cy="ROOT"], [data-testid="ROOT"]');
      if (target && isDragging) {
        handleContainerSwitchStart();
      }
    };
    
    // Listen for parent changes that might indicate container switching
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if our element was moved to a new container
          mutation.addedNodes.forEach((node) => {
            if (node === dom && isDragging) {
              handleContainerSwitchStart();
            }
          });
        }
      });
    });
    
    // Start observing
    if (dom) {
      document.addEventListener('mouseup', handleMouseUp);
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      observer.disconnect();
      if (containerSwitchTimeout) {
        clearTimeout(containerSwitchTimeout);
      }
    };
  }, [dom, isDragging]);

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
