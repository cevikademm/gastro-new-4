// Google Merchant Center product feed.
// Route: /api/feed-gmc.xml → Google Merchant Center compatible RSS 2.0 feed.
// Configure in Merchant Center: Products → Feeds → Add → Scheduled fetch.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
const SITE_URL = 'https://www.2mcgastro.de';

type Req = { method?: string };
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (code: number) => { end: (body?: string) => void; send: (b: string) => void };
};

function xe(s: unknown): string {
  if (s == null) return '';
  return String(s).replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  }[c] as string));
}

function item(p: {
  id: string;
  title: string;
  description: string;
  link: string;
  image: string;
  price: number;
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  brand: string;
  condition?: 'new' | 'used';
  gtin?: string;
  mpn?: string;
}) {
  return `  <item>
    <g:id>${xe(p.id)}</g:id>
    <g:title>${xe(p.title)}</g:title>
    <g:description>${xe(p.description)}</g:description>
    <g:link>${xe(p.link)}</g:link>
    <g:image_link>${xe(p.image)}</g:image_link>
    <g:availability>${p.availability}</g:availability>
    <g:price>${p.price.toFixed(2)} EUR</g:price>
    <g:brand>${xe(p.brand)}</g:brand>
    <g:condition>${p.condition || 'new'}</g:condition>
    ${p.gtin ? `<g:gtin>${xe(p.gtin)}</g:gtin>` : ''}
    ${p.mpn ? `<g:mpn>${xe(p.mpn)}</g:mpn>` : ''}
    <g:google_product_category>4786</g:google_product_category>
    <g:product_type>Commercial Kitchen Equipment</g:product_type>
    <g:identifier_exists>${p.gtin || p.mpn ? 'yes' : 'no'}</g:identifier_exists>
  </item>`;
}

export default async function handler(req: Req, res: Res) {
  if (req.method && req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

  const { data: diamond } = await sb
    .from('diamond_products')
    .select('id, name, description_short, image_big, price_display, price_catalog, stock, product_family_name')
    .gt('price_display', 0)
    .limit(5000);

  const { data: combi } = await sb
    .from('combisteel_products')
    .select('sku, title, description, image_url, price, stock, brand')
    .gt('price', 0)
    .limit(5000);

  const items: string[] = [];

  (diamond || []).forEach((p: any) => {
    const price = p.price_display ?? p.price_catalog ?? 0;
    if (price <= 0) return;
    items.push(
      item({
        id: `diamond-${p.id}`,
        title: p.name || 'Diamond ürünü',
        description: p.description_short || p.name || '',
        link: `${SITE_URL}/product/${p.id}`,
        image: p.image_big || `${SITE_URL}/logo-2mc-gastro.jpeg`,
        price,
        availability: p.stock > 0 ? 'in_stock' : 'out_of_stock',
        brand: 'Diamond',
        mpn: String(p.id),
      }),
    );
  });

  (combi || []).forEach((p: any) => {
    if (!p.price || p.price <= 0) return;
    items.push(
      item({
        id: `combisteel-${p.sku}`,
        title: p.title || `CombiSteel ${p.sku}`,
        description: p.description || p.title || '',
        link: `${SITE_URL}/product/${p.sku}`,
        image: p.image_url || `${SITE_URL}/logo-2mc-gastro.jpeg`,
        price: p.price,
        availability: p.stock > 0 ? 'in_stock' : 'out_of_stock',
        brand: p.brand || 'CombiSteel',
        mpn: String(p.sku),
      }),
    );
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>2MC Gastro Product Feed</title>
  <link>${SITE_URL}</link>
  <description>Professional commercial kitchen equipment — Diamond &amp; CombiSteel</description>
${items.join('\n')}
</channel>
</rss>
`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(body);
}
