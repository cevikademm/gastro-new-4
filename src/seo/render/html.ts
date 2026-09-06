/**
 * html.ts — sunucu gövdesi için küçük, güvenli HTML yardımcıları (React'siz).
 * Gövde stil taşımaz: kullanıcı splash arkasında hiç görmez, React mount'ta değiştirir.
 */
import { localePath, type Locale } from '../../lib/locales';
import type { ProductCard } from '../data/supabase';

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fmtNet(n: number | null | undefined): string {
  if (n == null || !(n > 0)) return 'Preis auf Anfrage';
  return `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € zzgl. MwSt.`;
}

export function a(locale: Locale, path: string, text: string, attrs = ''): string {
  return `<a href="${esc(localePath(locale, path))}"${attrs ? ' ' + attrs : ''}>${esc(text)}</a>`;
}

export function ul(items: string[]): string {
  return items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '';
}

export function breadcrumbNav(locale: Locale, items: Array<{ name: string; url: string }>): string {
  const parts = items.map((it, i) =>
    i === items.length - 1 ? `<span aria-current="page">${esc(it.name)}</span>` : a(locale, it.url, it.name),
  );
  return `<nav aria-label="Breadcrumb"><ol>${parts.map((p) => `<li>${p}</li>`).join('')}</ol></nav>`;
}

export function faqHtml(faqs: Array<{ q: string; a: string }>, heading = 'Häufige Fragen'): string {
  if (!faqs.length) return '';
  return `<section><h2>${esc(heading)}</h2>${faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>`;
}

export function productCardHtml(locale: Locale, p: ProductCard): string {
  const img = p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name_de)}" loading="lazy" width="300" height="300">` : '';
  return `<li>${img}<a href="${esc(localePath(locale, `/produkt/${p.slug}`))}">${esc(p.name_de)}</a> <small>${esc(p.brand)} · ${esc(p.sku)}</small> <span>${esc(fmtNet(p.price_net))}</span></li>`;
}

export function productGridHtml(locale: Locale, rows: ProductCard[], heading?: string): string {
  if (!rows.length) return '';
  return `<section>${heading ? `<h2>${esc(heading)}</h2>` : ''}<ul>${rows.map((r) => productCardHtml(locale, r)).join('')}</ul></section>`;
}

export function paginationHtml(locale: Locale, basePath: string, page: number, total: number, per: number): string {
  const pages = Math.max(1, Math.ceil(total / per));
  if (pages <= 1) return '';
  const link = (n: number, label: string) => a(locale, n === 1 ? basePath : `${basePath}?page=${n}`, label);
  const parts: string[] = [];
  if (page > 1) parts.push(link(page - 1, '‹ Zurück'));
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  for (let n = start; n <= end; n++) parts.push(n === page ? `<strong>${n}</strong>` : link(n, String(n)));
  if (page < pages) parts.push(link(page + 1, 'Weiter ›'));
  return `<nav aria-label="Seiten">${parts.join(' ')}</nav>`;
}

export function wordCount(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
}
