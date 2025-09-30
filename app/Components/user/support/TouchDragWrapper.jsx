/**
 * TouchDragWrapper - Adds touch support to Craft.js drag handles
 * Wraps drag handles to provide both mouse and touch event support
 */

'use client';

import React, { useRef, useCallback } from 'react';

// Utility to get unified coordinates for mouse/touch events
const getEventCoordinates = (e) => {
  if (e.touches && e.touches.length > 0) {
    return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
  }
  if (e.changedTouches && e.changedTouches.length > 0) {
    return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
  }
  return { clientX: e.clientX, clientY: e.clientY };
};

const TouchDragWrapper = ({ children, onDragStart, onDragMove, onDragEnd, ...props }) => {
  const dragState = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0
  });

  const handleStart = useCallback((e) => {
    const coords = getEventCoordinates(e);
    
    // Prevent default touch behavior
    if (e.type.startsWith('touch')) {
      e.preventDefault();
      document.body.style.touchAction = 'none';
      document.body.style.overscrollBehavior = 'none';
    }

    dragState.current = {
      isDragging: true,
      startX: coords.clientX,
      startY: coords.clientY,
      lastX: coords.clientX,
      lastY: coords.clientY
    };

    // Call original onDragStart if provided
    onDragStart?.(e);

    // For touch events, we need to manually handle move and end events
    if (e.type.startsWith('touch')) {
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
    } else {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
    }
  }, [onDragStart]);

  const handleMove = useCallback((e) => {
    if (!dragState.current.isDragging) return;

    const coords = getEventCoordinates(e);
    
    // Prevent default behavior for touch
    if (e.type.startsWith('touch')) {
      e.preventDefault();
    }

    dragState.current.lastX = coords.clientX;
    dragState.current.lastY = coords.clientY;

    // Call original onDragMove if provided
    onDragMove?.(e);
  }, [onDragMove]);

  const handleEnd = useCallback((e) => {
    if (!dragState.current.isDragging) return;

    dragState.current.isDragging = false;

    // Restore touch actions
    document.body.style.touchAction = '';
    document.body.style.overscrollBehavior = '';

    // Remove event listeners
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleEnd);
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', handleEnd);

    // Call original onDragEnd if provided
    onDragEnd?.(e);
  }, [onDragEnd, handleMove]);

  // Create synthetic mouse events from touch events for Craft.js compatibility
  const createSyntheticMouseEvent = (touchEvent, type) => {
    const touch = touchEvent.touches[0] || touchEvent.changedTouches[0];
    if (!touch) return touchEvent;

    const syntheticEvent = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      button: 0,
      buttons: 1
    });

    // Copy over some properties that Craft.js might need
    Object.defineProperty(syntheticEvent, 'target', {
      value: touchEvent.target,
      enumerable: true
    });

    return syntheticEvent;
  };

  const handleTouchStart = useCallback((e) => {
    handleStart(e);
    
    // Create and dispatch synthetic mouse event for Craft.js
    const syntheticEvent = createSyntheticMouseEvent(e, 'mousedown');
    e.target.dispatchEvent(syntheticEvent);
  }, [handleStart]);

  const handleMouseDown = useCallback((e) => {
    handleStart(e);
  }, [handleStart]);

  return React.cloneElement(children, {
    ...props,
    onMouseDown: handleMouseDown,
    onTouchStart: handleTouchStart,
    style: {
      ...children.props.style,
      touchAction: 'none',
      userSelect: 'none',
      webkitUserSelect: 'none'
    }
  });
};

export default TouchDragWrapper;