// api-gateway — public, read-only catalog API (THE GATEWAY)
// ==========================================================
// Deploy WITHOUT JWT verification — external callers use OUR api keys, not Supabase
// JWTs:  `supabase functions deploy api-gateway --no-verify-jwt`
//
// Flow per request:
//   1. CORS preflight
//   2. extract api key (Authorization: Bearer … | x-api-key) → SHA-256
//   3. api_authenticate RPC → 401 if invalid/revoked/expired
//   4. scope check → 403
//   5. api_consume RPC (atomic minute rate-limit + monthly quota) → 429 + Retry-After
//   6. route → products / categories / brands (service-role, is_active=true only)
//   7. { data, meta } / { error } with X-RateLimit-* headers
//
// Public, auth-free endpoints: /v1/health, /v1/openapi.json (wildcard CORS).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsForKey, PUBLIC_CORS } from "../_shared/cors.ts";
import { jsonOk, jsonError } from "../_shared/errors.ts";
import { sha256Hex } from "../_shared/hash.ts";
import { buildOpenApiSpec } from "./openapi.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const LANGS = ["de", "en", "tr", "fr", "nl"] as const;
type Lang = (typeof LANGS)[number];

const CATALOG_SCOPES = ["products:read", "catalog:read"];
const MAX_LIMIT = 100;

interface KeyPolicy {
  id: string;
  owner_id: string;
  scopes: string[];
  environment: "live" | "sandbox";
  allowed_origins: string[];
  rate_limit_per_min: number;
  quota_monthly: number | null;
}

// ── helpers ────────────────────────────────────────────────
function pickLang(req: URL): Lang {
  const l = (req.searchParams.get("lang") || "en").toLowerCase();
  return (LANGS as readonly string[]).includes(l) ? (l as Lang) : "en";
}

function localized(row: Record<string, unknown>, base: string, lang: Lang): string | null {
  return (
    (row[`${base}_${lang}`] as string) ??
    (row[`${base}_en`] as string) ??
    (row[`${base}_tr`] as string) ??
    (row[`${base}_de`] as string) ??
    null
  );
}

// Strip PostgREST filter metacharacters so a value can't alter filter logic.
function safeValue(v: string): string {
  return v.replace(/[,()*:\\%]/g, "").trim().slice(0, 120);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PRODUCT_COLS =
  "id, sku, slug, name_de, name_en, name_tr, name_fr, name_nl, " +
  "description_de, description_en, description_tr, description_fr, description_nl, " +
  "price, compare_price, currency, stock, weight_kg, dimensions, images, specs, energy_rating, " +
  "created_at, updated_at, brands(slug,name,logo_url), categories(slug,name_de,name_en,name_tr,name_fr,name_nl)";

function shapeProduct(row: Record<string, unknown>, lang: Lang) {
  const brand = row.brands as Record<string, unknown> | null;
  const cat = row.categories as Record<string, unknown> | null;
  const stock = Number(row.stock ?? 0);
  return {
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    name: localized(row, "name", lang),
    description: localized(row, "description", lang),
    price: row.price,
    compare_price: row.compare_price,
    currency: row.currency,
    stock,
    in_stock: stock > 0,
    weight_kg: row.weight_kg,
    dimensions: row.dimensions,
    images: row.images ?? [],
    specs: row.specs ?? {},
    energy_rating: row.energy_rating,
    brand: brand ? { slug: brand.slug, name: brand.name, logo_url: brand.logo_url } : null,
    category: cat ? { slug: cat.slug, name: localized(cat, "name", lang) } : null,
  };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const origin = req.headers.get("Origin");
  // Path after the function name, e.g. "/v1/products". Robust to either
  // "/api-gateway/v1/products" or "/functions/v1/api-gateway/v1/products".
  const marker = "/api-gateway";
  const mIdx = url.pathname.indexOf(marker);
  const path =
    (mIdx >= 0 ? url.pathname.slice(mIdx + marker.length) : url.pathname).replace(/\/+$/, "") || "/";
  // Public base URL for OpenAPI servers (env is the public project URL, not the internal origin).
  const publicBase = `${SUPABASE_URL || url.origin}/functions/v1/api-gateway`;

  // ── Public endpoints (no auth, wildcard CORS) ─────────────
  if (req.method === "OPTIONS" && (path === "/v1/openapi.json" || path === "/v1/health")) {
    return new Response("ok", { headers: PUBLIC_CORS });
  }
  if (path === "/v1/health") {
    return jsonOk({ status: "ok" }, { headers: PUBLIC_CORS });
  }
  if (path === "/v1/openapi.json") {
    const spec = buildOpenApiSpec(publicBase);
    return new Response(JSON.stringify(spec), {
      headers: { "Content-Type": "application/json; charset=utf-8", ...PUBLIC_CORS },
    });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonError("internal", "Server not configured", PUBLIC_CORS);
  }

  // ── Preflight for data endpoints (allowlist unknown until key resolved) ──
  if (req.method === "OPTIONS") {
    const h = corsForKey(origin, origin ? [origin] : []); // echo on preflight; enforce on real response
    return new Response("ok", { headers: h });
  }
  if (req.method !== "GET") {
    return jsonError("method_not_allowed", "Only GET is supported", corsForKey(origin, []));
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 2. Extract + hash key ─────────────────────────────────
  const rawKey =
    (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim() ||
    (req.headers.get("x-api-key") || "").trim();
  if (!rawKey) {
    return jsonError("unauthorized", "API key required", corsForKey(origin, []));
  }

  // ── 3. Authenticate ───────────────────────────────────────
  let policy: KeyPolicy | null = null;
  try {
    const keyHash = await sha256Hex(rawKey);
    const { data, error } = await admin.rpc("api_authenticate", { p_key_hash: keyHash });
    if (error) return jsonError("internal", "Authentication failed", corsForKey(origin, []));
    policy = Array.isArray(data) && data.length ? (data[0] as KeyPolicy) : null;
  } catch {
    return jsonError("internal", "Authentication failed", corsForKey(origin, []));
  }
  if (!policy) {
    return jsonError("unauthorized", "Invalid or revoked API key", corsForKey(origin, []));
  }

  const cors = corsForKey(origin, policy.allowed_origins);
  const envHeaders = { ...cors, "X-Environment": policy.environment };

  // ── 4. Scope check ────────────────────────────────────────
  const hasScope = (policy.scopes || []).some((s) => CATALOG_SCOPES.includes(s));
  if (!hasScope) {
    return jsonError("forbidden", "API key lacks catalog read scope", envHeaders);
  }

  // ── 5. Rate-limit + quota (atomic) ────────────────────────
  let meter: { allowed: boolean; minute_remaining: number; month_remaining: number | null; retry_after: number; reason?: string };
  try {
    const { data, error } = await admin.rpc("api_consume", {
      p_key_id: policy.id,
      p_minute_limit: policy.rate_limit_per_min,
      p_month_quota: policy.quota_monthly,
    });
    if (error) return jsonError("internal", "Rate limiting failed", envHeaders);
    meter = data as typeof meter;
  } catch {
    return jsonError("internal", "Rate limiting failed", envHeaders);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const resetSec = (Math.floor(nowSec / 60) + 1) * 60;
  const rlHeaders: Record<string, string> = {
    ...envHeaders,
    "X-RateLimit-Limit": String(policy.rate_limit_per_min),
    "X-RateLimit-Remaining": String(Math.max(0, meter.minute_remaining ?? 0)),
    "X-RateLimit-Reset": String(resetSec),
  };

  if (!meter.allowed) {
    const code = meter.reason === "quota_exceeded" ? "quota_exceeded" : "rate_limited";
    const msg =
      meter.reason === "quota_exceeded"
        ? "Monthly quota exceeded"
        : "Rate limit exceeded — slow down";
    return jsonError(code, msg, rlHeaders, { "Retry-After": String(meter.retry_after ?? 60) });
  }

  // ── 6. Route ──────────────────────────────────────────────
  const lang = pickLang(url);

  try {
    // GET /v1/products
    if (path === "/v1/products") {
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), MAX_LIMIT);
      const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

      let q = admin
        .from("products")
        .select(PRODUCT_COLS, { count: "exact" })
        .eq("is_active", true);

      const categorySlug = url.searchParams.get("category");
      if (categorySlug) {
        const { data: cat } = await admin
          .from("categories")
          .select("id")
          .eq("slug", safeValue(categorySlug))
          .eq("is_active", true)
          .maybeSingle();
        if (!cat) return jsonOk([], { headers: rlHeaders, meta: { total: 0, limit, offset } });
        q = q.eq("category_id", cat.id);
      }

      const brandSlug = url.searchParams.get("brand");
      if (brandSlug) {
        const { data: br } = await admin
          .from("brands")
          .select("id")
          .eq("slug", safeValue(brandSlug))
          .eq("is_active", true)
          .maybeSingle();
        if (!br) return jsonOk([], { headers: rlHeaders, meta: { total: 0, limit, offset } });
        q = q.eq("brand_id", br.id);
      }

      const term = url.searchParams.get("q");
      if (term) {
        const t = safeValue(term);
        if (t) {
          q = q.or(
            `name_en.ilike.*${t}*,name_tr.ilike.*${t}*,name_de.ilike.*${t}*,sku.ilike.*${t}*`,
          );
        }
      }

      const priceMin = Number(url.searchParams.get("price_min"));
      if (Number.isFinite(priceMin) && url.searchParams.has("price_min")) q = q.gte("price", priceMin);
      const priceMax = Number(url.searchParams.get("price_max"));
      if (Number.isFinite(priceMax) && url.searchParams.has("price_max")) q = q.lte("price", priceMax);

      // Sort whitelist
      const sort = url.searchParams.get("sort");
      const sortMap: Record<string, { col: string; asc: boolean }> = {
        price: { col: "price", asc: true },
        "-price": { col: "price", asc: false },
        created_at: { col: "created_at", asc: true },
        "-created_at": { col: "created_at", asc: false },
      };
      const s = sort && sortMap[sort] ? sortMap[sort] : { col: "created_at", asc: false };
      q = q.order(s.col, { ascending: s.asc });

      q = q.range(offset, offset + limit - 1);

      const { data, count, error } = await q;
      if (error) return jsonError("internal", "Could not fetch products", rlHeaders);
      const items = (data ?? []).map((r) => shapeProduct(r as Record<string, unknown>, lang));
      return jsonOk(items, { headers: rlHeaders, meta: { total: count ?? items.length, limit, offset } });
    }

    // GET /v1/products/:idOrSlugOrSku
    const single = path.match(/^\/v1\/products\/([^/]+)$/);
    if (single) {
      const ident = decodeURIComponent(single[1]);
      let q = admin.from("products").select(PRODUCT_COLS).eq("is_active", true);
      if (UUID_RE.test(ident)) {
        q = q.eq("id", ident);
      } else {
        const v = safeValue(ident);
        q = q.or(`slug.eq.${v},sku.eq.${v}`);
      }
      const { data, error } = await q.limit(1).maybeSingle();
      if (error) return jsonError("internal", "Could not fetch product", rlHeaders);
      if (!data) return jsonError("not_found", "Product not found", rlHeaders);
      return jsonOk(shapeProduct(data as Record<string, unknown>, lang), { headers: rlHeaders });
    }

    // GET /v1/categories
    if (path === "/v1/categories") {
      const { data, error } = await admin
        .from("categories")
        .select("id, slug, parent_id, name_de, name_en, name_tr, name_fr, name_nl, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) return jsonError("internal", "Could not fetch categories", rlHeaders);
      const byId = new Map((data ?? []).map((c) => [c.id, c]));
      const items = (data ?? []).map((c) => ({
        slug: c.slug,
        name: localized(c as Record<string, unknown>, "name", lang),
        parent_slug: c.parent_id ? (byId.get(c.parent_id)?.slug ?? null) : null,
      }));
      return jsonOk(items, { headers: rlHeaders });
    }

    // GET /v1/brands
    if (path === "/v1/brands") {
      const { data, error } = await admin
        .from("brands")
        .select("slug, name, logo_url, website, country")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) return jsonError("internal", "Could not fetch brands", rlHeaders);
      return jsonOk(data ?? [], { headers: rlHeaders });
    }

    return jsonError("not_found", "Unknown endpoint", rlHeaders);
  } catch {
    return jsonError("internal", "Unexpected error", rlHeaders);
  }
});
