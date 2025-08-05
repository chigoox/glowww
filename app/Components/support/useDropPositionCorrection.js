'use client';

import { useEditor } from "@craftjs/core";
import { useCallback, useRef, useEffect } from "react";

/**
 * Drop Position Correction System with Visual Feedback
 * 
 * This system works WITH the existing Craft.js drag system:
 * 1. Let Craft.js handle component creation (which works reliably)
 * 2. Detect when a new component is added
 * 3. Calculate the intended position based on mouse position during drop
 * 4. Move the component to the correct position after creation
 * 5. Provide visual feedback during drag operations
 */
export const useDropPositionCorrection = () => {
  const { actions, query } = useEditor();
  const dropStateRef = useRef({
    isNewDrop: false,
    mousePosition: { x: 0, y: 0 },
    targetContainer: null,
    lastNodeCount: 0,
    visualFeedback: null,
    draggedComponent: null
  });

  // Find the best container at mouse position
  const findContainerAtPosition = useCallback((x, y) => {
    console.log('🔍 Looking for container at position:', { x, y });
    
    const elements = document.elementsFromPoint(x, y);
    console.log('📋 Elements at position:', elements.map(el => ({
      tag: el.tagName,
      classes: Array.from(el.classList),
      nodeId: el.getAttribute('data-craft-node-id')
    })));
    
    // First, try to find any canvas container (Box with canvas: true)
    for (const element of elements) {
      const nodeId = element.getAttribute('data-craft-node-id');
      if (nodeId && nodeId !== 'ROOT') {
        try {
          const node = query.node(nodeId);
          if (node.isCanvas()) {
            console.log('🎯 Found canvas container:', nodeId);
            return nodeId;
          }
        } catch (error) {
          // Ignore non-existent nodes
        }
      }
    }
    
    // If no canvas container found, use ROOT as the main canvas
    console.log('🔄 No specific canvas found, using ROOT');
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
      console.log('📏 Using component dimensions for', componentName, ':', dims);
      return dims;
    } catch (error) {
      console.warn('Could not get component dimensions for:', componentName, error);
      return { width: 200, height: 200 };
    }
  }, []);

  // For existing components, get dimensions from DOM or nodeId
  const getExistingComponentDimensions = useCallback((nodeId) => {
    try {
      const node = query.node(nodeId);
      if (node && node.dom) {
        const rect = node.dom.getBoundingClientRect();
        console.log('📏 Using actual DOM dimensions for', nodeId, ':', { width: rect.width, height: rect.height });
        return { width: rect.width, height: rect.height };
      }
    } catch (error) {
      console.warn('Could not get DOM dimensions for:', nodeId, error);
    }
    
    // Fallback dimensions
    console.log('📏 Using fallback dimensions for existing component:', nodeId);
    return { width: 200, height: 200 };
  }, [query]);

  // Create drop preview (visual feedback disabled)
  const createDropPreview = useCallback((mouseX, mouseY, componentName) => {
    // Visual feedback disabled - return null but keep function for compatibility
    console.log('📐 Component dimensions calculated for', componentName, ':', getComponentDimensions(componentName));
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
      console.log('📏 Calculating position for container:', containerId);
      
      let containerElement = null;
      let containerRect = null;
      
      if (containerId === 'ROOT') {
        // For ROOT, find the main editor canvas area
        containerElement = document.querySelector('[data-cy="editor-root"], .craft-renderer, [data-editor="true"]');
        if (!containerElement) {
          // Fallback to Frame element
          containerElement = document.querySelector('iframe, [data-page-id]');
        }
        if (!containerElement) {
          // Last resort - use the main editor container
          containerElement = document.querySelector('.flex-1.p-4.overflow-auto.bg-gray-100, .editor-canvas');
        }
        
        if (containerElement) {
          containerRect = containerElement.getBoundingClientRect();
          console.log('🎯 Using ROOT container element:', {
            element: containerElement.tagName,
            classes: Array.from(containerElement.classList),
            rect: containerRect
          });
        }
      } else {
        // For specific containers, use the Craft.js node
        const containerNode = query.node(containerId);
        if (containerNode && containerNode.dom) {
          containerElement = containerNode.dom;
          containerRect = containerElement.getBoundingClientRect();
        }
      }
      
      if (!containerElement || !containerRect) {
        console.warn('Container element or rect not found, using fallback position');
        return { x: 50, y: 50 };
      }
      
      // Get component dimensions for centering (use fallback if not provided)
      const compWidth = componentDimensions?.width || 100;
      const compHeight = componentDimensions?.height || 50;
      
      // Calculate relative position within container - CENTER the component at mouse position
      const relativeX = mouseX - containerRect.left - (compWidth / 2);
      const relativeY = mouseY - containerRect.top - (compHeight / 2);

      // Account for container padding if it exists
      const containerStyle = window.getComputedStyle(containerElement);
      const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
      const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
      
      // For absolute positioning, adjust for padding and ensure reasonable bounds
      const minX = paddingLeft + 10;
      const minY = paddingTop + 10;
      const maxX = containerRect.width - paddingLeft - compWidth - 10; // Leave space for component
      const maxY = containerRect.height - paddingTop - compHeight - 10;
      
      const finalX = Math.max(minX, Math.min(relativeX, maxX));
      const finalY = Math.max(minY, Math.min(relativeY, maxY));

      console.log('📍 Position calculation details (CENTERED):', {
        container: containerId,
        mouse: { x: mouseX, y: mouseY },
        componentSize: { width: compWidth, height: compHeight },
        containerRect: { 
          left: containerRect.left, 
          top: containerRect.top, 
          width: containerRect.width, 
          height: containerRect.height 
        },
        padding: { left: paddingLeft, top: paddingTop },
        relative: { x: relativeX, y: relativeY },
        bounds: { minX, minY, maxX, maxY },
        final: { x: finalX, y: finalY }
      });

      return { x: finalX, y: finalY };
    } catch (error) {
      console.warn('Failed to calculate relative position:', error);
      return { x: 50, y: 50 };
    }
  }, [query]);

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
        console.log('🆕 New component detected for positioning:', newNodeId);
        
        // Apply position correction with longer delay for DOM stability
        setTimeout(() => {
          try {
            const { x: mouseX, y: mouseY } = dropStateRef.current.mousePosition;
            console.log('🎯 Applying position correction at mouse:', { mouseX, mouseY });
            
            // Verify mouse position is reasonable (not 0,0 or negative)
            if (mouseX <= 0 || mouseY <= 0) {
              console.warn('⚠️ Invalid mouse position detected, using center of screen');
              const fallbackX = window.innerWidth / 2;
              const fallbackY = window.innerHeight / 2;
              dropStateRef.current.mousePosition = { x: fallbackX, y: fallbackY };
            }
            
            const targetContainer = findContainerAtPosition(mouseX, mouseY);
            console.log('📦 Target container identified:', targetContainer);
            
            // Wait a moment for the new component to be fully rendered
            setTimeout(() => {
              // Get component dimensions for accurate centering - use the SAME function as preview
              const componentName = dropStateRef.current.draggedComponent;
              const componentDimensions = getComponentDimensions(componentName); // Use component name, not nodeId
              console.log('📏 Component dimensions for final positioning:', componentDimensions, 'for component:', componentName);
              
              const position = calculateRelativePosition(mouseX, mouseY, targetContainer, componentDimensions);
              console.log('📍 Position calculated (should be centered):', position);
              
              // Check current parent
              const nodeData = query.node(newNodeId).get();
              const currentParent = nodeData.data.parent;
              
              // Move to correct container if needed
              if (currentParent !== targetContainer) {
                console.log('📦 Moving to correct container:', { from: currentParent, to: targetContainer });
                actions.move(newNodeId, targetContainer, 0);
                
                // Wait longer after moving to ensure Box component's position reset runs first
                // Box component uses 500ms throttle for position reset, so wait 600ms to be safe
                setTimeout(() => {
                  console.log('⏰ Applying position correction after container move and reset...');
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
  
  // Helper function to apply positioning
  const applyPositioning = useCallback((nodeId, position) => {
    try {
      // Get the actual component dimensions again for precision
      const componentDimensions = getExistingComponentDimensions(nodeId);
      console.log('📏 Final positioning - component dimensions:', componentDimensions);
      
      actions.setProp(nodeId, (props) => {
        props.position = 'absolute';
        
        // Apply the position that was calculated to center the component
        // The calculateRelativePosition already accounts for centering
        props.left = Math.round(position.x);
        props.top = Math.round(position.y);
        
        console.log('✅ Position correction applied (centered):', { 
          nodeId, 
          x: Math.round(position.x), 
          y: Math.round(position.y),
          dimensions: componentDimensions
        });
      });
    } catch (error) {
      console.error('❌ Failed to apply positioning:', error);
    }
  }, [actions, getExistingComponentDimensions]);

  // Mouse position tracking
  const lastMousePositionRef = useRef({ x: 0, y: 0 });

  // Position tracking (no visual updates)
  const updatePreviewPosition = useCallback(() => {
    // Visual feedback disabled - no animation needed
    return;
  }, []);

  // Set up event listeners and monitoring
  useEffect(() => {
    // Listen for dragstart events on toolbox items
    const handleDragStart = (e) => {
      // Check if this is a drag from the toolbox
      const toolboxItem = e.target.closest('[data-component]');
      if (toolboxItem) {
        const componentName = toolboxItem.getAttribute('data-component');
        console.log('🎯 Toolbox drag started, enabling position correction for:', componentName);
        
        dropStateRef.current.isNewDrop = true;
        dropStateRef.current.draggedComponent = componentName;
        
        // Initialize mouse tracking (no visual feedback)
        lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
        dropStateRef.current.mousePosition = { x: e.clientX, y: e.clientY };
        
        console.log('🎯 Initial drag position:', dropStateRef.current.mousePosition);
      }
    };
    
    // Enhanced mouse tracking for position only
    const handleMouseMove = (e) => {
      if (dropStateRef.current.isNewDrop) {
        // Update stored positions (no visual feedback)
        const newPosition = { x: e.clientX, y: e.clientY };
        dropStateRef.current.mousePosition = newPosition;
        lastMousePositionRef.current = newPosition;
      }
    };
    
    // Listen for dragover to update mouse position during drag
    const handleDragOver = (e) => {
      if (dropStateRef.current.isNewDrop) {
        e.preventDefault(); // Allow drop
        
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        dropStateRef.current.mousePosition = { x: mouseX, y: mouseY };
        lastMousePositionRef.current = { x: mouseX, y: mouseY };
        
        // Container detection still works (just no visual feedback)
        const targetContainer = findContainerAtPosition(mouseX, mouseY);
        
        console.log('🎯 Drag over position (container detection):', dropStateRef.current.mousePosition);
      }
    };
    
    // Also listen for dragend to capture final position
    const handleDragEnd = (e) => {
      if (dropStateRef.current.isNewDrop) {
        console.log('🎯 Drag ended, final mouse position:', { x: e.clientX, y: e.clientY });
        
        // Update final mouse position
        dropStateRef.current.mousePosition = {
          x: e.clientX,
          y: e.clientY
        };
        
        // No visual cleanup needed since no visuals are shown
      }
    };

    // Handle drag enter for position tracking
    const handleDragEnter = (e) => {
      if (dropStateRef.current.isNewDrop) {
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
  }, [checkForNewComponents, createDropPreview, findContainerAtPosition]);

  // Expose manual trigger for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.triggerPositionCorrection = (nodeId, x, y) => {
        console.log('🧪 Manual position correction triggered');
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
      
      // Test function to check container detection
      window.testContainerDetection = (x, y) => {
        console.log('🧪 Testing container detection at:', { x, y });
        const container = findContainerAtPosition(x, y);
        const position = calculateRelativePosition(x, y, container, { width: 100, height: 50 });
        console.log('🎯 Result:', { container, position });
        return { container, position };
      };
      
      // Test current mouse position
      window.getCurrentMousePosition = () => {
        console.log('🧪 Current tracked mouse position:', dropStateRef.current.mousePosition);
        return dropStateRef.current.mousePosition;
      };
      
      // Test positioning with live mouse position
      window.testLivePositioning = () => {
        const rect = document.querySelector('.craft-renderer, [data-editor="true"], .editor-canvas')?.getBoundingClientRect();
        if (rect) {
          console.log('🧪 Main editor area:', rect);
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          return window.testContainerDetection(centerX, centerY);
        }
        return null;
      };

      // Test visual feedback system (disabled)
      window.testVisualFeedback = (x = 400, y = 300) => {
        console.log('🧪 Visual feedback disabled - positioning system only');
        return null;
      };

      // Test full drop simulation (positioning only)
      window.testFullDropSimulation = (x = 400, y = 300, componentName = 'Box') => {
        console.log('🧪 Testing positioning system with component:', componentName);
        
        // Show actual dimensions (no visual preview)
        const dims = getComponentDimensions(componentName);
        console.log('📐 Component dimensions:', dims);
        
        // Simulate drag start (position tracking only)
        dropStateRef.current.isNewDrop = true;
        dropStateRef.current.draggedComponent = componentName;
        dropStateRef.current.mousePosition = { x, y };
        
        // Test container detection
        const targetContainer = findContainerAtPosition(x, y);
        console.log('🎯 Target container:', targetContainer);
        
        console.log('🧪 Positioning test complete - no visual feedback');
        
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
        
        console.log('🧪 Testing dimensions for all components:');
        components.forEach(comp => {
          const dims = getComponentDimensions(comp);
          results[comp] = dims;
          console.log(`📐 ${comp}:`, dims);
        });
        
        return results;
      };

      // Test performance and positioning (no visuals)
      window.testDragSmoothness = () => {
        console.log('🧪 Testing positioning performance (no visual feedback)...');
        
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
            console.log(`🎯 Position tracking test complete! Average FPS: ${fps.toFixed(1)}`);
            
            // Cleanup
            dropStateRef.current.isNewDrop = false;
          }
        };
        
        simulateMouseMovements();
      };
      window.testDimensionAccuracy = () => {
        const testComponents = ['Box', 'Text', 'Button', 'Image'];
        console.log('🧪 Testing dimension accuracy with visual previews...');
        
        testComponents.forEach((comp, index) => {
          const x = 200 + (index * 250);
          const y = 200;
          
          setTimeout(() => {
            const result = window.testFullDropSimulation(x, y, comp);
            console.log(`📐 ${comp} test result:`, result);
          }, index * 1000);
        });
      };
      window.cleanupDropSimulation = () => {
        dropStateRef.current.isNewDrop = false;
        dropStateRef.current.visualFeedback = null;
        console.log('🧪 Drop simulation cleaned up');
      };
    }
  }, [findContainerAtPosition, calculateRelativePosition, applyPositioning, getComponentDimensions, getExistingComponentDimensions, createDropPreview, highlightContainer, removeDropPreview, removeContainerHighlight]);

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
    }, [actions, findContainerAtPosition, calculateRelativePosition])
  };
};
