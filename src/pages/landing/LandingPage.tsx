/**
 * PREMİUM GASTRO LANDİNG - MASTER EDITION
 * Optimized for performance, zero context-leak, cinematic UX.
 */

import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  PencilRuler, 
  Briefcase, 
  Wrench,
  ChevronRight,
  ShieldCheck,
  Zap,
  Globe
} from 'lucide-react';

// Core Components
import { Navbar } from '../../components/Navbar';
import { Hero } from '../../components/Hero';
import { Categories, FeaturedProducts, Footer } from '../../components/Sections';
import { Background3D } from '../../components/Background3D';

// Restored Sections
import { AnnouncementBar } from '../../components/landing/sections/AnnouncementBar';
import { FlashStrip } from '../../components/landing/sections/FlashStrip';
import { StatsBand } from '../../components/landing/sections/StatsBand';
import { TestimonialsBand } from '../../components/landing/sections/TestimonialsBand';
import { FinalCTASection } from '../../components/landing/sections/FinalCTASection';
import { FloatingWidgets } from '../../components/landing/sections/FloatingWidgets';

// Immersive Components
import ImmersiveProductScene from '../../components/immersive/ImmersiveProductScene';
import Product3DCardGrid from '../../components/immersive/Product3DCardGrid';

/**
 * Lazy Section Wrapper
 * Unmounts children when out of view to save WebGL contexts.
 */
function LazyWebGLSection({ children, offset = "200px" }: { children: React.ReactNode, offset?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: offset, threshold: 0.01 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [offset]);

  return (
    <div ref={ref} className="w-full h-full min-h-[1px]">
      {isVisible ? children : <div className="w-full h-full bg-[#FAFAFA]" />}
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowOverlay(false), 500);
    
    // Wake up WebGL
    window.dispatchEvent(new Event('resize'));

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative text-[#0F2440] bg-[#FAFAFA] selection:bg-brand-red selection:text-white min-h-screen">
      
      {/* 1. Global 3D Background - Always active but optimized */}
      <Background3D />
      
      {/* 2. Loading Overlay */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(20px)" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
               <div className="w-12 h-12 border-t-2 border-brand-red rounded-full animate-spin shadow-[0_0_15px_rgba(220,38,38,0.35)]" />
               <span className="text-xl font-display font-bold tracking-tighter text-[#0F2440] uppercase">2MC GASTRO</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <AnnouncementBar />
        <Navbar />
        
        <main className="relative z-10">
          <Hero />

          {/* Brands Ribbon */}
          <section className="bg-white py-10 overflow-hidden border-y border-slate-200 relative z-20">
            <style>{`@keyframes brandMarquee { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } }`}</style>
            <div
              className="flex gap-24 whitespace-nowrap will-change-transform"
              style={{ width: 'max-content', animation: 'brandMarquee 40s linear infinite' }}
            >
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-24 pr-24">
                  {['DIAMOND', 'COMBISTEEL', 'GASTRO-LINE', 'MASTER-CHEF', 'ECO-COOL', 'POLARIS', 'EUROFRED', 'VENIX', 'MODULAR', 'NORDIKA'].map(brand => (
                    <span key={brand} className="text-[10px] font-bold tracking-[0.4em] text-slate-400 hover:text-brand-red transition-colors cursor-default uppercase">{brand}</span>
                  ))}
                </div>
              ))}
            </div>
          </section>

          {/* Quick Action Grid */}
          <section className="py-24 relative z-10">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { title: 'DİJİTAL KATALOG', icon: Box, desc: '5.000+ Ürün', path: '/diamond', num: '01' },
                  { title: 'MUTFAK STÜDYOSU', icon: PencilRuler, desc: '3D Planlama Sistemi', path: '/kitchen-planner', num: '02' },
                  { title: 'PROJE YÖNETİMİ', icon: Briefcase, desc: 'BOM & Teklif Listeleri', path: '/projects', num: '03' },
                  { title: 'TEKNİK DESTEK', icon: Wrench, desc: '7/24 Servis Ağı', path: '/support', num: '04' }
                ].map((item, idx) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ delay: idx * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -4 }}
                    onClick={() => navigate(item.path)}
                    className="relative p-7 rounded-[1.75rem] bg-white border border-slate-200 shadow-[0_1px_2px_rgba(15,36,64,0.04)] cursor-pointer transition-all duration-300 hover:border-brand-red/40 hover:shadow-[0_18px_40px_-16px_rgba(220,38,38,0.20)] group overflow-hidden"
                  >
                    <div className="absolute top-5 right-5 text-[10px] font-bold text-slate-300 tracking-[0.2em]">{item.num}</div>
                    <item.icon className="w-9 h-9 text-brand-red mb-7 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
                    <h3 className="text-[15px] font-display font-bold mb-1.5 tracking-tight text-[#0F2440]">{item.title}</h3>
                    <p className="text-[10px] text-slate-500 font-bold tracking-[0.18em] uppercase">{item.desc}</p>
                    <div className="absolute bottom-0 left-0 h-px bg-brand-red w-0 group-hover:w-full transition-[width] duration-500" />
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <FlashStrip />
          <Categories />
          
          <StatsBand />

          {/* Interactive 3D Designs Showcase */}
          <section className="relative z-10">
             <div className="max-w-[90rem] mx-auto px-6 pt-32 pb-16">
               <div className="flex flex-col md:flex-row justify-between md:items-end gap-8">
                  <div className="max-w-2xl">
                    <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase mb-5">
                      <span className="w-6 h-px bg-brand-red" />
                      3D PLANLAMA
                    </span>
                    <h2 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-[#0F2440] tracking-tighter leading-[1.02]">
                      İncelenebilir <span className="text-brand-red italic font-light">3D tasarımlar</span>
                    </h2>
                    <p className="text-slate-600 mt-6 max-w-md text-[15px] leading-relaxed">
                      Aşağıya kaydırın — gerçek ekipmanlarınızı sahnede görün, kamera akışıyla detayları keşfedin.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/kitchen-planner')}
                    className="group inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.25em] text-white bg-brand-red hover:bg-brand-red/90 px-8 py-4 rounded-full transition-all shadow-[0_10px_30px_-10px_rgba(220,38,38,0.6)] self-start md:self-end shrink-0"
                  >
                    PLANLAYICIYI AÇ
                    <ChevronRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
               </div>
             </div>

             <LazyWebGLSection offset="400px">
               <ImmersiveProductScene />
             </LazyWebGLSection>
          </section>

          <section className="py-32 bg-white relative z-10 border-y border-slate-200">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-200 rounded-[2rem] overflow-hidden">
                 {[
                   { icon: ShieldCheck, title: 'AVRUPA STANDARDI', desc: 'Tüm ürünlerimiz CE ve DIN normlarına uygun olarak üretilmekte ve sertifikalandırılmaktadır.' },
                   { icon: Zap, title: 'YÜKSEK VERİMLİLİK', desc: 'A+++ enerji sınıfı ekipmanlarımızla işletme maliyetlerinizi %40\'a varan oranda düşürün.' },
                   { icon: Globe, title: 'GLOBAL SERVİS', desc: '15 ülkede yerleşik teknik ekibimizle kurulum ve bakım hizmetlerini kapınıza getiriyoruz.' }
                 ].map((feat, i) => (
                   <motion.div
                     key={i}
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true, margin: '-50px' }}
                     transition={{ delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                     className="bg-white p-12 flex flex-col items-start text-left group hover:bg-red-50/40 transition-colors duration-500"
                   >
                     <div className="w-14 h-14 rounded-2xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mb-8 group-hover:bg-brand-red/20 transition-colors duration-500">
                       <feat.icon className="w-7 h-7 text-brand-red" strokeWidth={1.5} />
                     </div>
                     <h3 className="text-lg font-display font-bold mb-3 tracking-tight text-[#0F2440]">{feat.title}</h3>
                     <p className="text-sm text-slate-600 leading-relaxed">{feat.desc}</p>
                     <div className="mt-8 h-px w-12 bg-brand-red/60 group-hover:w-20 transition-[width] duration-500" />
                   </motion.div>
                 ))}
              </div>
            </div>
          </section>

          <LazyWebGLSection offset="400px">
            <Product3DCardGrid />
          </LazyWebGLSection>

          <TestimonialsBand />
          <FeaturedProducts />
          <FinalCTASection />
        </main>

        <Footer />
        <FloatingWidgets />
      </div>
    </div>
  );
}

export default LandingPage;
