'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { snapGridSystem, GRID_PRESETS } from './SnapGridSystem';

/**
 * SnapGridOverlay - Visual grid overlay with snap indicators like Figma/Adobe XD
 * Features:
 * - Dotted/line grid patterns
 * - Dynamic snap guide lines
 * - Distance measurement indicators
 * - Zoom-aware rendering
 * - Professional visual feedback
 */
const SnapGridOverlay = ({ 
  canvasRef, 
  zoom = 1, 
  canvasWidth = 1200, 
  canvasHeight = 800,
  offsetX = 0,
  offsetY = 0
}) => {
  const overlayRef = useRef(null);
  const canvasCtxRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const [settings, setSettings] = useState(snapGridSystem.getSettings());
  const [snapLines, setSnapLines] = useState([]);
  const [distanceIndicators, setDistanceIndicators] = useState([]);

  // Update canvas context
  useEffect(() => {
    const canvas = overlayRef.current;
    if (canvas) {
      canvasCtxRef.current = canvas.getContext('2d');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }
  }, [canvasWidth, canvasHeight]);

  // Listen for snap grid system updates
  useEffect(() => {
    const handleSnapGridUpdate = (event) => {
      const { type, ...data } = event.detail;
      
      switch (type) {
        case 'grid-visibility-changed':
        case 'grid-size-changed':
        case 'grid-opacity-changed':
        case 'settings-updated':
          setSettings(snapGridSystem.getSettings());
          break;
          
        case 'snap-indicators-changed':
          setSnapLines(data.snapLines || []);
          setDistanceIndicators(data.distanceIndicators || []);
          break;
          
        case 'snap-indicators-cleared':
          setSnapLines([]);
          setDistanceIndicators([]);
          break;
      }
    };

    window.addEventListener('snapGridUpdate', handleSnapGridUpdate);
    return () => window.removeEventListener('snapGridUpdate', handleSnapGridUpdate);
  }, []);

  // Render grid pattern
  const renderGrid = useCallback((ctx) => {
    if (!settings.gridVisible || !settings.gridEnabled) return;

    const gridSize = settings.gridSize * zoom;
    const opacity = settings.gridOpacity;
    
    // Don't render if grid is too small or too large
    if (gridSize < 4 || gridSize > 200) return;

    ctx.save();
    
    // Grid style - similar to Figma's dotted grid
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
    ctx.lineWidth = 1;

    // Calculate grid bounds with offset
    const startX = (offsetX % gridSize);
    const startY = (offsetY % gridSize);
    const endX = canvasWidth;
    const endY = canvasHeight;

    // Render grid based on size
    if (gridSize >= 16) {
      // Larger grid - render as dots (like Figma)
      const dotSize = Math.max(1, gridSize / 20);
      
      for (let x = startX; x <= endX; x += gridSize) {
        for (let y = startY; y <= endY; y += gridSize) {
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // Smaller grid - render as lines
      ctx.setLineDash([1, 1]);
      
      // Vertical lines
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, endY);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(endX, y);
        ctx.stroke();
      }
      
      ctx.setLineDash([]);
    }
    
    ctx.restore();
  }, [settings, zoom, canvasWidth, canvasHeight, offsetX, offsetY]);

  // Render snap lines
  const renderSnapLines = useCallback((ctx) => {
    if (snapLines.length === 0) return;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    snapLines.forEach(line => {
      ctx.strokeStyle = line.color || '#ff0000';
      ctx.beginPath();
      
      if (line.type === 'vertical') {
        const x = (line.x * zoom) + offsetX;
        ctx.moveTo(x, line.y1 * zoom + offsetY);
        ctx.lineTo(x, line.y2 * zoom + offsetY);
      } else {
        const y = (line.y * zoom) + offsetY;
        ctx.moveTo(line.x1 * zoom + offsetX, y);
        ctx.lineTo(line.x2 * zoom + offsetX, y);
      }
      
      ctx.stroke();
      
      // Render label if present
      if (line.label && zoom > 0.3) {
        ctx.save();
        ctx.fillStyle = line.color || '#ff0000';
        ctx.font = `${Math.max(10, 12 * zoom)}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const labelX = line.type === 'vertical' 
          ? (line.x * zoom) + offsetX 
          : ((line.x1 + line.x2) / 2) * zoom + offsetX;
        const labelY = line.type === 'vertical' 
          ? ((line.y1 + line.y2) / 2) * zoom + offsetY 
          : (line.y * zoom) + offsetY;
          
        // Label background
        const textWidth = ctx.measureText(line.label).width;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(labelX - textWidth/2 - 4, labelY - 8, textWidth + 8, 16);
        
        ctx.fillStyle = line.color || '#ff0000';
        ctx.fillText(line.label, labelX, labelY);
        ctx.restore();
      }
    });

    ctx.setLineDash([]);
    ctx.restore();
  }, [snapLines, zoom, offsetX, offsetY]);

  // Render distance indicators
  const renderDistanceIndicators = useCallback((ctx) => {
    if (distanceIndicators.length === 0) return;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#0099ff';
    ctx.fillStyle = '#0099ff';

    distanceIndicators.forEach(indicator => {
      const color = indicator.color || '#0099ff';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      if (indicator.type === 'horizontal') {
        const y = indicator.y * zoom + offsetY;
        const x1 = indicator.x1 * zoom + offsetX;
        const x2 = indicator.x2 * zoom + offsetX;
        
        // Main line
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
        
        // End caps
        ctx.beginPath();
        ctx.moveTo(x1, y - 4);
        ctx.lineTo(x1, y + 4);
        ctx.moveTo(x2, y - 4);
        ctx.lineTo(x2, y + 4);
        ctx.stroke();
        
        // Distance label
        if (zoom > 0.4) {
          const centerX = (x1 + x2) / 2;
          const distance = Math.round(indicator.distance);
          
          ctx.font = `${Math.max(9, 10 * zoom)}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          
          // Label background
          const text = `${distance}px`;
          const textWidth = ctx.measureText(text).width;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.fillRect(centerX - textWidth/2 - 3, y - 18, textWidth + 6, 12);
          
          ctx.fillStyle = color;
          ctx.fillText(text, centerX, y - 6);
        }
        
      } else { // vertical
        const x = indicator.x * zoom + offsetX;
        const y1 = indicator.y1 * zoom + offsetY;
        const y2 = indicator.y2 * zoom + offsetY;
        
        // Main line
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();
        
        // End caps
        ctx.beginPath();
        ctx.moveTo(x - 4, y1);
        ctx.lineTo(x + 4, y1);
        ctx.moveTo(x - 4, y2);
        ctx.lineTo(x + 4, y2);
        ctx.stroke();
        
        // Distance label
        if (zoom > 0.4) {
          const centerY = (y1 + y2) / 2;
          const distance = Math.round(indicator.distance);
          
          ctx.font = `${Math.max(9, 10 * zoom)}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          
          // Label background
          const text = `${distance}px`;
          const textWidth = ctx.measureText(text).width;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.fillRect(x + 6, centerY - 6, textWidth + 6, 12);
          
          ctx.fillStyle = color;
          ctx.fillText(text, x + 9, centerY);
        }
      }
    });

    ctx.restore();
  }, [distanceIndicators, zoom, offsetX, offsetY]);

  // Main render function
  const render = useCallback(() => {
    const ctx = canvasCtxRef.current;
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Render grid
    renderGrid(ctx);
    
    // Render snap indicators
    renderSnapLines(ctx);
    renderDistanceIndicators(ctx);
  }, [renderGrid, renderSnapLines, renderDistanceIndicators, canvasWidth, canvasHeight]);

  // Animation loop for smooth updates
  useEffect(() => {
    const animate = () => {
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  return (
    <canvas
      ref={overlayRef}
      className="absolute top-0 left-0 pointer-events-none z-10"
      style={{
        width: canvasWidth,
        height: canvasHeight,
        transform: `scale(${zoom})`,
        transformOrigin: 'top left'
      }}
      width={canvasWidth}
      height={canvasHeight}
    />
  );
};

export default SnapGridOverlay;
