'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  systemTheme: 'light'
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('auto');
  const [systemTheme, setSystemTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  // Detect system theme preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

      const handleChange = (e) => {
        setSystemTheme(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  // Load saved theme on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'auto';
      setTheme(savedTheme);
      setMounted(true);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (mounted && typeof document !== 'undefined') {
      const effectiveTheme = theme === 'auto' ? systemTheme : theme;
      document.documentElement.setAttribute('data-theme', effectiveTheme);
      
      // Also add class for fallback
      document.documentElement.className = document.documentElement.className
        .replace(/\b(light-theme|dark-theme)\b/g, '')
        .trim();
      document.documentElement.classList.add(`${effectiveTheme}-theme`);
    }
  }, [theme, systemTheme, mounted]);

  // Save theme to localStorage
  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  };

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }

  const value = {
    theme,
    setTheme: updateTheme,
    systemTheme,
    effectiveTheme: theme === 'auto' ? systemTheme : theme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};