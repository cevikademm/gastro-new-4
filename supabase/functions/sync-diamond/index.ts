// Diamond EU → Supabase Senkronizasyon Edge Function
// Her 3 saatte tetiklenir
// GÜVENLİK: Tüm gizli bilgiler Supabase Secrets'dan okunur
// Supabase Dashboard → Edge Functions → Secrets bölümünden eklenir

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DIAMOND_API = "https://api.diamond-eu.com";
const DIAMOND_EMAIL = Deno.env.get("DIAMOND_EMAIL") || "";
const DIAMOND_PASSWORD = Deno.env.get("DIAMOND_PASSWORD") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Diamond API'ye giriş yap
async function diamondLogin(): Promise<string> {
  const res = await fetch(`${DIAMOND_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DIAMOND_EMAIL, password: DIAMOND_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

// Tüm ürünleri çek
async function fetchAllProducts(token: string) {
  const products: any[] = [];
  let url: string | null =
    `${DIAMOND_API}/products-export?filter[is_old][value]=0`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Accept-Language": "tr",
      },
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const data = await res.json();
    products.push(...(data.data || []));
    url = data.links?.next || null;
  }

  return products;
}

// Ürünleri Supabase'e kaydet
async function upsertProducts(products: any[]) {
  const now = new Date().toISOString();
  const rows = products.map((p: any) => {
    const attr = p.attributes || {};
    const price = attr.price || {};
    const media = attr.media || {};
    const images = media.images || [];
    const img = images[0] || {};

    return {
      id: p.id,
      name: (attr.name || "").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ""),
      description_tech_spec: (attr.description_tech_spec || "").replace(
        /[\x00-\x08\x0b\x0c\x0e-\x1f]/g,
        ""
      ),
      popup_info: (attr.popup_info || "").replace(
        /[\x00-\x08\x0b\x0c\x0e-\x1f]/g,
        ""
      ),
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
      image_big: img.big || img.Big || "",
      image_thumb: img.thumb || "",
      image_gallery: img["thumb-gallery"] || img["Thumb-gallery"] || "",
      image_full: img.full || "",
      is_new: !!attr.is_new,
      is_old: !!attr.is_old,
      is_good_deal: !!attr.is_good_deal,
      product_type: attr.product_type,
      has_accessories: !!attr.has_accessories,
      replacement_product_id: attr.replacement_product_id,
      synced_at: now,
    };
  });

  // 500'er batch halinde upsert
  const batchSize = 500;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from("diamond_products")
      .upsert(batch, { onConflict: "id" });
    if (error) throw new Error(`Upsert error: ${error.message}`);
    upserted += batch.length;
  }

  return upserted;
}

Deno.serve(async (req) => {
  // Güvenlik: Cron secret kontrolü
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const start = Date.now();

    // 1. Diamond'a giriş
    const token = await diamondLogin();

    // 2. Ürünleri çek
    const products = await fetchAllProducts(token);

    // 3. Supabase'e kaydet
    const count = await upsertProducts(products);

    const duration = ((Date.now() - start) / 1000).toFixed(1);

    return new Response(
      JSON.stringify({
        success: true,
        products_synced: count,
        duration_seconds: duration,
        synced_at: new Date().toISOString(),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
