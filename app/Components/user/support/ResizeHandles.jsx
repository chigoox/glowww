"use client";

import React, { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { snapGridSystem } from '../../utils/grid/SnapGridSystem';

/**
 * Reusable resize handles overlay (portal-based) mirroring Box resize behavior.
 *
 * Props:
 *  - boxPosition: { top, left, width, height } (absolute screen coords via getBoundingClientRect + scroll)
 *  - onResizeStart: (event, direction) => void (legacy external handler; direction in: 'n','s','e','w','ne','nw','se','sw')
 *  - showCorners: boolean (default true)
 *  - showEdges: boolean (default true)
 *  - accentColor: string (primary color for handles) default '#1890ff'
 *  - cornerSize: number (outer square size) default 8
 *  - edgeLength: number (length of edge handle) default 20
 *  - edgeThickness: number (thickness of edge handle) default 8
 *  - portal: boolean (wrap in createPortal to document.body) default true
 *  - zIndex: number (stacking for portal root) default 99999
 *  - enableInternalResize: boolean (default true) if true and deps provided, uses internal logic
 *  - nodeId: string (Craft node id) required for internal logic
 *  - targetRef: React ref to element being resized (required for internal logic)
 *  - editorActions: Craft editor actions (editorActions from useEditor())
 *  - craftQuery: Craft query object (query from useEditor())
 *  - minWidth: number (default 50)
 *  - minHeight: number (default 20)
 *  - maintainAspect: boolean (optional) preserve aspect ratio when resizing diagonally
 *  - onResize: (dimensions) => void callback during resize (internal logic only)
 *  - onResizeEnd: (finalDimensions) => void after mouseup (internal logic only)
 */
export const ResizeHandles = ({
  boxPosition,
  onResizeStart,
  showCorners = true,
  showEdges = true,
  accentColor = '#1890ff',
  cornerSize = 8,
  edgeLength = 20,
  edgeThickness = 8,
  portal = true,
  zIndex = 99999,
  enableInternalResize = true,
  nodeId,
  targetRef,
  editorActions,
  craftQuery,
  minWidth = 50,
  minHeight = 20,
  maintainAspect = false,
  onResize,
  onResizeEnd,
}) => {
  if (typeof window === 'undefined') return null; // SSR guard
  if (!boxPosition) return null;

  // Internal resize starter replicating Box.jsx logic
  const internalResizeStart = useCallback((e, direction) => {
    if (!enableInternalResize || !nodeId || !targetRef?.current || !editorActions || !craftQuery) {
      // Fallback to legacy external handler
      onResizeStart?.(e, direction);
      return;
    }
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const rect = targetRef.current.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    let startLeft = rect.left;
    let startTop = rect.top;
    const parentEl = targetRef.current.offsetParent;
    if (parentEl) {
      const parentRect = parentEl.getBoundingClientRect();
      startLeft = rect.left - parentRect.left;
      startTop = rect.top - parentRect.top;
    }

    // Register elements for snapping
    const nodes = craftQuery.getNodes();
    Object.entries(nodes).forEach(([id, node]) => {
      if (id !== nodeId && node.dom) {
        const elementRect = node.dom.getBoundingClientRect();
        const editorRoot = document.querySelector('[data-editor="true"]');
        if (editorRoot) {
          const editorRect = editorRoot.getBoundingClientRect();
          const registrationBounds = {
            x: elementRect.left - editorRect.left,
            y: elementRect.top - editorRect.top,
            width: elementRect.width,
            height: elementRect.height,
          };
          snapGridSystem.registerElement(id, node.dom, registrationBounds);
        }
      }
    });

    const aspectRatio = startWidth / startHeight;

    // Track whether the pointer actually moved enough to consider this a resize
    let hasMoved = false;
    const MOVEMENT_THRESHOLD = 5; // Increase threshold to prevent accidental resizes

    // Track initial positions to detect meaningful movement
    let hasSignificantMovement = false;

    // Only freeze visual size during drag if we detect actual movement first
    // This prevents any visual changes for pure clicks
    let hasSetInlineStyles = false;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // Track movement early to determine if this should be treated as a resize
      if (!hasMoved && (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1)) {
        hasMoved = true;
      }

      // Track significant movement separately for more robust detection
      if (!hasSignificantMovement && (Math.abs(deltaX) > MOVEMENT_THRESHOLD || Math.abs(deltaY) > MOVEMENT_THRESHOLD)) {
        hasSignificantMovement = true;
        
        // Only now set inline styles to freeze size during drag
        if (!hasSetInlineStyles) {
          try {
            targetRef.current.style.width = `${startWidth}px`;
            targetRef.current.style.height = `${startHeight}px`;
            hasSetInlineStyles = true;
          } catch (_) {}
        }
      }

      // If no significant movement, just return early - don't calculate any dimensions
      if (!hasSignificantMovement) {
        return;
      }

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;

      switch (direction) {
        case 'se':
          newWidth = startWidth + deltaX;
          newHeight = startHeight + deltaY;
          break;
        case 'sw':
          newWidth = startWidth - deltaX;
          newHeight = startHeight + deltaY;
          newLeft = startLeft + deltaX;
          break;
        case 'ne':
          newWidth = startWidth + deltaX;
          newHeight = startHeight - deltaY;
          newTop = startTop + deltaY;
          break;
        case 'nw':
          newWidth = startWidth - deltaX;
          newHeight = startHeight - deltaY;
          newLeft = startLeft + deltaX;
          newTop = startTop + deltaY;
          break;
        case 'e':
          newWidth = startWidth + deltaX;
          break;
        case 'w':
          newWidth = startWidth - deltaX;
          newLeft = startLeft + deltaX;
          break;
        case 's':
          newHeight = startHeight + deltaY;
          break;
        case 'n':
          newHeight = startHeight - deltaY;
          newTop = startTop + deltaY;
          break;
      }

      // Enforce min constraints without moving box further once min reached (freeze leading edge)
      if (direction.includes('w')) {
        const attemptWidth = newWidth;
        if (attemptWidth < minWidth) {
          // Keep right edge fixed: shift left so width = min while right edge stays where it was at min threshold
          newWidth = minWidth;
          newLeft = startLeft + (startWidth - minWidth);
        }
      }
      if (direction.includes('n')) {
        const attemptHeight = newHeight;
        if (attemptHeight < minHeight) {
          newHeight = minHeight;
          newTop = startTop + (startHeight - minHeight);
        }
      }

      if (maintainAspect && direction.length === 2) {
        // Diagonal resize preserving aspect
        const ratioBasedHeight = newWidth / aspectRatio;
        const ratioBasedWidth = newHeight * aspectRatio;
        if (Math.abs(ratioBasedHeight - newHeight) < Math.abs(ratioBasedWidth - newWidth)) {
          newHeight = ratioBasedHeight;
        } else {
          newWidth = ratioBasedWidth;
        }
      }

      newWidth = Math.max(newWidth, minWidth);
      newHeight = Math.max(newHeight, minHeight);

      const currentRect = targetRef.current.getBoundingClientRect();
      const editorRoot = document.querySelector('[data-editor="true"]');
      if (editorRoot) {
        const editorRect = editorRoot.getBoundingClientRect();
        let intendedBounds = {
          left: currentRect.left - editorRect.left,
          top: currentRect.top - editorRect.top,
          width: newWidth,
          height: newHeight
        };
        if (direction.includes('w')) {
          const widthDelta = newWidth - currentRect.width;
            intendedBounds.left = (currentRect.left - editorRect.left) - widthDelta;
        }
        if (direction.includes('n')) {
          const heightDelta = newHeight - currentRect.height;
          intendedBounds.top = (currentRect.top - editorRect.top) - heightDelta;
        }
        intendedBounds.right = intendedBounds.left + intendedBounds.width;
        intendedBounds.bottom = intendedBounds.top + intendedBounds.height;
        intendedBounds.centerX = intendedBounds.left + intendedBounds.width / 2;
        intendedBounds.centerY = intendedBounds.top + intendedBounds.height / 2;

        const snapResult = snapGridSystem.getResizeSnapPosition(
          nodeId,
          direction,
          intendedBounds,
          newWidth,
          newHeight
        );
        if (snapResult.snapped) {
          newWidth = snapResult.bounds.width;
          newHeight = snapResult.bounds.height;
          if (direction.includes('w') && typeof snapResult.bounds.left === 'number') {
            newLeft = snapResult.bounds.left;
          }
          if (direction.includes('n') && typeof snapResult.bounds.top === 'number') {
            newTop = snapResult.bounds.top;
          }
        }
      }

      // Only commit intermediate prop updates for significant movements
      editorActions.history.throttle(500).setProp(nodeId, (props) => {
        props.width = Math.round(newWidth);
        props.height = Math.round(newHeight);
        if (direction.includes('w')) props.left = Math.round(newLeft);
        if (direction.includes('n')) props.top = Math.round(newTop);
        if ((direction.includes('w') || direction.includes('n')) && props.position !== 'absolute') {
          props.position = 'absolute';
        }
      });

      // Call onResize for preview/visual updates
      onResize?.({ width: newWidth, height: newHeight, left: newLeft, top: newTop, direction });
    };

    const handleMouseUp = () => {
      snapGridSystem.clearSnapIndicators();
      setTimeout(() => snapGridSystem.cleanupTrackedElements(), 100);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (targetRef?.current) {
        const finalRect = targetRef.current.getBoundingClientRect();
        
        // If no significant movement occurred, completely abort any changes
        if (!hasMoved || !hasSignificantMovement) {
          // Only clear inline styles if we actually set them
          if (hasSetInlineStyles) {
            try { 
              targetRef.current.style.width = ''; 
              targetRef.current.style.height = ''; 
            } catch (_) {}
          }
          
          // Log the abort for debugging
          if (process.env.NODE_ENV !== 'production') {
            console.debug('[ResizeHandles] Resize aborted - no significant movement:', {
              nodeId,
              hasMoved,
              hasSignificantMovement,
              hasSetInlineStyles,
              finalWidth: finalRect.width,
              finalHeight: finalRect.height
            });
          }
          
          // Call onResizeEnd but with no changes indicated
          onResizeEnd?.({ 
            width: finalRect.width, 
            height: finalRect.height, 
            aborted: true // Flag to indicate this was aborted
          });
          
          // Early return - no prop changes should be made
          return;
        }

        // Log successful resize for debugging
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[ResizeHandles] Resize completed:', {
            nodeId,
            startWidth,
            startHeight,
            finalWidth: finalRect.width,
            finalHeight: finalRect.height
          });
        }

        // NEW: Convert resized dimensions (and position if changed) to percentages
        try {
          // Prefer immediate parent element for relative % so layout containers without explicit positioning still work
          const parentEl = targetRef.current.offsetParent || targetRef.current.parentElement;
          if (parentEl) {
            const parentRect = parentEl.getBoundingClientRect();
            const parentWidth = parentRect.width || 0;
            const parentHeight = parentRect.height || 0;
            if (parentWidth > 0 && parentHeight > 0) {
              const pct = (v) => (v / 1); // placeholder for clarity – we inline below
              const widthPct = (finalRect.width / parentWidth) * 100;
              const heightPct = (finalRect.height / parentHeight) * 100;
              // Compute left/top relative to parent even if only width/height changed;
              // keeps element responsive when container changes size later.
              const relLeft = finalRect.left - parentRect.left;
              const relTop = finalRect.top - parentRect.top;
              const leftPct = (relLeft / parentWidth) * 100;
              const topPct = (relTop / parentHeight) * 100;

              editorActions.setProp(nodeId, (p) => {
                p.width = parseFloat(widthPct.toFixed(4)) + '%';
                p.height = parseFloat(heightPct.toFixed(4)) + '%';
                // Only set left/top if element is absolutely positioned OR we modified leading edges
                if (p.position === 'absolute' || p.left !== undefined || p.top !== undefined) {
                  // Preserve existing pixel intent if user never moved it (rare), else convert.
                  p.left = parseFloat(leftPct.toFixed(4)) + '%';
                  p.top = parseFloat(topPct.toFixed(4)) + '%';
                  if (p.position !== 'absolute') p.position = 'absolute';
                }
                if (process.env.NODE_ENV !== 'production') {
                  console.debug('[ResizeHandles] Converted to % on mouseup:', {
                    nodeId,
                    width: p.width,
                    height: p.height,
                    left: p.left,
                    top: p.top
                  });
                }
              });

              // Clear inline sizes we set during dragging so CSS rules can re-apply
              try { targetRef.current.style.width = ''; targetRef.current.style.height = ''; } catch (_) {}

              // Fallback: next frame verify conversion; if still numeric convert again
              requestAnimationFrame(() => {
                try {
                  const nodeWrapper = craftQuery?.node(nodeId);
                  const props = nodeWrapper?.get?.().data?.props || {};
                  const isPercent = (val) => typeof val === 'string' && val.trim().endsWith('%');
                  if (!isPercent(props.width) || !isPercent(props.height)) {
                    editorActions.setProp(nodeId, (p) => {
                      p.width = parseFloat(widthPct.toFixed(4)) + '%';
                      p.height = parseFloat(heightPct.toFixed(4)) + '%';
                      if (p.position === 'absolute' || p.left !== undefined || p.top !== undefined) {
                        p.left = parseFloat(leftPct.toFixed(4)) + '%';
                        p.top = parseFloat(topPct.toFixed(4)) + '%';
                        if (p.position !== 'absolute') p.position = 'absolute';
                      }
                    });
                    if (process.env.NODE_ENV !== 'production') {
                      console.debug('[ResizeHandles] Post-frame enforced % conversion:', {
                        nodeId,
                        width: widthPct,
                        height: heightPct
                      });
                    }
                  }
                } catch (e) {
                  console.warn('[ResizeHandles] Post-frame conversion check failed', e);
                }
              });
            }
          }
        } catch (err) {
          // Swallow errors – fallback to previous pixel values already applied during drag
          console.warn('Resize percentage conversion failed:', err);
        }
        onResizeEnd?.({ width: finalRect.width, height: finalRect.height });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [enableInternalResize, nodeId, targetRef, editorActions, craftQuery, minWidth, minHeight, maintainAspect, onResize, onResizeEnd]);

  const handles = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex,
      }}
      data-resize-handles
    >
      {/* Corner Handles */}
      {showCorners && (
        <>
          {/* NW */}
          <div
            style={cornerStyle(boxPosition.top, boxPosition.left, cornerSize, accentColor, 'nw')}
            onMouseDown={(e) => internalResizeStart(e, 'nw')}
            title="Resize"
            data-direction="nw"
          />
          {/* NE */}
            <div
              style={cornerStyle(boxPosition.top, boxPosition.left + boxPosition.width, cornerSize, accentColor, 'ne')}
              onMouseDown={(e) => internalResizeStart(e, 'ne')}
              title="Resize"
              data-direction="ne"
            />
          {/* SW */}
          <div
            style={cornerStyle(boxPosition.top + boxPosition.height, boxPosition.left, cornerSize, accentColor, 'sw')}
            onMouseDown={(e) => internalResizeStart(e, 'sw')}
            title="Resize"
            data-direction="sw"
          />
          {/* SE */}
          <div
            style={cornerStyle(boxPosition.top + boxPosition.height, boxPosition.left + boxPosition.width, cornerSize, accentColor, 'se')}
            onMouseDown={(e) => internalResizeStart(e, 'se')}
            title="Resize"
            data-direction="se"
          />
        </>
      )}

      {/* Edge Handles */}
      {showEdges && (
        <>
          {/* North */}
          <div
            style={edgeStyle({
              top: boxPosition.top - (edgeThickness / 2),
              left: boxPosition.left + (boxPosition.width / 2) - (edgeLength / 2),
              width: edgeLength,
              height: edgeThickness,
              cursor: 'n-resize',
              accentColor,
            })}
            onMouseDown={(e) => internalResizeStart(e, 'n')}
            title="Resize height"
            data-direction="n"
          />
          {/* South */}
          <div
            style={edgeStyle({
              top: boxPosition.top + boxPosition.height - (edgeThickness / 2),
              left: boxPosition.left + (boxPosition.width / 2) - (edgeLength / 2),
              width: edgeLength,
              height: edgeThickness,
              cursor: 's-resize',
              accentColor,
            })}
            onMouseDown={(e) => internalResizeStart(e, 's')}
            title="Resize height"
            data-direction="s"
          />
          {/* West */}
          <div
            style={edgeStyle({
              left: boxPosition.left - (edgeThickness / 2),
              top: boxPosition.top + (boxPosition.height / 2) - (edgeLength / 2),
              width: edgeThickness,
              height: edgeLength,
              cursor: 'w-resize',
              accentColor,
            })}
            onMouseDown={(e) => internalResizeStart(e, 'w')}
            title="Resize width"
            data-direction="w"
          />
          {/* East */}
          <div
            style={edgeStyle({
              left: boxPosition.left + boxPosition.width - (edgeThickness / 2),
              top: boxPosition.top + (boxPosition.height / 2) - (edgeLength / 2),
              width: edgeThickness,
              height: edgeLength,
              cursor: 'e-resize',
              accentColor,
            })}
            onMouseDown={(e) => internalResizeStart(e, 'e')}
            title="Resize width"
            data-direction="e"
          />
        </>
      )}
    </div>
  );

  return portal ? createPortal(handles, document.body) : handles;
};

// Corner style helper
function cornerStyle(top, left, size, accentColor, dir) {
  // Position at exact corner and center using transform so it straddles edges
  return {
    position: 'absolute',
    top: top,
    left: left,
    width: size,
    height: size,
    background: 'white',
    border: `2px solid ${accentColor}`,
    borderRadius: 2,
    cursor: `${dir || 'nw'}-resize`,
    zIndex: 10001,
    pointerEvents: 'auto',
    boxSizing: 'border-box',
    transform: 'translate(-50%, -50%)'
  };
}

// Edge style helper
function edgeStyle({ top, left, width, height, cursor, accentColor }) {
  return {
    position: 'absolute',
    top,
    left,
    width,
    height,
    background: `rgba(24, 144, 255, 0.3)`, // uses accentColor base tone
    cursor,
    zIndex: 10000,
    borderRadius: 4,
    pointerEvents: 'auto',
    boxSizing: 'border-box',
  };
}

export default ResizeHandles;
