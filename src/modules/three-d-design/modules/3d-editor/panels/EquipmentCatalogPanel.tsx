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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Star, X, ChevronRight, ChevronLeft, Box, Upload, Loader2 } from 'lucide-react';
import {
  CATEGORIES,
  useEquipmentStore,
  type EquipmentItem,
} from '../../../../../stores/equipmentStore';
import { parseHeightMm } from '../loaders/productMesh';
import { EQUIPMENT_CATALOG, isCustomGlb } from '../loaders/equipmentCatalog';
import { findGlbForProductId, listSystemGlbEquipment } from '../loaders/glbManifest';
import { importGlbFile, GLB_ACCEPT_ATTR } from '../loaders/customGlb';
import { useMeshStore } from '../../../../../stores/meshStore';
import {
  getProduct3DModelsByKeys,
  productKeyFor,
} from '../../../../../lib/meshyClient';

interface EquipmentCatalogPanelProps {
  /** Currently armed product id (Editor3D owns this state). */
  armedProductId: string | null;
  onArm: (item: EquipmentItem | null) => void;
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
  open,
  onToggleOpen,
  side = 'right',
}: EquipmentCatalogPanelProps) {
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
        desc: 'Yüklenen 3D model',
        cat: '',
        sub: '',
        fam: '',
        img: '',
        brand: 'Yüklenen',
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
      alert(`GLB yüklenemedi: ${err instanceof Error ? err.message : String(err)}`);
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
        name: m.label,
        desc: 'Sistem 3D Kütüphanesi',
        cat: m.category as string,
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
  }, []);

  // Birleşik liste — yüklenenler ve sentetik GLB item'ları en üstte
  const allItems = useMemo<EquipmentItem[]>(
    () => [...uploaded, ...systemGlbItems, ...productItems],
    [uploaded, systemGlbItems, productItems],
  );

  // ── Supabase'deki MeshAI 3D modellerini bir kez bulk fetch et ───────
  // Sayfada 1000+ ürün olabilir; product_key olarak image URL'leri kullanıyoruz.
  // 200'lük chunk'larda çekip store'a yazıyoruz.
  useEffect(() => {
    if (meshFetched || allItems.length === 0) return;
    let cancelled = false;
    (async () => {
      const keys = allItems
        .map((i) => productKeyFor(i.img, i.id))
        .filter(Boolean);
      if (keys.length === 0) return;
      const chunks: string[][] = [];
      for (let i = 0; i < keys.length; i += 200) chunks.push(keys.slice(i, i + 200));
      try {
        const results = await Promise.all(chunks.map((c) => getProduct3DModelsByKeys(c).catch(() => ({}))));
        if (cancelled) return;
        const merged = results.flatMap((m) => Object.values(m));
        if (merged.length > 0) setMeshRows(merged);
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
    if (category) items = items.filter((i) => i.cat === category);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q) ||
          (i.desc?.toLowerCase().includes(q) ?? false),
      );
    }
    return items.slice(0, RESULT_LIMIT);
  }, [allItems, favorites, favOnly, glbOnly, meshRows, category, search]);

  return (
    <aside
      className={[
        'absolute top-16 bottom-3 bg-white/95 backdrop-blur border border-slate-200 rounded-lg shadow-sm transition-all flex flex-col overflow-hidden z-20',
        side === 'left' ? 'left-3' : 'right-3',
        open ? 'w-[74vw] max-w-[17rem] sm:w-80 sm:max-w-none' : 'w-9',
      ].join(' ')}
    >
      <header className="flex items-center gap-1 px-3 h-10 border-b border-slate-200">
        {open && (
          <h3 className="text-sm font-bold text-slate-800">Ekipman Kataloğu</h3>
        )}
        <div className="ml-auto flex items-center gap-1">
          {open && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Kendi 3D modelini yükle (.glb / .gltf)"
              className="inline-flex items-center gap-1 px-2 h-7 rounded border border-blue-200 bg-blue-50 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              GLB Yükle
            </button>
          )}
          <button
            type="button"
            onClick={onToggleOpen}
            className="p-1 text-slate-500 hover:text-slate-800"
            aria-label={open ? 'Daralt' : 'Genişlet'}
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
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ara… (örn. fritöz)"
                className="w-full pl-7 pr-2 h-8 text-xs border border-slate-200 rounded bg-white outline-none focus:border-blue-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={11} />
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-1.5 mt-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFavOnly((v) => !v)}
                  className={[
                    'inline-flex items-center gap-1 text-[11px] px-2 h-6 rounded border transition-colors',
                    favOnly
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <Star size={10} fill={favOnly ? 'currentColor' : 'none'} />
                  Favori {favorites.length > 0 && `(${favorites.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setGlbOnly((v) => !v)}
                  title="Sadece sistemde GLB / 3D modeli olan ürünleri göster"
                  className={[
                    'inline-flex items-center gap-1 text-[11px] px-2 h-6 rounded border transition-colors',
                    glbOnly
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <Box size={10} />
                  3D {glbCount > 0 && <span className="tabular-nums">({glbCount})</span>}
                </button>
              </div>
              <span className="text-[10px] text-slate-400 tabular-nums">
                {filtered.length}{filtered.length === RESULT_LIMIT ? '+' : ''}
              </span>
            </div>
          </div>

          {/* ── Category chips ───────────────────────────────────────── */}
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              <CategoryChip
                label="Tümü"
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
          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="text-xs text-slate-400 px-2 py-4 text-center">
                Eşleşen ürün bulunamadı.
              </p>
            ) : (
              <ul className="space-y-1">
                {filtered.map((item) => {
                  const armed = item.id === armedProductId;
                  const fav = favorites.includes(item.id);
                  const glb = hasGlb(item, meshRows);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => onArm(armed ? null : item)}
                        className={[
                          'w-full flex gap-2 p-1.5 rounded text-left transition-colors',
                          armed
                            ? 'bg-blue-50 border border-blue-300'
                            : 'hover:bg-slate-50 border border-transparent',
                        ].join(' ')}
                      >
                        <div className="relative flex-shrink-0 w-12 h-12 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                          {item.img ? (
                            <img
                              src={item.img}
                              alt=""
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          ) : glb ? (
                            <Box size={20} className="text-emerald-500/70" />
                          ) : (
                            <span className="text-[9px] text-slate-400">no img</span>
                          )}
                          {glb && (
                            <span
                              className="absolute top-0.5 left-0.5 px-1 py-0 text-[8px] font-black uppercase rounded bg-emerald-500 text-white shadow-sm leading-tight"
                              title="Sistemde 3D modeli (GLB) var"
                            >
                              3D
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-slate-800 truncate">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {item.brand} · {item.id}
                          </div>
                          <div className="text-[10px] text-slate-500 tabular-nums">
                            {item.l}×{item.w}×{parseHeightMm(item.h)} mm
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.id);
                          }}
                          className={[
                            'p-1 rounded',
                            fav ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400',
                          ].join(' ')}
                          aria-label={fav ? 'Favoriden çıkar' : 'Favoriye ekle'}
                        >
                          <Star size={12} fill={fav ? 'currentColor' : 'none'} />
                        </button>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

// ── UI atoms ───────────────────────────────────────────────────────────────

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
        'inline-flex items-center gap-1 px-2 h-6 rounded text-[10px] border transition-colors',
        active
          ? 'bg-slate-800 text-white border-slate-800'
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
