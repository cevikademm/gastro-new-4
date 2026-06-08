import { ArrowRight, BadgePercent, Calculator, CheckCircle2, Clock, Headphones, ShieldCheck } from 'lucide-react';

const BONUS_ITEMS = [
  "Projektliste wird von einem Berater geprüft",
  "Leasingrate und Lieferbarkeit direkt im Angebot",
  "Paketpreis statt unklarer Einzelrabatt-Logik",
];

const BENEFITS = [
  { icon: Calculator, label: "Paketpreis", text: "B2B Kondition nach Warenkorb" },
  { icon: Clock, label: "24h Angebot", text: "Rückmeldung am nächsten Werktag" },
  { icon: Headphones, label: "Beratung", text: "Geräteauswahl wird gegengeprüft" },
  { icon: ShieldCheck, label: "Sicherheit", text: "CE, Service, Ersatzteile" },
];

export function PromoBanner() {
  return (
    <section className="py-16 bg-white relative z-10 overflow-hidden">
      <div className="lp-container">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-[#0F2440] text-white shadow-[0_24px_60px_-34px_rgba(15,36,64,0.65)]">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_430px]">
            <div className="p-8 md:p-10 lg:p-12 text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/85">
                <BadgePercent size={14} className="text-brand-red" />
                PROJEKTBONUS
              </span>

              <h2 className="mt-5 max-w-4xl lp-h2 font-display font-black leading-tight tracking-tight text-white">
                Kein Zufallsrabatt. Ein sauber kalkulierter <span className="text-brand-red">Projektpreis</span>.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/65">
                Für komplette Küchenlisten prüfen wir Einkaufskonditionen, Lieferstatus und Leasingrate zusammen. So entsteht ein Angebot, das im Projekt wirklich funktioniert.
              </p>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
                {BONUS_ITEMS.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-brand-red" />
                    <span className="text-[11px] font-bold leading-relaxed text-white/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 bg-white/[0.06] p-8 md:p-10 lg:border-l lg:border-t-0">
              <div className="rounded-2xl border border-white/10 bg-[#0a111c]/70 p-6 text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Aktueller Vorteil</p>
                <div className="mt-3 flex items-end gap-3">
                  <span className="font-display text-5xl font-black leading-none text-white">bis 12%</span>
                  <span className="pb-1 text-[11px] font-bold uppercase tracking-wider text-white/55">auf geprüfte Projektpakete</span>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-white/60">
                  Gilt nicht pauschal auf jedes Einzelgerät, sondern auf sinnvolle Paketlisten mit verfügbarer Ware.
                </p>

                <a
                  href="#catalog"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-all hover:bg-[#B91C1C]"
                >
                  Produkte auswählen
                  <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/10">
            {BENEFITS.map(({ icon: Icon, label, text }) => (
              <div key={label} className="flex items-start gap-3 border-white/10 p-5 md:border-r last:border-r-0">
                <Icon size={18} className="mt-0.5 shrink-0 text-brand-red" />
                <div className="text-left">
                  <p className="text-[11px] font-black uppercase tracking-wider text-white">{label}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-white/50">{text}</p>
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
