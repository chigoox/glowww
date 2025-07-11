'use client';

import { useEditor } from '@craftjs/core';
import { usePages } from '../PagesContext';

/**
 * Custom hook for determining when to show/hide editor UI elements
 * Use this in components to consistently handle preview mode 
 * and editor state across the app
 * 
 * @returns {Object} Utilities for editor display state
 */
const useEditorDisplay = () => {
  // Get preview mode status from PagesContext
  const { isPreviewMode } = usePages();
  
  // Get editor enabled status from Craft.js
  const { enabled: isEditingEnabled } = useEditor((state) => ({
    enabled: state.options.enabled
  }));
  
  // Hide editor UI if either:
  // 1. We're in preview mode
  // 2. Editing is disabled in the Craft editor
  const hideEditorUI = isPreviewMode || !isEditingEnabled;
  
  // Add some debug logging to help diagnose issues
  console.log('Editor Display State:', {
    isPreviewMode,
    isEditingEnabled,
    hideEditorUI
  });

  return {
    hideEditorUI,
    isPreviewMode,
    isEditingEnabled
  };
};

export default useEditorDisplay;
