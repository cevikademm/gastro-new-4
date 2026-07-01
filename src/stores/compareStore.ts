import { create } from 'zustand';
import type { EquipmentItem } from './equipmentStore';

export interface CompareItem {
  id: string;
  sku: string;
  name: string;
  brand: string;
  image: string;
  price: number | null;
  promoPrice?: number | null;
  stock: string | number | null;
  width_mm: number | null;
  height_mm: number | null;
  depth_mm: number | null;
  length_mm: number | null;
  weight: number | null;
  kw: string | number | null;
  connection: string | null;
  category: string | null;
  /** Renk/rozet eşlemesi için marka kaynağı. 'diamond'/'combisteel' bilinen; diğerleri serbest. */
  source: 'diamond' | 'combisteel' | (string & {});
  extra?: Record<string, string | number | null>;
}

/** Marka adından kararlı bir `source` anahtarı üretir (ComparePanel renk/rozet eşlemesi). */
export function brandToSource(brand: string): string {
  const b = (brand || '').toLowerCase();
  if (b.includes('diamond')) return 'diamond';
  if (b.includes('combisteel')) return 'combisteel';
  if (b.includes('hendi') || b.includes('handi')) return 'hendi';
  return b.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'other';
}

/**
 * Sepet/katalog `EquipmentItem`'ını karşılaştırma öğesine çevirir.
 * Mağaza, "Tümü" gridi ve ana sayfa kartları ortak bu eşlemeyi kullanır.
 */
export function equipmentToCompareItem(e: EquipmentItem): CompareItem {
  const h = parseFloat(String(e.h ?? '').replace(',', '.'));
  return {
    id: e.id,
    sku: e.id,
    name: e.name,
    brand: e.brand || '',
    image: e.img || e.url || '',
    price: e.price > 0 ? e.price : null,
    promoPrice: null,
    stock: null,
    width_mm: e.w > 0 ? e.w : null,
    height_mm: Number.isFinite(h) && h > 0 ? h : null,
    depth_mm: null,
    length_mm: e.l > 0 ? e.l : null,
    weight: null,
    kw: e.kw > 0 ? e.kw : null,
    connection: null,
    category: e.cat || null,
    source: brandToSource(e.brand),
  };
}

interface CompareState {
  items: CompareItem[];
  showPanel: boolean;
  addItem: (item: CompareItem) => void;
  removeItem: (id: string) => void;
  toggleItem: (item: CompareItem) => void;
  isComparing: (id: string) => boolean;
  clear: () => void;
  setShowPanel: (show: boolean) => void;
}

export const useCompareStore = create<CompareState>((set, get) => ({
  items: [],
  showPanel: false,

  addItem: (item) => set(state => {
    if (state.items.length >= 6) return state;
    if (state.items.find(i => i.id === item.id)) return state;
    return { items: [...state.items, item] };
  }),

  removeItem: (id) => set(state => ({
    items: state.items.filter(i => i.id !== id),
  })),

  toggleItem: (item) => {
    const { items } = get();
    if (items.find(i => i.id === item.id)) {
      get().removeItem(item.id);
    } else {
      get().addItem(item);
    }
  },

  isComparing: (id) => get().items.some(i => i.id === id),

  clear: () => set({ items: [], showPanel: false }),

  setShowPanel: (show) => set({ showPanel: show }),
}));
