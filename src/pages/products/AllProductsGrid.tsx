import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAllProductsStore, type AllProduct } from '../../stores/allProductsStore';
import { useProductDetailStore, type ProductSource } from '../../stores/productDetailStore';
import { useCompareStore, brandToSource, type CompareItem } from '../../stores/compareStore';
import { useProjectStore } from '../../stores/projectStore';
import { useEquipmentStore, type EquipmentItem } from '../../stores/equipmentStore';
import ProductCard from '../../components/catalog/ProductCard';
import { formatDims } from '../../lib/dims';
import {
  Search, X, ChevronLeft, ChevronRight, Package, Loader2, Clock, CheckCircle2, MapPin,
} from 'lucide-react';

// all_products satırı → sepet (EquipmentItem) şekli — Diamond/CombiSteel ile aynı sepet anahtarı (id)
const toCartItem = (p: AllProduct): EquipmentItem => ({
  id: p.id,
  name: p.name,
  desc: '',
  cat: p.category || 'other',
  sub: '',
  fam: p.category || '',
  img: p.image || '',
  url: p.image || '',
  brand: p.brand,
  l: Number(p.length_mm) || 0,
  w: Number(p.width_mm) || Number(p.depth_mm) || 0,
  h: String(p.height_mm ?? '0'),
  kw: 0,
  price: p.price || 0,
  line: '',
});

// Ölçü etiketi (kartta gösterim) — var olan ölçüleri L×W×H mm biçiminde gösterir.
const dimStr = (p: AllProduct): string | undefined =>
  formatDims(p.length_mm, p.width_mm || p.depth_mm, p.height_mm);

// label null → çeviriden "Tümü" gösterilir; diğerleri marka adı (çevrilmez)
const SOURCES: { id: string; label: string | null }[] = [
  { id: '', label: null },
  { id: 'diamond', label: 'Diamond' },
  { id: 'combisteel', label: 'CombiSteel' },
  { id: 'handi', label: 'HENDI' },
];

// all_products satırı → karşılaştırma öğesi (boyut verisi yok; fiyat/marka/kategori karşılaştırılır)
const toCompareItem = (p: AllProduct): CompareItem => ({
  id: `${p.source}-${p.id}`,
  sku: p.id,
  name: p.name,
  brand: p.brand,
  image: p.image || '',
  price: p.price,
  promoPrice: null,
  stock: p.stock != null && !isNaN(Number(p.stock)) ? Number(p.stock) : null,
  width_mm: p.width_mm ?? null,
  height_mm: p.height_mm ?? null,
  depth_mm: p.depth_mm ?? null,
  length_mm: p.length_mm ?? null,
  weight: null,
  kw: null,
  connection: null,
  category: p.category,
  source: (p.source === 'diamond' || p.source === 'combisteel') ? p.source : brandToSource(p.brand),
});

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
  const { t } = useTranslation();
  const {
    products, filters, currentPage, itemsPerPage, totalCount, isLoading, error,
    fetchProducts, setFilter, setPage,
  } = useAllProductsStore();
  const openDetail = useProductDetailStore((s) => s.open);
  const compareItems = useCompareStore((s) => s.items);
  const toggleCompare = useCompareStore((s) => s.toggleItem);
  const compareIds = useMemo(() => new Set(compareItems.map((i) => i.id)), [compareItems]);

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
            placeholder={t('product.searchAllBrands')}
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
              {s.label ?? t('common.all')}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400 font-medium">{t('product.productsCount', { count: totalCount })}</p>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[#DC2626] mr-2" />
          <span className="text-sm text-slate-500">{t('common.loading')}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {t('common.errorLabel', { message: error })}
          <button onClick={fetchProducts} className="ml-3 underline font-bold">{t('common.retry')}</button>
        </div>
      )}
      {!isLoading && !error && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package size={40} className="text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-600">{t('product.noProductsFound')}</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">{t('product.catalogNotLoaded')}</p>
        </div>
      )}

      {!isLoading && !error && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {products.map((item) => {
            const inCompare = compareIds.has(`${item.source}-${item.id}`);
            return (
              <ProductCard
                key={`${item.source}-${item.id}`}
                brand={item.brand}
                code={item.code || undefined}
                name={item.name}
                description={item.description || undefined}
                subtitle={item.category || undefined}
                dims={dimStr(item)}
                price={item.price}
                imageUrl={item.image || ''}
                badges={{ stock: (item.stock != null && Number(item.stock) > 0) ? t('common.inStock') : undefined }}
                inCompare={inCompare}
                cartProduct={toCartItem(item)}
                formatPrice={fmtPrice}
                onOpenDetail={() => openDetail(item.source as ProductSource, item.id, toCartItem(item))}
                onToggleCompare={() => toggleCompare(toCompareItem(item))}
                onFloorPlan={() => handleShowOnFloorPlan(item.id)}
              />
            );
          })}
        </div>
      )}

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
                <h2 className="text-base font-headline font-black text-slate-800">{t('product.addToProject')}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t('product.whichProject')}</p>
              </div>
              <button onClick={() => setProjectModalItem(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {activeProjects.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock size={13} className="text-[#DC2626]" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626]">{t('project.inProgress')}</span>
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
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('project.completed')}</span>
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
                  <p className="text-sm font-bold text-slate-500">{t('project.noProjects')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
