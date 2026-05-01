import type React from 'react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Sparkles, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NewsletterSection() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setStatus('loading');
    await new Promise((r) => setTimeout(r, 800));
    try {
      const list = JSON.parse(localStorage.getItem('gastro.newsletter') || '[]');
      if (!list.includes(email)) list.push(email);
      localStorage.setItem('gastro.newsletter', JSON.stringify(list));
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="relative w-full max-w-6xl mt-10 rounded-3xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#7B1F26] via-[#5A1219] to-[#0F2440]" />
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="relative z-10 p-6 sm:p-10 md:p-14 text-center text-white">
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', damping: 15 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold mb-4"
        >
          <Sparkles size={14} /> {t('newsletter.badge', '%10 HOŞGELDİN İNDİRİMİ')}
        </motion.div>

        <h2 className="text-xl sm:text-3xl md:text-4xl font-black mb-3 leading-tight">
          {t('newsletter.title', 'Fırsatları İlk Siz Öğrenin')}
        </h2>
        <p className="text-white/80 max-w-md mx-auto mb-6 text-sm">
          {t('newsletter.desc', 'Kampanyalar, yeni ürünler ve sektör rehberleri doğrudan e-postanızda.')}
        </p>

        {status === 'success' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-xl font-bold"
          >
            <Check size={20} /> {t('newsletter.success', 'Kayıt tamam! İndirim kodu e-postanıza gönderildi.')}
          </motion.div>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsletter.placeholder', 'E-posta adresiniz')}
                required
                className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/15 backdrop-blur-sm border border-white/30 text-white placeholder:text-white/60 focus:bg-white/25 focus:border-white outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'loading'}
              className="h-12 px-6 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 disabled:opacity-60 flex items-center justify-center gap-2 transition shadow-lg"
            >
              {status === 'loading' ? <Loader2 size={18} className="animate-spin" /> : t('newsletter.submit', 'Abone Ol')}
            </button>
          </form>
        )}

        <p className="text-[11px] text-white/60 mt-4">
          {t('newsletter.privacy', 'Spam yok. İstediğiniz zaman abonelikten çıkabilirsiniz.')}
        </p>
      </div>
    </section>
  );
}
