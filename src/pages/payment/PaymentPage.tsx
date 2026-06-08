import React, { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useTranslation } from 'react-i18next';
import { stripePromise } from '../../lib/stripe';
import {
  CheckCircle, CreditCard, Shield, Zap, Building, X,
  Truck, Clock, MapPin, Package, BadgeCheck, Banknote,
  Wallet, FileText, Calendar, ArrowRight, ChevronDown, ChevronUp,
  Globe, Phone, Headphones
} from 'lucide-react';

/* ─── Plan Definitions ─── */
const PLANS = [
  {
    id: 'basic',
    nameKey: 'payment.planBasic',
    price: 10,
    periodKey: 'payment.oneTime',
    featureKeys: ['payment.feat1Project', 'payment.featBasicCatalog', 'payment.featPdfExport', 'payment.featEmailSupport'],
    color: 'border-slate-200',
    badgeKey: '',
  },
  {
    id: 'pro',
    nameKey: 'payment.planPro',
    price: 29,
    periodKey: 'payment.oneTime',
    featureKeys: ['payment.feat1Project', 'payment.featFullCatalog', 'payment.featPdfCadExport', 'payment.featQuoteCreation', 'payment.featPrioritySupport'],
    color: 'border-primary',
    badgeKey: 'payment.popular',
  },
  {
    id: 'complete',
    nameKey: 'payment.planComplete',
    price: 59,
    periodKey: 'payment.oneTime',
    featureKeys: ['payment.feat1Project', 'payment.featFullCatalogCustom', 'payment.featPdfCad3dExport', 'payment.featQuoteCreation', 'payment.featAccountManager', 'payment.featRevisionSupport'],
    color: 'border-slate-300',
    badgeKey: '',
  },
];

/* ─── Payment Methods ─── */
const PAYMENT_METHODS = [
  { id: 'card', icon: CreditCard, labelKey: 'payment.methodCard', descKey: 'payment.methodCardDesc', logos: ['VISA', 'MC', 'Maestro'] },
  { id: 'paypal', icon: Wallet, labelKey: 'payment.methodPayPal', descKey: 'payment.methodPayPalDesc', logos: ['PayPal'] },
  { id: 'klarna', icon: Calendar, labelKey: 'payment.methodKlarna', descKey: 'payment.methodKlarnaDesc', logos: ['Klarna'] },
  { id: 'sepa', icon: Banknote, labelKey: 'payment.methodSEPA', descKey: 'payment.methodSEPADesc', logos: ['SEPA'] },
  { id: 'invoice', icon: FileText, labelKey: 'payment.methodInvoice', descKey: 'payment.methodInvoiceDesc', logos: [] },
  { id: 'leasing', icon: Building, labelKey: 'payment.methodLeasing', descKey: 'payment.methodLeasingDesc', logos: [] },
];

/* ─── Shipping Options ─── */
const SHIPPING_OPTIONS = [
  { id: 'standard', icon: Truck, labelKey: 'payment.shipStandard', descKey: 'payment.shipStandardDesc', priceKey: 'payment.shipStandardPrice', days: '3-5' },
  { id: 'express', icon: Zap, labelKey: 'payment.shipExpress', descKey: 'payment.shipExpressDesc', priceKey: 'payment.shipExpressPrice', days: '1-2' },
  { id: 'freight', icon: Package, labelKey: 'payment.shipFreight', descKey: 'payment.shipFreightDesc', priceKey: 'payment.shipFreightPrice', days: '5-7' },
];

/* ─── Checkout Form (existing Stripe logic) ─── */
function CheckoutForm({ plan, paymentMethod, onSuccess, onCancel }: { plan: typeof PLANS[0]; paymentMethod: string; onSuccess: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    if (paymentMethod === 'card') {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) { setLoading(false); return; }

      const { error: stripeError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement as any,
      });

      if (stripeError) {
        setError(stripeError.message || t('payment.paymentFailed'));
        setLoading(false);
        return;
      }
    }

    // Simulate backend call for all methods
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-800">{t(plan.nameKey)} Plan</h2>
            <p className="text-slate-500 text-sm mt-0.5">€{plan.price} · {t('payment.oneTimePayment')}</p>
          </div>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {paymentMethod === 'card' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {t('payment.cardInfo')}
              </label>
              <div className="border border-slate-200 rounded-lg px-4 py-3.5 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary">
                <CardElement options={{
                  style: {
                    base: { fontSize: '14px', color: '#1e293b', '::placeholder': { color: '#94a3b8' } }
                  }
                }} />
              </div>
            </div>
          )}

          {paymentMethod === 'paypal' && (
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-700 font-medium">{t('payment.paypalRedirect')}</p>
            </div>
          )}

          {paymentMethod === 'klarna' && (
            <div className="bg-pink-50 rounded-xl p-4 space-y-3">
              <p className="text-sm text-pink-800 font-bold">{t('payment.klarnaOptions')}</p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 bg-white rounded-lg p-3 cursor-pointer border border-pink-100">
                  <input type="radio" name="klarna" defaultChecked className="text-pink-600" />
                  <div>
                    <span className="text-sm font-bold text-slate-700">{t('payment.klarnaPayLater')}</span>
                    <p className="text-xs text-slate-500">{t('payment.klarnaPayLaterDesc')}</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 bg-white rounded-lg p-3 cursor-pointer border border-pink-100">
                  <input type="radio" name="klarna" className="text-pink-600" />
                  <div>
                    <span className="text-sm font-bold text-slate-700">{t('payment.klarnaInstallment')}</span>
                    <p className="text-xs text-slate-500">{t('payment.klarnaInstallmentDesc')}</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {paymentMethod === 'sepa' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">IBAN</label>
              <input type="text" placeholder="DE89 3704 0044 0532 0130 00" className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none" />
            </div>
          )}

          {paymentMethod === 'invoice' && (
            <div className="bg-amber-50 rounded-xl p-4">
              <p className="text-sm text-amber-800 font-medium">{t('payment.invoiceInfo')}</p>
            </div>
          )}

          {paymentMethod === 'leasing' && (
            <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
              <p className="text-sm text-emerald-800 font-bold">{t('payment.leasingTitle')}</p>
              <p className="text-xs text-emerald-700">{t('payment.leasingDesc')}</p>
              <div className="grid grid-cols-3 gap-2">
                {['12', '24', '36'].map((m) => (
                  <button key={m} type="button" className="py-2 rounded-lg border border-emerald-200 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors">
                    {m} {t('payment.months')}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-emerald-600">{t('payment.leasingPartner')}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Shield size={14} />
            <span>{t('payment.securePayment')}</span>
          </div>

          <button
            type="submit"
            disabled={loading || (paymentMethod === 'card' && !stripe)}
            className="w-full brushed-metal text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CreditCard size={18} />
                €{plan.price} {t('payment.buy')}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Success Modal ─── */
function SuccessModal({ plan, onClose }: { plan: typeof PLANS[0]; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-2">{t('payment.paymentSuccess')}</h2>
        <p className="text-slate-500 text-sm mb-6" dangerouslySetInnerHTML={{ __html: t('payment.paymentSuccessMsg', { name: t(plan.nameKey) }) }} />
        <button
          onClick={onClose}
          className="w-full brushed-metal text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:opacity-90 transition-all"
        >
          {t('common.continue')}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function PaymentPage() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  const [success, setSuccess] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState('standard');

  return (
    <Elements stripe={stripePromise}>
      <div className="max-w-5xl mx-auto space-y-8 w-full">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black font-headline text-primary tracking-tight">{t('payment.title')}</h1>
          <p className="text-on-surface-variant font-medium">{t('payment.subtitle')}</p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-surface-container-lowest rounded-2xl border-2 ${plan.color} shadow-sm p-8 flex flex-col`}
            >
              {plan.badgeKey && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  {t(plan.badgeKey)}
                </span>
              )}
              <div className="flex items-center gap-3 mb-4">
                {plan.id === 'basic' && <Zap size={20} className="text-slate-400" />}
                {plan.id === 'pro' && <CreditCard size={20} className="text-primary" />}
                {plan.id === 'complete' && <Building size={20} className="text-slate-600" />}
                <h2 className="text-lg font-black text-on-surface">{t(plan.nameKey)}</h2>
              </div>

              <div className="mb-6">
                <span className="text-3xl sm:text-4xl font-black text-primary">€{plan.price}</span>
                <span className="text-slate-400 text-xs ml-1">{t('payment.oneTime')}</span>
              </div>

              <ul className="space-y-2.5 flex-1 mb-8">
                {plan.featureKeys.map((fk, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />
                    {t(fk)}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setSelectedPlan(plan)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                  plan.id === 'pro'
                    ? 'brushed-metal text-white shadow-lg hover:opacity-90'
                    : 'border-2 border-primary text-primary hover:bg-primary/5'
                }`}
              >
                {t('payment.buyPlan', { name: t(plan.nameKey) })}
              </button>
            </div>
          ))}
        </div>

        {/* ═══ Payment Methods Section ═══ */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
          <div className="p-6 border-b border-outline-variant/10">
            <h2 className="text-xl font-black font-headline text-on-surface flex items-center gap-2">
              <Wallet size={22} className="text-primary" />
              {t('payment.methodsTitle')}
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">{t('payment.methodsSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-outline-variant/10">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              const isSelected = selectedPaymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  className={`relative flex items-start gap-4 p-5 text-left transition-all ${
                    isSelected
                      ? 'bg-primary/5 ring-2 ring-inset ring-primary/20'
                      : 'bg-surface-container-lowest hover:bg-surface-container-low'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                      {t(method.labelKey)}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                      {t(method.descKey)}
                    </p>
                    {method.logos.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {method.logos.map((logo) => (
                          <span key={logo} className="text-[10px] font-bold bg-surface-container px-2 py-0.5 rounded text-on-surface-variant">
                            {logo}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <CheckCircle size={18} className="text-primary absolute top-3 right-3" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ Shipping & Delivery Section ═══ */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
          <button
            onClick={() => setShowShipping(!showShipping)}
            className="w-full p-6 flex items-center justify-between hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-3">
              <Truck size={22} className="text-primary" />
              <div className="text-left">
                <h2 className="text-xl font-black font-headline text-on-surface">
                  {t('payment.shippingTitle')}
                </h2>
                <p className="text-sm text-on-surface-variant mt-0.5">{t('payment.shippingSubtitle')}</p>
              </div>
            </div>
            {showShipping ? <ChevronUp size={20} className="text-on-surface-variant" /> : <ChevronDown size={20} className="text-on-surface-variant" />}
          </button>

          {showShipping && (
            <div className="border-t border-outline-variant/10">
              {/* Shipping options */}
              <div className="p-6 space-y-3">
                {SHIPPING_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedShipping === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedShipping(opt.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-outline-variant/10 hover:border-outline-variant/30'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
                      }`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-on-surface">{t(opt.labelKey)}</h3>
                          <span className="text-xs bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant font-medium">
                            {opt.days} {t('payment.businessDays')}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">{t(opt.descKey)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-black ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                          {t(opt.priceKey)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Delivery info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-outline-variant/10 border-t border-outline-variant/10">
                <div className="bg-surface-container-lowest p-5 flex items-start gap-3">
                  <MapPin size={18} className="text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">{t('payment.deliveryArea')}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">{t('payment.deliveryAreaDesc')}</p>
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-5 flex items-start gap-3">
                  <Clock size={18} className="text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">{t('payment.deliveryTracking')}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">{t('payment.deliveryTrackingDesc')}</p>
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-5 flex items-start gap-3">
                  <Package size={18} className="text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">{t('payment.deliveryInsurance')}</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">{t('payment.deliveryInsuranceDesc')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ Trust & Guarantee Bar ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10 flex items-center gap-4">
            <Shield size={32} className="text-emerald-500 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-on-surface">{t('payment.moneyBackTitle')}</h3>
              <p className="text-sm text-on-surface-variant mt-0.5">{t('payment.moneyBackDesc')}</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10 flex items-center gap-4">
            <Headphones size={32} className="text-primary flex-shrink-0" />
            <div>
              <h3 className="font-bold text-on-surface">{t('payment.supportTitle')}</h3>
              <p className="text-sm text-on-surface-variant mt-0.5">{t('payment.supportDesc')}</p>
            </div>
          </div>
        </div>

        {/* ═══ Free Shipping Banner ═══ */}
        <div className="bg-primary rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-white">
          <div className="flex items-center gap-4">
            <Truck size={28} />
            <div>
              <h3 className="font-black text-lg">{t('payment.freeShippingTitle')}</h3>
              <p className="text-white/70 text-sm">{t('payment.freeShippingDesc')}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-3xl font-black">€30+</span>
            <p className="text-xs text-white/60">{t('payment.freeShippingNote')}</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedPlan && !success && (
        <CheckoutForm
          plan={selectedPlan}
          paymentMethod={selectedPaymentMethod}
          onSuccess={() => setSuccess(true)}
          onCancel={() => setSelectedPlan(null)}
        />
      )}

      {success && selectedPlan && (
        <SuccessModal
          plan={selectedPlan}
          onClose={() => { setSuccess(false); setSelectedPlan(null); }}
        />
      )}
    </Elements>
  );
}
