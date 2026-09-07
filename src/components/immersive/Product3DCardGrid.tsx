import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Product3DCard from './Product3DCard';

const CARD_BASE = [
  {
    key: 'item1' as const,
    modelUrl: '/models/PSB-202MI-2V.glb',
    eyebrow: '01 · COOLING',
    accent: '#3D7DC4',
    href: '/diamond',
  },
  {
    key: 'item2' as const,
    modelUrl: '/models/Meshy_AI_Commercial_Planetary__0411175135_texture.glb',
    eyebrow: '02 · DYNAMIC PREP',
    accent: '#DC2626',
    href: '/combisteel',
  },
  {
    key: 'item3' as const,
    modelUrl: '/models/Meshy_AI_Rainbow_Bottles_in_a__0411175104_texture.glb',
    eyebrow: '03 · BAR & DISPLAY',
    accent: '#C57A1B',
    href: '/kategori',
  },
];

export default function Product3DCardGrid() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const CARDS = useMemo(
    () =>
      CARD_BASE.map((card) => ({
        ...card,
        title: t(`product.cards.${card.key}.title`),
        description: t(`product.cards.${card.key}.description`),
        cta: t(`product.cards.${card.key}.cta`),
      })),
    [t]
  );
  return (
    <section className="relative z-10 py-32 bg-gradient-to-b from-white via-red-50/30 to-white border-y border-slate-200">
      <div className="max-w-[90rem] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14">
          <div className="max-w-2xl reveal">
            <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase mb-5">
              <span className="w-6 h-px bg-brand-red" />
              ÜRÜN KARTLARI · 3D
            </span>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-[#0F2440] tracking-tighter leading-[1.02]">
              Sürükleyin, çevirin, <span className="text-brand-red italic font-light">inceleyin.</span>
            </h2>
            <p className="text-slate-600 mt-6 text-[15px] leading-relaxed">
              Üç ekipmanı kendi kontrolünüzde döndürerek inceleyin. Materyaller, oranlar ve hatları gerçek bir
              showroom hissiyle hissedin.
            </p>
          </div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-slate-500 font-bold reveal reveal-delay-2">
            <span className="text-brand-red">●</span> SÜRÜKLE / DOKUN · ÇİFT TIK = SIFIRLA
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CARDS.map((c, i) => (
            <div key={i} className={`reveal reveal-delay-${Math.min(i + 1, 4)}`}>
              <Product3DCard
                modelUrl={c.modelUrl}
                eyebrow={c.eyebrow}
                title={c.title}
                description={c.description}
                accent={c.accent}
                cta={c.cta}
                onCtaClick={() => navigate(c.href)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
