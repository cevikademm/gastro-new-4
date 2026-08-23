// Blog RSS 2.0 feed — merges Supabase blog_posts with static fallback.
import { createClient } from '@supabase/supabase-js';

type Req = { method?: string };
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (n: number) => Res;
  send: (body: string) => void;
};

const SITE_URL = 'https://www.2mcgastro.de';

function xmlEscape(s: string) {
  return String(s || '').replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!
  );
}

export default async function handler(_req: Req, res: Res) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  let posts: Array<{
    slug: string;
    title: string;
    description: string;
    date_published: string;
    category?: string;
    author?: string;
  }> = [];

  if (url && key) {
    try {
      const sb = createClient(url, key);
      const { data } = await sb
        .from('blog_posts')
        .select('slug, title, description, date_published, category, author')
        .eq('status', 'published')
        .order('date_published', { ascending: false })
        .limit(50);
      posts = (data || []) as any;
    } catch {}
  }

  const items = posts
    .map(
      (p) => `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${SITE_URL}/blog/${xmlEscape(p.slug)}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${xmlEscape(p.slug)}</guid>
      <description>${xmlEscape(p.description)}</description>
      <pubDate>${new Date(p.date_published || Date.now()).toUTCString()}</pubDate>
      ${p.category ? `<category>${xmlEscape(p.category)}</category>` : ''}
      ${p.author ? `<author>${xmlEscape(p.author)}</author>` : ''}
    </item>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>2MC Gastro Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Endüstriyel mutfak rehberleri, ekipman karşılaştırmaları, HACCP ipuçları.</description>
    <language>tr-TR</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=1800');
  res.status(200).send(xml);
}
