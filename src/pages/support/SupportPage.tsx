import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, HelpCircle, ChevronDown, ChevronUp, MessageSquare, Phone, Mail, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// Destek biletlerinin gittiği kutu. Alıcıyı edge function sunucu tarafında
// sabitler (SUPPORT_INBOX); buradaki değer yalnızca hata durumundaki
// mailto yedeği ve ekranda gösterim içindir.
const SUPPORT_INBOX = 'info@2mcgastro.de';

// SSS içerikleri i18n'de `faq.q1..q10 / faq.a1..a10` altında yaşar (15 dilde).
// Sıra: teklif → sipariş → ödeme → fiyat → 3D tasarım → kayıt → teslimat →
// markalar → danışmanlık → garanti (satış hunisindeki doğal akış).
const faqData = Array.from({ length: 10 }, (_, i) => ({
  qKey: `faq.q${i + 1}`,
  aKey: `faq.a${i + 1}`,
}));

export default function SupportPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState({ subject: '', message: '', priority: 'medium' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  /**
   * Bileti send-email edge function'ı üzerinden info@2mcgastro.de'ye yollar.
   * Alıcıyı function sabitler; yanıtla adresi bileti açan kullanıcıdır.
   * Gönderim başarısızsa form KORUNUR ve mailto yedeği sunulur — eskiden
   * hiçbir şey gönderilmeden "başarıyla oluşturuldu" yazılıyordu.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      if (!supabase) throw new Error('Supabase yapılandırılmamış.');
      const { data, error: fnError } = await supabase.functions.invoke('send-email', {
        body: {
          template: 'support-ticket',
          to: SUPPORT_INBOX,
          replyTo: user?.email || undefined,
          data: {
            subject: form.subject.trim(),
            message: form.message.trim(),
            priority: form.priority,
            reporterName: user?.fullName || user?.email || '',
            reporterEmail: user?.email || '',
            reporterCompany: user?.company || '',
          },
        },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(String(data.error));

      setSubmitted(true);
      setForm({ subject: '', message: '', priority: 'medium' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setError((err as Error)?.message || t('support.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  // Gönderim başarısızsa kullanıcı yazdığını kaybetmesin — hazır mailto.
  const mailtoFallback = `mailto:${SUPPORT_INBOX}?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(form.message)}`;

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8 py-8 px-4 sm:px-6">
      <div className="reveal">
        <h1 className="font-headline text-3xl sm:text-4xl font-black text-on-surface tracking-tight">{t('support.title')}</h1>
        <p className="text-on-surface-variant text-sm mt-1.5">{t('support.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl shadow-[0_1px_3px_rgba(15,36,64,0.04),0_8px_24px_-12px_rgba(15,36,64,0.06)] p-6 sm:p-8 border border-outline-variant/40">
            <h2 className="font-headline font-bold text-primary uppercase tracking-[0.2em] text-xs mb-6 flex items-center gap-2">
              <span className="w-6 h-px bg-primary" />
              {t('support.submitTicket')}
            </h2>

            {submitted && (
              <div className="bg-success-container text-success px-4 py-3 rounded-lg mb-4 text-sm font-medium border border-success/20">{t('support.ticketSubmitted')}</div>
            )}

            {error && (
              <div className="bg-error-container text-error px-4 py-3 rounded-lg mb-4 text-sm border border-error/20">
                <p className="font-semibold">{t('support.sendFailed')}</p>
                <p className="mt-1 opacity-80 break-words">{error}</p>
                <a href={mailtoFallback} className="inline-block mt-2 font-bold underline">
                  {SUPPORT_INBOX}
                </a>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.18em] mb-2">{t('support.subject')}</label>
                <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.18em] mb-2">{t('support.priority')}</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors">
                  <option value="low">{t('support.low')}</option>
                  <option value="medium">{t('support.medium')}</option>
                  <option value="high">{t('support.high')}</option>
                  <option value="critical">{t('support.critical')}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.18em] mb-2">{t('support.message')}</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} required className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg py-3 px-4 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none resize-none transition-colors" />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 brushed-metal text-white px-7 py-3.5 rounded-xl font-bold shadow-lg text-sm disabled:opacity-70 disabled:cursor-wait"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? t('support.sending') : t('support.send')}
              </button>
            </form>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl shadow-[0_1px_3px_rgba(15,36,64,0.04),0_8px_24px_-12px_rgba(15,36,64,0.06)] p-6 sm:p-8 border border-outline-variant/40">
            <h2 className="font-headline font-bold text-primary uppercase tracking-[0.2em] text-xs mb-6 flex items-center gap-2">
              <span className="w-6 h-px bg-primary" />
              {t('support.faq')}
            </h2>
            <div className="space-y-2">
              {faqData.map((faq, i) => {
                const open = openFaq === i;
                return (
                  <div key={i} className={`border rounded-xl overflow-hidden transition-colors ${open ? 'border-primary/30 bg-primary-fixed/40' : 'border-outline-variant/40 hover:border-outline-variant'}`}>
                    <button type="button" onClick={() => setOpenFaq(open ? null : i)} className="w-full flex items-center justify-between p-4 text-left">
                      <span className="text-sm font-medium text-on-surface pr-4">{t(faq.qKey)}</span>
                      {open ? <ChevronUp size={16} className="text-primary shrink-0" /> : <ChevronDown size={16} className="text-on-surface-variant shrink-0" />}
                    </button>
                    {open && (
                      <div className="px-4 pb-4 text-sm text-on-surface-variant leading-relaxed">{t(faq.aKey)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[var(--c-navy-deep)] to-[var(--c-navy)] p-6 rounded-2xl text-white shadow-[0_12px_32px_-12px_rgba(15,36,64,0.4)]">
            <MessageSquare size={26} className="mb-4 text-[var(--c-clay-soft)]" strokeWidth={1.5} />
            <h3 className="font-headline font-bold text-lg mb-1">{t('support.contactUs')}</h3>
            <p className="text-white/60 text-xs mb-5 leading-relaxed">{t('support.businessHours')}</p>
            <div className="space-y-3 text-sm border-t border-white/10 pt-4">
              <a href="mailto:info@2mcgastro.de" className="flex items-center gap-3 text-white/85 hover:text-white transition-colors">
                <Mail size={14} className="text-[var(--c-clay-soft)]" /> info@2mcgastro.de
              </a>
              <a href="tel:+493012345678" className="flex items-center gap-3 text-white/85 hover:text-white transition-colors">
                <Phone size={14} className="text-[var(--c-clay-soft)]" /> +49 30 123 456 78
              </a>
            </div>
          </div>
          <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/40">
            <HelpCircle size={22} className="text-primary mb-3" strokeWidth={1.5} />
            <h3 className="font-headline font-bold text-sm text-on-surface mb-2">{t('docs.title')}</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">{t('support.docsCardDesc')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
