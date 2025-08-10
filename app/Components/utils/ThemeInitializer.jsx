'use client';

import { useEffect } from 'react';
import { useEditorSettings } from './context/EditorSettingsContext';

/**
 * ThemeInitializer - Applies the user's theme settings on app startup
 * This component runs once when the app loads and applies the saved theme
 */
const ThemeInitializer = () => {
  const { settings, loading } = useEditorSettings();

  // Apply theme function (same as in EditorSettingsModal)
  const applyTheme = (mode) => {
    const root = document.documentElement;
    const body = document.body;
    
    if (mode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      mode = prefersDark ? 'dark' : 'light';
    }
    
    if (mode === 'dark') {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
      
      // Apply dark mode CSS variables
      root.style.setProperty('--bg-primary', '#1a1a1a');
      root.style.setProperty('--bg-secondary', '#2d2d2d');
      root.style.setProperty('--bg-tertiary', '#404040');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#cccccc');
      root.style.setProperty('--border-color', '#404040');
      root.style.setProperty('--panel-bg', '#262626');
      root.style.setProperty('--canvas-bg', '#1a1a1a');
    } else {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
      
      // Apply light mode CSS variables
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f5f5f5');
      root.style.setProperty('--bg-tertiary', '#e8e8e8');
      root.style.setProperty('--text-primary', '#000000');
      root.style.setProperty('--text-secondary', '#666666');
      root.style.setProperty('--border-color', '#d9d9d9');
      root.style.setProperty('--panel-bg', '#fafafa');
      root.style.setProperty('--canvas-bg', '#ffffff');
    }
  };

  // Apply colors to CSS variables
  const applyColors = (colors) => {
    if (!colors) return;
    
    const root = document.documentElement;
    
    // Apply canvas colors
    if (colors.canvas) {
      root.style.setProperty('--canvas-background', colors.canvas.background);
      root.style.setProperty('--grid-lines', colors.canvas.gridLines);
      root.style.setProperty('--rulers-bg', colors.canvas.rulers);
      root.style.setProperty('--canvas-bg', colors.canvas.background);
    }
    
    // Apply panel colors
    if (colors.panels) {
      root.style.setProperty('--panel-background', colors.panels.background);
      root.style.setProperty('--panel-border', colors.panels.border);
      root.style.setProperty('--panel-text', colors.panels.text);
      root.style.setProperty('--panel-accent', colors.panels.accent);
      root.style.setProperty('--panel-bg', colors.panels.background);
      root.style.setProperty('--border-color', colors.panels.border);
      root.style.setProperty('--text-primary', colors.panels.text);

      // Expose generic accent variables used across UI (Page Manager, etc.)
      if (colors.panels.accent) {
        const accent = colors.panels.accent;
        // Primary accent color
        root.style.setProperty('--accent-color', accent);
        // Derived accent backgrounds/shadows that adapt to theme background
        root.style.setProperty('--accent-bg', `color-mix(in srgb, ${accent} 14%, var(--bg-primary))`);
        root.style.setProperty('--accent-shadow', `color-mix(in srgb, ${accent} 24%, transparent)`);
      }
    }
    
    // Apply component colors
    if (colors.components) {
      root.style.setProperty('--selection-color', colors.components.selection);
      root.style.setProperty('--hover-color', colors.components.hover);
      root.style.setProperty('--guides-color', colors.components.guides);
      root.style.setProperty('--distance-color', colors.components.distance);
    }
    
    // Apply interface colors
    if (colors.interface) {
      root.style.setProperty('--text-primary', colors.interface.primary);
      root.style.setProperty('--text-secondary', colors.interface.secondary);
      root.style.setProperty('--text-disabled', colors.interface.disabled);
      root.style.setProperty('--success-color', colors.interface.success);
      root.style.setProperty('--warning-color', colors.interface.warning);
      root.style.setProperty('--error-color', colors.interface.error);
    }
  };

  // Apply theme and colors when settings load
  useEffect(() => {
    if (!loading && settings) {
      // Apply theme
      if (settings.theme?.mode) {
        applyTheme(settings.theme.mode);
      }
      
      // Apply colors
      if (settings.colors) {
        applyColors(settings.colors);
      }
    }
  }, [loading, settings]);

  // Listen for system theme changes
  useEffect(() => {
    if (!loading && settings?.theme?.mode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('auto');
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [loading, settings?.theme?.mode]);

  // This component doesn't render anything
  return null;
};

export default ThemeInitializer;
