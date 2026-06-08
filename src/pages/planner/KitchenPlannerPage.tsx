import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, ChefHat, Coffee, Pizza, Utensils, Hotel, Store,
  ChevronRight, Loader2, Trash2, ShoppingCart,
  Ruler, Wallet, Check, Zap, Bot, Calculator, Users, Flame,
  TrendingUp, Clock, Pencil, Info, Target,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { chatWithAI } from '../../lib/ai';
import { useCartStore } from '../../stores/cartStore';
import { supabase } from '../../lib/supabase';
import type { DiamondProduct } from '../../stores/diamondStore';
import { diamondToEquipment } from '../../lib/diamondAdapter';

// ─────────────────────────────────────────────────────────────
// İŞLETME TİPLERİ — her biri için sektörel katsayılar + varsayılanlar
// Katsayılar Türkiye gastronomi sektör ortalamalarına göre kalibrelenmiştir.
// ─────────────────────────────────────────────────────────────
type BusinessType = 'restaurant' | 'cafe' | 'hotel' | 'fastfood' | 'bakery' | 'catering';

interface BusinessProfile {
  id: BusinessType;
  icon: any;
  label: string;
  desc: string;
  // Renk (gradient)
  from: string;
  to: string;
  // Alan katsayısı (misafir başı m²)
  areaPerGuest: number;
  // Kurulu güç (W/m²)
  powerPerM2: number;
  // Finansal profil
  avgTicket: number;      // Ortalama sepet (€)
  daysOpen: number;       // Aylık açık gün
  turnover: number;       // Masa devri (günde kaç kez dolar)
  foodCostPct: number;    // COGS oranı
  laborCostPct: number;   // İşçilik
  overheadPct: number;    // Kira + diğer
  // Tipik ekipman çeşit sayısı
  typicalItems: number;
  // Yatırım öneri aralığı (EUR)
  minInvest: number;
  maxInvest: number;
  // Varsayılan misafir kapasitesi
  defaultGuests: number;
}

const BUSINESS_PROFILES: Record<BusinessType, BusinessProfile> = {
  restaurant: {
    id: 'restaurant', icon: Utensils, label: 'Restoran', desc: 'Tam servis · À la carte',
    from: 'from-amber-500', to: 'to-orange-600',
    areaPerGuest: 0.45, powerPerM2: 180,
    avgTicket: 28, daysOpen: 28, turnover: 2.2,
    foodCostPct: 0.32, laborCostPct: 0.28, overheadPct: 0.15,
    typicalItems: 18, minInvest: 80_000, maxInvest: 400_000, defaultGuests: 80,
  },
  cafe: {
    id: 'cafe', icon: Coffee, label: 'Kafe / Bistro', desc: 'İçecek & hafif mönü',
    from: 'from-rose-500', to: 'to-brand-red',
    areaPerGuest: 0.30, powerPerM2: 120,
    avgTicket: 12, daysOpen: 30, turnover: 3.0,
    foodCostPct: 0.28, laborCostPct: 0.25, overheadPct: 0.18,
    typicalItems: 10, minInvest: 25_000, maxInvest: 120_000, defaultGuests: 50,
  },
  hotel: {
    id: 'hotel', icon: Hotel, label: 'Otel', desc: 'Büyük ölçek · Kahvaltı & akşam',
    from: 'from-indigo-500', to: 'to-brand-red',
    areaPerGuest: 0.55, powerPerM2: 220,
    avgTicket: 22, daysOpen: 30, turnover: 1.8,
    foodCostPct: 0.35, laborCostPct: 0.30, overheadPct: 0.12,
    typicalItems: 28, minInvest: 150_000, maxInvest: 1_200_000, defaultGuests: 200,
  },
  fastfood: {
    id: 'fastfood', icon: Pizza, label: 'Fast Food', desc: 'Yüksek sirkülasyon',
    from: 'from-red-500', to: 'to-rose-600',
    areaPerGuest: 0.25, powerPerM2: 200,
    avgTicket: 10, daysOpen: 30, turnover: 4.5,
    foodCostPct: 0.34, laborCostPct: 0.22, overheadPct: 0.16,
    typicalItems: 14, minInvest: 40_000, maxInvest: 180_000, defaultGuests: 120,
  },
  bakery: {
    id: 'bakery', icon: ChefHat, label: 'Pastane / Fırın', desc: 'Hamur işi · Tatlı',
    from: 'from-fuchsia-500', to: 'to-brand-red',
    areaPerGuest: 0.20, powerPerM2: 250,
    avgTicket: 8, daysOpen: 28, turnover: 3.5,
    foodCostPct: 0.30, laborCostPct: 0.26, overheadPct: 0.14,
    typicalItems: 12, minInvest: 35_000, maxInvest: 200_000, defaultGuests: 60,
  },
  catering: {
    id: 'catering', icon: Store, label: 'Catering / Toplu', desc: 'Düğün, etkinlik, kurumsal',
    from: 'from-emerald-500', to: 'to-teal-600',
    areaPerGuest: 0.70, powerPerM2: 260,
    avgTicket: 18, daysOpen: 22, turnover: 1.5,
    foodCostPct: 0.38, laborCostPct: 0.30, overheadPct: 0.10,
    typicalItems: 24, minInvest: 90_000, maxInvest: 600_000, defaultGuests: 300,
  },
};

const BUSINESS_LIST = Object.values(BUSINESS_PROFILES);

interface Recommendation {
  name: string;
  category: string;
  quantity: number;
  estimated_price: number;
  reason: string;
  matched_product?: DiamondProduct;
}

// Para biçimlendirme
const fmtEur = (n: number) =>
  `€${Math.round(n).toLocaleString('tr-TR')}`;

const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${Math.round(n / 1000)}K`;
  return `€${Math.round(n)}`;
};

// ─────────────────────────────────────────────────────────────
// ANA BİLEŞEN
// ─────────────────────────────────────────────────────────────
export default function KitchenPlannerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);

  // Seçili işletme
  const [business, setBusiness] = useState<BusinessType>('restaurant');
  const profile = BUSINESS_PROFILES[business];

  // Tüm parametreler tek yerden — işletme değişince anlık güncellenir
  const [guests, setGuests] = useState(profile.defaultGuests);
  const [avgTicket, setAvgTicket] = useState(profile.avgTicket);
  const [daysOpen, setDaysOpen] = useState(profile.daysOpen);
  const [invest, setInvest] = useState(Math.round((profile.minInvest + profile.maxInvest) / 3));
  const [budget, setBudget] = useState(Math.round(profile.minInvest * 1.2));

  // AI plan
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // İşletme tipi değişince → sektör varsayılanlarını senkronla
  useEffect(() => {
    setGuests(profile.defaultGuests);
    setAvgTicket(profile.avgTicket);
    setDaysOpen(profile.daysOpen);
    setInvest(Math.round((profile.minInvest + profile.maxInvest) / 3));
    setBudget(Math.round(profile.minInvest * 1.2));
    setRecommendations([]);
  }, [business]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────── Hesaplamalar (canlı) ────────
  const calc = useMemo(() => {
    const area = Math.round(guests * profile.areaPerGuest);
    const power = Math.round(area * profile.powerPerM2);
    // Günlük ciro = misafir × sepet × masa devri (oturma sayısı)
    const dailyRevenue = guests * avgTicket * profile.turnover;
    const monthlyRevenue = dailyRevenue * daysOpen;
    const yearlyRevenue = monthlyRevenue * 12;
    const food = monthlyRevenue * profile.foodCostPct;
    const labor = monthlyRevenue * profile.laborCostPct;
    const overhead = monthlyRevenue * profile.overheadPct;
    const monthlyProfit = monthlyRevenue - food - labor - overhead;
    const margin = monthlyRevenue > 0 ? monthlyProfit / monthlyRevenue : 0;
    const paybackMonths = monthlyProfit > 0 ? invest / monthlyProfit : Infinity;
    const paybackYears = paybackMonths / 12;
    // Ekipman yatırımı bütçenin yaklaşık %55-65'i olmalı (karşılaştırma için)
    const recommendedEqBudget = Math.round(invest * 0.6);
    const budgetFit = budget / Math.max(recommendedEqBudget, 1); // 1.0 = ideal
    return {
      area, power, dailyRevenue, monthlyRevenue, yearlyRevenue,
      food, labor, overhead, monthlyProfit, margin,
      paybackMonths, paybackYears, recommendedEqBudget, budgetFit,
    };
  }, [guests, avgTicket, daysOpen, invest, budget, profile]);

  // Fizibilite skoru (0-100)
  const feasibility = useMemo(() => {
    let score = 50;
    if (calc.margin > 0.20) score += 20;
    else if (calc.margin > 0.10) score += 10;
    else if (calc.margin < 0) score -= 30;
    if (calc.paybackYears < 2) score += 20;
    else if (calc.paybackYears < 4) score += 10;
    else if (calc.paybackYears > 8) score -= 20;
    if (budget >= calc.recommendedEqBudget * 0.85 && budget <= calc.recommendedEqBudget * 1.2) score += 10;
    else if (budget < calc.recommendedEqBudget * 0.6) score -= 15;
    return Math.max(0, Math.min(100, score));
  }, [calc, budget]);

  const feasibilityTone =
    feasibility >= 75 ? {
      label: 'Güçlü', bar: 'bg-emerald-500',
      ring: 'ring-emerald-200', bgFrom: 'from-emerald-50', chipBg: 'bg-emerald-100', chipText: 'text-emerald-700',
    } :
    feasibility >= 50 ? {
      label: 'Uygun', bar: 'bg-brand-red',
      ring: 'ring-red-200', bgFrom: 'from-red-50', chipBg: 'bg-red-100', chipText: 'text-brand-red',
    } :
    feasibility >= 30 ? {
      label: 'Riskli', bar: 'bg-amber-500',
      ring: 'ring-amber-200', bgFrom: 'from-amber-50', chipBg: 'bg-amber-100', chipText: 'text-amber-700',
    } : {
      label: 'Zorlu', bar: 'bg-rose-500',
      ring: 'ring-rose-200', bgFrom: 'from-rose-50', chipBg: 'bg-rose-100', chipText: 'text-rose-700',
    };

  // Mutfak boyutlarını oda için türet (yaklaşık dikdörtgen, 2:3 oranı)
  const roomDim = useMemo(() => {
    const ratio = 1.5; // en / boy
    const h = Math.sqrt(calc.area / ratio);
    const w = h * ratio;
    return { wM: +w.toFixed(1), hM: +h.toFixed(1) };
  }, [calc.area]);

  // ──────── AI plan üretimi ────────
  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    setStreamText('');
    setRecommendations([]);
    try {
      const prompt = `Ben bir ${profile.label} işletmesi açıyorum.
Mutfak alanı: ${calc.area} m² (${roomDim.wM}m × ${roomDim.hM}m)
Günlük misafir: ${guests} · Ortalama sepet: €${avgTicket}
Aylık ciro beklentisi: €${Math.round(calc.monthlyRevenue).toLocaleString('tr-TR')}
Ekipman bütçesi: €${budget.toLocaleString('tr-TR')}

Lütfen bu işletme için gerekli mutfak ekipmanlarını öner. Cevabını SADECE aşağıdaki JSON formatında ver (başka hiçbir metin yazma):

{
  "items": [
    {"name": "ekipman adı", "category": "kategori", "quantity": 1, "estimated_price": 1500, "reason": "neden gerekli (kısa)"}
  ]
}`;

      let full = '';
      for await (const chunk of chatWithAI({
        messages: [{ role: 'user', content: prompt }],
        context: 'kitchen-planner',
      })) {
        full += chunk;
        setStreamText(full);
      }

      const match = full.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI yanıtı ayrıştırılamadı');
      const parsed = JSON.parse(match[0]);
      const recs: Recommendation[] = parsed.items || [];

      if (supabase) {
        for (const rec of recs) {
          const { data } = await supabase
            .from('diamond_products')
            .select('*')
            .or(`name.ilike.%${rec.name.split(' ')[0]}%,product_family_name.ilike.%${rec.category}%`)
            .eq('is_old', false)
            .limit(1)
            .maybeSingle();
          if (data) rec.matched_product = data as DiamondProduct;
        }
      }

      setRecommendations(recs);
    } catch (e: any) {
      setError(e.message || 'Plan oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const totalCost = recommendations.reduce((s, r) => s + r.estimated_price * r.quantity, 0);

  const addAllToCart = () => {
    recommendations.forEach((r) => {
      if (r.matched_product) addItem(diamondToEquipment(r.matched_product), r.quantity);
    });
    navigate('/cart');
  };

  // Manuel çizime hazır parametrelerle geç
  const openInDrawing = () => {
    // Proje localStorage'ına başlangıç parametreleri yazabiliriz; basit navigate yapıyoruz
    try {
      localStorage.setItem('kitchen-planner:handoff', JSON.stringify({
        business, guests, area: calc.area, room: roomDim, budget, at: Date.now(),
      }));
    } catch { /* yok say */ }
    navigate('/manual');
  };

  // ──────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-red-50/30 to-red-50/30 pb-12">
      <div className="max-w-7xl mx-auto px-4 pt-8">

        {/* ═══════ HERO ═══════ */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-100 to-red-100 text-brand-red text-xs font-bold mb-3">
            <Sparkles size={14} /> AI DESTEKLİ · CANLI HESAPLAMA · RAKİPLERDE YOK
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Mutfağını <span className="bg-gradient-to-r from-brand-red via-[#c01d1d] to-[#991B1B] bg-clip-text text-transparent">AI ile Planla</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-2xl mx-auto">
            İşletme tipini seç — alan, güç, gelir, geri dönüş ve ekipman bütçesi <span className="font-bold text-slate-700">anlık</span> hesaplansın.
            Sonra AI'dan ekipman listesi al veya manuel çizime geç.
          </p>
        </div>

        {/* ═══════ 1) İŞLETME TİPİ — Büyük görsel kartlar ═══════ */}
        <section className="mb-6">
          <div className="flex items-baseline justify-between mb-3 px-1">
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-500">1 · İşletme Tipi</h2>
            <span className="text-[11px] text-slate-400">seçim anında tüm hesapları günceller</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {BUSINESS_LIST.map((b) => {
              const isActive = business === b.id;
              return (
                <motion.button
                  key={b.id}
                  type="button"
                  onClick={() => setBusiness(b.id)}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.96 }}
                  className={`relative overflow-hidden rounded-2xl p-4 border-2 text-left transition-all ${
                    isActive
                      ? 'border-transparent shadow-xl ring-2 ring-offset-2 ring-brand-red'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
                  }`}
                >
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${b.from} ${b.to} opacity-95`} />
                  )}
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                      isActive ? 'bg-white/20 backdrop-blur' : 'bg-slate-100'
                    }`}>
                      <b.icon size={20} className={isActive ? 'text-white' : 'text-slate-600'} />
                    </div>
                    <p className={`font-black text-sm leading-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {b.label}
                    </p>
                    <p className={`text-[10px] mt-0.5 leading-tight ${isActive ? 'text-white/85' : 'text-slate-500'}`}>
                      {b.desc}
                    </p>
                    <div className={`mt-2 flex items-center gap-1 text-[10px] font-bold ${
                      isActive ? 'text-white/90' : 'text-slate-400'
                    }`}>
                      <Target size={10} /> ~{b.typicalItems} ekipman
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* ═══════ 2) ANA GRID: SOL = parametreler + metrikler · SAĞ = görsel önizleme ═══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">

          {/* ───── SOL: Parametreler + Canlı Metrik Paneli ───── */}
          <div className="space-y-4 min-w-0">

            {/* Parametre sliders */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Calculator size={18} className="text-brand-red" />
                <h3 className="font-black text-slate-900">2 · Kapasite & Finansal Parametreler</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <ParamSlider
                  icon={Users}
                  label="Günlük Misafir"
                  value={guests}
                  onChange={setGuests}
                  min={10}
                  max={profile.id === 'hotel' || profile.id === 'catering' ? 2000 : 800}
                  suffix=" kişi"
                  tone="sky"
                />
                <ParamSlider
                  icon={Wallet}
                  label="Ortalama Sepet"
                  value={avgTicket}
                  onChange={setAvgTicket}
                  min={3}
                  max={150}
                  prefix="€"
                  tone="amber"
                />
                <ParamSlider
                  icon={Clock}
                  label="Aylık Açık Gün"
                  value={daysOpen}
                  onChange={setDaysOpen}
                  min={1}
                  max={31}
                  suffix=" gün"
                  tone="violet"
                />
                <ParamSlider
                  icon={TrendingUp}
                  label="Toplam Yatırım"
                  value={invest}
                  onChange={setInvest}
                  min={profile.minInvest}
                  max={profile.maxInvest}
                  step={1000}
                  prefix="€"
                  tone="emerald"
                />
              </div>

              {/* Ekipman bütçesi (ayrı — AI'a giriyor) */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={14} className="text-rose-500" />
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Ekipman Bütçesi (AI için)
                    </label>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-black text-slate-900">{fmtEur(budget)}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      calc.budgetFit >= 0.85 && calc.budgetFit <= 1.2 ? 'bg-emerald-100 text-emerald-700' :
                      calc.budgetFit < 0.6 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {calc.budgetFit >= 0.85 && calc.budgetFit <= 1.2 ? 'İDEAL' :
                       calc.budgetFit < 0.6 ? 'DÜŞÜK' : 'ÖNERİ ÜSTÜ'}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={5000}
                  max={Math.max(profile.maxInvest, budget + 50000)}
                  step={1000}
                  value={budget}
                  onChange={(e) => setBudget(+e.target.value)}
                  className="w-full h-2 accent-rose-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>€5K</span>
                  <span className="text-emerald-600 font-bold">
                    Önerilen: {fmtShort(calc.recommendedEqBudget)}
                  </span>
                  <span>{fmtShort(profile.maxInvest)}</span>
                </div>
              </div>
            </div>

            {/* ═══════ CANLI METRİK DASHBOARD ═══════ */}
            <div className={`rounded-2xl p-5 shadow-lg text-white relative overflow-hidden bg-gradient-to-br ${profile.from} ${profile.to}`}>
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'radial-gradient(circle at 10% 20%, white 0%, transparent 40%), radial-gradient(circle at 90% 80%, white 0%, transparent 40%)',
              }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold">Canlı Finansal Projeksiyon</p>
                    <h3 className="text-xl font-black">{profile.label} · {guests} misafir/gün</h3>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={feasibility}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-right"
                    >
                      <div className="text-[10px] uppercase tracking-wider opacity-70 font-bold">Fizibilite</div>
                      <div className="text-2xl font-black">{feasibility}<span className="text-xs opacity-70">/100</span></div>
                      <div className="text-[10px] font-bold">{feasibilityTone.label}</div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* 4 ana KPI */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <KpiTile icon={Ruler}     label="Alan"        value={`${calc.area} m²`} />
                  <KpiTile icon={Flame}     label="Kurulu Güç"  value={`${(calc.power/1000).toFixed(1)} kW`} />
                  <KpiTile icon={TrendingUp} label="Aylık Ciro"  value={fmtShort(calc.monthlyRevenue)} />
                  <KpiTile icon={Clock}     label="Geri Dönüş"
                    value={isFinite(calc.paybackMonths) ? `${calc.paybackMonths.toFixed(1)} ay` : '—'} />
                </div>

                {/* Kar/margin bar */}
                <div className="mt-4 bg-white/10 rounded-lg p-3 backdrop-blur">
                  <div className="flex justify-between items-baseline text-xs mb-1.5">
                    <span className="opacity-80">Aylık Net Kâr</span>
                    <span className="font-black text-lg">{fmtEur(calc.monthlyProfit)}</span>
                  </div>
                  <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-white rounded-full"
                      style={{ width: `${Math.max(0, Math.min(100, calc.margin * 100 * 3))}%` }}
                      animate={{ width: `${Math.max(0, Math.min(100, calc.margin * 100 * 3))}%` }}
                      transition={{ type: 'spring', stiffness: 120 }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] opacity-70 mt-1">
                    <span>Marj: <span className="font-bold">{(calc.margin * 100).toFixed(1)}%</span></span>
                    <span>Yıllık: {fmtShort(calc.yearlyRevenue)}</span>
                  </div>
                </div>

                {/* Maliyet dağılım barı */}
                <div className="mt-3">
                  <div className="flex text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1 gap-4">
                    <span>Maliyet Dağılımı</span>
                  </div>
                  <div className="flex h-6 rounded-md overflow-hidden ring-1 ring-white/20">
                    <div className="bg-red-400/90 flex items-center justify-center text-[10px] font-bold"
                      style={{ width: `${profile.foodCostPct * 100}%` }} title="Gıda">
                      {Math.round(profile.foodCostPct * 100)}% Gıda
                    </div>
                    <div className="bg-amber-400/90 flex items-center justify-center text-[10px] font-bold text-slate-900"
                      style={{ width: `${profile.laborCostPct * 100}%` }} title="İşçilik">
                      {Math.round(profile.laborCostPct * 100)}% İşçilik
                    </div>
                    <div className="bg-brand-red/90 flex items-center justify-center text-[10px] font-bold text-slate-900"
                      style={{ width: `${profile.overheadPct * 100}%` }} title="Gider">
                      {Math.round(profile.overheadPct * 100)}% Gider
                    </div>
                    <div className="bg-emerald-400/90 flex items-center justify-center text-[10px] font-bold text-slate-900"
                      style={{ width: `${Math.max(0, calc.margin * 100)}%` }} title="Kâr">
                      {Math.max(0, Math.round(calc.margin * 100))}% Kâr
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ═══════ AI BUTONU & SONUÇLAR ═══════ */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Bot size={18} className="text-brand-red" />
                  <h3 className="font-black text-slate-900">3 · AI Ekipman Önerisi</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={openInDrawing}
                    className="h-10 px-4 rounded-xl border-2 border-slate-200 hover:border-brand-red text-slate-700 font-bold text-sm flex items-center gap-2 transition"
                  >
                    <Pencil size={14} /> Manuel Çizime Geç
                  </button>
                  <button
                    type="button"
                    onClick={generatePlan}
                    disabled={loading}
                    className="h-10 px-5 rounded-xl bg-gradient-to-r from-brand-red to-brand-red text-white font-bold text-sm flex items-center gap-2 shadow-lg disabled:opacity-60 hover:shadow-xl transition"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {loading ? 'AI düşünüyor...' : 'Ekipman Listesi Üret'}
                  </button>
                </div>
              </div>

              {loading && (
                <div className="p-4 bg-gradient-to-br from-red-50 to-red-50 rounded-xl border border-red-100">
                  <div className="flex items-center gap-2 text-sm font-semibold text-brand-red mb-2">
                    <Bot size={16} className="animate-pulse" /> AI ekipman listesi hazırlıyor...
                  </div>
                  <pre className="text-xs text-slate-600 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                    {streamText || 'Sektör verisi analiz ediliyor...'}
                  </pre>
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center gap-2">
                  <Info size={14} /> {error}
                </div>
              )}

              {!loading && recommendations.length === 0 && !error && (
                <div className="text-center py-8 text-slate-400">
                  <Bot size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Parametreler hazır. AI sektörünüze özel ekipman listesi üretebilir.</p>
                </div>
              )}

              {recommendations.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900">{recommendations.length} ürün önerildi</p>
                      <p className="text-xs text-slate-500">
                        Toplam: <span className="font-bold">{fmtEur(totalCost)}</span>
                        {' · '}
                        <span className={totalCost > budget ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                          Bütçe {totalCost > budget ? 'aşıldı' : 'uygun'}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={addAllToCart}
                      disabled={!recommendations.some((r) => r.matched_product)}
                      className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center gap-2 shadow disabled:opacity-50 transition"
                    >
                      <ShoppingCart size={14} /> Sepete Ekle
                    </button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {recommendations.map((rec, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-slate-50 rounded-lg p-3 flex items-center gap-3 hover:bg-slate-100 transition"
                      >
                        <div className="w-12 h-12 bg-white rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center ring-1 ring-slate-200">
                          {rec.matched_product?.image_thumb ? (
                            <img src={rec.matched_product.image_thumb} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <ChefHat className="text-slate-300" size={20} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 text-sm truncate">{rec.name}</p>
                            {rec.matched_product && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                <Zap size={8} /> Katalogda
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">{rec.reason}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">x{rec.quantity}</p>
                          <p className="font-bold text-slate-900 text-sm">
                            {fmtEur(rec.estimated_price * rec.quantity)}
                          </p>
                        </div>
                        <button
                          onClick={() => setRecommendations((prev) => prev.filter((_, j) => j !== i))}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ───── SAĞ: GÖRSEL ÖNİZLEME — Oda simülasyonu ───── */}
          <aside className="lg:sticky lg:top-6 lg:self-start space-y-4">
            {/* Mutfak alanı görsel */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Görsel Önizleme</p>
                  <h3 className="font-black text-slate-900">Mutfak Alanı</h3>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-900">{calc.area}<span className="text-sm text-slate-500 ml-1">m²</span></p>
                  <p className="text-[10px] text-slate-500">{roomDim.wM}m × {roomDim.hM}m</p>
                </div>
              </div>

              {/* SVG oda simülasyonu */}
              <div className="relative aspect-[3/2] bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                <svg viewBox="0 0 300 200" className="w-full h-full">
                  <defs>
                    <pattern id="pln-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="300" height="200" fill="url(#pln-grid)" />
                  {/* Oda dikdörtgen — ölçek ile çiz */}
                  <motion.g
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  >
                    {(() => {
                      // Ölçek: max genişlik 240, max yükseklik 140
                      const maxW = 240, maxH = 140;
                      const scale = Math.min(maxW / roomDim.wM, maxH / roomDim.hM);
                      const w = roomDim.wM * scale;
                      const h = roomDim.hM * scale;
                      const x = (300 - w) / 2;
                      const y = (200 - h) / 2;
                      return (
                        <>
                          {/* Dış duvar */}
                          <rect x={x-3} y={y-3} width={w+6} height={h+6} fill="#f1f5f9" stroke="#475569" strokeWidth="1" />
                          {/* İç oda */}
                          <motion.rect
                            initial={{ width: 0, height: 0 }}
                            animate={{ width: w, height: h }}
                            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                            x={x} y={y}
                            fill="#fff"
                            stroke="#0ea5e9"
                            strokeWidth="1.5"
                            strokeDasharray="4 3"
                          />
                          {/* Ekipman izleri (stilize) */}
                          {[...Array(Math.min(profile.typicalItems, 16))].map((_, i) => {
                            const col = i % 4;
                            const row = Math.floor(i / 4);
                            const ew = Math.min(w / 5, 30);
                            const eh = Math.min(h / 6, 18);
                            const ex = x + 8 + col * (ew + 6);
                            const ey = y + 8 + row * (eh + 6);
                            if (ex + ew > x + w - 4 || ey + eh > y + h - 4) return null;
                            return (
                              <motion.rect
                                key={i}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 0.9, scale: 1 }}
                                transition={{ delay: 0.2 + i * 0.04, type: 'spring' }}
                                x={ex} y={ey} width={ew} height={eh}
                                rx="2"
                                fill={i % 3 === 0 ? '#fde68a' : i % 3 === 1 ? '#bae6fd' : '#fecaca'}
                                stroke="#475569"
                                strokeWidth="0.6"
                              />
                            );
                          })}
                          {/* Ölçü etiketi */}
                          <text x={x + w/2} y={y - 6} fontSize="8" fill="#475569" textAnchor="middle" fontFamily="monospace">
                            {roomDim.wM}m
                          </text>
                          <text x={x - 6} y={y + h/2} fontSize="8" fill="#475569" textAnchor="middle"
                            transform={`rotate(-90 ${x-6} ${y + h/2})`} fontFamily="monospace">
                            {roomDim.hM}m
                          </text>
                        </>
                      );
                    })()}
                  </motion.g>
                </svg>
                {/* Köşe etiketi */}
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur rounded-md px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm">
                  ÖLÇEK · TAHMİN
                </div>
                <div className="absolute bottom-2 right-2 bg-gradient-to-r from-brand-red to-brand-red text-white rounded-md px-2 py-1 text-[10px] font-black shadow-sm">
                  ~{profile.typicalItems} EKİPMAN
                </div>
              </div>

              <button
                type="button"
                onClick={openInDrawing}
                className="mt-3 w-full py-3 rounded-xl bg-brand-red text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#B91C1C] transition"
              >
                <Pencil size={14} /> Manuel Çizime Aktar
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Hızlı karşılaştırma / sektör notları */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Info size={14} className="text-brand-red" />
                <h4 className="font-black text-slate-900 text-sm">Sektör Karşılaştırma</h4>
              </div>
              <div className="space-y-2.5 text-xs">
                <CompareRow label="Misafir başı alan"
                  current={`${profile.areaPerGuest} m²`}
                  benchmark={`Ort: ${(Object.values(BUSINESS_PROFILES).reduce((s, p) => s + p.areaPerGuest, 0) / BUSINESS_LIST.length).toFixed(2)} m²`} />
                <CompareRow label="Masa devri / gün"
                  current={`${profile.turnover}x`}
                  benchmark={`Ort: ${(Object.values(BUSINESS_PROFILES).reduce((s, p) => s + p.turnover, 0) / BUSINESS_LIST.length).toFixed(1)}x`} />
                <CompareRow label="Gıda maliyeti"
                  current={`${Math.round(profile.foodCostPct * 100)}%`}
                  benchmark={`Ort: ${Math.round(Object.values(BUSINESS_PROFILES).reduce((s, p) => s + p.foodCostPct, 0) / BUSINESS_LIST.length * 100)}%`} />
                <CompareRow label="Net marj hedefi"
                  current={`${(calc.margin * 100).toFixed(1)}%`}
                  benchmark="Hedef: 20%+" />
                <CompareRow label="Geri dönüş süresi"
                  current={isFinite(calc.paybackYears) ? `${calc.paybackYears.toFixed(1)} yıl` : '—'}
                  benchmark="İdeal: 2-3 yıl" />
              </div>
            </div>

            {/* Fizibilite özet kartı */}
            <div className={`rounded-2xl p-5 shadow-lg relative overflow-hidden ring-2 ${feasibilityTone.ring}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${feasibilityTone.bgFrom} to-white`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fizibilite Skoru</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${feasibilityTone.chipBg} ${feasibilityTone.chipText}`}>
                    {feasibilityTone.label}
                  </span>
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <div className="text-5xl font-black text-slate-900">{feasibility}</div>
                  <div className="text-slate-500 text-sm mb-1.5">/ 100</div>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden ring-1 ring-slate-200">
                  <motion.div
                    className={`h-full ${feasibilityTone.bar}`}
                    animate={{ width: `${feasibility}%` }}
                    transition={{ type: 'spring', stiffness: 100 }}
                  />
                </div>
                <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                  {feasibility >= 75 && 'Parametreler sağlıklı. Yatırım ve kapasite dengede.'}
                  {feasibility >= 50 && feasibility < 75 && 'Planınız uygun. Marj veya geri dönüş hafifçe iyileştirilebilir.'}
                  {feasibility >= 30 && feasibility < 50 && 'Dikkat: Bütçe-ciro dengesini veya sepet fiyatını gözden geçirin.'}
                  {feasibility < 30 && 'Risk yüksek. Misafir kapasitesini artırın veya yatırımı düşürün.'}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ALT BİLEŞENLER
// ═══════════════════════════════════════════════════════════

function ParamSlider({
  icon: Icon, label, value, onChange, min, max, step = 1, prefix = '', suffix = '', tone = 'sky',
}: {
  icon: any;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  tone?: 'sky' | 'amber' | 'violet' | 'emerald';
}) {
  const toneMap: Record<string, string> = {
    sky: 'accent-brand-red text-brand-red',
    amber: 'accent-amber-500 text-amber-600',
    violet: 'accent-brand-red text-brand-red',
    emerald: 'accent-emerald-500 text-emerald-600',
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon size={13} className={toneMap[tone].split(' ')[1]} />
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{label}</label>
        </div>
        <span className={`text-sm font-black ${toneMap[tone].split(' ')[1]}`}>
          {prefix}{value.toLocaleString('tr-TR')}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className={`w-full h-1.5 ${toneMap[tone].split(' ')[0]}`}
      />
      <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 font-mono">
        <span>{prefix}{min.toLocaleString('tr-TR')}{suffix}</span>
        <span>{prefix}{max.toLocaleString('tr-TR')}{suffix}</span>
      </div>
    </div>
  );
}

function KpiTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-white/15 rounded-lg p-2.5 backdrop-blur border border-white/20">
      <div className="flex items-center gap-1 opacity-80 mb-0.5">
        <Icon size={11} />
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-black leading-tight">{value}</div>
    </div>
  );
}

function CompareRow({ label, current, benchmark }: { label: string; current: string; benchmark: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-black text-slate-900">{current}</span>
        <span className="text-[10px] text-slate-400">{benchmark}</span>
      </div>
    </div>
  );
}
