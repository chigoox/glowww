'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEditor, useNode } from '@craftjs/core';
import { snapGridSystem } from './SnapGridSystem';

/**
 * useCraftSnap - Hook to integrate snap and grid system with Craft.js
 * Provides snapping functionality for draggable elements
 * 
 * NOTE: Currently, snap functionality works best with the snapConnect (selection)
 * For position handle dragging, Craft.js handles the drag internally and doesn't
 * expose drag events that we can hook into for real-time snapping.
 * 
 * The snapDrag connector registers elements as snap targets but doesn't provide
 * live snapping during Craft.js drag operations.
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

  // Early return if nodeId is not available yet
  if (!nodeId) {
    return {
      connectors: {
        snapConnect: connect,
        snapDrag: drag
      }
    };
  }

  // Register element with snap system
  const registerElement = useCallback(() => {
    if (elementRef.current && nodeId) {
      try {
        const bounds = elementRef.current.getBoundingClientRect();
        
        // Try multiple methods to find the canvas/container element
        let canvasElement = null;
        
        try {
          // Method 1: Try Craft.js getDropPlaceholder
          canvasElement = query.getDropPlaceholder();
        } catch (e) {
          // Method 1 failed, try alternative approaches
        }
        
        if (!canvasElement) {
          // Method 2: Find the closest editor container
          const editorContainer = elementRef.current.closest('[data-cy="editor-root"], [data-editor="true"], .editor-canvas, .craft-renderer');
          if (editorContainer) {
            canvasElement = editorContainer;
          }
        }
        
        if (!canvasElement) {
          // Method 3: Find by looking for common editor class patterns
          const possibleContainers = document.querySelectorAll(
            '[data-cy*="editor"], [class*="editor"], [class*="canvas"], [class*="craft"]'
          );
          if (possibleContainers.length > 0) {
            canvasElement = possibleContainers[0];
          }
        }
        
        if (!canvasElement) {
          // Method 4: Use viewport as fallback
          canvasElement = document.body;
        }
        
        if (canvasElement) {
          const canvasBounds = canvasElement.getBoundingClientRect();
          // Convert to canvas-relative coordinates
          const relativeBounds = {
            x: bounds.left - canvasBounds.left,
            y: bounds.top - canvasBounds.top,
            width: bounds.width,
            height: bounds.height
          };
          
          snapGridSystem.registerElement(nodeId, elementRef.current, relativeBounds);
        }
      } catch (error) {
        console.warn('Failed to register element for snapping:', error);
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
      if (id !== nodeId && node && node.dom) {
        try {
          const nodeBounds = node.dom.getBoundingClientRect();
          
          // Use the same robust canvas detection as registerElement
          let canvasElement = null;
          
          try {
            canvasElement = query.getDropPlaceholder();
          } catch (e) {
            // Fallback methods
            canvasElement = node.dom.closest('[data-cy="editor-root"], [data-editor="true"], .editor-canvas, .craft-renderer') || document.body;
          }
          
          if (canvasElement) {
            const canvasBounds = canvasElement.getBoundingClientRect();
            const relativeBounds = {
              x: nodeBounds.left - canvasBounds.left,
              y: nodeBounds.top - canvasBounds.top,
              width: nodeBounds.width,
              height: nodeBounds.height
            };
            
            snapGridSystem.registerElement(id, node.dom, relativeBounds);
          }
        } catch (error) {
          console.warn(`Failed to register element ${id} for snapping:`, error);
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

  // Enhanced drag connector that integrates with Craft.js drag system
  const snapDrag = useCallback((element) => {
    if (!element) return element;
    
    // Only use Craft.js drag - no custom drag handling for position handle
    const craftElement = drag(element);
    
    // Register element for snapping (as a target for other elements)
    if (craftElement) {
      elementRef.current = craftElement;
      registerElement();
      
      // Store cleanup function
      craftElement._snapCleanup = () => {
        unregisterElement();
      };
    }
    
    return craftElement;
  }, [drag, registerElement, unregisterElement]);

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
    let canvas = canvasRef.current;
    
    if (!canvas) {
      try {
        canvas = query.getDropPlaceholder();
      } catch (error) {
        console.warn('Could not get drop placeholder from Craft.js, using fallback canvas detection');
        // Fallback: find editor canvas by data attributes
        canvas = document.querySelector('[data-cy="editor-root"], [data-editor="true"]');
      }
    }
    
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
