import { create } from 'zustand';
import { supabase } from '../lib/supabase';

/**
 * Birleşik ürün akışı — `all_products` SQL VIEW'ını okur (diamond + combisteel +
 * handi tablolarının normalize edilmiş UNION'ı). "Ürünler > Tümü" sekmesinde
 * tüm markalar tek listede gösterilir.
 */
export interface AllProduct {
  id: string;
  source: 'diamond' | 'combisteel' | 'handi' | string;
  brand: string;
  name: string;
  image: string | null;
  price: number | null;
  category: string | null;
}

interface AllFilters {
  search: string;
  source: string; // '' = hepsi
}

interface AllState {
  products: AllProduct[];
  filters: AllFilters;
  currentPage: number;
  itemsPerPage: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  setFilter: (key: keyof AllFilters, value: any) => void;
  setPage: (page: number) => void;
}

export const useAllProductsStore = create<AllState>((set, get) => ({
  products: [],
  filters: { search: '', source: '' },
  currentPage: 1,
  itemsPerPage: 30,
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

      let query = supabase.from('all_products').select('*', { count: 'exact' });
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`);
      }
      if (filters.source) query = query.eq('source', filters.source);
      query = query.order('name', { ascending: true }).range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      set({ products: (data || []) as AllProduct[], totalCount: count || 0, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  setFilter: (key, value) => {
    set((s) => ({ filters: { ...s.filters, [key]: value }, currentPage: 1 }));
    get().fetchProducts();
  },

  setPage: (page) => {
    set({ currentPage: page });
    get().fetchProducts();
  },
}));
