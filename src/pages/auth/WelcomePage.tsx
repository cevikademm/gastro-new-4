import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import productsData from '../../data/products.json';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useBannerStore } from '../../stores/bannerStore';
import {
  Ruler, Refrigerator, Shield, BarChart3,
  ArrowRight, Sparkles, Star,
  Award, CheckCircle2,
  Gem, Box, PencilRuler, FileText, FolderKanban,
  Flame, Snowflake, Droplets, Scissors, Coffee, UtensilsCrossed, Package,
  Search, User, Building2, PhoneCall, Mail, MessageCircle, MapPin,
  HelpCircle, Calculator, Clock, Truck, Tag, Zap, ChefHat,
  Youtube, Wrench, Globe, Pizza, Martini, IceCream, Cookie,
  ShoppingCart, Heart, Play, Repeat, CreditCard,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from '../../components/LanguageSelector';
import NewsletterSection from '../../components/home/NewsletterSection';
import BlogPreviewSection from '../../components/home/BlogPreviewSection';
import LiveChatWidget from '../../components/LiveChatWidget';
import SiteFooter from '../../components/SiteFooter';
import WelcomeScrollFX from './WelcomeScrollFX';
import './welcome-2mc.css';
import './welcome-claude.css';
import './welcome-hyper.css';
import SectionSlot from '../../components/welcome/SectionSlot';

// ─────────────────────────────────────────────────────────────────────────
// MARKA AKSAN PALETİ (bordo)
// Renk değişikliği için bu 4 değeri güncelle (ya da Adem'e söyle).
//   ana   : #7B1F26  (rgba: 123,31,38)
//   koyu  : #5A1219
//   açık  : #A04654
// Üzerindeki yazılar BEYAZ (#fff) olarak ayarlandı.
// ─────────────────────────────────────────────────────────────────────────

// Video listesi — public/videos/ klasörüne yeni .mp4 ekleyince buraya da ekle
const VIDEO_URLS = [
  '/videos/Dough_mixer_exploding_202604100954.mp4',
  '/videos/Industrial_dough_mixer_202604100951.mp4',
];

type ShowcaseItem = {
  id: string;
  src: string;
  title: string;
  subtitle: string;
  desc: string;
  accent: string;
  ring: string;
  text: string;
  tag: string;
  specs: Array<{ k: string; v: string }>;
  features: string[];
  priceLabel: string | null;
};

export default function WelcomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { slides: allSlides, intervalMs } = useBannerStore();
  const slides = allSlides.filter((s) => s.enabled);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [videoIdx, setVideoIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setBannerIdx((i) => (i + 1) % slides.length), intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  useEffect(() => {
    if (bannerIdx >= slides.length) setBannerIdx(0);
  }, [slides.length, bannerIdx]);

  const currentSlide = slides[bannerIdx];

  // Bestsellers — €3.000-€10.000 aralığı; mutfak ekipmanları öne çıkar, sürekli rotasyonla değişir
  const KITCHEN_HERO_CATS = useMemo(
    () => new Set(['cooking', 'pizza_pasta', 'bakery', 'cook_chill', 'dynamic_prep']),
    []
  );
  type BestsellerRow = { id: string; name: string; img: string; price: number; cat: string };
  type BestsellerCard = { id: string; name: string; img: string; price: number; badge: string };

  const bestsellerPool = useMemo<BestsellerRow[]>(() => {
    const rows = (productsData as BestsellerRow[]).filter(
      (p) =>
        p.price >= 3000 &&
        p.price <= 10000 &&
        typeof p.img === 'string' &&
        /^https?:\/\//.test(p.img)
    );
    // Mutfak öne çıkanları 3 kez ekleyerek seçilme şansını artır (ağırlıklı havuz)
    const weighted: BestsellerRow[] = [];
    rows.forEach((p) => {
      const reps = KITCHEN_HERO_CATS.has(p.cat) ? 3 : 1;
      for (let i = 0; i < reps; i++) weighted.push(p);
    });
    return weighted;
  }, [KITCHEN_HERO_CATS]);

  const toBestsellerCard = (p: BestsellerRow): BestsellerCard => ({
    id: p.id,
    name: p.name,
    img: p.img,
    price: p.price,
    badge: p.price >= 7000 ? 'PREMIUM' : p.price >= 5000 ? 'EMPFEHLUNG' : 'BESTSELLER',
  });

  const pickBestsellerBatch = (pool: BestsellerRow[], exclude = new Set<string>()): BestsellerCard[] => {
    const seen = new Set<string>(exclude);
    const picks: BestsellerRow[] = [];
    let safety = 0;
    while (picks.length < 10 && safety++ < 1000) {
      const r = pool[Math.floor(Math.random() * pool.length)];
      if (!r || seen.has(r.id)) continue;
      seen.add(r.id);
      picks.push(r);
    }
    return picks.map(toBestsellerCard);
  };

  const [bestsellers, setBestsellers] = useState<BestsellerCard[]>(() =>
    pickBestsellerBatch(bestsellerPool)
  );

  // Tek tek kart değiştirerek dönen vitrin — sıradan değil rastgele indeksle
  useEffect(() => {
    if (bestsellerPool.length < 12) return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      setBestsellers((prev) => {
        const currentIds = new Set<string>(prev.map((p) => p.id));
        const slot = Math.floor(Math.random() * prev.length);
        currentIds.delete(prev[slot].id);
        const replacement = pickBestsellerBatch(bestsellerPool, currentIds)[0];
        if (!replacement) return prev;
        const next = [...prev];
        next[slot] = replacement;
        return next;
      });
      t = setTimeout(tick, 2200 + Math.random() * 1600);
    };
    t = setTimeout(tick, 2800);
    return () => clearTimeout(t);
  }, [bestsellerPool]);

  // ── 3D showcase modelleri (GLB) ──
  const SHOWCASE_3D: ShowcaseItem[] = [
    {
      id: 'planetary-mixer-60l',
      src: '/models/Meshy_AI_Commercial_Planetary__0411175135_texture.glb',
      title: 'Planetary Mixer 60L',
      subtitle: t('welcome.showcase3d.item1.subtitle', 'Yüksek kapasite endüstriyel'),
      desc: t('welcome.showcase3d.item1.desc', 'Endüstriyel fırın, pastane ve büyük catering işletmeleri için 60 litre kazan kapasiteli profesyonel planet mikser.'),
      accent: 'from-emerald-500/25 via-teal-600/10 to-cyan-700/5',
      ring: 'border-emerald-400/40',
      text: 'text-emerald-300',
      tag: t('welcome.showcase3d.tagEquipment', 'EKİPMAN'),
      specs: [
        { k: t('welcome.spec.capacity', 'Kapasite'),  v: '60 L kazan · 20 kg un' },
        { k: t('welcome.spec.power', 'Güç'),           v: '3.0 kW · 400 V' },
        { k: t('welcome.spec.rpm', 'Devir'),            v: '3 kademe · 80-320 rpm' },
        { k: t('welcome.spec.dimensions', 'Boyutlar'),  v: '720 × 820 × 1320 mm' },
        { k: t('welcome.spec.weight', 'Ağırlık'),       v: '240 kg' },
        { k: t('welcome.spec.material', 'Malzeme'),     v: t('welcome.showcase3d.item1.material', 'AISI 304 Paslanmaz') },
      ],
      features: [
        t('welcome.showcase3d.item1.feat1', 'Planet hareket · homojen yoğurma'),
        t('welcome.showcase3d.item1.feat2', 'Otomatik kazan yükseltme'),
        t('welcome.showcase3d.item1.feat3', 'Zaman ayarlı dijital kontrol'),
        t('welcome.showcase3d.item1.feat4', 'CE sertifikalı · 2 yıl garanti'),
      ],
      priceLabel: '€ 4.690,00 *',
    },
    {
      id: 'rainbow-bottles',
      src: '/models/Meshy_AI_Rainbow_Bottles_in_a__0411175104_texture.glb',
      title: t('welcome.showcase3d.item2.title', 'Şişe Teşhir Vitrini'),
      subtitle: t('welcome.showcase3d.item2.subtitle', 'Bar & içecek sunum rafı'),
      desc: t('welcome.showcase3d.item2.desc', 'Bar ve restoranlar için renkli içecek şişelerini estetik bir şekilde sergileyen profesyonel teşhir vitrini.'),
      accent: 'from-rose-500/25 via-pink-600/10 to-fuchsia-700/5',
      ring: 'border-rose-400/40',
      text: 'text-rose-300',
      tag: t('welcome.showcase3d.tagPresentation', 'SUNUM'),
      specs: [
        { k: t('welcome.spec.category', 'Kategori'),    v: t('welcome.showcase3d.item2.catVal', 'Bar ekipmanı') },
        { k: t('welcome.spec.capacity', 'Kapasite'),    v: t('welcome.showcase3d.item2.capVal', 'Çok katlı teşhir') },
        { k: t('welcome.spec.lighting', 'Aydınlatma'),  v: t('welcome.showcase3d.item2.lightVal', 'LED arka plan') },
        { k: t('welcome.spec.material', 'Malzeme'),     v: t('welcome.showcase3d.item2.matVal', 'Paslanmaz · temperli cam') },
      ],
      features: [
        t('welcome.showcase3d.item2.feat1', 'LED arkadan aydınlatma'),
        t('welcome.showcase3d.item2.feat2', 'Ayarlanabilir raf sistemi'),
        t('welcome.showcase3d.item2.feat3', 'Temperli cam paneller'),
        t('welcome.showcase3d.item2.feat4', 'Bar ve restoranlar için ideal'),
      ],
      priceLabel: '€ 1.250,00 *',
    },
    {
      id: 'showroom-display',
      src: '/models/Meshy_AI_ddd_0411175109_texture.glb',
      title: t('welcome.showcase3d.item3.title', 'Showroom Konsept Modeli'),
      subtitle: t('welcome.showcase3d.item3.subtitle', 'Sergi & tanıtım modülü'),
      desc: t('welcome.showcase3d.item3.desc', 'Mağaza ve showroomlar için özel tasarlanmış konsept ekipman. Ürünlerinizi profesyonel bir şekilde sergilemenizi sağlar.'),
      accent: 'from-violet-500/25 via-purple-600/10 to-indigo-700/5',
      ring: 'border-violet-400/40',
      text: 'text-violet-300',
      tag: t('welcome.showcase3d.tagConcept', 'KONSEPT'),
      specs: [
        { k: t('welcome.spec.category', 'Kategori'),   v: t('welcome.showcase3d.item3.catVal', 'Showroom ekipmanı') },
        { k: t('welcome.spec.usage', 'Kullanım'),      v: t('welcome.showcase3d.item3.useVal', 'Sergi · tanıtım') },
        { k: t('welcome.spec.installation', 'Montaj'), v: t('welcome.showcase3d.item3.installVal', 'Modüler sistem') },
        { k: t('welcome.spec.material', 'Malzeme'),    v: t('welcome.showcase3d.item3.matVal', 'Paslanmaz çelik') },
      ],
      features: [
        t('welcome.showcase3d.item3.feat1', 'Modüler tasarım'),
        t('welcome.showcase3d.item3.feat2', 'Kolay kurulum'),
        t('welcome.showcase3d.item3.feat3', 'Profesyonel görünüm'),
        t('welcome.showcase3d.item3.feat4', 'Dayanıklı yapı'),
      ],
      priceLabel: '€ 2.450,00 *',
    },
  ];
  const [view3D, setView3D] = useState<null | ShowcaseItem>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.querySelector('script[data-model-viewer]')) return;
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js';
    s.setAttribute('data-model-viewer', 'true');
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    if (!view3D) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setView3D(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view3D]);

  const handleVideoEnd = () => setVideoIdx((i) => (i + 1) % Math.max(1, VIDEO_URLS.length));

  // ── Kategori şeridi (header altı) — her kategori kendi hue'una sahip ──
  const TOP_CATS = [
    { Icon: Flame,           label: t('welcome.topcat.cooking', 'Pişirme'),       q: 'ocak',       hue: '#7B1F26' }, // ateş — sıcak turuncu
    { Icon: Snowflake,       label: t('welcome.topcat.cooling', 'Soğutma'),       q: 'kühl',       hue: '#0EA5E9' }, // buz — açık mavi
    { Icon: Pizza,           label: t('welcome.topcat.pizza', 'Pizza Fırınları'), q: 'pizza',      hue: '#DC2626' }, // domates kırmızısı
    { Icon: Droplets,        label: t('welcome.topcat.washing', 'Bulaşık'),       q: 'spül',       hue: '#2563EB' }, // su — koyu mavi
    { Icon: Scissors,        label: t('welcome.topcat.prep', 'Hazırlama'),        q: 'teig',       hue: '#10B981' }, // taze — yeşil
    { Icon: Box,             label: t('welcome.topcat.steel', 'Paslanmaz'),       q: 'edelstahl',  hue: '#64748B' }, // çelik — slate
    { Icon: Coffee,          label: t('welcome.topcat.bar', 'Bar & Kahve'),       q: 'kahve',      hue: '#92400E' }, // kahve — koyu kahverengi
    { Icon: UtensilsCrossed, label: t('welcome.topcat.service', 'Servis'),        q: 'servis',     hue: '#9333EA' }, // mor — premium servis
    { Icon: Package,         label: t('welcome.topcat.catering', 'Catering'),     q: 'gastronorm', hue: '#D97706' }, // amber — sıcak catering
    { Icon: ChefHat,         label: t('welcome.topcat.pro', 'Profesyonel'),       q: 'chef',       hue: '#0F2440' }, // navy — premium pro
  ];

  // ── Themenwelten — 4 büyük tematik kart ──
  const THEMENWELTEN = [
    {
      key: 'cooling',
      title: t('welcome.tw.cooling.title', 'Market & Süper Soğutma'),
      sub: t('welcome.tw.cooling.sub', 'Soğutulmuş vitrin · dolap · teşhir ünitesi'),
      tag: t('welcome.tw.cooling.tag', 'PROFESYONEL'),
      img: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=900&q=80&auto=format&fit=crop',
      q: 'kühl',
      accent: '#1E3A5F',
    },
    {
      key: 'pizza',
      title: t('welcome.tw.pizza.title', 'Pizza Fırınları & Grill'),
      sub: t('welcome.tw.pizza.sub', 'Taş tabanlı · gazlı · elektrikli modeller'),
      tag: t('welcome.tw.pizza.tag', 'EMPFEHLUNG'),
      img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&q=80&auto=format&fit=crop',
      q: 'pizza',
      accent: '#5A1219',
    },
    {
      key: 'coffee',
      title: t('welcome.tw.coffee.title', 'Espresso & Siebträger'),
      sub: t('welcome.tw.coffee.sub', 'Profesyonel kahve makineleri · değirmenler'),
      tag: t('welcome.tw.coffee.tag', 'BESTSELLER'),
      img: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=900&q=80&auto=format&fit=crop',
      q: 'espresso',
      accent: '#7a7a5e',
    },
    {
      key: 'buffet',
      title: t('welcome.tw.buffet.title', 'Büfe & Catering'),
      sub: t('welcome.tw.buffet.sub', 'Chafing · bain-marie · servis üniteleri'),
      tag: t('welcome.tw.buffet.tag', 'PREMIUM'),
      img: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=900&q=80&auto=format&fit=crop',
      q: 'gastronorm',
      accent: '#c89a3c',
    },
  ];

  const [twIdx, setTwIdx] = useState(0);
  const [twVisible, setTwVisible] = useState(4);
  const [twAnimate, setTwAnimate] = useState(true);
  const twContainerRef = useRef<HTMLDivElement | null>(null);
  const twDragRef = useRef({ startX: 0, dx: 0, armed: false, dragging: false, pointerId: 0 });
  const [twDx, setTwDx] = useState(0);
  const [twOffsetPx, setTwOffsetPx] = useState(0);
  const [twDragging, setTwDragging] = useState(false);
  useEffect(() => {
    const calc = () => {
      if (typeof window === 'undefined') return;
      if (window.matchMedia('(min-width: 1024px)').matches) setTwVisible(4);
      else if (window.matchMedia('(min-width: 640px)').matches) setTwVisible(2);
      else setTwVisible(1);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      if (twDragRef.current.dragging) return;
      setTwAnimate(true);
      setTwIdx((i) => i + 1);
    }, 3000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (twIdx === THEMENWELTEN.length) {
      const t = setTimeout(() => {
        setTwAnimate(false);
        setTwIdx(0);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [twIdx, THEMENWELTEN.length]);
  useEffect(() => {
    if (!twAnimate) {
      const t = setTimeout(() => setTwAnimate(true), 50);
      return () => clearTimeout(t);
    }
  }, [twAnimate]);

  const [bsIdx, setBsIdx] = useState(0);
  const [bsVisible, setBsVisible] = useState(5);
  const [bsAnimate, setBsAnimate] = useState(true);
  const bsContainerRef = useRef<HTMLDivElement | null>(null);
  const bsDragRef = useRef({ startX: 0, dx: 0, armed: false, dragging: false, pointerId: 0 });
  const [bsDx, setBsDx] = useState(0);
  const [bsOffsetPx, setBsOffsetPx] = useState(0);
  const [bsDragging, setBsDragging] = useState(false);
  useEffect(() => {
    const calc = () => {
      if (typeof window === 'undefined') return;
      if (window.matchMedia('(min-width: 768px)').matches) setBsVisible(5);
      else setBsVisible(2);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);
  useEffect(() => {
    const id = setInterval(() => {
      if (bsDragRef.current.dragging) return;
      setBsAnimate(true);
      setBsIdx((i) => i + 1);
    }, 3000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (bsIdx === bestsellers.length) {
      const t = setTimeout(() => {
        setBsAnimate(false);
        setBsIdx(0);
      }, 700);
      return () => clearTimeout(t);
    }
  }, [bsIdx, bestsellers.length]);
  useEffect(() => {
    if (!bsAnimate) {
      const t = setTimeout(() => setBsAnimate(true), 50);
      return () => clearTimeout(t);
    }
  }, [bsAnimate]);

  const makeDragHandlers = (
    containerRef: React.RefObject<HTMLDivElement | null>,
    dragRef: React.MutableRefObject<{ startX: number; dx: number; armed: boolean; dragging: boolean; pointerId: number }>,
    setDx: (v: number) => void,
    setDragging: (v: boolean) => void,
    setIdx: (fn: (i: number) => number) => void,
    setAnim: (v: boolean) => void,
    setOffset: (fn: (o: number) => number) => void,
    visible: number,
    total: number,
    wasDraggedRef: React.MutableRefObject<boolean>,
  ) => ({
    onClickCapture: (e: React.MouseEvent<HTMLDivElement>) => {
      if (wasDraggedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        wasDraggedRef.current = false;
      }
    },
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragRef.current = { startX: e.clientX, dx: 0, armed: true, dragging: false, pointerId: e.pointerId };
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current.armed) return;
      const dx = e.clientX - dragRef.current.startX;
      if (!dragRef.current.dragging) {
        if (Math.abs(dx) <= 5) return;
        dragRef.current.dragging = true;
        setDragging(true);
        setAnim(false);
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
      }
      dragRef.current.dx = dx;
      setDx(dx);
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      const wasDragging = dragRef.current.dragging;
      const dx = dragRef.current.dx;
      dragRef.current = { startX: 0, dx: 0, armed: false, dragging: false, pointerId: 0 };
      if (!wasDragging) return;
      const w = containerRef.current?.clientWidth ?? 1;
      const cardW = w / visible;
      wasDraggedRef.current = Math.abs(dx) > 5;
      setDragging(false);
      setDx(0);
      setOffset((prev) => {
        let off = prev + dx;
        let shift = 0;
        while (off <= -cardW) { shift += 1; off += cardW; }
        while (off >= cardW) { shift -= 1; off -= cardW; }
        if (shift !== 0) {
          setIdx((i) => {
            const raw = i + shift;
            const wrapped = ((raw % total) + total) % total;
            if (raw !== wrapped) {
              setAnim(false);
              setTimeout(() => setAnim(true), 50);
            }
            return wrapped;
          });
        }
        return off;
      });
      setAnim(true);
      try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    },
  });

  const twWasDraggedRef = useRef(false);
  const bsWasDraggedRef = useRef(false);
  const twDrag = makeDragHandlers(twContainerRef, twDragRef, setTwDx, setTwDragging, setTwIdx, setTwAnimate, setTwOffsetPx, twVisible, THEMENWELTEN.length, twWasDraggedRef);
  const bsDrag = makeDragHandlers(bsContainerRef, bsDragRef, setBsDx, setBsDragging, setBsIdx, setBsAnimate, setBsOffsetPx, bsVisible, bestsellers.length, bsWasDraggedRef);

  return (
    <div className="welcome-2mc welcome-claude min-h-screen overflow-hidden relative">
      <WelcomeScrollFX />

      <div className="relative z-10 flex flex-col items-center pb-10">

        {/* ═══════════════════════════════════════════════════════════════════
            1 — USP TOP STRIP
            Ücretsiz teslimat · Fiyat garantisi · Ekspres · Garanti
           ═══════════════════════════════════════════════════════════════════ */}
        <div className="w-full" style={{ background: '#0F2440', color: '#fff' }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center flex-wrap gap-x-6 gap-y-1 text-[11.5px] font-semibold tracking-wide">
            <span className="inline-flex items-center gap-1.5">
              <Truck size={13} style={{ color: '#A04654' }} />
              {t('welcome.uspbar.freeShip', 'Ücretsiz Teslimat · Tüm Avrupa')}
            </span>
            <span className="hidden sm:inline opacity-30">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Tag size={13} style={{ color: '#A04654' }} />
              {t('welcome.uspbar.priceGuar', 'Düşük Fiyat Garantisi')}
            </span>
            <span className="hidden sm:inline opacity-30">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Zap size={13} style={{ color: '#A04654' }} />
              {t('welcome.uspbar.express', 'Ekspres Kargo 24-48 saat')}
            </span>
            <span className="hidden md:inline opacity-30">·</span>
            <span className="hidden md:inline-flex items-center gap-1.5">
              <Shield size={13} style={{ color: '#A04654' }} />
              {t('welcome.uspbar.warranty', '2 Yıl Üretici Garantisi')}
            </span>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            2 — HEADER
            Logo + arama + hesap + dil + sepet
           ═══════════════════════════════════════════════════════════════════ */}
        <header className="w-full bg-white border-b" style={{ borderColor: '#e8e6df' }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            {/* Logo */}
            <button
              type="button"
              onClick={() => navigate('/welcome')}
              className="flex items-center gap-2 shrink-0"
              aria-label="2MC Gastro"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
                style={{ background: 'linear-gradient(135deg, #7B1F26, #5A1219)', fontFamily: 'Fraunces, Georgia, serif' }}
              >
                2
              </div>
              <div className="leading-none">
                <div
                  className="text-[18px] font-black tracking-tight"
                  style={{ color: '#0F2440', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600 }}
                >
                  2MC <span style={{ color: '#7B1F26', fontStyle: 'italic', fontWeight: 500 }}>Gastro</span>
                </div>
                <div className="text-[9px] uppercase tracking-[0.25em] mt-0.5" style={{ color: 'rgba(15,36,64,0.5)' }}>
                  Professional Kitchen
                </div>
              </div>
            </button>

            {/* Arama */}
            <div className="flex-1 max-w-xl hidden md:block">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const q = String(fd.get('q') || '').trim();
                  if (q) navigate(`/diamond?q=${encodeURIComponent(q)}`);
                }}
                className="relative"
              >
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'rgba(15,36,64,0.4)' }}
                />
                <input
                  name="q"
                  type="search"
                  placeholder={t('welcome.header.searchPh', 'Ürün, marka veya kategori ara…')}
                  className="w-full py-2.5 pl-11 pr-24 text-sm border rounded-full outline-none transition-all focus:ring-2"
                  style={{
                    borderColor: '#e8e6df',
                    background: '#faf9f5',
                    color: '#0F2440',
                    // @ts-expect-error — CSS var for ring color
                    '--tw-ring-color': 'rgba(123,31,38,0.25)',
                  }}
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full text-[12px] font-bold text-white transition-all hover:-translate-y-[55%]"
                  style={{ background: '#7B1F26' }}
                >
                  {t('welcome.header.searchBtn', 'Ara')}
                </button>
              </form>
            </div>

            {/* Sağ aksiyonlar */}
            <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
              <LanguageSelector variant="light" />
              <button
                type="button"
                onClick={() => navigate('/support')}
                title={t('welcome.header.help', 'Yardım merkezi')}
                className="hidden sm:flex w-10 h-10 items-center justify-center rounded-full border transition-colors hover:bg-[#faf9f5]"
                style={{ borderColor: '#e8e6df', color: '#0F2440' }}
              >
                <HelpCircle size={18} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                title={t('welcome.header.account', 'Hesap')}
                className="flex w-10 h-10 items-center justify-center rounded-full border transition-colors hover:bg-[#faf9f5]"
                style={{ borderColor: '#e8e6df', color: '#0F2440' }}
              >
                <User size={18} />
              </button>
              <button
                type="button"
                onClick={() => navigate('/cart')}
                title={t('welcome.header.cart', 'Sepet')}
                className="relative flex w-10 h-10 items-center justify-center rounded-full transition-colors text-white"
                style={{ background: '#0F2440' }}
              >
                <ShoppingCart size={18} />
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-black"
                  style={{ background: '#7B1F26', color: '#fff' }}
                >
                  0
                </span>
              </button>
            </div>
          </div>

          {/* Kategori şeridi — yatay row stili (icon sol, etiket sağ), yoğun grid */}
          <nav
            className="topcat-strip border-t"
            style={{
              borderColor: 'rgba(123,31,38,0.14)',
              background:
                'linear-gradient(180deg, #faf9f5 0%, #f3ede0 100%)',
            }}
          >
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
              {/* Tablo benzeri grid — hücreler arasında ince ayraçlar */}
              <div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 rounded-xl overflow-hidden"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(15,36,64,0.09)',
                  boxShadow: '0 1px 2px rgba(15,36,64,0.04)',
                }}
              >
                {TOP_CATS.map((c, idx) => {
                  const I = c.Icon;
                  // 5 sütun varsayımıyla son sütundaki hücrelerin sağ kenarı yok
                  const isLastCol = (idx + 1) % 5 === 0;
                  // Son sıradaki hücrelerin alt kenarı yok (10 öğe → son sıra: 5-9)
                  const isLastRow = idx >= TOP_CATS.length - 5;
                  return (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => navigate(`/diamond?q=${encodeURIComponent(c.q)}`)}
                      className="topcat-tile group flex items-center gap-3 px-3 py-3 text-left transition-colors duration-200"
                      style={{
                        borderRight: isLastCol ? 'none' : '1px solid rgba(15,36,64,0.08)',
                        borderBottom: isLastRow ? 'none' : '1px solid rgba(15,36,64,0.08)',
                        background: 'transparent',
                        ['--hue' as string]: c.hue,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${c.hue}10`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {/* İkon — küçük kare, per-hue gradient */}
                      <span
                        className="topcat-icon shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-105"
                        style={{
                          background: `linear-gradient(135deg, ${c.hue}1f 0%, ${c.hue}0a 100%)`,
                          border: `1px solid ${c.hue}2e`,
                          color: c.hue,
                        }}
                      >
                        <I size={18} strokeWidth={2} />
                      </span>
                      {/* Etiket — sağda, yatay */}
                      <span
                        className="topcat-label text-[13px] font-semibold leading-tight transition-colors duration-200"
                        style={{ color: '#0F2440' }}
                      >
                        {c.label}
                      </span>
                      {/* Hover ok — hafif sağa kayma */}
                      <ArrowRight
                        size={13}
                        className="ml-auto opacity-0 group-hover:opacity-70 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 shrink-0"
                        style={{ color: c.hue }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Alt: tek bir CTA + ince eyebrow — sağa hizalı */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <span
                  className="text-[10px] font-mono uppercase tracking-[0.28em] hidden sm:inline-block"
                  style={{ color: 'rgba(15,36,64,0.45)' }}
                >
                  // 10.000+ {t('welcome.topcat.products', 'ÜRÜN')} · 50+ {t('welcome.topcat.brands', 'MARKA')}
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/diamond')}
                  className="group inline-flex items-center gap-2 pl-5 pr-2 py-2 rounded-full text-[12px] font-bold uppercase tracking-wider text-white transition-all hover:-translate-y-0.5"
                  style={{
                    background:
                      'linear-gradient(135deg, #7B1F26 0%, #5A1219 100%)',
                    boxShadow: '0 6px 18px rgba(123,31,38,0.32)',
                  }}
                >
                  {t('welcome.header.allCats', 'Tüm Kategoriler')}
                  <span
                    className="flex items-center justify-center w-7 h-7 rounded-full transition-transform group-hover:translate-x-0.5"
                    style={{ background: 'rgba(255,255,255,0.18)' }}
                  >
                    <ArrowRight size={14} />
                  </span>
                </button>
              </div>
            </div>
          </nav>
        </header>

        {/* ═══════════════════════════════════════════════════════════════════
            4 — THEMENWELTEN
            4 büyük tematik kart — fotoğraflı, overlay başlıklı
           ═══════════════════════════════════════════════════════════════════ */}
        <SectionSlot id="themenwelten">
        <section className="w-full" style={{ background: '#f5f3eb' }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.28em] mb-2" style={{ color: '#7B1F26' }}>
                  // THEMENWELTEN
                </div>
                <h2
                  className="text-3xl md:text-4xl lg:text-[44px] leading-[1.05]"
                  style={{ color: '#0F2440', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500, letterSpacing: '-0.028em' }}
                >
                  {t('welcome.tw.heading', 'Ürün dünyalarımızı')}{' '}
                  <em style={{ color: '#7B1F26', fontStyle: 'italic' }}>{t('welcome.tw.headingAccent', 'keşfedin')}</em>
                </h2>
                <p className="text-sm mt-2 max-w-md" style={{ color: 'rgba(15,36,64,0.6)' }}>
                  {t('welcome.tw.sub', 'İşletme tipinize özel konseptler · 14+ iş kolu için hazır paketler')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/diamond')}
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold group"
                style={{ color: '#7B1F26' }}
              >
                {t('welcome.tw.viewAll', 'Tüm dünyaları gör')}
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div
              ref={twContainerRef}
              className="overflow-hidden touch-pan-y select-none"
              style={{ cursor: twDragging ? 'grabbing' : 'grab' }}
              {...twDrag}
            >
              <div
                className="flex"
                style={{
                  transform: `translateX(calc(-${(twIdx * 100) / (THEMENWELTEN.length * 2)}% + ${twOffsetPx + twDx}px))`,
                  transition: twAnimate ? 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
                  width: `${THEMENWELTEN.length * 2 * (100 / twVisible)}%`,
                }}
              >
              {[...THEMENWELTEN, ...THEMENWELTEN].map((w, i) => (
                <button
                  key={`${w.key}-${i}`}
                  type="button"
                  onClick={() => navigate(`/diamond?q=${encodeURIComponent(w.q)}`)}
                  className="group text-left shrink-0"
                  style={{
                    flex: `0 0 ${100 / (THEMENWELTEN.length * 2)}%`,
                    padding: '0 10px',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  <div
                    className="relative aspect-[3/4] rounded-3xl overflow-hidden border hover:-translate-y-1 transition-all"
                    style={{ borderColor: '#e8e6df', boxShadow: '0 12px 30px -12px rgba(15,36,64,0.14)' }}
                  >
                    <img
                      src={w.img}
                      alt={w.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(15,36,64,0.05) 0%, rgba(15,36,64,0.35) 55%, rgba(15,36,64,0.88) 100%)',
                      }}
                    />
                    <span
                      className="absolute top-4 left-4 text-[9px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full"
                      style={{ background: w.accent, color: '#fff' }}
                    >
                      {w.tag}
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <div
                        className="text-xl font-black leading-tight"
                        style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
                      >
                        {w.title}
                      </div>
                      <div className="text-[12px] opacity-85 mt-1">{w.sub}</div>
                      <div className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-bold uppercase tracking-wider group-hover:gap-2.5 transition-all">
                        {t('welcome.tw.explore', 'İncele')} <ArrowRight size={13} />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              </div>
            </div>
          </div>
        </section>

        </SectionSlot>
        {/* ═══════════════════════════════════════════════════════════════════
            5 — SERVICES
            4-col hizmet grid — YouTube / Yerinde / 3D Planlama / Yardım
           ═══════════════════════════════════════════════════════════════════ */}
        <SectionSlot id="services">
        <section className="w-full" style={{ background: '#faf9f5' }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
            <div className="text-center mb-10">
              <div className="text-[10px] font-mono uppercase tracking-[0.28em] mb-2" style={{ color: '#7B1F26' }}>
                // SERVICES
              </div>
              <h2
                className="text-3xl md:text-4xl lg:text-[44px] leading-[1.05]"
                style={{ color: '#0F2440', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500, letterSpacing: '-0.028em' }}
              >
                {t('welcome.sv.heading', 'Satıştan sonrası da')}{' '}
                <em style={{ color: '#7B1F26', fontStyle: 'italic' }}>{t('welcome.sv.headingAccent', 'yanınızdayız')}</em>
              </h2>
              <p className="text-sm mt-3 max-w-xl mx-auto" style={{ color: 'rgba(15,36,64,0.6)' }}>
                {t('welcome.sv.sub', '4 temel hizmet: AI planlama, yerinde kurulum, video rehberler ve 7/24 yardım merkezi')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
              {[
                {
                  Icon: PencilRuler,
                  title: t('welcome.sv.s1.title', '2D / 3D Planlama'),
                  desc: t('welcome.sv.s1.desc', 'Mutfağınızı sürükle-bırak ile tasarlayın, AI destekli öneriler alın.'),
                  to: '/design',
                  cta: t('welcome.sv.s1.cta', 'Planlayıcıyı aç'),
                },
                {
                  Icon: Wrench,
                  title: t('welcome.sv.s2.title', 'Yerinde Servis'),
                  desc: t('welcome.sv.s2.desc', 'Uzman teknisyen ekibimiz kurulum ve periyodik bakım için geliyor.'),
                  to: '/support',
                  cta: t('welcome.sv.s2.cta', 'Randevu al'),
                },
                {
                  Icon: Youtube,
                  title: t('welcome.sv.s3.title', 'YouTube Rehberler'),
                  desc: t('welcome.sv.s3.desc', 'Ürün tanıtımları, kurulum videoları ve şef ipuçları tek kanalda.'),
                  to: '/docs',
                  cta: t('welcome.sv.s3.cta', 'Kanalı izle'),
                },
                {
                  Icon: HelpCircle,
                  title: t('welcome.sv.s4.title', 'Yardım Merkezi'),
                  desc: t('welcome.sv.s4.desc', 'SSS, kargo durumu, iade/değişim — 7/24 canlı destek ekibi.'),
                  to: '/support',
                  cta: t('welcome.sv.s4.cta', 'Destek al'),
                },
              ].map((s, i) => {
                const I = s.Icon;
                return (
                  <motion.button
                    key={s.title}
                    type="button"
                    onClick={() => navigate(s.to)}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    className="group relative rounded-3xl p-6 lg:p-7 text-left border hover:-translate-y-1 transition-all"
                    style={{ background: '#ffffff', borderColor: '#e8e6df', boxShadow: '0 1px 2px rgba(15,36,64,0.04)' }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
                      style={{ background: 'rgba(123,31,38,0.1)', color: '#7B1F26' }}
                    >
                      <I size={22} strokeWidth={1.8} />
                    </div>
                    <h3
                      className="text-lg leading-tight mb-2"
                      style={{ color: '#0F2440', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500, letterSpacing: '-0.018em' }}
                    >
                      {s.title}
                    </h3>
                    <p className="text-[13px] leading-relaxed mb-5" style={{ color: 'rgba(15,36,64,0.65)' }}>
                      {s.desc}
                    </p>
                    <span
                      className="inline-flex items-center gap-1.5 text-[12px] font-bold group-hover:gap-2 transition-all"
                      style={{ color: '#7B1F26' }}
                    >
                      {s.cta} <ArrowRight size={13} />
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

        </SectionSlot>
        {/* ═══════════════════════════════════════════════════════════════════
            6 — CREDIBILITY / NEDEN 2MC?
            Büyük istatistik blokları (Statista tarzı)
           ═══════════════════════════════════════════════════════════════════ */}
        <SectionSlot id="why-2mc">
        <section
          className="w-full"
          style={{
            background: 'linear-gradient(180deg, #faf9f5 0%, #f5f0e3 100%)',
            color: '#0F2440',
          }}
        >
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
            <div className="grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-14 items-center">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.28em] mb-3" style={{ color: '#7B1F26' }}>
                  // NEDEN 2MC GASTRO?
                </div>
                <h2
                  className="text-3xl md:text-4xl lg:text-[46px] leading-[1.05] mb-5"
                  style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500, letterSpacing: '-0.03em', color: '#0F2440' }}
                >
                  {t('welcome.why.title', 'Endüstriyel mutfağın dijital')}{' '}
                  <em style={{ color: '#7B1F26', fontStyle: 'italic' }}>{t('welcome.why.titleAccent', 'çözüm ortağı.')}</em>
                </h2>
                <p className="text-[15px] leading-relaxed mb-6" style={{ color: 'rgba(15,36,64,0.7)' }}>
                  {t(
                    'welcome.why.lede',
                    '15 yılı aşkın tecrübemizle Avrupa\'nın önde gelen restoran, otel ve catering işletmelerine profesyonel mutfak ekipmanları, 3D tasarım ve teklif hazırlama hizmetleri sunuyoruz.'
                  )}
                </p>
                <ul className="space-y-2.5 mb-7">
                  {[
                    t('welcome.why.p1', 'Avrupa\'nın önde gelen gastro tedarikçisi'),
                    t('welcome.why.p2', 'Ücretsiz AI mutfak planlama & 3D stüdyosu'),
                    t('welcome.why.p3', 'Avrupa geneli ücretsiz teslimat · 24-48 saat kargo'),
                    t('welcome.why.p4', 'CE sertifikalı · 2 yıl üretici garantisi'),
                  ].map((li) => (
                    <li key={li} className="flex items-start gap-2.5 text-[14px]" style={{ color: 'rgba(15,36,64,0.85)' }}>
                      <CheckCircle2 size={16} style={{ color: '#7B1F26' }} className="mt-0.5 shrink-0" strokeWidth={2.2} />
                      <span className="leading-snug">{li}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => navigate('/brand')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:-translate-y-0.5"
                  style={{ background: '#7B1F26', color: '#fff', boxShadow: '0 14px 32px -12px rgba(123,31,38,0.5)' }}
                >
                  {t('welcome.why.cta', 'Hakkımızda')} <ArrowRight size={15} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  { Icon: Award, value: '15+', label: t('welcome.why.stat1', 'Yıl Tecrübe'), sub: t('welcome.why.stat1sub', 'Türkiye & Avrupa pazarında') },
                  { Icon: CheckCircle2, value: '500+', label: t('welcome.why.stat2', 'Tamamlanan Proje'), sub: t('welcome.why.stat2sub', 'Restoran · otel · catering') },
                  { Icon: Refrigerator, value: '10K+', label: t('welcome.why.stat3', 'Ekipman Modeli'), sub: t('welcome.why.stat3sub', '50+ premium marka') },
                  { Icon: Star, value: '4.9/5', label: t('welcome.why.stat4', 'Müşteri Puanı'), sub: t('welcome.why.stat4sub', '320+ Google yorumu') },
                ].map((s, i) => {
                  const I = s.Icon;
                  return (
                    <motion.div
                      key={s.label}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e8e6df',
                        boxShadow: '0 12px 30px -18px rgba(15,36,64,0.18)',
                      }}
                    >
                      <div
                        aria-hidden
                        className="absolute -top-10 -right-10 w-28 h-28 rounded-full opacity-[0.08] pointer-events-none"
                        style={{ background: '#7B1F26' }}
                      />
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                        style={{ background: 'rgba(123,31,38,0.10)', color: '#7B1F26' }}
                      >
                        <I size={20} strokeWidth={1.8} />
                      </div>
                      <div
                        className="leading-none"
                        style={{
                          fontFamily: 'Fraunces, Georgia, serif',
                          fontWeight: 500,
                          fontSize: 'clamp(32px, 3.5vw, 46px)',
                          letterSpacing: '-0.03em',
                          color: '#0F2440',
                        }}
                      >
                        {s.value}
                      </div>
                      <div className="mt-2 font-bold text-[13.5px]" style={{ color: '#0F2440' }}>{s.label}</div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'rgba(15,36,64,0.55)' }}>
                        {s.sub}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        </SectionSlot>
        {/* ═══════════════════════════════════════════════════════════════════
            6.5 — REFERENCES / REFERANSLARIMIZ
            Müşteri logoları yatay şerit — şimdilik stilize stok kartlar
           ═══════════════════════════════════════════════════════════════════ */}
        <SectionSlot id="references">
        <section className="w-full" style={{ background: '#f5f3eb' }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-18">
            <div className="text-center mb-10">
              <div
                className="text-[10px] font-mono uppercase tracking-[0.28em] mb-2"
                style={{ color: '#7B1F26' }}
              >
                // {t('welcome.refs.eyebrow', 'BİZE GÜVENENLER')}
              </div>
              <h2
                className="text-3xl md:text-4xl lg:text-[44px] leading-[1.05]"
                style={{
                  color: '#0F2440',
                  fontFamily: 'Fraunces, Georgia, serif',
                  fontWeight: 500,
                  letterSpacing: '-0.028em',
                }}
              >
                {t('welcome.refs.title', 'Avrupa genelinde')}{' '}
                <em style={{ color: '#7B1F26', fontStyle: 'italic' }}>
                  {t('welcome.refs.titleAccent', 'referanslarımız')}
                </em>
              </h2>
              <p
                className="text-sm mt-3 max-w-xl mx-auto"
                style={{ color: 'rgba(15,36,64,0.6)' }}
              >
                {t(
                  'welcome.refs.sub',
                  '500+ restoran, otel ve catering işletmesi 2mc Gastro çözümleriyle çalışıyor.'
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 lg:gap-4">
              {[
                { mono: 'RB', name: 'Restorante Bella',  city: 'Roma',     bg: '#FAF3E7', fg: '#B8202A', accent: '#7B1F26' },
                { mono: 'LP', name: 'Le Petit Café',     city: 'Paris',    bg: '#0F2440', fg: '#F4E9D8', accent: '#D4A574' },
                { mono: 'SH', name: 'Sofra Hotel',       city: 'İstanbul', bg: '#1F4D3A', fg: '#E8C547', accent: '#E8C547' },
                { mono: 'BC', name: 'Berlin Catering',   city: 'Berlin',   bg: '#1A1A1A', fg: '#FFC857', accent: '#FFC857' },
                { mono: 'SK', name: 'Star Kitchen',      city: 'Munich',   bg: '#7B1F26', fg: '#FFFFFF', accent: '#FFFFFF' },
                { mono: 'GP', name: 'Grand Palace',      city: 'Vienna',   bg: '#0A0A0A', fg: '#D4AF37', accent: '#D4AF37' },
                { mono: 'MP', name: 'Mensa Pro',         city: 'Hamburg',  bg: '#1E40AF', fg: '#FFFFFF', accent: '#93C5FD' },
                { mono: 'BM', name: 'Bäckerei Müller',   city: 'Frankfurt',bg: '#5C3A1E', fg: '#F5E6D3', accent: '#D4A574' },
              ].map((r, i) => (
                <motion.div
                  key={r.name}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                  className="group relative aspect-square rounded-2xl overflow-hidden cursor-default transition-all hover:-translate-y-1"
                  style={{
                    background: r.bg,
                    boxShadow: '0 1px 2px rgba(15,36,64,0.04)',
                    border: '1px solid rgba(15,36,64,0.06)',
                  }}
                >
                  {/* Dekoratif arka plan: hafif radial glow */}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-60 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(circle at 50% 30%, ${r.accent}1f 0%, transparent 65%)`,
                    }}
                  />
                  {/* Köşe çentik (sticker hissi) */}
                  <div
                    aria-hidden
                    className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                    style={{ background: r.accent, opacity: 0.55 }}
                  />
                  {/* Ana içerik */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
                    {/* Monogram halka */}
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-110"
                      style={{
                        border: `1.5px solid ${r.accent}`,
                        color: r.fg,
                        fontFamily: 'Fraunces, Georgia, serif',
                        fontWeight: 600,
                        fontSize: '15px',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {r.mono}
                    </div>
                    <div
                      className="text-[11.5px] font-bold leading-tight"
                      style={{ color: r.fg, letterSpacing: '-0.01em' }}
                    >
                      {r.name}
                    </div>
                    <div
                      className="text-[9px] uppercase tracking-[0.2em] mt-0.5"
                      style={{ color: r.fg, opacity: 0.55 }}
                    >
                      {r.city}
                    </div>
                  </div>
                  {/* Alt çizgi: hover'da animate */}
                  <div
                    aria-hidden
                    className="absolute bottom-0 left-1/2 h-0.5 -translate-x-1/2 w-0 group-hover:w-2/3 transition-all duration-500"
                    style={{ background: r.accent }}
                  />
                </motion.div>
              ))}
            </div>

            {/* Alt bant: stok rozet */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
              {[
                t('welcome.refs.badge1', '500+ aktif müşteri'),
                t('welcome.refs.badge2', '15+ yıl tecrübe'),
                t('welcome.refs.badge3', '8 ülkede teslimat'),
                t('welcome.refs.badge4', 'CE sertifikalı'),
              ].map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e8e6df',
                    color: '#0F2440',
                  }}
                >
                  <CheckCircle2 size={12} style={{ color: '#7B1F26' }} strokeWidth={2.5} />
                  {b}
                </span>
              ))}
            </div>
          </div>
        </section>

        </SectionSlot>
        {/* ═══════════════════════════════════════════════════════════════════
            7 — LOGISTICS 2-COL
            Teslimat + Depo
           ═══════════════════════════════════════════════════════════════════ */}
        <SectionSlot id="logistics">
        <section className="w-full" style={{ background: '#faf9f5' }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-18">
            <div className="grid md:grid-cols-2 gap-4 lg:gap-6">
              {[
                {
                  Icon: Truck,
                  eyebrow: t('welcome.lg.a.eyebrow', 'LOJİSTİK'),
                  title: t('welcome.lg.a.title', 'Avrupa\'da 48 saatte teslim'),
                  desc: t('welcome.lg.a.desc', 'Kendi lojistik ağımız ve anlaşmalı nakliyecilerimiz ile sipariş sonrası 24-48 saat içinde kapınıza.'),
                  value: '48h',
                  valueLabel: t('welcome.lg.a.vlabel', 'ekspres teslim'),
                  bg: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&q=80&auto=format&fit=crop',
                },
                {
                  Icon: Package,
                  eyebrow: t('welcome.lg.b.eyebrow', 'DEPO'),
                  title: t('welcome.lg.b.title', '10.000+ ürün, anında stokta'),
                  desc: t('welcome.lg.b.desc', '220.000 m² depolama kapasitesi · hazır stok · anında kargo · uygun fiyat.'),
                  value: '10K+',
                  valueLabel: t('welcome.lg.b.vlabel', 'ürün stokta'),
                  bg: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=900&q=80&auto=format&fit=crop',
                },
              ].map((b, i) => {
                const I = b.Icon;
                return (
                  <motion.div
                    key={b.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="relative overflow-hidden rounded-3xl aspect-[4/3] sm:aspect-[16/9] md:aspect-auto md:min-h-[320px] border p-6 sm:p-8"
                    style={{ borderColor: '#e8e6df' }}
                  >
                    <img
                      src={b.bg}
                      alt=""
                      aria-hidden
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(110deg, rgba(15,36,64,0.9) 0%, rgba(15,36,64,0.7) 45%, rgba(15,36,64,0.25) 100%)',
                      }}
                    />
                    <div className="relative h-full flex flex-col justify-between gap-6 text-white">
                      <div>
                        <div className="flex items-center gap-2.5 mb-4">
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: '#7B1F26' }}
                          >
                            <I size={20} />
                          </div>
                          <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: '#A04654' }}>
                            {b.eyebrow}
                          </div>
                        </div>
                        <h3
                          className="text-2xl md:text-3xl leading-tight max-w-md"
                          style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500, letterSpacing: '-0.022em' }}
                        >
                          {b.title}
                        </h3>
                        <p className="text-[13.5px] leading-relaxed mt-3 max-w-md" style={{ color: 'rgba(255,255,255,0.75)' }}>
                          {b.desc}
                        </p>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <div
                            className="leading-none"
                            style={{
                              fontFamily: 'Fraunces, Georgia, serif',
                              fontWeight: 500,
                              fontSize: 'clamp(36px, 4vw, 56px)',
                              letterSpacing: '-0.035em',
                              color: '#A04654',
                            }}
                          >
                            {b.value}
                          </div>
                          <div className="text-[11px] uppercase tracking-[0.15em] mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
                            {b.valueLabel}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        </SectionSlot>
        {/* ═══════════════════════════════════════════════════════════════════
            8 — 3D SHOWCASE
            Modelleri döndürün, yakınlaştırın — korunuyor
           ═══════════════════════════════════════════════════════════════════ */}
        <SectionSlot id="showcase-3d">
        <section className="w-full" style={{ background: '#f5f3eb' }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.28em] mb-2" style={{ color: '#7B1F26' }}>
                  // 3D SHOWROOM · REAL-TIME
                </div>
                <h2
                  className="text-3xl md:text-4xl lg:text-[44px] leading-[1.05]"
                  style={{ color: '#0F2440', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500, letterSpacing: '-0.028em' }}
                >
                  {t('welcome.showcase3d.title', 'Ürünlerimize')}{' '}
                  <em style={{ color: '#7B1F26', fontStyle: 'italic' }}>
                    {t('welcome.showcase3d.titleAccent', '3 boyutlu')}
                  </em>{' '}
                  {t('welcome.showcase3d.titleSuffix', 'dokunun')}
                </h2>
                <p className="text-sm mt-3 max-w-md" style={{ color: 'rgba(15,36,64,0.6)' }}>
                  {t(
                    'welcome.showcase3d.subtitle',
                    'Modelleri döndürün, yakınlaştırın · karta tıklayın ve tüm teknik detayları inceleyin'
                  )}
                </p>
              </div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-[0.2em]"
                style={{ background: '#fff', border: '1px solid #e8e6df', color: 'rgba(15,36,64,0.6)' }}
              >
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#7B1F26' }} />
                {t('welcome.showcase3d.liveTag', 'canlı 3D')}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
              {SHOWCASE_3D.map((m, i) => (
                <motion.button
                  key={m.id}
                  type="button"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  onClick={() => setView3D(m)}
                  className="group relative text-left rounded-3xl overflow-hidden bg-white border hover:-translate-y-1 transition-all"
                  style={{ borderColor: '#e8e6df', boxShadow: '0 1px 2px rgba(15,36,64,0.04), 0 12px 30px -12px rgba(15,36,64,0.14)' }}
                >
                  <div className="p-5">
                    <div
                      className="relative aspect-[5/4] w-full rounded-2xl overflow-hidden border"
                      style={{ background: 'linear-gradient(135deg, #faf9f5, #ffffff)', borderColor: '#f0eee6' }}
                    >
                      <span
                        className="absolute top-3 left-3 z-10 text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-1 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.92)', color: '#0F2440', border: '1px solid #e8e6df' }}
                      >
                        {m.tag}
                      </span>
                      {/* @ts-expect-error model-viewer custom element */}
                      <model-viewer
                        src={m.src}
                        alt={m.title}
                        auto-rotate
                        auto-rotate-delay="0"
                        rotation-per-second="22deg"
                        camera-controls
                        interaction-prompt="none"
                        disable-zoom
                        shadow-intensity="1"
                        shadow-softness="0.9"
                        exposure="1.1"
                        environment-image="neutral"
                        style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
                      />
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3
                          className="text-lg leading-tight truncate"
                          style={{ color: '#0F2440', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500, letterSpacing: '-0.018em' }}
                        >
                          {m.title}
                        </h3>
                        <p className="text-[12.5px] mt-1 truncate font-semibold" style={{ color: '#7B1F26' }}>
                          {m.priceLabel ?? m.subtitle}
                        </p>
                      </div>
                      <div
                        className="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110"
                        style={{ background: '#faf9f5', border: '1px solid #e8e6df', color: '#0F2440' }}
                      >
                        <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </section>

        </SectionSlot>
        {/* ═══════════════════════════════════════════════════════════════════
            10 — CATALOG BANNER 2-COL
            Asymmetric — büyük katalog banner + küçük trend/video
           ═══════════════════════════════════════════════════════════════════ */}
        <SectionSlot id="catalog-banner">
        <section className="w-full" style={{ background: '#f5f3eb' }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-18">
            <div className="grid md:grid-cols-[1.4fr_1fr] gap-4 lg:gap-6">
              {/* Büyük katalog kartı */}
              <motion.button
                type="button"
                onClick={() => navigate('/diamond')}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="group relative overflow-hidden rounded-3xl text-left min-h-[320px] border p-8 sm:p-10"
                style={{
                  borderColor: 'rgba(123,31,38,0.18)',
                  background: 'linear-gradient(135deg, #ffffff 0%, #faf9f5 60%, #fbe7dc 130%)',
                  color: '#0F2440',
                  boxShadow: '0 18px 40px -22px rgba(123,31,38,0.18)',
                }}
              >
                <div
                  aria-hidden
                  className="absolute -right-32 -bottom-32 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
                  style={{ background: '#7B1F26' }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-[0.04] pointer-events-none"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(15,36,64,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(15,36,64,0.4) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                  }}
                />
                <div className="relative max-w-md">
                  <div className="text-[10px] font-mono uppercase tracking-[0.28em] mb-3" style={{ color: '#7B1F26' }}>
                    // KATALOG 2026
                  </div>
                  <h3
                    className="text-3xl md:text-4xl leading-[1.05] mb-4"
                    style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500, letterSpacing: '-0.025em', color: '#0F2440' }}
                  >
                    {t('welcome.cat.title', '10.000+ ürün')}{' '}
                    <em style={{ color: '#7B1F26', fontStyle: 'italic' }}>{t('welcome.cat.titleAccent', '& 3.5M yedek parça')}</em>
                  </h3>
                  <p className="text-[14px] leading-relaxed mb-5" style={{ color: 'rgba(15,36,64,0.7)' }}>
                    {t('welcome.cat.desc', 'En yeni trendler, inovasyonlar ve klasikleşmiş favoriler — tek bir katalogta bir araya geldi.')}
                  </p>
                  <div
                    className="inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider group-hover:gap-3 transition-all"
                    style={{ color: '#7B1F26' }}
                  >
                    {t('welcome.cat.cta', 'Katalogu aç')} <ArrowRight size={14} />
                  </div>
                </div>
              </motion.button>

              {/* Küçük: Video rehberler */}
              <motion.button
                type="button"
                onClick={() => navigate('/docs')}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="group relative overflow-hidden rounded-3xl text-left min-h-[320px] border"
                style={{ borderColor: '#e8e6df' }}
              >
                {VIDEO_URLS.length > 0 && (
                  <video
                    ref={videoRef}
                    src={VIDEO_URLS[videoIdx]}
                    autoPlay
                    muted
                    playsInline
                    onEnded={handleVideoEnd}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(15,36,64,0.2) 0%, rgba(15,36,64,0.4) 50%, rgba(15,36,64,0.9) 100%)',
                  }}
                />
                <div className="relative h-full flex flex-col justify-end p-7 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: '#7B1F26' }}
                    >
                      <Play size={16} fill="currentColor" />
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: '#A04654' }}>
                      {t('welcome.cat.video.tag', 'VIDEO')}
                    </div>
                  </div>
                  <h3
                    className="text-xl md:text-2xl leading-tight"
                    style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
                  >
                    {t('welcome.cat.video.title', 'Şeflerin tercihi: 2MC Gastro makineleri iş başında')}
                  </h3>
                  <div className="text-[12px] mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {t('welcome.cat.video.sub', 'Tanıtım & kurulum videoları')}
                  </div>
                </div>
              </motion.button>
            </div>
          </div>
        </section>

        </SectionSlot>
        {/* ═══════════════════════════════════════════════════════════════════
            11 — VALUE PROP SUMMARY ("Ihr Partner für Ihre Gastronomie")
           ═══════════════════════════════════════════════════════════════════ */}
        <SectionSlot id="value-prop">
        <section className="w-full bg-white border-y" style={{ borderColor: '#e8e6df' }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-18">
            <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-14 items-center">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.28em] mb-2" style={{ color: '#7B1F26' }}>
                  // IHR PARTNER
                </div>
                <h2
                  className="text-3xl md:text-4xl leading-[1.05]"
                  style={{ color: '#0F2440', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500, letterSpacing: '-0.028em' }}
                >
                  {t('welcome.val.title', 'Gastronomiyi')}{' '}
                  <em style={{ color: '#7B1F26', fontStyle: 'italic' }}>{t('welcome.val.titleAccent', 'daha kolay')}</em>{' '}
                  {t('welcome.val.titleB', 'yapıyoruz.')}
                </h2>
                <p className="text-[14px] mt-4 max-w-sm" style={{ color: 'rgba(15,36,64,0.65)' }}>
                  {t('welcome.val.sub', 'Bir restoran açmaktan yıllık tadilata kadar her adımda yanınızda olan bir ekip.')}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { Icon: Globe,        label: t('welcome.val.a', 'Avrupa\'nın önde gelen gastro tedarikçisi') },
                  { Icon: Star,         label: t('welcome.val.b', '4.9/5 müşteri puanı · 320+ doğrulanmış yorum') },
                  { Icon: Truck,        label: t('welcome.val.c', 'Avrupa içi ücretsiz teslimat') },
                  { Icon: Tag,          label: t('welcome.val.d', 'Düşük fiyat garantisi · fatura eşleştirme') },
                  { Icon: Clock,        label: t('welcome.val.e', '2 iş günü içinde kargo · sabit termin') },
                  { Icon: Shield,       label: t('welcome.val.f', 'CE sertifikalı · 2 yıl garanti') },
                  { Icon: PencilRuler,  label: t('welcome.val.g', 'Ücretsiz 3D tasarım stüdyosu & AI planlama') },
                  { Icon: Wrench,       label: t('welcome.val.h', 'Yerinde kurulum & periyodik bakım') },
                ].map((v) => {
                  const I = v.Icon;
                  return (
                    <div key={v.label} className="flex items-start gap-3 py-2 border-b" style={{ borderColor: '#f0eee6' }}>
                      <div
                        className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                        style={{ background: 'rgba(123,31,38,0.1)', color: '#7B1F26' }}
                      >
                        <I size={15} strokeWidth={1.8} />
                      </div>
                      <span className="text-[13.5px] leading-snug mt-1.5" style={{ color: '#0F2440' }}>
                        {v.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        </SectionSlot>
        {/* ═══════════════════════════════════════════════════════════════════
            12 — SUPPORT & REVIEWS
           ═══════════════════════════════════════════════════════════════════ */}
        <SectionSlot id="support-reviews">
        <section className="w-full" style={{ background: '#faf9f5' }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-18">
            <div className="grid md:grid-cols-[1fr_1.3fr] gap-4 lg:gap-6">
              {/* Support kartı */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border text-center md:text-left"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #faf9f5 60%, #fbe7dc 140%)',
                  borderColor: '#e8e6df',
                }}
              >
                <div
                  aria-hidden
                  className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-40"
                  style={{ background: '#7B1F26' }}
                />
                <div
                  className="relative w-14 h-14 mx-auto md:mx-0 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: '#7B1F26', color: '#fff', boxShadow: '0 14px 32px -12px rgba(123,31,38,0.5)' }}
                >
                  <PhoneCall size={24} />
                </div>
                <h3
                  className="text-2xl leading-tight mb-2"
                  style={{ color: '#0F2440', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500, letterSpacing: '-0.02em' }}
                >
                  {t('welcome.sup.title', 'Sorunuz mu var?')}
                </h3>
                <p className="text-[14px] mb-5" style={{ color: 'rgba(15,36,64,0.7)' }}>
                  {t('welcome.sup.desc', 'Uzman ekibimiz 24 saat içinde dönüş yapar · ücretsiz danışmanlık.')}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => navigate('/support')}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:-translate-y-0.5"
                    style={{ background: '#7B1F26' }}
                  >
                    <MessageCircle size={15} />
                    {t('welcome.sup.cta', 'Canlı destek')}
                  </button>
                  <a
                    href="mailto:info@2mcgastro.com"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:-translate-y-0.5"
                    style={{ color: '#0F2440', background: '#fff', border: '1px solid #e8e6df' }}
                  >
                    <Mail size={15} />
                    {t('welcome.sup.email', 'E-posta')}
                  </a>
                </div>
              </motion.div>

              {/* Reviews kartı */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative overflow-hidden rounded-3xl p-8 sm:p-10 border"
                style={{ background: '#fff', borderColor: '#e8e6df' }}
              >
                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-center">
                  <div className="flex flex-col md:border-r md:pr-10" style={{ borderColor: '#f0eee6' }}>
                    <div className="flex items-center gap-2 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={18} style={{ color: '#c89a3c', fill: '#c89a3c' }} />
                      ))}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className="text-6xl leading-none"
                        style={{ color: '#0F2440', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500, letterSpacing: '-0.03em' }}
                      >
                        4.9
                      </span>
                      <span className="text-base" style={{ color: 'rgba(15,36,64,0.5)' }}>/ 5.0</span>
                    </div>
                    <div className="text-[11px] mt-2" style={{ color: 'rgba(15,36,64,0.55)' }}>
                      {t('welcome.rev.count', '320+ doğrulanmış Google yorumu')}
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: '5★', pct: 92 },
                      { label: '4★', pct: 6 },
                      { label: '3★', pct: 2 },
                    ].map((r) => (
                      <div key={r.label} className="flex items-center gap-3 text-[13px]">
                        <span className="w-8 font-bold" style={{ color: '#0F2440' }}>
                          {r.label}
                        </span>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#f0eee6' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${r.pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1 }}
                            className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg, #7B1F26, #A04654)' }}
                          />
                        </div>
                        <span className="w-10 text-right text-[12px]" style={{ color: 'rgba(15,36,64,0.6)' }}>
                          {r.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <a
                  href="https://www.google.com/search?q=2mc+gastro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-bold"
                  style={{ color: '#7B1F26' }}
                >
                  {t('welcome.rev.cta', 'Tüm yorumları gör')} <ArrowRight size={13} />
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        </SectionSlot>
        {/* ═══════════════════════════════════════════════════════════════════
            13 — BLOG + NEWSLETTER (ekran komponentleri)
           ═══════════════════════════════════════════════════════════════════ */}
        <SectionSlot id="blog-newsletter">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <BlogPreviewSection />
          <NewsletterSection />
        </div>

        </SectionSlot>
        {/* ═══════════════════════════════════════════════════════════════════
            14 — PAYMENT METHODS STRIP
           ═══════════════════════════════════════════════════════════════════ */}
        <SectionSlot id="payment">
        <section className="w-full bg-white border-t" style={{ borderColor: '#e8e6df' }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] mb-1" style={{ color: 'rgba(15,36,64,0.45)' }}>
                  {t('welcome.pay.eyebrow', 'Ödeme Yöntemleri')}
                </div>
                <div className="text-sm font-semibold" style={{ color: '#0F2440' }}>
                  {t('welcome.pay.title', 'Güvenli ve esnek ödeme · B2B ve B2C')}
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                {['VISA', 'MASTERCARD', 'AMEX', 'PAYPAL', 'SEPA', 'KLARNA', 'LEASING'].map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center h-8 px-3 rounded-md text-[10px] font-black tracking-wider"
                    style={{ background: '#faf9f5', color: 'rgba(15,36,64,0.7)', border: '1px solid #e8e6df' }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        </SectionSlot>
        {/* ═══════════════════════════════════════════════════════════════════
            3 — HERO
            Tiefstpreisgarantie tarzı büyük başlık + CTA + sağda görsel + banner
           ═══════════════════════════════════════════════════════════════════ */}
        <SectionSlot id="hero">
        <section className="w-full" style={{ background: '#faf9f5' }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 lg:pt-14 lg:pb-20">

            {/* Banner — storeden gelen slide */}
            {currentSlide && (
              <motion.button
                type="button"
                onClick={() => setBannerIdx((i) => (i + 1) % Math.max(1, slides.length))}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="group relative w-full overflow-hidden rounded-2xl aspect-[820/240] border"
                style={{ borderColor: '#e8e6df' }}
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide.id}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 flex flex-col justify-center px-6 sm:px-12"
                    style={
                      currentSlide.image
                        ? { backgroundImage: `url(${currentSlide.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { background: currentSlide.gradient || '#0F2440' }
                    }
                  >
                    {!currentSlide.image && (
                      <div className="relative z-10 text-left">
                        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/80 mb-3">
                          {currentSlide.eyebrow}
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-white leading-tight max-w-xl">
                          {currentSlide.title}
                        </h3>
                        <p className="text-sm text-white/85 mt-2 max-w-lg">{currentSlide.subtitle}</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
                {slides.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {slides.map((_, i) => (
                      <span
                        key={i}
                        className="h-1 rounded-full transition-all"
                        style={{
                          width: i === bannerIdx ? 28 : 8,
                          background: i === bannerIdx ? '#7B1F26' : 'rgba(255,255,255,0.45)',
                        }}
                      />
                    ))}
                  </div>
                )}
              </motion.button>
            )}
          </div>
        </section>

        </SectionSlot>
        {/* ═══════════════════════════════════════════════════════════════════
            9 — BESTSELLERS
            €1000+ ürün şeridi
           ═══════════════════════════════════════════════════════════════════ */}
        <SectionSlot id="bestsellers">
        <section className="w-full" style={{ background: '#faf9f5' }}>
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.28em] mb-2 flex items-center gap-2" style={{ color: '#7B1F26' }}>
                  <span>// BESTSELLERS · €3.000 – €10.000</span>
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ background: '#7B1F26' }}
                    aria-hidden
                  />
                  <span style={{ opacity: 0.55 }}>LIVE</span>
                </div>
                <h2
                  className="text-3xl md:text-4xl lg:text-[44px] leading-[1.05]"
                  style={{ color: '#0F2440', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500, letterSpacing: '-0.028em' }}
                >
                  {t('welcome.best.title', 'En çok tercih edilen')}{' '}
                  <em style={{ color: '#7B1F26', fontStyle: 'italic' }}>{t('welcome.best.titleAccent', 'profesyonel ekipmanlar')}</em>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/diamond')}
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: '#7B1F26' }}
              >
                {t('welcome.best.all', 'Tümü')} <ArrowRight size={14} />
              </button>
            </div>

            <div
              ref={bsContainerRef}
              className="overflow-hidden touch-pan-y select-none"
              style={{ cursor: bsDragging ? 'grabbing' : 'grab' }}
              {...bsDrag}
            >
              <div
                className="flex"
                style={{
                  transform: `translateX(calc(-${(bsIdx * 100) / (bestsellers.length * 2)}% + ${bsOffsetPx + bsDx}px))`,
                  transition: bsAnimate ? 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
                  width: `${bestsellers.length * 2 * (100 / bsVisible)}%`,
                }}
              >
              {[...bestsellers, ...bestsellers].map((p, bsI) => (
                <div
                  key={`${p.id}-${bsI}`}
                  style={{
                    flex: `0 0 ${100 / (bestsellers.length * 2)}%`,
                    padding: '0 10px',
                  }}
                >
                <div
                  onClick={() => navigate(`/diamond?q=${encodeURIComponent(p.id)}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/diamond?q=${encodeURIComponent(p.id)}`);
                    }
                  }}
                  className="group relative bg-white rounded-2xl overflow-hidden border hover:-translate-y-1 transition-all cursor-pointer flex flex-col"
                  style={{ borderColor: '#e8e6df', boxShadow: '0 1px 2px rgba(15,36,64,0.04)' }}
                >
                  <span
                    className="absolute top-2.5 left-2.5 z-10 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{
                      background: p.badge === 'PREMIUM' ? '#c89a3c' : p.badge === 'EMPFEHLUNG' ? '#1b7f3a' : '#C62828',
                      color: '#fff',
                    }}
                  >
                    {p.badge}
                  </span>
                  <button
                    type="button"
                    aria-label="Favorilere ekle"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e8e6df', color: 'rgba(15,36,64,0.5)' }}
                  >
                    <Heart size={14} />
                  </button>
                  <div className="aspect-square bg-white flex items-center justify-center p-4">
                    <img
                      src={p.img}
                      alt={p.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        if (!img.dataset.fb) {
                          img.dataset.fb = '1';
                          img.src =
                            'data:image/svg+xml;utf8,' +
                            encodeURIComponent(
                              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#faf9f5"/><g fill="none" stroke="#c8c4b6" stroke-width="2"><rect x="40" y="60" width="120" height="90" rx="6"/></g></svg>`
                            );
                        }
                      }}
                    />
                  </div>
                  <div className="p-4 border-t flex-1 flex flex-col" style={{ borderColor: '#f0eee6' }}>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(15,36,64,0.4)' }}>
                      Art.Nr: {p.id}
                    </div>
                    <h3
                      className="text-[13px] leading-snug line-clamp-2 min-h-[34px] mb-2"
                      style={{ color: '#0F2440', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 500 }}
                    >
                      {p.name}
                    </h3>
                    <div
                      className="font-black mt-auto"
                      style={{
                        color: '#7B1F26',
                        fontFamily: 'Fraunces, Georgia, serif',
                        fontWeight: 600,
                        fontSize: 20,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {p.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      <span className="text-[10px] font-normal opacity-60 ml-0.5">*</span>
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/diamond?q=${encodeURIComponent(p.id)}`);
                        }}
                        className="flex-1 text-[11px] font-bold uppercase tracking-wider py-2 rounded-lg text-white transition-colors"
                        style={{ background: '#7B1F26' }}
                      >
                        {t('welcome.best.view', 'İncele')}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/support?type=quote&sku=${encodeURIComponent(p.id)}`);
                        }}
                        aria-label={t('welcome.best.quote', 'Teklif iste')}
                        className="w-9 rounded-lg flex items-center justify-center transition-colors"
                        style={{ border: '1px solid #e8e6df', color: '#0F2440' }}
                      >
                        <FileText size={13} />
                      </button>
                    </div>
                  </div>
                </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        </section>

        </SectionSlot>
        {/* AI Live Chat */}
        <LiveChatWidget />
      </div>

      <SiteFooter />

      {/* 3D Showcase Detail Modal */}
      <AnimatePresence>
        {view3D && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setView3D(null)}
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl h-[85vh] bg-gradient-to-br from-[#0b1220] via-[#0a0f1e] to-[#05080f] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              <div className="absolute -top-24 -left-20 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-20 w-80 h-80 rounded-full bg-fuchsia-500/10 blur-3xl pointer-events-none" />

              <div className={`relative flex-1 bg-gradient-to-br ${view3D.accent} border-b md:border-b-0 md:border-r ${view3D.ring}`}>
                <div className="absolute inset-0 bg-[#020817]/40 pointer-events-none" />
                {/* @ts-expect-error model-viewer custom element */}
                <model-viewer
                  src={view3D.src}
                  alt={view3D.title}
                  camera-controls
                  auto-rotate
                  shadow-intensity="1.1"
                  exposure="1.1"
                  style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
                />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border border-white/15 bg-black/50 text-white/60">
                  {t('welcome.showcase3d.modal.hint', 'Döndür · Yakınlaştır · Sürükle')}
                </div>
              </div>

              <div className="relative w-full md:w-[380px] shrink-0 flex flex-col overflow-y-auto">
                <button
                  onClick={() => setView3D(null)}
                  aria-label={t('welcome.showcase3d.modal.close', 'Kapat')}
                  className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors"
                >
                  <span className="text-lg leading-none">×</span>
                </button>

                <div className="p-6 pb-4">
                  <div className={`inline-flex self-start text-[9px] font-mono uppercase tracking-[0.22em] px-2 py-1 rounded-full border ${view3D.ring} bg-black/40 ${view3D.text} mb-4`}>
                    {view3D.tag} · 3D
                  </div>
                  <h3 className="text-white font-black text-2xl tracking-tight leading-tight mb-2">{view3D.title}</h3>
                  <p className={`text-sm font-semibold ${view3D.text} mb-3`}>{view3D.subtitle}</p>
                  <p className="text-white/60 text-[13px] leading-relaxed">{view3D.desc}</p>
                  {view3D.priceLabel && (
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                        {t('welcome.showcase3d.modal.catalogPrice', 'Katalog fiyatı')}
                      </span>
                      <span className={`text-xl font-black ${view3D.text}`}>{view3D.priceLabel}</span>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-white/5">
                  <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 mb-3">
                    {t('welcome.showcase3d.modal.techSpecs', 'Teknik Özellikler')}
                  </div>
                  <div className="space-y-1">
                    {view3D.specs.map((r) => (
                      <div key={r.k} className="flex items-center justify-between text-[12px] py-1.5 border-b border-white/5 last:border-0">
                        <span className="text-white/45 font-mono uppercase tracking-wider text-[10px]">{r.k}</span>
                        <span className="text-white/85 font-semibold text-right">{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-white/5">
                  <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/40 mb-3">
                    {t('welcome.showcase3d.modal.highlights', 'Öne Çıkan Özellikler')}
                  </div>
                  <ul className="space-y-1.5">
                    {view3D.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-white/70 leading-snug">
                        <CheckCircle2 size={13} className={`${view3D.text} mt-0.5 shrink-0`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto p-6 pt-4 flex flex-col gap-2 border-t border-white/5 bg-black/20">
                  <button
                    onClick={() => { setView3D(null); navigate('/diamond'); }}
                    className="w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-black tracking-wide hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                  >
                    {t('welcome.showcase3d.modal.exploreBtn', 'Katalogda Keşfet')} <ArrowRight size={14} />
                  </button>
                  <button
                    onClick={() => setView3D(null)}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition-colors"
                  >
                    {t('welcome.showcase3d.modal.closeBtn', 'Kapat')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
