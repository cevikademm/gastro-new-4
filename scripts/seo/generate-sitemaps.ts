/**
 * generate-sitemaps.ts — statik sitemap'leri dist/ içine yazar (build sonrası).
 *   dist/sitemap.xml            (index)
 *   dist/sitemap-pages.xml, sitemap-ratgeber.xml, sitemap-tr.xml
 * Ürün sitemap'leri (sitemap-produkte-*.xml) dosya olarak YAZILMAZ → Vercel
 * rewrite ile api/sitemap.ts istek anında üretir (Supabase, cap yok).
 * `public/sitemap.xml` artık commit edilmez (eski üretici kaldırıldı).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSitemap } from '../../src/seo/server/sitemap';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const DIST = resolve(ROOT, 'dist');

async function main() {
  mkdirSync(DIST, { recursive: true });
  const names: Array<[string, string]> = [
    ['index', 'sitemap.xml'],
    ['pages', 'sitemap-pages.xml'],
    ['ratgeber', 'sitemap-ratgeber.xml'],
    ['tr', 'sitemap-tr.xml'],
  ];
  for (const [name, file] of names) {
    const xml = await buildSitemap(name);
    if (!xml) continue;
    writeFileSync(resolve(DIST, file), xml, 'utf8');
    const n = (xml.match(/<loc>/g) || []).length;
    console.log(`✅ ${file}: ${n} URL`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
