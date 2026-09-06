/**
 * bundle-api.ts — Vercel serverless fonksiyonlarını tek dosyaya paketler (esbuild, ESM).
 *
 * NEDEN: package.json `"type":"module"` → Vercel Node fonksiyonları ESM olarak çalışır.
 * Uzantısız göreli TS import'ları (`../src/seo/...`) ve JSON import'ları Node ESM'de
 * çalışma anında hata verir (FUNCTION_INVOCATION_FAILED). Paketlenmiş `api/*.js`
 * dosyalarında dış bağımlılık kalmaz (yalnızca node: yerleşikleri).
 *
 * Kaynak: src/seo/server/{render,sitemap,feed-gmc}.ts → api/{render,sitemap,feed-gmc}.js
 * Build sırası: vite build → prerender (_shell.generated.ts) → sitemaps → BU SCRIPT.
 * Üretilen api/*.js dosyaları commit edilir (Vercel fonksiyonları build'den bağımsız görsün).
 */
import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const ENTRIES = ['render', 'sitemap', 'feed-gmc'] as const;

async function main() {
  mkdirSync(resolve(ROOT, 'api'), { recursive: true });
  for (const name of ENTRIES) {
    const outfile = resolve(ROOT, 'api', `${name}.js`);
    const result = await build({
      entryPoints: [resolve(ROOT, 'src', 'seo', 'server', `${name}.ts`)],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node20',
      sourcemap: false,
      minify: false,
      legalComments: 'none',
      banner: { js: `// Otomatik üretilir: scripts/seo/bundle-api.ts (kaynak: src/seo/server/${name}.ts) — ELLE DÜZENLEMEYİN.` },
      define: { 'import.meta.env': 'undefined' },
      logLevel: 'warning',
      metafile: true,
    });
    const bytes = Object.values(result.metafile!.outputs)[0]?.bytes ?? 0;
    console.log(`✅ api/${name}.js (${(bytes / 1024).toFixed(0)} KB)`);
  }
  // Eski TS kaynaklarının api/ altında kalmadığından emin ol (çift fonksiyon önlemi)
  writeFileSync(resolve(ROOT, 'api', '.gitattributes'), '*.js linguist-generated=true\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
