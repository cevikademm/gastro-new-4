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

    const scan = () => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => io.observe(el));
    };
    const raf1 = requestAnimationFrame(() => {
      scan();
      const raf2 = requestAnimationFrame(scan);
      (window as unknown as { __revealRaf?: number }).__revealRaf = raf2;
    });

    // Catch lazy-mounted nodes (e.g. IntersectionObserver-gated sections)
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(raf1);
      const w = window as unknown as { __revealRaf?: number };
      if (w.__revealRaf) cancelAnimationFrame(w.__revealRaf);
    };
  }, [location.pathname]);

  return null;
}
