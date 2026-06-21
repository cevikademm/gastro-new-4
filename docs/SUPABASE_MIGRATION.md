# Supabase Proje Taşıma Runbook'u → `vwuqvweorjbqxcebnaym`

Tüm uygulamayı eski Supabase projesinden (`mnlgbsfarubpvkmqqvff`) **yeni** projeye
(`vwuqvweorjbqxcebnaym`) taşıma adımları. Sırayı bozmayın — şema → secret → fonksiyon → veri →
storage → frontend → entegrasyonlar → doğrulama → cutover.

> ⚠️ **Önce güvenlik:** DB şifreniz bir sohbette açık metin olarak paylaşıldı. Taşıma biter bitmez
> **Dashboard → Settings → Database → Reset database password** ile sıfırlayın.

---

## 0. Ön hazırlık

```powershell
supabase --version            # CLI kurulu olmalı (mevcut: scoop shim)
supabase login                # tarayıcı açılır
supabase link --project-ref vwuqvweorjbqxcebnaym
```

Yeni projeden şu değerleri not edin (Dashboard → Settings → API):
- `Project URL` → `https://vwuqvweorjbqxcebnaym.supabase.co`
- `anon public` key
- `service_role` key (gizli — sadece sunucu)

---

## 1. Şema (migrations 001 → 011)

Boş projede tüm migration'lar sırayla uygulanır (`011` öncekilere bağlı: profiles, katalog,
`is_admin()`, `set_updated_at()`).

```powershell
supabase db push
# Alternatif (bağlamadan, bağlantı dizesiyle):
# supabase db push --db-url "postgresql://postgres:<ŞİFRE>@db.vwuqvweorjbqxcebnaym.supabase.co:5432/postgres"
```

Doğrula: Dashboard → Table editor'da `brands, categories, products, profiles, gastro_orders,
api_keys, api_usage_counters` görünmeli.

---

## 2. Secret'lar (sunucu tarafı)

`SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` **otomatik enjekte edilir** — bunları SET ETMEYİN.
Aşağıdakileri eski projedeki değerlerle set edin:

```powershell
supabase secrets set `
  ANTHROPIC_API_KEY="..." `
  OPENAI_API_KEY="..." OPENAI_MODEL="gpt-4o-mini" `
  APIFY_API_TOKEN="..." `
  STRIPE_SECRET_KEY="..." STRIPE_WEBHOOK_SECRET="..." `
  RESEND_API_KEY="..." RESEND_FROM="2MC Gastro <noreply@2mcgastro.com>" `
  MEILI_HOST="..." MEILI_ADMIN_KEY="..." `
  DIAMOND_EMAIL="..." DIAMOND_PASSWORD="..." CRON_SECRET="..." `
  MESHY_API_KEY="..."
```

> `STRIPE_WEBHOOK_SECRET`'i şimdilik eski değerle koyun; **Adım 7'de** yeni webhook endpoint'i
> oluşturunca güncelleyeceksiniz.

---

## 3. Edge function'lar (11 adet)

```powershell
# Genel (JWT doğrulamalı)
supabase functions deploy send-email
supabase functions deploy apify-google-maps
supabase functions deploy sync-diamond
supabase functions deploy sync-meilisearch
supabase functions deploy ai-chat
supabase functions deploy content-briefer
supabase functions deploy create-payment-intent
supabase functions deploy meshy-3d
supabase functions deploy api-keys-admin

# Stripe webhook — Stripe imzası kendi içinde doğrulanır, JWT olmamalı
supabase functions deploy stripe-webhook --no-verify-jwt

# Dış API gateway — bizim API anahtarımızı kullanır, JWT olmamalı
supabase functions deploy api-gateway --no-verify-jwt

# Görsel proxy — PDF/canvas için cross-origin görsel çeker, JWT olmamalı
supabase functions deploy image-proxy --no-verify-jwt
```

> **`image-proxy` ARTIK REPODA:** Eskiden sadece `ohcytmzyjvpfsqejujzs` projesinde duruyordu ve kaynağı
> yoktu; yeniden yazıldı (`supabase/functions/image-proxy/`). Frontend'deki hardcoded URL'ler de
> `src/lib/assets.ts` üzerinden `VITE_SUPABASE_URL`'e bağlandı — artık yeni projeyi otomatik kullanır.
> Geriye yalnızca **`2mcwerbung` logo bucket'ını** yeni projeye taşımak kalıyor (Adım 5/6).

---

## 4. Veri taşıma

> 🛠️ **Hazır script:** 4b + 4c (işletme verisi + auth, doğru sırada) için
> [`scripts/migrate-data.sh`](../scripts/migrate-data.sh) hazır. `OLD_DB_URL` + `NEW_DB_URL` env
> verip `bash scripts/migrate-data.sh` ile çalıştırın. **Tek sefer çalışır; önce staging'de deneyin.**
> Aşağıdaki manuel adımlar scriptin ne yaptığını açıklar.

### 4a. Katalog (önerilen: kaynaktan yeniden senkron — kopyalamaktan temiz)
```powershell
# Diamond + CombiSteel ürünlerini kaynaktan çek (CRON_SECRET ile)
curl.exe -X POST -H "Authorization: Bearer <CRON_SECRET>" `
  "https://vwuqvweorjbqxcebnaym.supabase.co/functions/v1/sync-diamond"
# Sonra Meilisearch index'ini doldur:
curl.exe -X POST "https://vwuqvweorjbqxcebnaym.supabase.co/functions/v1/sync-meilisearch" `
  -H "Content-Type: application/json" -d '{"mode":"full"}'
```
(CombiSteel için Vercel `/api/sync-combisteel` — Vercel env'leri yeni projeye bakacak şekilde
güncellendikten sonra çalıştırın.)

### 4b. İşletme verisi (kopyalanmalı — yeniden üretilemez)
`profiles, gastro_orders, gastro_order_events, customer_searches, customer_leads, blog_posts,
product_3d_models`. `pg_dump` ile veri-only dump → yeni projeye restore:

```bash
# pg_dump/psql gerekli (CLI'de yoksa: Postgres client araçlarını kurun)
pg_dump "postgresql://postgres:<ESKİ_ŞİFRE>@db.mnlgbsfarubpvkmqqvff.supabase.co:5432/postgres" \
  --data-only --no-owner --no-privileges \
  -t public.profiles -t public.gastro_orders -t public.gastro_order_events \
  -t public.customer_searches -t public.customer_leads -t public.blog_posts \
  -t public.product_3d_models \
  > business_data.sql

psql "postgresql://postgres:<YENİ_ŞİFRE>@db.vwuqvweorjbqxcebnaym.supabase.co:5432/postgres" \
  -f business_data.sql
```
> `profiles.id` → `auth.users.id`'ye FK. Önce **4c (auth)** çalışmalı, yoksa FK ihlali olur.

### 4c. Auth kullanıcıları (hassas — şifre hash'leri korunmalı)
Hosted Supabase'de `auth` şeması `postgres` rolüyle erişilebilir. `auth.users` + `auth.identities`
tablolarını veri-only taşıyın:
```bash
pg_dump "postgresql://postgres:<ESKİ_ŞİFRE>@db.mnlgbsfarubpvkmqqvff.supabase.co:5432/postgres" \
  --data-only --no-owner -t auth.users -t auth.identities > auth_data.sql
psql "postgresql://postgres:<YENİ_ŞİFRE>@db.vwuqvweorjbqxcebnaym.supabase.co:5432/postgres" \
  -f auth_data.sql
```
> Test ortamında doğrulayın: kullanıcılar mevcut şifreleriyle giriş yapabilmeli. Sorun olursa
> alternatif: kullanıcıları davet/şifre-sıfırlama akışıyla yeniden oluşturmak. Sıra: **auth → profiles**.

---

## 5. Storage bucket'ları

Eski projedeki bucket'lar: `product-3d` (100MB, public). Yeni projede yeniden oluşturun:
```sql
-- Dashboard → SQL veya storage API
insert into storage.buckets (id, name, public, file_size_limit)
values ('product-3d','product-3d', true, 104857600)
on conflict (id) do nothing;
```
Dosyaları taşıma: küçükse Dashboard'dan elle; çoksa `rclone` veya Storage API ile kopyalayın.
3D modeller `meshy-3d` ile yeniden üretilebilir (kaynak görseller varsa).

---

## 6. `ohcytmzyjvpfsqejujzs` (image-proxy + 2mcwerbung) — ÇÖZÜLDÜ (kod tarafı)

Eskiden 6+ dosyada hardcoded'du. Artık:
- `image-proxy` fonksiyonu repoda (`supabase/functions/image-proxy/`) — Adım 3'te deploy edilir.
- Tüm URL'ler `src/lib/assets.ts` üzerinden `VITE_SUPABASE_URL`'den türüyor (`IMAGE_PROXY_URL`,
  `brandAsset()`), yani yeni proje otomatik kullanılır. Gerekirse `VITE_IMAGE_PROXY_URL` /
  `VITE_BRAND_ASSETS_URL` ile override edilebilir.

**Kalan tek iş:** `2mcwerbung` bucket'ındaki logoları (`logo4.png`, `logo_werbung.png`) yeni projeye
kopyalamak:
```sql
insert into storage.buckets (id, name, public)
values ('2mcwerbung','2mcwerbung', true) on conflict (id) do nothing;
```
Sonra `logo4.png` + `logo_werbung.png` dosyalarını yeni bucket'a yükleyin (Dashboard veya Storage API).
Yüklemezseniz PDF logoları/marka sayfası görselleri boş çıkar (uygulama çökmez).

---

## 7. Dış entegrasyonlar (repoint)

- **Stripe webhook:** Dashboard → Developers → Webhooks → yeni endpoint:
  `https://vwuqvweorjbqxcebnaym.supabase.co/functions/v1/stripe-webhook`. Yeni signing secret'ı alıp
  `supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."` ile güncelleyin, fonksiyonu yeniden deploy edin.
- **Google OAuth:** Yeni projenin Auth → Providers → Google'ı yapılandırın; Google Cloud Console'da
  redirect URI olarak `https://vwuqvweorjbqxcebnaym.supabase.co/auth/v1/callback` ekleyin.
- **Auth URL'leri:** Auth → URL Configuration → Site URL + Redirect URLs (prod + localhost) ekleyin.
- **Cron'lar:** `sync-diamond` her 3 saatte bir çalışıyordu. Yeni projede `pg_cron`/Scheduled Functions
  ile tekrar kurun. Vercel cron'ları (`vercel.json` → `/api/sync-*`) Vercel env'i yeni projeye bakınca çalışır.
- **Meilisearch:** Adım 4a'daki full sync ile index'i doldurun.

---

## 8. Frontend env (`.env` + Vercel)

```dotenv
VITE_SUPABASE_URL=https://vwuqvweorjbqxcebnaym.supabase.co
VITE_SUPABASE_ANON_KEY=<yeni anon key>
```
Diğer `VITE_*` (Stripe public, PostHog, Meili search key, GA, Clarity) aynı kalabilir ama Meili
search key yeni Meili index'ine uygun olmalı. **Vercel → Project → Settings → Environment Variables**
içinde de aynısını güncelleyin. Adım 6'yı taşıdıysanız hardcoded `ohcytmzyjvpfsqejujzs` URL'lerini
de değiştirin.

---

## 9. Doğrulama (smoke test)

1. `npm run dev` → giriş yap (taşınan bir kullanıcıyla) → katalog, sepet, sipariş listesi yükleniyor mu?
2. **Dış API:** `/account/api-keys`'ten anahtar üret →
   `curl.exe -H "Authorization: Bearer 2mc_live_..." ".../functions/v1/api-gateway/v1/products?limit=3"`
   → 200 + `X-RateLimit-*`. `/developers/api` Swagger açılıyor mu?
3. Test ödemesi (Stripe test kart) → webhook sipariş durumunu güncelliyor mu?
4. E-posta (send-email), AI chat, müşteri bulma (apify) → çalışıyor mu?

---

## 10. Cutover & rollback

- DNS/Vercel prod env'lerini son anda değiştirin; önce bir **preview deployment**'ta test edin.
- Rollback: Vercel env'lerini eski projeye geri alın (eski proje silinmeden ayakta dursun, en az birkaç gün).
- Her şey doğrulandıktan **sonra** eski projeyi pasifleştirin ve **DB şifresini sıfırlayın**.

---

### Bu repodaki API özelliği taşımanın neresinde?
`011_external_api.sql` (Adım 1), `api-gateway` + `api-keys-admin` (Adım 3), frontend sayfaları
(Adım 8 ile env). Yani API işi taşımanın içine tamamen gömülü; ayrıca bir şey gerekmiyor.
