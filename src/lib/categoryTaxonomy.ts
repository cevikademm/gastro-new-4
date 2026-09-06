/**
 * Ürün taksonomisi — Combisteel tarzı iki seviyeli kategori menüsü için
 * TEK doğruluk kaynağı (UI girişi).
 *
 * Saf sınıflandırma mantığı `./categoryTaxonomy.core.ts`'dedir (i18n'siz; Node
 * script'leri ve SEO renderer oradan okur). Bu dosya çekirdeği re-export eder
 * ve üstüne kullanıcıya gösterilen ÇEVRİLMİŞ etiket yardımcılarını ekler:
 * `SubGroup.label` kod içinde Türkçe kaynak (fallback) tutulur; gösterilen ad
 * `getSubGroupsFor` / `subGroupLabel` içinde `categoryTaxonomy.<id>` anahtarıyla
 * i18n üzerinden çözülür.
 */
import i18n from '../i18n';
import {
  SUBGROUPS,
  OTHER_SUBGROUP,
  buildIndex,
  type SubGroupCount,
  type EquipmentItem,
} from './categoryTaxonomy.core';

export * from './categoryTaxonomy.core';

/**
 * Bir alt-grup / sanal grup id'sini kullanıcıya gösterilen (çevrilmiş) etikete
 * çevirir. i18n `categoryTaxonomy.<id>` anahtarı varsa onu, yoksa kod içindeki
 * ham (Türkçe) etiketi döndürür — böylece anahtar eksikse bile UI bozulmaz.
 */
function tLabel(id: string, fallback: string): string {
  return i18n.t(`categoryTaxonomy.${id}`, { defaultValue: fallback });
}

/** Bir kategorinin sıralı alt-grupları + ürün sayıları (boş olanlar atlanır, "Sonstige" sona). */
export function getSubGroupsFor(catId: string, items: EquipmentItem[]): SubGroupCount[] {
  const defined = SUBGROUPS[catId];
  // Küratörlü alt-grubu olmayan kategoriler düz kalır (tek "Sonstige" gösterme).
  if (!defined || defined.length === 0) return [];
  const idx = buildIndex(items).get(catId);
  if (!idx) return [];
  const out: SubGroupCount[] = defined
    .filter((sg) => (idx.subGroups.get(sg.id) || 0) > 0)
    .map((sg) => ({ id: sg.id, label: tLabel(sg.id, sg.label), count: idx.subGroups.get(sg.id) || 0 }));
  const assigned = out.reduce((s, r) => s + r.count, 0);
  const other = idx.count - assigned;
  if (other > 0) out.push({ id: OTHER_SUBGROUP, label: tLabel(OTHER_SUBGROUP, 'Diğer'), count: other });
  return out;
}

/** Alt-grup id → temiz etiket (deep-link başlığı için). */
export function subGroupLabel(catId: string, subId: string): string {
  if (subId === OTHER_SUBGROUP) return tLabel(OTHER_SUBGROUP, 'Diğer');
  const fallback = SUBGROUPS[catId]?.find((sg) => sg.id === subId)?.label || subId;
  return tLabel(subId, fallback);
}
