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
        if (entry.isIntersecting) setIsVisible(true);
        else setIsVisible(false);
      },
      { rootMargin: offset, threshold: 0.01 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [offset]);

  return (
    <div ref={ref} className="w-full h-full min-h-[1px]">
      {isVisible ? children : <div className="w-full h-full bg-[#050505]" />}
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
    <div className="relative text-white bg-[#050505] selection:bg-brand-red selection:text-white min-h-screen">
      
      {/* 1. Global 3D Background - Always active but optimized */}
      <Background3D />
      
      {/* 2. Loading Overlay */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(20px)" }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
               <div className="w-12 h-12 border-t-2 border-brand-red rounded-full animate-spin shadow-[0_0_15px_rgba(232,93,38,0.2)]" />
               <span className="text-xl font-display font-bold tracking-tighter text-white uppercase">2MC GASTRO</span>
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
          <section className="bg-[#0a0a0a]/80 backdrop-blur-3xl py-10 text-white overflow-hidden border-y border-white/5 relative z-20">
            <motion.div 
              initial={{ x: '0%' }}
              animate={{ x: '-20%' }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="flex gap-24 whitespace-nowrap"
            >
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-24">
                  {['DIAMOND', 'COMBISTEEL', 'GASTRO-LINE', 'MASTER-CHEF', 'ECO-COOL'].map(brand => (
                    <span key={brand} className="text-[10px] font-bold tracking-[0.4em] text-white/20 hover:text-brand-red transition-colors cursor-default uppercase">{brand}</span>
                  ))}
                </div>
              ))}
            </motion.div>
          </section>

          {/* Quick Action Grid */}
          <section className="py-24 relative z-10">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: 'DİJİTAL KATALOG', icon: Box, desc: '5.000+ Ürün', path: '/diamond' },
                  { title: 'MUTFAK STÜDYOSU', icon: PencilRuler, desc: '3D Planlama Sistemi', path: '/kitchen-planner' },
                  { title: 'PROJE YÖNETİMİ', icon: Briefcase, desc: 'BOM & Teklif Listeleri', path: '/projects' },
                  { title: 'TEKNİK DESTEK', icon: Wrench, desc: '7/24 Servis Ağı', path: '/support' }
                ].map((item, idx) => (
                  <motion.div
                    key={item.title}
                    whileHover={{ y: -10, backgroundColor: 'rgba(232, 93, 38, 0.05)' }}
                    onClick={() => navigate(item.path)}
                    className="p-8 rounded-[2rem] bg-white/5 border border-white/5 backdrop-blur-xl cursor-pointer transition-all duration-500 group"
                  >
                    <item.icon className="w-10 h-10 text-brand-red mb-6 group-hover:scale-110 transition-transform duration-500" />
                    <h3 className="text-lg font-display font-bold mb-2">{item.title}</h3>
                    <p className="text-xs text-white/40 font-bold tracking-widest uppercase">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <FlashStrip />
          <Categories />
          
          <StatsBand />

          {/* Interactive 3D Designs Showcase (Canvas 4) */}
          <section className="relative z-10">
             <div className="max-w-[90rem] mx-auto px-6 pt-32 pb-12">
               <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                  <div>
                    <span className="text-brand-red font-bold text-[9px] tracking-[0.3em] uppercase block mb-4">// 3D PLANLAMA</span>
                    <h2 className="text-4xl md:text-6xl font-display font-bold text-white uppercase tracking-tighter">İncelenebilir <br /><span className="text-brand-red italic font-light lowercase">3D Tasarımlar</span></h2>
                  </div>
                  <button 
                    onClick={() => navigate('/kitchen-planner')}
                    className="group flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-white/70 hover:text-white transition-colors bg-white/5 px-8 py-4 rounded-full border border-white/10"
                  >
                    PLANLAYICIYI AÇ <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-brand-red group-hover:border-brand-red transition-all"><ChevronRight size={16} /></div>
                  </button>
               </div>
             </div>
             
             <ImmersiveProductScene />
          </section>

          <section className="py-32 bg-[#0a0a0a]/50 relative z-10 border-y border-white/5">
            <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                 {[
                   { icon: ShieldCheck, title: 'AVRUPA STANDARDI', desc: 'Tüm ürünlerimiz CE ve DIN normlarına uygun olarak üretilmekte ve sertifikalandırılmaktadır.' },
                   { icon: Zap, title: 'YÜKSEK VERİMLİLİK', desc: 'A+++ enerji sınıfı ekipmanlarımızla işletme maliyetlerinizi %40\'a varan oranda düşürün.' },
                   { icon: Globe, title: 'GLOBAL SERVİS', desc: '15 ülkede yerleşik teknik ekibimizle kurulum ve bakım hizmetlerini kapınıza getiriyoruz.' }
                 ].map((feat, i) => (
                   <div key={i} className="flex flex-col items-center text-center">
                     <div className="w-16 h-16 rounded-3xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center mb-8">
                       <feat.icon className="w-8 h-8 text-brand-red" />
                     </div>
                     <h3 className="text-xl font-display font-bold mb-4">{feat.title}</h3>
                     <p className="text-sm text-white/50 leading-relaxed">{feat.desc}</p>
                   </div>
                 ))}
              </div>
            </div>
          </section>

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
