import { useEffect, useRef } from 'react';

/**
 * Reading-progress bar pinned to the top of the viewport.
 * Reflects how far the user has scrolled through the document.
 */
export default function ScrollProgress() {
  const fillRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = fillRef.current;
      if (!el) return;
      const doc = document.documentElement;
      const max = (doc.scrollHeight - window.innerHeight) || 1;
      const value = Math.max(0, Math.min(1, window.scrollY / max));
      el.style.transform = `scaleX(${value})`;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="reading-progress" aria-hidden="true">
      <span ref={fillRef} />
    </div>
  );
}
