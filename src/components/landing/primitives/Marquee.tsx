import React from 'react';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export interface MarqueeProps {
  children: React.ReactNode;
  speed?: 'slow' | 'normal' | 'fast';
  gap?: number;
  pauseOnHover?: boolean;
  direction?: 'left' | 'right';
  className?: string;
}

const SPEED_MAP: Record<string, string> = {
  slow: '60s',
  normal: '30s',
  fast: '15s',
};

export function Marquee({
  children,
  speed = 'normal',
  gap = 48,
  pauseOnHover = false,
  direction = 'left',
  className,
}: MarqueeProps) {
  const reduced = useReducedMotion();
  const duration = SPEED_MAP[speed];
  const playState = reduced ? 'paused' : 'running';

  const trackStyle: React.CSSProperties = {
    display: 'flex',
    width: 'max-content',
    gap: `${gap}px`,
    animation: `c-marquee ${duration} linear infinite`,
    animationDirection: direction === 'right' ? 'reverse' : 'normal',
    animationPlayState: playState,
  };

  return (
    <div
      className={`overflow-hidden ${className ?? ''}`}
      onMouseEnter={pauseOnHover ? (e) => {
        const el = e.currentTarget.querySelector('.marquee-track') as HTMLElement | null;
        if (el) el.style.animationPlayState = 'paused';
      } : undefined}
      onMouseLeave={pauseOnHover ? (e) => {
        const el = e.currentTarget.querySelector('.marquee-track') as HTMLElement | null;
        if (el) el.style.animationPlayState = reduced ? 'paused' : 'running';
      } : undefined}
    >
      <div className="marquee-track" style={trackStyle}>
        {children}
        <span aria-hidden="true" style={{ display: 'contents' }}>{children}</span>
      </div>
    </div>
  );
}
