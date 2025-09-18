'use client';

import { useNode, useEditor } from '@craftjs/core';
import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook for components to automatically position themselves when moved to a new container
 * Each component monitors its own parent changes and self-corrects position
 */
export const useAutoPositionOnContainerSwitch = (nodeId) => {
  const { actions, query } = useEditor();
  const { 
    actions: { setProp },
    dom,
    parent
  } = useNode((node) => ({
    dom: node.dom,
    parent: node.data.parent
  }));
  
  // Track previous parent to detect container switches
  const prevParentRef = useRef(parent);
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const isInitialMount = useRef(true);

  // Respect SnapPositionHandle POS drags: stand down while active
  const isPosDragActive = useCallback(() => {
    try {
      if (typeof window === 'undefined') return false;
      return !!window.__GLOW_POS_DRAGGING || document.documentElement.hasAttribute('data-glow-pos-drag');
    } catch (_) {
      return false;
    }
  }, []);
  
  // Track global mouse position during move operations
  useEffect(() => {
    const updateMousePosition = (e) => {
      if (isPosDragActive()) return;
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
      console.log('📍 Mouse position updated:', { x: e.clientX, y: e.clientY });
    };
    
    // Only track during potential move operations
    const handleMouseDown = (e) => {
      if (isPosDragActive()) return;
      console.log('🖱️ MouseDown detected, checking target:', e.target);
      
      // Check if this is a MOVE handle operation with the exact selectors used in components
      const isMoveHandle = e.target?.closest('.move-handle, [data-handle-type="move"], [data-handle="move"]') ||
                          e.target?.classList?.contains('move-handle') ||
                          e.target?.getAttribute('data-handle-type') === 'move' ||
                          e.target?.getAttribute('data-handle') === 'move';
      
      console.log('🔍 MOVE handle detection:', {
        isMoveHandle,
        targetElement: e.target,
        targetClass: e.target?.className,
        dataHandleType: e.target?.getAttribute('data-handle-type'),
        dataHandle: e.target?.getAttribute('data-handle'),
        closestMoveHandle: e.target?.closest('.move-handle, [data-handle-type="move"]'),
        classList: Array.from(e.target?.classList || [])
      });
      
      if (isMoveHandle) {
        console.log('🎯 MOVE handle detected - starting mouse tracking for node:', nodeId);
        // Start tracking mouse position for potential container switches
        document.addEventListener('mousemove', updateMousePosition, { passive: true });
        
        // Stop tracking after a reasonable time
        setTimeout(() => {
          document.removeEventListener('mousemove', updateMousePosition);
          console.log('⏰ Mouse tracking timeout for node:', nodeId);
        }, 5000);
      } else {
        console.log('❌ Not a MOVE handle - skipping mouse tracking');
      }
    };
    
    const handleMouseUp = () => {
      // Keep the last position for a brief moment in case container switch happens
      setTimeout(() => {
        document.removeEventListener('mousemove', updateMousePosition);
      }, 100);
    };
    
  document.addEventListener('mousedown', handleMouseDown);
  document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', updateMousePosition);
    };
  }, [isPosDragActive]);
  
  // Calculate position relative to new container
  const calculateRelativePosition = useCallback((mouseX, mouseY, newParentId) => {
    try {
      let containerElement = null;
      
      console.log('🔍 Finding container element for parent:', newParentId);
      
      if (newParentId === 'ROOT') {
        // Find the main editor canvas for ROOT
        containerElement = document.querySelector('[data-cy="editor-root"], .craft-renderer, [data-editor="true"]');
        if (!containerElement) {
          containerElement = document.querySelector('[data-page-id]');
        }
        if (!containerElement) {
          containerElement = document.querySelector('.w-full.h-full.min-h-\\[100vh\\]');
        }
        console.log('📍 ROOT container element found:', containerElement);
      } else {
        // Get specific parent container element
        try {
          const parentNode = query.node(newParentId);
          if (parentNode && parentNode.dom) {
            containerElement = parentNode.dom;
            console.log('📦 Container element found via Craft.js:', {
              nodeId: newParentId,
              element: containerElement,
              tagName: containerElement.tagName,
              className: containerElement.className
            });
          }
        } catch (error) {
          console.warn('Error getting parent node DOM:', error);
        }
      }
      
      if (!containerElement) {
        console.warn('❌ Container element not found for parent:', newParentId);
        return { x: 50, y: 50 }; // Fallback position
      }
      
      const containerRect = containerElement.getBoundingClientRect();
      const containerStyle = window.getComputedStyle(containerElement);
      
      console.log('📐 Container info:', {
        rect: containerRect,
        position: containerStyle.position,
        padding: {
          left: containerStyle.paddingLeft,
          top: containerStyle.paddingTop
        }
      });
      
      // Account for container padding
      const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
      const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
      
      // Calculate position relative to container's content area
      const relativeX = mouseX - containerRect.left - paddingLeft;
      const relativeY = mouseY - containerRect.top - paddingTop;
      
      // For containers, we want to position relative to the container, not viewport
      // But ensure we're within reasonable bounds
      const minX = 0; // Allow positioning at container edge
      const minY = 0;
      const maxX = Math.max(50, containerRect.width - paddingLeft * 2 - 50); // Leave some space
      const maxY = Math.max(50, containerRect.height - paddingTop * 2 - 50);
      
      const finalX = Math.max(minX, Math.min(relativeX, maxX));
      const finalY = Math.max(minY, Math.min(relativeY, maxY));
      
      console.log('🎯 Position calculation breakdown:', {
        nodeId,
        newParentId,
        mousePosition: { x: mouseX, y: mouseY },
        containerRect: { 
          left: containerRect.left, 
          top: containerRect.top, 
          width: containerRect.width, 
          height: containerRect.height 
        },
        padding: { left: paddingLeft, top: paddingTop },
        calculations: {
          rawRelativeX: mouseX - containerRect.left,
          rawRelativeY: mouseY - containerRect.top,
          withPaddingX: relativeX,
          withPaddingY: relativeY,
          bounds: { minX, minY, maxX, maxY },
          finalX,
          finalY
        },
        containerType: newParentId === 'ROOT' ? 'ROOT' : 'Container'
      });
      
      return { x: finalX, y: finalY };
    } catch (error) {
      console.error('❌ Error calculating relative position:', error);
      return { x: 50, y: 50 };
    }
  }, [query, nodeId]);
  
  // Monitor parent changes and auto-correct position
  useEffect(() => {
    console.log('🔍 Parent change effect triggered for node:', nodeId, {
      isInitialMount: isInitialMount.current,
      prevParent: prevParentRef.current,
      currentParent: parent,
      hasChanged: prevParentRef.current !== parent
    });
    
    // Skip the initial mount
    if (isInitialMount.current) {
      console.log('⏭️ Skipping initial mount for node:', nodeId);
      isInitialMount.current = false;
      prevParentRef.current = parent;
      return;
    }
    
    // Check if parent actually changed
    if (prevParentRef.current !== parent) {
      if (isPosDragActive()) {
        prevParentRef.current = parent;
        return;
      }
      const oldParent = prevParentRef.current;
      const newParent = parent;
      
      console.log('🔄 Container switch detected by component:', {
        nodeId,
        from: oldParent,
        to: newParent,
        lastMousePosition: lastMousePosition.current,
        hasValidMousePosition: lastMousePosition.current.x > 0 && lastMousePosition.current.y > 0
      });
      
      // Wait longer to let useCenteredContainerDrag do its positioning first
      // Then check if we need to apply relative positioning correction
      setTimeout(() => {
        try {
          const mousePos = lastMousePosition.current;
          
          console.log('🎯 Checking if position correction needed after centered drag:', {
            nodeId,
            mousePosition: mousePos,
            hasValidPosition: mousePos.x > 0 && mousePos.y > 0
          });
          
          // Only apply position correction if we have a reasonable mouse position
          // AND if useCenteredContainerDrag didn't already handle it properly
          if (mousePos.x > 0 && mousePos.y > 0) {
            
            // Check current node positioning after useCenteredContainerDrag
            const currentNode = query.node(nodeId);
            if (currentNode) {
              const currentProps = currentNode.get().data.props;
              const currentDom = currentNode.get().dom;
              
              console.log('🔍 Current node state after centered drag:', {
                nodeId,
                props: {
                  position: currentProps.position,
                  left: currentProps.left,
                  top: currentProps.top
                },
                domStyle: currentDom ? {
                  position: currentDom.style.position,
                  left: currentDom.style.left,
                  top: currentDom.style.top
                } : null
              });
              
              // If centered drag already positioned it (has absolute position with coordinates)
              if (currentProps.position === 'absolute' && 
                  (currentProps.left !== undefined || currentProps.top !== undefined)) {
                
                console.log('✅ useCenteredContainerDrag already positioned element, converting to relative positioning');
                
                // Convert the absolute position to container-relative position
                const newPosition = calculateRelativePosition(mousePos.x, mousePos.y, newParent);
                
                console.log('🔄 Converting absolute to container-relative positioning:', {
                  nodeId,
                  oldParent,
                  newParent,
                  mousePosition: mousePos,
                  absolutePosition: { left: currentProps.left, top: currentProps.top },
                  newRelativePosition: newPosition
                });
                
                // Apply container-relative position
                setProp((props) => {
                  props.position = 'absolute';
                  props.left = newPosition.x;
                  props.top = newPosition.y;
                  
                  // Remove any transform that might interfere
                  if (props.transform) {
                    delete props.transform;
                  }
                  
                  console.log('📝 Props updated to container-relative positioning:', {
                    nodeId,
                    position: 'absolute',
                    left: newPosition.x,
                    top: newPosition.y,
                    removedTransform: !!props.transform
                  });
                });
                
                // Also update DOM directly for immediate visual feedback
                if (currentDom) {
                  currentDom.style.position = 'absolute';
                  currentDom.style.left = `${newPosition.x}px`;
                  currentDom.style.top = `${newPosition.y}px`;
                  currentDom.style.transform = '';
                  
                  console.log('🎨 DOM updated to container-relative positioning:', {
                    nodeId,
                    element: currentDom,
                    position: currentDom.style.position,
                    left: currentDom.style.left,
                    top: currentDom.style.top
                  });
                }
                
              } else {
                console.log('⚠️ No positioning detected from useCenteredContainerDrag, applying fresh positioning');
                
                // useCenteredContainerDrag didn't position it, so we do it
                const newPosition = calculateRelativePosition(mousePos.x, mousePos.y, newParent);
                
                console.log('✅ Applying fresh container-relative positioning:', {
                  nodeId,
                  oldParent,
                  newParent,
                  mousePosition: mousePos,
                  newPosition
                });
                
                setProp((props) => {
                  props.position = 'absolute';
                  props.left = newPosition.x;
                  props.top = newPosition.y;
                  
                  if (props.transform) {
                    delete props.transform;
                  }
                });
                
                if (currentDom) {
                  currentDom.style.position = 'absolute';
                  currentDom.style.left = `${newPosition.x}px`;
                  currentDom.style.top = `${newPosition.y}px`;
                  currentDom.style.transform = '';
                }
              }
            }
            
          } else {
            console.log('⚠️ No valid mouse position for container switch correction:', {
              nodeId,
              mousePosition: mousePos,
              reason: 'Mouse coordinates are 0 or negative'
            });
            
            // Apply a default position if no mouse position is available
            const defaultPosition = { x: 50, y: 50 };
            console.log('🔧 Applying default position (no valid mouse coords):', {
              defaultPosition,
              reason: 'Invalid mouse position',
              mousePos
            });
            
            setProp((props) => {
              props.position = 'absolute';
              props.left = defaultPosition.x;
              props.top = defaultPosition.y;
              
              if (props.transform) {
                delete props.transform;
              }
            });
            
            if (dom) {
              dom.style.position = 'absolute';
              dom.style.left = `${defaultPosition.x}px`;
              dom.style.top = `${defaultPosition.y}px`;
              dom.style.transform = '';
            }
          }
        } catch (error) {
          console.error('❌ Error applying container switch correction:', error);
        }
      }, 200); // Wait 200ms to let useCenteredContainerDrag complete (it uses 50ms delay)
      
      // Update the ref for next comparison
      prevParentRef.current = parent;
    } else {
      console.log('➡️ No parent change detected for node:', nodeId);
    }
  }, [parent, nodeId, calculateRelativePosition, setProp, dom, query, isPosDragActive]);
  
  // Return useful info for debugging
  return {
    currentParent: parent,
    previousParent: prevParentRef.current,
    lastMousePosition: lastMousePosition.current,
    hasParentChanged: prevParentRef.current !== parent
  };
};
