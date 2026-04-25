import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
      className={`sticky top-0 z-50 backdrop-blur-md bg-[#faf9f5]/85 transition-all duration-200 ${
        scrolled ? 'border-b border-[var(--c-line)] shadow-sm' : ''
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-0.5 text-xl">
          <span className="c-serif font-medium text-[color:var(--c-ink)]">2mc</span>
          <span className="font-normal text-[color:var(--c-clay)]">gastro</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSelector />
          <Link
            to="/login"
            className="c-btn c-btn-ghost text-sm hidden sm:inline-flex"
          >
            {t('landing.nav.login')}
          </Link>
          <Link
            to="/register"
            className="c-btn c-btn-clay text-sm"
          >
            {t('landing.nav.register')}
          </Link>
        </div>
      </nav>
    </header>
  );
}
