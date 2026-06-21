// _shared/cors.ts — CORS helpers.
// Two modes:
//  - BASE_CORS / corsBase(): used by the management function (called from our own SPA).
//  - corsForKey(): strict per-key allowlist for the public gateway. We never emit a
//    wildcard for authenticated data; the request Origin is echoed only when allowed.
//  - PUBLIC_CORS: wildcard, used ONLY for non-sensitive public endpoints
//    (openapi.json, health) so the docs page can fetch them cross-origin.

const ALLOW_HEADERS = "authorization, x-api-key, x-client-info, apikey, content-type";

export const BASE_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": ALLOW_HEADERS,
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export const PUBLIC_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": ALLOW_HEADERS,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

/**
 * Strict CORS for the gateway. If the request Origin is in the key's allowlist,
 * echo it (browsers can then read the response); otherwise omit ACAO entirely
 * (browser blocks cross-origin reads, server-to-server callers are unaffected).
 */
export function corsForKey(
  reqOrigin: string | null,
  allowedOrigins: string[],
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
  if (reqOrigin && allowedOrigins.includes(reqOrigin)) {
    headers["Access-Control-Allow-Origin"] = reqOrigin;
  }
  return headers;
}
