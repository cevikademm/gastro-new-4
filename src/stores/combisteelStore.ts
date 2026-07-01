import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface CombisteelProduct {
  id: string;
  sku: string;
  title: string;
  description: string;
  long_description: string | null;
  brand: string;
  ean: string | null;
  dimensions: string | null;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  depth_mm: number | null;
  gross_weight: number | null;
  net_weight: number | null;
  price: number | null;
  stock: number | null;
  product_type: string | null;
  image_url: string | null;
  extra_images: string[];
  category_id: string | null;
  category_name: string | null;
  tech_specs: { group: string; name: string; value: string; unit?: string }[];
  synced_at: string;
}

interface CombisteelFilters {
  search: string;
  category: string;
  brand: string;
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
  sortBy: 'title' | 'price' | 'sku' | 'stock';
  sortOrder: 'asc' | 'desc';
}

interface CombisteelState {
  products: CombisteelProduct[];
  categories: { name: string; count: number }[];
  brands: { name: string; count: number }[];
  filters: CombisteelFilters;
  currentPage: number;
  itemsPerPage: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;

  fetchProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchBrands: () => Promise<void>;
  setFilter: (key: keyof CombisteelFilters, value: any) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
}

const defaultFilters: CombisteelFilters = {
  search: '',
  category: '',
  brand: '',
  minPrice: 0,
  maxPrice: 0,
  inStockOnly: false,
  sortBy: 'title',
  sortOrder: 'asc',
};

export const useCombisteelStore = create<CombisteelState>((set, get) => ({
  products: [],
  categories: [],
  brands: [],
  filters: { ...defaultFilters },
  currentPage: 1,
  itemsPerPage: 24,
  totalCount: 0,
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    if (!supabase) return;
    set({ isLoading: true, error: null });
    try {
      const { filters, currentPage, itemsPerPage } = get();
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('combisteel_products')
        .select('*', { count: 'exact' });

      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        );
      } else {
        // Yalnızca gezinirken görselsiz ürünleri gizle; aramada hepsi çıksın (migration 029).
        query = query.eq('has_image', true);
      }
      if (filters.category) {
        query = query.eq('category_name', filters.category);
      }
      if (filters.brand) {
        query = query.eq('brand', filters.brand);
      }
      if (filters.inStockOnly) {
        query = query.gt('stock', 0);
      }
      if (filters.minPrice > 0) {
        query = query.gte('price', filters.minPrice);
      }
      if (filters.maxPrice > 0) {
        query = query.lte('price', filters.maxPrice);
      }

      // Önce €1500–€5000 bandı (sort_rank=0), küçük/ucuz ürünler sona (migration 028).
      query = query
        .order('sort_rank', { ascending: true })
        .order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      set({
        products: (data || []) as CombisteelProduct[],
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
      const { data } = await supabase
        .from('combisteel_products')
        .select('category_name');
      if (!data) return;
      const map = new Map<string, number>();
      for (const row of data) {
        const name = row.category_name || 'Diğer';
        map.set(name, (map.get(name) || 0) + 1);
      }
      const categories = Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      set({ categories });
    } catch (err: any) {
      console.error('Kategori hatası:', err.message);
    }
  },

  fetchBrands: async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('combisteel_products')
        .select('brand');
      if (!data) return;
      const map = new Map<string, number>();
      for (const row of data) {
        const name = row.brand || '';
        if (!name) continue;
        map.set(name, (map.get(name) || 0) + 1);
      }
      const brands = Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      set({ brands });
    } catch (err: any) {
      console.error('Marka hatası:', err.message);
    }
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
      currentPage: 1,
    }));
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
}));
