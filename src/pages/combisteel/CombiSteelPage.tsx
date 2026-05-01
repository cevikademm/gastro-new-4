import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCombisteelStore, type CombisteelProduct } from '../../stores/combisteelStore';
import { useCompareStore, type CompareItem } from '../../stores/compareStore';
import { useCartStore } from '../../stores/cartStore';
import { useProjectStore } from '../../stores/projectStore';
import { useEquipmentStore } from '../../stores/equipmentStore';
import {
  Search, X, ChevronLeft, ChevronRight, Grid3X3, List,
  Zap, Euro, Package, ShoppingCart, Box,
  Loader2, Columns3, Ruler, ArrowUpDown, GitCompareArrows,
  Trash2, ChevronDown, SlidersHorizontal, RotateCcw,
} from 'lucide-react';
import CartQuantityButton from '../../components/CartQuantityButton';

/* ─── Product Image ─── */
function ProductImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  if (error || !src) return <div className={`bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center ${className}`}><Package size={28} className="text-slate-300" /></div>;
  return (
    <div className={`relative ${className}`}>
      {loading && <div className="absolute inset-0 bg-slate-50 flex items-center justify-center"><div className="w-5 h-5 border-2 border-red-200 border-t-[#7B1F26] rounded-full animate-spin" /></div>}
      <img src={src} alt={alt} loading="lazy" onError={() => setError(true)} onLoad={() => setLoading(false)} className={`w-full h-full object-contain ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`} />
    </div>
  );
}

/* ─── Helper: map CombiSteel product to global CompareItem ─── */
function toCompareItem(p: CombisteelProduct): CompareItem {
  return {
    id: `combisteel-${p.id}`,
    sku: p.sku || '',
    name: p.title || p.description || '',
    brand: p.brand || 'CombiSteel',
    image: p.image_url || '',
    price: p.price,
    promoPrice: null,
    stock: p.stock,
    width_mm: p.width_mm,
    height_mm: p.height_mm,
    depth_mm: p.depth_mm,
    length_mm: p.length_mm,
    weight: p.gross_weight,
    kw: null,
    connection: null,
    category: p.category_name,
    source: 'combisteel',
  };
}

/* ─── Main Page ─── */
export default function CombiSteelPage() {
  const navigate = useNavigate();
  const store = useCombisteelStore();
  const { addItem: addToCart, isInCart } = useCartStore();
  const { projects } = useProjectStore();
  const { setFloorPlanItem } = useEquipmentStore();

  const {
    products, categories, brands, filters, currentPage, itemsPerPage, totalCount,
    isLoading, error,
    fetchProducts, fetchCategories, fetchBrands, setFilter, resetFilters, setPage,
  } = store;

  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [detailItem, setDetailItem] = useState<CombisteelProduct | null>(null);
  const [projectModalItem, setProjectModalItem] = useState<string | null>(null);
  const { toggleItem: toggleCompareItem, isComparing: isItemComparing } = useCompareStore();
  const [showFilters, setShowFilters] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  useEffect(() => { fetchProducts(); fetchCategories(); fetchBrands(); }, []);

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const activeProjects = projects.filter(p => p.status !== 'complete');

  const formatPrice = (p: number | null) =>
    p && p > 0 ? `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';

  const toggleCompare = (item: CombisteelProduct) => toggleCompareItem(toCompareItem(item));
  const isComparing = (id: string) => isItemComparing(`combisteel-${id}`);

  const handleShowOnFloorPlan = (id: string) => { setProjectModalItem(id); setDetailItem(null); };
  const handleProjectSelect = (projectId: string) => {
    if (projectModalItem) { setFloorPlanItem(projectModalItem); setProjectModalItem(null); navigate(`/projects/${projectId}/design`); }
  };

  const toCartItem = (p: CombisteelProduct) => ({
    id: p.sku || p.id, name: p.title || p.description, desc: p.description || '',
    cat: p.category_name || 'other', sub: '', fam: p.category_name || '',
    img: p.image_url || '', url: p.image_url || '', brand: p.brand || 'CombiSteel',
    l: p.length_mm || p.width_mm || 0, w: p.depth_mm || p.width_mm || 0,
    h: String(p.height_mm || '0'), kw: 0, price: p.price || 0, line: p.product_type || '',
  });

  // Pagination
  const maxPages = 7;
  let pageStart = Math.max(1, currentPage - Math.floor(maxPages / 2));
  let pageEnd = Math.min(totalPages, pageStart + maxPages - 1);
  if (pageEnd - pageStart < maxPages - 1) pageStart = Math.max(1, pageEnd - maxPages + 1);
  const pageNumbers = Array.from({ length: pageEnd - pageStart + 1 }, (_, i) => pageStart + i);

  const visibleCategories = showAllCategories ? categories : categories.slice(0, 12);
  const hasActiveFilters = filters.search || filters.category || filters.brand || filters.inStockOnly || filters.minPrice > 0 || filters.maxPrice > 0;

  return (
    <div className="flex flex-col gap-5 max-w-[1800px] mx-auto w-full">

      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#7B1F26] via-[#6B1A22] to-[#5A1219] rounded-2xl p-6 md:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
              <Box size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-headline font-black text-white tracking-tight">CombiSteel Katalog</h1>
              <p className="text-white/70 text-sm mt-1">
                <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-white font-bold text-xs mr-2">{totalCount.toLocaleString()}</span>
                profesyonel mutfak ekipmanı
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="SKU, ürün adı veya açıklama ara..."
              className="w-full bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl py-3 pl-11 pr-10 text-sm text-white placeholder-white/50 focus:bg-white/25 focus:ring-2 focus:ring-white/30 outline-none transition-all"
            />
            {filters.search && (
              <button onClick={() => setFilter('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
            showFilters || hasActiveFilters
              ? 'bg-red-50 text-[#7B1F26] border-red-200 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-red-200'
          }`}
        >
          <SlidersHorizontal size={14} /> Filtreler
          {hasActiveFilters && <span className="bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">!</span>}
        </button>

        {/* Stock */}
        <button
          onClick={() => setFilter('inStockOnly', !filters.inStockOnly)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
            filters.inStockOnly ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-200'
          }`}
        >
          <Box size={14} /> Stokta
        </button>

        {/* Sort */}
        <div className="relative group">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:border-red-200 transition-all">
            <ArrowUpDown size={14} /> Sırala
          </button>
          <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 w-44 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-30">
            {[
              { key: 'title', label: 'İsim (A-Z)', order: 'asc' as const },
              { key: 'price', label: 'Fiyat (Düşük)', order: 'asc' as const },
              { key: 'price', label: 'Fiyat (Yüksek)', order: 'desc' as const },
              { key: 'stock', label: 'Stok (Yüksek)', order: 'desc' as const },
            ].map(s => (
              <button
                key={s.label}
                onClick={() => { setFilter('sortBy', s.key); setFilter('sortOrder', s.order); }}
                className={`w-full text-left px-4 py-2 text-xs hover:bg-red-50 transition-colors ${
                  filters.sortBy === s.key && filters.sortOrder === s.order ? 'text-[#7B1F26] font-bold bg-red-50/50' : 'text-slate-600'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode */}
        <div className="flex bg-white rounded-xl border border-slate-200 p-0.5 ml-auto">
          {([['grid', Grid3X3], ['list', List], ['table', Columns3]] as const).map(([mode, Icon]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`p-2 rounded-lg transition-all ${viewMode === mode ? 'bg-red-500 text-white shadow-sm' : 'text-slate-400 hover:text-[#7B1F26]'}`}
            >
              <Icon size={16} />
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
            <RotateCcw size={12} /> Temizle
          </button>
        )}
      </div>

      {/* ─── Filter Panel (Collapsible) ─── */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 animate-in slide-in-from-top-2">
          {/* Brands */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Marka</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilter('brand', '')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !filters.brand ? 'bg-red-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-[#7B1F26]'
                }`}
              >
                Tümü
              </button>
              {brands.slice(0, 15).map(b => (
                <button
                  key={b.name}
                  onClick={() => setFilter('brand', filters.brand === b.name ? '' : b.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filters.brand === b.name ? 'bg-red-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-[#7B1F26]'
                  }`}
                >
                  {b.name} <span className="opacity-60">({b.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fiyat Aralığı</p>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" min={0} value={filters.minPrice || ''} onChange={e => setFilter('minPrice', Number(e.target.value) || 0)} placeholder="Min" className="w-28 bg-slate-50 border border-slate-200 rounded-lg py-2 pl-7 pr-2 text-xs focus:ring-2 focus:ring-red-300 outline-none" />
              </div>
              <span className="text-slate-300">—</span>
              <div className="relative">
                <Euro size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" min={0} value={filters.maxPrice || ''} onChange={e => setFilter('maxPrice', Number(e.target.value) || 0)} placeholder="Max" className="w-28 bg-slate-50 border border-slate-200 rounded-lg py-2 pl-7 pr-2 text-xs focus:ring-2 focus:ring-red-300 outline-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Category Pills ─── */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <button
          onClick={() => setFilter('category', '')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            !filters.category ? 'bg-red-500 text-white shadow-md shadow-red-200' : 'bg-white text-slate-500 border border-slate-200 hover:border-red-300 hover:text-[#7B1F26]'
          }`}
        >
          Tümü
        </button>
        {visibleCategories.map(cat => (
          <button
            key={cat.name}
            onClick={() => setFilter('category', filters.category === cat.name ? '' : cat.name)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filters.category === cat.name
                ? 'bg-red-500 text-white shadow-md shadow-red-200'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-red-300 hover:text-[#7B1F26]'
            }`}
          >
            {cat.name} <span className="opacity-50">({cat.count})</span>
          </button>
        ))}
        {categories.length > 12 && (
          <button
            onClick={() => setShowAllCategories(!showAllCategories)}
            className="flex items-center gap-1 px-3 py-2 text-xs text-[#7B1F26] font-bold hover:text-[#5A1219] transition-colors"
          >
            <ChevronDown size={14} className={`transition-transform ${showAllCategories ? 'rotate-180' : ''}`} />
            {showAllCategories ? 'Daha az' : `+${categories.length - 12} daha`}
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 border-4 border-red-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-transparent border-t-[#7B1F26] rounded-full animate-spin" />
            </div>
            <p className="text-sm text-slate-500 font-medium">Ürünler yükleniyor...</p>
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-600 text-sm">{error}</div>}

      {/* ─── Grid View ─── */}
      {!isLoading && viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {products.map(item => {
            const inCompare = isComparing(item.id);
            const inCart = isInCart(item.sku || item.id);
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group relative ${
                  inCompare ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-200/80'
                }`}
                onClick={() => setDetailItem(item)}
              >
                {/* Badges */}
                <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                  {item.stock != null && item.stock > 0 && (
                    <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">Stokta</span>
                  )}
                </div>

                {/* Compare checkbox */}
                <button
                  onClick={e => { e.stopPropagation(); toggleCompare(item); }}
                  className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    inCompare ? 'bg-violet-500 border-violet-500 text-white' : 'bg-white/80 border-slate-300 text-transparent opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {inCompare && <GitCompareArrows size={12} />}
                </button>

                {/* Image */}
                <div className="bg-gradient-to-b from-slate-50/50 to-white p-2 pt-4">
                  <ProductImage src={item.image_url || ''} alt={item.title} className="w-full h-32 group-hover:scale-105 transition-transform duration-300" />
                </div>

                {/* Info */}
                <div className="p-3 pt-2">
                  <p className="text-[10px] font-mono text-[#A04654] tracking-wide">{item.sku}</p>
                  <p className="text-[11px] font-bold text-on-surface mt-0.5 line-clamp-2 leading-snug">{item.title || item.description}</p>
                  {item.brand && <p className="text-[10px] text-slate-400 font-medium mt-1">{item.brand}</p>}

                  <div className="flex items-end justify-between mt-2 pt-2 border-t border-slate-100/80">
                    <div>
                      <p className="text-base font-black text-[#7B1F26] tracking-tight">{formatPrice(item.price)}</p>
                      {item.width_mm && <p className="text-[9px] text-slate-400 mt-0.5">{item.width_mm}×{item.depth_mm || item.height_mm} mm</p>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 mt-2.5">
                    <CartQuantityButton product={toCartItem(item) as any} size="sm" className="flex-1" />
                    <button
                      onClick={e => { e.stopPropagation(); handleShowOnFloorPlan(item.sku || item.id); }}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"
                      title="Kat Planına Ekle"
                    >
                      <Ruler size={10} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── List View ─── */}
      {!isLoading && viewMode === 'list' && (
        <div className="space-y-2">
          {products.map(item => {
            const inCompare = isComparing(item.id);
            const inCart = isInCart(item.sku || item.id);
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 flex items-center gap-4 hover:shadow-lg transition-all cursor-pointer group ${
                  inCompare ? 'border-violet-300 ring-2 ring-violet-100' : 'border-slate-200/80'
                }`}
                onClick={() => setDetailItem(item)}
              >
                <button
                  onClick={e => { e.stopPropagation(); toggleCompare(item); }}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    inCompare ? 'bg-violet-500 border-violet-500 text-white' : 'border-slate-300 text-transparent group-hover:border-violet-300'
                  }`}
                >
                  {inCompare && <GitCompareArrows size={12} />}
                </button>
                <ProductImage src={item.image_url || ''} alt={item.title} className="w-14 h-14 rounded-xl flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-on-surface truncate">{item.title || item.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="font-mono text-[#7B1F26]">{item.sku}</span>
                    {item.brand && <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">{item.brand}</span>}
                    {item.category_name && <span>{item.category_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {item.width_mm && <span className="text-xs text-slate-400 hidden lg:flex items-center gap-1"><Ruler size={12} /> {item.width_mm}×{item.depth_mm || item.height_mm}mm</span>}
                  {item.stock != null && item.stock > 0 && <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-lg">{item.stock} adet</span>}
                  <span className="text-lg font-black text-[#7B1F26] w-28 text-right">{formatPrice(item.price)}</span>
                  <CartQuantityButton product={toCartItem(item) as any} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Table View ─── */}
      {!isLoading && viewMode === 'table' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-red-50/30 border-b border-slate-200">
                <th className="py-3 px-3 w-8" />
                <th className="py-3 px-3 text-left font-bold text-slate-500 text-[10px] uppercase tracking-wider">Görsel</th>
                <th className="py-3 px-4 text-left font-bold text-slate-500 text-[10px] uppercase tracking-wider">SKU</th>
                <th className="py-3 px-4 text-left font-bold text-slate-500 text-[10px] uppercase tracking-wider">Ürün</th>
                <th className="py-3 px-4 text-left font-bold text-slate-500 text-[10px] uppercase tracking-wider">Marka</th>
                <th className="py-3 px-4 text-left font-bold text-slate-500 text-[10px] uppercase tracking-wider">Kategori</th>
                <th className="py-3 px-4 text-left font-bold text-slate-500 text-[10px] uppercase tracking-wider">Boyut</th>
                <th className="py-3 px-4 text-left font-bold text-slate-500 text-[10px] uppercase tracking-wider">Ağırlık</th>
                <th className="py-3 px-4 text-center font-bold text-slate-500 text-[10px] uppercase tracking-wider">Stok</th>
                <th className="py-3 px-4 text-right font-bold text-slate-500 text-[10px] uppercase tracking-wider">Fiyat</th>
                <th className="py-3 px-4 text-center font-bold text-slate-500 text-[10px] uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((item, idx) => {
                const inCompare = isComparing(item.id);
                return (
                  <tr key={item.id} className={`hover:bg-red-50/40 cursor-pointer transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`} onClick={() => setDetailItem(item)}>
                    <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => toggleCompare(item)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${inCompare ? 'bg-violet-500 border-violet-500 text-white' : 'border-slate-300'}`}
                      >
                        {inCompare && <GitCompareArrows size={10} />}
                      </button>
                    </td>
                    <td className="py-2 px-3"><ProductImage src={item.image_url || ''} alt="" className="w-10 h-10 rounded-lg" /></td>
                    <td className="py-2 px-4 font-mono text-[#7B1F26] text-[11px]">{item.sku}</td>
                    <td className="py-2 px-4 font-semibold text-on-surface max-w-[200px] truncate">{item.title || item.description}</td>
                    <td className="py-2 px-4 text-slate-500">{item.brand || '—'}</td>
                    <td className="py-2 px-4 text-slate-400">{item.category_name || '—'}</td>
                    <td className="py-2 px-4 text-slate-400 font-mono text-[10px]">{item.width_mm ? `${item.width_mm}×${item.depth_mm || ''}×${item.height_mm || ''}` : '—'}</td>
                    <td className="py-2 px-4 text-slate-400">{item.gross_weight ? `${item.gross_weight} kg` : '—'}</td>
                    <td className="py-2 px-4 text-center">{item.stock != null && item.stock > 0 ? <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">{item.stock}</span> : <span className="text-slate-300">—</span>}</td>
                    <td className="py-2 px-4 text-right font-bold text-[#7B1F26]">{formatPrice(item.price)}</td>
                    <td className="py-2 px-4 text-center" onClick={e => e.stopPropagation()}>
                      <CartQuantityButton product={toCartItem(item) as any} size="sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-4">
          <button onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-red-300 disabled:opacity-30 transition-all">
            <ChevronLeft size={16} />
          </button>
          {pageNumbers.map(p => (
            <button key={p} onClick={() => setPage(p)} className={`min-w-[40px] h-10 rounded-xl text-xs font-bold transition-all ${p === currentPage ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-white border border-slate-200 hover:border-red-300 text-slate-500'}`}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-red-300 disabled:opacity-30 transition-all">
            <ChevronRight size={16} />
          </button>
          <span className="ml-4 text-xs text-slate-400 font-medium">Sayfa {currentPage} / {totalPages}</span>
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDetailItem(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-[#7B1F26] via-[#6B1A22] to-[#5A1219] text-white px-6 py-5 rounded-t-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-xs font-mono tracking-wider">{detailItem.sku}</p>
                  <h2 className="text-lg font-bold mt-1">{detailItem.title || detailItem.description}</h2>
                  {detailItem.brand && <p className="text-white/80 text-xs mt-0.5">{detailItem.brand}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCompare(detailItem)}
                    className={`p-2 rounded-xl transition-all ${isComparing(detailItem.id) ? 'bg-violet-500 text-white' : 'bg-white/20 text-white/70 hover:bg-white/30'}`}
                    title="Karşılaştırmaya Ekle"
                  >
                    <GitCompareArrows size={16} />
                  </button>
                  <button onClick={() => setDetailItem(null)} className="text-white/60 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-all">
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Image + Stats */}
              <div className="flex gap-6">
                <div className="bg-gradient-to-br from-slate-50 to-red-50 rounded-2xl p-4 flex-shrink-0">
                  <ProductImage src={detailItem.image_url || ''} alt={detailItem.title} className="w-44 h-44" />
                </div>
                <div className="flex-1 space-y-3">
                  {detailItem.description && <p className="text-sm text-slate-600">{detailItem.description}</p>}
                  {detailItem.long_description && <p className="text-xs text-slate-500">{detailItem.long_description}</p>}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl p-3 text-center border border-red-100">
                      <Euro size={16} className="mx-auto text-[#7B1F26] mb-1" />
                      <p className="font-black text-[#7B1F26] text-lg">{formatPrice(detailItem.price)}</p>
                      <p className="text-[10px] text-[#A04654] font-medium">Fiyat</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3 text-center border border-emerald-100">
                      <Box size={16} className="mx-auto text-emerald-500 mb-1" />
                      <p className="font-black text-emerald-700 text-lg">{detailItem.stock ?? '—'}</p>
                      <p className="text-[10px] text-emerald-400 font-medium">Stok</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              {(detailItem.width_mm || detailItem.height_mm || detailItem.depth_mm || detailItem.gross_weight) && (
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Ruler size={11} /> Boyutlar & Ağırlık</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { v: detailItem.length_mm, l: 'Uzunluk', u: 'mm' },
                      { v: detailItem.width_mm, l: 'Genişlik', u: 'mm' },
                      { v: detailItem.height_mm, l: 'Yükseklik', u: 'mm' },
                      { v: detailItem.depth_mm, l: 'Derinlik', u: 'mm' },
                      { v: detailItem.gross_weight, l: 'Brüt', u: 'kg' },
                      { v: detailItem.net_weight, l: 'Net', u: 'kg' },
                    ].filter(d => d.v).map(d => (
                      <div key={d.l} className="bg-slate-50 rounded-xl px-3 py-2 text-center">
                        <p className="text-xs font-bold text-on-surface">{d.v} <span className="text-slate-400 font-normal">{d.u}</span></p>
                        <p className="text-[9px] text-slate-400">{d.l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tech Specs */}
              {detailItem.tech_specs?.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Zap size={11} /> Teknik Özellikler</h3>
                  <div className="bg-slate-50 rounded-xl divide-y divide-slate-200/70 overflow-hidden">
                    {detailItem.tech_specs.map((spec, i) => (
                      <div key={i} className={`flex items-center justify-between px-4 py-2 text-xs ${i % 2 === 0 ? '' : 'bg-white/50'}`}>
                        <span className="text-slate-500">{spec.name}</span>
                        <span className="font-semibold text-on-surface">{spec.value}{spec.unit ? ` ${spec.unit}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra Images */}
              {detailItem.extra_images?.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Ek Görseller</h3>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {detailItem.extra_images.map((img, i) => (
                      <div key={i} className="flex-shrink-0 bg-slate-50 rounded-xl p-1">
                        <ProductImage src={img} alt="" className="w-20 h-20" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <CartQuantityButton product={toCartItem(detailItem) as any} size="md" className="flex-1" />
                <button
                  onClick={() => handleShowOnFloorPlan(detailItem.sku || detailItem.id)}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3.5 px-5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-200"
                >
                  <Ruler size={16} /> Plan
                </button>
                <button
                  onClick={() => toggleCompare(detailItem)}
                  className={`flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-bold text-sm transition-all ${
                    isComparing(detailItem.id)
                      ? 'bg-violet-100 text-violet-700 border-2 border-violet-300'
                      : 'bg-violet-50 text-violet-600 hover:bg-violet-100 border-2 border-violet-200'
                  }`}
                >
                  <GitCompareArrows size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Project Select Modal ─── */}
      {projectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setProjectModalItem(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md m-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">Proje Seçin</h3>
              <p className="text-emerald-100 text-xs">Ürünü hangi projenin kat planına eklemek istiyorsunuz?</p>
            </div>
            <div className="p-4">
              {activeProjects.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">Aktif proje yok. Önce bir proje oluşturun.</p>
              ) : (
                <div className="space-y-2">
                  {activeProjects.map(proj => (
                    <button key={proj.id} onClick={() => handleProjectSelect(proj.id)} className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all">
                      <p className="font-bold text-sm text-on-surface">{proj.name}</p>
                      <p className="text-xs text-slate-400">{proj.clientName}</p>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setProjectModalItem(null)} className="mt-3 w-full py-2.5 text-sm text-slate-400 hover:text-slate-600 transition-colors rounded-xl hover:bg-slate-50">İptal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
