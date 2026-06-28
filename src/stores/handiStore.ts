import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface HandiProduct {
  id: string;
  ean: string | null;
  brand: string;
  name: string;
  description: string | null;
  short_desc: string | null;
  price: number | null;
  stock: number | null;
  status: string | null;
  image_url: string | null;
  category_name: string | null;
  sub_category: string | null;
  colour: string | null;
  material: string | null;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  net_weight: number | null;
  gross_weight: number | null;
  product_group_id: string | null;
  synced_at: string;
}

interface HandiFilters {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
  sortBy: 'name' | 'price' | 'id' | 'stock';
  sortOrder: 'asc' | 'desc';
}

interface HandiState {
  products: HandiProduct[];
  categories: { name: string; count: number }[];
  filters: HandiFilters;
  currentPage: number;
  itemsPerPage: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;

  fetchProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  setFilter: (key: keyof HandiFilters, value: any) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
}

const defaultFilters: HandiFilters = {
  search: '',
  category: '',
  minPrice: 0,
  maxPrice: 0,
  inStockOnly: false,
  sortBy: 'name',
  sortOrder: 'asc',
};

export const useHandiStore = create<HandiState>((set, get) => ({
  products: [],
  categories: [],
  filters: { ...defaultFilters },
  currentPage: 1,
  itemsPerPage: 24,
  totalCount: 0,
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    if (!supabase) {
      set({ error: 'Supabase yapılandırılmamış', isLoading: false });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const { filters, currentPage, itemsPerPage } = get();
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase.from('handi_products').select('*', { count: 'exact' });

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,id.ilike.%${filters.search}%,category_name.ilike.%${filters.search}%`,
        );
      }
      if (filters.category) query = query.eq('category_name', filters.category);
      if (filters.inStockOnly) query = query.gt('stock', 0);
      if (filters.minPrice > 0) query = query.gte('price', filters.minPrice);
      if (filters.maxPrice > 0) query = query.lte('price', filters.maxPrice);

      query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      set({ products: (data || []) as HandiProduct[], totalCount: count || 0, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchCategories: async () => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from('handi_products').select('category_name');
      if (!data) return;
      const map = new Map<string, number>();
      for (const row of data) {
        const name = (row as any).category_name || 'Diğer';
        map.set(name, (map.get(name) || 0) + 1);
      }
      set({
        categories: Array.from(map.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
      });
    } catch (err: any) {
      console.error('HENDI kategori hatası:', err.message);
    }
  },

  setFilter: (key, value) => {
    set((state) => ({ filters: { ...state.filters, [key]: value }, currentPage: 1 }));
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
