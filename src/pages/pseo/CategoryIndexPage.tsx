import { useParams, Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, TrendingUp } from 'lucide-react';
import SEO from '../../components/SEO';
import { CATEGORIES, getCategory } from '../../content/pseo/categories';
import { CITIES } from '../../content/pseo/segments';
import { breadcrumbSchema } from '../../lib/seo';

export default function CategoryIndexPage() {
  const { t } = useTranslation();
  const { category: catSlug } = useParams<{ category?: string }>();

  // /kategori (hepsi) veya /kategori/:slug (tek kategori)
  if (!catSlug) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <SEO
          title="Ekipman Kategorileri"
          description="Endüstriyel mutfak ekipmanı kategorileri: kombi fırın, fritöz, ocak, blast chiller, bulaşık makinesi ve daha fazlası. Diamond ve CombiSteel markaları."
          jsonLd={[
            breadcrumbSchema([
              { name: 'Ana Sayfa', url: '/' },
              { name: 'Kategoriler', url: '/kategori' },
            ]),
          ]}
        />

        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            {t('pseo.equipmentCategories')}
          </h1>
          <p className="mt-2 text-slate-600">
            {t('pseo.equipmentCategoriesSubtitle')}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to={`/kategori/${c.slug}`}
              className="group p-6 bg-white border border-slate-200 rounded-2xl hover:border-brand-red hover:shadow-md transition"
            >
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-brand-red transition">
                {c.namePlural}
              </h2>
              <p className="mt-2 text-sm text-slate-600">{c.shortDesc}</p>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-red">
                <TrendingUp size={14} />
                {t('pseo.startingFrom', { price: `€${c.priceFrom.toLocaleString('tr-TR')}` })}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const category = getCategory(catSlug);
  if (!category) return <Navigate to="/kategori" replace />;

  return (
    <div>
      <SEO
        title={`${category.namePlural} — Profesyonel Fiyatlar`}
        description={`${category.longDesc} ${category.brands.join(', ')} markaları. €${category.priceFrom}'dan başlayan fiyatlar.`}
        jsonLd={[
          breadcrumbSchema([
            { name: 'Ana Sayfa', url: '/' },
            { name: 'Kategoriler', url: '/kategori' },
            { name: category.namePlural, url: `/kategori/${category.slug}` },
          ]),
        ]}
      />

      <section className="bg-gradient-to-br from-red-50 to-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            {category.namePlural}
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl">{category.longDesc}</p>
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-brand-red font-semibold">
            <TrendingUp size={16} />
            {t('pseo.priceLabel')}: €{category.priceFrom.toLocaleString('tr-TR')} - €{category.priceTo.toLocaleString('tr-TR')}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">{t('pseo.pricesByCity')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CITIES.map((c) => (
            <Link
              key={c.slug}
              to={`/kategori/${category.slug}/${c.slug}`}
              className="group flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-red transition"
            >
              <MapPin className="text-slate-400 group-hover:text-brand-red transition" size={18} />
              <div>
                <div className="font-semibold text-slate-900 group-hover:text-brand-red transition">
                  {c.name} {category.name}
                </div>
                <div className="text-xs text-slate-500">{c.country}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
