import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap } from 'lucide-react';

/**
 * Flash-sale strip with live 48-hour countdown.
 * Pushes urgency above the fold.
 */
export function FlashStrip() {
  const [endsAt] = useState(
    () => Date.now() + (47 * 3600 + 23 * 60 + 8) * 1000
  );
  const [{ h, m, s }, setLeft] = useState({ h: 47, m: 23, s: 8 });

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, endsAt - Date.now());
      setLeft({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <section
      className="relative overflow-hidden py-7 text-white"
      style={{ background: 'linear-gradient(90deg, var(--c-clay-deep) 0%, var(--c-clay) 100%)' }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.04) 20px, rgba(255,255,255,0.04) 40px)',
          animation: 'flash-slide 20s linear infinite',
        }}
      />
      <style>{`
        @keyframes flash-slide { 0%{background-position:0 0} 100%{background-position:40px 40px} }
        @keyframes flash-shake {
          0%,100% { transform: rotate(0) }
          15% { transform: rotate(-8deg) }
          30% { transform: rotate(10deg) }
          45% { transform: rotate(-5deg) }
          60% { transform: rotate(0) }
        }
      `}</style>

      <div className="relative z-[2] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-8">
        <div className="flex items-center gap-4">
          <span
            className="w-[50px] h-[50px] rounded-full inline-flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.18)', animation: 'flash-shake 2s infinite' }}
          >
            <Zap size={26} fill="currentColor" strokeWidth={0} />
          </span>
          <div>
            <div className="c-serif text-[22px] sm:text-[28px] font-bold leading-tight">
              Flash Sale: Diamond Soğutucularda %30'a Varan İndirim
            </div>
            <div className="text-[14px] opacity-90 mt-0.5">
              Son 48 saat — stoklar hızla tükeniyor
            </div>
          </div>
        </div>

        <div className="flex gap-2.5">
          {[
            { n: h, l: 'Saat' },
            { n: m, l: 'Dakika' },
            { n: s, l: 'Saniye' },
          ].map(({ n, l }) => (
            <div
              key={l}
              className="text-center min-w-[62px] px-3.5 py-2 rounded-[10px] backdrop-blur-md"
              style={{ background: 'rgba(255,255,255,0.18)' }}
            >
              <div className="c-serif text-[28px] font-bold leading-none">{pad(n)}</div>
              <div className="text-[10px] uppercase tracking-[0.08em] opacity-80">{l}</div>
            </div>
          ))}
        </div>

        <Link
          to="/kategori"
          className="inline-flex items-center gap-2 bg-white px-6 py-3.5 rounded-full font-bold text-[15px] hover:scale-105 transition-transform"
          style={{ color: 'var(--c-clay-deep)' }}
        >
          İndirimleri İncele
          <ArrowRight size={16} strokeWidth={2.5} />
        </Link>
      </div>
    </section>
  );
}
