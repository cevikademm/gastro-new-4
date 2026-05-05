import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, User, Menu, Globe, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { name: 'DIAMOND', path: '/diamond' },
  { name: 'COMBISTEEL', path: '/combisteel' },
  { name: 'MUTFAK PLANLAMA', path: '/kitchen-planner' },
  { name: 'PROJELER', path: '/projects' },
  { name: 'BLOG', path: '/blog' }
];

export function Navbar() {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    return scrollY.on('change', (latest) => {
      setIsScrolled(latest > 50);
    });
  }, [scrollY]);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isMobileMenuOpen]);

  return (
    <>
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-out",
          isScrolled ? "py-4" : "py-8"
        )}
      >
        <div className={cn(
          "max-w-[90rem] mx-auto px-6 border border-white/10 flex justify-between items-center transition-all duration-700",
          isScrolled ? "bg-[#050505]/85 backdrop-blur-md rounded-3xl py-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] mx-4 sm:mx-6 lg:mx-auto" : "bg-transparent rounded-none py-2"
        )}>
          <div className="flex items-center gap-12">
            <Link to="/" className="flex items-center gap-3 group relative z-50">
               <div className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse shadow-[0_0_10px_rgba(232,93,38,0.8)]" />
               <div className="flex flex-col">
                 <span className="text-xl font-display font-bold leading-none tracking-tighter text-white">GASTRO<span className="text-brand-red">.</span></span>
               </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-8">
              {NAV_ITEMS.map((item) => (
                <Link 
                  key={item.name} 
                  to={item.path} 
                  className="text-xs font-bold uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors relative group"
                >
                  {item.name}
                  <span className="absolute -bottom-3 left-1/2 w-1 h-1 bg-brand-red rounded-full opacity-0 group-hover:opacity-100 -translate-x-1/2 transition-all duration-300 shadow-[0_0_8px_rgba(232,93,38,0.8)]" />
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 relative z-50">
            <div className="hidden xl:flex relative group">
              <input 
                type="text" 
                placeholder="SEARCH..." 
                className="bg-transparent border-b border-white/20 pl-0 pr-8 py-2 text-xs w-48 focus:border-white focus:w-64 outline-none transition-all text-white uppercase tracking-[0.2em] placeholder:text-white/30" 
              />
              <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/50 group-hover:text-white transition-colors" />
            </div>
            
            <button 
              onClick={() => navigate('/cart')}
              className="relative hover:text-brand-red transition-colors text-white"
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-brand-red text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(232,93,38,0.5)]">0</span>
            </button>
            
            <button 
              className="lg:hidden text-white hover:text-brand-red transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
            
            <button 
              onClick={() => navigate('/login')}
              className="hidden md:flex items-center gap-2 px-6 py-3 border border-white/20 bg-white/5 hover:bg-white text-white hover:text-brand-dark rounded-full transition-all font-bold text-[9px] uppercase tracking-[0.2em]"
            >
              <User className="w-3.5 h-3.5" /> GİRİŞ YAP
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 bg-[#050505]/95 lg:hidden flex flex-col pt-32 px-6 pb-6 overflow-y-auto"
          >
            <div className="flex flex-col gap-8 h-full">
              <nav className="flex flex-col gap-6 mt-4">
                {NAV_ITEMS.map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -30, filter: "blur(10px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: -20, filter: "blur(10px)" }}
                    transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
                  >
                    <Link 
                      to={item.path} 
                      className="text-3xl font-display font-bold uppercase tracking-tighter text-white/80 hover:text-brand-red flex items-center gap-4 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-red shadow-[0_0_10px_rgba(232,93,38,0.5)]" />
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mt-auto space-y-6 pt-10 border-t border-white/10"
              >
                 <div className="relative group w-full">
                    <input 
                      type="text" 
                      placeholder="SEARCH..." 
                      className="bg-transparent border-b border-white/20 pl-0 pr-8 py-3 text-xs w-full focus:border-white outline-none transition-all text-white uppercase tracking-[0.2em] placeholder:text-white/30" 
                    />
                    <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                 </div>
                 
                 <button className="flex items-center justify-center gap-3 w-full py-4 border border-white/20 bg-white/5 hover:bg-brand-red text-white hover:border-brand-red rounded-full transition-all font-bold text-xs uppercase tracking-[0.2em]">
                   <User className="w-4 h-4" /> GİRİŞ YAP
                 </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
