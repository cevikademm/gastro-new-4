import { useParams, Link, Navigate } from 'react-router-dom';
import { Award, CheckCircle2, TrendingUp } from 'lucide-react';
import SEO from '../../components/SEO';
import { BRANDS, getBrand } from '../../content/pseo/brands';
import { getCategory, CATEGORIES } from '../../content/pseo/categories';
import { breadcrumbSchema, organizationSchema } from '../../lib/seo';

export default function BrandPage() {
  const { brand: brandSlug, category: catSlug } = useParams<{ brand?: string; category?: string }>();

  // /marka — tüm markalar
  if (!brandSlug) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <SEO
          title="Markalar"
          description="2MC Gastro'nun yetkili tedarikçi olduğu profesyonel mutfak ekipmanı markaları: Diamond, CombiSteel ve daha fazlası."
          jsonLd={[
            breadcrumbSchema([
              { name: 'Ana Sayfa', url: '/' },
              { name: 'Markalar', url: '/marka' },
            ]),
          ]}
        />
        <h1 className="text-4xl font-bold text-slate-900 mb-10">Markalar</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {BRANDS.map((b) => (
            <Link
              key={b.slug}
              to={`/marka/${b.slug}`}
              className="group p-8 bg-white border border-slate-200 rounded-2xl hover:border-brand-red hover:shadow-lg transition"
            >
              <div className="flex items-center gap-3 mb-2">
                <Award className="text-brand-red" size={24} />
                <h2 className="text-2xl font-bold text-slate-900 group-hover:text-brand-red">{b.name}</h2>
              </div>
              <p className="text-sm text-slate-500">{b.origin} · {b.founded}</p>
              <p className="mt-3 text-slate-700">{b.tagline}</p>
              <div className="mt-4 text-xs text-brand-red font-semibold">
                {b.productCount.toLocaleString('tr-TR')}+ ürün →
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const brand = getBrand(brandSlug);
  if (!brand) return <Navigate to="/marka" replace />;

  // /marka/:brand — tek marka
  if (!catSlug) {
    return (
      <div>
        <SEO
          title={`${brand.name} — ${brand.tagline}`}
          description={brand.description}
          jsonLd={[
            organizationSchema(),
            breadcrumbSchema([
              { name: 'Ana Sayfa', url: '/' },
              { name: 'Markalar', url: '/marka' },
              { name: brand.name, url: `/marka/${brand.slug}` },
            ]),
            {
              '@context': 'https://schema.org',
              '@type': 'Brand',
              name: brand.name,
              description: brand.description,
              foundingDate: String(brand.founded),
              foundingLocation: brand.origin,
            },
          ]}
        />

        <section className="bg-gradient-to-br from-[#0F2440] to-[#0a1830] text-white">
          <div className="max-w-7xl mx-auto px-4 py-16">
            <div className="flex items-center gap-2 text-brand-red text-sm mb-3">
              <Award size={16} />
              <span>{brand.origin} · {brand.founded}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{brand.name}</h1>
            <p className="mt-3 text-2xl text-slate-600 font-light">{brand.tagline}</p>
            <p className="mt-6 text-slate-300 max-w-2xl">{brand.description}</p>
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-xl">
              <TrendingUp size={16} className="text-brand-red" />
              <span><strong>{brand.productCount.toLocaleString('tr-TR')}+ ürün</strong> kataloğumuzda</span>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Neden {brand.name}?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {brand.strengths.map((s) => (
              <div key={s} className="flex items-start gap-3 p-5 bg-slate-50 rounded-xl">
                <CheckCircle2 className="text-brand-red shrink-0 mt-0.5" size={20} />
                <span className="font-medium text-slate-900">{s}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-slate-50 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">{brand.name} Ürün Kategorileri</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {brand.categories.map((catSlug) => {
                const cat = getCategory(catSlug);
                if (!cat) return null;
                return (
                  <Link
                    key={catSlug}
                    to={`/marka/${brand.slug}/${catSlug}`}
                    className="group p-5 bg-white border border-slate-200 rounded-xl hover:border-brand-red hover:shadow-md transition"
                  >
                    <div className="font-bold text-slate-900 group-hover:text-brand-red">
                      {brand.name} {cat.namePlural}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{cat.shortDesc}</div>
                    <div className="mt-2 text-xs text-brand-red font-semibold">
                      €{cat.priceFrom.toLocaleString('tr-TR')}'den başlayan
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // /marka/:brand/:category
  const category = getCategory(catSlug);
  if (!category) return <Navigate to={`/marka/${brand.slug}`} replace />;

  return (
    <div>
      <SEO
        title={`${brand.name} ${category.namePlural}`}
        description={`${brand.name} ${category.namePlural.toLowerCase()}. ${category.longDesc} €${category.priceFrom}'dan başlayan fiyatlarla.`}
        jsonLd={[
          organizationSchema(),
          breadcrumbSchema([
            { name: 'Ana Sayfa', url: '/' },
            { name: 'Markalar', url: '/marka' },
            { name: brand.name, url: `/marka/${brand.slug}` },
            { name: category.namePlural, url: `/marka/${brand.slug}/${catSlug}` },
          ]),
        ]}
      />

      <section className="bg-gradient-to-br from-white via-red-50 to-white text-[#0F2440] border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <nav className="text-xs text-slate-500 mb-4">
            <Link to="/" className="hover:text-brand-red">Ana Sayfa</Link> /{' '}
            <Link to={`/marka/${brand.slug}`} className="hover:text-brand-red">{brand.name}</Link> /{' '}
            <span>{category.namePlural}</span>
          </nav>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            {brand.name} {category.namePlural}
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl">
            {brand.name}'un profesyonel {category.namePlural.toLowerCase()} serisi. {category.shortDesc}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/diamond" className="px-6 py-3 bg-brand-red hover:bg-brand-red rounded-xl font-bold transition">
              Kataloğu Gör
            </Link>
            <Link to={`/kategori/${category.slug}`} className="px-6 py-3 bg-[#0F2440]/5 text-[#0F2440] border border-[#0F2440]/20 rounded-xl font-bold hover:bg-[#0F2440]/10 transition">
              Tüm {category.namePlural}
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          {brand.name} {category.name} Özellikleri
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {category.keyFeatures.map((f) => (
            <div key={f} className="flex items-start gap-3 p-5 bg-slate-50 rounded-xl">
              <CheckCircle2 className="text-brand-red shrink-0 mt-0.5" size={20} />
              <span className="font-medium text-slate-900">{f}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export { CATEGORIES };
