import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDiamondStore, type DiamondProduct } from '../../stores/diamondStore';
import { useCompareStore, type CompareItem } from '../../stores/compareStore';
import { useCartStore } from '../../stores/cartStore';
import { useUIStore } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';
import { useEquipmentStore } from '../../stores/equipmentStore';
import {
  Search, X, ChevronLeft, ChevronRight, Grid3X3, List,
  Zap, Ruler, Euro, Package, MapPin,
  ShoppingCart, Diamond, Tag, Sparkles, Box,
  Clock, CheckCircle2, Loader2, Columns3,
  GitCompareArrows, Trash2, SlidersHorizontal, RotateCcw, ChevronDown,
} from 'lucide-react';
import CartQuantityButton from '../../components/CartQuantityButton';
import Model3DViewer, { has3DModel } from '../../components/Model3DViewer';
import { CategoryIcon } from '../../components/icons/CategoryIcon';
import { EmptyState, EmptySearchIllustration } from '../../components/illustrations/EmptyState';

function ProductImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error || !src) {
    return (
      <div className={`bg-surface-container-highest flex items-center justify-center ${className}`}>
        <Package size={32} className="text-on-surface-variant/30" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-surface-container-highest flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setError(true)}
        onLoad={() => setLoading(false)}
        className={`w-full h-full object-contain ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
      />
    </div>
  );
}

// All column definitions matching Excel headers
const ALL_COLUMNS: { key: keyof DiamondProduct | string; label: string; group: string }[] = [
  { key: 'id', label: 'Ürün ID', group: 'Genel' },
  { key: 'name', label: 'Ürün Adı', group: 'Genel' },
  { key: 'description_tech_spec', label: 'Teknik Açıklama', group: 'Genel' },
  { key: 'popup_info', label: 'Ek Bilgi', group: 'Genel' },
  { key: 'currency', label: 'Para Birimi', group: 'Fiyat' },
  { key: 'price_catalog', label: 'Katalog Fiyatı', group: 'Fiyat' },
  { key: 'price_display', label: 'Görüntülenen Fiyat', group: 'Fiyat' },
  { key: 'price_promo', label: 'Promosyon Fiyatı', group: 'Fiyat' },
  { key: 'page_catalog_number', label: 'Katalog Sayfa No', group: 'Fiyat' },
  { key: 'page_promo_number', label: 'Promo Sayfa No', group: 'Fiyat' },
  { key: 'stock', label: 'Stok Miktarı', group: 'Stok' },
  { key: 'restock_info', label: 'Yeniden Stoklama', group: 'Stok' },
  { key: 'supplier_delivery_delay', label: 'Tedarikçi Teslimat (gün)', group: 'Stok' },
  { key: 'days_to_restock_avg', label: 'Ort. Stoklama Süresi (gün)', group: 'Stok' },
  { key: 'length_mm', label: 'Uzunluk (mm)', group: 'Boyut' },
  { key: 'width_mm', label: 'Genişlik (mm)', group: 'Boyut' },
  { key: 'height_mm', label: 'Yükseklik (mm)', group: 'Boyut' },
  { key: 'volume_m3', label: 'Hacim (m³)', group: 'Boyut' },
  { key: 'weight', label: 'Ağırlık', group: 'Boyut' },
  { key: 'weight_unit', label: 'Ağırlık Birimi', group: 'Boyut' },
  { key: 'electric_power_kw', label: 'Elektrik Gücü (kW)', group: 'Teknik' },
  { key: 'electric_connection', label: 'Elektrik Bağlantı', group: 'Teknik' },
  { key: 'electric_connection_2', label: 'Elektrik Bağlantı 2', group: 'Teknik' },
  { key: 'vapor', label: 'Buhar', group: 'Teknik' },
  { key: 'kcal_power', label: 'Kcal Gücü', group: 'Teknik' },
  { key: 'horse_power', label: 'Beygir Gücü', group: 'Teknik' },
  { key: 'product_category_id', label: 'Kategori ID', group: 'Kategori' },
  { key: 'product_range_id', label: 'Ürün Grubu ID', group: 'Kategori' },
  { key: 'product_subrange_id', label: 'Alt Grup ID', group: 'Kategori' },
  { key: 'product_family_id', label: 'Ürün Ailesi ID', group: 'Kategori' },
  { key: 'product_family_name', label: 'Ürün Ailesi Adı', group: 'Kategori' },
  { key: 'product_subfamily_id', label: 'Alt Aile ID', group: 'Kategori' },
  { key: 'product_line_id', label: 'Ürün Hattı ID', group: 'Kategori' },
  { key: 'is_new', label: 'Yeni Ürün', group: 'Durum' },
  { key: 'is_old', label: 'Eski Ürün', group: 'Durum' },
  { key: 'is_good_deal', label: 'Kampanyalı', group: 'Durum' },
  { key: 'product_type', label: 'Ürün Tipi', group: 'Durum' },
  { key: 'has_accessories', label: 'Aksesuar Var', group: 'Durum' },
  { key: 'replacement_product_id', label: 'Yedek Ürün ID', group: 'Durum' },
  { key: 'image_big', label: 'Görsel (Büyük)', group: 'Medya' },
  { key: 'image_thumb', label: 'Görsel (Küçük)', group: 'Medya' },
  { key: 'image_gallery', label: 'Görsel (Galeri)', group: 'Medya' },
  { key: 'image_full', label: 'Görsel (Full)', group: 'Medya' },
];

// Default visible columns for compact view
const DEFAULT_VISIBLE = [
  'id', 'name', 'price_catalog', 'price_promo', 'stock',
  'length_mm', 'width_mm', 'height_mm', 'electric_power_kw',
  'product_family_name', 'is_new', 'is_good_deal',
];

function formatCellValue(key: string, val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? '✓' : '—';
  if (key.startsWith('price_') || key === 'price_display') {
    const n = Number(val);
    return n > 0 ? `€${n.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';
  }
  if (key.startsWith('image_')) {
    return val ? '✓' : '—';
  }
  return String(val);
}

export default function DiamondPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const store = useDiamondStore();
  const { addItem: addToCart, isInCart } = useCartStore();
  const showPromo = useUIStore(s => s.showPromoProducts);
  const { projects } = useProjectStore();
  const { setFloorPlanItem } = useEquipmentStore();

  const {
    products, categories, filters, currentPage, itemsPerPage, totalCount,
    isLoading, error,
    fetchProducts, fetchCategories, setFilter, resetFilters, setPage,
  } = store;

  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [view3D, setView3D] = useState<DiamondProduct | null>(null);
  const [detailItem, setDetailItem] = useState<DiamondProduct | null>(null);
  const [projectModalItem, setProjectModalItem] = useState<string | null>(null);
  const [visibleCols, setVisibleCols] = useState<string[]>(DEFAULT_VISIBLE);
  const [showColPicker, setShowColPicker] = useState(false);
  const [showAllFamilies, setShowAllFamilies] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { toggleItem: toggleCompareGlobal, isComparing } = useCompareStore();

  const toCompareItem = (p: DiamondProduct): CompareItem => ({
    id: `diamond-${p.id}`,
    sku: p.id,
    name: p.name,
    brand: 'Diamond',
    image: p.image_big || p.image_thumb || '',
    price: p.price_catalog,
    promoPrice: p.price_promo,
    stock: p.stock,
    width_mm: p.width_mm ? Number(p.width_mm) : null,
    height_mm: p.height_mm ? Number(p.height_mm) : null,
    depth_mm: null,
    length_mm: p.length_mm ? Number(p.length_mm) : null,
    weight: p.weight ? Number(p.weight) : null,
    kw: p.electric_power_kw,
    connection: p.electric_connection || null,
    category: p.product_family_name || null,
    source: 'diamond',
  });
  const toggleCompare = (item: DiamondProduct) => toggleCompareGlobal(toCompareItem(item));
  const isItemComparing = (id: string) => isComparing(`diamond-${id}`);

  const [searchParams, setSearchParams] = useSearchParams();
  const conceptLabel = searchParams.get('concept');

  useEffect(() => {
    fetchCategories();
    const q = searchParams.get('q');
    if (q) {
      setFilter('search', q);
    } else {
      fetchProducts();
    }
  }, []);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const familyGroups = categories.reduce((acc, c) => {
    const existing = acc.find(a => a.name === c.product_family_name);
    if (existing) existing.count += c.count;
    else acc.push({ name: c.product_family_name, count: c.count });
    return acc;
  }, [] as { name: string; count: number }[]).sort((a, b) => b.count - a.count);

  const formatPrice = (p: number | null) =>
    p && p > 0 ? `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';

  const activeProjects = projects.filter(p => p.status !== 'complete');
  const completedProjects = projects.filter(p => p.status === 'complete');

  const handleShowOnFloorPlan = (id: string) => {
    setProjectModalItem(id);
    setDetailItem(null);
  };

  const handleProjectSelect = (projectId: string) => {
    if (projectModalItem) {
      setFloorPlanItem(projectModalItem);
      setProjectModalItem(null);
      navigate(`/projects/${projectId}/design`);
    }
  };

  const toCartItem = (p: DiamondProduct) => ({
    id: p.id,
    name: p.name,
    desc: p.description_tech_spec || '',
    cat: p.product_family_name || 'other',
    sub: p.product_subfamily_id || '',
    fam: p.product_family_name || '',
    img: p.image_big || p.image_thumb || '',
    url: p.image_big || p.image_thumb || p.image_full || '',
    brand: 'Diamond',
    l: Number(p.length_mm) || 0,
    w: Number(p.width_mm) || 0,
    h: String(p.height_mm || '0'),
    kw: Number(p.electric_power_kw) || 0,
    price: p.price_catalog || p.price_display || 0,
    line: p.product_line_id || '',
  });

  const toggleCol = (key: string) => {
    setVisibleCols(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Pagination range
  const maxPages = 7;
  let pageStart = Math.max(1, currentPage - Math.floor(maxPages / 2));
  let pageEnd = Math.min(totalPages, pageStart + maxPages - 1);
  if (pageEnd - pageStart < maxPages - 1) pageStart = Math.max(1, pageEnd - maxPages + 1);
  const pageNumbers = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);

  const activeColumns = ALL_COLUMNS.filter(c => visibleCols.includes(c.key));

  const visibleFamilies = showAllFamilies ? familyGroups : familyGroups.slice(0, 12);
  const hasActiveFilters = filters.search || filters.family || filters.promoOnly || filters.newOnly || filters.inStockOnly || filters.minKw > 0 || filters.maxKw > 0;

  return (
    <div className="flex flex-col gap-5 max-w-[1800px] mx-auto w-full">

      {conceptLabel && (
        <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-[#E85D26]">
            <Sparkles size={14} />
            <span>{conceptLabel}</span>
            <span className="text-[#A04654] font-normal">konseptine uygun ürünler</span>
          </div>
          <button
            onClick={() => {
              setFilter('search', '');
              setSearchParams({});
            }}
            className="text-[11px] font-bold text-[#E85D26] hover:text-[#C44A1A] flex items-center gap-1"
          >
            <X size={12} /> Temizle
          </button>
        </div>
      )}

      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#E85D26] via-[#8B2332] to-[#C44A1A] rounded-2xl p-6 md:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
              <Diamond size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-headline font-black text-white tracking-tight">{t('diamond.title')}</h1>
              <p className="text-white/70 text-sm mt-1">
                <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-white font-bold text-xs mr-2">{totalCount.toLocaleString()}</span>
                {t('diamond.subtitle')}
              </p>
            </div>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder={t('diamond.searchPlaceholder')}
              className="w-full bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl py-3 pl-11 pr-10 text-sm text-white placeholder-white/50 focus:bg-white/25 focus:ring-2 focus:ring-white/30 outline-none transition-all"
            />
            {filters.search && (
              <button onClick={() => setFilter('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"><X size={16} /></button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${showFilters || hasActiveFilters ? 'bg-red-50 text-[#E85D26] border-red-200 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-red-200'}`}>
          <SlidersHorizontal size={14} /> {t('common.filter')} {hasActiveFilters && <span className="bg-[#E85D26] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">!</span>}
        </button>
        {showPromo && (
          <button onClick={() => setFilter('promoOnly', !filters.promoOnly)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${filters.promoOnly ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-200'}`}>
            <Tag size={14} /> Promo
          </button>
        )}
        <button onClick={() => setFilter('newOnly', !filters.newOnly)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${filters.newOnly ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-200'}`}>
          <Sparkles size={14} /> {t('diamond.new')}
        </button>
        <button onClick={() => setFilter('inStockOnly', !filters.inStockOnly)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${filters.inStockOnly ? 'bg-red-50 text-[#E85D26] border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:border-red-200'}`}>
          <Box size={14} /> {t('diamond.inStock')}
        </button>

        <div className="flex bg-white rounded-xl border border-slate-200 p-0.5 ml-auto">
          {([['grid', Grid3X3], ['list', List], ['table', Columns3]] as const).map(([mode, Icon]) => (
            <button key={mode} onClick={() => setViewMode(mode as any)} className={`p-2 rounded-lg transition-all ${viewMode === mode ? 'bg-[#E85D26] text-white shadow-sm' : 'text-slate-400 hover:text-[#E85D26]'}`}><Icon size={16} /></button>
          ))}
        </div>

        {viewMode === 'table' && (
          <div className="relative">
            <button onClick={() => setShowColPicker(!showColPicker)} className="px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-[#E85D26] border border-red-200 hover:bg-red-100 transition-all">
              {t('diamond.columns')} ({visibleCols.length}/{ALL_COLUMNS.length})
            </button>
            {showColPicker && (
              <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-700">{t('diamond.visibleColumns')}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setVisibleCols(ALL_COLUMNS.map(c => c.key))} className="text-[10px] text-[#E85D26] font-bold hover:underline">{t('common.all')}</button>
                    <button onClick={() => setVisibleCols(DEFAULT_VISIBLE)} className="text-[10px] text-slate-500 font-bold hover:underline">{t('diamond.default')}</button>
                  </div>
                </div>
                {['Genel', 'Fiyat', 'Stok', 'Boyut', 'Teknik', 'Kategori', 'Durum', 'Medya'].map(group => (
                  <div key={group} className="mb-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{group}</p>
                    <div className="flex flex-wrap gap-1">
                      {ALL_COLUMNS.filter(c => c.group === group).map(col => (
                        <button key={col.key} onClick={() => toggleCol(col.key)} className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${visibleCols.includes(col.key) ? 'bg-red-100 text-[#E85D26] border border-red-200' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}`}>{col.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {hasActiveFilters && (
          <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"><RotateCcw size={12} /> {t('common.clear')}</button>
        )}
      </div>

      {/* ─── Filter Panel ─── */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Zap size={11} className="text-amber-500" /> {t('diamond.electricPower')}</p>
            <div className="flex items-center gap-2">
              <input type="number" min={0} step={0.1} value={filters.minKw || ''} onChange={(e) => setFilter('minKw', Number(e.target.value) || 0)} placeholder="Min kW" className="w-28 bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-amber-300 outline-none" />
              <span className="text-slate-300">—</span>
              <input type="number" min={0} step={0.1} value={filters.maxKw || ''} onChange={(e) => setFilter('maxKw', Number(e.target.value) || 0)} placeholder="Max kW" className="w-28 bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs focus:ring-2 focus:ring-amber-300 outline-none" />
              {(filters.minKw > 0 || filters.maxKw > 0) && (
                <button onClick={() => { setFilter('minKw', 0); setFilter('maxKw', 0); }} className="text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center gap-0.5"><X size={12} /> {t('common.clear')}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Category Pills ─── */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <button onClick={() => setFilter('family', '')} className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${!filters.family ? 'bg-[#E85D26] text-white shadow-md shadow-red-200' : 'bg-white text-slate-500 border border-slate-200 hover:border-red-300 hover:text-[#E85D26]'}`}>
          {t('common.all')}
        </button>
        {visibleFamilies.map(fam => (
          <button key={fam.name} onClick={() => setFilter('family', filters.family === fam.name ? '' : fam.name)} className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${filters.family === fam.name ? 'bg-[#E85D26] text-white shadow-md shadow-red-200' : 'bg-white text-slate-500 border border-slate-200 hover:border-red-300 hover:text-[#E85D26]'}`}>
            <CategoryIcon category={fam.name} size={16} />
            {fam.name || t('common.other')} <span className="opacity-50">({fam.count})</span>
          </button>
        ))}
        {familyGroups.length > 12 && (
          <button onClick={() => setShowAllFamilies(!showAllFamilies)} className="flex items-center gap-1 px-3 py-2 text-xs text-[#E85D26] font-bold hover:text-[#E85D26] transition-colors">
            <ChevronDown size={14} className={`transition-transform ${showAllFamilies ? 'rotate-180' : ''}`} />
            {showAllFamilies ? t('common.less') : `+${familyGroups.length - 12} ${t('common.more')}`}
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[#E85D26] mr-2" />
          <span className="text-sm text-slate-500">{t('common.loading')}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {t('common.error')}: {error}
          <button onClick={fetchProducts} className="ml-3 text-red-600 underline font-bold">{t('common.retry')}</button>
        </div>
      )}

      {/* ═══════ GRID VIEW ═══════ */}
      {!isLoading && !error && viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {products.map((item) => {
            const inCompare = isItemComparing(item.id);
            const inCart = isInCart(item.id);
            return (
              <div
                key={item.id}
                onClick={() => navigate(`/product/${item.id}`)}
                className={`bg-white rounded-2xl border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group relative ${inCompare ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-200/80'}`}
              >
                {/* Badges */}
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                  {item.is_new && <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">{t('diamond.new')}</span>}
                  {item.is_good_deal && <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">{t('diamond.deal')}</span>}
                  {showPromo && (item.price_promo ?? 0) > 0 && <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">{t('diamond.promo')}</span>}
                </div>

                {/* Compare checkbox */}
                <button
                  onClick={e => { e.stopPropagation(); toggleCompare(item); }}
                  className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${inCompare ? 'bg-violet-500 border-violet-500 text-white' : 'bg-white/80 border-slate-300 text-transparent opacity-0 group-hover:opacity-100'}`}
                >
                  {inCompare && <GitCompareArrows size={12} />}
                </button>

                <div className="bg-gradient-to-b from-slate-50/50 to-white p-2 pt-4 relative">
                  <ProductImage src={item.image_big || item.image_thumb} alt={item.name} className="w-full h-32 group-hover:scale-105 transition-transform duration-300" />
                  {has3DModel(item.id) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setView3D(item); }}
                      className="absolute bottom-1 right-1 z-10 flex items-center gap-1 px-2 py-1 rounded-md bg-[#E85D26] text-white text-[9px] font-black uppercase tracking-wider shadow-md hover:bg-[#C44A1A] transition-all"
                      title={t('diamond.open3D')}
                    >
                      <Box size={10} /> 3D
                    </button>
                  )}
                </div>
                <div className="p-3 pt-2">
                  <p className="text-[10px] font-mono text-[#A04654] tracking-wide">{item.id}</p>
                  <h3 className="text-[11px] font-bold text-on-surface mt-0.5 line-clamp-2 leading-snug">{item.name}</h3>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">{item.product_family_name}</p>

                  <div className="flex items-end justify-between mt-2 pt-2 border-t border-slate-100/80">
                    <div>
                      {showPromo && (item.price_promo ?? 0) > 0 ? (
                        <>
                          <p className="text-[9px] text-slate-400 line-through">{formatPrice(item.price_catalog)}</p>
                          <p className="text-base font-black text-red-600 tracking-tight">{formatPrice(item.price_promo)}</p>
                        </>
                      ) : (
                        <p className="text-base font-black text-[#E85D26] tracking-tight">{formatPrice(item.price_catalog)}</p>
                      )}
                    </div>
                    {Number(item.electric_power_kw) > 0 && (
                      <span className="flex items-center gap-0.5 text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md"><Zap size={9} />{item.electric_power_kw}kW</span>
                    )}
                  </div>

                  <div className="flex gap-1.5 mt-2.5">
                    <CartQuantityButton product={toCartItem(item) as any} size="sm" className="flex-1" />
                    <button
                      onClick={e => { e.stopPropagation(); handleShowOnFloorPlan(item.id); }}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
                      title={t('catalog.addToFloorPlan')}
                    >
                      <MapPin size={10} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ LIST VIEW (compact) ═══════ */}
      {!isLoading && !error && viewMode === 'list' && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant/10">
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t('common.product')}</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t('common.description')}</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t('catalog.dimensions')}</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">kW</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{t('diamond.stock')}</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant text-right">{t('common.price')}</th>
                <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant text-center w-20">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {products.map((item) => (
                <tr key={item.id} onClick={() => navigate(`/product/${item.id}`)} className="hover:bg-surface-container-high/50 cursor-pointer transition-colors group">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <ProductImage src={item.image_thumb || item.image_big} alt={item.name} className="w-10 h-10 rounded-md flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                          {item.name}
                          {item.is_new && <span className="bg-emerald-100 text-emerald-700 text-[8px] font-bold px-1 py-0.5 rounded">{t('diamond.new').toUpperCase()}</span>}
                        </div>
                        <div className="text-[10px] font-mono text-on-surface-variant">{item.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-on-surface-variant max-w-xs truncate">{item.description_tech_spec}</td>
                  <td className="py-3 px-4 text-xs text-on-surface font-mono">{item.length_mm}×{item.width_mm}×{item.height_mm}</td>
                  <td className="py-3 px-4 text-xs text-on-surface">{Number(item.electric_power_kw) > 0 ? `${item.electric_power_kw} kW` : '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.stock && item.stock !== '0' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.stock || t('common.none')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs font-bold text-primary text-right">{formatPrice(item.price_catalog)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleShowOnFloorPlan(item.id); }} className="p-1.5 rounded-lg text-on-surface-variant/30 hover:text-primary hover:bg-primary/10 transition-all"><MapPin size={14} /></button>
                      <CartQuantityButton product={toCartItem(item) as any} size="sm" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════ FULL TABLE VIEW (all columns) ═══════ */}
      {!isLoading && !error && viewMode === 'table' && (
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-x-auto">
          <table className="w-full text-left min-w-max">
            <thead className="sticky top-0 z-10">
              <tr className="bg-surface-container border-b border-outline-variant/10">
                <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant sticky left-0 bg-surface-container z-20 min-w-[60px]">{t('common.actions')}</th>
                <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant sticky left-[60px] bg-surface-container z-20 min-w-[50px]">{t('diamond.image')}</th>
                {activeColumns.map(col => (
                  <th key={col.key} className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {products.map((item) => (
                <tr key={item.id} onClick={() => navigate(`/product/${item.id}`)} className="hover:bg-surface-container-high/50 cursor-pointer transition-colors">
                  <td className="py-2 px-3 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-0.5">
                      <CartQuantityButton product={toCartItem(item) as any} size="sm" />
                      <button onClick={(e) => { e.stopPropagation(); handleShowOnFloorPlan(item.id); }} className="p-1 rounded text-slate-300 hover:text-primary transition-all" title={t('catalog.addToFloorPlan')}><MapPin size={13} /></button>
                    </div>
                  </td>
                  <td className="py-2 px-3 sticky left-[60px] bg-white z-10">
                    <ProductImage src={item.image_thumb || item.image_big} alt={item.name} className="w-8 h-8 rounded flex-shrink-0" />
                  </td>
                  {activeColumns.map(col => {
                    const val = (item as any)[col.key];
                    return (
                      <td key={col.key} className="py-2 px-3 text-[11px] text-on-surface whitespace-nowrap max-w-[250px] truncate" title={String(val ?? '')}>
                        {col.key === 'name' ? (
                          <span className="font-bold">{val}</span>
                        ) : col.key === 'price_promo' && showPromo && (item.price_promo ?? 0) > 0 ? (
                          <span className="text-red-600 font-bold">{formatCellValue(col.key, val)}</span>
                        ) : col.key === 'is_new' && val ? (
                          <span className="bg-emerald-100 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded">{t('common.yes')}</span>
                        ) : col.key === 'is_good_deal' && val ? (
                          <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded">{t('common.yes')}</span>
                        ) : col.key === 'stock' ? (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${val && val !== '0' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                            {val || '—'}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant">{formatCellValue(col.key, val)}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && products.length === 0 && (
        <EmptyState
          illustration={<EmptySearchIllustration />}
          title={t('catalog.noResults')}
          description={t('catalog.tryDifferent')}
          action={(filters.search || filters.family || filters.promoOnly || filters.newOnly || filters.inStockOnly) && (
            <button onClick={resetFilters} className="px-4 py-2 bg-[#E85D26] text-white text-sm font-bold rounded-lg hover:bg-[#C44A1A] transition-colors">
              {t('diamond.clearFilters')}
            </button>
          )}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-2">
          <p className="text-xs text-on-surface-variant">
            <span className="font-bold text-on-surface">{((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)}</span> / {totalCount.toLocaleString()} {t('common.products')}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={currentPage === 1} className="px-2 py-1.5 rounded text-xs font-medium text-on-surface-variant disabled:opacity-30 hover:bg-surface-container-high transition-colors">«</button>
            <button onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30 transition-colors"><ChevronLeft size={16} /></button>
            {pageNumbers.map((page) => (
              <button key={page} onClick={() => setPage(page)} className={`w-8 h-8 flex items-center justify-center rounded text-xs font-bold transition-colors ${page === currentPage ? 'bg-[#E85D26] text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>{page}</button>
            ))}
            <button onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30 transition-colors"><ChevronRight size={16} /></button>
            <button onClick={() => setPage(totalPages)} disabled={currentPage === totalPages} className="px-2 py-1.5 rounded text-xs font-medium text-on-surface-variant disabled:opacity-30 hover:bg-surface-container-high transition-colors">»</button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailItem(null)}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <ProductImage src={detailItem.image_big || detailItem.image_thumb} alt={detailItem.name} className="w-full h-64 bg-white" />
              <button onClick={() => setDetailItem(null)} className="absolute top-3 right-3 bg-black/40 text-white rounded-full p-2 hover:bg-black/60 transition-colors"><X size={18} /></button>
              {has3DModel(detailItem.id) && (
                <button
                  onClick={() => setView3D(detailItem)}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#E85D26] text-white text-xs font-black uppercase tracking-wider shadow-lg hover:bg-[#C44A1A] transition-all"
                >
                  <Box size={14} /> {t('diamond.view3D')}
                </button>
              )}
              <div className="absolute top-3 left-3 flex gap-1.5">
                <span className="bg-black/40 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">Diamond</span>
                {detailItem.is_new && <span className="bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">{t('diamond.new').toUpperCase()}</span>}
                {detailItem.is_good_deal && <span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">{t('diamond.deal').toUpperCase()}</span>}
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h2 className="text-xl font-headline font-black text-on-surface">{detailItem.name}</h2>
                <p className="text-sm font-mono text-on-surface-variant mt-1">{detailItem.id}</p>
              </div>

              {detailItem.description_tech_spec && <p className="text-sm text-on-surface-variant leading-relaxed">{detailItem.description_tech_spec}</p>}
              {detailItem.popup_info && <p className="text-xs text-on-surface-variant/70 leading-relaxed">{detailItem.popup_info}</p>}

              {/* All data in organized grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-surface-container-highest rounded-lg p-3">
                  <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-1"><Ruler size={14} /> {t('catalog.dimensions')}</div>
                  <p className="font-bold text-on-surface text-sm">{detailItem.length_mm} × {detailItem.width_mm} × {detailItem.height_mm}</p>
                  {detailItem.volume_m3 && <p className="text-[10px] text-on-surface-variant mt-0.5">{t('diamond.volume')}: {detailItem.volume_m3} m³</p>}
                  {detailItem.weight && <p className="text-[10px] text-on-surface-variant mt-0.5">{t('diamond.weight')}: {detailItem.weight} {detailItem.weight_unit}</p>}
                </div>
                <div className="bg-surface-container-highest rounded-lg p-3">
                  <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-1"><Zap size={14} /> {t('diamond.electric')}</div>
                  <p className="font-bold text-on-surface text-sm">{Number(detailItem.electric_power_kw) > 0 ? `${detailItem.electric_power_kw} kW` : t('common.none')}</p>
                  {detailItem.electric_connection && <p className="text-[10px] text-on-surface-variant mt-0.5">{detailItem.electric_connection}</p>}
                  {detailItem.electric_connection_2 && <p className="text-[10px] text-on-surface-variant mt-0.5">{detailItem.electric_connection_2}</p>}
                  {detailItem.kcal_power && <p className="text-[10px] text-on-surface-variant mt-0.5">{detailItem.kcal_power} kcal</p>}
                  {detailItem.horse_power && <p className="text-[10px] text-on-surface-variant mt-0.5">{detailItem.horse_power} HP</p>}
                </div>
                <div className="bg-surface-container-highest rounded-lg p-3">
                  <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-1"><Euro size={14} /> {t('common.price')}</div>
                  {showPromo && (detailItem.price_promo ?? 0) > 0 ? (
                    <div>
                      <span className="text-xs text-on-surface-variant line-through mr-2">{formatPrice(detailItem.price_catalog)}</span>
                      <span className="font-bold text-red-600 text-sm">{formatPrice(detailItem.price_promo)}</span>
                    </div>
                  ) : (
                    <p className="font-bold text-primary text-sm">{formatPrice(detailItem.price_catalog)}</p>
                  )}
                  {detailItem.price_display && <p className="text-[10px] text-on-surface-variant mt-0.5">{t('diamond.displayed')}: {formatPrice(detailItem.price_display)}</p>}
                  <p className="text-[10px] text-on-surface-variant mt-0.5">{detailItem.currency}</p>
                </div>
                <div className="bg-surface-container-highest rounded-lg p-3">
                  <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-1"><Package size={14} /> {t('diamond.stockDelivery')}</div>
                  <p className={`font-bold text-sm ${detailItem.stock && detailItem.stock !== '0' ? 'text-emerald-600' : 'text-slate-400'}`}>{detailItem.stock || t('diamond.outOfStock')}</p>
                  {detailItem.restock_info && <p className="text-[10px] text-on-surface-variant mt-0.5">{t('diamond.restock')}: {detailItem.restock_info}</p>}
                  {detailItem.supplier_delivery_delay && <p className="text-[10px] text-on-surface-variant mt-0.5">{t('diamond.delivery')}: {detailItem.supplier_delivery_delay} {t('diamond.days')}</p>}
                </div>
                <div className="bg-surface-container-highest rounded-lg p-3">
                  <div className="text-xs text-on-surface-variant mb-1 font-medium">{t('catalog.category')}</div>
                  <p className="text-xs font-bold text-on-surface">{detailItem.product_family_name}</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">{t('catalog.category')}: {detailItem.product_category_id}</p>
                  <p className="text-[10px] text-on-surface-variant">{t('diamond.range')}: {detailItem.product_range_id}</p>
                  <p className="text-[10px] text-on-surface-variant">{t('diamond.line')}: {detailItem.product_line_id}</p>
                </div>
                <div className="bg-surface-container-highest rounded-lg p-3">
                  <div className="text-xs text-on-surface-variant mb-1 font-medium">{t('common.status')}</div>
                  <div className="flex flex-wrap gap-1">
                    {detailItem.is_new && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">{t('diamond.new')}</span>}
                    {detailItem.is_good_deal && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded">{t('diamond.deal')}</span>}
                    {detailItem.has_accessories && <span className="px-2 py-0.5 bg-red-100 text-[#E85D26] text-[10px] font-bold rounded">{t('diamond.hasAccessories')}</span>}
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">{t('diamond.type')}: {detailItem.product_type}</span>
                  </div>
                  {detailItem.replacement_product_id && <p className="text-[10px] text-on-surface-variant mt-1">{t('diamond.replacement')}: {detailItem.replacement_product_id}</p>}
                  {detailItem.page_catalog_number && <p className="text-[10px] text-on-surface-variant mt-0.5">{t('diamond.catalogPage')}: {detailItem.page_catalog_number}</p>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 flex-wrap">
                <CartQuantityButton product={toCartItem(detailItem) as any} size="md" className="flex-1" />
                <button
                  onClick={() => { setDetailItem(null); handleShowOnFloorPlan(detailItem.id); }}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-primary hover:bg-primary/90 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <MapPin size={16} /> {t('catalog.addToFloorPlan')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Selection Modal */}
      {projectModalItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setProjectModalItem(null)}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-outline-variant/10">
              <div>
                <h2 className="text-base font-headline font-black text-on-surface">{t('catalog.addToProject')}</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">{t('diamond.whichProject')}</p>
              </div>
              <button onClick={() => setProjectModalItem(null)} className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {activeProjects.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><Clock size={13} className="text-primary" /><span className="text-[11px] font-bold uppercase tracking-wider text-primary">{t('diamond.ongoing')}</span></div>
                  <div className="space-y-2">
                    {activeProjects.map(p => (
                      <button key={p.id} onClick={() => handleProjectSelect(p.id)} className="w-full text-left px-4 py-3 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/15 hover:border-primary/30 transition-all group">
                        <div className="flex items-center justify-between"><span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{p.name}</span><MapPin size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                        <div className="flex items-center gap-3 mt-1"><span className="text-[10px] text-on-surface-variant">{p.clientName}</span><span className="text-[10px] text-on-surface-variant">{p.area} m²</span></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {completedProjects.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2"><CheckCircle2 size={13} className="text-on-surface-variant/50" /><span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/50">{t('diamond.completed')}</span></div>
                  <div className="space-y-2">
                    {completedProjects.map(p => (
                      <button key={p.id} onClick={() => handleProjectSelect(p.id)} className="w-full text-left px-4 py-3 rounded-xl bg-surface-container-highest hover:bg-surface-container-high border border-outline-variant/10 transition-all group opacity-70 hover:opacity-100">
                        <span className="text-sm font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {projects.length === 0 && (
                <div className="py-10 text-center"><Package size={36} className="mx-auto text-on-surface-variant/20 mb-3" /><p className="text-sm font-bold text-on-surface-variant">{t('catalog.noProjects')}</p></div>
              )}
            </div>
          </div>
        </div>
      )}

      {view3D && (
        <Model3DViewer
          productId={view3D.id}
          productName={view3D.name}
          onClose={() => setView3D(null)}
        />
      )}

    </div>
  );
}
