// Vercel Serverless Function — Diamond EU Senkronizasyon
// Her 3 saatte Vercel Cron tarafından tetiklenir
// GÜVENLİK: Tüm gizli bilgiler Vercel Environment Variables'dan okunur

import { createClient } from "@supabase/supabase-js";

const DIAMOND_API = "https://api.diamond-eu.com";
const DIAMOND_EMAIL = process.env.DIAMOND_EMAIL!;
const DIAMOND_PASSWORD = process.env.DIAMOND_PASSWORD!;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET || "";

export const config = { maxDuration: 300 };

export default async function handler(req: any, res: any) {
  // GÜVENLİK 1: Sadece POST metodu kabul edilir
  if (req.method !== "POST" && !req.headers["x-vercel-cron"]) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // GÜVENLİK 2: Vercel Cron header veya secret kontrolü
  const isVercelCron = req.headers["x-vercel-cron"] === "1";
  const hasValidSecret =
    CRON_SECRET && req.headers["authorization"] === `Bearer ${CRON_SECRET}`;

  if (!isVercelCron && !hasValidSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // GÜVENLİK 3: Gerekli env var kontrolü
  if (!DIAMOND_EMAIL || !DIAMOND_PASSWORD || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const start = Date.now();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Diamond'a giriş
    const loginRes = await fetch(`${DIAMOND_API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: DIAMOND_EMAIL, password: DIAMOND_PASSWORD }),
    });
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
    const { access_token } = await loginRes.json();

    // 2. Tüm ürünleri çek
    const products: any[] = [];
    let url: string | null = `${DIAMOND_API}/products-export?filter[is_old][value]=0`;

    while (url) {
      const r = await fetch(url, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Accept-Language": "tr",
        },
      });
      if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
      const data = await r.json();
      products.push(...(data.data || []));
      url = data.links?.next || null;
    }

    // 3. Mevcut ürünleri al (karşılaştırma için)
    const { data: existingProducts } = await supabase
      .from("diamond_products")
      .select("id, name, price_catalog, price_display, price_promo, stock, length_mm, width_mm, height_mm, weight");

    const existingMap = new Map(
      (existingProducts || []).map((p: any) => [p.id, p])
    );
    const existingIds = new Set(existingMap.keys());

    // 4. Supabase'e kaydet (500'er batch)
    const now = new Date().toISOString();
    const clean = (s: string) =>
      (s || "").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");

    const rows = products.map((p: any) => {
      const attr = p.attributes || {};
      const price = attr.price || {};
      const images = (attr.media?.images || [])[0] || {};
      return {
        id: p.id,
        name: clean(attr.name),
        description_tech_spec: clean(attr.description_tech_spec),
        popup_info: clean(attr.popup_info),
        currency: price.currency || "EUR",
        price_catalog: price.catalog ? parseFloat(price.catalog) : null,
        price_display: price.display ? parseFloat(price.display) : null,
        price_promo: price.promo ? parseFloat(price.promo) : null,
        page_catalog_number: attr.page_catalog_number,
        page_promo_number: attr.page_promo_number,
        stock: String(attr.stock ?? ""),
        restock_info: attr.restock_info,
        supplier_delivery_delay: attr.supplier_delivery_delay,
        days_to_restock_avg: attr.days_to_restock_avg,
        length_mm: attr.length_mm,
        width_mm: attr.width_mm,
        height_mm: attr.height_mm,
        volume_m3: attr.volume_m3,
        weight: attr.weight,
        weight_unit: attr.weight_unit,
        electric_power_kw: attr.electric_power_kw,
        electric_connection: attr.electric_connection,
        electric_connection_2: attr.electric_connection_2,
        vapor: attr.vapor,
        kcal_power: attr.kcal_power,
        horse_power: attr.horse_power,
        product_category_id: attr.product_category_id,
        product_range_id: attr.product_range_id,
        product_subrange_id: attr.product_subrange_id,
        product_family_id: attr.product_family_id,
        product_family_name: attr.product_family_name,
        product_subfamily_id: attr.product_subfamily_id,
        product_line_id: attr.product_line_id,
        image_big: images.big || images.Big || "",
        image_thumb: images.thumb || "",
        image_gallery: images["thumb-gallery"] || images["Thumb-gallery"] || "",
        image_full: images.full || "",
        is_new: !!attr.is_new,
        is_old: !!attr.is_old,
        is_good_deal: !!attr.is_good_deal,
        product_type: attr.product_type,
        has_accessories: !!attr.has_accessories,
        replacement_product_id: attr.replacement_product_id,
        synced_at: now,
      };
    });

    // 5. Değişiklikleri tespit et
    const changes: any[] = [];
    const newIds = new Set(rows.map((r) => r.id));

    for (const row of rows) {
      if (!existingIds.has(row.id)) {
        changes.push({
          product_id: row.id,
          product_name: row.name,
          change_type: "added",
          details: { price_catalog: row.price_catalog, stock: row.stock },
          synced_at: now,
        });
      } else {
        const old = existingMap.get(row.id);
        const diffs: Record<string, { old: any; new: any }> = {};
        const fields = ["name", "price_catalog", "price_display", "price_promo", "stock", "length_mm", "width_mm", "height_mm", "weight"] as const;
        for (const f of fields) {
          const oldVal = old[f] ?? null;
          const newVal = (row as any)[f] ?? null;
          if (String(oldVal) !== String(newVal)) {
            diffs[f] = { old: oldVal, new: newVal };
          }
        }
        if (Object.keys(diffs).length > 0) {
          changes.push({
            product_id: row.id,
            product_name: row.name,
            change_type: "updated",
            details: diffs,
            synced_at: now,
          });
        }
      }
    }

    // Silinen ürünler
    for (const [id, old] of existingMap) {
      if (!newIds.has(id)) {
        changes.push({
          product_id: id,
          product_name: (old as any).name || id,
          change_type: "deleted",
          details: null,
          synced_at: now,
        });
      }
    }

    // 6. Upsert ürünler
    let upserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = await supabase
        .from("diamond_products")
        .upsert(batch, { onConflict: "id" });
      if (error) throw new Error(`Upsert error: ${error.message}`);
      upserted += batch.length;
    }

    // 7. Silinen ürünleri kaldır
    const activeIds = rows.map((r) => r.id);
    const { count: deletedCount, error: delError } = await supabase
      .from("diamond_products")
      .delete({ count: "exact" })
      .not("id", "in", `(${activeIds.join(",")})`);
    if (delError) throw new Error(`Delete error: ${delError.message}`);

    // 8. Değişiklikleri sync_logs'a kaydet
    if (changes.length > 0) {
      for (let i = 0; i < changes.length; i += 500) {
        const batch = changes.slice(i, i + 500);
        await supabase.from("sync_logs").insert(batch);
      }
    }

    // 9. Sync özet kaydı
    await supabase.from("sync_logs").insert({
      product_id: "__SYNC_SUMMARY__",
      product_name: "Sync Özeti",
      change_type: "summary",
      details: {
        total_products: upserted,
        added: changes.filter((c) => c.change_type === "added").length,
        updated: changes.filter((c) => c.change_type === "updated").length,
        deleted: deletedCount || 0,
        duration_seconds: ((Date.now() - start) / 1000).toFixed(1),
      },
      synced_at: now,
    });

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    return res.status(200).json({
      success: true,
      products_synced: upserted,
      products_added: changes.filter((c) => c.change_type === "added").length,
      products_updated: changes.filter((c) => c.change_type === "updated").length,
      products_deleted: deletedCount || 0,
      duration_seconds: duration,
      synced_at: now,
    });
  } catch (error: any) {
    // GÜVENLİK: Hata detaylarını dışarıya sızdırma
    console.error("[sync-diamond] Error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Sync failed. Check server logs for details.",
    });
  }
}
