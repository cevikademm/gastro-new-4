import { useTranslation } from 'react-i18next';
import { Star, Quote } from 'lucide-react';
import { TESTIMONIALS, aggregateRating } from '../../../content/testimonials';
import { Reveal } from '../primitives/Reveal';

export function TestimonialsBand() {
  const { t } = useTranslation();
  const items = TESTIMONIALS.slice(0, 3);
  const agg = aggregateRating();

  if (items.length === 0) return null;

  return (
    <section className="bg-[#050505] py-24 md:py-32 relative z-10 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-14">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/50 mb-4">
            {t('landing.testimonials.eyebrow', { defaultValue: 'Müşteri deneyimleri' })}
          </p>
          <h2 className="font-display text-[2.2rem] md:text-[3rem] leading-[1.02] tracking-[-0.03em] text-white max-w-3xl mx-auto font-bold">
            {t('landing.testimonials.heading', { defaultValue: 'Avrupa\'nın dört bir yanından' })}{' '}
            <em className="text-brand-red italic font-light">
              {t('landing.testimonials.accent', { defaultValue: 'profesyoneller bize güveniyor.' })}
            </em>
          </h2>
          <div className="mt-6 inline-flex items-center gap-2.5 text-sm text-white/50">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={16} className="fill-brand-red text-brand-red" />
              ))}
            </div>
            <span className="font-bold text-white tabular-nums">{agg.value}</span>
            <span>· {agg.count}+ doğrulanmış yorum</span>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((tm, idx) => (
            <Reveal key={tm.id} delay={idx * 0.1} y={20} duration={0.7}>
              <article className="group relative h-full bg-[#0a0a0a]/50 border border-white/10 rounded-2xl p-7 md:p-8 transition-all duration-300 hover:border-brand-red/50 hover:-translate-y-1 hover:shadow-[0_24px_48px_-16px_rgba(232,93,38,0.1)]">
                <Quote
                  size={32}
                  className="text-brand-red opacity-40 mb-4"
                  strokeWidth={1.5}
                />
                <p className="font-display text-[18px] md:text-[19px] leading-[1.55] text-white/90 mb-6 italic">
                  "{tm.body}"
                </p>
                <div className="flex items-center gap-0.5 mb-5">
                  {Array.from({ length: tm.rating }).map((_, i) => (
                    <Star key={i} size={14} className="fill-brand-red text-brand-red" />
                  ))}
                </div>
                <div className="border-t border-white/10 pt-5 flex items-center gap-3.5">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-display text-[16px] font-bold flex-shrink-0 bg-brand-red/10 text-brand-red border border-brand-red/20"
                  >
                    {tm.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-[14px] truncate">
                      {tm.name}
                    </div>
                    <div className="text-[12px] text-white/50 truncate tracking-wide">
                      {tm.role} · {tm.company} · {tm.city}
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
