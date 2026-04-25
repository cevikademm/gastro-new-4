import React from 'react';
import { motion } from 'motion/react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { EASE_OUT } from '../../../utils/motion';

export interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

export function Reveal({
  children,
  delay = 0,
  y = 24,
  duration = 0.9,
  className,
  as = 'div',
}: RevealProps) {
  const reduced = useReducedMotion();
  const Tag = motion[as as keyof typeof motion] as typeof motion.div;

  if (reduced) {
    return React.createElement(as, { className }, children);
  }

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </Tag>
  );
}
