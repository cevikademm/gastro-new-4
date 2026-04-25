import { useTranslation } from 'react-i18next';
import { Package, Tag, Globe, Truck } from 'lucide-react';
import { CountUp } from '../primitives/CountUp';
import { Reveal } from '../primitives/Reveal';

const STATS = [
  { to: 5265, suffix: '+', labelKey: 'landing.stats.products.label',  icon: Package },
  { to: 15,   suffix: '',  labelKey: 'landing.stats.brands.label',    icon: Tag },
  { to: 15,   suffix: '',  labelKey: 'landing.stats.countries.label', icon: Globe },
  { to: 48,   suffix: 'h', labelKey: 'landing.stats.delivery.label',  icon: Truck },
] as const;

export function StatsBand() {
  const { t } = useTranslation();

  return (
    <section className="bg-[var(--c-navy-deep)] py-20 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {STATS.map(({ to, suffix, labelKey, icon: Icon }, index) => (
            <Reveal key={labelKey} delay={index * 0.1}>
              <div className="flex flex-col items-center text-center gap-3 py-8 px-4 border-r border-[var(--c-navy-light)] even:border-r-0 lg:even:border-r lg:last:border-r-0">
                <Icon size={24} strokeWidth={1.5} style={{ color: 'var(--c-clay-soft)' }} />
                <CountUp
                  to={to}
                  suffix={suffix}
                  className="c-serif text-[3.5rem] sm:text-[4rem] font-semibold text-white leading-none"
                />
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">
                  {t(labelKey)}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
