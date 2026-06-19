import React from 'react';
import { ArrowRight, BadgeCheck } from 'lucide-react';

const STEPS = [
  {
    num: "1",
    title: "BERATUNG",
    desc: "Wir hören zu und verstehen Ihre Anforderungen."
  },
  {
    num: "2",
    title: "3D PLANUNG",
    desc: "Individuelle Planung mit modernster 3D-Technologie."
  },
  {
    num: "3",
    title: "FINANZIERUNG",
    desc: "Maßgeschneiderte Finanzierungslösungen für Ihr Projekt."
  },
  {
    num: "4",
    title: "TECHNIK & LIEFERUNG",
    desc: "Hochwertige Geräte führender Marken – pünktlich geliefert."
  },
  {
    num: "5",
    title: "MONTAGE",
    desc: "Fachgerechte Montage durch erfahrene Spezialisten."
  },
  {
    num: "6",
    title: "ERÖFFNUNG & SERVICE",
    desc: "Wir begleiten Sie bis zur Eröffnung und darüber hinaus."
  }
];

export function ProcessTimeline() {
  return (
    <section className="py-24 bg-white border-b border-slate-200 relative z-10" id="workflow">
      <div className="lp-container">
        
        {/* Header Area */}
        <div className="max-w-2xl mb-20 text-left">
          <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase mb-4">
            <span className="w-6 h-px bg-brand-red" />
            UNSER ABLAUF
          </span>
          <h2 className="lp-h2 font-display font-bold text-[#0F2440] tracking-tight">
            Alles aus <span className="text-brand-red">Einer Hand</span>
          </h2>
          <p className="mt-3 text-xs text-slate-500">
            Von der ersten Idee bis zur schlüsselfertigen Übergabe Ihres Gastro-Projekts begleiten wir Sie Schritt für Schritt.
          </p>
        </div>

        {/* Timeline Grid (6 Columns on large screens, responsive) */}
        <div className="relative mb-20">
          
          {/* Connecting Line (hidden on mobile) */}
          <div className="hidden lg:block absolute top-7 left-[8%] right-[8%] h-0.5 border-t-2 border-dashed border-slate-200 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 relative z-10">
            {STEPS.map((step) => (
              <div key={step.num} className="flex flex-col items-center lg:items-start text-center lg:text-left group">
                
                {/* Number Circle */}
                <div className="w-14 h-14 rounded-full bg-slate-50 border-2 border-slate-200 group-hover:border-brand-red group-hover:bg-brand-red group-hover:text-white flex items-center justify-center text-lg font-display font-black text-[#0F2440] mb-6 shadow-sm transition-all duration-300">
                  {step.num}
                </div>

                {/* Content */}
                <h4 className="text-xs font-black text-[#0F2440] tracking-wider mb-2 uppercase group-hover:text-brand-red transition-colors">
                  {step.title}
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-500 font-medium max-w-[180px]">
                  {step.desc}
                </p>

              </div>
            ))}
          </div>

        </div>

        {/* Bottom USP & CTA Bar */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 flex flex-col lg:flex-row justify-between items-center gap-6 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left w-full lg:w-auto">
            {[
              "Planbare Kosten",
              "Liquidität schonen",
              "Individuelle Laufzeiten",
              "Starke Markenpartner"
            ].map((usp) => (
              <div key={usp} className="flex items-center gap-2 text-[11px] font-bold text-[#0F2440]">
                <BadgeCheck size={16} className="text-brand-red shrink-0" />
                {usp}
              </div>
            ))}
          </div>

          <a href="#quote" className="w-full lg:w-auto px-6 py-3.5 bg-[#0F2440] hover:bg-[#1E3A5F] text-white text-[10px] font-black tracking-[0.2em] rounded-xl uppercase transition-all text-center flex items-center justify-center gap-2 shadow-sm">
            MEHR ERFAHREN
            <ArrowRight size={12} />
          </a>
        </div>

      </div>
    </section>
  );
}
export default ProcessTimeline;
