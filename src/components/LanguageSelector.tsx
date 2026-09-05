import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

const LANGUAGES = [
  { code: 'tr', label: 'Türkçe', country: 'tr' },
  { code: 'en', label: 'English', country: 'gb' },
  { code: 'de', label: 'Deutsch', country: 'de' },
  { code: 'fr', label: 'Français', country: 'fr' },
  { code: 'nl', label: 'Nederlands', country: 'nl' },
  { code: 'it', label: 'Italiano', country: 'it' },
  { code: 'es', label: 'Español', country: 'es' },
  { code: 'pt', label: 'Português', country: 'pt' },
  { code: 'pl', label: 'Polski', country: 'pl' },
  { code: 'cs', label: 'Čeština', country: 'cz' },
  { code: 'ro', label: 'Română', country: 'ro' },
  { code: 'el', label: 'Ελληνικά', country: 'gr' },
  { code: 'sv', label: 'Svenska', country: 'se' },
  { code: 'da', label: 'Dansk', country: 'dk' },
  { code: 'hu', label: 'Magyar', country: 'hu' },
];

const FlagIcon = ({ country, size = 20 }: { country: string; size?: number }) => (
  <img
    src={`https://flagcdn.com/w40/${country}.png`}
    srcSet={`https://flagcdn.com/w80/${country}.png 2x`}
    width={size}
    height={Math.round(size * 0.75)}
    alt=""
    className="rounded-sm object-cover"
    style={{ minWidth: size }}
  />
);

interface Props {
  variant?: 'light' | 'dark';
  className?: string;
}

export default function LanguageSelector({ variant = 'light', className = '' }: Props) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    try { localStorage.setItem('2mc_lang', code); } catch {}
    setOpen(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isDark = variant === 'dark';

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        aria-label={current.label}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
          isDark
            ? 'bg-white/10 backdrop-blur-md text-white/80 hover:text-white hover:bg-white/15 border border-white/10'
            : 'text-slate-500 hover:bg-slate-100 border border-transparent hover:border-slate-200'
        }`}
      >
        <FlagIcon country={current.country} size={20} />
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''} ${isDark ? 'text-white/50' : 'text-slate-400'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className={`absolute top-full right-0 mt-2 w-48 rounded-xl shadow-2xl border overflow-hidden z-[100] ${
          isDark
            ? 'bg-slate-900/95 backdrop-blur-xl border-white/10'
            : 'bg-white border-slate-200'
        }`}>
          {LANGUAGES.map(lang => {
            const isActive = lang.code === i18n.language;
            return (
              <button
                key={lang.code}
                onClick={() => changeLang(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isDark
                    ? isActive
                      ? 'bg-white/10 text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                    : isActive
                      ? 'bg-primary/5 text-primary'
                      : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FlagIcon country={lang.country} size={20} />
                <span className="flex-1 text-left">{lang.label}</span>
                {isActive && <Check size={14} className={isDark ? 'text-emerald-400' : 'text-primary'} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
