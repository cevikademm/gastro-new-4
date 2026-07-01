import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';
import { COMPETITORS } from '../../content/compare/competitors';
import { breadcrumbSchema, organizationSchema } from '../../lib/seo';

export default function CompareIndexPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <SEO
        title={t('compare.indexSeoTitle', '2MC Gastro vs Rakipler — Karşılaştırma Rehberi')}
        description={t('compare.indexSeoDesc', "2MC Gastro'yu GGM Gastro, Nisbets ve BigGastro ile karşılaştırın. Fiyat, ürün çeşitliliği, 3D tasarım, kurulum hizmeti ve daha fazlası.")}
        jsonLd={[
          organizationSchema(),
          breadcrumbSchema([
            { name: t('compare.homeCrumb', 'Ana Sayfa'), url: '/' },
            { name: t('compare.breadcrumb', 'Karşılaştırma'), url: '/compare' },
          ]),
        ]}
      />

      <header className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-[#DC2626] rounded-full text-xs font-semibold mb-4">
          <TrendingUp size={14} /> {t('compare.badge', 'Pazar Karşılaştırması')}
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
          {t('compare.indexTitle', '2MC Gastro vs Rakipler')}
        </h1>
        <p className="mt-3 text-lg text-slate-600 max-w-2xl">
          {t('compare.indexSubtitle', 'Avrupa endüstriyel mutfak ekipmanı pazarındaki büyük oyuncularla yan yana karşılaştırma. Hangi platform sizin için doğru?')}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {COMPETITORS.map((c) => (
          <Link
            key={c.slug}
            to={`/compare/${c.slug}`}
            className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#DC2626] hover:shadow-md transition group"
          >
            <div className="text-xs text-slate-500 mb-1">{t('compare.vs', 'vs')}</div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{c.name}</h2>
            <div className="text-xs text-slate-500 mb-4">
              {c.origin} · {t('compare.monthlyVisits', '{{traffic}} aylık ziyaret', { traffic: c.monthlyTraffic })}
            </div>
            <p className="text-sm text-slate-600 line-clamp-3">{c.positioning}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm text-[#DC2626] font-semibold group-hover:gap-2 transition-all">
              {t('compare.seeComparison', 'Karşılaştırmayı gör')} <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
