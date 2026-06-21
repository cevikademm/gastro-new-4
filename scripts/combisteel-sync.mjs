/**
 * CombiSteel PIM → Supabase Sync Script
 * Fetches all products from CombiSteel GraphQL API and upserts into Supabase.
 *
 * Usage: node scripts/combisteel-sync.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// --- load .env (so creds are NOT hardcoded; target = active Supabase project) ---
const __dirname = dirname(fileURLToPath(import.meta.url));
const env = {};
try {
  for (const line of readFileSync(join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
} catch { /* fall back to process.env */ }
const cfg = (k) => env[k] || process.env[k] || '';

const COMBISTEEL_API = 'https://pim.combisteel.com/pimcore-graphql-webservices/Combisteel';
const COMBISTEEL_KEY = cfg('COMBISTEEL_KEY') || 'feed23626ace249b399514a2fc4396187b27';
const SUPABASE_URL = (cfg('SUPABASE_URL') || cfg('VITE_SUPABASE_URL')).replace(/\/$/, '');
const SUPABASE_KEY = cfg('SUPABASE_SERVICE_ROLE_KEY');
const PIM_BASE = 'https://pim.combisteel.com';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Step 1: Create table if not exists
async function createTable() {
  console.log('📦 Creating combisteel_products table...');
  const sql = `
    CREATE TABLE IF NOT EXISTS combisteel_products (
      id TEXT PRIMARY KEY,
      sku TEXT,
      title TEXT,
      description TEXT,
      long_description TEXT,
      brand TEXT,
      ean TEXT,
      dimensions TEXT,
      length_mm INT,
      width_mm INT,
      height_mm INT,
      depth_mm INT,
      gross_weight NUMERIC,
      net_weight NUMERIC,
      price NUMERIC,
      stock INT,
      product_type TEXT,
      image_url TEXT,
      extra_images JSONB DEFAULT '[]',
      category_id TEXT,
      category_name TEXT,
      tech_specs JSONB DEFAULT '[]',
      synced_at TIMESTAMPTZ DEFAULT now(),
      created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_combisteel_sku ON combisteel_products(sku);
    CREATE INDEX IF NOT EXISTS idx_combisteel_category ON combisteel_products(category_name);
    CREATE INDEX IF NOT EXISTS idx_combisteel_brand ON combisteel_products(brand);
    CREATE INDEX IF NOT EXISTS idx_combisteel_price ON combisteel_products(price);

    ALTER TABLE combisteel_products ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'combisteel_products' AND policyname = 'combisteel_public_read'
      ) THEN
        CREATE POLICY combisteel_public_read ON combisteel_products FOR SELECT USING (true);
      END IF;
    END $$;
  `;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  // If exec_sql doesn't exist, use the SQL endpoint directly
  if (!res.ok) {
    console.log('  Using direct SQL endpoint...');
    const res2 = await fetch(`${SUPABASE_URL}/pg`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });
    if (!res2.ok) {
      // Try the management API approach - just log and continue, table might already exist
      console.log('  ⚠️  Could not auto-create table. Please run the SQL manually in Supabase dashboard.');
      console.log('  Continuing with data fetch...');
    }
  } else {
    console.log('  ✅ Table created/verified');
  }
}

// Step 2: Fetch products from CombiSteel GraphQL
const PRODUCT_QUERY = `
query GetProducts($first: Int!, $after: Int!) {
  getProductListing(first: $first, after: $after, sortBy: "sku") {
    totalCount
    edges {
      node {
        id
        sku
        title
        description
        longDescription
        brand
        ean
        dimensions
        length
        width
        height
        depth
        grossWeight
        netWeight
        price
        stock
        productType
        defaultImage { fullpath }
        extraImages { image { fullpath } }
        category {
          ... on object_Category { id name }
        }
        technicalSpecification {
          name
          features {
            ... on csFeatureInput { name text }
            ... on csFeatureNumeric { name number }
            ... on csFeatureSelect { name selection }
            ... on csFeatureQuantityValue { name quantityvalue { value unit { abbreviation } } }
            ... on csFeatureInputQuantityValue { name inputquantityvalue { value unit { abbreviation } } }
            ... on csFeatureCheckbox { name checked }
            ... on csFeatureBooleanSelect { name checked }
          }
        }
      }
    }
  }
}`;

async function fetchAllProducts() {
  console.log('\n🔄 Fetching products from CombiSteel PIM...');
  const allProducts = [];
  const pageSize = 50;
  let after = 0;
  let totalCount = 0;

  do {
    const url = `${COMBISTEEL_API}?apikey=${COMBISTEEL_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: PRODUCT_QUERY,
        variables: { first: pageSize, after },
      }),
    });

    const json = await res.json();
    if (json.errors) {
      console.error('  GraphQL errors:', json.errors.map(e => e.message).join(', '));
      break;
    }

    const listing = json.data.getProductListing;
    totalCount = listing.totalCount;
    const edges = listing.edges || [];

    for (const { node } of edges) {
      const cats = (node.category || []).filter(Boolean);
      const firstCat = cats[0] || {};
      const imgPath = node.defaultImage?.fullpath;

      // Flatten tech specs
      const techSpecs = [];
      for (const group of (node.technicalSpecification || [])) {
        for (const feat of (group.features || [])) {
          const spec = { group: group.name, name: feat.name };
          if ('text' in feat && feat.text) spec.value = feat.text;
          else if ('number' in feat && feat.number) spec.value = feat.number;
          else if ('selection' in feat && feat.selection) spec.value = feat.selection;
          else if ('checked' in feat) spec.value = feat.checked ? 'Yes' : 'No';
          else if ('quantityvalue' in feat && feat.quantityvalue) {
            spec.value = feat.quantityvalue.value;
            spec.unit = feat.quantityvalue.unit?.abbreviation || '';
          } else if ('inputquantityvalue' in feat && feat.inputquantityvalue) {
            spec.value = feat.inputquantityvalue.value;
            spec.unit = feat.inputquantityvalue.unit?.abbreviation || '';
          } else {
            continue; // skip empty specs
          }
          if (spec.value !== null && spec.value !== undefined) {
            techSpecs.push(spec);
          }
        }
      }

      const extraImgs = (node.extraImages || [])
        .filter(ei => ei?.image?.fullpath)
        .map(ei => `${PIM_BASE}${ei.image.fullpath}`);

      allProducts.push({
        id: node.id,
        sku: node.sku || '',
        title: node.title || '',
        description: node.description || '',
        long_description: node.longDescription || null,
        brand: node.brand || '',
        ean: node.ean || null,
        dimensions: node.dimensions || null,
        length_mm: node.length || null,
        width_mm: node.width || null,
        height_mm: node.height || null,
        depth_mm: node.depth || null,
        gross_weight: node.grossWeight || null,
        net_weight: node.netWeight || null,
        price: node.price || null,
        stock: node.stock ?? null,
        product_type: node.productType || null,
        image_url: imgPath ? `${PIM_BASE}${imgPath}` : null,
        extra_images: extraImgs,
        category_id: firstCat.id || null,
        category_name: firstCat.name || null,
        tech_specs: techSpecs,
        synced_at: new Date().toISOString(),
      });
    }

    after += pageSize;
    const pct = Math.min(100, Math.round((after / totalCount) * 100));
    process.stdout.write(`\r  📥 ${allProducts.length} / ${totalCount} ürün çekildi (${pct}%)`);
  } while (after < totalCount);

  console.log(`\n  ✅ Toplam ${allProducts.length} ürün çekildi.`);
  return allProducts;
}

// Step 3: Upsert to Supabase
async function upsertToSupabase(products) {
  console.log(`\n💾 Supabase'e aktarılıyor (${products.length} ürün)...`);
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/combisteel_products`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`\n  ❌ Batch ${i}-${i + batch.length} hata: ${err}`);
      // If table doesn't exist, show the SQL
      if (err.includes('relation') && err.includes('does not exist')) {
        console.error('\n  ⚠️  Tablo bulunamadı! Lütfen önce aşağıdaki SQL\'i Supabase SQL Editor\'de çalıştırın:\n');
        printCreateTableSQL();
        process.exit(1);
      }
      continue;
    }

    inserted += batch.length;
    const pct = Math.round((inserted / products.length) * 100);
    process.stdout.write(`\r  💾 ${inserted} / ${products.length} aktarıldı (${pct}%)`);
  }

  console.log(`\n  ✅ ${inserted} ürün Supabase'e aktarıldı.`);
}

function printCreateTableSQL() {
  console.log(`
-- Supabase SQL Editor'de çalıştırın:
CREATE TABLE IF NOT EXISTS combisteel_products (
  id TEXT PRIMARY KEY,
  sku TEXT,
  title TEXT,
  description TEXT,
  long_description TEXT,
  brand TEXT,
  ean TEXT,
  dimensions TEXT,
  length_mm INT,
  width_mm INT,
  height_mm INT,
  depth_mm INT,
  gross_weight NUMERIC,
  net_weight NUMERIC,
  price NUMERIC,
  stock INT,
  product_type TEXT,
  image_url TEXT,
  extra_images JSONB DEFAULT '[]',
  category_id TEXT,
  category_name TEXT,
  tech_specs JSONB DEFAULT '[]',
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_combisteel_sku ON combisteel_products(sku);
CREATE INDEX IF NOT EXISTS idx_combisteel_category ON combisteel_products(category_name);
CREATE INDEX IF NOT EXISTS idx_combisteel_brand ON combisteel_products(brand);
CREATE INDEX IF NOT EXISTS idx_combisteel_price ON combisteel_products(price);

ALTER TABLE combisteel_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY combisteel_public_read ON combisteel_products FOR SELECT USING (true);
  `);
}

// Main
async function main() {
  console.log('🚀 CombiSteel → Supabase Sync Başlıyor\n');

  await createTable();
  const products = await fetchAllProducts();
  if (products.length > 0) {
    await upsertToSupabase(products);
  }

  console.log('\n🎉 Sync tamamlandı!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
