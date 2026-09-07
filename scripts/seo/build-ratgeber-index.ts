/**
 * build-ratgeber-index.ts — src/content/ratgeber/*.md → index.generated.ts (TS modülü)
 *
 * Frontmatter (YAML) + Markdown. `status: published` yazılar için zorunlu alanlar
 * kontrol edilir (description, image, ≥1 sources, ≥2 relatedCategories) — eksikse
 * build durur. Draft/review yazılar index'e `status` ile girer; React tarafı
 * yalnızca `?preview=1` ile gösterir, sitemap/renderer görmezden gelir.
 *
 * Çıktı TS modülüdür (JSON değil): Vercel Node ESM'de JSON import "import attribute"
 * ister → fonksiyon çöker. TS modülü hem Vite hem esbuild paketinde sorunsuz.
 *
 * Kullanım: npx tsx scripts/seo/build-ratgeber-index.ts
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import type { RatgeberEntry, RatgeberMeta } from '../../src/content/ratgeber/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');
const DIR = resolve(ROOT, 'src/content/ratgeber');
const OUT = resolve(DIR, 'index.generated.ts');

const HEADER = `// Otomatik üretilir: scripts/seo/build-ratgeber-index.ts — ELLE DÜZENLEMEYİN.\nimport type { RatgeberEntry } from './types';\n`;
const slugify = (s: string) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** JSON → TS kaynak literali: U+2028/U+2029 satır ayırıcılarını kaçır (JS kaynakta geçersiz). */
/** YAML parses unquoted YYYY-MM-DD values as Date objects. Keep sitemap and Article dates ISO-only. */
function isoDate(value: unknown, fallback: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  return text && !Number.isNaN(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : fallback;
}

function toSourceLiteral(value: unknown): string {
  // Karakterleri kodla üret — kaynak dosyada ham U+2028/2029 bulunmasın (regex literalinde geçersiz).
  const LS = String.fromCharCode(0x2028);
  const PS = String.fromCharCode(0x2029);
  return JSON.stringify(value).split(LS).join('\u2028').split(PS).join('\u2029');
}

function toEntry(file: string): RatgeberEntry {
  const raw = readFileSync(resolve(DIR, file), 'utf8');
  const { data, content } = matter(raw);
  const slug = String(data.slug || file.replace(/\.md$/, ''));
  const toc: RatgeberEntry['toc'] = [];
  const renderer = new marked.Renderer();
  renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
    const id = slugify(text);
    if (depth === 2 || depth === 3) toc.push({ id, text, level: depth as 2 | 3 });
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  };
  const html = sanitizeHtml(marked.parse(content, { renderer }) as string, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'figure', 'figcaption']),
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, a: ['href', 'name', 'target', 'rel'], img: ['src', 'alt', 'width', 'height', 'loading'], '*': ['id'] },
    transformTags: {
      a: (tag, attribs) => {
        const href = attribs.href || '';
        const external = /^https?:\/\//.test(href) && !href.includes('2mcgastro.de');
        return { tagName: 'a', attribs: external ? { ...attribs, rel: 'noopener', target: '_blank' } : attribs };
      },
    },
  });
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text.split(' ').filter(Boolean).length;
  const excerptMatch = html.match(/<p>([\s\S]*?)<\/p>/);
  const excerpt = excerptMatch ? excerptMatch[1].replace(/<[^>]+>/g, '').slice(0, 300) : text.slice(0, 300);
  const meta: RatgeberMeta = {
    slug,
    title: String(data.title || slug),
    description: String(data.description || ''),
    locale: 'de',
    category: (data.category || 'kaufberatung') as RatgeberMeta['category'],
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    author: String(data.author || '2MC Gastro Redaktion'),
    datePublished: isoDate(data.datePublished, new Date().toISOString().slice(0, 10)),
    dateModified: isoDate(data.dateModified ?? data.datePublished, new Date().toISOString().slice(0, 10)),
    image: String(data.image || ''),
    imageAlt: String(data.imageAlt || data.title || ''),
    status: (data.status || 'draft') as RatgeberMeta['status'],
    faq: Array.isArray(data.faq) ? data.faq.map((f: any) => ({ q: String(f.q ?? f.question ?? ''), a: String(f.a ?? f.answer ?? '') })).filter((f: any) => f.q && f.a) : [],
    relatedCategories: Array.isArray(data.relatedCategories) ? data.relatedCategories.map(String) : [],
    relatedProducts: Array.isArray(data.relatedProducts) ? data.relatedProducts.map(String) : [],
    sources: Array.isArray(data.sources) ? data.sources.map((s: any) => ({ title: String(s.title || s.url), url: String(s.url), publisher: s.publisher ? String(s.publisher) : undefined })) : [],
    readingMinutes: Math.max(1, Math.round(wordCount / 200)),
    wordCount,
  };
  if (meta.status === 'published') {
    const problems: string[] = [];
    if (!meta.description) problems.push('description eksik');
    if (!meta.image) problems.push('image eksik');
    if (meta.sources.length < 1) problems.push('en az 1 kaynak (sources) gerekli');
    if (meta.relatedCategories.length < 2) problems.push('en az 2 relatedCategories gerekli');
    if (wordCount < 600) problems.push(`çok kısa (${wordCount} kelime, min 600)`);
    if (problems.length) throw new Error(`Ratgeber "${slug}" published olamaz: ${problems.join('; ')}`);
  }
  return { ...meta, html, excerpt, toc };
}

function main() {
  if (!existsSync(DIR)) { writeFileSync(OUT, `${HEADER}export const RATGEBER_INDEX: RatgeberEntry[] = [];\n`); return; }
  const files = readdirSync(DIR).filter((f) => f.endsWith('.md'));
  const entries = files.map(toEntry).sort((a, b) => (a.datePublished < b.datePublished ? 1 : -1));
  writeFileSync(OUT, `${HEADER}export const RATGEBER_INDEX: RatgeberEntry[] = ${toSourceLiteral(entries)};\n`, 'utf8');
  const pub = entries.filter((e) => e.status === 'published').length;
  console.log(`✅ ratgeber index: ${entries.length} yazı (${pub} yayında) → ${OUT}`);
}

main();
