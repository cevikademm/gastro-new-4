import { useTranslation } from 'react-i18next';

/**
 * Scrolling announcement bar with urgency messages.
 * Ücretsiz kargo, indirim kodu, flash sale, leasing vb.
 */
export function AnnouncementBar() {
  const { t } = useTranslation();

  const messages = [
    { emoji: '🚚', key: 'landing.announcement.shipping', fallback: '24-48 saat hızlı teslimat · 15 ülkeye ücretsiz kargo' },
    { emoji: '🎁', key: 'landing.announcement.discount', fallback: 'İlk siparişe özel %10 indirim — Kod: GASTRO10' },
    { emoji: '🔥', key: 'landing.announcement.flash', fallback: 'Bu hafta Diamond serisi soğutucularda 48 saatlik flash sale' },
    { emoji: '💳', key: 'landing.announcement.leasing', fallback: 'Leasing ile 36 aya varan taksitli ödeme imkanı' },
    { emoji: '✅', key: 'landing.announcement.catalog', fallback: '5.265+ ürün · 15 premium marka · tek platform' },
  ];

  // Doubled for seamless marquee loop
  const doubled = [...messages, ...messages];

  return (
    <div
      className="overflow-hidden relative z-[60]"
      style={{
        background: 'linear-gradient(90deg, var(--c-navy-deep) 0%, var(--c-navy) 50%, var(--c-navy-deep) 100%)',
      }}
    >
      <div
        className="flex gap-16 py-2.5 text-[13px] font-medium text-white whitespace-nowrap"
        style={{
          width: 'max-content',
          animation: 'ab-scroll 30s linear infinite',
        }}
      >
        {doubled.map((m, i) => (
          <span key={i} className="inline-flex items-center gap-2.5">
            <span className="text-[color:var(--c-clay-soft)]">{m.emoji}</span>
            {t(m.key, m.fallback)}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ab-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
