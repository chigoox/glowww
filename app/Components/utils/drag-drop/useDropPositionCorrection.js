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
  dragStartTime: 0, // Track when drag started
  lastDetectedContainer: null // Remember last valid container to reduce ROOT fallbacks
  });

  // Reliable reparent with retries to avoid node snapping back to ROOT
  const ensureParent = useCallback(async (nodeId, targetParentId, { attempts = 5, interval = 80, index = 0 } = {}) => {
    if (!nodeId || !targetParentId) return false;
    let success = false;
    for (let i = 0; i < attempts; i++) {
      try {
        const currentParent = query.node(nodeId).get().data.parent;
        // Protection: never downgrade a node from a non-ROOT canvas parent to ROOT due to detection failure
        if (targetParentId === 'ROOT' && currentParent && currentParent !== 'ROOT') {
          try {
            const n = query.node(currentParent);
            const isCanvasParent = n?.isCanvas?.() || ['Box','FlexBox','GridBox'].includes(n?.get()?.data?.displayName || n?.get()?.data?.type);
            if (isCanvasParent) {
              console.log('🛡️ Preventing reparent to ROOT; keeping existing canvas parent', { nodeId, currentParent });
              return true; // treat as success to stop retries
            }
          } catch(_) {}
        }
        if (currentParent === targetParentId) {
          success = true;
          break;
        }
        // Validate target container is a canvas & droppable
        let targetOk = true;
        try {
          const targetNode = query.node(targetParentId);
          if (!targetNode || !targetNode.isCanvas()) targetOk = false;
          const rules = targetNode.get().data?.rules;
          if (rules && rules.canMoveIn) {
            // If rules exist and disallow node, skip move
            if (!rules.canMoveIn(query.node(nodeId).get())) targetOk = false;
          }
        } catch (_) {
          targetOk = false;
        }
        if (!targetOk) {
          console.warn('🚫 Target container not valid for move', { nodeId, targetParentId });
          break;
        }
        actions.move(nodeId, targetParentId, index);
      } catch (err) {
        console.warn('⚠️ move attempt failed', i + 1, err);
      }
      // Wait before next verification
      await new Promise(r => setTimeout(r, interval));
    }
    // Final verify
    try {
      const finalParent = query.node(nodeId).get().data.parent;
      success = success || finalParent === targetParentId;
    } catch (_) {}
    if (!success) {
      console.warn('❌ Failed to reparent node after retries', { nodeId, targetParentId });
    } else {
      console.log('✅ Reparent confirmed', { nodeId, parent: targetParentId });
    }
    return success;
  }, [actions, query]);

  // Find the best container at mouse position (robust multi-strategy)
  const findContainerAtPosition = useCallback((x, y) => {
    const elements = document.elementsFromPoint(x, y);
    const debugInfo = [];

    // Whitelist of known canvas display names/types provided by user
    const FORCED_CANVAS_NAMES = new Set(['Box', 'FlexBox', 'GridBox']);
    // Optional DOM class / attribute markers (can be added to components later)
    const CANVAS_CLASS_MARKERS = ['gl-canvas', 'editor-canvas', 'craft-canvas'];
    const CANVAS_ATTR_MARKERS = ['data-gl-canvas', 'data-canvas', 'data-editor-canvas'];

    const isCanvasNode = (nodeId) => {
      try {
        const n = query.node(nodeId);
        if (!n) return false;
        // Primary Craft flag
        if (n.isCanvas()) return true;
        // Fallback: check displayName / type against forced list
        try {
          const data = n.get()?.data;
          const displayName = data?.displayName || data?.type || '';
          if (displayName && FORCED_CANVAS_NAMES.has(displayName)) {
            return true;
          }
        } catch (_) {}
        // Fallback: inspect DOM element markers
        const domEl = n.dom;
        if (domEl) {
          try {
            // Class markers
            const classList = Array.from(domEl.classList || []);
            if (classList.some(c => CANVAS_CLASS_MARKERS.includes(c))) return true;
            // Attribute markers
            for (const attr of CANVAS_ATTR_MARKERS) {
              if (domEl.hasAttribute(attr)) return true;
            }
            // Heuristic: data-component attribute in whitelist
            const compAttr = domEl.getAttribute('data-component');
            if (compAttr && FORCED_CANVAS_NAMES.has(compAttr)) return true;
          } catch (_) {}
        }
        return false;
      } catch (_) {
        return false;
      }
    };

    const getFirstCanvasAncestor = (nodeId) => {
      if (!nodeId || nodeId === 'ROOT') return null;
      try {
        if (isCanvasNode(nodeId)) return nodeId;
        const n = query.node(nodeId).get();
        const ancestors = n.data?.parent ? [n.data.parent, ...(n.data.linkedNodes ? Object.values(n.data.linkedNodes) : [])] : [];
        // Walk up simple parent chain first
        let current = n.data.parent;
        const visited = new Set();
        while (current && !visited.has(current)) {
          visited.add(current);
            if (isCanvasNode(current)) return current;
          try {
            current = query.node(current).get().data.parent;
          } catch (_) {
            break;
          }
        }
      } catch (_) {}
      return null;
    };

    // Pass 1: direct ancestor walk from hit elements
    for (const el of elements) {
      let current = el;
      while (current) {
        const nodeId = current.getAttribute?.('data-craft-node-id');
        if (nodeId && nodeId !== 'ROOT') {
          const canvasAncestor = getFirstCanvasAncestor(nodeId);
          if (canvasAncestor) {
            const rect = current.getBoundingClientRect();
            debugInfo.push({ stage: 'ancestor-hit', nodeId, canvasAncestor, rect });
            dropStateRef.current.lastDetectedContainer = canvasAncestor;
            console.log('🎯 Canvas ancestor detected:', canvasAncestor, { x, y, via: nodeId, rect });
            return canvasAncestor;
          }
        }
        current = current.parentElement;
      }
    }

    // Pass 2: collect all craft nodes, map to canvases
    const candidateMap = new Map();
    for (const el of elements) {
      const nodeId = el.getAttribute?.('data-craft-node-id');
      if (!nodeId || nodeId === 'ROOT') continue;
      const canvasAncestor = getFirstCanvasAncestor(nodeId);
      if (canvasAncestor) {
        try {
          const rect = el.getBoundingClientRect();
          const area = rect.width * rect.height;
          const existing = candidateMap.get(canvasAncestor);
          // Keep the smallest area rect for specificity
          if (!existing || area < existing.area) {
            candidateMap.set(canvasAncestor, { rect, area, via: nodeId });
          }
          debugInfo.push({ stage: 'direct-candidate', nodeId, canvasAncestor, rect });
        } catch (_) {}
      }
    }

    let chosenId = null;
    if (candidateMap.size) {
      // Pick canvas with smallest area (most specific)
      const sorted = [...candidateMap.entries()].sort((a, b) => a[1].area - b[1].area);
      chosenId = sorted[0][0];
      debugInfo.push({ stage: 'smallest-area-picked', chosenId });
    }
console.log('first')
    // Pass 3: global scan (expensive) only if still no candidate
    if (!chosenId) {
      try {
        const allNodes = query.getNodes();
        const globalCandidates = [];
        Object.keys(allNodes).forEach(id => {
          if (id === 'ROOT') return;
          if (!isCanvasNode(id)) return;
          try {
            const domEl = query.node(id)?.dom;
            if (!domEl) return;
            const rect = domEl.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
              globalCandidates.push({ id, rect, area: rect.width * rect.height });
              debugInfo.push({ stage: 'global-contained', nodeId: id, rect });
            }
          } catch (_) {}
        });
        if (globalCandidates.length) {
          globalCandidates.sort((a, b) => a.area - b.area);
          chosenId = globalCandidates[0].id;
          debugInfo.push({ stage: 'global-picked', chosenId });
        }
      } catch (e) {
        debugInfo.push({ stage: 'global-scan-error', error: e.message });
      }
    }
console.log('second')
    // Pass 4: reuse last detected container
    if (!chosenId && dropStateRef.current.lastDetectedContainer) {
      chosenId = dropStateRef.current.lastDetectedContainer;
      debugInfo.push({ stage: 'reuse-last', nodeId: chosenId });
    }

    // Pass 5: Pure DOM scan fallback (in case Craft node wrapping differs)
    if (!chosenId) {
      try {
        const FORCED_CANVAS_NAMES = new Set(['Box','FlexBox','GridBox']);
        const CLASS_MARKERS = ['gl-canvas','editor-canvas','craft-canvas'];
        const ATTR_MARKERS = ['data-gl-canvas','data-canvas','data-editor-canvas'];
        const domCandidates = [];
        // Collect all DOM elements that look like canvases
        const selector = CLASS_MARKERS.map(c=>'.'+c).join(',') + ', ' + ATTR_MARKERS.map(a=>`[${a}]`).join(',') + ', [data-component]';
        const possible = document.querySelectorAll(selector);
        possible.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            // Heuristic name
            const compAttr = el.getAttribute('data-component');
            const looksForced = compAttr && FORCED_CANVAS_NAMES.has(compAttr);
            const classList = Array.from(el.classList||[]);
            const hasMarkerClass = classList.some(c=>CLASS_MARKERS.includes(c));
            const hasAttrMarker = ATTR_MARKERS.some(a=>el.hasAttribute(a));
            if (looksForced || hasMarkerClass || hasAttrMarker) {
              // Map to craft node id if present
              const nid = el.getAttribute('data-craft-node-id');
              domCandidates.push({ id: nid, rect, area: rect.width * rect.height, compAttr });
            }
          }
        });
        // Filter to ones that map to existing craft nodes & look like canvases
        const validated = domCandidates.filter(c => {
          if (!c.id || c.id === 'ROOT') return false;
            try {
              const n = query.node(c.id);
              if (!n) return false;
              if (n.isCanvas()) return true;
              const data = n.get()?.data;
              const dn = data?.displayName || data?.type;
              if (['Box','FlexBox','GridBox'].includes(dn)) return true;
            } catch(_) { return false; }
            return false;
        });
        if (validated.length) {
          validated.sort((a,b)=>a.area-b.area);
          chosenId = validated[0].id;
          debugInfo.push({ stage: 'dom-fallback-picked', chosenId });
        }
      } catch(domErr) {
        debugInfo.push({ stage: 'dom-fallback-error', error: domErr.message });
      }
    }

    if (chosenId) {
      dropStateRef.current.lastDetectedContainer = chosenId;
      console.log('🎯 Container detected:', chosenId, { x, y, debugInfo });
      return chosenId;
    }

    // Diagnostics when totally failing
    console.log('📍 Container detection -> ROOT', { x, y, reason: 'no-canvas-candidates', debugInfo, hint: 'Verify components set isCanvas: true in their craft config.' });
    // Provide one-time helper listing canvases
    if (!window.__listedCanvases) {
      window.__listedCanvases = true;
      try {
        const all = query.getNodes();
        const canvases = Object.keys(all).filter(id => id !== 'ROOT').map(id => {
          let nodeWrapper, data, displayName, isCanvasFlag = false, forced = false;
          try { nodeWrapper = query.node(id); data = nodeWrapper.get().data; displayName = data.displayName || data.type; isCanvasFlag = nodeWrapper.isCanvas(); } catch(_) {}
          if (!isCanvasFlag && displayName && FORCED_CANVAS_NAMES.has(displayName)) forced = true;
          const dom = nodeWrapper?.dom; let rect = null; try { rect = dom?.getBoundingClientRect(); } catch(_){}
          return { id, displayName, isCanvasFlag, forcedCanvas: forced, hasDOM: !!dom, rect };        
        });
        console.log('🧾 Available canvases snapshot:', canvases);
        if (!canvases.some(c => c.isCanvasFlag || c.forcedCanvas)) {
          console.warn('⚠️ No canvases detected. Ensure components export craft = { rules: { canMoveIn: ... }, displayName, ... } and set canMoveIn / isCanvas where needed.');
        }
      } catch (e) { console.warn('Canvas snapshot failed', e); }
    }
    console.log('returning root')
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
    console.log('🔍 Getting bounds for container:', containerId);
    
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
            const bounds = element.getBoundingClientRect();
            console.log('📐 ROOT bounds found via', selector, ':', bounds);
            return bounds;
          }
        }
        
        // Enhanced fallback - try to find any large container that might be the editor
        const allElements = document.querySelectorAll('div, main, section');
        for (const element of allElements) {
          const rect = element.getBoundingClientRect();
          // Look for a large element that could be the editor canvas
          if (rect.width > 400 && rect.height > 300) {
            console.log('📐 ROOT bounds found via large element:', rect);
            return rect;
          }
        }
        
        // Final fallback to viewport
        const viewportBounds = {
          left: 0,
          top: 0,
          right: window.innerWidth,
          bottom: window.innerHeight,
          width: window.innerWidth,
          height: window.innerHeight
        };
        console.log('📐 ROOT bounds using viewport fallback:', viewportBounds);
        return viewportBounds;
      } else {
        // For specific containers, try multiple methods
        console.log('🔍 Looking for non-ROOT container:', containerId);
        
        // Method 1: Use Craft.js node
        try {
          const containerNode = query.node(containerId);
          if (containerNode && containerNode.dom) {
            const bounds = containerNode.dom.getBoundingClientRect();
            console.log('📐 Container bounds via Craft node:', bounds);
            return bounds;
          }
        } catch (error) {
          console.log('⚠️ Craft node lookup failed for', containerId, ':', error.message);
        }
        
        // Method 2: Direct DOM lookup
        const containerElement = document.querySelector(`[data-craft-node-id="${containerId}"]`);
        if (containerElement) {
          const bounds = containerElement.getBoundingClientRect();
          console.log('📐 Container bounds via direct DOM:', bounds);
          return bounds;
        }
        
        console.log('❌ No bounds found for container:', containerId);
      }
    } catch (error) {
      console.error('❌ Error getting container bounds:', error);
    }
    return null;
  }, [query]);

  // ---------------------------------------------------------------------------
  // Unified low-level coordinate converter (client -> container local)
  // Replaces ad-hoc logic inside convertToContainerCoordinates. Handles:
  // - window scroll
  // - container padding + borders
  // - inner scroll
  // - optional centering of component
  // - clamping inside content box
  // NOTE: CSS transforms / nested offset contexts not explicitly handled yet.
  // ---------------------------------------------------------------------------
  function toContainerCoords({
    clientX,
    clientY,
    containerEl,
    compWidth = 0,
    compHeight = 0,
    center = true,
    clamp = true
  }) {
    if (!containerEl || !containerEl.getBoundingClientRect) {
      return { x: 0, y: 0 };
    }

    // 1) client -> page
    const pageX = clientX + window.scrollX;
    const pageY = clientY + window.scrollY;

    // 2) container rect (viewport) -> page
    const rect = containerEl.getBoundingClientRect();
    const containerPageLeft = rect.left + window.scrollX;
    const containerPageTop  = rect.top  + window.scrollY;

    // 3) styles (padding/borders)
    const cs = window.getComputedStyle(containerEl);
    const padL = parseFloat(cs.paddingLeft)  || 0;
    const padT = parseFloat(cs.paddingTop)   || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    const padB = parseFloat(cs.paddingBottom)|| 0;
    const borL = parseFloat(cs.borderLeftWidth)   || 0;
    const borT = parseFloat(cs.borderTopWidth)    || 0;
    const borR = parseFloat(cs.borderRightWidth)  || 0;
    const borB = parseFloat(cs.borderBottomWidth) || 0;

    // 4) inner scroll
    const scrollL = containerEl.scrollLeft || 0;
    const scrollT = containerEl.scrollTop  || 0;

    // 5) convert to content-box local coords
    let x = pageX - containerPageLeft - borL - padL + scrollL;
    let y = pageY - containerPageTop  - borT - padT + scrollT;

    if (center) {
      x -= compWidth / 2;
      y -= compHeight / 2;
    }

    // 6) clamp (optional)
    if (clamp) {
      const innerW = rect.width  - padL - padR - borL - borR;
      const innerH = rect.height - padT - padB - borT - borB;
      const maxX = Math.max(0, innerW - compWidth);
      const maxY = Math.max(0, innerH - compHeight);
      x = Math.min(Math.max(0, x), maxX);
      y = Math.min(Math.max(0, y), maxY);
    }

    return { x: Math.round(x), y: Math.round(y) };
  }

  // Option 1: Convert coordinates between different coordinate systems
  const convertToContainerCoordinates = useCallback((screenX, screenY, targetContainerId, componentDimensions = null) => {
    // Normalize id variants
    if (Array.isArray(targetContainerId)) {
      const first = targetContainerId[0];
      targetContainerId = first ? (first.nodeId || first.id || 'ROOT') : 'ROOT';
    } else if (targetContainerId && typeof targetContainerId === 'object') {
      targetContainerId = targetContainerId.nodeId || targetContainerId.id || 'ROOT';
    }
    if (typeof targetContainerId !== 'string') targetContainerId = 'ROOT';

    const compWidth = componentDimensions?.width || 200;
    const compHeight = componentDimensions?.height || 200;
    const center = settings.dropPosition.mode === 'center';

    // Resolve container element
    let containerEl = null;
    if (targetContainerId === 'ROOT') {
      containerEl = document.querySelector('[data-cy="editor-root"], .craft-renderer, [data-craft-node-id="ROOT"], .editor-canvas, [data-editor="true"]');
      if (!containerEl) {
        // As a last resort, use body (will clamp to viewport via custom logic)
        containerEl = document.body;
      }
    } else {
      try {
        const node = query.node(targetContainerId);
        containerEl = node?.dom || document.querySelector(`[data-craft-node-id="${targetContainerId}"]`);
      } catch (_) {
        containerEl = document.querySelector(`[data-craft-node-id="${targetContainerId}"]`);
      }
    }

    if (!containerEl) {
      console.warn('⚠️ No containerEl resolved, using fallback (50,50)');
      return { x: 50, y: 50 };
    }

    try {
      const result = toContainerCoords({
        clientX: screenX,
        clientY: screenY,
        containerEl,
        compWidth,
        compHeight,
        center,
        clamp: true
      });
      console.log('✅ toContainerCoords result:', { targetContainerId, ...result });
      return result;
    } catch (err) {
      console.error('❌ toContainerCoords error, fallback (50,50)', err);
      return { x: 50, y: 50 };
    }
  }, [query, settings.dropPosition.mode]);

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
const applyPositioning = useCallback((nodeId, position, containerIdUsed = 'ROOT') => {
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
        // If the position was calculated against a different container (often ROOT) adjust to actual parent
        if (parentId !== containerIdUsed && parentId !== 'ROOT') {
          try {
            const parentDom = query.node(parentId)?.dom;
            let usedDom = null;
            if (containerIdUsed === 'ROOT') {
              usedDom = document.querySelector('[data-cy="editor-root"], .craft-renderer, [data-craft-node-id="ROOT"]');
            } else {
              usedDom = query.node(containerIdUsed)?.dom;
            }
            if (parentDom && usedDom) {
              const parentRect = parentDom.getBoundingClientRect();
              const usedRect = usedDom.getBoundingClientRect();
              // Translate coordinates from used container space into parent container space
              const deltaX = usedRect.left - parentRect.left;
              const deltaY = usedRect.top - parentRect.top;
              console.log(parentRect)
              finalX -= deltaX;
              finalY -= deltaY;
              // Clamp within parent bounds
              const pW = parentRect.width || 1;
              const pH = parentRect.height || 1;
              const maxX = Math.max(0, pW - componentDimensions.width);
              const maxY = Math.max(0, pH - componentDimensions.height);
              if (finalX < 0 || finalY < 0 || finalX > maxX || finalY > maxY) {
                finalX = Math.min(Math.max(0, finalX), maxX);
                finalY = Math.min(Math.max(0, finalY), maxY);
              }
              console.log('🧭 Adjusted position from', containerIdUsed, 'space to parent', parentId, { finalX, finalY, deltaX, deltaY });
            }
          } catch (adjErr) {
            console.warn('⚠️ Position adjustment failed', adjErr);
          }
        }

        // Always trust (possibly adjusted) coordinates
        props.left = finalX;
        props.top = finalY;

        // Percentage conversion only for newly dropped components and only once
        if (isNewComponent && !props._percentConverted) {
          try {
            let containerEl = null;
            if (parentId && parentId !== 'ROOT') {
              const containerNode = query.node(parentId);
              containerEl = containerNode?.dom || null;
            } else {
              // Attempt to find main editor root element
              containerEl = document.querySelector('[data-cy="editor-root"], .craft-renderer, [data-craft-node-id="ROOT"]');
            }
            if (containerEl) {
              const crect = containerEl.getBoundingClientRect();
              const cW = crect.width || 1;
              const cH = crect.height || 1;
              // If left/top numeric, convert to % strings
              if (typeof props.left === 'number') {
                const pctLeft = (props.left / cW) * 100;
                props.left = parseFloat(pctLeft.toFixed(3)) + '%';
              }
              if (typeof props.top === 'number') {
                const pctTop = (props.top / cH) * 100;
                props.top = parseFloat(pctTop.toFixed(3)) + '%';
              }
              // Width/height: if numeric (explicit) convert too
              if (typeof props.width === 'number' && props.width > 0) {
                const pctW = (props.width / cW) * 100;
                props.width = parseFloat(pctW.toFixed(3)) + '%';
              }
              if (typeof props.height === 'number' && props.height > 0) {
                const pctH = (props.height / cH) * 100;
                props.height = parseFloat(pctH.toFixed(3)) + '%';
              }
              props._percentConverted = true; // flag to prevent double conversion
            }
          } catch (convErr) {
            // Silent fail; keep px values
          }
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
            
            let targetContainer = findContainerAtPosition(mouseX, mouseY);

            // Helper to judge if a nodeId is a canvas-y container
            const isLikelyCanvas = (id) => {
              if (!id || id === 'ROOT') return false;
              try {
                const nodeWrapper = query.node(id);
                if (nodeWrapper?.isCanvas()) return true;
                const data = nodeWrapper?.get()?.data;
                const name = data?.displayName || data?.type;
                if (['Box','FlexBox','GridBox'].includes(name)) return true;
                const domEl = nodeWrapper?.dom;
                if (domEl) {
                  const cls = Array.from(domEl.classList||[]);
                  if (cls.some(c=>['gl-canvas','editor-canvas','craft-canvas'].includes(c))) return true;
                  for (const attr of ['data-gl-canvas','data-canvas','data-editor-canvas']) {
                    if (domEl.hasAttribute(attr)) return true;
                  }
                }
              } catch(_) {}
              return false;
            };

            // If detection fell back to ROOT but Craft already assigned a non-ROOT parent, prefer existing parent
            try {
              const nodeDataPre = query.node(newNodeId).get();
              const currentParentPre = nodeDataPre.data.parent;
              if (targetContainer === 'ROOT' && currentParentPre && currentParentPre !== 'ROOT' && isLikelyCanvas(currentParentPre)) {
                // Validate mouse position is inside current parent bounds
                const parentDom = query.node(currentParentPre)?.dom;
                if (parentDom) {
                  const rect = parentDom.getBoundingClientRect();
                  if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
                    console.log('🛡️ Preserving existing parent (new component) instead of ROOT:', currentParentPre);
                    targetContainer = currentParentPre;
                  }
                }
              }
            } catch(_) {}
            
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
                console.log('↪️ Attempting reparent (new component)', { newNodeId, targetContainer });
                ensureParent(newNodeId, targetContainer, { attempts: 6, interval: 90, index: 0 }).then(() => {
                  // Apply positioning after final parent confirmation
                  setTimeout(() => applyPositioning(newNodeId, position, targetContainer), 40);
                    setTimeout(() => applyPositioning(newNodeId, position, targetContainer), 300);
                });
              } else {
                  applyPositioning(newNodeId, position, targetContainer);
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
      
      // Retry-based detection to allow DOM mounting
      // Helper to find a canvas ancestor from the dragged element's DOM (fallback when pointer misses)
      const fallbackCanvasFromDom = () => {
        try {
          const nodeWrapper = query.node(nodeId);
          const el = nodeWrapper?.dom;
          if (!el) return null;
          const FORCED_CANVAS_NAMES = new Set(['Box', 'FlexBox', 'GridBox']);
          const CLASS_MARKERS = ['gl-canvas', 'editor-canvas', 'craft-canvas'];
          const ATTR_MARKERS = ['data-gl-canvas', 'data-canvas', 'data-editor-canvas'];
          let current = el.parentElement;
          while (current && current !== document.body) {
            const ancestorId = current.getAttribute('data-craft-node-id');
            if (ancestorId && ancestorId !== 'ROOT') {
              try {
                const ancNode = query.node(ancestorId);
                if (ancNode && ancNode.isCanvas()) return ancestorId;
                const data = ancNode?.get()?.data;
                const displayName = data?.displayName || data?.type;
                if (displayName && FORCED_CANVAS_NAMES.has(displayName)) return ancestorId;
                // DOM marker heuristics
                const classList = Array.from(current.classList || []);
                if (classList.some(c => CLASS_MARKERS.includes(c))) return ancestorId;
                for (const attr of ATTR_MARKERS) {
                  if (current.hasAttribute(attr)) return ancestorId;
                }
                const compAttr = current.getAttribute('data-component');
                if (compAttr && FORCED_CANVAS_NAMES.has(compAttr)) return ancestorId;
              } catch(_){}
            }
            current = current.parentElement;
          }
        } catch(_) {}
        return null;
      };

      const attemptDetect = (attempt = 0, maxAttempts = 5) => {
        const detectedNow = findContainerAtPosition(dropStateRef.current.mousePosition.x, dropStateRef.current.mousePosition.y);
        let target = Array.isArray(detectedNow) ? (detectedNow[0]?.nodeId || 'ROOT') : detectedNow;

        const isLikelyCanvas = (id) => {
          if (!id || id === 'ROOT') return false;
          try {
            const nw = query.node(id);
            if (nw?.isCanvas()) return true;
            const data = nw?.get()?.data;
            const name = data?.displayName || data?.type;
            if (['Box','FlexBox','GridBox'].includes(name)) return true;
            const el = nw?.dom;
            if (el) {
              const cls = Array.from(el.classList||[]);
              if (cls.some(c=>['gl-canvas','editor-canvas','craft-canvas'].includes(c))) return true;
              for (const attr of ['data-gl-canvas','data-canvas','data-editor-canvas']) {
                if (el.hasAttribute(attr)) return true;
              }
            }
          } catch(_) {}
          return false;
        };

        // Prefer current parent if detection is ROOT but current parent is a canvas and mouse is inside
        try {
          const nodeData = query.node(nodeId).get();
          const currentParent = nodeData.data.parent;
          if (target === 'ROOT' && currentParent && currentParent !== 'ROOT' && isLikelyCanvas(currentParent)) {
            const parentDom = query.node(currentParent)?.dom;
            if (parentDom) {
              const rect = parentDom.getBoundingClientRect();
              const { x: mx, y: my } = dropStateRef.current.mousePosition;
              if (mx >= rect.left && mx <= rect.right && my >= rect.top && my <= rect.bottom) {
                console.log('🛡️ Preserving existing parent (existing move) instead of ROOT:', currentParent);
                target = currentParent;
              }
            }
          }
        } catch(_) {}

        // If still ROOT, try lastDetectedContainer
        if (target === 'ROOT' && dropStateRef.current.lastDetectedContainer && dropStateRef.current.lastDetectedContainer !== 'ROOT') {
          console.log('🛟 Using lastDetectedContainer fallback:', dropStateRef.current.lastDetectedContainer);
          target = dropStateRef.current.lastDetectedContainer;
        }
        // If still ROOT, try DOM ancestor fallback
        if (target === 'ROOT') {
          const domFallback = fallbackCanvasFromDom();
          if (domFallback && domFallback !== 'ROOT') {
            console.log('🛟 Using DOM ancestor fallback canvas:', domFallback);
            target = domFallback;
          }
        }
        if (target !== 'ROOT' || attempt >= maxAttempts - 1) {
          proceedWithContainer(target);
        } else {
          setTimeout(() => attemptDetect(attempt + 1, maxAttempts), 70);
        }
      };

      const proceedWithContainer = (targetContainer) => {
      
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
            console.log('↪️ Attempting reparent (existing move)', { nodeId, targetContainer });
            ensureParent(nodeId, targetContainer, { attempts: 6, interval: 90, index: 0 }).then((ok) => {
              if (!ok) {
                // Still apply positioning relative to whatever parent we have
                applyPositioning(nodeId, position, targetContainer);
                return;
              }
              // Apply positioning now that parent confirmed
              setTimeout(() => applyPositioning(nodeId, position, targetContainer), 30);
              setTimeout(() => applyPositioning(nodeId, position, targetContainer), 250);
            });
          } else {
            applyPositioning(nodeId, position, targetContainer);
          }
        } catch (positioningError) {
        }
      }, 50);
      };

      attemptDetect();
      
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
          const detected = findContainerAtPosition(mouseX, mouseY);
          const targetContainer = Array.isArray(detected) ? (detected[0]?.nodeId || 'ROOT') : detected;
        
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
          console.log(targetContainer)
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
        
        // Show all elements at position
        const elements = document.elementsFromPoint(x, y);
        console.log('📋 All elements at position:', elements.map(el => ({
          tag: el.tagName,
          nodeId: el.getAttribute('data-craft-node-id'),
          classes: el.className,
          id: el.id
        })));
        
        // Test our function
        const container = findContainerAtPosition(x, y);
        const position = calculateRelativePosition(x, y, container, { width: 100, height: 50 });
        console.log('🧪 Container detection result:', { container, position });
        
        // Show all available craft containers
        const allCraftElements = Array.from(document.querySelectorAll('[data-craft-node-id]'));
        const containers = allCraftElements.filter(el => {
          const nodeId = el.getAttribute('data-craft-node-id');
          if (nodeId && nodeId !== 'ROOT') {
            try {
              const node = query.node(nodeId);
              return node && node.isCanvas();
            } catch (error) {
              return false;
            }
          }
          return false;
        });
        
        console.log('📦 All available containers:', containers.map(el => ({
          nodeId: el.getAttribute('data-craft-node-id'),
          rect: el.getBoundingClientRect(),
          tag: el.tagName,
          classes: el.className
        })));
        
        return { container, position, allContainers: containers };
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
      console.log(targetContainer);
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
