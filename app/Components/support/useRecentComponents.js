'use client';

import { useState, useEffect } from 'react';
import { useEditor } from '@craftjs/core';

const STORAGE_KEY = 'craftjs-recent-components';
const MAX_RECENT = 6;

// Component mapping for display names to component info
const COMPONENT_MAP = {
  'Box': { name: 'Box', icon: '⬜' },
  'Text': { name: 'Text', icon: 'T' },
  'Button': { name: 'Button', icon: '🔘' },
  'Image': { name: 'Image', icon: '🖼️' },
  'FlexBox': { name: 'FlexBox', icon: '📦' },
  'GridBox': { name: 'GridBox', icon: '▦' },
  'Link': { name: 'Link', icon: '🔗' },
  'Paragraph': { name: 'Paragraph', icon: '📝' },
  'Video': { name: 'Video', icon: '🎥' },
  'Carousel': { name: 'Carousel', icon: '🎠' },
  'Form': { name: 'Form', icon: '📋' },
  'FormInput': { name: 'FormInput', icon: '📝' }
};

export const useRecentComponents = () => {
  const [recentComponents, setRecentComponents] = useState([]);
  const { query, enabled } = useEditor((state) => ({
    enabled: state.options.enabled
  }));

  // Load recent components from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentComponents(parsed);
      }
    } catch (error) {
      console.error('❌ Error loading recent components:', error);
    }
  }, []);

  // Track component additions by monitoring CraftJS state changes
  useEffect(() => {
    if (!enabled) return;

    let lastNodeCount = 0;
    let lastNodes = {};

    const checkForNewComponents = () => {
      try {
        const currentNodes = query.getNodes();
        const currentNodeCount = Object.keys(currentNodes).length;

        // If node count increased, check for new components
        if (currentNodeCount > lastNodeCount) {
          Object.entries(currentNodes).forEach(([nodeId, node]) => {
            // Check if this is a new node (not in lastNodes) and not ROOT
            if (!lastNodes[nodeId] && nodeId !== 'ROOT' && node.data) {
              const displayName = node.data.displayName;
              const componentInfo = COMPONENT_MAP[displayName];
              
              if (componentInfo) {
                console.log('🎯 Detected new component added:', displayName);
                addToRecent(componentInfo);
              }
            }
          });
        }

        lastNodeCount = currentNodeCount;
        lastNodes = { ...currentNodes };
      } catch (error) {
        console.warn('⚠️ Error checking for new components:', error);
      }
    };

    // Check periodically for new components
    const interval = setInterval(checkForNewComponents, 500);

    // Initial check
    checkForNewComponents();

    return () => clearInterval(interval);
  }, [enabled, query]);

  // Add a component to recent list
  const addToRecent = (componentInfo) => {
    setRecentComponents(prev => {
      const filtered = prev.filter(comp => comp.name !== componentInfo.name);
      const updated = [componentInfo, ...filtered].slice(0, MAX_RECENT);
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('❌ Error saving recent components:', error);
      }
      
      return updated;
    });
  };

  // Clear all recent components
  const clearRecent = () => {
    setRecentComponents([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('❌ Error clearing recent components:', error);
    }
  };

  return { recentComponents, addToRecent, clearRecent };
};
