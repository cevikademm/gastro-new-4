import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Single IntersectionObserver toggles `is-visible` on `.reveal` elements.
 * Re-scans on route changes (no MutationObserver — keeps the main thread idle
 * during normal interaction).
 */
export default function RevealOnScroll() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
    );

    // Initial + post-mount scan. requestAnimationFrame ensures lazy route
    // content has mounted before we query.
    const scan = () => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => io.observe(el));
    };
    const raf1 = requestAnimationFrame(() => {
      scan();
      // Second pass for components that mount via Suspense after first frame.
      const raf2 = requestAnimationFrame(scan);
      (window as unknown as { __revealRaf?: number }).__revealRaf = raf2;
    });

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf1);
      const w = window as unknown as { __revealRaf?: number };
      if (w.__revealRaf) cancelAnimationFrame(w.__revealRaf);
    };
  }, [location.pathname]);

  return null;
}
