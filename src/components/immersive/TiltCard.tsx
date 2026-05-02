import { useEffect, useRef, ReactNode, CSSProperties } from 'react';

/**
 * Lightweight 3D tilt card with glare highlight.
 * Skipped on touch & reduced-motion.
 */
export default function TiltCard({
  children,
  max = 10,
  glare = true,
  className,
  style,
}: {
  children: ReactNode;
  max?: number;
  glare?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    const inner = innerRef.current;
    if (!root || !inner) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = matchMedia('(hover: none)').matches;
    if (reduce || isTouch) return;

    let rafId = 0;
    let rx = 0, ry = 0, tx = 0, ty = 0;
    let gx = 50, gy = 50;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      rx += (tx - rx) * 0.12;
      ry += (ty - ry) * 0.12;
      inner.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      if (glareRef.current) {
        glareRef.current.style.background =
          `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 55%)`;
      }
    };

    const onMove = (e: MouseEvent) => {
      const rect = root.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      ty = (x - 0.5) * 2 * max;
      tx = -(y - 0.5) * 2 * max;
      gx = x * 100;
      gy = y * 100;
    };
    const onLeave = () => { tx = 0; ty = 0; gx = 50; gy = 50; };

    root.addEventListener('mousemove', onMove);
    root.addEventListener('mouseleave', onLeave);
    tick();

    return () => {
      cancelAnimationFrame(rafId);
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('mouseleave', onLeave);
    };
  }, [max]);

  return (
    <div ref={ref} className={className} style={{ perspective: 900, ...style }}>
      <div
        ref={innerRef}
        style={{
          width: '100%',
          height: '100%',
          transition: 'transform .25s cubic-bezier(.22,.8,.3,1)',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          position: 'relative',
        }}
      >
        {children}
        {glare && (
          <div
            ref={glareRef}
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              borderRadius: 'inherit',
              mixBlendMode: 'overlay',
            }}
          />
        )}
      </div>
    </div>
  );
}
