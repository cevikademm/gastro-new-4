# Stripe Hesabını Bağlama — Hızlı Başlangıç (Test Modu)

> Sepet → `/checkout` ürün ödemesini canlıya almak için adımlar.
> Kod tarafı **hazır**: [CheckoutPage](../src/pages/checkout/CheckoutPage.tsx) artık gerçek
> Stripe **Payment Element**'i kullanıyor; siparişi DB'de oluşturup PaymentIntent açıyor
> ve webhook ile durumu güncelliyor. Burada sadece **kendi hesabını sisteme tanıtman** kaldı.
>
> Daha derin referans (Klarna/SEPA, ülke listeleri, akış diyagramı) için bkz.
> [INTEGRATIONS.md §4](./INTEGRATIONS.md#4-stripe--klarna--sepa).

---

## 0. Önkoşul: anahtarlarını al

Stripe Dashboard → **Developers → API keys** (sağ üstte **Test mode** açık olsun):

| Anahtar | Nereye gider | Örnek |
|---|---|---|
| **Publishable key** | Frontend `.env` | `pk_test_...` |
| **Secret key** | Supabase secret (sunucu) | `sk_test_...` |
| **Webhook signing secret** | Supabase secret (3. adımda alınır) | `whsec_...` |

> ⚠️ `sk_test_...` ve `whsec_...` **asla** frontend'e, `.env`'in `VITE_` kısmına veya git'e girmez.
> Bunları yalnızca Supabase secret olarak saklıyoruz.

---

## 1. Frontend anahtarı → `.env`

`.env` yoksa: `cp .env.example .env`. Sonra doldur:

```bash
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx
```

Dev sunucusunu yeniden başlat (`npm run dev`) — Vite env'i build sırasında okur.

---

## 2. Sunucu secret'ları → Supabase

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxx
# STRIPE_WEBHOOK_SECRET'i 3. adımda ekleyeceğiz
```

> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` Supabase tarafından
> otomatik sağlanır — bunları elle eklemene gerek yok.

---

## 3. Edge function'ları deploy et

```bash
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook --no-verify-jwt
```

> `stripe-webhook` için `--no-verify-jwt` **şart**: Stripe çağrısı JWT taşımaz, kimliği
> `stripe-signature` header'ı + `STRIPE_WEBHOOK_SECRET` ile fonksiyon içinde doğrulanır.
>
> `create-payment-intent` JWT doğrular (kullanıcının oturum token'ı ile çağrılır) ve ayrıca
> siparişin çağıran kullanıcıya ait olduğunu kontrol eder (IDOR koruması).

---

## 4. Webhook'u kaydet

Stripe Dashboard → **Developers → Webhooks → Add endpoint**

- **Endpoint URL:**
  `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
  *(`<project-ref>`'i `.env`'deki `VITE_SUPABASE_URL`'den al — `https://AAA.supabase.co` → `AAA`.)*
- **Events to send:**
  - `payment_intent.succeeded`
  - `payment_intent.processing`
  - `payment_intent.payment_failed`
  - `charge.refunded`
- Kaydettikten sonra **Signing secret**'i (`whsec_...`) kopyala ve Supabase'e ekle:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxx
```

> Secret değişimi sonrası fonksiyonu tekrar deploy etmene gerek yok; bir sonraki çağrıda geçerli olur.

---

## 5. Ödeme yöntemlerini aç

Stripe Dashboard → **Settings → Payment methods** → en azından **Card**'ı aktifleştir.
İstersen Klarna / SEPA Direct Debit / iDEAL / Bancontact da aç — kod
`automatic_payment_methods: { enabled: true }` kullandığı için müşterinin ülkesine/para
birimine göre uygun yöntemler otomatik listelenir.

---

## 6. Uçtan uca test

1. Uygulamada **onaylı bir hesapla giriş yap** (ödeme için oturum şart — değilse checkout
   "Giriş Yap" ekranı gösterir).
2. Sepete ürün ekle → **Ödemeye Git** → Bilgiler → Kargo → **Ödeme**.
3. Payment Element açılınca test kartı:
   - Numara: `4242 4242 4242 4242`
   - SKT: gelecekteki herhangi bir tarih · CVC: herhangi 3 hane · ZIP: herhangi
4. **Güvenli Öde**'ye bas → başarı ekranı + gerçek sipariş no.
5. Doğrula:
   - Stripe Dashboard → **Payments**: `Succeeded` bir ödeme.
   - Stripe Dashboard → **Webhooks**: `payment_intent.succeeded` → `200`.
   - Supabase → `gastro_orders`: ilgili satırda `payment_status = paid`, `status = confirmed`.
   - (Resend yapılandırıldıysa) `order-confirmation` e-postası.

**Faydalı test kartları:**
| Senaryo | Kart |
|---|---|
| Başarılı | `4242 4242 4242 4242` |
| 3D Secure (auth gerekir) | `4000 0027 6000 3184` |
| Reddedilen (yetersiz bakiye) | `4000 0000 0000 9995` |

---

## Notlar / sınırlar

- **Tutar:** Stripe'a **genel toplam** (ara toplam + kargo + KDV) yansır. `gastro_orders.total_price`
  uygulama düzeni gereği **ürün ara toplamını** tutar (KDV/kargo ayrı gösterilir).
- **Para birimi:** Charge `eur` olarak açılıyor (`createPaymentIntent({ currency: 'eur' })`).
  Farklı para birimi gerekirse CheckoutPage'deki çağrıyı güncelle.
- **Canlıya geçiş:** Test akışı doğrulandıktan sonra Dashboard'da **Live mode**'a geç, aynı
  adımları `pk_live_...` / `sk_live_...` ve ayrı bir **live webhook** (`whsec_...`) ile tekrarla.
- **Abonelik (Pro €29/ay) bu kapsamda değil** — yalnızca tek seferlik ürün ödemesi bağlandı.
