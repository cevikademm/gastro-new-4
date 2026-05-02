import type React from 'react';
import { useState } from 'react';
import { X, Mail, CheckCircle2 } from 'lucide-react';
import { submitLead, type LeadSource } from '../lib/leadCapture';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  source: LeadSource;
  title?: string;
  description?: string;
  cta?: string;
};

export default function LeadCaptureModal({
  open,
  onClose,
  onSuccess,
  source,
  title = 'Devam etmek için email adresinizi girin',
  description = 'Profesyonel içerikler, yeni ürünler ve özel fırsatlar için.',
  cta = 'Devam Et',
}: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Geçerli bir email adresi girin.');
      return;
    }
    setLoading(true);
    try {
      await submitLead(email, source);
      setDone(true);
      onSuccess?.();
      setTimeout(onClose, 1200);
    } catch {
      setError('Bir sorun oluştu, tekrar deneyin.');
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
          aria-label="Kapat"
        >
          <X size={20} />
        </button>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="mx-auto text-green-500 mb-3" size={48} />
            <h3 className="text-xl font-bold text-slate-900">Teşekkürler!</h3>
            <p className="mt-2 text-slate-600">Email adresiniz kaydedildi.</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4">
              <Mail className="text-[#E85D26]" size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-600">{description}</p>

            <form onSubmit={handleSubmit} className="mt-5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@sirketiniz.com"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:border-[#E85D26] focus:ring-2 focus:ring-red-100"
                autoFocus
                required
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="mt-3 w-full py-3 bg-[#E85D26] text-white rounded-xl font-bold hover:bg-[#C44A1A] disabled:opacity-50 transition"
              >
                {loading ? 'Gönderiliyor…' : cta}
              </button>
              <p className="mt-3 text-xs text-slate-400 text-center">
                Email adresinizi spam için kullanmıyoruz. İstediğiniz zaman çıkabilirsiniz.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
