import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Heart, ShoppingCart, ChevronDown, MoveRight } from 'lucide-react';
import LanguageSelector from '../LanguageSelector';

export function LandingNav() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      role="banner"
      className={`sticky top-0 z-50 backdrop-blur-md transition-all duration-300 ${
        scrolled 
          ? 'bg-white/90 border-b border-[var(--c-line)] py-3 shadow-sm' 
          : 'bg-white/80 py-4.5'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src="/logo-2mc-gastro.png" 
              alt="2MC Gastro" 
              className="h-10 md:h-12 w-auto object-contain transition-transform group-hover:scale-105" 
            />
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-7">
            <Link to="/kategori" className="flex items-center gap-1.5 text-sm font-semibold text-[var(--c-ink-soft)] hover:text-[var(--c-clay)] transition-colors relative group/link">
              Kategoriler
              <ChevronDown size={14} className="opacity-60" />
              <span className="absolute bottom-[-4px] left-0 w-full h-0.5 bg-[var(--c-clay)] scale-x-0 group-hover/link:scale-x-100 transition-transform origin-left" />
            </Link>
            <Link to="/kategori" className="text-sm font-semibold text-[var(--c-ink-soft)] hover:text-[var(--c-clay)] transition-colors relative group/link">
              En Çok Satanlar
              <span className="absolute bottom-[-4px] left-0 w-full h-0.5 bg-[var(--c-clay)] scale-x-0 group-hover/link:scale-x-100 transition-transform origin-left" />
            </Link>
            <Link to="/design/3d" className="text-sm font-semibold text-[var(--c-ink-soft)] hover:text-[var(--c-clay)] transition-colors relative group/link">
              3D Tasarım
              <span className="absolute bottom-[-4px] left-0 w-full h-0.5 bg-[var(--c-clay)] scale-x-0 group-hover/link:scale-x-100 transition-transform origin-left" />
            </Link>
            <Link to="/projects" className="text-sm font-semibold text-[var(--c-ink-soft)] hover:text-[var(--c-clay)] transition-colors relative group/link">
              Projeler
              <span className="absolute bottom-[-4px] left-0 w-full h-0.5 bg-[var(--c-clay)] scale-x-0 group-hover/link:scale-x-100 transition-transform origin-left" />
            </Link>
            <Link to="/blog" className="text-sm font-semibold text-[var(--c-ink-soft)] hover:text-[var(--c-clay)] transition-colors relative group/link">
              Blog
              <span className="absolute bottom-[-4px] left-0 w-full h-0.5 bg-[var(--c-clay)] scale-x-0 group-hover/link:scale-x-100 transition-transform origin-left" />
            </Link>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden sm:block">
            <LanguageSelector />
          </div>
          
          <button className="w-10 h-10 rounded-full bg-[var(--c-bg-alt)] border border-[var(--c-line)] flex items-center justify-center text-[var(--c-ink-soft)] hover:bg-[var(--c-clay-wash)] hover:border-[var(--c-clay)] hover:text-[var(--c-clay)] transition-all cursor-pointer">
            <Search size={18} />
          </button>
          
          <Link to="/favorites" className="relative w-10 h-10 rounded-full bg-[var(--c-bg-alt)] border border-[var(--c-line)] flex items-center justify-center text-[var(--c-ink-soft)] hover:bg-[var(--c-clay-wash)] hover:border-[var(--c-clay)] hover:text-[var(--c-clay)] transition-all">
            <Heart size={18} />
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[var(--c-clay)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">3</span>
          </Link>
          
          <Link to="/cart" className="relative w-10 h-10 rounded-full bg-[var(--c-bg-alt)] border border-[var(--c-line)] flex items-center justify-center text-[var(--c-ink-soft)] hover:bg-[var(--c-clay-wash)] hover:border-[var(--c-clay)] hover:text-[var(--c-clay)] transition-all">
            <ShoppingCart size={18} />
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[var(--c-clay)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">2</span>
          </Link>

          <Link
            to="/login"
            className="hidden md:inline-flex items-center gap-2 bg-linear-to-br from-[var(--c-clay)] to-[var(--c-clay-deep)] text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-[0_4px_14px_rgba(232,93,38,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(232,93,38,0.45)] transition-all"
          >
            {t('landing.nav.login', 'Giriş Yap')}
            <MoveRight size={14} />
          </Link>
        </div>
      </nav>
    </header>
  );
}

