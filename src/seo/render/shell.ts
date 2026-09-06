/**
 * shell.ts — `index.html` kabuğuna rota-özel head + gövde enjeksiyonu.
 *
 * Kabuk iki işaretçi çifti taşır:
 *   <!--seo:head--> … <!--/seo:head-->   (title, meta, canonical, hreflang, JSON-LD)
 *   <!--seo:body--> … <!--/seo:body-->   (#root içindeki semantik HTML)
 * Enjeksiyon işaretçiler arasını değiştirir; prerender edilmiş bir sayfa da
 * (işaretçileri koruduğu için) tekrar şablon olarak kullanılabilir.
 */
import type { PageModel } from '../types';
import { esc } from './html';

const HEAD_RE = /<!--seo:head-->[\s\S]*?<!--\/seo:head-->/;
const BODY_RE = /<!--seo:body-->[\s\S]*?<!--\/seo:body-->/;
const LANG_RE = /<html lang="[a-zA-Z-]*"/;

export const MANAGED_ATTR = 'data-seo-managed="1"';

export function buildHeadBlock(m: PageModel): string {
  const lines: string[] = [];
  lines.push(`<title>${esc(m.title)}</title>`);
  lines.push(`<meta name="title" content="${esc(m.title)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta name="description" content="${esc(m.description)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta name="robots" content="${esc(m.robots)}" ${MANAGED_ATTR}>`);
  if (m.status === 200 && !/noindex/.test(m.robots)) {
    lines.push(`<link rel="canonical" href="${esc(m.canonical)}" ${MANAGED_ATTR}>`);
    for (const alt of m.alternates) {
      lines.push(`<link rel="alternate" hreflang="${esc(alt.hreflang)}" href="${esc(alt.href)}" ${MANAGED_ATTR}>`);
    }
  }
  lines.push(`<meta property="og:type" content="${esc(m.ogType)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta property="og:site_name" content="2MC Gastro" ${MANAGED_ATTR}>`);
  lines.push(`<meta property="og:url" content="${esc(m.canonical)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta property="og:title" content="${esc(m.title)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta property="og:description" content="${esc(m.description)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta property="og:image" content="${esc(m.ogImage)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta property="og:locale" content="${m.lang === 'de' ? 'de_DE' : m.lang === 'tr' ? 'tr_TR' : m.lang === 'en' ? 'en_GB' : m.lang}" ${MANAGED_ATTR}>`);
  lines.push(`<meta name="twitter:card" content="summary_large_image" ${MANAGED_ATTR}>`);
  lines.push(`<meta name="twitter:title" content="${esc(m.title)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta name="twitter:description" content="${esc(m.description)}" ${MANAGED_ATTR}>`);
  lines.push(`<meta name="twitter:image" content="${esc(m.ogImage)}" ${MANAGED_ATTR}>`);
  for (const ld of m.jsonLd) {
    // JSON içinde "</script" kaçışı
    const json = JSON.stringify(ld).replace(/<\//g, '<\\/');
    lines.push(`<script type="application/ld+json" ${MANAGED_ATTR}>${json}</script>`);
  }
  return `<!--seo:head-->\n${lines.join('\n')}\n<!--/seo:head-->`;
}

export function injectIntoShell(template: string, m: PageModel): string {
  let html = template;
  html = html.replace(LANG_RE, `<html lang="${m.lang}"`);
  if (HEAD_RE.test(html)) html = html.replace(HEAD_RE, () => buildHeadBlock(m));
  else html = html.replace('</head>', () => `${buildHeadBlock(m)}\n</head>`);
  const body = `<!--seo:body-->\n${m.bodyHtml}\n<!--/seo:body-->`;
  if (BODY_RE.test(html)) html = html.replace(BODY_RE, () => body);
  else html = html.replace('<div id="root">', () => `<div id="root">${body}`);
  return html;
}
