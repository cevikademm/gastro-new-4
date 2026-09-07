/**
 * BranchePage — /branche ve /branche/{slug} (işletme türü landing sayfaları).
 */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink, CheckCircle2, Boxes } from 'lucide-react';
import SEO from '../../components/SEO';
import NotFoundPage from '../NotFoundPage';
import Breadcrumbs from '../../components/seo/Breadcrumbs';
import FaqSection from '../../components/seo/FaqSection';
import { PageHero } from '../../components/MarketingLayout';
import { useLocalePath } from '../../lib/useLocalePath';
import { BRANCHEN_DE, findBranche } from '../../content/seo/branchen.de';
import { breadcrumbSchema, faqSchema } from '../../lib/seo';

export default function BranchePage() {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const { slug } = useParams<{ slug?: string }>();
  const b = slug ? findBranche(slug) : undefined;
  const home = { name: t('seo.home', 'Startseite'), url: '/' };
  const crumbs = useMemo(() => {
    const c = [home, { name: t('seo.branchen', 'Branchen'), url: '/branche' }];
    if (b) c.push({ name: b.name, url: `/branche/${b.slug}` });
    return c;
  }, [b, t]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!slug) {
    return (
      <>
        <SEO title="Branchenlösungen – Ausstattung nach Betriebstyp" description="Küchenausstattung nach Branche: Restaurant, Hotel, Pizzeria, Dönerladen, Imbiss, Bäckerei, Metzgerei, Kantine, Krankenhaus, Schule, Eisdiele, Bar, Foodtruck und Catering – mit Beispielkonfigurationen und Vorschriften." jsonLd={[breadcrumbSchema(crumbs)]} />
        <PageHero title="Ausstattung nach Branche" intro="Jeder Betriebstyp hat eigene Anforderungen an Kochtechnik, Kühlung, Ausgabe und Hygiene. Wählen Sie Ihre Branche: Sie erhalten die Grundausstattung, drei Beispielkonfigurationen und die geltenden Vorschriften – und können alles direkt im 3D-Küchenplaner umsetzen."><Breadcrumbs items={crumbs} /></PageHero>
        <section className="max-w-[1400px] mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BRANCHEN_DE.filter((x) => x.published).map((x) => (
            <Link key={x.slug} to={lp(`/branche/${x.slug}`)} className="group p-6 bg-white border border-slate-200 rounded-2xl hover:border-brand-red hover:shadow-md transition">
              <h2 className="text-lg font-display font-black text-[#0F2440] group-hover:text-brand-red">{x.name}</h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3">{x.description}</p>
            </Link>
          ))}
        </section>
      </>
    );
  }

  if (!b) return <NotFoundPage />;

  return (
    <>
      <SEO title={b.title} description={b.description} noindex={!b.published} jsonLd={[breadcrumbSchema(crumbs), ...(b.faqs.length ? [faqSchema(b.faqs.map((f) => ({ question: f.q, answer: f.a })))] : [])]} />
      <PageHero eyebrow={t('seo.brancheEyebrow', 'Branchenlösung')} title={b.h1} intro={b.intro}><Breadcrumbs items={crumbs} /></PageHero>

      <article className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        <section>
          <h2 className="text-2xl font-display font-black tracking-tight text-[#0F2440] mb-4">Planungsgrundlagen</h2>
          <ul className="space-y-2">{b.planning.map((p, i) => <li key={i} className="flex gap-3 text-[15px] text-slate-700"><CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" /><span>{p}</span></li>)}</ul>
        </section>
        <section>
          <h2 className="text-2xl font-display font-black tracking-tight text-[#0F2440] mb-4">Grundausstattung</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {b.equipment.map((e) => (
              <Link key={e.path + e.label} to={lp(e.path)} className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-brand-red transition">
                <span className="font-bold text-[#0F2440]">{e.label}</span>
                {e.note && <span className="block text-xs text-slate-600 mt-1">{e.note}</span>}
              </Link>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-display font-black tracking-tight text-[#0F2440] mb-4">Beispielkonfigurationen</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {b.configs.map((c) => (
              <div key={c.name} className="p-5 bg-white border border-slate-200 rounded-2xl">
                <h3 className="font-bold text-[#0F2440] mb-3">{c.name}</h3>
                <ul className="space-y-1.5 text-sm text-slate-600 list-disc pl-4">{c.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-display font-black tracking-tight text-[#0F2440] mb-4">Vorschriften &amp; Normen</h2>
          <ul className="space-y-2">
            {b.regulations.map((r) => (
              <li key={r.url} className="text-sm text-slate-700">
                <a href={r.url} target="_blank" rel="noopener" className="font-bold text-brand-red hover:underline inline-flex items-center gap-1">{r.label} <ExternalLink size={12} /></a>
                <span className="text-slate-600"> – {r.note}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="p-6 rounded-3xl bg-[#0F2440] text-white flex flex-col md:flex-row items-center gap-5">
          <Boxes size={40} className="text-[color:var(--c-clay-soft)] shrink-0" />
          <div className="flex-1">
            <h2 className="text-xl font-display font-black">Kostenlos in 3D planen</h2>
            <p className="text-white/75 text-sm mt-1">Übernehmen Sie eine Beispielkonfiguration in den 3D-Küchenplaner, passen Sie Maße und Geräte an und erhalten Sie ein Angebot.</p>
          </div>
          <Link to="/3d-design" className="px-6 py-3 rounded-xl bg-brand-red font-bold text-sm hover:bg-[#B91C1C] whitespace-nowrap">Zum 3D-Küchenplaner</Link>
        </section>
      </article>

      <FaqSection faqs={b.faqs} />

      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-lg font-display font-black text-[#0F2440] mb-3">Weitere Branchen</h2>
        <div className="flex flex-wrap gap-2">
          {BRANCHEN_DE.filter((x) => x.published && x.slug !== b.slug).map((x) => <Link key={x.slug} to={lp(`/branche/${x.slug}`)} className="px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-semibold hover:border-brand-red hover:text-brand-red">{x.name}</Link>)}
        </div>
      </section>
    </>
  );
}
