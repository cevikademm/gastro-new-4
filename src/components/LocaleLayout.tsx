/**
 * LocaleLayout — `/` (de) ve `/:locale/…` rotalarını saran dil katmanı.
 * URL'deki dil → i18next + <html lang>; geçersiz kod → 404.
 * Sayfa dili URL'den gelir; localStorage tercihi yalnızca uygulama rotalarında
 * (dashboard vb.) belirleyicidir.
 */
import { useLayoutEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../lib/locales';
import { LocaleContext } from '../lib/useLocalePath';
import NotFoundPage from '../pages/NotFoundPage';

export default function LocaleLayout({ locale: fixed }: { locale?: Locale }) {
  const params = useParams<{ locale?: string }>();
  const { i18n } = useTranslation();
  const raw = fixed ?? params.locale ?? DEFAULT_LOCALE;
  const valid = isLocale(raw);
  const locale: Locale = valid ? raw : DEFAULT_LOCALE;

  useLayoutEffect(() => {
    if (!valid) return;
    if (i18n.language !== locale) void i18n.changeLanguage(locale);
    try { document.documentElement.lang = locale; } catch { /* SSR yok */ }
  }, [locale, valid, i18n]);

  if (!valid) return <NotFoundPage />;

  return (
    <LocaleContext.Provider value={locale}>
      <Outlet />
    </LocaleContext.Provider>
  );
}
