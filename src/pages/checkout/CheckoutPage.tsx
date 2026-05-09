import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, ChevronRight, ChevronLeft, MapPin, Truck, CreditCard,
  Package, ShieldCheck, Mail, Phone, User, Building2, Clock,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';

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

interface ShippingOption {
  id: string;
  label: string;
  eta: string;
  price: number;
}

const SHIPPING_OPTIONS: ShippingOption[] = [
  { id: 'standard', label: 'Standart Kargo', eta: '3-5 iş günü', price: 0 },
  { id: 'express',  label: 'Hızlı Teslimat',  eta: '1-2 iş günü', price: 49 },
  { id: 'pallet',   label: 'Palet Kurulum',   eta: '5-7 iş günü', price: 199 },
];

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotalPrice);
  const clearCart = useCartStore((s) => s.clearCart);
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<Step>(1);
  const [contact, setContact] = useState<ContactForm>({
    email: user?.email || '', firstName: '', lastName: '', phone: '',
    company: '', address: '', city: '', postal: '', country: 'Türkiye',
  });
  const [shipping, setShipping] = useState<string>('standard');
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const subtotal = getTotal();
  const shippingCost = SHIPPING_OPTIONS.find((o) => o.id === shipping)?.price ?? 0;
  const tax = Math.round(subtotal * 0.2);
  const total = subtotal + shippingCost + tax;

  const canNext1 =
    contact.email && contact.firstName && contact.lastName && contact.phone &&
    contact.address && contact.city && contact.postal;

  const placeOrder = async () => {
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 1200));
    const id = 'GO-' + Date.now().toString(36).toUpperCase();
    setOrderId(id);
    clearCart();
    setPlacing(false);
  };

  const steps = [
    { n: 1, label: t('checkout.stepContact', 'Bilgiler') },
    { n: 2, label: t('checkout.stepShipping', 'Kargo') },
    { n: 3, label: t('checkout.stepPayment', 'Ödeme') },
  ];

  if (orderId) {
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
            {t('checkout.successTitle', 'Siparişiniz Alındı!')}
          </h1>
          <p className="text-slate-500 mt-2">
            {t('checkout.successDesc', 'Onay e-postası {{email}} adresine gönderildi.', { email: contact.email })}
          </p>
          <div className="mt-6 p-4 bg-slate-50 rounded-xl text-left">
            <p className="text-xs text-slate-500">Sipariş No</p>
            <p className="font-mono font-bold text-slate-900">{orderId}</p>
            <p className="text-xs text-slate-500 mt-3">Tahmini Teslimat</p>
            <p className="font-semibold text-slate-900">
              {SHIPPING_OPTIONS.find((o) => o.id === shipping)?.eta}
            </p>
          </div>
          <div className="mt-6 flex gap-3">
            <Link to="/orders" className="flex-1 h-12 rounded-xl bg-sky-500 text-white font-bold flex items-center justify-center">
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
          <Link to="/diamond" className="px-6 h-12 inline-flex items-center justify-center rounded-xl bg-sky-500 text-white font-bold">
            {t('cart.startShopping', 'Alışverişe Başla')}
          </Link>
          <Link to="/catalog" className="px-6 h-12 inline-flex items-center justify-center rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">
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
                  step >= s.n ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-400'
                }`}>
                  {step > s.n ? <Check size={18} /> : s.n}
                </div>
                <span className={`text-xs mt-2 font-semibold hidden sm:inline ${step >= s.n ? 'text-sky-600' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-6 ${step > s.n ? 'bg-sky-500' : 'bg-slate-200'}`} />
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
                    <MapPin size={20} className="text-sky-500" />
                    {t('checkout.contactTitle', 'İletişim ve Teslimat')}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field icon={Mail} label="E-posta" value={contact.email}
                      onChange={(v) => setContact({ ...contact, email: v })} type="email" full autoComplete="email" />
                    <Field icon={User} label="Ad" value={contact.firstName}
                      onChange={(v) => setContact({ ...contact, firstName: v })} autoComplete="given-name" />
                    <Field icon={User} label="Soyad" value={contact.lastName}
                      onChange={(v) => setContact({ ...contact, lastName: v })} autoComplete="family-name" />
                    <Field icon={Phone} label="Telefon" value={contact.phone}
                      onChange={(v) => setContact({ ...contact, phone: v })} autoComplete="tel" />
                    <Field icon={Building2} label="Firma (ops.)" value={contact.company}
                      onChange={(v) => setContact({ ...contact, company: v })} autoComplete="organization" />
                    <Field icon={MapPin} label="Adres" value={contact.address}
                      onChange={(v) => setContact({ ...contact, address: v })} full autoComplete="street-address" />
                    <Field label="Şehir" value={contact.city}
                      onChange={(v) => setContact({ ...contact, city: v })} autoComplete="address-level2" />
                    <Field label="Posta Kodu" value={contact.postal}
                      onChange={(v) => setContact({ ...contact, postal: v })} autoComplete="postal-code" />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Truck size={20} className="text-sky-500" />
                    {t('checkout.shippingTitle', 'Kargo Yöntemi')}
                  </h2>
                  {SHIPPING_OPTIONS.map((opt) => (
                    <label key={opt.id} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
                      shipping === opt.id ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-300'
                    }`}>
                      <input type="radio" name="ship" checked={shipping === opt.id}
                        onChange={() => setShipping(opt.id)} className="accent-sky-500" />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{opt.label}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock size={12} /> {opt.eta}
                        </p>
                      </div>
                      <p className="font-bold text-slate-900">
                        {opt.price === 0 ? 'Ücretsiz' : `${opt.price} €`}
                      </p>
                    </label>
                  ))}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <CreditCard size={20} className="text-sky-500" />
                    {t('checkout.paymentTitle', 'Ödeme')}
                  </h2>
                  <div className="p-4 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-2xl text-white">
                    <p className="text-xs opacity-70">Kart Numarası</p>
                    <p className="font-mono text-lg tracking-wider mt-1">•••• •••• •••• ••••</p>
                    <div className="flex justify-between mt-4 text-xs opacity-70">
                      <span>KART SAHİBİ</span><span>SKT</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Kart Numarası" value="" onChange={() => {}} full />
                    <Field label="Son Kullanma" value="" onChange={() => {}} />
                    <Field label="CVV" value="" onChange={() => {}} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-2">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    Stripe ile 256-bit SSL şifreli ödeme
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Nav buttons */}
            <div className="flex justify-between mt-6">
              <button
                onClick={() => step > 1 ? setStep((step - 1) as Step) : navigate('/cart')}
                className="h-12 px-6 rounded-xl border border-slate-200 font-semibold text-slate-700 flex items-center gap-2 hover:bg-white"
              >
                <ChevronLeft size={18} /> {step === 1 ? 'Sepete Dön' : 'Geri'}
              </button>
              {step < 3 ? (
                <button
                  onClick={() => setStep((step + 1) as Step)}
                  disabled={step === 1 && !canNext1}
                  className="h-12 px-8 rounded-xl bg-sky-500 text-white font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-600"
                >
                  {t('checkout.next', 'Devam')} <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={placeOrder}
                  disabled={placing}
                  className="h-12 px-8 rounded-xl bg-emerald-500 text-white font-bold flex items-center gap-2 disabled:opacity-60 hover:bg-emerald-600"
                >
                  {placing ? 'İşleniyor...' : `Siparişi Tamamla · ${total.toLocaleString('tr-TR')} €`}
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
                      <p className="text-xs text-sky-600 font-bold mt-1">
                        {(it.product.price * it.quantity).toLocaleString('tr-TR')} €
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 mt-4 pt-4 space-y-2 text-sm">
                <Row label="Ara Toplam" value={`${subtotal.toLocaleString('tr-TR')} €`} />
                <Row label="Kargo" value={shippingCost === 0 ? 'Ücretsiz' : `${shippingCost} €`} />
                <Row label="KDV (%20)" value={`${tax.toLocaleString('tr-TR')} €`} />
                <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between">
                  <span className="font-bold text-slate-900">Toplam</span>
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
          className={`w-full h-11 rounded-xl border border-slate-200 bg-white text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition ${
            Icon ? 'pl-10 pr-3' : 'px-3'
          }`}
        />
      </div>
    </div>
  );
}
