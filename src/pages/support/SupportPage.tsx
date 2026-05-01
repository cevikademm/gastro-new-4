import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, HelpCircle, ChevronDown, ChevronUp, MessageSquare, Phone, Mail } from 'lucide-react';

const faqData = [
  { q: 'Nasıl yeni proje oluşturabilirim?', a: 'Sol menüden "Projeler" sayfasına gidin ve "Yeni Proje" butonuna tıklayın. Proje adı, alan ve müşteri bilgilerini girerek projenizi oluşturabilirsiniz.' },
  { q: 'BOM\'u nasıl dışa aktarırım?', a: 'Malzeme Listesi sayfasında "PDF Olarak Dışa Aktar" veya "CSV Olarak Dışa Aktar" butonlarını kullanabilirsiniz.' },
  { q: 'Ekipmanı plana nasıl eklerim?', a: 'Ekipman kataloğundan istediğiniz ekipmanı bulun ve "Plana Ekle" butonuna tıklayın. Ardından Tasarım Stüdyosu\'nda ekipmanı yerleştirebilirsiniz.' },
  { q: 'Dil ayarlarını nasıl değiştiririm?', a: 'Ayarlar > Dil ve Bölge bölümünden istediğiniz dili seçebilirsiniz. Türkçe, İngilizce ve Almanca desteklenmektedir.' },
  { q: 'Teknik destek nasıl alabilirim?', a: 'Bu sayfadaki formu kullanarak destek bileti oluşturabilir veya doğrudan support@2mcgastro.com adresine e-posta gönderebilirsiniz.' },
];

export default function SupportPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ subject: '', message: '', priority: 'medium' });
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject || !form.message) return;
    setSubmitted(true);
    setForm({ subject: '', message: '', priority: 'medium' });
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-8">
      <h1 className="font-headline text-2xl sm:text-3xl font-black text-on-surface tracking-tight">{t('support.title')}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-8 border border-outline-variant/10">
            <h2 className="font-headline font-bold text-primary uppercase tracking-wider text-sm mb-6">{t('support.submitTicket')}</h2>

            {submitted && (
              <div className="bg-emerald-50 text-emerald-800 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{t('support.ticketSubmitted')}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('support.subject')}</label>
                <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('support.priority')}</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none">
                  <option value="low">{t('support.low')}</option>
                  <option value="medium">{t('support.medium')}</option>
                  <option value="high">{t('support.high')}</option>
                  <option value="critical">{t('support.critical')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('support.message')}</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={5} required className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" />
              </div>
              <button type="submit" className="flex items-center gap-2 brushed-metal text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:opacity-90 transition-all">
                <Send size={18} /> {t('support.send')}
              </button>
            </form>
          </div>

          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-8 border border-outline-variant/10">
            <h2 className="font-headline font-bold text-primary uppercase tracking-wider text-sm mb-6">{t('support.faq')}</h2>
            <div className="space-y-3">
              {faqData.map((faq, i) => (
                <div key={i} className="border border-outline-variant/10 rounded-lg overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-surface-container-high transition-colors">
                    <span className="text-sm font-medium text-on-surface">{faq.q}</span>
                    {openFaq === i ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {openFaq === i && (
                    <div className="px-4 pb-4 text-sm text-on-surface-variant">{faq.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-primary-container p-6 rounded-xl text-white">
            <MessageSquare size={28} className="mb-4" />
            <h3 className="font-headline font-bold text-lg mb-2">{t('support.contactUs')}</h3>
            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} /> support@2mcgastro.com
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} /> +49 30 123 456 78
              </div>
            </div>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
            <HelpCircle size={24} className="text-primary mb-3" />
            <h3 className="font-headline font-bold text-sm text-primary mb-2">{t('docs.title')}</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">Detaylı kullanım kılavuzları ve video eğitimler için dokümantasyon sayfamızı ziyaret edin.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
