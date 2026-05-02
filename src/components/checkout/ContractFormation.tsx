import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, AlertCircle } from 'lucide-react';

interface ContractFormationProps {
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function ContractFormation({
  items,
  subtotal,
  shippingCost,
  tax,
  total,
  onConfirm,
  isLoading = false,
}: ContractFormationProps) {
  const { t } = useTranslation();
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeCancel, setAgreeCancel] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const canSubmit = agreeTerms && agreeCancel && agreePrivacy && !isLoading;

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
        <h3 className="font-bold text-slate-900 mb-4">
          {t('checkout.orderSummary', 'Bestellübersicht')}
        </h3>

        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 mb-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between text-sm"
            >
              <div>
                <p className="font-medium text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500">
                  {t('checkout.quantity')}: {item.quantity}x @ €{(item.price || 0).toFixed(2)}
                </p>
              </div>
              <p className="font-semibold text-slate-900">
                €{((item.price || 0) * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{t('checkout.subtotal')}</span>
            <span className="font-semibold">€{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{t('checkout.shipping')}</span>
            <span className="font-semibold">
              {shippingCost === 0 ? t('checkout.free') : `€${shippingCost.toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">{t('checkout.tax')}</span>
            <span className="font-semibold">€{tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
            <span className="font-bold text-slate-900">{t('checkout.total')}</span>
            <span className="font-black text-lg text-slate-900">€{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Contract Formation Notice */}
      <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
        <div className="flex gap-3">
          <AlertCircle className="text-[#E85D26] flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-[#C44A1A]">
            <p className="font-semibold mb-2">
              {t('checkout.contractFormation', 'Vertragsschluss')}
            </p>
            <p>
              {t(
                'checkout.contractFormationDesc',
                'Mit Klick auf "Zahlungspflichtig bestellen" geben Sie eine verbindliche Bestellung ab und erkennen diese Bedingungen an.'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Mandatory Checkboxes */}
      <div className="space-y-3">
        {/* Terms & Conditions */}
        <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 cursor-pointer transition">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="w-5 h-5 rounded accent-[#E85D26] mt-0.5 flex-shrink-0"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">
              {t('checkout.agreeTerms', 'Ich akzeptiere die AGB')}
            </p>
            <a
              href="#/terms"
              className="text-xs text-[#E85D26] hover:underline mt-1 inline-block"
            >
              {t('checkout.viewTerms', 'AGB ansehen')}
            </a>
          </div>
        </label>

        {/* Cancellation Policy */}
        <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 cursor-pointer transition">
          <input
            type="checkbox"
            checked={agreeCancel}
            onChange={(e) => setAgreeCancel(e.target.checked)}
            className="w-5 h-5 rounded accent-[#E85D26] mt-0.5 flex-shrink-0"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">
              {t(
                'checkout.agreeCancellation',
                'Ich habe die Widerrufsbelehrung zur Kenntnis genommen'
              )}
            </p>
            <a
              href="#/cancellation"
              className="text-xs text-[#E85D26] hover:underline mt-1 inline-block"
            >
              {t('checkout.viewCancellation', 'Widerrufsbelehrung ansehen')}
            </a>
          </div>
        </label>

        {/* Privacy Policy */}
        <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 cursor-pointer transition">
          <input
            type="checkbox"
            checked={agreePrivacy}
            onChange={(e) => setAgreePrivacy(e.target.checked)}
            className="w-5 h-5 rounded accent-[#E85D26] mt-0.5 flex-shrink-0"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">
              {t(
                'checkout.agreePrivacy',
                'Ich habe die Datenschutzerklärung zur Kenntnis genommen'
              )}
            </p>
            <a
              href="#/privacy"
              className="text-xs text-[#E85D26] hover:underline mt-1 inline-block"
            >
              {t('checkout.viewPrivacy', 'Datenschutzerklärung ansehen')}
            </a>
          </div>
        </label>
      </div>

      {/* Submit Button */}
      <button
        onClick={onConfirm}
        disabled={!canSubmit}
        className={`w-full h-14 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
          canSubmit
            ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-98'
            : 'bg-slate-200 text-slate-500 cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {t('checkout.processing', 'Wird verarbeitet...')}
          </>
        ) : (
          <>
            <Check size={20} />
            {t('checkout.completeOrder', 'Zahlungspflichtig bestellen')} · €{total.toFixed(2)}
          </>
        )}
      </button>

      {/* Additional Info */}
      <p className="text-xs text-slate-500 text-center">
        {t(
          'checkout.securePayment',
          'Sichere Zahlung mit Stripe. Ihre Daten sind verschlüsselt und sicher.'
        )}
      </p>
    </div>
  );
}
