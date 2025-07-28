'use client';

import React, { useRef, useEffect } from 'react';

export const VideoBackground = ({ 
  videoSrc, 
  poster, 
  overlay = true, 
  overlayOpacity = 0.4,
  children,
  className = ""
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(error => {
        console.log('Video autoplay prevented:', error);
      });
    }
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Video Element */}
      {videoSrc ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          poster={poster}
          className="absolute inset-0 w-full h-full object-cover"
          onLoadedData={() => console.log('Video loaded')}
          onError={(e) => console.log('Video error:', e)}
        >
          <source src={videoSrc} type="video/mp4" />
          <source src={videoSrc.replace('.mp4', '.webm')} type="video/webm" />
          {/* Fallback for browsers that don't support video */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900" />
        </video>
      ) : (
        /* Fallback gradient background when no video */
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 animate-pulse"></div>
        </div>
      )}

      {/* Overlay */}
      {overlay && (
        <div 
          className="absolute inset-0 bg-black" 
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// Usage example:
/*
<VideoBackground 
  videoSrc="/videos/hero-background.mp4"
  poster="/images/video-poster.jpg"
  overlay={true}
  overlayOpacity={0.4}
  className="min-h-screen"
>
  <div className="flex items-center justify-center min-h-screen">
    <h1 className="text-4xl text-white">Your Content Here</h1>
  </div>
</VideoBackground>
*/
