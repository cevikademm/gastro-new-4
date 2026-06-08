const SPONSORS = [
  { name: "DIAMOND", label: "Diamond", mark: "D" },
  { name: "COMBISTEEL", label: "CombiSteel", mark: "CS" },
  { name: "RATIONAL", label: "Rational", mark: "R" },
  { name: "MODULAR", label: "Modular", mark: "M" },
  { name: "POLARIS", label: "Polaris", mark: "P" },
  { name: "ECO-COOL", label: "Eco-Cool", mark: "EC" },
  { name: "VENIX", label: "Venix", mark: "V" },
  { name: "EUROFRED", label: "Eurofred", mark: "EF" },
];

export function SponsorsSection() {
  return (
    <section className="relative z-10 border-b border-slate-200 bg-slate-50 py-10 overflow-hidden">
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(135deg,rgba(15,36,64,0.06)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="relative mx-auto lp-container">
        <div className="mb-5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#0F2440]">
            Stratejik İş Ortaklarımız ve Çözüm Ekosistemi
          </p>
          <div className="mx-auto mt-2 h-px w-24 bg-slate-300" />
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Anahtar üretici iş ortakları
          </p>
        </div>

        <div className="mx-auto grid max-w-[720px] grid-cols-2 gap-3 sm:grid-cols-4">
          {SPONSORS.map((brand) => (
            <div
              key={brand.name}
              className="group flex h-[86px] flex-col items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-center shadow-[0_8px_18px_-16px_rgba(15,36,64,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-red/35 hover:shadow-[0_14px_28px_-20px_rgba(15,36,64,0.55)]"
            >
              <div className="mb-1.5 flex h-7 min-w-7 items-center justify-center rounded border border-slate-200 bg-slate-50 px-2 text-[10px] font-black tracking-tight text-[#0F2440] group-hover:border-brand-red/25 group-hover:text-brand-red">
                {brand.mark}
              </div>
              <span className="font-display text-[15px] font-black tracking-[0.08em] text-[#0F2440] group-hover:text-brand-red">
                {brand.name}
              </span>
              <span className="mt-1 text-[8px] font-bold text-slate-400">
                {brand.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export default SponsorsSection;
