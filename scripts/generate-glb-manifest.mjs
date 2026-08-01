#!/usr/bin/env node
/**
 * `public/models/` klasöründeki GLB dosyalarını tarayıp glbManifest.ts'i
 * günceller. Mevcut girişlerin elle eklenen meta verisini (productId, labelKey,
 * labelFallback, category, dimensionsMm) korur — sadece YENİ dosyalar için boş şablon ekler
 * ve diskte olmayan dosyaları manifest'ten siler.
 *
 * Kullanım:
 *   npm run glb:manifest
 *   node scripts/generate-glb-manifest.mjs
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MODELS_DIR = join(ROOT, 'public', 'models');
const MANIFEST_PATH = join(
  ROOT,
  'src',
  'modules',
  'three-d-design',
  'modules',
  '3d-editor',
  'loaders',
  'glbManifest.ts',
);

if (!existsSync(MODELS_DIR)) {
  console.error(`✗ Klasör yok: ${MODELS_DIR}`);
  process.exit(1);
}
if (!existsSync(MANIFEST_PATH)) {
  console.error(`✗ Manifest dosyası yok: ${MANIFEST_PATH}`);
  process.exit(1);
}

const diskFiles = readdirSync(MODELS_DIR)
  .filter((f) => f.toLowerCase().endsWith('.glb'))
  .sort();

console.log(`✓ public/models/ içinde ${diskFiles.length} GLB dosyası bulundu:`);
diskFiles.forEach((f) => console.log(`  · ${f}`));

const manifestText = readFileSync(MANIFEST_PATH, 'utf-8');

// ── Array sınırlarını bul ──────────────────────────────────────────────
const arrayStartMarker = 'export const GLB_MANIFEST: ReadonlyArray<GlbManifestEntry> = [';
const arrayStart = manifestText.indexOf(arrayStartMarker);
if (arrayStart < 0) {
  console.error('✗ Manifest dosyasında GLB_MANIFEST array bulunamadı.');
  process.exit(1);
}
const arrayBodyStart = arrayStart + arrayStartMarker.length;

let depth = 0;
let arrayBodyEnd = -1;
for (let i = arrayBodyStart; i < manifestText.length; i++) {
  const ch = manifestText[i];
  if (ch === '[' || ch === '{') depth++;
  else if (ch === ']' || ch === '}') {
    if (ch === ']' && depth === 0) {
      arrayBodyEnd = i;
      break;
    }
    depth--;
  }
}
if (arrayBodyEnd < 0) {
  console.error('✗ Array kapanışı bulunamadı.');
  process.exit(1);
}
const arrayBody = manifestText.slice(arrayBodyStart, arrayBodyEnd);

// ── Top-level entry bloklarını çıkar — full line ile (leading whitespace dahil) ──
const entries = []; // { text, filename }
let i = 0;
while (i < arrayBody.length) {
  while (i < arrayBody.length && arrayBody[i] !== '{') i++;
  if (i >= arrayBody.length) break;
  // Geriye sar — `{`'in olduğu satırın başına git
  let lineStart = i;
  while (lineStart > 0 && arrayBody[lineStart - 1] !== '\n') lineStart--;
  let d = 0;
  let j = i;
  for (; j < arrayBody.length; j++) {
    if (arrayBody[j] === '{') d++;
    else if (arrayBody[j] === '}') {
      d--;
      if (d === 0) {
        j++;
        break;
      }
    }
  }
  // Sonraki virgülü dahil et
  if (j < arrayBody.length && arrayBody[j] === ',') j++;
  // Sonraki newline'a kadar (komentar varsa o satırla beraber)
  while (j < arrayBody.length && arrayBody[j] !== '\n') j++;
  if (j < arrayBody.length && arrayBody[j] === '\n') j++;
  const text = arrayBody.slice(lineStart, j);
  const fnMatch = text.match(/filename:\s*'([^']+)'/);
  if (fnMatch) entries.push({ text, filename: fnMatch[1] });
  i = j;
}

const existing = new Map(entries.map((e) => [e.filename, e.text]));

// ── Yeni / silinmiş dosya hesaplaması ─────────────────────────────────
const removed = [...existing.keys()].filter((f) => !diskFiles.includes(f));
if (removed.length > 0) {
  console.log(`✗ Manifest'te olup diskte olmayan (kaldırıldı): ${removed.join(', ')}`);
}

const SKELETON = (filename) => {
  const stem = filename.replace(/\.glb$/i, '');
  const label = stem.replace(/_+/g, ' ').replace(/Meshy AI /gi, '(Meshy) ').trim();
  // labelKey: dosya adından türetilmiş camelCase çeviri anahtarı;
  // labelFallback: çeviri girilene kadar gösterilecek okunabilir ad.
  const keySafe = stem.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
  return `  {
    url: '/models/${filename}',
    filename: '${filename}',
    labelKey: 'glb.label.${keySafe}',
    labelFallback: '${label.replace(/'/g, "\\'")}',
    category: 'other',
    isEquipment: true,
  },
`;
};

const newOutput = diskFiles.map((filename) =>
  existing.has(filename) ? existing.get(filename) : SKELETON(filename),
);

const next =
  manifestText.slice(0, arrayBodyStart) +
  '\n' +
  newOutput.join('') +
  manifestText.slice(arrayBodyEnd);

writeFileSync(MANIFEST_PATH, next, 'utf-8');
const added = diskFiles.filter((f) => !existing.has(f));
console.log(`✓ Manifest güncellendi: ${MANIFEST_PATH}`);
console.log(`  Toplam giriş: ${diskFiles.length}`);
if (added.length > 0) {
  console.log(`  Yeni: ${added.join(', ')}`);
  console.log(`\n→ Yeni girişlerin productId / label / dimensionsMm alanlarını elle düzenleyebilirsin.`);
}
