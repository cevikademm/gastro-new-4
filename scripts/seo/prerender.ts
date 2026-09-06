/**
 * prerender.ts — `vite build` SONRASI çalışır (package.json "build").
 *
 * 1) dist/index.html (saf kabuk, hash'li asset linkleriyle) → api/_shell.generated.ts
 *    (fonksiyon paketine gömülür; Vercel'de dist/ ayrıca includeFiles ile de girer).
 * 2) Sonlu Almanca rotaların (ana sayfa, kategori, marka, branche, şehir, yasal,
 *    vergleich, ratgeber) tam HTML'i dist/<yol>.html olarak yazılır → Vercel
 *    dosya sistemi bu istekleri fonksiyona hiç uğratmadan statik servis eder
 *    (cleanUrls: /kuehlung → dist/kuehlung.html).
 * 3) Ürün sayfaları (14K+) prerender EDİLMEZ; api/render.ts istek anında üretir.
 *
 * Supabase erişimi yoksa (env eksik) sayfalar ürün listesi olmadan yine üretilir.
 * Çalıştır: npx tsx scripts/seo/prerender.ts
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDotEnv } from './env';
import { enumerateStaticPaths } from '../../src/seo/routes';
import { renderPage } from '../../src/seo/render/page';
import { INDEXABLE_LOCALES, localePath } from '../../src/lib/locales';
import { BLOG_POSTS } from '../../src/content/blog/posts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const DIST = resolve(ROOT, 'dist');

loadDotEnv(ROOT);

async function main() {
  const shellPath = resolve(DIST, 'index.html');
  if (!existsSync(shellPath)) {
    console.error('✗ dist/index.html yok — önce `vite build` çalıştırın.');
    process.exit(1);
  }
  let shell = readFileSync(shellPath, 'utf8');
  // Daha önce prerender edilmiş bir kabuk mu? İşaretçiler korunduğu için sorun değil,
  // ama gövde/başlık artıklarını temizlemek için işaretçi içlerini boşalt.
  shell = shell
    .replace(/<!--seo:head-->[\s\S]*?<!--\/seo:head-->/, '<!--seo:head--><title>2MC Gastro</title><!--/seo:head-->')
    .replace(/<!--seo:body-->[\s\S]*?<!--\/seo:body-->/, '<!--seo:body--><!--/seo:body-->');

  // 1) Fonksiyon yedeği
  const gen = `// Otomatik üretilir: scripts/seo/prerender.ts — ELLE DÜZENLEMEYİN.\n` +
    `// dist/index.html kopyası (hash'li asset linkleri). api/render.ts yedek olarak kullanır.\n` +
    `export const SHELL = ${JSON.stringify(shell)};\n` +
    `export const SHELL_BUILT_AT = ${JSON.stringify(new Date().toISOString())};\n`;
  writeFileSync(resolve(ROOT, 'src', 'seo', 'server', '_shell.generated.ts'), gen, 'utf8');

  // 2) Statik rotalar
  const paths = enumerateStaticPaths().map((r) => r.path);
  // /tr/blog (Türkçe) de statik
  const extra = [localePath('tr', '/blog'), ...BLOG_POSTS.map((p) => localePath('tr', `/blog/${p.slug}`))];
  const all = Array.from(new Set([...paths, ...extra]));
  void INDEXABLE_LOCALES;

  let ok = 0; let fail = 0;
  const started = Date.now();
  const CONCURRENCY = 6;
  let idx = 0;
  async function worker() {
    while (idx < all.length) {
      const p = all[idx++];
      try {
        const out = await renderPage(p, shell);
        if (out.status !== 200) { console.warn(`  ! ${p} → ${out.status} (atlandı)`); fail++; continue; }
        const file = p === '/' ? shellPath : resolve(DIST, `${p.replace(/^\//, '')}.html`);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, out.html, 'utf8');
        ok++;
      } catch (e) {
        fail++;
        console.warn(`  ✗ ${p}:`, (e as Error).message);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`✅ prerender: ${ok} sayfa yazıldı, ${fail} atlandı (${((Date.now() - started) / 1000).toFixed(1)} s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
