import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { EASE_OUT } from '../../../utils/motion';

export interface AnimatedHeadlineProps {
  staticBefore: string;
  staticAfter?: string;
  words: string[];
  interval?: number;
  className?: string;
}

export function AnimatedHeadline({
  staticBefore,
  staticAfter,
  words,
  interval = 3200,
  className,
}: AnimatedHeadlineProps) {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, interval);
    return () => clearInterval(id);
  }, [interval, words.length]);

  const enter = reduced
    ? { opacity: 0 }
    : { opacity: 0, y: 20, rotateX: -15 };

  const visible = reduced
    ? { opacity: 1 }
    : { opacity: 1, y: 0, rotateX: 0 };

  const exitAnim = reduced
    ? { opacity: 0 }
    : { opacity: 0, y: -20, rotateX: 15 };

  const transition = reduced
    ? { duration: 0.3 }
    : { duration: 0.55, ease: EASE_OUT };

  return (
    <h1 className={className}>
      <span>{staticBefore} </span>
      <span style={{ perspective: '600px', display: 'inline-block' }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={index}
            initial={enter}
            animate={visible}
            exit={exitAnim}
            transition={transition}
            style={{ display: 'inline-block' }}
            className="text-[color:var(--c-clay)] italic"
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </span>
      {staticAfter && <span> {staticAfter}</span>}
    </h1>
  );
}
