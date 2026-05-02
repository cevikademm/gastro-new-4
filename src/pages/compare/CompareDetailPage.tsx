import type React from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Check, X, Sparkles, Calculator, MessageCircle } from 'lucide-react';
import SEO from '../../components/SEO';
import { getCompetitor } from '../../content/compare/competitors';
import { breadcrumbSchema, faqSchema, organizationSchema } from '../../lib/seo';

const TWO_MC = {
  name: '2MC Gastro',
  origin: 'Almanya (Köln) + Türkiye',
  monthlyTraffic: 'büyüyor',
  productCount: 10000,
  brands: ['Diamond', 'CombiSteel', '50+ marka'],
  hasDesignTool: true,
  hasROICalc: true,
  hasMultiLang: true,
  hasInstallation: true,
  pricing: 'mid' as const,
};

const PRICING_LABEL: Record<'low' | 'mid' | 'premium', string> = {
  low: 'Düşük',
  mid: 'Orta',
  premium: 'Premium',
};

export default function CompareDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const c = slug ? getCompetitor(slug) : undefined;
  if (!c) return <Navigate to="/compare" replace />;

  const title = `2MC Gastro vs ${c.name} — Hangisi Daha İyi? (2026 Karşılaştırma)`;
  const description = `${c.name} ile 2MC Gastro'yu yan yana karşılaştırın: ürün sayısı, 3D tasarım, kurulum, fiyat ve daha fazlası. Hangisi sizin için doğru?`;

  const faqs = [
    {
      question: `2MC Gastro ${c.name}'dan daha ucuz mu?`,
      answer: `2MC Gastro orta segment fiyatlandırma sunar. ${c.name} ${PRICING_LABEL[c.pricing].toLowerCase()} segmentte konumlanır. 2MC Gastro fiyat farkını anahtar teslim kurulum, 3D tasarım ve HACCP danışmanlığı ile dengeler.`,
    },
    {
      question: `${c.name} 3D mutfak tasarım sunuyor mu?`,
      answer: c.hasDesignTool
        ? `Evet, ${c.name} sınırlı bir 3D tasarım aracı sunar. 2MC Gastro ise tam özellikli ücretsiz 3D stüdyo sağlar — sürükle bırak, gerçek zamanlı malzeme listesi ve PDF teklif çıktısı.`
        : `Hayır, ${c.name} 3D tasarım aracı sunmaz. 2MC Gastro ücretsiz 3D mutfak stüdyosu, gerçek zamanlı BOM ve HACCP uyumlu yerleşim planı sağlar.`,
    },
    {
      question: `${c.name}'dan satın aldığımda kurulum hizmeti dahil mi?`,
      answer: c.hasInstallation
        ? `${c.name} bazı bölgelerde kurulum hizmeti sunar. 2MC Gastro tüm Avrupa'da nakliye, kurulum, eğitim ve servis garantisi sağlayan tam anahtar teslim çözüm sunar.`
        : `${c.name} genellikle yalnızca ürün satışı yapar; kurulum müşteriye bırakılır. 2MC Gastro nakliye, kurulum, eğitim ve servis garantisi içeren tam anahtar teslim hizmet sunar.`,
    },
    {
      question: `Hangi platform Türk işletmeler için daha uygun?`,
      answer: `2MC Gastro Türkçe arayüz, Türk satış ekibi ve Türkiye'ye özel finansman seçenekleriyle Türk işletmeler için optimize edilmiştir. ${c.name} Türk pazarına özel destek sunmaz.`,
    },
    {
      question: `${c.name}'da AI satış asistanı var mı?`,
      answer: `Hayır. 2MC Gastro, işletme tipinize ve kapasitenize göre kişiselleştirilmiş ürün önerileri sunan AI satış asistanına sahip pazardaki tek platformdur.`,
    },
    {
      question: 'Hangi platformun ürün çeşitliliği daha geniş?',
      answer: `${c.name} ${c.productCount.toLocaleString('tr-TR')}+ ürün listeler. 2MC Gastro 10.000+ premium ürün ile odaklı bir katalog sunar — Diamond ve CombiSteel ana markalar olarak. Geniş katalog yerine özenle seçilmiş, kanıtlanmış ekipmanlar.`,
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
      <div className={`text-sm ${highlight === 'a' ? 'text-[#E85D26] font-bold' : 'text-slate-700'}`}>{a}</div>
      <div className={`text-sm ${highlight === 'b' ? 'text-[#E85D26] font-bold' : 'text-slate-700'}`}>{b}</div>
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
            { name: 'Ana Sayfa', url: '/' },
            { name: 'Karşılaştırma', url: '/compare' },
            { name: `vs ${c.name}`, url: `/compare/${c.slug}` },
          ]),
          faqSchema(faqs),
        ]}
      />

      <section className="bg-gradient-to-br from-red-50 via-white to-rose-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-16">
          <nav className="text-xs text-slate-500 mb-4">
            <Link to="/" className="hover:text-[#E85D26]">Ana Sayfa</Link>
            {' / '}
            <Link to="/compare" className="hover:text-[#E85D26]">Karşılaştırma</Link>
            {' / '}
            <span className="text-slate-700">vs {c.name}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
            2MC Gastro <span className="text-slate-400">vs</span> {c.name}
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl">
            İki platformu yan yana inceleyin — fiyat, ürün, hizmet ve teknoloji. Hangisi sizin işletmeniz için doğru karar?
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-3 gap-4 pb-4 border-b-2 border-slate-200">
            <div></div>
            <div className="text-lg font-bold text-[#E85D26]">2MC Gastro</div>
            <div className="text-lg font-bold text-slate-700">{c.name}</div>
          </div>
          <Row label="Köken" a={TWO_MC.origin} b={`${c.origin} (${c.founded})`} />
          <Row label="Ürün sayısı" a={`${TWO_MC.productCount.toLocaleString('tr-TR')}+`} b={`${c.productCount.toLocaleString('tr-TR')}+`} />
          <Row label="Fiyat segmenti" a={PRICING_LABEL[TWO_MC.pricing]} b={PRICING_LABEL[c.pricing]} />
          <Row
            label="3D Tasarım Stüdyosu"
            a={<Bool v={TWO_MC.hasDesignTool} />}
            b={<Bool v={c.hasDesignTool} />}
            highlight={!c.hasDesignTool ? 'a' : undefined}
          />
          <Row
            label="ROI Hesaplayıcı"
            a={<Bool v={TWO_MC.hasROICalc} />}
            b={<Bool v={c.hasROICalc} />}
            highlight={!c.hasROICalc ? 'a' : undefined}
          />
          <Row
            label="Anahtar teslim kurulum"
            a={<Bool v={TWO_MC.hasInstallation} />}
            b={<Bool v={c.hasInstallation} />}
          />
          <Row
            label="Çoklu dil desteği"
            a={<>13+ dil</>}
            b={c.hasMultiLang ? <>Var</> : <>Sınırlı</>}
          />
          <Row label="AI satış asistanı" a={<Check className="text-emerald-600" size={18} />} b={<X className="text-slate-300" size={18} />} highlight="a" />
          <Row label="HACCP danışmanlığı" a={<Check className="text-emerald-600" size={18} />} b={<X className="text-slate-300" size={18} />} highlight="a" />
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
          <h3 className="font-bold text-emerald-900 mb-3">{c.name} — Güçlü Yönler</h3>
          <ul className="space-y-2">
            {c.strengths.map((s, i) => (
              <li key={i} className="text-sm text-emerald-900 flex gap-2">
                <Check size={16} className="mt-0.5 flex-none" /> {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-bold text-amber-900 mb-3">{c.name} — Eksikler</h3>
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

      <section className="bg-gradient-to-br from-[#E85D26] to-[#C44A1A] text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-4">2MC Gastro'yu deneyin — ücretsiz</h2>
          <p className="text-red-100 mb-8 max-w-2xl mx-auto">
            3D mutfak tasarımı, AI ürün önerisi ve anahtar teslim kurulum. Hiçbir kayıt gerekmez.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/design" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#E85D26] rounded-xl font-bold hover:bg-red-50">
              <Sparkles size={18} /> 3D Tasarıma Başla
            </Link>
            <Link to="/tools/kitchen-calculator" className="inline-flex items-center gap-2 px-6 py-3 bg-[#C44A1A] border border-white/30 text-white rounded-xl font-bold hover:bg-[#3D0D12]">
              <Calculator size={18} /> ROI Hesapla
            </Link>
            <Link to="/support" className="inline-flex items-center gap-2 px-6 py-3 bg-[#C44A1A] border border-white/30 text-white rounded-xl font-bold hover:bg-[#3D0D12]">
              <MessageCircle size={18} /> Bize Yazın
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
