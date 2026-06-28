import { useEffect, useState } from 'react';
import { useHandiStore, type HandiProduct } from '../../stores/handiStore';
import { useProductDetailStore } from '../../stores/productDetailStore';
import CartQuantityButton from '../../components/CartQuantityButton';
import CategoryFilterPanel from '../../components/CategoryFilterPanel';
import {
  Search, X, ChevronLeft, ChevronRight, Package,
  Loader2, RotateCcw,
} from 'lucide-react';

/* ─── Ürün görseli (hata/yükleme durumlu) ─── */
function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(true);
  if (err || !src) {
    return (
      <div className="w-full h-32 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Package size={28} className="text-slate-300" />
      </div>
    );
  }
  return (
    <div className="relative w-full h-32">
      {loading && (
        <div className="absolute inset-0 bg-slate-50 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-red-200 border-t-[#DC2626] rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setErr(true)}
        onLoad={() => setLoading(false)}
        className={`w-full h-32 object-contain transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
}

const fmtPrice = (p: number | null) =>
  p && p > 0 ? `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';

export default function HendiPage() {
  const {
    products, categories, filters, currentPage, itemsPerPage, totalCount,
    isLoading, error, fetchProducts, fetchCategories, setFilter, resetFilters, setPage,
  } = useHandiStore();
  const openDetail = useProductDetailStore((s) => s.open);

  useEffect(() => { fetchProducts(); fetchCategories(); }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const hasActiveFilters = !!(filters.search || filters.category || filters.inStockOnly);

  const toCartItem = (p: HandiProduct) =>
    ({
      id: p.id,
      name: p.name,
      desc: p.short_desc || p.description || '',
      cat: p.category_name || 'other',
      sub: p.sub_category || '',
      fam: '',
      brand: p.brand || 'HENDI',
      line: 'HENDI',
      l: p.length_mm || 0,
      w: p.width_mm || 0,
      h: String(p.height_mm || 0),
      kw: 0,
      price: p.price || 0,
      img: p.image_url || '',
      url: p.image_url || '',
    }) as any;

  return (
    <div className="space-y-4">
      {/* ─── Hero + arama ─── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#DC2626] via-[#8B2332] to-[#991B1B] rounded-2xl p-6 md:p-8">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
              <Package size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-headline font-black text-white tracking-tight">HENDI Katalog</h1>
              <p className="text-white/70 text-sm mt-1">
                <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-white font-bold text-xs mr-2">{totalCount.toLocaleString()}</span>
                ürün
              </p>
            </div>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Ürün, kod veya kategori ara…"
              className="w-full bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl py-3 pl-11 pr-10 text-sm text-white placeholder-white/50 focus:bg-white/25 focus:ring-2 focus:ring-white/30 outline-none transition-all"
            />
            {filters.search && (
              <button onClick={() => setFilter('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"><X size={16} /></button>
            )}
          </div>
        </div>
      </div>

      {/* ─── Araç çubuğu ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter('inStockOnly', !filters.inStockOnly)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${filters.inStockOnly ? 'bg-red-50 text-[#DC2626] border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:border-red-200'}`}
        >
          <Package size={14} /> Stokta
        </button>
        {hasActiveFilters && (
          <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
            <RotateCcw size={12} /> Temizle
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400 font-medium">
          {totalCount.toLocaleString()} ürün
        </span>
      </div>

      {/* ─── Kategori çipleri (her zaman görünür) ─── */}
      <CategoryFilterPanel
        categories={categories}
        selected={filters.category}
        onSelect={(name) => setFilter('category', name)}
      />

      {/* ─── Loading / Error / Empty ─── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[#DC2626] mr-2" />
          <span className="text-sm text-slate-500">Yükleniyor…</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          Hata: {error}
          <button onClick={fetchProducts} className="ml-3 underline font-bold">Tekrar dene</button>
        </div>
      )}
      {!isLoading && !error && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package size={40} className="text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-600">Ürün bulunamadı</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">Filtreleri değiştirin ya da katalog verisi henüz yüklenmemiş olabilir.</p>
        </div>
      )}

      {/* ─── Grid ─── */}
      {!isLoading && !error && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {products.map((item) => {
            return (
              <div key={item.id} onClick={() => openDetail('handi', item.id)} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 group relative flex flex-col cursor-pointer">
                {(item.stock ?? 0) > 0 && (
                  <span className="absolute top-2 left-2 z-10 bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">Stokta</span>
                )}
                <div className="bg-gradient-to-b from-slate-50/50 to-white p-2 pt-4">
                  <ProductImage src={item.image_url || ''} alt={item.name} />
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-[10px] font-bold text-[#DC2626] uppercase tracking-wider truncate">{item.brand}</p>
                  <h3 className="text-xs font-bold text-slate-700 line-clamp-2 mt-0.5 min-h-[2rem]" title={item.name}>{item.name}</h3>
                  {item.category_name && <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.category_name}</p>}
                  <div className="mt-auto pt-2">
                    <span className="text-sm font-black text-slate-800">{fmtPrice(item.price)}</span>
                  </div>
                  <div className="flex gap-1.5 mt-2.5" onClick={(e) => e.stopPropagation()}>
                    <CartQuantityButton product={toCartItem(item) as any} size="sm" className="flex-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Sayfalama ─── */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:border-red-300"><ChevronLeft size={16} /></button>
          <span className="text-xs font-bold text-slate-600 px-2">{currentPage} / {totalPages}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:border-red-300"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
