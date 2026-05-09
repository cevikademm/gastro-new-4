import { useMemo, useState } from 'react';
import SEO from '../../components/SEO';
import { breadcrumbSchema, faqSchema, howToSchema } from '../../lib/seo';

type Segment = 'restaurant' | 'hotel' | 'catering' | 'cafe';

const SEGMENT_FACTORS: Record<Segment, { area: number; power: number; label: string }> = {
  restaurant: { area: 0.45, power: 180, label: 'Restoran' },
  hotel: { area: 0.55, power: 220, label: 'Otel' },
  catering: { area: 0.70, power: 260, label: 'Catering' },
  cafe: { area: 0.30, power: 120, label: 'Kafe / Bistro' },
};

export default function KitchenCalculatorPage() {
  const [segment, setSegment] = useState<Segment>('restaurant');
  const [guests, setGuests] = useState(100);
  const [avgTicket, setAvgTicket] = useState(25);
  const [daysOpen, setDaysOpen] = useState(26);
  const [investment, setInvestment] = useState(150000);

  const result = useMemo(() => {
    const f = SEGMENT_FACTORS[segment];
    const area = Math.round(guests * f.area);
    const power = Math.round(area * f.power);
    const monthlyRevenue = guests * avgTicket * daysOpen;
    const foodCost = monthlyRevenue * 0.32;
    const laborCost = monthlyRevenue * 0.28;
    const operational = monthlyRevenue * 0.15;
    const monthlyProfit = monthlyRevenue - foodCost - laborCost - operational;
    const paybackMonths = monthlyProfit > 0 ? investment / monthlyProfit : Infinity;
    return { area, power, monthlyRevenue, monthlyProfit, paybackMonths };
  }, [segment, guests, avgTicket, daysOpen, investment]);

  const faqItems = [
    {
      question: 'Endüstriyel mutfak için ne kadar alan gereklidir?',
      answer:
        'Segmente göre değişir: restoran için kişi başı ~0.45 m², otel için 0.55 m², catering için 0.70 m². Bu hesaplayıcı size size özel bir tahmin verir.',
    },
    {
      question: 'Yatırım geri dönüşü ne kadar sürer?',
      answer:
        'Tipik endüstriyel mutfak yatırımı 18-36 ay içinde geri döner. Aylık kâr marjı, doluluk ve menü fiyatına bağlıdır.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <SEO
        title="Mutfak Kapasite ve ROI Hesaplayıcı"
        description="Endüstriyel mutfak için gereken alan, güç tüketimi ve yatırım geri dönüş süresini saniyeler içinde hesaplayın. Restoran, otel, catering ve kafe için."
        jsonLd={[
          breadcrumbSchema([
            { name: 'Ana Sayfa', url: '/' },
            { name: 'Araçlar', url: '/tools' },
            { name: 'Mutfak Hesaplayıcı', url: '/tools/kitchen-calculator' },
          ]),
          howToSchema({
            name: 'Mutfak kapasitesi nasıl hesaplanır',
            description: 'Endüstriyel mutfak için alan, güç ve ROI hesaplama adımları',
            steps: [
              { name: 'Segment seçin', text: 'İşletme tipini belirleyin (restoran, otel, catering, kafe).' },
              { name: 'Kapasite girin', text: 'Günlük ortalama misafir sayısını girin.' },
              { name: 'Finansal veriler', text: 'Ortalama sepet ve açık gün sayısını girin.' },
              { name: 'Sonuçları okuyun', text: 'Gerekli alan, güç ve geri dönüş süresini görün.' },
            ],
          }),
          faqSchema(faqItems),
        ]}
      />

      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Mutfak Kapasite & ROI Hesaplayıcı
        </h1>
        <p className="mt-2 text-slate-600 max-w-2xl">
          Endüstriyel mutfak projeniz için gereken alan, güç tüketimi ve yatırım geri dönüş süresini saniyeler içinde hesaplayın.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">İşletme Tipi</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SEGMENT_FACTORS) as Segment[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSegment(s)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                    segment === s
                      ? 'bg-[#DC2626] text-white border-[#DC2626]'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-[#DC2626]'
                  }`}
                >
                  {SEGMENT_FACTORS[s].label}
                </button>
              ))}
            </div>
          </div>

          <NumberField label="Günlük Misafir Sayısı" value={guests} onChange={setGuests} min={10} max={2000} />
          <NumberField label="Ortalama Sepet (€)" value={avgTicket} onChange={setAvgTicket} min={5} max={500} />
          <NumberField label="Aylık Açık Gün" value={daysOpen} onChange={setDaysOpen} min={1} max={31} />
          <NumberField label="Toplam Yatırım (€)" value={investment} onChange={setInvestment} min={10000} max={5000000} step={5000} />
        </div>

        <div className="bg-gradient-to-br from-[#DC2626] to-[#991B1B] text-white rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold opacity-90">Tahmini Sonuçlar</h2>
          <Result label="Gerekli Mutfak Alanı" value={`${result.area} m²`} />
          <Result label="Kurulu Güç Tahmini" value={`${result.power.toLocaleString('tr-TR')} W`} />
          <Result label="Aylık Tahmini Ciro" value={`€${result.monthlyRevenue.toLocaleString('tr-TR')}`} />
          <Result label="Aylık Tahmini Net Kâr" value={`€${Math.round(result.monthlyProfit).toLocaleString('tr-TR')}`} />
          <Result
            label="Yatırım Geri Dönüşü"
            value={
              isFinite(result.paybackMonths)
                ? `${result.paybackMonths.toFixed(1)} ay`
                : 'N/A'
            }
          />

          <div className="pt-4 border-t border-white/20">
            <a
              href="/design"
              className="block w-full text-center py-3 bg-white text-[#DC2626] rounded-xl font-bold hover:bg-red-50 transition"
            >
              Ücretsiz 3D Mutfak Tasarlamaya Başla →
            </a>
          </div>
        </div>
      </div>

      <section className="mt-12 pt-8 border-t border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Sıkça Sorulan Sorular</h2>
        <div className="space-y-3">
          {faqItems.map((f, i) => (
            <details key={i} className="bg-slate-50 rounded-xl p-4">
              <summary className="font-semibold text-slate-900 cursor-pointer">{f.question}</summary>
              <p className="mt-2 text-slate-700">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
}) {
  return (
    <div>
      <label className="flex justify-between text-sm font-semibold text-slate-700 mb-2">
        <span>{label}</span>
        <span className="text-[#DC2626]">{value.toLocaleString('tr-TR')}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#DC2626]"
      />
    </div>
  );
}

function Result({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-sm opacity-80">{label}</span>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}
