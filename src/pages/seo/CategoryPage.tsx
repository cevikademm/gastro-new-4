/**
 * CategoryPage — /{kategorie} ve /{kategorie}/{unterkategorie} (Almanca kök; /xx/ önekli).
 * Sunucu (src/seo/model/pages.ts) ile aynı title/description/JSON-LD mantığı.
 * Ürün listesi Supabase product_seo'dan, URL sayfalama ?page=n, filtre → noindex.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import SEO from '../../components/SEO';
import NotFoundPage from '../NotFoundPage';
import Breadcrumbs from '../../components/seo/Breadcrumbs';
import FaqSection from '../../components/seo/FaqSection';
import ProductSeoCard from '../../components/seo/ProductSeoCard';
import { PageHero } from '../../components/MarketingLayout';
import { useLocalePath } from '../../lib/useLocalePath';
import { CATEGORY_TREE, findCategory, findSubcategory } from '../../content/seo/categoryTree.de';
import { BRANDS_DE } from '../../content/seo/brands.de';
import { breadcrumbSchema, collectionPageSchema, itemListSchema, faqSchema } from '../../lib/seo';
import { fetchProductList, fetchCounts, sumCounts, type ProductSeoCardRow, type CountRow } from '../../lib/productSeoAdapter';
import { RATGEBER_INDEX as ratgeberIndex } from '../../content/ratgeber/index.generated';
import type { RatgeberEntry } from '../../content/ratgeber/types';

const PER_PAGE = 24;
const RATGEBER = (ratgeberIndex as unknown as RatgeberEntry[]).filter((r) => r.status === 'published');
type SortKey = 'default' | 'price-asc' | 'price-desc' | 'name-asc';

export default function CategoryPage(props: { category?: string; subcategory?: string } = {}) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const params = useParams<{ category?: string; subcategory?: string }>();
  const catSlug = props.category ?? params.category ?? '';
  const subSlug = props.subcategory ?? params.subcategory;
  const [sp, setSp] = useSearchParams();
  const cat = findCategory(catSlug);
  const sub = cat && subSlug ? findSubcategory(cat.slug, subSlug) : undefined;
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
  const sort = (sp.get('sort') as SortKey) || 'default';
  const brandFilter = sp.get('marke') || '';
  const filtered = !!(sp.get('sort') || sp.get('marke'));

  const [rows, setRows] = useState<ProductSeoCardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCounts().then(setCounts); }, []);
  useEffect(() => {
    if (!cat) return;
    let alive = true;
    setLoading(true);
    fetchProductList({ category: cat.slug, subcategory: sub?.slug, brandSlug: brandFilter || undefined, page, perPage: PER_PAGE, sort })
      .then((r) => { if (alive) { setRows(r.rows); setTotal(r.total); setLoading(false); } });
    return () => { alive = false; };
  }, [cat, sub, page, sort, brandFilter]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [page, catSlug, subSlug]);

  const basePath = cat ? (sub ? `/${cat.slug}/${sub.slug}` : `/${cat.slug}`) : '/';
  const crumbs = useMemo(() => {
    if (!cat) return [];
    const c = [{ name: t('seo.home', 'Startseite'), url: '/' }, { name: cat.name, url: `/${cat.slug}` }];
    if (sub) c.push({ name: sub.name, url: `/${cat.slug}/${sub.slug}` });
    return c;
  }, [cat, sub, t]);

  if (!cat || (subSlug && !sub)) return <NotFoundPage />;

  const node = sub ?? cat;
  const faqs = sub ? (sub.faqs ?? []) : cat.faqs;
  const h1 = (sub ? sub.h1 : cat.h1) + (page > 1 ? ` – ${t('seo.page', 'Seite')} ${page}` : '');
  const title = (sub ? (sub.title || sub.h1) : cat.title) + (page > 1 ? ` – ${t('seo.page', 'Seite')} ${page}` : '');
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const related = RATGEBER.filter((r) => r.relatedCategories.includes(cat.slug) || (sub && r.relatedCategories.includes(`${cat.slug}/${sub.slug}`))).slice(0, 6);
  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v); else next.delete(k);
    next.delete('page');
    setSp(next, { replace: true });
  };
  const pageLink = (n: number) => lp(n === 1 ? basePath : `${basePath}?page=${n}`);

  return (
    <>
      <SEO
        title={title}
        description={node.description}
        canonical={lp(basePath) + (page > 1 && !filtered ? `?page=${page}` : '')}
        noindex={filtered || (sub ? sub.published === false : !cat.published) || (!!sub && !loading && total < 4)}
        jsonLd={[
          breadcrumbSchema(crumbs),
          collectionPageSchema({ name: node.h1, url: basePath, description: node.description }),
          itemListSchema(rows.map((r) => ({ name: r.name_de, url: `/produkt/${r.slug}`, image: r.image || undefined }))),
          ...(page === 1 && faqs.length ? [faqSchema(faqs.map((f) => ({ question: f.q, answer: f.a })))] : []),
        ]}
      />

      <PageHero eyebrow={sub ? cat.name : t('seo.categoryEyebrow', 'Produktkategorie')} title={h1} intro={sub ? (sub.intro || sub.description) : cat.intro}>
        <Breadcrumbs items={crumbs} />
      </PageHero>

      {/* Unterkategorien */}
      {!sub && cat.children.filter((s) => s.published !== false).length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
          <h2 className="text-xl font-display font-black text-[#0F2440] mb-4">{t('seo.subcategories', 'Unterkategorien')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {cat.children.filter((s) => s.published !== false).map((s) => {
              const n = sumCounts(counts, (r) => r.category_slug === cat.slug && r.subcategory_slug === s.slug);
              return (
                <Link key={s.slug} to={lp(`/${cat.slug}/${s.slug}`)} className="group p-4 bg-white border border-slate-200 rounded-2xl hover:border-brand-red hover:shadow-md transition">
                  <h3 className="font-bold text-[#0F2440] group-hover:text-brand-red transition">{s.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{s.description.split('.')[0]}.</p>
                  {n > 0 && <span className="mt-2 inline-block text-[11px] font-bold text-brand-red">{n} {t('seo.products', 'Produkte')}</span>}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Filter + Grid */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-xl font-display font-black text-[#0F2440]">
            {node.name} <span className="text-slate-600 font-medium text-base">{total ? `· ${total.toLocaleString('de-DE')} ${t('seo.products', 'Produkte')}` : ''}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <select value={brandFilter} onChange={(e) => setParam('marke', e.target.value)} className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white" aria-label={t('seo.brand', 'Marke')}>
              <option value="">{t('seo.allBrands', 'Alle Marken')}</option>
              {BRANDS_DE.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
            </select>
            <select value={sort} onChange={(e) => setParam('sort', e.target.value === 'default' ? '' : e.target.value)} className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white" aria-label={t('seo.sort', 'Sortierung')}>
              <option value="default">{t('shop.sort.recommended', 'Empfohlen')}</option>
              <option value="price-asc">{t('shop.sort.priceAsc', 'Preis aufsteigend')}</option>
              <option value="price-desc">{t('shop.sort.priceDesc', 'Preis absteigend')}</option>
              <option value="name-asc">{t('shop.sort.nameAsc', 'Name A–Z')}</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div className="py-20 grid place-items-center"><Loader2 className="animate-spin text-brand-red" /></div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-slate-500">{t('seo.noProducts', 'Aktuell keine Produkte in dieser Auswahl.')}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {rows.map((p) => <ProductSeoCard key={`${p.source}-${p.source_id}`} p={p} />)}
          </div>
        )}
        {pages > 1 && (
          <nav aria-label={t('seo.pagination', 'Seiten')} className="mt-8 flex items-center justify-center gap-2 flex-wrap">
            {page > 1 && <Link to={pageLink(page - 1)} rel="prev" aria-label="Vorherige Seite" className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold hover:border-brand-red"><ChevronLeft size={16} aria-hidden="true" /></Link>}
            {Array.from({ length: pages }, (_, i) => i + 1).filter((n) => Math.abs(n - page) <= 2 || n === 1 || n === pages).map((n, i, arr) => (
              <span key={n} className="flex items-center gap-2">
                {i > 0 && arr[i - 1] !== n - 1 && <span className="text-slate-400">…</span>}
                <Link to={pageLink(n)} aria-current={n === page ? 'page' : undefined} className={`min-w-[40px] text-center px-3 py-2 rounded-xl border text-sm font-bold ${n === page ? 'bg-brand-red text-white border-brand-red' : 'bg-white border-slate-200 hover:border-brand-red'}`}>{n}</Link>
              </span>
            ))}
            {page < pages && <Link to={pageLink(page + 1)} rel="next" aria-label="Nächste Seite" className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold hover:border-brand-red"><ChevronRight size={16} aria-hidden="true" /></Link>}
          </nav>
        )}
      </section>

      {/* SEO-Text (nur Seite 1, Kategorie) */}
      {page === 1 && !sub && cat.sections.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 prose prose-slate max-w-none">
          {cat.sections.map((s) => (
            <div key={s.h2} className="mb-8">
              <h2 className="text-2xl font-display font-black tracking-tight text-[#0F2440] mb-3">{s.h2}</h2>
              <div className="text-[15px] text-slate-600 leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1" dangerouslySetInnerHTML={{ __html: s.html }} />
            </div>
          ))}
        </section>
      )}

      {page === 1 && <FaqSection faqs={faqs} />}

      {/* Marken × Kategorie */}
      {!sub && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          <h2 className="text-lg font-display font-black text-[#0F2440] mb-3">{cat.name} {t('seo.byBrand', 'nach Marke')}</h2>
          <div className="flex flex-wrap gap-2">
            {BRANDS_DE.map((b) => {
              const n = sumCounts(counts, (r) => r.category_slug === cat.slug && r.brand_slug === b.slug);
              if (n < 12) return null;
              return <Link key={b.slug} to={lp(`/marke/${b.slug}/${cat.slug}`)} className="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-bold hover:border-brand-red hover:text-brand-red">{b.name} ({n})</Link>;
            })}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          <h2 className="text-lg font-display font-black text-[#0F2440] mb-3">{t('seo.guides', 'Ratgeber')}</h2>
          <ul className="grid md:grid-cols-2 gap-3">
            {related.map((r) => <li key={r.slug}><Link to={lp(`/ratgeber/${r.slug}`)} className="block p-4 bg-white border border-slate-200 rounded-2xl hover:border-brand-red font-bold text-[#0F2440]">{r.title}</Link></li>)}
          </ul>
        </section>
      )}

      {/* Weitere Kategorien */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-lg font-display font-black text-[#0F2440] mb-3">{sub ? `${t('seo.more', 'Weitere')} ${cat.name}` : t('seo.moreCategories', 'Weitere Kategorien')}</h2>
        <div className="flex flex-wrap gap-2">
          {(sub ? cat.children.filter((s) => s.slug !== sub.slug && s.published !== false).map((s) => ({ to: `/${cat.slug}/${s.slug}`, name: s.name })) : CATEGORY_TREE.filter((c) => c.published && c.slug !== cat.slug).map((c) => ({ to: `/${c.slug}`, name: c.name })))
            .map((x) => <Link key={x.to} to={lp(x.to)} className="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-semibold hover:border-brand-red hover:text-brand-red">{x.name}</Link>)}
        </div>
      </section>
    </>
  );
}
