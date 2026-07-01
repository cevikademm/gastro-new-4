import type React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Check, X, Sparkles, Calculator, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';
import { getCompetitor } from '../../content/compare/competitors';
import { breadcrumbSchema, faqSchema, organizationSchema } from '../../lib/seo';

const TWO_MC = {
  name: '2MC Gastro',
  originKey: 'compare.twoMcOrigin',
  productCount: 10000,
  brands: ['Diamond', 'CombiSteel', '50+ marka'],
  hasDesignTool: true,
  hasROICalc: true,
  hasMultiLang: true,
  hasInstallation: true,
  pricing: 'mid' as const,
};

const PRICING_LABEL_KEY: Record<'low' | 'mid' | 'premium', string> = {
  low: 'compare.pricingLow',
  mid: 'compare.pricingMid',
  premium: 'compare.pricingPremium',
};

export default function CompareDetailPage() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const c = slug ? getCompetitor(slug) : undefined;
  if (!c) return <Navigate to="/compare" replace />;

  const title = t('compare.detailSeoTitle', '2MC Gastro vs {{name}} — Hangisi Daha İyi? (2026 Karşılaştırma)', { name: c.name });
  const description = t('compare.detailSeoDesc', "{{name}} ile 2MC Gastro'yu yan yana karşılaştırın: ürün sayısı, 3D tasarım, kurulum, fiyat ve daha fazlası. Hangisi sizin için doğru?", { name: c.name });

  const faqs = [
    {
      question: t('compare.faqPriceQ', "2MC Gastro {{name}}'dan daha ucuz mu?", { name: c.name }),
      answer: t('compare.faqPriceA', '2MC Gastro orta segment fiyatlandırma sunar. {{name}} {{pricing}} segmentte konumlanır. 2MC Gastro fiyat farkını anahtar teslim kurulum, 3D tasarım ve HACCP danışmanlığı ile dengeler.', { name: c.name, pricing: t(PRICING_LABEL_KEY[c.pricing]).toLowerCase() }),
    },
    {
      question: t('compare.faqDesignQ', '{{name}} 3D mutfak tasarım sunuyor mu?', { name: c.name }),
      answer: c.hasDesignTool
        ? t('compare.faqDesignAYes', 'Evet, {{name}} sınırlı bir 3D tasarım aracı sunar. 2MC Gastro ise tam özellikli ücretsiz 3D stüdyo sağlar — sürükle bırak, gerçek zamanlı malzeme listesi ve PDF teklif çıktısı.', { name: c.name })
        : t('compare.faqDesignANo', 'Hayır, {{name}} 3D tasarım aracı sunmaz. 2MC Gastro ücretsiz 3D mutfak stüdyosu, gerçek zamanlı BOM ve HACCP uyumlu yerleşim planı sağlar.', { name: c.name }),
    },
    {
      question: t('compare.faqInstallQ', "{{name}}'dan satın aldığımda kurulum hizmeti dahil mi?", { name: c.name }),
      answer: c.hasInstallation
        ? t('compare.faqInstallAYes', "{{name}} bazı bölgelerde kurulum hizmeti sunar. 2MC Gastro tüm Avrupa'da nakliye, kurulum, eğitim ve servis garantisi sağlayan tam anahtar teslim çözüm sunar.", { name: c.name })
        : t('compare.faqInstallANo', '{{name}} genellikle yalnızca ürün satışı yapar; kurulum müşteriye bırakılır. 2MC Gastro nakliye, kurulum, eğitim ve servis garantisi içeren tam anahtar teslim hizmet sunar.', { name: c.name }),
    },
    {
      question: t('compare.faqTurkishQ', 'Hangi platform Türk işletmeler için daha uygun?'),
      answer: t('compare.faqTurkishA', "2MC Gastro Türkçe arayüz, Türk satış ekibi ve Türkiye'ye özel finansman seçenekleriyle Türk işletmeler için optimize edilmiştir. {{name}} Türk pazarına özel destek sunmaz.", { name: c.name }),
    },
    {
      question: t('compare.faqAiQ', "{{name}}'da AI satış asistanı var mı?", { name: c.name }),
      answer: t('compare.faqAiA', 'Hayır. 2MC Gastro, işletme tipinize ve kapasitenize göre kişiselleştirilmiş ürün önerileri sunan AI satış asistanına sahip pazardaki tek platformdur.'),
    },
    {
      question: t('compare.faqVarietyQ', 'Hangi platformun ürün çeşitliliği daha geniş?'),
      answer: t('compare.faqVarietyA', '{{name}} {{count}}+ ürün listeler. 2MC Gastro 10.000+ premium ürün ile odaklı bir katalog sunar — Diamond ve CombiSteel ana markalar olarak. Geniş katalog yerine özenle seçilmiş, kanıtlanmış ekipmanlar.', { name: c.name, count: c.productCount.toLocaleString('tr-TR') }),
    },
  ];

  const Row = ({
    label,
    a,
    b,
    highlight,
  }: {
    label: string;
    a: React.ReactNode;
    b: React.ReactNode;
    highlight?: 'a' | 'b';
  }) => (
    <div className="grid grid-cols-3 gap-4 py-4 border-b border-slate-100">
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      <div className={`text-sm ${highlight === 'a' ? 'text-[#DC2626] font-bold' : 'text-slate-700'}`}>{a}</div>
      <div className={`text-sm ${highlight === 'b' ? 'text-[#DC2626] font-bold' : 'text-slate-700'}`}>{b}</div>
    </div>
  );

  const Bool = ({ v }: { v: boolean }) =>
    v ? <Check className="text-emerald-600" size={18} /> : <X className="text-slate-300" size={18} />;

  return (
    <div className="bg-white">
      <SEO
        title={title}
        description={description}
        jsonLd={[
          organizationSchema(),
          breadcrumbSchema([
            { name: t('compare.homeCrumb', 'Ana Sayfa'), url: '/' },
            { name: t('compare.breadcrumb', 'Karşılaştırma'), url: '/compare' },
            { name: `${t('compare.vs', 'vs')} ${c.name}`, url: `/compare/${c.slug}` },
          ]),
          faqSchema(faqs),
        ]}
      />

      <section className="bg-gradient-to-br from-red-50 via-white to-rose-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <nav className="text-xs text-slate-500 mb-4">
            <Link to="/" className="hover:text-[#DC2626]">{t('compare.homeCrumb', 'Ana Sayfa')}</Link>
            {' / '}
            <Link to="/compare" className="hover:text-[#DC2626]">{t('compare.breadcrumb', 'Karşılaştırma')}</Link>
            {' / '}
            <span className="text-slate-700">{t('compare.vs', 'vs')} {c.name}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            2MC Gastro <span className="text-slate-400">{t('compare.vs', 'vs')}</span> {c.name}
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl">
            {t('compare.detailIntro', 'İki platformu yan yana inceleyin — fiyat, ürün, hizmet ve teknoloji. Hangisi sizin işletmeniz için doğru karar?')}
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-3 gap-4 pb-4 border-b-2 border-slate-200">
            <div></div>
            <div className="text-lg font-bold text-[#DC2626]">2MC Gastro</div>
            <div className="text-lg font-bold text-slate-700">{c.name}</div>
          </div>
          <Row label={t('compare.rowOrigin', 'Köken')} a={t(TWO_MC.originKey)} b={`${c.origin} (${c.founded})`} />
          <Row label={t('compare.rowProductCount', 'Ürün sayısı')} a={`${TWO_MC.productCount.toLocaleString('tr-TR')}+`} b={`${c.productCount.toLocaleString('tr-TR')}+`} />
          <Row label={t('compare.rowPricingSegment', 'Fiyat segmenti')} a={t(PRICING_LABEL_KEY[TWO_MC.pricing])} b={t(PRICING_LABEL_KEY[c.pricing])} />
          <Row
            label={t('compare.rowDesignStudio', '3D Tasarım Stüdyosu')}
            a={<Bool v={TWO_MC.hasDesignTool} />}
            b={<Bool v={c.hasDesignTool} />}
            highlight={!c.hasDesignTool ? 'a' : undefined}
          />
          <Row
            label={t('compare.rowRoiCalc', 'ROI Hesaplayıcı')}
            a={<Bool v={TWO_MC.hasROICalc} />}
            b={<Bool v={c.hasROICalc} />}
            highlight={!c.hasROICalc ? 'a' : undefined}
          />
          <Row
            label={t('compare.rowTurnkeyInstall', 'Anahtar teslim kurulum')}
            a={<Bool v={TWO_MC.hasInstallation} />}
            b={<Bool v={c.hasInstallation} />}
          />
          <Row
            label={t('compare.rowMultiLang', 'Çoklu dil desteği')}
            a={<>{t('compare.multiLangValue', '13+ dil')}</>}
            b={c.hasMultiLang ? <>{t('compare.available', 'Var')}</> : <>{t('compare.limited', 'Sınırlı')}</>}
          />
          <Row label={t('compare.rowAiAssistant', 'AI satış asistanı')} a={<Check className="text-emerald-600" size={18} />} b={<X className="text-slate-300" size={18} />} highlight="a" />
          <Row label={t('compare.rowHaccp', 'HACCP danışmanlığı')} a={<Check className="text-emerald-600" size={18} />} b={<X className="text-slate-300" size={18} />} highlight="a" />
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
          <h3 className="font-bold text-emerald-900 mb-3">{t('compare.strengthsTitle', '{{name}} — Güçlü Yönler', { name: c.name })}</h3>
          <ul className="space-y-2">
            {c.strengths.map((s, i) => (
              <li key={i} className="text-sm text-emerald-900 flex gap-2">
                <Check size={16} className="mt-0.5 flex-none" /> {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-bold text-amber-900 mb-3">{t('compare.weaknessesTitle', '{{name}} — Eksikler', { name: c.name })}</h3>
          <ul className="space-y-2">
            {c.weaknesses.map((s, i) => (
              <li key={i} className="text-sm text-amber-900 flex gap-2">
                <X size={16} className="mt-0.5 flex-none" /> {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Sıkça Sorulan Sorular</h2>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <details key={i} className="bg-slate-50 rounded-xl p-5">
              <summary className="font-semibold text-slate-900 cursor-pointer">{f.question}</summary>
              <p className="mt-2 text-slate-700 text-sm leading-relaxed">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#DC2626] to-[#991B1B] text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-4">2MC Gastro'yu deneyin — ücretsiz</h2>
          <p className="text-red-100 mb-8 max-w-2xl mx-auto">
            3D mutfak tasarımı, AI ürün önerisi ve anahtar teslim kurulum. Hiçbir kayıt gerekmez.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/design" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#DC2626] rounded-xl font-bold hover:bg-red-50">
              <Sparkles size={18} /> 3D Tasarıma Başla
            </Link>
            <Link to="/tools/kitchen-calculator" className="inline-flex items-center gap-2 px-6 py-3 bg-[#991B1B] border border-white/30 text-white rounded-xl font-bold hover:bg-[#3D0D12]">
              <Calculator size={18} /> ROI Hesapla
            </Link>
            <Link to="/support" className="inline-flex items-center gap-2 px-6 py-3 bg-[#991B1B] border border-white/30 text-white rounded-xl font-bold hover:bg-[#3D0D12]">
              <MessageCircle size={18} /> Bize Yazın
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
