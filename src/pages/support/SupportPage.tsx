import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, HelpCircle, MessageSquare, Phone, Mail, Loader2, Inbox } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { createSupportTicket, fetchSupportTickets, type SupportTicket } from '../../lib/supportTickets';

// Destek biletlerinin gittiği kutu. Alıcıyı edge function sunucu tarafında
// sabitler (SUPPORT_INBOX); buradaki değer yalnızca hata durumundaki
// mailto yedeği ve ekranda gösterim içindir.
const SUPPORT_INBOX = 'info@2mcgastro.de';

// NOT: Buradaki SSS (akordiyon) bölümü 2026-09-06'da KALDIRILDI. `faq.q1..q10 /
// faq.a1..a10` anahtarları 15 dilin hiçbirinde yoktu; ekrana çeviri yerine ham
// anahtar basılıyordu. Geri kurulacaksa önce çeviriler yazılmalı (bkz. git
// geçmişi: bu dosyanın eski sürümü + `support.faq` başlık anahtarı duruyor).

export default function SupportPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState({ subject: '', message: '', priority: 'medium' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [emailWarning, setEmailWarning] = useState(false);

  const isAdmin = user?.role === 'admin';
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const loadTickets = useCallback(async () => {
    if (!isAdmin) return;
    setTicketsLoading(true);
    setTickets(await fetchSupportTickets());
    setTicketsLoading(false);
  }, [isAdmin]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  /**
   * Bileti önce support_tickets'a YAZAR, sonra e-posta bildirimini dener.
   * Sıra önemli: e-posta ikincildir, düşerse bilet yine de kayıtlıdır ve
   * yönetici zil bildiriminden (migration 050 trigger'ı) görür. Kayıt
   * başarısızsa form KORUNUR ve mailto yedeği sunulur.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim() || sending) return;
    setSending(true);
    setError('');
    setEmailWarning(false);

    const payload = {
      subject: form.subject.trim(),
      message: form.message.trim(),
      priority: form.priority,
      reporterName: user?.fullName || user?.email || '',
      reporterEmail: user?.email || '',
      reporterCompany: user?.company || '',
    };

    try {
      await createSupportTicket(payload);
    } catch (err) {
      setError((err as Error)?.message || t('support.sendFailed'));
      setSending(false);
      return;
    }

    // Buradan sonrası "en iyi çaba": bilet zaten kayıtlı, e-posta düşse de
    // kullanıcıya hata gösterip yeniden göndertmeyiz (mükerrer bilet olur).
    try {
      if (!supabase) throw new Error('no client');
      const { data, error: fnError } = await supabase.functions.invoke('send-email', {
        body: { template: 'support-ticket', to: SUPPORT_INBOX, replyTo: user?.email || undefined, data: payload },
      });
      if (fnError || data?.error) throw new Error(fnError?.message || String(data?.error));
    } catch {
      setEmailWarning(true);
    }

    setSubmitted(true);
    setForm({ subject: '', message: '', priority: 'medium' });
    setSending(false);
    setTimeout(() => setSubmitted(false), 5000);
    void loadTickets();
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
              <div className="bg-success-container text-success px-4 py-3 rounded-lg mb-4 text-sm font-medium border border-success/20">
                {t('support.ticketSubmitted')}
                {emailWarning && (
                  <p className="mt-1 font-normal opacity-80">{t('support.savedEmailFailed')}</p>
                )}
              </div>
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

          {/* Gelen kutusu — YALNIZCA yönetici. Listeyi asıl kısıtlayan RLS
              (migration 050); buradaki koşul sadece arayüzü sadeleştirir. */}
          {isAdmin && (
            <div className="bg-surface-container-lowest rounded-2xl shadow-[0_1px_3px_rgba(15,36,64,0.04),0_8px_24px_-12px_rgba(15,36,64,0.06)] p-6 sm:p-8 border border-outline-variant/40">
              <h2 className="font-headline font-bold text-primary uppercase tracking-[0.2em] text-xs mb-6 flex items-center gap-2">
                <span className="w-6 h-px bg-primary" />
                {t('support.adminInbox')}
                {tickets.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] tabular-nums">{tickets.length}</span>
                )}
              </h2>

              {ticketsLoading && tickets.length === 0 ? (
                <div className="py-8 text-center"><Loader2 size={18} className="animate-spin mx-auto text-on-surface-variant" /></div>
              ) : tickets.length === 0 ? (
                <div className="py-8 text-center text-sm text-on-surface-variant flex flex-col items-center gap-2">
                  <Inbox size={22} strokeWidth={1.5} className="opacity-50" />
                  {t('support.inboxEmpty')}
                </div>
              ) : (
                <ul className="divide-y divide-outline-variant/20 -my-3">
                  {tickets.map((ticket) => (
                    <li key={ticket.id} className="py-4">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-bold text-sm text-on-surface break-words">{ticket.subject}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          ticket.priority === 'critical' || ticket.priority === 'high'
                            ? 'bg-error-container text-error'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {t(`support.${ticket.priority}`)}
                        </span>
                        <span className="ml-auto text-[11px] text-on-surface-variant tabular-nums">
                          {new Date(ticket.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-on-surface-variant whitespace-pre-wrap break-words">{ticket.message}</p>
                      <p className="mt-2 text-[11px] text-on-surface-variant/80 break-words">
                        {ticket.reporter_name || ticket.reporter_email || t('support.inboxGuest')}
                        {ticket.reporter_email && ticket.reporter_name ? ` · ${ticket.reporter_email}` : ''}
                        {ticket.reporter_company ? ` · ${ticket.reporter_company}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
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
