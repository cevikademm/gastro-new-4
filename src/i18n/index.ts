import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { LOCALES, DEFAULT_LOCALE, splitLocale } from '../lib/locales';
import tr from './tr.json';
import en from './en.json';
import de from './de.json';
import fr from './fr.json';
import nl from './nl.json';
import it from './it.json';
import es from './es.json';
import pt from './pt.json';
import pl from './pl.json';
import cs from './cs.json';
import ro from './ro.json';
import el from './el.json';
import sv from './sv.json';
import da from './da.json';
import hu from './hu.json';

const SUPPORTED: readonly string[] = LOCALES;

/**
 * Başlangıç dili (öncelik sırası):
 *  1) URL öneki (/tr/…, /en/…) — herkese açık sayfalarda dil = URL (SEO)
 *  2) localStorage tercihi (uygulama rotaları: dashboard, sepet …)
 *  3) tarayıcı dili
 *  4) Almanca (site varsayılanı — Almanya pazarı)
 * Kök yol (/kuehlung) her zaman Almanca'dır; kayıtlı tercih orada URL'yi ezmez
 * (LocaleLayout URL'den dili sabitler). Uygulama rotalarında tercih geçerlidir.
 */
function detectLang(): string {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const { locale, path } = splitLocale(window.location.pathname);
  if (locale !== DEFAULT_LOCALE) return locale;
  const first = path.split('/').filter(Boolean)[0] || '';
  const APP = ['dashboard', 'design', '3d-design', 'bom', 'katalog', 'checkout', 'kitchen-planner', 'cart', 'favorites', 'orders', 'teklifler', 'projects', 'settings', 'support', 'docs', 'profile', 'payment', 'brand-kit', 'account', 'developers', 'admin', 'login', 'register', 'pending-approval', 'forgot-password', 'old-welcome', 'tools', 'resources', 'degisiklikler'];
  if (!APP.includes(first)) return DEFAULT_LOCALE; // herkese açık kök = Almanca
  try {
    const stored = localStorage.getItem('2mc_lang');
    if (stored && SUPPORTED.includes(stored)) return stored;
  } catch {}
  const nav = (navigator.language || DEFAULT_LOCALE).slice(0, 2).toLowerCase();
  return SUPPORTED.includes(nav) ? nav : DEFAULT_LOCALE;
}

const savedLang = detectLang();

i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
    de: { translation: de },
    fr: { translation: fr },
    nl: { translation: nl },
    it: { translation: it },
    es: { translation: es },
    pt: { translation: pt },
    pl: { translation: pl },
    cs: { translation: cs },
    ro: { translation: ro },
    el: { translation: el },
    sv: { translation: sv },
    da: { translation: da },
    hu: { translation: hu },
  },
  lng: savedLang,
  fallbackLng: ['de', 'en', 'tr'],
  interpolation: {
    escapeValue: false,
  },
});

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    try { localStorage.setItem('2mc_lang', lng); } catch {}
    // Çerez sunucu için: api/render ülkeye göre yönlendirme yaparken bunu görüp
    // kullanıcının kendi seçimine saygı duyar (src/seo/server/geoLocale.ts).
    try { document.cookie = `2mc_lang=${lng}; path=/; max-age=31536000; samesite=lax`; } catch {}
    try { document.documentElement.lang = lng; } catch {}
  });
  try { document.documentElement.lang = savedLang; } catch {}
}

export default i18n;
