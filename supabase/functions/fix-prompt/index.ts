// fix-prompt — kullanıcının hata/istek açıklamasını yorumlayıp, sistemin
// düzeltilmesi için gereken GELİŞTİRİCİ PROMPT'unu üretir (Claude Haiku).
// =============================================================================
// POST /fix-prompt
// Body: {
//   description: string          // kullanıcının kendi cümleleriyle anlattığı sorun/istek (zorunlu)
//   pagePath?: string            // "/projects/42" gibi rota
//   pageUrl?: string
//   severity?: 'low'|'normal'|'high'
//   screenSize?: string          // "1440×900"
//   userAgent?: string
//   consoleErrors?: string       // varsa konsol hataları
//   stack?: string               // otomatik loglarda JS stack trace
//   reporter?: string            // bildiren kişi
//   locale?: string              // çıktının dili (varsayılan 'tr')
// }
// Yanıt: { ok: true, prompt: string, model: string, usage: {...} }
//
// Yetki: verify_jwt (platform) + public.is_admin() RPC — yalnızca adminler.
// Secret: ANTHROPIC_API_KEY  (ops. FIX_PROMPT_MODEL ile model override)
//
// Neden Haiku? Bu iş "yorumla + şablona dök" — tek çağrı, kısa çıktı, düşük
// gecikme. Haiku 4.5 bu işi ucuza ve hızlı yapar.
//
// Bu function ELLE tetiklenir (panel/widget'taki "AI Prompt" butonu).
// Yeni kayıt düşünce OTOMATİK çalışan kardeşi: ../error-webhook
// Sistem prompt'u + proje bağlamı ortak çekirdekte: ../_shared/fixPromptCore.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  clip,
  DEFAULT_MODEL,
  generateFixPrompt,
  type ReportInput,
} from "../_shared/fixPromptCore.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const MODEL = Deno.env.get("FIX_PROMPT_MODEL") || DEFAULT_MODEL;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Sadece POST" }, 405);
  if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY tanımlı değil" }, 500);

  // ─── Yetki: yalnızca admin ───────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader) return json({ error: "Yetkisiz" }, 401);
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      });
      const { data: isAdmin, error } = await sb.rpc("is_admin");
      if (error) return json({ error: `Yetki kontrolü başarısız: ${error.message}` }, 403);
      if (!isAdmin) return json({ error: "Bu işlem yalnızca admin kullanıcılar içindir" }, 403);
    } catch (e) {
      return json({ error: `Yetki kontrolü hatası: ${(e as Error)?.message}` }, 403);
    }
  }

  let body: ReportInput;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Geçersiz JSON" }, 400);
  }

  const description = clip(body?.description, 4000);
  if (description.length < 5) {
    return json({ error: "description gerekli (en az 5 karakter)" }, 400);
  }

  try {
    const out = await generateFixPrompt(ANTHROPIC_API_KEY, { ...body, description }, MODEL);
    if (!out.prompt) {
      return json({ error: "Model boş yanıt döndürdü", stopReason: out.stopReason }, 502);
    }
    return json({ ok: true, ...out });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    console.error("[fix-prompt] Claude hatası:", e?.status, e?.message);
    return json(
      { error: e?.message || "Claude çağrısı başarısız" },
      e?.status && e.status >= 400 && e.status < 600 ? e.status : 500,
    );
  }
});
