'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'craftjs-recent-components';
const MAX_RECENT = 6;

export const useRecentComponents = () => {
  const [recentComponents, setRecentComponents] = useState([]);

  // Load recent components from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentComponents(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading recent components:', error);
    }
  }, []);

  // Add a component to recent list
  const addToRecent = (componentInfo) => {
    setRecentComponents(prev => {
      const filtered = prev.filter(comp => comp.name !== componentInfo.name);
      const updated = [componentInfo, ...filtered].slice(0, MAX_RECENT);
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving recent components:', error);
      }
      
      return updated;
    });
  };

  return { recentComponents, addToRecent };
};
