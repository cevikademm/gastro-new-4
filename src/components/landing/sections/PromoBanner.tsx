import { useTranslation } from 'react-i18next';
import { ArrowRight, BadgePercent, Calculator, CheckCircle2, Clock, Headphones, ShieldCheck } from 'lucide-react';

const BONUS_ITEM_KEYS = [
  'landing.promo.bonusItems.review',
  'landing.promo.bonusItems.leasing',
  'landing.promo.bonusItems.package',
];

const BENEFITS = [
  { icon: Calculator,  labelKey: 'landing.promo.benefits.packagePrice.label', textKey: 'landing.promo.benefits.packagePrice.text' },
  { icon: Clock,       labelKey: 'landing.promo.benefits.quote24.label',      textKey: 'landing.promo.benefits.quote24.text' },
  { icon: Headphones,  labelKey: 'landing.promo.benefits.advice.label',       textKey: 'landing.promo.benefits.advice.text' },
  { icon: ShieldCheck, labelKey: 'landing.promo.benefits.safety.label',       textKey: 'landing.promo.benefits.safety.text' },
];

export function PromoBanner() {
  const { t } = useTranslation();
  return (
    <section className="py-10 sm:py-16 bg-white relative z-10 overflow-hidden">
      <div className="lp-container">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[#0F2440] text-white shadow-[0_24px_60px_-34px_rgba(15,36,64,0.65)]">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_430px]">
            <div className="p-6 sm:p-8 md:p-10 lg:p-12 text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/85">
                <BadgePercent size={14} className="text-brand-red" />
                {t('landing.promo.eyebrow')}
              </span>

              <h2 className="mt-5 max-w-4xl lp-h2 font-display font-black leading-tight tracking-tight text-white">
                {t('landing.promo.headingLead')} <span className="text-brand-red">{t('landing.promo.headingAccent')}</span>.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65">
                {t('landing.promo.subtitle')}
              </p>

              <div className="mt-6 sm:mt-8 flex md:grid overflow-x-auto md:overflow-visible snap-x md:snap-none md:grid-cols-3 gap-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1 md:mx-0 md:px-0 pb-2 md:pb-0">
                {BONUS_ITEM_KEYS.map((key) => (
                  <div key={key} className="min-w-[220px] shrink-0 snap-start md:min-w-0 md:shrink flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-red" />
                    <span className="text-[11px] font-bold leading-relaxed text-white/80">{t(key)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 bg-white/[0.06] p-6 sm:p-8 md:p-10 lg:border-l lg:border-t-0">
              <div className="rounded-2xl border border-white/10 bg-[#0a111c]/70 p-6 text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">{t('landing.promo.currentBenefit')}</p>
                <div className="mt-3 flex items-end gap-3">
                  <span className="font-display text-5xl font-black leading-none text-white">{t('landing.promo.upTo12')}</span>
                  <span className="pb-1 text-[11px] font-bold uppercase tracking-wider text-white/55">{t('landing.promo.onPackages')}</span>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-white/60">
                  {t('landing.promo.packageNote')}
                </p>

                <a
                  href="#catalog"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-[#B91C1C]"
                >
                  {t('landing.promo.cta')}
                  <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/10">
            {BENEFITS.map(({ icon: Icon, labelKey, textKey }) => (
              <div key={labelKey} className="flex items-start gap-3 border-white/10 p-5 md:border-r last:border-r-0">
                <Icon size={18} className="mt-0.5 shrink-0 text-brand-red" />
                <div className="text-left">
                  <p className="text-[11px] font-black uppercase tracking-wider text-white">{t(labelKey)}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-white/50">{t(textKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
export default PromoBanner;
