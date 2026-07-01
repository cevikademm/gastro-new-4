import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import {
  Check, ChevronRight, ChevronLeft, MapPin, Truck, CreditCard,
  Package, ShieldCheck, Mail, Phone, User, Building2, Clock,
  Loader2, AlertCircle, Lock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useOrderStore, type OrderItem } from '../../stores/orderStore';
import { stripePromise } from '../../lib/stripe';
import { createPaymentIntent } from '../../lib/payment';

type Step = 1 | 2 | 3;

interface ContactForm {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  postal: string;
  country: string;
}

interface ShippingOptionDef {
  id: string;
  labelKey: string;
  etaKey: string;
  price: number;
}

const SHIPPING_OPTIONS: ShippingOptionDef[] = [
  { id: 'standard', labelKey: 'checkout.shipStandard', etaKey: 'checkout.shipStandardEta', price: 0 },
  { id: 'express',  labelKey: 'checkout.shipExpress',  etaKey: 'checkout.shipExpressEta',  price: 49 },
  { id: 'pallet',   labelKey: 'checkout.shipPallet',   etaKey: 'checkout.shipPalletEta',   price: 199 },
];

/* ─── Stripe Payment Element form (mounted with a live clientSecret) ─── */
function PaymentForm({ amount, onPaid }: { amount: number; onPaid: () => void }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError('');

    // redirect: 'if_required' → card/SEPA resolve inline; redirect-based
    // methods (Klarna, iDEAL …) bounce to return_url, then the webhook
    // finalizes the order server-side.
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders?payment=success`,
      },
      redirect: 'if_required',
    });

    if (stripeError) {
      setError(stripeError.message || t('checkout.payFailed', 'Ödeme tamamlanamadı. Lütfen tekrar deneyin.'));
      setSubmitting(false);
      return;
    }

    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      onPaid();
      return;
    }

    // Requires further action handled by Stripe (e.g. redirect already issued)
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: { type: 'accordion', defaultCollapsed: false, radios: 'always', spacedAccordionItems: true },
        }}
      />

      {error && (
        <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck size={16} className="text-emerald-500" />
        {t('checkout.secureNote', 'Stripe ile 256-bit SSL şifreli, PCI-DSS uyumlu ödeme')}
      </div>

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full h-12 rounded-xl bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-emerald-600 transition"
      >
        {submitting
          ? <><Loader2 size={18} className="animate-spin" /> {t('checkout.processing', 'İşleniyor...')}</>
          : <><Lock size={16} /> {`${t('checkout.payNow', 'Güvenli Öde')} · ${amount.toLocaleString('tr-TR')} €`}</>}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotalPrice);
  const getTotalItems = useCartStore((s) => s.getTotalItems);
  const clearCart = useCartStore((s) => s.clearCart);
  const user = useAuthStore((s) => s.user);
  const createOrder = useOrderStore((s) => s.createOrder);

  const [step, setStep] = useState<Step>(1);
  const [contact, setContact] = useState<ContactForm>({
    email: user?.email || '', firstName: '', lastName: '', phone: '',
    company: user?.company || '', address: '', city: '', postal: '', country: t('checkout.defaultCountry', 'Türkiye'),
  });
  const [shipping, setShipping] = useState<string>('standard');

  // Payment state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState('');
  const [paid, setPaid] = useState(false);
  const preparedRef = useRef(false);

  const subtotal = getTotal();
  const shippingCost = SHIPPING_OPTIONS.find((o) => o.id === shipping)?.price ?? 0;
  const tax = Math.round(subtotal * 0.2);
  const total = subtotal + shippingCost + tax;

  const canNext1 =
    contact.email && contact.firstName && contact.lastName && contact.phone &&
    contact.address && contact.city && contact.postal;

  // Create the DB order + Stripe PaymentIntent, then mount the Payment Element.
  const preparePayment = async () => {
    if (!user) {
      setPrepareError(t('checkout.loginRequired', 'Ödeme yapmak için giriş yapmalısınız.'));
      return;
    }
    preparedRef.current = true;
    setPreparing(true);
    setPrepareError('');

    try {
      const orderItems: OrderItem[] = items.map((i) => ({
        product_id: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        price: i.product.price || 0,
        image: i.product.img || '',
        category: i.product.cat || '',
        brand: i.product.brand || '',
      }));

      const shipOpt = SHIPPING_OPTIONS.find((o) => o.id === shipping);
      const notes = [
        `${t('checkout.notesDelivery', 'Teslimat')}: ${contact.firstName} ${contact.lastName}`,
        `${contact.address}, ${contact.postal} ${contact.city}, ${contact.country}`,
        `${t('checkout.notesPhone', 'Tel')}: ${contact.phone}`,
        contact.company ? `${t('checkout.notesCompany', 'Firma')}: ${contact.company}` : '',
        `${t('checkout.notesShipping', 'Kargo')}: ${shipOpt ? t(shipOpt.labelKey) : shipping}`,
      ].filter(Boolean).join(' | ');

      // total_price stays the goods subtotal (app convention; VAT + shipping
      // shown separately). The Stripe charge below uses the grand total.
      const order = await createOrder(orderItems, subtotal, getTotalItems(), notes);
      if (!order) {
        setPrepareError(
          useOrderStore.getState().error ||
          t('checkout.orderFailed', 'Sipariş oluşturulamadı. Lütfen tekrar deneyin.'),
        );
        preparedRef.current = false;
        return;
      }
      setOrderNumber(order.order_number);

      const { client_secret } = await createPaymentIntent({
        order_id: order.id,
        amount: total,
        currency: 'eur',
      });
      setClientSecret(client_secret);
    } catch (err) {
      setPrepareError((err as Error).message || t('checkout.payInitFailed', 'Ödeme başlatılamadı.'));
      preparedRef.current = false;
    } finally {
      setPreparing(false);
    }
  };

  // Prepare payment once the user reaches step 3.
  useEffect(() => {
    if (step === 3 && user && !clientSecret && !preparing && !preparedRef.current) {
      preparePayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handlePaid = () => {
    setPaid(true);
    clearCart();
  };

  const steps = [
    { n: 1, label: t('checkout.stepContact', 'Bilgiler') },
    { n: 2, label: t('checkout.stepShipping', 'Kargo') },
    { n: 3, label: t('checkout.stepPayment', 'Ödeme') },
  ];

  const elementsOptions: StripeElementsOptions | null = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#DC2626',
            borderRadius: '12px',
            fontFamily: 'inherit',
          },
        },
      }
    : null;

  if (paid) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center"
        >
          <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <Check className="text-emerald-600" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('checkout.successTitle', 'Ödemeniz Alındı!')}
          </h1>
          <p className="text-slate-500 mt-2">
            {t('checkout.successDesc', 'Onay e-postası {{email}} adresine gönderildi.', { email: contact.email })}
          </p>
          <div className="mt-6 p-4 bg-slate-50 rounded-xl text-left">
            <p className="text-xs text-slate-500">{t('checkout.orderNo', 'Sipariş No')}</p>
            <p className="font-mono font-bold text-slate-900">{orderNumber}</p>
            <p className="text-xs text-slate-500 mt-3">{t('checkout.estDelivery', 'Tahmini Teslimat')}</p>
            <p className="font-semibold text-slate-900">
              {(() => {
                const opt = SHIPPING_OPTIONS.find((o) => o.id === shipping);
                return opt ? t(opt.etaKey) : '';
              })()}
            </p>
          </div>
          <div className="mt-6 flex gap-3">
            <Link to="/orders" className="flex-1 h-12 rounded-xl bg-brand-red text-white font-bold flex items-center justify-center">
              {t('checkout.viewOrders', 'Siparişlerim')}
            </Link>
            <Link to="/" className="flex-1 h-12 rounded-xl border border-slate-200 font-bold flex items-center justify-center">
              {t('checkout.continueShop', 'Alışverişe Devam')}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 px-4">
        <Package className="text-slate-300" size={64} />
        <p className="text-lg font-semibold text-slate-500">{t('cart.empty', 'Sepetiniz boş')}</p>
        <p className="text-sm text-slate-400 text-center max-w-sm">{t('cart.emptyHint', 'Kataloğumuza göz atarak profesyonel mutfak ekipmanlarını keşfedin.')}</p>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link to="/diamond" className="px-6 h-12 inline-flex items-center justify-center rounded-xl bg-brand-red text-white font-bold">
            {t('cart.startShopping', 'Alışverişe Başla')}
          </Link>
          <Link to="/products" className="px-6 h-12 inline-flex items-center justify-center rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">
            {t('cart.browseCatalog', 'Kataloğa Git')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        {/* Stepper */}
        <div className="flex items-center justify-between max-w-xl mx-auto mb-8">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
                  step >= s.n ? 'bg-brand-red text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                  {step > s.n ? <Check size={18} /> : s.n}
                </div>
                <span className={`text-xs mt-2 font-semibold hidden sm:inline ${step >= s.n ? 'text-brand-red' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-6 ${step > s.n ? 'bg-brand-red' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <MapPin size={20} className="text-brand-red" />
                    {t('checkout.contactTitle', 'İletişim ve Teslimat')}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field icon={Mail} label={t('checkout.fieldEmail', 'E-posta')} value={contact.email}
                      onChange={(v) => setContact({ ...contact, email: v })} type="email" full autoComplete="email" />
                    <Field icon={User} label={t('checkout.fieldFirstName', 'Ad')} value={contact.firstName}
                      onChange={(v) => setContact({ ...contact, firstName: v })} autoComplete="given-name" />
                    <Field icon={User} label={t('checkout.fieldLastName', 'Soyad')} value={contact.lastName}
                      onChange={(v) => setContact({ ...contact, lastName: v })} autoComplete="family-name" />
                    <Field icon={Phone} label={t('checkout.fieldPhone', 'Telefon')} value={contact.phone}
                      onChange={(v) => setContact({ ...contact, phone: v })} autoComplete="tel" />
                    <Field icon={Building2} label={t('checkout.fieldCompany', 'Firma (ops.)')} value={contact.company}
                      onChange={(v) => setContact({ ...contact, company: v })} autoComplete="organization" />
                    <Field icon={MapPin} label={t('checkout.fieldAddress', 'Adres')} value={contact.address}
                      onChange={(v) => setContact({ ...contact, address: v })} full autoComplete="street-address" />
                    <Field label={t('checkout.fieldCity', 'Şehir')} value={contact.city}
                      onChange={(v) => setContact({ ...contact, city: v })} autoComplete="address-level2" />
                    <Field label={t('checkout.fieldPostal', 'Posta Kodu')} value={contact.postal}
                      onChange={(v) => setContact({ ...contact, postal: v })} autoComplete="postal-code" />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Truck size={20} className="text-brand-red" />
                    {t('checkout.shippingTitle', 'Kargo Yöntemi')}
                  </h2>
                  {SHIPPING_OPTIONS.map((opt) => (
                    <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
                      shipping === opt.id ? 'border-brand-red bg-red-50' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <input type="radio" name="ship" checked={shipping === opt.id}
                        onChange={() => setShipping(opt.id)} className="accent-brand-red" />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{t(opt.labelKey)}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock size={12} /> {t(opt.etaKey)}
                        </p>
                      </div>
                      <p className="font-bold text-slate-900">
                        {opt.price === 0 ? t('checkout.free', 'Ücretsiz') : `${opt.price} €`}
                      </p>
                    </label>
                  ))}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <CreditCard size={20} className="text-brand-red" />
                    {t('checkout.paymentTitle', 'Ödeme')}
                  </h2>

                  {/* Not logged in */}
                  {!user && (
                    <div className="space-y-4 py-4 text-center">
                      <Lock className="mx-auto text-slate-300" size={40} />
                      <p className="text-sm text-slate-600">
                        {t('checkout.loginRequired', 'Ödeme yapmak için giriş yapmalısınız.')}
                      </p>
                      <button
                        onClick={() => navigate('/login')}
                        className="h-11 px-6 rounded-xl bg-brand-red text-white font-bold inline-flex items-center gap-2"
                      >
                        {t('checkout.goLogin', 'Giriş Yap')}
                      </button>
                    </div>
                  )}

                  {/* Preparing */}
                  {user && preparing && (
                    <div className="flex flex-col items-center gap-3 py-10 text-slate-500">
                      <Loader2 className="animate-spin text-brand-red" size={28} />
                      <p className="text-sm">{t('checkout.preparingPayment', 'Güvenli ödeme hazırlanıyor...')}</p>
                    </div>
                  )}

                  {/* Prepare error */}
                  {user && !preparing && prepareError && (
                    <div className="space-y-4 py-4">
                      <div className="flex items-start gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        <span>{prepareError}</span>
                      </div>
                      <button
                        onClick={() => { preparedRef.current = false; setPrepareError(''); preparePayment(); }}
                        className="h-11 px-6 rounded-xl bg-brand-red text-white font-bold inline-flex items-center gap-2"
                      >
                        {t('checkout.retry', 'Tekrar Dene')}
                      </button>
                    </div>
                  )}

                  {/* Live Stripe Payment Element */}
                  {user && !preparing && elementsOptions && (
                    <Elements stripe={stripePromise} options={elementsOptions}>
                      <PaymentForm amount={total} onPaid={handlePaid} />
                    </Elements>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Nav buttons */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => step > 1 ? setStep((step - 1) as Step) : navigate('/cart')}
                className="h-12 px-6 rounded-xl border border-slate-200 font-semibold text-slate-700 flex items-center gap-2 hover:bg-white"
              >
                <ChevronLeft size={18} /> {step === 1 ? t('checkout.backToCart', 'Sepete Dön') : t('common.back', 'Geri')}
              </button>
              {step < 3 && (
                <button
                  onClick={() => setStep((step + 1) as Step)}
                  disabled={step === 1 && !canNext1}
                  className="h-12 px-8 rounded-xl bg-brand-red text-white font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-red"
                >
                  {t('checkout.next', 'Devam')} <ChevronRight size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-20 h-fit">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">
                {t('checkout.summary', 'Sipariş Özeti')}
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {items.map((it) => (
                  <div key={it.product.id} className="flex gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-slate-50 rounded-lg overflow-hidden flex-shrink-0 relative">
                      {it.product.img && <img src={it.product.img} alt="" className="w-full h-full object-contain" />}
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-slate-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {it.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 line-clamp-2">{it.product.name}</p>
                      <p className="text-xs text-brand-red font-bold mt-1">
                        {(it.product.price * it.quantity).toLocaleString('tr-TR')} €
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 mt-4 pt-4 space-y-2 text-sm">
                <Row label={t('checkout.subtotal', 'Ara Toplam')} value={`${subtotal.toLocaleString('tr-TR')} €`} />
                <Row label={t('checkout.shippingLabel', 'Kargo')} value={shippingCost === 0 ? t('checkout.free', 'Ücretsiz') : `${shippingCost} €`} />
                <Row label={t('checkout.vat', 'KDV (%20)')} value={`${tax.toLocaleString('tr-TR')} €`} />
                <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between">
                  <span className="font-bold text-slate-900">{t('checkout.total', 'Toplam')}</span>
                  <span className="font-black text-lg text-slate-900">{total.toLocaleString('tr-TR')} €</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', icon: Icon, full, autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  icon?: any;
  full?: boolean;
  autoComplete?: string;
}) {
  const id = `co-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`w-full h-11 rounded-xl border border-slate-200 bg-white text-sm focus:border-brand-red focus:ring-2 focus:ring-red-100 outline-none transition ${
            Icon ? 'pl-10 pr-3' : 'px-3'
          }`}
        />
      </div>
    </div>
  );
}
