'use client';

/**
 * Utility functions for working with Craft.js
 * Adds compatibility with React 19's ref handling
 */

/**
 * Connects an element for both selection and dragging in Craft.js
 * Compatible with React 19's ref handling
 * 
 * @param {Function} connect - Craft.js connect function from useNode
 * @param {Function} drag - Craft.js drag function from useNode
 * @param {HTMLElement} element - The DOM element to connect
 */
export const connectCraftElement = (connect, drag, element) => {
  if (!element) return;
  
  // Apply connect and drag separately to avoid React 19 warnings
  connect(element);
  drag(element);
};

/**
 * React effect callback to connect an element reference
 * Use this in a useEffect hook
 * 
 * @param {Function} connect - Craft.js connect function from useNode
 * @param {Function} drag - Craft.js drag function from useNode
 * @param {React.RefObject} ref - React ref object pointing to the element
 */
export const useCraftConnector = (connect, drag, ref) => {
  if (!ref?.current) return;
  
  const elem = ref.current;
  connectCraftElement(connect, drag, elem);
};
