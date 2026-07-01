import { create } from 'zustand';
import type { EquipmentItem } from './equipmentStore';
import { resolveSourceAndId, type ProductSource } from '../lib/productDetailVM';

/** Ürün detay penceresi — kaynak tablo + id ile açılır (prop-drilling yok). */
export type { ProductSource };

interface Current {
  source: ProductSource;
  id: string;
  /** Supabase'te satır bulunamazsa kullanılacak katalog ürünü (kart hep dolu kalsın). */
  fallback?: EquipmentItem;
}

interface ProductDetailState {
  current: Current | null;
  /** (source, id) ile aç — opsiyonel fallback ürünü taşı. Geriye uyumlu. */
  open: (source: ProductSource, id: string, fallback?: EquipmentItem) => void;
  /** Katalog ürününden aç — kaynağı/id'yi otomatik çözer (mağaza kartları). */
  openFromItem: (item: EquipmentItem) => void;
  close: () => void;
}

export const useProductDetailStore = create<ProductDetailState>((set) => ({
  current: null,
  open: (source, id, fallback) => set({ current: { source, id, fallback } }),
  openFromItem: (item) => {
    const { source, bareId } = resolveSourceAndId(item);
    set({ current: { source, id: bareId, fallback: item } });
  },
  close: () => set({ current: null }),
}));
