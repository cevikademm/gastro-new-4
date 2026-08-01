// secretAuth — paylaşılan sır ile korunan edge function'lar için ortak yetki.
// Kullananlar: error-webhook (pg_net trigger'ı), fix-agent (bulut ajanı).
//
// Bu function'lar JWT doğrulaması KAPALI deploy edilir (--no-verify-jwt),
// çünkü çağıranları JWT üretemez: pg_net header koyamaz, bulut ajanının
// Supabase oturumu yoktur. Tek kapı bu paylaşılan sırdır.

/**
 * Sabit zamanlı string karşılaştırması.
 * Erken çıkan `===` karşılaştırması, cevap süresinden sırrın kaç karakterinin
 * tuttuğunu sızdırır. Uzunluk farkı zaten gizlenemez, içerik farkı gizlenir.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface SecretCheck {
  ok: boolean;
  /** Reddedildiyse hazır yanıt; ok=true ise null. */
  response: Response | null;
}

const json = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/**
 * İsteğin paylaşılan sırrı taşıyıp taşımadığını doğrular.
 * Sır ortamda tanımlı değilse function'ı AÇIKTA bırakmaktansa 503 ile kapatır.
 *
 * @param req        gelen istek
 * @param headerName ör. "x-agent-secret"
 * @param expected   Deno.env'den okunan beklenen değer
 */
export function requireSecret(req: Request, headerName: string, expected: string): SecretCheck {
  if (!expected) {
    return {
      ok: false,
      response: json(
        { error: `${headerName} için sır tanımlı değil — function kapalı` },
        503,
      ),
    };
  }
  const got = req.headers.get(headerName) || "";
  if (!safeEqual(got, expected)) {
    return { ok: false, response: json({ error: "Yetkisiz" }, 401) };
  }
  return { ok: true, response: null };
}
