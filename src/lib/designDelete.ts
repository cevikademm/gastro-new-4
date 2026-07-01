/**
 * designDelete — 3D/2D tasarımda bir ekipmanı "HER YERDEN" siler.
 *
 * Kullanıcı isteği: teklif listesindeki istemediği ürünleri tasarım alanından
 * silince ürün KALICI olarak kalksın (reload'da geri gelmesin) ve otomatik
 * kaydedilsin. `reconcileProductsIntoDesign` yalnızca-EKLE çalıştığından, teklif
 * satırı durdukça silinen ekipman her açılışta geri eklenir; bu yüzden kalıcı
 * silme için teklif satırını da kaldırmak gerekir.
 *
 * Bu yardımcı iki tarafı birden temizler:
 *   1) Tasarım belgesi (project.equipment) — `removeEquipment` project referansını
 *      değiştirir → ThreeDDesignPage'in auto-save effect'i localStorage + Supabase'e
 *      yazar.
 *   2) Teklif/Ürünler listesi (diamond projectStore.project.products) — aynı ürün
 *      (Equipment.catalogId === ProductItem.code) kaldırılır → o store persist +
 *      debouncedSyncProjects ile otomatik kalıcılaşır.
 *
 * Standalone (/3d-design) modunda teklif kavramı yoktur → yalnız tasarımdan siler.
 *
 * Aktif projectKey render dışından (Delete tuşu, InteractionController) da okunabilsin
 * diye modül düzeyinde tutulur; ThreeDDesignPage açılışta `setActiveDesignProjectKey`
 * ile ayarlar (böylece silme çağrılarına prop threading gerekmez).
 */
import { useProjectStore } from '../modules/three-d-design';
import { useProjectStore as useTeklifStore } from '../stores/projectStore';
import {
  STANDALONE_KEY,
  loadBestDesign,
  saveDesignLocal,
  syncDesignProject,
} from './gastroDesignSync';

let activeProjectKey: string = STANDALONE_KEY;

/** ThreeDDesignPage açılışta/route değişiminde çağırır. */
export function setActiveDesignProjectKey(key: string | undefined | null): void {
  activeProjectKey = key || STANDALONE_KEY;
}

/**
 * Ekipmanı tasarımdan ve (proje modundaysa) teklif listesinden kaldırır.
 * Her iki taraf da otomatik kaydedilir. Standalone'da yalnız tasarımdan siler.
 */
export function removeEquipmentEverywhere(equipmentId: string): void {
  const design = useProjectStore.getState();
  const eq = design.project.equipment[equipmentId];
  const catalogId = eq?.catalogId;

  // 1) Tasarımdan kaldır (project referansı değişir → otomatik kayıt).
  design.removeEquipment(equipmentId);

  // Standalone ya da katalog kimliği yoksa teklif tarafı yok.
  if (!catalogId || activeProjectKey === STANDALONE_KEY) return;

  // Aynı catalogId'yi kullanan başka ekipman hâlâ varsa teklif satırını KORU
  // (kullanıcı aynı üründen 2 adet koymuş olabilir — biri silinince teklif düşmez).
  const stillUsed = Object.values(useProjectStore.getState().project.equipment).some(
    (e) => e.catalogId === catalogId,
  );
  if (stillUsed) return;

  // 2) Teklif/Ürünler listesinden de kaldır (persist + Supabase sync otomatik).
  const teklif = useTeklifStore.getState();
  const project = teklif.projects.find((p) => p.id === activeProjectKey);
  const match = project?.products.find((pr) => pr.code === catalogId);
  if (match) teklif.removeProductFromProject(activeProjectKey, match.id);
}

/**
 * Teklif/proje detay sayfasındaki bir ürünü kaynağı ne olursa olsun HER YERDEN
 * kaldırır. Teklif satırları 3 kaynaktan türer:
 *   - tasarım belgesi (designLines)  → catalogId
 *   - kat planı (localStorage)       → item id / equipmentId
 *   - teklif store (project.products)→ ProductItem.code / id
 * Hepsi `key` ile temizlenir; silinen ürün reload'da geri gelmez.
 *
 * `key` = QuoteRow.id (designRow: catalogId; floorRow: equipmentId||id === code).
 * Async: kayıtlı tasarım belgesi Supabase'den de tazelenip geri yazıldığı için.
 */
export async function removeQuoteItemEverywhere(projectId: string, key: string): Promise<void> {
  if (!projectId || !key) return;

  // 1) Teklif/Ürünler store'u: code === key (ya da id === key) olan ürün(ler).
  const teklif = useTeklifStore.getState();
  const proj = teklif.projects.find((p) => p.id === projectId);
  if (proj) {
    for (const pr of proj.products.filter((x) => x.code === key || x.id === key)) {
      teklif.removeProductFromProject(projectId, pr.id);
    }
  }

  // 2) Kat planı (localStorage 2mc-floorplan-<id>): id / equipmentId === key.
  try {
    const fkey = `2mc-floorplan-${projectId}`;
    const raw = localStorage.getItem(fkey);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.items)) {
        data.items = data.items.filter(
          (it: { id?: string; equipmentId?: string }) =>
            (it.equipmentId || it.id) !== key && it.id !== key,
        );
        localStorage.setItem(fkey, JSON.stringify(data));
      }
    }
  } catch {
    /* localStorage erişilemedi — yoksay */
  }

  // 3) Canlı tasarım store'u BU projeyi gösteriyorsa oradan da çıkar (yoksa başka
  //    projenin aynı catalogId'li ürününe DOKUNMAYIZ → çapraz kirlenme olmaz).
  if (activeProjectKey === projectId) {
    const design = useProjectStore.getState();
    for (const [eqId, eq] of Object.entries(design.project.equipment)) {
      // Satır kimliği quoteLinesFromDoc'taki gruplama anahtarıyla AYNI olmalı:
      // catalogId yoksa name/id'ye düşer (katalogsuz GLB/jenerik ürünler de silinsin).
      if ((eq.catalogId || eq.name || eqId) === key) design.removeEquipment(eqId);
    }
  }

  // 4) Kayıtlı tasarım belgesi (localStorage + Supabase): catalogId === key olan
  //    ekipmanı çıkar, geri yaz → 3D'yi tekrar açınca geri gelmez.
  try {
    const res = await loadBestDesign(projectId);
    if (res?.doc) {
      const doc = res.doc;
      let changed = false;
      for (const [eqId, eq] of Object.entries(doc.equipment)) {
        // quoteLinesFromDoc ile aynı kimlik: catalogId || name || id.
        if ((eq.catalogId || eq.name || eqId) === key) {
          delete doc.equipment[eqId];
          const ord = doc.order.indexOf(eqId);
          if (ord !== -1) doc.order.splice(ord, 1);
          changed = true;
        }
      }
      if (changed) {
        doc.updatedAt = new Date().toISOString();
        saveDesignLocal(doc, projectId);
        await syncDesignProject(doc, projectId);
      }
    }
  } catch {
    /* tasarım belgesi yüklenemedi — teklif/kat planı yine de temizlendi */
  }
}
