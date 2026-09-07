/**
 * Ortak yerleştirme matematiği — bir katalog ürününü domain uzayında `centerMm`
 * MERKEZLİ olacak şekilde yerleştirmek için `addEquipment` girdisini üretir.
 *
 * 3B (zemine tıkla / karta tıkla / sürükle-bırak) ve 2B (plana tıkla /
 * sürükle-bırak) yolları bunu kullanır → footprint min-köşe çevrimi, mount
 * (zemin/duvar), çakışma çözme, komşuya yaslama ve oda-içi tutma kuralları TEK
 * yerde. Katalog varsayılan overlap izni korunur.
 */

import type { Equipment, ProjectDocument, Vec2 } from '../../../core/types';
import type { EquipmentItem } from '../../../../../stores/equipmentStore';
import { othersAtHeight, resolveCollision, snapToEdges } from './collision';
import {
  containFloorItem,
  defaultMountFor,
  defaultZForMount,
  mountToWall,
  snapFloorItemToWalls,
} from './placement';
import { getCatalogEntry } from '../loaders/equipmentCatalog';
import { mapEquipmentCategory, parseHeightMm } from '../loaders/productMesh';

export type EquipmentInput = Omit<Equipment, 'id' | 'type'>;

export function buildEquipmentPlacement(
  project: ProjectDocument,
  item: EquipmentItem,
  centerMm: { x: number; y: number },
  rotationRad = 0,
): EquipmentInput {
  const heightMm = parseHeightMm(item.h);
  const category = mapEquipmentCategory(item.cat);
  const mount = defaultMountFor(category);
  // Domain anchor: position = footprint MIN-KÖŞE. Merkezi min-köşeye çevir.
  let xMm = centerMm.x - item.l / 2;
  let yMm = centerMm.y - item.w / 2;
  let rotation = rotationRad;
  const zMm = defaultZForMount(mount);

  // Yeni ürünün overlap izni katalog varsayılanından gelir (yoksa undefined/false).
  const allowOverlap = getCatalogEntry(item.id)?.allowOverlap;
  // Yalnızca kendi yükseklik bandındaki + overlap-izinSİZ ürünler çakışsın
  // (tezgah üstüne mikrodalga / range üstüne davlumbaz serbest kalsın).
  const others = othersAtHeight(zMm, heightMm, Object.values(project.equipment))
    .filter((o) => !o.allowOverlap);

  if (mount === 'wall') {
    // Davlumbaz vb.: en yakın duvara, odaya bakar şekilde yapıştır.
    const mounted = mountToWall(project, centerMm, item.l, item.w);
    if (mounted) {
      rotation = mounted.rotation;
      const pos = allowOverlap
        ? mounted.pos
        : resolveCollision(mounted.pos, rotation, item.l, item.w, others, null);
      xMm = pos.x;
      yMm = pos.y;
    }
  } else {
    // Overlap'e izinli DEĞİLSE: komşuya yanaş, örtüşmeyi it. (İzinliyse üst üste serbest.)
    let px = xMm;
    let py = yMm;
    if (!allowOverlap) {
      const snapped = snapToEdges({ x: px, y: py }, rotation, item.l, item.w, others, null, 50);
      const safe = resolveCollision(snapped, rotation, item.l, item.w, others, null);
      px = safe.x;
      py = safe.y;
    }
    // Yakın duvara yapıştır (yanaşma), sonra oda duvarlarının dışına taşmasın (HER ZAMAN).
    const snappedWall = snapFloorItemToWalls(project, { x: px, y: py }, rotation, item.l, item.w);
    const contained = containFloorItem(project, snappedWall, rotation, item.l, item.w);
    xMm = contained.x;
    yMm = contained.y;
  }

  return {
    catalogId: item.id,
    name: item.name,
    category,
    position: { x: xMm, y: yMm, z: zMm },
    rotation,
    mount,
    footprint: { width: item.l, depth: item.w },
    heightMm,
    allowOverlap,
  };
}

/**
 * Karta tıklayarak yerleştirme için makul bir varsayılan domain noktası: çizilen
 * duvarların köşe (vertex) ortalaması ≈ odanın iç merkezi. Buradan sonra
 * containFloorItem ürünü oda poligonuna çeker, resolveCollision üst üste
 * binmeyi engeller — yani merkezin tam "içeride" olması şart değil. Boş projede
 * origin.
 */
export function roomCenterDomain(project: ProjectDocument): Vec2 {
  const verts = Object.values(project.vertices);
  if (verts.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const v of verts) {
    sx += v.x;
    sy += v.y;
  }
  return { x: sx / verts.length, y: sy / verts.length };
}
