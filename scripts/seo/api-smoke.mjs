#!/usr/bin/env node
// api-smoke.mjs — paketlenmiş api/render.js ve api/sitemap.js'i Node'da (Vercel'siz) çalıştırır.
// Kullanım: node scripts/seo/api-smoke.mjs "/produkt/<slug>" "/foo" "/product/03D/6H"
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
// .env → process.env
try {
  for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch {}

function mockRes() {
  const r = { headers: {}, code: 200, body: '' };
  const res = {
    setHeader: (k, v) => { r.headers[k.toLowerCase()] = v; },
    status: (c) => { r.code = c; return res; },
    send: (b) => { r.body = String(b); },
    end: (b) => { r.body = String(b ?? ''); },
  };
  return { r, res };
}

const render = (await import(pathToFileURL(resolve(ROOT, 'api', 'render.js')).href)).default;
const sitemap = (await import(pathToFileURL(resolve(ROOT, 'api', 'sitemap.js')).href)).default;

for (const p of process.argv.slice(2)) {
  const [path, qs] = p.replace(/^\//, '').split('?');
  const query = { path };
  if (qs) for (const kv of qs.split('&')) { const [k, v] = kv.split('='); query[k] = decodeURIComponent(v ?? ''); }
  const { r, res } = mockRes();
  const t0 = Date.now();
  await render({ method: 'GET', query }, res);
  const title = (r.body.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  const h1 = (r.body.match(/<h1>([^<]*)<\/h1>/) || [])[1] || '';
  console.log(`/${p}  → ${r.code} ${r.headers.location ? '→ ' + r.headers.location : ''} (${Date.now() - t0} ms)  robots=${r.headers['x-robots-tag']}  fallback=${r.headers['x-seo-render'] || '-'}\n   title=${title}\n   h1=${h1}  bytes=${r.body.length}`);
}
{
  const { r, res } = mockRes();
  await sitemap({ query: { name: 'index' } }, res);
  console.log(`sitemap index → ${r.code}, ${(r.body.match(/<loc>/g) || []).length} sitemaps`);
  const { r: r2, res: res2 } = mockRes();
  await sitemap({ query: { name: 'produkte-hendi' } }, res2);
  console.log(`sitemap produkte-hendi → ${r2.code}, ${(r2.body.match(/<loc>/g) || []).length} URLs`);
}
