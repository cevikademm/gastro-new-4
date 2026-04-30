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
    <section className="bg-[var(--c-bg-alt)] py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-14">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--c-muted)] mb-4">
            {t('landing.testimonials.eyebrow', { defaultValue: 'Müşteri deneyimleri' })}
          </p>
          <h2 className="c-serif text-[2.2rem] md:text-[3rem] leading-[1.02] tracking-[-0.03em] text-[color:var(--c-ink)] max-w-3xl mx-auto">
            {t('landing.testimonials.heading', { defaultValue: 'Avrupa\'nın dört bir yanından' })}{' '}
            <em className="text-[color:var(--c-clay)] italic">
              {t('landing.testimonials.accent', { defaultValue: 'profesyoneller bize güveniyor.' })}
            </em>
          </h2>
          <div className="mt-6 inline-flex items-center gap-2.5 text-sm text-[color:var(--c-muted)]">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} size={16} className="fill-[var(--c-amber)] text-[var(--c-amber)]" />
              ))}
            </div>
            <span className="font-bold text-[color:var(--c-ink)] tabular-nums">{agg.value}</span>
            <span>· {agg.count}+ doğrulanmış yorum</span>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((tm, idx) => (
            <Reveal key={tm.id} delay={idx * 0.1} y={20} duration={0.7}>
              <article className="group relative h-full bg-[var(--c-bg)] border border-[var(--c-line)] rounded-2xl p-7 md:p-8 transition-all duration-300 hover:border-[var(--c-clay)] hover:-translate-y-1 hover:shadow-[0_24px_48px_-16px_rgba(15,36,64,0.16)]">
                <Quote
                  size={32}
                  className="text-[color:var(--c-clay)] opacity-40 mb-4"
                  strokeWidth={1.5}
                />
                <p className="c-serif text-[18px] md:text-[19px] leading-[1.55] text-[color:var(--c-ink)] mb-6">
                  "{tm.body}"
                </p>
                <div className="flex items-center gap-0.5 mb-5">
                  {Array.from({ length: tm.rating }).map((_, i) => (
                    <Star key={i} size={14} className="fill-[var(--c-amber)] text-[var(--c-amber)]" />
                  ))}
                </div>
                <div className="border-t border-[var(--c-line)] pt-5 flex items-center gap-3.5">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center c-serif text-[16px] font-semibold flex-shrink-0"
                    style={{
                      background: 'var(--c-clay-wash)',
                      color: 'var(--c-clay-deep)',
                    }}
                  >
                    {tm.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[color:var(--c-ink)] text-[14px] truncate">
                      {tm.name}
                    </div>
                    <div className="text-[12px] text-[color:var(--c-muted)] truncate">
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
