import { useEffect, useRef, useState } from 'react';
import { useMotionValue, useInView, animate } from 'motion/react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export interface CountUpProps {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  separator?: string;
  className?: string;
}

function formatNumber(value: number, decimals: number, separator: string): string {
  const fixed = value.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return decPart !== undefined ? `${formatted}.${decPart}` : formatted;
}

export function CountUp({
  to,
  duration = 2.0,
  suffix = '',
  prefix = '',
  decimals = 0,
  separator = '.',
  className,
}: CountUpProps) {
  const reduced = useReducedMotion();
  const motionVal = useMotionValue(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(reduced ? to : 0);

  useEffect(() => {
    if (reduced) {
      setDisplay(to);
      return;
    }
    if (!inView) return;
    const controls = animate(motionVal, to, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls?.stop();
  }, [inView, reduced, to, duration, motionVal]);

  return (
    <span ref={ref} className={className} data-testid="countup">
      {prefix}
      {formatNumber(display, decimals, separator)}
      {suffix}
    </span>
  );
}
