"use client";

import React from 'react';
import { motion } from 'framer-motion';

// Container and item variants for a simple staggered entrance
export const containerVariant = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.08,
      when: 'beforeChildren',
      duration: 0.4,
      ease: 'easeOut'
    }
  }
};

export const itemVariant = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
};

export default function MotionSection({ children, className = '', ...props }) {
  return (
    <motion.div
      variants={containerVariant}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
