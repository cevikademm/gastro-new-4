#!/usr/bin/env node
// Generate public/sitemap.xml from static routes + blog posts.
// Run: node scripts/generate-sitemap.mjs  (or wire into build script)

import { writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SITE_URL = 'https://www.2mcgastro.de';

const LOCALES = ['tr', 'en', 'de', 'fr', 'nl', 'it', 'es', 'pt', 'pl', 'cs', 'da', 'el', 'hu'];

// Static routes with priority + changefreq
const STATIC_ROUTES = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/diamond', priority: 0.9, changefreq: 'daily' },
  { path: '/combisteel', priority: 0.9, changefreq: 'daily' },
  { path: '/design', priority: 0.9, changefreq: 'weekly' },
  { path: '/kitchen-planner', priority: 0.8, changefreq: 'weekly' },
  { path: '/brand', priority: 0.7, changefreq: 'monthly' },
  { path: '/blog', priority: 0.9, changefreq: 'daily' },
  { path: '/tools/kitchen-calculator', priority: 0.8, changefreq: 'monthly' },
  { path: '/support', priority: 0.6, changefreq: 'monthly' },
  { path: '/docs', priority: 0.6, changefreq: 'monthly' },
  { path: '/compare', priority: 0.85, changefreq: 'weekly' },
  { path: '/compare/ggm-gastro', priority: 0.9, changefreq: 'weekly' },
  { path: '/compare/nisbets', priority: 0.9, changefreq: 'weekly' },
  { path: '/compare/biggastro', priority: 0.85, changefreq: 'weekly' },
  { path: '/resources', priority: 0.8, changefreq: 'monthly' },
];

// Read brand × category pairs
function readBrandRoutes() {
  try {
    const brandSrc = readFileSync(resolve(ROOT, 'src/content/pseo/brands.ts'), 'utf8');
    const brands = [...brandSrc.matchAll(/slug:\s*'([a-z-]+)',\s*\n\s*name:/g)].map((m) => m[1]);
    const catSrc = readFileSync(resolve(ROOT, 'src/content/pseo/categories.ts'), 'utf8');
    const cats = [...catSrc.matchAll(/slug:\s*'([a-z-]+)',\s*\n\s*name:/g)].map((m) => m[1]);
    const routes = [{ path: '/marka', priority: 0.8, changefreq: 'weekly' }];
    for (const b of brands) {
      routes.push({ path: `/marka/${b}`, priority: 0.85, changefreq: 'weekly' });
      for (const c of cats) {
        routes.push({ path: `/marka/${b}/${c}`, priority: 0.75, changefreq: 'weekly' });
      }
    }
    return routes;
  } catch {
    return [];
  }
}

// Read programmatic SEO category × city pairs
function readCategoryRoutes() {
  try {
    const src = readFileSync(resolve(ROOT, 'src/content/pseo/categories.ts'), 'utf8');
    const cats = [...src.matchAll(/slug:\s*'([a-z-]+)',\s*\n\s*name:/g)].map((m) => m[1]);
    const segSrc = readFileSync(resolve(ROOT, 'src/content/pseo/segments.ts'), 'utf8');
    const cityBlock = segSrc.match(/CITIES:\s*City\[\]\s*=\s*\[([\s\S]*?)\n\];/);
    const cities = cityBlock
      ? [...cityBlock[1].matchAll(/slug:\s*'([a-z-]+)'/g)].map((m) => m[1])
      : [];
    const routes = [{ path: '/kategori', priority: 0.8, changefreq: 'weekly' }];
    for (const cat of cats) {
      routes.push({ path: `/kategori/${cat}`, priority: 0.85, changefreq: 'weekly' });
      for (const city of cities) {
        routes.push({ path: `/kategori/${cat}/${city}`, priority: 0.8, changefreq: 'weekly' });
      }
    }
    return routes;
  } catch {
    return [];
  }
}

// Read programmatic SEO segment × city pairs
function readPseoRoutes() {
  try {
    const src = readFileSync(resolve(ROOT, 'src/content/pseo/segments.ts'), 'utf8');
    // Parse two blocks: SEGMENTS and CITIES
    const segBlock = src.match(/SEGMENTS:\s*Segment\[\]\s*=\s*\[([\s\S]*?)\n\];/);
    const cityBlock = src.match(/CITIES:\s*City\[\]\s*=\s*\[([\s\S]*?)\n\];/);
    const segments = segBlock
      ? [...segBlock[1].matchAll(/slug:\s*'([a-z-]+)'/g)].map((m) => m[1])
      : [];
    const cities = cityBlock
      ? [...cityBlock[1].matchAll(/slug:\s*'([a-z-]+)'/g)].map((m) => m[1])
      : [];
    const routes = [];
    for (const seg of segments) {
      routes.push({ path: `/sektor/${seg}`, priority: 0.7, changefreq: 'weekly' });
      for (const city of cities) {
        routes.push({ path: `/sektor/${seg}/${city}`, priority: 0.8, changefreq: 'weekly' });
        routes.push({ path: `/de/branche/${seg}/${city}`, priority: 0.75, changefreq: 'weekly' });
        routes.push({ path: `/en/industry/${seg}/${city}`, priority: 0.75, changefreq: 'weekly' });
      }
    }
    return routes;
  } catch {
    return [];
  }
}

// Read blog slugs from source
function readBlogSlugs() {
  try {
    const src = readFileSync(resolve(ROOT, 'src/content/blog/posts.ts'), 'utf8');
    const slugs = [...src.matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1]);
    const dates = [...src.matchAll(/datePublished:\s*'([^']+)'/g)].map((m) => m[1]);
    return slugs.map((slug, i) => ({
      path: `/blog/${slug}`,
      priority: 0.7,
      changefreq: 'monthly',
      lastmod: dates[i],
    }));
  } catch {
    return [];
  }
}

function xmlEscape(s) {
  return s.replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[c]);
}

function buildUrl(route) {
  const loc = `${SITE_URL}${route.path}`;
  const lastmod = route.lastmod || new Date().toISOString().slice(0, 10);
  const alternates = LOCALES.map(
    (l) =>
      `    <xhtml:link rel="alternate" hreflang="${l}" href="${xmlEscape(
        `${loc}?lang=${l}`,
      )}"/>`,
  ).join('\n');
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(loc)}"/>
  </url>`;
}

const allRoutes = [
  ...STATIC_ROUTES,
  ...readBlogSlugs(),
  ...readPseoRoutes(),
  ...readCategoryRoutes(),
  ...readBrandRoutes(),
];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allRoutes.map(buildUrl).join('\n')}
</urlset>
`;

const out = resolve(ROOT, 'public/sitemap.xml');
writeFileSync(out, xml, 'utf8');
console.log(`✅ sitemap.xml generated: ${allRoutes.length} URLs → ${out}`);
