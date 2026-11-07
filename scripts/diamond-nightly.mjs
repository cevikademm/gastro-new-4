/**
 * Diamond EU — gecelik senkron (GitHub Actions: .github/workflows/diamond-nightly.yml)
 * ------------------------------------------------------------------------------------
 * Her gece:
 *   1) Diamond API'den aktif ürün listesini çeker (products-export, is_old=0).
 *   2) Supabase `diamond_products` ile karşılaştırır → fiyat / resim / ad-ölçü değişiklikleri,
 *      yeni ürünler (yalnız rapor — siteye otomatik eklenmez), listeden çıkanlar.
 *   3) src/data/products.json (sitenin kataloğu) içindeki Diamond ürünlerini günceller:
 *        - resim  → Diamond'ın güncel ilk görseli ('+' içeren adlar Diamond S3'te 403 → atlanır)
 *        - fiyat  → Diamond katalog fiyatı ne oranda değiştiyse site fiyatı da o oranda
 *                   (sitenin kendi indirimi/marjı korunur)
 *        - listeden çıkan ürün → katalogdan silinir
 *   4) Supabase: diamond_products upsert + listeden çıkanları sil;
 *      product_seo resim/fiyat eşitle, çıkanları discontinued_at (→ /produkt/... kategoriye 301).
 *   5) Raporu diamond_sync_runs / diamond_sync_changes'e yazar (admin: /admin/diamond-sync)
 *      ve değişiklik varsa e-posta gönderir (Resend).
 *   products.json'un commit + push'u workflow'da yapılır → Vercel otomatik yayınlar.
 *
 * Kullanım:
 *   node scripts/diamond-nightly.mjs                 # tam çalıştırma
 *   node scripts/diamond-nightly.mjs --dry           # hiçbir yere yazmaz, yalnız özet
 *   node scripts/diamond-nightly.mjs --no-email
 *   node scripts/diamond-nightly.mjs --prev-table diamond_products_backup_20261107
 *        (karşılaştırmayı başka bir tablo ile yap — ilk kurulum için)
 *
 * Env (.env veya GitHub secrets): DIAMOND_EMAIL, DIAMOND_PASSWORD, SUPABASE_URL (veya
 * VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, [RESEND_API_KEY, RESEND_FROM, REPORT_EMAIL]
 */

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTS_PATH = join(ROOT, 'src/data/products.json');

// ── ayarlar ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const NO_EMAIL = args.includes('--no-email');
const PREV_TABLE = args.includes('--prev-table') ? args[args.indexOf('--prev-table') + 1] : 'diamond_products';
if (!/^[a-z0-9_]+$/.test(PREV_TABLE)) throw new Error('geçersiz --prev-table');

const env = {};
try {
  for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
} catch { /* CI: process.env */ }
const cfg = (k) => process.env[k] || env[k] || '';

const DIAMOND_API = 'https://api.diamond-eu.com';
const SUPABASE_URL = (cfg('SUPABASE_URL') || cfg('VITE_SUPABASE_URL')).replace(/\/$/, '');
const SERVICE_KEY = cfg('SUPABASE_SERVICE_ROLE_KEY');
const SITE = 'https://www.2mcgastro.de';
const REPORT_EMAIL = cfg('REPORT_EMAIL') || 'info@2mcgastro.de';
const RESEND_FROM = cfg('RESEND_FROM') || '2MC Gastro <noreply@2mcgastro.de>';

for (const k of ['DIAMOND_EMAIL', 'DIAMOND_PASSWORD', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!cfg(k)) { console.error(`❌ ${k} tanımlı değil`); process.exit(1); }
}
if (!SUPABASE_URL) { console.error('❌ SUPABASE_URL tanımlı değil'); process.exit(1); }

// ── yardımcılar ────────────────────────────────────────────────────────────
const clean = (s) => (s || '').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : null;
};
const int = (v) => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isInteger(v) ? v : Math.trunc(v);
  const s = String(v).trim();
  return /^-?\d+$/.test(s) ? parseInt(s, 10) : null;
};
const isDateId = (id) => /^\d{4}-\d\d-\d\d/.test(id); // Excel'in tarihe çevirdiği eski kodlar — dokunma
const isDiamond = (p) => /diamond/i.test(p.brand || '') || (p.img || '').includes('diamond-eu-prod');
const same = (a, b) => String(a ?? '') === String(b ?? '');
const eur = (n) => (n == null ? '—' : `€ ${Number(n).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function sb(path, { method = 'GET', body, prefer, range } = {}) {
  const headers = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  if (range) headers.Range = range;
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (r.ok) {
      const t = await r.text();
      return t ? JSON.parse(t) : null;
    }
    const msg = `${method} ${path.split('?')[0]} → ${r.status}: ${(await r.text()).slice(0, 300)}`;
    if (attempt >= 3 || r.status < 500) throw new Error(msg);
    await new Promise((res) => setTimeout(res, 2000 * attempt));
  }
}

async function selectAll(table, cols) {
  const out = [];
  for (let off = 0; ; off += 1000) {
    const page = await sb(`${table}?select=${cols}&order=id.asc&offset=${off}&limit=1000`);
    out.push(...page);
    if (page.length < 1000) return out;
  }
}

const inList = (ids) => `(${ids.map((i) => `"${String(i).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')})`;

// ── ana akış ───────────────────────────────────────────────────────────────
const t0 = Date.now();
let runId = null;
const summaryLines = [];
const log = (s) => { console.log(s); summaryLines.push(s); };

async function main() {
  log(`# Diamond gecelik senkron — ${new Date().toISOString()}${DRY ? ' (DRY)' : ''}`);
  if (!DRY) {
    const [run] = await sb('diamond_sync_runs', { method: 'POST', body: { trigger: process.env.GITHUB_ACTIONS ? 'github-actions' : 'manual' }, prefer: 'return=representation' });
    runId = run.id;
  }

  // 1) Diamond
  const login = await fetch(`${DIAMOND_API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: cfg('DIAMOND_EMAIL'), password: cfg('DIAMOND_PASSWORD') }),
  });
  if (!login.ok) throw new Error(`Diamond login ${login.status}`);
  const { access_token } = await login.json();
  const feed = [];
  for (let url = `${DIAMOND_API}/products-export?filter[is_old][value]=0`; url;) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${access_token}`, 'Accept-Language': 'tr' } });
    if (!r.ok) throw new Error(`Diamond products-export ${r.status}`);
    const d = await r.json();
    feed.push(...(d.data || []));
    url = d.links?.next || null;
  }
  // Güvenlik: boş/çok küçük liste gelirse (API arızası) toplu silme yapma.
  if (feed.length < 3000) throw new Error(`Diamond listesi şüpheli derecede küçük (${feed.length}) — hiçbir şey değiştirilmedi`);
  log(`- Diamond aktif ürün: **${feed.length}**`);

  const now = new Date().toISOString();
  const feedMap = new Map();
  for (const p of feed) {
    const a = p.attributes || {};
    const price = a.price || {};
    const all = (a.media?.images || []);
    const good = all.filter((i) => okImgUrl(i.big || i.Big));
    const first = good[0] || all[0] || {};
    feedMap.set(p.id, {
      bigs: good.map((i) => i.big || i.Big).slice(0, 6),
      row: {
        id: p.id,
        name: clean(a.name),
        description_tech_spec: clean(a.description_tech_spec),
        popup_info: clean(a.popup_info),
        currency: price.currency || 'EUR',
        price_catalog: num(price.catalog),
        price_display: num(price.display),
        price_promo: num(price.promo),
        page_catalog_number: a.page_catalog_number,
        page_promo_number: a.page_promo_number,
        stock: String(a.stock ?? ''),
        restock_info: a.restock_info,
        supplier_delivery_delay: int(a.supplier_delivery_delay),
        days_to_restock_avg: int(a.days_to_restock_avg),
        length_mm: a.length_mm,
        width_mm: a.width_mm,
        height_mm: a.height_mm,
        volume_m3: num(a.volume_m3),
        weight: num(a.weight),
        weight_unit: a.weight_unit,
        electric_power_kw: num(a.electric_power_kw),
        electric_connection: a.electric_connection,
        electric_connection_2: a.electric_connection_2,
        vapor: a.vapor,
        kcal_power: num(a.kcal_power),
        horse_power: num(a.horse_power),
        product_category_id: a.product_category_id,
        product_range_id: a.product_range_id,
        product_subrange_id: a.product_subrange_id,
        product_family_id: a.product_family_id,
        product_family_name: a.product_family_name,
        product_subfamily_id: a.product_subfamily_id,
        product_line_id: a.product_line_id,
        image_big: first.big || first.Big || '',
        image_thumb: first.thumb || '',
        image_gallery: first['thumb-gallery'] || first['Thumb-gallery'] || '',
        image_full: first.full || '',
        is_new: !!a.is_new,
        is_old: !!a.is_old,
        is_good_deal: !!a.is_good_deal,
        product_type: int(a.product_type),
        has_accessories: !!a.has_accessories,
        replacement_product_id: a.replacement_product_id,
        synced_at: now,
      },
    });
  }

  // 2) Önceki durum (Supabase)
  const prev = await selectAll(PREV_TABLE, 'id,name,price_catalog,image_big,length_mm,width_mm,height_mm,weight');
  const prevMap = new Map(prev.map((r) => [r.id, r]));
  log(`- Karşılaştırma tablosu \`${PREV_TABLE}\`: ${prev.length} ürün`);

  // 3) products.json
  const raw = readFileSync(PRODUCTS_PATH, 'utf8');
  const products = JSON.parse(raw);
  if (JSON.stringify(products) !== raw.replace(/\n$/, '')) throw new Error('products.json biçimi beklenmedik (sıkıştırılmış JSON değil) — yazma iptal');
  const siteIds = new Set(products.map((p) => p.id));

  const changes = []; // {product_id, product_name, change_type, details}
  const add = (product_id, product_name, change_type, details) => changes.push({ product_id, product_name, change_type, details });

  // 3a) Diamond tablosuna göre fiyat / ad-ölçü / yeni / kalkan
  for (const [id, { row }] of feedMap) {
    const old = prevMap.get(id);
    if (!old) {
      if (!siteIds.has(id)) add(id, row.name, 'new', { price_catalog: row.price_catalog, family: row.product_family_name, image: row.image_big || null });
      continue;
    }
    if (old.price_catalog != null && row.price_catalog != null && Number(old.price_catalog) !== Number(row.price_catalog)) {
      add(id, row.name, 'price', { diamond_old: Number(old.price_catalog), diamond_new: row.price_catalog, pct: +(((row.price_catalog / old.price_catalog) - 1) * 100).toFixed(2) });
    }
    const diffs = {};
    for (const f of ['name', 'length_mm', 'width_mm', 'height_mm', 'weight']) {
      if (old[f] != null && old[f] !== '' && !same(old[f], row[f]) && Number(old[f]) !== Number(row[f])) diffs[f] = { old: old[f], new: row[f] };
    }
    if (Object.keys(diffs).length) add(id, row.name, 'updated', diffs);
  }
  const removedFromTable = prev.filter((r) => !feedMap.has(r.id)).map((r) => r.id);

  // 3b) Site kataloğu
  const priceChange = new Map(changes.filter((c) => c.change_type === 'price').map((c) => [c.product_id, c.details]));
  const keep = [];
  const removedFromSite = [];
  let imgUpdated = 0, priceUpdated = 0;
  for (const p of products) {
    if (!isDiamond(p) || isDateId(p.id)) { keep.push(p); continue; }
    const f = feedMap.get(p.id);
    if (!f) { removedFromSite.push(p); continue; }
    const newImg = f.bigs[0];
    if (newImg && p.img !== newImg) {
      // Rapor: yalnız gerçekten değişmiş görseller (eski adres boş değilse)
      add(p.id, p.name, 'image', { old: p.img || null, new: newImg });
      p.img = newImg; imgUpdated++;
    }
    const pc = priceChange.get(p.id);
    if (pc && Number(p.price) > 0) {
      const oldSite = Number(p.price);
      const raw2 = oldSite * (pc.diamond_new / pc.diamond_old);
      p.price = Number.isInteger(oldSite) ? Math.round(raw2) : Math.round(raw2 * 100) / 100;
      Object.assign(pc, { site_old: oldSite, site_new: p.price });
      priceUpdated++;
    }
    keep.push(p);
  }
  for (const p of removedFromSite) add(p.id, p.name, 'removed', { price: p.price ?? null, from: 'site' });
  const removedSiteIds = new Set(removedFromSite.map((p) => p.id));
  for (const id of removedFromTable) {
    if (!removedSiteIds.has(id)) add(id, prevMap.get(id)?.name || id, 'removed', { from: 'diamond_products' });
  }

  const count = (t) => changes.filter((c) => c.change_type === t).length;
  const totals = {
    feed: feed.length, price: count('price'), site_price_updated: priceUpdated, image: imgUpdated,
    removed: count('removed'), removed_from_site: removedFromSite.length, new: count('new'), updated: count('updated'),
  };
  log(`- Fiyat değişen: **${totals.price}** (sitede güncellenen ${priceUpdated}) · Resim: **${imgUpdated}** · Kaldırılan: **${totals.removed}** (siteden ${removedFromSite.length}) · Yeni (onay bekliyor): **${totals.new}** · Ad/ölçü: **${totals.updated}**`);

  if (DRY) {
    for (const t of ['price', 'removed', 'new', 'updated', 'image']) {
      const s = changes.filter((c) => c.change_type === t).slice(0, 5);
      if (s.length) console.log(`  ${t}:`, s.map((c) => `${c.product_id} ${JSON.stringify(c.details).slice(0, 120)}`).join('\n         '));
    }
    return totals;
  }

  // 4) products.json yaz
  if (removedFromSite.length || imgUpdated || priceUpdated) {
    writeFileSync(PRODUCTS_PATH, JSON.stringify(keep) + (raw.endsWith('\n') ? '\n' : ''), 'utf8');
    log(`- products.json güncellendi (${products.length} → ${keep.length} ürün)`);
  }

  // 5) Supabase: diamond_products
  const rows = [...feedMap.values()].map((f) => f.row);
  for (let i = 0; i < rows.length; i += 500) {
    await sb('diamond_products?on_conflict=id', { method: 'POST', body: rows.slice(i, i + 500), prefer: 'resolution=merge-duplicates,return=minimal' });
  }
  const liveIds = new Set((await selectAll('diamond_products', 'id')).map((r) => r.id));
  const toDelete = [...liveIds].filter((id) => !feedMap.has(id));
  for (let i = 0; i < toDelete.length; i += 80) {
    await sb(`diamond_products?id=in.${encodeURIComponent(inList(toDelete.slice(i, i + 80)))}`, { method: 'DELETE', prefer: 'return=minimal' });
  }
  log(`- diamond_products: ${rows.length} güncellendi, ${toDelete.length} silindi`);

  // 6) Supabase: product_seo (Google HTML + Shopping feed)
  const seoRows = [];
  for (const [id, f] of feedMap) {
    if (!f.bigs.length && f.row.price_catalog == null) continue;
    seoRows.push({ source_id: id, image: f.bigs[0] || null, images: f.bigs.length ? f.bigs : null, price_net: f.row.price_catalog });
  }
  const discontinued = [...new Set([...removedFromSite.map((p) => p.id), ...toDelete])];
  let seo = { seo_updated: 0, seo_discontinued: 0 };
  for (let i = 0; i < Math.max(seoRows.length, 1); i += 1000) {
    const r = await sb('rpc/diamond_seo_apply', { method: 'POST', body: { p_rows: seoRows.slice(i, i + 1000), p_discontinued: i === 0 ? discontinued : [] } });
    seo.seo_updated += r.seo_updated; seo.seo_discontinued += r.seo_discontinued;
  }
  totals.seo_updated = seo.seo_updated; totals.seo_discontinued = seo.seo_discontinued;
  log(`- product_seo: ${seo.seo_updated} güncellendi, ${seo.seo_discontinued} ürün sayfası kategoriye yönlendirildi`);

  // 7) Rapor
  const recs = changes.map((c) => ({ run_id: runId, ...c }));
  for (let i = 0; i < recs.length; i += 500) await sb('diamond_sync_changes', { method: 'POST', body: recs.slice(i, i + 500), prefer: 'return=minimal' });

  // 8) E-posta (yalnız işe yarar değişiklik varsa)
  const meaningful = totals.price + totals.removed + totals.new + totals.updated;
  if (!NO_EMAIL && meaningful > 0) {
    if (cfg('RESEND_API_KEY')) {
      try { await sendEmail(changes, totals); log(`- Rapor e-postası gönderildi → ${REPORT_EMAIL}`); }
      catch (e) { log(`- ⚠️ E-posta gönderilemedi: ${e.message}`); totals.email_error = e.message; }
    } else log('- (RESEND_API_KEY yok — e-posta atlandı)');
  }

  await sb(`diamond_sync_runs?id=eq.${runId}`, { method: 'PATCH', body: { status: 'success', finished_at: new Date().toISOString(), feed_count: feed.length, totals }, prefer: 'return=minimal' });
  log(`- Süre: ${((Date.now() - t0) / 1000).toFixed(1)} sn`);
  return totals;
}

// Diamond S3'te '+' içeren dosya adları (URL'de %2B) 403 veriyor → bu görseller atlanır.
function okImgUrl(u) {
  if (!u) return false;
  const name = u.split('/').pop();
  return !name.includes('%2B') && !name.includes('+');
}

async function sendEmail(changes, t) {
  const pick = (type, n = 60) => changes.filter((c) => c.change_type === type).slice(0, n);
  const more = (type, n = 60) => { const k = changes.filter((c) => c.change_type === type).length - n; return k > 0 ? `<p style="color:#64748b">… ve ${k} ürün daha (tamamı admin panelde)</p>` : ''; };
  const table = (head, rows) => rows.length ? `<table cellpadding="6" style="border-collapse:collapse;font-size:13px;width:100%"><tr style="background:#f1f5f9;text-align:left">${head.map((h) => `<th>${h}</th>`).join('')}</tr>${rows.join('')}</table>` : '';
  const tr = (cells) => `<tr style="border-top:1px solid #e2e8f0">${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`;

  const priceRows = pick('price').map((c) => {
    const d = c.details; const up = d.pct > 0;
    return tr([esc(c.product_id), esc(c.product_name), `${eur(d.site_old ?? d.diamond_old)} → <b>${eur(d.site_new ?? d.diamond_new)}</b>`, `<span style="color:${up ? '#b91c1c' : '#15803d'}">${up ? '+' : ''}${d.pct}%</span>`]);
  });
  const removedRows = pick('removed').map((c) => tr([esc(c.product_id), esc(c.product_name), c.details?.price ? eur(c.details.price) : '—']));
  const newRows = pick('new').map((c) => tr([esc(c.product_id), esc(c.product_name), esc(c.details?.family || ''), eur(c.details?.price_catalog)]));
  const updRows = pick('updated', 30).map((c) => tr([esc(c.product_id), esc(c.product_name), esc(Object.entries(c.details).map(([k, v]) => `${k}: ${v.old} → ${v.new}`).join(', '))]));

  const html = `<div style="font-family:Arial,sans-serif;max-width:760px;color:#0f2440">
  <h2 style="color:#931315;margin:0 0 4px">Diamond gece senkronu</h2>
  <p style="margin:0 0 16px;color:#64748b">${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })} · ${t.feed} aktif Diamond ürünü</p>
  <p><b>${t.price}</b> fiyat değişikliği · <b>${t.removed}</b> kaldırılan · <b>${t.new}</b> yeni ürün (onayını bekliyor) · <b>${t.image}</b> resim · <b>${t.updated}</b> ad/ölçü değişikliği</p>
  ${priceRows.length ? `<h3>Fiyat değişiklikleri (site fiyatı)</h3>${table(['Kod', 'Ürün', 'Fiyat', 'Değişim'], priceRows)}${more('price')}` : ''}
  ${removedRows.length ? `<h3>Diamond listesinden çıkan → siteden kaldırıldı</h3>${table(['Kod', 'Ürün', 'Site fiyatı'], removedRows)}${more('removed')}` : ''}
  ${newRows.length ? `<h3>Diamond'a yeni eklenen ürünler (sitede yok)</h3>${table(['Kod', 'Ürün', 'Aile', 'Diamond fiyatı'], newRows)}${more('new')}` : ''}
  ${updRows.length ? `<h3>Ad / ölçü değişiklikleri</h3>${table(['Kod', 'Ürün', 'Değişiklik'], updRows)}${more('updated', 30)}` : ''}
  <p style="margin-top:20px"><a href="${SITE}/admin/diamond-sync" style="background:#931315;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Admin panelde tüm rapor</a></p>
</div>`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: RESEND_FROM, to: [REPORT_EMAIL],
      subject: `Diamond senkron: ${t.price} fiyat · ${t.removed} kaldırılan · ${t.new} yeni`,
      html,
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

main()
  .then(() => {
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryLines.join('\n') + '\n');
  })
  .catch(async (e) => {
    console.error('❌', e.message);
    if (runId) {
      try { await sb(`diamond_sync_runs?id=eq.${runId}`, { method: 'PATCH', body: { status: 'error', finished_at: new Date().toISOString(), error: String(e.message).slice(0, 1000) }, prefer: 'return=minimal' }); } catch { /* yut */ }
    }
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `❌ ${e.message}\n`);
    process.exit(1);
  });
