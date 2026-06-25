import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { proxiedImage } from '../lib/assets';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

const eur = (n: number) => `€ ${(n || 0).toLocaleString('de-DE')}`;

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce((s, i) => s + i.quantity * (i.product.price || 0), 0);

  // Lock body scroll + ESC close while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const goToCheckout = () => { onClose(); navigate('/cart'); };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={t('nav.cart', 'Sepet')}>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0F2440]/55 backdrop-blur-sm"
          />

          {/* Panel — full width on mobile, fixed width on larger screens */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.42 }}
            className="absolute right-0 top-0 h-full w-full sm:w-[420px] max-w-full bg-white shadow-[0_0_60px_-10px_rgba(15,36,64,0.45)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="relative grid place-items-center w-9 h-9 rounded-full bg-brand-red/10 text-brand-red shrink-0">
                  <ShoppingCart className="w-4.5 h-4.5" strokeWidth={2.2} />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display font-black text-[15px] text-[#0F2440] leading-tight truncate">
                    {t('nav.cart', 'Sepet')}
                  </h2>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    {count} {t('cart.itemsShort', 'ürün')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label={t('common.close', 'Kapat')}
                className="grid place-items-center w-10 h-10 rounded-full text-slate-500 hover:bg-slate-100 hover:text-brand-red transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
                <span className="grid place-items-center w-20 h-20 rounded-full bg-slate-50 text-slate-300">
                  <ShoppingCart className="w-9 h-9" strokeWidth={1.6} />
                </span>
                <p className="text-sm font-bold text-[#0F2440]">{t('cart.empty', 'Sepetiniz boş')}</p>
                <p className="text-xs text-slate-500 -mt-2">{t('cart.emptyHint', 'Kataloğa göz atın ve ürün ekleyin.')}</p>
                <button
                  onClick={onClose}
                  className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0F2440] hover:bg-[#1a3357] text-white text-[11px] font-bold uppercase tracking-[0.16em] transition-colors cursor-pointer"
                >
                  {t('cart.continueShopping', 'Alışverişe Devam Et')}
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-3">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex gap-3 p-3 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 transition-colors"
                  >
                    <div className="w-16 h-16 shrink-0 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden grid place-items-center">
                      {item.product.img ? (
                        <img
                          src={proxiedImage(item.product.img)}
                          alt={item.product.name}
                          loading="lazy"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ShoppingCart className="w-6 h-6 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[12px] font-bold text-[#0F2440] leading-snug line-clamp-2">
                          {item.product.name}
                        </p>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          aria-label={t('common.remove', 'Kaldır')}
                          className="grid place-items-center w-7 h-7 -mt-1 -mr-1 rounded-full text-slate-400 hover:bg-red-50 hover:text-brand-red transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {item.product.brand && (
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400 mt-0.5">
                          {item.product.brand}
                        </span>
                      )}

                      <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                        {/* qty stepper */}
                        <div className="inline-flex items-center rounded-full border border-slate-200 overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            aria-label={t('common.decrease', 'Azalt')}
                            className="grid place-items-center w-8 h-8 text-slate-600 hover:bg-slate-100 hover:text-brand-red transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="min-w-[28px] text-center text-[12px] font-bold text-[#0F2440] tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            aria-label={t('common.increase', 'Arttır')}
                            className="grid place-items-center w-8 h-8 text-slate-600 hover:bg-slate-100 hover:text-brand-red transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[13px] font-display font-black text-[#0F2440] whitespace-nowrap">
                          {eur(item.quantity * (item.product.price || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={clearCart}
                  className="w-full mt-1 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 hover:text-brand-red transition-colors cursor-pointer"
                >
                  {t('cart.clear', 'Sepeti Temizle')}
                </button>
              </div>
            )}

            {/* Footer */}
            {items.length > 0 && (
              <div className="shrink-0 border-t border-slate-100 px-5 py-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {t('cart.subtotal', 'Ara Toplam')}
                  </span>
                  <span className="text-xl font-display font-black text-[#0F2440]">{eur(subtotal)}</span>
                </div>
                <p className="text-[10px] text-slate-400 -mt-1">{t('cart.vatNote', 'KDV ve nakliye sonraki adımda.')}</p>
                <button
                  onClick={goToCheckout}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-full bg-brand-red hover:bg-[#B91C1C] text-white text-[11px] font-bold uppercase tracking-[0.16em] shadow-[0_12px_24px_-10px_rgba(220,38,38,0.6)] transition-colors cursor-pointer"
                >
                  {t('cart.goToCheckout', 'Sepete Git / Teklif Al')}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-full border border-slate-200 text-[#0F2440] text-[11px] font-bold uppercase tracking-[0.16em] hover:border-brand-red hover:text-brand-red transition-colors cursor-pointer"
                >
                  {t('cart.continueShopping', 'Alışverişe Devam Et')}
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export default CartDrawer;
