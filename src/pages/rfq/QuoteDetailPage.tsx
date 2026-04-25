import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useRFQStore } from '../../stores/rfqStore';
import { getQuoteExpirationStatus } from '../../lib/rfq';
import {
  FileText, ArrowLeft, Clock, CheckCircle, AlertCircle, X,
  Download, Euro, Package
} from 'lucide-react';

export default function QuoteDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getQuoteById, updateQuoteStatus } = useRFQStore();
  const [showConfirmReject, setShowConfirmReject] = useState(false);

  const quote = id ? getQuoteById(id) : undefined;
  const expiration = quote ? getQuoteExpirationStatus(quote) : null;

  if (!quote) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center">
        <p className="text-on-surface-variant">{t('rfq.notFound', 'Angebot nicht gefunden')}</p>
        <Link to="/rfq" className="text-primary font-bold text-sm mt-4 inline-block hover:underline">
          ← {t('rfq.backToRequests', 'Zurück zu Anfragen')}
        </Link>
      </div>
    );
  }

  const formatPrice = (p: number) =>
    `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`;

  const formatDate = (d: Date) =>
    new Date(d).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      {/* Back */}
      <Link
        to="/rfq"
        className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors font-medium"
      >
        <ArrowLeft size={16} /> {t('rfq.backToRequests', 'Zurück zu Anfragen')}
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black font-headline text-on-surface tracking-tight flex items-center gap-3">
            <FileText size={24} className="text-primary" />
            {quote.quoteNumber}
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {t('rfq.createdOn', 'Erstellt am')} {formatDate(quote.createdAt)}
          </p>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm bg-blue-50 border-blue-200 text-blue-700">
          <FileText size={16} /> {quote.status.toUpperCase()}
        </div>
      </div>

      {/* Expiration Warning */}
      {expiration && (
        <div
          className={`rounded-xl p-4 border flex items-start gap-3 ${
            expiration.isExpired
              ? 'bg-error-container/20 border-error/30 text-error'
              : expiration.isExpiringSoon
              ? 'bg-warning-container border-warning/30 text-on-warning-container'
              : 'bg-info-container border-info/30 text-on-info-container'
          }`}
        >
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            {expiration.isExpired ? (
              <p className="font-bold">{t('rfq.quoteExpired', 'Dieses Angebot ist abgelaufen')}</p>
            ) : (
              <>
                <p className="font-bold">
                  {t('rfq.quoteExpires', 'Gültig bis')} {formatDate(expiration.expiresAt)}
                </p>
                {expiration.isExpiringSoon && (
                  <p className="text-xs mt-1">
                    {t('rfq.daysRemaining', '{{days}} Tage verbleibend', { days: expiration.daysRemaining })}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Quote Details */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
        <div className="px-5 py-3.5 bg-surface-container border-b border-outline-variant/10">
          <h2 className="font-headline font-bold text-sm text-primary uppercase tracking-wider">
            {t('rfq.quoteDetails', 'Angebotsdetails')}
          </h2>
        </div>

        {/* Details Grid */}
        <div className="grid sm:grid-cols-2 gap-4 p-5">
          <div>
            <p className="text-xs text-on-surface-variant font-bold uppercase">{t('rfq.validFrom', 'Gültig ab')}</p>
            <p className="font-mono font-bold text-on-surface mt-1">{formatDate(quote.validFrom)}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-bold uppercase">{t('rfq.validUntil', 'Gültig bis')}</p>
            <p className="font-mono font-bold text-on-surface mt-1">{formatDate(quote.validUntil)}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-bold uppercase">{t('rfq.paymentTerms', 'Zahlungsbedingungen')}</p>
            <p className="text-sm text-on-surface mt-1">{quote.paymentTerms}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-bold uppercase">{t('rfq.deliveryTerms', 'Lieferbedingungen')}</p>
            <p className="text-sm text-on-surface mt-1">{quote.deliveryTerms}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 overflow-hidden">
        <div className="px-5 py-3.5 bg-surface-container border-b border-outline-variant/10">
          <h2 className="font-headline font-bold text-sm text-primary uppercase tracking-wider">
            {t('common.products')} ({quote.items.length})
          </h2>
        </div>
        <div className="divide-y divide-outline-variant/10">
          {quote.items.map((item) => (
            <div key={item.productId} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-on-surface truncate">{item.productName}</p>
                <p className="text-xs font-mono text-on-surface-variant mt-0.5">{item.productId}</p>
              </div>
              <div className="text-right text-xs text-on-surface-variant hidden sm:block">
                <p className="flex items-center justify-end gap-1">
                  <Euro size={10} /> {formatPrice(item.unitPrice)}
                </p>
                <p className="text-[10px]">{t('cart.unitPrice', 'Einheitspreis')}</p>
              </div>
              <div className="bg-primary/10 text-primary font-bold text-sm px-3 py-1 rounded-lg">
                ×{item.quantity}
              </div>
              <div className="text-right font-mono font-bold text-sm text-primary w-24 hidden sm:block">
                {formatPrice(item.quantity * item.unitPrice)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Summary */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm p-6">
        <div className="flex flex-col gap-3 max-w-sm ml-auto">
          <div className="flex justify-between text-sm text-on-surface-variant">
            <span>{t('common.subtotal')}</span>
            <span className="font-mono">{formatPrice(quote.subtotal)}</span>
          </div>
          {quote.volumeDiscount > 0 && (
            <div className="flex justify-between text-sm text-success">
              <span>-{quote.volumeDiscount}% {t('rfq.volumeDiscount', 'Mengenrabatt')}</span>
              <span className="font-mono">-{formatPrice(quote.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-on-surface-variant">
            <span>{t('common.subtotal')} {t('rfq.afterDiscount', 'nach Rabatt')}</span>
            <span className="font-mono">{formatPrice(quote.subtotalAfterDiscount)}</span>
          </div>
          <div className="flex justify-between text-sm text-on-surface-variant">
            <span>{t('common.vat')} ({quote.vatRate}%)</span>
            <span className="font-mono">{formatPrice(quote.vatAmount)}</span>
          </div>
          <div className="border-t border-outline-variant/20 pt-3 flex justify-between font-headline font-black text-lg text-primary">
            <span>{t('common.total')}</span>
            <span>{formatPrice(quote.total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/10 p-5">
          <h3 className="font-headline font-bold text-sm text-primary uppercase tracking-wider mb-2">
            {t('rfq.notes', 'Notizen')}
          </h3>
          <p className="text-sm text-on-surface-variant">{quote.notes}</p>
        </div>
      )}

      {/* Actions */}
      {quote.status !== 'accepted' && quote.status !== 'rejected' && !expiration?.isExpired && (
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              updateQuoteStatus(quote.id, 'accepted');
              navigate('/orders');
            }}
            className="flex-1 py-3 rounded-lg bg-success hover:bg-success/90 text-white font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <CheckCircle size={16} /> {t('rfq.acceptQuote', 'Angebot akzeptieren')}
          </button>
          <button
            onClick={() => setShowConfirmReject(true)}
            className="flex-1 py-3 rounded-lg border border-error/30 text-error hover:bg-error-container/20 font-bold transition-colors"
          >
            <X size={16} /> {t('rfq.rejectQuote', 'Angebot ablehnen')}
          </button>
        </div>
      )}

      {/* Reject Confirmation */}
      {showConfirmReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-on-surface">{t('rfq.confirmReject', 'Angebot ablehnen?')}</h2>
            <p className="text-sm text-on-surface-variant">
              {t('rfq.confirmRejectDesc', 'Sind Sie sicher, dass Sie dieses Angebot ablehnen möchten?')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmReject(false)}
                className="flex-1 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-bold hover:bg-surface-container-low transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  updateQuoteStatus(quote.id, 'rejected');
                  navigate('/rfq');
                }}
                className="flex-1 py-2.5 rounded-lg bg-error text-white font-bold hover:bg-error/90 transition-colors"
              >
                {t('rfq.confirmRejectButton', 'Ablehnen')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
