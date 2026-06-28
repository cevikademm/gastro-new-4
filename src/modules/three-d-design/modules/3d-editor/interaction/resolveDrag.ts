/**
 * resolveEquipmentDrag — ekipman sürükleme yerleştirme mantığının TEK kaynağı.
 *
 * Hem 3D editör (InteractionController.dragSelectedTo) hem 2D editör
 * (EquipmentLayer2D / DesignStudio2D) bu saf fonksiyonu çağırır → iki görünüm
 * BİREBİR aynı davranır (grid snap, kenar snap, çakışma çözme, anti-tünel,
 * duvara yanaşma, oda-içi clamp, duvar-monte kayma).
 *
 * Tüm koordinatlar DOMAIN mm; konum footprint MIN-CORNER'ıdır.
 */
import type { Equipment, ProjectDocument } from '../../../core/types';
import { othersAtHeight, resolveCollision, snapToEdges } from './collision';
import {
  blockWallCrossing,
  containFloorItem,
  mountToWall,
  obbCenterFromMinCorner,
  snapFloorItemToWalls,
} from './placement';

export interface DragResolveInput {
  project: ProjectDocument;
  eq: Equipment;
  /** İstenen footprint MIN-CORNER (domain mm). */
  desiredMinCornerMm: { x: number; y: number };
  /** Kaba grid snap (mm). 0 = kapalı. Default 10. */
  snapGridMm?: number;
  /** Komşuya yanaşma toleransı (mm). Default 50. */
  edgeSnapTolMm?: number;
  /** Çakışma/snap aktif mi (Shift ile bypass için false). Default true. */
  collisionEnabled?: boolean;
  /** Anti-tünel için son GEÇERLİ OBB merkezi (domain mm). */
  prevValidCenter?: { x: number; y: number } | null;
}

export interface DragResolveResult {
  /** Çözülen MIN-CORNER (domain mm) — store'a yazılır. */
  x: number;
  y: number;
  /** Duvar-monte ürünlerde türetilen yaw (rad); zemin ürünlerinde eq.rotation. */
  rotation: number;
  /** Çözülen OBB merkezi (domain mm) — bir sonraki anti-tünel referansı. */
  validCenter: { x: number; y: number };
}

export function resolveEquipmentDrag(input: DragResolveInput): DragResolveResult {
  const {
    project,
    eq,
    snapGridMm = 10,
    edgeSnapTolMm = 50,
    collisionEnabled = true,
    prevValidCenter = null,
  } = input;

  let xMm = input.desiredMinCornerMm.x;
  let yMm = input.desiredMinCornerMm.y;

  // 1) Kaba grid snap (B2B raporlarında temiz sayılar).
  if (snapGridMm > 0) {
    xMm = Math.round(xMm / snapGridMm) * snapGridMm;
    yMm = Math.round(yMm / snapGridMm) * snapGridMm;
  }

  let rotation = eq.rotation;
  const w = eq.footprint.width;
  const d = eq.footprint.depth;
  // Yalnız aynı yükseklik bandındaki ürünler engeller.
  const others = othersAtHeight(eq.position.z, eq.heightMm, Object.values(project.equipment));

  if (eq.mount === 'wall') {
    // Duvar ürünü en yakın duvar boyunca kayar; arka yüz duvara dayalı kalır.
    const cursorCenter = obbCenterFromMinCorner(xMm, yMm, eq.rotation, w, d);
    const mounted = mountToWall(project, cursorCenter, w, d);
    if (mounted) {
      xMm = mounted.pos.x;
      yMm = mounted.pos.y;
      rotation = mounted.rotation;
      if (collisionEnabled) {
        const resolved = resolveCollision({ x: xMm, y: yMm }, rotation, w, d, others, eq.id);
        xMm = resolved.x;
        yMm = resolved.y;
      }
    }
  } else {
    if (collisionEnabled) {
      // 2) Komşuya yanaş, 3) kalan örtüşmeyi it.
      const snapped = snapToEdges({ x: xMm, y: yMm }, rotation, w, d, others, eq.id, edgeSnapTolMm);
      const resolved = resolveCollision(snapped, rotation, w, d, others, eq.id);
      xMm = resolved.x;
      yMm = resolved.y;

      // 3a) Anti-tünel: merkez hiçbir duvarı geçemesin.
      if (prevValidCenter) {
        const center = obbCenterFromMinCorner(xMm, yMm, rotation, w, d);
        const blocked = blockWallCrossing(project, prevValidCenter, center);
        xMm += blocked.x - center.x;
        yMm += blocked.y - center.y;
      }

      // 3b) Yakın duvara arka yüzünü yapıştır.
      const snappedWall = snapFloorItemToWalls(project, { x: xMm, y: yMm }, rotation, w, d);
      xMm = snappedWall.x;
      yMm = snappedWall.y;
    }
    // 4) Footprint'i oda duvarları içinde tut (oda yoksa no-op).
    const contained = containFloorItem(project, { x: xMm, y: yMm }, rotation, w, d);
    xMm = contained.x;
    yMm = contained.y;
  }

  const validCenter = obbCenterFromMinCorner(xMm, yMm, rotation, w, d);
  return { x: xMm, y: yMm, rotation, validCenter };
}
