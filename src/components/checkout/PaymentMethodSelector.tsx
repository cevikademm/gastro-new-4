import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard, Wallet, FileText, Banknote, Building, Zap, AlertCircle,
} from 'lucide-react';
import { getAvailablePaymentMethods } from '../../lib/b2b-payments';
import { validateIBAN, validateBIC, formatIBAN } from '../../lib/iban';

interface PaymentMethodSelectorProps {
  customerTier: string;
  orderTotal: number;
  selectedMethodId?: string;
  onMethodSelect: (methodId: string) => void;
  onPaymentDataChange?: (data: Record<string, any>) => void;
}

interface PaymentMethodState {
  iban?: string;
  bic?: string;
  leasingMonths?: 24 | 36 | 48 | 60;
}

export default function PaymentMethodSelector({
  customerTier,
  orderTotal,
  selectedMethodId,
  onMethodSelect,
  onPaymentDataChange,
}: PaymentMethodSelectorProps) {
  const { t } = useTranslation();
  const [paymentData, setPaymentData] = useState<PaymentMethodState>({});
  const [ibanError, setIbanError] = useState('');
  const [bicError, setBicError] = useState('');

  const availableMethods = getAvailablePaymentMethods(customerTier, orderTotal);

  const methodIcons: Record<string, any> = {
    credit_card: CreditCard,
    paypal: Wallet,
    invoice: FileText,
    sepa: Banknote,
    bank_transfer: Building,
    leasing: Zap,
  };

  const handleMethodSelect = (methodId: string) => {
    onMethodSelect(methodId);
    setPaymentData({});
    setIbanError('');
    setBicError('');
  };

  const handleIBANChange = (iban: string) => {
    const formatted = formatIBAN(iban);
    setPaymentData({ ...paymentData, iban: formatted });

    if (iban.replace(/\s/g, '').length > 0) {
      const validation = validateIBAN(iban);
      if (!validation.valid) {
        setIbanError(t('payment.invalidIBAN', 'Invalid IBAN'));
      } else {
        setIbanError('');
      }
    }

    onPaymentDataChange?.({ ...paymentData, iban: formatted });
  };

  const handleBICChange = (bic: string) => {
    setPaymentData({ ...paymentData, bic });

    if (bic.replace(/\s/g, '').length > 0) {
      if (!validateBIC(bic)) {
        setBicError(t('payment.invalidBIC', 'Invalid BIC'));
      } else {
        setBicError('');
      }
    }

    onPaymentDataChange?.({ ...paymentData, bic });
  };

  const handleLeasingTermSelect = (months: 24 | 36 | 48 | 60) => {
    setPaymentData({ ...paymentData, leasingMonths: months });
    onPaymentDataChange?.({ ...paymentData, leasingMonths: months });
  };

  return (
    <div className="space-y-4">
      {/* Payment Methods Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {availableMethods.map((method) => {
          const Icon = methodIcons[method.id];
          const isSelected = selectedMethodId === method.id;

          return (
            <button
              key={method.id}
              onClick={() => handleMethodSelect(method.id)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-[#7B1F26] bg-red-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                {Icon && (
                  <Icon
                    size={20}
                    className={isSelected ? 'text-[#7B1F26]' : 'text-slate-400'}
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{method.label}</h3>
                  <p className="text-xs text-slate-500 mt-1">{method.description}</p>
                  {method.requiresApproval && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                      <AlertCircle size={14} />
                      {t('payment.requiresApproval', 'Requires approval')}
                    </div>
                  )}
                  {method.minOrder && (
                    <p className="text-xs text-slate-400 mt-1">
                      {t('payment.minOrder', 'Min. order')} {method.minOrder}€
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Method-Specific Fields */}
      {selectedMethodId === 'sepa' && (
        <div className="bg-red-50 rounded-xl p-4 space-y-4 border border-red-200">
          <h4 className="font-semibold text-[#5A1219]">
            {t('payment.sepaDetails', 'SEPA Direct Debit')}
          </h4>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              IBAN
            </label>
            <input
              type="text"
              placeholder="DE89 3704 0044 0532 0130 00"
              value={paymentData.iban || ''}
              onChange={(e) => handleIBANChange(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-red-300 outline-none ${
                ibanError ? 'border-red-500' : 'border-slate-200'
              }`}
            />
            {ibanError && (
              <p className="text-xs text-red-600 mt-1">{ibanError}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">
              BIC {t('payment.optional', '(optional)')}
            </label>
            <input
              type="text"
              placeholder="COBADEFF"
              value={paymentData.bic || ''}
              onChange={(e) => handleBICChange(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-red-300 outline-none ${
                bicError ? 'border-red-500' : 'border-slate-200'
              }`}
            />
            {bicError && (
              <p className="text-xs text-red-600 mt-1">{bicError}</p>
            )}
          </div>

          <p className="text-xs text-slate-600">
            {t(
              'payment.sepaInfo',
              'You authorize us to debit your account. You will receive notice prior to debiting.'
            )}
          </p>
        </div>
      )}

      {selectedMethodId === 'invoice' && (
        <div className="bg-amber-50 rounded-xl p-4 space-y-3 border border-amber-200">
          <h4 className="font-semibold text-amber-900">
            {t('payment.invoiceTerms', 'Invoice Payment Terms')}
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">{t('payment.paymentTerms')}</span>
              <span className="font-semibold text-slate-900">Net 30 / Net 60</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{t('payment.dueAfter')}</span>
              <span className="font-semibold text-slate-900">Delivery</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">{t('payment.creditCheck')}</span>
              <span className={`font-semibold ${orderTotal > 5000 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {orderTotal > 5000 ? t('payment.required', 'Required') : t('payment.notRequired', 'Not required')}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            {t(
              'payment.invoiceInfo',
              'Invoice payment available after credit verification. You will receive an invoice by email.'
            )}
          </p>
        </div>
      )}

      {selectedMethodId === 'bank_transfer' && (
        <div className="bg-emerald-50 rounded-xl p-4 space-y-3 border border-emerald-200">
          <h4 className="font-semibold text-emerald-900">
            {t('payment.bankTransfer', 'Bank Transfer Details')}
          </h4>
          <p className="text-xs text-slate-600">
            {t(
              'payment.bankTransferInfo',
              'After placing your order, you will receive bank account details by email. Please transfer the amount within 7 days.'
            )}
          </p>
          <div className="bg-white rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Bank:</span>
              <span className="font-mono text-slate-900">2MC Gastro Bank</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">IBAN:</span>
              <span className="font-mono text-slate-900">DE89 3704 0044 0532 0130 00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reference:</span>
              <span className="font-mono text-slate-900">{t('payment.willBeProvided')}</span>
            </div>
          </div>
        </div>
      )}

      {selectedMethodId === 'leasing' && (
        <div className="bg-purple-50 rounded-xl p-4 space-y-4 border border-purple-200">
          <h4 className="font-semibold text-purple-900">
            {t('payment.leasingTerms', 'Equipment Leasing')}
          </h4>
          <p className="text-xs text-slate-600">
            {t(
              'payment.leasingInfo',
              'Flexible equipment leasing with attractive monthly rates. Select your preferred term.'
            )}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[24, 36, 48, 60].map((months) => (
              <button
                key={months}
                onClick={() => handleLeasingTermSelect(months as 24 | 36 | 48 | 60)}
                className={`py-2 rounded-lg border text-sm font-semibold transition ${
                  paymentData.leasingMonths === months
                    ? 'border-purple-600 bg-purple-100 text-purple-900'
                    : 'border-slate-200 text-slate-600 hover:border-purple-300'
                }`}
              >
                {months}M
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-600">
            {t(
              'payment.leasingPartner',
              'Leasing provided by our trusted financing partner with competitive rates.'
            )}
          </p>
        </div>
      )}
    </div>
  );
}
