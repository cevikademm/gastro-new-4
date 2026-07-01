/**
 * PREMIUM GASTRO LANDING - MASTER EDITION
 * Optimized for B2B Bestsellers, KI Küchenplaner, and light-theme premium corporate design.
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BadgePercent,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Headphones,
  PackageCheck,
  Palette,
  PhoneCall,
  ShieldCheck,
  ShoppingBag,
  Clock,
  Sparkles,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react';

// Core Components & Stores
import { Navbar } from '../../components/Navbar';
import { Background3D } from '../../components/Background3D';
import type { ModelKey } from '../../components/landing/KitchenModelViewer';
const KitchenModelViewer = React.lazy(() => import('../../components/landing/KitchenModelViewer').then(m => ({ default: m.KitchenModelViewer })));
const ModelComparisonViewer = React.lazy(() => import('../../components/landing/KitchenModelViewer').then(m => ({ default: m.ModelComparisonViewer })));
import { AnnouncementBar } from '../../components/landing/sections/AnnouncementBar';
import { StatsBand } from '../../components/landing/sections/StatsBand';
import { FloatingWidgets } from '../../components/landing/sections/FloatingWidgets';
import { useCartStore } from '../../stores/cartStore';
import type { EquipmentItem } from '../../stores/equipmentStore';
import { useEquipmentStore } from '../../stores/equipmentStore';
import { isAccessory, resolveTopCategory } from '../../lib/categoryTaxonomy';

// New Sections
import { CategoryBubbles } from '../../components/landing/sections/CategoryBubbles';
import { TrustBar } from '../../components/landing/sections/TrustBar';
import { TopProductsCarousel } from '../../components/landing/sections/TopProductsCarousel';
import { DecorativeStrip } from '../../components/landing/sections/DecorativeStrip';
import { ProductReviews } from '../../components/landing/sections/ProductReviews';
import { SponsorsSection } from '../../components/landing/sections/SponsorsSection';
import { ProcessTimeline } from '../../components/landing/sections/ProcessTimeline';
import { PromoBanner } from '../../components/landing/sections/PromoBanner';
import { ProjectPopoutShowcase } from '../../components/landing/sections/ProjectPopoutShowcase';

const HERO_SLIDES = [
  {
    eyebrow: "DEUTSCHE QUALITÄTSSTANDARDS",
    title: "Professionelle Technik. Höchste Qualität.",
    accent: "Höchste Qualität",
    desc: "Premium-Hersteller wie Diamond, Rational & CombiSteel ab Lager lieferbar. B2B-Großküchenlösungen mit Bestpreisgarantie und deutschlandweitem Service.",
    primary: "JETZT ENTDECKEN",
    primaryHref: "#catalog",
    secondary: "ZUVERLÄSSIGE LIEFERUNG",
    secondaryHref: "#quote",
    preview: "/landing/img5_hero_banner.jpeg",
    stat: "5.000+",
    statLabel: "KUNDEN\nEUROPAWEIT"
  },
  {
    eyebrow: "KI KÜCHENPLANER 4.0",
    title: "Zukunft Großküchen. Intelligent geplant.",
    accent: "Intelligent geplant",
    desc: "Planen Sie Ihre Gastronomie-Küche digital in 3D mit unserer hochentwickelten Planungs-KI. Millimetergenau, transparent und in Rekordzeit.",
    primary: "KI PLANER STARTEN",
    primaryHref: "#chatbotSection",
    secondary: "PROZESS TIMELINE",
    secondaryHref: "#workflow",
    preview: "/landing/img2_zukunft_grossküchen.jpeg",
    stat: "24h",
    statLabel: "ANGEBOTS-\nENTWURF"
  },
  {
    eyebrow: "FINANZIERUNG & LEASING",
    title: "Premium Qualität. Flexibles Leasing.",
    accent: "Flexibles Leasing",
    desc: "Schonen Sie Ihre Liquidität mit flexiblen Leasinglaufzeiten bis 60 Monate. Sofortige Ratenberechnung und schnelle B2B-Abwicklung.",
    primary: "LEASING RECHNEN",
    primaryHref: "#leasingSection",
    secondary: "PRODUKTE SEHEN",
    secondaryHref: "#catalog",
    preview: "/landing/img3_qualitat.jpeg",
    stat: "0% Fin.",
    statLabel: "LEASING-OPTIONEN"
  }
];

// Full-bleed banner slides — exact designed JPEGs, shown 1:1 (no reconstruction)
const HERO_BANNER_RATIO = { w: 1600, h: 656 };

const HERO_BANNERS = [
  { src: "/landing/slider-1.jpg", alt: "Professionelle Technik. Minimalistisches Design.", href: "#catalog", w: 1600, h: 656 },
  { src: "/landing/slider-2.jpg", alt: "Professionelle Ausstattung für höchste Ansprüche.", href: "#catalog", w: 1600, h: 656 },
  { src: "/landing/slider-3.jpg", alt: "Höchstleistung in jedem Schritt.", href: "#catalog", w: 1600, h: 656 },
  { src: "/landing/slider-4.jpg", alt: "Die Zukunft professioneller Großküchen.", href: "#chatbotSection", w: 1600, h: 656 },
  { src: "/landing/slider-5.jpg", alt: "Alles aus einer Hand.", href: "#quote", w: 1600, h: 656 },
];

const HERO_VALUE_PROPS = [
  { value: "24h", label: "Preisangebot" },
  { value: "0€", label: "Planung bei Kauf" },
  { value: "60 Mon.", label: "Leasing" },
];

const CONCEPTS = [
  { id: "burger", name: "BURGER", image: "/landing/concepts/burger.webp", count: "5 ürün" },
  { id: "doener", name: "DÖNER", image: "/landing/concepts/doener.webp", count: "5 ürün" },
  { id: "pizza", name: "PIZZA", image: "/landing/concepts/pizza.webp", count: "5 ürün" },
  { id: "cafe", name: "CAFÉ", image: "/landing/concepts/cafe.webp", count: "10 ürün" },
  { id: "hotel", name: "HOTEL", image: "/landing/concepts/hotel.webp", count: "5 ürün" },
  { id: "catering", name: "CATERING", image: "/landing/concepts/catering.webp", count: "10 ürün" }
];

const CATALOG_CATEGORIES = [
  { id: "all", nameKey: "landing.master.catalog.categories.all" },
  { id: "cooking", nameKey: "landing.master.catalog.categories.cooking" },
  { id: "cooling", nameKey: "landing.master.catalog.categories.cooling" },
  { id: "dishwash", nameKey: "landing.master.catalog.categories.dishwash" },
  { id: "pizza_pasta", nameKey: "landing.master.catalog.categories.pizzaPasta" },
  { id: "prep_hygiene", nameKey: "landing.master.catalog.categories.prepHygiene" },
  { id: "dynamic_prep", nameKey: "landing.master.catalog.categories.dynamicPrep" }
];

const PROJECT_PACKAGES = [
  {
    id: "pizza",
    badge: "Meist angefragt",
    title: "Pizza Starter Paket",
    segment: "Pizzeria & Take-away",
    image: "/landing/concepts/pizza.webp",
    price: 12270,
    monthly: 235,
    delivery: "ab 24-48h versandbereit",
    productIds: ["pizza-oven", "mix-80", "refrig-counter"],
    includes: ["2-Kammer Pizzaofen", "80 kg Spiral-Kneter", "Kühltisch mit Aufkantung"],
  },
  {
    id: "burger",
    badge: "Schneller ROI",
    title: "Burger Line Paket",
    segment: "Burger, Fried Chicken",
    image: "/landing/concepts/burger.webp",
    price: 13070,
    monthly: 251,
    delivery: "kompakt geplant",
    productIds: ["fryer-double", "icombi-xs", "refrig-counter"],
    includes: ["Doppelfritteuse", "Rational iCombi XS", "2-türiger Kühltisch"],
  },
  {
    id: "cafe",
    badge: "Bar Umsatz",
    title: "Café & Bar Paket",
    segment: "Café, Bar, Bistro",
    image: "/landing/concepts/cafe.webp",
    price: 3670,
    monthly: 70,
    delivery: "lagernde Bestseller",
    productIds: ["ice-maker", "bottle-cooler", "cool-showcase"],
    includes: ["Eiswürfelbereiter", "Flaschenkühlschrank", "Kühlvitrine"],
  },
];

const SALES_PROOF = [
  { icon: Clock, value: "24h", label: "Angebot & Rückruf", desc: "Projektberater prüft Liste und Bedarf." },
  { icon: BadgePercent, value: "bis 60 Mon.", label: "Leasing", desc: "Monatliche Rate direkt sichtbar." },
  { icon: ShieldCheck, value: "CE + Service", label: "Sichere Auswahl", desc: "Montage, Wartung und Ersatzteile." },
];

const APPLIANCE_TABS: Array<{
  id: 'mixer' | 'ice';
  labelKey: string;
  titleKey: string;
  descKey: string;
  image: string;
  normalLabelKey: string;
  cutawayLabelKey: string;
  normalModel: ModelKey;
  cutawayModel: ModelKey;
}> = [
  {
    id: 'mixer',
    labelKey: 'landing.master.inspection.appliances.mixer.label',
    titleKey: 'landing.master.inspection.appliances.mixer.title',
    descKey: 'landing.master.inspection.appliances.mixer.desc',
    image: '/landing/products/spiral-mixer.webp',
    normalLabelKey: 'landing.master.inspection.appliances.mixer.normalLabel',
    cutawayLabelKey: 'landing.master.inspection.appliances.mixer.cutawayLabel',
    normalModel: 'mixerNormal',
    cutawayModel: 'mixerCutaway',
  },
  {
    id: 'ice',
    labelKey: 'landing.master.inspection.appliances.ice.label',
    titleKey: 'landing.master.inspection.appliances.ice.title',
    descKey: 'landing.master.inspection.appliances.ice.desc',
    image: '/landing/products/ice-maker.webp',
    normalLabelKey: 'landing.master.inspection.appliances.ice.normalLabel',
    cutawayLabelKey: 'landing.master.inspection.appliances.ice.cutawayLabel',
    normalModel: 'iceNormal',
    cutawayModel: 'iceCutaway',
  },
];

// Expanded 10 B2B Products Database conforming to EquipmentItem shape
const LANDING_PRODUCTS: EquipmentItem[] = [
  {
    id: "promo-1euro",
    name: "1 € Aktionsprodukt",
    desc: "Sadece 1 Euro! Sipariş ve ödeme akışını denemek için özel kampanya ürünü. Sepete ekleyip hızlıca satın alabilirsiniz.",
    cat: "cooking",
    sub: "Kampanya",
    fam: "Promo",
    img: "https://placehold.co/600x400/dc2626/ffffff?text=1+%E2%82%AC",
    brand: "2MC Gastro",
    l: 0,
    w: 0,
    h: "0",
    kw: 0,
    price: 1,
    line: "Kampanya"
  },
  {
    id: "icombi-xs",
    name: "Rational iCombi Pro XS Kombidämpfer",
    desc: "Yoğun mutfaklarda buharda pişirme, kızartma ve fırınlama işlerini tek bir cihazda birleştiren, otomatik temizlikli premium akıllı fırın.",
    cat: "cooking",
    sub: "Kombidämpfer",
    fam: "Fırınlar",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/50418/conversions/SBET-XC-22-big.jpg",
    brand: "Rational",
    l: 655,
    w: 621,
    h: "567",
    kw: 5.7,
    price: 9890,
    line: "Pro"
  },
  {
    id: "refrig-counter",
    name: "Kühltisch 2-türig mit Aufkantung",
    desc: "Tezgah üstü hazırlık alanı sağlayan, paslanmaz çelikten üretilmiş, dijital kontrollü 2 kapılı endüstriyel soğutucu tezgah.",
    cat: "cooling",
    sub: "Kühltische",
    fam: "Soğutucular",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/57188/conversions/001DT274-R2%2B5-big.jpg",
    brand: "CombiSteel",
    l: 1200,
    w: 700,
    h: "850",
    kw: 0.35,
    price: 1890,
    line: "Premium"
  },
  {
    id: "fryer-double",
    name: "Fritteuse 2x 12 Liter Elektrisch",
    desc: "Burger ve çıtır tavuk restoranları için çift hazneli, emniyet termostatlı ve soğuk bölge teknolojili profesyonel elektrikli fritöz.",
    cat: "cooking",
    sub: "Fritteusen",
    fam: "Pişiriciler",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/75472/conversions/001-E22-F23CFSA4-AC-big.jpg",
    brand: "CombiSteel",
    l: 800,
    w: 700,
    h: "900",
    kw: 15.0,
    price: 1290,
    line: "Master"
  },
  {
    id: "pizza-oven",
    name: "Pizzaofen 2-Kammer für 9x Pizza",
    desc: "Ateş tuğlalı pişirme tabanına sahip, bağımsız alt-üst termostat kontrollü, çift katlı endüstriyel pizza pişirme fırını.",
    cat: "pizza_pasta",
    sub: "Pizzaöfen",
    fam: "Fırınlar",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/12048385/conversions/001-LFD-18L-LX-big.jpg",
    brand: "Modular",
    l: 1150,
    w: 1050,
    h: "750",
    kw: 12.0,
    price: 3490,
    line: "Industrial"
  },
  {
    id: "dishwasher-hood",
    name: "Haubenspülmaschine mit Spültisch",
    desc: "Restoran ve otel bulaşıkhaneleri için tasarlanmış, giriş-çıkış tezgahlarıyla entegre çalışan yüksek hızlı giyotin bulaşık makinesi.",
    cat: "dishwash",
    sub: "Spülmaschinen",
    fam: "Yıkama",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/73407/conversions/001-DCR49-6-AC-RC-big.jpg",
    brand: "Diamond",
    l: 1400,
    w: 755,
    h: "1540",
    kw: 9.5,
    price: 2790,
    line: "Classic"
  },
  {
    id: "ss-table",
    name: "Edelstahltisch mit Grundboden",
    desc: "Ayarlanabilir rotil ayaklı, arka tarafında 60 mm duvar koruma sacı bulunan, AISI 304 sınıfı paslanmaz çalışma tezgahı.",
    cat: "prep_hygiene",
    sub: "Arbeitstische",
    fam: "Paslanmaz",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/11881518/conversions/001-WR-TXT0-20-big.jpg",
    brand: "Diamond",
    l: 1200,
    w: 600,
    h: "850",
    kw: 0,
    price: 369,
    line: "Eco"
  },
  {
    id: "mix-80",
    name: "Spiral Mikser 80 kg",
    desc: "Yoğun fırın ve pizzacı ihtiyaçları için dayanıklı gövdeye ve çift devirli paslanmaz kazana sahip endüstriyel hamur hazırlama ünitesi.",
    cat: "dynamic_prep",
    sub: "Teigknetmaschinen",
    fam: "Hazırlık",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/62571/conversions/001-PSB2-big.jpg",
    brand: "Diamond",
    l: 950,
    w: 580,
    h: "1050",
    kw: 2.2,
    price: 4290,
    line: "Heavy Duty"
  },
  {
    id: "cool-showcase",
    name: "Dikey Teşhir Dolabı",
    desc: "Market, kafe ve pastaneler için cam yüzey alanı artırılmış, homojen soğutma ve LED aydınlatmaya sahip premium içecek/pasta dolabı.",
    cat: "cooling",
    sub: "Vitrinler",
    fam: "Soğutucular",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/76419/conversions/001-AD2N-H2G-R2-big.jpg",
    brand: "Eco-Cool",
    l: 700,
    w: 700,
    h: "1900",
    kw: 0.45,
    price: 1590,
    line: "Luxury"
  },
  {
    id: "ice-maker",
    name: "Profesyonel Buz Makinesi",
    desc: "Kafeterya, otel barları ve restoranlar için günlük küp buz ihtiyacını karşılayan, su tasarruflu kompakt paslanmaz buz jeneratörü.",
    cat: "cooling",
    sub: "Eiswürfelbereiter",
    fam: "Buz Makineleri",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/71318/conversions/001-ICE300MA-big.jpg",
    brand: "Gastro-Line",
    l: 500,
    w: 580,
    h: "800",
    kw: 0.38,
    price: 1190,
    line: "Kompakt"
  },
  {
    id: "bottle-cooler",
    name: "Şişe Soğutucu Dolap",
    desc: "Tezgah altı kullanıma uygun, çift sürgülü temperli cam kapılı, yüksek iç hacimli ve sessiz çalışan içecek muhafaza dolabı.",
    cat: "cooling",
    sub: "Flaschenkühlschränke",
    fam: "Soğutucular",
    img: "https://diamond-eu-prod.s3.eu-central-1.amazonaws.com/media/11810574/conversions/001-RLB4-4G-big.jpg",
    brand: "Polaris",
    l: 900,
    w: 520,
    h: "900",
    kw: 0.28,
    price: 890,
    line: "Bar"
  }
];

export function LandingPage() {
  const { t } = useTranslation();
  const [showOverlay] = useState(false);

  // Cart integration
  const { items: cartItems, addItem, removeItem, isInCart } = useCartStore();

  // Slider State
  const [currentSlide, setCurrentSlide] = useState(0);

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<Array<{ text: string; isUser: boolean; isTyping?: boolean }>>([
    { text: "Ich möchte einen Burgerladen mit ca. 80m² eröffnen.", isUser: true },
    { text: "Wie viele Sitzplätze planen Sie?", isUser: false },
    { text: "Ca. 40 Sitzplätze", isUser: true }
  ]);
  const [chatStep, setChatStep] = useState(2);

  // Leasing State
  const [leasingValue, setLeasingValue] = useState(82450);
  const [leasingMonths, setLeasingMonths] = useState(60);

  // Catalog Filters State
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Before/After Slider Refs
  const sliderRef = useRef<HTMLDivElement>(null);
  const sliderFrameRef = useRef<number | null>(null);
  const [sliderPercentage, setSliderPercentage] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [inspection3dReady, setInspection3dReady] = useState(false);
  const [activeAppliance, setActiveAppliance] = useState<'mixer' | 'ice'>('mixer');
  const [viewMode, setViewMode] = useState<'normal' | 'cutaway' | 'compare'>('normal');

  // RFQ Form State
  const [projectName, setProjectName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [projectSegment, setProjectSegment] = useState("");
  const [projectNote, setProjectNote] = useState("");
  const [formMsg, setFormMsg] = useState({ text: "", isSuccess: false });

  // Hero Auto Advance
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval) return;
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % HERO_BANNERS.length);
      }, 6500);
    };

    const stop = () => {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    };

    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (sliderFrameRef.current) {
        window.cancelAnimationFrame(sliderFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || inspection3dReady) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInspection3dReady(true);
        observer.disconnect();
      },
      { rootMargin: '500px 0px', threshold: 0.01 }
    );

    observer.observe(slider);
    return () => observer.disconnect();
  }, [inspection3dReady]);

  // Chatbot Message Flow Data
  const chatFlow: Record<number, { botMsg: string; options: Array<{ text: string; nextStep: number; action?: string }> }> = {
    1: {
      botMsg: "Klingt spannend! Wie viele Sitzplätze planen Sie für Ihren Burgerladen?",
      options: [
        { text: "Ca. 40 Sitzplätze", nextStep: 2 },
        { text: "Ca. 80 Sitzplätze", nextStep: 3 },
        { text: "Nur Take-away (Keine Sitzplätze)", nextStep: 4 }
      ]
    },
    2: {
      botMsg: "Perfekt. Für ca. 40 Sitzplätze (80m²) empfehlen wir ein kompaktes Küchenlayout mit einer elektrischen Fritteuse, einem Rational Kombidämpfer und einem zweitürigen Kühltisch. Möchten Sie die Geräte auflisten?",
      options: [
        { text: "Ja, Geräte auflisten", nextStep: 5, action: "filter-burger-compact" },
        { text: "Wie läuft der Prozess ab?", nextStep: 6 }
      ]
    },
    3: {
      botMsg: "Großartig, ein anspruchsvolles Projekt! Für diese Kapazität empfehlen wir einen zweietagigen Pizzaofen, eine Haubenspülmaschine, einen Spiralkneter und mehrere Kühltische. Möchten Sie die Geräte ansehen?",
      options: [
        { text: "Ja, Geräte anzeigen", nextStep: 5, action: "filter-burger-large" },
        { text: "Über den Prozess informieren", nextStep: 6 }
      ]
    },
    4: {
      botMsg: "Für das Take-away Modell ist Platzeinsparung entscheidend. Ein Rational iCombi Pro XS Ofen und kompakte Tisch-Flaschenkühlschränke bieten Ihnen maximale Effizienz. Soll ich die Geräte filtern?",
      options: [
        { text: "Ja, filtern", nextStep: 5, action: "filter-takeaway" },
        { text: "Andere Optionen anzeigen", nextStep: 1 }
      ]
    },
    5: {
      botMsg: "Hervorragend! Ich habe die passenden Geräte im Produktkatalog unten aufgelistet und gefiltert. Sie können die gewünschten Geräte mit einem Klick zu Ihrer B2B-Angebotsliste hinzufügen. Haben Sie weitere Fragen?",
      options: [
        { text: "Neu planen", nextStep: 1, action: "reset-filters" },
        { text: "Finanzierungsdetails anzeigen", nextStep: 7 }
      ]
    },
    6: {
      botMsg: "Sehr einfach! Wir arbeiten in drei Schritten: 1. Sie laden Ihren Grundriss hoch, 2. Unsere KI analysiert den Raum, 3. Wir erstellen ein 3D-Design und Preisangebot. Sie können direkt Ihren Grundriss hochladen, um zu starten!",
      options: [
        { text: "Neu planen", nextStep: 1 },
        { text: "Jetzt starten (Angebot anfordern)", nextStep: 8 }
      ]
    },
    7: {
      botMsg: "Selbstverständlich! Für die ausgewählten Geräte können wir eine Finanzierung mit niedrigen monatlichen Leasingraten berechnen. Details finden Sie unten im Bereich 'Finanzierung'.",
      options: [
        { text: "Neu planen", nextStep: 1 }
      ]
    },
    8: {
      botMsg: "Hervorragende Entscheidung! Bitte senden Sie Ihre Projektdaten über das Formular unten. Unsere Berater aus der Kölner Zentrale werden sich innerhalb von 24 Stunden bei Ihnen melden.",
      options: [
        { text: "Neu planen", nextStep: 1 }
      ]
    }
  };

  const handleChatOption = (option: { text: string; nextStep: number; action?: string }) => {
    // Add user message
    setChatMessages((prev) => [...prev, { text: option.text, isUser: true }]);

    // Add typing indicator
    setChatMessages((prev) => [...prev, { text: "", isUser: false, isTyping: true }]);

    if (option.action) {
      if (option.action === "filter-burger-compact") {
        setSelectedCategory("all");
        setSearchQuery("friteuse");
      } else if (option.action === "filter-burger-large") {
        setSelectedCategory("all");
        setSearchQuery("pizza");
      } else if (option.action === "filter-takeaway") {
        setSelectedCategory("all");
        setSearchQuery("icombi");
      } else if (option.action === "reset-filters") {
        setSelectedCategory("all");
        setSearchQuery("");
      }
    }

    setTimeout(() => {
      // Remove typing bubble and add real response
      setChatMessages((prev) => {
        const filtered = prev.filter(m => !m.isTyping);
        const nextBotText = chatFlow[option.nextStep] ? chatFlow[option.nextStep].botMsg : "Wie kann ich helfen?";
        return [...filtered, { text: nextBotText, isUser: false }];
      });
      setChatStep(option.nextStep);
    }, 1200);
  };

  // Leasing Calculation
  const monthlyLeasingRate = Math.round((leasingValue * 1.15) / leasingMonths);
  const quoteNetTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity * (item.product.price || 0), 0),
    [cartItems]
  );
  const quoteGrossTotal = Math.round(quoteNetTotal * 1.19);
  const quoteMonthlyRate = quoteNetTotal > 0 ? Math.round((quoteNetTotal * 1.15) / 60) : 0;

  // Ana sayfa kataloğu: gerçek üründen, yalnızca ÖNEMLİ (≥ €1500) cihazlar.
  // Önemsiz/ucuz parçalar, aksesuarlar ve fiyatsız ürünler ana sayfada listelenmez.
  const allEquip = useEquipmentStore((s) => s.allItems);
  const HOME_MIN_PRICE = 1500;
  const catalogPool = useMemo(
    () =>
      allEquip
        .filter((i) => !isAccessory(i) && (i.price || 0) >= HOME_MIN_PRICE && !!i.img)
        .sort((a, b) => (b.price || 0) - (a.price || 0)),
    [allEquip]
  );
  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const list = catalogPool.filter((prod) => {
      const catMatch = selectedCategory === "all" || resolveTopCategory(prod) === selectedCategory;
      const queryMatch = !query ||
        prod.name.toLowerCase().includes(query) ||
        prod.id.toLowerCase().includes(query) ||
        (prod.desc || "").toLowerCase().includes(query);
      return catMatch && queryMatch;
    });
    // "Tümü" görünümünde kategori çeşitliliği: her kategoriden en pahalıdan başlayarak
    // round-robin — tek bir kategorinin (örn. çamaşırhane devleri) listeyi kaplaması önlenir.
    if (selectedCategory === "all" && !query) {
      const byCat = new Map<string, EquipmentItem[]>();
      for (const p of list) {
        const c = resolveTopCategory(p) || "other";
        (byCat.get(c) ?? byCat.set(c, []).get(c)!).push(p);
      }
      const buckets = [...byCat.values()]; // her biri zaten fiyat-azalan (pool sıralı)
      const out: EquipmentItem[] = [];
      let i = 0;
      while (out.length < 24 && buckets.some((b) => b.length)) {
        const bucket = buckets[i % buckets.length];
        if (bucket.length) out.push(bucket.shift()!);
        i++;
      }
      return out;
    }
    return list;
  }, [catalogPool, searchQuery, selectedCategory]);

  // Mobil kategori şeridi — görünür olunca bir kez yana kayma ipucu ver
  // (kullanıcıya "kaydırılabilir" olduğunu gösterir). Masaüstünde dikey liste.
  const catScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = catScrollRef.current;
    if (!el || window.matchMedia('(min-width: 1024px)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let done = false;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || done) return;
      done = true;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 8) return;
      const hint = Math.min(96, max);
      const t0 = performance.now();
      const dur = 1100;
      const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        // 0 → hint → 0 (gidiş-dönüş)
        const tri = p < 0.5 ? ease(p / 0.5) : ease((1 - p) / 0.5);
        el.scrollLeft = hint * tri;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Slider slideTo handler
  const handleSliderMove = (clientX: number) => {
    const slider = sliderRef.current;
    if (!slider) return;

    if (sliderFrameRef.current) {
      window.cancelAnimationFrame(sliderFrameRef.current);
    }

    sliderFrameRef.current = window.requestAnimationFrame(() => {
      const rect = slider.getBoundingClientRect();
      const x = clientX - rect.left;
      let pct = (x / rect.width) * 100;
      if (pct < 0) pct = 0;
      if (pct > 100) pct = 100;
      setSliderPercentage(pct);
      sliderFrameRef.current = null;
    });
  };

  // Add product group quick filter
  const handleConceptFilter = (groupId: string) => {
    const filters: Record<string, { category: string; query: string }> = {
      ovens: { category: "cooking", query: "icombi" },
      cooling: { category: "cooling", query: "kühltisch" },
      mixers: { category: "dynamic_prep", query: "mikser" },
      dishwash: { category: "dishwash", query: "spülmaschine" },
      ice_makers: { category: "cooling", query: "buz" },
      displays: { category: "cooling", query: "vitrin" },
      pizza: { category: "pizza_pasta", query: "pizza" }
    };
    const next = filters[groupId] ?? { category: "all", query: "" };
    setSelectedCategory(next.category);
    setSearchQuery(next.query);

    // Scroll to catalog section
    const catalogSec = document.querySelector("#catalog");
    if (catalogSec) {
      catalogSec.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handlePackageSelect = (pack: typeof PROJECT_PACKAGES[number]) => {
    pack.productIds.forEach((productId) => {
      const product = LANDING_PRODUCTS.find((item) => item.id === productId);
      if (product && !isInCart(product.id)) {
        addItem(product);
      }
    });

    const firstProduct = LANDING_PRODUCTS.find((item) => item.id === pack.productIds[0]);
    setSelectedCategory(firstProduct?.cat || "all");
    setSearchQuery("");

    const quoteSec = document.querySelector("#quote");
    if (quoteSec) {
      quoteSec.scrollIntoView({ behavior: "smooth" });
    }
  };

  // RFQ Form handler
  const handleRfqSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      setFormMsg({ text: t('landing.master.quote.form.errorNoItems'), isSuccess: false });
      return;
    }
    if (!projectName || !projectSegment || (!contactPhone && !contactEmail)) {
      setFormMsg({ text: t('landing.master.quote.form.errorMissingFields'), isSuccess: false });
      return;
    }
    setFormMsg({ text: t('landing.master.quote.form.success', { name: projectName }), isSuccess: true });
    setTimeout(() => {
      setProjectName("");
      setContactPhone("");
      setContactEmail("");
      setProjectSegment("");
      setProjectNote("");
      setFormMsg({ text: "", isSuccess: false });
    }, 6000);
  };

  const heroBanner = HERO_BANNERS[currentSlide];
  const appliance = APPLIANCE_TABS.find((tab) => tab.id === activeAppliance) ?? APPLIANCE_TABS[0];
  const goToPreviousSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_BANNERS.length) % HERO_BANNERS.length);
  };
  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_BANNERS.length);
  };

  return (
    <div className="landing-page relative text-[#0F2440] bg-[#FAFAFA] selection:bg-brand-red selection:text-white min-h-screen">

      {/* 1. Global 3D Background */}
      <Background3D />

      {/* 2. Loading Overlay */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-4"
            >
               <div className="w-12 h-12 border-t-2 border-brand-red rounded-full animate-spin shadow-[0_0_15px_rgba(220,38,38,0.35)]" />
               <span className="text-xl font-display font-bold tracking-tighter text-[#0F2440] uppercase">2MC GASTRO</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <AnnouncementBar />
        <Navbar />

        <main className="relative z-10 pt-[108px] bg-white">

          {/* Compact category rail: visible above the slider without overlapping it. */}
          <CategoryBubbles onSelectConcept={handleConceptFilter} />

          {/* Hero Banner Slider — full-bleed designed banners (1:1 with source JPEGs) */}
          <section id="hero" className="relative z-30 mb-8 w-full overflow-x-clip overflow-y-visible bg-[#0F2440] border-b border-slate-200/5 sm:mb-12 lg:mb-16">
            <div
              className="relative w-full min-h-[170px] overflow-visible bg-[#0F2440] bg-cover bg-center sm:min-h-0"
              style={{
                aspectRatio: `${HERO_BANNER_RATIO.w} / ${HERO_BANNER_RATIO.h}`,
                backgroundImage: `url(${heroBanner.src})`,
              }}
            >
              <AnimatePresence mode="sync">
                <motion.a
                  key={currentSlide}
                  href={heroBanner.href}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  className="absolute inset-0 block overflow-visible"
                >
                  <img
                    src={heroBanner.src}
                    alt={heroBanner.alt}
                    className="w-full h-full object-cover object-center"
                    fetchPriority="high"
                    loading="eager"
                    decoding="async"
                  />
                </motion.a>
              </AnimatePresence>

              <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-50 flex items-center justify-between px-3 sm:px-5 lg:px-8">
                <button
                  type="button"
                  onClick={goToPreviousSlide}
                  className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-white/65 bg-white/55 text-[#0F2440] shadow-[0_16px_34px_-24px_rgba(15,36,64,0.8)] backdrop-blur-md transition-all duration-300 hover:-translate-x-0.5 hover:border-white hover:bg-white/90 hover:text-brand-red focus-visible:bg-white sm:h-11 sm:w-11"
                  aria-label={t('landing.master.hero.prevBanner')}
                >
                  <ChevronLeft size={18} strokeWidth={2.4} />
                </button>
                <button
                  type="button"
                  onClick={goToNextSlide}
                  className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-white/65 bg-white/55 text-[#0F2440] shadow-[0_16px_34px_-24px_rgba(15,36,64,0.8)] backdrop-blur-md transition-all duration-300 hover:translate-x-0.5 hover:border-white hover:bg-white/90 hover:text-brand-red focus-visible:bg-white sm:h-11 sm:w-11"
                  aria-label={t('landing.master.hero.nextBanner')}
                >
                  <ChevronRight size={18} strokeWidth={2.4} />
                </button>
              </div>

              {/* Navigation dots + progress */}
              <div className="absolute bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-5 sm:bottom-5">
                <div className="flex gap-2.5">
                  {HERO_BANNERS.map((banner, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${currentSlide === idx ? "w-8 bg-brand-red shadow-[0_0_10px_rgba(220,38,38,0.6)]" : "w-2 bg-white/60 hover:bg-white"}`}
                      aria-label={t('landing.master.hero.bannerDot', { index: idx + 1, alt: banner.alt })}
                    />
                  ))}
                </div>
                <div className="hidden sm:block w-[160px] h-[3px] bg-white/20 rounded overflow-hidden">
                  <motion.div
                    key={currentSlide}
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 6.5, ease: "linear" }}
                    className="h-full bg-brand-red"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Trust Factors Banner Section */}
          <TrustBar />

          {/* 6. Ürün Kategori Grid (Catalog Section) */}
          <section id="catalog" className="py-8 bg-[#FAFAFA] text-[#0F2440] relative z-10">
            <div className="lp-container">
              <div className="flex flex-col md:flex-row justify-between md:items-end mb-4 gap-6 text-left">
                <div>
                  <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[9px] tracking-[0.3em] uppercase mb-2">
                    <span className="w-6 h-px bg-brand-red" />
                    {t('landing.master.catalog.eyebrow')}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-[#0F2440] tracking-tight">
                    {t('landing.master.catalog.headingLead')} <span className="text-brand-red">{t('landing.master.catalog.headingAccent')}</span>
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">{t('landing.master.catalog.subtitle')}</p>
                </div>
                <a href="/magaza" className="text-xs font-bold uppercase tracking-[0.2em] text-[#0F2440] hover:text-brand-red transition-all cursor-pointer">
                  {t('landing.master.catalog.viewAll')} &gt;
                </a>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] gap-5 items-start lg:items-stretch">

                {/* Catalog Sidebar */}
                <aside className="lg:h-full lg:flex lg:flex-col bg-white border border-slate-200 p-4 rounded-xl shadow-[0_1px_2px_rgba(15,36,64,0.04)] text-left lg:sticky lg:top-28">
                  <div className="relative mb-3">
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('landing.master.catalog.searchPlaceholder')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-[10px] outline-none focus:border-brand-red transition-colors"
                    />
                  </div>

                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                    <span>{t('landing.master.catalog.categoriesLabel')}</span>
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px]">{t('landing.master.catalog.devicesCount', { count: filteredProducts.length })}</span>
                  </div>

                  <div
                    ref={catScrollRef}
                    className="flex lg:flex-col gap-1.5 lg:gap-1 overflow-x-auto lg:overflow-visible snap-x lg:snap-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1 lg:mx-0 lg:px-0 pb-1 lg:pb-0"
                  >
                    {CATALOG_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`shrink-0 lg:shrink lg:w-full snap-start whitespace-nowrap text-left text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${selectedCategory === cat.id ? "bg-brand-red/10 border border-brand-red/25 text-brand-red" : "border border-slate-200 lg:border-transparent text-slate-600 hover:bg-slate-50"}`}
                      >
                        {t(cat.nameKey)}
                      </button>
                    ))}
                  </div>

                  <div className="hidden lg:block border-t border-slate-100 pt-3 mt-3">
                    <h4 className="text-[10px] font-bold text-[#0F2440] mb-2 uppercase tracking-wider">{t('landing.master.catalog.technicianNotes')}</h4>
                    <ul className="space-y-1.5 text-[10px] text-slate-500">
                      {[
                        t('landing.master.catalog.notes.specs'),
                        t('landing.master.catalog.notes.compatibility'),
                        t('landing.master.catalog.notes.oneClick'),
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <BadgeCheck size={11} className="text-brand-red shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 lg:mt-auto rounded-xl bg-[#0F2440] p-3 text-white overflow-hidden relative border border-white/10">
                    <div className="absolute inset-x-0 top-0 h-1 bg-brand-red" />
                    <Headphones size={14} className="text-brand-red mb-1" />
                    <h4 className="font-display text-[13px] font-black leading-tight">{t('landing.master.catalog.advisorCard.title')}</h4>
                    <p className="mt-1 text-[9px] leading-relaxed text-white/65">{t('landing.master.catalog.advisorCard.desc')}</p>
                    <a href="#quote" className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.16em] text-[#0F2440] transition-all hover:bg-brand-red hover:text-white">
                      {t('landing.master.catalog.advisorCard.cta')}
                      <PhoneCall size={11} />
                    </a>
                  </div>
                </aside>
 
                {/* 5-Column Products Grid */}
                <div className="min-w-0">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {filteredProducts.slice(0, 8).map((prod) => {
                      const added = isInCart(prod.id);
                      return (
                        <div key={prod.id} className="h-full min-h-[300px] bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-brand-red/40 hover:shadow-[0_10px_25px_rgba(220,38,38,0.06)] transition-all duration-300 flex flex-col group relative">
 
                           {/* Image area with Brand & Status Badges (Compacted height h-24) */}
                           <div className="h-36 sm:h-44 bg-white border-b border-slate-100 p-3 flex items-center justify-center overflow-hidden relative">
                             {/* Brand Badge */}
                             <span className="absolute top-1.5 left-1.5 bg-[#0F2440]/5 border border-[#0F2440]/10 px-1.5 py-0.5 rounded text-[7px] font-bold text-[#0F2440] uppercase tracking-wider">
                               {prod.brand}
                             </span>
                             
                             {/* Bestseller Badge */}
                             {prod.price > 3000 && (
	                               <span className="absolute top-1.5 right-1.5 bg-brand-red text-white px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider shadow-[0_2px_4px_rgba(220,38,38,0.2)]">
                                 {t('landing.master.catalog.card.topBadge')}
                               </span>
                             )}
                             
                             <img src={prod.img} alt={prod.name} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500" loading="lazy" decoding="async" />
                           </div>
 
                           {/* Body area */}
                           <div className="p-3 flex-grow flex flex-col justify-between text-left">
                             <div>
                               <div className="flex justify-between items-center mb-0.5">
	                                 <span className="text-[8px] font-bold text-brand-red uppercase tracking-[0.18em]">{prod.sub}</span>
	                                 <span className="flex items-center gap-0.5 text-[8px] text-emerald-600 font-bold">
                                   <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                                   {t('common.inStock')}
                                 </span>
                               </div>
	                               <h3 className="text-[12px] sm:text-[13px] font-bold text-[#0F2440] leading-snug line-clamp-2 mb-2 min-h-[32px] group-hover:text-brand-red transition-colors">{prod.name}</h3>
                               
                               <div className="mt-2 flex items-baseline gap-1.5">
                                 <span className="text-xl sm:text-2xl font-display font-black text-[#0F2440] leading-tight">€ {prod.price.toLocaleString("de-DE")}</span>
                                 <span className="text-[9px] font-medium text-slate-400">{t('landing.master.catalog.card.net')}</span>
                               </div>
                               <div className="mt-1 text-[9px] font-bold text-slate-500">{t('landing.master.catalog.card.leasing')} <span className="text-brand-red">{t('landing.master.catalog.card.perMonth', { amount: Math.round((prod.price * 1.15) / 60) })}</span></div>
                             </div>
 
                             <button
                               onClick={() => {
                                 if (added) {
                                   removeItem(prod.id);
                                 } else {
                                   addItem(prod);
                                 }
                               }}
			                              className={`w-full py-2.5 rounded-lg text-[9px] font-bold tracking-[0.1em] uppercase transition-colors cursor-pointer border inline-flex items-center justify-center gap-1.5 ${added ? "bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200" : "bg-brand-red border-brand-red text-white hover:bg-[#B91C1C]"}`}
                            >
                              {added && <BadgeCheck size={12} />}
                              {added ? t('landing.master.catalog.card.inQuote') : t('landing.master.catalog.card.addToQuote')}
                            </button>
                           </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </section>

          {/* 8. KI Küchenplaner Section */}
          <section className="py-8 bg-[#FAFAFA] border-b border-slate-200 relative z-20" id="chatbotSection">
            <div className="lp-container">
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center max-w-[1400px] mx-auto w-full">

                {/* Left Side: Text and Statistics */}
                <div className="lg:col-span-5 xl:col-span-4 text-left flex flex-col justify-center">
                  <span className="inline-flex items-center gap-2 text-brand-red font-black text-[11px] tracking-[0.3em] uppercase mb-4">
                    {t('landing.master.planner.eyebrow')}
                    <Sparkles size={14} className="text-brand-red" />
                  </span>
                  <h2 className="text-4xl md:text-[3.35rem] font-display font-bold text-[#0F2440] tracking-tight leading-[1.05] mb-5">
                    {t('landing.master.planner.headingLead')} <span className="text-brand-red">{t('landing.master.planner.headingAccent')}</span>.
                  </h2>
                  <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-8 max-w-md">
                    {t('landing.master.planner.subtitle')}
                  </p>

                  <div>
                    <a href="#chatbotSection" className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-brand-red hover:bg-[#B91C1C] text-white text-[11px] font-black tracking-[0.18em] rounded-xl uppercase transition-all shadow-[0_12px_24px_-10px_rgba(220,38,38,0.6)] hover:-translate-y-0.5">
                      {t('landing.master.planner.cta')}
                      <ArrowRight size={15} />
                    </a>
                  </div>
                </div>

                {/* Right Side: only the auto-rotating 3D model — transparent, blends into the section */}
                <div className="lg:col-span-7 xl:col-span-8 relative h-[300px] lg:h-[400px] xl:h-[420px] flex items-center justify-center">
                  <React.Suspense fallback={
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="w-8 h-8 border-t-2 border-brand-red rounded-full animate-spin" />
                    </div>
                  }>
                    <KitchenModelViewer model="kitchenDraft" autoRotate alwaysActive transparent fitMargin={1.3} className="h-full w-full" />
                  </React.Suspense>
                </div>

              </div>

	            </div>
          </section>

          {/* 9. Top Products Carousel (NEW) */}
          <TopProductsCarousel />

          {/* 10. Ürünlerin 3D Görünen Penceresi */}
          <section id="inspection" className="py-24 bg-white border-y border-slate-200 relative z-10">
            <div className="lp-container">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">

                <div className="relative flex flex-col order-2">
                  <div className="relative z-30 mb-3 flex flex-wrap gap-2 justify-between items-center px-1 sm:absolute sm:left-3 sm:right-3 sm:top-3 sm:mb-0 sm:px-0">
                    <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
                      {APPLIANCE_TABS.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveAppliance(tab.id);
                            setSliderPercentage(50);
                          }}
                          className={`px-5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.16em] transition-all ${
                            activeAppliance === tab.id
                              ? 'bg-brand-red text-white shadow-md'
                              : 'text-slate-600 hover:text-[#0F2440]'
                          }`}
                        >
                          {t(tab.labelKey)}
                        </button>
                      ))}
                    </div>

                    {/* 3D view mode tabs */}
                    <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex gap-1">
                      {[
                        { id: "normal", label: t('landing.master.inspection.viewMode.normal') },
                        { id: "cutaway", label: t('landing.master.inspection.viewMode.cutaway') },
                        { id: "compare", label: t('landing.master.inspection.viewMode.compare') }
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setViewMode(mode.id as any)}
                          className={`text-[9px] font-bold px-3 py-2 rounded-lg transition-all cursor-pointer ${viewMode === mode.id ? "bg-brand-red text-white shadow-md" : "text-slate-600 hover:text-[#0F2440]"}`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3D Viewer Container */}
                  <div
                    ref={sliderRef}
                    className="relative w-full flex-1 min-h-[360px] overflow-hidden select-none"
                  >
                    {inspection3dReady ? (
                      <React.Suspense fallback={
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white">
                          <div className="w-8 h-8 border-t-2 border-brand-red rounded-full animate-spin" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.loading')}</span>
                        </div>
                      }>
                        {viewMode === "compare" ? (
                          <>
                            <ModelComparisonViewer
                              split={sliderPercentage}
                              normalModel={appliance.normalModel}
                              cutawayModel={appliance.cutawayModel}
                            />
                            {/* Slider Handler Bar */}
                            <div
                              className="absolute top-0 bottom-0 z-40 w-10 -translate-x-1/2 cursor-ew-resize touch-none"
                              style={{ left: `${sliderPercentage}%` }}
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsDraggingSlider(true);
                                handleSliderMove(e.clientX);
                                e.currentTarget.setPointerCapture(e.pointerId);
                              }}
                              onPointerMove={(e) => isDraggingSlider && handleSliderMove(e.clientX)}
                              onPointerUp={(e) => {
                                setIsDraggingSlider(false);
                                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                                  e.currentTarget.releasePointerCapture(e.pointerId);
                                }
                              }}
                              onPointerCancel={(e) => {
                                setIsDraggingSlider(false);
                                if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                                  e.currentTarget.releasePointerCapture(e.pointerId);
                                }
                              }}
                            >
                              <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-brand-red shadow-[0_0_10px_#DC2626]" />
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-brand-red border border-white flex items-center justify-center text-white text-xs font-bold pointer-events-none shadow-md">
                                ↔
                              </div>
                            </div>
                            <span className="absolute bottom-5 left-5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-700 z-30 uppercase tracking-widest">{t(appliance.normalLabelKey)}</span>
                            <span className="absolute bottom-5 right-5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-brand-red z-30 uppercase tracking-widest">{t(appliance.cutawayLabelKey)}</span>
                          </>
                        ) : viewMode === "normal" ? (
                          <KitchenModelViewer model={appliance.normalModel} autoRotate transparent className="w-full h-full scale-[0.9] translate-y-[8%]" />
                        ) : (
                          <KitchenModelViewer model={appliance.cutawayModel} autoRotate transparent className="w-full h-full scale-[0.9] translate-y-[8%]" />
                        )}
                      </React.Suspense>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-white">
                        <img
                          src={appliance.image}
                          alt={t(appliance.normalLabelKey)}
                          className="h-full w-full object-contain p-6"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Info & Tech table */}
                <div className="text-left order-1">
                  <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase mb-4">
                    <span className="w-6 h-px bg-brand-red" />
                    {t('landing.master.inspection.eyebrow')}
                  </span>
                  <h2 className="lp-h2 font-display font-bold text-[#0F2440] tracking-tight mb-4">
                    {t('landing.master.inspection.headingLead')} <span className="text-brand-red">{t('landing.master.inspection.headingAccent')}</span>
                  </h2>
                  <p className="mb-8 text-xs text-slate-500">{t('landing.master.inspection.subtitle')}</p>
                  <h3 className="text-2xl font-bold text-[#0F2440] mb-6">{t(appliance.titleKey)}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-8">
                    {t(appliance.descKey)} {t('landing.master.inspection.descSuffix')}
                  </p>

                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full table-fixed border-collapse">
                      <colgroup>
                        <col className="w-[31%] sm:w-[32%]" />
                        <col className="w-[32%] sm:w-[32%]" />
                        <col className="w-[37%] sm:w-[36%]" />
                      </colgroup>
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[10px] sm:text-xs">
                          <th className="px-2.5 py-2.5 sm:py-4 text-left uppercase tracking-wider sm:px-5">{t('landing.master.inspection.table.colComponent')}</th>
                          <th className="px-2.5 py-2.5 sm:py-4 text-left uppercase tracking-wider sm:px-5">{t('landing.master.inspection.table.colValue')}</th>
                          <th className="px-2.5 py-2.5 sm:py-4 text-left uppercase tracking-wider sm:px-5">{t('landing.master.inspection.table.colReport')}</th>
                        </tr>
                      </thead>
                      <tbody className="text-[10px] leading-snug text-slate-600 sm:text-xs sm:leading-normal">
                        <tr className="border-b border-slate-100">
                          <td className="break-words px-2.5 py-2.5 sm:py-4 font-bold text-[#0F2440] sm:px-5">{t('landing.master.inspection.table.housing.component')}</td>
                          <td className="break-words px-2.5 py-2.5 sm:py-4 sm:px-5">AISI 304 (V2A)</td>
                          <td className="break-words px-2.5 py-2.5 sm:py-4 font-bold text-emerald-600 sm:px-5">{t('landing.master.inspection.table.housing.report')}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="break-words px-2.5 py-2.5 sm:py-4 font-bold text-[#0F2440] sm:px-5">{t('landing.master.inspection.table.shaft.component')}</td>
                          <td className="break-words px-2.5 py-2.5 sm:py-4 sm:px-5">{t('landing.master.inspection.table.shaft.value')}</td>
                          <td className="break-words px-2.5 py-2.5 sm:py-4 font-bold text-emerald-600 sm:px-5">{t('landing.master.inspection.table.shaft.report')}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="break-words px-2.5 py-2.5 sm:py-4 font-bold text-[#0F2440] sm:px-5">{t('landing.master.inspection.table.motor.component')}</td>
                          <td className="break-words px-2.5 py-2.5 sm:py-4 sm:px-5">{t('landing.master.inspection.table.motor.value')}</td>
                          <td className="break-words px-2.5 py-2.5 sm:py-4 font-bold text-emerald-600 sm:px-5">{t('landing.master.inspection.table.motor.report')}</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="break-words px-2.5 py-2.5 sm:py-4 font-bold text-[#0F2440] sm:px-5">{t('landing.master.inspection.table.safety.component')}</td>
                          <td className="break-words px-2.5 py-2.5 sm:py-4 sm:px-5">{t('landing.master.inspection.table.safety.value')}</td>
                          <td className="break-words px-2.5 py-2.5 sm:py-4 sm:px-5">{t('landing.master.inspection.table.safety.report')}</td>
                        </tr>
                        <tr>
                          <td className="break-words px-2.5 py-2.5 sm:py-4 font-bold text-[#0F2440] sm:px-5">{t('landing.master.inspection.table.service.component')}</td>
                          <td className="break-words px-2.5 py-2.5 sm:py-4 sm:px-5">{t('landing.master.inspection.table.service.value')}</td>
                          <td className="break-words px-2.5 py-2.5 sm:py-4 sm:px-5">{t('landing.master.inspection.table.service.report')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </section>

          <ProjectPopoutShowcase />

          {/* 11. Decorative Strip (NEW) */}
          <DecorativeStrip />

          {/* 12. Product Reviews (NEW) */}
          <ProductReviews />

          {/* 13. Sponsors Section (NEW) */}
          <SponsorsSection />

          {/* 14. Process Timeline (NEW) */}
          <ProcessTimeline />

          {/* 15. Promo Banner (NEW) */}
          <PromoBanner />

          {/* 16. Leasing/Finanzierung Section */}
          <section className="py-24 bg-white relative z-10 border-b border-slate-200" id="leasingSection">
            <div className="lp-container">
              <div className="max-w-2xl mb-16 text-left">
                <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase mb-4">
                  <span className="w-6 h-px bg-brand-red" />
                  {t('landing.master.leasing.eyebrow')}
                </span>
                <h2 className="lp-h2 font-display font-bold text-[#0F2440] tracking-tight">
                  {t('landing.master.leasing.headingLead')} <span className="text-brand-red">{t('landing.master.leasing.headingAccent')}</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">

                {/* Form calculator */}
                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-[0_12px_36px_-12px_rgba(15,36,64,0.08)] flex flex-col text-left">
                  <h3 className="text-xl font-bold text-[#0F2440] mb-8">{t('landing.master.leasing.calcTitle')}</h3>

                  <div className="mb-6">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">{t('landing.master.leasing.projectValue')}</label>
                    <input
                      type="range"
                      min="10000"
                      max="250000"
                      step="5000"
                      value={leasingValue}
                      onChange={(e) => setLeasingValue(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-red"
                    />
                    <div className="text-3xl font-display font-bold text-[#0F2440] mt-3">€ {leasingValue.toLocaleString("de-DE")}</div>
                  </div>

                  <div className="mb-8">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Leasinglaufzeit</label>
                    <select
                      value={leasingMonths}
                      onChange={(e) => setLeasingMonths(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-xs font-bold outline-none cursor-pointer"
                    >
                      <option value="12">12 Monate</option>
                      <option value="24">24 Monate</option>
                      <option value="36">36 Monate</option>
                      <option value="48">48 Monate</option>
                      <option value="60">60 Monate</option>
                    </select>
                  </div>

                  <div className="bg-red-50/40 border border-brand-red/10 p-5 rounded-xl flex justify-between items-center mb-8">
                    <span className="text-xs font-bold text-slate-600">Leasing ab:</span>
                    <span className="text-2xl font-display font-bold text-brand-red">€ {monthlyLeasingRate.toLocaleString("de-DE")} / M.</span>
                  </div>

                  <a href="#quote" className="py-4 bg-[#0F2440] hover:bg-[#1E3A5F] text-white text-center text-xs font-bold tracking-[0.2em] rounded-full uppercase transition-all shadow-md">Finanzierung berechnen</a>
                </div>

                {/* B2B Benefits grid */}
                <div className="flex md:grid overflow-x-auto md:overflow-visible snap-x md:snap-none grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start text-left [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1 md:mx-0 md:px-0 pb-2 md:pb-0">
                  {[
                    { icon: Zap, title: "Alles aus einer Hand", desc: "Von Planung und Geräteauswahl bis Leasing, Lieferung und Montage führen wir den Prozess zentral." },
                    { icon: Truck, title: "Europaweite Lieferung", desc: "Sichere Logistik ab Köln für Deutschland und europäische Projektstandorte." },
                    { icon: Wrench, title: "Montage & Installation", desc: "Gastro-Servicepartner prüfen Aufstellung, Wasser, Strom und Inbetriebnahme vor Ort." },
                    { icon: PhoneCall, title: "Service & Wartung", desc: "Technischer Support und Wartungspläne sichern die laufende Küchenleistung." },
                    { icon: Palette, title: "Planung inklusive", desc: "Bei Projektkauf verrechnen wir die 3D-Planung mit dem Auftragswert." },
                    { icon: BadgeCheck, title: "Top Marken zu Top Preisen", desc: "Direkte B2B-Konditionen für Diamond, CombiSteel und ausgewählte Premiumpartner." }
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="flex gap-4 min-w-[250px] shrink-0 snap-start md:min-w-0 md:shrink">
                      <div className="w-11 h-11 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm text-brand-red">
                        <Icon size={20} strokeWidth={1.8} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0F2440] mb-1.5">{title}</h4>
                        <p className="text-slate-500 text-[11px] leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </section>

          {/* Quote Builder / Contact Form */}
          <section id="quote" className="py-24 bg-white relative z-10">
            <div className="lp-container">
              <div className="max-w-2xl mb-16 text-left">
                <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase mb-4">
                  <span className="w-6 h-px bg-brand-red" />
                  ANGEBOT ANFORDERN
                </span>
                <h2 className="lp-h2 font-display font-bold text-[#0F2440] tracking-tight">
                  Unverbindliches <span className="text-brand-red">Angebot anfordern</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start text-left">

                {/* Cart selected items list */}
                <div className="lg:col-span-7 bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-5 mb-6">
                    <h3 className="font-display font-bold text-lg text-[#0F2440]">Ausgewählte Geräte</h3>
                    <span className="bg-red-50 text-brand-red text-[11px] font-bold px-3 py-1 rounded-full">{cartItems.length} Positionen</span>
                  </div>

                  <ul className="space-y-4 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
                    {cartItems.length === 0 ? (
                      <li className="py-12 text-center text-slate-400 flex flex-col items-center gap-4">
                        <ShoppingBag size={40} className="text-slate-300" />
                        <span className="text-xs font-bold">Ihre Angebotsliste ist leer. Fügen Sie Bestseller aus dem Katalog hinzu.</span>
                      </li>
                    ) : (
                      cartItems.map((item) => (
                        <li key={item.product.id} className="flex justify-between items-center bg-slate-50 border border-slate-200/50 p-4 rounded-2xl">
                          <div>
                            <span className="font-bold text-xs text-[#0F2440] block mb-1">{item.product.name}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest">{item.product.id} · Menge: {item.quantity} · € {(item.product.price || 0).toLocaleString("de-DE")}</span>
                          </div>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-brand-red hover:border-brand-red/30 rounded-full transition-colors cursor-pointer"
                          >
                            ×
                          </button>
                        </li>
                      ))
                    )}
                  </ul>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Netto Warenwert</p>
                      <p className="mt-1 font-display text-2xl font-black text-[#0F2440]">€ {quoteNetTotal.toLocaleString("de-DE")}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Brutto</p>
                      <p className="mt-1 font-display text-2xl font-black text-[#0F2440]">€ {quoteGrossTotal.toLocaleString("de-DE")}</p>
                    </div>
                    <div className="rounded-2xl border border-brand-red/25 bg-red-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-red">Leasing ab</p>
                      <p className="mt-1 font-display text-2xl font-black text-brand-red">€ {quoteMonthlyRate.toLocaleString("de-DE")}/M.</p>
                    </div>
                  </div>
                </div>

                {/* RFQ Form */}
                <div className="lg:col-span-5 bg-white border border-slate-200 p-8 rounded-3xl shadow-sm">
                  <div className="border-b border-slate-100 pb-5 mb-6">
                    <h3 className="font-display font-bold text-lg text-[#0F2440]">Projekt Details</h3>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[
                        { icon: PhoneCall, label: "Rückruf" },
                        { icon: Clock, label: "24h Antwort" },
                        { icon: ShieldCheck, label: "B2B sicher" },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} className="rounded-xl bg-slate-50 px-2 py-2 text-center">
                          <Icon size={15} className="mx-auto mb-1 text-brand-red" />
                          <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleRfqSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="projectName" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Name des Objekts / Firma</label>
                      <input
                        type="text"
                        id="projectName"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="z.B. Pizzeria Köln Mitte"
                        className="w-full bg-slate-50 border border-slate-200 focus:border-brand-red rounded-xl py-3 px-4 text-xs outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="contactPhone" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Telefon / WhatsApp</label>
                        <input
                          type="tel"
                          id="contactPhone"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="+49 ..."
                          className="w-full bg-slate-50 border border-slate-200 focus:border-brand-red rounded-xl py-3 px-4 text-xs outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label htmlFor="contactEmail" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">E-Mail</label>
                        <input
                          type="email"
                          id="contactEmail"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="angebot@firma.de"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-brand-red rounded-xl py-3 px-4 text-xs outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="projectSegment" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Betriebs-Segment</label>
                      <select
                        id="projectSegment"
                        value={projectSegment}
                        onChange={(e) => setProjectSegment(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-brand-red rounded-xl py-3 px-4 text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value="" disabled>Bitte Segment wählen</option>
                        <option value="restoran">Restaurant & Café</option>
                        <option value="otel">Hotel & Gastgewerbe</option>
                        <option value="catering">Catering & Großküche</option>
                        <option value="market">Supermarkt & Bäckerei</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="projectNote" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Anforderungen / Bemerkungen</label>
                      <textarea
                        id="projectNote"
                        value={projectNote}
                        onChange={(e) => setProjectNote(e.target.value)}
                        rows={4}
                        placeholder="Wünsche zu Abmessungen, Sonderstromstärken oder Gasanschluss..."
                        className="w-full bg-slate-50 border border-slate-200 focus:border-brand-red rounded-xl py-3 px-4 text-xs outline-none transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-brand-red hover:bg-[#B91C1C] text-white text-xs font-bold uppercase tracking-[0.2em] rounded-full transition-all shadow-[0_8px_20px_-4px_rgba(220,38,38,0.4)] cursor-pointer inline-flex items-center justify-center gap-2"
                    >
                      ANGEBOTSANFRAGE SENDEN
                      <ArrowRight size={14} />
                    </button>

                    {formMsg.text && (
                      <div className={`text-[11px] font-bold py-3 px-4 rounded-xl border text-center ${formMsg.isSuccess ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
                        {formMsg.text}
                      </div>
                    )}
                  </form>
                </div>

              </div>
            </div>
          </section>

          <section className="relative z-10 overflow-hidden bg-[#0F2440] py-20 text-white">
            <div className="lp-container grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-12 items-center">
              <div className="text-left">
                <span className="inline-flex items-center gap-2 text-brand-red font-bold text-[10px] tracking-[0.3em] uppercase mb-4">
                  <span className="w-6 h-px bg-brand-red" />
                  PROJEKT STARTEN
                </span>
                <h2 className="max-w-3xl font-display lp-h2 font-black leading-tight tracking-tight">
                  Ihre Küche kann heute geplant und morgen angeboten werden.
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/65">
                  Senden Sie Ihre Geräteauswahl, ein Foto oder einen Grundriss. Wir prüfen Verfügbarkeit, Leasing, Montagebedarf und erstellen daraus ein belastbares B2B-Angebot.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3">
                  <a href="#quote" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-red px-7 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_14px_30px_-16px_rgba(220,38,38,0.85)] transition-all hover:bg-[#B91C1C]">
                    Angebot jetzt sichern
                    <ArrowRight size={14} />
                  </a>
                  <a href="#chatbotSection" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-7 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/85 transition-all hover:border-white hover:text-white">
                    KI Planung starten
                    <Zap size={14} />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "10.000+", label: "Produkte" },
                  { value: "15", label: "Marken" },
                  { value: "24h", label: "Rückmeldung" },
                  { value: "60 Mon.", label: "Leasing" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 text-left">
                    <div className="font-display text-3xl font-black leading-none text-white">{item.value}</div>
                    <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/55">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Live Footer and Widgets */}
          <section id="siteFooter" className="bg-[#0F2440] text-white pt-24 pb-12 relative z-10">
            <div className="lp-container">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20 text-left">
                <div>
                  <div className="flex items-center gap-2 mb-8">
                    <img src="/logo-2mc-gastro-white.png" alt="2MC Gastro" className="h-16 md:h-20 w-auto max-w-[280px] object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]" loading="lazy" decoding="async" />
                  </div>
                  <p className="text-white/65 text-sm leading-relaxed mb-8">
                    Planung, Vertrieb und Montage erstklassiger Großküchenausstattung nach europäischen B2B standards. Diamond und Premiumpartner.
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-8 border-b border-white/15 pb-4">Plattform</h4>
                  <ul className="space-y-4 text-sm text-white/65 list-none p-0">
                    <li><a href="#hero" className="hover:text-brand-red transition-colors">Gastro Planer</a></li>
                    <li><a href="#catalog" className="hover:text-brand-red transition-colors">Produktkatalog</a></li>
                    <li><a href="#inspection" className="hover:text-brand-red transition-colors">Baugruppen-Analyse</a></li>
                    <li><a href="#leasingSection" className="hover:text-brand-red transition-colors">Leasingrechner</a></li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-8 border-b border-white/15 pb-4">Kontakt & Logistik</h4>
                  <ul className="space-y-4 text-sm text-white/65 list-none p-0">
                    <li>2MC Werbung</li>
                    <li>Bergisch Gladbacher Str. 172, 51063 Köln</li>
                    <li>Deutschland</li>
                    <li>Tel: +49 176 70295844</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] mb-8 border-b border-white/15 pb-4">Impressum</h4>
                  <ul className="space-y-4 text-sm text-white/65 list-none p-0">
                    <li><a href="#siteFooter" className="hover:text-brand-red transition-colors">Datenschutz</a></li>
                    <li><a href="#siteFooter" className="hover:text-brand-red transition-colors">AGB & B2B Richtlinien</a></li>
                    <li><a href="#siteFooter" className="hover:text-brand-red transition-colors">Impressum</a></li>
                  </ul>
                </div>
              </div>

              {/* Ödeme yöntemleri — gerçek marka logoları (public/payment) */}
              <div className="border-t border-white/10 pt-10 mb-2">
                <p className="text-center text-[10px] font-bold uppercase tracking-[0.22em] text-white/45 mb-5">Sichere Zahlungsarten</p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {[
                    { src: "/payment/paypal.svg",     name: "PayPal" },
                    { src: "/payment/visa.svg",       name: "Visa" },
                    { src: "/payment/mastercard.svg", name: "Mastercard" },
                    { src: "/payment/amex.svg",       name: "American Express" },
                    { src: "/payment/maestro.svg",    name: "Maestro" },
                    { src: "/payment/applepay.svg",   name: "Apple Pay" },
                    { src: "/payment/googlepay.svg",  name: "Google Pay" },
                    { src: "/payment/klarna.svg",     name: "Klarna", pink: true },
                  ].map((pm) => (
                    <span
                      key={pm.name}
                      title={pm.name}
                      className={`inline-flex h-9 w-[58px] items-center justify-center rounded-md border shadow-sm ${pm.pink ? "bg-[#FFB3C7] border-[#FFB3C7]" : "bg-white border-slate-200"}`}
                    >
                      <img src={pm.src} alt={pm.name} loading="lazy" className="max-h-5 max-w-[44px] object-contain" />
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/15 pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
                <p className="text-[10px] text-white/50 uppercase tracking-widest">© 2026 2MC Gastro GmbH. Alle Rechte vorbehalten.</p>
                <div className="flex gap-8 text-[10px] text-white/50 uppercase tracking-widest">
                  <a href="#siteFooter" className="hover:text-brand-red transition-colors">Datenschutz</a>
                  <a href="#siteFooter" className="hover:text-brand-red transition-colors">Cookies</a>
                  <a href="#siteFooter" className="hover:text-brand-red transition-colors">Impressum</a>
                </div>
              </div>
            </div>
          </section>

        </main>

        <div className="fixed inset-x-3 bottom-3 z-[75] md:left-1/2 md:right-auto md:w-[min(720px,calc(100vw-32px))] md:-translate-x-1/2">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_20px_60px_-24px_rgba(15,36,64,0.45)]">
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {cartItems.length > 0 ? `${cartItems.length} Positionen im Angebot` : "Angebotsliste bereit"}
                </span>
              </div>
              <div className="mt-0.5 truncate font-display text-lg font-black leading-tight text-[#0F2440]">
                {quoteNetTotal > 0 ? `€ ${quoteNetTotal.toLocaleString("de-DE")} netto · ab € ${quoteMonthlyRate.toLocaleString("de-DE")}/M.` : "Bestseller auswählen und 24h-Angebot erhalten"}
              </div>
            </div>
            <a href="#quote" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-red px-4 py-3 text-[9px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_12px_24px_-16px_rgba(220,38,38,0.8)] transition-all hover:bg-[#B91C1C] sm:px-5">
              Angebot
              <ArrowRight size={13} />
            </a>
          </div>
        </div>

        <FloatingWidgets />
      </div>
    </div>
  );
}

export default LandingPage;
