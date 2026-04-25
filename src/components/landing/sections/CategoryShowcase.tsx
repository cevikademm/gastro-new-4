import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  Snowflake, Flame, Scissors, Pizza, UtensilsCrossed,
  Zap, IceCream, Coffee, ArrowUpRight, LucideIcon,
} from 'lucide-react';
import { Reveal } from '../primitives/Reveal';

interface CategoryItem {
  key: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor: string;
  href: string;
}

const CATEGORIES: CategoryItem[] = [
  { key: 'cooling',     icon: Snowflake,        iconColor: 'var(--c-navy-light)', bgColor: 'rgba(45,90,142,0.08)',  href: '/products?category=cooling' },
  { key: 'cooking',     icon: Flame,            iconColor: 'var(--c-clay)',       bgColor: 'var(--c-clay-wash)',    href: '/products?category=cooking' },
  { key: 'prep',        icon: Scissors,         iconColor: 'var(--c-navy)',       bgColor: 'rgba(30,58,95,0.10)',   href: '/products?category=prep' },
  { key: 'pizza',       icon: Pizza,            iconColor: 'var(--c-amber)',      bgColor: 'rgba(200,154,60,0.12)', href: '/products?category=pizza' },
  { key: 'selfservice', icon: UtensilsCrossed,  iconColor: 'var(--c-navy-light)', bgColor: 'rgba(45,90,142,0.10)', href: '/products?category=selfservice' },
  { key: 'dynamic',     icon: Zap,              iconColor: 'var(--c-clay-soft)',  bgColor: 'rgba(255,122,69,0.10)', href: '/products?category=dynamic' },
  { key: 'icecream',    icon: IceCream,         iconColor: 'var(--c-navy-light)', bgColor: 'rgba(45,90,142,0.08)', href: '/products?category=icecream' },
  { key: 'coffee',      icon: Coffee,           iconColor: 'var(--c-amber)',      bgColor: 'rgba(200,154,60,0.10)', href: '/products?category=coffee' },
];

export function CategoryShowcase() {
  const { t } = useTranslation();

  return (
    <section className="bg-[var(--c-bg-alt)] py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--c-muted)] mb-4">
            {t('landing.categories.eyebrow')}
          </p>
          <h2 className="c-serif text-[2rem] md:text-[2.8rem] leading-[1.02] tracking-[-0.025em] text-[color:var(--c-ink)]">
            {t('landing.categories.heading')}{' '}
            <em className="text-[color:var(--c-clay)]">{t('landing.categories.accent')}</em>
          </h2>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {CATEGORIES.map(({ key, icon: Icon, iconColor, bgColor, href }, index) => (
            <Reveal key={key} delay={index * 0.06} y={20} duration={0.7}>
              <Link
                to={href}
                className="group relative flex flex-col items-center justify-center gap-4 rounded-2xl p-6 md:p-8 bg-[var(--c-bg)] border border-[var(--c-line)] hover:border-[var(--c-clay)] transition-all duration-300 aspect-square sm:aspect-auto sm:h-44"
                style={{ boxShadow: 'none' }}
              >
                <ArrowUpRight
                  size={14}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-[color:var(--c-clay)] transition-opacity"
                />
                <motion.div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: bgColor }}
                  whileHover={{ scale: 1.08 }}
                  transition={{ duration: 0.25 }}
                >
                  <Icon size={28} strokeWidth={1.5} style={{ color: iconColor }} />
                </motion.div>
                <span className="text-[14px] font-medium text-[color:var(--c-ink)] group-hover:text-[color:var(--c-clay)] transition-colors text-center">
                  {t(`landing.categories.${key}`)}
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
