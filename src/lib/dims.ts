/**
 * formatDims — ürün ölçülerini kartlarda göstermek için tek biçimlendirici.
 * Amaç: hangi ölçü verisi varsa onu göster (üçünün de dolu olması şart değil).
 *
 * - number / string kabul eder (yükseklik "850/900" gibi bölmeli olabilir → aynen korunur).
 * - null / undefined / '' / '0' → yok sayılır.
 * - Var olan ölçüler '×' ile birleşir, sonuna ' mm' eklenir.
 * - Hiç ölçü yoksa undefined döner (kartta satır çizilmez / boş kalır).
 */
export function formatDims(
  length?: number | string | null,
  width?: number | string | null,
  height?: number | string | null,
): string | undefined {
  const norm = (v: number | string | null | undefined): string | null => {
    if (v == null) return null;
    const s = String(v).trim();
    if (s === '' || s === '0') return null;
    return s;
  };
  const parts = [norm(length), norm(width), norm(height)].filter(Boolean) as string[];
  if (parts.length === 0) return undefined;
  return `${parts.join('×')} mm`;
}
