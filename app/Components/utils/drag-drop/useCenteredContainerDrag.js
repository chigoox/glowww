'use client';

import { useNode, useEditor } from '@craftjs/core';
import { useCallback, useRef, useEffect } from 'react';

/**
 * Custom drag handler that centers components on mouse cursor when switching containers
 * This wraps Craft.js's standard drag functionality to add centering behavior
 */
export const useCenteredContainerDrag = (nodeId) => {
  const { connectors: { drag: originalDrag }, actions: { setProp } } = useNode();
  const { actions, query } = useEditor();
  
  // Monitor parent changes 
  const parent = useNode((node) => node.data.parent);
  const prevParentRef = useRef(parent);
  
  const dragStateRef = useRef({
    isDragging: false,
    startMousePosition: { x: 0, y: 0 },
    originalParent: null,
    componentDimensions: { width: 0, height: 0 }
  });

  // Get component dimensions
  const getComponentDimensions = useCallback(() => {
    try {
      const node = query.node(nodeId);
      if (node && node.dom) {
        const rect = node.dom.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }
    } catch (error) {
      console.warn('Could not get component dimensions:', error);
    }
    return { width: 200, height: 100 }; // Fallback
  }, [query, nodeId]);

  // Calculate centered position in new container
  const calculateCenteredPosition = useCallback((mouseX, mouseY, containerId) => {
    try {
      let containerElement = null;
      
      console.log('🔍 Finding container element for:', { containerId, mouseX, mouseY });
      
      if (containerId === 'ROOT') {
        // Find the main editor canvas
        containerElement = document.querySelector('[data-cy="editor-root"], .craft-renderer, [data-editor="true"]');
        console.log('🔍 ROOT container query result:', containerElement);
        
        if (!containerElement) {
          containerElement = document.querySelector('.flex-1.p-4.overflow-auto.bg-gray-100, .editor-canvas');
          console.log('🔍 Fallback ROOT container query result:', containerElement);
        }
      } else {
        // Get specific container element
        const containerNode = query.node(containerId);
        console.log('🔍 Container node query result:', { containerId, node: containerNode });
        
        if (containerNode && containerNode.dom) {
          containerElement = containerNode.dom;
          console.log('🔍 Container DOM element found:', containerElement);
        }
      }

      if (!containerElement) {
        console.warn('❌ Container element not found, using fallback position', {
          containerId,
          availableSelectors: {
            editorRoot: !!document.querySelector('[data-cy="editor-root"]'),
            dataEditor: !!document.querySelector('[data-editor="true"]'),
            craftRenderer: !!document.querySelector('.craft-renderer'),
            flexContainer: !!document.querySelector('.flex-1.p-4.overflow-auto.bg-gray-100'),
            editorCanvas: !!document.querySelector('.editor-canvas')
          }
        });
        return { x: 50, y: 50 };
      }

      const containerRect = containerElement.getBoundingClientRect();
      const containerStyle = window.getComputedStyle(containerElement);
      const componentDims = dragStateRef.current.componentDimensions;

      // Account for container padding and borders
      const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
      const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
      const borderLeft = parseFloat(containerStyle.borderLeftWidth) || 0;
      const borderTop = parseFloat(containerStyle.borderTopWidth) || 0;

      // Calculate position to center component at mouse position relative to container's content area
      const contentX = mouseX - containerRect.left - paddingLeft - borderLeft;
      const contentY = mouseY - containerRect.top - paddingTop - borderTop;
      
      const centeredX = contentX - (componentDims.width / 2);
      const centeredY = contentY - (componentDims.height / 2);

      // Ensure component stays within container bounds (with some margin)
      const margin = 10;
      const contentWidth = containerRect.width - paddingLeft - paddingLeft - borderLeft - borderLeft;
      const contentHeight = containerRect.height - paddingTop - paddingTop - borderTop - borderTop;
      
      const minX = margin;
      const minY = margin;
      const maxX = Math.max(margin, contentWidth - componentDims.width - margin);
      const maxY = Math.max(margin, contentHeight - componentDims.height - margin);

      const finalX = Math.max(minX, Math.min(centeredX, maxX));
      const finalY = Math.max(minY, Math.min(centeredY, maxY));

      console.log('🎯 Centered position calculated:', {
        mouse: { x: mouseX, y: mouseY },
        componentSize: componentDims,
        containerRect: { 
          left: containerRect.left, 
          top: containerRect.top, 
          width: containerRect.width, 
          height: containerRect.height,
          padding: { left: paddingLeft, top: paddingTop },
          border: { left: borderLeft, top: borderTop }
        },
        contentPosition: { x: contentX, y: contentY },
        centered: { x: centeredX, y: centeredY },
        constrained: { x: finalX, y: finalY },
        bounds: { minX, minY, maxX, maxY },
        coordinateConversion: {
          mouseToContainer: `(${mouseX}, ${mouseY}) -> (${contentX}, ${contentY})`,
          centeredOffset: `Center component at (${centeredX}, ${centeredY})`,
          finalPosition: `Constrained to (${finalX}, ${finalY})`
        }
      });

      return { x: finalX, y: finalY };
    } catch (error) {
      console.error('Error calculating centered position:', error);
      return { x: 50, y: 50 };
    }
  }, [query]);

  // Parent change monitoring useEffect - Only for logging, not for immediate positioning
  useEffect(() => {
    // Check if parent changed (component was moved) - only log occasionally to avoid spam
    if (prevParentRef.current !== null && prevParentRef.current !== parent) {
      // Only log 20% of parent changes to reduce console noise
      if (Math.random() < 0.2) {
        console.log('📦 Parent change detected (logged only, will position on mouse up):', {
          nodeId: nodeId,
          from: prevParentRef.current,
          to: parent,
          hasDragState: dragStateRef.current.isDragging
        });
      }
    }
    
    // Update the ref for next comparison
    prevParentRef.current = parent;
  }, [parent, nodeId]);

  // Enhanced drag connector that centers on container switch
  const centeredDrag = useCallback((element) => {
    if (!element) {
      console.log('⚠️ centeredDrag called with null element');
      return element;
    }

    // Prevent multiple setups on the same element
    if (element._hasCustomDragSetup) {
      // Reduce logging frequency for already setup elements
      if (Math.random() < 0.05) { // Only log 5% of the time
        console.log('🔧 Element already has drag setup, skipping:', nodeId);
      }
      return originalDrag(element);
    }

    console.log('🔗 Setting up centeredDrag for element:', element, 'nodeId:', nodeId);

    // First apply the original Craft.js drag connector
    const connectedElement = originalDrag(element);
    
    // Create a persistent backup of drag info that survives Craft.js interference
    const persistentDragInfo = {
      nodeId: nodeId,
      startTime: Date.now()
    };

    // Track active listeners to prevent duplicates
    let activeDragListeners = null;

    // Add our custom drag start handler
    const handleMouseDown = (e) => {
      // Prevent multiple drag operations
      if (dragStateRef.current.isDragging) {
        console.log('🚫 Drag already in progress, ignoring mousedown');
        return;
      }

      // Prevent event bubbling to avoid conflicts with Craft.js
      e.stopPropagation();

      console.log('🚀 MouseDown detected on MOVE handle!', {
        target: e.target,
        nodeId: nodeId,
        element: element
      });
      
      // Store initial state (no immediate positioning)
      const currentNode = query.node(nodeId).get();
      dragStateRef.current = {
        isDragging: true,
        startMousePosition: { x: e.clientX, y: e.clientY },
        currentMousePosition: { x: e.clientX, y: e.clientY },
        originalParent: currentNode.data.parent,
        componentDimensions: getComponentDimensions(),
        mouseMoveCount: 0,
        dragStartTime: Date.now(),
        // Store the nodeId to ensure we can always reference it
        nodeId: nodeId
      };

      console.log('🚀 Starting centered drag for:', nodeId, {
        originalParent: dragStateRef.current.originalParent,
        dimensions: dragStateRef.current.componentDimensions,
        startPosition: dragStateRef.current.startMousePosition,
        element: element,
        dragStartTime: dragStateRef.current.dragStartTime
      });

      // Add periodic check to ensure drag state remains intact
      const dragStateMonitor = setInterval(() => {
        try {
          if (dragStateRef.current.isDragging) {
            console.log('📊 Drag state check:', {
              isDragging: dragStateRef.current.isDragging,
              elapsedTime: Date.now() - dragStateRef.current.dragStartTime,
              currentMousePos: dragStateRef.current.currentMousePosition,
              hasActiveDragListeners: !!activeDragListeners
            });
          } else {
            console.log('⏹️ Drag state cleared externally');
            clearInterval(dragStateMonitor);
          }
        } catch (monitorError) {
          console.log('⚠️ Drag state monitor error (clearing):', monitorError.message);
          clearInterval(dragStateMonitor);
        }
      }, 1000);
      
      // Clean up monitor after 10 seconds
      setTimeout(() => {
        clearInterval(dragStateMonitor);
      }, 10000);

      // Track mouse movement during drag for final positioning calculation
      const handleMouseMove = (moveEvent) => {
        if (dragStateRef.current.isDragging) {
          // Only track mouse position - don't apply positioning during drag
          const newMousePos = { 
            x: moveEvent.clientX, 
            y: moveEvent.clientY 
          };
          dragStateRef.current.currentMousePosition = newMousePos;
          
          // Reduce logging to prevent console spam
          if (!dragStateRef.current.mouseMoveCount) dragStateRef.current.mouseMoveCount = 0;
          dragStateRef.current.mouseMoveCount++;
          
          if (dragStateRef.current.mouseMoveCount % 200 === 0) {
            console.log('🖱️ Mouse tracking (no positioning):', newMousePos);
          }
        }
      };

      const handleMouseUp = (mouseUpEvent) => {
        console.log('🏁 Mouse up event received:', {
          mouseX: mouseUpEvent.clientX,
          mouseY: mouseUpEvent.clientY,
          isDragging: dragStateRef.current.isDragging,
          dragState: dragStateRef.current,
          hasActiveDragListeners: !!activeDragListeners
        });
        
        // Always process mouseUp if we have listeners, regardless of drag state
        // Craft.js may have cleared our state, but we still need to apply positioning
        if (!activeDragListeners) {
          console.log('⚠️ MouseUp ignored - no active listeners');
          return;
        }
        
        console.log('✅ Processing mouseUp - applying final positioning');
        
        // Use the persistent node ID in case drag state was cleared
        const targetNodeId = dragStateRef.current.nodeId || persistentDragInfo.nodeId || nodeId;
        
        // Use the current mouse position from the mouse up event
        const finalMousePosition = {
          x: mouseUpEvent.clientX,
          y: mouseUpEvent.clientY
        };
        
        // Immediately cleanup listeners to prevent duplicates
        document.removeEventListener('mousemove', activeDragListeners.move);
        document.removeEventListener('mouseup', activeDragListeners.up);
        activeDragListeners = null;
        
        // Apply positioning regardless of drag state (since Craft.js may have cleared it)
        // Use a timeout to ensure Craft.js has finished its operations
        setTimeout(() => {
          try {
            console.log('🔍 Applying final position after Craft.js operations...');
            
            // Get current node state after Craft.js operations using persistent node ID
            const currentNode = query.node(targetNodeId).get();
            const currentParent = currentNode.data.parent;
            
            console.log('🔍 Final container state:', {
              nodeId: targetNodeId,
              currentParent: currentParent,
              originalParent: dragStateRef.current.originalParent,
              hasContainerChanged: currentParent !== dragStateRef.current.originalParent,
              finalMousePosition: finalMousePosition
            });

            // Calculate position relative to the current parent container
            let containerElement = null;
            let containerRect = null;

            if (currentParent === 'ROOT') {
              // For ROOT parent, find the main editor canvas
              containerElement = document.querySelector('[data-cy="editor-root"], .craft-renderer, [data-editor="true"]');
              if (!containerElement) {
                containerElement = document.querySelector('.w-full.h-full.min-h-\\[100vh\\]');
              }
              if (!containerElement) {
                // Fallback: try to find the Frame element
                containerElement = document.querySelector('[data-page-id]');
              }
            } else {
              // Get specific parent container element
              try {
                const parentNode = query.node(currentParent);
                if (parentNode && parentNode.dom) {
                  containerElement = parentNode.dom;
                }
              } catch (parentNodeError) {
                console.warn('⚠️ Error getting parent node DOM:', parentNodeError.message);
              }
            }

            if (containerElement) {
              containerRect = containerElement.getBoundingClientRect();
              
              // Calculate position relative to parent container
              const relativeX = finalMousePosition.x - containerRect.left;
              const relativeY = finalMousePosition.y - containerRect.top;
              
              console.log('📍 Calculated final relative position:', {
                mousePosition: finalMousePosition,
                containerRect: { left: containerRect.left, top: containerRect.top, width: containerRect.width, height: containerRect.height },
                relativePosition: { x: relativeX, y: relativeY },
                parentId: currentParent,
                containerElement: containerElement.tagName + (containerElement.className ? '.' + containerElement.className.split(' ')[0] : '')
              });
              
              // Apply the relative position with additional error handling
              try {
                actions.setProp(targetNodeId, (props) => {
                  props.position = 'absolute';
                  props.left = Math.max(0, relativeX); // Ensure not negative
                  props.top = Math.max(0, relativeY);  // Ensure not negative
                  
                  console.log('✅ Applied final position successfully:', {
                    nodeId: targetNodeId,
                    x: Math.max(0, relativeX),
                    y: Math.max(0, relativeY),
                    parentContainer: currentParent,
                    coordinateSystem: `Relative to parent "${currentParent}"`
                  });
                });
              } catch (setPropError) {
                console.error('❌ Error setting props:', setPropError.message);
                throw setPropError;
              }
            } else {
              console.warn('⚠️ Could not find parent container, using viewport coordinates');
              // Fallback to viewport coordinates
              try {
                actions.setProp(targetNodeId, (props) => {
                  props.position = 'absolute';
                  props.left = finalMousePosition.x;
                  props.top = finalMousePosition.y;
                  
                  console.log('⚠️ Applied fallback viewport position:', {
                    nodeId: targetNodeId,
                    x: finalMousePosition.x,
                    y: finalMousePosition.y,
                    reason: 'Container element not found'
                  });
                });
              } catch (fallbackError) {
                console.error('❌ Error setting fallback props:', fallbackError.message);
                throw fallbackError;
              }
            }
            
            // Reset drag state after successful positioning
            dragStateRef.current.isDragging = false;
            
          } catch (error) {
            console.error('❌ Error applying final position:', error);
            // Reset drag state even on error
            dragStateRef.current.isDragging = false;
          }
        }, 50); // Small delay to let Craft.js complete its operations
      };

      // Store listener references to prevent duplicates
      activeDragListeners = {
        move: handleMouseMove,
        up: handleMouseUp
      };

      // Add global event listeners with explicit verification
      console.log('🔧 Attaching global event listeners...');
      document.addEventListener('mousemove', activeDragListeners.move, { passive: false });
      document.addEventListener('mouseup', activeDragListeners.up, { passive: false });
      
      // Verify listeners are attached
      setTimeout(() => {
        const hasMouseMoveListener = document.onmousemove !== null || 
          document.getEventListeners?.('mousemove')?.length > 0;
        const hasMouseUpListener = document.onmouseup !== null || 
          document.getEventListeners?.('mouseup')?.length > 0;
        
        console.log('🔍 Event listener verification:', {
          mouseMoveAttached: !!activeDragListeners.move,
          mouseUpAttached: !!activeDragListeners.up,
          globalMouseMove: hasMouseMoveListener,
          globalMouseUp: hasMouseUpListener,
          activeDragListenersExists: !!activeDragListeners
        });
      }, 10);
      
      // Add a simple test listener to verify mouseUp events are working globally
      const testMouseUpListener = (e) => {
        console.log('🧪 Global test mouseUp received at:', { x: e.clientX, y: e.clientY, timestamp: Date.now() });
      };
      document.addEventListener('mouseup', testMouseUpListener, { passive: false });
      
      // Clean up test listener after 10 seconds
      setTimeout(() => {
        document.removeEventListener('mouseup', testMouseUpListener);
        console.log('🧪 Test mouseUp listener removed');
      }, 10000);
      
      console.log('🎯 Global mouse listeners attached:', {
        mouseMove: true,
        mouseUp: true,
        startPosition: dragStateRef.current.startMousePosition,
        listeners: {
          mouseMoveAttached: !!activeDragListeners.move,
          mouseUpAttached: !!activeDragListeners.up
        }
      });
    };

    // Add our mousedown handler to the element
    element.addEventListener('mousedown', handleMouseDown);
    element._hasCustomDragSetup = true;

    console.log('🔧 Event listeners setup complete for element:', {
      element: element,
      nodeId: nodeId,
      hasMouseDown: true
    });

    // Store cleanup function
    const originalCleanup = element._craftCleanup;
    element._craftCleanup = () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element._hasCustomDragSetup = false;
      
      // Cleanup any active drag listeners
      if (activeDragListeners) {
        document.removeEventListener('mousemove', activeDragListeners.move);
        document.removeEventListener('mouseup', activeDragListeners.up);
        activeDragListeners = null;
      }
      
      if (originalCleanup) originalCleanup();
    };

    return connectedElement;
  }, [originalDrag, nodeId, query, actions, getComponentDimensions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dragStateRef.current.isDragging) {
        dragStateRef.current.isDragging = false;
      }
    };
  }, []);

  return {
    centeredDrag
  };
};
