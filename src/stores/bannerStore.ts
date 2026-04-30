import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BannerSlide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  /** CSS background — used when no image is set. Can be a gradient or solid color. */
  gradient: string;
  /** Optional image URL or data URL. When set, replaces the gradient background. */
  image?: string;
  enabled: boolean;
}

interface BannerState {
  slides: BannerSlide[];
  intervalMs: number;
  setSlides: (slides: BannerSlide[]) => void;
  updateSlide: (id: string, patch: Partial<BannerSlide>) => void;
  addSlide: () => void;
  removeSlide: (id: string) => void;
  moveSlide: (id: string, dir: -1 | 1) => void;
  setIntervalMs: (ms: number) => void;
  resetToDefaults: () => void;
}

// Açık tema (beyaz arka plan) için light gradient'lar
const LIGHT_EQUIPMENT = 'linear-gradient(120deg, #e0f2fe 0%, #ffffff 55%, #dbeafe 100%)';
const LIGHT_DESIGN = 'linear-gradient(120deg, #fef3c7 0%, #ffffff 55%, #fde68a 100%)';
const LIGHT_DELIVERY = 'linear-gradient(120deg, #d1fae5 0%, #ffffff 55%, #a7f3d0 100%)';
const LIGHT_SUPPORT = 'linear-gradient(120deg, #ede9fe 0%, #ffffff 55%, #ddd6fe 100%)';

// Unsplash CDN — sinematik gastro/endüstriyel mutfak görselleri.
// Imgix params: koyu ton + yüksek kontrast + hafif vinyet = sinematik his.
const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1920&h=600&fit=crop&q=85&auto=format&sat=-15&con=15&exp=-10`;

const DEFAULT_SLIDES: BannerSlide[] = [
  {
    id: 'steel',
    eyebrow: '01 / STEEL',
    title: 'Paslanmaz Çelik Ekipman Hatları',
    subtitle: 'AISI 304 — endüstriyel dayanıklılık, HACCP uyumlu yüzeyler',
    gradient: LIGHT_EQUIPMENT,
    image: UNSPLASH('1547592180-85f173990554'),
    enabled: true,
  },
  {
    id: 'cooking',
    eyebrow: '02 / COOKING',
    title: 'Combi Fırın & Pişirme Hattı',
    subtitle: 'Rational · Combisteel · Hobart — yüksek kapasiteli pişirme çözümleri',
    gradient: LIGHT_DESIGN,
    image: UNSPLASH('1556910103-1c02745aae4d'),
    enabled: true,
  },
  {
    id: 'prep',
    eyebrow: '03 / PREP',
    title: 'Hazırlık İstasyonları',
    subtitle: 'Profesyonel mise en place — çelik tezgâh, blender, mikser, dilimleyici',
    gradient: LIGHT_DELIVERY,
    image: UNSPLASH('1504674900247-0877df9cc836'),
    enabled: true,
  },
  {
    id: 'refrigeration',
    eyebrow: '04 / REFRIGERATION',
    title: 'Soğuk Zincir & Depolama',
    subtitle: 'Blast chiller · walk-in · buzdolabı — gıda güvenliği garantisi',
    gradient: LIGHT_SUPPORT,
    image: UNSPLASH('1414235077428-338989a2e8c0'),
    enabled: true,
  },
  {
    id: 'pizza_bakery',
    eyebrow: '05 / PIZZA & BAKERY',
    title: 'Pizza Fırınları & Pastane',
    subtitle: 'Taş tabanlı fırınlar · rotasyon · konveyör — yüksek hacim için',
    gradient: LIGHT_DESIGN,
    image: UNSPLASH('1513104890138-7c749659a591'),
    enabled: true,
  },
];

export const useBannerStore = create<BannerState>()(
  persist(
    (set, get) => ({
      slides: DEFAULT_SLIDES,
      intervalMs: 10000,
      setSlides: (slides) => set({ slides }),
      updateSlide: (id, patch) =>
        set({ slides: get().slides.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),
      addSlide: () =>
        set({
          slides: [
            ...get().slides,
            {
              id: `slide-${Date.now()}`,
              eyebrow: 'NEW / SLIDE',
              title: 'Yeni Banner',
              subtitle: 'Açıklama metni',
              gradient: 'linear-gradient(120deg, #64748b 0%, #1e293b 55%, #020817 100%)',
              enabled: true,
            },
          ],
        }),
      removeSlide: (id) => set({ slides: get().slides.filter((s) => s.id !== id) }),
      moveSlide: (id, dir) => {
        const slides = [...get().slides];
        const idx = slides.findIndex((s) => s.id === id);
        const target = idx + dir;
        if (idx < 0 || target < 0 || target >= slides.length) return;
        [slides[idx], slides[target]] = [slides[target], slides[idx]];
        set({ slides });
      },
      setIntervalMs: (ms) => set({ intervalMs: ms }),
      resetToDefaults: () => set({ slides: DEFAULT_SLIDES, intervalMs: 10000 }),
    }),
    {
      name: '2mc-banner-slides',
      version: 11,
      migrate: (_persisted, _ver) => ({ slides: DEFAULT_SLIDES, intervalMs: 10000 } as any),
    }
  )
);
