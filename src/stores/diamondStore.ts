import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// Diamond ürün tipi
export interface DiamondProduct {
  id: string;
  name: string;
  description_tech_spec: string;
  popup_info: string;

  // Fiyat
  currency: string;
  price_catalog: number | null;
  price_display: number | null;
  price_promo: number | null;
  page_catalog_number: string;
  page_promo_number: string;

  // Stok
  stock: string;
  restock_info: string;
  supplier_delivery_delay: string | null;
  days_to_restock_avg: number | null;

  // Boyut
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  volume_m3: number | null;
  weight: number | null;
  weight_unit: string;

  // Teknik
  electric_power_kw: string | null;
  electric_connection: string;
  electric_connection_2: string;
  vapor: string | null;
  kcal_power: number | null;
  horse_power: number | null;

  // Kategori
  product_category_id: string;
  product_range_id: string;
  product_subrange_id: string;
  product_family_id: string;
  product_family_name: string;
  product_subfamily_id: string;
  product_line_id: string;

  // Medya
  image_big: string;
  image_thumb: string;
  image_gallery: string;
  image_full: string;

  // Durum
  is_new: boolean;
  is_old: boolean;
  is_good_deal: boolean;
  product_type: string;
  has_accessories: boolean;
  replacement_product_id: string | null;

  // Meta
  synced_at: string;
  created_at: string;
}

interface DiamondFilters {
  search: string;
  category: string;
  family: string;
  promoOnly: boolean;
  newOnly: boolean;
  inStockOnly: boolean;
  minPrice: number;
  maxPrice: number;
  minKw: number;
  maxKw: number;
  sortBy: 'name' | 'price_catalog' | 'price_promo' | 'stock';
  sortOrder: 'asc' | 'desc';
}

interface DiamondState {
  products: DiamondProduct[];
  categories: { product_category_id: string; product_family_name: string; count: number }[];
  filters: DiamondFilters;
  currentPage: number;
  itemsPerPage: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  selectedProduct: DiamondProduct | null;

  // Actions
  fetchProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  setFilter: (key: keyof DiamondFilters, value: any) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  selectProduct: (id: string) => void;
  clearSelection: () => void;
}

const defaultFilters: DiamondFilters = {
  search: '',
  category: '',
  family: '',
  promoOnly: false,
  newOnly: false,
  inStockOnly: false,
  minPrice: 0,
  maxPrice: 0,
  minKw: 0,
  maxKw: 0,
  sortBy: 'name',
  sortOrder: 'asc',
};

export const useDiamondStore = create<DiamondState>((set, get) => ({
  products: [],
  categories: [],
  filters: { ...defaultFilters },
  currentPage: 1,
  itemsPerPage: 24,
  totalCount: 0,
  isLoading: false,
  error: null,
  selectedProduct: null,

  fetchProducts: async () => {
    if (!supabase) return;
    set({ isLoading: true, error: null });

    try {
      const { filters, currentPage, itemsPerPage } = get();
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('diamond_products')
        .select('*', { count: 'exact' })
        .eq('is_old', false);

      // Filtreler
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,id.ilike.%${filters.search}%,description_tech_spec.ilike.%${filters.search}%`
        );
      } else {
        // Yalnızca gezinirken görselsiz ürünleri gizle; aramada hepsi çıksın (migration 029).
        query = query.eq('has_image', true);
      }

      if (filters.category) {
        query = query.eq('product_category_id', filters.category);
      }

      if (filters.family) {
        query = query.eq('product_family_name', filters.family);
      }

      if (filters.promoOnly) {
        query = query.not('price_promo', 'is', null).gt('price_promo', 0);
      }

      if (filters.newOnly) {
        query = query.eq('is_new', true);
      }

      if (filters.inStockOnly) {
        query = query.neq('stock', '').neq('stock', '0');
      }

      if (filters.minPrice > 0) {
        query = query.gte('price_catalog', filters.minPrice);
      }

      if (filters.maxPrice > 0) {
        query = query.lte('price_catalog', filters.maxPrice);
      }

      if (filters.minKw > 0) {
        query = query.gte('electric_power_kw', filters.minKw);
      }

      if (filters.maxKw > 0) {
        query = query.lte('electric_power_kw', filters.maxKw);
      }

      // Sıralama — önce €1500–€5000 bandı (sort_rank=0), küçük/ucuz ürünler sona
      // (migration 028). Kullanıcının seçtiği sıralama bant içinde uygulanır.
      query = query
        .order('sort_rank', { ascending: true })
        .order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });

      // Sayfalama
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      set({
        products: (data || []) as DiamondProduct[],
        totalCount: count || 0,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchCategories: async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('diamond_products')
        .select('product_category_id, product_family_name')
        .eq('is_old', false);

      if (error) throw error;

      // Grupla ve say
      const map = new Map<string, { product_category_id: string; product_family_name: string; count: number }>();
      for (const row of data || []) {
        const key = `${row.product_category_id}_${row.product_family_name}`;
        const existing = map.get(key);
        if (existing) {
          existing.count++;
        } else {
          map.set(key, {
            product_category_id: row.product_category_id,
            product_family_name: row.product_family_name || '',
            count: 1,
          });
        }
      }

      set({ categories: Array.from(map.values()).sort((a, b) => a.product_family_name.localeCompare(b.product_family_name)) });
    } catch (err: any) {
      console.error('Kategori çekme hatası:', err.message);
    }
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
      currentPage: 1,
    }));
    // Filtre değişince ürünleri yeniden çek
    get().fetchProducts();
  },

  resetFilters: () => {
    set({ filters: { ...defaultFilters }, currentPage: 1 });
    get().fetchProducts();
  },

  setPage: (page) => {
    set({ currentPage: page });
    get().fetchProducts();
  },

  selectProduct: (id) => {
    const product = get().products.find((p) => p.id === id) || null;
    set({ selectedProduct: product });
  },

  clearSelection: () => set({ selectedProduct: null }),
}));
