'use client';

import React from "react";
import { useEditor } from "@craftjs/core";
import { useCallback, useRef, useEffect } from "react";

/**
 * Enhanced drag-drop system for NEW component placement from ToolBox
 * This only applies to new components being created, not existing component movement
 */
export const useEnhancedNewComponentDrop = () => {
  const { actions, query } = useEditor();
  const dragStateRef = useRef({
    isDragging: false,
    draggedElement: null,
    draggedComponent: null,
    mousePosition: { x: 0, y: 0 },
    targetContainer: null,
    visualFeedback: null
  });

  // Visual feedback for drop preview
  const createDropPreview = useCallback((mouseX, mouseY, component) => {
    // Remove existing preview
    const existingPreview = document.getElementById('enhanced-drop-preview');
    if (existingPreview) {
      existingPreview.remove();
    }

    // Create new preview element
    const preview = document.createElement('div');
    preview.id = 'enhanced-drop-preview';
    preview.style.cssText = `
      position: fixed;
      left: ${mouseX - 50}px;
      top: ${mouseY - 25}px;
      width: 100px;
      height: 50px;
      background: rgba(24, 144, 255, 0.2);
      border: 2px dashed #1890ff;
      border-radius: 4px;
      pointer-events: none;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #1890ff;
      font-weight: bold;
      transition: all 0.1s ease;
    `;
    preview.textContent = component?.name || 'Component';
    
    document.body.appendChild(preview);
    return preview;
  }, []);

  // Find the best container at mouse position
  const findTargetContainer = useCallback((mouseX, mouseY) => {
    const nodes = query.getNodes();
    let bestContainer = null;
    let bestContainerDepth = -1;

    // Find all container elements under the mouse
    Object.entries(nodes).forEach(([nodeId, node]) => {
      if (!node.dom || !node.data) return;

      const element = node.dom;
      const rect = element.getBoundingClientRect();
      
      // Check if mouse is within this element
      if (mouseX >= rect.left && mouseX <= rect.right &&
          mouseY >= rect.top && mouseY <= rect.bottom) {
        
        // Check if this element can accept drops
        const canDrop = node.rules?.canDrop || (() => true);
        const canMoveIn = node.rules?.canMoveIn || (() => true);
        
        if (canDrop() && canMoveIn()) {
          // Calculate depth (how nested this container is)
          let depth = 0;
          let parent = node.data.parent;
          while (parent && nodes[parent]) {
            depth++;
            parent = nodes[parent].data.parent;
          }

          // Prefer deeper (more specific) containers
          if (depth > bestContainerDepth) {
            bestContainer = nodeId;
            bestContainerDepth = depth;
          }
        }
      }
    });

    return bestContainer || 'ROOT';
  }, [query]);

  // Calculate precise drop position within container
  const calculateDropPosition = useCallback((mouseX, mouseY, containerId) => {
    if (containerId === 'ROOT') {
      // For root container, use viewport coordinates
      return {
        x: mouseX,
        y: mouseY,
        position: 'absolute'
      };
    }

    const nodes = query.getNodes();
    const containerNode = nodes[containerId];
    
    if (!containerNode?.dom) {
      return { x: mouseX, y: mouseY, position: 'absolute' };
    }

    const containerRect = containerNode.dom.getBoundingClientRect();
    const containerStyle = window.getComputedStyle(containerNode.dom);
    
    // Get container padding
    const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
    
    // Calculate position relative to container's content area
    const relativeX = mouseX - containerRect.left - paddingLeft;
    const relativeY = mouseY - containerRect.top - paddingTop;

    // For flexbox containers, consider using relative positioning
    const isFlexContainer = containerStyle.display === 'flex';
    
    return {
      x: Math.max(0, relativeX),
      y: Math.max(0, relativeY),
      position: isFlexContainer ? 'relative' : 'absolute',
      containerId
    };
  }, [query]);

  // Enhanced create connector with mouse position tracking
  const enhancedCreate = useCallback((element, component) => {
    if (!element || !component) return;

    const handleMouseDown = (e) => {
      e.preventDefault();
      dragStateRef.current = {
        isDragging: true,
        draggedElement: element,
        draggedComponent: component,
        mousePosition: { x: e.clientX, y: e.clientY },
        targetContainer: null,
        visualFeedback: null
      };

      // Create initial visual feedback
      dragStateRef.current.visualFeedback = createDropPreview(e.clientX, e.clientY, component);

      console.log('🎯 Enhanced drag started for new component:', component?.name || 'Unknown Component');

      // Add document event listeners only when dragging starts
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
      if (!dragStateRef.current.isDragging) return;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Update mouse position
      dragStateRef.current.mousePosition = { x: mouseX, y: mouseY };

      // Update visual feedback position
      if (dragStateRef.current.visualFeedback) {
        dragStateRef.current.visualFeedback.style.left = `${mouseX - 50}px`;
        dragStateRef.current.visualFeedback.style.top = `${mouseY - 25}px`;
      }

      // Find target container
      const targetContainer = findTargetContainer(mouseX, mouseY);
      dragStateRef.current.targetContainer = targetContainer;

      // Update visual feedback based on target
      if (dragStateRef.current.visualFeedback) {
        const isValidTarget = targetContainer !== null;
        dragStateRef.current.visualFeedback.style.background = 
          isValidTarget ? 'rgba(24, 144, 255, 0.2)' : 'rgba(255, 77, 79, 0.2)';
        dragStateRef.current.visualFeedback.style.borderColor = 
          isValidTarget ? '#1890ff' : '#ff4d4f';
        dragStateRef.current.visualFeedback.style.color = 
          isValidTarget ? '#1890ff' : '#ff4d4f';
      }
    };

    const handleMouseUp = (e) => {
      if (!dragStateRef.current.isDragging) return;

      const { mousePosition, targetContainer, draggedComponent, visualFeedback } = dragStateRef.current;

      // Clean up visual feedback
      if (visualFeedback) {
        visualFeedback.remove();
      }

      if (targetContainer && mousePosition) {
        // Calculate drop position
        const dropPosition = calculateDropPosition(
          mousePosition.x, 
          mousePosition.y, 
          targetContainer
        );

        console.log('🎯 Creating component at precise position:', {
          component: draggedComponent?.name || 'Unknown Component',
          container: targetContainer,
          position: dropPosition
        });

        try {
          // Extract component class from React element
          const ComponentClass = draggedComponent?.element?.props?.is;
          const originalProps = draggedComponent?.element?.props || {};

          if (!ComponentClass) {
            console.error('❌ Enhanced drop: No component class found in element');
            return;
          }

          // Create component props with precise positioning
          const componentProps = {
            ...originalProps,
            position: dropPosition.position,
            left: dropPosition.x,
            top: dropPosition.y
          };

          // Remove the 'is' prop as it's not needed for the component
          delete componentProps.is;

          // Use CraftJS parseReactElement and addNodeTree pattern (from ContextMenu implementation)
          const newReactElement = React.createElement(ComponentClass, componentProps);
          const nodeTree = query.parseReactElement(newReactElement).toNodeTree();
          
          // Add to the target container
          actions.addNodeTree(nodeTree, targetContainer);
          
          console.log('✅ Enhanced drop: Component created successfully');
          
          // Optional: Select the newly created component and apply snap
          setTimeout(() => {
            if (nodeTree.rootNodeId) {
              actions.selectNode(nodeTree.rootNodeId);
              
              // Apply snap positioning if enabled
              if (window.snapGridSystem?.snapEnabled) {
                const snapResult = window.snapGridSystem.getSnapPosition(
                  nodeTree.rootNodeId,
                  dropPosition.x,
                  dropPosition.y,
                  100, // default width
                  50   // default height
                );

                if (snapResult.snapped) {
                  actions.setProp(nodeTree.rootNodeId, (props) => {
                    props.left = snapResult.x;
                    props.top = snapResult.y;
                  });
                }
              }
            }
          }, 100);
          
        } catch (error) {
          console.error('❌ Enhanced drop: Error creating component:', error);
        }
      }

      // Reset drag state
      dragStateRef.current = {
        isDragging: false,
        draggedElement: null,
        draggedComponent: null,
        mousePosition: { x: 0, y: 0 },
        targetContainer: null,
        visualFeedback: null
      };

      // Remove event listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // Add event listeners only for mousedown
    element.addEventListener('mousedown', handleMouseDown);
    
    // Store cleanup function
    element._enhancedCleanup = () => {
      element.removeEventListener('mousedown', handleMouseDown);
      // Clean up any active document listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    return element;
  }, [createDropPreview, findTargetContainer, calculateDropPosition, actions, query]);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Remove any existing preview
    const existingPreview = document.getElementById('enhanced-drop-preview');
    if (existingPreview) {
      existingPreview.remove();
    }

    // Reset drag state
    dragStateRef.current = {
      isDragging: false,
      draggedElement: null,
      draggedComponent: null,
      mousePosition: { x: 0, y: 0 },
      targetContainer: null,
      visualFeedback: null
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    enhancedCreate,
    cleanup,
    isDragging: dragStateRef.current.isDragging
  };
};
