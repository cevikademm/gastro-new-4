import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Sıralanabilir karşılama-sayfası bölümleri.
 * USP, Header, LiveChat ve Footer SABİT — sıraya dahil değil.
 * Yeni bir bölüm eklersen burayı + WelcomePage.tsx içindeki <SectionSlot id="..."> sarmalayıcısını güncelle.
 */
export const SORTABLE_SECTION_IDS = [
  'themenwelten',
  'services',
  'why-2mc',
  'references',
  'logistics',
  'showcase-3d',
  'catalog-banner',
  'value-prop',
  'support-reviews',
  'blog-newsletter',
  'payment',
  'hero',
  'bestsellers',
] as const;

export type WelcomeSectionId = typeof SORTABLE_SECTION_IDS[number];

export const SECTION_LABELS: Record<WelcomeSectionId, { tr: string; desc: string }> = {
  'themenwelten':     { tr: 'Tema Dünyaları',         desc: '4 fotoğraflı tematik kart (Soğutma · Pizza · Kahve · Büfe)' },
  'services':         { tr: 'Hizmetler',              desc: '4-col: 2D/3D Planlama · Yerinde Servis · YouTube · Yardım' },
  'why-2mc':          { tr: 'Neden 2MC?',             desc: 'Büyük istatistikler (15+ yıl · 500+ proje · 10K+ ekipman · 4.9/5)' },
  'references':       { tr: 'Referanslar',            desc: 'Müşteri ve marka logoları' },
  'logistics':        { tr: 'Lojistik',               desc: '48h Avrupa teslim + 10K+ stok (2-col fotoğraflı)' },
  'showcase-3d':      { tr: '3D Vitrin',              desc: 'Canlı 3D model viewer (3 kart)' },
  'catalog-banner':   { tr: 'Katalog Banner',         desc: 'Navy "10K+ ürün" kart + video rehber kartı' },
  'value-prop':       { tr: 'Değer Vaadi (Ihr Partner)', desc: '8 maddelik değer listesi' },
  'support-reviews':  { tr: 'Destek & Yorumlar',      desc: 'Sorunuz mu var? + 4.9/5 Google reviews' },
  'blog-newsletter':  { tr: 'Blog & Bülten',          desc: 'BlogPreview + Newsletter formu' },
  'payment':          { tr: 'Ödeme Yöntemleri',       desc: 'VISA · Mastercard · PayPal · SEPA · Klarna · Leasing' },
  'hero':             { tr: 'Hero (3 kart + banner)', desc: 'CE Sertifikalı / Canlı Vitrin / Akıllı Araçlar + slide banner' },
  'bestsellers':      { tr: 'Bestseller (10 ürün)',   desc: '10 random ürün, otomatik dönen vitrin (2x5 grid)' },
};

const DEFAULT_ORDER: WelcomeSectionId[] = [...SORTABLE_SECTION_IDS];

interface WelcomeOrderState {
  order: WelcomeSectionId[];
  setOrder: (order: WelcomeSectionId[]) => void;
  moveSection: (id: WelcomeSectionId, toIndex: number) => void;
  reset: () => void;
}

export const useWelcomeOrderStore = create<WelcomeOrderState>()(
  persist(
    (set) => ({
      order: DEFAULT_ORDER,
      setOrder: (order) => {
        // Eksik ID varsa default sıraya göre tamamla; bilinmeyenleri at
        const filtered = order.filter((id): id is WelcomeSectionId => SORTABLE_SECTION_IDS.includes(id as WelcomeSectionId));
        const missing = SORTABLE_SECTION_IDS.filter((id) => !filtered.includes(id));
        set({ order: [...filtered, ...missing] });
      },
      moveSection: (id, toIndex) => set((state) => {
        const cur = [...state.order];
        const from = cur.indexOf(id);
        if (from < 0 || toIndex < 0 || toIndex >= cur.length) return state;
        cur.splice(from, 1);
        cur.splice(toIndex, 0, id);
        return { order: cur };
      }),
      reset: () => set({ order: DEFAULT_ORDER }),
    }),
    {
      name: 'welcome-order-v1',
      // Migration: yeni bölümler sona eklensin, kaldırılanlar düşsün
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const filtered = state.order.filter((id) => SORTABLE_SECTION_IDS.includes(id));
        const missing = SORTABLE_SECTION_IDS.filter((id) => !filtered.includes(id));
        state.order = [...filtered, ...missing];
      },
    }
  )
);
