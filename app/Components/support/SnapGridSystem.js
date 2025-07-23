/**
 * SnapGridSystem - Professional snap and grid system similar to Figma/Adobe XD
 * Features:
 * - Smart snapping to grid, elements, and guides
 * - Visual feedback with snap lines and distance indicators
 * - Multiple grid sizes and customizable settings
 * - Element-to-element alignment detection
 * - Professional snap animations and indicators
 */

// Grid configuration presets (similar to Figma)
export const GRID_PRESETS = {
  SMALL: { size: 8, label: '8px Grid', color: 'rgba(0, 0, 0, 0.1)' },
  MEDIUM: { size: 16, label: '16px Grid', color: 'rgba(0, 0, 0, 0.1)' },
  LARGE: { size: 24, label: '24px Grid', color: 'rgba(0, 0, 0, 0.1)' },
  EXTRA_LARGE: { size: 32, label: '32px Grid', color: 'rgba(0, 0, 0, 0.1)' }
};

// Snap configuration
export const SNAP_CONFIG = {
  THRESHOLD: 25, // pixels - increased for easier snapping
  ELEMENT_THRESHOLD: 35, // pixels for element-to-element snapping - much higher for better detection
  CENTER_THRESHOLD: 40, // pixels for center alignment - more forgiving
  GUIDE_COLOR: '#0066ff', // Blue snap guides instead of red for better visibility
  DISTANCE_COLOR: '#ffcc00', // Yellow distance indicators for better visibility
  SNAP_ANIMATION_DURATION: 200, // ms - slightly longer for better visibility
  GUIDE_LINE_WIDTH: 2, // Thicker lines for better visibility
  DISTANCE_LINE_WIDTH: 2 // Thicker lines for distance indicators
};

// Snap types
export const SNAP_TYPES = {
  GRID: 'grid',
  ELEMENT_EDGE: 'element_edge',
  ELEMENT_CENTER: 'element_center',
  CANVAS_EDGE: 'canvas_edge',
  GUIDE: 'guide'
};

class SnapGridSystem {
  constructor() {
    this.gridEnabled = true;  // Enable by default for better UX
    this.gridVisible = true;
    this.snapEnabled = true;
    this.gridSize = GRID_PRESETS.MEDIUM.size;
    this.gridOpacity = 0.5; // Higher opacity for better visibility
    this.snapThreshold = SNAP_CONFIG.THRESHOLD;
    this.elementSnapThreshold = 50; // Increased from 12px to 50px for wider detection range
    
    // Current snap state
    this.activeSnapLines = [];
    this.activeDistanceIndicators = [];
    this.lastSnapResult = null;
    
    // Element tracking for snapping
    this.trackedElements = new Map();
    this.canvasBounds = null;
    
    // Performance optimization
    this.snapCache = new Map();
    this.lastUpdateTime = 0;
    this.updateThrottle = 16; // ~60fps
  }

  // Initialize the system
  initialize(canvasElement) {
    this.canvasElement = canvasElement;
    this.updateCanvasBounds();
    this.setupEventListeners();
    console.log('SnapGridSystem initialized');
  }

  // Update canvas bounds
  updateCanvasBounds() {
    if (this.canvasElement) {
      this.canvasBounds = this.canvasElement.getBoundingClientRect();
    }
  }

  // Setup event listeners
  setupEventListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.updateCanvasBounds());
      
      // Keyboard shortcuts (like Figma)
      document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + ; to toggle snap
        if ((e.ctrlKey || e.metaKey) && e.key === ';') {
          e.preventDefault();
          this.toggleSnap();
        }
        
        // Ctrl/Cmd + ' to toggle grid
        if ((e.ctrlKey || e.metaKey) && e.key === "'") {
          e.preventDefault();
          this.toggleGridVisibility();
        }
        
        // G key to toggle grid (when focused on canvas)
        if (e.key === 'g' || e.key === 'G') {
          if (document.activeElement === this.canvasElement || 
              this.canvasElement?.contains(document.activeElement)) {
            e.preventDefault();
            this.toggleGridVisibility();
          }
        }
      });
    }
  }

  // Toggle grid visibility
  toggleGridVisibility() {
    this.gridVisible = !this.gridVisible;
    this.emitUpdate('grid-visibility-changed', { visible: this.gridVisible });
    return this.gridVisible;
  }

  // Toggle snap functionality
  toggleSnap() {
    this.snapEnabled = !this.snapEnabled;
    if (!this.snapEnabled) {
      this.clearSnapIndicators();
    }
    this.emitUpdate('snap-toggled', { enabled: this.snapEnabled });
    return this.snapEnabled;
  }

  // Set grid size
  setGridSize(size) {
    this.gridSize = size;
    this.clearSnapCache();
    this.emitUpdate('grid-size-changed', { size });
  }

  // Set grid opacity
  setGridOpacity(opacity) {
    this.gridOpacity = Math.max(0, Math.min(1, opacity));
    this.emitUpdate('grid-opacity-changed', { opacity: this.gridOpacity });
  }

  // Register an element for snapping
  registerElement(id, element, bounds) {
    if (!element || !bounds) return;
    
    console.log('📝 Registering element:', id, bounds);
    
    const elementInfo = {
      id,
      element,
      bounds: {
        left: bounds.x || bounds.left || 0,
        top: bounds.y || bounds.top || 0,
        right: (bounds.x || bounds.left || 0) + (bounds.width || 0),
        bottom: (bounds.y || bounds.top || 0) + (bounds.height || 0),
        width: bounds.width || 0,
        height: bounds.height || 0,
        centerX: (bounds.x || bounds.left || 0) + (bounds.width || 0) / 2,
        centerY: (bounds.y || bounds.top || 0) + (bounds.height || 0) / 2
      },
      timestamp: Date.now()
    };
    
    this.trackedElements.set(id, elementInfo);
    console.log('📝 Total tracked elements:', this.trackedElements.size);
  }

  // Unregister an element
  unregisterElement(id) {
    this.trackedElements.delete(id);
  }

  // Get snap position for a dragging element
  getSnapPosition(draggedElementId, currentX, currentY, width, height) {
    console.log('🔥 SnapGridSystem.getSnapPosition called!', { draggedElementId, currentX, currentY, width, height, snapEnabled: this.snapEnabled });
    
    if (!this.snapEnabled) {
      console.log('🔥 Snap disabled, returning original position');
      return { x: currentX, y: currentY, snapped: false };
    }

    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateThrottle) {
      return this.lastSnapResult || { x: currentX, y: currentY, snapped: false };
    }
    this.lastUpdateTime = now;

    // Clear previous snap indicators
    this.clearSnapIndicators();

    const snapResult = {
      x: currentX,
      y: currentY,
      snapped: false,
      snapLines: [],
      distanceIndicators: []
    };

    // Calculate element bounds
    const elementBounds = {
      left: currentX,
      top: currentY,
      right: currentX + width,
      bottom: currentY + height,
      width,
      height,
      centerX: currentX + width / 2,
      centerY: currentY + height / 2
    };

    // 1. Grid snapping
    if (this.gridEnabled) {
      const gridSnapResult = this.snapToGrid(elementBounds);
      if (gridSnapResult.snapped) {
        snapResult.x = gridSnapResult.x;
        snapResult.y = gridSnapResult.y;
        snapResult.snapped = true;
        snapResult.snapLines.push(...gridSnapResult.snapLines);
      }
    }

    // 2. Element-to-element snapping (higher priority than grid)
    const elementSnapResult = this.snapToElements(draggedElementId, elementBounds);
    if (elementSnapResult.snapped) {
      if (elementSnapResult.x !== null) snapResult.x = elementSnapResult.x;
      if (elementSnapResult.y !== null) snapResult.y = elementSnapResult.y;
      snapResult.snapped = true;
      snapResult.snapLines.push(...elementSnapResult.snapLines);
      snapResult.distanceIndicators.push(...elementSnapResult.distanceIndicators);
    }

    // 3. Canvas edge snapping
    const canvasSnapResult = this.snapToCanvasEdges(elementBounds);
    if (canvasSnapResult.snapped) {
      if (canvasSnapResult.x !== null) snapResult.x = canvasSnapResult.x;
      if (canvasSnapResult.y !== null) snapResult.y = canvasSnapResult.y;
      snapResult.snapped = true;
      snapResult.snapLines.push(...canvasSnapResult.snapLines);
    }

    // Update snap indicators
    this.activeSnapLines = snapResult.snapLines;
    this.activeDistanceIndicators = snapResult.distanceIndicators;
    
    console.log('Snap result:', { 
      snapLines: snapResult.snapLines.length, 
      distanceIndicators: snapResult.distanceIndicators.length,
      activeDistanceIndicators: this.activeDistanceIndicators
    });
    
    // Emit update for visual feedback
    this.emitUpdate('snap-indicators-changed', {
      snapLines: this.activeSnapLines,
      distanceIndicators: this.activeDistanceIndicators
    });

    this.lastSnapResult = snapResult;
    return snapResult;
  }

  // Snap to grid
  snapToGrid(elementBounds) {
    const snapLines = [];
    let snappedX = elementBounds.left;
    let snappedY = elementBounds.top;
    let snapped = false;

    // Snap left edge to grid
    const leftGridSnap = Math.round(elementBounds.left / this.gridSize) * this.gridSize;
    if (Math.abs(elementBounds.left - leftGridSnap) <= this.snapThreshold) {
      snappedX = leftGridSnap;
      snapped = true;
      snapLines.push({
        type: 'vertical',
        x: leftGridSnap,
        y1: Math.min(elementBounds.top, 0),
        y2: Math.max(elementBounds.bottom, this.canvasBounds?.height || 1000),
        color: SNAP_CONFIG.GUIDE_COLOR
      });
    }

    // Snap top edge to grid
    const topGridSnap = Math.round(elementBounds.top / this.gridSize) * this.gridSize;
    if (Math.abs(elementBounds.top - topGridSnap) <= this.snapThreshold) {
      snappedY = topGridSnap;
      snapped = true;
      snapLines.push({
        type: 'horizontal',
        y: topGridSnap,
        x1: Math.min(elementBounds.left, 0),
        x2: Math.max(elementBounds.right, this.canvasBounds?.width || 1000),
        color: SNAP_CONFIG.GUIDE_COLOR
      });
    }

    return {
      x: snappedX,
      y: snappedY,
      snapped,
      snapLines
    };
  }

  // Snap to other elements
  snapToElements(draggedElementId, elementBounds) {
    console.log('🎯 snapToElements called for:', draggedElementId);
    const snapLines = [];
    const distanceIndicators = [];
    let snappedX = null;
    let snappedY = null;
    let snapped = false;

    // Get other elements to snap to
    const otherElements = Array.from(this.trackedElements.entries())
      .filter(([id]) => id !== draggedElementId)
      .map(([, info]) => info);

    console.log('🎯 Found other elements:', otherElements.length, Array.from(this.trackedElements.keys()));

    for (const otherElement of otherElements) {
      const other = otherElement.bounds;
      
      // Horizontal alignment checks - prioritize center alignment
      const horizontalAlignments = [
        { pos: other.centerX, type: 'center-to-center', label: '' }, // Remove labels for cleaner look
        { pos: other.left, type: 'left-to-left', label: '' },
        { pos: other.right, type: 'right-to-right', label: '' },
        { pos: other.left - elementBounds.width, type: 'right-to-left', label: '' },
        { pos: other.right, type: 'left-to-right', label: '' }
      ];

      for (const alignment of horizontalAlignments) {
        let elementPos = elementBounds.left; // Default to left edge
        let snapOffset = 0; // Offset to apply when snapping
        
        // Handle different alignment types with proper positioning
        if (alignment.type === 'center-to-center') {
          elementPos = elementBounds.centerX;
          snapOffset = -(elementBounds.width / 2); // Move back to left edge for positioning
        } else if (alignment.type === 'right-to-right') {
          elementPos = elementBounds.right;
          snapOffset = -elementBounds.width; // Move back to left edge for positioning
        } else if (alignment.type === 'left-to-left') {
          elementPos = elementBounds.left;
          snapOffset = 0; // No offset needed - direct left edge alignment
        } else if (alignment.type === 'right-to-left') {
          elementPos = elementBounds.right;
          snapOffset = -elementBounds.width; // Position right edge of element to left edge of other
        } else if (alignment.type === 'left-to-right') {
          elementPos = elementBounds.left;
          snapOffset = 0; // Direct positioning
        }
        
        // Use more forgiving threshold for center alignment
        const threshold = alignment.type === 'center-to-center' 
          ? SNAP_CONFIG.CENTER_THRESHOLD 
          : this.elementSnapThreshold;
        
        if (Math.abs(elementPos - alignment.pos) <= threshold) {
          snappedX = alignment.pos + snapOffset;
          snapped = true;
          
          // Calculate the actual visual alignment line position  
          // For debugging, let's always use the actual element edge positions
          let snapLineX;
          if (alignment.type === 'center-to-center') {
            snapLineX = other.centerX;
          } else if (alignment.type === 'left-to-left') {
            snapLineX = other.left;
          } else if (alignment.type === 'right-to-right') {
            snapLineX = other.right;
          } else if (alignment.type === 'left-to-right') {
            snapLineX = other.right;
          } else if (alignment.type === 'right-to-left') {
            snapLineX = other.left;
          } else {
            snapLineX = other.left; // Default to left edge
          }
          
          // Add snap line
          snapLines.push({
            type: 'vertical',
            x: snapLineX,
            y1: Math.min(elementBounds.top, other.top) - 20,
            y2: Math.max(elementBounds.bottom, other.bottom) + 20,
            color: SNAP_CONFIG.GUIDE_COLOR,
            label: alignment.label
          });

          // Add simple distance indicator for adjacent elements only
          if (alignment.type === 'right-to-left' || alignment.type === 'left-to-right') {
            let distance, x1, x2;
            
            if (alignment.type === 'left-to-right') {
              distance = Math.abs(elementBounds.left - other.right);
              x1 = other.right;
              x2 = elementBounds.left;
            } else { // right-to-left
              distance = Math.abs(elementBounds.right - other.left);
              x1 = elementBounds.right;
              x2 = other.left;
            }
            
            // Show distance indicators for a wider range of meaningful spacing
            if (distance > 1 && distance < 1000) {
              console.log('Creating horizontal distance indicator:', { distance, x1, x2, y: (elementBounds.centerY + other.centerY) / 2 });
              distanceIndicators.push({
                type: 'horizontal',
                x1: Math.min(x1, x2),
                x2: Math.max(x1, x2),
                y: (elementBounds.centerY + other.centerY) / 2,
                distance,
                color: SNAP_CONFIG.DISTANCE_COLOR
              });
            }
          }
          break;
        }
      }

      // Vertical alignment checks - prioritize center alignment  
      const verticalAlignments = [
        { pos: other.centerY, type: 'center-to-center', label: '' }, // Remove labels for cleaner look
        { pos: other.top, type: 'top-to-top', label: '' },
        { pos: other.bottom, type: 'bottom-to-bottom', label: '' },
        { pos: other.top - elementBounds.height, type: 'bottom-to-top', label: '' },
        { pos: other.bottom, type: 'top-to-bottom', label: '' }
      ];

      for (const alignment of verticalAlignments) {
        let elementPos = elementBounds.top; // Default to top edge
        let snapOffset = 0; // Offset to apply when snapping
        
        // Handle different alignment types with proper positioning
        if (alignment.type === 'center-to-center') {
          elementPos = elementBounds.centerY;
          snapOffset = -(elementBounds.height / 2); // Move back to top edge for positioning
        } else if (alignment.type === 'bottom-to-bottom') {
          elementPos = elementBounds.bottom;
          snapOffset = -elementBounds.height; // Move back to top edge for positioning
        } else if (alignment.type === 'top-to-top') {
          elementPos = elementBounds.top;
          snapOffset = 0; // No offset needed - direct top edge alignment
        } else if (alignment.type === 'bottom-to-top') {
          elementPos = elementBounds.bottom;
          snapOffset = -elementBounds.height; // Position bottom edge of element to top edge of other
        } else if (alignment.type === 'top-to-bottom') {
          elementPos = elementBounds.top;
          snapOffset = 0; // Direct positioning
        }
        
        // Use more forgiving threshold for center alignment
        const threshold = alignment.type === 'center-to-center' 
          ? SNAP_CONFIG.CENTER_THRESHOLD 
          : this.elementSnapThreshold;
        
        if (Math.abs(elementPos - alignment.pos) <= threshold) {
          snappedY = alignment.pos + snapOffset;
          snapped = true;
          
          // Calculate the actual visual alignment line position
          // For debugging, let's always use the actual element edge positions  
          let snapLineY;
          if (alignment.type === 'center-to-center') {
            snapLineY = other.centerY;
          } else if (alignment.type === 'top-to-top') {
            snapLineY = other.top;
          } else if (alignment.type === 'bottom-to-bottom') {
            snapLineY = other.bottom;
          } else if (alignment.type === 'top-to-bottom') {
            snapLineY = other.bottom;
          } else if (alignment.type === 'bottom-to-top') {
            snapLineY = other.top;
          } else {
            snapLineY = other.top; // Default to top edge
          }
          
          // Add snap line
          snapLines.push({
            type: 'horizontal',
            y: snapLineY,
            x1: Math.min(elementBounds.left, other.left) - 20,
            x2: Math.max(elementBounds.right, other.right) + 20,
            color: SNAP_CONFIG.GUIDE_COLOR,
            label: alignment.label
          });

          // Add simple distance indicator for adjacent elements only
          if (alignment.type === 'bottom-to-top' || alignment.type === 'top-to-bottom') {
            let distance, y1, y2;
            
            if (alignment.type === 'top-to-bottom') {
              distance = Math.abs(elementBounds.top - other.bottom);
              y1 = other.bottom;
              y2 = elementBounds.top;
            } else { // bottom-to-top
              distance = Math.abs(elementBounds.bottom - other.top);
              y1 = elementBounds.bottom;
              y2 = other.top;
            }
            
            // Show distance indicators for a wider range of meaningful spacing
            if (distance > 1 && distance < 1000) {
              console.log('Creating vertical distance indicator:', { distance, y1, y2, x: (elementBounds.centerX + other.centerX) / 2 });
              distanceIndicators.push({
                type: 'vertical',
                y1: Math.min(y1, y2),
                y2: Math.max(y1, y2),
                x: (elementBounds.centerX + other.centerX) / 2,
                distance,
                color: SNAP_CONFIG.DISTANCE_COLOR
              });
            }
          }
          break;
        }
      }
    }

    // Additional distance indicators for nearby elements (regardless of alignment)
    // This makes yellow guides appear at greater distances
    const now = Date.now(); // Define now timestamp
    for (const [otherId, otherElement] of this.trackedElements.entries()) {
      if (otherId === draggedElementId || now - otherElement.lastUpdate > 60000) continue;
      
      const other = otherElement.bounds;
      
      // Check if elements are vertically close enough to show horizontal distance
      const verticalOverlap = Math.max(0, Math.min(elementBounds.bottom, other.bottom) - Math.max(elementBounds.top, other.top));
      const verticalAlignment = verticalOverlap > Math.min(elementBounds.height, other.height) * 0.3; // 30% overlap
      
      if (verticalAlignment) {
        // Calculate horizontal distances
        let horizontalDistance = 0;
        let x1, x2;
        
        if (elementBounds.right < other.left) {
          // Element is to the left of other
          horizontalDistance = other.left - elementBounds.right;
          x1 = elementBounds.right;
          x2 = other.left;
        } else if (other.right < elementBounds.left) {
          // Element is to the right of other  
          horizontalDistance = elementBounds.left - other.right;
          x1 = other.right;
          x2 = elementBounds.left;
        }
        
        // Show distance indicators for a much wider range
        if (horizontalDistance > 5 && horizontalDistance < 2000) {
          console.log('Creating nearby horizontal distance indicator:', { horizontalDistance, x1, x2 });
          distanceIndicators.push({
            type: 'horizontal',
            x1: Math.min(x1, x2),
            x2: Math.max(x1, x2),
            y: (elementBounds.centerY + other.centerY) / 2,
            distance: horizontalDistance,
            color: SNAP_CONFIG.DISTANCE_COLOR
          });
        }
      }
      
      // Check if elements are horizontally close enough to show vertical distance
      const horizontalOverlap = Math.max(0, Math.min(elementBounds.right, other.right) - Math.max(elementBounds.left, other.left));
      const horizontalAlignment = horizontalOverlap > Math.min(elementBounds.width, other.width) * 0.3; // 30% overlap
      
      if (horizontalAlignment) {
        // Calculate vertical distances
        let verticalDistance = 0;
        let y1, y2;
        
        if (elementBounds.bottom < other.top) {
          // Element is above other
          verticalDistance = other.top - elementBounds.bottom;
          y1 = elementBounds.bottom;
          y2 = other.top;
        } else if (other.bottom < elementBounds.top) {
          // Element is below other
          verticalDistance = elementBounds.top - other.bottom;
          y1 = other.bottom;
          y2 = elementBounds.top;
        }
        
        // Show distance indicators for a much wider range
        if (verticalDistance > 5 && verticalDistance < 2000) {
          console.log('Creating nearby vertical distance indicator:', { verticalDistance, y1, y2 });
          distanceIndicators.push({
            type: 'vertical',
            y1: Math.min(y1, y2),
            y2: Math.max(y1, y2),
            x: (elementBounds.centerX + other.centerX) / 2,
            distance: verticalDistance,
            color: SNAP_CONFIG.DISTANCE_COLOR
          });
        }
      }
    }

    return {
      x: snappedX,
      y: snappedY,
      snapped,
      snapLines,
      distanceIndicators
    };
  }

  // Snap to canvas edges
  snapToCanvasEdges(elementBounds) {
    if (!this.canvasBounds) return { snapped: false, snapLines: [] };

    const snapLines = [];
    let snappedX = null;
    let snappedY = null;
    let snapped = false;

    // Snap to left edge
    if (Math.abs(elementBounds.left) <= this.snapThreshold) {
      snappedX = 0;
      snapped = true;
      snapLines.push({
        type: 'vertical',
        x: 0,
        y1: 0,
        y2: this.canvasBounds.height,
        color: SNAP_CONFIG.GUIDE_COLOR,
        label: '' // Remove label for cleaner look
      });
    }

    // Snap to top edge
    if (Math.abs(elementBounds.top) <= this.snapThreshold) {
      snappedY = 0;
      snapped = true;
      snapLines.push({
        type: 'horizontal',
        y: 0,
        x1: 0,
        x2: this.canvasBounds.width,
        color: SNAP_CONFIG.GUIDE_COLOR,
        label: '' // Remove label for cleaner look
      });
    }

    // Snap to right edge
    const rightEdge = this.canvasBounds.width;
    if (Math.abs(elementBounds.right - rightEdge) <= this.snapThreshold) {
      snappedX = rightEdge - elementBounds.width;
      snapped = true;
      snapLines.push({
        type: 'vertical',
        x: rightEdge,
        y1: 0,
        y2: this.canvasBounds.height,
        color: SNAP_CONFIG.GUIDE_COLOR,
        label: '' // Remove label for cleaner look
      });
    }

    // Snap to bottom edge
    const bottomEdge = this.canvasBounds.height;
    if (Math.abs(elementBounds.bottom - bottomEdge) <= this.snapThreshold) {
      snappedY = bottomEdge - elementBounds.height;
      snapped = true;
      snapLines.push({
        type: 'horizontal',
        y: bottomEdge,
        x1: 0,
        x2: this.canvasBounds.width,
        color: SNAP_CONFIG.GUIDE_COLOR,
        label: '' // Remove label for cleaner look
      });
    }

    return {
      x: snappedX,
      y: snappedY,
      snapped,
      snapLines
    };
  }

  // Clear snap indicators
  clearSnapIndicators() {
    this.activeSnapLines = [];
    this.activeDistanceIndicators = [];
    this.emitUpdate('snap-indicators-cleared');
  }

  // Clear snap cache
  clearSnapCache() {
    this.snapCache.clear();
  }

  // Emit updates to subscribers
  emitUpdate(eventType, data = {}) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('snapGridUpdate', {
        detail: { type: eventType, ...data }
      }));
    }
  }

  // Get current settings
  getSettings() {
    return {
      gridEnabled: this.gridEnabled,
      gridVisible: this.gridVisible,
      snapEnabled: this.snapEnabled,
      gridSize: this.gridSize,
      gridOpacity: this.gridOpacity,
      snapThreshold: this.snapThreshold,
      elementSnapThreshold: this.elementSnapThreshold
    };
  }

  // Update settings
  updateSettings(settings) {
    Object.keys(settings).forEach(key => {
      if (this.hasOwnProperty(key)) {
        this[key] = settings[key];
      }
    });
    
    this.clearSnapCache();
    this.emitUpdate('settings-updated', settings);
  }

  // Enable/disable grid
  setGridEnabled(enabled) {
    this.gridEnabled = enabled;
    this.emitUpdate('grid-enabled-changed', { enabled });
  }

  // Enable/disable snap
  setSnapEnabled(enabled) {
    this.snapEnabled = enabled;
    if (!enabled) {
      this.clearSnapIndicators();
    }
    this.emitUpdate('snap-toggled', { enabled });
  }

  // Get current snap lines (for rendering)
  getActiveSnapLines() {
    return this.activeSnapLines;
  }

  // Get current distance indicators (for rendering)
  getActiveDistanceIndicators() {
    return this.activeDistanceIndicators;
  }

  // Show snap indicators explicitly (for better control during drag)
  showSnapIndicators(snapLines) {
    this.activeSnapLines = snapLines || [];
    this.emitUpdate('snap-indicators-changed', { 
      snapLines: this.activeSnapLines,
      distanceIndicators: this.activeDistanceIndicators 
    });
  }

  // Update snap indicators (force overlay update)
  updateSnapIndicators() {
    this.emitUpdate('snap-indicators-changed', { 
      snapLines: this.activeSnapLines,
      distanceIndicators: this.activeDistanceIndicators 
    });
  }

  // Clean up old tracked elements
  cleanupTrackedElements() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute
    
    for (const [id, info] of this.trackedElements.entries()) {
      if (now - info.timestamp > maxAge) {
        this.trackedElements.delete(id);
      }
    }
  }

  // Destroy the system
  destroy() {
    this.clearSnapIndicators();
    this.trackedElements.clear();
    this.snapCache.clear();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.updateCanvasBounds);
    }
  }
}

// Create singleton instance
export const snapGridSystem = new SnapGridSystem();
export default snapGridSystem;
