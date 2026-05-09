import { useEffect, useRef } from 'react';

/**
 * Lusion / le-lab inspired interactive cursor.
 * - A tiny dot tracks the real cursor exactly (1:1)
 * - A larger ring follows with springy lerp
 * - Ring expands and inverts when hovering interactive elements
 * - Hidden on touch devices and when prefers-reduced-motion
 * - Self-injects styles to hide the native cursor on desktop
 */
export default function MagneticCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isTouch = matchMedia('(hover: none)').matches || matchMedia('(pointer: coarse)').matches;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isTouch || reduce) return;

    const dot = dotRef.current!;
    const ring = ringRef.current!;
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let scale = 1;
    let scaleTarget = 1;
    let hovering = false;

    const style = document.createElement('style');
    style.setAttribute('data-magnetic-cursor', '');
    style.textContent = `
      @media (hover: hover) and (pointer: fine) {
        html, body, * { cursor: none !important; }
        a, button, [role="button"], input, textarea, select { cursor: none !important; }
      }
      .magnetic-cursor-dot, .magnetic-cursor-ring {
        position: fixed; top: 0; left: 0; pointer-events: none; z-index: 9999;
        will-change: transform;
        transform: translate3d(-50%, -50%, 0);
      }
      .magnetic-cursor-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: #DC2626;
        mix-blend-mode: difference;
      }
      .magnetic-cursor-ring {
        width: 38px; height: 38px; border-radius: 50%;
        border: 1.5px solid rgba(220,38,38,0.7);
        transition: width .25s ease, height .25s ease, border-color .25s ease, background .25s ease;
      }
      .magnetic-cursor-ring.is-hover {
        width: 70px; height: 70px;
        background: rgba(220,38,38,0.18);
        border-color: rgba(220,38,38,0);
      }
    `;
    document.head.appendChild(style);

    const move = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };

    const over = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest('a, button, [role="button"], input, textarea, select, [data-cursor="hover"]');
      const next = !!interactive;
      if (next !== hovering) {
        hovering = next;
        ring.classList.toggle('is-hover', hovering);
        scaleTarget = hovering ? 1.4 : 1;
      }
    };

    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseover', over, { passive: true });

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      // 1:1 dot
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      // springy ring
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      scale += (scaleTarget - scale) * 0.2;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${scale})`;
    };
    tick();

    const hide = () => {
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    };
    const show = () => {
      dot.style.opacity = '1';
      ring.style.opacity = '1';
    };
    window.addEventListener('mouseleave', hide);
    window.addEventListener('mouseenter', show);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', over);
      window.removeEventListener('mouseleave', hide);
      window.removeEventListener('mouseenter', show);
      style.remove();
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="magnetic-cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="magnetic-cursor-dot" aria-hidden="true" />
    </>
  );
}
