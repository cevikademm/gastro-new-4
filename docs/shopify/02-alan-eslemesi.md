# Alan Eşlemesi — Kaynak → Shopify

Uygulayan: `scripts/shopify/sync-products.mjs` · yardımcılar: `scripts/shopify/lib.mjs`

## Kaynak neden tek değil

Diamond için **iki kaynak birleştiriliyor** — çünkü ikisi de tek başına yetersiz:

| Ne lazım | Nerede var | Nerede yok |
|---|---|---|
| Almanca başlık + açıklama | `src/data/products.json` | Supabase (İngilizce) |
| Ağırlık, ölçü, güç (kW) | Supabase `diamond_products` | products.json |
| Müşteriye dönük kategori | products.json `sub` | Supabase (Fransızca) |
| Görsel | Supabase `image_thumb` (türetilerek) | products.json (eski URL'ler) |

Birleştirme anahtarı: **ürün `id`'si**.

> **Kalıcı çözüm:** `scripts/diamond-sync.mjs`'i `DIAMOND_LANGUAGE=de` ile
> yeniden çalıştırmak. `.env`'de şu an `tr` yazıyor ve Diamond API bunu
> karşılayamayıp İngilizce'ye düşmüş. Almanca sync yapılırsa products.json
> birleştirmesine gerek kalmaz. Bu iş Diamond API kimlik bilgisi gerektirir.

CombiSteel ve HENDI tek kaynaklı (kendi Supabase tabloları) — ama metinleri
Almanca değil, çeviri şart.

## Eşleme tablosu

| Shopify alanı | Diamond | CombiSteel | HENDI |
|---|---|---|---|
| `handle` | `slugify(başlık)-slugify(id)` | aynı | aynı |
| `title` | products.json `name` → yoksa Supabase `name` | `title` | `name` |
| `descriptionHtml` | products.json `desc` + `description_tech_spec` + `popup_info` | `description` + `long_description` | `description` + `short_desc` |
| `vendor` | `Diamond` | `CombiSteel` | `HENDI` |
| `productType` | products.json `sub` (onarılmış) | `category_name` | `category_name` / `sub_category` |
| `tags` | marka + Almanca kategori + `line` + Angebot | marka | marka + alt kategori + renk + malzeme |
| `status` | `DRAFT` (varsayılan) | aynı | aynı |
| `variants[0].sku` | `id` | `sku` | `id` |
| `variants[0].price` | **brüt** = `price_display ?? price_catalog` × 1,19 | `price` × 1,19 | `price` × 1,19 |
| `compareAtPrice` | `price_catalog` × 1,19 (katalog > satış ise) | — | — |
| `barcode` | yok | `ean` (**doğrulanmış**) | yok (bozuk veri elenir) |
| `weight` | `weight` kg | `gross_weight ?? net_weight` | `gross_weight ?? net_weight` |
| `inventoryItem.tracked` | **`false`** | `true` | `true` |
| `inventoryPolicy` | **`CONTINUE`** | `DENY` | `DENY` |
| `files` | `image_thumb` → `-big.jpg` türetilir | `image_url` + `extra_images` | `image_url` |
| `metafields` (`custom`) | `laenge_mm`, `breite_mm`, `hoehe_mm`, `leistung_kw` | ölçüler | ölçüler |

## Kural gerekçeleri

**Fiyat — tek yuvarlama noktası.**
`Math.round(net × 1,19 × 100) / 100`. İki kez yuvarlamak kuruş kaydırır.
Doğrulama: net **1.477,00 €** → brüt **1.757,63 €**.

**Handle — idempotanlığın anahtarı.**
`slugify(başlık)-slugify(id)`. Sonuna `id` eklenir çünkü aynı isimli ürünler
var ("Arbeitstisch mit Unterboden" 3 kez geçiyor). `productSet` bu handle'ı
kimlik olarak kullanır: ikinci çalıştırma **günceller**, yeni ürün yaratmaz.
Denetimde 3 kaynakta da **0 handle çakışması** ölçüldü.

**Diamond'da envanter takibi KAPALI.**
`stock` sütunu 6.908 kaydın tamamında boş. Takip açık olsa Shopify hepsini
"ausverkauft" gösterirdi. `tracked: false` + `CONTINUE` ile ürünler siparişe
açık kalır.

**Diamond görselinde `-big` türetmesi.**
`image_full`/`image_big`/`image_gallery` tüm kayıtlarda boş; yalnız
`image_thumb` dolu. CDN'de büyük varyantın var olduğu doğrulandı:
`-thumb.jpg` → `-big.jpg` = HTTP 200, ~70 KB (thumb ~20 KB).
`-full.jpg` **403** verir, kullanılmaz.

**Kategori Supabase'den DEĞİL.**
`product_family_name` Fransızca üretim tanımı taşıyor —
*"Livrées en Kit / Démont. A / dos"*, *"Soudés / With dosseret"*. Bunun yerine
products.json `sub` kullanılır ve umlaut bozuklukları onarılır
(`Khl- und Gefriertische` → `Kühl- und Gefriertische`).

**Etiketlerde ham id yok.**
`product_line_id` sayısal iç id ("24157") — müşteriye anlamsız. Yerine
products.json `line` ("DISMOUNTABLE LINE", "ACTIVE WASH") ve Almanca kategori
etiketi kullanılır.

**Barkod doğrulanır, kopyalanmaz.**
`validEan()` bilimsel gösterimi ve 8/12/13/14 hane dışındakileri eler.
HENDI'nin 3.790 barkodu bu filtreden geçemiyor (hepsi `"8,71137E+12"`).
Bozuk barkod yazmak Google kanalında toplu redde yol açar.

## Örnek payload (dry-run çıktısı)

```
handle      : arbeitstisch-mit-unterboden-hinterkante-tl2071d
title       : Arbeitstisch mit Unterboden + Hinterkante
vendor/type : Diamond / Edelstahltische mit Grundboden
SKU         : TL2071D
fiyat       : 1062.67 EUR  (brüt, %19 KDV dahil)
ağırlık     : 51 kg
envanter    : tracked=false  policy=CONTINUE
barkod      : (yok)
görsel      : 1 adet  https://diamond-eu-prod.s3.../001-TL2071D-big.jpg
etiket      : Diamond, Vorbereitung & Hygiene, STANDARD LINE
metafield   : laenge_mm=2000 breite_mm=700
```

Kendin üretmek için:

```bash
node scripts/shopify/sync-products.mjs --brand diamond --dry-run --limit 5
node scripts/shopify/sync-products.mjs --brand diamond --dry-run --limit 50 --json /tmp/payload.json
```

## Atlanan ürünler

Senkron, zorunlu alanı eksik olanı **sessizce geçmez, sayar**:

| Kaynak | Atlanan | Neden |
|---|---|---|
| Diamond | 59 | başlık yok 54 · görsel yok 4 · fiyat yok 1 |
| CombiSteel | 12 | görsel yok |
| HENDI | 0 | — |

## Ölçek notu

Pilot (50 ürün) tek tek `productSet` çağrısıyla yazılır — yeterli.
**Tam Diamond senkronu (6.849 ürün) için bu yöntem uygun değil:** cost-based
rate limit'e takılır ve saatler sürer. F4'te `bulkOperationRunMutation` +
`stagedUploadsCreate` (JSONL) yoluna geçilecek; imzaları o aşamada güncel
Shopify dokümanından doğrulanmalı.
