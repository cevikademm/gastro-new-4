/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  PencilRuler, 
  Briefcase, 
  Wrench 
} from 'lucide-react';

// Premium Components — Identical to Source
import { Navbar } from '../../components/Navbar';
import { Hero } from '../../components/Hero';
import { Categories, FeaturedProducts, Footer } from '../../components/Sections';
import { Background3D } from '../../components/Background3D';
import ImmersiveProductScene from '../../components/immersive/ImmersiveProductScene';

export default function WelcomePage() {
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative text-white bg-[#050505] selection:bg-brand-red selection:text-white overflow-x-hidden min-h-screen">
      {/* 3D Background System */}
      <Background3D />
      
      {/* Navigation System */}
      <Navbar />
      
      <main className="relative z-10 pt-10">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            {/* Hero Section */}
            <Hero />
            
            {/* Trust Badges Section */}
            <section className="bg-[#0a0a0a]/80 backdrop-blur-3xl py-8 text-white overflow-hidden border-y border-white/5 relative z-20">
               <motion.div 
                 initial={{ x: '10%' }}
                 animate={{ x: '-10%' }}
                 transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                 className="flex gap-24 whitespace-nowrap"
               >
                 {[...Array(10)].map((_, i) => (
                   <div key={i} className="flex items-center gap-6">
                      <span className="text-xl font-display font-medium tracking-widest text-white uppercase">500+ MÜŞTERİ</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-red shadow-[0_0_15px_rgba(220,38,38,1)]" />
                      <span className="text-xl font-display font-medium tracking-widest text-gray-400 uppercase">15+ YIL DENEYİM</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-red shadow-[0_0_15px_rgba(220,38,38,1)]" />
                      <span className="text-xl font-display font-medium tracking-widest text-white uppercase">KÜRESEL TESLİMAT</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-red shadow-[0_0_15px_rgba(220,38,38,1)]" />
                      <span className="text-xl font-display font-medium tracking-widest text-gray-400 uppercase">HACCP UYUMLU</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-red shadow-[0_0_15px_rgba(220,38,38,1)]" />
                   </div>
                 ))}
               </motion.div>
            </section>

            {/* QUICK ACTIONS GRID — THE ONLY PART TO KEEP FROM OLD DESIGN */}
            <section className="w-full relative py-20 bg-transparent">
              <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { t: 'Dijital Katalog', d: '10.000+ ürün parmaklarınızın ucunda.', icon: Box, path: '/diamond', c: 'from-blue-500/20' },
                    { t: 'Tasarım Stüdyosu', d: 'Mutfağınızı 3D olarak kendiniz planlayın.', icon: PencilRuler, path: '/sketch', c: 'from-emerald-500/20' },
                    { t: 'Projelerim', d: 'Tekliflerinizi ve siparişlerinizi yönetin.', icon: Briefcase, path: '/orders', c: 'from-amber-500/20' },
                    { t: 'Teknik Destek', d: 'Uzman ekibimiz her an yardıma hazır.', icon: Wrench, path: '/docs', c: 'from-purple-500/20' },
                  ].map((act, i) => {
                    const I = act.icon;
                    return (
                      <motion.button
                        key={i}
                        onClick={() => navigate(act.path)}
                        whileHover={{ y: -8, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative group p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 text-left overflow-hidden transition-all hover:bg-white/[0.05]"
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${act.c} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
                        <div className="relative z-10">
                          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform shadow-2xl">
                            <I size={24} />
                          </div>
                          <h3 className="text-xl font-display font-bold text-white mb-3 uppercase tracking-tighter">{act.t}</h3>
                          <p className="text-gray-500 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">{act.d}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Categories Grid Section */}
            <div className="bg-transparent border-b border-white/5 relative z-10">
              <Categories />
            </div>

            {/* Cinematic Immersive Scene */}
            <ImmersiveProductScene />

            {/* Featured Products Showcase */}
            <div className="bg-[#0a0a0a]/50 backdrop-blur-2xl border-t border-white/5 pb-20 relative z-10">
              <FeaturedProducts />
            </div>

            {/* Service CTA Section */}
            <section className="py-32 relative z-10">
               <div className="max-w-7xl mx-auto px-6">
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   whileInView={{ opacity: 1, scale: 1 }}
                   viewport={{ once: true }}
                   transition={{ duration: 1, type: "spring", bounce: 0.2 }}
                   className="bg-brand-dark rounded-[2.5rem] sm:rounded-[4rem] p-8 sm:p-16 md:p-32 relative overflow-hidden shadow-2xl border border-white/5"
                 >
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1590595568582-70b9baeb196b?w=2000&q=80')] mix-blend-overlay opacity-10 bg-cover bg-center grayscale" />
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-r from-brand-dark via-brand-dark/90 to-brand-red/30 mix-blend-screen" />
                    <div className="relative z-10 max-w-3xl">
                       <span className="text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase block mb-6">// PROJE MERKEZİ</span>
                       <h2 className="text-4xl min-[400px]:text-5xl md:text-7xl text-white font-display font-bold mb-10 leading-[1.1] tracking-tight break-words">Geleceğin Mutfağını <span className="text-brand-red italic font-light lowercase text-transform-none block">Birlikte <br className="min-[400px]:hidden" /> Tasarlayalım.</span></h2>
                       <p className="text-gray-400 text-xl md:text-2xl mb-12 leading-relaxed max-w-2xl font-light">
                         AI destekli yerleşim planlaması, 3D mutfak simülasyonu ve mühendislik uzmanlığımızla vizyonunuzu hayata geçiriyoruz.
                       </p>
                       <motion.button 
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         onClick={() => navigate('/support')}
                         className="bg-white text-brand-dark py-5 px-12 rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-brand-red hover:text-white transition-colors duration-300 shadow-2xl"
                       >
                         Danışmanlık Randevusu Al
                       </motion.button>
                    </div>
                 </motion.div>
               </div>
            </section>

          </motion.div>
        </AnimatePresence>
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
