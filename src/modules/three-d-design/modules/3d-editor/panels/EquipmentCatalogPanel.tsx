/**
 * EquipmentCatalogPanel — rich product catalog for the 3D editor.
 *
 * Sources its data from the global `useEquipmentStore` (the same catalog
 * the Manuel Çizim page uses), so adding a product here uses the project's
 * canonical L/W/H + image + brand metadata.
 *
 * Interaction model
 *   - Type to search.
 *   - Filter by category (chips).
 *   - Toggle "favorites only".
 *   - Click a card → "arms" placement. Editor3D's place-on-click handler
 *     reads the armed product id and drops a textured box at the floor
 *     intersection. Shift+click on the canvas = chained placement.
 *   - Esc disarms.
 */

import { useEffect, useMemo, useRef, useState, type FC, type ReactNode, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Star, X, ChevronRight, ChevronLeft, Box, Upload, Loader2 } from 'lucide-react';
import {
  CATEGORIES,
  useEquipmentStore,
  type EquipmentItem,
} from '../../../../../stores/equipmentStore';
import { parseHeightMm } from '../loaders/productMesh';
import { EQUIPMENT_CATALOG, isCustomGlb, getCatalogEntry } from '../loaders/equipmentCatalog';
import { loadModelViewerScript } from '../../../../../components/Model3DViewer';
import {
  findGlbForProductId,
  listSystemGlbEquipment,
  GLB_CATEGORY_TO_TAXONOMY,
} from '../loaders/glbManifest';
import { importGlbFile, GLB_ACCEPT_ATTR } from '../loaders/customGlb';
import { useMeshStore } from '../../../../../stores/meshStore';
import {
  getAllProduct3DModels,
  productKeyFor,
} from '../../../../../lib/meshyClient';
import { matchesCategory } from '@/lib/categoryTaxonomy';

interface EquipmentCatalogPanelProps {
  /** Currently armed product id (Editor3D owns this state). */
  armedProductId: string | null;
  onArm: (item: EquipmentItem | null) => void;
  /**
   * Karta tıklayınca ürünü SAHNEYE HEMEN yerleştir (3D). Verilirse tek tık =
   * anında yerleştirme (oda merkezine); Shift+tık = eski "arm" davranışı (zemine
   * tıklayarak hassas yerleştirme). Verilmezse (2D) tık her zaman arm eder.
   */
  onPlace?: (item: EquipmentItem) => void;
  /**
   * Kart hover'lanınca ürünün GLB'sini ön-yükle (cache ısıt) → yerleştirmede
   * bekleme olmasın. Opsiyonel; GLB yoksa güvenli no-op olmalı.
   */
  onPreload?: (item: EquipmentItem) => void;
  open: boolean;
  onToggleOpen: () => void;
  /** Which edge to dock to. Defaults to 'right' (3D editor). 2D uses 'left'
   *  so it never overlaps the right-side properties panel. */
  side?: 'left' | 'right';
}

const RESULT_LIMIT = 50;

/** Hardcoded GLB catalog ids for O(1) lookup. */
const HARDCODED_GLB_IDS = new Set(EQUIPMENT_CATALOG.map((e) => e.id));

/** True if `item` has a usable GLB anywhere in the system. */
function hasGlb(
  item: EquipmentItem,
  meshRows: Record<string, { status?: string; glb_url?: string | null }>,
): boolean {
  // 0) User-uploaded GLB (session registry)
  if (isCustomGlb(item.id)) return true;
  // 1) Hardcoded EQUIPMENT_CATALOG (auto-built from public/models/ via manifest)
  if (HARDCODED_GLB_IDS.has(item.id)) return true;
  // 2) Manifest fallback — productId or stem-normalized filename match
  if (findGlbForProductId(item.id)) return true;
  // 3) Supabase-saved MeshAI GLB (per-image)
  const key = productKeyFor(item.img, item.id);
  if (!key) return false;
  const row = meshRows[key];
  return !!(row && row.status === 'done' && row.glb_url);
}

export default function EquipmentCatalogPanel({
  armedProductId,
  onArm,
  onPlace,
  onPreload,
  open,
  onToggleOpen,
  side = 'right',
}: EquipmentCatalogPanelProps) {
  const { t, i18n: i18nApi } = useTranslation();
  const productItems = useEquipmentStore((s) => s.allItems);
  const favorites = useEquipmentStore((s) => s.favorites);
  const toggleFavorite = useEquipmentStore((s) => s.toggleFavorite);
  const meshRows = useMeshStore((s) => s.rows);
  const setMeshRows = useMeshStore((s) => s.setRows);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [favOnly, setFavOnly] = useState(false);
  const [glbOnly, setGlbOnly] = useState(false);
  const [meshFetched, setMeshFetched] = useState(false);

  // ── User-uploaded GLBs (session) ───────────────────────────────────────────
  const [uploaded, setUploaded] = useState<EquipmentItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onPickGlb = async (file: File | null): Promise<void> => {
    if (!file) return;
    setUploading(true);
    try {
      const entry = await importGlbFile(file);
      const item: EquipmentItem = {
        id: entry.id,
        name: entry.name,
        desc: t('design3d.catalog.uploadedDesc', 'Yüklenen 3D model'),
        cat: '',
        sub: '',
        fam: '',
        img: '',
        brand: t('design3d.catalog.uploadedBrand'),
        l: entry.dimensionsMm.width,
        w: entry.dimensionsMm.depth,
        h: String(entry.dimensionsMm.height),
        kw: 0,
        price: 0,
        line: 'Custom GLB',
      };
      setUploaded((prev) => [item, ...prev]);
      onArm(item); // arm immediately — user can click the floor to place it
    } catch (err) {
      console.error('[customGlb] import failed', err);
      // eslint-disable-next-line no-alert
      alert(t('design3d.catalog.uploadFailed', { err: err instanceof Error ? err.message : String(err) }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // ── Manifest'teki standalone GLB'ler için sentetik ekipman item'ları ──
  // (productId'si olanlar zaten products.json'da, çift göstermiyoruz.)
  const systemGlbItems = useMemo<EquipmentItem[]>(() => {
    return listSystemGlbEquipment()
      .filter((m) => !m.productId)
      .map((m): EquipmentItem => ({
        id: `glb-${m.filename.replace(/\.glb$/i, '')}`,
        name: t(m.labelKey, { defaultValue: m.labelFallback }),
        desc: t('design3d.catalog.systemLibrary'),
        // Kategori chip'leri ürün taksonomisini kullanır; 3D enum → taksonomi
        // eşlemesi olmadan chip'e tıklayınca GLB öğeleri kaybolurdu.
        cat: GLB_CATEGORY_TO_TAXONOMY[m.category] ?? '',
        sub: '',
        fam: '',
        img: '',
        brand: '2MC System',
        l: m.dimensionsMm?.width ?? 800,
        w: m.dimensionsMm?.depth ?? 700,
        h: String(m.dimensionsMm?.height ?? 900),
        kw: 0,
        price: 0,
        line: 'GLB Library',
      }));
  }, [t, i18nApi.language]);

  // Birleşik liste — yüklenenler ve sentetik GLB item'ları en üstte
  const allItems = useMemo<EquipmentItem[]>(
    () => [...uploaded, ...systemGlbItems, ...productItems],
    [uploaded, systemGlbItems, productItems],
  );

  // ── Supabase'deki MeshAI 3D modellerini bir kez bulk fetch et ───────
  // ÖNEMLİ: product_key olarak binlerce ürün anahtarını 200'lük dev `.in()`
  // sorgularına bölmek URL/parse limitine takılıp bazı chunk'ları HTTP 400 ile
  // düşürüyordu → done modeller "kayıp" görünüyordu (17→4). Tablo yalnız üretimi
  // başlatılmış modelleri içerir (küçük); hepsini TEK sorguda çekip store'a yazıyoruz.
  useEffect(() => {
    if (meshFetched || allItems.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await getAllProduct3DModels();
        if (cancelled) return;
        if (rows.length > 0) setMeshRows(rows);
      } catch {
        /* yok say — offline ise sadece hardcoded GLB'ler görünür */
      } finally {
        if (!cancelled) setMeshFetched(true);
      }
    })();
    return () => { cancelled = true; };
  }, [allItems, meshFetched, setMeshRows]);

  const glbCount = useMemo(
    () => allItems.reduce((n, i) => (hasGlb(i, meshRows) ? n + 1 : n), 0),
    [allItems, meshRows],
  );

  const filtered = useMemo(() => {
    let items = allItems;
    if (favOnly) items = items.filter((i) => favorites.includes(i.id));
    if (glbOnly) items = items.filter((i) => hasGlb(i, meshRows));
    // Chip sayılarıyla AYNI çözümleyici (resolvedOf) kullanılır; ham `i.cat`
    // eşitliği GLB öğelerini (farklı enum / boş cat) gizliyordu.
    if (category) items = items.filter((i) => matchesCategory(category, i));
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          (i.desc?.toLowerCase().includes(q) ?? false),
      );
    }
    return items;
  }, [allItems, favorites, favOnly, glbOnly, meshRows, category, search]);

  // DOM'u sınırlı tutmak için sayfalama: filtre değişince limit sıfırlanır,
  // "Daha fazla göster" ile RESULT_LIMIT'lik adımlarla açılır.
  const [visibleLimit, setVisibleLimit] = useState(RESULT_LIMIT);
  useEffect(() => {
    setVisibleLimit(RESULT_LIMIT);
  }, [search, category, favOnly, glbOnly]);
  const visible = useMemo(() => filtered.slice(0, visibleLimit), [filtered, visibleLimit]);

  return (
    <aside
      className={[
        'absolute top-16 bottom-3 rounded-2xl border border-slate-200/70 bg-white/95 backdrop-blur shadow-lg shadow-slate-900/5 transition-all flex flex-col overflow-hidden z-20',
        side === 'left' ? 'left-3' : 'right-3',
        open ? 'w-[74vw] max-w-[17rem] sm:w-80 sm:max-w-none xl:w-96 2xl:w-[26rem]' : 'w-9',
      ].join(' ')}
    >
      <header className="flex items-center gap-1 px-4 py-3 border-b border-slate-100">
        {open && (
          <h3 className="text-[13px] font-semibold text-slate-800 truncate">{t('design3d.catalog.title')}</h3>
        )}
        <div className="ml-auto flex items-center gap-1">
          {open && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title={t('design3d.catalog.uploadTitle')}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-xl text-[11px] font-semibold bg-brand-red text-white shadow-sm hover:brightness-110 disabled:opacity-50 transition"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {t('design3d.catalog.upload')}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleOpen}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label={open ? t('design3d.catalog.collapse') : t('design3d.catalog.expand')}
          >
            {open ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={GLB_ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => void onPickGlb(e.target.files?.[0] ?? null)}
        />
      </header>

      {open && (
        <>
          {/* ── Search ───────────────────────────────────────────────── */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('design3d.catalog.searchPlaceholder', 'Ara… (örn. fritöz)')}
                className="w-full pl-9 pr-7 h-9 rounded-xl border border-slate-200 text-[12px] outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 transition"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X size={11} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-1.5 mt-2.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFavOnly((v) => !v)}
                  className={[
                    'inline-flex items-center gap-1 text-[11px] font-medium px-2.5 h-7 rounded-full border transition',
                    favOnly
                      ? 'bg-brand-red text-white border-brand-red'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <Star size={10} fill={favOnly ? 'currentColor' : 'none'} />
                  {t('design3d.catalog.favorites')} {favorites.length > 0 && `(${favorites.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setGlbOnly((v) => !v)}
                  title={t('design3d.catalog.glbOnlyTitle')}
                  className={[
                    'inline-flex items-center gap-1 text-[11px] font-medium px-2.5 h-7 rounded-full border transition',
                    glbOnly
                      ? 'bg-brand-red text-white border-brand-red'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <Box size={10} />
                  3D {glbCount > 0 && <span className="tabular-nums">({glbCount})</span>}
                </button>
              </div>
              <span className="text-[11px] text-slate-400 tabular-nums">
                {filtered.length}
              </span>
            </div>
          </div>

          {/* ── Category chips — tek satır yatay kaydırma ────────────── */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <CategoryChip
                label={t('common.all')}
                active={category === ''}
                onClick={() => setCategory('')}
              />
              {CATEGORIES.map((c) => (
                <CategoryChip
                  key={c.id}
                  label={c.name}
                  count={c.count}
                  color={c.color}
                  active={category === c.id}
                  onClick={() => setCategory(category === c.id ? '' : c.id)}
                />
              ))}
            </div>
          </div>

          {/* ── Results list ─────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-3">
            {filtered.length === 0 ? (
              <p className="text-[11px] text-slate-400 px-2 py-6 text-center">
                {t('design3d.catalog.noResults')}
              </p>
            ) : (
              <>
                <ul className="space-y-1.5">
                  {visible.map((item) => {
                    const armed = item.id === armedProductId;
                    const fav = favorites.includes(item.id);
                    const glb = hasGlb(item, meshRows);
                    return (
                      // Favori butonu kartın İÇİNDE değil, kardeş overlay olarak
                      // durur — button-içinde-button geçersiz HTML'di (a11y).
                      <li key={item.id} className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            // Varsayılan (3D): tek tık → ürünü sahneye HEMEN yerleştir.
                            // Shift+tık → hassas yerleştirme için "arm" (zemine tıkla).
                            // onPlace yoksa (2D) her tık eski davranış: arm.
                            if (onPlace && !e.shiftKey) {
                              onPlace(item);
                              return;
                            }
                            onArm(armed ? null : item);
                          }}
                          onMouseEnter={() => onPreload?.(item)}
                          className={[
                            'w-full flex gap-2.5 p-2 pr-9 rounded-xl border text-left transition',
                            armed
                              ? 'bg-brand-red/5 border-brand-red/40 ring-1 ring-brand-red/20'
                              : 'bg-white border-slate-200/70 hover:border-brand-red/40 hover:shadow-sm',
                          ].join(' ')}
                        >
                          <Thumb item={item} glb={glb} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] xl:text-[13px] font-semibold text-slate-800 truncate">
                              {item.name}
                            </div>
                            <div className="text-[10px] xl:text-[11px] text-slate-400 truncate">
                              {item.brand} · {item.id}
                            </div>
                            <div className="text-[10px] xl:text-[11px] text-slate-500 tabular-nums">
                              {item.l}×{item.w}×{parseHeightMm(item.h)} mm
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleFavorite(item.id)}
                          className={[
                            'absolute right-1.5 top-1.5 p-1.5 rounded-lg transition',
                            fav ? 'text-amber-500' : 'text-slate-300 hover:bg-slate-100 hover:text-amber-400',
                          ].join(' ')}
                          aria-label={fav ? t('design3d.catalog.unfav') : t('design3d.catalog.fav')}
                        >
                          <Star size={12} fill={fav ? 'currentColor' : 'none'} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {filtered.length > visibleLimit && (
                  <button
                    type="button"
                    onClick={() => setVisibleLimit((n) => n + RESULT_LIMIT)}
                    className="w-full h-8 mt-2 rounded-xl border border-slate-200 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    {t('design3d.catalog.showMore', {
                      defaultValue: 'Daha fazla göster ({{n}})',
                      n: filtered.length - visibleLimit,
                    })}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

// ── UI atoms ───────────────────────────────────────────────────────────────

/**
 * Ürün küçük görseli. Öncelik: gerçek ürün fotoğrafı → yoksa 3D modeli olan
 * ürünlerde CANLI GLB önizlemesi (model-viewer) → o da yoksa küp/placeholder.
 * "3D" kırmızı etiketi her 3D modelli üründe kalır.
 */
function Thumb({ item, glb }: { item: EquipmentItem; glb: boolean }) {
  const { t } = useTranslation();
  const glbUrl = useMemo(
    () => (!item.img && glb ? getCatalogEntry(item.id)?.glbUrl ?? null : null),
    [item.img, item.id, glb],
  );

  return (
    <div className="relative flex-shrink-0 w-12 h-12 xl:w-14 xl:h-14 bg-slate-50 border border-slate-200/70 rounded-lg overflow-hidden flex items-center justify-center">
      {item.img ? (
        <img src={item.img} alt="" className="w-full h-full object-contain" loading="lazy" />
      ) : glbUrl ? (
        <GlbThumb src={glbUrl} />
      ) : glb ? (
        <Box size={20} className="text-brand-red/60" />
      ) : (
        <span className="text-[10px] text-slate-400">no img</span>
      )}
      {glb && (
        <span
          className="absolute top-0.5 left-0.5 z-10 inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase bg-brand-red text-white shadow-sm leading-none"
          title={t('design3d.catalog.glbBadgeTitle')}
        >
          3D
        </span>
      )}
    </div>
  );
}

// <model-viewer> web bileşenini tipli bir React bileşeni gibi kullan (intrinsic
// element tipi gerektirmez, JSX transform'undan bağımsız çalışır).
type ModelViewerProps = {
  src?: string;
  'camera-orbit'?: string;
  'auto-rotate'?: boolean;
  'rotation-per-second'?: string;
  'interaction-prompt'?: string;
  'disable-zoom'?: boolean;
  'disable-tap'?: boolean;
  'shadow-intensity'?: string;
  exposure?: string;
  loading?: string;
  style?: CSSProperties & Record<string, string | number>;
  children?: ReactNode;
};
const ModelViewer = 'model-viewer' as unknown as FC<ModelViewerProps>;

/** 48px canlı GLB önizlemesi — model-viewer; yüklenene/başarısız olana kadar küp poster'ı gösterir. */
function GlbThumb({ src }: { src: string }) {
  useEffect(() => { loadModelViewerScript(); }, []);
  return (
    <ModelViewer
      src={src}
      camera-orbit="35deg 72deg auto"
      auto-rotate
      rotation-per-second="24deg"
      interaction-prompt="none"
      disable-zoom
      disable-tap
      shadow-intensity="0.35"
      exposure="1.05"
      loading="lazy"
      style={{ width: '100%', height: '100%', backgroundColor: 'transparent', pointerEvents: 'none', '--poster-color': 'transparent' }}
    >
      <div slot="poster" className="w-full h-full grid place-items-center">
        <Box size={20} className="text-brand-red/60" />
      </div>
    </ModelViewer>
  );
}

function CategoryChip({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  color?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-medium border transition whitespace-nowrap shrink-0',
        active
          ? 'bg-brand-red text-white border-brand-red'
          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
      ].join(' ')}
      style={active && color ? { backgroundColor: color, borderColor: color } : undefined}
    >
      {label}
      {typeof count === 'number' && count > 0 && (
        <span className={['tabular-nums', active ? 'opacity-90' : 'text-slate-400'].join(' ')}>
          {count}
        </span>
      )}
    </button>
  );
}
