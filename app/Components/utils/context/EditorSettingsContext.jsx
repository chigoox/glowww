'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { updateUserEditorSettings, getUserEditorSettings } from '../../../../lib/auth';

/**
 * Editor Settings Context - Centralized settings management for the editor
 * Similar to Photoshop's preferences system
 * Now with Firebase persistence for authenticated users
 */

const DEFAULT_SETTINGS = {
  // Drop Position Settings
  dropPosition: {
    mode: 'center', // 'center' | 'topLeft'
    snapToGrid: false,
    centerOnMouse: true
  },
  
  // Visual Settings
  visual: {
    showGuides: true,
    showGrid: false,
    gridOpacity: 0.5,
    guideColor: '#0066ff',
    selectionColor: '#0088ff',
    distanceColor: '#ff6600',
    safeAreaEnabled: true
  },
  
  // Snap Settings
  snap: {
    enabled: true,
    tolerance: 8,
    snapToComponents: true,
    snapToGrid: false,
    snapToGuides: true
  },
  
  // Animation Settings
  animation: {
    enabled: true,
    duration: 200,
    easing: 'ease-out'
  },
  
  // Grid Settings
  grid: {
    size: 16,
    subdivisions: 4,
    enabled: false,
    color: '#e0e0e0'
  },
  
  // Performance Settings
  performance: {
    realTimeUpdates: true,
    throttleDelay: 16,
    maxHistorySteps: 50
  },

  // Theme Settings
  theme: {
    mode: 'light', // 'light' | 'dark' | 'auto'
    autoFollowSystem: false
  },

  // Color Customization Settings
  colors: {
    // Canvas & Background Colors
    canvas: {
      background: '#ffffff',
      gridLines: '#e0e0e0',
      rulers: '#f5f5f5'
    },
    
    // UI Panel Colors
    panels: {
      background: '#fafafa',
      border: '#d9d9d9',
      text: '#000000',
      accent: '#1890ff'
    },
    
    // Component Colors
    components: {
      selection: '#0088ff',
      hover: '#40a9ff',
      guides: '#0066ff',
      distance: '#ff6600'
    },
    
    // Text & Interface Colors
    interface: {
      primary: '#000000',
      secondary: '#666666',
      disabled: '#bfbfbf',
      success: '#52c41a',
      warning: '#faad14',
      error: '#ff4d4f'
    }
  }
  ,
  // Breakpoint / viewport override settings for editor preview
  breakpoints: {
    current: 'auto', // 'auto'|'sm'|'regular'|'lg'|'xl'|'custom'
    customWidth: null,
    widths: {
      sm: 375,
      regular: 768,
      lg: 1024,
      xl: 1280
    }
  }
};

const EditorSettingsContext = createContext();

export const useEditorSettings = () => {
  const context = useContext(EditorSettingsContext);
  if (!context) {
    throw new Error('useEditorSettings must be used within an EditorSettingsProvider');
  }
  return context;
};

export const EditorSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Load settings from Firebase (authenticated users) or localStorage (guests)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (user?.uid) {
          // Authenticated user - load from Firebase
          const firebaseSettings = await getUserEditorSettings(user.uid);
          if (firebaseSettings) {
            setSettings(prev => ({
              ...prev,
              ...firebaseSettings
            }));
          } else {
            // No Firebase settings yet, try to migrate from localStorage
            const localSettings = localStorage.getItem('glowww-editor-settings');
            if (localSettings) {
              const parsed = JSON.parse(localSettings);
              setSettings(prev => ({
                ...prev,
                ...parsed
              }));
              // Save to Firebase for future use
              await updateUserEditorSettings(user.uid, { ...DEFAULT_SETTINGS, ...parsed });
              // Clear localStorage after migration
              localStorage.removeItem('glowww-editor-settings');
            }
          }
        } else {
          // Guest user - load from localStorage
          const savedSettings = localStorage.getItem('glowww-editor-settings');
          if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            setSettings(prev => ({
              ...prev,
              ...parsed
            }));
          }
        }
      } catch (error) {
        console.warn('Failed to load editor settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.uid]);

  // Save settings to Firebase (authenticated) or localStorage (guests)
  useEffect(() => {
    if (loading) return; // Don't save during initial load

    const saveSettings = async () => {
      try {
        if (user?.uid) {
          // Authenticated user - save to Firebase
          await updateUserEditorSettings(user.uid, settings);
        } else {
          // Guest user - save to localStorage
          localStorage.setItem('glowww-editor-settings', JSON.stringify(settings));
        }
      } catch (error) {
        console.warn('Failed to save editor settings:', error);
        // Fallback to localStorage if Firebase fails
        if (user?.uid) {
          localStorage.setItem('glowww-editor-settings', JSON.stringify(settings));
        }
      }
    };

    const timeoutId = setTimeout(saveSettings, 500); // Debounce saves
    return () => clearTimeout(timeoutId);
  }, [settings, user?.uid, loading]);

  // Update a specific setting
  const updateSetting = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current = newSettings;
      
      // Navigate to the parent object
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
      }
      
      // Set the value
      current[keys[keys.length - 1]] = value;
      
      return newSettings;
    });
  };

  // Update multiple settings at once
  const updateSettings = (newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  // Reset to defaults
  const resetSettings = async () => {
    setSettings(DEFAULT_SETTINGS);
    
    // Also clear from storage
    try {
      if (user?.uid) {
        await updateUserEditorSettings(user.uid, DEFAULT_SETTINGS);
      } else {
        localStorage.setItem('glowww-editor-settings', JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch (error) {
      console.warn('Failed to reset settings in storage:', error);
    }
  };

  // Get a specific setting
  const getSetting = (path) => {
    const keys = path.split('.');
    let current = settings;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  };

  const value = {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    getSetting,
    loading,
    isAuthenticated: !!user?.uid
  };

  return (
    <EditorSettingsContext.Provider value={value}>
      {children}
    </EditorSettingsContext.Provider>
  );
};

export default EditorSettingsContext;
