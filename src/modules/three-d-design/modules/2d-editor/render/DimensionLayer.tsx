/**
 * AutoCAD-style dimension lines, one per edge:
 *   - Witness lines extend from each vertex outward (perpendicular to edge),
 *     with a small overshoot past the dimension line (CAD convention).
 *   - The dimension line itself runs parallel to the edge, offset outward.
 *   - End caps are short tick marks at 45°.
 *   - Length label sits centred on the dimension line and is flipped when it
 *     would read upside-down, so every label is readable left-to-right.
 *
 * Edges are keyed by wall id so clicking a label edits THAT wall's length.
 */

import { Shape, Text } from 'react-konva';
import type { Vec2 } from '../../../core/types';
import { distance2, normalize2, perp2, sub2 } from '../../../core/math';

export interface DimensionEdge {
  wallId: string;
  a: Vec2;
  b: Vec2;
  /** Which side of a→b the dimension sits on. Default 'left' (perp2(dir)). */
  side?: 'left' | 'right';
}

interface DimensionLayerProps {
  edges: DimensionEdge[];
  scale: number; // px per mm
  /** Offset of the dimension line from the edge, in mm. */
  offsetMm?: number;
  /** Length of the witness lines past the dimension line, in mm. */
  overshootMm?: number;
  onEdgeClick?: (wallId: string) => void;
}

const FS = 140; // mm

export default function DimensionLayer({
  edges,
  scale,
  offsetMm = 400,
  overshootMm = 100,
  onEdgeClick,
}: DimensionLayerProps) {
  if (edges.length === 0) return null;

  const items: React.ReactNode[] = [];
  for (const e of edges) {
    const { a, b } = e;
    const dir = normalize2(sub2(b, a));
    const nLeft = perp2(dir);
    const normal = e.side === 'right' ? { x: -nLeft.x, y: -nLeft.y } : nLeft;
    const off = { x: normal.x * offsetMm, y: normal.y * offsetMm };
    const a2 = { x: a.x + off.x, y: a.y + off.y };
    const b2 = { x: b.x + off.x, y: b.y + off.y };
    const aw = { x: a.x + normal.x * (offsetMm + overshootMm), y: a.y + normal.y * (offsetMm + overshootMm) };
    const bw = { x: b.x + normal.x * (offsetMm + overshootMm), y: b.y + normal.y * (offsetMm + overshootMm) };

    const lengthMm = distance2(a, b);
    const label = `${(lengthMm / 1000).toFixed(2)} m`;
    const mid = { x: (a2.x + b2.x) / 2, y: (a2.y + b2.y) / 2 };
    let angleDeg = (Math.atan2(b2.y - a2.y, b2.x - a2.x) * 180) / Math.PI;
    // Readability flip: text drawn on screen with Y-down; angles in (90, 270)
    // would render upside-down → rotate 180° and put the text on the same
    // world side of the line.
    const norm = ((angleDeg % 360) + 360) % 360;
    const flip = norm > 90 && norm < 270;
    if (flip) angleDeg += 180;
    // Text sits "above" the dimension line (toward the normal side). Left/right
    // side flips which world side that is; the offsets below keep it clear of
    // the line in both cases.
    const textOffsetY = flip ? -40 : FS + 30;

    items.push(
      <Shape
        key={`dim-${e.wallId}`}
        listening={!!onEdgeClick}
        onPointerDown={(ev) => {
          ev.cancelBubble = true;
          onEdgeClick?.(e.wallId);
        }}
        hitStrokeWidth={20 / scale}
        sceneFunc={(ctx) => {
          ctx.strokeStyle = '#7c8896';
          ctx.lineWidth = 1 / scale;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(aw.x, aw.y);
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(bw.x, bw.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(a2.x, a2.y);
          ctx.lineTo(b2.x, b2.y);
          ctx.stroke();

          const tick = 80;
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
        hitFunc={(ctx, shape) => {
          // Clickable band along the dimension line.
          ctx.beginPath();
          ctx.moveTo(a2.x, a2.y);
          ctx.lineTo(b2.x, b2.y);
          ctx.lineWidth = 260;
          (ctx as unknown as { strokeShape: (s: unknown) => void }).strokeShape(shape);
        }}
      />,
    );

    items.push(
      <Text
        key={`dim-text-${e.wallId}`}
        x={mid.x}
        y={mid.y}
        text={label}
        fontSize={FS}
        fontFamily="Inter, system-ui, sans-serif"
        fill="#334155"
        offsetX={label.length * 36}
        offsetY={textOffsetY}
        rotation={angleDeg}
        listening={false}
      />,
    );
  }

  return <>{items}</>;
}
