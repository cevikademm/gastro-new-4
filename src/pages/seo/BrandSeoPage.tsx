/**
 * BrandSeoPage — /marke, /marke/{marke}, /marke/{marke}/{kategorie}
 * (eski src/pages/pseo/BrandPage.tsx yerine; Almanca içerik brands.de.ts'ten)
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import SEO from '../../components/SEO';
import NotFoundPage from '../NotFoundPage';
import Breadcrumbs from '../../components/seo/Breadcrumbs';
import FaqSection from '../../components/seo/FaqSection';
import ProductSeoCard from '../../components/seo/ProductSeoCard';
import { PageHero } from '../../components/MarketingLayout';
import { useLocalePath } from '../../lib/useLocalePath';
import { BRANDS_DE, findBrand } from '../../content/seo/brands.de';
import { CATEGORY_TREE, findCategory } from '../../content/seo/categoryTree.de';
import { breadcrumbSchema, brandSchema, collectionPageSchema, itemListSchema, faqSchema } from '../../lib/seo';
import { fetchProductList, fetchCounts, sumCounts, type ProductSeoCardRow, type CountRow } from '../../lib/productSeoAdapter';

const PER_PAGE = 24;

export default function BrandSeoPage() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { brand: brandSlug, category: catSlug } = useParams<{ brand?: string; category?: string }>();
  const [sp] = useSearchParams();
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);
  const brand = brandSlug ? findBrand(brandSlug) : undefined;
  const cat = catSlug ? findCategory(catSlug) : undefined;
  const [rows, setRows] = useState<ProductSeoCardRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCounts().then(setCounts); }, []);
  useEffect(() => {
    if (!brand) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    fetchProductList({ brandSlug: brand.slug, category: cat?.slug, page, perPage: PER_PAGE })
      .then((r) => { if (alive) { setRows(r.rows); setTotal(r.total); setLoading(false); } });
    return () => { alive = false; };
  }, [brand, cat, page]);

  const home = { name: t('seo.home', 'Startseite'), url: '/' };
  const crumbs = useMemo(() => {
    const c = [home, { name: t('seo.brands', 'Marken'), url: '/marke' }];
    if (brand) c.push({ name: brand.name, url: `/marke/${brand.slug}` });
    if (brand && cat) c.push({ name: cat.name, url: `/marke/${brand.slug}/${cat.slug}` });
    return c;
  }, [brand, cat, t]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Index ── */
  if (!brandSlug) {
    return (
      <>
        <SEO title={t('seo.brandsTitle', 'Marken – Diamond, CombiSteel, HENDI')} description="Unsere Hersteller: Diamond (Belgien), CombiSteel und HENDI (Niederlande) – über 14.000 Produkte für Gastronomie und Großküche zu Netto-Preisen bei 2MC Gastro." jsonLd={[breadcrumbSchema(crumbs)]} />
        <PageHero title={t('seo.brandsH1', 'Marken bei 2MC Gastro')} intro="Drei europäische Hersteller, ein Katalog: Diamond für modulare Kochtechnik, CombiSteel für Kühlung und Edelstahl, HENDI für Kleingeräte und Bar."><Breadcrumbs items={crumbs} /></PageHero>
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10 grid md:grid-cols-3 gap-5">
          {BRANDS_DE.map((b) => {
            const n = sumCounts(counts, (r) => r.brand_slug === b.slug);
            return (
              <Link key={b.slug} to={lp(`/marke/${b.slug}`)} className="group p-6 bg-white border border-slate-200 rounded-2xl hover:border-brand-red hover:shadow-md transition">
                <h2 className="text-2xl font-display font-black text-[#0F2440] group-hover:text-brand-red">{b.name}</h2>
                <p className="text-xs text-slate-400 mt-1">{b.country}{n ? ` · ${n.toLocaleString('de-DE')} ${t('seo.products', 'Produkte')}` : ''}</p>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{b.description.split('.').slice(0, 2).join('.')}.</p>
              </Link>
            );
          })}
        </section>
      </>
    );
  }

  if (!brand || (catSlug && !cat)) return <NotFoundPage />;

  const basePath = cat ? `/marke/${brand.slug}/${cat.slug}` : `/marke/${brand.slug}`;
  const suffix = page > 1 ? ` – ${t('seo.page', 'Seite')} ${page}` : '';
  const title = cat ? `${cat.name} von ${brand.name} kaufen${suffix}` : `${brand.title}${suffix}`;
  const description = cat
    ? `${cat.name} von ${brand.name}: ${total ? `${total} Produkte` : 'Produkte'} zu Netto-Preisen bei 2MC Gastro – ${cat.description.split('.')[0]}. Lieferung in ganz Deutschland.`
    : brand.description;
  const thin = !!cat && !loading && total < 12;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <SEO
        title={title}
        description={description}
        canonical={lp(basePath) + (page > 1 ? `?page=${page}` : '')}
        noindex={thin}
        jsonLd={[
          breadcrumbSchema(crumbs),
          cat ? collectionPageSchema({ name: `${cat.name} von ${brand.name}`, url: basePath }) : brandSchema({ name: brand.name, url: basePath, description: brand.description }),
          itemListSchema(rows.map((r) => ({ name: r.name_de, url: `/produkt/${r.slug}`, image: r.image || undefined }))),
          ...(!cat && page === 1 && brand.faqs.length ? [faqSchema(brand.faqs.map((f) => ({ question: f.q, answer: f.a })))] : []),
        ]}
      />
      <PageHero eyebrow={`${brand.name} · ${brand.country}`} title={cat ? `${cat.name} von ${brand.name}${suffix}` : `${brand.h1}${suffix}`} intro={cat ? `${cat.intro.split('.').slice(0, 2).join('.')}.` : brand.intro}>
        <Breadcrumbs items={crumbs} />
      </PageHero>

      {!cat && page === 1 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          {brand.sections.map((s) => (
            <div key={s.h2} className="mb-8">
              <h2 className="text-2xl font-display font-black tracking-tight text-[#0F2440] mb-3">{s.h2}</h2>
              <div className="text-[15px] text-slate-600 leading-relaxed space-y-3" dangerouslySetInnerHTML={{ __html: s.html }} />
            </div>
          ))}
          <h2 className="text-xl font-display font-black text-[#0F2440] mb-3">{t('seo.subBrands', 'Linien & Untermarken')}</h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {brand.subBrands.map((s) => <li key={s.name} className="p-3 bg-white border border-slate-200 rounded-xl text-sm"><strong className="text-[#0F2440]">{s.name}</strong> – <span className="text-slate-600">{s.note}</span></li>)}
          </ul>
        </section>
      )}

      {!cat && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          <h2 className="text-lg font-display font-black text-[#0F2440] mb-3">{brand.name} {t('seo.byCategory', 'nach Kategorie')}</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_TREE.filter((c) => c.published).map((c) => {
              const n = sumCounts(counts, (r) => r.brand_slug === brand.slug && r.category_slug === c.slug);
              if (!n) return null;
              return <Link key={c.slug} to={lp(n >= 12 ? `/marke/${brand.slug}/${c.slug}` : `/${c.slug}`)} className="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-bold hover:border-brand-red hover:text-brand-red">{c.name} ({n})</Link>;
            })}
          </div>
        </section>
      )}

      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <h2 className="text-xl font-display font-black text-[#0F2440] mb-5">{cat ? cat.name : t('seo.products', 'Produkte')} <span className="text-slate-400 font-medium text-base">{total ? `· ${total.toLocaleString('de-DE')}` : ''}</span></h2>
        {loading ? <div className="py-20 grid place-items-center"><Loader2 className="animate-spin text-brand-red" /></div>
          : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{rows.map((p) => <ProductSeoCard key={`${p.source}-${p.source_id}`} p={p} />)}</div>}
        {pages > 1 && (
          <nav className="mt-8 flex justify-center gap-2 flex-wrap">
            {Array.from({ length: pages }, (_, i) => i + 1).filter((n) => Math.abs(n - page) <= 2 || n === 1 || n === pages).map((n) => (
              <Link key={n} to={lp(n === 1 ? basePath : `${basePath}?page=${n}`)} className={`min-w-[40px] text-center px-3 py-2 rounded-xl border text-sm font-bold ${n === page ? 'bg-brand-red text-white border-brand-red' : 'bg-white border-slate-200 hover:border-brand-red'}`}>{n}</Link>
            ))}
          </nav>
        )}
      </section>

      {!cat && page === 1 && <FaqSection faqs={brand.faqs} />}
      {cat && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 text-sm">
          <Link to={lp(`/${cat.slug}`)} className="font-bold text-brand-red hover:underline">{t('seo.allIn', 'Alle')} {cat.name} ({t('seo.allBrands', 'Alle Marken')}) →</Link>
        </section>
      )}
    </>
  );
}
