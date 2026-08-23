# GEO Ajanı — Durum Dosyası

> Bu dosya `geo-agent` ajanının oturumlar arası hafızasıdır. Ajan her çalıştığında
> **önce burayı okur**, "Sıradaki adım"dan devam eder ve iş bitiminde burayı günceller.

| | |
|---|---|
| **Proje** | 2MC Gastro |
| **Canonical URL** | https://www.2mcgastro.de |
| **Domain** | `2mcgastro.de` → 308 → `www.2mcgastro.de` (doğru). `2mcgastro.com` **BİZE AİT DEĞİL** — 301 ile `2mcgastro.eu`'ya gider, SEO alanlarında asla kullanılmaz. |
| **Aşama** | Faz 1 tamamlandı — **deploy bekliyor** |
| **Son ölçülen skor** | 57/100 (temel) — 2026-08-08, canlı site, düzeltmeler ÖNCESİ |
| **Son güncelleme** | 2026-08-08 |
| **CLI** | geo-optimizer-skill 4.16.0 |

---

## Sıradaki adım

1. **Deploy et** — `npx vercel --prod --yes`. Bu ajanın yazdığı hiçbir düzeltme henüz
   canlıda değil; `geo audit` canlı siteyi ölçtüğü için deploy edilmeden skor değişmez.
2. Deploy sonrası **yeniden ölç ve kanıtla**:
   ```bash
   PYTHONIOENCODING=utf-8 geo audit --url https://www.2mcgastro.de --save-history
   PYTHONIOENCODING=utf-8 geo history --url https://www.2mcgastro.de
   ```
3. **Google Search Console:** yeni sitemap'i (`https://www.2mcgastro.de/sitemap.xml`)
   gönder. Eski `.com` sitemap'i kayıtlıysa kaldır ve `www.2mcgastro.de` mülkünde
   yeniden indeksleme talep et — canlı sayfalar aylardır kendini `2mcgastro.com`
   olarak etiketliyordu.

   > **Yönlendirmeler zaten doğru, duplike içerik sorunu YOK** (2026-08-08 doğrulandı):
   > `2mcgastro.de` → 308 → `www.2mcgastro.de`, `www.2mcgastro.de` → 200.
   > Asıl sorun buydu: canlı `index.html` canonical/hreflang/OG ve sitemap'te
   > `2mcgastro.com` yazıyordu; o adres **301 ile `2mcgastro.eu`'ya** (bize ait olmayan
   > bir siteye) gidiyor. Yani arama motorlarına "bu sayfanın aslı başka bir sitede"
   > denmiş oluyordu. Kodda düzeltildi, **deploy bekliyor**.
   > Not: `curl -L` ile test etme — yönlendirmeyi takip edip 200 gösterir ve yanıltır.
5. Kalan puan kalemleri için aşağıdaki "Açık işler" listesine bak.

---

## Tamamlananlar (2026-08-08)

### Yeni dosyalar
- `public/llms.txt` — llmstxt.org yapısında (H1 → blockquote → H2 + açıklamalı linkler);
  künye, katalog, kategoriler, sektörler, planlama araçları, rehberler, makine-okur kaynaklar.
- `public/.well-known/ai.txt` — kurum künyesi, alıntı izni, atıf zorunluluğu, kaynak linkleri.
- `public/ai/summary.json` — Organization + knowsAbout + keyFacts + citationPolicy.
- `public/ai/faq.json` — 8 soruluk FAQPage.
- `public/ai/service.json` — 6 hizmetin Service listesi.

> **Neden önemliydi:** bu dört yol daha önce de 200 dönüyordu ama içerikleri
> `index.html`'di. `vercel.json`'daki `/(.*) → /index.html` rewrite'ı yüzünden **var
> olmayan her yol 200 + HTML döner** (soft-404). `curl -o /dev/null -w "%{http_code}"`
> ile test etmek yanıltıcıdır — içeriğe bakmak gerekir.

### `index.html`
- **AI botları için ham HTML içeriği eklendi** (`#root` içine): H1 + 6 adet H2/H3, ~600
  kelime, iç linkler, SSS ve iletişim bloğu. React `createRoot` ilk render'da bu düğümleri
  değiştirir → kullanıcı görmez, AI botları görür. **Katalog bilgisi değişirse burası da
  güncellenmeli.**
- `FAQPage` JSON-LD eklendi (7 soru) — mevcut Organization / LocalBusiness / WebSite'a ek.
- `<link rel="alternate" type="application/rss+xml">` ve `llms.txt` link'i eklendi
  (RSS `/rss.xml` zaten çalışıyordu ama `<head>`'de duyurulmuyordu).
- **Yanlış istatistikler düzeltildi:** "6.800+ ekipman / 50+ marka" → "14.000+ ekipman /
  Diamond, CombiSteel, HENDI". Doğrulama: `src/data/products.json` = **14.315 ürün**.
  Eski rakamlar `/brand` sayfasındaki "14.000+" ile çelişiyordu; çelişkili kurum bilgisi
  AI'ların entity çıkarımını bozar.

### `public/robots.txt`
- Eksik **alıntı botları** eklendi: `Claude-SearchBot`, `Claude-User`, `Perplexity-User`.
- Botlar sağlayıcıya göre gruplandı, alıntı-vs-eğitim ayrımı yorum olarak yazıldı.

### `public/sitemap.xml`
- `npm run sitemap` ile yeniden üretildi — 442 URL, tamamı `www.2mcgastro.de`.

---

## Bu projede uyulacak kurallar

- **Bu bölüm skill'in genel kurallarını ezer.**
- Canonical domain **her zaman** `https://www.2mcgastro.de`. `2mcgastro.com` SEO
  alanlarında kullanılmaz (`src/lib/seo.ts` başındaki nota bak).
- Site SPA — **AI botları JS çalıştırmaz**. Her yeni ana içerik `index.html` içindeki
  statik bloğa da yansıtılmalı.
- `public/` altına yazılan dosyalar Vercel'de rewrite'tan önce servis edilir; AI
  discovery dosyalarının doğru yeri burasıdır.
- Bir yolun gerçekten var olduğunu **içeriğine bakarak** doğrula, HTTP koduna değil.
- Ajan **commit/push yapmaz** — değişiklikleri yazar, kararı kullanıcıya bırakır.

---

## Açık işler (öncelik sırasına göre)

| # | İş | Tahmini kazanç | Not |
|---|---|---|---|
| 1 | Deploy + yeniden ölçüm | — | Yapılan işin skora yansıması için şart |
| 2 | Search Console: sitemap gönder + yeniden indeksleme | Dolaylı, büyük | Canlı canonical `2mcgastro.com`'u (→ `2mcgastro.eu`) gösteriyordu |
| 3 | `sameAs`'e Knowledge Graph sütunları | +3–4 (`brand_entity`) | LinkedIn / Wikidata / Crunchbase profili gerekiyor — **önce hesap açılmalı** |
| 4 | `sameAs` entity karışıklığı | — | Şu an Facebook/Instagram/TikTok linkleri **2mcwerbung** (kardeş marka) hesapları; Gastro'nun kendi profilleri açılmalı |
| 5 | Alt sayfalara özel statik içerik | +2–4 (`content`) | Şu an yalnızca ana sayfa ham HTML'de içerik veriyor; `/magaza`, `/kategori/*` boş |
| 6 | Gerçek prerender / SSG | +4–6 | Kalıcı çözüm; şu anki statik blok geçici köprü |
| 7 | Dış otoriter kaynak linkleri | +1–2 (`content`) | HACCP/DIN/EU mevzuat linkleri — Princeton'da en yüksek etkili yöntem (+%30–115) |
| 8 | `geo citations` ile gerçek alıntı ölçümü | — | `PERPLEXITY_API_KEY` gerekiyor; kullanıcıda yok |

---

## Ölçüm geçmişi

| Tarih | Skor | Bant | robots | llms | schema | meta | content | brand | signals | ai_disc | Not |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-08-08 | **57** | temel | 15/18 | 7/18 | 10/16 | 14/14 | 3/12 | 4/10 | 3/6 | 2/6 | Canlı site, düzeltmeler öncesi (baseline) |

> Sonraki satır deploy sonrası eklenecek. Ölçüm ham JSON'u: `geo/audit-before.json`.
