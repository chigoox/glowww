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
  DISTANCE_COLOR: '#ff6600', // Orange distance indicators (consistent with Figma)
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
    
    // NEW: Vertical guide lines configuration
    this.verticalGuidesEnabled = true;
    this.verticalGuidesVisible = true;
    this.guideWidth = 960; // Distance between the two vertical guides (safe area width)
    this.guideSnapThreshold = 25; // Snap threshold for guide lines
    this.canvasWidth = 1920; // Will be updated from actual canvas
    this.canvasHeight = 1080; // Will be updated from actual canvas
    
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

  // NEW: Vertical guide lines methods
  
  // Toggle vertical guides visibility
  toggleVerticalGuides() {
    this.verticalGuidesVisible = !this.verticalGuidesVisible;
    this.emitUpdate('vertical-guides-visibility-changed', { visible: this.verticalGuidesVisible });
    return this.verticalGuidesVisible;
  }

  // Set vertical guides enabled/disabled
  setVerticalGuidesEnabled(enabled) {
    this.verticalGuidesEnabled = enabled;
    if (!enabled) {
      this.clearSnapIndicators();
    }
    this.emitUpdate('vertical-guides-toggled', { enabled: this.verticalGuidesEnabled });
  }

  // Update canvas dimensions (important for centering guides)
  updateCanvasSize(width, height) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.clearSnapCache();
    this.emitUpdate('canvas-size-changed', { width, height });
  }

  // Calculate vertical guide positions (960px apart, centered)
  getVerticalGuidePositions() {
    const centerX = this.canvasWidth / 2;
    const halfGuideWidth = this.guideWidth / 2;
    
    return {
      leftGuide: centerX - halfGuideWidth,   // Left vertical line
      rightGuide: centerX + halfGuideWidth,  // Right vertical line
      centerX: centerX,
      safeAreaLeft: centerX - halfGuideWidth,
      safeAreaRight: centerX + halfGuideWidth,
      safeAreaWidth: this.guideWidth
    };
  }

  // Snap to vertical guides
  snapToVerticalGuides(elementBounds) {
    if (!this.verticalGuidesEnabled || !this.snapEnabled) {
      return { snapped: false, x: null, y: null, snapLines: [] };
    }

    const guides = this.getVerticalGuidePositions();
    const snapLines = [];
    let snappedX = null;
    let snapped = false;

    // Check snapping to left guide
    const leftEdgeDistance = Math.abs(elementBounds.left - guides.leftGuide);
    const leftCenterDistance = Math.abs(elementBounds.centerX - guides.leftGuide);
    const rightEdgeToLeftGuideDistance = Math.abs(elementBounds.right - guides.leftGuide);

    // Check snapping to right guide  
    const rightEdgeDistance = Math.abs(elementBounds.right - guides.rightGuide);
    const rightCenterDistance = Math.abs(elementBounds.centerX - guides.rightGuide);
    const leftEdgeToRightGuideDistance = Math.abs(elementBounds.left - guides.rightGuide);

    // Find the closest snap point
    const snapOptions = [
      { distance: leftEdgeDistance, x: guides.leftGuide, type: 'left-edge-to-left-guide' },
      { distance: leftCenterDistance, x: guides.leftGuide - elementBounds.width / 2, type: 'center-to-left-guide' },
      { distance: rightEdgeToLeftGuideDistance, x: guides.leftGuide - elementBounds.width, type: 'right-edge-to-left-guide' },
      { distance: rightEdgeDistance, x: guides.rightGuide - elementBounds.width, type: 'right-edge-to-right-guide' },
      { distance: rightCenterDistance, x: guides.rightGuide - elementBounds.width / 2, type: 'center-to-right-guide' },
      { distance: leftEdgeToRightGuideDistance, x: guides.rightGuide, type: 'left-edge-to-right-guide' }
    ];

    // Find closest snap within threshold
    const closestSnap = snapOptions
      .filter(option => option.distance <= this.guideSnapThreshold)
      .sort((a, b) => a.distance - b.distance)[0];

    if (closestSnap) {
      snappedX = closestSnap.x;
      snapped = true;

      // Add snap line for the guide that was snapped to
      if (closestSnap.type.includes('left-guide')) {
        snapLines.push({
          type: 'vertical',
          x: guides.leftGuide,
          y1: 0,
          y2: this.canvasHeight,
          color: '#ff0000', // Red color for guide lines
          width: 2,
          dashed: true
        });
      } else {
        snapLines.push({
          type: 'vertical', 
          x: guides.rightGuide,
          y1: 0,
          y2: this.canvasHeight,
          color: '#ff0000', // Red color for guide lines
          width: 2,
          dashed: true
        });
      }
    }

    return {
      snapped,
      x: snappedX,
      y: null, // Vertical guides only affect X position
      snapLines
    };
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

  // Get snap position for a resizing element
  getResizeSnapPosition(draggedElementId, direction, currentBounds, newWidth, newHeight) {
    console.log('🔥 SnapGridSystem.getResizeSnapPosition called!', { 
      draggedElementId, 
      direction, 
      currentBounds, 
      newWidth, 
      newHeight, 
      snapEnabled: this.snapEnabled 
    });
    
    if (!this.snapEnabled) {
      console.log('🔥 Snap disabled, returning original bounds');
      return { 
        bounds: { ...currentBounds, width: newWidth, height: newHeight }, 
        snapped: false 
      };
    }

    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateThrottle) {
      return this.lastSnapResult || { 
        bounds: { ...currentBounds, width: newWidth, height: newHeight }, 
        snapped: false 
      };
    }
    this.lastUpdateTime = now;

    // Clear previous snap indicators
    this.clearSnapIndicators();

    const snapResult = {
      bounds: {
        left: currentBounds.left,
        top: currentBounds.top,
        width: newWidth,
        height: newHeight,
        right: currentBounds.left + newWidth,
        bottom: currentBounds.top + newHeight,
        centerX: currentBounds.left + newWidth / 2,
        centerY: currentBounds.top + newHeight / 2
      },
      snapped: false,
      snapLines: [],
      distanceIndicators: []
    };

    // Calculate which edges/points need to be snapped based on resize direction
    const edgesToSnap = this.getResizeEdgesToSnap(direction, snapResult.bounds);

    // Snap each relevant edge
    let hasSnapped = false;
    for (const edge of edgesToSnap) {
      // First try vertical guide snapping for X coordinates
      if (edge.coordinate === 'x' && this.verticalGuidesEnabled) {
        const guides = this.getVerticalGuidePositions();
        const guidePositions = [guides.leftGuide, guides.rightGuide];
        
        for (const guidePos of guidePositions) {
          if (Math.abs(edge.position - guidePos) <= this.guideSnapThreshold) {
            // Apply the snap adjustment to the bounds
            if (edge.type === 'right') {
              snapResult.bounds.width = guidePos - snapResult.bounds.left;
              snapResult.bounds.right = guidePos;
              snapResult.bounds.centerX = snapResult.bounds.left + snapResult.bounds.width / 2;
            } else if (edge.type === 'left') {
              const widthChange = snapResult.bounds.left - guidePos;
              snapResult.bounds.left = guidePos;
              snapResult.bounds.width += widthChange;
              snapResult.bounds.right = snapResult.bounds.left + snapResult.bounds.width;
              snapResult.bounds.centerX = snapResult.bounds.left + snapResult.bounds.width / 2;
            }
            
            // Add vertical guide snap line
            snapResult.snapLines.push({
              type: 'vertical',
              x: guidePos,
              y1: 0,
              y2: this.canvasHeight,
              color: '#ff0000', // Red color for guide lines
              width: 2,
              dashed: true
            });
            
            hasSnapped = true;
            break;
          }
        }
        
        if (hasSnapped) continue; // Skip element snapping if we snapped to guide
      }
      
      // If no guide snapping, try element snapping
      const edgeSnapResult = this.snapResizeEdge(draggedElementId, edge, snapResult.bounds);
      if (edgeSnapResult.snapped) {
        // Apply the snap adjustment to the bounds
        if (edge.type === 'right') {
          snapResult.bounds.width = edgeSnapResult.position - snapResult.bounds.left;
          snapResult.bounds.right = edgeSnapResult.position;
          snapResult.bounds.centerX = snapResult.bounds.left + snapResult.bounds.width / 2;
        } else if (edge.type === 'left') {
          const widthChange = snapResult.bounds.left - edgeSnapResult.position;
          snapResult.bounds.left = edgeSnapResult.position;
          snapResult.bounds.width += widthChange;
          snapResult.bounds.right = snapResult.bounds.left + snapResult.bounds.width;
          snapResult.bounds.centerX = snapResult.bounds.left + snapResult.bounds.width / 2;
        } else if (edge.type === 'bottom') {
          snapResult.bounds.height = edgeSnapResult.position - snapResult.bounds.top;
          snapResult.bounds.bottom = edgeSnapResult.position;
          snapResult.bounds.centerY = snapResult.bounds.top + snapResult.bounds.height / 2;
        } else if (edge.type === 'top') {
          const heightChange = snapResult.bounds.top - edgeSnapResult.position;
          snapResult.bounds.top = edgeSnapResult.position;
          snapResult.bounds.height += heightChange;
          snapResult.bounds.bottom = snapResult.bounds.top + snapResult.bounds.height;
          snapResult.bounds.centerY = snapResult.bounds.top + snapResult.bounds.height / 2;
        }
        
        snapResult.snapLines.push(...edgeSnapResult.snapLines);
        hasSnapped = true;
      }
    }
    
    snapResult.snapped = hasSnapped;

    // Calculate distance indicators only for the resize direction
    const resizeDistanceIndicators = [];
    this.addResizeDistanceIndicators(draggedElementId, direction, snapResult.bounds, resizeDistanceIndicators);
    snapResult.distanceIndicators = resizeDistanceIndicators;

    // Update snap indicators
    this.activeSnapLines = snapResult.snapLines;
    this.activeDistanceIndicators = snapResult.distanceIndicators;
    
    console.log('Resize snap result:', { 
      snapLines: snapResult.snapLines.length, 
      distanceIndicators: snapResult.distanceIndicators.length,
      finalBounds: snapResult.bounds,
      direction
    });
    
    // Emit update for visual feedback
    this.emitUpdate('snap-indicators-changed', {
      snapLines: this.activeSnapLines,
      distanceIndicators: this.activeDistanceIndicators
    });

    this.lastSnapResult = snapResult;
    return snapResult;
  }

  // Determine which edges need to be snapped for a resize operation
  getResizeEdgesToSnap(direction, bounds) {
    const edges = [];
    
    if (direction.includes('e')) {
      edges.push({ type: 'right', position: bounds.right, coordinate: 'x' });
    }
    if (direction.includes('w')) {
      edges.push({ type: 'left', position: bounds.left, coordinate: 'x' });
    }
    if (direction.includes('s')) {
      edges.push({ type: 'bottom', position: bounds.bottom, coordinate: 'y' });
    }
    if (direction.includes('n')) {
      edges.push({ type: 'top', position: bounds.top, coordinate: 'y' });
    }
    
    return edges;
  }

  // Snap a specific edge during resize
  snapResizeEdge(draggedElementId, edge, elementBounds) {
    const snapLines = [];
    let snappedPosition = edge.position;
    let snapped = false;

    // Get other elements to snap to
    const otherElements = Array.from(this.trackedElements.entries())
      .filter(([id]) => id !== draggedElementId)
      .map(([, info]) => info);

    for (const otherElement of otherElements) {
      const other = otherElement.bounds;
      
      if (edge.coordinate === 'x') {
        // Horizontal edge snapping
        const edgePositions = [other.left, other.right, other.centerX];
        
        for (const pos of edgePositions) {
          if (Math.abs(edge.position - pos) <= this.elementSnapThreshold) {
            snappedPosition = pos;
            snapped = true;
            
            // Add snap line
            snapLines.push({
              type: 'vertical',
              x: pos,
              y1: Math.min(elementBounds.top, other.top) - 10,
              y2: Math.max(elementBounds.bottom, other.bottom) + 10,
              color: SNAP_CONFIG.GUIDE_COLOR,
              label: ''
            });
            break;
          }
        }
      } else {
        // Vertical edge snapping
        const edgePositions = [other.top, other.bottom, other.centerY];
        
        for (const pos of edgePositions) {
          if (Math.abs(edge.position - pos) <= this.elementSnapThreshold) {
            snappedPosition = pos;
            snapped = true;
            
            // Add snap line
            snapLines.push({
              type: 'horizontal',
              y: pos,
              x1: Math.min(elementBounds.left, other.left) - 10,
              x2: Math.max(elementBounds.right, other.right) + 10,
              color: SNAP_CONFIG.GUIDE_COLOR,
              label: ''
            });
            break;
          }
        }
      }
      
      if (snapped) break;
    }

    return {
      position: snappedPosition,
      snapped,
      snapLines
    };
  }

  // Add distance indicators specifically for resize operations
  addResizeDistanceIndicators(draggedElementId, direction, intendedBounds, distanceIndicators) {
    console.log('🔧 addResizeDistanceIndicators called:', { 
      draggedElementId, 
      direction, 
      intendedBounds,
      trackedElementsCount: this.trackedElements.size
    });
    
    // Get other elements
    const otherElements = Array.from(this.trackedElements.entries())
      .filter(([id]) => id !== draggedElementId)
      .map(([, info]) => info);

    console.log('🔧 Other elements for distance calc:', otherElements.map(el => ({
      id: el.id,
      bounds: el.bounds
    })));

    const TOUCHING_THRESHOLD = 3; // Consider elements as "touching" if closer than 3px

    for (const otherElement of otherElements) {
      const other = otherElement.bounds;
      
      // Only show distance indicators for the direction being resized
      if (direction.includes('e')) {
        console.log('🔧 Checking right edge resize distance:', {
          elementRight: intendedBounds.right,
          elementActualRight: intendedBounds.left + intendedBounds.width,
          otherLeft: other.left,
          isToTheRight: intendedBounds.right < other.left,
          intendedBounds: intendedBounds
        });
        
        // Resizing right edge - show horizontal distances to the right
        if (intendedBounds.right < other.left) {
          const distance = other.left - intendedBounds.right;
          
          // Check vertical alignment
          const verticalOverlap = Math.max(0, 
            Math.min(intendedBounds.bottom, other.bottom) - Math.max(intendedBounds.top, other.top)
          );
          const minHeight = Math.min(intendedBounds.height, other.height);
          
          console.log('🔧 Right edge distance details:', {
            distance,
            verticalOverlap,
            minHeight,
            overlapThreshold: minHeight * 0.3,
            meetsThreshold: verticalOverlap > minHeight * 0.3,
            withinRange: distance > TOUCHING_THRESHOLD && distance < 200
          });
          
          if (verticalOverlap > minHeight * 0.3 && distance > TOUCHING_THRESHOLD && distance < 200) {
            console.log('🔧 Adding right edge distance indicator!');
            distanceIndicators.push({
              type: 'horizontal',
              x1: intendedBounds.right,
              x2: other.left,
              y: (intendedBounds.centerY + other.centerY) / 2,
              distance: Math.round(distance),
              color: SNAP_CONFIG.DISTANCE_COLOR
            });
          }
        }
      }
      
      if (direction.includes('w')) {
        // Resizing left edge - show horizontal distances to the left
        if (other.right < intendedBounds.left) {
          const distance = intendedBounds.left - other.right;
          
          // Check vertical alignment
          const verticalOverlap = Math.max(0, 
            Math.min(intendedBounds.bottom, other.bottom) - Math.max(intendedBounds.top, other.top)
          );
          const minHeight = Math.min(intendedBounds.height, other.height);
          
          if (verticalOverlap > minHeight * 0.3 && distance > TOUCHING_THRESHOLD && distance < 200) {
            distanceIndicators.push({
              type: 'horizontal',
              x1: other.right,
              x2: intendedBounds.left,
              y: (intendedBounds.centerY + other.centerY) / 2,
              distance: Math.round(distance),
              color: SNAP_CONFIG.DISTANCE_COLOR
            });
          }
        }
      }
      
      if (direction.includes('s')) {
        // Resizing bottom edge - show vertical distances below
        if (intendedBounds.bottom < other.top) {
          const distance = other.top - intendedBounds.bottom;
          
          // Check horizontal alignment
          const horizontalOverlap = Math.max(0, 
            Math.min(intendedBounds.right, other.right) - Math.max(intendedBounds.left, other.left)
          );
          const minWidth = Math.min(intendedBounds.width, other.width);
          
          if (horizontalOverlap > minWidth * 0.3 && distance > TOUCHING_THRESHOLD && distance < 200) {
            distanceIndicators.push({
              type: 'vertical',
              y1: intendedBounds.bottom,
              y2: other.top,
              x: (intendedBounds.centerX + other.centerX) / 2,
              distance: Math.round(distance),
              color: SNAP_CONFIG.DISTANCE_COLOR
            });
          }
        }
      }
      
      if (direction.includes('n')) {
        // Resizing top edge - show vertical distances above
        if (other.bottom < intendedBounds.top) {
          const distance = intendedBounds.top - other.bottom;
          
          // Check horizontal alignment
          const horizontalOverlap = Math.max(0, 
            Math.min(intendedBounds.right, other.right) - Math.max(intendedBounds.left, other.left)
          );
          const minWidth = Math.min(intendedBounds.width, other.width);
          
          if (horizontalOverlap > minWidth * 0.3 && distance > TOUCHING_THRESHOLD && distance < 200) {
            distanceIndicators.push({
              type: 'vertical',
              y1: other.bottom,
              y2: intendedBounds.top,
              x: (intendedBounds.centerX + other.centerX) / 2,
              distance: Math.round(distance),
              color: SNAP_CONFIG.DISTANCE_COLOR
            });
          }
        }
      }
    }
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

    // Calculate element bounds based on current drag position
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
      // Note: Don't add distance indicators from snapToElements - we'll calculate them after final position
    }

    // 3. Vertical guide lines snapping (NEW - highest priority after elements)
    const verticalGuideSnapResult = this.snapToVerticalGuides(elementBounds);
    if (verticalGuideSnapResult.snapped) {
      if (verticalGuideSnapResult.x !== null) snapResult.x = verticalGuideSnapResult.x;
      snapResult.snapped = true;
      snapResult.snapLines.push(...verticalGuideSnapResult.snapLines);
    }

    // 4. Canvas edge snapping
    const canvasSnapResult = this.snapToCanvasEdges(elementBounds);
    if (canvasSnapResult.snapped) {
      if (canvasSnapResult.x !== null) snapResult.x = canvasSnapResult.x;
      if (canvasSnapResult.y !== null) snapResult.y = canvasSnapResult.y;
      snapResult.snapped = true;
      snapResult.snapLines.push(...canvasSnapResult.snapLines);
    }

    // 5. Calculate distance indicators using the FINAL snapped position
    const finalElementBounds = {
      left: snapResult.x,
      top: snapResult.y,
      right: snapResult.x + width,
      bottom: snapResult.y + height,
      width,
      height,
      centerX: snapResult.x + width / 2,
      centerY: snapResult.y + height / 2
    };
    
    // Calculate distance indicators based on final position
    const distanceIndicators = [];
    this.addDistanceIndicators(draggedElementId, finalElementBounds, distanceIndicators);
    snapResult.distanceIndicators = distanceIndicators;

    // Update snap indicators
    this.activeSnapLines = snapResult.snapLines;
    this.activeDistanceIndicators = snapResult.distanceIndicators;
    
    console.log('Snap result:', { 
      snapLines: snapResult.snapLines.length, 
      distanceIndicators: snapResult.distanceIndicators.length,
      finalPosition: { x: snapResult.x, y: snapResult.y },
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

    // Disable grid snap lines for cleaner visual (keep functionality)
    // Snap left edge to grid
    const leftGridSnap = Math.round(elementBounds.left / this.gridSize) * this.gridSize;
    if (Math.abs(elementBounds.left - leftGridSnap) <= this.snapThreshold) {
      snappedX = leftGridSnap;
      snapped = true;
      // Don't add snap line for cleaner look
    }

    // Snap top edge to grid
    const topGridSnap = Math.round(elementBounds.top / this.gridSize) * this.gridSize;
    if (Math.abs(elementBounds.top - topGridSnap) <= this.snapThreshold) {
      snappedY = topGridSnap;
      snapped = true;
      // Don't add snap line for cleaner look
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
          
          // Only show snap lines for the primary alignment types to reduce clutter
          const shouldShowSnapLine = alignment.type === 'center-to-center' || 
                                    alignment.type === 'left-to-left' || 
                                    alignment.type === 'right-to-right';
          
          if (shouldShowSnapLine) {
            let snapLineX;
            if (alignment.type === 'center-to-center') {
              snapLineX = other.centerX;
            } else if (alignment.type === 'left-to-left') {
              snapLineX = other.left;
            } else if (alignment.type === 'right-to-right') {
              snapLineX = other.right;
            }
            
            // Add snap line with shorter length to reduce visual noise
            snapLines.push({
              type: 'vertical',
              x: snapLineX,
              y1: Math.min(elementBounds.top, other.top) - 10,
              y2: Math.max(elementBounds.bottom, other.bottom) + 10,
              color: SNAP_CONFIG.GUIDE_COLOR,
              label: ''
            });
          }

          break; // Only process the first matching alignment to avoid duplicates
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
          
          // Only show snap lines for the primary alignment types to reduce clutter
          const shouldShowSnapLine = alignment.type === 'center-to-center' || 
                                    alignment.type === 'top-to-top' || 
                                    alignment.type === 'bottom-to-bottom';
          
          if (shouldShowSnapLine) {
            let snapLineY;
            if (alignment.type === 'center-to-center') {
              snapLineY = other.centerY;
            } else if (alignment.type === 'top-to-top') {
              snapLineY = other.top;
            } else if (alignment.type === 'bottom-to-bottom') {
              snapLineY = other.bottom;
            }
            
            // Add snap line with shorter length to reduce visual noise
            snapLines.push({
              type: 'horizontal',
              y: snapLineY,
              x1: Math.min(elementBounds.left, other.left) - 10,
              x2: Math.max(elementBounds.right, other.right) + 10,
              color: SNAP_CONFIG.GUIDE_COLOR,
              label: ''
            });
          }

          break; // Only process the first matching alignment to avoid duplicates
        }
      }
    }

    return {
      x: snappedX,
      y: snappedY,
      snapped,
      snapLines
    };
  }

  // Add distance indicators between nearby elements
  addDistanceIndicators(draggedElementId, elementBounds, distanceIndicators) {
    // Get other elements
    const otherElements = Array.from(this.trackedElements.entries())
      .filter(([id]) => id !== draggedElementId)
      .map(([, info]) => info);

    const TOUCHING_THRESHOLD = 3; // Consider elements as "touching" if closer than 3px

    for (const otherElement of otherElements) {
      const other = otherElement.bounds;
      
      // Check for horizontal distance (elements vertically aligned enough)
      const verticalOverlap = Math.max(0, 
        Math.min(elementBounds.bottom, other.bottom) - Math.max(elementBounds.top, other.top)
      );
      const minHeight = Math.min(elementBounds.height, other.height);
      
      if (verticalOverlap > minHeight * 0.3) { // 30% vertical overlap
        let horizontalDistance = 0;
        let x1, x2;
        
        if (elementBounds.right < other.left) {
          // Current element is to the left of other
          horizontalDistance = other.left - elementBounds.right;
          x1 = elementBounds.right;
          x2 = other.left;
        } else if (other.right < elementBounds.left) {
          // Current element is to the right of other
          horizontalDistance = elementBounds.left - other.right;
          x1 = other.right;
          x2 = elementBounds.left;
        }
        
        // Only show distance indicators for meaningful gaps (not touching elements)
        if (horizontalDistance > TOUCHING_THRESHOLD && horizontalDistance < 200) {
          console.log('Adding horizontal distance indicator:', { horizontalDistance, x1, x2 });
          distanceIndicators.push({
            type: 'horizontal',
            x1: x1,
            x2: x2,
            y: (elementBounds.centerY + other.centerY) / 2,
            distance: Math.round(horizontalDistance), // Round to avoid sub-pixel values
            color: SNAP_CONFIG.DISTANCE_COLOR
          });
        }
      }
      
      // Check for vertical distance (elements horizontally aligned enough)
      const horizontalOverlap = Math.max(0, 
        Math.min(elementBounds.right, other.right) - Math.max(elementBounds.left, other.left)
      );
      const minWidth = Math.min(elementBounds.width, other.width);
      
      if (horizontalOverlap > minWidth * 0.3) { // 30% horizontal overlap
        let verticalDistance = 0;
        let y1, y2;
        
        if (elementBounds.bottom < other.top) {
          // Current element is above other
          verticalDistance = other.top - elementBounds.bottom;
          y1 = elementBounds.bottom;
          y2 = other.top;
        } else if (other.bottom < elementBounds.top) {
          // Current element is below other
          verticalDistance = elementBounds.top - other.bottom;
          y1 = other.bottom;
          y2 = elementBounds.top;
        }
        
        // Only show distance indicators for meaningful gaps (not touching elements)
        if (verticalDistance > TOUCHING_THRESHOLD && verticalDistance < 200) {
          console.log('Adding vertical distance indicator:', { verticalDistance, y1, y2 });
          distanceIndicators.push({
            type: 'vertical',
            y1: y1,
            y2: y2,
            x: (elementBounds.centerX + other.centerX) / 2,
            distance: Math.round(verticalDistance), // Round to avoid sub-pixel values
            color: SNAP_CONFIG.DISTANCE_COLOR
          });
        }
      }
    }
  }

  // Snap to canvas edges
  snapToCanvasEdges(elementBounds) {
    if (!this.canvasBounds) return { snapped: false, snapLines: [] };

    const snapLines = [];
    let snappedX = null;
    let snappedY = null;
    let snapped = false;

    // Snap to left edge (keep functionality, remove visual guide)
    if (Math.abs(elementBounds.left) <= this.snapThreshold) {
      snappedX = 0;
      snapped = true;
      // Don't add snap line for cleaner look
    }

    // Snap to top edge (keep functionality, remove visual guide)
    if (Math.abs(elementBounds.top) <= this.snapThreshold) {
      snappedY = 0;
      snapped = true;
      // Don't add snap line for cleaner look
    }

    // Snap to right edge (keep functionality, remove visual guide)
    const rightEdge = this.canvasBounds.width;
    if (Math.abs(elementBounds.right - rightEdge) <= this.snapThreshold) {
      snappedX = rightEdge - elementBounds.width;
      snapped = true;
      // Don't add snap line for cleaner look
    }

    // Snap to bottom edge (keep functionality, remove visual guide)
    const bottomEdge = this.canvasBounds.height;
    if (Math.abs(elementBounds.bottom - bottomEdge) <= this.snapThreshold) {
      snappedY = bottomEdge - elementBounds.height;
      snapped = true;
      // Don't add snap line for cleaner look
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
      elementSnapThreshold: this.elementSnapThreshold,
      verticalGuidesEnabled: this.verticalGuidesEnabled
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
