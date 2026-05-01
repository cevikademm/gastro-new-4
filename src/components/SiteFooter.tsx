import type React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, Phone, MapPin,
  CreditCard, Banknote, Landmark,
  Truck, Package, PackageCheck, Forklift, Container,
} from 'lucide-react';

const INFO_LINKS = [
  { to: '/about',        label: 'Hakkımızda' },
  { to: '/careers',      label: 'Kariyer' },
  { to: '/support',      label: 'İletişim' },
  { to: '/payment',      label: 'Ödeme Seçenekleri' },
  { to: '/shipping',     label: 'Kargo & Teslimat' },
  { to: '/newsletter',   label: 'Bülten' },
];

const LEGAL_LINKS = [
  { to: '/help',          label: 'Yardım Merkezi' },
  { to: '/privacy',       label: 'Gizlilik' },
  { to: '/terms',         label: 'Kullanım Koşulları' },
  { to: '/sitemap',       label: 'Site Haritası' },
  { to: '/imprint',       label: 'Künye' },
  { to: '/cancellation',  label: 'Cayma Hakkı' },
];

// Marka logoları — simpleicons.org CDN'den alınır (contrasting color ile brand bg üzerinde görünür).
// simpleicons'te olmayan markalar için fallback: lucide ikon + marka adı metni.
type Brand = {
  name: string;
  slug?: string;       // simpleicons slug — yoksa fallback çalışır
  logoColor?: string;  // 6-hane hex (#'siz) — marka bg üzerinde kontrastı sağlar
  bg: string;
  text: string;
  Icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
};

// Tekdüze koyu-gri kart + gri tonlarda logo (biggastro tarzı).
const PM_BG = 'bg-[#2a2f38]';
const PM_TEXT = 'text-white/70';
const PM_LOGO = 'D1D5DB'; // neutral-300

const PAYMENT_METHODS: Brand[] = [
  { name: 'Vorkasse',          logoColor: PM_LOGO, bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'PayPal',            slug: 'paypal',          logoColor: PM_LOGO, bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'SOFORT',            slug: 'klarna',          logoColor: PM_LOGO, bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'Klarna',            slug: 'klarna',          logoColor: PM_LOGO, bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'Maestro',           slug: 'mastercard',      logoColor: PM_LOGO, bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'Mastercard',        slug: 'mastercard',      logoColor: PM_LOGO, bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'VISA',              slug: 'visa',            logoColor: PM_LOGO, bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'American Express',  slug: 'americanexpress', logoColor: PM_LOGO, bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'Mondu',                                      logoColor: PM_LOGO, bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'Leasing',                                    logoColor: PM_LOGO, bg: PM_BG, text: PM_TEXT, Icon: Banknote },
  { name: 'Apple Pay',         slug: 'applepay',        logoColor: PM_LOGO, bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'Google Pay',        slug: 'googlepay',       logoColor: PM_LOGO, bg: PM_BG, text: PM_TEXT, Icon: Landmark },
];

const SHIPPING_CARRIERS: Brand[] = [
  { name: 'DHL',        slug: 'dhl',        logoColor: 'D40511', bg: 'bg-[#FFCC00]',                                   text: 'text-[#D40511]', Icon: Truck        },
  { name: 'UPS',        slug: 'ups',        logoColor: 'FFB500', bg: 'bg-[#351C15]',                                   text: 'text-[#FFB500]', Icon: Package      },
  { name: 'DPD',        slug: 'dpd',        logoColor: 'FFFFFF', bg: 'bg-[#DC0032]',                                   text: 'text-white',     Icon: PackageCheck },
  { name: 'Cargoboard',                                           bg: 'bg-gradient-to-br from-sky-700 to-sky-900',      text: 'text-white',     Icon: Container    },
  { name: 'TNT',                                                  bg: 'bg-[#FF6600]',                                   text: 'text-white',     Icon: Truck        },
  { name: 'Palet',                                                bg: 'bg-gradient-to-br from-stone-600 to-stone-800', text: 'text-white',     Icon: Forklift     },
];

function BrandCard({ b }: { b: Brand }) {
  const Icon = b.Icon;
  const logoUrl = b.slug ? `https://cdn.simpleicons.org/${b.slug}/${b.logoColor ?? 'FFFFFF'}` : null;
  return (
    <div
      title={b.name}
      className={`relative aspect-[5/3] ${b.bg} ${b.text} rounded-lg flex items-center justify-center overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.04] transition-all cursor-default group`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={b.name}
          loading="lazy"
          className="relative z-10 h-[55%] w-[70%] object-contain group-hover:scale-110 transition-transform"
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = 'none';
            const fb = img.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = 'flex';
          }}
        />
      ) : null}
      <span
        className="relative z-10 flex-col items-center gap-0.5"
        style={{ display: logoUrl ? 'none' : 'flex' }}
      >
        <Icon size={16} strokeWidth={2} className="opacity-90 group-hover:scale-110 transition-transform" />
        <span className="text-[9px] font-black tracking-wider uppercase">{b.name}</span>
      </span>
    </div>
  );
}

export default function SiteFooter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 3500);
  };

  return (
    <footer className="mt-16 bg-surface-container-low border-t border-outline-variant/15 text-on-surface">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 space-y-12">
        {/* ── Newsletter ───────────────────────────────────── */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-10 border-b border-outline-variant/15">
          <div>
            <h3 className="text-2xl font-black font-headline text-on-surface">Bültene Abone Ol</h3>
            <p className="text-sm text-on-surface-variant mt-2 max-w-xl">
              Lütfen bana{' '}
              <Link to="/privacy" className="underline hover:text-primary">Gizlilik Politikası</Link>
              'na uygun olarak düzenli ve istediğim zaman vazgeçebileceğim şekilde ürün yelpazeniz hakkında e-posta gönderin.
            </p>
          </div>
          <form onSubmit={handleSubscribe} className="flex gap-2 w-full md:w-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta adresiniz"
              className="flex-1 md:w-72 px-4 py-3 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              {subscribed ? 'Abone olundu ✓' : 'Abone Ol'}
            </button>
          </form>
        </section>

        {/* ── 4-Column Info Grid ───────────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {/* Bilgiler */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant mb-4">Bilgiler</h4>
            <ul className="space-y-2.5">
              {INFO_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-on-surface hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Yasal */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant mb-4">Yasal Bilgiler</h4>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-on-surface hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* İletişim */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant mb-4">İletişim</h4>
            <div className="space-y-3 text-sm">
              <div className="font-black text-on-surface">2MC GASTRO</div>
              <div className="text-on-surface-variant flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                <span>Köln, Almanya<br />İstanbul, Türkiye</span>
              </div>
              <a href="tel:+4922112345678" className="text-on-surface-variant hover:text-primary flex items-center gap-2">
                <Phone size={14} /> +49 (0) 221 1234 5678
              </a>
              <a href="mailto:info@2mcgastro.com" className="text-on-surface-variant hover:text-primary flex items-center gap-2">
                <Mail size={14} /> info@2mcgastro.com
              </a>
              <div className="text-on-surface-variant text-xs pt-1">Pzt–Cum 09:00 – 18:00</div>
            </div>
          </div>

          {/* Ödeme & Kargo */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
              <CreditCard size={13} className="text-primary" />
              Ödeme Seçenekleri
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
              {PAYMENT_METHODS.map((p) => <BrandCard key={p.name} b={p} />)}
            </div>
            <h4 className="text-xs font-black uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
              <Truck size={13} className="text-primary" />
              Kargo & Teslimat
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SHIPPING_CARRIERS.map((c) => <BrandCard key={c.name} b={c} />)}
            </div>
          </div>
        </section>

        {/* ── Bottom Legal Notice ──────────────────────────── */}
        <section className="pt-8 border-t border-outline-variant/15 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-on-surface-variant">
            <div>© {new Date().getFullYear()} 2MC Gastro GmbH. Tüm hakları saklıdır.</div>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="hover:text-primary">Gizlilik</Link>
              <Link to="/terms" className="hover:text-primary">Koşullar</Link>
              <Link to="/imprint" className="hover:text-primary">Künye</Link>
              <Link to="/cookies" className="hover:text-primary">Çerezler</Link>
            </div>
          </div>
        </section>
      </div>
    </footer>
  );
}
