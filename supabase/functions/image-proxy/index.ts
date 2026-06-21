// image-proxy — fetch cross-origin images server-side and return them CORS-safe.
// ============================================================================
// GET /image-proxy?url=<encoded https image url>
//
// The frontend uses this to load remote product/brand images into a <canvas>
// or jsPDF document without tripping browser CORS (needed for PDF/quote export).
// Public (deploy with --no-verify-jwt). Includes a basic SSRF guard + size/time
// limits so it can't be abused as an open relay into internal networks.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Optional comma-separated host-suffix allowlist (e.g. "supabase.co,diamond-eu.com").
// Empty = allow any public https host (still blocks internal/private targets below).
const ALLOWED_HOSTS = (Deno.env.get("IMAGE_PROXY_ALLOWED_HOSTS") || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB
const FETCH_TIMEOUT_MS = 10_000;

function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  // Block obvious internal / link-local / metadata targets.
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.|::1|fe80:|fc00:|fd00:)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (h === "metadata.google.internal") return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: CORS });
  }

  const target = new URL(req.url).searchParams.get("url");
  if (!target) return new Response("Missing url", { status: 400, headers: CORS });

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Invalid url", { status: 400, headers: CORS });
  }

  if (parsed.protocol !== "https:") {
    return new Response("Only https is allowed", { status: 400, headers: CORS });
  }
  if (isBlockedHost(parsed.hostname)) {
    return new Response("Host not allowed", { status: 403, headers: CORS });
  }
  if (
    ALLOWED_HOSTS.length &&
    !ALLOWED_HOSTS.some((suf) => parsed.hostname.toLowerCase().endsWith(suf))
  ) {
    return new Response("Host not in allowlist", { status: 403, headers: CORS });
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const upstream = await fetch(parsed.toString(), {
      signal: ctrl.signal,
      headers: { Accept: "image/*,*/*;q=0.8" },
    });
    if (!upstream.ok) {
      return new Response(`Upstream ${upstream.status}`, { status: 502, headers: CORS });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    // Only proxy images — refuse to relay arbitrary content types.
    if (!contentType.startsWith("image/")) {
      return new Response("Not an image", { status: 415, headers: CORS });
    }

    const len = Number(upstream.headers.get("content-length") || "0");
    if (len && len > MAX_BYTES) {
      return new Response("Image too large", { status: 413, headers: CORS });
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return new Response("Image too large", { status: 413, headers: CORS });
    }

    return new Response(buf, {
      headers: {
        ...CORS,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    const aborted = (err as Error).name === "AbortError";
    return new Response(aborted ? "Upstream timeout" : "Fetch failed", {
      status: aborted ? 504 : 502,
      headers: CORS,
    });
  } finally {
    clearTimeout(timer);
  }
});
