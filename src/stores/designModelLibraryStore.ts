/**
 * 3D Tasarım — model kütüphanesi durumu (Zustand).
 *
 * Tek sorumluluk: Supabase'deki `design_models` satırlarını tutmak ve her
 * değişiklikte katalog kaydını (`designModelRegistry`) tazelemek. Böylece
 * kütüphaneden gelen GLB'ler yerleşik katalogla aynı yerleştirme yolunu
 * kullanır.
 *
 * Zustand v5 notu: seçiciler daima STABİL referans döndürür (dizi/nesne
 * türetmesi bileşende `useMemo` ile yapılır) — aksi hâlde sonsuz render.
 */
import { create } from 'zustand';
import {
  deleteDesignModel,
  listDesignModels,
  setDesignModelShared,
  updateDesignModel,
  type DesignModel,
} from '../lib/designModelStore';
import {
  syncLibraryToCatalog,
  unregisterLibraryModel,
} from '../modules/three-d-design/modules/3d-editor/loaders/designModelRegistry';

interface DesignModelLibraryState {
  models: DesignModel[];
  loading: boolean;
  /** Kullanıcıya gösterilecek son hata (null = sorun yok). */
  error: string | null;
  /** Son başarılı yüklemenin zaman damgası (0 = hiç çekilmedi). */
  loadedAt: number;

  /** Supabase'den tazele ve kataloğa kaydet. */
  refresh: () => Promise<void>;
  /** Yeni yüklenen modeli listeye ekle (tam tazeleme beklemeden). */
  addModel: (model: DesignModel) => void;
  /** Modeli sil (Supabase + katalog + yerel liste). */
  remove: (modelId: string) => Promise<boolean>;
  /** Ortak kütüphane bayrağını değiştir (admin). */
  setShared: (modelId: string, isShared: boolean) => Promise<boolean>;
  /** Meta veri güncelle (ad, kategori, ölçüler). */
  patch: (
    modelId: string,
    patch: Partial<Pick<DesignModel, 'name' | 'category' | 'width_mm' | 'depth_mm' | 'height_mm' | 'up_axis'>>,
  ) => Promise<boolean>;
  clearError: () => void;
}

export const useDesignModelLibrary = create<DesignModelLibraryState>((set, get) => ({
  models: [],
  loading: false,
  error: null,
  loadedAt: 0,

  refresh: async () => {
    set({ loading: true, error: null });
    try {
      const models = await listDesignModels();
      syncLibraryToCatalog(models);
      set({ models, loadedAt: Date.now() });
    } catch (e) {
      set({ error: (e as Error)?.message || 'Kütüphane yüklenemedi' });
    } finally {
      set({ loading: false });
    }
  },

  addModel: (model) => {
    syncLibraryToCatalog([model]);
    set({ models: [model, ...get().models.filter((m) => m.id !== model.id)] });
  },

  remove: async (modelId) => {
    const res = await deleteDesignModel(modelId);
    if (!res.ok) {
      set({ error: res.error });
      return false;
    }
    unregisterLibraryModel(modelId);
    set({ models: get().models.filter((m) => m.id !== modelId), error: null });
    return true;
  },

  setShared: async (modelId, isShared) => {
    const res = await setDesignModelShared(modelId, isShared);
    if (!res.ok) {
      set({ error: res.error });
      return false;
    }
    set({ models: get().models.map((m) => (m.id === modelId ? res.data : m)), error: null });
    return true;
  },

  patch: async (modelId, patch) => {
    const res = await updateDesignModel(modelId, patch);
    if (!res.ok) {
      set({ error: res.error });
      return false;
    }
    syncLibraryToCatalog([res.data]);
    set({ models: get().models.map((m) => (m.id === modelId ? res.data : m)), error: null });
    return true;
  },

  clearError: () => set({ error: null }),
}));
