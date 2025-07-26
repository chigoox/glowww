'use client';

import React, { useRef, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMultiSelect } from './MultiSelectContext';
import ContextMenu from './ContextMenu';

const MultiSelectBoundingBox = () => {
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

  console.log('🎯 BoundingBox Debug:', { 
    selectedNodes: Array.from(selectedNodes), 
    count: selectedNodes.size,
    boundingBox 
  });

  console.log('🎯 Drag Selection Debug:', { 
    isDragSelecting,
    dragSelection,
    hasPortalTarget: !!document.body
  });

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
    
    console.log('🎯 Bounding box context menu opened for', selectedNodes.size, 'elements');
  }, [selectedNodes]);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu({ visible: false, x: 0, y: 0 });
  }, []);

  // Handle drag start for moving selection
  const handleDragStart = useCallback((e) => {
    if (!boundingBox) return;
    
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    let currentDeltaX = 0;
    let currentDeltaY = 0;

    console.log('🎯 Drag start:', { startX, startY, boundingBox });

    setDragState({ startX, startY });
    setIsDragging(true);

    const handleMouseMove = (moveEvent) => {
      currentDeltaX = moveEvent.clientX - startX;
      currentDeltaY = moveEvent.clientY - startY;
      
      console.log('🖱️ Mouse move:', { 
        mouseX: moveEvent.clientX, 
        mouseY: moveEvent.clientY, 
        deltaX: currentDeltaX, 
        deltaY: currentDeltaY 
      });
      
      // Update visual position immediately for smooth feedback
      // We don't use transform here to avoid position conflicts
      if (boundingBoxRef.current) {
        boundingBoxRef.current.style.left = `${boundingBox.left + currentDeltaX}px`;
        boundingBoxRef.current.style.top = `${boundingBox.top + currentDeltaY}px`;
      }
    };

    const handleMouseUp = () => {
      console.log('🏁 Drag end, applying movement:', { currentDeltaX, currentDeltaY });
      
      // Apply the actual movement to all selected elements using the final delta
      moveSelection(currentDeltaX, currentDeltaY);

      // Reset visual state after DOM has time to update
      setTimeout(() => {
        if (boundingBoxRef.current) {
          boundingBoxRef.current.style.left = `${boundingBox.left}px`;
          boundingBoxRef.current.style.top = `${boundingBox.top}px`;
        }
      }, 10);

      setIsDragging(false);
      setDragState(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [boundingBox, moveSelection, setIsDragging]);

  // Handle resize start
  const handleResizeStart = useCallback((e, direction) => {
    if (!boundingBox) return;

    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = boundingBox.width;
    const startHeight = boundingBox.height;
    let finalScaleX = 1;
    let finalScaleY = 1;

    setIsResizing(true);

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let scaleX = 1;
      let scaleY = 1;

      // Calculate scale based on resize direction
      switch (direction) {
        case 'se': // bottom-right
          scaleX = Math.max(0.1, (startWidth + deltaX) / startWidth);
          scaleY = Math.max(0.1, (startHeight + deltaY) / startHeight);
          break;
        case 'sw': // bottom-left
          scaleX = Math.max(0.1, (startWidth - deltaX) / startWidth);
          scaleY = Math.max(0.1, (startHeight + deltaY) / startHeight);
          break;
        case 'ne': // top-right
          scaleX = Math.max(0.1, (startWidth + deltaX) / startWidth);
          scaleY = Math.max(0.1, (startHeight - deltaY) / startHeight);
          break;
        case 'nw': // top-left
          scaleX = Math.max(0.1, (startWidth - deltaX) / startWidth);
          scaleY = Math.max(0.1, (startHeight - deltaY) / startHeight);
          break;
        case 'e': // right edge
          scaleX = Math.max(0.1, (startWidth + deltaX) / startWidth);
          break;
        case 'w': // left edge
          scaleX = Math.max(0.1, (startWidth - deltaX) / startWidth);
          break;
        case 's': // bottom edge
          scaleY = Math.max(0.1, (startHeight + deltaY) / startHeight);
          break;
        case 'n': // top edge
          scaleY = Math.max(0.1, (startHeight - deltaY) / startHeight);
          break;
      }

      // Store final scale values for mouse up
      finalScaleX = scaleX;
      finalScaleY = scaleY;

      // Visual feedback - update bounding box display during resize
      if (boundingBoxRef.current) {
        boundingBoxRef.current.style.width = `${startWidth * scaleX}px`;
        boundingBoxRef.current.style.height = `${startHeight * scaleY}px`;
      }
    };

    const handleMouseUp = () => {
      console.log('📏 Applying final resize:', { finalScaleX, finalScaleY });
      
      // Apply the final resize to all selected elements
      resizeSelection(finalScaleX, finalScaleY);

      // Reset visual feedback
      if (boundingBoxRef.current) {
        boundingBoxRef.current.style.width = '';
        boundingBoxRef.current.style.height = '';
      }

      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [boundingBox, resizeSelection, setIsResizing]);

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
