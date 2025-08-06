'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';

export const ThemedContainer = ({ 
  children, 
  variant = 'default',
  className = '',
  style = {},
  ...props 
}) => {
  const { effectiveTheme } = useTheme();

  const getVariantStyles = () => {
    const baseStyles = {
      transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease'
    };

    switch (variant) {
      case 'panel':
        return {
          ...baseStyles,
          background: 'var(--panel-bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)'
        };
      
      case 'canvas':
        return {
          ...baseStyles,
          background: 'var(--canvas-bg)',
          color: 'var(--text-primary)'
        };
      
      case 'toolbar':
        return {
          ...baseStyles,
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)'
        };
      
      case 'dropdown':
        return {
          ...baseStyles,
          background: 'var(--panel-bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow)'
        };
      
      case 'modal':
        return {
          ...baseStyles,
          background: 'var(--panel-bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)'
        };

      default:
        return {
          ...baseStyles,
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)'
        };
    }
  };

  const combinedStyles = {
    ...getVariantStyles(),
    ...style
  };

  return (
    <div 
      className={className}
      style={combinedStyles}
      data-theme={effectiveTheme}
      {...props}
    >
      {children}
    </div>
  );
};