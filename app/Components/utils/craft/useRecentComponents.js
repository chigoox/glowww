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
    let detectionCooldown = new Set(); // Track recently detected components to avoid duplicates

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
              
              // Add cooldown to prevent detecting the same component type too frequently
              const cooldownKey = `${displayName}_${Date.now() - (Date.now() % 2000)}`; // 2 second windows
              
              if (componentInfo && !detectionCooldown.has(cooldownKey)) {
                detectionCooldown.add(cooldownKey);
                
                // Reduced logging frequency - only log occasionally to avoid console spam
                if (Math.random() < 0.05) { // Only log 5% of the time
                  console.log('🎯 Detected new component added:', displayName);
                }
                addToRecent(componentInfo);
                
                // Clean up old cooldown entries
                setTimeout(() => detectionCooldown.delete(cooldownKey), 5000);
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

    // Check periodically for new components - reduced frequency to avoid excessive detection
    const interval = setInterval(checkForNewComponents, 2000); // Increased from 500ms to 2000ms

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
