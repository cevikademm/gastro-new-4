/**
 * AutoCAD-style dimension lines for each edge of a polygon:
 *   - Witness lines extend from each vertex outward (perpendicular to edge),
 *     with a small overshoot past the dimension line (CAD convention).
 *   - The dimension line itself runs parallel to the edge, offset outward.
 *   - End caps are short tick marks at 45°.
 *   - Length label sits centered on the dimension line.
 *
 * Editing the label is wired up by DesignStudio2D — this layer just renders
 * + reports clicks via onEdgeClick.
 */

import { Shape, Text } from 'react-konva';
import type { Vec2 } from '../../../core/types';
import { distance2, normalize2, perp2, sub2 } from '../../../core/math';

interface DimensionLayerProps {
  points: Vec2[];        // closed polygon
  scale: number;         // px per mm
  /** Offset of the dimension line outward from the polygon edge, in mm. */
  offsetMm?: number;
  /** Length of the witness lines past the dimension line, in mm. */
  overshootMm?: number;
  onEdgeClick?: (edgeIndex: number) => void;
}

export default function DimensionLayer({
  points,
  scale,
  offsetMm = 400,
  overshootMm = 100,
  onEdgeClick,
}: DimensionLayerProps) {
  if (points.length < 2) return null;

  const items: React.ReactNode[] = [];
  for (let i = 0, n = points.length; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const dir = normalize2(sub2(b, a));
    const normal = perp2(dir); // left-hand
    const off = { x: normal.x * offsetMm, y: normal.y * offsetMm };
    const a2 = { x: a.x + off.x, y: a.y + off.y };
    const b2 = { x: b.x + off.x, y: b.y + off.y };
    const aw = {
      x: a.x + normal.x * (offsetMm + overshootMm),
      y: a.y + normal.y * (offsetMm + overshootMm),
    };
    const bw = {
      x: b.x + normal.x * (offsetMm + overshootMm),
      y: b.y + normal.y * (offsetMm + overshootMm),
    };

    const lengthMm = distance2(a, b);
    const label = `${(lengthMm / 1000).toFixed(2)} m`;
    const mid = { x: (a2.x + b2.x) / 2, y: (a2.y + b2.y) / 2 };
    const angleDeg = (Math.atan2(b2.y - a2.y, b2.x - a2.x) * 180) / Math.PI;

    items.push(
      <Shape
        key={`dim-${i}`}
        listening={!!onEdgeClick}
        onClick={() => onEdgeClick?.(i)}
        onTap={() => onEdgeClick?.(i)}
        sceneFunc={(ctx) => {
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1 / scale;

          // Witness lines (from vertex outward through dimension line)
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(aw.x, aw.y);
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(bw.x, bw.y);
          ctx.stroke();

          // Dimension line
          ctx.beginPath();
          ctx.moveTo(a2.x, a2.y);
          ctx.lineTo(b2.x, b2.y);
          ctx.stroke();

          // 45° end ticks
          const tick = 80 / 1; // mm
          const tA = { x: dir.x + normal.x, y: dir.y + normal.y };
          const tB = { x: -dir.x + normal.x, y: -dir.y + normal.y };
          const tAlen = Math.hypot(tA.x, tA.y) || 1;
          const tBlen = Math.hypot(tB.x, tB.y) || 1;
          ctx.beginPath();
          ctx.moveTo(a2.x - (tA.x / tAlen) * tick * 0.5, a2.y - (tA.y / tAlen) * tick * 0.5);
          ctx.lineTo(a2.x + (tA.x / tAlen) * tick * 0.5, a2.y + (tA.y / tAlen) * tick * 0.5);
          ctx.moveTo(b2.x - (tB.x / tBlen) * tick * 0.5, b2.y - (tB.y / tBlen) * tick * 0.5);
          ctx.lineTo(b2.x + (tB.x / tBlen) * tick * 0.5, b2.y + (tB.y / tBlen) * tick * 0.5);
          ctx.stroke();
        }}
      />,
    );

    items.push(
      <Text
        key={`dim-text-${i}`}
        x={mid.x}
        y={mid.y}
        text={label}
        fontSize={140}
        fontFamily="Inter, system-ui, sans-serif"
        fill="#0f172a"
        offsetX={label.length * 36}
        offsetY={170}
        rotation={angleDeg}
        listening={false}
      />,
    );
  }

  return <>{items}</>;
}
