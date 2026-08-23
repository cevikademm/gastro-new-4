// Vercel serverless function — dynamic product sitemap from Supabase.
// Route: /api/sitemap-products.xml → serves XML with all product URLs.
// Intended to be referenced from public/sitemap.xml as a sitemap index, or
// fetched directly by Search Console.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const SITE_URL = 'https://www.2mcgastro.de';

type Req = { method?: string };
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (code: number) => { end: (body?: string) => void; send: (b: string) => void };
};

function xmlEscape(s: string) {
  return s.replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  }[c] as string));
}

export default async function handler(req: Req, res: Res) {
  if (req.method && req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

  // Diamond products
  const { data: diamond } = await sb
    .from('diamond_products')
    .select('id, updated_at')
    .order('id', { ascending: true })
    .limit(5000);

  // CombiSteel products
  const { data: combi } = await sb
    .from('combisteel_products')
    .select('sku, updated_at')
    .order('sku', { ascending: true })
    .limit(5000);

  const urls: Array<{ loc: string; lastmod?: string }> = [];

  (diamond || []).forEach((p: any) => {
    urls.push({
      loc: `${SITE_URL}/product/${p.id}`,
      lastmod: p.updated_at ? String(p.updated_at).slice(0, 10) : undefined,
    });
  });

  (combi || []).forEach((p: any) => {
    urls.push({
      loc: `${SITE_URL}/product/${p.sku}`,
      lastmod: p.updated_at ? String(p.updated_at).slice(0, 10) : undefined,
    });
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${xmlEscape(u.loc)}</loc>${
        u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''
      }<changefreq>weekly</changefreq><priority>0.7</priority></url>`,
  )
  .join('\n')}
</urlset>
`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(body);
}
