import type { ReactElement, SVGProps } from 'react';

export type CategoryKey =
  | 'cooking'
  | 'cooling'
  | 'washing'
  | 'prep'
  | 'storage'
  | 'service'
  | 'oven'
  | 'beverage'
  | 'ventilation'
  | 'other';

type SvgProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

function Cooking({ size = 24, ...rest }: SvgProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M3 12h16a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4v-3Z" />
      <path d="M21 13h1.5a1.5 1.5 0 0 1 0 3H21" />
      <path d="M8 8c0-1.2.8-1.8.8-3S8 2 8 2" />
      <path d="M12 8c0-1.2.8-1.8.8-3S12 2 12 2" />
      <path d="M16 8c0-1.2.8-1.8.8-3S16 2 16 2" />
    </svg>
  );
}

function Cooling({ size = 24, ...rest }: SvgProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M5 11h14" />
      <path d="M12 6v2" />
      <path d="M12 14v4" />
      <path d="M10 16h4" />
    </svg>
  );
}

function Washing({ size = 24, ...rest }: SvgProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M3 11h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3Z" />
      <path d="M12 11V5a2 2 0 0 1 2-2h2" />
      <path d="M16 3v3" />
      <circle cx="12" cy="15" r="1" />
      <circle cx="8" cy="15" r="1" />
      <circle cx="16" cy="15" r="1" />
    </svg>
  );
}

function Prep({ size = 24, ...rest }: SvgProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="3" y="15" width="18" height="5" rx="1" />
      <path d="M7 15V7a2 2 0 0 1 2-2h2v10" />
      <path d="M14 4l6 9-2 1-5-8Z" />
    </svg>
  );
}

function Storage({ size = 24, ...rest }: SvgProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M4 9h16" />
      <path d="M4 15h16" />
      <path d="M8 6h2" />
      <path d="M8 12h2" />
      <path d="M8 18h2" />
    </svg>
  );
}

function Service({ size = 24, ...rest }: SvgProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M3 15h18" />
      <path d="M5 15a7 7 0 0 1 14 0" />
      <path d="M12 8V5" />
      <circle cx="12" cy="4" r="1" />
      <path d="M3 18h18" />
    </svg>
  );
}

function Oven({ size = 24, ...rest }: SvgProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <circle cx="7" cy="6" r="0.6" fill="currentColor" />
      <circle cx="10" cy="6" r="0.6" fill="currentColor" />
      <rect x="6" y="12" width="12" height="6" rx="1" />
      <path d="M9 15h6" />
    </svg>
  );
}

function Beverage({ size = 24, ...rest }: SvgProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M6 3h12l-1 5a5 5 0 0 1-10 0L6 3Z" />
      <path d="M7.5 10v9a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-9" />
      <path d="M10 14h4" />
    </svg>
  );
}

function Ventilation({ size = 24, ...rest }: SvgProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M3 10h18l-2 4H5l-2-4Z" />
      <path d="M6 14v6" />
      <path d="M12 14v6" />
      <path d="M18 14v6" />
      <path d="M8 6c0-1.5 1-2 2-2s2 .5 2 2-1 2-2 2" />
      <path d="M14 6c0-1.5 1-2 2-2s2 .5 2 2-1 2-2 2" />
    </svg>
  );
}

function Other({ size = 24, ...rest }: SvgProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 9h6v6H9z" />
    </svg>
  );
}

const ICONS: Record<CategoryKey, (p: SvgProps) => ReactElement> = {
  cooking: Cooking,
  cooling: Cooling,
  washing: Washing,
  prep: Prep,
  storage: Storage,
  service: Service,
  oven: Oven,
  beverage: Beverage,
  ventilation: Ventilation,
  other: Other,
};

// Sıra önemli: daha spesifik anahtarlar önce. TR/DE/EN + NL (CombiSteel/HENDI).
const KEYWORDS: Array<[RegExp, CategoryKey]> = [
  [/(yıka|yika|spül|spul|wash|dish|bulaşık|bulasik|spoel|vaatwas|afwas|glazenspoel)/i, 'washing'],
  [/(soğut|sogut|kühl|kuhl|cool|fridge|froster|gefrier|freeze|buzdolab|chiller|koel|vries|ijs|ice|barkoel)/i, 'cooling'],
  [/(fırın|firin|ofen|oven|backo|konvek|steam|stoom|convect|combisteam)/i, 'oven'],
  [/(havaland|abzug|hood|davlumbaz|ventil|extract|afzuig)/i, 'ventilation'],
  [/(servis|serving|bain|ısıt|isit|warmhalte|warmer|warmhoud|tepsi|tray|buffet)/i, 'service'],
  [/(içecek|icecek|getränk|getrank|beverage|kaffee|coffee|koffie|espresso|drank)/i, 'beverage'],
  [/(hazırlık|hazirlik|prep|arbeitsti|work.*table|çalışma|calisma|kesim|cut|werkbank|werktafel|snij|meng|mixer|deeg)/i, 'prep'],
  [/(pişir|pisir|kochen|cook|grill|herd|ocak|fry|fritöz|fritoz|frituur|salamander|kook|bakplaat|brander)/i, 'cooking'],
  [/(raf|regal|shelf|storage|depola|lager|schrank|dolap|rek|stelling|kast|schap|\bgn\b|bak|afval|opslag|container|trolley|wagen)/i, 'storage'],
];

export function resolveCategoryKey(name?: string | null): CategoryKey {
  if (!name) return 'other';
  for (const [rx, key] of KEYWORDS) if (rx.test(name)) return key;
  return 'other';
}

type CategoryIconProps = SvgProps & {
  category: CategoryKey | string | null | undefined;
};

export function CategoryIcon({ category, size = 20, ...rest }: CategoryIconProps) {
  const key = (category && (ICONS as Record<string, unknown>)[category as string]
    ? (category as CategoryKey)
    : resolveCategoryKey(category as string | null | undefined));
  const Comp = ICONS[key];
  return <Comp size={size} {...rest} />;
}
