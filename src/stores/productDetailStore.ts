import { create } from 'zustand';

/** Ürün detay penceresi — kaynak tablo + id ile açılır (prop-drilling yok). */
export type ProductSource = 'diamond' | 'combisteel' | 'handi';

interface ProductDetailState {
  current: { source: ProductSource; id: string } | null;
  open: (source: ProductSource, id: string) => void;
  close: () => void;
}

export const useProductDetailStore = create<ProductDetailState>((set) => ({
  current: null,
  open: (source, id) => set({ current: { source, id } }),
  close: () => set({ current: null }),
}));
