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
  
  // Track global mouse position during move operations
  useEffect(() => {
    const updateMousePosition = (e) => {
      lastMousePosition.current = { x: e.clientX, y: e.clientY };
    };
    
    // Only track during potential move operations
    const handleMouseDown = (e) => {
      // Check if this is a MOVE handle operation
      const isMoveHandle = e.target?.closest('[data-handle="move"], .move-handle, [title*="Move"]');
      if (isMoveHandle) {
        // Start tracking mouse position for potential container switches
        document.addEventListener('mousemove', updateMousePosition, { passive: true });
        
        // Stop tracking after a reasonable time
        setTimeout(() => {
          document.removeEventListener('mousemove', updateMousePosition);
        }, 5000);
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
  }, []);
  
  // Calculate position relative to new container
  const calculateRelativePosition = useCallback((mouseX, mouseY, newParentId) => {
    try {
      let containerElement = null;
      
      if (newParentId === 'ROOT') {
        // Find the main editor canvas for ROOT
        containerElement = document.querySelector('[data-cy="editor-root"], .craft-renderer, [data-editor="true"]');
        if (!containerElement) {
          containerElement = document.querySelector('[data-page-id]');
        }
        if (!containerElement) {
          containerElement = document.querySelector('.w-full.h-full.min-h-\\[100vh\\]');
        }
      } else {
        // Get specific parent container element
        try {
          const parentNode = query.node(newParentId);
          if (parentNode && parentNode.dom) {
            containerElement = parentNode.dom;
          }
        } catch (error) {
          console.warn('Error getting parent node DOM:', error);
        }
      }
      
      if (!containerElement) {
        console.warn('Container element not found for parent:', newParentId);
        return { x: 50, y: 50 }; // Fallback position
      }
      
      const containerRect = containerElement.getBoundingClientRect();
      const containerStyle = window.getComputedStyle(containerElement);
      
      // Account for container padding
      const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
      const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
      
      // Calculate position relative to container's content area
      const relativeX = mouseX - containerRect.left - paddingLeft;
      const relativeY = mouseY - containerRect.top - paddingTop;
      
      // Ensure position is within container bounds
      const minX = 10;
      const minY = 10;
      const maxX = Math.max(minX, containerRect.width - paddingLeft * 2 - 100); // Leave space for component
      const maxY = Math.max(minY, containerRect.height - paddingTop * 2 - 50);
      
      const finalX = Math.max(minX, Math.min(relativeX, maxX));
      const finalY = Math.max(minY, Math.min(relativeY, maxY));
      
      console.log('🎯 Calculated position for container switch:', {
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
        relativePosition: { x: relativeX, y: relativeY },
        finalPosition: { x: finalX, y: finalY },
        containerType: newParentId === 'ROOT' ? 'ROOT' : 'Container'
      });
      
      return { x: finalX, y: finalY };
    } catch (error) {
      console.error('Error calculating relative position:', error);
      return { x: 50, y: 50 };
    }
  }, [query, nodeId]);
  
  // Monitor parent changes and auto-correct position
  useEffect(() => {
    // Skip the initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevParentRef.current = parent;
      return;
    }
    
    // Check if parent actually changed
    if (prevParentRef.current !== parent) {
      const oldParent = prevParentRef.current;
      const newParent = parent;
      
      console.log('🔄 Container switch detected by component:', {
        nodeId,
        from: oldParent,
        to: newParent,
        lastMousePosition: lastMousePosition.current
      });
      
      // Apply position correction after a brief delay to ensure Craft.js operations are complete
      setTimeout(() => {
        try {
          const mousePos = lastMousePosition.current;
          
          // Only apply position correction if we have a reasonable mouse position
          if (mousePos.x > 0 && mousePos.y > 0) {
            const newPosition = calculateRelativePosition(mousePos.x, mousePos.y, newParent);
            
            console.log('✅ Applying self-correction for container switch:', {
              nodeId,
              oldParent,
              newParent,
              mousePosition: mousePos,
              newPosition
            });
            
            // Apply the position correction
            setProp((props) => {
              props.position = 'absolute';
              props.left = newPosition.x;
              props.top = newPosition.y;
            });
            
            // Also update DOM directly for immediate visual feedback
            if (dom) {
              dom.style.position = 'absolute';
              dom.style.left = `${newPosition.x}px`;
              dom.style.top = `${newPosition.y}px`;
            }
          } else {
            console.log('⚠️ No valid mouse position for container switch correction');
          }
        } catch (error) {
          console.error('Error applying container switch correction:', error);
        }
      }, 100); // Small delay to ensure Craft.js operations complete
      
      // Update the ref for next comparison
      prevParentRef.current = parent;
    }
  }, [parent, nodeId, calculateRelativePosition, setProp, dom]);
  
  // Return useful info for debugging
  return {
    currentParent: parent,
    previousParent: prevParentRef.current,
    lastMousePosition: lastMousePosition.current,
    hasParentChanged: prevParentRef.current !== parent
  };
};
