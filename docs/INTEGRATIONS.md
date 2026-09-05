# Entegrasyonlar — Kurulum ve Kullanım

> Versiyon 1.0 · 2026-04-11
> Faz 3 teknik altyapı scaffolding'i. Paketler **kurulmamıştır** — bu doküman hangi komutları çalıştırman gerektiğini ve her entegrasyonun nerede yaşadığını anlatır.

## Hızlı kurulum

```bash
# Client-side packages
npm i posthog-js meilisearch @stripe/react-stripe-js @stripe/stripe-js

# Edge function runtime gerektirmez — Deno ile esm.sh üzerinden yüklenir
```

Ardından `.env.example`'ı `.env`'e kopyala ve doldur:

```bash
cp .env.example .env
```

Server-side (edge function) secret'larını Supabase'e yükle:

```bash
supabase secrets set \
  STRIPE_SECRET_KEY=sk_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  RESEND_API_KEY=re_... \
  RESEND_FROM="2MC Gastro <noreply@2mcgastro.com>" \
  MEILI_HOST=https://search.2mcgastro.com \
  MEILI_ADMIN_KEY=... \
  ANTHROPIC_API_KEY=sk-ant-...
```

Edge function'ları deploy et:

```bash
supabase functions deploy send-email
supabase functions deploy sync-meilisearch
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy ai-chat
```

> `stripe-webhook` için `--no-verify-jwt` şart — Stripe JWT göndermez, imza `stripe-signature` header'ında gelir ve fonksiyon içinde doğrulanır.

---

## 1. Resend + transactional email

**Nerede:**
- Edge function: [supabase/functions/send-email/index.ts](../supabase/functions/send-email/index.ts)
- Client: [src/lib/email.ts](../src/lib/email.ts)

**Şablonlar (inline HTML, brand token'larıyla):**
- `order-confirmation` — sipariş alındı
- `order-shipped` — kargoya verildi (takip no)
- `welcome` — kayıt sonrası
- `approval-granted` — B2B onayı

**Kullanım:**

```ts
import { sendEmail } from '@/lib/email';

await sendEmail({
  template: 'order-confirmation',
  to: user.email,
  data: { orderNumber: 'GO-2026-00123', total: '€4.890,00' },
});
```

**DNS:** Resend dashboard'da `2mcgastro.com` domain'ini doğrula. SPF/DKIM kayıtlarını Cloudflare'e ekle. Doğrulanana kadar test modu `onboarding@resend.dev` kullanır.

---

## 2. PostHog — analytics (GDPR uyumlu)

**Nerede:** [src/lib/posthog.ts](../src/lib/posthog.ts)

**Cookie consent ile gated.** Kullanıcı CookieBanner'da analitiği kabul edene kadar `init` çağrılmaz. Kabul sonrası `localStorage['2mc:analytics-consent'] = 'granted'` ve tracking başlar.

**Entegrasyon noktaları:**

1. [src/main.tsx](../src/main.tsx) içinde uygulama başlangıcında `initPostHog()` çağır.
2. [src/components/CookieBanner.tsx](../src/components/CookieBanner.tsx) "Kabul et" butonunda `grantAnalyticsConsent()`, "Reddet" butonunda `revokeAnalyticsConsent()` çağır.
3. Auth sonrası `identifyUser(user.id, { role, language })`.
4. Logout'ta `resetUser()`.

**Event örnekleri:**

```ts
import { trackEvent } from '@/lib/posthog';

trackEvent('product_viewed', { sku, category });
trackEvent('cart_add', { sku, quantity });
trackEvent('order_completed', { order_id, total });
```

**Kurallar:**
- `autocapture: false` — hangi event'leri yakalayacağımıza biz karar veriyoruz
- `disable_session_recording: true` — GDPR için kapalı
- `respect_dnt: true` — tarayıcı DNT başlığını dinler
- EU Cloud (`eu.posthog.com`) — veri Avrupa'da kalır

---

## 3. Meilisearch — instant search

**Nerede:**
- Client: [src/lib/meilisearch.ts](../src/lib/meilisearch.ts)
- Sync edge function: [supabase/functions/sync-meilisearch/index.ts](../supabase/functions/sync-meilisearch/index.ts)

**Self-hosted kurulum (Docker, tek komut):**

```bash
docker run -d --name meilisearch \
  -p 7700:7700 \
  -v meili-data:/meili_data \
  -e MEILI_MASTER_KEY=your-very-long-master-key \
  -e MEILI_ENV=production \
  getmeili/meilisearch:v1.9
```

Ardından Cloudflare tüneli veya VPS nginx reverse proxy ile `search.2mcgastro.com` olarak yayınla.

**Anahtar yönetimi:**
- Master key → sadece sen. Hiçbir zaman paylaşılmaz.
- Admin key → `MEILI_ADMIN_KEY` (sync edge function için)
- Search-only key → `VITE_MEILI_SEARCH_KEY` (client'a expose edilir, sadece okuma)

**Sync stratejisi:**
1. Supabase cron (veya pg_cron) her 10 dakikada `sync-meilisearch` fonksiyonunu çağırır
2. İlk seferde `{ mode: 'full' }`, sonrasında `{ mode: 'incremental' }`
3. `products.updated_at` üzerinden delta sync — son 15 dakikada değişenler

**Arama kullanımı:**

```ts
import { searchProducts } from '@/lib/meilisearch';

const { hits, total, facets } = await searchProducts({
  query: 'konvektomat',
  locale: 'tr',
  filters: ['is_active = true', 'price < 5000'],
  facets: ['brand_id', 'category_id', 'energy_rating'],
  limit: 20,
});
```

---

## 4. Stripe + Klarna + SEPA

**Nerede:**
- Client: [src/lib/stripe.ts](../src/lib/stripe.ts) (mevcut), [src/lib/payment.ts](../src/lib/payment.ts) (yeni)
- Edge functions:
  - [supabase/functions/create-payment-intent/index.ts](../supabase/functions/create-payment-intent/index.ts)
  - [supabase/functions/stripe-webhook/index.ts](../supabase/functions/stripe-webhook/index.ts)

**Dashboard ayarları (Stripe → Settings → Payment methods):**
- ✅ Card (global)
- ✅ Klarna (DE, AT, NL, FR, BE, FI, NO, SE, DK, IT, ES)
- ✅ SEPA Direct Debit (EUR)
- ✅ Sofort (DE, AT)
- ✅ iDEAL (NL)
- ✅ Bancontact (BE)

`automatic_payment_methods: { enabled: true }` kullanıldığı için müşterinin ülkesine/para birimine göre Stripe uygun yöntemleri otomatik gösterir.

**Webhook kaydı:** Stripe Dashboard → Developers → Webhooks → Add endpoint
- URL: `https://<project>.supabase.co/functions/v1/stripe-webhook`
- Events:
  - `payment_intent.succeeded`
  - `payment_intent.processing`
  - `payment_intent.payment_failed`
  - `charge.refunded`
- Signing secret'ı `STRIPE_WEBHOOK_SECRET` olarak kaydet

**Akış:**
1. Kullanıcı sepeti onaylar → frontend `gastro_orders` row'u oluşturur (status: `pending`)
2. Frontend `createPaymentIntent({ order_id, amount })` çağırır
3. Dönen `client_secret` ile Stripe Payment Element mount edilir
4. Kullanıcı öder → Stripe webhook → `stripe-webhook` fonksiyonu → order status `confirmed` + `order-confirmation` emaili

**Client entegrasyonu (örnek):**

```tsx
import { Elements, PaymentElement } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { createPaymentIntent } from '@/lib/payment';

const { client_secret } = await createPaymentIntent({ order_id, amount: total });

<Elements stripe={stripePromise} options={{ clientSecret: client_secret, appearance: { theme: 'stripe' } }}>
  <PaymentElement />
</Elements>
```

---

## 5. Claude API — AI chat & kitchen planner

**Nerede:**
- Edge function: [supabase/functions/ai-chat/index.ts](../supabase/functions/ai-chat/index.ts)
- Client: [src/lib/ai.ts](../src/lib/ai.ts)

**Üç context modu:**
- `catalog` — ürün önerisi, teknik spec açıklama
- `kitchen-planner` — mutfak düzeni, HACCP akışı
- `support` — sipariş, kargo, iade

Her biri için ayrı system prompt. System prompt'ları **prompt caching** (`cache_control: ephemeral`) ile işaretli — 5 dakika içindeki tur'larda cache'ten okunur.

**Model:** `claude-sonnet-4-6` (hızlı, ekonomik, 2MC için yeterli). Kompleks mutfak planlamada `claude-opus-4-6`'ya geçilebilir.

**Streaming kullanım:**

```tsx
import { chatWithAI } from '@/lib/ai';

const [answer, setAnswer] = useState('');
setAnswer('');

for await (const chunk of chatWithAI({
  messages: [{ role: 'user', content: '80 kişilik otel için konvektomat önerir misiniz?' }],
  context: 'catalog',
})) {
  setAnswer(prev => prev + chunk);
}
```

**Ton uyumu:** Her system prompt, `docs/BRAND-IDENTITY.md §7 Marka Sesi & Ton` kurallarıyla senkronize ("Siz", emoji yok, kısa cümle, bağlamlı teknik bilgi).

---

## 6. Shopify — ürün senkronu (kurulum bekliyor)

Ürün kataloğunu ayrı bir Shopify vitrinine yazar. **Mağaza henüz açılmadı.**

| | |
|---|---|
| Yön | Supabase → Shopify (tek yönlü, yazma) |
| API | Admin GraphQL, `productSet` mutation'ı |
| Sürüm | `2026-07` (Shopify her çeyrekte yeni sürüm çıkarır) |
| Kapsam | Pilot: Diamond (6.849 ürün). Sonra CombiSteel + HENDI |
| Fiyat | **Brüt** — net × 1,19 (%19 KDV dahil) |
| Domain | `shop.2mcgastro.de` — **ana domain'e dokunulmaz** |

```bash
npm run shopify:preflight   # envanter denetimi (yazmaz, token gerekmez)
npm run shopify:dry         # payload önizleme (yazmaz)
node scripts/shopify/sync-products.mjs --brand diamond --live --limit 50
```

**Gereken env:** `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_TOKEN`,
`SHOPIFY_API_VERSION`, `SHOPIFY_LOCATION_ID` → `.env.example`'a bak.

**Kurulum ve durum:** [docs/shopify/](shopify/) — `DURUM.md` hangi fazda
olduğumuzu tutar, `01-magaza-kurulum-rehberi.md` adım adım kurulumu anlatır.

**Dikkat:**
- Ürünler `productSet` + sabit `handle` ile yazılır → **idempotan**; ikinci
  çalıştırma mükerrer ürün yaratmaz. Her canlı yazımdan sonra komutu tekrar
  çalıştırıp ürün sayısının sabit kaldığını doğrula.
- Diamond'da stok verisi yok → envanter takibi **kapalı** (`tracked: false`),
  yoksa tüm katalog "ausverkauft" görünür.
- HENDI barkodları bozuk (hepsi `"8,71137E+12"`) → yazılmıyor.

---

## Test checklist

Her entegrasyon canlıya alınmadan önce:

- [ ] `.env` dolduruldu
- [ ] Edge function secret'ları yüklendi (`supabase secrets list`)
- [ ] Edge function'lar deploy edildi (`supabase functions list`)
- [ ] Resend domain doğrulandı, test email attı
- [ ] PostHog EU projesi açıldı, cookie banner'da test onayı sonrası event geliyor
- [ ] Meilisearch container ayakta, `/health` → `available`
- [ ] `sync-meilisearch` ilk full sync başarılı
- [ ] Stripe test kartı (4242 4242 4242 4242) ile ödeme `confirmed`'a geçiyor
- [ ] Stripe webhook `payment_intent.succeeded` event'i alıp order'ı güncelliyor
- [ ] Klarna test akışı (DE adresi) başarılı
- [ ] `ai-chat` fonksiyonu catalog context'inde yanıt streamliyor
- [ ] Migration 005 staging'de uygulandı ve smoke test geçti

---

## Bilinen eksikler

- **React Email**: `send-email` şablonları inline HTML. Daha zengin template'ler için `react-email` paketi kurulup SSR render edilmeli, ardından HTML `data.html` olarak gönderilebilir.
- **Klarna onboarding**: Stripe tarafında Klarna'nın aktifleşmesi iş bilgisi doğrulaması gerektirir. Canlı para geçmeden Stripe support ile konuşulmalı.
- **Meilisearch auth**: Gelecekte kullanıcıya göre filtreleme (B2B özel fiyat) gerekirse tenant token kullanılmalı.
- **AI chat rate limiting**: Şu an yok. Kullanıcı başına dakikada N istek limiti edge function içinde eklenmeli (Supabase KV ile).
- **Migration 005**: Henüz uygulanmadı. Staging'de dene, sonra production.
- **Shopify mağazası**: Henüz açılmadı. Ürün senkron kodu ve denetimi hazır, canlı yazma token bekliyor (`docs/shopify/DURUM.md`).
