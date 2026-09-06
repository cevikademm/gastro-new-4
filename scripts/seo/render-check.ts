/**
 * render-check.ts — api/render.ts mantığını Vercel olmadan yerelde dener.
 * Kullanım: npx tsx scripts/seo/render-check.ts /produkt/<slug> /product/03D/6H /foo-bar /tr/kuehlung "/kuehlung?page=2" /dashboard
 * Her URL için: status, redirect, title, robots, canonical, JSON-LD türleri, gövde kelime sayısı.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv } from './env';
import { renderPage } from '../../src/seo/render/page';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
loadDotEnv(ROOT);

async function main() {
  const shell = readFileSync(resolve(ROOT, 'dist', 'index.html'), 'utf8')
    .replace(/<!--seo:head-->[\s\S]*?<!--\/seo:head-->/, '<!--seo:head--><!--/seo:head-->')
    .replace(/<!--seo:body-->[\s\S]*?<!--\/seo:body-->/, '<!--seo:body--><!--/seo:body-->');
  const urls = process.argv.slice(2);
  for (const u of urls) {
    const t0 = Date.now();
    const out = await renderPage(u, shell);
    const m = out.model;
    const types = (m.jsonLd.map((j) => (j as any)['@type'])).flat().join(',');
    const body = m.bodyHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    console.log(`\n${u}\n  status=${out.status}${out.redirectTo ? ` → ${out.redirectTo}` : ''}  ${Date.now() - t0} ms`);
    console.log(`  title=${m.title}\n  robots=${m.robots}\n  canonical=${m.canonical}\n  hreflang=${m.alternates.map((a) => a.hreflang).join(',') || '-'}\n  jsonld=${types || '-'}\n  words=${body}\n  h1=${(m.bodyHtml.match(/<h1>([^<]*)<\/h1>/) || [])[1] || '-'}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
