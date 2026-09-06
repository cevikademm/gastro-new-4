// Vercel serverless — sitemap index + alt sitemap'ler.
//
// /sitemap.xml            → index (tüm alt sitemap'leri listeler)
// /sitemap-pages.xml      → statik/hub sayfalar (kategori, marka, branche, şehir, yasal …)
// /sitemap-ratgeber.xml   → Almanca Ratgeber yazıları
// /sitemap-tr.xml         → /tr/blog (Türkçe)
// /sitemap-produkte-{diamond|combisteel|hendi}.xml → product_seo (indexable)
//
// vercel.json rewrite: /sitemap.xml → /api/sitemap?name=index · /sitemap-:name.xml → /api/sitemap?name=:name
import { SITE_URL, absoluteUrl, buildHreflangs } from '../src/lib/seo';
import { localePath } from '../src/lib/locales';
import { enumerateStaticPaths } from '../src/seo/routes';
import { BRANDS_DE } from '../src/content/seo/brands.de';
import { BLOG_POSTS } from '../src/content/blog/posts';
import ratgeberIndex from '../src/content/ratgeber/index.generated.json';
import { listProductSlugs } from '../src/seo/data/supabase';

type Req = { query?: Record<string, string | string[] | undefined> };
type Res = { setHeader: (k: string, v: string) => void; status: (n: number) => Res; send: (b: string) => void };

function xe(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] as string);
}
const today = () => new Date().toISOString().slice(0, 10);

function urlEntry(loc: string, o: { lastmod?: string; changefreq?: string; priority?: number; alternates?: Array<{ hreflang: string; href: string }> } = {}) {
  const alts = (o.alternates || []).map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${xe(a.href)}"/>`).join('\n');
  return `  <url>\n    <loc>${xe(loc)}</loc>\n    <lastmod>${o.lastmod || today()}</lastmod>` +
    (o.changefreq ? `\n    <changefreq>${o.changefreq}</changefreq>` : '') +
    (o.priority != null ? `\n    <priority>${o.priority.toFixed(1)}</priority>` : '') +
    (alts ? `\n${alts}` : '') + `\n  </url>`;
}

function urlset(entries: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`;
}

export const SITEMAP_NAMES = ['pages', 'ratgeber', 'tr', ...BRANDS_DE.map((b) => `produkte-${b.slug}`)];

export async function buildSitemap(name: string): Promise<string | null> {
  if (name === 'index') {
    const items = SITEMAP_NAMES.map((n) => `  <sitemap>\n    <loc>${SITE_URL}/sitemap-${n}.xml</loc>\n    <lastmod>${today()}</lastmod>\n  </sitemap>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</sitemapindex>\n`;
  }
  if (name === 'pages') {
    const entries = enumerateStaticPaths().map((r) =>
      urlEntry(absoluteUrl(r.path), { changefreq: r.changefreq, priority: r.priority, alternates: buildHreflangs(r.path) }),
    );
    return urlset(entries);
  }
  if (name === 'ratgeber') {
    const rows = (ratgeberIndex as Array<{ slug: string; status: string; dateModified?: string; datePublished?: string }>).filter((r) => r.status === 'published');
    return urlset(rows.map((r) => urlEntry(absoluteUrl(`/ratgeber/${r.slug}`), { lastmod: (r.dateModified || r.datePublished || today()).slice(0, 10), changefreq: 'monthly', priority: 0.7 })));
  }
  if (name === 'tr') {
    const entries = [urlEntry(absoluteUrl(localePath('tr', '/blog')), { changefreq: 'weekly', priority: 0.5 })];
    for (const p of BLOG_POSTS) entries.push(urlEntry(absoluteUrl(localePath('tr', `/blog/${p.slug}`)), { lastmod: p.datePublished, changefreq: 'monthly', priority: 0.5 }));
    return urlset(entries);
  }
  const m = name.match(/^produkte-([a-z0-9-]+)$/);
  if (m) {
    const brand = BRANDS_DE.find((b) => b.slug === m[1]);
    if (!brand) return null;
    const rows = await listProductSlugs(brand.slug);
    return urlset(rows.map((r) => urlEntry(absoluteUrl(`/produkt/${r.slug}`), { lastmod: String(r.updated_at || today()).slice(0, 10), changefreq: 'weekly', priority: 0.6 })));
  }
  return null;
}

export default async function handler(req: Req, res: Res) {
  const raw = req.query?.name;
  const name = (Array.isArray(raw) ? raw[0] : raw) || 'index';
  const xml = await buildSitemap(name);
  if (!xml) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(404).send('sitemap not found');
    return;
  }
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
