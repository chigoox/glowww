'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMultiSelect } from '../context/MultiSelectContext';
import ContextMenu from '../context/ContextMenu';
import { useEditor } from '@craftjs/core';
import { snapGridSystem } from "../grid/SnapGridSystem";

const MultiSelectBoundingBox = () => {
  const { query } = useEditor();
  const [isClient, setIsClient] = useState(false);
  
  const {
    boundingBox,
    isMultiSelecting,
    isDragging,
    isResizing,
    isDragSelecting,
    dragSelection,
    setIsDragging,
    setIsResizing,
    moveSelection,
    scaleSelection,
    resizeSelection,
    selectedNodes
  } = useMultiSelect();

  // Client-side check
  useEffect(() => {
    setIsClient(true);
  }, []);



  const [dragState, setDragState] = useState(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const boundingBoxRef = useRef(null);

  // Handle context menu (right-click) on bounding box
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate position to keep menu on screen
    const menuWidth = 320;
    const menuHeight = 500;
    let x = e.clientX;
    let y = e.clientY;
    
    // Adjust if menu would go off right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    
    // Adjust if menu would go off bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    // Ensure minimum margins
    x = Math.max(10, x);
    y = Math.max(10, y);
    
    setContextMenu({
      visible: true,
      x: x,
      y: y
    });
    
   
  }, [selectedNodes]);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0 });
    try { snapGridSystem?.clearSnapIndicators?.(); } catch {}
  }, []);

  // Handle drag start for moving selection
  const handleDragStart = useCallback((e) => {
    if (!boundingBox) return;
    
    e.preventDefault();
    e.stopPropagation();

    try { snapGridSystem?.clearSnapIndicators?.(); } catch {}

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = boundingBox.left;
    const startTop = boundingBox.top;
    let currentDeltaX = 0;
    let currentDeltaY = 0;
    let visualLeft = startLeft;
    let visualTop = startTop;

  

    setDragState({ startX, startY });
    setIsDragging(true);

    // Register all non-selected elements for snapping
    try {
      const nodes = query.getNodes();
      const selectedIds = new Set(Array.from(selectedNodes));
      Object.entries(nodes).forEach(([id, node]) => {
        if (id !== 'ROOT' && node?.dom && !selectedIds.has(id)) {
          const rect = node.dom.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            snapGridSystem.registerElement(id, node.dom, {
              x: rect.left,
              y: rect.top,
              width: rect.width,
              height: rect.height
            });
          }
        }
      });
    } catch {}

    const handleMouseMove = (moveEvent) => {
      currentDeltaX = moveEvent.clientX - startX;
      currentDeltaY = moveEvent.clientY - startY;

      const proposedLeft = startLeft + currentDeltaX;
      const proposedTop = startTop + currentDeltaY;

      // Snap the bounding box using the engine (includes guides, elements, distances)
      try {
        const excludeIds = Array.from(selectedNodes);
        const snap = snapGridSystem.getSnapPosition(
          'GROUP', proposedLeft, proposedTop, boundingBox.width, boundingBox.height, { excludeIds }
        );
        visualLeft = snap.x ?? proposedLeft;
        visualTop = snap.y ?? proposedTop;
      } catch {
        visualLeft = proposedLeft;
        visualTop = proposedTop;
      }

      if (boundingBoxRef.current) {
        boundingBoxRef.current.style.left = `${visualLeft}px`;
        boundingBoxRef.current.style.top = `${visualTop}px`;
      }
    };

    const handleMouseUp = () => {
      // Use snapped visual position to compute final delta
      const finalLeft = parseFloat(boundingBoxRef.current?.style.left) || (startLeft + currentDeltaX);
      const finalTop = parseFloat(boundingBoxRef.current?.style.top) || (startTop + currentDeltaY);
      const finalDeltaX = finalLeft - startLeft;
      const finalDeltaY = finalTop - startTop;

      moveSelection(finalDeltaX, finalDeltaY);

      // Reset visual state after DOM has time to update
      setTimeout(() => {
        if (boundingBoxRef.current) {
          boundingBoxRef.current.style.left = `${boundingBox.left}px`;
          boundingBoxRef.current.style.top = `${boundingBox.top}px`;
        }
      }, 10);

      setIsDragging(false);
      try { snapGridSystem?.clearSnapIndicators?.(); } catch {}
      setDragState(null);
      setTimeout(() => { try { snapGridSystem?.cleanupTrackedElements?.(); } catch {} }, 100);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [boundingBox, moveSelection, setIsDragging, query, selectedNodes]);

  // Handle resize start
  const handleResizeStart = useCallback((e, direction) => {
    if (!boundingBox) return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = boundingBox.left;
    const startTop = boundingBox.top;
    const startWidth = boundingBox.width;
    const startHeight = boundingBox.height;
    let finalScaleX = 1;
    let finalScaleY = 1;
    let visualBox = { left: startLeft, top: startTop, width: startWidth, height: startHeight };

    setIsResizing(true);

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newLeft = startLeft;
      let newTop = startTop;
      let newWidth = startWidth;
      let newHeight = startHeight;

      switch (direction) {
        case 'se':
          newWidth = Math.max(10, startWidth + deltaX);
          newHeight = Math.max(10, startHeight + deltaY);
          break;
        case 'sw':
          newWidth = Math.max(10, startWidth - deltaX);
          newHeight = Math.max(10, startHeight + deltaY);
          newLeft = startLeft + (startWidth - newWidth);
          break;
        case 'ne':
          newWidth = Math.max(10, startWidth + deltaX);
          newHeight = Math.max(10, startHeight - deltaY);
          newTop = startTop + (startHeight - newHeight);
          break;
        case 'nw':
          newWidth = Math.max(10, startWidth - deltaX);
          newHeight = Math.max(10, startHeight - deltaY);
          newLeft = startLeft + (startWidth - newWidth);
          newTop = startTop + (startHeight - newHeight);
          break;
        case 'e':
          newWidth = Math.max(10, startWidth + deltaX);
          break;
        case 'w':
          newWidth = Math.max(10, startWidth - deltaX);
          newLeft = startLeft + (startWidth - newWidth);
          break;
        case 's':
          newHeight = Math.max(10, startHeight + deltaY);
          break;
        case 'n':
          newHeight = Math.max(10, startHeight - deltaY);
          newTop = startTop + (startHeight - newHeight);
          break;
      }

      // Snap the resizing box
      try {
        const snap = snapGridSystem.getResizeSnapPosition(
          'GROUP',
          direction,
          { left: newLeft, top: newTop, width: startWidth, height: startHeight },
          newWidth,
          newHeight
        );
        newLeft = snap.bounds.left;
        newTop = snap.bounds.top;
        newWidth = snap.bounds.width;
        newHeight = snap.bounds.height;
      } catch {}

      finalScaleX = newWidth / startWidth;
      finalScaleY = newHeight / startHeight;
      visualBox = { left: newLeft, top: newTop, width: newWidth, height: newHeight };

      if (boundingBoxRef.current) {
        boundingBoxRef.current.style.left = `${newLeft}px`;
        boundingBoxRef.current.style.top = `${newTop}px`;
        boundingBoxRef.current.style.width = `${newWidth}px`;
        boundingBoxRef.current.style.height = `${newHeight}px`;
      }
    };

  const handleMouseUp = () => {
      
      // Calculate appropriate origin point based on resize direction
      let origin = { x: 0.5, y: 0.5 }; // Default center
      
      switch (direction) {
        case 'nw': // top-left corner
          origin = { x: 1, y: 1 }; // Scale from bottom-right
          break;
        case 'ne': // top-right corner
          origin = { x: 0, y: 1 }; // Scale from bottom-left
          break;
        case 'sw': // bottom-left corner
          origin = { x: 1, y: 0 }; // Scale from top-right
          break;
        case 'se': // bottom-right corner
          origin = { x: 0, y: 0 }; // Scale from top-left
          break;
        case 'n': // top edge
          origin = { x: 0.5, y: 1 }; // Scale from bottom
          break;
        case 's': // bottom edge
          origin = { x: 0.5, y: 0 }; // Scale from top
          break;
        case 'w': // left edge
          origin = { x: 1, y: 0.5 }; // Scale from right
          break;
        case 'e': // right edge
          origin = { x: 0, y: 0.5 }; // Scale from left
          break;
      }
      
      // Apply the final scale to all selected elements with proper origin
      scaleSelection(finalScaleX, finalScaleY, origin);

      // Reset visual feedback
      if (boundingBoxRef.current) {
        boundingBoxRef.current.style.left = `${boundingBox.left}px`;
        boundingBoxRef.current.style.top = `${boundingBox.top}px`;
        boundingBoxRef.current.style.width = `${boundingBox.width}px`;
        boundingBoxRef.current.style.height = `${boundingBox.height}px`;
      }

      setIsResizing(false);
      try { snapGridSystem?.clearSnapIndicators?.(); } catch {}
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [boundingBox, scaleSelection, setIsResizing]);

  const boundingBoxStyle = {
    position: 'absolute',
    left: boundingBox?.left || 0,
    top: boundingBox?.top || 0,
    width: boundingBox?.width || 0,
    height: boundingBox?.height || 0,
    border: '2px solid #1890ff',
    backgroundColor: 'rgba(24, 144, 255, 0.1)',
    pointerEvents: 'none',
    zIndex: 9999,
    borderRadius: '4px'
  };

  const handleStyle = {
    position: 'absolute',
    width: '12px',
    height: '12px',
    backgroundColor: '#1890ff',
    border: '2px solid white',
    borderRadius: '50%',
    pointerEvents: 'auto',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  };

  // Don't render anything on server-side
  if (!isClient) {
    return null;
  }

  return createPortal(
    <>
      {/* Multi-selection bounding box */}
      {isMultiSelecting && boundingBox && selectedNodes.size >= 1 && (
        <div
          ref={boundingBoxRef}
          className="multi-select-bounding-box"
          style={boundingBoxStyle}
          onContextMenu={handleContextMenu}
        >
          {/* Drag handle - center area */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '20px',
              right: '20px',
              bottom: '20px',
              cursor: isDragging ? 'grabbing' : 'grab',
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1890ff',
              fontSize: '12px',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(255,255,255,0.8)'
            }}
            onMouseDown={handleDragStart}
            title={`Move ${selectedNodes.size} selected elements`}
          >
            {selectedNodes.size} selected
          </div>

          {/* Corner resize handles */}
          <div
            style={{
              ...handleStyle,
              top: '-6px',
              left: '-6px',
              cursor: 'nw-resize'
            }}
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            title="Resize"
          />
          <div
            style={{
              ...handleStyle,
              top: '-6px',
              right: '-6px',
              cursor: 'ne-resize'
            }}
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            title="Resize"
          />
          <div
            style={{
              ...handleStyle,
              bottom: '-6px',
              left: '-6px',
              cursor: 'sw-resize'
            }}
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            title="Resize"
          />
          <div
            style={{
              ...handleStyle,
              bottom: '-6px',
              right: '-6px',
              cursor: 'se-resize'
            }}
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            title="Resize"
          />

          {/* Edge resize handles */}
          <div
            style={{
              ...handleStyle,
              top: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              cursor: 'n-resize'
            }}
            onMouseDown={(e) => handleResizeStart(e, 'n')}
            title="Resize height"
          />
          <div
            style={{
              ...handleStyle,
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              cursor: 's-resize'
            }}
            onMouseDown={(e) => handleResizeStart(e, 's')}
            title="Resize height"
          />
          <div
            style={{
              ...handleStyle,
              top: '50%',
              left: '-6px',
              transform: 'translateY(-50%)',
              cursor: 'w-resize'
            }}
            onMouseDown={(e) => handleResizeStart(e, 'w')}
            title="Resize width"
          />
          <div
            style={{
              ...handleStyle,
              top: '50%',
              right: '-6px',
              transform: 'translateY(-50%)',
              cursor: 'e-resize'
            }}
            onMouseDown={(e) => handleResizeStart(e, 'e')}
            title="Resize width"
          />

          {/* Selection count badge */}
          <div
            style={{
              position: 'absolute',
              top: '-30px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#1890ff',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: 'bold',
              pointerEvents: 'none',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            {selectedNodes.size} elements
          </div>
        </div>
      )}

      {/* Drag selection rectangle */}
      {isDragSelecting && dragSelection && (
        <div
          style={{
            position: 'fixed',
            left: dragSelection.left,
            top: dragSelection.top,
            width: dragSelection.width,
            height: dragSelection.height,
            border: '2px dashed #1890ff',
            backgroundColor: 'rgba(24, 144, 255, 0.2)',
            pointerEvents: 'none',
            zIndex: 99999,
            borderRadius: '2px',
            boxShadow: '0 0 10px rgba(24, 144, 255, 0.3)'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '0px',
            fontSize: '12px',
            color: '#1890ff',
            backgroundColor: 'white',
            padding: '2px 4px',
            borderRadius: '2px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}>
            Selecting...
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu.visible && (
        <ContextMenu
          visible={contextMenu.visible}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={closeContextMenu}
          targetNodeId={null} // We'll use the multi-select context instead
        />
      )}
    </>,
    document.body
  );
};

export default MultiSelectBoundingBox;
