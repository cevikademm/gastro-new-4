// error-webhook — OTOMATİK hata triyajı.
// =============================================================================
// Postgres trigger'ı (public.notify_error_webhook, migration 031) yeni bir
// error_reports / error_logs satırı düşünce pg_net ile buraya POST atar.
// Burada Claude Haiku çağrılır, üretilen düzeltme prompt'u kaydın kendisine
// yazılır ve error_fixes tablosuna bir geçmiş satırı eklenir.
//
// POST /error-webhook
// Header: x-webhook-secret: <app_settings.error_webhook_secret ile aynı>
// Body:   { type: 'INSERT', table: 'error_logs'|'error_reports', record: {...} }
// Yanıt:  { ok: true, id, model, skipped? } | { error }
//
// Secrets:
//   ANTHROPIC_API_KEY       (zorunlu)
//   ERROR_WEBHOOK_SECRET    (zorunlu — trigger'ın gönderdiği paylaşılan sır)
//   FIX_PROMPT_MODEL        (ops. model override)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (platform otomatik enjekte eder)
//
// DAĞITIM: JWT doğrulaması KAPALI olmalı — pg_net JWT göndermez, yetki
// paylaşılan sır ile sağlanır:
//   supabase functions deploy error-webhook --no-verify-jwt
//
// Ortak prompt çekirdeği: ../_shared/fixPromptCore.ts (elle tetikleme: ../fix-prompt)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  clip,
  DEFAULT_MODEL,
  generateFixPrompt,
  type ReportInput,
} from "../_shared/fixPromptCore.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const WEBHOOK_SECRET = Deno.env.get("ERROR_WEBHOOK_SECRET") || "";
const MODEL = Deno.env.get("FIX_PROMPT_MODEL") || DEFAULT_MODEL;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** Zamanlama saldırısına kapalı sır karşılaştırması. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const TABLES = new Set(["error_reports", "error_logs"]);

interface WebhookBody {
  type?: string;
  table?: string;
  record?: Record<string, unknown>;
}

/** error_logs / error_reports satırını ortak prompt girdisine çevirir. */
function toReportInput(table: string, rec: Record<string, unknown>): ReportInput {
  const str = (k: string) => (rec[k] == null ? "" : String(rec[k]));

  if (table === "error_logs") {
    const level = str("level") || "error";
    const source = str("source") || "window";
    return {
      kind: "log",
      description: `[${level} · ${source}] ${str("message")}`,
      stack: str("stack"),
      pagePath: str("page_path"),
      pageUrl: str("page_url"),
      severity: str("severity") || "high",
      screenSize: str("screen_size"),
      userAgent: str("user_agent"),
      reporter: str("user_email") || "otomatik yakalama",
      occurrences: Number(rec.occurrences) || 1,
      consoleErrors: rec.meta ? clip(JSON.stringify(rec.meta), 1500) : "",
    };
  }

  return {
    kind: "report",
    description: str("description"),
    pagePath: str("page_path"),
    pageUrl: str("page_url"),
    severity: str("severity") || "normal",
    screenSize: str("screen_size"),
    userAgent: str("user_agent"),
    consoleErrors: str("console_errors"),
    reporter: str("reporter_name"),
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Sadece POST" }, 405);

  // ─── Yetki: paylaşılan sır ───────────────────────────────────────────
  // Sır tanımlı değilse function'ı açıkta bırakmaktansa kapalı tutuyoruz.
  if (!WEBHOOK_SECRET) {
    return json({ error: "ERROR_WEBHOOK_SECRET tanımlı değil — function kapalı" }, 503);
  }
  if (!safeEqual(req.headers.get("x-webhook-secret") || "", WEBHOOK_SECRET)) {
    return json({ error: "Yetkisiz" }, 401);
  }
  if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY tanımlı değil" }, 500);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY eksik" }, 500);
  }

  let body: WebhookBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Geçersiz JSON" }, 400);
  }

  // Sağlık kontrolü (paneldeki "Bağlantıyı Test Et"): zinciri doğrular ama
  // Claude'u çağırmaz — her test tıklamasında token yakmayalım.
  if (String(body?.type || "") === "PING") {
    return json({ ok: true, ping: true, model: MODEL });
  }

  const table = String(body?.table || "");
  const rec = body?.record;
  if (!TABLES.has(table)) return json({ error: `Desteklenmeyen tablo: ${table}` }, 400);
  if (!rec || typeof rec !== "object" || !rec.id) return json({ error: "record.id yok" }, 400);

  const id = String(rec.id);
  const isLog = table === "error_logs";
  const fkCol = isLog ? "log_id" : "report_id";

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Zaten analiz edilmişse tekrar para harcama (webhook yeniden denenmiş olabilir).
  if (rec.ai_prompt) {
    return json({ ok: true, id, skipped: "ai_prompt zaten var" });
  }

  const input = toReportInput(table, rec as Record<string, unknown>);
  if (clip(input.description, 4000).length < 5) {
    await sb.from(table).update({ ai_status: "skipped", ai_error: "açıklama çok kısa" }).eq("id", id);
    return json({ ok: true, id, skipped: "açıklama çok kısa" });
  }

  // İşleniyor işareti — panelde "AI çalışıyor" görünsün, çift tetikleme engellensin.
  await sb.from(table).update({ ai_status: "queued" }).eq("id", id);

  try {
    const out = await generateFixPrompt(ANTHROPIC_API_KEY, input, MODEL);
    if (!out.prompt) throw new Error(`Model boş yanıt döndürdü (${out.stopReason || "?"})`);

    await sb.from(table).update({
      ai_prompt: out.prompt,
      // Detaylandırılmış açıklama ayrı sütuna yazılır; ham metin (description /
      // message) hiç değiştirilmez — migration 032.
      description_ai: out.fields?.detailedDescription || null,
      ai_prompt_at: new Date().toISOString(),
      ai_model: out.model,
      ai_status: "ok",
      ai_error: null,
    }).eq("id", id);

    await sb.from("error_fixes").insert({
      [fkCol]: id,
      kind: "ai_prompt",
      status: "ok",
      title: "Otomatik triyaj: düzeltme prompt'u üretildi",
      detail: out.prompt,
      model: out.model,
      tokens_in: out.usage.input,
      tokens_out: out.usage.output,
      actor: "error-webhook",
      payload: { source_table: table, cache_read: out.usage.cacheRead },
    });

    // Trigger'ın bıraktığı 'queued' webhook izini kapat — geçmişte asılı kalmasın.
    await sb.from("error_fixes")
      .update({ status: "ok", title: "Webhook tamamlandı → error-webhook" })
      .eq(fkCol, id).eq("kind", "webhook").eq("status", "queued");

    return json({ ok: true, id, model: out.model, usage: out.usage });
  } catch (err) {
    const msg = (err as Error)?.message || "Claude çağrısı başarısız";
    console.error("[error-webhook] triyaj hatası:", table, id, msg);

    await sb.from(table).update({ ai_status: "failed", ai_error: clip(msg, 500) }).eq("id", id);
    await sb.from("error_fixes").insert({
      [fkCol]: id,
      kind: "ai_prompt",
      status: "failed",
      title: "Otomatik triyaj başarısız",
      detail: clip(msg, 2000),
      actor: "error-webhook",
      payload: { source_table: table },
    });
    await sb.from("error_fixes")
      .update({ status: "failed", title: "Webhook tamamlandı (triyaj başarısız)" })
      .eq(fkCol, id).eq("kind", "webhook").eq("status", "queued");

    // 200 dönüyoruz: pg_net'in yeniden denemesi bir işe yaramaz, hata zaten kayıtlı.
    return json({ ok: false, id, error: msg });
  }
});
