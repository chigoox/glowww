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
    draggedNodeId: null,
    potentialDragNodeId: null, // Track potential drag from move handle
    craftDragActive: false, // Track if Craft.js drag is active
    dragStartTime: 0 // Track when drag started
  });

  // Find the best container at mouse position
  const findContainerAtPosition = useCallback((x, y) => {
    // Get all elements at position
    const elements = document.elementsFromPoint(x, y);
    
    // Find craft elements that are canvas containers
    const canvasElements = [];
    
    for (const element of elements) {
      const nodeId = element.getAttribute('data-craft-node-id');
      if (nodeId && nodeId !== 'ROOT') {
        try {
          const node = query.node(nodeId);
          if (node && node.isCanvas()) {
            canvasElements.push({
              nodeId,
              element,
              rect: element.getBoundingClientRect()
            });
          }
        } catch (error) {
          continue;
        }
      }
    }


    const isRoot = (elements[0]?.getAttribute('data-cy') === 'editor-root');

    // Check if this is for a new component or existing component
    const isNewComponent = dropStateRef.current.isNewDrop;
    const isExistingComponent = dropStateRef.current.isExistingMove;
    
    if (isNewComponent) {
      // NEW COMPONENTS: Return string nodeId for coordinate conversion
      if (canvasElements.length > 0) {
        // Return the first (topmost) container's nodeId
        return canvasElements[0].nodeId;
      } else {
        // No containers found, return ROOT
        return 'ROOT';
      }
    } else {
      // EXISTING COMPONENTS: Return array for existing logic
      return isRoot ? 'ROOT' : canvasElements;
    }
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
      // Could not get DOM dimensions
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
      // Could not get component type
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

  // Helper function to get screen coordinates of a component
  const getComponentScreenPosition = useCallback((nodeId) => {
    try {
      const node = query.node(nodeId);
      if (node && node.dom) {
        const rect = node.dom.getBoundingClientRect();
        return {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        };
      }
    } catch (error) {
      // Could not get screen position for node
    }
    return null;
  }, [query]);

  // Helper function to get container screen bounds
  const getContainerScreenBounds = useCallback((containerId) => {
    try {
      if (containerId === 'ROOT') {
        // For ROOT, find the main editor canvas area with enhanced selectors
        const selectors = [
          '[data-cy="editor-root"]',
          '.craft-renderer', 
          '[data-editor="true"]',
          '.editor-canvas',
          '[data-page-id]',
          '[data-craft-node-id="ROOT"]',
          '.editor-area',
          '.craft-editor',
          'main[role="main"]',
          '.main-content',
          'iframe'
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            return element.getBoundingClientRect();
          }
        }
        
        // Enhanced fallback - try to find any large container that might be the editor
        const allElements = document.querySelectorAll('div, main, section');
        for (const element of allElements) {
          const rect = element.getBoundingClientRect();
          // Look for a large element that could be the editor canvas
          if (rect.width > 400 && rect.height > 300) {
            return rect;
          }
        }
        
        // Final fallback to viewport
        return {
          left: 0,
          top: 0,
          right: window.innerWidth,
          bottom: window.innerHeight,
          width: window.innerWidth,
          height: window.innerHeight
        };
      } else {
        // For specific containers, use the Craft.js node
        const containerNode = query.node(containerId);
        if (containerNode && containerNode.dom) {
          return containerNode.dom.getBoundingClientRect();
        }
      }
    } catch (error) {
      // Could not get container bounds
    }
    return null;
  }, [query]);

  // Option 1: Convert coordinates between different coordinate systems
  const convertToContainerCoordinates = useCallback((screenX, screenY, targetContainerId, componentDimensions = null) => {
    try {
      
      const containerBounds = getContainerScreenBounds(targetContainerId);
      if (!containerBounds) {
        
        // Enhanced fallback - use mouse position relative to viewport for ROOT
        if (targetContainerId === 'ROOT' || targetContainerId === '') {
          const compWidth = componentDimensions?.width || 200;
          const compHeight = componentDimensions?.height || 200;
          
          // For ROOT without bounds, use screen coordinates directly with centering
          let fallbackX = screenX;
          let fallbackY = screenY;
          
          if (settings.dropPosition.mode === 'center') {
            fallbackX = screenX - (compWidth / 2);
            fallbackY = screenY - (compHeight / 2);
          }
          
          // Ensure component stays within viewport
          fallbackX = Math.max(0, Math.min(fallbackX, window.innerWidth - compWidth));
          fallbackY = Math.max(0, Math.min(fallbackY, window.innerHeight - compHeight));
          
          return { x: fallbackX, y: fallbackY };
        }
        
        // For other containers, return safe fallback
        return { x: 50, y: 50 };
      }

      // Get component dimensions for centering
      const compWidth = componentDimensions?.width || 200;
      const compHeight = componentDimensions?.height || 200;

      // Calculate relative position within container based on positioning mode
      let relativeX, relativeY;
      
      if (settings.dropPosition.mode === 'center') {
        // CENTER MODE: Center the component at screen position
        relativeX = screenX - containerBounds.left - (compWidth / 2);
        relativeY = screenY - containerBounds.top - (compHeight / 2);
      } else {
        // TOP-LEFT MODE: Position top-left corner at screen position
        relativeX = screenX - containerBounds.left;
        relativeY = screenY - containerBounds.top;
      }

      // Account for container padding if available
      if (targetContainerId !== 'ROOT') {
        try {
          const containerNode = query.node(targetContainerId);
          if (containerNode && containerNode.dom) {
            const containerStyle = window.getComputedStyle(containerNode.dom);
            const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
            const paddingTop = parseFloat(containerStyle.paddingTop) || 0;
            relativeX -= paddingLeft;
            relativeY -= paddingTop;
          }
        } catch (error) {
          // Could not get container padding
        }
      }

      // Apply reasonable bounds
      const minX = 0;
      const minY = 0;
      const maxX = Math.max(50, containerBounds.width - compWidth);
      const maxY = Math.max(50, containerBounds.height - compHeight);
      
      const finalX = Math.max(minX, Math.min(relativeX, maxX));
      const finalY = Math.max(minY, Math.min(relativeY, maxY));

    
      return { x: finalX, y: finalY };
    } catch (error) {
      return { x: 50, y: 50 };
    }
  }, [query, settings.dropPosition.mode, getContainerScreenBounds]);

  // Enhanced calculate position that handles all transition types
  const calculateRelativePosition = useCallback((mouseX, mouseY, containerId, componentDimensions = null) => {
    try {
      
      // Use the new coordinate conversion system
      return convertToContainerCoordinates(mouseX, mouseY, containerId, componentDimensions);
    } catch (error) {
      return { x: mouseX - 100, y: mouseY - 100 };
    }
  }, [convertToContainerCoordinates]);

  // Helper function to apply positioning for NEW and EXISTING components
  // Helper function to apply positioning with snap to grid support
// Enhanced applyPositioning function that handles new vs existing components correctly
const applyPositioning = useCallback((nodeId, position) => {
  try {
    // Get the actual component dimensions for precision
    const componentDimensions = getExistingComponentDimensions(nodeId);
    
    let finalX = Math.round(position.x);
    let finalY = Math.round(position.y);
    
    // Apply snap to grid if enabled
    if (settings.dropPosition.snapToGrid && settings.snap.enabled) {
      const gridSize = settings.grid.size || 20;
      finalX = Math.round(finalX / gridSize) * gridSize;
      finalY = Math.round(finalY / gridSize) * gridSize;
    }
    
    // Determine if this is a new component or existing component
    const isNewComponent = dropStateRef.current.isNewDrop;
    const isExistingComponent = dropStateRef.current.isExistingMove;
    

    actions.setProp(nodeId, (props) => {
      try {
        props.position = 'absolute';
        
        // Get parent information
        let parentId = 'ROOT';
        try {
          const nodeData = query.node(nodeId).get();
          parentId = nodeData.data.parent || 'ROOT';
        } catch (error) {
          // Could not get parent from node data
        }
        
        if (isNewComponent) {
          // NEW COMPONENTS: Always use calculated finalX/finalY from coordinate conversion
          props.left = finalX;
          props.top = finalY;
        } else if (isExistingComponent) {
          // EXISTING COMPONENTS: Use your preferred existing component logic
          if (parentId && parentId !== 'ROOT') {
            // For existing components moved to containers, use relative positioning
            try {
              const containerNode = query.node(parentId);
              if (containerNode && containerNode.dom) {
                const rect = containerNode.dom.getBoundingClientRect();
                props.left = dropStateRef.current.mousePosition.x - rect.left;
                props.top = dropStateRef.current.mousePosition.y - rect.top;
              } else {
                // Fallback to coordinate conversion if container not found
                props.left = finalX;
                props.top = finalY;
              }
            } catch (error) {
              // Fallback to coordinate conversion
              props.left = finalX;
              props.top = finalY;
            }
          } else {
            // For ROOT, use coordinate conversion for consistency
            props.left = finalX;
            props.top = finalY;
          }
        } else {
          // FALLBACK: If we can't determine type, use coordinate conversion (safest)
          props.left = finalX;
          props.top = finalY;
        }
      } catch (error) {
        // Failed to apply positioning to props
      }
    });
      
  } catch (error) {
    // Failed to apply positioning
  }
}, [actions, getExistingComponentDimensions, settings.dropPosition.snapToGrid, settings.snap.enabled, settings.grid?.size, settings.dropPosition.mode, query]);
  // Detect new component additions and apply position correction
  const checkForNewComponents = useCallback(() => {
    const currentNodes = query.getNodes();
    const currentNodeCount = Object.keys(currentNodes).length;
    
    if (currentNodeCount > dropStateRef.current.lastNodeCount && dropStateRef.current.isNewDrop) {
      // New component(s) added
      const nodeIds = Object.keys(currentNodes);
      
      // Get the new node IDs by comparing current count vs last count
      const newNodeIds = nodeIds.slice(dropStateRef.current.lastNodeCount);
      
      if (newNodeIds.length > 0) {
        const newNodeId = newNodeIds[0]; // Take the first new node
        
        
        // Apply position correction with longer delay for DOM stability
        setTimeout(() => {
          try {
            const { x: mouseX, y: mouseY } = dropStateRef.current.mousePosition;
            
            // Verify mouse position is reasonable (not 0,0 or negative)
            if (mouseX <= 0 || mouseY <= 0) {
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
              
              // Use enhanced coordinate conversion system
              const position = convertToContainerCoordinates(mouseX, mouseY, targetContainer, componentDimensions);
              
              // Check current parent
              const nodeData = query.node(newNodeId).get();
              const currentParent = nodeData.data.parent;
              
              // Move to correct container if needed
              if (currentParent !== targetContainer) {
                actions.move(newNodeId, targetContainer, 0);
                // Wait longer after moving to ensure Box component's coordinate conversion runs first
                setTimeout(() => {
                  applyPositioning(newNodeId, position);
                }, 600);
              } else {
                applyPositioning(newNodeId, position);
              }
            }, 50); // Small delay to ensure DOM is ready for dimension calculation
            
          } catch (error) {
            // Position correction failed
          }
          
          // Reset drop state
          dropStateRef.current.isNewDrop = false;
        }, 200); // Increased delay for better DOM stability
      }
    }
    
    dropStateRef.current.lastNodeCount = currentNodeCount;
  }, [query, actions, findContainerAtPosition, calculateRelativePosition, getComponentDimensions, getExistingComponentDimensions]);

  // Handle existing component move completion with enhanced coordinate conversion
  const handleExistingComponentMove = useCallback(() => {
    if (!dropStateRef.current.isExistingMove || !dropStateRef.current.draggedNodeId) {
      return;
    }

    try {
      const { x: mouseX, y: mouseY } = dropStateRef.current.mousePosition;
      const nodeId = dropStateRef.current.draggedNodeId;
      
      // Enhanced mouse position validation
      if (mouseX <= 0 || mouseY <= 0 || mouseX >= window.innerWidth || mouseY >= window.innerHeight) {
        // Use fallback position at center of screen
        const fallbackX = window.innerWidth / 2;
        const fallbackY = window.innerHeight / 2;
        dropStateRef.current.mousePosition = { x: fallbackX, y: fallbackY };
      }
      
      // Validate that the dragged node still exists
      let nodeExists = false;
      try {
        const node = query.node(nodeId);
        nodeExists = !!node.get();
      } catch (error) {
        dropStateRef.current.isExistingMove = false;
        dropStateRef.current.draggedNodeId = null;
        return;
      }
      
      if (!nodeExists) {
        dropStateRef.current.isExistingMove = false;
        dropStateRef.current.draggedNodeId = null;
        return;
      }
      
      const targetContainer = findContainerAtPosition(dropStateRef.current.mousePosition.x, dropStateRef.current.mousePosition.y);
      
      // Wait for component to be fully moved/positioned
      setTimeout(() => {
        try {
          // Get current position information
          const nodeData = query.node(nodeId).get();
          const currentParent = nodeData.data.parent;
          
          // Get existing component dimensions
          const componentDimensions = getExistingComponentDimensions(nodeId);
          
          // Calculate position using the enhanced coordinate conversion system
          const position = convertToContainerCoordinates(
            dropStateRef.current.mousePosition.x, 
            dropStateRef.current.mousePosition.y, 
            targetContainer, 
            componentDimensions
          );
          
          // Move to correct container if needed
          if (currentParent !== targetContainer) {
            
            try {
              // Enable actual container moves with coordinate conversion
              actions.move(nodeId, targetContainer, 0);
              applyPositioning(nodeId, position);
              
              // Wait longer after moving to ensure position conversion completes
              setTimeout(() => {
                applyPositioning(nodeId, position);
              }, 600);
            } catch (moveError) {
              // Apply positioning anyway in case the move partially succeeded
              setTimeout(() => {
                applyPositioning(nodeId, position);
              }, 300);
            }
          } else {
            applyPositioning(nodeId, position);
          }
        } catch (positioningError) {
        }
      }, 50);
      
    } catch (error) {
    }
    
    // Reset existing move state
    dropStateRef.current.isExistingMove = false;
    dropStateRef.current.draggedNodeId = null;
  }, [query, actions, findContainerAtPosition, convertToContainerCoordinates, getExistingComponentDimensions, applyPositioning]);

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
      try {
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
        
        // Check if this is a drag from an existing component's MOVE HANDLE specifically
        const moveHandle = e.target.closest('[data-cy="move-handle"], .move-handle, [class*="move"], [title*="Move"]');
        if (moveHandle) {
          // Find the associated craft component
          const existingComponent = moveHandle.closest('[data-craft-node-id]');
          if (existingComponent) {
            const nodeId = existingComponent.getAttribute('data-craft-node-id');
            
            // Only handle if it's not ROOT and it's a valid node
            if (nodeId && nodeId !== 'ROOT') {
              try {
                const node = query.node(nodeId);
                if (node) {
                  // DON'T set drag state immediately - wait for actual drag operation
                  // Just track that we're potentially dragging this component
                  dropStateRef.current.potentialDragNodeId = nodeId;
                  
                  // Initialize mouse tracking but don't mark as active drag yet
                  lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
                  dropStateRef.current.mousePosition = { x: e.clientX, y: e.clientY };
                  
                  // Don't mark elements or interfere with Craft.js drag system
                  return;
                }
              } catch (error) {
              }
            }
          }
        }
        
        // For any other draggable element, check if it's a direct component drag
        // (but not through move handle which we handle above)
        const existingComponent = e.target.closest('[data-craft-node-id]');
        if (existingComponent && !moveHandle) {
          const nodeId = existingComponent.getAttribute('data-craft-node-id');
          
          // Only handle direct component drags (not move handle drags)
          if (nodeId && nodeId !== 'ROOT') {
            try {
              const node = query.node(nodeId);
              if (node) {
                // For direct component drags, we can be more immediate
                dropStateRef.current.isNewDrop = false;
                dropStateRef.current.isExistingMove = true;
                dropStateRef.current.draggedComponent = null;
                dropStateRef.current.draggedNodeId = nodeId;
                
                // Mark the dragged element to help with filtering
                existingComponent.setAttribute('data-craft-dragging', 'true');
                existingComponent.style.pointerEvents = 'none';
                
                // Initialize mouse tracking
                lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
                dropStateRef.current.mousePosition = { x: e.clientX, y: e.clientY };
              }
            } catch (error) {
            }
          }
        }
      } catch (error) {
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
        
      } else if (dropStateRef.current.potentialDragNodeId) {
        // Check if this is a Craft.js drag operation in progress
        // Look for common Craft.js drag indicators with broader selectors
        const craftDropIndicator = document.querySelector(
          '.craft-drop-indicator, [data-cy="drop-indicator"], .drop-indicator, ' +
          '[class*="drop"], [class*="indicator"], [class*="drag-preview"], ' +
          '[data-testid*="drop"], [data-testid*="indicator"]'
        );
        
        // Also check if we're currently in a drag state by looking for dragging classes
        const isDragging = document.querySelector('.craft-dragging, [class*="dragging"], [draggable="true"]:not([draggable="true"][data-component])');
        
        if (craftDropIndicator || isDragging) {
          // Craft.js drag is active, don't interfere yet
          dropStateRef.current.craftDragActive = true;
          
          // Just track mouse position for when the drop completes
          dropStateRef.current.mousePosition = { x: e.clientX, y: e.clientY };
          lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
          
        } else {
          // No obvious Craft.js indicators, but we have a potential drag
          // This might be a direct component move, activate our system
          dropStateRef.current.mousePosition = { x: e.clientX, y: e.clientY };
          lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
        }
      }
    };
    
    // Capture mouseup separately to freeze final release coordinates
    const handleMouseUp = (e) => {
      if (dropStateRef.current.isNewDrop || dropStateRef.current.isExistingMove || dropStateRef.current.potentialDragNodeId) {
        dropStateRef.current.mousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    // Also listen for dragend to capture final position and handle existing moves
    const handleDragEnd = (e) => {
      try {
        if (dropStateRef.current.isNewDrop || dropStateRef.current.isExistingMove) {
          
          // Update final mouse position
          dropStateRef.current.mousePosition = {
            x: e.clientX,
            y: e.clientY
          };
          
          // Clean up dragging markers from DOM elements
          const draggedElements = document.querySelectorAll('[data-craft-dragging="true"]');
          draggedElements.forEach(element => {
            element.removeAttribute('data-craft-dragging');
            element.style.pointerEvents = '';
          });
          
          // Handle existing component move completion
          if (dropStateRef.current.isExistingMove) {
            // Delay to let Craft.js complete its move operation first
            setTimeout(() => {
              handleExistingComponentMove();
            }, 100);
          }
          
        } else if (dropStateRef.current.potentialDragNodeId) {
          // This was a potential Craft.js drag operation
          
          // Update final mouse position
          dropStateRef.current.mousePosition = {
            x: e.clientX,
            y: e.clientY
          };
          
          // Force activate our existing move system
          dropStateRef.current.isExistingMove = true;
          dropStateRef.current.draggedNodeId = dropStateRef.current.potentialDragNodeId;
          dropStateRef.current.craftDragActive = false; // Clear this flag
          
          // Apply position correction with a short delay to let Craft.js finish
          setTimeout(() => {
            handleExistingComponentMove();
          }, 100);
        }
        
        // Reset all drag states
        dropStateRef.current.potentialDragNodeId = null;
        dropStateRef.current.craftDragActive = false;
        dropStateRef.current.dragStartTime = 0;
        
      } catch (error) {
        
        // Ensure cleanup happens even if there's an error
        try {
          const draggedElements = document.querySelectorAll('[data-craft-dragging="true"]');
          draggedElements.forEach(element => {
            element.removeAttribute('data-craft-dragging');
            element.style.pointerEvents = '';
          });
          
          // Reset states
          dropStateRef.current.potentialDragNodeId = null;
          dropStateRef.current.craftDragActive = false;
          dropStateRef.current.dragStartTime = 0;
        } catch (cleanupError) {
        }
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
  document.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('mousemove', handleMouseMove);  // Track mouse for position
    
    // Monitor for new components
    const monitorInterval = setInterval(checkForNewComponents, 100);
    
    // Monitor for Craft.js operations completing
    const craftMonitorInterval = setInterval(() => {
      // If we have a potential drag but no craft indicators, force our system to activate
      if (dropStateRef.current.potentialDragNodeId && !dropStateRef.current.isExistingMove) {
        
        // Check if Craft.js indicators are present
        const craftDropIndicator = document.querySelector(
          '.craft-drop-indicator, [data-cy="drop-indicator"], .drop-indicator, ' +
          '[class*="drop"], [class*="indicator"], [class*="drag-preview"], ' +
          '[data-testid*="drop"], [data-testid*="indicator"]'
        );
        const isDragging = document.querySelector('.craft-dragging, [class*="dragging"], [draggable="true"]:not([draggable="true"][data-component])');
        
        if (!craftDropIndicator && !isDragging) {
          
          // Force activate our system
          dropStateRef.current.isExistingMove = true;
          dropStateRef.current.draggedNodeId = dropStateRef.current.potentialDragNodeId;
          dropStateRef.current.craftDragActive = false;
          
          // Apply position correction
          setTimeout(() => {
            handleExistingComponentMove();
          }, 50);
          
          // Clean up
          dropStateRef.current.potentialDragNodeId = null;
        } else if (craftDropIndicator || isDragging) {
          dropStateRef.current.craftDragActive = true;
        }
      }
    }, 100); // Check every 100ms
    
    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragenter', handleDragEnter);
  document.removeEventListener('dragend', handleDragEnd);
  document.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('mousemove', handleMouseMove);
      clearInterval(monitorInterval);
      clearInterval(craftMonitorInterval);
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

      // Enhanced container detection testing
      window.testContainerDetection = (x, y) => {
        console.log('🧪 Testing container detection at:', { x, y });
        const container = findContainerAtPosition(x, y);
        const position = calculateRelativePosition(x, y, container, { width: 100, height: 50 });
        console.log('🧪 Container detection result:', { container, position });
        return { container, position };
      };

      // Test new coordinate conversion system
      window.testCoordinateConversion = (screenX, screenY, targetContainer, componentDims = { width: 100, height: 50 }) => {
        console.log('🧪 Testing coordinate conversion:', { screenX, screenY, targetContainer, componentDims });
        const result = convertToContainerCoordinates(screenX, screenY, targetContainer, componentDims);
        console.log('🧪 Conversion result:', result);
        return result;
      };

      // Test all coordinate system transitions
      window.testAllCoordinateTransitions = () => {
        const testScreenPos = { x: 400, y: 300 };
        const testDims = { width: 100, height: 50 };
        
        console.log('🧪 Testing all coordinate transitions from screen position:', testScreenPos);
        
        // Test ROOT conversion
        const rootResult = convertToContainerCoordinates(testScreenPos.x, testScreenPos.y, 'ROOT', testDims);
        console.log('📍 ROOT conversion:', rootResult);
        
        // Test container conversions (find available containers)
        const allNodes = query.getNodes();
        const containers = Object.keys(allNodes).filter(nodeId => {
          if (nodeId === 'ROOT') return false;
          try {
            const node = query.node(nodeId);
            return node.isCanvas();
          } catch (error) {
            return false;
          }
        });
        
        console.log('📦 Available containers:', containers);
        
        containers.forEach(containerId => {
          try {
            const containerResult = convertToContainerCoordinates(testScreenPos.x, testScreenPos.y, containerId, testDims);
            console.log(`📍 Container ${containerId} conversion:`, containerResult);
          } catch (error) {
            console.warn(`❌ Failed to convert to container ${containerId}:`, error);
          }
        });
        
        return { rootResult, containers };
      };

      // Test coordinate conversion with real component
      window.testRealComponentConversion = (nodeId, targetX, targetY, targetContainer) => {
        console.log('🧪 Testing real component coordinate conversion:', { nodeId, targetX, targetY, targetContainer });
        
        // Get current position
        const currentScreenPos = getComponentScreenPosition(nodeId);
        if (!currentScreenPos) {
          console.error('❌ Could not get current component position');
          return null;
        }
        
        console.log('📍 Current screen position:', currentScreenPos);
        
        // Get component dimensions
        const componentDims = getExistingComponentDimensions(nodeId);
        console.log('📏 Component dimensions:', componentDims);
        
        // Test conversion to target
        const convertedPos = convertToContainerCoordinates(targetX, targetY, targetContainer, componentDims);
        console.log('🔄 Converted position:', convertedPos);
        
        // Simulate the move
        dropStateRef.current.mousePosition = { x: targetX, y: targetY };
        dropStateRef.current.isExistingMove = true;
        dropStateRef.current.draggedNodeId = nodeId;
        
        setTimeout(() => {
          handleExistingComponentMove();
        }, 50);
        
        return {
          currentPosition: currentScreenPos,
          targetPosition: { x: targetX, y: targetY },
          targetContainer,
          convertedPosition: convertedPos
        };
      };
      
      // Test current mouse position
      window.getCurrentMousePosition = () => {
        return dropStateRef.current.mousePosition;
      };
      
      // Debug DOM elements for specific container
      window.debugContainerDOM = (nodeId) => {
        console.log(`🔍 Debugging DOM for container: ${nodeId}`);
        
        try {
          const node = query.node(nodeId);
          const nodeData = node.get();
          
          console.log('Node data:', {
            exists: !!node,
            isCanvas: node.isCanvas(),
            hasDOM: !!node.dom,
            nodeData: nodeData.data,
            parent: nodeData.data.parent
          });
          
          // Try all possible selectors
          const selectors = [
            `[data-craft-node-id="${nodeId}"]`,
            `[id="${nodeId}"]`,
            `[data-node-id="${nodeId}"]`,
            `.craft-${nodeId}`,
            `[data-cy="${nodeId}"]`
          ];
          
          selectors.forEach(selector => {
            const element = document.querySelector(selector);
            console.log(`Selector "${selector}":`, element ? element.getBoundingClientRect() : 'Not found');
          });
          
          // List all elements with craft node IDs
          const allCraftElements = Array.from(document.querySelectorAll('[data-craft-node-id]'));
          console.log('All craft elements:', allCraftElements.map(el => ({
            nodeId: el.getAttribute('data-craft-node-id'),
            tag: el.tagName,
            classes: el.className,
            rect: el.getBoundingClientRect()
          })));
          
        } catch (error) {
          console.error('Error debugging container:', error);
        }
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
        console.log('🧪 Testing full drop simulation:', { x, y, componentName });
        
        // Show actual dimensions (no visual preview)
        const dims = getComponentDimensions(componentName);
        console.log('📏 Component dimensions:', dims);
        
        // Simulate drag start (position tracking only)
        dropStateRef.current.isNewDrop = true;
        dropStateRef.current.draggedComponent = componentName;
        dropStateRef.current.mousePosition = { x, y };
        
        // Test container detection
        const targetContainer = findContainerAtPosition(x, y);
        console.log('🎯 Target container detected:', targetContainer);
        
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
  }, [checkForNewComponents, handleExistingComponentMove, findContainerAtPosition, query, convertToContainerCoordinates, getComponentScreenPosition, getExistingComponentDimensions]);

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
