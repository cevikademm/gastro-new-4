/**
 * Corner-angle labels for a closed polygon room. For each vertex it renders a
 * small pill showing the interior angle (°) between the two walls meeting there,
 * placed just inside the corner along the angle bisector. Clicking a pill lets
 * the user retype the angle (wired by DesignStudio2D → setCornerAngle).
 *
 * Mirrors DimensionLayer: mm-based sizing so labels scale with zoom; the pill
 * border stays a constant on-screen thickness via `scale`.
 */

import { Group, Rect, Text } from 'react-konva';
import type { Vec2 } from '../../../core/types';
import { cornerAngleDeg } from '../cad/geometry';

interface AngleLayerProps {
  points: Vec2[]; // closed polygon (ordered)
  scale: number; // px per mm
  selectedIndex?: number | null;
  /** Offset of the label inward from the corner along the bisector, in mm. */
  offsetMm?: number;
  onCornerClick?: (cornerIndex: number) => void;
}

const FS = 150; // mm — matches DimensionLayer text scale

export default function AngleLayer({
  points,
  scale,
  selectedIndex = null,
  offsetMm = 380,
  onCornerClick,
}: AngleLayerProps) {
  const n = points.length;
  if (n < 3) return null;

  const items: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const cur = points[i];
    const prev = points[(i - 1 + n) % n];
    const next = points[(i + 1) % n];
    const u = { x: prev.x - cur.x, y: prev.y - cur.y };
    const w = { x: next.x - cur.x, y: next.y - cur.y };
    const lu = Math.hypot(u.x, u.y);
    const lw = Math.hypot(w.x, w.y);
    if (lu < 1e-6 || lw < 1e-6) continue;

    // Inward bisector = sum of the two unit edge vectors (points into the wedge).
    let bx = u.x / lu + w.x / lw;
    let by = u.y / lu + w.y / lw;
    let bl = Math.hypot(bx, by);
    if (bl < 1e-6) {
      // Near-straight corner (~180°): offset perpendicular to the walls instead.
      bx = -u.y / lu;
      by = u.x / lu;
      bl = 1;
    }
    const pos = { x: cur.x + (bx / bl) * offsetMm, y: cur.y + (by / bl) * offsetMm };

    const deg = Math.round(cornerAngleDeg(points, i));
    const txt = `${deg}°`;
    const w2 = txt.length * FS * 0.6 + 110;
    const h2 = FS * 1.55;
    const selected = selectedIndex === i;

    items.push(
      <Group
        key={`ang-${i}`}
        x={pos.x}
        y={pos.y}
        offsetX={w2 / 2}
        offsetY={h2 / 2}
        listening={!!onCornerClick}
        onClick={() => onCornerClick?.(i)}
        onTap={() => onCornerClick?.(i)}
      >
        <Rect
          width={w2}
          height={h2}
          cornerRadius={h2 / 2}
          fill={selected ? '#2563eb' : '#ffffff'}
          stroke={selected ? '#1d4ed8' : '#94a3b8'}
          strokeWidth={2 / scale}
          shadowColor="#0f172a"
          shadowOpacity={0.15}
          shadowBlur={6 / scale}
        />
        <Text
          width={w2}
          height={h2}
          text={txt}
          fontSize={FS}
          fontStyle="bold"
          fontFamily="Inter, system-ui, sans-serif"
          fill={selected ? '#ffffff' : '#0f172a'}
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      </Group>,
    );
  }

  return <>{items}</>;
}
