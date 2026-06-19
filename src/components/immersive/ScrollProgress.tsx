import { useEffect, useRef } from 'react';

/**
 * Slim top progress bar driven by document scroll.
 * GPU-only animation (scaleX), no React state churn per frame.
 */
export default function ScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const scrollable = (doc.scrollHeight - doc.clientHeight) || 1;
      const p = Math.max(0, Math.min(1, doc.scrollTop / scrollable));
      bar.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 10000,
        pointerEvents: 'none',
        background: 'rgba(15, 36, 64, 0.06)',
      }}
    >
      <div
        ref={barRef}
        style={{
          height: '100%',
          width: '100%',
          transform: 'scaleX(0)',
          transformOrigin: '0 50%',
          background:
            'linear-gradient(90deg, #1E3A5F 0%, #DC2626 50%, #EF4444 100%)',
          boxShadow: '0 0 14px rgba(220,38,38,0.55)',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
