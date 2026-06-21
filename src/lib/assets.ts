// assets.ts — centralizes external asset URLs so they derive from the active
// Supabase project (VITE_SUPABASE_URL) instead of being hardcoded to one project.
//
// Override either with an explicit env var if assets live elsewhere:
//   VITE_IMAGE_PROXY_URL   — full URL of the image-proxy edge function
//   VITE_BRAND_ASSETS_URL  — base URL of the public "2mcwerbung" brand bucket

const SUPABASE_URL = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) || '').replace(/\/$/, '');

/** image-proxy edge function — routes cross-origin images for CORS-safe canvas/PDF use. */
export const IMAGE_PROXY_URL =
  (import.meta.env.VITE_IMAGE_PROXY_URL as string | undefined) ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/image-proxy` : '');

const BRAND_ASSETS_BASE =
  (import.meta.env.VITE_BRAND_ASSETS_URL as string | undefined) ||
  (SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/2mcwerbung` : '');

/** Full URL for a public brand asset (e.g. brandAsset('logo4.png')). */
export function brandAsset(file: string): string {
  const f = file.replace(/^\//, '');
  return BRAND_ASSETS_BASE ? `${BRAND_ASSETS_BASE}/${f}` : '';
}

/** Route a cross-origin image URL through the proxy; same-origin URLs are returned as-is. */
export function proxiedImage(url: string): string {
  if (!url || !IMAGE_PROXY_URL) return url;
  try {
    if (typeof window !== 'undefined' && url.startsWith(window.location.origin)) return url;
  } catch {
    /* SSR / no window — fall through to proxy */
  }
  return `${IMAGE_PROXY_URL}?url=${encodeURIComponent(url)}`;
}
