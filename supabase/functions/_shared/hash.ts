// _shared/hash.ts — key generation + SHA-256 hashing (Deno WebCrypto).
// The raw key never leaves the edge function except in the one-time create
// response; Postgres only ever sees the hash.

/** SHA-256 → lowercase hex (64 chars). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type ApiEnvironment = "live" | "sandbox";

/**
 * Generate a fresh API key: `2mc_<env>_<32+ random base64url chars>`.
 * Returns the raw key (shown once) and a non-secret display prefix.
 */
export function generateApiKey(env: ApiEnvironment): { raw: string; prefix: string } {
  const bytes = new Uint8Array(24); // 192 bits of entropy
  crypto.getRandomValues(bytes);
  const raw = `2mc_${env}_${base64url(bytes)}`;
  const prefix = raw.slice(0, `2mc_${env}_`.length + 4); // e.g. 2mc_live_AbC1
  return { raw, prefix };
}
