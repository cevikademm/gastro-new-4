# SEO Denetim Raporu — 2026-09-06 (yerel üretim derlemesi)

- **Hedef:** `http://127.0.0.1:4173` — `npm run build` çıktısı, `vite preview` ile servis
  (dev sunucu DEĞİL; Almanca-önce SEO mimarisinin prerender HTML'i dahil)
- **Cihaz:** mobile · **Örnek:** 1 · **Bütçe:** 75 · **Önbellek:** kapalı (`--no-cache`)
- **Araç:** Unlighthouse CI (Google Lighthouse 13.4.1) · ham çıktı `.unlighthouse-local-de/` (öncesi)
  ve `.unlighthouse-local-de-after/` (sonrası)
- **Rota seti (12):** `/`, `/produkte`, `/kochgeraete`, `/kochgeraete/kombidaempfer`,
  `/produkt/combisteel-1100-wandkap-1000-7333-1130`, `/marke/diamond`, `/branche/restaurant`,
  `/gastronomiebedarf/koeln`, `/ratgeber`, `/impressum`, `/blog`, `/tr`
- **Sonuç (öncesi):** **KALDI** — 14 bütçe ihlali (çıkış kodu 1) · taranan 12/12
- **Sonuç (sonrası):** **KALDI** — 9 ihlal, tamamı performans · A11y 88 → **97** · LCP ort. 8.2 → **5.7 s**
  (ayrıntı: "Yeniden Tarama Sonucu")

> Yerel taramanın canlıdan farkı: `vite preview` cache başlığı ve HTTP/2 vermez
> (`cache-insight`, `modern-http-insight` bulguları yereldir, canlıda `vercel.json`
> başlıkları var). Ürün sayfası `/produkt/*` yerelde SPA olarak açılır; canlıda
> `api/render.ts` HTML üretir. hreflang'lar canlı domaine işaret ettiği için
> Unlighthouse "cross-domain hreflang" uyarısı verir — beklenen.

---

## Skor Özeti — öncesi

| Sayfa | Toplam | Perf | A11y | BP | SEO |
|---|---|---|---|---|---|
| `/blog` (→ `/tr/blog`) | 79 | **26** | 90 | 100 | 100 |
| `/tr` | 79 | **42** | **74** | 100 | 100 |
| `/` | 82 | **54** | **74** | 100 | 100 |
| `/branche/restaurant` | 85 | **49** | 90 | 100 | 100 |
| `/marke/diamond` | 86 | **54** | 90 | 100 | 100 |
| `/kochgeraete` | 87 | **60** | 86 | 100 | 100 |
| `/produkte` | 87 | **62** | 86 | 100 | 100 |
| `/impressum` | 89 | **64** | 90 | 100 | 100 |
| `/kochgeraete/kombidaempfer` | 90 | **73** | 86 | 100 | 100 |
| `/produkt/…7333-1130` | 90 | **63** | 100 | 96 | 100 |
| `/gastronomiebedarf/koeln` | 91 | **73** | 92 | 100 | 100 |
| `/ratgeber` | 92 | **74** | 94 | 100 | 100 |

Site ortalaması: Performans **58** · Erişilebilirlik **88** · En İyi Pratikler 100 · SEO 100.

## Core Web Vitals (site ortalaması, öncesi)

| Metrik | Ortalama | İyi eşiği | Durum |
|---|---|---|---|
| LCP | **8.17 s** | 2.50 s | ZAYIF |
| FCP | **3.93 s** | 1.80 s | ZAYIF |
| TBT | 416 ms | 200 ms | ORTA |
| TTI | **14.73 s** | 3.80 s | ZAYIF |
| CLS | 0.090 | 0.100 | İYİ (`/blog` hariç: 0.904) |

En yavaş LCP: `/blog` 15.0 s · `/kochgeraete` 14.0 s · `/branche/restaurant` 13.8 s ·
`/marke/diamond` 13.3 s · `/tr` 8.9 s.

---

## Bulgular (öncelik sırası)

### P0-1 · Prerender HTML splash arkasında; LCP = React'in ilk render'ı ⚠ AÇIK (mimari karar gerekir)

- **Etkilenen:** 12/12 sayfa (tüm SEO sayfaları)
- **Kanıt:** `lcp-breakdown-insight` `/kochgeraete`: TTFB **122 ms**, *element render delay*
  **8.795 ms**. LCP öğesi React'in çizdiği hero paragrafı (`p.mt-4.text-sm…`), prerender
  HTML'de bu öğe yok. Kaynak zaman çizelgesi (mobil kısıtlama): `index.css` 1.2 s →
  `index-*.js` **682 KB gzip @ 3.5 s** → `data-products-*.js` **539 KB gzip @ 6.4 s** →
  rota chunk'ı `CategoryPage` @ 8.3 s → ilk gerçek boyama.
- **Kök neden:** `index.html` `#app-splash` (fixed, z-index 99999) sunucu gövdesini React
  mount'a kadar örtüyor (`"kullanıcı splash arkasında hiç görmez"`). Yani Googlebot'a
  verilen HTML kullanıcıya hiç boyanmıyor; LCP tamamen JS bundle'ına bağlı. Bundle'ı
  şişiren iki şey: (1) `App.tsx` `LandingPage`'i **eager** import ediyor (tüm landing
  bölümleri + motion → entry 1,97 MB / 732 KB gzip); (2) `products.json` (5,2 MB /
  551 KB gzip) her sayfada iniyor — zincir `App.tsx → ProductDetailDrawer.tsx →
  stores/equipmentStore.ts → data/products.json` (ayrıca `Navbar.tsx` `CATEGORIES`'i
  aynı store'dan alıyor).
- **Önerilen düzeltme (onay gerekir, ~5 dosya):**
  1. SEO rotalarında splash'i kaldır: `#root` içindeki sunucu gövdesi gerçek CSS ile
     görünür olsun, React mount edince yerine geçsin (LCP ≈ FCP ≈ 1-2 s'ye iner).
     Uygulama rotalarında (dashboard vb.) splash kalabilir.
  2. `CATEGORIES`'i `stores/equipmentStore.ts`'ten hafif bir modüle taşı
     (`stores/equipmentCategories.ts`, store yeniden export etsin) → `Navbar`,
     `ProductsMegaMenu` ürün verisini çekmeden çalışır.
  3. `ProductDetailDrawer`'ı `App.tsx`'te `lazy()` yap (yalnız açılınca lazım) →
     `data-products` entry'den çıkar; ürün verisi ilk ihtiyaçta iner.
  4. `LandingPage`'i de `lazy()` yap veya landing'in ağır bölümlerini
     (BestSellers/CategoryBubbles/3B) rota-içi lazy'ye al.
- **Beklenen etki:** Kategori/marka/branche sayfalarında LCP 13-14 s → ~2-3 s; entry
  JS ~1,3 MB gzip azalır.

### P0-2 · `/produkt/*` sayfası üretimde çöküyordu (`require is not defined`) ✅ düzeltildi

- **Kanıt:** `errors-in-console` skor 0 — `ReferenceError: require is not defined at
  ProductPage-*.js`. BP skoru 96'ya düşüyordu; aksesuar kartından drawer açma kırıktı.
- **Kök neden:** `src/pages/seo/ProductPage.tsx:137` — tarayıcı ESM bundle'ında
  CommonJS `require()`; dev'de fark edilmemiş.
- **Düzeltme:** `useProductDetailStore` statik import (döngü yok).

### P1-1 · jsPDF chunk'ı (390 KB / 129 KB gzip) her sayfada iniyordu ✅ düzeltildi

- **Kanıt:** `unused-javascript` 12/12 sayfa; `pdf-*.js` 234 KB transfer, %69 kullanılmayan.
  `dist/index.html` modulepreload listesinde `pdf-*.js`; entry chunk `import{_ as x}from"./pdf-…"`.
- **Kök neden (iki katman):** (a) `src/lib/errorReport.ts` `html2canvas-pro`'yu statik
  import ediyor ve manualChunks html2canvas'ı jsPDF ile aynı `pdf` chunk'ına koyuyordu;
  (b) asıl sebep: Rollup, Vite'ın `__vitePreload` yardımcısını ilk ihtiyaç duyan
  chunk'a (jsPDF) yerleştirmiş — dinamik import kullanan **her** chunk pdf chunk'ını
  statik import ediyordu.
- **Düzeltme:** `vite.config.ts` manualChunks: `vite/preload-helper` → `react` chunk'ı;
  jsPDF ve html2canvas ayrı chunk'lar; `errorReport.ts` html2canvas'ı ekran görüntüsü
  anında dinamik yükler. Doğrulama: yeni `dist/index.html` modulepreload'unda pdf yok.

### P1-2 · Logo PNG 275 KB (1208×288) her sayfada ✅ düzeltildi

- **Kanıt:** `image-delivery-insight` 11/12 sayfa, `logo-2mc-gastro.png` 265 KB, önerilen
  kazanç sayfa başına ~265 KB. Ekranda en fazla ~190 px genişlikte gösteriliyor.
- **Düzeltme:** `public/logo-2mc-gastro.webp` (400×95, q82, **25 KB**) üretildi; 6 bileşendeki
  `<img>` ve `index.html` preload'u WebP'ye çevrildi. PNG og:image/JSON-LD için duruyor.

### P1-3 · Google Fonts CSS `@import` zinciri render'ı engelliyordu ✅ düzeltildi

- **Kanıt:** `render-blocking-insight` 12/12: `index.css` (~1.000 ms) + fonts CSS (~830 ms)
  seri: tarayıcı fonts CSS'ini ancak `index.css` inince keşfediyordu.
- **Düzeltme:** `src/index.css` `@import` kaldırıldı; `index.html` head'e `preload as=style`
  + `media="print" onload` (non-blocking) + `<noscript>` yedeği. `preconnect` zaten vardı.

### P1-4 · Erişilebilirlik 74 (`/`, `/tr`) — paylaşılan başlık + landing formları ✅ büyük ölçüde düzeltildi

| Denetim | Etkilenen | Düzeltme |
|---|---|---|
| `button-name` | 11/12 | `Navbar` mobil menü butonu: `aria-label` + `aria-expanded` (15 dile `landing.navbar.openMenuAria/closeMenuAria` eklendi); `ShopPage` sayfalama okları `aria-label` (`common.previous` 15 dile eklendi) |
| `label-content-name-mismatch` | 11/12 | Sepet butonu: `aria-label="Warenkorb (N)"` — görünür rozet adı eşleşiyor |
| `select-name` / `label` | 3/12 | Leasing hesaplayıcı `select` + `range` `htmlFor/id`; mağaza sıralama `select` `aria-label` |
| `heading-order` | 4/12 | Footer (`Sections.tsx`) ve `ProcessTimeline` `h4` → `h3` |
| `link-name` | 2/12 | Kategori sayfalama `rel=prev/next` bağlantılarına `aria-label` |
| `target-size` | 2/12 | Hero slider noktaları: `before:-inset-2` ile 24×24 dokunma alanı |
| `unsized-images` | 3/12 | `CategoryBubbles` görsellerine `width/height` |
| `color-contrast` | 9/12 | `text-slate-400` (2,63:1) → `text-slate-600` — SEO ürün kartı SKU, kategori/marka başlık sayacı, ürün drawer'ı, mağaza kartı |

**Açık kalan kontrast:** landing'de 8-9 px `text-emerald-600` (3,65) ve `bg-slate-100
text-slate-500` rozetleri (4,34); `text-brand-red` (#dc2626) beyaz üstünde 4,42 — marka
kırmızısı kararı (CLAUDE.md `#931315` 8,6:1 verir). Tasarım onayı ister.

### P1-5 · `/blog` istemci tarafında `/tr/blog`'a yönleniyor → CLS 0.904, LCP 15 s ⚠ AÇIK

- **Kanıt:** `/blog` taraması `finalDisplayedUrl=/tr/blog`; `layout-shifts` 0.904.
- **Kök neden:** `vercel.json` yalnız `/blog/<slug>` için 308 veriyor; `/blog` kökü SPA'da
  render sonrası yönleniyor.
- **Öneri:** `vercel.json` redirects'e `/blog → /tr/blog` (veya Almanca hedefse `/ratgeber`)
  ekle — hedef kararı Adem'in.

### P2-1 · Görsel teslimi (Diamond S3) ⚠ AÇIK
- `image-delivery-insight`: landing/`/tr`'de 1.000×1.000 JPEG'ler 208 px kutuda (150-160 KB/adet),
  `landing/slider-1.jpg` 180 KB. Öneri: `-thumb` conversions + `srcset`; slider WebP.

### P2-2 · Entry bundle 732 KB gzip ⚠ AÇIK
- P0-1 ile aynı kök; ek olarak 15 dilin i18n JSON'u tek chunk'ta (48 KB gzip) — dil bazlı lazy.

### P2-3 · `valid-source-maps` 12/12 — bilgi
- `vite.config.ts` `sourcemap:false` bilinçli; canlıda kaynak haritası yayınlamak istenmiyorsa
  bu bulgu yok sayılır (`'hidden'` alternatifi map dosyalarını yine yayınlar).

### Yerel artefaktlar (rapora P girmez)
- `cache-insight`, `modern-http-insight`: `vite preview` cache/HTTP2 vermez; canlıda `vercel.json`.
- `unminified-javascript`: yalnız `icons-*.js` 6-7 KB; ihmal.

---

## Uygulananlar (özet)

| Dosya | Değişiklik |
|---|---|
| `vite.config.ts` | `vite/preload-helper` → `react` chunk; jsPDF / html2canvas ayrı chunk |
| `src/lib/errorReport.ts` | html2canvas dinamik import |
| `src/pages/seo/ProductPage.tsx` | `require()` → statik import (üretim çökmesi) |
| `index.html`, `src/index.css` | Google Fonts non-blocking; logo preload WebP |
| `public/logo-2mc-gastro.webp` + 6 bileşen | 275 KB PNG → 25 KB WebP |
| `src/components/Navbar.tsx` | mobil menü `aria-label/expanded`; sepet `aria-label` adetli |
| `src/components/Sections.tsx`, `landing/sections/ProcessTimeline.tsx` | `h4` → `h3` |
| `src/pages/landing/LandingPage.tsx` | leasing `select`/`range` etiketleri; slider noktası dokunma alanı |
| `src/components/landing/sections/CategoryBubbles.tsx` | `width/height` |
| `src/pages/seo/CategoryPage.tsx`, `BrandSeoPage.tsx`, `components/seo/ProductSeoCard.tsx`, `ProductDetailDrawer.tsx`, `pages/shop/ShopPage.tsx` | kontrast + sayfalama/sıralama etiketleri |
| `src/i18n/*.json` (15) | `landing.navbar.openMenuAria`, `closeMenuAria`, `common.previous` |

Tip kontrolü: `npm run lint` yalnız `src/pages/admin/CustomerFinderPage.tsx`'te (paralel
oturumun devam eden işi, `InsightCard`) hata veriyor — bu rapordaki dosyalar temiz.

## Uygulanmayanlar / Riskler
- P0-1 (splash + eager bundle) ve P1-5 (`/blog` yönlendirme hedefi) mimari/ürün kararı
  gerektirdiği için uygulanmadı; adımlar yukarıda.
- Kontrastta marka kırmızısı ve 8-9 px metinler tasarım onayı bekliyor.
- Yerel skorlar canlıyla birebir kıyaslanmaz (cache/HTTP2/edge yok); canlı doğrulama
  deploy sonrası `--no-cache` ile tekrarlanmalı.

## Yeniden Tarama Sonucu (düzeltme sonrası, temiz `dist`, `--no-cache`)

> **Ölçüm notu — `dist/` temizlenmiyor.** `npm run build` eski hash'li chunk'ları ve
> önceki prerender `.html` dosyalarını silmiyor (1.507 eski JS dosyası, `dist/kochgeraete.html`
> 09:46 tarihli ve eski `index-DybW0KMI.js`'e bağlı). İlk "sonrası" taraması bu yüzden
> kategori/marka sayfalarını **eski bundle** ile ölçtü. Son tarama `rm -rf dist && npm run build`
> ile alındı (`.unlighthouse-local-de-final/`). Canlıda Vercel sıfırdan derler; yerel
> ölçümlerde her zaman `rm -rf dist` şart (Hafıza: `vite-preload-helper-jspdf-chunk`).
> Kategori/marka/branche sayfaları artık prerender edilmiyor (canlıda `api/render.ts`);
> yerelde SPA yedeği ölçülür — bu sayfaların LCP'si yerelde canlıdan kötümserdir.

| Sayfa | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| `/` | 54 → **52** | 74 → **92** | 100 → 100 | 100 → 100 | 4.0 → **3.4 s** | 0.069 → 0.076 |
| `/blog` (→`/tr/blog`) | 26 → **27** | 90 → **96** | 100 → 100 | 100 → 100 | 15.0 → **11.8 s** | 0.904 → 0.904 |
| `/branche/restaurant` | 49 → **55** | 90 → **96** | 100 → 100 | 100 → 100 | 13.8 → **11.1 s** | 0.000 → 0.000 |
| `/gastronomiebedarf/koeln` | 73 → **64** | 92 → **100** | 100 → 100 | 100 → 100 | 4.8 → **3.5 s** | 0.003 → 0.000 |
| `/impressum` | 64 → **75** | 90 → **100** | 100 → 100 | 100 → 100 | 4.8 → **2.8 s** | 0.000 → 0.000 |
| `/kochgeraete` | 60 → **54** | 86 → **100** | 100 → 100 | 100 → 100 | 14.0 → **11.1 s** | 0.000 → 0.069 |
| `/kochgeraete/kombidaempfer` | 73 → **70** | 86 → **100** | 100 → 100 | 100 → 100 | 4.6 → **3.1 s** | 0.064 → 0.069 |
| `/marke/diamond` | 54 → **60** | 90 → **100** | 100 → 100 | 100 → 100 | 13.3 → **11.5 s** | 0.000 → 0.000 |
| `/produkt/…7333-1130` | 63 → **62** | 100 → **96** | **96 → 100** | 100 → 100 | 5.3 → **2.6 s** | 0.000 → **0.521** |
| `/produkte` | 62 → **82** | 86 → **95** | 100 → 100 | 100 → 100 | 5.3 → **2.6 s** | 0.000 → 0.026 |
| `/ratgeber` | 74 → **84** | 94 → **100** | 100 → 100 | 100 → 100 | 4.2 → **2.6 s** | 0.000 → 0.000 |
| `/tr` | 42 → **72** | 74 → **92** | 100 → 100 | 100 → 100 | 8.9 → **2.6 s** | 0.000 → 0.000 |
| **Ortalama** | 58 → **63** | 88 → **97** | | | 8.17 → **5.73 s** | |

- **Bütçe:** hâlâ KALDI (çıkış kodu 1) — 9 ihlal, **tamamı performans**; erişilebilirlik
  ihlali kalmadı (7 sayfa 100). Tek örnekli ölçümde ±5 puan gürültü normaldir; `/`,
  `/gastronomiebedarf/koeln`, `/kochgeraete` gibi ±6 içindeki farklar anlamlı değil.
- **Anlamlı iyileşmeler:** `/tr` 42→72 (LCP 8.9→2.6 s), `/produkte` 62→82, `/ratgeber`
  74→84, `/impressum` 64→75; site LCP ortalaması 8.17→5.73 s; FCP 3.93→2.70 s.
  Kaynak: font zinciri, logo, jsPDF chunk'ının her sayfadan çıkması.
- **Değişmeyen:** kategori/marka/branche LCP ~11 s — P0-1 (splash + entry bundle +
  `products.json`) çözülmeden inmez; yerelde bu sayfalar SPA yedeğiyle ölçülüyor.
- **Yeni bulgu · P1-6 · `/produkt/*` CLS 0.52:** sayfa artık çöktüğü için değil gerçekten
  render edildiği için ölçülüyor; `layout-shifts` "Media element lacking an explicit size"
  (0.509) + font takası (0.226). Drawer gövdesindeki ana görsele `width/height` eklendi ama
  kapsayıcı yüksekliği sabit değil; `ProductDetailBody` görsel alanına `aspect-square` +
  3B/yükleme iskeleti için sabit yükseklik önerilir.
- **Kalan erişilebilirlik (6/12 kontrast, 2/12 target-size, 1/12 heading-order):** landing
  8-9 px yardımcı metinler, `text-brand-red` (#dc2626, 4,42:1) bağlantı/butonlar, hero slider
  noktaları (24×24 buton olmasına rağmen axe hâlâ işaretliyor — `gap-2.5` aralığı 24 px
  boşluk kuralını karşılamıyor olabilir; `gap-4` denenebilir), `/produkte` kart `h3`'leri
  üstünde `h2` yok.
- **BP:** ürün sayfası `errors-in-console` kapandı (96 → 100). `valid-source-maps` bilinçli.
