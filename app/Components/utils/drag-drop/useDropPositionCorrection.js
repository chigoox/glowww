'use client';

import { useEditor } from "@craftjs/core";
import { useCallback, useRef, useEffect } from "react";
import { useEditorSettings } from "../context/EditorSettingsContext";

/**
 * Drop Position Correction System for New and Existing Components
 * 
 * This system works WITH the existing Craft.js drag system:
 * 1. Let Craft.js handle component creation/movement (which works reliably)
 * 2. Detect when a new component is added from toolbox OR existing component is moved
 * 3. Calculate the intended position based on mouse position during drop
 * 4. Move the component to the correct position after creation/movement
 * 
 * Handles BOTH new components from toolbox AND existing component moves
 */
export const useDropPositionCorrection = () => {
  const { actions, query } = useEditor();
  
  // Try to get settings, but provide defaults if context is not available
  let settings;
  try {
    const { settings: contextSettings } = useEditorSettings();
    settings = contextSettings;
  } catch (error) {
    // Fallback to default settings if context is not available
    console.warn('EditorSettings context not available, using default settings');
    settings = {
      dropPosition: {
        mode: 'center',
        snapToGrid: false
      },
      snap: {
        enabled: false
      },
      grid: {
        size: 20
      }
    };
  }
  
  const dropStateRef = useRef({
    isNewDrop: false,
    isExistingMove: false,
    mousePosition: { x: 0, y: 0 },
    targetContainer: null,
    lastNodeCount: 0,
    draggedComponent: null,
    draggedNodeId: null
  });

  // Find the best container at mouse position
  const findContainerAtPosition = useCallback((x, y) => {
    
    const elements = document.elementsFromPoint(x, y);
   
    
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

  // Get component dimensions for accurate centering - use actual component craft props
  const getComponentDimensions = useCallback((componentName) => {
    // Enhanced dimension lookup with accurate craft props
    try {
      // First, try to get dimensions from the component's craft configuration
      // Import and check the actual component modules
      const componentDimensions = {
        'Box': { width: 200, height: 200 },  // From Box.craft.props
        'FlexBox': { width: 300, height: 150 },
        'GridBox': { width: 300, height: 200 },
        'Text': { width: 100, height: 24 },
        'Button': { width: 120, height: 40 },
        'Image': { width: 200, height: 150 },
        'Input': { width: 200, height: 40 },
        'Link': { width: 80, height: 24 },
        'Video': { width: 300, height: 200 },
        'Paragraph': { width: 300, height: 80 },
        'Carousel': { width: 400, height: 250 },
        'NavBar': { width: 400, height: 60 },
        'Form': { width: 300, height: 200 },
        'ShopFlexBox': { width: 250, height: 300 },
        'Product': { width: 250, height: 300 } // Alternative name for ShopFlexBox
      };
      
      const dims = componentDimensions[componentName] || { width: 200, height: 200 };
      return dims;
    } catch (error) {
      return { width: 200, height: 200 };
    }
  }, []);

  // For new components only, get dimensions from DOM or nodeId
  const getExistingComponentDimensions = useCallback((nodeId) => {
    try {
      const node = query.node(nodeId);
      if (node && node.dom) {
        const rect = node.dom.getBoundingClientRect();
        // Ensure we have reasonable dimensions
        if (rect.width > 0 && rect.height > 0) {
          return { width: rect.width, height: rect.height };
        }
      }
    } catch (error) {
      console.warn('Could not get DOM dimensions for:', nodeId, error);
    }
    
    // Enhanced fallback - try to get from component type if available
    try {
      const node = query.node(nodeId);
      if (node) {
        const nodeData = node.get();
        const componentType = nodeData.data.displayName || nodeData.data.type;
        if (componentType) {
          const dims = getComponentDimensions(componentType);
          return dims;
        }
      }
    } catch (error) {
      console.warn('Could not get component type for:', nodeId, error);
    }
    
    // Final fallback dimensions - use standard box size
    return { width: 200, height: 200 };
  }, [query, getComponentDimensions]);

  // Create drop preview (visual feedback disabled)
  const createDropPreview = useCallback((mouseX, mouseY, componentName) => {
    // Visual feedback disabled - return null but keep function for compatibility
    return null;
  }, [getComponentDimensions]);

  // Update visual feedback (disabled)
  const updateDropPreview = useCallback((mouseX, mouseY, isValidContainer = true, componentName = null) => {
    // Visual feedback disabled - function kept for compatibility
    return;
  }, []);

  // Remove visual feedback (disabled)
  const removeDropPreview = useCallback(() => {
    // Visual feedback disabled - function kept for compatibility
    return;
  }, []);

  // Highlight container during drag (disabled)
  const highlightContainer = useCallback((containerId) => {
    // Visual feedback disabled - function kept for compatibility
    return;
  }, []);

  // Remove container highlight (disabled)
  const removeContainerHighlight = useCallback(() => {
    // Visual feedback disabled - function kept for compatibility
    return;
  }, []);

  // Calculate position within container - CENTERED at mouse position
  const calculateRelativePosition = useCallback((mouseX, mouseY, containerId, componentDimensions = null) => {
    try {
      
      let containerElement = null;
      let containerRect = null;
      
      if (containerId === 'ROOT') {
        // For ROOT, find the main editor canvas area more reliably
        // Try different selectors to find the actual editor canvas
        const selectors = [
          '[data-cy="editor-root"]',
          '.craft-renderer', 
          '[data-editor="true"]',
          '.editor-canvas',
          '[data-page-id]',
          'iframe',
          '.overflow-auto.bg-gray-100',
          '.craft-renderer-root',
          '.craft-editor-root'
        ];
        
        for (const selector of selectors) {
          containerElement = document.querySelector(selector);
          if (containerElement) {
            break;
          }
        }
        
        // If still not found, try to find by looking for the largest positioned element
        if (!containerElement) {
          const allElements = document.querySelectorAll('div');
          let largestElement = null;
          let largestArea = 0;
          
          for (const el of allElements) {
            const rect = el.getBoundingClientRect();
            const area = rect.width * rect.height;
            if (area > largestArea && rect.width > 500 && rect.height > 300) {
              largestElement = el;
              largestArea = area;
            }
          }
          
          if (largestElement) {
            containerElement = largestElement;
          }
        }
        
        if (containerElement) {
          containerRect = containerElement.getBoundingClientRect();
        
        }
      } else {
        // For specific containers, use the Craft.js node
        try {
          const containerNode = query.node(containerId);
          if (containerNode && containerNode.dom) {
            containerElement = containerNode.dom;
            containerRect = containerElement.getBoundingClientRect();
          }
        } catch (error) {
          console.warn('Could not access container node:', containerId, error);
        }
      }
      
      if (!containerElement || !containerRect) {
        return { x: mouseX - 100, y: mouseY - 100 }; // Simple fallback relative to mouse
      }
      
      // Get component dimensions for centering (use fallback if not provided)
      const compWidth = componentDimensions?.width || 200;
      const compHeight = componentDimensions?.height || 200;
      
      // Calculate relative position within container based on positioning mode
      let relativeX, relativeY;
      
      if (settings.dropPosition.mode === 'center') {
        // CENTER MODE: Center the component at mouse position
        relativeX = mouseX - containerRect.left - (compWidth / 2);
        relativeY = mouseY - containerRect.top - (compHeight / 2);
        console.log('🎯 Using CENTER positioning mode');
      } else {
        // TOP-LEFT MODE: Position top-left corner at mouse position
        relativeX = mouseX - containerRect.left;
        relativeY = mouseY - containerRect.top;
        console.log('🎯 Using TOP-LEFT positioning mode');
      }

  

      // Account for container padding if it exists
      const containerStyle = window.getComputedStyle(containerElement);
      const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
      const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
      
      // For absolute positioning, ensure reasonable bounds but don't be too restrictive
      const minX = paddingLeft;
      const minY = paddingTop;
      const maxX = containerRect.width - paddingLeft - compWidth;
      const maxY = containerRect.height - paddingTop - compHeight;
      
      // Apply bounds but allow negative positions if needed (for edge cases)
      const finalX = Math.max(minX, Math.min(relativeX, maxX));
      const finalY = Math.max(minY, Math.min(relativeY, maxY));

    

      return { x: finalX, y: finalY };
    } catch (error) {
      // Fallback to mouse-relative positioning
      return { x: mouseX - 100, y: mouseY - 100 };
    }
  }, [query, settings.dropPosition.mode]);

  // Helper function to apply positioning for NEW and EXISTING components
  // Helper function to apply positioning with snap to grid support
  const applyPositioning = useCallback((nodeId, position) => {
    try {
      // Get the actual component dimensions for precision
      const componentDimensions = getExistingComponentDimensions(nodeId);
      console.log('📏 Final positioning - component dimensions:', componentDimensions);
      
      let finalX = Math.round(position.x);
      let finalY = Math.round(position.y);
      
      // Apply snap to grid if enabled
      if (settings.dropPosition.snapToGrid && settings.snap.enabled) {
        const gridSize = settings.grid.size || 20; // Default grid size
        finalX = Math.round(finalX / gridSize) * gridSize;
        finalY = Math.round(finalY / gridSize) * gridSize;
        console.log('📐 Applied snap to grid:', { gridSize, snapped: { x: finalX, y: finalY } });
      }
      
      actions.setProp(nodeId, (props) => {
        props.position = 'absolute';
        props.left = finalX;
        props.top = finalY;
        
        console.log('✅ Position correction applied:', { 
          nodeId, 
          mode: settings.dropPosition.mode,
          position: { x: finalX, y: finalY },
          dimensions: componentDimensions,
          snapToGrid: settings.dropPosition.snapToGrid && settings.snap.enabled
        });
      });
    } catch (error) {
      console.error('❌ Failed to apply positioning:', error);
    }
  }, [actions, getExistingComponentDimensions, settings.dropPosition.snapToGrid, settings.snap.enabled, settings.grid?.size, settings.dropPosition.mode]);

  // Detect new component additions and apply position correction
  const checkForNewComponents = useCallback(() => {
    const currentNodes = query.getNodes();
    const currentNodeCount = Object.keys(currentNodes).length;
    
    if (currentNodeCount > dropStateRef.current.lastNodeCount && dropStateRef.current.isNewDrop) {
      // New component(s) added
      const nodeIds = Object.keys(currentNodes);
      const previousNodeIds = Object.keys(currentNodes).slice(0, dropStateRef.current.lastNodeCount);
      const newNodeIds = nodeIds.filter(id => !previousNodeIds.includes(id));
      
      if (newNodeIds.length > 0) {
        const newNodeId = newNodeIds[0]; // Take the first new node
        
        // Apply position correction with longer delay for DOM stability
        setTimeout(() => {
          try {
            const { x: mouseX, y: mouseY } = dropStateRef.current.mousePosition;
            
            // Verify mouse position is reasonable (not 0,0 or negative)
            if (mouseX <= 0 || mouseY <= 0) {
              console.warn('⚠️ Invalid mouse position detected, using center of screen');
              const fallbackX = window.innerWidth / 2;
              const fallbackY = window.innerHeight / 2;
              dropStateRef.current.mousePosition = { x: fallbackX, y: fallbackY };
            }
            
            const targetContainer = findContainerAtPosition(mouseX, mouseY);
            
            // Wait a moment for the new component to be fully rendered
            setTimeout(() => {
              // Get component dimensions for accurate centering - use the SAME function as preview
              const componentName = dropStateRef.current.draggedComponent;
              const componentDimensions = getComponentDimensions(componentName); // Use component name, not nodeId
              
              const position = calculateRelativePosition(mouseX, mouseY, targetContainer, componentDimensions);
              
              // Check current parent
              const nodeData = query.node(newNodeId).get();
              const currentParent = nodeData.data.parent;
              
              // Move to correct container if needed
              if (currentParent !== targetContainer) {
                actions.move(newNodeId, targetContainer, 0);
                
                // Wait longer after moving to ensure Box component's position reset runs first
                // Box component uses 500ms throttle for position reset, so wait 600ms to be safe
                setTimeout(() => {
                  applyPositioning(newNodeId, position);
                }, 600);
              } else {
                applyPositioning(newNodeId, position);
              }
            }, 50); // Small delay to ensure DOM is ready for dimension calculation
            
          } catch (error) {
            console.error('❌ Position correction failed:', error);
          }
          
          // Reset drop state
          dropStateRef.current.isNewDrop = false;
        }, 200); // Increased delay for better DOM stability
      }
    }
    
    dropStateRef.current.lastNodeCount = currentNodeCount;
  }, [query, actions, findContainerAtPosition, calculateRelativePosition, getComponentDimensions, getExistingComponentDimensions]);

  // Handle existing component move completion
  const handleExistingComponentMove = useCallback(() => {
    if (!dropStateRef.current.isExistingMove || !dropStateRef.current.draggedNodeId) {
      return;
    }

    try {
      const { x: mouseX, y: mouseY } = dropStateRef.current.mousePosition;
      const nodeId = dropStateRef.current.draggedNodeId;
      
      // Verify mouse position is reasonable
      if (mouseX <= 0 || mouseY <= 0) {
        console.warn('⚠️ Invalid mouse position for existing component move');
        return;
      }
      
      const targetContainer = findContainerAtPosition(mouseX, mouseY);
      
      // Wait for component to be fully moved/positioned
      setTimeout(() => {
        // Get existing component dimensions
        const componentDimensions = getExistingComponentDimensions(nodeId);
        
        const position = calculateRelativePosition(mouseX, mouseY, targetContainer, componentDimensions);
        
        // Check current parent
        const nodeData = query.node(nodeId).get();
        const currentParent = nodeData.data.parent;
        
        // Move to correct container if needed
        if (currentParent !== targetContainer) {
          actions.move(nodeId, targetContainer, 0);
          
          // Wait longer after moving to ensure position reset completes
          setTimeout(() => {
            applyPositioning(nodeId, position);
          }, 600);
        } else {
          applyPositioning(nodeId, position);
        }
      }, 50);
      
    } catch (error) {
      console.error('❌ Existing component move correction failed:', error);
    }
    
    // Reset existing move state
    dropStateRef.current.isExistingMove = false;
    dropStateRef.current.draggedNodeId = null;
  }, [query, actions, findContainerAtPosition, calculateRelativePosition, getExistingComponentDimensions]);

  // Mouse position tracking
  const lastMousePositionRef = useRef({ x: 0, y: 0 });

  // Position tracking (no visual updates)
  const updatePreviewPosition = useCallback(() => {
    // Visual feedback disabled - no animation needed
    return;
  }, []);

  // Set up event listeners and monitoring
  useEffect(() => {
    // Listen for dragstart events on toolbox items AND existing components
    const handleDragStart = (e) => {
      // Check if this is a drag from the toolbox (NEW component)
      const toolboxItem = e.target.closest('[data-component]');
      if (toolboxItem) {
        const componentName = toolboxItem.getAttribute('data-component');
        
        dropStateRef.current.isNewDrop = true;
        dropStateRef.current.isExistingMove = false;
        dropStateRef.current.draggedComponent = componentName;
        dropStateRef.current.draggedNodeId = null;
        
        // Initialize mouse tracking (no visual feedback)
        lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
        dropStateRef.current.mousePosition = { x: e.clientX, y: e.clientY };
        return;
      }
      
      // Check if this is a drag from an existing component
      const existingComponent = e.target.closest('[data-craft-node-id]');
      if (existingComponent) {
        const nodeId = existingComponent.getAttribute('data-craft-node-id');
        
        // Only handle if it's not ROOT and it's a valid node
        if (nodeId && nodeId !== 'ROOT') {
          try {
            const node = query.node(nodeId);
            if (node) {
              dropStateRef.current.isNewDrop = false;
              dropStateRef.current.isExistingMove = true;
              dropStateRef.current.draggedComponent = null;
              dropStateRef.current.draggedNodeId = nodeId;
              
              // Initialize mouse tracking
              lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
              dropStateRef.current.mousePosition = { x: e.clientX, y: e.clientY };
            }
          } catch (error) {
            // Invalid node, ignore
          }
        }
      }
    };
    
    // Enhanced mouse tracking for position only
    const handleMouseMove = (e) => {
      if (dropStateRef.current.isNewDrop || dropStateRef.current.isExistingMove) {
        // Update stored positions (no visual feedback)
        const newPosition = { x: e.clientX, y: e.clientY };
        dropStateRef.current.mousePosition = newPosition;
        lastMousePositionRef.current = newPosition;
      }
    };
    
    // Listen for dragover to update mouse position during drag
    const handleDragOver = (e) => {
      if (dropStateRef.current.isNewDrop || dropStateRef.current.isExistingMove) {
        e.preventDefault(); // Allow drop
        
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        dropStateRef.current.mousePosition = { x: mouseX, y: mouseY };
        lastMousePositionRef.current = { x: mouseX, y: mouseY };
        
        // Container detection still works (just no visual feedback)
        const targetContainer = findContainerAtPosition(mouseX, mouseY);
        
      }
    };
    
    // Also listen for dragend to capture final position and handle existing moves
    const handleDragEnd = (e) => {
      if (dropStateRef.current.isNewDrop || dropStateRef.current.isExistingMove) {
        
        // Update final mouse position
        dropStateRef.current.mousePosition = {
          x: e.clientX,
          y: e.clientY
        };
        
        // Handle existing component move completion
        if (dropStateRef.current.isExistingMove) {
          // Delay to let Craft.js complete its move operation first
          setTimeout(() => {
            handleExistingComponentMove();
          }, 100);
        }
        
        // No visual cleanup needed since no visuals are shown
      }
    };

    // Handle drag enter for position tracking
    const handleDragEnter = (e) => {
      if (dropStateRef.current.isNewDrop || dropStateRef.current.isExistingMove) {
        e.preventDefault();
        // Just update position - no visual feedback needed
      }
    };

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('mousemove', handleMouseMove);  // Track mouse for position
    
    // Monitor for new components
    const monitorInterval = setInterval(checkForNewComponents, 100);
    
    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragend', handleDragEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      clearInterval(monitorInterval);
    };
  }, [checkForNewComponents, handleExistingComponentMove, findContainerAtPosition, query]);

  // Expose manual trigger for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.triggerPositionCorrection = (nodeId, x, y) => {
        dropStateRef.current.mousePosition = { x, y };
        dropStateRef.current.isNewDrop = true;
        
        setTimeout(() => {
          const targetContainer = findContainerAtPosition(x, y);
          const componentDimensions = getExistingComponentDimensions(nodeId);
          const position = calculateRelativePosition(x, y, targetContainer, componentDimensions);
          
          applyPositioning(nodeId, position);
          dropStateRef.current.isNewDrop = false;
        }, 50);
      };
      
      // Test manual trigger for existing components too
      window.triggerExistingComponentMove = (nodeId, x, y) => {
        dropStateRef.current.mousePosition = { x, y };
        dropStateRef.current.isExistingMove = true;
        dropStateRef.current.draggedNodeId = nodeId;
        
        setTimeout(() => {
          handleExistingComponentMove();
        }, 50);
      };
      window.testContainerDetection = (x, y) => {
        const container = findContainerAtPosition(x, y);
        const position = calculateRelativePosition(x, y, container, { width: 100, height: 50 });
        return { container, position };
      };
      
      // Test current mouse position
      window.getCurrentMousePosition = () => {
        return dropStateRef.current.mousePosition;
      };
      
      // Test positioning with live mouse position
      window.testLivePositioning = () => {
        const rect = document.querySelector('.craft-renderer, [data-editor="true"], .editor-canvas')?.getBoundingClientRect();
        if (rect) {
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          return window.testContainerDetection(centerX, centerY);
        }
        return null;
      };

      // Test visual feedback system (disabled)
      window.testVisualFeedback = (x = 400, y = 300) => {
        return null;
      };

      // Test full drop simulation (positioning only)
      window.testFullDropSimulation = (x = 400, y = 300, componentName = 'Box') => {
        
        // Show actual dimensions (no visual preview)
        const dims = getComponentDimensions(componentName);
        
        // Simulate drag start (position tracking only)
        dropStateRef.current.isNewDrop = true;
        dropStateRef.current.draggedComponent = componentName;
        dropStateRef.current.mousePosition = { x, y };
        
        // Test container detection
        const targetContainer = findContainerAtPosition(x, y);
        
        
        // Auto cleanup after 3 seconds
        setTimeout(() => {
          window.cleanupDropSimulation();
        }, 3000);
        
        return { targetContainer, dimensions: dims };
      };

      // Test dimensions for all components
      window.testAllComponentDimensions = () => {
        const components = ['Box', 'FlexBox', 'GridBox', 'Text', 'Button', 'Image', 'Input', 'Link', 'Video', 'Paragraph', 'Carousel', 'NavBar', 'Form', 'Product'];
        const results = {};
        
        components.forEach(comp => {
          const dims = getComponentDimensions(comp);
          results[comp] = dims;
        });
        
        return results;
      };

      // Test performance and positioning (no visuals)
      window.testDragSmoothness = () => {
        
        let frameCount = 0;
        const startTime = performance.now();
        const testDuration = 2000; // 2 seconds
        
        const simulateMouseMovements = () => {
          if (performance.now() - startTime < testDuration) {
            frameCount++;
            const time = (performance.now() - startTime) / 1000;
            
            // Circular motion for position testing
            const centerX = 400;
            const centerY = 300;
            const radius = 100;
            const x = centerX + radius * Math.cos(time * 3);
            const y = centerY + radius * Math.sin(time * 3);
            
            // Update mouse position (no visual feedback)
            lastMousePositionRef.current = { x, y };
            dropStateRef.current.mousePosition = { x, y };
            dropStateRef.current.isNewDrop = true;
            
            requestAnimationFrame(simulateMouseMovements);
          } else {
            // Test complete
            const fps = frameCount / (testDuration / 1000);
            
            // Cleanup
            dropStateRef.current.isNewDrop = false;
          }
        };
        
        simulateMouseMovements();
      };
      window.testDimensionAccuracy = () => {
        const testComponents = ['Box', 'Text', 'Button', 'Image'];
        
        testComponents.forEach((comp, index) => {
          const x = 200 + (index * 250);
          const y = 200;
          
          setTimeout(() => {
            const result = window.testFullDropSimulation(x, y, comp);
          }, index * 1000);
        });
      };
      window.cleanupDropSimulation = () => {
        dropStateRef.current.isNewDrop = false;
        dropStateRef.current.visualFeedback = null;
      };
    }
  }, [findContainerAtPosition, calculateRelativePosition, applyPositioning, getComponentDimensions, getExistingComponentDimensions, handleExistingComponentMove, createDropPreview, highlightContainer, removeDropPreview, removeContainerHighlight]);

  return {
    // Expose methods for manual control if needed
    correctPosition: useCallback((nodeId, mouseX, mouseY) => {
      const targetContainer = findContainerAtPosition(mouseX, mouseY);
      const position = calculateRelativePosition(mouseX, mouseY, targetContainer);
      
      actions.setProp(nodeId, (props) => {
        props.position = 'absolute';
        props.left = position.x;
        props.top = position.y;
      });
    }, [actions, findContainerAtPosition, calculateRelativePosition]),
    
    // Expose existing component move handler
    handleExistingComponentMove: useCallback((nodeId, mouseX, mouseY) => {
      dropStateRef.current.mousePosition = { x: mouseX, y: mouseY };
      dropStateRef.current.isExistingMove = true;
      dropStateRef.current.draggedNodeId = nodeId;
      
      setTimeout(() => {
        handleExistingComponentMove();
      }, 50);
    }, [handleExistingComponentMove])
  };
};
