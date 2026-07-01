import { useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, FileText, ChevronRight, ArrowRight } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { designQuoteLines } from '../../lib/designQuoteLines';

const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

/** Teklif numarası — ProjectDetailPage ile AYNI formül (id'nin son 6 hanesi + yıl). */
export function quoteNoFor(id: string): string {
  return `TKF-${id.slice(-6).toUpperCase()}-${new Date().getFullYear()}`;
}

/**
 * Teklifler — verilen tüm teklifler (her proje = bir teklif). Üstteki kutuya
 * teklif numarasını yazıp Enter'a basınca doğrudan o teklife (proje → Teklif
 * sekmesi) gider. Kısmi numara, müşteri ya da proje adıyla da aranabilir.
 */
export default function QuotesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const rows = useMemo(
    () =>
      projects.map((p) => {
        // Tasarım aracında (2D/3D) yerleştirilen ekipman satırları (adetli, fiyatlı).
        const dLines = designQuoteLines(p.id);
        const designCatalogIds = new Set(dLines.map((l) => l.catalogId));
        // Elle eklenen ürünlerden, tasarım satırının kapsadığı catalogId'yi tekrar sayma.
        const manual = p.products.filter((it) => !designCatalogIds.has(it.code));
        const manualSubtotal = manual.reduce((s, it) => s + (it.price || 0), 0);
        const designSubtotal = dLines.reduce((s, l) => s + (l.priceOnRequest ? 0 : l.lineTotal), 0);
        const designCount = dLines.reduce((s, l) => s + l.qty, 0);
        const subtotal = manualSubtotal + designSubtotal;
        return {
          id: p.id,
          quoteNo: quoteNoFor(p.id),
          client: p.clientName || '—',
          name: p.name,
          date: p.createdAt ? new Date(p.createdAt).toLocaleDateString('de-DE') : '—',
          count: manual.length + designCount,
          total: subtotal * 1.19,
        };
      }),
    [projects],
  );

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const q = norm(query);
  const filtered = q
    ? rows.filter(
        (r) => norm(r.quoteNo).includes(q) || norm(r.client).includes(q) || norm(r.name).includes(q),
      )
    : rows;

  const openQuote = (id: string) => navigate(`/projects/${id}?tab=quote`);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (filtered.length > 0) openQuote(filtered[0].id);
  };

  return (
    <div className="max-w-6xl mx-auto w-full space-y-6 py-8 px-4 sm:px-6">
      <div>
        <h1 className="font-headline text-3xl sm:text-4xl font-black text-on-surface tracking-tight flex items-center gap-3">
          <FileText className="text-primary" size={30} /> {t('projects.quotesTitle')}
        </h1>
        <p className="text-on-surface-variant text-sm mt-1.5">
          {t('projects.quotesSubtitle')}
        </p>
      </div>

      <form onSubmit={onSubmit} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
        <input
          ref={inputRef}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('projects.quotesSearchPlaceholder')}
          className="w-full bg-surface-container-low border border-outline-variant/50 rounded-xl py-3.5 pl-11 pr-28 text-sm text-on-surface focus:bg-surface-container-lowest focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none transition-colors font-mono"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-40"
          disabled={filtered.length === 0}
        >
          {t('projects.open')} <ArrowRight size={14} />
        </button>
      </form>

      <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden border border-outline-variant/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-surface-container">
                <th className="px-5 py-3 text-[10px] font-bold tracking-[1.5px] uppercase text-on-surface-variant">{t('projects.quoteNo')}</th>
                <th className="px-5 py-3 text-[10px] font-bold tracking-[1.5px] uppercase text-on-surface-variant">{t('projects.customer')}</th>
                <th className="px-5 py-3 text-[10px] font-bold tracking-[1.5px] uppercase text-on-surface-variant">{t('projects.project')}</th>
                <th className="px-5 py-3 text-[10px] font-bold tracking-[1.5px] uppercase text-on-surface-variant">{t('common.date')}</th>
                <th className="px-5 py-3 text-[10px] font-bold tracking-[1.5px] uppercase text-on-surface-variant text-right">{t('projects.amountVatIncluded')}</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="group hover:bg-surface-container-high transition-colors cursor-pointer"
                  onClick={() => openQuote(r.id)}
                >
                  <td className="px-5 py-4 font-mono font-bold text-primary text-sm whitespace-nowrap">{r.quoteNo}</td>
                  <td className="px-5 py-4 text-sm font-medium text-on-surface">{r.client}</td>
                  <td className="px-5 py-4 text-sm text-on-surface-variant">{r.name}</td>
                  <td className="px-5 py-4 text-sm text-on-surface-variant whitespace-nowrap">{r.date}</td>
                  <td className="px-5 py-4 text-sm font-bold text-on-surface text-right whitespace-nowrap">
                    {r.count > 0 ? eur.format(r.total) : '—'}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <ChevronRight size={20} className="text-outline-variant group-hover:text-primary transition-colors inline" />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-on-surface-variant">
                    {query ? t('projects.noQuotesForQuery', { query }) : t('projects.noQuotesYet')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
