import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useHandiStore, type HandiProduct } from '../../stores/handiStore';
import { useProductDetailStore } from '../../stores/productDetailStore';
import { useCompareStore, type CompareItem } from '../../stores/compareStore';
import { useProjectStore } from '../../stores/projectStore';
import { useEquipmentStore } from '../../stores/equipmentStore';
import ProductCard from '../../components/catalog/ProductCard';
import CategoryFilterPanel from '../../components/CategoryFilterPanel';
import { formatDims } from '../../lib/dims';
import {
  Search, X, ChevronLeft, ChevronRight, Package,
  Loader2, RotateCcw, Clock, CheckCircle2, MapPin,
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

/* ─── HENDI ürünü → global CompareItem (id 'handi-…' → Tümü ile aynı anahtar) ─── */
function toCompareItem(p: HandiProduct): CompareItem {
  return {
    id: `handi-${p.id}`,
    sku: p.id,
    name: p.name,
    brand: p.brand || 'HENDI',
    image: p.image_url || '',
    price: p.price,
    promoPrice: null,
    stock: p.stock,
    width_mm: p.width_mm ?? null,
    height_mm: p.height_mm ?? null,
    depth_mm: null,
    length_mm: p.length_mm ?? null,
    weight: null,
    kw: null,
    connection: null,
    category: p.category_name,
    source: 'handi',
  };
}

export default function HendiPage() {
  const { t } = useTranslation();
  const {
    products, categories, filters, currentPage, itemsPerPage, totalCount,
    isLoading, error, fetchProducts, fetchCategories, setFilter, resetFilters, setPage,
  } = useHandiStore();
  const openDetail = useProductDetailStore((s) => s.open);
  const { toggleItem: toggleCompare, isComparing } = useCompareStore();
  const navigate = useNavigate();
  const { projects } = useProjectStore();
  const { setFloorPlanItem } = useEquipmentStore();
  const [projectModalItem, setProjectModalItem] = useState<string | null>(null);
  const activeProjects = projects.filter((p) => p.status !== 'complete');
  const completedProjects = projects.filter((p) => p.status === 'complete');
  const handleShowOnFloorPlan = (id: string) => setProjectModalItem(id);
  const handleProjectSelect = (projectId: string) => {
    if (projectModalItem) {
      setFloorPlanItem(projectModalItem);
      setProjectModalItem(null);
      navigate(`/projects/${projectId}/design`);
    }
  };

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
              <h1 className="text-2xl md:text-3xl font-headline font-black text-white tracking-tight">{t('handi.catalogTitle', { brand: 'HENDI' })}</h1>
              <p className="text-white/70 text-sm mt-1">
                <span className="bg-white/20 rounded-full px-2.5 py-0.5 text-white font-bold text-xs mr-2">{totalCount.toLocaleString()}</span>
                {t('common.products')}
              </p>
            </div>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder={t('handi.searchPlaceholder')}
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
          <Package size={14} /> {t('handi.inStock')}
        </button>
        {hasActiveFilters && (
          <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-2 text-xs text-red-500 hover:text-red-700 font-medium transition-colors">
            <RotateCcw size={12} /> {t('common.clear')}
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400 font-medium">
          {t('handi.productCount', { count: totalCount.toLocaleString() })}
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
          <span className="text-sm text-slate-500">{t('common.loading')}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {t('common.error')}: {error}
          <button onClick={fetchProducts} className="ml-3 underline font-bold">{t('common.retry')}</button>
        </div>
      )}
      {!isLoading && !error && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package size={40} className="text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-600">{t('product.noResults')}</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">{t('catalog.emptyHint')}</p>
        </div>
      )}

      {/* ─── Grid ─── */}
      {!isLoading && !error && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {products.map((item) => (
            <ProductCard
              key={item.id}
              brand={item.brand || 'HENDI'}
              code={(item.ean && /^\d{6,14}$/.test(item.ean)) ? item.ean : item.id}
              name={item.name}
              description={item.description || undefined}
              subtitle={item.category_name || undefined}
              dims={formatDims(item.length_mm, item.width_mm, item.height_mm)}
              price={item.price}
              imageUrl={item.image_url || ''}
              badges={{ stock: (item.stock ?? 0) > 0 ? t('handi.inStock') : undefined }}
              inCompare={isComparing(`handi-${item.id}`)}
              cartProduct={toCartItem(item)}
              formatPrice={fmtPrice}
              onOpenDetail={() => openDetail('handi', item.id, toCartItem(item))}
              onToggleCompare={() => toggleCompare(toCompareItem(item))}
              onFloorPlan={() => handleShowOnFloorPlan(item.id)}
            />
          ))}
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

      {/* ─── Projeye ekle — proje seçim modalı ─── */}
      {projectModalItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setProjectModalItem(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-headline font-black text-slate-800">{t('catalog.addToProject')}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t('diamond.whichProject')}</p>
              </div>
              <button onClick={() => setProjectModalItem(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {activeProjects.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock size={13} className="text-[#DC2626]" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626]">{t('diamond.ongoing')}</span>
                  </div>
                  <div className="space-y-2">
                    {activeProjects.map((p) => (
                      <button key={p.id} onClick={() => handleProjectSelect(p.id)} className="w-full text-left px-4 py-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-300 transition-all group">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800 group-hover:text-[#DC2626] transition-colors">{p.name}</span>
                          <MapPin size={14} className="text-[#DC2626] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-slate-500">{p.clientName}</span>
                          <span className="text-[10px] text-slate-500">{p.area} m²</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {completedProjects.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle2 size={13} className="text-slate-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('diamond.completed')}</span>
                  </div>
                  <div className="space-y-2">
                    {completedProjects.map((p) => (
                      <button key={p.id} onClick={() => handleProjectSelect(p.id)} className="w-full text-left px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all group opacity-70 hover:opacity-100">
                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition-colors">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {projects.length === 0 && (
                <div className="py-10 text-center">
                  <Package size={36} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-sm font-bold text-slate-500">{t('catalog.noProjects')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
