import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, ArrowRight } from 'lucide-react';
import { Reveal } from '../primitives/Reveal';

/**
 * Best sellers grid with real products, social proof, stock urgency.
 */

interface BSProduct {
  id: string;
  name: string;
  brand: string;
  img: string;
  price: number;
  oldPrice: number;
  discount: number;
  rating: number;
  reviews: number;
  stockPct: number;
  stockDays: 1 | 2;
  urgency: string;
  tags: { label: string; variant: 'hot' | 'sale' | 'new' | 'stock' }[];
}

const PRODUCTS: BSProduct[] = [
  {
    id: 'EMB-500I',
    name: 'Elektro Kippkochkessel 500 L, indirekt beheizt',
    brand: 'DIAMOND · GOLD LINE',
    img: 'https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/49786/conversions/001GMB-Rondo-big.jpg',
    price: 28398,
    oldPrice: 37864,
    discount: 25,
    rating: 4.9,
    reviews: 128,
    stockPct: 30,
    stockDays: 1,
    urgency: '⚡ Son 7 adet! 12 kişi bu ürünü inceliyor',
    tags: [
      { label: '🔥 En Çok Satan', variant: 'hot' },
      { label: '-25%', variant: 'sale' },
    ],
  },
  {
    id: 'ICE900ISW',
    name: 'Scherbeneisbereiter 900 Kg — WASSER',
    brand: 'DIAMOND · GOLD LINE',
    img: 'https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/12614/conversions/001-ICE900ISW-big.jpg',
    price: 15458,
    oldPrice: 18186,
    discount: 15,
    rating: 5.0,
    reviews: 86,
    stockPct: 55,
    stockDays: 2,
    urgency: '⚡ 8 kişi son 1 saatte sipariş verdi',
    tags: [
      { label: 'Yeni', variant: 'new' },
      { label: 'Stokta', variant: 'stock' },
    ],
  },
  {
    id: 'SBGT-XC-22',
    name: 'Kombidämpfer Touch 20× GN2/1, Boiler + Konvektion',
    brand: 'DIAMOND · PLATINUM',
    img: 'https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/50379/conversions/001SBES-XC-20-big.jpg',
    price: 37662,
    oldPrice: 47078,
    discount: 20,
    rating: 4.8,
    reviews: 214,
    stockPct: 65,
    stockDays: 1,
    urgency: '⚡ Son 11 adet — stok azalıyor',
    tags: [{ label: '🏆 Editör Seçimi', variant: 'hot' }],
  },
  {
    id: 'CFE202-N',
    name: 'Elektro Konvektionsofen 20× GN 2/1 — Luftbefeuchtung',
    brand: 'DIAMOND · GOLD LINE',
    img: 'https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/11745761/conversions/001_CFE202_N-big.jpg',
    price: 11342,
    oldPrice: 16203,
    discount: 30,
    rating: 4.7,
    reviews: 92,
    stockPct: 20,
    stockDays: 2,
    urgency: '🔥 Son 3 adet — bugün tükenecek!',
    tags: [{ label: 'FLASH -30%', variant: 'sale' }],
  },
];

const TAG_STYLES: Record<BSProduct['tags'][0]['variant'], string> = {
  hot: 'bg-[color:var(--c-clay)] text-white',
  sale: 'bg-[color:var(--c-navy-deep)] text-white',
  new: 'bg-[#2e7d32] text-white',
  stock: 'bg-white text-[#2e7d32] border border-[#2e7d32]',
};

export function BestSellersSection() {
  const fmt = (n: number) => n.toLocaleString('de-DE');

  return (
    <section
      id="bestsellers"
      className="py-20 md:py-28"
      style={{ background: 'var(--c-bg-alt)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-[11px] font-semibold tracking-[0.22em] uppercase text-[color:var(--c-clay)] mb-4">
            🔥 En Çok Tercih Edilenler
          </div>
          <h2 className="c-serif text-[2rem] md:text-[2.8rem] leading-[1.02] tracking-[-0.025em] text-[color:var(--c-ink)] font-medium">
            Bu ay profesyonellerin <em className="text-[color:var(--c-clay)]">seçimi.</em>
          </h2>
          <p className="mt-4 text-[17px] text-[color:var(--c-muted)] leading-relaxed">
            Avrupa'daki 1.340+ aktif projenin şu an tercih ettiği ürünler — stoktan anında sevkiyat.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRODUCTS.map((p, i) => (
            <Reveal key={p.id} delay={i * 0.08}>
              <article className="group relative flex flex-col bg-white border border-[var(--c-line)] rounded-3xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_24px_64px_rgba(11,26,46,0.16)] hover:border-transparent h-full">
                <Link
                  to={`/product/${p.id}`}
                  className="relative flex items-center justify-center overflow-hidden"
                  style={{ aspectRatio: '1/1', background: 'var(--c-bg-alt)' }}
                >
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-[2]">
                    {p.tags.map((t) => (
                      <span
                        key={t.label}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${TAG_STYLES[t.variant]}`}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                  <button
                    aria-label="Favorilere ekle"
                    onClick={(e) => e.preventDefault()}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-[color:var(--c-muted)] hover:text-[color:var(--c-clay)] hover:scale-110 transition-all z-[2]"
                  >
                    <Heart size={18} strokeWidth={2} />
                  </button>
                  <img
                    src={p.img}
                    alt={p.name}
                    loading="lazy"
                    className="transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-2"
                    style={{
                      width: '85%',
                      height: '85%',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 10px 20px rgba(11,26,46,0.12))',
                    }}
                  />
                </Link>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[color:var(--c-muted)] mb-1.5">
                    {p.brand}
                  </div>
                  <h3 className="c-serif text-[17px] font-semibold leading-snug text-[color:var(--c-ink)] mb-2.5 min-h-[42px]">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[13px] text-[color:var(--c-muted)] mb-3">
                    <span className="inline-flex gap-0.5 text-[color:var(--c-amber)]">
                      {[0, 1, 2, 3, 4].map((s) => (
                        <Star
                          key={s}
                          size={13}
                          fill={s < Math.round(p.rating) ? 'currentColor' : 'none'}
                          strokeWidth={s < Math.round(p.rating) ? 0 : 1}
                        />
                      ))}
                    </span>
                    <span>
                      {p.rating.toFixed(1)} · {p.reviews} yorum
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-3.5">
                    <span className="c-serif text-[22px] font-bold text-[color:var(--c-ink)]">
                      {fmt(p.price)} €
                    </span>
                    <span className="text-[14px] line-through text-[color:var(--c-muted)]">
                      {fmt(p.oldPrice)} €
                    </span>
                    <span className="bg-[color:var(--c-clay-wash)] text-[color:var(--c-clay-deep)] px-2 py-0.5 rounded-md text-[12px] font-bold">
                      -{p.discount}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[#2e7d32] font-semibold mb-3">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: '#2e7d32',
                        boxShadow: '0 0 0 0 rgba(46,125,50,0.4)',
                        animation: 'bs-pulse 2s infinite',
                      }}
                    />
                    Stokta — {p.stockDays === 1 ? '24' : '48'} saatte kargo
                  </div>
                  <div className="h-1 bg-[var(--c-line)] rounded-full overflow-hidden mb-3.5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${p.stockPct}%`,
                        background: 'linear-gradient(90deg, var(--c-clay) 0%, var(--c-clay-soft) 100%)',
                      }}
                    />
                  </div>
                  <div className="text-[11px] font-bold text-[color:var(--c-clay-deep)] mb-3">
                    {p.urgency}
                  </div>
                  <button
                    onClick={() => {
                      /* would dispatch addToCart */
                    }}
                    className="mt-auto flex items-center justify-center gap-2 bg-[color:var(--c-ink)] text-white py-3 px-4 rounded-xl text-[14px] font-semibold hover:bg-[color:var(--c-clay)] hover:-translate-y-0.5 transition-all"
                  >
                    <ShoppingCart size={16} strokeWidth={2} />
                    Sepete Ekle
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal className="text-center mt-12">
          <Link
            to="/kategori"
            className="inline-flex items-center gap-2 text-[color:var(--c-clay)] font-semibold text-[15px] hover:gap-3 transition-all"
          >
            Tüm ürünleri gör (5.265+) <ArrowRight size={16} strokeWidth={2.5} />
          </Link>
        </Reveal>
      </div>
      <style>{`
        @keyframes bs-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(46,125,50,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(46,125,50,0); }
        }
      `}</style>
    </section>
  );
}
