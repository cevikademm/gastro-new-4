/**
 * designProductSync — TEKLİF/Ürünler tarafındaki ürünleri TASARIM belgesine
 * (ProjectDocument.equipment) köprüler. `designQuoteLines.ts`'in TAM TERSİ yönü:
 * orada tasarım ekipmanı → teklif satırı; burada teklif ürünü → tasarım ekipmanı.
 *
 * NEDEN: "Ürün Ekle" ile eklenen ürünler (diamond projectStore.project.products)
 * teklifte ve Ürünler'de görünüyor ama 2D/3D tasarım tuvalinde görünmüyordu —
 * çünkü tasarım belgesi ayrı bir store. Bu yardımcı, tasarım açılışında teklifte
 * OLUP belgede HENÜZ OLMAYAN ürünleri belgeye, oda içine, çakışmadan ekler.
 *
 * Köprü alanı: ProductItem.code === Equipment.catalogId (=== katalog id).
 *
 * SAF: store'a / localStorage'a dokunmaz; sadece yeni bir belge döndürür.
 * YALNIZCA-EKLE: mevcut ekipmana asla dokunmaz; yalnızca eksik catalogId'leri ekler.
 */
import type {
  Equipment,
  EquipmentCategory,
  EquipmentId,
  ProjectDocument,
  Vec2,
} from '../modules/three-d-design';
import {
  newId,
  projectBounds,
  roomContainmentPolygon,
  roomForPoint,
} from '../modules/three-d-design';
import {
  othersAtHeight,
  resolveCollision,
} from '../modules/three-d-design/modules/3d-editor/interaction/collision';
import { containFloorItem } from '../modules/three-d-design/modules/3d-editor/interaction/placement';

/**
 * Çağıran (ThreeDDesignPage) cm→mm çevirir ve diamond `ProductItem`'i buna
 * indirger. Ölçü birimi: MM.
 */
export interface ProductLike {
  /** ProductItem.code → Equipment.catalogId. */
  code: string;
  name: string;
  /** Diamond kategori (cooking|cold|cleaning|neutral|other) ya da serbest string. */
  category: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

/**
 * Diamond store'un 5'li kategorisini → tasarım modülünün 8'li
 * EquipmentCategory'sine eşler. Bilinmeyen → 'other'.
 */
function mapProductCategory(category: string): EquipmentCategory {
  switch (category) {
    case 'cooking':
      return 'cooking';
    case 'cold':
      return 'refrigeration';
    case 'cleaning':
      return 'washing';
    case 'neutral':
      return 'furniture';
    case 'other':
    default:
      return 'other';
  }
}

const DEFAULT_WIDTH_MM = 600;
const DEFAULT_DEPTH_MM = 600;
const DEFAULT_HEIGHT_MM = 850;

/** Izgara hücreleri arası boşluk (mm). */
const GRID_GAP_MM = 150;
/** Otomatik yerleştirme alanının kenarından içeri pay (mm). */
const AREA_PADDING_MM = 300;

interface PlacementArea {
  /** Sol-üst köşe (min x/y), mm. */
  originX: number;
  originY: number;
  /** Kullanılabilir genişlik (x ekseni), mm. */
  width: number;
}

/**
 * Otomatik yerleştirme için başlangıç alanı:
 *   1) Oda varsa: o odanın İÇ (containment) poligonunun bbox'ı, biraz pay ile.
 *   2) Oda yok ama geometri/ekipman varsa: projectBounds bbox'ı.
 *   3) Hiçbiri yoksa: origin civarı geniş bir alan.
 */
function placementArea(doc: ProjectDocument): PlacementArea {
  // Oda merkezini bulmak için herhangi bir ekipman/bbox merkezini deneriz;
  // yoksa origin'i kullanırız.
  const bounds = projectBounds(doc);
  const probe: Vec2 = bounds
    ? {
        x: (bounds.min.x + bounds.max.x) / 2,
        y: (bounds.min.y + bounds.max.y) / 2,
      }
    : { x: 0, y: 0 };

  const room = roomForPoint(doc, probe);
  if (room) {
    const inner = roomContainmentPolygon(doc, room);
    if (inner && inner.length >= 3) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const p of inner) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      return {
        originX: minX + AREA_PADDING_MM,
        originY: minY + AREA_PADDING_MM,
        width: Math.max(DEFAULT_WIDTH_MM, maxX - minX - AREA_PADDING_MM * 2),
      };
    }
  }

  if (bounds) {
    return {
      originX: bounds.min.x + AREA_PADDING_MM,
      originY: bounds.min.y + AREA_PADDING_MM,
      width: Math.max(DEFAULT_WIDTH_MM, bounds.max.x - bounds.min.x - AREA_PADDING_MM * 2),
    };
  }

  return { originX: 0, originY: 0, width: 6000 };
}

export interface ReconcileResult {
  doc: ProjectDocument;
  added: number;
}

/**
 * Teklifte olup belgede olmayan ürünleri belgeye ekler (oda içine, ızgaraya,
 * çakışmadan). SAF: girdiyi mutasyona uğratmaz, klon döndürür.
 *
 *  - `doc.equipment`'taki mevcut catalogId kümesi çıkarılır.
 *  - `products`'tan catalogId'si bu kümede OLMAYANLAR (eksikler) sırayla eklenir.
 *  - Aynı `products` listesinde tekrar eden code'lar bir kez eklenir (dedup).
 *  - Her eksik için footprint + ~boşluk kadar ilerleyen ızgara hücresine konur;
 *    `resolveCollision` (şimdiye dek eklenenler + mevcut, aynı yükseklik bandı)
 *    ve `containFloorItem` (oda içinde tut) ile düzeltilir.
 */
export function reconcileProductsIntoDesign(
  doc: ProjectDocument,
  products: ProductLike[],
): ReconcileResult {
  // Belgeyi klonla — saf kal.
  const next: ProjectDocument =
    typeof structuredClone === 'function'
      ? structuredClone(doc)
      : (JSON.parse(JSON.stringify(doc)) as ProjectDocument);

  // Mevcut + bu çağrıda eklenen catalogId kümesi (dedup).
  const present = new Set<string>();
  for (const eq of Object.values(next.equipment)) {
    if (eq.catalogId) present.add(eq.catalogId);
  }

  // Eklenecek eksikler (giriş sırası korunur, code'a göre tekilleştirilir).
  const missing: ProductLike[] = [];
  for (const p of products) {
    if (!p.code || present.has(p.code)) continue;
    present.add(p.code);
    missing.push(p);
  }
  if (missing.length === 0) return { doc: next, added: 0 };

  const area = placementArea(next);

  // Izgara akışı: soldan sağa; satır dolunca alt satıra. Satır yüksekliği o
  // satırdaki en derin ürüne göre büyür.
  let cursorX = area.originX;
  let cursorY = area.originY;
  let rowDepth = 0;
  let added = 0;

  for (const p of missing) {
    const width = p.widthMm > 0 ? p.widthMm : DEFAULT_WIDTH_MM;
    const depth = p.depthMm > 0 ? p.depthMm : DEFAULT_DEPTH_MM;
    const height = p.heightMm > 0 ? p.heightMm : DEFAULT_HEIGHT_MM;

    // Satır taşarsa bir alt satıra geç.
    if (cursorX > area.originX && cursorX + width > area.originX + area.width) {
      cursorX = area.originX;
      cursorY += rowDepth + GRID_GAP_MM;
      rowDepth = 0;
    }

    // Izgara hücresinin min-köşesi (position konvansiyonu = footprint min-corner).
    const desired: Vec2 = { x: cursorX, y: cursorY };

    // Yalnızca aynı yükseklik bandındaki ekipmanla çakışmayı çöz (tezgah üstü
    // serbest kalsın); sonra oda içinde tut. Çözülemezse en iyi konuma bırak.
    const blockers = othersAtHeight(0, height, Object.values(next.equipment));
    const resolved = resolveCollision(desired, 0, width, depth, blockers, null);
    const contained = containFloorItem(next, resolved, 0, width, depth);

    const id = newId('eq') as EquipmentId;
    const eq: Equipment = {
      id,
      type: 'equipment',
      catalogId: p.code,
      name: p.name,
      category: mapProductCategory(p.category),
      position: { x: contained.x, y: contained.y, z: 0 },
      rotation: 0,
      footprint: { width, depth },
      heightMm: height,
      mount: 'floor',
    };
    next.equipment[id] = eq;
    next.order.push(id);
    added += 1;

    // Bir sonraki hücre.
    cursorX += width + GRID_GAP_MM;
    if (depth > rowDepth) rowDepth = depth;
  }

  next.updatedAt = new Date().toISOString();
  return { doc: next, added };
}
