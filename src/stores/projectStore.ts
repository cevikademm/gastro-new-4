import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { debouncedSyncProjects, loadProjects } from '../lib/gastroSync';

export interface ProductItem {
  id: string;
  name: string;
  code: string;
  category: 'cooking' | 'cold' | 'cleaning' | 'neutral' | 'other';
  icon: string;
  imageData?: string; // base64 image
  dimensions: { width: number; height: number; depth: number }; // cm
  kw: number;
  powerType: 'electric' | 'gas' | 'none';
  price: number;
  description: string;
  brand: string;
  series: string;
  features: string[];
}

export interface Project {
  id: string;
  name: string;
  type: 'commercial' | 'hospitality' | 'boutique' | 'industrial';
  area: string;
  lead: string;
  status: 'drafting' | 'quoted' | 'complete' | 'inProgress';
  progress: number;
  clientName: string;
  startDate: string;
  deadline: string;
  notes: string;
  createdAt: string;
  products: ProductItem[];
  roomWidthCm: number;
  roomHeightCm: number;
}

export interface ActivityItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  active: boolean;
}

interface ProjectState {
  projects: Project[];
  selectedProject: Project | null;
  activities: ActivityItem[];
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'products'>) => string;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  selectProject: (id: string) => void;
  clearSelection: () => void;
  addProductToProject: (projectId: string, product: Omit<ProductItem, 'id'>) => void;
  updateProduct: (projectId: string, productId: string, data: Partial<ProductItem>) => void;
  removeProductFromProject: (projectId: string, productId: string) => void;
}

const sampleProducts: ProductItem[] = [
  {
    id: 'p1',
    name: 'Konveksiyonlu Fırın Pro',
    code: 'VF-OVN-601-EL',
    category: 'cooking',
    icon: 'microwave',
    dimensions: { width: 85, height: 78, depth: 105 },
    kw: 12,
    powerType: 'electric',
    price: 7800,
    description: '10 Tepsi Kapasiteli, Buhar Enjeksiyonlu',
    brand: '2MC',
    series: '60er',
    features: ['Buhar enjeksiyonu', 'Dokunmatik ekran', 'Otomatik programlar'],
  },
  {
    id: 'p2',
    name: 'Gazlı Ocak 4\'lü',
    code: 'VF-RNG-704-GS',
    category: 'cooking',
    icon: 'flame',
    dimensions: { width: 70, height: 70, depth: 85 },
    kw: 22.5,
    powerType: 'gas',
    price: 5200,
    description: '4 × Yüksek Performans Brülör',
    brand: '2MC',
    series: '70er',
    features: ['Paslanmaz çelik gövde', 'Termostatik kontrol'],
  },
  {
    id: 'p3',
    name: 'Bulaşık Makinesi Titan',
    code: 'VF-DW-900-H',
    category: 'cleaning',
    icon: 'droplets',
    dimensions: { width: 63, height: 75, depth: 147 },
    kw: 9.5,
    powerType: 'electric',
    price: 8900,
    description: '60 Sepet/Saat Verim',
    brand: '2MC',
    series: '80er',
    features: ['Yüksek verim', 'Düşük su tüketimi'],
  },
];

const initialProjects: Project[] = [
  {
    id: '1',
    name: 'The Grand Bistro - L3',
    type: 'commercial',
    area: '418',
    lead: 'Marcus V.',
    status: 'drafting',
    progress: 65,
    clientName: 'Grand Bistro GmbH',
    startDate: '2024-03-15',
    deadline: '2024-07-30',
    notes: 'Premium mutfak tasarımı, 3 aşamalı kurulum planı',
    createdAt: '2024-03-15',
    products: [...sampleProducts],
    roomWidthCm: 1000,
    roomHeightCm: 600,
  },
  {
    id: '2',
    name: 'Riverside Hotel Kitchen',
    type: 'hospitality',
    area: '762',
    lead: 'Elena R.',
    status: 'quoted',
    progress: 90,
    clientName: 'Riverside Hotels AG',
    startDate: '2024-01-10',
    deadline: '2024-06-15',
    notes: 'Otel mutfağı yenileme projesi, 200+ kişilik kapasite',
    createdAt: '2024-01-10',
    products: [],
    roomWidthCm: 1200,
    roomHeightCm: 800,
  },
  {
    id: '3',
    name: 'Skyline Rooftop Bar',
    type: 'boutique',
    area: '111',
    lead: 'Sarah L.',
    status: 'complete',
    progress: 100,
    clientName: 'Skyline Hospitality Ltd',
    startDate: '2023-11-01',
    deadline: '2024-04-01',
    notes: 'Rooftop bar mutfak ve bar alanı tasarımı',
    createdAt: '2023-11-01',
    products: [],
    roomWidthCm: 800,
    roomHeightCm: 500,
  },
];

const initialActivities: ActivityItem[] = [
  { id: '1', title: 'bomExported', desc: 'The Grand Bistro - L3 | Marcus V.', time: '2h', active: true },
  { id: '2', title: 'revisionSaved', desc: 'v2.4 - Riverside Hotel Kitchen', time: '5h', active: false },
  { id: '3', title: 'equipmentAdded', desc: 'Konveksiyonlu Fırın Pro → Grand Bistro', time: 'dün', active: true },
];

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: initialProjects,
      selectedProject: null,
      activities: initialActivities,

      addProject: (project) => {
        const id = Date.now().toString();
        const newProject: Project = {
          ...project,
          id,
          createdAt: new Date().toISOString().split('T')[0],
          products: [],
        };
        set((state) => ({
          projects: [newProject, ...state.projects],
          activities: [
            { id: Date.now().toString(), title: 'Yeni proje oluşturuldu', desc: newProject.name, time: 'şimdi', active: true },
            ...state.activities,
          ],
        }));
        return id;
      },

      updateProject: (id, data) => {
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
          selectedProject: state.selectedProject?.id === id ? { ...state.selectedProject, ...data } : state.selectedProject,
        }));
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          selectedProject: state.selectedProject?.id === id ? null : state.selectedProject,
        }));
      },

      selectProject: (id) => {
        const project = get().projects.find((p) => p.id === id) || null;
        set({ selectedProject: project });
      },

      clearSelection: () => set({ selectedProject: null }),

      addProductToProject: (projectId, product) => {
        const newProduct: ProductItem = {
          ...product,
          id: 'prod_' + Date.now().toString() + Math.random().toString(36).slice(2, 6),
        };
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, products: [...p.products, newProduct] } : p
          ),
          selectedProject: state.selectedProject?.id === projectId
            ? { ...state.selectedProject, products: [...(state.selectedProject?.products || []), newProduct] }
            : state.selectedProject,
          activities: [
            { id: Date.now().toString(), title: 'Ürün eklendi', desc: `${newProduct.name} → ${state.projects.find(p => p.id === projectId)?.name || ''}`, time: 'şimdi', active: true },
            ...state.activities,
          ],
        }));
      },

      updateProduct: (projectId, productId, data) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, products: p.products.map((prod) => prod.id === productId ? { ...prod, ...data } : prod) }
              : p
          ),
          selectedProject: state.selectedProject?.id === projectId
            ? { ...state.selectedProject, products: state.selectedProject.products.map((prod) => prod.id === productId ? { ...prod, ...data } : prod) }
            : state.selectedProject,
        }));
      },

      removeProductFromProject: (projectId, productId) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, products: p.products.filter((prod) => prod.id !== productId) } : p
          ),
          selectedProject: state.selectedProject?.id === projectId
            ? { ...state.selectedProject, products: state.selectedProject.products.filter((prod) => prod.id !== productId) }
            : state.selectedProject,
        }));
      },
    }),
    {
      name: '2mc-gastro-projects',
      version: 1,
      partialize: (state) => ({
        projects: state.projects,
        activities: state.activities,
      }),
    }
  )
);

// ─── Supabase Sync ───
// Auto-sync on every state change
useProjectStore.subscribe((state) => {
  debouncedSyncProjects(state.projects, state.activities);
});

// Load from Supabase on startup (merge with localStorage).
// Remote = source of truth: mevcut projeleri remote ile TAZELE (görsel/ölçü/fiyat
// güncellemeleri ve cihazlar arası değişiklikler yansısın), yerel-özel projeleri
// koru, remote-özel projeleri ekle. (Eski davranış yalnızca yeni proje ekliyordu →
// güncellenen proje verisi cihaza asla ulaşmıyordu.)
loadProjects().then((remote) => {
  if (!remote) return;
  const local = useProjectStore.getState();
  const remoteById = new Map(remote.projects.map((p) => [p.id, p]));
  const localIds = new Set(local.projects.map((p) => p.id));
  const refreshed = local.projects.map((p) => remoteById.get(p.id) || p);
  const remoteOnly = remote.projects.filter((p) => !localIds.has(p.id));
  if (remoteOnly.length > 0 || refreshed.some((p, i) => p !== local.projects[i])) {
    useProjectStore.setState({ projects: [...refreshed, ...remoteOnly] });
  }
});
