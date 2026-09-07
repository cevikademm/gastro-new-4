import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface CategoryBubblesProps {
  onSelectConcept?: (conceptId: string) => void;
}

// cat = taksonomi üst kategorisi, sub = alt-grup id'si (categoryTaxonomy).
// Mağaza /magaza?cat=<cat>&sub=<sub> ile eşleşir.
// nameKey/dealKey → i18n; hook kuralları gereği modül seviyesinde t() çağrılmaz.
const CATEGORIES = [
  { id: "ovens",      cat: "cooking",     sub: "oefen",         nameKey: "landing.categoryBubbles.ovens.name",      dealKey: "landing.categoryBubbles.ovens.deal",      image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/50418/conversions/SBET-XC-22-big.jpg" },
  { id: "cooling",    cat: "cooling",                            nameKey: "landing.categoryBubbles.cooling.name",    dealKey: "landing.categoryBubbles.cooling.deal",    image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/57188/conversions/001DT274-R2%2B5-big.jpg" },
  { id: "mixers",     cat: "pizza_pasta", sub: "teigkneter",    nameKey: "landing.categoryBubbles.mixers.name",     dealKey: "landing.categoryBubbles.mixers.deal",     image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/62571/conversions/001-PSB2-big.jpg" },
  { id: "dishwash",   cat: "dishwash",                           nameKey: "landing.categoryBubbles.dishwash.name",   dealKey: "landing.categoryBubbles.dishwash.deal",   image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/73407/conversions/001-DCR49-6-AC-RC-big.jpg" },
  { id: "ice_makers", cat: "cooling",     sub: "eiswuerfel",    nameKey: "landing.categoryBubbles.ice_makers.name", dealKey: "landing.categoryBubbles.ice_makers.deal", image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/71318/conversions/001-ICE300MA-big.jpg" },
  { id: "displays",   cat: "cooling",     sub: "vitrinen",      nameKey: "landing.categoryBubbles.displays.name",   dealKey: "landing.categoryBubbles.displays.deal",   image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/76419/conversions/001-AD2N-H2G-R2-big.jpg" },
  { id: "pizza",      cat: "pizza_pasta",                        nameKey: "landing.categoryBubbles.pizza.name",      dealKey: "landing.categoryBubbles.pizza.deal",      image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/12048385/conversions/001-LFD-18L-LX-big.jpg" },
  { id: "combi",      cat: "cooking",     sub: "kombidaempfer", nameKey: "landing.categoryBubbles.combi.name",      dealKey: "landing.categoryBubbles.combi.deal",      image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/50418/conversions/SBET-XC-22-big.jpg" },
  { id: "cooltables", cat: "cooling",     sub: "kuehltische",   nameKey: "landing.categoryBubbles.cooltables.name", dealKey: "landing.categoryBubbles.cooltables.deal", image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/57188/conversions/001DT274-R2%2B5-big.jpg" },
  { id: "fryers",     cat: "cooking",     sub: "friteusen",     nameKey: "landing.categoryBubbles.fryers.name",     dealKey: "landing.categoryBubbles.fryers.deal",     image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/75472/conversions/001-E22-F23CFSA4-AC-big.jpg" },
];

export function CategoryBubbles({ onSelectConcept }: CategoryBubblesProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <section className="relative z-20 w-full max-w-[100vw] overflow-hidden bg-white border-b border-slate-200 shadow-[0_8px_22px_-22px_rgba(15,36,64,0.45)]">
      <div className="lp-container py-3">
        <div className="flex w-full snap-x items-center [justify-content:safe_center] gap-[clamp(0.65rem,1.2vw,1.4rem)] overflow-x-auto overflow-y-visible no-scrollbar scroll-smooth py-1.5 overscroll-x-contain">
            {CATEGORIES.map((cat, index) => {
              const name = t(cat.nameKey);
              const deal = t(cat.dealKey);
              return (
              <motion.button
                key={`${cat.id}-${index}`}
                onClick={() => { onSelectConcept?.(cat.id); navigate(cat.sub ? `/magaza?cat=${cat.cat}&sub=${cat.sub}` : `/magaza?cat=${cat.cat}`); }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.24, ease: "easeOut" }}
                className="group flex w-[clamp(5rem,5.5vw,6.75rem)] shrink-0 snap-start flex-col items-center gap-2 focus:outline-none"
                aria-label={name}
              >
                <div className="relative flex h-[clamp(4.35rem,4.8vw,5.75rem)] w-[clamp(4.35rem,4.8vw,5.75rem)] items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-gradient-to-b from-white to-slate-100 p-[clamp(0.5rem,0.65vw,0.75rem)] shadow-[0_6px_16px_-10px_rgba(15,36,64,0.5)] ring-1 ring-white transition-all duration-300 group-hover:border-brand-red group-hover:shadow-[0_16px_30px_-14px_rgba(220,38,38,0.6)] group-hover:-translate-y-0.5">
                  <img
                    src={cat.image}
                    alt={name}
                    width={92}
                    height={92}
                    className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-md bg-[#0F2440] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {deal}
                  </span>
                </div>

                <p className="w-full truncate text-center text-[clamp(0.68rem,0.75vw,0.78rem)] font-black leading-tight text-[#0F2440] transition-colors group-hover:text-brand-red">
                  {name}
                </p>
              </motion.button>
              );
            })}
        </div>
      </div>
    </section>
  );
}
