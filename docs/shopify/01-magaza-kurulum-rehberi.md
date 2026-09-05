# Shopify Mağaza Kurulum Rehberi — 2MC Gastro

Bu rehber, mağaza **henüz yokken** sıfırdan kurulumu anlatır. Sırayla uygula;
her adımın sonunda ne görmen gerektiği yazıyor. Ürün yüklemesi **Adım 8'den
sonra** başlar.

> Bu adımların hiçbirini ajan senin yerine yapamaz — Shopify hesabı açmak,
> ödeme yöntemi girmek ve token üretmek senin elinle olmalı.

---

## Adım 1 — Hesap ve plan

1. [shopify.com/de](https://www.shopify.com/de) → **Kostenlos testen**
2. Mağaza adı: `2mc-gastro` (bu `2mc-gastro.myshopify.com` olur — teknik adres,
   müşteri görmez)
3. Ülke: **Deutschland**, para birimi: **EUR**

**Plan seçimi:** 6.849 ürün için ürün sayısı limiti sorun değil (Shopify'da ürün
limiti yok). Belirleyici olan **işlem komisyonu** ve **personel hesabı sayısı**.
Güncel fiyatları [shopify.com/de/preise](https://www.shopify.com/de/preise)
üzerinden teyit et — bu rehber fiyat yazmıyor çünkü sık değişiyor.

> Yıllık ödeme genelde belirgin indirim sağlar; ama önce 3 aylık deneme ile
> pilotu tamamla, planı sonra sabitle.

---

## Adım 2 — Alan adı (domain) — DİKKAT

**`www.2mcgastro.de` adresini Shopify'a YÖNLENDİRME.** Ana alan adı mevcut React
uygulamasına ait (Vercel'de). Shopify'a taşırsan mevcut site, tasarım aracı,
teklif sistemi ve tüm SEO çalışması kırılır.

Doğru kurulum:

| Adres | Nerede çalışır |
|---|---|
| `www.2mcgastro.de` | Mevcut uygulama (Vercel) — **değişmez** |
| `shop.2mcgastro.de` | Yeni Shopify mağazası |

**Shopify'da:** Settings → Domains → Connect existing domain → `shop.2mcgastro.de`
**DNS sağlayıcında:** `shop` için bir `CNAME` kaydı → `shops.myshopify.com`

Shopify sana kesin kaydı ekranda gösterir; oradaki değeri kullan.

---

## Adım 3 — Vergi (KDV) ayarları

Settings → **Taxes and duties** → Germany

- [x] **Include tax in prices** — AÇIK
  (Fiyatlar KDV dahil gösterilir. Almanya'da B2C için zorunlu beklentidir ve
  aldığımız karar bu yönde.)
- [x] **Charge tax on shipping rates** — AÇIK (Almanya'da kargoya da KDV uygulanır)
- KDV oranı: **%19** (standart oran)

**Kritik:** Ürünler mağazaya **brüt fiyatla** yazılıyor
(net × 1,19). "Include tax in prices" kapalı olursa fiyatların üstüne bir kez
daha KDV binecek ve **her ürün %19 pahalı** görünecek.

> Kleinunternehmerregelung (§19 UStG) **kullanılmıyor** — 2MC Gastro KDV mükellefi.
> Umsatzsteuer-ID'yi Settings → Store details bölümüne gir.

---

## Adım 4 — Kargo (Versand)

Settings → Shipping and delivery

Ürünlerin **ağırlığı Supabase'den geliyor** ve senkronda Shopify'a yazılıyor
(Diamond'ın %86,8'inde, HENDI'nin %100'ünde ağırlık var). Bu yüzden
**ağırlık kademeli tarife** kurabilirsin:

| Ağırlık | Öneri |
|---|---|
| 0 – 2 kg | Paket fiyatı |
| 2 – 31,5 kg | Paket fiyatı (DHL üst sınırı 31,5 kg) |
| 31,5 kg üstü | **Spedition / Sperrgut** — sabit ücret veya "Preis auf Anfrage" |

**Neden önemli:** Diamond'ın medyan ürünü endüstriyel cihaz — örneklerde
51 kg, 61 kg, 75 kg ağırlıklar var. Bunlar normal kargoya girmez, **palet
taşıma** gerektirir. Tek bir düz kargo ücreti koyarsan her satışta zarar edersin.

**Ağırlığı olmayan 852 Diamond ürünü için:** ayrı bir kargo profili aç ve
"Versandkosten auf Anfrage" olarak işaretle.

---

## Adım 5 — Yasal sayfalar (Almanya'da ZORUNLU)

Almanya'da bu sayfalar eksik veya hatalıysa **Abmahnung** (ücretli ihtarname)
riski gerçektir ve rakip firmalar bunu takip eder. Settings → Policies:

- [ ] **Impressum** — § 5 TMG. Şirket unvanı, adres, telefon, e-posta, yetkili
      kişi, Handelsregister no, USt-IdNr.
- [ ] **Datenschutzerklärung** — DSGVO/GDPR
- [ ] **AGB** (Allgemeine Geschäftsbedingungen)
- [ ] **Widerrufsbelehrung** + Widerrufsformular — 14 günlük cayma hakkı
- [ ] **Versand- und Zahlungsbedingungen** — teslim süresi ve kargo ücretleri
- [ ] Cookie-Banner (DSGVO onayı)

Mevcut sitedeki metinler yeniden kullanılabilir:
[src/pages/](../../src/pages/) altındaki yasal sayfalara ve
[src/lib/companyInfo.ts](../../src/lib/companyInfo.ts) dosyasına bak.

> **B2B satıyorsan** cayma hakkı tüketiciler için geçerlidir, ticari alıcılar
> için değil — AGB'de bunu ayır. Emin değilsen Alman e-ticaret hukukçusuna
> okut; bu rehber hukuki tavsiye değildir.

---

## Adım 6 — Ödeme

Settings → Payments

- **Shopify Payments** (varsa) veya **PayPal** + **Kauf auf Rechnung**
- Almanya B2B'de **Rechnung (fatura ile ödeme)** ve **SEPA-Lastschrift**
  beklenen yöntemlerdir; sadece kredi kartı sunmak dönüşümü düşürür.
- Mevcut uygulamada Stripe zaten kurulu ([src/lib/stripe.ts](../../src/lib/stripe.ts))
  ama **Shopify ayrı bir sistemdir** — oradaki yapılandırma buraya geçmez.

---

## Adım 7 — Konum (Location)

Settings → Locations → depo adresini gir.
Bu adres kargo ücreti ve vergi hesabının çıkış noktasıdır.

Location ID'yi not et — `.env` içine yazacaksın. Bulmak için:
Settings → Locations → ilgili konuma tıkla → tarayıcı adres çubuğundaki sayı.

---

## Adım 8 — Admin API token (custom app)

Ürün senkronu bu token olmadan çalışmaz.

1. Settings → **Apps and sales channels**
2. → **Develop apps** → *(ilk kez ise)* **Allow custom app development**
3. → **Create an app** → ad: `2MC Produkt-Sync`
4. → **Configure Admin API scopes** → şunları işaretle:

   | Scope | Ne için |
   |---|---|
   | `write_products` | Ürün yazma/güncelleme |
   | `read_products` | Doğrulama, idempotanlık kontrolü |
   | `write_inventory` | Stok miktarı (HENDI/CombiSteel) |
   | `read_inventory` | Stok okuma |
   | `read_locations` | Konum ID'si |

5. → **Save** → **Install app**
6. → **Admin API access token** → **Reveal token once** → kopyala

> Token **bir kez** gösterilir. Kaybedersen yeni token üretmen gerekir.

---

## Adım 9 — Token'ı projeye tanıt

`.env` dosyasını aç (proje kökünde) ve şu dört satırı ekle:

```
SHOPIFY_STORE_DOMAIN=2mc-gastro.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_buraya_kopyaladigin_token
SHOPIFY_API_VERSION=2026-07
SHOPIFY_LOCATION_ID=gid://shopify/Location/123456789
```

- `SHOPIFY_STORE_DOMAIN` → `.myshopify.com` adresi (kendi domainin değil)
- `SHOPIFY_API_VERSION` → `2026-07` bugün geçerli stable sürüm. Shopify her
  çeyrekte yeni sürüm çıkarır (1 Oca / 1 Nis / 1 Tem / 1 Eki); bir sonraki
  **2026-10**, 1 Ekim 2026'da gelir.

**`.env` git'e gitmez** (`.gitignore` kapsıyor). Token'ı hiçbir yere yapıştırma,
ekran görüntüsüne alma, mesajla gönderme.

---

## Adım 10 — Bağlantıyı doğrula

```bash
npm run shopify:dry
```

Bu komut **mağazaya bağlanmaz**, yalnızca gönderilecek veriyi gösterir.
Fiyatların brüt olduğunu gözle doğrula (örn. net 1.477 € → **1.757,63 €**).

Sonra pilot yazma (50 ürün, hepsi taslak olarak):

```bash
node scripts/shopify/sync-products.mjs --brand diamond --live --limit 50
```

**Ardından mutlaka aynı komutu bir kez daha çalıştır.** Mağazadaki ürün sayısı
**50'de kalmalı** — artıyorsa idempotanlık bozuk demektir, dur ve haber ver.

---

## Kontrol listesi

- [ ] Mağaza açıldı, para birimi EUR
- [ ] `shop.2mcgastro.de` bağlandı — **ana domain'e dokunulmadı**
- [ ] KDV %19, "Include tax in prices" **açık**
- [ ] Ağırlık kademeli kargo tarifesi kuruldu, 31,5 kg üstü ayrıldı
- [ ] 5 yasal sayfa yayında
- [ ] Ödeme yöntemi aktif (Rechnung/SEPA dahil)
- [ ] Location tanımlı, ID not edildi
- [ ] Custom app kuruldu, 5 scope verildi, token alındı
- [ ] `.env` dolduruldu
- [ ] `npm run shopify:dry` çalıştı, fiyatlar brüt görünüyor
