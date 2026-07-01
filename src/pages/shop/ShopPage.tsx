import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '../../components/Navbar';
import { AnnouncementBar } from '../../components/landing/sections/AnnouncementBar';
import SiteFooter from '../../components/SiteFooter';
import { useEquipmentStore, CATEGORIES, type EquipmentItem } from '../../stores/equipmentStore';
import { resolvedOf, matchesSubGroup, getSubGroupsFor, isAccessory } from '../../lib/categoryTaxonomy';
import { useCartStore } from '../../stores/cartStore';
import { useCompareStore, equipmentToCompareItem } from '../../stores/compareStore';
import { useProductDetailStore } from '../../stores/productDetailStore';
import {
  Search, X, ShoppingCart, BadgeCheck, ChevronLeft, ChevronRight, ArrowUpDown,
  Package, Zap, ShieldCheck, Truck, Store, SlidersHorizontal, Check, Tag,
  Refrigerator, Flame, Droplets, Microwave, Waves, Table, GitCompareArrows,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  refrigerator: Refrigerator, flame: Flame, droplets: Droplets,
  microwave: Microwave, waves: Waves, table: Table,
};

type SortKey = 'default' | 'name-asc' | 'price-asc' | 'price-desc' | 'kw-desc';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Önerilen sıralama' },
  { value: 'name-asc', label: 'İsim (A → Z)' },
  { value: 'price-asc', label: 'Fiyat (artan)' },
  { value: 'price-desc', label: 'Fiyat (azalan)' },
  { value: 'kw-desc', label: 'Güç (yüksek → düşük)' },
];

const PRICE_RANGES: { key: string; label: string; test: (p: number) => boolean }[] = [
  { key: 'all', label: 'Tüm fiyatlar', test: () => true },
  { key: 'lt500', label: '€0 – €500', test: (p) => p > 0 && p < 500 },
  { key: 'mid1', label: '€500 – €2.000', test: (p) => p >= 500 && p < 2000 },
  { key: 'mid2', label: '€2.000 – €5.000', test: (p) => p >= 2000 && p < 5000 },
  { key: 'gt5000', label: '€5.000 ve üzeri', test: (p) => p >= 5000 },
];

const POWER_RANGES: { key: string; label: string; test: (kw: number) => boolean }[] = [
  { key: 'all', label: 'Tüm güçler', test: () => true },
  { key: 'p0', label: 'Elektriksiz (0 kW)', test: (k) => k <= 0 },
  { key: 'p1', label: '0 – 5 kW', test: (k) => k > 0 && k < 5 },
  { key: 'p2', label: '5 – 15 kW', test: (k) => k >= 5 && k < 15 },
  { key: 'p3', label: '15 kW ve üzeri', test: (k) => k >= 15 },
];

const PER_PAGE = 24;

function ProductImage({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error || !src) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Package size={34} className="text-slate-300" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setError(true)}
      className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-110"
    />
  );
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const allItems = useEquipmentStore((s) => s.allItems);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const cartItems = useCartStore((s) => s.items);
  const cartIds = useMemo(() => new Set(cartItems.map((i) => i.product.id)), [cartItems]);
  const cartCount = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems]);

  // Ürün karşılaştırma (global panel App kökünde render edilir)
  const compareItems = useCompareStore((s) => s.items);
  const toggleCompare = useCompareStore((s) => s.toggleItem);
  const compareIds = useMemo(() => new Set(compareItems.map((i) => i.id)), [compareItems]);

  // Karta tıklayınca sağdan açılan tek standart detay paneli (App kökünde mount).
  const openDetail = useProductDetailStore((s) => s.openFromItem);

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('cat') || '');
  const [subGroup, setSubGroup] = useState(searchParams.get('sub') || '');
  const [priceKey, setPriceKey] = useState('all');
  const [powerKey, setPowerKey] = useState('all');
  const [sort, setSort] = useState<SortKey>('default');
  const [page, setPage] = useState(1);
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => { document.title = 'Online Shop — 2MC Gastro'; }, []);

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setCategory(searchParams.get('cat') || '');
    setSubGroup(searchParams.get('sub') || '');
    setPage(1);
  }, [searchParams]);

  const resetPage = () => setPage(1);

  // Seçili kategorinin temiz/sıralı alt-grupları (taksonomi).
  const subGroups = useMemo(() => (category ? getSubGroupsFor(category, allItems) : []), [category, allItems]);

  // Aksesuar/küçük parçalar katalogda gizli — yalnızca ürün detay sayfasında uyumlu aksesuar olarak görünür.
  const browseItems = useMemo(() => allItems.filter((i) => !isAccessory(i)), [allItems]);

  const filtered = useMemo(() => {
    let list = browseItems;
    if (category) list = list.filter((i) => resolvedOf(i).cat === category);
    if (category && subGroup) list = list.filter((i) => matchesSubGroup(category, subGroup, i));
    const range = PRICE_RANGES.find((r) => r.key === priceKey);
    if (range && range.key !== 'all') list = list.filter((i) => range.test(i.price));
    const pr = POWER_RANGES.find((r) => r.key === powerKey);
    if (pr && pr.key !== 'all') list = list.filter((i) => pr.test(Number(i.kw) || 0));
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          i.desc.toLowerCase().includes(q) ||
          i.brand.toLowerCase().includes(q) ||
          i.sub.toLowerCase().includes(q) ||
          i.fam.toLowerCase().includes(q)
      );
    }
    return list;
  }, [browseItems, category, subGroup, priceKey, powerKey, query]);

  const sorted = useMemo(() => {
    const priceVal = (p: number) => (p > 0 ? p : Number.POSITIVE_INFINITY);
    const arr = [...filtered];
    if (sort === 'name-asc') arr.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    else if (sort === 'price-asc') arr.sort((a, b) => priceVal(a.price) - priceVal(b.price));
    else if (sort === 'price-desc') arr.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sort === 'kw-desc') arr.sort((a, b) => (b.kw || 0) - (a.kw || 0));
    // Önerilen (default): önemli/yüksek değerli ürünler önce, fiyatsız ("Fiyat sorun") en sona
    else arr.sort((a, b) => (b.price > 0 ? b.price : -1) - (a.price > 0 ? a.price : -1));
    return arr;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const setCat = (id: string) => {
    setCategory(id);
    setSubGroup(''); // kategori değişince alt-grup sıfırlanır
    resetPage();
    setMobileFilters(false);
    const next = new URLSearchParams(searchParams);
    if (id) next.set('cat', id); else next.delete('cat');
    next.delete('sub');
    if (query) next.set('q', query); else next.delete('q'); // arama terimini koru
    setSearchParams(next, { replace: true });
  };

  const setSub = (id: string) => {
    setSubGroup(id);
    resetPage();
    const next = new URLSearchParams(searchParams);
    if (category) next.set('cat', category);
    if (id) next.set('sub', id); else next.delete('sub');
    if (query) next.set('q', query); else next.delete('q');
    setSearchParams(next, { replace: true });
  };

  const activeCount = (category ? 1 : 0) + (subGroup ? 1 : 0) + (priceKey !== 'all' ? 1 : 0) + (powerKey !== 'all' ? 1 : 0);
  const formatPrice = (p: number) => (p > 0 ? `€ ${p.toLocaleString('de-DE')}` : 'Fiyat sorun');

  const clearAll = () => {
    setCategory(''); setSubGroup(''); setPriceKey('all'); setPowerKey('all'); setQuery(''); resetPage();
    const next = new URLSearchParams(searchParams); next.delete('cat'); next.delete('sub'); next.delete('q');
    setSearchParams(next, { replace: true });
  };

  // Bölüm başlığı (kırmızı aksan çizgili)
  const sectionTitle = (text: string) => (
    <div className="flex items-center gap-1.5 mb-2 px-1">
      <span className="w-1 h-3.5 rounded-full bg-brand-red" />
      <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{text}</h3>
    </div>
  );

  // Tekli seçim radyo grubu (fiyat / güç)
  const radioGroup = (
    items: { key: string; label: string }[],
    selected: string,
    onPick: (k: string) => void,
  ) => (
    <div className="space-y-0.5">
      {items.map((r) => {
        const isActive = selected === r.key;
        return (
          <button
            key={r.key}
            onClick={() => { onPick(r.key); resetPage(); }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              isActive ? 'bg-brand-red/10 text-brand-red' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className={`w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isActive ? 'border-brand-red' : 'border-slate-300'}`}>
              {isActive && <span className="w-[7px] h-[7px] rounded-full bg-brand-red" />}
            </span>
            {r.label}
          </button>
        );
      })}
    </div>
  );

  /* ── Filtre paneli içeriği (hem masaüstü sidebar hem mobil drawer) ── */
  const renderFilters = () => (
    <div className="space-y-5">
      {/* Kategoriler */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-3.5 rounded-full bg-brand-red" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Kategoriler</h3>
          </div>
          {activeCount > 0 && (
            <button onClick={clearAll} className="text-[10px] font-bold text-brand-red hover:underline">Temizle</button>
          )}
        </div>
        <div className="space-y-0.5 max-h-[320px] overflow-y-auto pr-1 -mr-1 [scrollbar-width:thin]">
          <button
            onClick={() => setCat('')}
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[13px] font-bold transition-all ${
              !category ? 'bg-brand-red/10 text-brand-red' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="flex items-center gap-2"><Store size={15} /> Tüm Ürünler</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${!category ? 'bg-brand-red/15 text-brand-red' : 'bg-slate-100 text-slate-400'}`}>{browseItems.length.toLocaleString('de-DE')}</span>
          </button>
          {CATEGORIES.filter((c) => c.count > 0).map((cat) => {
            const Icon = iconMap[cat.icon] || Package;
            const isActive = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCat(isActive ? '' : cat.id)}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                  isActive ? 'bg-brand-red/10 text-brand-red' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0"><Icon size={15} className="shrink-0" /> <span className="truncate">{cat.name}</span></span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${isActive ? 'bg-brand-red/15 text-brand-red' : 'bg-slate-100 text-slate-400'}`}>{cat.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alt Grup (üretici serisi / tipi) — yalnızca kategori seçiliyken */}
      {category && subGroups.length > 0 && (
        <>
          <div className="h-px bg-slate-100" />
          <div>
            {sectionTitle('Alt Grup')}
            <div className="space-y-0.5 max-h-[280px] overflow-y-auto pr-1 -mr-1 [scrollbar-width:thin]">
              <button
                onClick={() => setSub('')}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[13px] font-bold transition-all ${
                  !subGroup ? 'bg-brand-red/10 text-brand-red' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>Alle Gruppen</span>
              </button>
              {subGroups.map((sg) => {
                const isActive = subGroup === sg.id;
                return (
                  <button
                    key={sg.id}
                    onClick={() => setSub(isActive ? '' : sg.id)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                      isActive ? 'bg-brand-red/10 text-brand-red' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{sg.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${isActive ? 'bg-brand-red/15 text-brand-red' : 'bg-slate-100 text-slate-400'}`}>{sg.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="h-px bg-slate-100" />

      {/* Fiyat */}
      <div>
        {sectionTitle('Fiyat Aralığı')}
        {radioGroup(PRICE_RANGES, priceKey, setPriceKey)}
      </div>

      <div className="h-px bg-slate-100" />

      {/* Güç (kW) */}
      <div>
        {sectionTitle('Güç (kW)')}
        {radioGroup(POWER_RANGES, powerKey, setPowerKey)}
      </div>
    </div>
  );

  return (
    <div className="landing-page relative text-[#0F2440] bg-[#F4F5F7] min-h-screen selection:bg-brand-red selection:text-white">
      <div className="relative">
        <AnnouncementBar />
        <Navbar />

        <main className="relative z-10 pt-[108px]">
          {/* ── HERO — kompakt, modern ── */}
          <section className="relative overflow-hidden bg-gradient-to-br from-[#0F2440] via-[#1E3A5F] to-[#0F2440]">
            <div className="absolute -top-20 -right-16 w-80 h-80 bg-brand-red/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 w-72 h-72 bg-[#2D5A8E]/30 rounded-full blur-3xl" />
            <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 py-8 md:py-10">
              <span className="inline-flex items-center gap-2 text-[color:var(--c-clay-soft)] font-bold text-[10px] tracking-[0.3em] uppercase mb-3">
                <Store size={14} /> 2MC GASTRO ONLINE SHOP
              </span>
              <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight text-white leading-[1.05]">
                Tüm Mağaza, <span className="text-brand-red">Tek Sayfada</span>
              </h1>
              <p className="mt-2.5 text-sm md:text-base text-white/70 max-w-2xl">
                {allItems.length.toLocaleString('de-DE')} profesyonel ürün — tüm markalar bir arada. Sepete ekle, teklifini saniyeler içinde oluştur.
              </p>

              {/* Büyük arama */}
              <div className="mt-5 max-w-2xl flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); resetPage(); }}
                    placeholder="Ürün adı, kod veya marka ile ara..."
                    className="w-full bg-white rounded-xl py-3.5 pl-12 pr-10 text-sm md:text-base text-[#0F2440] shadow-xl outline-none focus:ring-2 focus:ring-brand-red"
                  />
                  {query && (
                    <button onClick={() => { setQuery(''); resetPage(); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-red">
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Güven rozetleri */}
              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { Icon: ShieldCheck, text: 'Marka ayrımı yok · tek havuz', tone: 'text-emerald-400' },
                  { Icon: Tag, text: 'B2B net fiyat', tone: 'text-[color:var(--c-clay-soft)]' },
                  { Icon: Truck, text: '24-48h teslim (stoktakiler)', tone: 'text-[color:var(--c-clay-soft)]' },
                ].map(({ Icon, text, tone }) => (
                  <span key={text} className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-[11px] font-bold text-white/90">
                    <Icon size={13} className={tone} /> {text}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ── İÇERİK: sidebar + grid ── */}
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
            <div className="lg:grid lg:grid-cols-[256px_minmax(0,1fr)] lg:gap-8 lg:items-start">

              {/* Masaüstü sidebar */}
              <aside className="hidden lg:block sticky top-[120px] self-start bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar">
                {renderFilters()}
              </aside>

              {/* Ürünler */}
              <section className="min-w-0">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                  <div className="flex items-center gap-3">
                    {/* Mobil filtre butonu */}
                    <button
                      onClick={() => setMobileFilters(true)}
                      className="lg:hidden inline-flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-bold text-[#0F2440] shadow-sm"
                    >
                      <SlidersHorizontal size={16} /> Filtreler
                      {activeCount > 0 && <span className="bg-brand-red text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">{activeCount}</span>}
                    </button>
                    <p className="text-sm text-slate-500">
                      <span className="font-black text-[#0F2440]">{sorted.length.toLocaleString('de-DE')}</span> ürün
                      {category && <span className="hidden sm:inline"> — {CATEGORIES.find((c) => c.id === category)?.name}</span>}
                    </p>
                  </div>
                  <div className="relative w-48 sm:w-56">
                    <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                    <select
                      value={sort}
                      onChange={(e) => { setSort(e.target.value as SortKey); resetPage(); }}
                      className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-9 pr-8 text-sm font-semibold text-[#0F2440] shadow-sm focus:ring-2 focus:ring-brand-red outline-none appearance-none cursor-pointer"
                    >
                      {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Aktif filtre etiketleri */}
                {activeCount > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {category && (
                      <button onClick={() => setCat('')} className="inline-flex items-center gap-1.5 bg-brand-red/10 text-brand-red text-xs font-bold px-3 py-1.5 rounded-full hover:bg-brand-red/20 transition-colors">
                        {CATEGORIES.find((c) => c.id === category)?.name} <X size={13} />
                      </button>
                    )}
                    {priceKey !== 'all' && (
                      <button onClick={() => { setPriceKey('all'); resetPage(); }} className="inline-flex items-center gap-1.5 bg-brand-red/10 text-brand-red text-xs font-bold px-3 py-1.5 rounded-full hover:bg-brand-red/20 transition-colors">
                        {PRICE_RANGES.find((r) => r.key === priceKey)?.label} <X size={13} />
                      </button>
                    )}
                    {powerKey !== 'all' && (
                      <button onClick={() => { setPowerKey('all'); resetPage(); }} className="inline-flex items-center gap-1.5 bg-brand-red/10 text-brand-red text-xs font-bold px-3 py-1.5 rounded-full hover:bg-brand-red/20 transition-colors">
                        {POWER_RANGES.find((r) => r.key === powerKey)?.label} <X size={13} />
                      </button>
                    )}
                  </div>
                )}

                {pageItems.length === 0 ? (
                  <div className="py-24 text-center bg-white rounded-2xl border border-slate-200/70">
                    <Package size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="text-lg font-bold text-slate-500 mb-1">Sonuç bulunamadı</h3>
                    <p className="text-sm text-slate-400">Farklı bir arama, kategori veya fiyat aralığı deneyin.</p>
                    {activeCount > 0 && (
                      <button onClick={clearAll} className="mt-4 text-sm font-bold text-brand-red hover:underline">Filtreleri temizle</button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 items-start">
                    {pageItems.map((item: EquipmentItem) => {
                      const added = cartIds.has(item.id);
                      const inCompare = compareIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => openDetail(item)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(item); } }}
                          className="group bg-white border border-slate-200/70 rounded-2xl overflow-hidden hover:shadow-[0_18px_40px_-22px_rgba(15,36,64,0.45)] hover:border-brand-red/30 hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer"
                        >
                          {/* Görsel — sabit yükseklik (tüm kartlar eşit) */}
                          <div className="relative h-44 bg-gradient-to-b from-white to-slate-50 p-4 flex items-center justify-center shrink-0">
                            <span className="absolute top-2.5 left-2.5 z-10 bg-white/85 backdrop-blur border border-slate-200 px-2 py-0.5 rounded-md text-[8px] font-bold text-slate-500 uppercase tracking-wider max-w-[68%] truncate">
                              {item.brand}
                            </span>
                            {item.price > 3000 && (
                              <span className="absolute top-2.5 right-2.5 z-10 bg-brand-red text-white px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider shadow-[0_2px_8px_rgba(220,38,38,0.35)]">
                                TOP
                              </span>
                            )}
                            {/* Karşılaştır toggle */}
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCompare(equipmentToCompareItem(item)); }}
                              title={inCompare ? 'Karşılaştırmadan çıkar' : 'Karşılaştır'}
                              aria-label="Karşılaştır"
                              aria-pressed={inCompare}
                              className={`absolute bottom-2.5 right-2.5 z-10 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-all ${
                                inCompare
                                  ? 'bg-brand-red text-white'
                                  : 'bg-white/85 backdrop-blur border border-slate-200 text-slate-500 hover:text-brand-red hover:border-brand-red/40'
                              }`}
                            >
                              <GitCompareArrows size={15} />
                            </button>
                            <ProductImage src={item.img} alt={item.name} />
                          </div>

                          {/* Gövde — sabit bölümler, buton hep aynı hizada */}
                          <div className="p-3.5 flex flex-col flex-1 border-t border-slate-100">
                            {/* eyebrow — sabit */}
                            <div className="flex items-center justify-between gap-1 h-4">
                              <span className="text-[8px] font-bold text-brand-red uppercase tracking-[0.14em] truncate">{item.sub || item.fam || 'PROFESYONEL'}</span>
                              <span className="flex items-center gap-1 text-[8px] text-emerald-600 font-bold shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> STOKTA
                              </span>
                            </div>

                            {/* başlık — her zaman 2 satır yüksekliği */}
                            <h3 className="mt-1.5 text-[13px] font-bold text-[#0F2440] leading-[1.3] line-clamp-2 h-[34px] group-hover:text-brand-red transition-colors">{item.name}</h3>

                            {/* kod — sabit */}
                            <p className="mt-1 text-[9px] font-mono text-slate-400 truncate h-3">{item.id}</p>

                            {/* fiyat — sabit */}
                            <div className="mt-2 flex items-baseline gap-1.5 h-7">
                              <span className="text-2xl font-display font-black text-[#0F2440] leading-none">{formatPrice(item.price)}</span>
                              {item.price > 0 && <span className="text-[9px] font-medium text-slate-400">net</span>}
                            </div>

                            {/* leasing + kW — her zaman render, sabit yükseklik */}
                            <div className="mt-1 flex items-center justify-between h-4">
                              <span className="text-[10px] font-bold text-slate-500 truncate">
                                {item.price > 0
                                  ? <>Leasing <span className="text-brand-red">€ {Math.round((item.price * 1.15) / 60)}/Ay</span></>
                                  : <span className="text-slate-400">Teklif ile fiyat</span>}
                              </span>
                              {item.kw > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 shrink-0"><Zap size={10} className="text-amber-500" />{item.kw}kW</span>
                              )}
                            </div>

                            {/* buton — en altta, tüm kartlarda hizalı */}
                            <button
                              onClick={(e) => { e.stopPropagation(); added ? removeItem(item.id) : addItem(item); }}
                              className={`mt-3 w-full py-2.5 rounded-xl text-[11px] font-black tracking-[0.06em] uppercase transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                                added
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-[#0F2440] text-white hover:bg-brand-red shadow-sm'
                              }`}
                            >
                              {added ? <><Check size={14} /> Sepette</> : <><ShoppingCart size={14} /> Sepete Ekle</>}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Sayfalama */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-8">
                    <p className="text-xs text-slate-500">
                      <span className="font-bold text-[#0F2440]">{((safePage - 1) * PER_PAGE) + 1}-{Math.min(safePage * PER_PAGE, sorted.length)}</span> / {sorted.length.toLocaleString('de-DE')}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setPage(Math.max(1, safePage - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        disabled={safePage === 1}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-brand-red/40 text-slate-500 disabled:opacity-30 transition-colors shadow-sm"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="text-sm font-bold text-[#0F2440] px-3">{safePage} / {totalPages}</span>
                      <button
                        onClick={() => { setPage(Math.min(totalPages, safePage + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        disabled={safePage === totalPages}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-brand-red/40 text-slate-500 disabled:opacity-30 transition-colors shadow-sm"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>

          <SiteFooter />
        </main>
      </div>

      {/* ── Mobil filtre drawer ── */}
      {mobileFilters && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFilters(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-[#0F2440]">Filtreler</h2>
              <button onClick={() => setMobileFilters(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500">
                <X size={20} />
              </button>
            </div>
            {renderFilters()}
            <button
              onClick={() => setMobileFilters(false)}
              className="mt-6 w-full py-3 bg-[#0F2440] text-white rounded-xl font-bold text-sm"
            >
              {sorted.length.toLocaleString('de-DE')} ürünü göster
            </button>
          </div>
        </div>
      )}

      {/* Yüzen sepet CTA */}
      {cartCount > 0 && (
        <Link
          to="/cart"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-brand-red text-white px-5 py-3.5 rounded-full shadow-2xl font-bold text-sm hover:bg-[#B91C1C] transition-colors"
        >
          <ShoppingCart size={18} />
          Sepetim ({cartCount}) · Teklif Al
        </Link>
      )}
    </div>
  );
}
