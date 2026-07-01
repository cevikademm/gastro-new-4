import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SEO from '../../components/SEO';
import { breadcrumbSchema, faqSchema, howToSchema } from '../../lib/seo';

type Segment = 'restaurant' | 'hotel' | 'catering' | 'cafe';

const SEGMENT_FACTORS: Record<Segment, { area: number; power: number; labelKey: string }> = {
  restaurant: { area: 0.45, power: 180, labelKey: 'catalog.businessRestaurant' },
  hotel: { area: 0.55, power: 220, labelKey: 'catalog.businessHotel' },
  catering: { area: 0.70, power: 260, labelKey: 'catalog.businessCatering' },
  cafe: { area: 0.30, power: 120, labelKey: 'catalog.businessCafe' },
};

export default function KitchenCalculatorPage() {
  const { t } = useTranslation();
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
      question: t('tools.calcFaq1Q'),
      answer: t('tools.calcFaq1A'),
    },
    {
      question: t('tools.calcFaq2Q'),
      answer: t('tools.calcFaq2A'),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <SEO
        title={t('tools.calcSeoTitle')}
        description={t('tools.calcSeoDescription')}
        jsonLd={[
          breadcrumbSchema([
            { name: t('common.home'), url: '/' },
            { name: t('tools.breadcrumbTools'), url: '/tools' },
            { name: t('tools.breadcrumbKitchenCalc'), url: '/tools/kitchen-calculator' },
          ]),
          howToSchema({
            name: t('tools.calcHowToName'),
            description: t('tools.calcHowToDescription'),
            steps: [
              { name: t('tools.calcStep1Name'), text: t('tools.calcStep1Text') },
              { name: t('tools.calcStep2Name'), text: t('tools.calcStep2Text') },
              { name: t('tools.calcStep3Name'), text: t('tools.calcStep3Text') },
              { name: t('tools.calcStep4Name'), text: t('tools.calcStep4Text') },
            ],
          }),
          faqSchema(faqItems),
        ]}
      />

      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          {t('tools.calcHeading')}
        </h1>
        <p className="mt-2 text-slate-600 max-w-2xl">
          {t('tools.calcSubheading')}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('tools.calcBusinessType')}</label>
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
                  {t(SEGMENT_FACTORS[s].labelKey)}
                </button>
              ))}
            </div>
          </div>

          <NumberField label={t('tools.calcDailyGuests')} value={guests} onChange={setGuests} min={10} max={2000} />
          <NumberField label={t('tools.calcAvgTicket')} value={avgTicket} onChange={setAvgTicket} min={5} max={500} />
          <NumberField label={t('tools.calcDaysOpen')} value={daysOpen} onChange={setDaysOpen} min={1} max={31} />
          <NumberField label={t('tools.calcTotalInvestment')} value={investment} onChange={setInvestment} min={10000} max={5000000} step={5000} />
        </div>

        <div className="bg-gradient-to-br from-[#DC2626] to-[#991B1B] text-white rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold opacity-90">{t('tools.calcResultsTitle')}</h2>
          <Result label={t('tools.calcResultArea')} value={`${result.area} m²`} />
          <Result label={t('tools.calcResultPower')} value={`${result.power.toLocaleString('tr-TR')} W`} />
          <Result label={t('tools.calcResultRevenue')} value={`€${result.monthlyRevenue.toLocaleString('tr-TR')}`} />
          <Result label={t('tools.calcResultProfit')} value={`€${Math.round(result.monthlyProfit).toLocaleString('tr-TR')}`} />
          <Result
            label={t('tools.calcResultPayback')}
            value={
              isFinite(result.paybackMonths)
                ? t('tools.calcResultMonths', { count: Number(result.paybackMonths.toFixed(1)) })
                : t('tools.calcResultNA')
            }
          />

          <div className="pt-4 border-t border-white/20">
            <a
              href="/design"
              className="block w-full text-center py-3 bg-white text-[#DC2626] rounded-xl font-bold hover:bg-red-50 transition"
            >
              {t('tools.calcCta')}
            </a>
          </div>
        </div>
      </div>

      <section className="mt-12 pt-8 border-t border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">{t('tools.calcFaqTitle')}</h2>
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
