// api-keys-admin — self-service API key management (create / list / revoke / rotate)
// ==================================================================================
// POST /api-keys-admin
// Body: { action: 'create'|'list'|'revoke'|'rotate', ...params }
//
// JWT-authenticated (same pattern as apify-google-maps): an approved user manages
// their OWN keys; an admin may target any owner via `owner_id`. The raw key is
// generated + hashed server-side and returned exactly ONCE on create/rotate.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { BASE_CORS } from "../_shared/cors.ts";
import { jsonOk, jsonError } from "../_shared/errors.ts";
import { generateApiKey, sha256Hex, type ApiEnvironment } from "../_shared/hash.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const ALLOWED_SCOPES = ["products:read", "catalog:read"];
const SAFE_COLS =
  "id, owner_id, name, key_prefix, scopes, environment, allowed_origins, rate_limit_per_min, quota_monthly, revoked, expires_at, last_used_at, created_at, updated_at";

const cors = (h: Record<string, string> = {}) => ({ ...BASE_CORS, ...h });

interface Body {
  action?: string;
  // create / rotate
  id?: string;
  name?: string;
  environment?: string;
  scopes?: string[];
  allowed_origins?: string[];
  rate_limit_per_min?: number;
  quota_monthly?: number | null;
  owner_id?: string; // admin-only override
}

function sanitizeScopes(input: unknown): string[] {
  if (!Array.isArray(input)) return ["products:read"];
  const cleaned = input.filter((s) => typeof s === "string" && ALLOWED_SCOPES.includes(s));
  return cleaned.length ? Array.from(new Set(cleaned)) : ["products:read"];
}

function sanitizeOrigins(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((o): o is string => typeof o === "string")
    .map((o) => o.trim())
    .filter((o) => /^https?:\/\/[^\s]+$/.test(o))
    .slice(0, 20);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });
  if (req.method !== "POST") return jsonError("method_not_allowed", "Method not allowed", cors());
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonError("internal", "Server not configured", cors());
  }

  // ── Auth ───────────────────────────────────────────────────
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return jsonError("unauthorized", "Yetkilendirme gerekli", cors());

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return jsonError("unauthorized", "Geçersiz oturum", cors());
  const userId = userData.user.id;

  const { data: profile } = await admin
    .from("profiles")
    .select("role, approved")
    .eq("id", userId)
    .single();

  const isAdmin = profile?.role === "admin";
  if (!isAdmin && !profile?.approved) {
    return jsonError("forbidden", "Hesabınız henüz onaylanmadı", cors());
  }

  // ── Input ──────────────────────────────────────────────────
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonError("bad_request", "Geçersiz istek gövdesi", cors());
  }

  // The effective owner: caller, unless an admin explicitly targets someone else.
  const ownerId = isAdmin && body.owner_id ? body.owner_id : userId;

  switch (body.action) {
    // ── LIST ─────────────────────────────────────────────────
    case "list": {
      let q = admin.from("api_keys").select(SAFE_COLS).order("created_at", { ascending: false });
      // Non-admins are restricted to their own; admins see all unless they filter.
      if (!isAdmin) q = q.eq("owner_id", userId);
      else if (body.owner_id) q = q.eq("owner_id", body.owner_id);
      const { data, error } = await q;
      if (error) return jsonError("internal", "Anahtarlar getirilemedi", cors());
      return jsonOk(data ?? [], { headers: cors() });
    }

    // ── CREATE ───────────────────────────────────────────────
    case "create": {
      const name = (body.name || "").trim();
      if (!name) return jsonError("bad_request", "Anahtar adı zorunludur", cors());

      const environment: ApiEnvironment = body.environment === "sandbox" ? "sandbox" : "live";
      const scopes = sanitizeScopes(body.scopes);
      const allowedOrigins = sanitizeOrigins(body.allowed_origins);
      const ratePerMin = Math.min(Math.max(Number(body.rate_limit_per_min) || 60, 1), 6000);
      const quotaMonthly =
        body.quota_monthly === null || body.quota_monthly === undefined
          ? null
          : Math.max(0, Number(body.quota_monthly) || 0);

      const { raw, prefix } = generateApiKey(environment);
      const keyHash = await sha256Hex(raw);

      const { data, error } = await admin
        .from("api_keys")
        .insert({
          owner_id: ownerId,
          name,
          key_prefix: prefix,
          key_hash: keyHash,
          scopes,
          environment,
          allowed_origins: allowedOrigins,
          rate_limit_per_min: ratePerMin,
          quota_monthly: quotaMonthly,
        })
        .select(SAFE_COLS)
        .single();

      if (error) return jsonError("internal", "Anahtar oluşturulamadı", cors());
      // Raw key returned ONCE — never stored, never retrievable again.
      return jsonOk({ ...data, api_key: raw }, { status: 201, headers: cors() });
    }

    // ── REVOKE ───────────────────────────────────────────────
    case "revoke": {
      const id = (body.id || "").trim();
      if (!id) return jsonError("bad_request", "Anahtar kimliği zorunludur", cors());

      let q = admin.from("api_keys").update({ revoked: true }).eq("id", id);
      if (!isAdmin) q = q.eq("owner_id", userId); // ownership guard
      const { data, error } = await q.select("id").maybeSingle();
      if (error) return jsonError("internal", "Anahtar iptal edilemedi", cors());
      if (!data) return jsonError("not_found", "Anahtar bulunamadı", cors());
      return jsonOk({ id, revoked: true }, { headers: cors() });
    }

    // ── ROTATE ───────────────────────────────────────────────
    case "rotate": {
      const id = (body.id || "").trim();
      if (!id) return jsonError("bad_request", "Anahtar kimliği zorunludur", cors());

      // Fetch the source key (with ownership guard) to clone its settings.
      let sel = admin.from("api_keys").select(SAFE_COLS).eq("id", id);
      if (!isAdmin) sel = sel.eq("owner_id", userId);
      const { data: src, error: selErr } = await sel.maybeSingle();
      if (selErr) return jsonError("internal", "Anahtar getirilemedi", cors());
      if (!src) return jsonError("not_found", "Anahtar bulunamadı", cors());

      const environment = (src.environment as ApiEnvironment) ?? "live";
      const { raw, prefix } = generateApiKey(environment);
      const keyHash = await sha256Hex(raw);

      const { data: created, error: insErr } = await admin
        .from("api_keys")
        .insert({
          owner_id: src.owner_id,
          name: src.name,
          key_prefix: prefix,
          key_hash: keyHash,
          scopes: src.scopes,
          environment,
          allowed_origins: src.allowed_origins,
          rate_limit_per_min: src.rate_limit_per_min,
          quota_monthly: src.quota_monthly,
        })
        .select(SAFE_COLS)
        .single();
      if (insErr) return jsonError("internal", "Yeni anahtar oluşturulamadı", cors());

      // Revoke the old one only after the new key is safely created.
      await admin.from("api_keys").update({ revoked: true }).eq("id", id);

      return jsonOk({ ...created, api_key: raw, rotated_from: id }, { status: 201, headers: cors() });
    }

    default:
      return jsonError("bad_request", "Bilinmeyen işlem", cors());
  }
});
