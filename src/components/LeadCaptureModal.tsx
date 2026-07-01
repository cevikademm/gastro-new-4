import type React from 'react';
import { useState } from 'react';
import { X, Mail, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { submitLead, type LeadSource } from '../lib/leadCapture';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  source: LeadSource;
};

export default function LeadCaptureModal({
  open,
  onClose,
  onSuccess,
  source,
}: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('leadCapture.validation.invalidEmail'));
      return;
    }
    setLoading(true);
    try {
      await submitLead(email, source);
      setDone(true);
      onSuccess?.();
      setTimeout(onClose, 1500); // Biraz daha uzun gösterelim
    } catch {
      setError(t('leadCapture.error.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
          aria-label={t('common.close')}
        >
          <X size={20} />
        </button>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="mx-auto text-success mb-3" size={48} />
            <h3 className="text-xl font-bold text-on-surface">{t('leadCapture.success.title')}</h3>
            <p className="mt-2 text-on-surface-variant">{t('leadCapture.success.message')}</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 bg-error-container rounded-xl flex items-center justify-center mb-4">
              <Mail className="text-error" size={24} />
            </div>
            <h3 className="text-xl font-bold text-on-surface">{t('leadCapture.title')}</h3>
            <p className="mt-2 text-sm text-on-surface-variant">{t('leadCapture.description')}</p>

            <form onSubmit={handleSubmit} className="mt-5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('leadCapture.placeholder.email')}
                className="w-full px-4 py-3 border border-outline-variant/50 rounded-xl focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
                autoFocus
                required
              />
              {error && <p className="mt-2 text-sm text-error">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-3 w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-container disabled:opacity-50 transition"
              >
                {loading ? t('common.sending') : t('leadCapture.cta')}
              </button>
              <p className="mt-3 text-xs text-on-surface-variant text-center">
                {t('leadCapture.disclaimer')}
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
