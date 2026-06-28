import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useEquipmentStore, CATEGORIES, type EquipmentItem } from '../../stores/equipmentStore';
import { useProjectStore, type ProductItem } from '../../stores/projectStore';
import {
  ArrowLeft, Search, X, Plus, Check, Package, PencilLine,
  Refrigerator, Flame, Droplets, Microwave, Waves, Table, Zap,
  ChevronLeft, ChevronRight, ArrowUpDown,
} from 'lucide-react';

const iconMap: Record<string, any> = {
  refrigerator: Refrigerator,
  flame: Flame,
  droplets: Droplets,
  microwave: Microwave,
  waves: Waves,
  table: Table,
};

// EquipmentItem.cat (16 katalog kategorisi) → ProductItem.category (5 proje kategorisi)
const CAT_MAP: Record<string, ProductItem['category']> = {
  cooking: 'cooking',
  pizza_pasta: 'cooking',
  bakery: 'cooking',
  cook_chill: 'cooking',
  dynamic_prep: 'cooking',
  cooling: 'cold',
  ice_cream: 'cold',
  dishwash: 'cleaning',
  cleaning_products: 'cleaning',
  laundry: 'cleaning',
  prep_hygiene: 'neutral',
  self_service: 'neutral',
  trolley_gn: 'neutral',
  ventilation: 'neutral',
  coffee_tea: 'other',
  hospitality: 'other',
};

const ICON_BY_CAT: Record<ProductItem['category'], string> = {
  cooking: 'flame',
  cold: 'refrigerator',
  cleaning: 'droplets',
  neutral: 'table',
  other: 'microwave',
};

// "1530/2010" → 1530, "850" → 850
function parseHeight(h: string): number {
  const first = parseFloat(String(h ?? '').split('/')[0].replace(',', '.'));
  return isFinite(first) ? first : 0;
}

// Katalog ürününü proje ürünü formatına çevir (boyutlar mm → cm). code = katalog id
// → tasarım açılışında reconcileProductsIntoDesign bunu Equipment.catalogId ile eşler.
function toProductItem(item: EquipmentItem): Omit<ProductItem, 'id'> {
  const category = CAT_MAP[item.cat] || 'other';
  return {
    name: item.name,
    code: item.id,
    category,
    icon: ICON_BY_CAT[category],
    imageData: item.img || undefined,
    dimensions: {
      width: Math.round((item.l || 0) / 10) || 80,
      height: Math.round(parseHeight(item.h) / 10) || 70,
      depth: Math.round((item.w || 0) / 10) || 85,
    },
    kw: item.kw || 0,
    powerType: item.kw > 0 ? 'electric' : 'none',
    price: item.price || 0,
    description: item.desc || '',
    brand: item.brand || '',
    series: item.line || '',
    features: [],
  };
}

function ProductImage({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error || !src) {
    return (
      <div className="w-full h-28 bg-surface-container-highest flex items-center justify-center">
        <Package size={28} className="text-on-surface-variant/30" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setError(true)}
      className="w-full h-28 object-contain bg-white"
    />
  );
}

const PER_PAGE = 24;

type SortKey = 'default' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'kw-desc' | 'cat';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Önerilen sıralama' },
  { value: 'name-asc', label: 'İsim (A → Z)' },
  { value: 'name-desc', label: 'İsim (Z → A)' },
  { value: 'price-asc', label: 'Fiyat (artan)' },
  { value: 'price-desc', label: 'Fiyat (azalan)' },
  { value: 'kw-desc', label: 'Güç (yüksek → düşük)' },
  { value: 'cat', label: 'Kategoriye göre' },
];

export default function SelectProductPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  // Stabil referanslar — selector loop riski yok
  const allItems = useEquipmentStore((s) => s.allItems);
  const addProductToProject = useProjectStore((s) => s.addProductToProject);
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [subrange, setSubrange] = useState('');
  const [sort, setSort] = useState<SortKey>('default');
  const [page, setPage] = useState(1);
  const [addedCounts, setAddedCounts] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Filtreleme
  const filtered = useMemo(() => {
    let list = allItems;
    if (category) list = list.filter((i) => i.cat === category);
    if (subrange) list = list.filter((i) => i.sub === subrange);
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
  }, [allItems, category, subrange, query]);

  // Sıralama (filtreden sonra) — allItems'ı mutasyona uğratmamak için kopya
  const sorted = useMemo(() => {
    if (sort === 'default') return filtered;
    // fiyat sıralamasında fiyatı 0 olanları (fiyat yok) sona at
    const priceVal = (p: number) => (p > 0 ? p : Number.POSITIVE_INFINITY);
    const arr = [...filtered];
    switch (sort) {
      case 'name-asc':
        arr.sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        break;
      case 'name-desc':
        arr.sort((a, b) => b.name.localeCompare(a.name, 'tr'));
        break;
      case 'price-asc':
        arr.sort((a, b) => priceVal(a.price) - priceVal(b.price));
        break;
      case 'price-desc':
        arr.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'kw-desc':
        arr.sort((a, b) => (b.kw || 0) - (a.kw || 0));
        break;
      case 'cat':
        arr.sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name, 'tr'));
        break;
    }
    return arr;
  }, [filtered, sort]);

  // Seçili kategorinin alt aralıkları
  const subranges = useMemo(() => {
    if (!category) return [];
    const set = new Set<string>();
    allItems.forEach((i) => {
      if (i.cat === category && i.sub) set.add(i.sub);
    });
    return Array.from(set).sort();
  }, [allItems, category]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);
  const totalAdded = Object.values(addedCounts).reduce((a, b) => a + b, 0);

  const resetPage = () => setPage(1);

  const handleAdd = (item: EquipmentItem) => {
    if (!projectId) return;
    // project.products'a yaz (code = katalog id). Ürünler + Teklif anında gösterir;
    // tasarım (2D/3D) açılışında reconcileProductsIntoDesign bunu odaya yerleştirir.
    addProductToProject(projectId, toProductItem(item));
    setAddedCounts((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
    setToast(`${item.name} eklendi`);
    window.clearTimeout((handleAdd as any)._t);
    (handleAdd as any)._t = window.setTimeout(() => setToast(null), 1800);
  };

  const formatPrice = (p: number) =>
    p > 0 ? `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '—';

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto w-full text-center py-20">
        <p className="text-on-surface-variant">Proje bulunamadı</p>
        <Link to="/projects" className="text-primary font-medium hover:underline mt-4 inline-block">
          Projelere dön
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-5 pb-24 md:pb-6">
      {/* Üst bar */}
      <button
        onClick={() => navigate(`/projects/${projectId}`)}
        className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium"
      >
        <ArrowLeft size={18} /> {project.name} projesine geri dön
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl md:text-3xl font-black text-on-surface tracking-tight">
            Ürün Ekle
          </h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            <span className="font-bold text-primary">{project.name}</span> projesine katalogdan ürün seçin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/projects/${projectId}/products/new`}
            className="flex items-center gap-2 bg-surface-container-highest hover:bg-surface-container-high text-on-surface-variant px-4 py-2.5 rounded-lg font-bold text-sm transition-colors"
          >
            <PencilLine size={16} /> Manuel ekle
          </Link>
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex items-center gap-2 brushed-metal text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg hover:opacity-90 transition-all"
          >
            <Check size={16} /> Bitir
            {totalAdded > 0 && (
              <span className="bg-white/25 px-1.5 rounded-full text-[11px]">{totalAdded}</span>
            )}
          </button>
        </div>
      </div>

      {/* Arama + Sıralama */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); resetPage(); }}
            placeholder="Ürün adı, kod, marka ile ara..."
            className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 pl-10 pr-10 text-sm focus:ring-2 focus:ring-primary outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); resetPage(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="relative w-full sm:w-56">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" size={16} />
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as SortKey); resetPage(); }}
            className="w-full bg-surface-container-highest border-none rounded-lg py-2.5 pl-9 pr-8 text-sm font-medium focus:ring-2 focus:ring-primary outline-none appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kategori çubuğu */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setCategory(''); setSubrange(''); resetPage(); }}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            !category ? 'bg-primary text-white shadow-md' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          Tümü ({allItems.length.toLocaleString()})
        </button>
        {CATEGORIES.filter((c) => c.count > 0).map((cat) => {
          const Icon = iconMap[cat.icon] || Package;
          const isActive = category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => { setCategory(isActive ? '' : cat.id); setSubrange(''); resetPage(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                isActive ? 'text-white shadow-md' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
              }`}
              style={isActive ? { backgroundColor: cat.color } : {}}
            >
              <Icon size={13} />
              {cat.name} ({cat.count})
            </button>
          );
        })}
      </div>

      {/* Alt aralık filtresi */}
      {subranges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-on-surface-variant font-medium self-center mr-1">Alt grup:</span>
          <button
            onClick={() => { setSubrange(''); resetPage(); }}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
              !subrange ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            Tümü
          </button>
          {subranges.map((sub) => (
            <button
              key={sub}
              onClick={() => { setSubrange(subrange === sub ? '' : sub); resetPage(); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                subrange === sub ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-on-surface-variant">
        {filtered.length.toLocaleString()} ürün bulundu
      </p>

      {/* Ürün grid */}
      {pageItems.length === 0 ? (
        <div className="py-16 text-center">
          <Package size={48} className="mx-auto text-on-surface-variant/20 mb-4" />
          <h3 className="text-lg font-bold text-on-surface-variant mb-1">Sonuç bulunamadı</h3>
          <p className="text-sm text-on-surface-variant/60">Farklı bir arama veya filtre deneyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {pageItems.map((item) => {
            const added = addedCounts[item.id] || 0;
            return (
              <div
                key={item.id}
                className="bg-surface-container-lowest rounded-xl border border-outline-variant/10 overflow-hidden hover:shadow-lg hover:border-primary/20 transition-all flex flex-col"
              >
                <ProductImage src={item.img} alt={item.name} />
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="text-xs font-bold text-on-surface line-clamp-2 leading-tight mb-1">{item.name}</h3>
                  <p className="text-[10px] text-on-surface-variant font-mono mb-1">{item.id}</p>
                  <div className="flex items-center justify-between mt-auto pt-1">
                    <span className="text-[10px] text-on-surface-variant truncate max-w-[60%]">{item.brand}</span>
                    {item.price > 0 && (
                      <span className="text-xs font-bold text-primary">{formatPrice(item.price)}</span>
                    )}
                  </div>
                  {item.kw > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Zap size={10} className="text-amber-500" />
                      <span className="text-[10px] text-on-surface-variant">{item.kw} kW</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleAdd(item)}
                    className={`mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                      added > 0
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                    }`}
                  >
                    {added > 0 ? (
                      <><Check size={14} /> Eklendi{added > 1 ? ` (${added})` : ''}</>
                    ) : (
                      <><Plus size={14} /> Ekle</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sayfalama */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-2">
          <p className="text-xs text-on-surface-variant">
            <span className="font-bold text-on-surface">
              {((safePage - 1) * PER_PAGE) + 1}-{Math.min(safePage * PER_PAGE, filtered.length)}
            </span>{' '}
            / {filtered.length.toLocaleString()} ürün
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-on-surface px-2">
              {safePage} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-bottom-2">
          <Check size={16} /> {toast}
        </div>
      )}
    </div>
  );
}
