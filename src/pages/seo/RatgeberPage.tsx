/**
 * RatgeberPage — /ratgeber ve /ratgeber/{slug} (Almanca rehber motoru).
 * Kaynak: src/content/ratgeber/index.generated.ts (build: npm run seo:ratgeber).
 * Draft/review yazılar yalnızca ?preview=1 ile görünür (noindex).
 */
import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';
import NotFoundPage from '../NotFoundPage';
import Breadcrumbs from '../../components/seo/Breadcrumbs';
import FaqSection from '../../components/seo/FaqSection';
import { PageHero } from '../../components/MarketingLayout';
import { useLocalePath } from '../../lib/useLocalePath';
import { findCategory, findSubcategory } from '../../content/seo/categoryTree.de';
import { breadcrumbSchema, collectionPageSchema, articleSchema, faqSchema, absoluteUrl } from '../../lib/seo';
import { RATGEBER_INDEX as ratgeberIndex } from '../../content/ratgeber/index.generated';
import { RATGEBER_CATEGORY_LABEL, type RatgeberEntry } from '../../content/ratgeber/types';

const ALL = ratgeberIndex as unknown as RatgeberEntry[];

export default function RatgeberPage() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { slug } = useParams<{ slug?: string }>();
  const [sp] = useSearchParams();
  const preview = sp.get('preview') === '1';
  const published = useMemo(() => ALL.filter((r) => r.status === 'published'), []);
  const home = { name: t('seo.home', 'Startseite'), url: '/' };

  if (!slug) {
    const crumbs = [home, { name: 'Ratgeber', url: '/ratgeber' }];
    const cats = Array.from(new Set(published.map((r) => r.category)));
    return (
      <>
        <SEO title="Ratgeber – Kaufberatung & Küchenplanung für die Gastronomie" description="Ratgeber für Gastronomiebedarf: Kombidämpfer, Gastro-Kühlschrank, Spülmaschine, Abzugshaube, Küchenplanung, HACCP und Förderung – praxisnah erklärt von 2MC Gastro." jsonLd={[breadcrumbSchema(crumbs), collectionPageSchema({ name: 'Ratgeber', url: '/ratgeber' })]} />
        <PageHero title="Ratgeber Gastronomiebedarf & Küchenplanung" intro="Kaufberatung, Planungshilfen und Hygiene-Wissen für Gastronomie, Hotellerie und Gemeinschaftsverpflegung – von der 2MC Gastro Redaktion."><Breadcrumbs items={crumbs} /></PageHero>
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          {published.length === 0 ? (
            <p className="text-slate-600">Die ersten Ratgeber erscheinen in Kürze. Bis dahin: <Link to={lp('/branche')} className="text-brand-red font-bold">Branchenlösungen</Link> und <Link to={lp('/produkte')} className="text-brand-red font-bold">Produktkategorien</Link>.</p>
          ) : cats.map((c) => (
            <div key={c} className="mb-10">
              <h2 className="text-xl font-display font-black text-[#0F2440] mb-4">{RATGEBER_CATEGORY_LABEL[c]}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {published.filter((r) => r.category === c).map((r) => (
                  <Link key={r.slug} to={lp(`/ratgeber/${r.slug}`)} className="group p-5 bg-white border border-slate-200 rounded-2xl hover:border-brand-red hover:shadow-md transition">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-red">{r.datePublished} · {r.readingMinutes} Min.</span>
                    <h3 className="text-lg font-bold text-[#0F2440] mt-1 group-hover:text-brand-red">{r.title}</h3>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-3">{r.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      </>
    );
  }

  const r = ALL.find((x) => x.slug === slug);
  if (!r || (r.status !== 'published' && !preview)) return <NotFoundPage />;
  const crumbs = [home, { name: 'Ratgeber', url: '/ratgeber' }, { name: r.title, url: `/ratgeber/${r.slug}` }];
  const related = r.relatedCategories.map((s) => { const [c, sub] = s.split('/'); const cat = findCategory(c); const sc = sub ? findSubcategory(c, sub) : undefined; return cat ? { to: `/${s}`, name: sc ? sc.name : cat.name } : null; }).filter((x): x is { to: string; name: string } => !!x);

  return (
    <>
      <SEO
        title={r.title}
        description={r.description}
        type="article"
        image={r.image ? absoluteUrl(r.image) : undefined}
        noindex={r.status !== 'published'}
        jsonLd={[breadcrumbSchema(crumbs), articleSchema({ title: r.title, description: r.description, image: r.image, datePublished: r.datePublished, dateModified: r.dateModified, author: r.author, url: `/ratgeber/${r.slug}` }), ...(r.faq.length ? [faqSchema(r.faq.map((f) => ({ question: f.q, answer: f.a })))] : [])]}
      />
      <PageHero eyebrow={`${RATGEBER_CATEGORY_LABEL[r.category]} · ${r.datePublished} · ${r.readingMinutes} Min. Lesezeit`} title={r.title} intro={r.description}><Breadcrumbs items={crumbs} /></PageHero>
      {r.status !== 'published' && <div className="max-w-4xl mx-auto px-4 mt-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-bold">Vorschau – Status: {r.status} (nicht indexiert)</div>}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {r.image && <img src={r.image} alt={r.imageAlt} width={1200} height={630} className="w-full rounded-2xl mb-8 object-cover" />}
        {r.toc.length > 3 && (
          <nav aria-label="Inhalt" className="mb-8 p-4 bg-white border border-slate-200 rounded-2xl text-sm">
            <strong className="text-[#0F2440]">Inhalt</strong>
            <ol className="mt-2 space-y-1 list-decimal pl-5">{r.toc.filter((x) => x.level === 2).map((x) => <li key={x.id}><a href={`#${x.id}`} className="text-slate-600 hover:text-brand-red">{x.text}</a></li>)}</ol>
          </nav>
        )}
        <div className="ratgeber-body text-[16px] text-slate-700 leading-relaxed space-y-4 [&_h2]:text-2xl [&_h2]:font-display [&_h2]:font-black [&_h2]:text-[#0F2440] [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[#0F2440] [&_h3]:mt-6 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:text-brand-red [&_a]:font-semibold [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:p-2 [&_td]:p-2 [&_tr]:border-b [&_img]:rounded-xl" dangerouslySetInnerHTML={{ __html: r.html }} />
        {r.sources.length > 0 && (
          <section className="mt-10 text-sm">
            <h2 className="text-lg font-bold text-[#0F2440] mb-2">Quellen</h2>
            <ul className="list-disc pl-5 space-y-1">{r.sources.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noopener" className="text-brand-red hover:underline">{s.title}</a>{s.publisher ? <span className="text-slate-500"> – {s.publisher}</span> : null}</li>)}</ul>
          </section>
        )}
      </article>
      <FaqSection faqs={r.faq} />
      {related.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <h2 className="text-lg font-display font-black text-[#0F2440] mb-3">Passende Produkte</h2>
          <div className="flex flex-wrap gap-2">{related.map((x) => <Link key={x.to} to={lp(x.to)} className="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-semibold hover:border-brand-red hover:text-brand-red">{x.name}</Link>)}</div>
        </section>
      )}
    </>
  );
}
