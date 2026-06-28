import { useEffect, useState } from 'react';
import { useAllProductsStore } from '../../stores/allProductsStore';
import { useProductDetailStore, type ProductSource } from '../../stores/productDetailStore';
import {
  Search, X, ChevronLeft, ChevronRight, Package, Loader2,
} from 'lucide-react';

const SOURCES = [
  { id: '', label: 'Tümü' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'combisteel', label: 'CombiSteel' },
  { id: 'handi', label: 'HENDI' },
];

const fmtPrice = (p: number | null) =>
  p && p > 0 ? `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return (
      <div className="w-full h-28 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Package size={24} className="text-slate-300" />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setErr(true)} className="w-full h-28 object-contain" />;
}

/**
 * "Tümü" — tüm markaların ürünleri tek listede (all_products VIEW).
 * Ana ekranda "hepsi toplu" görünümü.
 */
export default function AllProductsGrid() {
  const {
    products, filters, currentPage, itemsPerPage, totalCount, isLoading, error,
    fetchProducts, setFilter, setPage,
  } = useAllProductsStore();
  const openDetail = useProductDetailStore((s) => s.open);

  useEffect(() => { fetchProducts(); }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  return (
    <div className="space-y-4">
      {/* Arama + marka filtresi */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Tüm markalarda ara…"
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-9 text-sm outline-none focus:ring-2 focus:ring-red-200"
          />
          {filters.search && (
            <button onClick={() => setFilter('search', '')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={15} /></button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SOURCES.map((s) => (
            <button
              key={s.id}
              onClick={() => setFilter('source', s.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${filters.source === s.id ? 'bg-[#DC2626] text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-red-300 hover:text-[#DC2626]'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400 font-medium">{totalCount.toLocaleString()} ürün</p>

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
          <p className="text-xs text-slate-400 mt-1 max-w-sm">Katalog verisi henüz yüklenmemiş olabilir.</p>
        </div>
      )}

      {!isLoading && !error && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {products.map((item) => (
            <div key={`${item.source}-${item.id}`} onClick={() => openDetail(item.source as ProductSource, item.id)} className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col cursor-pointer">
              <div className="bg-gradient-to-b from-slate-50/50 to-white p-2 pt-3">
                <ProductImage src={item.image || ''} alt={item.name} />
              </div>
              <div className="p-3 flex flex-col flex-1">
                <p className="text-[10px] font-bold text-[#DC2626] uppercase tracking-wider truncate">{item.brand}</p>
                <h3 className="text-xs font-bold text-slate-700 line-clamp-2 mt-0.5 min-h-[2rem]" title={item.name}>{item.name}</h3>
                {item.category && <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.category}</p>}
                <span className="mt-auto pt-2 text-sm font-black text-slate-800">{fmtPrice(item.price)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

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
