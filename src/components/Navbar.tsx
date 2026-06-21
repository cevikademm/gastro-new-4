import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, ShoppingCart, Menu, X, LogIn, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import LanguageSelector from './LanguageSelector';

const NAV_ITEMS = [
  { name: 'DIAMOND', path: '/diamond' },
  { name: 'COMBISTEEL', path: '/combisteel' },
  { name: 'MUTFAK PLANLAMA', path: '/kitchen-planner' },
  { name: 'PROJELER', path: '/projects' },
  { name: 'BLOG', path: '/blog' }
];

export function Navbar({ transparent = false }: { transparent?: boolean }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const cartCount = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0));
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const scrolledRef = useRef(false);
  const langVariant = !isScrolled && transparent ? 'dark' : 'light';

  const goToQuote = () => {
    if (window.location.pathname === '/') {
      document.querySelector('#quote')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    window.location.href = '/#quote';
  };

  useEffect(() => {
    let ticking = false;

    const updateScrolled = () => {
      const next = window.scrollY > 32;
      if (next !== scrolledRef.current) {
        scrolledRef.current = next;
        setIsScrolled(next);
      }
      ticking = false;
    };

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateScrolled);
    };

    updateScrolled();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflowY = 'hidden';
    } else {
      document.body.style.overflowY = '';
    }
    return () => { document.body.style.overflowY = ''; }
  }, [isMobileMenuOpen]);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        className={cn(
          "fixed top-9 left-0 right-0 z-50 py-2 transition-shadow duration-200 ease-out",
          isScrolled ? "shadow-[0_12px_34px_-24px_rgba(15,36,64,0.22)]" : "shadow-sm"
        )}
      >
        <div className={cn(
          "max-w-[90rem] mx-auto h-14 px-4 sm:px-6 flex justify-between items-center border transition-[background-color,border-color,box-shadow,color] duration-200",
          isScrolled
            ? "bg-white/95 border-slate-200 rounded-[22px] mx-3 sm:mx-6 lg:mx-auto"
            : transparent
              ? "bg-[#0F2440]/30 backdrop-blur-md border-white/10 rounded-[22px] mx-3 sm:mx-6 lg:mx-auto text-white shadow-sm"
              : "bg-white border-slate-100 rounded-none text-[#0F2440]"
        )}>
          <div className="flex items-center gap-7 lg:gap-10 min-w-0">
            <Link to="/" className="flex items-center gap-2 group relative z-50">
              <img src="/logo-2mc-gastro.png" alt="2MC Gastro" className="h-9 sm:h-10 md:h-11 w-auto max-w-[148px] sm:max-w-[176px] object-contain transition-transform duration-200 group-hover:scale-[1.03]" />
            </Link>

            <nav className="hidden lg:flex items-center gap-7 xl:gap-8">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  className={cn(
                    "text-xs font-bold uppercase tracking-[0.2em] transition-colors relative group",
                    isScrolled
                      ? "text-slate-600 hover:text-brand-red"
                      : transparent
                        ? "text-white/80 hover:text-white"
                        : "text-slate-600 hover:text-brand-red"
                  )}
                >
                  {item.name}
                  <span className="absolute -bottom-3 left-1/2 w-1 h-1 bg-brand-red rounded-full opacity-0 group-hover:opacity-100 -translate-x-1/2 transition-all duration-300 shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 relative z-50">
            <div className="hidden xl:flex relative group">
              <input
                type="text"
                placeholder="SEARCH..."
                className={cn(
                  "bg-transparent border-b pl-0 pr-8 py-2 text-xs w-48 focus:w-64 outline-none transition-all uppercase tracking-[0.2em]",
                  isScrolled
                    ? "border-slate-300 text-[#0F2440] focus:border-brand-red placeholder:text-slate-400"
                    : transparent
                      ? "border-white/20 text-white focus:border-white placeholder:text-white/40"
                      : "border-slate-300 text-[#0F2440] focus:border-brand-red placeholder:text-slate-400"
                )}
              />
              <Search className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors",
                isScrolled
                  ? "text-slate-500 group-hover:text-brand-red"
                  : transparent
                    ? "text-white/60 group-hover:text-white"
                    : "text-slate-500 group-hover:text-brand-red"
              )} />
            </div>

            {/* 15-dil seçici — her ekranda görünür */}
            <LanguageSelector variant={langVariant} className="shrink-0" />

            {/* Giriş / Hesap — masaüstünde görünür, mobilde menüde */}
            {isAuthenticated && user ? (
              <Link
                to="/dashboard"
                className={cn(
                  "hidden md:flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border font-bold text-[10px] uppercase tracking-[0.15em] transition-all",
                  isScrolled
                    ? "border-slate-200 text-[#0F2440] hover:border-brand-red hover:text-brand-red"
                    : transparent
                      ? "border-white/25 text-white hover:bg-white/10"
                      : "border-slate-200 text-[#0F2440] hover:border-brand-red hover:text-brand-red"
                )}
              >
                <span className="grid place-items-center w-6 h-6 rounded-full bg-brand-red text-white text-[10px] font-black">
                  {(user.fullName || user.email || '?').trim().charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[88px] truncate normal-case tracking-normal">
                  {user.fullName?.split(' ')[0] || t('nav.account', 'Hesabım')}
                </span>
              </Link>
            ) : (
              <Link
                to="/login"
                className={cn(
                  "hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full border font-bold text-[9px] uppercase tracking-[0.2em] transition-all",
                  isScrolled
                    ? "border-slate-300 text-[#0F2440] hover:border-brand-red hover:text-brand-red"
                    : transparent
                      ? "border-white/30 text-white hover:bg-white/10"
                      : "border-slate-300 text-[#0F2440] hover:border-brand-red hover:text-brand-red"
                )}
              >
                <LogIn className="w-3.5 h-3.5" />
                {t('landing.nav.login', 'Giriş Yap')}
              </Link>
            )}

            <button
              onClick={() => navigate('/cart')}
              className={cn(
                "relative hover:text-brand-red transition-colors cursor-pointer",
                isScrolled
                  ? "text-[#0F2440]"
                  : transparent
                    ? "text-white hover:text-white/80"
                    : "text-[#0F2440]"
              )}
            >
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute -top-1.5 -right-1.5 min-w-3.5 h-3.5 px-1 bg-brand-red text-white text-[8px] font-bold rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(220,38,38,0.45)]">{cartCount}</span>
            </button>

            <button
              className={cn(
                "lg:hidden hover:text-brand-red transition-colors cursor-pointer",
                isScrolled
                  ? "text-[#0F2440]"
                  : transparent
                    ? "text-white hover:text-white/80"
                    : "text-[#0F2440]"
              )}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>

            <button
              onClick={goToQuote}
              className="hidden md:flex items-center gap-2 px-6 py-3 bg-brand-red hover:bg-[#B91C1C] text-white rounded-full transition-all font-bold text-[9px] uppercase tracking-[0.2em] shadow-[0_10px_24px_-8px_rgba(220,38,38,0.5)] cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" /> TEKLİF AL
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-0 z-40 bg-white/95 lg:hidden flex flex-col pt-24 px-6 pb-6 overflow-y-auto"
          >
            <div className="flex flex-col gap-8 h-full">
              <nav className="flex flex-col gap-6 mt-4">
                {NAV_ITEMS.map((item, i) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ delay: i * 0.04, duration: 0.24, ease: "easeOut" }}
                  >
                    <Link
                      to={item.path}
                      className="text-3xl font-display font-bold uppercase tracking-tighter text-[#0F2440] hover:text-brand-red flex items-center gap-4 transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-red shadow-[0_0_10px_rgba(220,38,38,0.45)]" />
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mt-auto space-y-6 pt-10 border-t border-slate-200"
              >
                {/* Giriş / Kayıt */}
                {isAuthenticated && user ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 w-full py-4 px-5 rounded-full bg-[#0F2440] text-white font-bold text-xs uppercase tracking-[0.15em]"
                  >
                    <User className="w-4 h-4" />
                    {user.fullName || t('nav.account', 'Hesabım')}
                  </Link>
                ) : (
                  <div className="flex gap-3">
                    <Link
                      to="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full border border-slate-300 text-[#0F2440] font-bold text-[11px] uppercase tracking-[0.15em] hover:border-brand-red hover:text-brand-red transition-colors"
                    >
                      <LogIn className="w-4 h-4" />
                      {t('landing.nav.login', 'Giriş Yap')}
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex-1 flex items-center justify-center py-3.5 rounded-full bg-[#0F2440] text-white font-bold text-[11px] uppercase tracking-[0.15em] hover:bg-[#1a3357] transition-colors"
                    >
                      {t('landing.nav.register', 'Kayıt Ol')}
                    </Link>
                  </div>
                )}

                {/* 15-dil seçici */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {t('settings.language', 'Dil')}
                  </span>
                  <LanguageSelector />
                </div>

                <div className="relative group w-full">
                  <input
                    type="text"
                    placeholder="SEARCH..."
                    className="bg-transparent border-b border-slate-300 pl-0 pr-8 py-3 text-xs w-full focus:border-brand-red outline-none transition-all text-[#0F2440] uppercase tracking-[0.2em] placeholder:text-slate-400"
                  />
                  <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                </div>

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    goToQuote();
                  }}
                  className="flex items-center justify-center gap-3 w-full py-4 bg-brand-red hover:bg-[#B91C1C] text-white rounded-full transition-all font-bold text-xs uppercase tracking-[0.2em] shadow-[0_10px_24px_-8px_rgba(220,38,38,0.5)] cursor-pointer"
                >
                  <FileText className="w-4 h-4" /> TEKLİF AL
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
