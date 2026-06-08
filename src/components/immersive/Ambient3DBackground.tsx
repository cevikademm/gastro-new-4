/**
 * Ambient3DBackground — WebGL/Three.js tamamen kaldırıldı.
 * Performans optimizasyonu: takılma/donma/kasma sorunu çözüldü.
 * Sadece CSS gradyanları ve animasyonları kullanılıyor.
 */

type Variant = 'navy' | 'clay' | 'mono';

interface Props {
  className?: string;
  variant?: Variant;
  density?: number;
  intensity?: number;
  scrollReactive?: boolean;
  interactive?: boolean;
  style?: React.CSSProperties;
}

const VARIANT_STYLES: Record<Variant, { bg: string; orb1: string; orb2: string }> = {
  navy: {
    bg: 'linear-gradient(135deg, #06101e 0%, #0F2440 50%, #1E3A5F 100%)',
    orb1: 'radial-gradient(circle at 30% 40%, rgba(220,38,38,0.25) 0%, transparent 60%)',
    orb2: 'radial-gradient(circle at 75% 65%, rgba(96,136,255,0.18) 0%, transparent 55%)',
  },
  clay: {
    bg: 'linear-gradient(135deg, #7a2c0f 0%, #991B1B 50%, #DC2626 100%)',
    orb1: 'radial-gradient(circle at 25% 35%, rgba(255,208,137,0.3) 0%, transparent 55%)',
    orb2: 'radial-gradient(circle at 70% 70%, rgba(220,38,38,0.2) 0%, transparent 50%)',
  },
  mono: {
    bg: 'linear-gradient(135deg, #0a0a0c 0%, #15151a 50%, #26262d 100%)',
    orb1: 'radial-gradient(circle at 30% 40%, rgba(96,136,255,0.15) 0%, transparent 55%)',
    orb2: 'radial-gradient(circle at 70% 65%, rgba(220,38,38,0.1) 0%, transparent 50%)',
  },
};

export default function Ambient3DBackground({
  className = '',
  variant = 'navy',
  style,
}: Props) {
  const s = VARIANT_STYLES[variant];

  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
        background: s.bg,
        ...style,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: s.orb1 }} />
      <div style={{ position: 'absolute', inset: 0, background: s.orb2 }} />
    </div>
  );
}
