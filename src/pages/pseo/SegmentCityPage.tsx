import { useParams, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, MapPin, Calculator, Sparkles } from 'lucide-react';
import SEO from '../../components/SEO';
import { getSegment, getCity } from '../../content/pseo/segments';
import {
  PSEO_UI,
  getSegmentI18n,
  buildPseoPath,
  type PseoLocale,
} from '../../content/pseo/i18n';
import { breadcrumbSchema, faqSchema, organizationSchema } from '../../lib/seo';

type Props = { locale?: PseoLocale };

export default function SegmentCityPage({ locale = 'tr' }: Props) {
  const { t } = useTranslation();
  const { segment: segmentSlug, city: citySlug } = useParams<{ segment: string; city: string }>();
  const segment = segmentSlug ? getSegment(segmentSlug) : undefined;
  const city = citySlug ? getCity(citySlug) : undefined;

  if (!segment || !city) return <Navigate to="/" replace />;

  const ui = PSEO_UI[locale];
  const i18n = getSegmentI18n(segment.slug, locale);
  const segName = i18n?.name || segment.name;
  const segPlural = i18n?.namePlural || segment.namePlural;
  const segDesc = i18n?.description || segment.description;

  const localizedTitle: Record<PseoLocale, string> = {
    tr: `${city.name} ${segPlural} için Endüstriyel Mutfak Ekipmanları`,
    de: `Gastronomie-Küchenausstattung für ${segPlural} in ${city.name}`,
    en: `Commercial Kitchen Equipment for ${segPlural} in ${city.name}`,
  };
  const localizedDesc: Record<PseoLocale, string> = {
    tr: `${city.name}'da ${segName.toLowerCase()} işletmeniz için profesyonel endüstriyel mutfak ekipmanları. ${segment.keyEquipment.slice(0, 3).join(', ')} ve daha fazlası. 10.000+ ürün.`,
    de: `Professionelle Gastronomie-Küchenausstattung für ${segName} in ${city.name}. ${segment.keyEquipment.slice(0, 3).join(', ')} und mehr. 10.000+ Produkte, schlüsselfertige Installation.`,
    en: `Professional commercial kitchen equipment for ${segName.toLowerCase()} businesses in ${city.name}. ${segment.keyEquipment.slice(0, 3).join(', ')} and more. 10,000+ products, turnkey installation.`,
  };
  const title = localizedTitle[locale];
  const description = localizedDesc[locale];

  const localizedH1: Record<PseoLocale, string> = {
    tr: `${city.name}'da ${segName} Mutfağı Kurulumu`,
    de: `${segName}-Küche Installation in ${city.name}`,
    en: `${segName} Kitchen Setup in ${city.name}`,
  };
  const h1 = localizedH1[locale];
  const url = buildPseoPath(locale, 'sector', segment.slug, city.slug);

  return (
    <div className="bg-white">
      <SEO
        title={title}
        description={description}
        jsonLd={[
          organizationSchema(),
          breadcrumbSchema([
            { name: ui.home, url: `${locale === 'tr' ? '' : '/' + locale}/` },
            { name: segPlural, url: buildPseoPath(locale, 'sector', segment.slug) },
            { name: city.name, url },
          ]),
          faqSchema(segment.faqs),
        ]}
      />

      <section className="bg-gradient-to-br from-sky-50 via-white to-blue-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <nav className="text-xs text-slate-500 mb-4">
            <Link to="/" className="hover:text-sky-600">{t('common.home')}</Link>
            {' / '}
            <span className="text-slate-700">{segment.namePlural}</span>
            {' / '}
            <span className="text-slate-700">{city.name}</span>
          </nav>

          <div className="flex items-center gap-2 text-sm text-sky-600 font-semibold mb-3">
            <MapPin size={16} />
            <span>{city.name}, {city.country}</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight max-w-3xl">
            {h1}
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl">{segDesc}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/design"
              className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 transition"
            >
              <Sparkles size={18} />
              {ui.ctaDesign}
            </Link>
            <Link
              to="/tools/kitchen-calculator"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 border-2 border-slate-200 rounded-xl font-bold hover:border-sky-400 transition"
            >
              <Calculator size={18} />
              {ui.ctaCalculator}
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-4">
          {ui.features} — {city.name} {segPlural}
        </h2>
        <p className="text-slate-600 max-w-2xl mb-8">{segDesc}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segment.keyEquipment.map((eq) => (
            <div
              key={eq}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-sky-400 hover:shadow-md transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="text-sky-600" size={20} />
                </div>
                <div className="font-semibold text-slate-900">{eq}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">
            {ui.whyUs} — {city.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Feature
              title="10.000+ Ürün Kataloğu"
              text={`Diamond, CombiSteel ve 50+ marka. ${segment.name} mutfağınız için tüm ekipmanlar tek çatı altında.`}
            />
            <Feature
              title="Anahtar Teslim Kurulum"
              text={`${city.country} genelinde nakliye, kurulum, eğitim ve servis garantisi.`}
            />
            <Feature
              title="3D Tasarım Stüdyosu"
              text="Mutfağınızı kurulumdan önce 3D olarak tasarlayın, değişiklikleri gerçek zamanlı görün."
            />
            <Feature
              title="HACCP Uyumlu Tasarım"
              text="Tüm projelerimiz HACCP standartlarına uygun tasarlanır."
            />
            <Feature
              title={`€${segment.avgBudgetRange[0].toLocaleString('tr-TR')} - €${segment.avgBudgetRange[1].toLocaleString('tr-TR')}`}
              text={`${segment.name} kurulumu için tipik bütçe aralığı. İhtiyacınıza göre esnek finansman seçenekleri.`}
            />
            <Feature
              title="13+ Dilde Destek"
              text={`${city.country}'daki ekibimizden anadilinizde satış öncesi ve sonrası destek alın.`}
            />
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">{ui.faq}</h2>
        <div className="space-y-3">
          {segment.faqs.map((f, i) => (
            <details key={i} className="bg-slate-50 rounded-xl p-5">
              <summary className="font-semibold text-slate-900 cursor-pointer">{f.question}</summary>
              <p className="mt-2 text-slate-700">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-br from-sky-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{ui.readyHeading(segName, city.name)}</h2>
          <p className="text-sky-100 mb-8 max-w-2xl mx-auto">{ui.readyText}</p>
          <Link
            to="/design"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-sky-700 rounded-xl font-bold hover:bg-sky-50 transition"
          >
            <Sparkles size={20} />
            {ui.ctaFree}
          </Link>
        </div>
      </section>
    </div>
  );
}

function Feature({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200">
      <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600">{text}</p>
    </div>
  );
}
