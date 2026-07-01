// send-whatsapp — sağlayıcı-bağımsız WhatsApp METİN gönderici (edge function)
// =============================================================================
// POST /send-whatsapp
// Body: { text: string, phones?: string[] }   (phones yoksa WHATSAPP_DEFAULT_PHONES)
//
// Token/numaralar yalnızca SUNUCUDA (Deno.env / supabase secrets). Client sadece
// `text` gönderir. Bir numara başarısız olursa diğerleri etkilenmez (allSettled).
//
// Secrets:
//   WHATSAPP_PROVIDER        greenapi | callmebot | ultramsg | meta   (varsayılan callmebot)
//   WHATSAPP_DEFAULT_PHONES  "4917670295844,4915152271231,905324961412" (sadece rakam)
//   GREENAPI_ID_INSTANCE     Green-API instance id    GREENAPI_TOKEN  Green-API apiTokenInstance
//   GREENAPI_API_URL         (ops.) varsayılan https://api.green-api.com
//   CALLMEBOT_KEYS           JSON map: {"4917670295844":"<apikey>", ...}
//   ULTRAMSG_INSTANCE        UltraMsg instance id (ör. instance12345)
//   ULTRAMSG_TOKEN           UltraMsg token
//   META_PHONE_NUMBER_ID     Meta WhatsApp Cloud phone number id
//   META_TOKEN               Meta kalıcı erişim token'ı

const PROVIDER = (Deno.env.get("WHATSAPP_PROVIDER") || "callmebot").toLowerCase();
const DEFAULT_PHONES = (Deno.env.get("WHATSAPP_DEFAULT_PHONES") || "")
  .split(",")
  .map((s) => s.replace(/\D/g, ""))
  .filter(Boolean);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normPhone = (p: string) => String(p || "").replace(/\D/g, "");

interface SendResult {
  phone: string;
  ok: boolean;
  error?: string;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 10000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function sendCallMeBot(phone: string, text: string): Promise<SendResult> {
  let keys: Record<string, string> = {};
  try {
    keys = JSON.parse(Deno.env.get("CALLMEBOT_KEYS") || "{}");
  } catch {
    return { phone, ok: false, error: "CALLMEBOT_KEYS geçersiz JSON" };
  }
  const apikey = keys[phone] || keys["+" + phone];
  if (!apikey) return { phone, ok: false, error: "apikey yok (CallMeBot izni gerekli)" };
  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
    `&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`;
  try {
    const res = await fetchWithTimeout(url);
    const bodyText = await res.text();
    // CallMeBot 200 döndürür; gövdede "Message queued"/"sent" geçer, hata mesajları da olabilir.
    const ok = res.ok && !/error|invalid|apikey/i.test(bodyText);
    return { phone, ok, error: ok ? undefined : bodyText.slice(0, 160) };
  } catch (e) {
    return { phone, ok: false, error: (e as Error)?.message || "fetch hatası" };
  }
}

async function sendUltraMsg(phone: string, text: string): Promise<SendResult> {
  const instance = Deno.env.get("ULTRAMSG_INSTANCE");
  const token = Deno.env.get("ULTRAMSG_TOKEN");
  if (!instance || !token) return { phone, ok: false, error: "UltraMsg yapılandırılmadı" };
  try {
    const res = await fetchWithTimeout(`https://api.ultramsg.com/${instance}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token, to: phone, body: text }),
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && (data?.sent === "true" || data?.sent === true || !!data?.id || !!data?.message);
    return { phone, ok, error: ok ? undefined : JSON.stringify(data).slice(0, 160) };
  } catch (e) {
    return { phone, ok: false, error: (e as Error)?.message || "fetch hatası" };
  }
}

async function sendGreenApi(phone: string, text: string): Promise<SendResult> {
  const id = Deno.env.get("GREENAPI_ID_INSTANCE");
  const token = Deno.env.get("GREENAPI_TOKEN");
  const apiUrl = (Deno.env.get("GREENAPI_API_URL") || "https://api.green-api.com").replace(/\/$/, "");
  if (!id || !token) return { phone, ok: false, error: "Green-API yapılandırılmadı" };
  try {
    const res = await fetchWithTimeout(`${apiUrl}/waInstance${id}/sendMessage/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId: `${phone}@c.us`, message: text }),
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && !!data?.idMessage;
    return { phone, ok, error: ok ? undefined : JSON.stringify(data).slice(0, 160) };
  } catch (e) {
    return { phone, ok: false, error: (e as Error)?.message || "fetch hatası" };
  }
}

// Green-API: PDF/belge gönder (base64 → multipart sendFileByUpload). caption = sipariş metni.
async function sendGreenApiFile(
  phone: string,
  fileBase64: string,
  fileName: string,
  caption: string,
): Promise<SendResult> {
  const id = Deno.env.get("GREENAPI_ID_INSTANCE");
  const token = Deno.env.get("GREENAPI_TOKEN");
  const apiUrl = (Deno.env.get("GREENAPI_MEDIA_URL") || Deno.env.get("GREENAPI_API_URL") || "https://api.green-api.com").replace(/\/$/, "");
  if (!id || !token) return { phone, ok: false, error: "Green-API yapılandırılmadı" };
  try {
    const bytes = Uint8Array.from(atob(fileBase64), (ch) => ch.charCodeAt(0));
    const form = new FormData();
    form.append("chatId", `${phone}@c.us`);
    form.append("fileName", fileName || "siparis.pdf");
    if (caption) form.append("caption", caption);
    form.append("file", new Blob([bytes], { type: "application/pdf" }), fileName || "siparis.pdf");
    const res = await fetchWithTimeout(`${apiUrl}/waInstance${id}/sendFileByUpload/${token}`, { method: "POST", body: form }, 30000);
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && !!data?.idMessage;
    return { phone, ok, error: ok ? undefined : JSON.stringify(data).slice(0, 200) };
  } catch (e) {
    return { phone, ok: false, error: (e as Error)?.message || "dosya gönderim hatası" };
  }
}

async function sendMeta(phone: string, text: string): Promise<SendResult> {
  const phoneId = Deno.env.get("META_PHONE_NUMBER_ID");
  const token = Deno.env.get("META_TOKEN");
  if (!phoneId || !token) return { phone, ok: false, error: "Meta yapılandırılmadı" };
  try {
    const res = await fetchWithTimeout(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text },
      }),
    });
    const data = await res.json().catch(() => ({}));
    const ok = res.ok && !!data?.messages;
    return { phone, ok, error: ok ? undefined : JSON.stringify(data).slice(0, 160) };
  } catch (e) {
    return { phone, ok: false, error: (e as Error)?.message || "fetch hatası" };
  }
}

function sendOne(phone: string, text: string): Promise<SendResult> {
  switch (PROVIDER) {
    case "greenapi":
    case "green-api":
      return sendGreenApi(phone, text);
    case "ultramsg":
      return sendUltraMsg(phone, text);
    case "meta":
      return sendMeta(phone, text);
    case "callmebot":
    default:
      return sendCallMeBot(phone, text);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Sadece POST" }, 405);

  let body: { text?: string; caption?: string; fileName?: string; fileBase64?: string; phones?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Geçersiz JSON" }, 400);
  }

  const text = String(body?.text || "").trim();
  const caption = String(body?.caption || "").trim();
  const fileBase64 = typeof body?.fileBase64 === "string" ? body.fileBase64 : "";
  const fileName = String(body?.fileName || "siparis.pdf");
  const message = caption || text; // belgede caption, metinde text
  if (!message && !fileBase64) return json({ error: "text/caption/file gerekli" }, 400);

  const phones = (Array.isArray(body?.phones) && body.phones.length ? body.phones : DEFAULT_PHONES)
    .map(normPhone)
    .filter(Boolean);
  if (!phones.length) return json({ error: "Telefon yok (WHATSAPP_DEFAULT_PHONES boş)" }, 400);

  // Dosya varsa ve sağlayıcı Green-API ise PDF'i belge olarak gönder; aksi halde metin.
  const useFile = !!fileBase64 && (PROVIDER === "greenapi" || PROVIDER === "green-api");
  const settled = await Promise.allSettled(
    phones.map((p) => (useFile ? sendGreenApiFile(p, fileBase64, fileName, message) : sendOne(p, message))),
  );
  const results: SendResult[] = settled.map((s, i) =>
    s.status === "fulfilled" ? s.value : { phone: phones[i], ok: false, error: String(s.reason).slice(0, 160) },
  );
  const sent = results.filter((r) => r.ok).length;

  return json({ ok: sent > 0, provider: PROVIDER, sent, total: phones.length, results });
});
