import type React from 'react';
import { Check, X, Copy, Palette, Type, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type Swatch = {
  name: string;
  token: string;
  hex: string;
  roleKey: string;
  textOn?: 'light' | 'dark';
};

const PRIMARY_SWATCHES: Swatch[] = [
  { name: 'Primary', token: '--color-primary', hex: '#DC2626', roleKey: 'brand.swatchRole.primary', textOn: 'light' },
  { name: 'Primary Container', token: '--color-primary-container', hex: '#991B1B', roleKey: 'brand.swatchRole.primaryContainer', textOn: 'light' },
  { name: 'Primary Fixed', token: '--color-primary-fixed', hex: '#fce4e6', roleKey: 'brand.swatchRole.lightBackground', textOn: 'dark' },
  { name: 'Primary Fixed Dim', token: '--color-primary-fixed-dim', hex: '#e8a0a6', roleKey: 'brand.swatchRole.hoverSelected', textOn: 'dark' },
];

const SECONDARY_SWATCHES: Swatch[] = [
  { name: 'Secondary', token: '--color-secondary', hex: '#0F2440', roleKey: 'brand.swatchRole.secondary', textOn: 'light' },
  { name: 'Secondary Container', token: '--color-secondary-container', hex: '#d5e3fc', roleKey: 'brand.swatchRole.infoCard', textOn: 'dark' },
  { name: 'Tertiary', token: '--color-tertiary', hex: '#1e2539', roleKey: 'brand.swatchRole.darkUiSurface', textOn: 'light' },
  { name: 'Tertiary Fixed', token: '--color-tertiary-fixed', hex: '#dae2fd', roleKey: 'brand.swatchRole.lightBackground', textOn: 'dark' },
];

const SURFACE_SWATCHES: Swatch[] = [
  { name: 'Surface', token: '--color-surface', hex: '#f7f9fb', roleKey: 'brand.swatchRole.pageBackground', textOn: 'dark' },
  { name: 'Surface Lowest', token: '--color-surface-container-lowest', hex: '#ffffff', roleKey: 'brand.swatchRole.cardBackground', textOn: 'dark' },
  { name: 'Surface Low', token: '--color-surface-container-low', hex: '#f2f4f6', roleKey: 'brand.swatchRole.lightEmphasis', textOn: 'dark' },
  { name: 'Surface Container', token: '--color-surface-container', hex: '#eceef0', roleKey: 'brand.swatchRole.panelBackground', textOn: 'dark' },
  { name: 'Surface High', token: '--color-surface-container-high', hex: '#e6e8ea', roleKey: 'brand.swatchRole.highEmphasisPanel', textOn: 'dark' },
  { name: 'Surface Highest', token: '--color-surface-container-highest', hex: '#e0e3e5', roleKey: 'brand.swatchRole.highestPanel', textOn: 'dark' },
  { name: 'On Surface', token: '--color-on-surface', hex: '#191c1e', roleKey: 'brand.swatchRole.primaryText', textOn: 'light' },
  { name: 'On Surface Variant', token: '--color-on-surface-variant', hex: '#43474c', roleKey: 'brand.swatchRole.secondaryText', textOn: 'light' },
];

const STATUS_SWATCHES: Swatch[] = [
  { name: 'Success', token: '--color-success', hex: '#1b7f3a', roleKey: 'brand.swatchRole.successConfirm', textOn: 'light' },
  { name: 'Success Container', token: '--color-success-container', hex: '#c8f2d4', roleKey: 'brand.swatchRole.successBackground', textOn: 'dark' },
  { name: 'Warning', token: '--color-warning', hex: '#9a6700', roleKey: 'brand.swatchRole.warningPending', textOn: 'light' },
  { name: 'Warning Container', token: '--color-warning-container', hex: '#ffe8b0', roleKey: 'brand.swatchRole.warningBackground', textOn: 'dark' },
  { name: 'Info', token: '--color-info', hex: '#1e5fbf', roleKey: 'brand.swatchRole.infoTip', textOn: 'light' },
  { name: 'Info Container', token: '--color-info-container', hex: '#dbe9ff', roleKey: 'brand.swatchRole.infoBackground', textOn: 'dark' },
  { name: 'Error', token: '--color-error', hex: '#ba1a1a', roleKey: 'brand.swatchRole.errorCritical', textOn: 'light' },
  { name: 'Error Container', token: '--color-error-container', hex: '#ffdad6', roleKey: 'brand.swatchRole.errorBackground', textOn: 'dark' },
];

const TYPE_SCALE = [
  { name: 'Display', cls: 'text-5xl font-extrabold', font: 'font-headline', px: '48 px', weight: '800' },
  { name: 'H1', cls: 'text-4xl font-bold', font: 'font-headline', px: '36 px', weight: '700' },
  { name: 'H2', cls: 'text-3xl font-bold', font: 'font-headline', px: '30 px', weight: '700' },
  { name: 'H3', cls: 'text-2xl font-semibold', font: 'font-headline', px: '24 px', weight: '600' },
  { name: 'H4', cls: 'text-xl font-semibold', font: 'font-headline', px: '20 px', weight: '600' },
  { name: 'Body Lg', cls: 'text-lg', font: 'font-body', px: '18 px', weight: '400' },
  { name: 'Body', cls: 'text-base', font: 'font-body', px: '16 px', weight: '400' },
  { name: 'Small', cls: 'text-sm', font: 'font-body', px: '14 px', weight: '400' },
  { name: 'Caption', cls: 'text-xs font-medium', font: 'font-body', px: '12 px', weight: '500' },
  { name: 'Mono', cls: 'text-sm font-mono', font: 'font-mono', px: '14 px', weight: '500' },
];

const DOS_KEYS: string[] = [
  'brand.dos.singleBrandColor',
  'brand.dos.interWeights',
  'brand.dos.tabularNums',
  'brand.dos.lucideIcons',
  'brand.dos.statusTokensOnly',
];

const DONTS_KEYS: string[] = [
  'brand.donts.noLogoEffects',
  'brand.donts.noWordmarkSplit',
  'brand.donts.noEmojiHype',
  'brand.donts.noTailwindStatusColors',
  'brand.donts.noRandomGradient',
];

function Swatches({ items }: { items: Swatch[] }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopied(val);
    setTimeout(() => setCopied(null), 1200);
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((s) => (
        <button
          key={s.token}
          onClick={() => copy(s.hex)}
          className="group text-left rounded-xl overflow-hidden border border-outline-variant/20 bg-surface-container-lowest hover:shadow-md transition-all"
        >
          <div
            className="h-24 flex items-end p-3 relative"
            style={{ background: s.hex, color: s.textOn === 'light' ? '#fff' : '#191c1e' }}
          >
            <span className="font-headline font-bold text-sm">{s.name}</span>
            <span className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {copied === s.hex ? <Check size={14} /> : <Copy size={14} />}
            </span>
          </div>
          <div className="p-3 space-y-1">
            <div className="font-mono text-xs text-on-surface">{s.hex.toUpperCase()}</div>
            <div className="font-mono text-[10px] text-on-surface-variant truncate">{s.token}</div>
            <div className="text-xs text-on-surface-variant">{t(s.roleKey)}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="brushed-metal text-white rounded-lg p-2.5 shrink-0">
          <Icon size={20} />
        </div>
        <div>
          <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-on-surface-variant mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

export default function BrandPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-6xl mx-auto w-full space-y-12 pb-20">
      {/* Hero */}
      <header className="rounded-2xl overflow-hidden relative">
        <div className="brushed-metal text-white p-6 sm:p-10 md:p-14 relative">
          <div className="dot-grid absolute inset-0 pointer-events-none" />
          <div className="relative space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-medium uppercase tracking-wider">
              <Sparkles size={12} /> {t('brand.version', { version: '1.0', date: '2026-04-11' })}
            </div>
            <h1 className="font-headline text-2xl sm:text-4xl md:text-5xl font-black tracking-tight">
              {t('brand.heroTitle')}
            </h1>
            <p className="text-white/80 text-sm sm:text-base md:text-lg leading-relaxed">
              {t('brand.heroSubtitle')}
            </p>
          </div>
        </div>
      </header>

      {/* Logo */}
      <Section icon={ImageIcon} title={t('brand.logo.title')} subtitle={t('brand.logo.subtitle')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden">
            <div className="aspect-[16/9] flex items-center justify-center bg-surface p-8">
              <img
                src="https://vwuqvweorjbqxcebnaym.supabase.co/storage/v1/object/public/product-3d/logo/WhatsApp_Imagaae_2026-04-06_202604062102.jpeg"
                alt="2MC Gastro ana logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="p-4 border-t border-outline-variant/10">
              <div className="font-headline font-bold text-sm text-on-surface">{t('brand.logo.mainLogo')}</div>
              <div className="text-xs text-on-surface-variant mt-0.5">{t('brand.logo.mainLogoUsage')}</div>
              <code className="block mt-2 text-[10px] font-mono text-on-surface-variant truncate">
                product-3d/logo/WhatsApp_Imagaae_2026-04-06.jpeg
              </code>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden">
            <div className="aspect-[16/9] flex items-center justify-center bg-surface p-8">
              <img
                src="https://vwuqvweorjbqxcebnaym.supabase.co/storage/v1/object/public/product-3d/logo/2mc%20gastro%20favicon.png"
                alt="2MC Gastro ikon / favicon"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="p-4 border-t border-outline-variant/10">
              <div className="font-headline font-bold text-sm text-on-surface">{t('brand.logo.iconFavicon')}</div>
              <div className="text-xs text-on-surface-variant mt-0.5">{t('brand.logo.iconFaviconUsage')}</div>
              <code className="block mt-2 text-[10px] font-mono text-on-surface-variant truncate">
                product-3d/logo/2mc gastro favicon.png
              </code>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="rounded-xl border border-success/20 bg-success-container/40 p-5 space-y-2">
            <div className="flex items-center gap-2 font-headline font-bold text-on-success-container">
              <Check size={18} /> {t('brand.do')}
            </div>
            <ul className="space-y-1.5 text-sm text-on-success-container">
              {DOS_KEYS.map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-on-success-container shrink-0" />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-error/20 bg-error-container/40 p-5 space-y-2">
            <div className="flex items-center gap-2 font-headline font-bold text-error">
              <X size={18} /> {t('brand.dont')}
            </div>
            <ul className="space-y-1.5 text-sm text-on-surface">
              {DONTS_KEYS.map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-error shrink-0" />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Colors */}
      <Section icon={Palette} title={t('brand.colors.title')} subtitle={t('brand.colors.subtitle')}>
        <div className="space-y-8">
          <div>
            <h3 className="font-headline font-bold text-primary uppercase tracking-wider text-xs mb-3">
              {t('brand.colors.groupPrimary')}
            </h3>
            <Swatches items={PRIMARY_SWATCHES} />
          </div>
          <div>
            <h3 className="font-headline font-bold text-primary uppercase tracking-wider text-xs mb-3">
              {t('brand.colors.groupSecondary')}
            </h3>
            <Swatches items={SECONDARY_SWATCHES} />
          </div>
          <div>
            <h3 className="font-headline font-bold text-primary uppercase tracking-wider text-xs mb-3">
              {t('brand.colors.groupSurface')}
            </h3>
            <Swatches items={SURFACE_SWATCHES} />
          </div>
          <div>
            <h3 className="font-headline font-bold text-primary uppercase tracking-wider text-xs mb-3">
              {t('brand.colors.groupStatus')}
            </h3>
            <Swatches items={STATUS_SWATCHES} />
          </div>
        </div>
      </Section>

      {/* Typography */}
      <Section icon={Type} title={t('brand.typography.title')} subtitle={t('brand.typography.subtitle')}>
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest divide-y divide-outline-variant/10">
          {TYPE_SCALE.map((ts) => (
            <div key={ts.name} className="p-5 flex items-baseline gap-6 flex-wrap">
              <div className="w-24 shrink-0">
                <div className="font-mono text-[10px] uppercase text-on-surface-variant">{ts.name}</div>
                <div className="font-mono text-[10px] text-on-surface-variant">{ts.px}</div>
              </div>
              <div className={`${ts.cls} ${ts.font} text-on-surface flex-1 min-w-0`}>
                {t('brand.typography.sample')}
              </div>
              <code className="font-mono text-[10px] text-on-surface-variant shrink-0">
                {ts.font} {ts.cls}
              </code>
            </div>
          ))}
        </div>
      </Section>

      {/* Component samples */}
      <Section icon={Sparkles} title={t('brand.components.title')} subtitle={t('brand.components.subtitle')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 space-y-4">
            <div className="font-headline font-bold text-primary uppercase tracking-wider text-xs">
              {t('brand.components.buttons')}
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="brushed-metal text-white font-headline font-bold px-5 py-2.5 rounded-xl text-sm shadow-sm hover:shadow-md transition-shadow">
                {t('brand.components.createQuote')}
              </button>
              <button className="bg-surface-container text-on-surface font-headline font-bold px-5 py-2.5 rounded-xl text-sm border border-outline-variant/30 hover:bg-surface-container-high transition-colors">
                {t('product.addToCart')}
              </button>
              <button className="text-primary font-headline font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-primary-fixed/40 transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 space-y-4">
            <div className="font-headline font-bold text-primary uppercase tracking-wider text-xs">
              {t('brand.components.statusBadges')}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-success-container text-on-success-container">
                <Check size={12} /> {t('brand.badge.approved')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-warning-container text-on-warning-container">
                {t('brand.badge.pending')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-info-container text-on-info-container">
                {t('brand.badge.info')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-error-container text-error">
                {t('brand.badge.error')}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 space-y-3">
            <div className="font-headline font-bold text-primary uppercase tracking-wider text-xs">
              {t('brand.components.formElement')}
            </div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
              {t('brand.components.projectName')}
            </label>
            <input
              defaultValue={t('brand.components.projectNameSample')}
              className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 space-y-2">
            <div className="font-headline font-bold text-primary uppercase tracking-wider text-xs">
              {t('brand.components.typographyCombo')}
            </div>
            <div className="font-headline text-2xl font-black text-on-surface">2MC Gastro</div>
            <div className="text-sm text-on-surface-variant">
              {t('brand.components.tagline')}
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="rounded-xl border border-outline-variant/20 bg-surface-container p-6 text-center space-y-1">
        <div className="font-headline font-bold text-on-surface">{t('brand.footer.title')}</div>
        <div className="text-xs text-on-surface-variant">
          {t('brand.footer.sourceOfTruth')} <code className="font-mono">src/index.css</code> {t('common.and')}{' '}
          <code className="font-mono">docs/BRAND-IDENTITY.md</code>
        </div>
      </footer>
    </div>
  );
}
