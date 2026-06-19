import React from 'react';
import { Truck } from 'lucide-react';

export function DecorativeStrip() {
  return (
    <section className="w-full bg-[#0a111a] border-y border-slate-800/80 py-4 overflow-hidden relative z-10">
      
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-red/10 via-transparent to-brand-red/10 pointer-events-none" />

      {/* Marquee Wrapper */}
      <div className="max-w-[100vw] overflow-hidden whitespace-nowrap relative flex items-center">
        <div className="flex w-max gap-12 whitespace-nowrap will-change-transform animate-[brandMarquee_25s_linear_infinite]">
          {[...Array(2)].map((_, idx) => (
            <div key={idx} className="flex shrink-0 items-center gap-12 text-white/80 font-display font-black text-xs sm:text-sm tracking-[0.25em]">
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-red animate-pulse" />
                SCHNELLE B2B LIEFERUNG IN GANZ EUROPA
              </span>
              <span className="text-brand-red/60">•</span>
              <span>DIREKT AB LAGER KÖLN</span>
              <span className="text-brand-red/60">•</span>
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-red" />
                24H EXPRESSVERSAND FÜR LAGERWARE
              </span>
              <span className="text-brand-red/60">•</span>
              <span>ZUVERLÄSSIGER MONTAGESERVICE</span>
              <span className="text-brand-red/60">•</span>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
export default DecorativeStrip;
