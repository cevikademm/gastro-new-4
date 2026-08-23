/**
 * BrandPage — /brand: halka açık "Hakkımızda" + marka sayfası.
 *
 * Navbar'daki "Hakkımızda" ve dashboard'daki "Marka Kimliği" buraya gelir.
 * İçerik tamamen i18n'den okunur (brand.about.*); marka kırmızısı #931315
 * (teklif/PDF sistemiyle aynı — index.css'teki --color-brand-red DEĞİL).
 * İç tasarım-sistemi stil rehberi docs/BRAND-IDENTITY.md'de yaşar; bu sayfa
 * müşteriye dönüktür ve token tabloları içermez.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Compass,
  Cpu,
  Eye,
  FileText,
  Handshake,
  Package,
  ShieldCheck,
  Target,
  Truck,
} from 'lucide-react';

const BRAND_RED = '#931315';
const BRAND_RED_DARK = '#6d0d0f';

const LOGO_MAIN =
  'https://vwuqvweorjbqxcebnaym.supabase.co/storage/v1/object/public/product-3d/logo/WhatsApp_Imagaae_2026-04-06_202604062102.jpeg';
const LOGO_ICON =
  'https://vwuqvweorjbqxcebnaym.supabase.co/storage/v1/object/public/product-3d/logo/2mc%20gastro%20favicon.png';

type IconType = React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;

const STATS: Array<{ valueKey: string; labelKey: string }> = [
  { valueKey: 'brand.about.stats.products.value', labelKey: 'brand.about.stats.products.label' },
  { valueKey: 'brand.about.stats.brands.value', labelKey: 'brand.about.stats.brands.label' },
  { valueKey: 'brand.about.stats.languages.value', labelKey: 'brand.about.stats.languages.label' },
  { valueKey: 'brand.about.stats.planning.value', labelKey: 'brand.about.stats.planning.label' },
];

const VALUES: Array<{ icon: IconType; titleKey: string; textKey: string }> = [
  { icon: BadgeCheck, titleKey: 'brand.about.values.quality.title', textKey: 'brand.about.values.quality.text' },
  { icon: ShieldCheck, titleKey: 'brand.about.values.trust.title', textKey: 'brand.about.values.trust.text' },
  { icon: Cpu, titleKey: 'brand.about.values.technology.title', textKey: 'brand.about.values.technology.text' },
  { icon: Handshake, titleKey: 'brand.about.values.partnership.title', textKey: 'brand.about.values.partnership.text' },
];

const SERVICES: Array<{ icon: IconType; titleKey: string; textKey: string }> = [
  { icon: Package, titleKey: 'brand.about.services.supply.title', textKey: 'brand.about.services.supply.text' },
  { icon: Boxes, titleKey: 'brand.about.services.design.title', textKey: 'brand.about.services.design.text' },
  { icon: FileText, titleKey: 'brand.about.services.quote.title', textKey: 'brand.about.services.quote.text' },
  { icon: Truck, titleKey: 'brand.about.services.delivery.title', textKey: 'brand.about.services.delivery.text' },
];

const PARTNER_BRANDS: Array<{ name: string; descKey: string }> = [
  { name: 'Diamond', descKey: 'brand.about.brands.diamond' },
  { name: 'CombiSteel', descKey: 'brand.about.brands.combisteel' },
  { name: 'HENDI', descKey: 'brand.about.brands.hendi' },
];

const BRAND_COLORS: Array<{ hex: string; nameKey: string; textOnDark: boolean }> = [
  { hex: '#931315', nameKey: 'brand.about.identity.colorRed', textOnDark: false },
  { hex: '#1E2539', nameKey: 'brand.about.identity.colorDark', textOnDark: false },
  { hex: '#F7F9FB', nameKey: 'brand.about.identity.colorLight', textOnDark: true },
  { hex: '#191C1E', nameKey: 'brand.about.identity.colorText', textOnDark: false },
];

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="max-w-2xl">
      <div className="h-1 w-10 rounded-full mb-3" style={{ background: BRAND_RED }} />
      <h2 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">{title}</h2>
      {subtitle && <p className="text-sm sm:text-base text-on-surface-variant mt-2 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

export default function BrandPage() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('brand.about.documentTitle', '2MC Gastro — Hakkımızda');
  }, [t]);

  return (
    <div className="max-w-6xl mx-auto w-full space-y-14 sm:space-y-20 pb-24">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header
        className="rounded-3xl overflow-hidden relative text-white"
        style={{ background: `linear-gradient(135deg, ${BRAND_RED} 0%, ${BRAND_RED_DARK} 100%)` }}
      >
        <div className="dot-grid absolute inset-0 pointer-events-none opacity-40" />
        <div className="relative px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20 max-w-3xl space-y-5">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
            <Compass size={13} /> {t('brand.about.badge')}
          </span>
          <h1 className="font-headline text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            {t('brand.about.heroTitle')}
          </h1>
          <p className="text-white/85 text-sm sm:text-base lg:text-lg leading-relaxed">
            {t('brand.about.heroSubtitle')}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/magaza"
              className="inline-flex items-center gap-2 bg-white px-5 py-3 rounded-xl text-sm font-headline font-bold shadow-sm hover:shadow-lg transition-shadow"
              style={{ color: BRAND_RED }}
            >
              {t('brand.about.ctaShop')} <ArrowRight size={15} />
            </Link>
            <Link
              to="/3d-design"
              className="inline-flex items-center gap-2 border border-white/40 px-5 py-3 rounded-xl text-sm font-headline font-bold text-white hover:bg-white/10 transition-colors"
            >
              {t('brand.about.ctaDesign')}
            </Link>
          </div>
        </div>
      </header>

      {/* ── İstatistikler ────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-label={t('brand.about.badge')}>
        {STATS.map((s) => (
          <div
            key={s.labelKey}
            className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-5 sm:p-6 text-center"
          >
            <div className="font-headline text-2xl sm:text-3xl font-black tabular-nums" style={{ color: BRAND_RED }}>
              {t(s.valueKey)}
            </div>
            <div className="text-xs sm:text-sm text-on-surface-variant mt-1.5">{t(s.labelKey)}</div>
          </div>
        ))}
      </section>

      {/* ── Hikaye ───────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div className="space-y-4">
          <SectionHeading title={t('brand.about.story.title')} />
          <p className="text-sm sm:text-base text-on-surface leading-relaxed">{t('brand.about.story.p1')}</p>
          <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">{t('brand.about.story.p2')}</p>
          <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">{t('brand.about.story.p3')}</p>
        </div>
        <div className="relative">
          <div
            className="absolute -inset-3 rounded-3xl opacity-[0.07] pointer-events-none"
            style={{ background: BRAND_RED }}
          />
          <div className="relative rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-8 sm:p-12 flex items-center justify-center">
            <img
              src={LOGO_MAIN}
              alt="2MC Gastro"
              className="max-h-52 sm:max-h-64 w-auto object-contain rounded-lg"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* ── Misyon & Vizyon ──────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {(
          [
            { icon: Target, titleKey: 'brand.about.mission.title', textKey: 'brand.about.mission.text' },
            { icon: Eye, titleKey: 'brand.about.vision.title', textKey: 'brand.about.vision.text' },
          ] as Array<{ icon: IconType; titleKey: string; textKey: string }>
        ).map(({ icon: Icon, titleKey, textKey }) => (
          <div
            key={titleKey}
            className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 sm:p-8 space-y-3"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: BRAND_RED }}
            >
              <Icon size={20} />
            </div>
            <h3 className="font-headline text-lg sm:text-xl font-bold text-on-surface">{t(titleKey)}</h3>
            <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">{t(textKey)}</p>
          </div>
        ))}
      </section>

      {/* ── Değerler ─────────────────────────────────────────────────── */}
      <section className="space-y-8">
        <SectionHeading title={t('brand.about.values.title')} subtitle={t('brand.about.values.subtitle')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALUES.map(({ icon: Icon, titleKey, textKey }) => (
            <div
              key={titleKey}
              className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 space-y-3 hover:shadow-md transition-shadow"
            >
              <Icon size={22} style={{ color: BRAND_RED }} />
              <h3 className="font-headline font-bold text-on-surface">{t(titleKey)}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">{t(textKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Hizmetler ────────────────────────────────────────────────── */}
      <section className="space-y-8">
        <SectionHeading title={t('brand.about.services.title')} subtitle={t('brand.about.services.subtitle')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {SERVICES.map(({ icon: Icon, titleKey, textKey }) => (
            <div
              key={titleKey}
              className="flex gap-4 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 sm:p-7"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ background: BRAND_RED }}
              >
                <Icon size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-headline font-bold text-on-surface">{t(titleKey)}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed mt-1">{t(textKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Markalar ─────────────────────────────────────────────────── */}
      <section className="space-y-8">
        <SectionHeading title={t('brand.about.brands.title')} subtitle={t('brand.about.brands.subtitle')} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PARTNER_BRANDS.map((b) => (
            <div
              key={b.name}
              className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 text-center space-y-2"
            >
              <div className="font-headline text-xl font-black text-on-surface">{b.name}</div>
              <p className="text-sm text-on-surface-variant leading-relaxed">{t(b.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Marka Kimliği (kompakt, müşteriye dönük) ─────────────────── */}
      <section className="space-y-8">
        <SectionHeading title={t('brand.about.identity.title')} subtitle={t('brand.about.identity.subtitle')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden">
            <div className="aspect-[16/9] flex items-center justify-center bg-surface p-8">
              <img src={LOGO_MAIN} alt={t('brand.about.identity.mainLogo')} className="max-h-full max-w-full object-contain" loading="lazy" />
            </div>
            <div className="p-4 border-t border-outline-variant/10 font-headline font-bold text-sm text-on-surface">
              {t('brand.about.identity.mainLogo')}
            </div>
          </div>
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden">
            <div className="aspect-[16/9] flex items-center justify-center bg-surface p-8">
              <img src={LOGO_ICON} alt={t('brand.about.identity.icon')} className="max-h-full max-w-full object-contain" loading="lazy" />
            </div>
            <div className="p-4 border-t border-outline-variant/10 font-headline font-bold text-sm text-on-surface">
              {t('brand.about.identity.icon')}
            </div>
          </div>
        </div>
        <div>
          <h3 className="font-headline font-bold uppercase tracking-wider text-xs mb-3" style={{ color: BRAND_RED }}>
            {t('brand.about.identity.colorsTitle')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BRAND_COLORS.map((c) => (
              <div key={c.hex} className="rounded-xl overflow-hidden border border-outline-variant/20">
                <div
                  className="h-16 flex items-end p-2.5"
                  style={{ background: c.hex, color: c.textOnDark ? '#191C1E' : '#fff' }}
                >
                  <span className="font-mono text-[11px] font-semibold">{c.hex}</span>
                </div>
                <div className="px-2.5 py-2 text-xs text-on-surface-variant bg-surface-container-lowest">
                  {t(c.nameKey)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section
        className="rounded-3xl text-white px-6 py-10 sm:px-12 sm:py-14 text-center space-y-4"
        style={{ background: `linear-gradient(135deg, ${BRAND_RED_DARK} 0%, ${BRAND_RED} 100%)` }}
      >
        <h2 className="font-headline text-2xl sm:text-3xl font-black tracking-tight">{t('brand.about.cta.title')}</h2>
        <p className="text-white/85 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">{t('brand.about.cta.text')}</p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link
            to="/support"
            className="inline-flex items-center gap-2 bg-white px-6 py-3 rounded-xl text-sm font-headline font-bold shadow-sm hover:shadow-lg transition-shadow"
            style={{ color: BRAND_RED }}
          >
            {t('brand.about.cta.contact')} <ArrowRight size={15} />
          </Link>
          <Link
            to="/3d-design"
            className="inline-flex items-center gap-2 border border-white/40 px-6 py-3 rounded-xl text-sm font-headline font-bold text-white hover:bg-white/10 transition-colors"
          >
            {t('brand.about.cta.design')}
          </Link>
        </div>
      </section>
    </div>
  );
}
