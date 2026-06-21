#!/usr/bin/env node
// =============================================================================
// migrate-catalog.mjs — load the FULL Diamond catalog (all products WITH their
// image URLs) into the NEW Supabase project, without needing the CLI or MCP.
//
// It faithfully replicates two pieces of the repo:
//   1. supabase/functions/sync-diamond  → fills `diamond_products` (raw sync cache,
//      the table the storefront reads directly).
//   2. supabase/migrations/006_seed_products_from_diamond.sql → fills the canonical
//      `products` table (used by api-gateway + sync-meilisearch).
//
// Why a local script: as deployed, sync-diamond is gated by BOTH the platform JWT
// check AND its own CRON_SECRET check on the same Authorization header, so it can't
// be triggered externally. This does the same work using creds already in .env:
//   DIAMOND_EMAIL / DIAMOND_PASSWORD  → Diamond login (source of products+images)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY → REST upsert into the new project
//
// Idempotent: upserts on conflict (diamond_products.id, products.sku). Safe re-run.
// USAGE:  node scripts/migrate-catalog.mjs            (both phases)
//         node scripts/migrate-catalog.mjs --diamond-only
// =============================================================================
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- load .env (simple parser; values may contain '=') ----------------------
const env = {};
try {
  const raw = readFileSync(join(__dirname, "..", ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
} catch (e) {
  console.error("Could not read .env:", e.message);
  process.exit(1);
}

const DIAMOND_API = "https://api.diamond-eu.com";
const DIAMOND_EMAIL = env.DIAMOND_EMAIL || "";
const DIAMOND_PASSWORD = env.DIAMOND_PASSWORD || "";
const DIAMOND_LANGUAGE = env.DIAMOND_LANGUAGE || "tr";
const SUPABASE_URL = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";

const DIAMOND_ONLY = process.argv.includes("--diamond-only");

for (const [k, v] of Object.entries({ DIAMOND_EMAIL, DIAMOND_PASSWORD, SUPABASE_URL, SERVICE_KEY })) {
  if (!v) { console.error(`Missing required value: ${k}`); process.exit(1); }
}

const clean = (s) => (s || "").replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
// strict numeric: returns null for anything not fully numeric (e.g. "2/3", "N/A").
const numStrict = (x) => {
  if (x === null || x === undefined || x === "") return null;
  const n = typeof x === "number" ? x : Number(String(x).trim());
  return Number.isFinite(n) ? n : null;
};
const intStrict = (x) => {
  const n = numStrict(x);
  return n === null ? null : Math.trunc(n);
};

// --- Diamond ----------------------------------------------------------------
async function diamondLogin() {
  const res = await fetch(`${DIAMOND_API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DIAMOND_EMAIL, password: DIAMOND_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Diamond login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function fetchAllProducts(token) {
  const products = [];
  let url = `${DIAMOND_API}/products-export?filter[is_old][value]=0`;
  let page = 0;
  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "Accept-Language": DIAMOND_LANGUAGE },
    });
    if (!res.ok) throw new Error(`Diamond fetch failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    products.push(...(data.data || []));
    url = data.links?.next || null;
    page++;
    process.stdout.write(`\r  fetched ${products.length} products (page ${page})...`);
  }
  process.stdout.write("\n");
  return products;
}

// --- PostgREST upsert -------------------------------------------------------
async function upsert(table, onConflict, rows, label) {
  const batchSize = 500;
  let done = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`${table} upsert failed: ${res.status} ${await res.text()}`);
    done += batch.length;
    process.stdout.write(`\r  ${label}: upserted ${done}/${rows.length}`);
  }
  process.stdout.write("\n");
  return done;
}

// --- mapping: Diamond export row -> diamond_products row ---------------------
function toDiamondRow(p, now) {
  const attr = p.attributes || {};
  const price = attr.price || {};
  const media = attr.media || {};
  const img = (media.images || [])[0] || {};
  return {
    id: p.id,
    name: clean(attr.name),
    description_tech_spec: clean(attr.description_tech_spec),
    popup_info: clean(attr.popup_info),
    currency: price.currency || "EUR",
    price_catalog: price.catalog ? parseFloat(price.catalog) : null,
    price_display: price.display ? parseFloat(price.display) : null,
    price_promo: price.promo ? parseFloat(price.promo) : null,
    page_catalog_number: attr.page_catalog_number ?? null,
    page_promo_number: attr.page_promo_number ?? null,
    stock: String(attr.stock ?? ""),
    restock_info: attr.restock_info ?? null,
    supplier_delivery_delay: intStrict(attr.supplier_delivery_delay),
    days_to_restock_avg: intStrict(attr.days_to_restock_avg),
    length_mm: attr.length_mm ?? null,
    width_mm: attr.width_mm ?? null,
    height_mm: attr.height_mm ?? null,
    volume_m3: numStrict(attr.volume_m3),
    weight: numStrict(attr.weight),
    weight_unit: attr.weight_unit ?? null,
    electric_power_kw: numStrict(attr.electric_power_kw),
    electric_connection: attr.electric_connection ?? null,
    electric_connection_2: attr.electric_connection_2 ?? null,
    vapor: attr.vapor ?? null,
    kcal_power: numStrict(attr.kcal_power),
    horse_power: numStrict(attr.horse_power),
    product_category_id: attr.product_category_id ?? null,
    product_range_id: attr.product_range_id ?? null,
    product_subrange_id: attr.product_subrange_id ?? null,
    product_family_id: attr.product_family_id ?? null,
    product_family_name: attr.product_family_name ?? null,
    product_subfamily_id: attr.product_subfamily_id ?? null,
    product_line_id: attr.product_line_id ?? null,
    image_big: img.Big || "",
    image_thumb: img.thumb || "",
    image_gallery: img["Thumb-gallery"] || "",
    image_full: img.full || "",
    is_new: !!attr.is_new,
    is_old: !!attr.is_old,
    is_good_deal: !!attr.is_good_deal,
    product_type: intStrict(attr.product_type),
    has_accessories: !!attr.has_accessories,
    replacement_product_id: attr.replacement_product_id ?? null,
    synced_at: now,
  };
}

// --- mapping: diamond_products row -> canonical products row (mirror 006) ----
function stripNulls(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== null && v !== undefined && v !== "") out[k] = v;
  return out;
}
function toProductRow(dp, brandId) {
  const nm = dp.name && dp.name !== "" ? dp.name : `Diamond ${dp.id}`;
  const display = dp.price_display ?? dp.price_catalog ?? 0;
  const promo = dp.price_promo;
  const compare = promo != null && promo > 0 && promo < (display ?? 0) ? display : null;
  const images = [dp.image_big, dp.image_full, dp.image_thumb].filter((x) => x && x !== "");
  return {
    sku: `DIAMOND-${dp.id}`,
    slug: `diamond-${dp.id}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    name_de: nm, name_en: nm, name_tr: nm,
    description_de: dp.description_tech_spec, description_en: dp.description_tech_spec, description_tr: dp.description_tech_spec,
    brand_id: brandId,
    price: Number(display ?? 0),
    compare_price: compare != null ? Number(compare) : null,
    currency: dp.currency || "EUR",
    stock: /^[0-9]+$/.test(String(dp.stock ?? "")) ? parseInt(dp.stock, 10) : 0,
    is_active: true,
    weight_kg: dp.weight ?? null,
    dimensions: stripNulls({ length_mm: dp.length_mm, width_mm: dp.width_mm, height_mm: dp.height_mm }),
    images,
    specs: stripNulls({
      diamond_id: dp.id,
      electric_power_kw: dp.electric_power_kw,
      electric_connection: dp.electric_connection,
      vapor: dp.vapor,
      kcal_power: dp.kcal_power,
      horse_power: dp.horse_power,
      volume_m3: dp.volume_m3,
      family_name: dp.product_family_name,
      is_new: dp.is_new,
      is_good_deal: dp.is_good_deal,
      page_catalog: dp.page_catalog_number,
    }),
  };
}

async function ensureDiamondBrand() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/brands?on_conflict=slug`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify([{ slug: "diamond", name: "Diamond", country: "IT", website: "https://www.diamond-eu.com", is_active: true, sort_order: 10 }]),
  });
  if (!res.ok) throw new Error(`brand upsert failed: ${res.status} ${await res.text()}`);
  const [brand] = await res.json();
  return brand.id;
}

// --- run --------------------------------------------------------------------
(async () => {
  const now = new Date().toISOString();
  console.log(`Target: ${SUPABASE_URL}`);
  console.log("1) Logging into Diamond...");
  const token = await diamondLogin();
  console.log("2) Fetching all products from Diamond...");
  const products = await fetchAllProducts(token);
  console.log(`   total: ${products.length} products`);

  console.log("3) Upserting -> diamond_products ...");
  const diamondRows = products.map((p) => toDiamondRow(p, now));
  await upsert("diamond_products", "id", diamondRows, "diamond_products");

  if (!DIAMOND_ONLY) {
    console.log("4) Ensuring 'diamond' brand + seeding canonical products ...");
    const brandId = await ensureDiamondBrand();
    const productRows = diamondRows.filter((dp) => dp.name && dp.name !== "").map((dp) => toProductRow(dp, brandId));
    await upsert("products", "sku", productRows, "products");
  }

  console.log("\nDone.");
})().catch((e) => { console.error("\nFAILED:", e.message); process.exit(1); });
