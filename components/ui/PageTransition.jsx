"use client";

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

const pageVariant = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.25, ease: 'easeIn' } }
};

export default function PageTransition({ children }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={pageVariant}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ minHeight: '100vh' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
