// htmlText.ts — HTML içeren ürün açıklamalarını TEMİZ METNE çevirir.
// Bazı katalog kaynakları (özellikle CombiSteel `long_description`) açıklamayı HTML
// olarak döndürüyor. Kartlarda/detayda ham <p>/<strong>/<ul>/<li>/&nbsp; görünmesin
// diye burada etiketler sökülür, blok etiketleri satır sonuna çevrilir, HTML
// varlıkları (&nbsp; &amp; …) çözülür.

const NAMED: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  mdash: '—', ndash: '–', hellip: '…', bull: '•', middot: '·',
  deg: '°', copy: '©', reg: '®', trade: '™', euro: '€', times: '×',
};

/** &nbsp; &amp; &#39; &#x27; gibi HTML varlıklarını çözer. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|[a-z0-9]+);/gi, (m, code: string) => {
    const c = code.toLowerCase();
    if (NAMED[c] !== undefined) return NAMED[c];
    if (c[0] === '#') {
      const num = c[1] === 'x' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10);
      return Number.isFinite(num) ? String.fromCodePoint(num) : m;
    }
    return m;
  });
}

/** İçinde HTML etiketi var mı? */
export function hasHtml(s: string | null | undefined): boolean {
  return !!s && /<\/?[a-z][a-z0-9]*\b[^>]*>/i.test(s);
}

/** Blok kapanışlarını satır sonuna çevirir, kalan etiketleri söker. */
function stripTags(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\/\s*(p|li|h[1-6]|div|tr|ul|ol|table)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '');
}

/** HTML'i (varsa) çok satırlı düz metne çevirir; düz metni olduğu gibi döndürür. */
export function htmlToText(src: string | null | undefined): string {
  if (!src) return '';
  const raw = hasHtml(src) ? stripTags(src) : src;
  return decodeEntities(raw)
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t\f\v]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/** HTML/metni temiz madde satırlarına böler (özellik/avantaj listesi için). */
export function htmlToLines(src: string | null | undefined): string[] {
  if (!src) return [];
  const raw = hasHtml(src) ? stripTags(src) : src;
  return decodeEntities(raw)
    .split(/\r?\n/)
    .map((s) => s.replace(/^[•\-*·\s]+/, '').replace(/[ \t\f\v]+/g, ' ').trim())
    .filter(Boolean);
}
