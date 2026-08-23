import { ArrowRight, ClipboardCheck, Truck, Wrench } from 'lucide-react';

const POPOUT_OBJECTS = [
  {
    src: '/landing/popout/display-fridge-cutout.png',
    alt: 'Display fridge',
    className: 'right-0 bottom-[78px] w-[66%] sm:bottom-[-46px] lg:right-0 lg:bottom-[-78px] lg:w-[62%]',
  },
  {
    src: '/landing/popout/spiral-mixer-cutout.png',
    alt: 'Spiral mixer',
    className: 'left-[6%] bottom-[94px] w-[31%] sm:bottom-[-28px] lg:left-[5%] lg:bottom-[-50px] lg:w-[30%]',
  },
  {
    src: '/landing/popout/dishwasher-cutout.png',
    alt: 'Dishwasher',
    className: 'left-[30%] top-[-10%] w-[24%] sm:top-[9%] lg:left-[28%] lg:top-[5%] lg:w-[23%]',
  },
];

const STEPS = [
  { icon: ClipboardCheck, label: 'Planung', value: '3D Liste' },
  { icon: Truck, label: 'Lieferung', value: 'ab Lager' },
  { icon: Wrench, label: 'Montage', value: 'vor Ort' },
];

export function ProjectPopoutHeroSlide() {
  return (
    <div className="relative h-full w-full overflow-visible bg-[#b40000]">
      <div className="absolute inset-0 bg-[#b40000]" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-white/15" />

      <div className="lp-container absolute inset-0 grid grid-cols-[0.9fr_1.1fr] items-center gap-4 sm:gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="relative z-20 max-w-[520px] pb-4 text-left text-[#0F2440]">
          <div className="mb-3 hidden w-fit rounded-xl border border-white/70 bg-white/78 px-3 py-2 shadow-[0_16px_36px_-28px_rgba(15,36,64,0.55)] backdrop-blur sm:block lg:mb-4">
            <img src="/logo-2mc-gastro.png" width="1208" height="288" alt="2MC Gastro" className="h-8 w-auto object-contain lg:h-10" />
          </div>
          <span className="mb-2 hidden items-center gap-2 text-[9px] font-black uppercase tracking-[0.26em] text-brand-red sm:inline-flex lg:mb-4 lg:text-[10px]">
            <span className="h-px w-7 bg-white" />
            ALLES AUS EINER HAND
          </span>
          <h2 className="max-w-[15rem] font-display text-[1.35rem] font-black leading-[1.02] tracking-tight text-white sm:max-w-md sm:text-4xl lg:text-5xl">
            Geräte, Planung und Lieferung als Projektpaket.
          </h2>
          <p className="mt-3 hidden max-w-md text-sm leading-relaxed text-white/82 md:block">
            Professionelle Küchentechnik mit 3D Planung, Leasing und Montage aus einer Hand.
          </p>
          <div className="mt-4 hidden flex-wrap gap-3 lg:flex">
            {STEPS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/78 px-3.5 py-3 shadow-[0_14px_32px_-26px_rgba(15,36,64,0.5)] backdrop-blur">
                <Icon size={17} className="shrink-0 text-brand-red" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                  <p className="text-xs font-black uppercase tracking-wide text-[#0F2440]">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative h-full min-w-0 overflow-visible">
          <div className="absolute inset-x-[6%] bottom-[-8%] h-[22%] rounded-[50%] bg-black/28 blur-2xl" />
          <div className="absolute left-[5%] top-[16%] z-20 hidden w-[118px] rotate-[-4deg] rounded-xl border border-white/70 bg-white p-3 shadow-[0_24px_60px_-30px_rgba(15,36,64,0.65)] md:block lg:w-[154px]">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-brand-red">Projekt</p>
            <p className="mt-2 font-display text-2xl font-black leading-none text-[#0F2440]">24h</p>
            <p className="mt-1 text-[10px] font-bold leading-tight text-slate-500">Angebot nach Warenkorb</p>
          </div>
          <div className="absolute right-[6%] top-[12%] z-20 hidden w-[124px] rotate-[5deg] rounded-xl border border-white/70 bg-[#0F2440] p-3 text-white shadow-[0_24px_60px_-30px_rgba(15,36,64,0.75)] sm:block lg:w-[146px]">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/42">Leasing</p>
            <p className="mt-2 font-display text-2xl font-black leading-none text-white">60</p>
            <p className="mt-1 text-[10px] font-bold leading-tight text-white/58">Monate flexibel</p>
          </div>

          <img
            src="/landing/popout/dishwasher-cutout.png"
            alt="Dishwasher"
            className="absolute left-[16%] top-[2%] z-10 w-[24%] object-contain drop-shadow-[0_24px_26px_rgba(15,36,64,0.18)]"
            loading="eager"
            decoding="async"
          />
          <img
            src="/landing/popout/spiral-mixer-cutout.png"
            alt="Spiral mixer"
            className="absolute bottom-[-7%] left-[0%] z-30 w-[31%] object-contain drop-shadow-[0_26px_28px_rgba(15,36,64,0.24)]"
            loading="eager"
            decoding="async"
          />
          <img
            src="/landing/popout/display-fridge-cutout.png"
            alt="Display fridge"
            className="absolute bottom-[-9%] right-[0%] z-30 w-[68%] object-contain drop-shadow-[0_32px_32px_rgba(15,36,64,0.24)]"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}

export function ProjectPopoutShowcase() {
  return (
    <section className="relative z-10 overflow-hidden bg-white pb-24 pt-10 sm:pb-28 lg:pb-36">
      <div className="absolute inset-x-0 top-0 h-[76%] bg-[#eef3f7]" />
      <div className="absolute inset-x-0 top-0 h-[76%] bg-[linear-gradient(90deg,rgba(15,36,64,0.08),rgba(255,255,255,0.72)_46%,rgba(220,38,38,0.07))]" />
      <div className="absolute inset-x-0 top-0 h-[76%] bg-[radial-gradient(circle_at_76%_26%,rgba(220,38,38,0.12),transparent_30%)]" />

      <div className="lp-container relative">
        <div className="grid min-h-[540px] grid-cols-1 items-center gap-8 lg:min-h-[430px] lg:grid-cols-[minmax(18rem,0.82fr)_minmax(0,1.18fr)]">
          <div className="max-w-xl pt-4 text-left text-[#0F2440] lg:pt-0">
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-brand-red">
              <span className="h-px w-7 bg-brand-red" />
              ALLES AUS EINER HAND
            </span>
            <h2 className="mt-4 max-w-lg font-display text-3xl font-black leading-[1.02] tracking-tight text-[#0F2440] md:text-5xl">
              Geräte, Planung und Lieferung als sichtbares Projektpaket.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-600">
              Bestseller werden direkt mit Raumplanung, Leasing und Montage kombiniert. Ein Ansprechpartner koordiniert die Geräteauswahl vom Warenkorb bis zur Inbetriebnahme.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {STEPS.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white/78 px-3.5 py-3 shadow-[0_14px_32px_-26px_rgba(15,36,64,0.5)] backdrop-blur">
                  <Icon size={17} className="shrink-0 text-brand-red" />
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                    <p className="text-xs font-black uppercase tracking-wide text-[#0F2440]">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="#quote"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-red px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_28px_-18px_rgba(153,27,27,0.95)] transition-all hover:-translate-y-0.5 hover:bg-[#B91C1C]"
            >
              Projekt anfragen
              <ArrowRight size={14} />
            </a>
          </div>

          <div className="relative h-[330px] w-full max-w-[980px] justify-self-center overflow-visible sm:h-[390px] lg:h-[430px]">
            <div className="absolute inset-x-[10%] bottom-[-42px] h-24 rounded-[50%] bg-[#0F2440]/16 blur-2xl" />
            <div className="absolute inset-x-[8%] bottom-[-16px] h-px bg-gradient-to-r from-transparent via-[#0F2440]/20 to-transparent" />

            <div className="absolute left-[8%] top-[12%] z-20 hidden w-[132px] rotate-[-4deg] rounded-xl border border-white/70 bg-white p-3 shadow-[0_24px_60px_-30px_rgba(15,36,64,0.65)] sm:block lg:w-[154px]">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-brand-red">Projekt</p>
              <p className="mt-2 font-display text-2xl font-black leading-none text-[#0F2440]">24h</p>
              <p className="mt-1 text-[10px] font-bold leading-tight text-slate-500">Angebot nach Warenkorb</p>
            </div>

            <div className="absolute right-[5%] top-[9%] z-20 w-[118px] rotate-[5deg] rounded-xl border border-white/70 bg-[#0F2440] p-3 text-white shadow-[0_24px_60px_-30px_rgba(15,36,64,0.75)] sm:w-[146px]">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/42">Leasing</p>
              <p className="mt-2 font-display text-2xl font-black leading-none text-white">60</p>
              <p className="mt-1 text-[10px] font-bold leading-tight text-white/58">Monate flexibel</p>
            </div>

            {POPOUT_OBJECTS.map((item) => (
              <img
                key={item.src}
                src={item.src}
                alt={item.alt}
                className={`absolute z-10 object-contain drop-shadow-[0_28px_28px_rgba(15,36,64,0.22)] ${item.className}`}
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProjectPopoutShowcase;
