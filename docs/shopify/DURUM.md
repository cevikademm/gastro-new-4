# Shopify Entegrasyonu — DURUM

> `shopify-agent` her çalıştırmada **önce bu dosyayı okur** ve kaldığı fazdan
> devam eder. Sıfırdan başlamaz. Faz bitince burayı günceller.

**Son güncelleme:** 24.08.2026
**Aktif faz:** F2 tamamlandı → **F3 bekliyor** (mağaza + token gerekiyor)

## Onaylanan kararlar

| Konu | Karar |
|---|---|
| Mağaza | Henüz **yok**, kurulacak |
| Aktarım | **Admin GraphQL API** (`productSet`) |
| Pilot kapsam | **Diamond** |
| Fiyat | **Brüt, %19 KDV dahil** |
| Ürün durumu | İlk yazımda **DRAFT** |

## Mağaza bilgileri (24.08.2026 — kuruluş)

| | |
|---|---|
| Mağaza | **2MC GASTRO** |
| Teknik adres | `dbdseb-ty.myshopify.com` (değiştirilemez) |
| Vitrin adresi (planlanan) | `shop.2mcgastro.de` — F16'da bağlanacak |
| İşletme ülkesi | Almanya — Bergisch Gladbacher Straße 172, 51063 Köln |
| Konum ID | `gid://shopify/Location/86011084939` |
| KDV | Almanya %19, **fiyata dahil**, kayıt aktif |

> `SHOPIFY_ADMIN_TOKEN` burada **tutulmaz** — yalnızca `.env` içinde durur.

## Kurulum ilerlemesi (16 adımlık rehber) — 25.08.2026

| # | Adım | Durum |
|---|---|---|
| 1 | Shopify hesabı | ✅ `dbdseb-ty.myshopify.com` |
| 2 | Mağaza/şirket bilgileri | ✅ Almanya · EUR · kg · Berlin |
| 3 | KDV | ✅ `DE365660948` · fiyata dahil · otomatik KDV faturası |
| 4 | Konum | ✅ 2MC Gastro Lager Köln · `86011084939` |
| 5 | Kargo | ⚠️ kademeler kuruldu, **iki açık iş** (aşağıda) |
| 6 | Ödeme | ⚠️ manuel havale ✅ · Shopify Payments **TEST modunda** |
| 7 | Yasal sayfalar | ⬜ **buradan devam** |
| 8–16 | Token → ürün yükleme | ⬜ |

### Adım 5 — doğrulanacak
Ağırlık kademeleri (`Standart`: 0–20 / 20–40 / 40–75 / 75+ kg →
230 / 400 / 600 / 950 €) girildi, **ama hangi bölgeye bağlandığı görülmedi.**
`Deutschland` bölgesi açıldı mı, yoksa kademeler eski `International`
(28 ülke) bölgesine mi eklendi — yarın ilk iş bunu kontrol et.
Kargo bölgesi **vergi kurulumuyla aynı olmalı**: sadece Almanya.

### Adım 6 — yayın öncesi zorunlu
- **Test modu kapatılmalı** — şu an "Ödemeler alınamıyor", gerçek para tahsil edilemez.
- **Banka hesabı (IBAN) eklenmemiş** — Shopify Payments'te "Banka hesabı ekle" uyarısı duruyor.
- PayPal kapalı bırakıldı (bilinçli — Shopify Payments aktifken tekrar değerlendirilecek).

### Takvim uyarısı
**27–28 Ağustos 2026'da ücretlendirme başlıyor.** O tarihe kadar:
- POS Pro aboneliği kapatılmalı (gerekmiyor — fiziksel kasa ürünü)
- Ana Shopify planı seçilmeli

## Faz durumu

| Faz | Durum | Çıktı |
|---|---|---|
| **F0 — Envanter denetimi** | ✅ tamam | [00-envanter-raporu.md](00-envanter-raporu.md) · `envanter.json` |
| **F1 — Mağaza kurulum rehberi** | ✅ tamam | [01-magaza-kurulum-rehberi.md](01-magaza-kurulum-rehberi.md) |
| **F2 — Alan eşlemesi + dry-run** | ✅ tamam | [02-alan-eslemesi.md](02-alan-eslemesi.md) |
| **F3 — Pilot yazma (50 ürün, DRAFT)** | ⏸ **beklemede** | mağaza + `SHOPIFY_ADMIN_TOKEN` yok |
| **F4 — Tam Diamond (6.849 ürün)** | ⬜ başlamadı | bulk operation gerekir |
| **F5 — Doğrulama + genişleme** | ⬜ başlamadı | HENDI/CombiSteel çeviri ön koşullu |

## F3'ü başlatmak için gereken (kullanıcıda)

1. Shopify mağazası açılmalı → [rehber Adım 1](01-magaza-kurulum-rehberi.md)
2. Custom app + Admin API token → [rehber Adım 8](01-magaza-kurulum-rehberi.md)
3. `.env`'e 4 satır eklenmeli → [rehber Adım 9](01-magaza-kurulum-rehberi.md)

Sonra:
```bash
node scripts/shopify/sync-products.mjs --brand diamond --live --limit 50
# ardından AYNI komutu tekrar çalıştır — ürün sayısı 50'de KALMALI
```

## Ölçülen rakamlar (24.08.2026)

| | Diamond | CombiSteel | HENDI |
|---|---|---|---|
| Toplam | 6.908 | 3.561 | 3.790 |
| Yüklenebilir | 6.849 | 3.549 | 3.790 |
| Kargo edilebilir | 5.998 | 3.321 | 3.790 |
| Almanca metin | %89,8 | %0,1 | %0 |
| Geçerli barkod | 0 | 3.162 | **0 (bozuk)** |
| Stok verisi | **yok** | %63,0 | %97,2 |

## Açık işler — kargo (yayına almadan önce)

**0–20 kg kargo bandı çok pahalı.** Kademeler kuruldu (230 / 400 / 600 / 950 €,
ağırlığa göre, KDV dahil) ama alt bant tek parça:

| Kademe | Diamond ürünü | Kargo / fiyat (medyan) | En kötü |
|---|---|---|---|
| **0–20 kg** | **1.778** | **%69** | %19.328 |
| 20–40 kg | 710 | %33 | %282 |
| 40–75 kg | 1.028 | %29 | %191 |
| 75 kg + | 2.482 | %16 | %128 |

Ağır bantlar makul. Alt bantta 0,3 kg'lık conta ile 19 kg'lık tezgâh aynı 230 €'yu
ödüyor → o ürünler satılamaz. **Öneri:** 0–2 / 2–10 / 10–20 kg diye üçe böl.
HENDI eklenirse zorunlu (medyan fiyat 19,93 €, çoğu 1 kg altı).

**Ağırlıksız 851 Diamond ürünü** Shopify'da 0 kg sayılır → en ucuz banda düşer.
Pilotta bunlar yüklenmeyecek.

## Açık işler (F5 öncesi)

- [ ] **HENDI + CombiSteel çevirisi** — 630 NL + 3.529 EN metin. `translator` ajanı.
- [ ] **HENDI barkodları** tedarikçiden yeniden alınmalı (mevcut veri kurtarılamaz).
- [ ] **CombiSteel ölçüleri** — 3.561 üründen yalnız 14'ünde var.
- [ ] **Diamond Almanca sync** — `DIAMOND_LANGUAGE=de` ile `diamond-sync.mjs`
      yeniden çalıştırılırsa products.json birleştirmesine gerek kalmaz.
- [ ] **CombiSteel'de 1 mükerrer barkod** bulunup düzeltilmeli.
- [ ] F4 öncesi `bulkOperationRunMutation` imzası güncel dokümandan doğrulanmalı.

## Notlar

- `SHOPIFY_API_VERSION=2026-07` — 24.08.2026 itibarıyla güncel stable.
  Bir sonraki sürüm **2026-10**, 1 Ekim 2026'da çıkar.
- Ajan tanımı `.claude/agents/shopify-agent.md` — `.claude/` gitignore'da
  olduğu için bu dosya **repoya girmez**, yereldir (mevcut seo/ads/geo
  ajanlarıyla aynı düzen).
- Uygulama kodu (`src/**`) bu iş kapsamında **değiştirilmedi**.
