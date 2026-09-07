import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, BadgeCheck } from 'lucide-react';

// Modül seviyesinde t() çağıramayız; sadece anahtar sakla, render'da çöz.
const STEPS = [
  { num: '1', titleKey: 'landing.process.steps.consult.title',   descKey: 'landing.process.steps.consult.desc' },
  { num: '2', titleKey: 'landing.process.steps.design.title',    descKey: 'landing.process.steps.design.desc' },
  { num: '3', titleKey: 'landing.process.steps.finance.title',   descKey: 'landing.process.steps.finance.desc' },
  { num: '4', titleKey: 'landing.process.steps.delivery.title',  descKey: 'landing.process.steps.delivery.desc' },
  { num: '5', titleKey: 'landing.process.steps.install.title',   descKey: 'landing.process.steps.install.desc' },
  { num: '6', titleKey: 'landing.process.steps.opening.title',   descKey: 'landing.process.steps.opening.desc' },
];

const USP_KEYS = [
  'landing.process.usps.plannableCosts',
  'landing.process.usps.liquidity',
  'landing.process.usps.terms',
  'landing.process.usps.brands',
];

export function ProcessTimeline() {
  const { t } = useTranslation();
  return (
    <section className="py-14 sm:py-24 bg-white border-b border-slate-200 relative z-10" id="workflow">
      <div className="lp-container">

        {/* Header Area */}
        <div className="max-w-2xl mb-10 sm:mb-20 text-left">
          <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase mb-4">
            <span className="w-6 h-px bg-brand-red" />
            {t('landing.process.eyebrow')}
          </span>
          <h2 className="lp-h2 font-display font-bold text-[#0F2440] tracking-tight">
            {t('landing.process.headingLead')} <span className="text-brand-red">{t('landing.process.headingAccent')}</span>
          </h2>
          <p className="mt-3 text-xs text-slate-500">
            {t('landing.process.subtitle')}
          </p>
        </div>

        {/* Timeline (mobil: yatay kayan · md+: grid) */}
        <div className="relative mb-10 sm:mb-20">

          {/* Connecting Line (hidden on mobile) */}
          <div className="hidden lg:block absolute top-7 left-[8%] right-[8%] h-0.5 border-t-2 border-dashed border-slate-200 z-0" />

          <div className="flex md:grid overflow-x-auto md:overflow-visible snap-x md:snap-none md:grid-cols-2 lg:grid-cols-6 gap-5 md:gap-8 relative z-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1 md:mx-0 md:px-0 pb-2 md:pb-0">
            {STEPS.map((step) => (
              <div key={step.num} className="min-w-[150px] shrink-0 snap-start md:min-w-0 md:shrink flex flex-col items-center lg:items-start text-center lg:text-left group">

                {/* Number Circle */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-50 border-2 border-slate-200 group-hover:border-brand-red group-hover:bg-brand-red group-hover:text-white flex items-center justify-center text-base sm:text-lg font-display font-black text-[#0F2440] mb-3 sm:mb-6 shadow-sm transition-all duration-300">
                  {step.num}
                </div>

                {/* Content */}
                <h3 className="text-[11px] sm:text-xs font-black text-[#0F2440] tracking-wider mb-1.5 sm:mb-2 uppercase group-hover:text-brand-red transition-colors">
                  {t(step.titleKey)}
                </h3>
                <p className="text-[11px] leading-relaxed text-slate-500 font-medium max-w-[180px]">
                  {t(step.descKey)}
                </p>

              </div>
            ))}
          </div>

        </div>

        {/* Bottom USP & CTA Bar */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 flex flex-col lg:flex-row justify-between items-center gap-6 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left w-full lg:w-auto">
            {USP_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2 text-[11px] font-bold text-[#0F2440]">
                <BadgeCheck size={16} className="text-brand-red shrink-0" />
                {t(key)}
              </div>
            ))}
          </div>

          <a href="#quote" className="w-full lg:w-auto px-6 py-3.5 bg-[#0F2440] hover:bg-[#1E3A5F] text-white text-[10px] font-black tracking-[0.2em] rounded-xl uppercase transition-all text-center flex items-center justify-center gap-2 shadow-sm">
            {t('landing.process.moreInfo')}
            <ArrowRight size={12} />
          </a>
        </div>

      </div>
    </section>
  );
}
export default ProcessTimeline;
