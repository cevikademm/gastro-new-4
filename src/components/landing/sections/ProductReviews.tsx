import React, { useState } from 'react';
import { Star, ChevronLeft, ChevronRight, MessageSquare, Quote } from 'lucide-react';

const REVIEWS = [
  {
    id: 1,
    name: "Giovanni Russo",
    business: "Pizzeria Bella Italia, Düsseldorf",
    product: "Rational iCombi Pro XS Ofen",
    rating: 5,
    text: "Der Rational Kombidämpfer ist das Herzstück unserer Küche geworden. Perfekte Kruste, punktgenaues Garen und die Reinigung läuft komplett automatisch über Nacht. Absolute Kaufempfehlung!",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120&h=120"
  },
  {
    id: 2,
    name: "Sarah Lindner",
    business: "Café Central, Köln",
    product: "Teigknetmaschine Spiral Mikser 80 kg",
    rating: 5,
    text: "Unsere Backwaren erfordern höchste Präzision beim Kneten. Der Spiral Mikser verarbeitet selbst schwerste Hefeteige spielend leicht und flüsterleise. Der B2B-Leasing-Prozess war extrem unkompliziert.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120&h=120"
  },
  {
    id: 3,
    name: "Marcus Weber",
    business: "Steakhouse Cologne, Köln",
    product: "Kühltisch 2-türig mit Aufkantung",
    rating: 5,
    text: "Der Kühltisch von CombiSteel bietet enormen Platz und ist extrem robust verarbeitet. Die Aufkantung schützt die Wand perfekt vor Spritzern. Die Lieferung war innerhalb von 36 Stunden bei uns vor Ort.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120&h=120"
  },
  {
    id: 4,
    name: "Elena Petrova",
    business: "Hotel Metropol, Frankfurt",
    product: "Haubenspülmaschine Diamond",
    rating: 5,
    text: "In Stoßzeiten müssen Hunderte Teller in wenigen Minuten wieder sauber sein. Die Haubenspülmaschine spült blitzschnell und absolut streifenfrei. Toller Service und Einbaubegleitung durch das Kölner Team.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120&h=120"
  }
];

export function ProductReviews() {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % REVIEWS.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + REVIEWS.length) % REVIEWS.length);
  };

  const activeReview = REVIEWS[activeIndex];

  return (
    <section className="py-12 md:py-24 bg-[#FAFAFA] border-b border-slate-200 relative z-10">
      <div className="lp-container">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-8 sm:mb-16 text-left">
          <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase mb-4">
            <span className="w-6 h-px bg-brand-red" />
            KUNDENSTIMMEN
          </span>
          <h2 className="lp-h2 font-display font-bold text-[#0F2440] tracking-tight">
            Was unsere Partner <span className="text-brand-red">sagen</span>
          </h2>
          <p className="mt-3 text-xs text-slate-500">
            Erfahrungsberichte von echten Gastronomen über unsere Produkte und unseren Service.
          </p>
        </div>

        {/* Mobil: yana kayan kompakt yorum kartları */}
        <div className="lg:hidden flex overflow-x-auto snap-x snap-mandatory gap-4 -mx-1 px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {REVIEWS.map((r) => (
            <div
              key={r.id}
              className="min-w-[85%] shrink-0 snap-center bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_8px_24px_-16px_rgba(15,36,64,0.4)] flex flex-col"
            >
              <Quote size={26} strokeWidth={1} className="text-brand-red/30 mb-2 shrink-0" />
              <p className="font-display text-[14px] leading-snug italic text-[#0F2440] line-clamp-5">
                "{r.text}"
              </p>
              <div className="flex gap-0.5 mt-3">
                {[...Array(r.rating)].map((_, i) => (
                  <Star key={i} size={13} className="fill-brand-red text-brand-red" />
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3 pt-3 border-t border-slate-100">
                <img
                  src={r.avatar}
                  alt={r.name}
                  loading="lazy"
                  className="w-10 h-10 rounded-full object-cover border-2 border-brand-red shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#0F2440] leading-tight truncate">{r.name}</p>
                  <p className="text-[10px] text-slate-400 font-semibold truncate">{r.business}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Layout — masaüstü */}
        <div className="hidden lg:grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white border border-slate-200 p-5 sm:p-8 lg:p-12 rounded-[1.75rem] sm:rounded-[2.5rem] shadow-[0_20px_50px_rgba(15,36,64,0.04)] relative overflow-hidden">
          
          {/* Decorative quote icon */}
          <div className="absolute top-8 right-8 text-slate-100 pointer-events-none z-0">
            <Quote size={120} strokeWidth={1} className="opacity-40" />
          </div>

          {/* Left Column: Avatar & Metadata */}
          <div className="col-span-1 lg:col-span-4 flex min-w-0 max-w-full flex-col items-center lg:items-start text-center lg:text-left z-10">
            <div className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-brand-red mb-3 sm:mb-6 shadow-md">
              <img
                src={activeReview.avatar}
                alt={activeReview.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            <h4 className="text-lg font-bold text-[#0F2440] leading-none mb-1">{activeReview.name}</h4>
            <p className="max-w-full text-xs text-slate-400 font-semibold mb-3 break-words">{activeReview.business}</p>
            
            {/* Star Rating */}
            <div className="flex gap-1 mb-4">
              {[...Array(activeReview.rating)].map((_, i) => (
                <Star key={i} size={14} className="fill-brand-red text-brand-red" />
              ))}
            </div>

            {/* Product Tag */}
            <div className="inline-flex max-w-full items-center gap-1.5 px-3 py-1 bg-red-50 border border-brand-red/10 rounded-full text-brand-red text-[10px] font-bold uppercase tracking-wider">
              <MessageSquare size={10} />
              <span className="min-w-0 break-words">{activeReview.product}</span>
            </div>
          </div>

          {/* Right Column: Review Text & Controls */}
          <div className="col-span-1 lg:col-span-8 flex min-w-0 max-w-full flex-col justify-between h-full text-center lg:text-left min-h-0 sm:min-h-[200px] z-10">
            <p className="max-w-full break-words font-display text-[15px] sm:text-xl lg:text-2xl font-medium text-[#0F2440] leading-snug sm:leading-relaxed italic mb-5 sm:mb-8">
              "{activeReview.text}"
            </p>

            {/* Carousel Controls */}
            <div className="flex items-center justify-center lg:justify-start gap-4 mt-auto">
              <button
                onClick={handlePrev}
                className="w-10 h-10 border border-slate-200 hover:border-brand-red hover:text-brand-red text-[#0F2440] rounded-full flex items-center justify-center transition-all bg-white shadow-sm cursor-pointer"
                aria-label="Previous Review"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                className="w-10 h-10 border border-slate-200 hover:border-brand-red hover:text-brand-red text-[#0F2440] rounded-full flex items-center justify-center transition-all bg-white shadow-sm cursor-pointer"
                aria-label="Next Review"
              >
                <ChevronRight size={18} />
              </button>

              {/* Step indicator */}
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4">
                {activeIndex + 1} / {REVIEWS.length}
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
export default ProductReviews;
