import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, ShoppingCart, Menu, X, LogIn, User, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import LanguageSelector from './LanguageSelector';
import { CartDrawer } from './CartDrawer';
import { ProductsMegaMenu } from './ProductsMegaMenu';
import { CATEGORIES } from '../stores/equipmentStore';

const NAV_ITEMS = [
  { name: 'PLANLAMA', path: '/kitchen-planner' },
  { name: 'ÜRÜNLER', path: '/magaza' },
  { name: 'PROJELER', path: '/projects' },
  { name: 'İLETİŞİM', path: '/support' },
  { name: 'HAKKIMIZDA', path: '/brand' },
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
  const [isProductsOpen, setIsProductsOpen] = useState(false);
  const [isMobileProductsOpen, setIsMobileProductsOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const scrolledRef = useRef(false);
  const langVariant = !isScrolled && transparent ? 'dark' : 'light';

  const goToQuote = () => {
    if (window.location.pathname === '/') {
      document.querySelector('#quote')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    window.location.href = '/#quote';
  };

  const submitSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    setIsSearchOpen(false);
    navigate(`/magaza?q=${encodeURIComponent(q)}`);
  };

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  // ÜRÜNLER mega-menüsünü Escape ile kapat
  useEffect(() => {
    if (!isProductsOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsProductsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isProductsOpen]);

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

            <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
              {NAV_ITEMS.map((item) => {
                const linkColor = isScrolled
                  ? "text-slate-600 hover:text-brand-red"
                  : transparent
                    ? "text-white/80 hover:text-white"
                    : "text-slate-600 hover:text-brand-red";

                // ÜRÜNLER → Diamond tarzı kategori mega-menüsü
                if (item.path === '/magaza') {
                  return (
                    <div
                      key={item.name}
                      className="relative"
                      onMouseEnter={() => setIsProductsOpen(true)}
                      onMouseLeave={() => setIsProductsOpen(false)}
                    >
                      <button
                        type="button"
                        onClick={() => setIsProductsOpen((v) => !v)}
                        aria-expanded={isProductsOpen}
                        aria-haspopup="menu"
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.12em] whitespace-nowrap transition-colors cursor-pointer",
                          isProductsOpen ? "text-brand-red" : linkColor
                        )}
                      >
                        {item.name}
                        <ChevronDown className={cn("w-3 h-3 transition-transform duration-300", isProductsOpen && "rotate-180")} />
                      </button>
                      <AnimatePresence>
                        {isProductsOpen && (
                          <div className="absolute left-0 top-full z-50 pt-4">
                            <ProductsMegaMenu onClose={() => setIsProductsOpen(false)} />
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={cn(
                      "text-xs font-bold uppercase tracking-[0.12em] whitespace-nowrap transition-colors relative group",
                      linkColor
                    )}
                  >
                    {item.name}
                    <span className="absolute -bottom-3 left-1/2 w-1 h-1 bg-brand-red rounded-full opacity-0 group-hover:opacity-100 -translate-x-1/2 transition-all duration-300 shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 relative z-50">
            <div className="hidden md:flex items-center">
              <AnimatePresence initial={false}>
                {isSearchOpen && (
                  <motion.input
                    ref={searchInputRef}
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '12rem', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); if (e.key === 'Escape') setIsSearchOpen(false); }}
                    onBlur={() => { if (!searchQuery.trim()) setIsSearchOpen(false); }}
                    placeholder="ARA..."
                    className={cn(
                      "bg-transparent border-b pl-0 pr-2 py-1.5 text-xs outline-none uppercase tracking-[0.15em] min-w-0",
                      isScrolled
                        ? "border-slate-300 text-[#0F2440] focus:border-brand-red placeholder:text-slate-400"
                        : transparent
                          ? "border-white/30 text-white focus:border-white placeholder:text-white/40"
                          : "border-slate-300 text-[#0F2440] focus:border-brand-red placeholder:text-slate-400"
                    )}
                  />
                )}
              </AnimatePresence>
              <button
                type="button"
                aria-label="Ara"
                onClick={() => { if (isSearchOpen) submitSearch(); else setIsSearchOpen(true); }}
                className={cn(
                  "p-1.5 transition-colors cursor-pointer hover:text-brand-red",
                  isScrolled
                    ? "text-[#0F2440]"
                    : transparent
                      ? "text-white hover:text-white/80"
                      : "text-[#0F2440]"
                )}
              >
                <Search className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              </button>
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
                  "hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full border font-bold text-[9px] uppercase tracking-[0.18em] whitespace-nowrap transition-all",
                  isScrolled
                    ? "border-slate-300 text-[#0F2440] hover:border-brand-red hover:text-brand-red"
                    : transparent
                      ? "border-white/30 text-white hover:bg-white/10"
                      : "border-slate-300 text-[#0F2440] hover:border-brand-red hover:text-brand-red"
                )}
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                {t('landing.nav.login', 'Giriş Yap')}
              </Link>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Sepet"
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
              className="hidden md:flex items-center gap-2 px-6 py-3 bg-brand-red hover:bg-[#B91C1C] text-white rounded-full transition-all font-bold text-[9px] uppercase tracking-[0.18em] whitespace-nowrap shadow-[0_10px_24px_-8px_rgba(220,38,38,0.5)] cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" /> TEKLİF AL
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
                    {item.path === '/magaza' ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => setIsMobileProductsOpen((v) => !v)}
                          aria-expanded={isMobileProductsOpen}
                          className="w-full text-3xl font-display font-bold uppercase tracking-tighter text-[#0F2440] hover:text-brand-red flex items-center gap-4 transition-colors"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-red shadow-[0_0_10px_rgba(220,38,38,0.45)]" />
                          {item.name}
                          <ChevronDown className={cn("w-6 h-6 ml-auto transition-transform duration-300", isMobileProductsOpen && "rotate-180")} />
                        </button>
                        <AnimatePresence initial={false}>
                          {isMobileProductsOpen && (
                            <motion.ul
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: "easeOut" }}
                              className="overflow-hidden mt-3 ml-5 border-l border-slate-200 pl-4 flex flex-col"
                            >
                              <li>
                                <Link
                                  to="/magaza"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                  className="flex items-center justify-between py-2 text-sm font-bold uppercase tracking-wide text-brand-red"
                                >
                                  Tüm Ürünler
                                  <ChevronRight className="w-4 h-4" />
                                </Link>
                              </li>
                              {CATEGORIES.map((cat) => (
                                <li key={cat.id}>
                                  <Link
                                    to={`/magaza?cat=${cat.id}`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center justify-between py-2 text-sm font-semibold text-slate-600 hover:text-brand-red transition-colors"
                                  >
                                    <span className="truncate">{cat.name}</span>
                                    <ChevronRight className="w-4 h-4 shrink-0 text-slate-300" />
                                  </Link>
                                </li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <Link
                        to={item.path}
                        className="text-3xl font-display font-bold uppercase tracking-tighter text-[#0F2440] hover:text-brand-red flex items-center gap-4 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-red shadow-[0_0_10px_rgba(220,38,38,0.45)]" />
                        {item.name}
                      </Link>
                    )}
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

      <CartDrawer open={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
