import { useTranslation } from 'react-i18next';
import { Package, Tag, Globe, Truck } from 'lucide-react';
import { CountUp } from '../primitives/CountUp';
import { Reveal } from '../primitives/Reveal';
import Ambient3DBackground from '../../immersive/Ambient3DBackground';

const STATS = [
  { to: 5265, suffix: '+', labelKey: 'landing.stats.products.label',  icon: Package },
  { to: 15,   suffix: '',  labelKey: 'landing.stats.brands.label',    icon: Tag },
  { to: 15,   suffix: '',  labelKey: 'landing.stats.countries.label', icon: Globe },
  { to: 48,   suffix: 'h', labelKey: 'landing.stats.delivery.label',  icon: Truck },
] as const;

export function StatsBand() {
  const { t } = useTranslation();

  return (
    <section className="bg-[var(--c-navy-deep)] py-20 md:py-24 relative overflow-hidden">
      <Ambient3DBackground variant="navy" density={0.75} intensity={0.9} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(6,16,30,0.55) 0%, rgba(6,16,30,0.35) 40%, rgba(6,16,30,0.6) 100%)',
          zIndex: 1,
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.22em] text-white/60 mb-10">
          {t('landing.stats.eyebrow')}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {STATS.map(({ to, suffix, labelKey, icon: Icon }, index) => (
            <Reveal key={labelKey} delay={index * 0.1}>
              <div className="group/stat relative flex flex-col items-center text-center gap-3 py-8 px-4 border-r border-[var(--c-navy-light)] even:border-r-0 lg:even:border-r lg:last:border-r-0 transition-transform duration-300 hover:-translate-y-1">
                <Icon
                  size={24}
                  strokeWidth={1.5}
                  style={{ color: 'var(--c-clay-soft)' }}
                  className="transition-transform duration-300 group-hover/stat:scale-110"
                />
                <CountUp
                  to={to}
                  suffix={suffix}
                  className="c-serif text-[3.5rem] sm:text-[4rem] font-semibold text-white leading-none tracking-[-0.02em] tabular-nums"
                />
                <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70 transition-colors duration-300 group-hover/stat:text-white">
                  {t(labelKey)}
                </span>
                <span
                  aria-hidden="true"
                  className="block h-[2px] w-0 bg-[var(--c-clay)] transition-all duration-500 group-hover/stat:w-10"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
