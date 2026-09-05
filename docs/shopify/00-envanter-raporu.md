# Shopify Envanter Denetimi — 24.08.2026

Kaynak: Supabase (`diamond_products`, `combisteel_products`, `handi_products`)
Üreten: `node scripts/shopify/preflight.mjs` · ham veri: `docs/shopify/envanter.json`

## Özet

- **14.259 ürün** var. **14.188'i (%99,5)** Shopify'ın zorunlu alanlarını
  (başlık + fiyat + görsel) karşılıyor.
- **13.109'u (%91,9) kargo edilebilir** — yani ağırlığı biliniyor. Ağırlığı
  olmayan 1.079 ürün için Shopify kargo ücreti hesaplayamaz.
- **Diamond, Almanca içeriğe sahip TEK kaynak (%89,8).** CombiSteel %0,1,
  HENDI %0. Pilotun Diamond olması bu yüzden doğru karar.
- **HENDI'nin 3.790 barkodunun tamamı bozuk** — hepsi aynı değeri taşıyor:
  `"8,71137E+12"`. Kullanılamaz.
- **Diamond'da stok verisi hiç yok** (6.908 kaydın tamamında boş). Envanter
  takibi açılırsa tüm katalog "tükendi" görünür.

## Kaynak karşılaştırması

| | Diamond | CombiSteel | HENDI |
|---|---|---|---|
| Toplam kayıt | 6.908 | 3.561 | 3.790 |
| Shopify'a uygun | **6.849** (%99,1) | 3.549 (%99,7) | 3.790 (%100) |
| Kargo edilebilir | 5.998 (%86,8) | 3.321 (%93,3) | 3.790 (%100) |
| Medyan fiyat (brüt) | **1.757,63 €** | 850,85 € | 19,93 € |
| Fiyat aralığı (net) | 1 – 58.317 € | 4 – 38.265 € | 0,60 – 7.595 € |
| Almanca metin | **%89,8** | %0,1 | %0 |
| Geçerli barkod | %0 | **%88,8** | %0 |
| Açıklama | %89,0 | %87,2 | %85,3 |
| Kategori | %71,1 | %90,4 | %99,8 |
| Ölçü (en×boy) | %83,3 | **%0,4** | %99,8 |
| Stok | **%0** | %63,0 | %97,2 |
| Mükerrer SKU | 0 | 0 | 0 |
| Handle çakışması | 0 | 0 | 0 |

**Okuma:** Hiçbir kaynak tek başına "hazır" değil. HENDI teknik olarak en temiz
(%100 uygun, %100 kargo edilebilir) ama içeriği tamamen İngilizce ve barkodları
bozuk. Diamond içerik olarak en hazır ve **ciro potansiyeli 88 kat yüksek**
(medyan 1.758 € vs 20 €), teknik boşlukları ise kapatılabilir cinsten.

## Riskler

### P0 — Yayın öncesi çözülmeli

**1. Diamond'da stok verisi yok (6.908/6.908 boş)**
`stock` sütunu tüm kayıtlarda `""`. Shopify'da envanter takibi açık olursa
katalogun tamamı "ausverkauft" görünür ve hiçbir sipariş alınamaz.
→ *Çözüm:* Diamond için `inventoryItem.tracked = false` +
`inventoryPolicy = CONTINUE`. Senkron script'inde uygulandı. Ürünler "siparişe
göre / Lieferzeit auf Anfrage" mantığıyla satılır.

**2. HENDI barkodlarının tamamı bozuk (3.790/3.790)**
Tüm satırlarda aynı değer var: `"8,71137E+12"`. Excel/CSV dışa aktarımında
sütun bilimsel gösterime düşmüş ve her kayıt aynı yuvarlanmış metne çökmüş.
Gerçek EAN'lar kaybolmuş — geri döndürülemez, tedarikçiden yeniden alınmalı.
→ *Çözüm:* Senkron bunları yazmıyor (`validEan` eliyor). Barkodsuz gitmek
Shopify'da sorun değil; Google Shopping kanalında ürünler reddedilebilir.

**3. Ürün metinleri Alman vitrinine uygun değil**
CombiSteel: 630 Hollandaca, 844 İngilizce. HENDI: 2.685 İngilizce.
→ *Çözüm:* Bu iki markayı yayına almadan önce çeviri şart (`translator` ajanı).
Diamond pilotunu etkilemez.

### P1 — Kaliteyi ciddi düşürür

**4. Diamond kategorileri Supabase'de kullanılamaz**
`product_family_name` sütunu müşteriye gösterilemeyecek Fransızca üretim
tanımları içeriyor: *"Livrées en Kit / Démont. A / dos"*, *"Soudés / With
dosseret"*.
→ *Çözüm:* Kategori `products.json`'daki `sub` alanından alınıyor
("Vitrinen-Theken", "Pizzaöfen", "Eiswürfelbereiter"). Senkronda uygulandı.

**5. Diamond görselleri düşük çözünürlük geliyordu**
`image_full` / `image_big` / `image_gallery` sütunları **6.908 kaydın tamamında
boş**; yalnızca `image_thumb` dolu (~20 KB).
→ *Çözüm:* CDN'de büyük varyant duruyor. `-thumb.jpg` → `-big.jpg` türetmesi
doğrulandı (HTTP 200, ~70 KB). Senkronda uygulandı. `-full.jpg` 403 verir,
kullanılmıyor.

**6. CombiSteel'de ölçü verisi yok (%0,4 — 3.561 üründen yalnız 14'ü)**
Hacimli kargo (Sperrgut) fiyatlaması ölçü ister. Ağırlık var (%93,5), ölçü yok.
→ *Çözüm:* Kargo tarifesini ağırlık üzerinden kur; CombiSteel genişlemesinden
önce tedarikçiden ölçü çek.

### P2 — Takip edilmeli

**7. Diamond'ın 1.999 ürününde kategori yok (%28,9)** → koleksiyonlara düşmez,
yalnız aramayla bulunur.
**8. Diamond'ın 852 ürününde ağırlık yok (%12,3)** → bunlar için kargo
hesaplanamaz; "Versand auf Anfrage" ile işaretlenmeli.
**9. CombiSteel'de 1 mükerrer barkod** (3.162 geçerli, 3.161 benzersiz) →
Shopify mükerrer barkodu reddedebilir.
**10. Diamond'ın 54 kaydında başlık, 4'ünde görsel, 1'inde fiyat yok** →
senkron bunları atlıyor (toplam 59 ürün).

## Fiyat politikası — dikkat

Onaylanan karar: Shopify'a **brüt (%19 KDV dahil)** fiyat yazılır.
Örnek: Diamond medyanı net **1.477,00 €** → **1.757,63 €**.

Site ise B2B mantığıyla **net** gösteriyor (`zzgl. MwSt.` —
[pricing.ts:69](../../src/lib/pricing.ts#L69)). Yani **aynı ürün iki kanalda
farklı rakam gösterecek.** Shopify vitrini son tüketiciye (B2C) dönük olduğu
için bu doğru bir tercih, ama müşteri her iki kanalı da görürse kafa karışıklığı
yaratır. Vitrinde "inkl. MwSt." ibaresi net olmalı.

## Sonraki adım

Diamond pilotu için veri tarafında **engel yok** — 6.849 ürün yüklenmeye hazır.
Sıradaki iş **mağazanın kurulması ve Admin API token'ının üretilmesi**:
[01-magaza-kurulum-rehberi.md](01-magaza-kurulum-rehberi.md).
