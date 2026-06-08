import { useTranslation } from 'react-i18next';
import { BadgePercent, CreditCard, Flame, PackageCheck, Truck } from 'lucide-react';

/**
 * Scrolling announcement bar with urgency messages.
 * Ücretsiz kargo, indirim kodu, flash sale, leasing vb.
 */
export function AnnouncementBar() {
  const { t } = useTranslation();

  const messages = [
    { Icon: Truck, key: 'landing.announcement.shipping', fallback: '24-48h Lieferung für lagernde Bestseller' },
    { Icon: BadgePercent, key: 'landing.announcement.discount', fallback: 'Projektpakete mit B2B-Sonderkonditionen' },
    { Icon: Flame, key: 'landing.announcement.flash', fallback: 'Diese Woche Diamond Kühltechnik als Flash-Angebot' },
    { Icon: CreditCard, key: 'landing.announcement.leasing', fallback: 'Leasing bis 60 Monate direkt im Angebot' },
    { Icon: PackageCheck, key: 'landing.announcement.catalog', fallback: '5.265+ Produkte · 15 Premiummarken · ein Einkauf' },
  ];

  // Doubled for seamless marquee loop
  const doubled = [...messages, ...messages];

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] h-9 overflow-hidden"
      style={{
        background: 'linear-gradient(90deg, var(--c-navy-deep) 0%, var(--c-navy) 50%, var(--c-navy-deep) 100%)',
      }}
    >
      <div
        className="flex h-full items-center gap-16 text-[13px] font-medium text-white whitespace-nowrap"
        style={{
          width: 'max-content',
          animation: 'ab-scroll 30s linear infinite',
        }}
      >
        {doubled.map((m, i) => (
          <span key={i} className="inline-flex items-center gap-2.5">
            <m.Icon size={14} strokeWidth={2} className="text-[color:var(--c-clay-soft)]" />
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
