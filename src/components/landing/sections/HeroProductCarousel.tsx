import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Star } from 'lucide-react';

/**
 * Rotating product card carousel displayed on the right side of the hero.
 * Shows 3D-stacked premium products (over €1000) pulled from real catalog.
 */

interface HeroProduct {
  id: string;
  name: string;
  brand: string;
  line: string;
  img: string;
  price: number;
  oldPrice: number;
  stockDays: 1 | 2;
  chip?: { label: string; hot?: boolean };
}

const HERO_PRODUCTS: HeroProduct[] = [
  {
    id: 'SBET-XC-22',
    name: 'Kombidämpfer Touch 20× GN2/1 — Boiler + Konvektion',
    brand: 'DIAMOND',
    line: 'PLATINUM',
    img: 'https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/50379/conversions/001SBES-XC-20-big.jpg',
    price: 41507,
    oldPrice: 49808,
    stockDays: 1,
    chip: { label: 'Yeni Sezon', hot: true },
  },
  {
    id: 'ICE900ISW',
    name: 'Scherbeneisbereiter 900 kg — Profi Gastronomie',
    brand: 'DIAMOND',
    line: 'GOLD LINE',
    img: 'https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/12614/conversions/001-ICE900ISW-big.jpg',
    price: 18186,
    oldPrice: 21823,
    stockDays: 1,
    chip: { label: '🔥 Popüler', hot: true },
  },
  {
    id: 'EXB-300I',
    name: 'Elektro Kippkochkessel 300L, Rührwerk — indirekt beheizt',
    brand: 'DIAMOND',
    line: 'GOLD LINE',
    img: 'https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/49786/conversions/001GMB-Rondo-big.jpg',
    price: 55077,
    oldPrice: 66092,
    stockDays: 2,
    chip: { label: 'Editör Seçimi' },
  },
  {
    id: 'CF-195T-S',
    name: 'Vakuummaschine Doppelkammer 1100×730 — 250 m³/h',
    brand: 'DIAMOND',
    line: 'GOLD LINE',
    img: 'https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/48738/conversions/001CF-170-S-big.jpg',
    price: 38589,
    oldPrice: 46307,
    stockDays: 2,
    chip: { label: 'Premium', hot: true },
  },
  {
    id: 'TIBERIO-9E',
    name: 'Tiberio Kuppelofen 9 Pizza — fahrbares Untergestell',
    brand: 'DIAMOND',
    line: 'PLATINUM',
    img: 'https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/11745761/conversions/001_CFE202_N-big.jpg',
    price: 22028,
    oldPrice: 26432,
    stockDays: 2,
    chip: { label: '🔥 İndirim', hot: true },
  },
];

export function HeroProductCarousel() {
  const [front, setFront] = useState(0);
  const timerRef = useRef<number | null>(null);

  const rotate = useCallback(() => {
    setFront((f) => (f + 1) % HERO_PRODUCTS.length);
  }, []);

  const restart = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(rotate, 3800);
  }, [rotate]);

  useEffect(() => {
    restart();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [restart]);

  const getPos = (i: number): '0' | '1' | '2' | 'out' => {
    const offset = (i - front + HERO_PRODUCTS.length) % HERO_PRODUCTS.length;
    if (offset === 0) return '0';
    if (offset === 1) return '1';
    if (offset === 2) return '2';
    return 'out';
  };

  const fmt = (n: number) => n.toLocaleString('de-DE');

  return (
    <div
      className="relative w-full max-w-[520px] ml-auto"
      style={{ aspectRatio: '1/1.1', perspective: '1200px' }}
      onMouseEnter={() => timerRef.current && window.clearInterval(timerRef.current)}
      onMouseLeave={restart}
    >
      <style>{`
        .hpc-badge-pulse::before {
          content:''; width:6px; height:6px; border-radius:50%;
          background:white; animation: hpc-pulse 1.2s infinite; display:inline-block;
        }
        @keyframes hpc-pulse { 0%,100% { opacity:1 } 50% { opacity:.3 } }
        .hpc-card {
          position:absolute; inset:0;
          background:white; border-radius:24px;
          border:1px solid var(--c-line);
          box-shadow:0 30px 70px rgba(11,26,46,0.18);
          overflow:hidden; display:flex; flex-direction:column;
          transition: transform .9s cubic-bezier(.22,.8,.3,1), opacity .9s, z-index 0s;
        }
        .hpc-card[data-pos="0"] { transform: translate(0,0) scale(1) rotate(0); z-index:3; opacity:1 }
        .hpc-card[data-pos="1"] { transform: translate(28px,-22px) scale(.94) rotate(2.5deg); z-index:2; opacity:.92 }
        .hpc-card[data-pos="2"] { transform: translate(56px,-44px) scale(.88) rotate(5deg); z-index:1; opacity:.75 }
        .hpc-card[data-pos="out"] { transform: translate(-120%,40px) scale(.8) rotate(-14deg); opacity:0; z-index:0; pointer-events:none }
        .hpc-img-float { animation: hpc-float 6s ease-in-out infinite; }
        @keyframes hpc-float {
          0%,100% { transform: translateY(0) rotate(-1deg) }
          50% { transform: translateY(-8px) rotate(1deg) }
        }
        .hpc-stock-dot { animation: hpc-green 1.8s infinite; }
        @keyframes hpc-green {
          0%,100% { box-shadow: 0 0 0 0 rgba(46,125,50,.4); }
          50% { box-shadow: 0 0 0 6px rgba(46,125,50,0); }
        }
        .hpc-pill-float { animation: hpc-fs 4s ease-in-out infinite; }
        @keyframes hpc-fs { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
      `}</style>

      {/* Top badge */}
      <div
        className="hpc-badge-pulse absolute z-20 -top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider text-white inline-flex items-center gap-1.5 whitespace-nowrap"
        style={{
          background: 'linear-gradient(135deg, var(--c-clay) 0%, var(--c-clay-deep) 100%)',
          boxShadow: '0 10px 24px rgba(220,38,38,0.4)',
        }}
      >
        🔥 En Çok Tercih Edilen Profesyonel Ekipmanlar
      </div>

      {/* Stack */}
      <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
        {HERO_PRODUCTS.map((p, i) => (
          <Link key={p.id} to={`/product/${p.id}`} className="hpc-card" data-pos={getPos(i)}>
            <div
              className="relative flex-1 flex items-center justify-center overflow-hidden"
              style={{
                aspectRatio: '1/1',
                background: 'radial-gradient(circle at 30% 20%, rgba(220,38,38,0.06) 0%, transparent 60%), linear-gradient(180deg, #fafaf7 0%, #f0ede4 100%)',
              }}
            >
              {p.chip && (
                <span
                  className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-md ${
                    p.chip.hot ? '' : ''
                  }`}
                  style={{ background: p.chip.hot ? 'var(--c-clay)' : 'rgba(11,26,46,0.88)' }}
                >
                  {p.chip.label}
                </span>
              )}
              <img
                src={p.img}
                alt={p.name}
                loading={i < 3 ? 'eager' : 'lazy'}
                className={getPos(i) === '0' ? 'hpc-img-float' : ''}
                style={{
                  maxWidth: '82%',
                  maxHeight: '82%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 20px 40px rgba(11,26,46,0.18))',
                }}
              />
              <div
                className="absolute bottom-4 right-4 px-4 py-2.5 rounded-2xl text-white"
                style={{
                  background: 'linear-gradient(135deg, var(--c-clay) 0%, var(--c-clay-deep) 100%)',
                  boxShadow: '0 10px 24px rgba(220,38,38,0.4)',
                }}
              >
                <span className="block text-[11px] line-through opacity-75 leading-none">
                  {fmt(p.oldPrice)} €
                </span>
                <span className="c-serif text-[22px] font-bold leading-tight">
                  {fmt(p.price)} €
                </span>
              </div>
            </div>

            <div className="p-5 pb-6 bg-white">
              <div className="flex justify-between items-center mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--c-muted)]">
                <span>
                  {p.brand} · {p.line}
                </span>
                <span className="inline-flex gap-0.5 text-[color:var(--c-amber)]">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} size={11} fill="currentColor" strokeWidth={0} />
                  ))}
                </span>
              </div>
              <h3
                className="c-serif text-[16px] font-semibold leading-snug text-[color:var(--c-ink)] mb-3 min-h-[42px]"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {p.name}
              </h3>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[color:var(--c-success,#2e7d32)]">
                  <span
                    className="hpc-stock-dot inline-block w-[7px] h-[7px] rounded-full"
                    style={{ background: 'var(--c-success, #2e7d32)' }}
                  />
                  Stokta · {p.stockDays === 1 ? '24s' : '48s'} kargo
                </span>
                <span className="ml-auto bg-[color:var(--c-ink)] text-white px-3 py-1.5 rounded-[10px] text-[12px] font-bold inline-flex items-center gap-1.5 hover:bg-[color:var(--c-clay)] transition-all">
                  İncele
                  <ArrowRight size={12} strokeWidth={2.5} />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Floating metric pills */}
      <div
        className="hpc-pill-float absolute z-10 bottom-[14%] -left-7 flex items-center gap-2.5 bg-white rounded-2xl px-3.5 py-2.5 border border-[var(--c-line)]"
        style={{ boxShadow: '0 12px 30px rgba(11,26,46,0.15)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(46,125,50,0.12)', color: 'var(--c-success, #2e7d32)' }}
        >
          <Check size={18} strokeWidth={2.5} />
        </div>
        <div>
          <div className="c-serif text-[18px] font-bold leading-none text-[color:var(--c-ink)]">
            1.340+
          </div>
          <div className="text-[10px] font-semibold tracking-wider uppercase text-[color:var(--c-muted)] mt-0.5">
            Aktif Proje
          </div>
        </div>
      </div>

      <div
        className="hpc-pill-float absolute z-10 top-[18%] -right-7 flex items-center gap-2.5 bg-white rounded-2xl px-3.5 py-2.5 border border-[var(--c-line)]"
        style={{ boxShadow: '0 12px 30px rgba(11,26,46,0.15)', animationDelay: '-2s' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--c-clay-wash)', color: 'var(--c-clay)' }}
        >
          <Star size={18} fill="currentColor" strokeWidth={0} />
        </div>
        <div>
          <div className="c-serif text-[18px] font-bold leading-none text-[color:var(--c-ink)]">
            4.8 / 5
          </div>
          <div className="text-[10px] font-semibold tracking-wider uppercase text-[color:var(--c-muted)] mt-0.5">
            Trustpilot
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {HERO_PRODUCTS.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setFront(i);
              restart();
            }}
            aria-label={`Ürün ${i + 1}'e geç`}
            className="transition-all"
            style={{
              width: front === i ? 22 : 8,
              height: 8,
              borderRadius: front === i ? 4 : '50%',
              background: front === i ? 'var(--c-clay)' : 'var(--c-line)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
