import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  X, ShoppingCart, Check, Loader2, Ruler, FolderPlus, Box, Boxes,
  Plus, Minus, GitCompareArrows, Link2, Zap, ListChecks, Package,
  ShieldCheck, Truck, ReceiptText, BadgeCheck, Clock, Sparkles, Tag, Info, FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProductDetailStore } from '../stores/productDetailStore';
import { useCartStore } from '../stores/cartStore';
import { useProjectStore } from '../stores/projectStore';
import { useEquipmentStore, type EquipmentItem } from '../stores/equipmentStore';
import { useCompareStore, equipmentToCompareItem } from '../stores/compareStore';
import { resolvedOf, isAccessory, getCompatibleAccessories } from '../lib/categoryTaxonomy';
import { normalizeRow, vmFromEquipment, fmtPrice, TABLE, type VM, type DimRow } from '../lib/productDetailVM';
import { buildProductCopy, isProseDesc } from '../lib/productCopy';
import Model3DViewer from './Model3DViewer';

const DIM_DEFAULT: Record<DimRow['key'], string> = {
  length: 'Uzunluk', width: 'Genişlik', depth: 'Derinlik', height: 'Yükseklik', weight: 'Ağırlık',
};

/** Tıklanınca hata durumunda placeholder gösteren ürün görseli. */
function DrawerImage({ src, alt }: { src?: string; alt: string }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [src]);
  if (err || !src) {
    return <Box size={72} className="text-slate-200" strokeWidth={1.2} />;
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setErr(true)}
      className="max-h-full max-w-full object-contain"
    />
  );
}

/** Aksesuar / benzer ürün mini kartı — tıklanınca o ürünün detayını açar. */
function MiniCard({ item, onClick }: { item: EquipmentItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-32 shrink-0 text-left bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-brand-red/40 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="h-20 bg-gradient-to-b from-slate-50 to-white grid place-items-center p-1.5">
        {item.img ? <img src={item.img} alt={item.name} loading="lazy" className="max-h-full max-w-full object-contain" /> : <Package size={22} className="text-slate-300" />}
      </div>
      <div className="p-2">
        <p className="text-[10px] font-bold text-slate-700 line-clamp-2 leading-tight h-7">{item.name?.trim() || item.id}</p>
        <p className="text-[11px] font-black text-[#0F2440] mt-1">{item.price > 0 ? `€${item.price.toLocaleString('de-DE')}` : '—'}</p>
      </div>
    </button>
  );
}

export default function ProductDetailDrawer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const current = useProductDetailStore((s) => s.current);
  const close = useProductDetailStore((s) => s.close);
  const openFromItem = useProductDetailStore((s) => s.openFromItem);

  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const projects = useProjectStore((s) => s.projects);
  const setFloorPlanItem = useEquipmentStore((s) => s.setFloorPlanItem);
  const allItems = useEquipmentStore((s) => s.allItems);
  const toggleCompare = useCompareStore((s) => s.toggleItem);
  const compareList = useCompareStore((s) => s.items);

  const [row, setRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [pickProject, setPickProject] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [copied, setCopied] = useState(false);

  // Supabase'ten zengin satırı çek; bulunamazsa fallback (vmFromEquipment) devreye girer.
  useEffect(() => {
    setRow(null); setImgIdx(0); setQty(1); setPickProject(false); setShow3D(false); setCopied(false);
    if (!current) return;
    if (!supabase) return; // fallback render edilir
    let cancelled = false;
    setLoading(true);
    supabase
      .from(TABLE[current.source])
      .select('*')
      .eq('id', current.id)
      .limit(1) // id benzersiz değilse (bazı HENDI satırları) "multiple rows" hatasını önle
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setRow(data); // hata/boş → row null kalır, fallback çizilir
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [current]);

  // Body scroll kilidi + ESC ile kapat
  useEffect(() => {
    if (!current) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [current, close]);

  const vm = useMemo<VM | null>(() => {
    if (!current) return null;
    if (row) return normalizeRow(current.source, row);
    if (current.fallback) return vmFromEquipment(current.fallback);
    return null;
  }, [current, row]);

  // Aksesuar / benzer ürün için yerel katalog öğesi (doğru id eşlemesi için fallback önce).
  const localItem = useMemo<EquipmentItem | null>(() => {
    if (!current) return null;
    return current.fallback ?? allItems.find((i) => i.id === current.id) ?? (vm ? vm.cart : null);
  }, [current, allItems, vm]);

  const accessories = useMemo(
    () => (localItem ? getCompatibleAccessories(localItem, allItems, 12) : []),
    [localItem, allItems],
  );

  const related = useMemo(() => {
    if (!localItem) return [];
    const cat = resolvedOf(localItem).cat;
    return allItems
      .filter((it) => it.id !== localItem.id && !isAccessory(it) && (
        (localItem.fam && it.fam === localItem.fam) ||
        (!!cat && resolvedOf(it).cat === cat && (it.sub === localItem.sub || !localItem.sub))
      ))
      .slice(0, 12);
  }, [localItem, allItems]);

  const dims = useMemo(
    () => (vm ? vm.dims.map((d) => ({ k: t(`product.${d.key}`, DIM_DEFAULT[d.key]), v: d.value })) : []),
    [vm, t],
  );

  // Üretilen pazarlama metni (giriş + avantajlar) — kategoriye göre.
  const catId = useMemo(() => (localItem ? resolvedOf(localItem).cat : null), [localItem]);
  const copy = useMemo(() => (vm ? buildProductCopy(vm, catId, t) : null), [vm, catId, t]);
  const showDescProse = !!(vm && vm.features.length <= 1 && isProseDesc(vm.desc));

  const open = !!current;
  const inCart = vm ? cartItems.some((i) => i.product.id === vm.cart.id) : false;
  const inCompare = vm ? compareList.some((i) => i.id === vm.cart.id) : false;
  const activeProjects = projects.filter((p) => p.status !== 'complete');
  const hasPrice = !!(vm && (vm.promo ?? vm.price) && (vm.promo ?? vm.price)! > 0);
  const effPrice = vm ? (vm.promo ?? vm.price) : null;

  const onCopyLink = () => {
    if (!vm) return;
    try {
      const url = `${window.location.origin}/magaza?p=${encodeURIComponent(vm.displayId)}`;
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* sessiz geç */ }
  };

  const onPrimary = () => {
    if (!vm) return;
    addItem(vm.cart, qty);
    if (!hasPrice) { close(); navigate('/cart'); } // teklif akışı
  };

  const trust = [
    { Icon: ShieldCheck, label: t('product.warranty', '2 yıl garanti') },
    { Icon: Truck, label: t('product.shipping', 'Almanya geneli teslimat') },
    { Icon: ReceiptText, label: t('product.b2bInvoice', 'B2B fatura') },
    { Icon: BadgeCheck, label: t('product.original', 'Orijinal ürün') },
  ];

  return (
    <>
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={t('product.detail', 'Ürün Detayı')}>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            className="absolute inset-0 bg-[#0F2440]/55 backdrop-blur-sm"
          />

          {/* Panel — mobilde tam ekran, masaüstünde sabit genişlik */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.42 }}
            className="absolute right-0 top-0 h-full w-full sm:w-[480px] max-w-full bg-white shadow-[0_0_60px_-10px_rgba(15,36,64,0.45)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-red truncate">
                  {vm?.brand || current?.source}
                </span>
                {loading && <Loader2 size={13} className="animate-spin text-slate-300 shrink-0" />}
              </div>
              <button
                onClick={close}
                aria-label={t('common.close', 'Kapat')}
                className="grid place-items-center w-9 h-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-brand-red transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* İçerik */}
            {!vm && loading && (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={26} className="animate-spin text-brand-red" />
              </div>
            )}
            {!vm && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
                <Package size={40} className="text-slate-300" />
                <p className="text-sm font-bold text-slate-500">{t('product.notFound', 'Ürün bulunamadı')}</p>
              </div>
            )}

            {vm && (
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {/* Galeri */}
                <div className="relative bg-gradient-to-b from-slate-50 to-white px-5 pt-5 pb-4">
                  {/* Rozetler */}
                  {vm.badges.length > 0 && (
                    <div className="absolute top-4 left-5 z-10 flex flex-col gap-1.5">
                      {vm.badges.includes('new') && (
                        <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow"><Sparkles size={11} /> {t('product.badgeNew', 'Yeni')}</span>
                      )}
                      {vm.badges.includes('deal') && (
                        <span className="inline-flex items-center gap-1 bg-brand-red text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md shadow"><Tag size={11} /> {t('product.badgeDeal', 'Fırsat')}</span>
                      )}
                    </div>
                  )}
                  <div className="w-full h-60 flex items-center justify-center">
                    <DrawerImage src={vm.images[imgIdx]} alt={vm.name} />
                  </div>
                  {vm.images.length > 1 && (
                    <div className="flex gap-2 mt-3 flex-wrap justify-center">
                      {vm.images.slice(0, 8).map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setImgIdx(i)}
                          className={`w-12 h-12 rounded-lg border-2 overflow-hidden bg-white grid place-items-center ${i === imgIdx ? 'border-brand-red' : 'border-slate-200'}`}
                        >
                          <img src={img} alt="" className="w-full h-full object-contain" />
                        </button>
                      ))}
                    </div>
                  )}
                  {vm.can3D && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => setShow3D(true)}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                      >
                        <Boxes size={14} /> {t('product.view3d', '3D Görüntüle')}
                      </button>
                    </div>
                  )}
                </div>

                <div className="px-5 pb-5">
                  {/* Marka + kategori */}
                  {vm.category && (
                    <p className="text-[11px] font-bold text-brand-red uppercase tracking-wider">{vm.category}</p>
                  )}
                  {/* Ad */}
                  <h2 className="text-lg font-display font-black text-[#0F2440] leading-snug mt-1">{vm.name}</h2>
                  {/* SKU */}
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{vm.displayId}</p>

                  {/* Fiyat + stok */}
                  <div className="flex items-end flex-wrap gap-x-3 gap-y-1 mt-3">
                    {hasPrice ? (
                      <>
                        <span className="text-2xl font-display font-black text-[#0F2440] leading-none">{fmtPrice(effPrice)}</span>
                        {vm.promo != null && vm.price && (
                          <span className="text-sm text-slate-400 line-through mb-0.5">{fmtPrice(vm.price)}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-base font-bold text-slate-500">{t('product.priceOnRequest', 'Teklif ile fiyat')}</span>
                    )}
                    <span className={`mb-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${vm.inStock ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {vm.inStock
                        ? (vm.stockQty && vm.stockQty > 0 ? `${t('product.inStock', 'Stokta')} (${vm.stockQty})` : t('product.inStock', 'Stokta'))
                        : t('product.outOfStock', 'Stok yok')}
                    </span>
                  </div>
                  {/* Leasing */}
                  {hasPrice && (
                    <p className="text-[11px] font-bold text-slate-500 mt-1.5">
                      {t('product.leasing', 'Leasing')} <span className="text-brand-red">€ {Math.round((effPrice! * 1.15) / 60)}{t('product.perMonth', '/Ay')}</span>
                    </p>
                  )}
                  {/* Teslim süresi */}
                  {vm.deliveryDays != null && vm.deliveryDays > 0 && (
                    <p className="text-[11px] font-medium text-slate-500 mt-1 inline-flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" /> {t('product.deliveryEst', 'Tahmini teslim')} ~{vm.deliveryDays} {t('product.daysShort', 'gün')}
                    </p>
                  )}

                  {/* Güven rozetleri */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {trust.map(({ Icon, label }) => (
                      <div key={label} className="flex items-center gap-2 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-2">
                        <Icon size={14} className="text-emerald-600 shrink-0" /> <span className="leading-tight">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Ürün Açıklaması — üretilen giriş + (varsa) üreticinin gerçek prose metni */}
                  {copy && (
                    <div className="mt-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('product.description', 'Açıklama')}</p>
                      <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-line">{copy.intro}</p>
                      {showDescProse && (
                        <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-line mt-2">{vm.desc}</p>
                      )}
                    </div>
                  )}

                  {/* Ürün Avantajları */}
                  {copy && copy.advantages.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <ListChecks size={11} /> {t('product.advantages', 'Ürün Avantajları')}
                      </p>
                      <ul className="space-y-1">
                        {copy.advantages.map((f, i) => (
                          <li key={i} className="flex gap-2 text-[12px] text-slate-600 leading-relaxed">
                            <Check size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Ek bilgi (popup_info) */}
                  {vm.popupInfo && (
                    <div className="mt-4 flex gap-2 text-[12px] text-amber-900 bg-amber-50 border border-amber-200/70 rounded-lg px-3 py-2.5">
                      <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="leading-relaxed whitespace-pre-line">{vm.popupInfo}</p>
                    </div>
                  )}

                  {/* Ölçüler */}
                  {dims.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Ruler size={11} /> {t('product.dimensions', 'Ölçüler')}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {dims.map((d) => (
                          <span key={d.k} className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600">
                            <b className="text-slate-400 font-bold">{d.k}</b> {d.v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Güç */}
                  {vm.kw != null && vm.kw > 0 && (
                    <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-600 bg-amber-50 border border-amber-200/70 rounded-lg px-2.5 py-1">
                      <Zap size={13} className="text-amber-500" /> {t('product.power', 'Güç')}: {vm.kw} kW
                    </div>
                  )}

                  {/* Teknik özellikler */}
                  {vm.specs.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('product.specs', 'Teknik Özellikler')}</p>
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        {vm.specs.map((s, i) => (
                          <div key={i} className={`flex justify-between gap-3 px-3 py-1.5 text-[11px] ${i % 2 ? 'bg-slate-50' : 'bg-white'}`}>
                            <span className="text-slate-500">{s.label}</span>
                            <span className="text-slate-800 font-medium text-right">{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Uyumlu aksesuarlar */}
                  {accessories.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('product.accessories', 'Uyumlu aksesuarlar')}</p>
                      <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 -mx-1 px-1">
                        {accessories.map((a) => (
                          <MiniCard key={a.id} item={a} onClick={() => openFromItem(a)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Benzer ürünler */}
                  {related.length > 0 && (
                    <div className="mt-5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('product.relatedProducts', 'Benzer ürünler')}</p>
                      <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 -mx-1 px-1">
                        {related.map((rp) => (
                          <MiniCard key={rp.id} item={rp} onClick={() => openFromItem(rp)} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer — aksiyonlar */}
            {vm && (
              <div className="shrink-0 border-t border-slate-100 px-5 py-4 space-y-2.5 bg-white">
                {/* Adet + Sepete ekle / Teklif iste */}
                <div className="flex items-stretch gap-2">
                  <div className="inline-flex items-center rounded-xl border border-slate-200 overflow-hidden shrink-0">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      aria-label={t('common.decrease', 'Azalt')}
                      className="grid place-items-center w-10 h-11 text-slate-600 hover:bg-slate-100 hover:text-brand-red transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="min-w-[34px] text-center text-sm font-bold text-[#0F2440] tabular-nums">{qty}</span>
                    <button
                      onClick={() => setQty((q) => q + 1)}
                      aria-label={t('common.increase', 'Arttır')}
                      className="grid place-items-center w-10 h-11 text-slate-600 hover:bg-slate-100 hover:text-brand-red transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={onPrimary}
                    className={`flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold transition-all cursor-pointer ${inCart && hasPrice ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-red text-white hover:bg-[#B91C1C]'}`}
                  >
                    {!hasPrice
                      ? <><FileText size={16} /> {t('product.requestQuote', 'Teklif iste')}</>
                      : inCart
                        ? <><Check size={16} /> {t('product.inCart', 'Sepette')}</>
                        : <><ShoppingCart size={16} /> {t('product.addToCart', 'Sepete ekle')}</>}
                  </button>
                </div>

                {/* Projeye ekle */}
                {!pickProject ? (
                  <button
                    onClick={() => setPickProject(true)}
                    className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl text-[13px] font-bold bg-white text-slate-700 border border-slate-200 hover:border-brand-red/40 hover:text-brand-red transition-all cursor-pointer"
                  >
                    <FolderPlus size={15} /> {t('product.addToProject', 'Projeye ekle')}
                  </button>
                ) : (
                  <div className="rounded-xl border border-slate-200 p-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1">{t('product.whichProject', 'Hangi projeye?')}</p>
                    {activeProjects.length === 0 ? (
                      <p className="text-xs text-slate-400 px-1 py-2">{t('product.noActiveProject', 'Aktif proje yok. Önce bir proje oluşturun.')}</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {activeProjects.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => { setFloorPlanItem(vm.id); close(); navigate(`/projects/${p.id}/design`); }}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-brand-red transition-colors cursor-pointer"
                          >
                            {p.name || p.id}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Karşılaştır + Link kopyala */}
                <div className="flex items-stretch gap-2">
                  <button
                    onClick={() => toggleCompare(equipmentToCompareItem(vm.cart))}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${inCompare ? 'bg-brand-red/10 text-brand-red border border-brand-red/30' : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-red/40 hover:text-brand-red'}`}
                  >
                    <GitCompareArrows size={14} /> {inCompare ? t('product.inCompare', 'Karşılaştırmada') : t('product.compare', 'Karşılaştır')}
                  </button>
                  <button
                    onClick={onCopyLink}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl text-[12px] font-bold bg-white text-slate-600 border border-slate-200 hover:border-brand-red/40 hover:text-brand-red transition-all cursor-pointer"
                  >
                    {copied ? <><Check size={14} className="text-emerald-500" /> {t('product.linkCopied', 'Kopyalandı')}</> : <><Link2 size={14} /> {t('product.copyLink', 'Linki kopyala')}</>}
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>

    {/* 3D (Diamond) — Model3DViewer kendi tam-ekran modal'ını çizer */}
    {show3D && vm?.can3D && (
      <Model3DViewer productId={vm.id} productName={vm.name} onClose={() => setShow3D(false)} />
    )}
    </>
  );
}
