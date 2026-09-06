/**
 * CityPage — /gastronomiebedarf ve /gastronomiebedarf/{stadt}
 */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Truck, MapPin, Wrench } from 'lucide-react';
import SEO from '../../components/SEO';
import NotFoundPage from '../NotFoundPage';
import Breadcrumbs from '../../components/seo/Breadcrumbs';
import FaqSection from '../../components/seo/FaqSection';
import { PageHero } from '../../components/MarketingLayout';
import { useLocalePath } from '../../lib/useLocalePath';
import { STAEDTE_DE, findCity } from '../../content/seo/staedte.de';
import { CATEGORY_TREE } from '../../content/seo/categoryTree.de';
import { BRANCHEN_DE } from '../../content/seo/branchen.de';
import { breadcrumbSchema, storeSchema, faqSchema } from '../../lib/seo';

export default function CityPage() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { slug } = useParams<{ slug?: string }>();
  const c = slug ? findCity(slug) : undefined;
  const home = { name: t('seo.home', 'Startseite'), url: '/' };
  const crumbs = useMemo(() => {
    const x = [home, { name: t('seo.regions', 'Lieferregionen'), url: '/gastronomiebedarf' }];
    if (c) x.push({ name: c.name, url: `/gastronomiebedarf/${c.slug}` });
    return x;
  }, [c, t]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!slug) {
    return (
      <>
        <SEO title="Gastronomiebedarf in Ihrer Stadt – Lieferung & Beratung" description="Gastronomiebedarf mit Lieferung und Beratung in Köln, Bonn, Düsseldorf, Essen, Dortmund und ganz Deutschland. Eigene Auslieferung in NRW inklusive Montage, bundesweit per Spedition." jsonLd={[breadcrumbSchema(crumbs), storeSchema()]} />
        <PageHero title="Gastronomiebedarf in Ihrer Region" intro="2MC Gastro liefert von Köln aus in ganz Deutschland. In Nordrhein-Westfalen fahren wir mit eigenem Fahrzeug, vertragen und stellen auf; bundesweit versenden wir per Spedition frei Bordsteinkante."><Breadcrumbs items={crumbs} /></PageHero>
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STAEDTE_DE.filter((x) => x.published).map((x) => (
            <Link key={x.slug} to={lp(`/gastronomiebedarf/${x.slug}`)} className="group p-5 bg-white border border-slate-200 rounded-2xl hover:border-brand-red hover:shadow-md transition">
              <h2 className="text-lg font-display font-black text-[#0F2440] group-hover:text-brand-red">Gastronomiebedarf {x.name}</h2>
              <p className="mt-1 text-xs text-slate-500">{x.state} · {x.deliveryZone === 'eigen' ? 'eigene Auslieferung, Montage möglich' : 'Speditionsversand'} · {x.deliveryDays}</p>
            </Link>
          ))}
        </section>
      </>
    );
  }

  if (!c) return <NotFoundPage />;

  const eigen = c.deliveryZone === 'eigen';
  return (
    <>
      <SEO
        title={`Gastronomiebedarf ${c.name} – Großküchentechnik mit Lieferung`}
        description={`Gastronomiebedarf und Großküchentechnik für ${c.name}: ${eigen ? `eigene Auslieferung in ${c.deliveryDays}, Montage möglich` : `Lieferung per Spedition in ${c.deliveryDays}`}, Netto-Preise, kostenlose 3D-Küchenplanung. Diamond, CombiSteel, HENDI – 2MC Gastro Köln.`}
        noindex={!c.published}
        jsonLd={[breadcrumbSchema(crumbs), storeSchema({ areaServedCity: c.name }), ...(c.faqs.length ? [faqSchema(c.faqs.map((f) => ({ question: f.q, answer: f.a })))] : [])]}
      />
      <PageHero eyebrow={c.state} title={`Gastronomiebedarf ${c.name} – Lieferung, Beratung, Küchenplanung`} intro={`Großküchentechnik und Gastronomiebedarf für ${c.name}: Kochgeräte, Kühlung, Spültechnik, Edelstahlmöbel und Lüftung von Diamond, CombiSteel und HENDI – zu Netto-Preisen, mit kostenloser 2D/3D-Küchenplanung.`}><Breadcrumbs items={crumbs} /></PageHero>

      <article className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
        <section className="grid md:grid-cols-3 gap-4">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl"><Truck className="text-brand-red mb-2" /><h3 className="font-bold text-[#0F2440]">Lieferung</h3><p className="text-sm text-slate-600 mt-1">{eigen ? `Eigenes Fahrzeug, ${c.deliveryDays}` : `Spedition frei Bordsteinkante, ${c.deliveryDays}`}</p></div>
          <div className="p-5 bg-white border border-slate-200 rounded-2xl"><Wrench className="text-brand-red mb-2" /><h3 className="font-bold text-[#0F2440]">Montage</h3><p className="text-sm text-slate-600 mt-1">{c.montageAvailable ? 'Vertragen, Aufstellung und Montage durch unser Team' : 'Auf Anfrage über Partnerbetriebe vor Ort'}</p></div>
          <div className="p-5 bg-white border border-slate-200 rounded-2xl"><MapPin className="text-brand-red mb-2" /><h3 className="font-bold text-[#0F2440]">Entfernung</h3><p className="text-sm text-slate-600 mt-1">{c.distanceKm ? `ca. ${c.distanceKm} km von Köln` : 'Unser Standort'}</p></div>
        </section>
        <section>
          <h2 className="text-2xl font-display font-black tracking-tight text-[#0F2440] mb-3">Lieferung nach {c.name}</h2>
          <p className="text-[15px] text-slate-700 leading-relaxed">{eigen
            ? `${c.name} liegt ${c.distanceKm ? `rund ${c.distanceKm} km` : 'direkt'} von unserem Standort in Köln entfernt und gehört zu unserer eigenen Auslieferungszone: Lagerware liefern wir in ${c.deliveryDays} mit eigenem Fahrzeug, auf Wunsch mit Vertragen in die Küche, Aufstellung und Ausrichtung${c.montageAvailable ? ' sowie Montage durch unser Team' : ''}.`
            : `${c.name} liegt rund ${c.distanceKm} km von Köln entfernt. Wir liefern per Spedition frei Bordsteinkante in ${c.deliveryDays}; Vertragen und Montage organisieren wir auf Anfrage über Partnerbetriebe vor Ort. Beratung und 3D-Planung erfolgen per Video oder Telefon – Angebot und Planung sind ortsunabhängig.`}</p>
          {c.showroomNote && <p className="mt-3 text-[15px] text-slate-700">{c.showroomNote}</p>}
        </section>
        <section>
          <h2 className="text-2xl font-display font-black tracking-tight text-[#0F2440] mb-3">Gastronomie in {c.name}</h2>
          <p className="text-[15px] text-slate-700 leading-relaxed">{c.localMix}</p>
        </section>
        <section>
          <h2 className="text-xl font-display font-black text-[#0F2440] mb-3">Produkte für Betriebe in {c.name}</h2>
          <div className="flex flex-wrap gap-2">{CATEGORY_TREE.filter((x) => x.published).map((x) => <Link key={x.slug} to={lp(`/${x.slug}`)} className="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-semibold hover:border-brand-red hover:text-brand-red">{x.name}</Link>)}</div>
        </section>
        <section>
          <h2 className="text-xl font-display font-black text-[#0F2440] mb-3">Branchen in {c.name}</h2>
          <div className="flex flex-wrap gap-2">{BRANCHEN_DE.filter((x) => x.published).map((x) => <Link key={x.slug} to={lp(`/branche/${x.slug}`)} className="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-semibold hover:border-brand-red hover:text-brand-red">{x.name}</Link>)}</div>
        </section>
      </article>
      <FaqSection faqs={c.faqs} />
      {c.nearby.some((n) => findCity(n)?.published) && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <h2 className="text-lg font-display font-black text-[#0F2440] mb-3">In der Nähe</h2>
          <div className="flex flex-wrap gap-2">{c.nearby.map((n) => findCity(n)).filter((x): x is NonNullable<typeof x> => !!x && x.published).map((x) => <Link key={x.slug} to={lp(`/gastronomiebedarf/${x.slug}`)} className="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-semibold hover:border-brand-red hover:text-brand-red">{x.name}</Link>)}</div>
        </section>
      )}
    </>
  );
}
