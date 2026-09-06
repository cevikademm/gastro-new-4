# SEO Yeniden Yapılandırma — Adem İnceleme Listesi (2026-09-06)

Almanca-önce SEO mimarisi canlıya alınmadan/alındıktan sonra Adem'in gözden geçirmesi
gereken içerik ve kararlar. Her satır: dosya → ne yapılacak.

## 1. Onay bekleyen Almanca içerik (AI taslağı)

| Dosya | İçerik | Nasıl düzenlenir |
|---|---|---|
| `src/content/seo/categoryTree.de.ts` | 16 üst kategori (title/description/intro/SEO bölümleri/FAQ) + ~60 alt kategori | Metni düzelt; yayından kaldırmak için `published: false` |
| `src/content/seo/brands.de.ts` | Diamond / CombiSteel / HENDI marka sayfaları | Metin + `subBrands` |
| `src/content/seo/branchen.de.ts` | 15 Branche sayfası (Planungsgrundlagen, Grundausstattung, 3 konfigürasyon, Vorschriften, FAQ) | Metin + `published` |
| `src/content/seo/staedte.de.ts` | 32 şehir; **Dalga 1 (NRW, 12 şehir) yayında**, Dalga 2–3 `published:false` | Yerel bilgileri doğrula (teslimat süreleri, montaj), gerçek referans varsa `references[]` |
| `src/seo/model/pages.ts` → `homeModel` | Ana sayfa Almanca H1/intro/FAQ (Googlebot'un gördüğü gövde) | Metin |
| `public/llms.txt` | AI cevap motorları için Almanca özet | Metin |

Değişiklikten sonra: `npm run build` (prerender yeniden üretir) → deploy.

## 2. Adem'den gelmesi gereken veriler (kod hazır, değer boş)

| Nerede | Ne | Neden |
|---|---|---|
| `src/lib/companyInfo.ts` → `register` | HRB numarası, Amtsgericht, Geschäftsführer adı | Impressum (§5 TMG) + Organization şeması; boşken satır gösterilmez |
| `src/lib/companyInfo.ts` → `sameAs` | 2MC Gastro'ya ait LinkedIn / Instagram / YouTube / Google İşletme Profili URL'leri | Entity sinyali (Knowledge Graph); 2mcwerbung hesapları KULLANILMAZ |
| `index.html` (yorum satırı) | `google-site-verification` token | Search Console doğrulaması (alternatif: GoDaddy DNS TXT) |
| Vercel → Environment Variables | `VITE_GA_MEASUREMENT_ID` (G-XXXX), isteğe bağlı `VITE_CLARITY_PROJECT_ID` | GA4 ölçüm (kod hazır, env yokken sessiz) |
| `.env` / Vercel | `DIAMOND_LANGUAGE=de` + `api/sync-diamond.ts` dil parametresi | Supabase diamond_products şu an İngilizce; ürün adları products.json'dan (Almanca) alınıyor |
| Bütçe | DeepL Pro ≤ 25 €/ay | CombiSteel (Felemenkçe) + HENDI (İngilizce) ürün adları/açıklamaları → Almanca (`scripts/seo/translate-products.ts` yazılacak) |

## 3. Canlıya alındıktan sonra yapılacaklar (sıra)

1. **Search Console**: Domain property (DNS TXT) veya URL-prefix (meta) doğrula → `https://www.2mcgastro.de/sitemap.xml` gönder → 20 hub sayfası için "URL denetimi → Dizine eklenmesini iste".
2. **Bing Webmaster**: GSC'den içe aktar.
3. **Google İşletme Profili**: "Großhandel für Gastronomiebedarf" kategorisi, Köln adresi, saatler, 10 ürün, haftalık gönderi; profil URL'sini `sameAs`'e ekle.
4. **Ücretsiz dizinler** (aynı NAP: `2MC Gastro GmbH · Bergisch Gladbacher Str. 172 · 51063 Köln · +49 176 70295844 · info@2mcgastro.de`): Gelbe Seiten, 11880, Das Örtliche, GoYellow, Cylex, meinestadt.de, Yelp DE, wlw.de, Kompass, Europages, IHK Köln, Bing Places, Apple Business Connect.
5. **Üretici bayi listeleri**: Diamond Europe / CombiSteel / HENDI "Händler finden" → hesap yöneticisinden istenir (en değerli ücretsiz backlink).
6. **Doğrulama** (Faz 1 çıkış kriterleri):
   ```
   curl -A Googlebot -s https://www.2mcgastro.de/kuehlung | grep -E '<html lang="de"|<h1>|CollectionPage'
   curl -I https://www.2mcgastro.de/magaza          # → 308 /produkte
   curl -I https://www.2mcgastro.de/product/03D/6H   # → 301 /produkt/…
   curl -I https://www.2mcgastro.de/foo-bar          # → 404
   curl -s https://www.2mcgastro.de/sitemap.xml
   ```
   Ardından `seo-agent` (Lighthouse) ve `geo-agent` (llms/AI) çalıştır.

## 4. Sonraki fazlar (kod yazılacak)

- **Ratgeber içerik motoru** hazır (`src/content/ratgeber/*.md` → `npm run seo:ratgeber`); ilk 30 sütun konu `/blog --dil de` ile üretilecek, Adem `status: published` yapar.
- **products.json bundle'dan çıkarma** (5,2 MB) — Lighthouse Perf; `equipmentStore` lazy yükleme.
- **Şehir Dalga 2–3** — Dalga 1 GSC verisi (indeks + gösterim) geldikten sonra `published:true`.
- **Ürün yorumları** → gerçek `AggregateRating` (product_reviews doluysa).
- **Merchant Center**: net-fiyat kararı nedeniyle feed gönderilmiyor (`/feed-gmc.xml?gross=1` brüt sürüm hazır).
