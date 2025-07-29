'use client';

import React from 'react';

export const VideoBackground = ({ 
  src,
  poster,
  opacity = 0.3,
  className = '',
  children,
  ...props 
}) => {
  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Video Background - only render if src is provided */}
      {src && (
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={poster}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity,
            zIndex: -1
          }}
        >
          <source src={src} type="video/mp4" />
        </video>
      )}

      {/* Fallback gradient background */}
      <div 
        className="absolute inset-0 w-full h-full bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900"
        style={{ 
          opacity: src ? 0 : opacity,
          zIndex: -1
        }}
      />

      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black"
        style={{ 
          opacity: opacity * 0.3,
          zIndex: 0
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default VideoBackground;
