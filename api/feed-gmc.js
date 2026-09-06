// Otomatik üretilir: scripts/seo/bundle-api.ts (kaynak: src/seo/server/feed-gmc.ts) — ELLE DÜZENLEMEYİN.

// src/seo/data/supabase.ts
function env(name) {
  return typeof process !== "undefined" ? process.env[name] : void 0;
}
function supabaseConfig() {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY") || env("SUPABASE_ANON_KEY") || env("VITE_SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ""), key };
}
async function rest(pathWithQuery, opts = {}) {
  const cfg = supabaseConfig();
  if (!cfg) return { data: [], count: null };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 6e3);
  try {
    const res = await fetch(`${cfg.url}/rest/v1/${pathWithQuery}`, {
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Accept: "application/json",
        ...opts.count ? { Prefer: "count=exact" } : {}
      },
      signal: ctrl.signal
    });
    if (!res.ok) return { data: [], count: null };
    const data = await res.json();
    let count = null;
    const cr = res.headers.get("content-range");
    if (cr && cr.includes("/")) {
      const total = cr.split("/")[1];
      count = total === "*" ? null : Number(total);
    }
    return { data: Array.isArray(data) ? data : [], count };
  } catch {
    return { data: [], count: null };
  } finally {
    clearTimeout(timer);
  }
}

// src/seo/server/feed-gmc.ts
var SITE_URL = "https://www.2mcgastro.de";
function xe(s) {
  if (s == null) return "";
  return String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);
}
var COLS = "slug,source,source_id,sku,brand,name_de,description_de,category_slug,subcategory_slug,price_net,image,images,in_stock,ean,weight_kg";
function item(p, gross) {
  const price = gross ? (p.price_net || 0) * 1.19 : p.price_net || 0;
  const extra = (p.images || []).filter((i) => i && i !== p.image).slice(0, 5);
  return `  <item>
    <g:id>${xe(`${p.source}-${p.source_id}`)}</g:id>
    <g:title>${xe(p.name_de.slice(0, 150))}</g:title>
    <g:description>${xe((p.description_de || p.name_de).slice(0, 5e3))}</g:description>
    <g:link>${xe(`${SITE_URL}/produkt/${p.slug}`)}</g:link>
    <g:image_link>${xe(p.image)}</g:image_link>
${extra.map((i) => `    <g:additional_image_link>${xe(i)}</g:additional_image_link>`).join("\n")}
    <g:availability>${p.in_stock ? "in_stock" : "preorder"}</g:availability>
    <g:price>${price.toFixed(2)} EUR</g:price>
    <g:brand>${xe(p.brand)}</g:brand>
    <g:condition>new</g:condition>
    ${p.ean && /^\d{8,14}$/.test(p.ean) ? `<g:gtin>${xe(p.ean)}</g:gtin>` : ""}
    <g:mpn>${xe(p.sku)}</g:mpn>
    <g:identifier_exists>yes</g:identifier_exists>
    <g:google_product_category>4786</g:google_product_category>
    <g:product_type>${xe([p.category_slug, p.subcategory_slug].filter(Boolean).join(" > ") || "Gastronomiebedarf")}</g:product_type>
    <g:item_group_id>${xe(p.subcategory_slug || p.category_slug || "sonstiges")}</g:item_group_id>
    ${p.weight_kg ? `<g:shipping_weight>${p.weight_kg} kg</g:shipping_weight>` : ""}
    <g:shipping><g:country>DE</g:country><g:service>Spedition / Paket</g:service><g:price>0.00 EUR</g:price></g:shipping>
    <g:adult>no</g:adult>
  </item>`;
}
async function handler(req, res) {
  if (req.method && req.method !== "GET") {
    return res.status(405).send("Method not allowed");
  }
  const q = req.query || {};
  const gross = (Array.isArray(q.gross) ? q.gross[0] : q.gross) === "1";
  const items = [];
  const PAGE = 1e3;
  for (let off = 0; off < 6e4; off += PAGE) {
    const { data } = await rest(`product_seo?select=${COLS}&indexable=eq.true&price_net=gt.0&order=slug.asc&offset=${off}&limit=${PAGE}`, { timeoutMs: 2e4 });
    for (const p of data) if (p.image) items.push(item(p, gross));
    if (data.length < PAGE) break;
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>2MC Gastro Produktfeed</title>
  <link>${SITE_URL}</link>
  <description>Gastronomiebedarf und Gro\xDFk\xFCchentechnik \u2014 Diamond, CombiSteel, HENDI (${gross ? "Bruttopreise inkl. 19 % MwSt." : "Nettopreise zzgl. MwSt."})</description>
${items.join("\n")}
</channel>
</rss>
`;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).send(body);
}
export {
  handler as default
};
