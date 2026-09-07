import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import productsData from '../data/products.json';
import { CATEGORIES, type EquipmentCategory } from './equipmentCategories';
import { debouncedSyncUserPrefs, loadUserPrefs } from '../lib/gastroSync';
import {
  resolvedOf,
  matchesSubGroup,
  buildIndex,
  getSubGroupsFor,
  type SubGroupCount,
} from '../lib/categoryTaxonomy';

/* ─── Types ─── */
export interface EquipmentItem {
  id: string;
  name: string;
  desc: string;
  cat: string;
  sub: string;
  fam: string;
  img: string;
  url?: string;  // product page URL
  brand: string;
  l: number;  // length mm
  w: number;  // width mm
  h: string;  // height (can have slash)
  kw: number;
  price: number;
  line: string;
}

// Kategori listesi ürün verisinden bağımsız bir modülde (bkz. equipmentCategories.ts):
// yalnızca kategori adlarına ihtiyaç duyan kabuk bileşenleri (Navbar) products.json'u
// indirmesin diye. Burada geriye uyumluluk için yeniden dışa aktarılır.
export type { EquipmentCategory };
export { CATEGORIES };

// Count products per category — taksonomi çözümlemesine göre (Diamond ham cat +
// CombiSteel/Hendi anahtar kelime sınıflaması + üreticinin yeniden yerleştirmesi).
const allItems = productsData as EquipmentItem[];
const _categoryIndex = buildIndex(allItems);
CATEGORIES.forEach(c => {
  c.count = _categoryIndex.get(c.id)?.count || 0;
});

/* ─── Helper: filter logic ─── */
// cat = taksonomi üst kategorisi, sub = alt-grup id'si (categoryTaxonomy).
function applyFilters(items: EquipmentItem[], cat: string, sub: string, query: string): EquipmentItem[] {
  let filtered = items;
  if (cat) filtered = filtered.filter(i => resolvedOf(i).cat === cat);
  if (cat && sub) filtered = filtered.filter(i => matchesSubGroup(cat, sub, i));
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(i =>
      i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) ||
      i.desc.toLowerCase().includes(q) || i.fam.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q)
    );
  }
  return filtered;
}

/* ─── Store ─── */
interface EquipmentState {
  allItems: EquipmentItem[];
  categories: EquipmentCategory[];
  selectedCategory: string;
  selectedSubrange: string;
  searchQuery: string;
  currentPage: number;
  itemsPerPage: number;
  favorites: string[];       // product IDs
  floorPlanItemId: string | null;  // navigate to this item on floor plan
  setCategory: (cat: string) => void;
  setSubrange: (sub: string) => void;
  setSearch: (q: string) => void;
  setPage: (page: number) => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  getFavoriteItems: () => EquipmentItem[];
  setFloorPlanItem: (id: string | null) => void;
  getItemById: (id: string) => EquipmentItem | undefined;
  getFilteredItems: () => EquipmentItem[];
  getSubranges: () => string[];
  getSubGroups: () => SubGroupCount[];
  getTotalPages: () => number;
  getAllFiltered: () => EquipmentItem[];
}

export const useEquipmentStore = create<EquipmentState>()(
  persist(
    (set, get) => ({
      allItems,
      categories: CATEGORIES,
      selectedCategory: '',
      selectedSubrange: '',
      searchQuery: '',
      currentPage: 1,
      itemsPerPage: 24,
      favorites: [],
      floorPlanItemId: null,

      setCategory: (cat) => set({ selectedCategory: cat, selectedSubrange: '', currentPage: 1 }),
      setSubrange: (sub) => set({ selectedSubrange: sub, currentPage: 1 }),
      setSearch: (q) => set({ searchQuery: q, currentPage: 1 }),
      setPage: (page) => set({ currentPage: page }),

      toggleFavorite: (id) => set((state) => ({
        favorites: state.favorites.includes(id)
          ? state.favorites.filter(f => f !== id)
          : [...state.favorites, id]
      })),

      isFavorite: (id) => get().favorites.includes(id),

      getFavoriteItems: () => {
        const { allItems, favorites } = get();
        return allItems.filter(i => favorites.includes(i.id));
      },

      setFloorPlanItem: (id) => set({ floorPlanItemId: id }),

      getItemById: (id) => get().allItems.find(i => i.id === id),

      getAllFiltered: () => {
        const { allItems, selectedCategory, selectedSubrange, searchQuery } = get();
        return applyFilters(allItems, selectedCategory, selectedSubrange, searchQuery);
      },

      getFilteredItems: () => {
        const { allItems, selectedCategory, selectedSubrange, searchQuery, currentPage, itemsPerPage } = get();
        const filtered = applyFilters(allItems, selectedCategory, selectedSubrange, searchQuery);
        const start = (currentPage - 1) * itemsPerPage;
        return filtered.slice(start, start + itemsPerPage);
      },

      getSubranges: () => {
        const { allItems, selectedCategory } = get();
        if (!selectedCategory) return [];
        const subs = new Set<string>();
        allItems.forEach(item => {
          if (item.cat === selectedCategory && item.sub) subs.add(item.sub);
        });
        return Array.from(subs).sort();
      },

      // Seçili kategorinin temiz/sıralı alt-grupları + ürün sayıları (taksonomi).
      getSubGroups: () => {
        const { allItems, selectedCategory } = get();
        if (!selectedCategory) return [];
        return getSubGroupsFor(selectedCategory, allItems);
      },

      getTotalPages: () => {
        const { allItems, selectedCategory, selectedSubrange, searchQuery, itemsPerPage } = get();
        return Math.ceil(applyFilters(allItems, selectedCategory, selectedSubrange, searchQuery).length / itemsPerPage);
      },
    }),
    {
      name: '2mc-gastro-equipment',
      partialize: (state) => ({ favorites: state.favorites }),
    }
  )
);

// Sync favorites to Supabase
useEquipmentStore.subscribe((state) => {
  debouncedSyncUserPrefs({ favorites: state.favorites });
});

loadUserPrefs().then((remote) => {
  if (!remote || !remote.favorites?.length) return;
  const local = useEquipmentStore.getState().favorites;
  if (local.length === 0) {
    useEquipmentStore.setState({ favorites: remote.favorites });
  }
});
