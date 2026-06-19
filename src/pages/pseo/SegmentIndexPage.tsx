import { useParams, Link, Navigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import SEO from '../../components/SEO';
import { CITIES, getSegment } from '../../content/pseo/segments';
import { breadcrumbSchema, organizationSchema } from '../../lib/seo';

export default function SegmentIndexPage() {
  const { segment: segmentSlug } = useParams<{ segment: string }>();
  const segment = segmentSlug ? getSegment(segmentSlug) : undefined;

  if (!segment) return <Navigate to="/" replace />;

  const title = `${segment.namePlural} için Endüstriyel Mutfak Ekipmanları`;
  const description = `${segment.namePlural} için profesyonel endüstriyel mutfak çözümleri. ${segment.description}`;

  return (
    <div>
      <SEO
        title={title}
        description={description}
        jsonLd={[
          organizationSchema(),
          breadcrumbSchema([
            { name: 'Ana Sayfa', url: '/' },
            { name: segment.namePlural, url: `/sektor/${segment.slug}` },
          ]),
        ]}
      />

      <section className="bg-gradient-to-br from-sky-50 to-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
            {segment.namePlural} için Endüstriyel Mutfak
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl">{segment.description}</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          Hizmet Verdiğimiz Şehirler
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CITIES.map((city) => (
            <Link
              key={city.slug}
              to={`/sektor/${segment.slug}/${city.slug}`}
              className="group flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-sky-400 hover:shadow-sm transition"
            >
              <MapPin className="text-slate-400 group-hover:text-sky-600 transition" size={18} />
              <div>
                <div className="font-semibold text-slate-900 group-hover:text-sky-600 transition">
                  {city.name}
                </div>
                <div className="text-xs text-slate-500">{city.country}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
