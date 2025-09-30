/**
 * Touch to Mouse Event Polyfill for Craft.js
 * Converts touch events to mouse events that Craft.js can understand
 */

'use client';

let isInitialized = false;

export const initTouchPolyfill = () => {
  if (typeof window === 'undefined' || isInitialized) return;
  
  isInitialized = true;

  // Map of touch events to mouse events
  const touchToMouse = {
    'touchstart': 'mousedown',
    'touchmove': 'mousemove',
    'touchend': 'mouseup'
  };

  // Create synthetic mouse event from touch event
  const createMouseEvent = (touchEvent, mouseType) => {
    const touch = touchEvent.touches[0] || touchEvent.changedTouches[0];
    if (!touch) return null;

    const mouseEvent = new MouseEvent(mouseType, {
      bubbles: true,
      cancelable: true,
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      button: 0,
      buttons: mouseType === 'mouseup' ? 0 : 1
    });

    return mouseEvent;
  };

  // Touch event handler
  const handleTouchEvent = (e) => {
    // Only handle touch events on Craft.js drag handles
    const target = e.target;
    const isDragHandle = target.closest('[data-cy="move-handle"], [data-handle-type="move"], .move-handle, .snap-position-handle');
    
    if (!isDragHandle) return;

    const mouseType = touchToMouse[e.type];
    if (!mouseType) return;

    // Prevent default touch behavior
    e.preventDefault();
    e.stopPropagation();

    // Create and dispatch synthetic mouse event
    const mouseEvent = createMouseEvent(e, mouseType);
    if (mouseEvent) {
      // Dispatch on the same target
      target.dispatchEvent(mouseEvent);
    }

    // Prevent body scroll during drag
    if (e.type === 'touchstart') {
      document.body.style.touchAction = 'none';
      document.body.style.overscrollBehavior = 'none';
    } else if (e.type === 'touchend') {
      document.body.style.touchAction = '';
      document.body.style.overscrollBehavior = '';
    }
  };

  // Add event listeners for touch events
  document.addEventListener('touchstart', handleTouchEvent, { passive: false });
  document.addEventListener('touchmove', handleTouchEvent, { passive: false });
  document.addEventListener('touchend', handleTouchEvent, { passive: false });

  console.log('🔧 Touch to Mouse polyfill initialized for Craft.js');
};

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTouchPolyfill);
  } else {
    initTouchPolyfill();
  }
}