import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Play, Package, Tag, Globe, Truck } from 'lucide-react';
import { Reveal } from '../primitives/Reveal';
import { AnimatedHeadline } from '../primitives/AnimatedHeadline';
import { HeroProductCarousel } from './HeroProductCarousel';

const TRUST_ITEMS = [
  { icon: Package, key: 'landing.hero.trust.products' },
  { icon: Tag, key: 'landing.hero.trust.brands' },
  { icon: Globe, key: 'landing.hero.trust.countries' },
  { icon: Truck, key: 'landing.hero.trust.delivery' },
] as const;

export function HeroSection() {
  const { t } = useTranslation();

  const words = [
    t('landing.hero.headline.words.0'),
    t('landing.hero.headline.words.1'),
    t('landing.hero.headline.words.2'),
    t('landing.hero.headline.words.3', { defaultValue: '' }),
  ].filter(Boolean);

  return (
    <section className="relative overflow-hidden">
      {/* Decorative glow orbs */}
      <div
        className="pointer-events-none absolute -top-52 -right-40 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, var(--c-clay-soft) 0%, transparent 70%)',
          opacity: 0.45,
          filter: 'blur(100px)',
          animation: 'hero-float 12s ease-in-out infinite',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-64 -left-52 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, var(--c-navy-light) 0%, transparent 70%)',
          opacity: 0.28,
          filter: 'blur(100px)',
          animation: 'hero-float 12s ease-in-out infinite -3s',
        }}
        aria-hidden="true"
      />
      <style>{`
        @keyframes hero-float {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(30px, -40px) scale(1.08); }
        }
        @keyframes hero-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,93,38,0.6); }
          50% { box-shadow: 0 0 0 10px rgba(232,93,38,0); }
        }
      `}</style>

      <div className="lg:min-h-[88vh] flex flex-col justify-center py-16 sm:py-20 md:py-28 relative z-[2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
            {/* Left column */}
            <div className="max-w-2xl">
              <Reveal delay={0}>
                <div
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[12px] font-bold uppercase tracking-[0.08em] mb-6 border"
                  style={{
                    background: 'var(--c-clay-wash)',
                    color: 'var(--c-clay-deep)',
                    borderColor: 'rgba(232,93,38,0.2)',
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: 'var(--c-clay)',
                      animation: 'hero-pulse 1.6s infinite',
                    }}
                  />
                  {t('landing.hero.eyebrow')}
                </div>
              </Reveal>

              <Reveal delay={0.1} y={32} duration={1.0}>
                <AnimatedHeadline
                  staticBefore={t('landing.hero.headline.static')}
                  words={words}
                  className="c-serif text-[2.6rem] sm:text-[3.6rem] lg:text-[4.6rem] leading-[1.02] tracking-[-0.035em] text-[color:var(--c-ink)] mb-6"
                />
              </Reveal>

              <Reveal delay={0.2}>
                <p className="text-[17px] leading-relaxed text-[color:var(--c-muted)] max-w-xl mb-8">
                  {t('landing.hero.sub')}
                </p>
              </Reveal>

              <Reveal delay={0.35}>
                <div className="flex flex-wrap gap-3 mb-4">
                  <Link
                    to="/rfq"
                    className="group/cta relative inline-flex items-center gap-2.5 px-7 py-4 rounded-full text-white text-[16px] font-bold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(232,93,38,0.5)] overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, var(--c-clay) 0%, var(--c-clay-deep) 100%)',
                      boxShadow: '0 10px 30px rgba(232,93,38,0.35)',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover/cta:translate-x-full"
                    />
                    <span className="relative">{t('landing.hero.cta.primary')}</span>
                    <ArrowRight size={18} strokeWidth={2.5} className="relative transition-transform duration-300 group-hover/cta:translate-x-1" />
                  </Link>
                  <Link
                    to="/welcome"
                    className="inline-flex items-center gap-2.5 px-6 py-4 rounded-full bg-white text-[color:var(--c-ink)] text-[16px] font-semibold border-[1.5px] border-[var(--c-line)] hover:border-[color:var(--c-ink)] hover:-translate-y-0.5 transition-all"
                  >
                    <span
                      className="w-8 h-8 rounded-full inline-flex items-center justify-center -ml-1"
                      style={{
                        background: 'var(--c-clay-wash)',
                        color: 'var(--c-clay)',
                      }}
                    >
                      <Play size={12} fill="currentColor" strokeWidth={0} />
                    </span>
                    {t('landing.hero.cta.secondary')}
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.42}>
                <p className="text-[13px] text-[color:var(--c-muted)] mb-10 flex items-center gap-1.5">
                  <span className="text-[color:var(--c-clay)] font-bold">✓</span>
                  {t('landing.hero.microtrust', { defaultValue: 'Kayıt ücretsiz · Kredi kartı yok · 1 dakikada başla' })}
                </p>
              </Reveal>

              <Reveal delay={0.5}>
                <div className="flex flex-wrap gap-7 pt-8 border-t border-[var(--c-line)]">
                  {TRUST_ITEMS.map(({ icon: Icon, key }) => (
                    <div
                      key={key}
                      className="group/trust flex items-center gap-2.5 transition-transform duration-300 hover:-translate-y-0.5"
                    >
                      <Icon
                        size={20}
                        className="text-[color:var(--c-clay)] transition-transform duration-300 group-hover/trust:scale-110"
                        strokeWidth={1.75}
                      />
                      <span className="text-[14px] font-semibold text-[color:var(--c-ink-soft)] transition-colors duration-300 group-hover/trust:text-[color:var(--c-ink)]">
                        {t(key)}
                      </span>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>

            {/* Right column — product carousel */}
            <Reveal delay={0.3} y={20} duration={1.0}>
              <HeroProductCarousel />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
