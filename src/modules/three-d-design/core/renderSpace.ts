/**
 * renderSpace — 2D (domain) ↔ 3D (render) SUNUM köprüsü.
 *
 * Kök sorun: 2D Konva sahnesi domain +Y'yi AŞAĞI çizer; 3D ise contentRoot
 * (rotation.x = -π/2) + Y-yukarı kamera ile domain +Y'yi YUKARI/geriye sunar.
 * İki görünümün el-yönü (chirality) zıt → 3D, 2D'nin AYNASI çıkar.
 *
 * Çözüm: contentRoot'u SAF DÖNÜŞ bırak (negatif scale gizmo/decompose'u bozar,
 * ürün görsel etiketlerini de ters-yüz eder), yansımayı yalnızca domain↔render
 * VERİ SINIRINDA uygula: domain Y'yi X ekseni etrafında yansıt. Böylece 3D
 * layout, 2D'de çizilen tarafı birebir gösterir; geometri/etiket ters dönmez.
 *
 * Tüm koordinatlar DOMAIN mm; radyan yaw.
 */

/** Tek anahtar — test X-ekseni yansıması gösterirse buradan kapatılır (analiz Y-flip diyor). */
export const FLIP_Y = true;

/** Nokta koordinatı: domain Y ↔ render Y (kendi tersidir). Duvar a/b, köşe, zemin, tıklama noktası, focus. */
export const flipPointY = (yMm: number): number => (FLIP_Y ? -yMm : yMm);

/** Ekipman yönü (yaw): domain ↔ render (kendi tersidir). */
export const flipYaw = (rad: number): number => (FLIP_Y ? -rad : rad);

/**
 * Ekipman yerleşimi (footprint MİN-KÖŞE + yaw) domain ↔ render.
 *
 * Konum footprint min-köşesidir ve YAW min-köşe etrafında döner (productMesh:
 * dış group origin = min-köşe). Bu yüzden yansıma MERKEZ üzerinden yapılır:
 * merkez Y'yi negatifle + yaw'ı negatifle → yeni min-köşeyi merkezden yeniden türet.
 * Tüm dönüşlerde DOĞRU ve KENDİ TERSİDİR (involution): render↔domain aynı fonksiyon.
 */
export function flipEquipPlacement(
  xMin: number,
  yMin: number,
  yaw: number,
  w: number,
  d: number,
): { x: number; y: number; yaw: number } {
  if (!FLIP_Y) return { x: xMin, y: yMin, yaw };
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  // min-köşe → OBB merkez (obbCenterFromMinCorner ile aynı)
  const cx = xMin + (w / 2) * cos - (d / 2) * sin;
  const cy = yMin + (w / 2) * sin + (d / 2) * cos;
  // merkezi X ekseninde yansıt + yaw'ı ters çevir
  const ry = -cy;
  const ryaw = -yaw;
  const rcos = Math.cos(ryaw);
  const rsin = Math.sin(ryaw);
  // yansıyan merkez → yansıyan min-köşe (centerToMinCorner ile aynı)
  return {
    x: cx - (w / 2) * rcos + (d / 2) * rsin,
    y: ry - (w / 2) * rsin - (d / 2) * rcos,
    yaw: ryaw,
  };
}
