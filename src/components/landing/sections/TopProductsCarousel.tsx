import React from 'react';
import { useCartStore } from '../../../stores/cartStore';
import { ChevronRight, CreditCard, Truck, ShieldCheck, BadgeCheck } from 'lucide-react';

const TOP_PRODUCTS = [
  {
    id: "icombi-xs",
    name: "Rational iCombi Pro XS Kombidämpfer",
    cat: "cooking",
    sub: "Kombidämpfer",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/50418/conversions/SBET-XC-22-big.jpg",
    brand: "Rational",
    price: 9890
  },
  {
    id: "refrig-counter",
    name: "Kühltisch 2-türig mit Aufkantung",
    cat: "cooling",
    sub: "Kühltische",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/57188/conversions/001DT274-R2%2B5-big.jpg",
    brand: "CombiSteel",
    price: 1890
  },
  {
    id: "fryer-double",
    name: "Fritteuse 2x 12 Liter Elektrisch",
    cat: "cooking",
    sub: "Fritteusen",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/75472/conversions/001-E22-F23CFSA4-AC-big.jpg",
    brand: "CombiSteel",
    price: 1290
  },
  {
    id: "pizza-oven",
    name: "Pizzaofen 2-Kammer für 9x Pizza",
    cat: "pizza_pasta",
    sub: "Pizzaöfen",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/12048385/conversions/001-LFD-18L-LX-big.jpg",
    brand: "Modular",
    price: 3490
  },
  {
    id: "dishwasher-hood",
    name: "Haubenspülmaschine mit Spültisch",
    cat: "dishwash",
    sub: "Spülmaschinen",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/73407/conversions/001-DCR49-6-AC-RC-big.jpg",
    brand: "Diamond",
    price: 2790
  },
  {
    id: "mix-80",
    name: "Spiral Mikser 80 kg",
    cat: "dynamic_prep",
    sub: "Teigknetmaschinen",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/62571/conversions/001-PSB2-big.jpg",
    brand: "Diamond",
    price: 4290
  }
];

export function TopProductsCarousel() {
  const { addItem, removeItem, isInCart } = useCartStore();

  return (
    <section className="py-24 bg-white border-b border-slate-200 relative z-10">
      <div className="lp-container">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between md:items-end mb-12 text-left">
          <div>
            <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase mb-4">
              <span className="w-6 h-px bg-brand-red" />
              TOP PRODUKTE
            </span>
            <h2 className="lp-h3 font-display font-bold text-[#0F2440] tracking-tight">
              Professionelle Küchentechnik. <span className="text-brand-red">Direkt konfigurierbar</span>.
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              5.300+ Produkte führender Hersteller für Ihr Gastro-Projekt.
            </p>
          </div>
          <a href="#catalog" className="text-xs font-bold uppercase tracking-[0.2em] text-[#0F2440] hover:text-brand-red transition-all mt-4 md:mt-0">
            ALLE GERÄTE ANZEGEN &gt;
          </a>
        </div>

        {/* Infinite auto-scrolling marquee — very slow, pauses on hover */}
        <div className="overflow-hidden pb-8 pt-2">
          <div className="flex w-max gap-6 will-change-transform hover:[animation-play-state:paused] animate-[brandMarquee_80s_linear_infinite]">
          {[...TOP_PRODUCTS, ...TOP_PRODUCTS].map((prod, i) => {
            const added = isInCart(prod.id);
            const listPrice = Math.round(prod.price * 1.12);
            const saving = listPrice - prod.price;
            
            return (
              <div
                key={`${prod.id}-${i}`}
                className="w-[280px] shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-brand-red/40 hover:shadow-[0_15px_35px_rgba(220,38,38,0.06)] transition-all duration-300 flex flex-col group snap-start"
              >
                {/* Image area with Brand & Status Badges */}
                <div className="h-36 bg-white border-b border-slate-100 p-4 flex items-center justify-center overflow-hidden relative">
                  <span className="absolute top-2 left-2 bg-[#0F2440]/5 border border-[#0F2440]/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-[#0F2440] uppercase tracking-wider">
                    {prod.brand}
                  </span>
                  
                  <span className="absolute top-2 right-2 bg-brand-red text-white px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shadow-[0_2px_6px_rgba(220,38,38,0.3)]">
                    BESTSELLER
                  </span>
                  
                  <img
                    src={prod.img}
                    alt={prod.name}
                    className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>

                {/* Body area */}
                <div className="p-4 flex-grow flex flex-col justify-between text-left">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[8px] font-bold text-brand-red uppercase tracking-[0.2em]">{prod.sub}</span>
                      <span className="flex items-center gap-1 text-[8px] text-emerald-600 font-bold">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                        LAGERND
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-[#0F2440] leading-snug line-clamp-2 mb-2 min-h-[32px] group-hover:text-brand-red transition-colors">
                      {prod.name}
                    </h3>
                    
                    {/* B2B Pricing Structure */}
                    <div className="mb-2">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 line-through">€ {listPrice.toLocaleString("de-DE")}</span>
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-[8px] font-bold text-brand-red">Save € {saving.toLocaleString("de-DE")}</span>
                      </div>
                      <div className="text-base font-display font-black text-[#0F2440]">
                        € {prod.price.toLocaleString("de-DE")}
                        <span className="text-[9px] font-medium text-slate-400 ml-1">zzgl. MwSt.</span>
                      </div>
                    </div>

                    {/* B2B Leasing Option */}
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-[9px] font-bold text-[#0F2440] flex justify-between items-center mb-2">
                      <span className="text-slate-500 flex items-center gap-1">
                        <CreditCard size={11} />
                        Leasing ab:
                      </span>
                      <span className="text-brand-red">€ {Math.round((prod.price * 1.15) / 60)}/Monat</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const equipmentItem = {
                          id: prod.id,
                          name: prod.name,
                          desc: "",
                          cat: prod.cat,
                          sub: prod.sub,
                          fam: "",
                          img: prod.img,
                          brand: prod.brand,
                          l: 0,
                          w: 0,
                          h: "0",
                          kw: 0,
                          price: prod.price,
                          line: ""
                        };
                        if (added) {
                          removeItem(prod.id);
                        } else {
                          addItem(equipmentItem);
                        }
                      }}
                      className={`flex-1 py-2.5 rounded-lg text-[9px] font-bold tracking-[0.1em] uppercase transition-colors cursor-pointer border inline-flex items-center justify-center gap-1.5 ${added ? "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200" : "bg-brand-red border-brand-red text-white hover:bg-[#B91C1C]"}`}
                    >
                      {added && <BadgeCheck size={12} />}
                      {added ? "IM ANGEBOT" : "ZUM ANGEBOT"}
                    </button>
                    
                    <a
                      href="#quote"
                      className="px-3 py-2.5 border border-slate-200 text-[#0F2440] hover:text-brand-red hover:border-brand-red/30 rounded-lg transition-colors text-[9px] font-bold flex items-center justify-center"
                      title="Projektanfrage"
                    >
                      Projekt
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>

      </div>
    </section>
  );
}
