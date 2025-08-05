'use client';

import { useEditor } from "@craftjs/core";
import { useCallback, useEffect } from "react";

/**
 * Container Switching Visual Feedback System
 * 
 * Provides visual feedback when dragging elements between containers using Craft.js MOVE functionality
 */
export const useContainerSwitchingFeedback = () => {
  const { query } = useEditor();

  // Highlight container during Craft.js drag operations
  const highlightContainer = useCallback((containerId) => {
    // Remove existing highlights
    document.querySelectorAll('.container-switch-highlight').forEach(el => {
      el.classList.remove('container-switch-highlight');
    });

    if (containerId && containerId !== 'ROOT') {
      try {
        const containerNode = query.node(containerId);
        if (containerNode && containerNode.dom) {
          containerNode.dom.classList.add('container-switch-highlight');
        }
      } catch (error) {
        console.warn('Could not highlight container:', error);
      }
    } else if (containerId === 'ROOT') {
      // Highlight the root editor area
      const rootElement = document.querySelector('[data-cy="editor-root"], [data-editor="true"], .craft-renderer');
      if (rootElement) {
        rootElement.classList.add('container-switch-highlight');
      }
    }
  }, [query]);

  // Remove container highlight
  const removeContainerHighlight = useCallback(() => {
    document.querySelectorAll('.container-switch-highlight').forEach(el => {
      el.classList.remove('container-switch-highlight');
    });
  }, []);

  // Find container at mouse position
  const findContainerAtPosition = useCallback((mouseX, mouseY) => {
    const elements = document.elementsFromPoint(mouseX, mouseY);
    
    // First, try to find any canvas container (Box with canvas: true)
    for (const element of elements) {
      const nodeId = element.getAttribute('data-craft-node-id');
      if (nodeId && nodeId !== 'ROOT') {
        try {
          const node = query.node(nodeId);
          if (node.isCanvas()) {
            return nodeId;
          }
        } catch (error) {
          // Ignore non-existent nodes
        }
      }
    }
    
    // If no canvas container found, use ROOT as the main canvas
    return 'ROOT';
  }, [query]);

  // Set up event listeners for Craft.js drag operations
  useEffect(() => {
    let isDragging = false;
    let currentHighlightedContainer = null;

    const handleMouseMove = (e) => {
      // Only handle during Craft.js drag operations
      if (!isDragging) return;

      const targetContainer = findContainerAtPosition(e.clientX, e.clientY);
      
      // Only update highlight if container changed
      if (targetContainer !== currentHighlightedContainer) {
        highlightContainer(targetContainer);
        currentHighlightedContainer = targetContainer;
      }
    };

    const handleDragStart = (e) => {
      // Check if this is a Craft.js MOVE operation
      const dragElement = e.target.closest('[data-craft-node-id]');
      const moveHandle = e.target.closest('.snap-position-handle') || 
                        e.target.textContent?.includes('MOVE') || 
                        e.target.closest('[title*="move"]');
      
      if (dragElement && !moveHandle) {
        // This is a Craft.js drag operation (not position handle)
        isDragging = true;
        console.log('🚚 Container switching drag started');
      }
    };

    const handleDragEnd = () => {
      if (isDragging) {
        isDragging = false;
        currentHighlightedContainer = null;
        
        // Clean up highlights after a brief delay
        setTimeout(() => {
          removeContainerHighlight();
        }, 300);
        
        console.log('🚚 Container switching drag ended');
      }
    };

    const handleDragOver = (e) => {
      if (isDragging) {
        e.preventDefault(); // Allow drop
      }
    };

    // Add event listeners
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      
      // Clean up any remaining highlights
      removeContainerHighlight();
    };
  }, [findContainerAtPosition, highlightContainer, removeContainerHighlight]);

  return {
    highlightContainer,
    removeContainerHighlight
  };
};
