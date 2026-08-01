# 2MC Gastro — proje bağlamı

Endüstriyel mutfak ekipmanları için B2B web uygulaması. Bu dosya hem insan
geliştiriciler hem de otomatik düzeltme ajanı (`docs/fix-agent.md`) içindir.

## Teknoloji
- React 19 + TypeScript + Vite · React Router v7 (SPA)
- Tailwind CSS v4 (oklch renkler — klasik html2canvas patlar, **html2canvas-pro** kullanılır)
- Zustand v5 · Supabase (Postgres + Auth + Storage + Edge Functions, RLS aktif)
- i18next — 15 dil (tr en de fr nl it es pt pl cs ro el sv da hu), `src/i18n/*.json`
- Three.js (imperatif 3B editör) + Konva (2B plan) — `src/modules/three-d-design`
- Deploy: Vercel · prod `www.2mcgastro.de`

## Komutlar
```
npm run dev      # geliştirme sunucusu (port 3000)
npm run lint     # tsc --noEmit  ← tip kapısı
npm run build    # sitemap üret + vite build
npx vitest run   # testler (NOT: 5 dosya/9 test şu an kırık — miras)
```

## Klasör düzeni
- `src/pages/**` → sayfa bileşenleri (rota hedefleri)
- `src/components/**` → paylaşılan bileşenler
- `src/lib/**` → iş mantığı yardımcıları
- `src/stores/**` → Zustand store'ları
- `src/modules/three-d-design/**` → 2B/3B mutfak tasarım aracı
- `supabase/migrations/**` → SQL migration'ları (sıralı numaralı)
- `supabase/functions/**` → Deno edge function'ları

## Rota → dosya haritası
```
/ , /welcome                → src/pages/landing/LandingPage.tsx
/magaza , /urunler          → src/pages/shop/ShopPage.tsx
/login , /forgot-password   → src/pages/auth/LoginPage.tsx
/register                   → src/pages/auth/RegisterPage.tsx
/dashboard                  → src/components/Dashboard.tsx
/design                     → src/components/DesignStudio.tsx
/design/3d                  → src/pages/design/FloorPlan3DPage.tsx
/3d-design                  → src/pages/design/ThreeDDesignPage.tsx (+ src/modules/three-d-design/**)
/bom , /bom/:id             → src/components/BOM.tsx
/katalog                    → src/pages/products/ProductsPage.tsx
/product/:id                → src/pages/product/ProductDetailPage.tsx
/checkout                   → src/pages/checkout/CheckoutPage.tsx
/kitchen-planner            → src/pages/planner/KitchenPlannerPage.tsx
/cart                       → src/components/Cart.tsx
/favorites                  → src/pages/favorites/FavoritesPage.tsx
/orders , /orders/:id       → src/pages/orders/{OrdersPage,OrderDetailPage}.tsx
/teklifler                  → src/pages/projects/QuotesPage.tsx
/projects , /projects/:id   → src/pages/projects/{ProjectListPage,ProjectDetailPage}.tsx
/degisiklikler              → src/pages/changelog/ChangelogPage.tsx
/settings /support /docs /profile /payment /brand /resources
                            → src/pages/{settings,support,docs,profile,payment,brand,resources}/*.tsx
/blog , /blog/:slug         → src/pages/blog/{BlogListPage,BlogPostPage}.tsx
/sektor/** /kategori/** /marka/** → src/pages/pseo/*.tsx
/compare , /compare/:slug   → src/pages/compare/*.tsx
/admin/**                   → src/pages/admin/*.tsx (AdminGuard korumalı)
/admin/error-reports        → src/pages/admin/ErrorReportsPage.tsx (+ errorReports/*)
```

## Projeye özgü kurallar — ihlal edilirse regresyon olur
- Ürün detayı **tek** bileşenden açılır: `src/components/ProductDetailDrawer.tsx`
  (App kökünde global, `openFromItem` ile). Paralel detay görünümü yazma.
- Karşılaştırma paneli global: `src/components/ComparePanel.tsx` — yeni gridlerde
  `equipmentToCompareItem` / `brandToSource` yardımcıları kullanılır.
- Tasarımda ürün silme her yerden silmeli: `src/lib/designDelete.ts` →
  `removeEquipmentEverywhere` (teklif + Ürünler listesi de temizlenir).
- Onay pencereleri `window.confirm` değil `src/components/ConfirmDialog.tsx`.
- 2B/3B aynalama `src/modules/three-d-design/.../renderSpace.ts` üzerinden.
- Kategori menüsü/mağaza tek kaynaktan: `src/lib/categoryTaxonomy.ts`.
- **Zustand v5:** selector her çağrıda yeni dizi/nesne döndürürse sonsuz render
  döngüsü olur — `useMemo` / `useShallow` şart.
- Ekran görüntüsü alan her yerde `html2canvas-pro` (klasik `html2canvas` DEĞİL).
- Marka kırmızısı `#931315`. Mavi `logo-werbung.png` kardeş marka — Gastro
  tekliflerinde kullanılmaz.
- Yeni kullanıcıya görünen metin → **15 dilin tamamına** çeviri gerekir.
- Windows'ta `npm install` rollup hatası verirse `--force` ile kurulur.

## Hata Merkezi (otomatik triyaj + düzeltme)
`/admin/error-reports` — dört sekme: Bildirimler, Sistem Logları, İşlem Geçmişi,
Otomasyon, Ajan.

Zincir: hata oluşur → `error_logs`/`error_reports` → pg_net trigger →
`error-webhook` → Claude Haiku açıklamayı detaylandırır + düzeltme prompt'u
üretir → (opsiyonel) saatlik bulut ajanı prompt'u alıp `src/` altında düzeltir →
`main`'e commit → canlıya çıkar → `/degisiklikler` sayfasında yayınlanır +
bildirene e-posta gider.

- Ham kullanıcı metni `description` sütununda **asla ezilmez**;
  AI'ın detaylandırdığı hali `description_ai`'ye yazılır.
- Ajan sözleşmesi ve kuralları: **`docs/fix-agent.md`**
