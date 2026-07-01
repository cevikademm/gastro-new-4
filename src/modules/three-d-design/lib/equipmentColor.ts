/**
 * Ortak ürün-rengi yardımcıları — 2B render (EquipmentLayer2D) ve özellik
 * panelleri (2D/3D) AYNI deterministik tonu kullansın diye tek kaynak.
 *
 * Renk override (Equipment.color) yoksa, `catalogId`'den altın-açı (137.508°)
 * dağılımıyla kararlı bir ton üretilir: aynı ürün hep aynı rengi alır, farklı
 * ürünler birbirinden net ayrışır.
 */

/** DJB2 hash → 32-bit unsigned. */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

/** catalogId/anahtar → deterministik hue (0–359). */
export function deterministicHue(key: string): number {
  return Math.round((hashStr(key) * 137.508) % 360);
}

/** 2B üst görünüm için pastel dolgu + koyu kenar (hsl string). */
export function colorForKey(key: string): { fill: string; stroke: string } {
  const hue = deterministicHue(key);
  return {
    fill: `hsl(${hue}, 70%, 80%)`,
    stroke: `hsl(${hue}, 60%, 38%)`,
  };
}

/** Deterministik ton → hex (renk seçicinin varsayılan değeri için). */
export function deterministicHex(key: string): string {
  return hslToHex(deterministicHue(key), 70, 80);
}

/** HSL (0–360, 0–100, 0–100) → `#rrggbb`. */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): string => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Hex rengi belirtilen oranda koyulaştırır (kenar çizgisi için). */
export function darkenHex(hex: string, amount: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 0xff) * (1 - amount));
  const g = Math.round(((n >> 8) & 0xff) * (1 - amount));
  const b = Math.round((n & 0xff) * (1 - amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
