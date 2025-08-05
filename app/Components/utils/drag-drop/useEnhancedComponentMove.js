'use client';

import { useCallback, useRef } from 'react';
import { useEditor } from '@craftjs/core';

/**
 * Enhanced component movement system with seamless container switching
 * Allows components to be moved in and out of containers like the toolbox drag system
 */
export const useEnhancedComponentMove = () => {
  const { actions, query } = useEditor();
  
  // Find the best container at mouse position (similar to enhanced drop system)
  const findTargetContainer = useCallback((mouseX, mouseY, draggedNodeId) => {
    
    const nodes = query.getNodes();
    let bestContainer = null;
    let bestContainerDepth = -1;
    

    // Find all container elements under the mouse
    Object.entries(nodes).forEach(([nodeIdCandidate, node]) => {
      // Skip the element being dragged and its children
      if (nodeIdCandidate === draggedNodeId || !node.dom || !node.data) {
        if (nodeIdCandidate === draggedNodeId) {
        }
        return;
      }
      
  
      // Check if this node is a child of the dragged node (prevent dropping into itself)
      let parent = node.data.parent;
      let isChildOfDragged = false;
      while (parent && nodes[parent]) {
        if (parent === draggedNodeId) {
          isChildOfDragged = true;
          break;
        }
        parent = nodes[parent].data.parent;
      }
      
      if (isChildOfDragged) {
        return;
      }

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
            bestContainer = nodeIdCandidate;
            bestContainerDepth = depth;
          }
        } else {
        }
      }
    });

    const result = bestContainer || 'ROOT';
  

    return result;
  }, [query]);

  // Calculate position relative to target container
  const calculateContainerRelativePosition = useCallback((mouseX, mouseY, containerId, elementWidth, elementHeight) => {
    if (containerId === 'ROOT') {
      // For root container, use canvas-relative positioning
      const canvasElement = document.querySelector('[data-cy="editor-root"], [data-editor="true"], .craft-renderer') || document.body;
      const canvasRect = canvasElement.getBoundingClientRect();
      const canvasScrollTop = canvasElement.scrollTop || 0;
      const canvasScrollLeft = canvasElement.scrollLeft || 0;
      
      // Calculate position relative to canvas, centered at mouse
      const canvasRelativeX = mouseX - canvasRect.left + canvasScrollLeft - (elementWidth / 2);
      const canvasRelativeY = mouseY - canvasRect.top + canvasScrollTop - (elementHeight / 2);
      
      return {
        x: Math.max(0, canvasRelativeX),
        y: Math.max(0, canvasRelativeY),
        position: 'absolute'
      };
    }

    const nodes = query.getNodes();
    const containerNode = nodes[containerId];
    
    if (!containerNode?.dom) {
      // Fallback to ROOT-style calculation
      const canvasElement = document.querySelector('[data-cy="editor-root"], [data-editor="true"], .craft-renderer') || document.body;
      const canvasRect = canvasElement.getBoundingClientRect();
      const canvasScrollTop = canvasElement.scrollTop || 0;
      const canvasScrollLeft = canvasElement.scrollLeft || 0;
      
      const canvasRelativeX = mouseX - canvasRect.left + canvasScrollLeft - (elementWidth / 2);
      const canvasRelativeY = mouseY - canvasRect.top + canvasScrollTop - (elementHeight / 2);
      
      return { 
        x: Math.max(0, canvasRelativeX), 
        y: Math.max(0, canvasRelativeY), 
        position: 'absolute' 
      };
    }

    const containerRect = containerNode.dom.getBoundingClientRect();
    const containerStyle = window.getComputedStyle(containerNode.dom);
    
    // Get container padding
    const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
    
    // Calculate position relative to container's content area, centered at mouse
    const relativeX = mouseX - containerRect.left - paddingLeft - (elementWidth / 2);
    const relativeY = mouseY - containerRect.top - paddingTop - (elementHeight / 2);

    // For flexbox containers, consider using relative positioning
    const isFlexContainer = containerStyle.display === 'flex';
    
    return {
      x: Math.max(0, relativeX),
      y: Math.max(0, relativeY),
      position: isFlexContainer ? 'relative' : 'absolute',
      containerId
    };
  }, [query]);

  // Enhanced move function that handles container switching
  const enhancedMove = useCallback((nodeId, mouseX, mouseY, elementWidth, elementHeight) => {
    
    // Get all nodes for debugging
    const allNodes = query.getNodes();
    
    // Log current node info
    const currentNode = query.node(nodeId).get();
    const currentParent = currentNode?.data?.parent;
 
    // Find target container at mouse position
    const targetContainer = findTargetContainer(mouseX, mouseY, nodeId);
    


    // Calculate position relative to target container
    const containerPosition = calculateContainerRelativePosition(
      mouseX, 
      mouseY, 
      targetContainer, 
      elementWidth, 
      elementHeight
    );

    // Apply snap grid system if available
    let finalX = containerPosition.x;
    let finalY = containerPosition.y;
    
    if (window.snapGridSystem?.snapEnabled) {
      const snapResult = window.snapGridSystem.getSnapPosition(
        nodeId,
        containerPosition.x,
        containerPosition.y,
        elementWidth,
        elementHeight
      );
      
      if (snapResult.snapped) {
        finalX = snapResult.x;
        finalY = snapResult.y;
      }
    }

    // Check if we need to move to a different container
    if (targetContainer && targetContainer !== currentParent) {
 

      try {
        // DEBUG: Check target container configuration before move
        const targetNode = allNodes[targetContainer];
  
        
        // Move the node to the new container
        actions.move(nodeId, targetContainer, 0); // Move to beginning of new container
        
        // Update position after move
        setTimeout(() => {
          actions.setProp(nodeId, (props) => {
            props.position = containerPosition.position;
            props.left = finalX;
            props.top = finalY;
          });
        }, 50);
        
        return { 
          moved: true, 
          targetContainer, 
          position: { x: finalX, y: finalY },
          snapped: window.snapGridSystem?.snapEnabled
        };
        
      } catch (error) {
        return { moved: false, error };
      }
    } else {
      // No container change, just update position
      
      actions.setProp(nodeId, (props) => {
        props.position = containerPosition.position;
        props.left = finalX;
        props.top = finalY;
      });
      
      return { 
        moved: false, 
        position: { x: finalX, y: finalY },
        snapped: window.snapGridSystem?.snapEnabled
      };
    }
  }, [findTargetContainer, calculateContainerRelativePosition, actions, query]);

  return {
    enhancedMove,
    findTargetContainer,
    calculateContainerRelativePosition
  };
};

export default useEnhancedComponentMove;
