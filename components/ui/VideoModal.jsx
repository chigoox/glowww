'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function VideoModal({ open, onClose, videoUrl }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-xl overflow-hidden shadow-2xl max-w-4xl w-full mx-4"
      >
        <div className="flex justify-end p-3">
          <button
            onClick={onClose}
            className="text-gray-700 hover:text-gray-900"
            aria-label="Close video modal"
          >
            ✕
          </button>
        </div>

        <div className="px-4 pb-6">
          {videoUrl ? (
            <div className="aspect-w-16 aspect-h-9">
              <iframe
                className="w-full h-[480px] md:h-[600px]"
                src={videoUrl}
                title="Demo video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="p-8 text-center text-gray-700">
              Demo coming soon.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
