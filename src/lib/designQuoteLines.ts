/**
 * designQuoteLines — 3D/2D tasarım aracında (three-d-design) yerleştirilen
 * ekipmanı TEKLİF satırlarına çevirir. Tek kaynak: tasarım belgesinin
 * `equipment`'ı. Aynı ürün (catalogId) ADETLE gruplanır; fiyat products.json'dan
 * (equipmentStore) alınır; katalogda olmayan (GLB/Meshy/jenerik) ürünler
 * `priceOnRequest=true` ("Fiyat sorulacak", 0 €) olur.
 *
 * NEDEN: Yeni tasarım aracının ekipmanı `gastro_design_projects`'e gidiyor;
 * teklif (ProjectDetailPage) ise eski floor-plan + project.products okuyordu →
 * tasarımda eklenen ürünler teklifte görünmüyordu. Bu yardımcı o köprüyü kurar.
 */
import { loadDesignLocal } from './gastroDesignSync';
import { useEquipmentStore, type EquipmentItem } from '../stores/equipmentStore';
import type { ProjectDocument } from '../modules/three-d-design';

export interface DesignQuoteLine {
  catalogId: string;
  name: string;
  qty: number;
  /** Birim fiyat (€). priceOnRequest ise 0. */
  unitPrice: number;
  /** unitPrice * qty (priceOnRequest ise 0). */
  lineTotal: number;
  /** Katalog fiyatı yok → "Fiyat sorulacak". */
  priceOnRequest: boolean;
  brand: string;
  kw: number;
  img?: string;
  /** Görüntüleme için cm cinsinden ölçüler. */
  dimsCm: { width: number; height: number; depth: number };
  category: string;
}

/** "850" ya da "850/1000" gibi string yükseklikten ilk sayıyı çek. */
function parseFirstNumber(s: string | number | undefined): number {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  const m = String(s).match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

/**
 * Tasarım belgesinin ekipmanını adetle gruplanmış, fiyatlandırılmış teklif
 * satırlarına çevirir. Saf fonksiyon — belgeyi dışarıdan ver.
 */
export function quoteLinesFromDoc(doc: ProjectDocument | null | undefined): DesignQuoteLine[] {
  if (!doc || !doc.equipment) return [];
  const getItem = useEquipmentStore.getState().getItemById;

  // catalogId'ye göre adetle grupla.
  const groups = new Map<
    string,
    { name: string; qty: number; footprint: { width: number; depth: number }; heightMm: number; category: string }
  >();
  for (const eq of Object.values(doc.equipment)) {
    const key = eq.catalogId || eq.name || eq.id;
    const g = groups.get(key);
    if (g) {
      g.qty += 1;
    } else {
      groups.set(key, {
        name: eq.name,
        qty: 1,
        footprint: eq.footprint,
        heightMm: eq.heightMm,
        category: eq.category,
      });
    }
  }

  const lines: DesignQuoteLine[] = [];
  for (const [catalogId, g] of groups) {
    const cat: EquipmentItem | undefined = getItem(catalogId);
    const price = cat?.price ?? 0;
    const priceOnRequest = !cat || !(price > 0);
    const unitPrice = priceOnRequest ? 0 : price;
    lines.push({
      catalogId,
      name: cat?.name || g.name,
      qty: g.qty,
      unitPrice,
      lineTotal: unitPrice * g.qty,
      priceOnRequest,
      brand: cat?.brand || '',
      kw: cat?.kw || 0,
      img: cat?.img,
      dimsCm: {
        width: Math.round((cat?.l ?? g.footprint.width) / 10),
        height: Math.round((cat?.w ?? g.footprint.depth) / 10),
        depth: Math.round((parseFirstNumber(cat?.h) || g.heightMm) / 10),
      },
      category: g.category || 'other',
    });
  }

  // Belirli sıra: önce fiyatlı, sonra ada göre.
  lines.sort(
    (a, b) => Number(a.priceOnRequest) - Number(b.priceOnRequest) || a.name.localeCompare(b.name),
  );
  return lines;
}

/**
 * Senkron: bu projenin YEREL (localStorage) tasarım belgesini okuyup teklif
 * satırlarına çevirir. (Liste sayfası için hızlı yol; çapraz-cihaz için
 * ProjectDetailPage ayrıca loadBestDesign ile async tazeler.)
 */
export function designQuoteLines(projectId: string): DesignQuoteLine[] {
  return quoteLinesFromDoc(loadDesignLocal(projectId));
}
