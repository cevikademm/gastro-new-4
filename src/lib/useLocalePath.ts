/**
 * useLocalePath — locale önekli iç bağlantılar için tek yardımcı.
 *   const lp = useLocalePath();  <Link to={lp('/kuehlung')}>  → '/kuehlung' (de) | '/tr/kuehlung' (tr)
 * Uygulama rotaları (/dashboard, /cart …) öneksiz kalır → `appPath()` kullan.
 */
import { createContext, useContext, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { DEFAULT_LOCALE, localePath, splitLocale, type Locale } from './locales';

export const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useLocalePath(): (path: string) => string {
  const locale = useLocale();
  return useCallback((path: string) => localePath(locale, path), [locale]);
}

/** Mevcut yolu başka bir dile taşır: swapLocale('/tr/kuehlung?page=2','en') → '/en/kuehlung?page=2' */
export function swapLocale(pathname: string, search: string, target: Locale): string {
  const { path } = splitLocale(pathname);
  return localePath(target, path) + (search || '');
}

/** Sayfa dili URL'den (yalnızca hook dışı kullanım). */
export function localeFromPathname(pathname: string): Locale {
  return splitLocale(pathname).locale;
}

export function useCurrentLocaleFromUrl(): Locale {
  const { pathname } = useLocation();
  return localeFromPathname(pathname);
}
