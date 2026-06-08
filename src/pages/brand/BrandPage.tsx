import type React from 'react';
import { Check, X, Copy, Palette, Type, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useState } from 'react';

type Swatch = {
  name: string;
  token: string;
  hex: string;
  role: string;
  textOn?: 'light' | 'dark';
};

const PRIMARY_SWATCHES: Swatch[] = [
  { name: 'Primary', token: '--color-primary', hex: '#DC2626', role: 'Birincil buton, ana vurgu', textOn: 'light' },
  { name: 'Primary Container', token: '--color-primary-container', hex: '#991B1B', role: 'Gradient ikinci durak', textOn: 'light' },
  { name: 'Primary Fixed', token: '--color-primary-fixed', hex: '#fce4e6', role: 'Açık arka plan', textOn: 'dark' },
  { name: 'Primary Fixed Dim', token: '--color-primary-fixed-dim', hex: '#e8a0a6', role: 'Hover / seçili', textOn: 'dark' },
];

const SECONDARY_SWATCHES: Swatch[] = [
  { name: 'Secondary', token: '--color-secondary', hex: '#0F2440', role: 'İkincil renk, lacivert', textOn: 'light' },
  { name: 'Secondary Container', token: '--color-secondary-container', hex: '#d5e3fc', role: 'Bilgilendirme kartı', textOn: 'dark' },
  { name: 'Tertiary', token: '--color-tertiary', hex: '#1e2539', role: 'Koyu UI yüzeyi, footer', textOn: 'light' },
  { name: 'Tertiary Fixed', token: '--color-tertiary-fixed', hex: '#dae2fd', role: 'Açık arka plan', textOn: 'dark' },
];

const SURFACE_SWATCHES: Swatch[] = [
  { name: 'Surface', token: '--color-surface', hex: '#f7f9fb', role: 'Sayfa zemini', textOn: 'dark' },
  { name: 'Surface Lowest', token: '--color-surface-container-lowest', hex: '#ffffff', role: 'Kart zemini', textOn: 'dark' },
  { name: 'Surface Low', token: '--color-surface-container-low', hex: '#f2f4f6', role: 'Hafif vurgu', textOn: 'dark' },
  { name: 'Surface Container', token: '--color-surface-container', hex: '#eceef0', role: 'Panel arka planı', textOn: 'dark' },
  { name: 'Surface High', token: '--color-surface-container-high', hex: '#e6e8ea', role: 'Yüksek vurgu panel', textOn: 'dark' },
  { name: 'Surface Highest', token: '--color-surface-container-highest', hex: '#e0e3e5', role: 'En yüksek panel', textOn: 'dark' },
  { name: 'On Surface', token: '--color-on-surface', hex: '#191c1e', role: 'Birincil metin', textOn: 'light' },
  { name: 'On Surface Variant', token: '--color-on-surface-variant', hex: '#43474c', role: 'İkincil metin', textOn: 'light' },
];

const STATUS_SWATCHES: Swatch[] = [
  { name: 'Success', token: '--color-success', hex: '#1b7f3a', role: 'Başarı, onay', textOn: 'light' },
  { name: 'Success Container', token: '--color-success-container', hex: '#c8f2d4', role: 'Başarı arka plan', textOn: 'dark' },
  { name: 'Warning', token: '--color-warning', hex: '#9a6700', role: 'Dikkat, bekleyen', textOn: 'light' },
  { name: 'Warning Container', token: '--color-warning-container', hex: '#ffe8b0', role: 'Uyarı arka plan', textOn: 'dark' },
  { name: 'Info', token: '--color-info', hex: '#1e5fbf', role: 'Bilgi, ipucu', textOn: 'light' },
  { name: 'Info Container', token: '--color-info-container', hex: '#dbe9ff', role: 'Bilgi arka plan', textOn: 'dark' },
  { name: 'Error', token: '--color-error', hex: '#ba1a1a', role: 'Hata, kritik', textOn: 'light' },
  { name: 'Error Container', token: '--color-error-container', hex: '#ffdad6', role: 'Hata arka plan', textOn: 'dark' },
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

const DOS: string[] = [
  '2MC claysunu (#DC2626) tek marka rengi olarak kullan',
  'Başlıkta Inter 700/800, gövdede Inter 400/500 kullan',
  'Sayısal değerlerde tabular-nums ile hizala',
  'İkonları lucide-react, 1.5-2 px stroke ile kullan',
  'Durum renklerini yalnızca token üzerinden tüket',
];

const DONTS: string[] = [
  'Logo üzerine gölge, outline, glow ekleme',
  'Wordmark ile ikonu koparma',
  'Emoji, abartı sıfat ("devrim", "harika") kullanma',
  'Tailwind emerald/amber/blue sabitlerini durum için kullanma',
  'Rastgele gradient (mor→pembe vb.) kullanma',
];

function Swatches({ items }: { items: Swatch[] }) {
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
            <div className="text-xs text-on-surface-variant">{s.role}</div>
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
  return (
    <div className="max-w-6xl mx-auto w-full space-y-12 pb-20">
      {/* Hero */}
      <header className="rounded-2xl overflow-hidden relative">
        <div className="brushed-metal text-white p-6 sm:p-10 md:p-14 relative">
          <div className="dot-grid absolute inset-0 pointer-events-none" />
          <div className="relative space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-medium uppercase tracking-wider">
              <Sparkles size={12} /> Versiyon 1.0 · 2026-04-11
            </div>
            <h1 className="font-headline text-2xl sm:text-4xl md:text-5xl font-black tracking-tight">
              2MC Gastro — Marka Kimliği
            </h1>
            <p className="text-white/80 text-sm sm:text-base md:text-lg leading-relaxed">
              Logo, renk, tipografi, görsel dil ve yazım tonunun tek doğruluk kaynağı. Tüm dijital ve basılı
              üretimler bu kılavuza uyar.
            </p>
          </div>
        </div>
      </header>

      {/* Logo */}
      <Section icon={ImageIcon} title="Logo" subtitle="Birincil ve ikon varyantları">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden">
            <div className="aspect-[16/9] flex items-center justify-center bg-surface p-8">
              <img
                src="https://ohcytmzyjvpfsqejujzs.supabase.co/storage/v1/object/public/2mcwerbung/logo4.png"
                alt="2MC Gastro ana logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="p-4 border-t border-outline-variant/10">
              <div className="font-headline font-bold text-sm text-on-surface">Ana Logo</div>
              <div className="text-xs text-on-surface-variant mt-0.5">Web header, PDF kapak, fuar</div>
              <code className="block mt-2 text-[10px] font-mono text-on-surface-variant truncate">
                2mcwerbung/logo4.png
              </code>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden">
            <div className="aspect-[16/9] flex items-center justify-center bg-tertiary p-8">
              <img
                src="https://ohcytmzyjvpfsqejujzs.supabase.co/storage/v1/object/public/2mcwerbung/logo_werbung.png"
                alt="2MC Gastro werbung varyantı"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="p-4 border-t border-outline-variant/10">
              <div className="font-headline font-bold text-sm text-on-surface">Werbung Varyantı</div>
              <div className="text-xs text-on-surface-variant mt-0.5">Pazarlama, sosyal medya, koyu zemin</div>
              <code className="block mt-2 text-[10px] font-mono text-on-surface-variant truncate">
                2mcwerbung/logo_werbung.png
              </code>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="rounded-xl border border-success/20 bg-success-container/40 p-5 space-y-2">
            <div className="flex items-center gap-2 font-headline font-bold text-on-success-container">
              <Check size={18} /> Yap
            </div>
            <ul className="space-y-1.5 text-sm text-on-success-container">
              {DOS.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-on-success-container shrink-0" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-error/20 bg-error-container/40 p-5 space-y-2">
            <div className="flex items-center gap-2 font-headline font-bold text-error">
              <X size={18} /> Yapma
            </div>
            <ul className="space-y-1.5 text-sm text-on-surface">
              {DONTS.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-error shrink-0" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Colors */}
      <Section icon={Palette} title="Renk Paleti" subtitle="Swatch'a tıklayarak hex değerini kopyala">
        <div className="space-y-8">
          <div>
            <h3 className="font-headline font-bold text-primary uppercase tracking-wider text-xs mb-3">
              Primer — Kırmızı
            </h3>
            <Swatches items={PRIMARY_SWATCHES} />
          </div>
          <div>
            <h3 className="font-headline font-bold text-primary uppercase tracking-wider text-xs mb-3">
              Sekonder & Tersiyer
            </h3>
            <Swatches items={SECONDARY_SWATCHES} />
          </div>
          <div>
            <h3 className="font-headline font-bold text-primary uppercase tracking-wider text-xs mb-3">
              Yüzey & Metin
            </h3>
            <Swatches items={SURFACE_SWATCHES} />
          </div>
          <div>
            <h3 className="font-headline font-bold text-primary uppercase tracking-wider text-xs mb-3">
              Durum
            </h3>
            <Swatches items={STATUS_SWATCHES} />
          </div>
        </div>
      </Section>

      {/* Typography */}
      <Section icon={Type} title="Tipografi" subtitle="Inter başlık · Inter gövde">
        <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest divide-y divide-outline-variant/10">
          {TYPE_SCALE.map((t) => (
            <div key={t.name} className="p-5 flex items-baseline gap-6 flex-wrap">
              <div className="w-24 shrink-0">
                <div className="font-mono text-[10px] uppercase text-on-surface-variant">{t.name}</div>
                <div className="font-mono text-[10px] text-on-surface-variant">{t.px}</div>
              </div>
              <div className={`${t.cls} ${t.font} text-on-surface flex-1 min-w-0`}>
                Endüstriyel mutfak, hassas mühendislik.
              </div>
              <code className="font-mono text-[10px] text-on-surface-variant shrink-0">
                {t.font} {t.cls}
              </code>
            </div>
          ))}
        </div>
      </Section>

      {/* Component samples */}
      <Section icon={Sparkles} title="Bileşenler" subtitle="Canlı örnekler">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 space-y-4">
            <div className="font-headline font-bold text-primary uppercase tracking-wider text-xs">
              Butonlar
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="brushed-metal text-white font-headline font-bold px-5 py-2.5 rounded-xl text-sm shadow-sm hover:shadow-md transition-shadow">
                Teklif oluştur
              </button>
              <button className="bg-surface-container text-on-surface font-headline font-bold px-5 py-2.5 rounded-xl text-sm border border-outline-variant/30 hover:bg-surface-container-high transition-colors">
                Sepete ekle
              </button>
              <button className="text-primary font-headline font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-primary-fixed/40 transition-colors">
                İptal
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 space-y-4">
            <div className="font-headline font-bold text-primary uppercase tracking-wider text-xs">
              Durum rozetleri
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-success-container text-on-success-container">
                <Check size={12} /> Onaylandı
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-warning-container text-on-warning-container">
                Beklemede
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-info-container text-on-info-container">
                Bilgi
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-error-container text-error">
                Hata
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 space-y-3">
            <div className="font-headline font-bold text-primary uppercase tracking-wider text-xs">
              Form elemanı
            </div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase mb-1">
              Proje adı
            </label>
            <input
              defaultValue="Otel Mutfağı — Köln"
              className="w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 space-y-2">
            <div className="font-headline font-bold text-primary uppercase tracking-wider text-xs">
              Tipografi kombini
            </div>
            <div className="font-headline text-2xl font-black text-on-surface">2MC Gastro</div>
            <div className="text-sm text-on-surface-variant">
              Endüstriyel mutfak planlama platformu. 10.000+ ekipman, 50+ marka, HACCP uyumlu teklifler.
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <footer className="rounded-xl border border-outline-variant/20 bg-surface-container p-6 text-center space-y-1">
        <div className="font-headline font-bold text-on-surface">2MC Gastro Marka Kimliği Kılavuzu</div>
        <div className="text-xs text-on-surface-variant">
          Tek doğruluk kaynağı: <code className="font-mono">src/index.css</code> ve{' '}
          <code className="font-mono">docs/BRAND-IDENTITY.md</code>
        </div>
      </footer>
    </div>
  );
}
