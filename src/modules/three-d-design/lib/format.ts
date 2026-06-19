/** UI formatting helpers — kept here so they can be reused by 2D and 3D. */

export function formatLengthM(mm: number): string {
  return `${(mm / 1000).toFixed(2)} m`;
}

export function formatAreaM2(mm2: number): string {
  return `${(mm2 / 1_000_000).toFixed(2)} m²`;
}

export function formatAngleDeg(rad: number): string {
  return `${((rad * 180) / Math.PI).toFixed(1)}°`;
}
