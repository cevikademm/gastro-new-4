import type React from 'react';
import { useState } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { submitLead } from '../lib/leadCapture';

type Props = {
  variant?: 'inline' | 'card';
  title?: string;
  description?: string;
};

export default function NewsletterSignup({
  variant = 'card',
  title,
  description,
}: Props) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('newsletter.chefTitle');
  const resolvedDescription = description ?? t('newsletter.chefDescription');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('newsletter.invalidEmail'));
      return;
    }
    setLoading(true);
    try {
      await submitLead(email, 'newsletter');
      setDone(true);
    } catch {
      setError(t('newsletter.errorTryAgain'));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-3 text-green-600">
        <CheckCircle2 size={20} />
        <span className="text-sm font-medium">Abone olduğunuz için teşekkürler!</span>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@sirketiniz.com"
          className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-[#DC2626]"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-[#DC2626] text-white rounded-lg text-sm font-bold hover:bg-[#991B1B] disabled:opacity-50 transition"
        >
          {loading ? '...' : 'Abone Ol'}
        </button>
      </form>
    );
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-[#DC2626] rounded-xl flex items-center justify-center">
          <Mail className="text-white" size={20} />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{resolvedTitle}</h3>
      </div>
      <p className="text-sm text-slate-600 mb-4">{resolvedDescription}</p>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@sirketiniz.com"
          className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#DC2626]"
          required
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#DC2626] text-white rounded-xl font-bold hover:bg-[#991B1B] disabled:opacity-50 transition"
        >
          {loading ? 'Gönderiliyor…' : 'Abone Ol'}
        </button>
      </form>

      <p className="mt-3 text-xs text-slate-400">
        Spam yok, istediğiniz zaman çıkabilirsiniz.
      </p>
    </div>
  );
}
