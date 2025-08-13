"use client";

import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Reusable resize handles overlay (portal-based) mirroring Box resize behavior.
 *
 * Props:
 *  - boxPosition: { top, left, width, height } (absolute screen coords via getBoundingClientRect + scroll)
 *  - onResizeStart: (event, direction) => void (direction in: 'n','s','e','w','ne','nw','se','sw')
 *  - showCorners: boolean (default true)
 *  - showEdges: boolean (default true)
 *  - accentColor: string (primary color for handles) default '#1890ff'
 *  - cornerSize: number (outer square size) default 8
 *  - edgeLength: number (length of edge handle) default 20
 *  - edgeThickness: number (thickness of edge handle) default 8
 *  - portal: boolean (wrap in createPortal to document.body) default true
 *  - zIndex: number (stacking for portal root) default 99999
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
}) => {
  if (typeof window === 'undefined') return null; // SSR guard
  if (!boxPosition) return null;

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
            style={cornerStyle(boxPosition.top, boxPosition.left, cornerSize, accentColor)}
            onMouseDown={(e) => onResizeStart?.(e, 'nw')}
            title="Resize"
            data-direction="nw"
          />
          {/* NE */}
            <div
              style={cornerStyle(boxPosition.top, boxPosition.left + boxPosition.width - cornerSize, cornerSize, accentColor, 'ne')}
              onMouseDown={(e) => onResizeStart?.(e, 'ne')}
              title="Resize"
              data-direction="ne"
            />
          {/* SW */}
          <div
            style={cornerStyle(boxPosition.top + boxPosition.height - cornerSize, boxPosition.left, cornerSize, accentColor, 'sw')}
            onMouseDown={(e) => onResizeStart?.(e, 'sw')}
            title="Resize"
            data-direction="sw"
          />
          {/* SE */}
          <div
            style={cornerStyle(boxPosition.top + boxPosition.height - cornerSize, boxPosition.left + boxPosition.width - cornerSize, cornerSize, accentColor, 'se')}
            onMouseDown={(e) => onResizeStart?.(e, 'se')}
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
            onMouseDown={(e) => onResizeStart?.(e, 'n')}
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
            onMouseDown={(e) => onResizeStart?.(e, 's')}
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
            onMouseDown={(e) => onResizeStart?.(e, 'w')}
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
            onMouseDown={(e) => onResizeStart?.(e, 'e')}
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
  return {
    position: 'absolute',
    top: top - 4, // match existing Box offset
    left: left - 4,
    width: size,
    height: size,
    background: 'white',
    border: `2px solid ${accentColor}`,
    borderRadius: 2,
    cursor: `${dir || 'nw'}-resize`,
    zIndex: 10001,
    pointerEvents: 'auto',
    boxSizing: 'border-box',
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
