// Google Merchant Center ürün feed'i — product_seo tablosundan (Diamond + CombiSteel + HENDI).
// Route: /feed-gmc.xml → RSS 2.0 (g: namespace).
//
// KARAR (2026-09-06): Ürün sayfaları yalnızca NET fiyat gösterir (B2B). Merchant
// Center Almanya'da tüketici (brüt) fiyat + landing sayfası eşleşmesi ister →
// bu feed Merchant Center'a GÖNDERİLMEZ; hazır tutulur. Brüt gösterim kararı
// gelirse: g:price = price_net * 1.19 ve ürün sayfasına brüt satır eklenir.
// Feed yine de B2B pazar yerleri / partner katalogları için kullanılabilir.
import { rest } from '../src/seo/data/supabase';
import type { ProductSeoRow } from '../src/seo/types';

const SITE_URL = 'https://www.2mcgastro.de';

type Req = { method?: string; query?: Record<string, string | string[] | undefined> };
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (code: number) => { end: (body?: string) => void; send: (b: string) => void };
};

function xe(s: unknown): string {
  if (s == null) return '';
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] as string));
}

type Row = Pick<ProductSeoRow, 'slug' | 'source' | 'source_id' | 'sku' | 'brand' | 'name_de' | 'description_de' | 'category_slug' | 'subcategory_slug' | 'price_net' | 'image' | 'images' | 'in_stock' | 'ean' | 'weight_kg'>;
const COLS = 'slug,source,source_id,sku,brand,name_de,description_de,category_slug,subcategory_slug,price_net,image,images,in_stock,ean,weight_kg';

function item(p: Row, gross: boolean): string {
  const price = gross ? (p.price_net || 0) * 1.19 : (p.price_net || 0);
  const extra = (p.images || []).filter((i) => i && i !== p.image).slice(0, 5);
  return `  <item>
    <g:id>${xe(`${p.source}-${p.source_id}`)}</g:id>
    <g:title>${xe(p.name_de.slice(0, 150))}</g:title>
    <g:description>${xe((p.description_de || p.name_de).slice(0, 5000))}</g:description>
    <g:link>${xe(`${SITE_URL}/produkt/${p.slug}`)}</g:link>
    <g:image_link>${xe(p.image)}</g:image_link>
${extra.map((i) => `    <g:additional_image_link>${xe(i)}</g:additional_image_link>`).join('\n')}
    <g:availability>${p.in_stock ? 'in_stock' : 'preorder'}</g:availability>
    <g:price>${price.toFixed(2)} EUR</g:price>
    <g:brand>${xe(p.brand)}</g:brand>
    <g:condition>new</g:condition>
    ${p.ean && /^\d{8,14}$/.test(p.ean) ? `<g:gtin>${xe(p.ean)}</g:gtin>` : ''}
    <g:mpn>${xe(p.sku)}</g:mpn>
    <g:identifier_exists>yes</g:identifier_exists>
    <g:google_product_category>4786</g:google_product_category>
    <g:product_type>${xe([p.category_slug, p.subcategory_slug].filter(Boolean).join(' > ') || 'Gastronomiebedarf')}</g:product_type>
    <g:item_group_id>${xe(p.subcategory_slug || p.category_slug || 'sonstiges')}</g:item_group_id>
    ${p.weight_kg ? `<g:shipping_weight>${p.weight_kg} kg</g:shipping_weight>` : ''}
    <g:shipping><g:country>DE</g:country><g:service>Spedition / Paket</g:service><g:price>0.00 EUR</g:price></g:shipping>
    <g:adult>no</g:adult>
  </item>`;
}

export default async function handler(req: Req, res: Res) {
  if (req.method && req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }
  const q = req.query || {};
  const gross = (Array.isArray(q.gross) ? q.gross[0] : q.gross) === '1';

  const items: string[] = [];
  const PAGE = 1000;
  for (let off = 0; off < 60000; off += PAGE) {
    const { data } = await rest<Row>(`product_seo?select=${COLS}&indexable=eq.true&price_net=gt.0&order=slug.asc&offset=${off}&limit=${PAGE}`, { timeoutMs: 20000 });
    for (const p of data) if (p.image) items.push(item(p, gross));
    if (data.length < PAGE) break;
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>2MC Gastro Produktfeed</title>
  <link>${SITE_URL}</link>
  <description>Gastronomiebedarf und Großküchentechnik — Diamond, CombiSteel, HENDI (${gross ? 'Bruttopreise inkl. 19 % MwSt.' : 'Nettopreise zzgl. MwSt.'})</description>
${items.join('\n')}
</channel>
</rss>
`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(body);
}
