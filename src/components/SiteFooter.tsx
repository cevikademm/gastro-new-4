import type React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, Phone, MapPin,
  CreditCard, Banknote, Landmark,
  Truck, Package, PackageCheck, Forklift, Container,
  Shield,
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
    <footer className="bg-[var(--c-bg-alt)] border-t border-[var(--c-line)] text-[var(--c-ink)] pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Newsletter Section — Lush background */}
        <section className="relative overflow-hidden rounded-[32px] p-8 md:p-12 mb-20 shadow-xl" style={{ background: 'linear-gradient(135deg, var(--c-navy-deep) 0%, var(--c-navy) 100%)' }}>
          <div className="absolute top-[-100px] right-[-100px] w-64 h-64 bg-[var(--c-clay)]/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="max-w-xl text-center lg:text-left">
              <h3 className="serif text-3xl md:text-4xl text-white font-medium leading-tight">
                Profesyonel mutfak dünyasından <br/>
                <em className="text-[var(--c-clay-soft)] not-italic">en yeni haberleri</em> alın.
              </h3>
              <p className="text-white/70 mt-4 text-sm md:text-base">
                Yeni ürünler, özel indirimler ve sektör trendleri her ay kapınızda. İstediğiniz zaman ayrılabilirsiniz.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta adresiniz"
                className="w-full sm:w-80 px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:bg-white/15 focus:border-[var(--c-clay)] transition-all"
              />
              <button
                type="submit"
                className="px-8 py-4 rounded-full bg-[var(--c-clay)] text-white font-bold hover:bg-[var(--c-clay-deep)] hover:-translate-y-0.5 transition-all shadow-lg whitespace-nowrap"
              >
                {subscribed ? 'Abone Olundu ✓' : 'Abone Ol'}
              </button>
            </form>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          {/* Brand Info */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2 group">
              <img src="/logo-2mc-gastro.png" alt="2MC Gastro" className="h-11 w-auto max-w-[180px] object-contain transition-transform duration-200 group-hover:scale-[1.03]" />
            </Link>
            <p className="text-[14px] text-[var(--c-muted)] leading-relaxed">
              Profesyonel mutfak ekipmanları, 3D tasarım ve anahtar teslim projeler için Avrupa'nın güvenilir çözüm ortağı.
            </p>
            <div className="flex gap-4">
              {/* Social icons would go here */}
              <div className="w-10 h-10 rounded-full bg-white border border-[var(--c-line)] flex items-center justify-center text-[var(--c-ink-soft)] hover:bg-[var(--c-clay-wash)] hover:text-[var(--c-clay)] cursor-pointer transition-all">
                <Phone size={18} />
              </div>
              <div className="w-10 h-10 rounded-full bg-white border border-[var(--c-line)] flex items-center justify-center text-[var(--c-ink-soft)] hover:bg-[var(--c-clay-wash)] hover:text-[var(--c-clay)] cursor-pointer transition-all">
                <Mail size={18} />
              </div>
            </div>
          </div>

          {/* Links Grid */}
          <div>
            <h4 className="serif text-lg font-bold mb-6">Kurumsal</h4>
            <ul className="space-y-4">
              {INFO_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-[var(--c-muted)] hover:text-[var(--c-clay)] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="serif text-lg font-bold mb-6">Destek</h4>
            <ul className="space-y-4">
              {LEGAL_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-[var(--c-muted)] hover:text-[var(--c-clay)] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Trust/Payments */}
          <div>
            <h4 className="serif text-lg font-bold mb-6">Ödeme & Güven</h4>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {PAYMENT_METHODS.slice(0, 6).map((p) => <BrandCard key={p.name} b={p} />)}
            </div>
            <div className="flex items-center gap-3 p-4 bg-white border border-[var(--c-line)] rounded-2xl shadow-sm">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                <Shield size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--c-muted)] leading-none">Güvenli Ödeme</span>
                <span className="text-[12px] font-semibold mt-1">%100 SSL Korumalı</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[var(--c-line)] flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[13px] text-[var(--c-muted)]">
            © {new Date().getFullYear()} 2MC Gastro GmbH. Tüm hakları saklıdır. <span className="mx-2 opacity-30">|</span> Made with passion in Cologne & Istanbul.
          </div>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-[13px] text-[var(--c-muted)] hover:text-[var(--c-clay)]">Gizlilik</Link>
            <Link to="/terms" className="text-[13px] text-[var(--c-muted)] hover:text-[var(--c-clay)]">Şartlar</Link>
            <Link to="/cookies" className="text-[13px] text-[var(--c-muted)] hover:text-[var(--c-clay)]">Çerezler</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
