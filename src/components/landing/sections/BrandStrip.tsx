import { useTranslation } from 'react-i18next';

const BRANDS = [
  'DIAMOND', 'DIVERSO', 'COMBISTEEL', 'FAGOR', 'ANGELO PO',
  'ELECTROLUX', 'RATIONAL', 'MODULAR', 'TECNOEKA', 'LAINOX',
  'MARENO', 'OLIS',
];

export function BrandStrip() {
  const { t } = useTranslation();
  const doubled = [...BRANDS, ...BRANDS];

  return (
    <section className="bg-[var(--c-bg)] border-y border-[var(--c-line)] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--c-muted)] mb-6">
          {t('landing.brands.eyebrow', { defaultValue: '15 premium markanın resmi distribütörü' })}
        </p>
        <div
          className="overflow-hidden relative"
          style={{
            maskImage: 'linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
          }}
        >
          <div
            className="flex gap-12 md:gap-16 whitespace-nowrap"
            style={{ width: 'max-content', animation: 'brand-scroll 38s linear infinite' }}
          >
            {doubled.map((b, i) => (
              <span
                key={i}
                className="c-serif text-[20px] md:text-[24px] font-semibold tracking-[0.08em] text-[color:var(--c-ink-soft)] opacity-60 hover:opacity-100 transition-opacity"
              >
                {b}
              </span>
            ))}
          </div>
          <style>{`
            @keyframes brand-scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
        </div>
      </div>
    </section>
  );
}
