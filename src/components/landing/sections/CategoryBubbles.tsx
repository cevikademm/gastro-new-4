import { motion } from 'framer-motion';

interface CategoryBubblesProps {
  onSelectConcept: (conceptId: string) => void;
}

const CATEGORIES = [
  { id: "ovens", name: "Öfen", deal: "ab €79/M.", image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/50418/conversions/SBET-XC-22-big.jpg" },
  { id: "cooling", name: "Kühltechnik", deal: "24-48h", image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/57188/conversions/001DT274-R2%2B5-big.jpg" },
  { id: "mixers", name: "Teigtechnik", deal: "B2B", image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/62571/conversions/001-PSB2-big.jpg" },
  { id: "dishwash", name: "Spültechnik", deal: "Service", image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/73407/conversions/001-DCR49-6-AC-RC-big.jpg" },
  { id: "ice_makers", name: "Eisbereiter", deal: "Lagernd", image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/71318/conversions/001-ICE300MA-big.jpg" },
  { id: "displays", name: "Vitrinen", deal: "Top Deal", image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/76419/conversions/001-AD2N-H2G-R2-big.jpg" },
  { id: "pizza", name: "Pizza Linie", deal: "Paket", image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/12048385/conversions/001-LFD-18L-LX-big.jpg" },
  { id: "ovens", name: "Kombidämpfer", deal: "Bestseller", image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/50418/conversions/SBET-XC-22-big.jpg" },
  { id: "cooling", name: "Kühltische", deal: "Profi", image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/57188/conversions/001DT274-R2%2B5-big.jpg" },
  { id: "dishwash", name: "Fritteusen", deal: "Neu", image: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/75472/conversions/001-E22-F23CFSA4-AC-big.jpg" },
];

export function CategoryBubbles({ onSelectConcept }: CategoryBubblesProps) {
  return (
    <section className="relative z-20 w-full max-w-[100vw] overflow-hidden bg-white border-b border-slate-200 shadow-[0_8px_22px_-22px_rgba(15,36,64,0.45)]">
      <div className="lp-container py-3">
        <div className="flex w-full snap-x items-center justify-start gap-3 overflow-x-auto overflow-y-visible no-scrollbar scroll-smooth py-1.5 overscroll-x-contain lg:justify-center">
            {CATEGORIES.map((cat, index) => (
              <motion.button
                key={`${cat.id}-${index}`}
                onClick={() => onSelectConcept(cat.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.24, ease: "easeOut" }}
                className="group flex w-[90px] sm:w-[100px] shrink-0 snap-start flex-col items-center gap-2 focus:outline-none"
                aria-label={cat.name}
              >
                <div className="relative flex h-[78px] w-[78px] sm:h-[86px] sm:w-[86px] items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-gradient-to-b from-white to-slate-100 p-2.5 shadow-[0_6px_16px_-10px_rgba(15,36,64,0.5)] ring-1 ring-white transition-all duration-300 group-hover:border-brand-red group-hover:shadow-[0_16px_30px_-14px_rgba(220,38,38,0.6)] group-hover:-translate-y-0.5">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t-md bg-[#0F2440] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {cat.deal}
                  </span>
                </div>

                <p className="w-full truncate text-center text-[11px] sm:text-[12px] font-black leading-tight text-[#0F2440] transition-colors group-hover:text-brand-red">
                  {cat.name}
                </p>
              </motion.button>
            ))}
        </div>
      </div>
    </section>
  );
}
