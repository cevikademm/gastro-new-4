import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useRFQStore } from '../../stores/rfqStore';
import { createQuoteRequestFromCart } from '../../lib/rfq';
import {
  FileText, Send, ChevronRight, Calendar, User, Building2, Mail, Phone,
  AlertCircle, CheckCircle, Package
} from 'lucide-react';

export default function RFQPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const user = useAuthStore((s) => s.user);
  const { createQuoteRequest, quoteRequests } = useRFQStore();

  const [step, setStep] = useState<'list' | 'new'>('list');
  const [form, setForm] = useState({
    contactName: user?.fullName || '',
    contactEmail: user?.email || '',
    contactPhone: user?.phone || '',
    message: '',
    requestedDeliveryDate: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const myRequests = user ? quoteRequests.filter((r) => r.customerId === user.id) : [];

  const handleSubmit = async () => {
    if (!user || items.length === 0) return;

    setLoading(true);
    try {
      const request = createQuoteRequestFromCart(
        items,
        user.id,
        user.company || 'Privatkunde',
        form.contactName,
        form.contactEmail,
        form.contactPhone,
        form.message,
        form.requestedDeliveryDate ? new Date(form.requestedDeliveryDate) : undefined
      );

      createQuoteRequest(request);
      setSubmitted(true);
      setTimeout(() => {
        setStep('list');
        setSubmitted(false);
        setForm({
          contactName: user.fullName || '',
          contactEmail: user.email || '',
          contactPhone: user.phone || '',
          message: '',
          requestedDeliveryDate: '',
        });
      }, 2000);
    } catch (err) {
      console.error('Error submitting quote request:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (p: number) =>
    p > 0 ? `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });

  if (step === 'new') {
    return (
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Back */}
        <button
          onClick={() => setStep('list')}
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-bold"
        >
          ← {t('common.back')}
        </button>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black font-headline text-on-surface tracking-tight flex items-center gap-3">
            <FileText size={28} className="text-primary" />
            {t('rfq.newRequest', 'Neues Angebot anfordern')}
          </h1>
          <p className="text-on-surface-variant mt-1">
            {items.length} {t('common.products')} · {formatPrice(useCartStore((s) => s.getTotalPrice()))}
          </p>
        </div>

        {/* Form */}
        {!submitted ? (
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 p-6 space-y-6">
            {/* Contact Info */}
            <div className="space-y-4">
              <h2 className="font-bold text-primary uppercase tracking-wider text-sm">{t('rfq.contactInfo', 'Kontaktinformation')}</h2>
              <div className="grid gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('common.name')}</label>
                  <input
                    type="text"
                    value={form.contactName}
                    onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('common.email')}</label>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                      className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('common.phone')}</label>
                    <input
                      type="tel"
                      value={form.contactPhone}
                      onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                      className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Request Details */}
            <div className="space-y-4 border-t border-outline-variant/20 pt-6">
              <h2 className="font-bold text-primary uppercase tracking-wider text-sm">{t('rfq.requestDetails', 'Anforderungsdetails')}</h2>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('rfq.deliveryDate', 'Gewünschtes Lieferdatum')}</label>
                <input
                  type="date"
                  value={form.requestedDeliveryDate}
                  onChange={(e) => setForm({ ...form, requestedDeliveryDate: e.target.value })}
                  className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">{t('rfq.message', 'Nachricht')}</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder={t('rfq.messagePlaceholder', 'Spezielle Wünsche, Anforderungen oder Fragen...')}
                  className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none resize-none h-24"
                />
              </div>
            </div>

            {/* Items Preview */}
            <div className="bg-surface-container rounded-lg p-4">
              <h3 className="font-bold text-sm text-on-surface mb-3">{t('common.products')}</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">{item.product.name}</span>
                    <span className="font-mono">{item.quantity}x</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-outline-variant/20">
              <button
                onClick={() => setStep('list')}
                className="flex-1 py-3 rounded-lg border border-outline-variant/30 text-on-surface-variant font-bold hover:bg-surface-container-low transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !form.contactName || !form.contactEmail}
                className="flex-1 py-3 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Send size={16} /> {t('rfq.sendRequest', 'Anfrage senden')}</>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Success Message */
          <div className="bg-success-container rounded-xl p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-success/20 rounded-full flex items-center justify-center">
              <CheckCircle size={32} className="text-success" />
            </div>
            <h2 className="text-xl font-bold text-on-surface">{t('rfq.requestSent', 'Anfrage versendet!')}</h2>
            <p className="text-on-surface-variant">{t('rfq.requestSentDesc', 'Wir werden Ihre Anfrage baldmöglichst bearbeiten und Ihnen ein Angebot zusenden.')}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-headline text-on-surface tracking-tight flex items-center gap-3">
            <FileText size={28} className="text-primary" /> {t('rfq.title', 'Angebote anfordern')}
          </h1>
          <p className="text-on-surface-variant mt-1">{t('rfq.subtitle', 'Verwalten Sie Ihre Angebotsanfragen')}</p>
        </div>
        <button
          onClick={() => items.length > 0 ? setStep('new') : alert(t('rfq.cartEmpty', 'Ihr Warenkorb ist leer'))}
          className="brushed-metal text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all hover:opacity-90 active:scale-95 flex items-center gap-2"
        >
          <Send size={18} /> {t('rfq.newRequest', 'Neues Angebot anfordern')}
        </button>
      </div>

      {/* Empty State */}
      {myRequests.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 px-6 py-16 text-center">
          <Package size={48} className="mx-auto text-on-surface-variant/30 mb-4" />
          <p className="text-on-surface-variant font-medium">{t('rfq.noRequests', 'Sie haben noch keine Anfragen')}</p>
          <button
            onClick={() => items.length > 0 ? setStep('new') : alert(t('rfq.cartEmpty', 'Ihr Warenkorb ist leer'))}
            className="text-primary font-bold text-sm mt-4 hover:underline"
          >
            {t('rfq.createFirst', 'Erste Anfrage erstellen')} →
          </button>
        </div>
      ) : (
        /* Requests List */
        <div className="space-y-3">
          {myRequests.map((request) => {
            const REQUEST_COLORS: Record<typeof request.status, string> = {
              pending: 'bg-yellow-100 text-yellow-700',
              quoted: 'bg-red-100 text-[#7B1F26]',
              accepted: 'bg-green-100 text-green-700',
              rejected: 'bg-red-100 text-red-700',
              expired: 'bg-gray-100 text-gray-700',
            };

            return (
              <button
                key={request.id}
                onClick={() => navigate(`/rfq/${request.id}`)}
                className="w-full bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 p-5 hover:border-primary/30 transition-all text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${REQUEST_COLORS[request.status]}`}>
                        {request.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-on-surface-variant">{formatDate(request.createdAt)}</span>
                    </div>
                    <h3 className="font-bold text-on-surface mb-1">{request.companyName}</h3>
                    <p className="text-xs text-on-surface-variant mb-2 flex items-center gap-1">
                      <Package size={12} /> {request.items.length} {t('common.products')}
                    </p>
                    {request.message && (
                      <p className="text-xs text-on-surface-variant italic line-clamp-1">"{request.message}"</p>
                    )}
                  </div>
                  <ChevronRight size={18} className="text-on-surface-variant flex-shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
