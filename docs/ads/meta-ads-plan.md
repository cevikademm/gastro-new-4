# Meta Ads (Facebook + Instagram) Planı — 2MC Gastro (Almanya, B2B)

Hazırlanış: 2026-09-06. Kaynak: SEO anahtar kümeleri (`docs/seo/`), Branche sayfaları,
GGM Gastro rakip analizi. Canlı Ads verisi YOK — plan kurulum ve ilk 90 gün için.

## 0. Meta MCP analizi (kullanıcının gönderdiği metin)

| Konu | Sonuç |
|---|---|
| Sunucu | Yalnızca **Meta Devtools MCP** (uygulama yönetimi, webhook, uyumluluk, app durumu, doküman arama). **Reklam verisi / kampanya / arama** aracı YOK. |
| Bağlantı | Uzak HTTP MCP; Claude Code'a eklenir, Meta hesabıyla **OAuth** + scope onayı gerekir → yalnızca etkileşimli oturumda, kullanıcı tarafından. |
| Reklam verisi için ne gerekir | Meta **Marketing API**: bir Meta uygulaması + `ads_read` (rapor) / `ads_management` (yönetim) izinli System User token'ı. Devtools MCP bu uygulamayı kurmaya yardımcı olabilir. |
| Güvenlik | Minimum scope; dev/prod ayrı uygulama; write scope'u güvenilmeyen içerik işleyen ajana verilmez (prompt injection). |
| Kurulum (Claude Code) | Sunucu URL'si Meta'nın referans sayfasında (developers.facebook.com/documentation/mcp/devtools-mcp): `claude mcp add --transport http meta-devtools <server-url>` → oturumda `/mcp` ile giriş. |

Sonuç: Bu oturumda "Meta reklam ve arama" yürütülemez; aşağıdaki plan Ads Manager'da
elle veya Marketing API token'ı geldiğinde otomatik uygulanır.

## 1. Hedef ve KPI

- Birincil hedef: **nitelikli B2B lead** (Angebot/Küchenplanung talebi, telefon/WhatsApp).
- İkincil: kategori sayfalarına trafik (retargeting havuzu), marka bilinirliği (Köln/NRW).
- KPI (ay 3): CPL ≤ 25 € (form/WhatsApp), Lead → Angebot oranı ≥ 40 %, ROAS ölçümü sipariş
  değeri üzerinden (Pixel `Purchase`/`Lead` + CRM eşleşmesi).
- Bütçe önerisi: 600–900 €/ay başlangıç (Adem'in dış bütçe sınırı < 500 €/ay ise: 450 €/ay
  ile Kampanya A + C, B'yi ay 2'de aç).

## 2. Ölçüm altyapısı (önce bu)

1. **Meta Pixel + Conversions API** (Vercel fonksiyonu `api/meta-capi.ts` — ileride):
   olaylar `ViewContent` (ürün/kategori), `AddToCart`, `Lead` (Angebot formu, WhatsApp tıkı),
   `Contact` (tel), `Purchase` (checkout). CookieBanner onayına bağlı (TTDSG).
2. **UTM şeması**: `utm_source=meta&utm_medium=paid_social&utm_campaign={kampanya}&utm_content={kreatif}`;
   landing'ler daima Almanca kök URL'ler (`/branche/pizzeria`, `/kuehlung`, `/3d-design`).
3. Katalog: `/feed-gmc.xml?gross=1` → Meta **Commerce Manager** ürün kataloğu (Meta brüt fiyat
   zorunlu kılmaz; B2B için net feed de kabul edilir → `/feed-gmc.xml`). Dinamik ürün reklamları
   (DPA/Advantage+ Catalog) için gerekli.

## 3. Kampanya yapısı (90 gün)

### Kampanya A — Branche Lead-Gen (Conversion: Lead) · 40 % bütçe
| Reklam seti | Hedef kitle (DE) | Landing | Mesaj |
|---|---|---|---|
| A1 Pizzeria/Döner/Imbiss | İlgi: Pizzeria, Kebab, Imbiss, Gastronomiebedarf; iş sahibi davranışı; NRW +50 km, sonra DE | `/branche/pizzeria`, `/branche/doener-kebab-betrieb`, `/branche/imbiss-fast-food` | "Pizzeria-Ausstattung ab X € netto – Ofen, Kneter, Kühltisch. Kostenlos in 3D planen." |
| A2 Restaurant/Hotel | İlgi: Gastronomie, Hotellerie, Restaurantbesitzer, Küchenchef; DEHOGA takipçileri | `/branche/restaurant`, `/branche/hotel` | "Restaurantküche planen: Angebot in 24 h, Lieferung mit Montage in NRW." |
| A3 Bäckerei/Metzgerei/Kantine | İlgi: Bäckerei, Metzgerei, Betriebsverpflegung | `/branche/baeckerei-konditorei`, `/branche/metzgerei`, `/branche/kantine-betriebsverpflegung` | "Bäckereiofen 600×400, Gärschrank, Kühlung – aus einer Hand." |
Kreatif: 4:5 karusel (3 örnek konfigürasyon + fiyat aralığı) + 9:16 Reels (3D planlayıcı ekran kaydı, 15 sn).
Form: Instant Form (3 soru: Betriebstyp, Zeitplan, PLZ) + WhatsApp click-to-chat alternatifi.

### Kampanya B — Kategori Trafik + DPA (Traffic → Catalog Sales) · 35 % bütçe
| Reklam seti | Hedef | Landing |
|---|---|---|
| B1 Kühlung | İlgi: Gastro Kühlschrank, Kühltechnik; benzer kitle (site ziyaretçileri %1) | `/kuehlung`, `/kuehlung/kuehlschraenke` |
| B2 Kochgeräte | Kombidämpfer, Fritteuse, Gastro Herd ilgileri | `/kochgeraete`, `/kochgeraete/kombidaempfer` |
| B3 Advantage+ Catalog (DPA) | Site ziyaretçileri (ViewContent 30 gün, AddToCart 14 gün) | ürün sayfaları (`/produkt/{slug}`) |
Kreatif: ürün görseli + net fiyat + "zzgl. MwSt." + marka rozeti (Diamond/CombiSteel/HENDI).

### Kampanya C — Retargeting & Marka (Engagement/Conversion) · 25 % bütçe
| Reklam seti | Hedef | Mesaj |
|---|---|---|
| C1 Sıcak retargeting | Ürün/kategori ziyaretçileri 14 gün, form açıp bırakanlar | "Ihr Angebot wartet – 3D-Planung kostenlos, Lieferung in 1–3 Werktagen." |
| C2 GGM karşılaştırma | GGM Gastro sayfa etkileşimcileri + "ggm gastro" ilgi | `/vergleich/ggm-gastro` — "Beratung statt Hotline: 2MC Gastro vs. GGM" (UWG §6: doğrulanabilir iddialar) |
| C3 Köln/NRW yerel | 40 km Köln, iş sahipleri | `/gastronomiebedarf/koeln` — "Gastronomiebedarf Köln: eigene Auslieferung + Montage" |

## 4. Kreatif brief'leri (ilk sprint, 12 varyant)

1. **3D planlayıcı demo** (Reels 15 sn): duvar çiz → cihaz yerleştir → Angebot PDF; CTA "Jetzt planen".
2. **Fiyat şeffaflığı** (statik): "Kombidämpfer 10 GN ab 4.299 € netto" (gerçek fiyat, product_seo'dan).
3. **Sosyal kanıt** (karusel): Adem'in gerçek projeleri (fotoğraf izniyle) — referans yoksa "Beispielkonfiguration".
4. **Teslimat/montaj** (statik/Reels): araç + montaj ekibi NRW.
5. **Branche karuseli**: Pizzeria / Döner / Restaurant / Bäckerei — her kart bir Grundausstattung.
6. **Karşılaştırma** (statik): tablo görseli (3D planer, Beratung, Lieferung) — GGM adı kullanılmadan da versiyon.

Metin kuralları: "Sie", net fiyat + "zzgl. MwSt.", Almanca; Türkçe varyant A1 için (Döner/Pizzeria sahipleri) ayrı ad set: `/tr/branche/doener-kebab-betrieb` (noindex olsa da landing olarak çalışır).

## 5. Hedef kitle kaynakları

- Pixel ziyaretçileri (30/90/180 gün), Lead formu açanlar, WhatsApp tıklayanlar.
- Müşteri listesi (CRM/Supabase `orders` e-posta+telefon, hash'li) → Lookalike %1–2 DE.
- İlgi alanları: Gastronomiebedarf, Großküche, Gastronomie, Restaurantbesitzer, Küchenchef,
  Pizzeria, Döner, Bäckerei, Metzgerei, Hotel; davranış: Small business owners.
- Konum: Faz 1 NRW (Köln 80 km), Faz 2 DE geneli; dil: Almanca + Türkçe.

## 6. Bütçe ve takvim (90 gün)

| Hafta | Aksiyon |
|---|---|
| 1 | Pixel/CAPI + Commerce katalog + Instant Form; A1+C3 açılır (15 €/gün + 5 €/gün) |
| 2–3 | A2, B1/B2 açılır; kreatif A/B (statik vs Reels) |
| 4 | İlk optimizasyon: CPL > 35 € olan ad set durdur; kazanan kreatifleri ölçekle |
| 5–8 | B3 DPA (retargeting havuzu ≥ 1.000), C1/C2; lookalike testi |
| 9–12 | DE geneline genişleme (A1/A2), bütçe kazananlara %70 |

## 7. Marketing API ile otomasyon (token gelince)

- `GET /act_{id}/insights?fields=campaign_name,spend,impressions,clicks,ctr,cpc,actions&level=adset&date_preset=last_30d`
- Haftalık rapor → `docs/ads/DURUM.md` (ads-agent kalıbı); israf kuralı: CPL > 2× hedef 7 gün → durdur önerisi.
- Arama terimi verisi Meta'da yoktur; SEO'ya devir Google Ads arama terimlerinden yapılır (`ads-agent`).
