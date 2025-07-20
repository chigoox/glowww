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
  THRESHOLD: 8, // pixels
  ELEMENT_THRESHOLD: 12, // pixels for element-to-element snapping
  GUIDE_COLOR: '#ff0000', // Red snap guides like Figma
  DISTANCE_COLOR: '#0099ff', // Blue distance indicators
  SNAP_ANIMATION_DURATION: 150, // ms
  GUIDE_LINE_WIDTH: 1,
  DISTANCE_LINE_WIDTH: 1
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
    this.gridOpacity = 0.3;
    this.snapThreshold = SNAP_CONFIG.THRESHOLD;
    this.elementSnapThreshold = SNAP_CONFIG.ELEMENT_THRESHOLD;
    
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
  }

  // Unregister an element
  unregisterElement(id) {
    this.trackedElements.delete(id);
  }

  // Get snap position for a dragging element
  getSnapPosition(draggedElementId, currentX, currentY, width, height) {
    if (!this.snapEnabled) {
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
    const snapLines = [];
    const distanceIndicators = [];
    let snappedX = null;
    let snappedY = null;
    let snapped = false;

    // Get other elements to snap to
    const otherElements = Array.from(this.trackedElements.entries())
      .filter(([id]) => id !== draggedElementId)
      .map(([, info]) => info);

    for (const otherElement of otherElements) {
      const other = otherElement.bounds;
      
      // Horizontal alignment checks
      const horizontalAlignments = [
        { pos: other.left, type: 'left-to-left', label: 'Left edges' },
        { pos: other.right, type: 'right-to-right', label: 'Right edges' },
        { pos: other.centerX, type: 'center-to-center', label: 'Centers' },
        { pos: other.left - elementBounds.width, type: 'right-to-left', label: 'Right to left' },
        { pos: other.right, type: 'left-to-right', label: 'Left to right' }
      ];

      for (const alignment of horizontalAlignments) {
        if (Math.abs(elementBounds.left - alignment.pos) <= this.elementSnapThreshold) {
          snappedX = alignment.pos;
          snapped = true;
          
          // Add snap line
          snapLines.push({
            type: 'vertical',
            x: alignment.pos,
            y1: Math.min(elementBounds.top, other.top) - 20,
            y2: Math.max(elementBounds.bottom, other.bottom) + 20,
            color: SNAP_CONFIG.GUIDE_COLOR,
            label: alignment.label
          });

          // Add distance indicator if elements are separated
          if (alignment.type === 'right-to-left' || alignment.type === 'left-to-right') {
            const distance = Math.abs(other.left - (elementBounds.left + elementBounds.width));
            if (distance > 0) {
              distanceIndicators.push({
                type: 'horizontal',
                x1: Math.min(other.right, elementBounds.left),
                x2: Math.max(other.left, elementBounds.right),
                y: (elementBounds.centerY + other.centerY) / 2,
                distance,
                color: SNAP_CONFIG.DISTANCE_COLOR
              });
            }
          }
          break;
        }
      }

      // Vertical alignment checks
      const verticalAlignments = [
        { pos: other.top, type: 'top-to-top', label: 'Top edges' },
        { pos: other.bottom, type: 'bottom-to-bottom', label: 'Bottom edges' },
        { pos: other.centerY, type: 'center-to-center', label: 'Centers' },
        { pos: other.top - elementBounds.height, type: 'bottom-to-top', label: 'Bottom to top' },
        { pos: other.bottom, type: 'top-to-bottom', label: 'Top to bottom' }
      ];

      for (const alignment of verticalAlignments) {
        if (Math.abs(elementBounds.top - alignment.pos) <= this.elementSnapThreshold) {
          snappedY = alignment.pos;
          snapped = true;
          
          // Add snap line
          snapLines.push({
            type: 'horizontal',
            y: alignment.pos,
            x1: Math.min(elementBounds.left, other.left) - 20,
            x2: Math.max(elementBounds.right, other.right) + 20,
            color: SNAP_CONFIG.GUIDE_COLOR,
            label: alignment.label
          });

          // Add distance indicator if elements are separated
          if (alignment.type === 'bottom-to-top' || alignment.type === 'top-to-bottom') {
            const distance = Math.abs(other.top - (elementBounds.top + elementBounds.height));
            if (distance > 0) {
              distanceIndicators.push({
                type: 'vertical',
                y1: Math.min(other.bottom, elementBounds.top),
                y2: Math.max(other.top, elementBounds.bottom),
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
        label: 'Canvas left edge'
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
        label: 'Canvas top edge'
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
        label: 'Canvas right edge'
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
        label: 'Canvas bottom edge'
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

  // Get current snap lines (for rendering)
  getActiveSnapLines() {
    return this.activeSnapLines;
  }

  // Get current distance indicators (for rendering)
  getActiveDistanceIndicators() {
    return this.activeDistanceIndicators;
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
