import { useParams, Link, Navigate } from 'react-router-dom';
import { CheckCircle2, MapPin, Sparkles, TrendingUp } from 'lucide-react';
import SEO from '../../components/SEO';
import { getCategory } from '../../content/pseo/categories';
import { getCity } from '../../content/pseo/segments';
import { breadcrumbSchema, faqSchema, organizationSchema } from '../../lib/seo';

export default function CategoryCityPage() {
  const { category: catSlug, city: citySlug } = useParams<{ category: string; city: string }>();
  const category = catSlug ? getCategory(catSlug) : undefined;
  const city = citySlug ? getCity(citySlug) : undefined;

  if (!category || !city) return <Navigate to="/" replace />;

  const title = `${city.name} ${category.namePlural} — Profesyonel Fiyatlarla`;
  const description = `${city.name}'da ${category.name.toLowerCase()} satın alın. ${category.brands.slice(0, 3).join(', ')} ve daha fazlası. €${category.priceFrom}'dan başlayan fiyatlar, anahtar teslim kurulum.`;
  const url = `/kategori/${category.slug}/${city.slug}`;

  const faqs = [
    ...category.faqs,
    {
      question: `${city.name}'da ${category.name.toLowerCase()} nereden alınır?`,
      answer: `2MC Gastro, ${city.name}'da ${category.namePlural.toLowerCase()} için ${category.brands.join(', ')} markalarının yetkili tedarikçisidir. Anahtar teslim kurulum, garanti ve servis dahildir.`,
    },
  ];

  return (
    <div className="bg-white">
      <SEO
        title={title}
        description={description}
        jsonLd={[
          organizationSchema(),
          breadcrumbSchema([
            { name: 'Ana Sayfa', url: '/' },
            { name: category.namePlural, url: `/kategori/${category.slug}` },
            { name: city.name, url },
          ]),
          faqSchema(faqs),
        ]}
      />

      <section className="bg-gradient-to-br from-white via-red-50 to-white text-[#0F2440] border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <nav className="text-xs text-slate-500 mb-4">
            <Link to="/" className="hover:text-brand-red">Ana Sayfa</Link>
            {' / '}
            <Link to={`/kategori/${category.slug}`} className="hover:text-brand-red">
              {category.namePlural}
            </Link>
            {' / '}
            <span className="text-[#0F2440]">{city.name}</span>
          </nav>

          <div className="flex items-center gap-2 text-sm text-sky-300 font-semibold mb-3">
            <MapPin size={16} />
            <span>{city.name}, {city.country}</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight max-w-3xl">
            {city.name}'da {category.namePlural}
          </h1>
          <p className="mt-4 text-lg text-slate-200 max-w-2xl">{category.longDesc}</p>

          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-xl">
            <TrendingUp size={16} className="text-sky-300" />
            <span className="text-sm">
              Fiyat aralığı: <strong>€{category.priceFrom.toLocaleString('tr-TR')} - €{category.priceTo.toLocaleString('tr-TR')}</strong>
            </span>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/diamond"
              className="inline-flex items-center gap-2 px-6 py-3 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-400 transition"
            >
              Kataloğu İncele
            </Link>
            <Link
              to="/design"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur text-white border border-white/30 rounded-xl font-bold hover:bg-white/20 transition"
            >
              <Sparkles size={18} />
              3D Mutfakta Kullan
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Öne Çıkan Özellikler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {category.keyFeatures.map((f) => (
            <div key={f} className="flex items-start gap-3 p-5 bg-slate-50 rounded-xl">
              <CheckCircle2 className="text-sky-600 shrink-0 mt-0.5" size={20} />
              <span className="font-medium text-slate-900">{f}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {city.name}'da Hangi Markalar?
          </h2>
          <p className="text-slate-600 mb-8">Yetkili tedarikçi olarak sunduğumuz markalar:</p>
          <div className="flex flex-wrap gap-3">
            {category.brands.map((b) => (
              <div
                key={b}
                className="px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-900"
              >
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Kullanım Alanları</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {category.useCases.map((u) => (
            <div
              key={u}
              className="p-4 bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-xl text-center font-semibold text-slate-900"
            >
              {u}
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Sıkça Sorulan Sorular</h2>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <details key={i} className="bg-slate-50 rounded-xl p-5">
              <summary className="font-semibold text-slate-900 cursor-pointer">{f.question}</summary>
              <p className="mt-2 text-slate-700">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
