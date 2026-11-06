import type React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Mail, Phone,
  Banknote, Landmark,
  Truck, Package, PackageCheck, Forklift, Container,
  Shield,
} from 'lucide-react';
import { COMPANY_INFO } from '../lib/companyInfo';
import { useLocalePath } from '../lib/useLocalePath';

type FooterLink = { to: string; key: string; fallback: string; external?: boolean; app?: boolean };

// NOT: Buradaki her hedefin App.tsx'te gerçek bir rotası var (bilgi/yasal sayfalar
// Almanca canonical slug'larla → src/pages/info/InfoPage.tsx). `app` = öneksiz uygulama rotası.
const INFO_LINKS: FooterLink[] = [
  { to: '/ueber-uns',   key: 'footer.about',      fallback: 'Über uns' },
  { to: '/karriere',    key: 'footer.careers',    fallback: 'Karriere' },
  { to: '/support',     key: 'footer.contact',    fallback: 'Kontakt', app: true },
  { to: '/payment',     key: 'footer.payment',    fallback: 'Zahlungsarten', app: true },
  { to: '/versand',     key: 'footer.shipping',   fallback: 'Versand & Lieferung' },
  { to: '/newsletter',  key: 'footer.newsletter', fallback: 'Newsletter' },
];

const LEGAL_LINKS: FooterLink[] = [
  { to: '/support',        key: 'footer.help',         fallback: 'Hilfe-Center', app: true },
  { to: '/developers/api', key: 'footer.developers',   fallback: 'Entwickler / API', app: true },
  { to: '/datenschutz',    key: 'footer.privacy',      fallback: 'Datenschutz' },
  { to: '/agb',            key: 'footer.terms',        fallback: 'AGB' },
  { to: '/sitemap.xml',    key: 'footer.sitemap',      fallback: 'Sitemap', external: true },
  { to: '/impressum',      key: 'footer.imprint',      fallback: 'Impressum' },
  { to: '/widerruf',       key: 'footer.cancellation', fallback: 'Widerrufsrecht' },
];

function FooterLinkItem({ l }: { l: FooterLink }) {
  const { t } = useTranslation();
  const lp = useLocalePath();
  const cls = 'text-sm text-[var(--c-muted)] hover:text-[var(--c-clay)] transition-colors';
  const label = t(l.key, l.fallback);
  if (l.external) return <a href={l.to} className={cls}>{label}</a>;
  return <Link to={l.app ? l.to : lp(l.to)} className={cls}>{label}</Link>;
}

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

// Beyaz kart + gerçek marka renkli logolar (simpleicons official colors).
const PM_BG = 'bg-white border border-slate-200';
const PM_TEXT = 'text-slate-600';

const PAYMENT_METHODS: Brand[] = [
  { name: 'Vorkasse',          logoColor: '475569',     bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'PayPal',            slug: 'paypal',          logoColor: '003087', bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'Klarna',            slug: 'klarna',          logoColor: 'FFA8CD', bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'Mastercard',        slug: 'mastercard',      logoColor: 'EB001B', bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'VISA',              slug: 'visa',            logoColor: '1A1F71', bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'American Express',  slug: 'americanexpress', logoColor: '2E77BC', bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'Maestro',           slug: 'maestro',         logoColor: '6C6BBD', bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'Apple Pay',         slug: 'applepay',        logoColor: '000000', bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'Google Pay',        slug: 'googlepay',       logoColor: '5F6368', bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'SOFORT',            slug: 'sofort',          logoColor: 'EF809F', bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'Mondu',                                      logoColor: '475569', bg: PM_BG, text: PM_TEXT, Icon: Landmark },
  { name: 'Leasing',                                    logoColor: '475569', bg: PM_BG, text: PM_TEXT, Icon: Banknote },
];

// Kargo/nakliye markaları — ileride "Versand" bölümünde kullanılmak üzere korunur.
export const SHIPPING_CARRIERS: Brand[] = [
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
  const { t } = useTranslation();
  const lp = useLocalePath();
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
        <section id="newsletter" className="relative overflow-hidden rounded-[32px] p-8 md:p-12 mb-20 shadow-xl scroll-mt-28" style={{ background: 'linear-gradient(135deg, var(--c-navy-deep) 0%, var(--c-navy) 100%)' }}>
          <div className="absolute top-[-100px] right-[-100px] w-64 h-64 bg-[var(--c-clay)]/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="max-w-xl text-center lg:text-left">
              <h3 className="serif text-3xl md:text-4xl text-white font-medium leading-tight">
                {t('footer.newsletterTitle', 'Neuigkeiten aus der Profiküche')} <br/>
                <em className="text-[var(--c-clay-soft)] not-italic">{t('footer.newsletterAccent', 'direkt ins Postfach.')}</em>
              </h3>
              <p className="text-white/70 mt-4 text-sm md:text-base">
                {t('footer.newsletterText', 'Neue Produkte, Aktionen und Branchentrends einmal im Monat. Jederzeit abbestellbar.')}
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('footer.emailPlaceholder', 'Ihre E-Mail-Adresse')}
                aria-label={t('footer.emailPlaceholder', 'Ihre E-Mail-Adresse')}
                className="w-full sm:w-80 px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:bg-white/15 focus:border-[var(--c-clay)] transition-all"
              />
              <button
                type="submit"
                className="px-8 py-4 rounded-full bg-[var(--c-clay)] text-white font-bold hover:bg-[var(--c-clay-deep)] hover:-translate-y-0.5 transition-all shadow-lg whitespace-nowrap"
              >
                {subscribed ? t('footer.subscribed', 'Abonniert ✓') : t('footer.subscribe', 'Abonnieren')}
              </button>
            </form>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          {/* Brand Info */}
          <div className="space-y-6">
            <Link to={lp('/')} className="flex items-center gap-2 group">
              <img src="/logo-2mc-gastro.webp" width="400" height="95" alt="2MC Gastro" className="h-11 w-auto max-w-[180px] object-contain transition-transform duration-200 group-hover:scale-[1.03]" />
            </Link>
            <p className="text-[14px] text-[var(--c-muted)] leading-relaxed">
              {t('footer.tagline', 'Gastronomiebedarf, 3D-Küchenplanung und schlüsselfertige Projekte – Ihr Partner für die Profiküche in Köln und ganz Europa.')}
            </p>
            <address className="not-italic text-[13px] text-[var(--c-muted)] leading-relaxed">
              <strong className="text-[var(--c-ink)]">{COMPANY_INFO.legalName}</strong><br />
              {t('footer.owner', 'Inhaber: {{name}}', { name: COMPANY_INFO.owner })}<br />
              {COMPANY_INFO.street}<br />
              {COMPANY_INFO.zipCity}, Deutschland
            </address>
            <div className="flex gap-4">
              <a
                href={`tel:${COMPANY_INFO.phoneE164}`}
                aria-label={t('footer.contact', 'Kontakt')}
                title={COMPANY_INFO.phoneDisplay}
                className="w-10 h-10 rounded-full bg-white border border-[var(--c-line)] flex items-center justify-center text-[var(--c-ink-soft)] hover:bg-[var(--c-clay-wash)] hover:text-[var(--c-clay)] transition-all"
              >
                <Phone size={18} />
              </a>
              <a
                href={`mailto:${COMPANY_INFO.email}`}
                aria-label={t('common.email', 'E-posta')}
                title={COMPANY_INFO.email}
                className="w-10 h-10 rounded-full bg-white border border-[var(--c-line)] flex items-center justify-center text-[var(--c-ink-soft)] hover:bg-[var(--c-clay-wash)] hover:text-[var(--c-clay)] transition-all"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Links Grid */}
          <div>
            <h4 className="serif text-lg font-bold mb-6">{t('footer.company', 'Unternehmen')}</h4>
            <ul className="space-y-4">
              {INFO_LINKS.map((l) => (
                <li key={l.to}><FooterLinkItem l={l} /></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="serif text-lg font-bold mb-6">{t('footer.support', 'Service')}</h4>
            <ul className="space-y-4">
              {LEGAL_LINKS.map((l) => (
                <li key={l.to}><FooterLinkItem l={l} /></li>
              ))}
            </ul>
          </div>

          {/* Trust/Payments */}
          <div>
            <h4 className="serif text-lg font-bold mb-6">{t('footer.trust', 'Zahlung & Sicherheit')}</h4>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {PAYMENT_METHODS.slice(0, 6).map((p) => <BrandCard key={p.name} b={p} />)}
            </div>
            <div className="flex items-center gap-3 p-4 bg-white border border-[var(--c-line)] rounded-2xl shadow-sm">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                <Shield size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--c-muted)] leading-none">{t('footer.securePay', 'Sichere Zahlung')}</span>
                <span className="text-[12px] font-semibold mt-1">{t('footer.ssl', '100 % SSL-verschlüsselt')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[var(--c-line)] flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-[13px] text-[var(--c-muted)]">
            © {new Date().getFullYear()} {COMPANY_INFO.legalName} · {t('footer.owner', 'Inhaber: {{name}}', { name: COMPANY_INFO.owner })}. {t('footer.rights', 'Alle Rechte vorbehalten.')} <span className="mx-2 opacity-30">|</span> {t('footer.madeIn', 'Mit Leidenschaft in Köln gemacht.')}
          </div>
          <div className="flex gap-6">
            <Link to={lp('/datenschutz')} className="text-[13px] text-[var(--c-muted)] hover:text-[var(--c-clay)]">{t('footer.privacy', 'Datenschutz')}</Link>
            <Link to={lp('/agb')} className="text-[13px] text-[var(--c-muted)] hover:text-[var(--c-clay)]">{t('footer.terms', 'AGB')}</Link>
            <Link to={lp('/cookie-richtlinie')} className="text-[13px] text-[var(--c-muted)] hover:text-[var(--c-clay)]">{t('footer.cookies', 'Cookies')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
