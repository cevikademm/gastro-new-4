import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/uiStore';
import { Shield } from 'lucide-react';

export default function CookieBanner() {
  const { t } = useTranslation();
  const { cookieConsent, setCookieConsent } = useUIStore();

  if (cookieConsent !== null) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] max-w-[100vw] overflow-hidden bg-surface-container-lowest border-t border-outline-variant/20 shadow-2xl p-4 md:p-6">
      <div className="max-w-5xl mx-auto flex min-w-0 flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Shield size={20} className="text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-on-surface">{t('gdpr.cookieConsent')}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <a href="#" className="text-xs text-primary hover:underline">{t('gdpr.privacyPolicy')}</a>
              <a href="#" className="text-xs text-primary hover:underline">{t('gdpr.cookiePolicy')}</a>
              <a href="#" className="text-xs text-primary hover:underline">{t('gdpr.impressum')}</a>
            </div>
          </div>
        </div>
        <div className="flex w-full min-w-0 gap-3 sm:w-auto shrink-0">
          <button onClick={() => setCookieConsent(false)} className="min-w-0 flex-1 px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-colors sm:flex-none sm:px-5">
            {t('gdpr.decline')}
          </button>
          <button onClick={() => setCookieConsent(true)} className="min-w-0 flex-1 px-4 py-2 text-sm font-bold brushed-metal text-white rounded-lg shadow-sm hover:opacity-90 transition-all sm:flex-none sm:px-5">
            {t('gdpr.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
