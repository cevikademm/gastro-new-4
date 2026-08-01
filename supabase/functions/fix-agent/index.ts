// fix-agent — otomatik hata düzeltme ajanının TEK veri kapısı.
// =============================================================================
// Saatlik bulut rutini (claude.ai/code/routines) buraya curl atar. Ajanın
// Supabase'e başka hiçbir erişimi yoktur: service_role anahtarı, Anthropic
// anahtarı, DB şifresi ona asla verilmez.
//
// POST /fix-agent   Header: x-agent-secret: <sır>
//
//   {action:"ping"}     → sağlık + kuyruk sayısı (Claude çağırmaz, ücretsiz)
//   {action:"claim"}    → bekleyen işi atomik olarak kirala
//   {action:"result"}   → düzeltme sonucunu yaz (kapsam/boyut sunucuda doğrulanır)
//   {action:"revert"}   → geri alma sonucunu yaz
//   {action:"deployed"} → GitHub Actions çağırır: changelog yayınla + bildir
//
// TASARIM: Ajanın gönderdiği hiçbir alana güvenilmez. Hangi kaydın işleneceğine
// sunucu karar verir (fix_agent_queue), kapsam/boyut sınırları record_fix_result
// içinde tekrar doğrulanır. Ajan sınırı aşarsa commit'i geri alamayız ama
// duyuruyu ve otomatik onayı durdururuz — asıl commit engeli CI'daki kapıdır.
//
// Secrets:
//   FIX_AGENT_SECRET                     (zorunlu — yoksa function 503 ile kapalı)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY   (platform enjekte eder)
//   RESEND_API_KEY üzerinden send-email      (bildirene e-posta için)
//
// DAĞITIM: supabase functions deploy fix-agent --no-verify-jwt
// Migration: 037-041 · Panel: src/lib/fixAgent.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireSecret } from "../_shared/secretAuth.ts";

const AGENT_SECRET = Deno.env.get("FIX_AGENT_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

interface Body {
  action?: string;
  run_id?: string;
  limit?: number;
  target?: string;
  id?: string;
  outcome?: string;
  commit_sha?: string;
  deploy_url?: string;
  [k: string]: unknown;
}

/** Düzeltme duyurusunu bildirene e-posta olarak yollar (send-email function'ı). */
async function mailReporters(
  emails: Array<{ email?: string; name?: string; summary?: string; id?: string }>,
): Promise<number> {
  if (!emails.length || !ANON_KEY) return 0;
  let sent = 0;
  for (const e of emails) {
    if (!e?.email) continue;
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // send-email platform JWT bekliyor; service_role geçerli bir JWT'dir.
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify({
          template: "fix-deployed",
          to: e.email,
          data: { name: e.name || "", summary: e.summary || "", reportId: e.id || "" },
        }),
      });
      if (res.ok) sent++;
      else console.warn("[fix-agent] e-posta başarısız:", e.email, res.status);
    } catch (err) {
      console.warn("[fix-agent] e-posta hatası:", (err as Error)?.message);
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Sadece POST" }, 405);

  const auth = requireSecret(req, "x-agent-secret", AGENT_SECRET);
  if (!auth.ok) return auth.response!;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY eksik" }, 500);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Geçersiz JSON" }, 400);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const action = clip(body?.action, 32);

  try {
    // ─── ping ────────────────────────────────────────────────────────────
    if (action === "ping") {
      const { count } = await sb
        .from("fix_agent_queue")
        .select("id", { count: "exact", head: true });
      const { data: settings } = await sb
        .from("app_settings")
        .select("key, value")
        .in("key", ["fix_agent_enabled", "fix_agent_mode"]);
      const map = new Map((settings || []).map((r) => [r.key, r.value]));
      return json({
        ok: true,
        ping: true,
        enabled: map.get("fix_agent_enabled") === "true",
        mode: map.get("fix_agent_mode") || "auto",
        queue: count ?? 0,
        now: new Date().toISOString(),
      });
    }

    // ─── claim ───────────────────────────────────────────────────────────
    if (action === "claim") {
      const runId = clip(body?.run_id, 64) || `run_${Date.now()}`;
      const { data, error } = await sb.rpc("claim_fix_targets", {
        p_run_id: runId,
        p_limit: Math.max(1, Math.min(Number(body?.limit) || 1, 5)),
      });
      if (error) return json({ error: error.message }, 500);

      // Ajanın uyması gereken kurallar sunucudan gelir — prompt bayatlarsa
      // bile canlı politika bu.
      return json({
        ...(data as Record<string, unknown>),
        policy: {
          allowed_path_prefix: "src/",
          denylist: [
            "src/App.tsx",
            "src/main.tsx",
            "src/i18n/**",
            "src/lib/supabase.ts",
            "src/lib/security.ts",
            "src/lib/csrf.ts",
            "src/lib/secure-storage.ts",
            "src/lib/payment.ts",
            "src/lib/stripe.ts",
            "src/lib/b2b-payments.ts",
            "src/components/AdminGuard.tsx",
          ],
          max_files: 8,
          max_lines_changed: 400,
          gates: ["npm run lint", "npm run build"],
        },
      });
    }

    // ─── result ──────────────────────────────────────────────────────────
    if (action === "result") {
      if (!body?.target || !body?.id || !body?.outcome) {
        return json({ error: "target, id ve outcome gerekli" }, 400);
      }
      const { data, error } = await sb.rpc("record_fix_result", { p: body });
      if (error) return json({ error: error.message }, 500);
      const res = data as { outcome?: string };
      // Sunucu ajanın 'applied' iddiasını 'failed'e çevirdiyse ajana bildir.
      const rejected = body.outcome === "applied" && res?.outcome !== "applied";
      return json({ ...(data as object), rejected }, rejected ? 422 : 200);
    }

    // ─── revert ──────────────────────────────────────────────────────────
    if (action === "revert") {
      if (!body?.target || !body?.id) return json({ error: "target ve id gerekli" }, 400);
      const { data, error } = await sb.rpc("record_fix_revert", { p: body });
      if (error) return json({ error: error.message }, 500);
      return json(data as object);
    }

    // ─── deployed (GitHub Actions) ────────────────────────────────────────
    if (action === "deployed") {
      const sha = clip(body?.commit_sha, 40);
      if (!sha) return json({ error: "commit_sha gerekli" }, 400);
      const { data, error } = await sb.rpc("publish_fix_deploy", {
        p_sha: sha,
        p_url: clip(body?.deploy_url, 500) || null,
      });
      if (error) return json({ error: error.message }, 500);

      const out = data as { emails?: Array<Record<string, string>>; promoted?: number; published?: number };
      const emailed = await mailReporters(out?.emails || []);
      return json({ ok: true, promoted: out?.promoted ?? 0, published: out?.published ?? 0, emailed });
    }

    return json({ error: `Bilinmeyen action: ${action}` }, 400);
  } catch (err) {
    console.error("[fix-agent] hata:", action, (err as Error)?.message);
    return json({ error: (err as Error)?.message || "Beklenmeyen hata" }, 500);
  }
});
