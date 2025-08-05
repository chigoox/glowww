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

  // Get default dimensions for different component types
  const getComponentDimensions = useCallback((component) => {
    // Add early return to prevent spam
    if (!component) {
      return { width: 200, height: 200 };
    }
    
    // Try multiple ways to get the component name
    let componentName = 'unknown';
    
    if (component?.element?.props?.is?.craft?.displayName) {
      componentName = component.element.props.is.craft.displayName;
    } else if (component?.element?.props?.is?.displayName) {
      componentName = component.element.props.is.displayName;
    } else if (component?.element?.props?.is?.name) {
      componentName = component.element.props.is.name;
    } else if (component?.name) {
      componentName = component.name;
    } else if (component?.element?.type?.displayName) {
      componentName = component.element.type.displayName;
    } else if (component?.element?.type?.name) {
      componentName = component.element.type.name;
    }
    
    // Only log once per component type to reduce spam
    const logKey = `${componentName}_${component?.name || 'unknown'}`;
    if (!window.loggedDimensions) window.loggedDimensions = new Set();
    
    if (!window.loggedDimensions.has(logKey)) {
      console.log('🔍 Getting dimensions for component:', {
        componentName,
        fallbackName: component?.name
      });
      window.loggedDimensions.add(logKey);
    }
    
    // Define default dimensions for different component types
    const defaultDimensions = {
      'Box': { width: 200, height: 200 },
      'FlexBox': { width: 300, height: 150 },
      'GridBox': { width: 300, height: 200 },
      'Text': { width: 100, height: 30 },
      'Paragraph': { width: 300, height: 80 },
      'Image': { width: 200, height: 150 },
      'Video': { width: 320, height: 180 },
      'Button': { width: 120, height: 40 },
      'Link': { width: 80, height: 24 },
      'FormInput': { width: 200, height: 40 },
      'Form': { width: 400, height: 300 },
      'Carousel': { width: 400, height: 250 },
      'NavBar': { width: 800, height: 60 },
      'ShopFlexBox': { width: 300, height: 200 },
      
      // Try some alternative names that might be used
      'Frame': { width: 200, height: 200 }, // In case "Frame" is used for Box
      'Flex': { width: 300, height: 150 },  // In case "Flex" is used for FlexBox
      'Grid': { width: 300, height: 200 },  // In case "Grid" is used for GridBox
      'Input': { width: 200, height: 40 }   // In case "Input" is used for FormInput
    };

    // Get dimensions from component props if available, parse numeric values
    const props = component?.element?.props || {};
    let width = defaultDimensions[componentName]?.width || 150;
    let height = defaultDimensions[componentName]?.height || 100;
    
    // Override with component props if they exist
    if (props.width !== undefined) {
      width = typeof props.width === 'string' ? parseInt(props.width) || width : props.width;
    }
    if (props.height !== undefined) {
      height = typeof props.height === 'string' ? parseInt(props.height) || height : props.height;
    }

    console.log('📏 Component dimensions calculated:', { 
      componentName, 
      width, 
      height, 
      foundInDefaults: !!defaultDimensions[componentName],
      originalProps: { width: props.width, height: props.height }
    });

    return { width, height };
  }, []);

  // Visual feedback for drop preview
  const createDropPreview = useCallback((mouseX, mouseY, component) => {
    // Remove existing preview
    const existingPreview = document.getElementById('enhanced-drop-preview');
    if (existingPreview) {
      existingPreview.remove();
    }

    // Get component dimensions
    const { width, height } = getComponentDimensions(component);

    // Create new preview element centered at mouse position (in viewport coordinates)
    const preview = document.createElement('div');
    preview.id = 'enhanced-drop-preview';
    preview.style.cssText = `
      position: fixed;
      left: ${mouseX - width / 2}px;
      top: ${mouseY - height / 2}px;
      width: ${width}px;
      height: ${height}px;
      background: rgba(24, 144, 255, 0.15);
      border: 2px dashed #1890ff;
      border-radius: 6px;
      pointer-events: none;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #1890ff;
      font-weight: 600;
      transition: all 0.1s ease;
      box-shadow: 0 4px 12px rgba(24, 144, 255, 0.2);
    `;
    preview.textContent = component.name || 'Component';
    
    // Add dimension info to the preview
    const dimensionInfo = document.createElement('div');
    dimensionInfo.style.cssText = `
      position: absolute;
      bottom: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 9px;
      color: #1890ff;
      background: rgba(255, 255, 255, 0.9);
      padding: 2px 6px;
      border-radius: 3px;
      white-space: nowrap;
    `;
    dimensionInfo.textContent = `${width}×${height}`;
    preview.appendChild(dimensionInfo);
    
    document.body.appendChild(preview);
    return preview;
  }, [getComponentDimensions]);

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
        
        // FIXED: Check if this is a canvas container using Craft.js isCanvas() method
        const isCanvasContainer = query.node(nodeId).isCanvas();
        
        // Also check the rules as a secondary validation
        const nodeRules = query.node(nodeId).rules;
        const canDrop = nodeRules && typeof nodeRules.canDrop === 'function' ? nodeRules.canDrop() : true;
        const canMoveIn = nodeRules && typeof nodeRules.canMoveIn === 'function' ? nodeRules.canMoveIn() : true;
        
        // Only consider this element if it's a canvas container AND can accept drops
        if (isCanvasContainer && canDrop && canMoveIn) {
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
  const calculateDropPosition = useCallback((mouseX, mouseY, containerId, component) => {
    // Get component dimensions for centering
    const { width, height } = getComponentDimensions(component);

    if (containerId === 'ROOT') {
      // For root container, we need to account for the canvas position and scrolling
      const canvasElement = document.querySelector('[data-cy="editor-root"], [data-editor="true"], .craft-renderer') || document.body;
      const canvasRect = canvasElement.getBoundingClientRect();
      const canvasScrollTop = canvasElement.scrollTop || 0;
      const canvasScrollLeft = canvasElement.scrollLeft || 0;
      
      // Calculate position relative to canvas, centered at mouse
      const canvasRelativeX = mouseX - canvasRect.left + canvasScrollLeft - (width / 2);
      const canvasRelativeY = mouseY - canvasRect.top + canvasScrollTop - (height / 2);
      
      console.log('🎯 ROOT positioning calculation:', {
        mouseX, mouseY, width, height,
        canvasRect,
        canvasScrollTop, canvasScrollLeft,
        calculatedX: canvasRelativeX,
        calculatedY: canvasRelativeY,
        finalX: Math.max(0, canvasRelativeX),
        finalY: Math.max(0, canvasRelativeY)
      });
      
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
      
      const canvasRelativeX = mouseX - canvasRect.left + canvasScrollLeft - (width / 2);
      const canvasRelativeY = mouseY - canvasRect.top + canvasScrollTop - (height / 2);
      
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
    const relativeX = mouseX - containerRect.left - paddingLeft - (width / 2);
    const relativeY = mouseY - containerRect.top - paddingTop - (height / 2);

    // For flexbox containers, consider using relative positioning
    const isFlexContainer = containerStyle.display === 'flex';
    
    return {
      x: Math.max(0, relativeX),
      y: Math.max(0, relativeY),
      position: isFlexContainer ? 'relative' : 'absolute',
      containerId
    };
  }, [query, getComponentDimensions]);

  // Enhanced create connector with mouse position tracking
  const enhancedCreate = useCallback((element, component) => {
    if (!element || !component) return;

    // Only set up enhanced drop for ToolBox elements
    if (!element.closest('.toolbox-component') && !element.dataset.enhancedDrop) {
      console.log('⚠️ Enhanced drop skipped for non-ToolBox element');
      return element; // Return without setting up listeners
    }

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

      console.log('🎯 Enhanced drag started for new component:', component.name);
    };

    const handleMouseMove = (e) => {
      if (!dragStateRef.current.isDragging) return;

      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const { draggedComponent } = dragStateRef.current;

      // Update mouse position
      dragStateRef.current.mousePosition = { x: mouseX, y: mouseY };

      // Update visual feedback position with component dimensions
      if (dragStateRef.current.visualFeedback && draggedComponent) {
        const { width, height } = getComponentDimensions(draggedComponent);
        dragStateRef.current.visualFeedback.style.left = `${mouseX - width / 2}px`;
        dragStateRef.current.visualFeedback.style.top = `${mouseY - height / 2}px`;
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
        // Calculate drop position with component for centering
        const dropPosition = calculateDropPosition(
          mousePosition.x, 
          mousePosition.y, 
          targetContainer,
          draggedComponent
        );

        console.log('🎯 Creating component at precise position:', {
          component: draggedComponent.name,
          container: targetContainer,
          position: dropPosition,
          componentDimensions: getComponentDimensions(draggedComponent),
          mousePosition: mousePosition,
          canvasInfo: {
            canvasElement: document.querySelector('[data-cy="editor-root"], [data-editor="true"], .craft-renderer'),
            canvasRect: document.querySelector('[data-cy="editor-root"], [data-editor="true"], .craft-renderer')?.getBoundingClientRect()
          }
        });

        try {
          // Debug the structure of draggedComponent
          console.log('🔍 Enhanced drop: Debugging component structure:', {
            draggedComponent,
            hasElement: !!draggedComponent?.element,
            hasElementProps: !!draggedComponent?.element?.props,
            elementType: typeof draggedComponent?.element,
            componentKeys: Object.keys(draggedComponent || {}),
            elementKeys: draggedComponent?.element ? Object.keys(draggedComponent.element) : 'N/A'
          });

          // Validate component structure before proceeding
          if (!draggedComponent?.element?.props?.is) {
            console.error('❌ Enhanced drop: Invalid component structure. Expected draggedComponent.element.props.is but got:', {
              draggedComponent,
              element: draggedComponent?.element,
              props: draggedComponent?.element?.props,
              is: draggedComponent?.element?.props?.is
            });
            throw new Error('Invalid component structure: missing element.props.is');
          }

          // Extract component class from React element
          const ComponentClass = draggedComponent.element.props.is;
          const originalProps = draggedComponent.element.props;
          
          // Get component dimensions for proper sizing
          const { width, height } = getComponentDimensions(draggedComponent);

          // TWO-STAGE CREATION APPROACH:
          
          // STAGE 1: Create component properly through Craft.js first (no positioning)
          console.log('🎯 Stage 1: Creating component through Craft.js without positioning');
          
          // Create component with ONLY its original props (no positioning yet)
          const cleanProps = { ...originalProps };
          delete cleanProps.is; // Remove the 'is' prop as it's not needed for the component
          
          // Create basic component without positioning
          const basicElement = React.createElement(ComponentClass, cleanProps);
          const nodeTree = query.parseReactElement(basicElement).toNodeTree();
          
          // Add to target container and get the node ID
          actions.addNodeTree(nodeTree, targetContainer);
          const addedNodeId = nodeTree.rootNodeId;
          
          console.log('✅ Stage 1 complete: Component created with ID:', addedNodeId);
          
          // STAGE 2: Now position the properly created component
          console.log('🎯 Stage 2: Positioning the created component');
          
          // Wait a tick for the component to be fully rendered, then position it
          setTimeout(() => {
            try {
              actions.setProp(addedNodeId, (props) => {
                props.position = dropPosition.position;
                props.left = dropPosition.x;
                props.top = dropPosition.y;
                // Add default dimensions if not already specified
                if (!props.width) props.width = typeof width === 'number' ? `${width}px` : width;
                if (!props.height) props.height = typeof height === 'number' ? `${height}px` : height;
              });
              
              console.log('✅ Stage 2 complete: Component positioned at', {
                x: dropPosition.x,
                y: dropPosition.y,
                width,
                height,
                nodeId: addedNodeId
              });
              
              // Optional: Select the newly created component to trigger connector setup
              actions.selectNode(addedNodeId);
              
              // Force a re-render to ensure connectors are properly established
              setTimeout(() => {
                // Check if node exists in the state before trying to select it
                const nodes = query.getNodes();
                if (nodes[addedNodeId]) {
                  console.log('🔗 Triggering connector refresh for new component:', addedNodeId);
                  // This will cause the component to re-render and re-establish connectors
                  actions.selectNode(addedNodeId);
                } else {
                  console.log('⚠️ Node not found for connector refresh:', addedNodeId);
                }
              }, 100);
              
            } catch (positionError) {
              console.error('❌ Stage 2 failed: Could not position component:', positionError);
            }
          }, 50); // Small delay to ensure component is rendered
          
          console.log('✅ Enhanced drop: Two-stage creation successful');
          
        } catch (error) {
          console.error('❌ Enhanced drop: Error creating component:', error);
          console.error('❌ Enhanced drop: Component structure that failed:', {
            draggedComponent,
            targetContainer,
            dropPosition
          });
          
          // Attempt fallback: try to use standard CraftJS create if possible
          try {
            console.log('🔄 Enhanced drop: Attempting fallback creation...');
            
            // Try to extract the component class more defensively
            let ComponentClass = null;
            let fallbackProps = {};
            
            if (draggedComponent?.element?.props?.is) {
              ComponentClass = draggedComponent.element.props.is;
              fallbackProps = { ...draggedComponent.element.props };
              delete fallbackProps.is;
            } else if (draggedComponent?.element?.type) {
              // Alternative structure check
              ComponentClass = draggedComponent.element.type;
              fallbackProps = draggedComponent.element.props || {};
            } else {
              throw new Error('Cannot determine component class for fallback');
            }
            
            // Create basic positioned component
            const fallbackElement = React.createElement(ComponentClass, {
              ...fallbackProps,
              position: 'absolute',
              left: dropPosition.x,
              top: dropPosition.y
            });
            
            const nodeTree = query.parseReactElement(fallbackElement).toNodeTree();
            actions.addNodeTree(nodeTree, targetContainer);
            
            console.log('✅ Enhanced drop: Fallback creation successful');
            
          } catch (fallbackError) {
            console.error('❌ Enhanced drop: Fallback creation also failed:', fallbackError);
            // Last resort: show user a helpful error message
            if (window.message) {
              window.message.error('Failed to create component. Please try again or use the standard toolbar.');
            }
          }
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

    // Add event listeners
    element.addEventListener('mousedown', handleMouseDown);
    
    // Store cleanup function
    element._enhancedCleanup = () => {
      element.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // Also set up the move and up listeners when dragging starts
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

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
