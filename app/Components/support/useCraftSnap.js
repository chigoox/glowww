'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEditor, useNode } from '@craftjs/core';
import { snapGridSystem } from './SnapGridSystem';

/**
 * useCraftSnap - Hook to integrate snap and grid system with Craft.js
 * Provides snapping functionality for draggable elements
 */
export const useCraftSnap = (nodeId) => {
  const { actions, query, enabled } = useEditor((state) => ({
    enabled: state.options.enabled
  }));
  
  const {
    connectors: { connect, drag },
    actions: nodeActions,
    selected,
    dragged
  } = useNode((node) => ({
    selected: node.events.selected,
    dragged: node.events.dragged
  }));

  const elementRef = useRef(null);
  const dragStateRef = useRef({
    isDragging: false,
    startPosition: null,
    initialBounds: null
  });

  // Register element with snap system
  const registerElement = useCallback(() => {
    if (elementRef.current && nodeId) {
      const bounds = elementRef.current.getBoundingClientRect();
      const canvasElement = query.getDropPlaceholder()?.getBoundingClientRect();
      
      if (canvasElement) {
        // Convert to canvas-relative coordinates
        const relativeBounds = {
          x: bounds.left - canvasElement.left,
          y: bounds.top - canvasElement.top,
          width: bounds.width,
          height: bounds.height
        };
        
        snapGridSystem.registerElement(nodeId, elementRef.current, relativeBounds);
      }
    }
  }, [nodeId, query]);

  // Unregister element from snap system
  const unregisterElement = useCallback(() => {
    if (nodeId) {
      snapGridSystem.unregisterElement(nodeId);
    }
  }, [nodeId]);

  // Handle drag start
  const handleDragStart = useCallback((e) => {
    if (!enabled || !elementRef.current) return;

    const bounds = elementRef.current.getBoundingClientRect();
    dragStateRef.current = {
      isDragging: true,
      startPosition: { x: e.clientX, y: e.clientY },
      initialBounds: bounds
    };

    // Register all elements for snapping
    const nodes = query.getNodes();
    Object.entries(nodes).forEach(([id, node]) => {
      if (id !== nodeId && node.dom) {
        const nodeBounds = node.dom.getBoundingClientRect();
        const canvasElement = query.getDropPlaceholder()?.getBoundingClientRect();
        
        if (canvasElement) {
          const relativeBounds = {
            x: nodeBounds.left - canvasElement.left,
            y: nodeBounds.top - canvasElement.top,
            width: nodeBounds.width,
            height: nodeBounds.height
          };
          
          snapGridSystem.registerElement(id, node.dom, relativeBounds);
        }
      }
    });
  }, [enabled, nodeId, query]);

  // Handle drag move
  const handleDragMove = useCallback((e) => {
    if (!dragStateRef.current.isDragging || !elementRef.current) return;

    const { startPosition, initialBounds } = dragStateRef.current;
    const deltaX = e.clientX - startPosition.x;
    const deltaY = e.clientY - startPosition.y;
    
    const newX = initialBounds.left + deltaX;
    const newY = initialBounds.top + deltaY;
    
    // Get canvas bounds for relative positioning
    const canvasElement = query.getDropPlaceholder();
    if (!canvasElement) return;
    
    const canvasRect = canvasElement.getBoundingClientRect();
    const relativeX = newX - canvasRect.left;
    const relativeY = newY - canvasRect.top;
    
    // Get snap position
    const snapResult = snapGridSystem.getSnapPosition(
      nodeId,
      relativeX,
      relativeY,
      initialBounds.width,
      initialBounds.height
    );
    
    // Apply snap position if snapped
    if (snapResult.snapped) {
      const snappedClientX = snapResult.x + canvasRect.left;
      const snappedClientY = snapResult.y + canvasRect.top;
      
      // Update element position
      elementRef.current.style.transform = `translate(${snappedClientX - initialBounds.left}px, ${snappedClientY - initialBounds.top}px)`;
    } else {
      // Use original position
      elementRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    }
  }, [nodeId, query]);

  // Handle drag end
  const handleDragEnd = useCallback((e) => {
    if (!dragStateRef.current.isDragging) return;

    dragStateRef.current.isDragging = false;
    
    // Clear snap indicators
    snapGridSystem.clearSnapIndicators();
    
    // Reset transform
    if (elementRef.current) {
      elementRef.current.style.transform = '';
    }

    // Clean up registered elements
    setTimeout(() => {
      snapGridSystem.cleanupTrackedElements();
    }, 100);
  }, []);

  // Set up drag handlers
  const connectDrag = useCallback((element) => {
    if (!element || !enabled) return element;

    elementRef.current = element;
    
    // Register with snap system
    registerElement();
    
    // Set up drag event listeners
    const handleMouseDown = (e) => {
      handleDragStart(e);
      
      const handleMouseMove = (moveEvent) => {
        handleDragMove(moveEvent);
      };
      
      const handleMouseUp = (upEvent) => {
        handleDragEnd(upEvent);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };
    
    element.addEventListener('mousedown', handleMouseDown);
    
    // Store cleanup function
    element._snapCleanup = () => {
      element.removeEventListener('mousedown', handleMouseDown);
      unregisterElement();
    };
    
    return element;
  }, [enabled, registerElement, unregisterElement, handleDragStart, handleDragMove, handleDragEnd]);

  // Enhanced drag connector that includes snap functionality
  const snapDrag = useCallback((element) => {
    if (!element) return element;
    
    // First connect with Craft.js drag
    const craftElement = drag(element);
    
    // Then add snap functionality
    return connectDrag(craftElement);
  }, [drag, connectDrag]);

  // Enhanced connect that includes snap functionality
  const snapConnect = useCallback((element) => {
    if (!element) return element;
    
    // First connect with Craft.js connect
    const craftElement = connect(element);
    
    // Register element for snapping (non-draggable elements can still be snap targets)
    if (craftElement) {
      elementRef.current = craftElement;
      registerElement();
      
      // Store cleanup function
      craftElement._snapCleanup = () => {
        unregisterElement();
      };
    }
    
    return craftElement;
  }, [connect, registerElement, unregisterElement]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (elementRef.current?._snapCleanup) {
        elementRef.current._snapCleanup();
      }
    };
  }, []);

  // Update registration when element changes
  useEffect(() => {
    const updateRegistration = () => {
      registerElement();
    };
    
    const resizeObserver = new ResizeObserver(updateRegistration);
    const mutationObserver = new MutationObserver(updateRegistration);
    
    if (elementRef.current) {
      resizeObserver.observe(elementRef.current);
      mutationObserver.observe(elementRef.current, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
    
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [registerElement]);

  return {
    connectors: {
      connect: snapConnect,
      drag: snapDrag,
      snapConnect,
      snapDrag
    },
    snapEnabled: snapGridSystem.getSettings().snapEnabled,
    gridEnabled: snapGridSystem.getSettings().gridEnabled
  };
};

/**
 * useSnapGridCanvas - Hook for canvas-level snap and grid integration
 * Sets up canvas for snap and grid system
 */
export const useSnapGridCanvas = () => {
  const canvasRef = useRef(null);
  const { query } = useEditor();

  // Initialize snap grid system with canvas
  useEffect(() => {
    const canvas = canvasRef.current || query.getDropPlaceholder();
    if (canvas) {
      snapGridSystem.initialize(canvas);
    }
    
    return () => {
      snapGridSystem.destroy();
    };
  }, [query]);

  // Update canvas bounds on resize
  useEffect(() => {
    const handleResize = () => {
      snapGridSystem.updateCanvasBounds();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setCanvasRef = useCallback((element) => {
    canvasRef.current = element;
    if (element) {
      snapGridSystem.initialize(element);
    }
    return element;
  }, []);

  return {
    setCanvasRef,
    snapGridSystem
  };
};

export default useCraftSnap;
