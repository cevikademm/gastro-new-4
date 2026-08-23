import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useOrderStore, type OrderItem, getUserInfo } from '../stores/orderStore';
import { CATEGORIES } from '../stores/equipmentStore';
import {
  ShoppingCart, Trash2, Plus, Minus, Package,
  Phone, Mail, Globe, MapPin, ChevronDown, ChevronRight,
  FileText, Send, Euro, CheckCircle, X, Lock, Sparkles, Check
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { EmptyState, EmptyCartIllustration } from './illustrations/EmptyState';
import { COMPANY_INFO } from '../lib/companyInfo';
import { buildAngebotPdf, type DocLine } from '../lib/angebotPdf';

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(true);

  if (err || !src) {
    return (
      <div className="w-14 h-14 bg-surface-container-highest flex items-center justify-center rounded-lg flex-shrink-0">
        <Package size={20} className="text-on-surface-variant/30" />
      </div>
    );
  }
  return (
    <div className="w-14 h-14 relative flex-shrink-0">
      {loading && (
        <div className="absolute inset-0 bg-surface-container-highest rounded-lg flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onError={() => { setErr(true); setLoading(false); }}
        onLoad={() => setLoading(false)}
        className={`w-14 h-14 object-contain rounded-lg bg-white border border-outline-variant/10 p-1 transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
}

export default function Cart() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clearCart, getTotalItems, getTotalPrice, getItemsByCategory } = useCartStore();
  const { createOrder } = useOrderStore();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [pdfLoading, setPdfLoading] = useState(false);
  const [orderModal, setOrderModal] = useState(false);
  // Aynı onay modalı iki işi görür: gerçek sipariş ('order') ve teklif talebi ('quote').
  const [modalMode, setModalMode] = useState<'order' | 'quote'>('order');
  const [orderNotes, setOrderNotes] = useState('');
  const [custName, setCustName] = useState(() => getUserInfo().fullName || '');
  const [custPhone, setCustPhone] = useState('');
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  const openOrderModal = () => { setModalMode('order'); setOrderError(''); setOrderModal(true); };
  const openQuoteModal = () => { setModalMode('quote'); setOrderError(''); setOrderModal(true); };

  // Premium gate — PDF Teklif yalnızca 'pro' abonelik için açıktır
  const user = useAuthStore((s) => s.user);
  const isPro = user?.subscription === 'pro';

  const handleExportPDFClick = () => {
    if (!isPro) {
      setPaywallOpen(true);
      return;
    }
    exportPDF();
  };

  // Sipariş VE teklif talebini tek akış üretir. İkisi de gastro_orders'a kayıt
  // açar + şirkete WhatsApp bildirir (createOrder içinde). Fark: teklif talebinde
  // sepet KORUNUR, yönlendirme yoktur; not "Teklif Talebi" ile işaretlenir.
  const handleCreateOrder = async () => {
    setOrderLoading(true);
    setOrderError('');
    try {
      const isQuote = modalMode === 'quote';
      const orderItems: OrderItem[] = items.map((i) => ({
        product_id: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        price: i.product.price || 0,
        image: i.product.img || '',
        category: i.product.cat || '',
        brand: i.product.brand || '',
      }));

      // Yapılı not — WhatsApp/PDF müşteri bloğunu doldurur (parseOrderNotes ayrıştırır).
      const info = getUserInfo();
      const notes = [
        isQuote ? 'Teklif Talebi' : '',
        (custName || info.fullName) ? `Teslimat: ${custName || info.fullName}` : '',
        info.company ? `Firma: ${info.company}` : '',
        custPhone ? `Tel: ${custPhone}` : '',
        orderNotes.trim(),
      ].filter(Boolean).join(' | ');

      const result = await createOrder(orderItems, getTotalPrice(), getTotalItems(), notes);
      setOrderLoading(false);
      if (result) {
        setOrderModal(false);
        setOrderNotes('');
        setCustPhone('');
        if (isQuote) {
          // Teklif talebi: sepet KORUNUR, sayfa değişmez — sadece onay göster.
          setQuoteSuccess(true);
          setTimeout(() => setQuoteSuccess(false), 4500);
        } else {
          setOrderSuccess(true);
          clearCart();
          setTimeout(() => {
            setOrderSuccess(false);
            navigate('/orders');
          }, 2500);
        }
      } else {
        setOrderError(t('cart.orderCreateFailed'));
      }
    } catch (err) {
      console.error('Order error:', err);
      setOrderLoading(false);
      setOrderError(t('cart.orderError'));
    }
  };

  const grouped = getItemsByCategory();
  const categoryKeys = Object.keys(grouped);
  const totalPrice = getTotalPrice();
  const totalItems = getTotalItems();

  const formatPrice = (p: number) =>
    p > 0 ? `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';

  const getCategoryName = (catId: string) =>
    CATEGORIES.find(c => c.id === catId)?.name || catId;

  const toggleCollapse = (cat: string) =>
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));

  // ─── PDF Export (ortak Angebot/Teklif şablonu) ──────────────────────────────
  const exportPDF = async () => {
    // Nakliye gideri — her PDF dışa aktarımında MUTLAKA sorulur. Varsayılan
    // 500 €; kullanıcı değiştirebilir. İptal edilirse PDF üretilmez.
    const shippingInput = window.prompt(
      'Nakliye gideri (€) — teklife kalem olarak eklenecek:',
      '500',
    );
    if (shippingInput === null) return;
    const shipping = Math.max(0, Number(String(shippingInput).replace(',', '.')) || 0);
    setPdfLoading(true);
    try {
      const quoteNo = `2MC-${Date.now().toString().slice(-6)}`;
      const now = new Date();
      const dateStr = now.toLocaleDateString('de-DE');
      const validTo = new Date(now);
      validTo.setDate(validTo.getDate() + 30);

      const lines: DocLine[] = items.map(({ product, quantity }, i) => {
        const dims = `${product.l}×${product.w}×${product.h} mm`;
        const sub = [product.id, product.brand, dims, product.kw > 0 ? `${product.kw} kW` : '']
          .filter(Boolean).join('  ·  ');
        return {
          pos: i + 1,
          name: product.name || '—',
          sub,
          qty: quantity,
          unit: 'Stück',
          unitPrice: product.price > 0 ? product.price : null,
          imageUrl: product.url || product.img || null,
        };
      });
      if (shipping > 0) {
        lines.push({
          pos: lines.length + 1,
          name: 'Versandkosten / Nakliye',
          qty: 1,
          unit: 'Pauschal',
          unitPrice: shipping,
        });
      }

      const doc = await buildAngebotPdf(
        { kind: 'angebot', number: quoteNo, date: dateStr, validUntil: validTo.toLocaleDateString('de-DE'), recipient: [] },
        lines,
      );
      doc.save(`Angebot_2MC_${quoteNo}_${dateStr.replace(/\./g, '-')}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setPdfLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          illustration={<EmptyCartIllustration />}
          title={t('cart.emptyTitle')}
          description={t('cart.emptyDesc')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 w-full">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black font-headline text-primary tracking-tight flex items-center gap-3">
            <ShoppingCart size={28} /> {t('cart.title')}
          </h1>
          <p className="text-on-surface-variant font-medium mt-1">{totalItems} {t('common.products')} · {formatPrice(totalPrice)}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleExportPDFClick}
            disabled={pdfLoading}
            title={isPro ? t('cart.pdfDownload') : t('cart.proOnly')}
            className={`relative px-5 py-2.5 rounded-lg font-headline font-bold text-sm flex items-center gap-2 transition-all shadow-sm disabled:opacity-60 ${
              isPro
                ? 'bg-surface-container-low hover:bg-surface-container-high text-primary'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white'
            }`}
          >
            {isPro ? <FileText size={16} /> : <Lock size={14} />}
            {pdfLoading ? t('cart.preparing') : t('cart.pdfQuote')}
            {!isPro && (
              <span className="ml-1 text-[9px] font-mono uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded">
                PRO
              </span>
            )}
          </button>
          <button
            onClick={openQuoteModal}
            title={t('cart.requestQuoteHint', 'Sepetinizi 2MC’ye teklif talebi olarak gönderin')}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-headline font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
          >
            <Send size={16} /> {t('cart.requestQuote')}
          </button>
          <button
            onClick={openOrderModal}
            className="bg-success hover:bg-success/90 text-white px-5 py-2.5 rounded-lg font-headline font-bold text-sm flex items-center gap-2 transition-all shadow-sm"
          >
            <Package size={16} /> {t('cart.placeOrder')}
          </button>
          <button
            onClick={() => setClearConfirm(true)}
            className="text-error hover:bg-error-container px-4 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
          >
            <Trash2 size={16} /> {t('cart.clearCart')}
          </button>
        </div>
      </div>

      {/* Company Info Card */}
      <div className="bg-gradient-to-r from-[#DC2626] to-[#B91C1C] rounded-xl p-5 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src="/logo-icon.png" alt="" className="absolute right-4 top-1/2 -translate-y-1/2 h-24 w-24 object-contain" />
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center relative z-10">
          <div className="flex-1">
            <img src="/logo-2mc-gastro.png" width="1208" height="288" alt="2MC Gastro" className="h-8 object-contain mb-2" style={{ filter: 'brightness(0) invert(1)' }} />
            <p className="text-xs text-red-200">{COMPANY_INFO.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-red-100">
            <span className="flex items-center gap-1.5"><MapPin size={11} className="text-red-300" /> {COMPANY_INFO.address}</span>
            <span className="flex items-center gap-1.5"><Phone size={11} className="text-red-300" /> {COMPANY_INFO.phone}</span>
            <span className="flex items-center gap-1.5"><Mail size={11} className="text-red-300" /> {COMPANY_INFO.email}</span>
            <span className="flex items-center gap-1.5"><Globe size={11} className="text-red-300" /> {COMPANY_INFO.website}</span>
          </div>
        </div>
      </div>

      {/* Items grouped by category */}
      <div className="space-y-4">
        {categoryKeys.map((cat) => {
          const catItems = grouped[cat];
          const catName = getCategoryName(cat);
          const isCollapsed = collapsed[cat];
          const catTotal = catItems.reduce((s, i) => s + i.quantity * (i.product.price || 0), 0);

          return (
            <div key={cat} className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
              <button
                onClick={() => toggleCollapse(cat)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? <ChevronRight size={16} className="text-on-surface-variant" /> : <ChevronDown size={16} className="text-on-surface-variant" />}
                  <span className="font-headline font-bold text-sm text-primary uppercase tracking-wider">{catName}</span>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {catItems.length} {t('common.products')} · {catItems.reduce((s, i) => s + i.quantity, 0)} {t('common.piece')}
                  </span>
                </div>
                <span className="text-sm font-mono font-bold text-success">{formatPrice(catTotal)}</span>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-outline-variant/10">
                  {catItems.map(({ product, quantity }) => (
                    <div key={product.id} className="flex items-center gap-4 px-5 py-3 hover:bg-surface-container-high/50 transition-colors">
                      <ProductImage src={product.img} alt={product.name} />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-on-surface truncate">{product.name}</p>
                        <p className="text-xs font-mono text-on-surface-variant mt-0.5">{product.id}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {product.brand && (
                            <span className="text-[10px] text-on-surface-variant/60 font-medium">{product.brand}</span>
                          )}
                          {product.url && (
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-primary hover:underline font-medium truncate max-w-[200px]"
                              title={product.url}
                            >
                              {t('cart.productImage')} ↗
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-xs text-on-surface-variant hidden sm:block w-24">
                        <p className="flex items-center justify-end gap-1"><Euro size={10} /> {formatPrice(product.price)}</p>
                        <p className="text-[10px]">{t('cart.unitPrice')}</p>
                      </div>

                      <div className="flex items-center gap-1.5 bg-surface-container rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-on-surface">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="text-right font-mono font-bold text-sm text-primary w-24 hidden sm:block">
                        {formatPrice(quantity * product.price)}
                      </div>

                      <button
                        onClick={() => removeItem(product.id)}
                        className="p-1.5 text-on-surface-variant/50 hover:text-error hover:bg-error-container rounded-lg transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total Summary */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm p-6">
        <div className="flex flex-col gap-3 max-w-sm ml-auto">
          <div className="flex justify-between text-sm text-on-surface-variant">
            <span>{t('common.subtotal')} ({totalItems} {t('common.piece')})</span>
            <span className="font-mono">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-sm text-on-surface-variant">
            <span>{t('common.vat')} (19%)</span>
            <span className="font-mono">{formatPrice(totalPrice * 0.19)}</span>
          </div>
          <div className="border-t border-outline-variant/20 pt-3 flex justify-between font-headline font-black text-lg text-primary">
            <span>{t('common.total')}</span>
            <span>{formatPrice(totalPrice * 1.19)}</span>
          </div>
          <button
            onClick={() => navigate('/checkout')}
            className="mt-2 w-full bg-[#DC2626] hover:bg-[#991B1B] text-white px-5 py-3 rounded-lg font-headline font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Package size={16} /> {t('cart.checkout', 'Ödemeye Git')}
          </button>
        </div>
      </div>

      {quoteSuccess && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full shadow-lg font-bold text-sm flex items-center gap-2 z-50">
          <CheckCircle size={16} /> {t('cart.quoteRequestSent', 'Teklif talebiniz alındı! En kısa sürede size dönüş yapılacak.')}
        </div>
      )}

      {/* Order Confirmation Modal */}
      {orderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-headline font-black text-on-surface flex items-center gap-2">
                {modalMode === 'quote'
                  ? <><Send size={20} className="text-primary" /> {t('cart.requestQuote')}</>
                  : <><Package size={20} className="text-success" /> {t('cart.confirmOrderTitle')}</>}
              </h2>
              <button onClick={() => setOrderModal(false)} className="p-1 hover:bg-surface-container-high rounded-full">
                <X size={18} />
              </button>
            </div>
            {modalMode === 'quote' && (
              <p className="text-xs text-on-surface-variant -mt-1">
                {t('cart.quoteModalHint', 'Talebiniz 2MC’ye iletilir, en kısa sürede dönüş yapılır. Sepetiniz korunur.')}
              </p>
            )}
            <div className="bg-surface-container-highest rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-on-surface-variant">{t('cart.itemCount')}</span><span className="font-bold">{totalItems}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">{t('common.subtotal')}</span><span className="font-mono">{formatPrice(totalPrice)}</span></div>
              <div className="flex justify-between"><span className="text-on-surface-variant">{t('common.vat')} (19%)</span><span className="font-mono">{formatPrice(totalPrice * 0.19)}</span></div>
              <div className="border-t pt-2 flex justify-between font-bold text-primary"><span>{t('common.total')}</span><span>{formatPrice(totalPrice * 1.19)}</span></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder={t('cart.fieldName', 'Ad Soyad / Firma')}
                className="bg-surface-container-highest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
              />
              <input
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                placeholder={t('cart.fieldPhone', 'Telefon')}
                inputMode="tel"
                className="bg-surface-container-highest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder={modalMode === 'quote' ? t('cart.quoteNotePlaceholder', 'Not (opsiyonel) — adres, teslim tarihi, özel istek…') : t('cart.orderNotePlaceholder')}
              className="w-full bg-surface-container-highest border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none resize-none h-20"
            />
            {orderError && (
              <div className="bg-error-container border border-error/20 text-error text-sm rounded-lg px-3 py-2">
                {orderError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setOrderModal(false); setOrderError(''); }}
                className="flex-1 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-container-low transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={orderLoading}
                className={`flex-1 py-2.5 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 ${modalMode === 'quote' ? 'bg-primary hover:bg-primary/90' : 'bg-success hover:bg-success/90'}`}
              >
                {orderLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : modalMode === 'quote' ? (
                  <><Send size={16} /> {t('cart.requestQuote')}</>
                ) : (
                  <><CheckCircle size={16} /> {t('cart.confirmOrder')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Success Toast */}
      {orderSuccess && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 bg-success text-white px-6 py-3 rounded-full shadow-lg font-bold text-sm flex items-center gap-2 z-50">
          <CheckCircle size={16} /> {t('cart.orderSuccess')}
        </div>
      )}

      {/* Sepeti Temizle — onay (yanlışlıkla silmeyi önler) */}
      {clearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setClearConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-headline font-black text-on-surface flex items-center gap-2">
              <Trash2 size={20} className="text-error" /> {t('cart.clearCart')}
            </h2>
            <p className="text-sm text-on-surface-variant">
              {t('cart.clearConfirm', 'Sepetteki tüm ürünler kaldırılacak. Emin misiniz?')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setClearConfirm(false)}
                className="flex-1 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-container-low transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => { clearCart(); setClearConfirm(false); }}
                className="flex-1 py-2.5 rounded-lg bg-error hover:bg-error/90 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Trash2 size={16} /> {t('cart.clearConfirmYes', 'Evet, temizle')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ PRO PAYWALL MODAL ============ */}
      {paywallOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setPaywallOpen(false)}
        >
          <div
            className="relative w-full max-w-md bg-gradient-to-br from-white via-red-50 to-white rounded-3xl overflow-hidden shadow-2xl border border-brand-red/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow */}
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-[#DC2626]/20 blur-3xl pointer-events-none" />

            <button
              onClick={() => setPaywallOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors z-10"
              aria-label={t('common.close')}
            >
              <X size={16} />
            </button>

            <div className="relative p-8 text-[#0F2440]">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-red/10 border border-brand-red/30 mb-4">
                <Sparkles size={12} className="text-brand-red" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-brand-red">
                  {t('cart.proSubscription')}
                </span>
              </div>

              <h3 className="text-2xl font-black mb-2 leading-tight">
                {t('cart.paywallTitle')}
              </h3>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                {t('cart.paywallDesc')}
              </p>

              <div className="space-y-3 mb-6">
                {[
                  t('cart.proFeat1'),
                  t('cart.proFeat2'),
                  t('cart.proFeat3'),
                  t('cart.proFeat4'),
                ].map((f) => (
                  <div key={f} className="flex items-start gap-3 text-sm text-slate-700">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-brand-red/10 border border-brand-red/30 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-brand-red" />
                    </div>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-black text-[#0F2440]">€29</span>
                <span className="text-slate-500 text-sm">/ {t('cart.month')}</span>
                <span className="ml-auto text-[10px] font-mono uppercase tracking-wider text-brand-red/80">
                  {t('cart.cancelAnytime')}
                </span>
              </div>

              <button
                onClick={() => {
                  setPaywallOpen(false);
                  navigate('/settings?tab=subscription');
                }}
                className="w-full py-3.5 rounded-xl bg-brand-red hover:bg-[#B91C1C] text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-red/30"
              >
                <Sparkles size={16} />
                {t('cart.upgradePro')}
              </button>
              <button
                onClick={() => setPaywallOpen(false)}
                className="w-full mt-2 py-2.5 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors"
              >
                {t('cart.maybeLater')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
