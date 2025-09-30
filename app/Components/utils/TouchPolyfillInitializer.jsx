/**
 * Touch Polyfill Initializer Component
 * Ensures touch-to-mouse polyfill is initialized for Craft.js compatibility
 */

'use client';

import { useEffect } from 'react';
import { initTouchPolyfill } from './touchPolyfill';

export default function TouchPolyfillInitializer() {
  useEffect(() => {
    // Initialize touch polyfill on client mount
    initTouchPolyfill();
  }, []);

  // This component renders nothing
  return null;
}