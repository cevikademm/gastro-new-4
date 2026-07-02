import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Stratejik iş ortakları (üretici markalar) bölümü.
 *
 * Her markanın logosu `public/brand-logos/<slug>.png|svg` altında durur.
 * Logo dosyası henüz yoksa (veya yüklenemezse) zarif bir wordmark fallback
 * gösterilir — böylece logolar gelmeden de bölüm düzgün görünür, dosya
 * eklenince otomatik olarak gerçek logo çıkar.
 *
 * Yeni marka eklemek: BRANDS dizisine bir satır ekle + logoyu klasöre koy.
 */
interface Brand {
  name: string;
  /** public/brand-logos/<file> — png/svg/webp. */
  logo: string;
  /** Kısa açıklama (ürün grubu / ülke) i18n anahtarı — kartın altında. */
  tagKey?: string;
}

const BRANDS: Brand[] = [
  { name: 'Diamond',    logo: '/brand-logos/diamond.png',    tagKey: 'landing.sponsors.tagCookingCooling' },
  { name: 'CombiSteel', logo: '/brand-logos/combisteel.png', tagKey: 'landing.sponsors.tagIndustrial' },
  { name: 'Rational',   logo: '/brand-logos/rational.png',   tagKey: 'landing.sponsors.tagCombiOven' },
  { name: 'Modular',    logo: '/brand-logos/modular.png',    tagKey: 'landing.sponsors.tagCookingLines' },
  { name: 'Polaris',    logo: '/brand-logos/polaris.png',    tagKey: 'landing.sponsors.tagCooling' },
  { name: 'Eco-Cool',   logo: '/brand-logos/eco-cool.png',   tagKey: 'landing.sponsors.tagColdChain' },
  { name: 'Venix',      logo: '/brand-logos/venix.png',      tagKey: 'landing.sponsors.tagPizzaOven' },
  { name: 'Eurofred',   logo: '/brand-logos/eurofred.png',   tagKey: 'landing.sponsors.tagHvac' },
];

/** Tek marka kartı — logo yüklenemezse wordmark fallback'e düşer. */
function BrandCard({ brand }: { brand: Brand }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  return (
    <div className="group relative flex h-[120px] flex-col items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 text-center shadow-[0_10px_30px_-22px_rgba(15,36,64,0.6)] transition-all duration-300 hover:-translate-y-1 hover:border-brand-red/40 hover:shadow-[0_20px_40px_-24px_rgba(147,19,21,0.45)]">
      {/* üst köşe vurgusu */}
      <span className="pointer-events-none absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-slate-200 transition-colors duration-300 group-hover:bg-brand-red" />

      <div className="flex h-[52px] w-full items-center justify-center">
        {!failed ? (
          <img
            src={brand.logo}
            alt={`${brand.name} logosu`}
            loading="lazy"
            onError={() => setFailed(true)}
            className="max-h-[52px] max-w-[150px] object-contain opacity-90 transition-all duration-300 group-hover:opacity-100 group-hover:scale-[1.04]"
          />
        ) : (
          // Fallback wordmark — logo dosyası gelene kadar.
          <span className="font-display text-[19px] font-black uppercase tracking-[0.06em] text-[#0F2440] transition-colors duration-300 group-hover:text-brand-red">
            {brand.name}
          </span>
        )}
      </div>

      {brand.tagKey && (
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 transition-colors duration-300 group-hover:text-slate-500">
          {t(brand.tagKey)}
        </span>
      )}
    </div>
  );
}

export function SponsorsSection() {
  const { t } = useTranslation();
  return (
    <section className="relative z-10 border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 py-14 overflow-hidden">
      {/* ince diagonal grid dokusu */}
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(135deg,rgba(15,36,64,0.05)_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="relative mx-auto lp-container">
        {/* başlık */}
        <div className="mb-9 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-brand-red shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-red" />
            {t('landing.sponsors.eyebrow')}
          </span>
          <h2 className="mt-3 font-display text-[22px] font-black tracking-tight text-[#0F2440] sm:text-[26px]">
            {t('landing.sponsors.title')}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-[12px] font-medium leading-relaxed text-slate-500">
            {t('landing.sponsors.subtitle')}
          </p>
          <div className="mx-auto mt-4 h-0.5 w-16 rounded-full bg-gradient-to-r from-transparent via-brand-red to-transparent" />
        </div>

        {/* logo grid */}
        <div className="mx-auto grid max-w-[880px] grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {BRANDS.map((brand) => (
            <BrandCard key={brand.name} brand={brand} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default SponsorsSection;
