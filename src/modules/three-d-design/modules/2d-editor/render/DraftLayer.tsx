/**
 * Renders the in-progress polygon / wall chain (the "rubber band") while the
 * user is drawing. Shows the live segment length + angle, highlights the start
 * vertex with a magnet pad once the cursor is close enough to close the loop,
 * and previews the closing edge for rooms.
 */

import { Circle, Line, Text } from 'react-konva';
import type { Vec2 } from '../../../core/types';
import { distance2 } from '../../../core/math';

interface DraftLayerProps {
  points: Vec2[];
  cursor: Vec2 | null;
  scale: number;
  closeRadiusMm: number;
  /** 'room' previews the closing edge back to the start; 'wall' does not. */
  mode: 'room' | 'wall' | 'rect';
  /** Wall thickness to preview the band width (mm). */
  thicknessMm?: number;
}

export default function DraftLayer({
  points,
  cursor,
  scale,
  closeRadiusMm,
  mode,
  thicknessMm = 150,
}: DraftLayerProps) {
  if (points.length === 0) return null;

  const flat: number[] = [];
  const shown = mode === 'rect' && cursor && points.length >= 1
    ? [points[0], { x: cursor.x, y: points[0].y }, cursor, { x: points[0].x, y: cursor.y }]
    : points;
  for (const p of shown) flat.push(p.x, p.y);
  if (cursor && mode !== 'rect') flat.push(cursor.x, cursor.y);

  const startCloseable =
    mode === 'room' && cursor !== null && points.length >= 3 && distance2(cursor, points[0]) <= closeRadiusMm;

  // Live distance + angle label on the rubber-band segment
  let liveLabel: { x: number; y: number; text: string } | null = null;
  if (cursor && points.length > 0 && mode !== 'rect') {
    const last = points[points.length - 1];
    const d = distance2(last, cursor);
    // Angle in screen terms (Y-down): report the CAD-style CCW angle so 0° = →, 90° = ↑.
    const deg = (Math.atan2(-(cursor.y - last.y), cursor.x - last.x) * 180) / Math.PI;
    const shownDeg = ((Math.round(deg * 10) / 10) + 360) % 360;
    liveLabel = {
      x: (last.x + cursor.x) / 2,
      y: (last.y + cursor.y) / 2,
      text: `${(d / 1000).toFixed(2)} m  ∠${shownDeg.toFixed(shownDeg % 1 === 0 ? 0 : 1)}°`,
    };
  } else if (cursor && mode === 'rect' && points.length >= 1) {
    const w = Math.abs(cursor.x - points[0].x);
    const h = Math.abs(cursor.y - points[0].y);
    liveLabel = {
      x: (points[0].x + cursor.x) / 2,
      y: (points[0].y + cursor.y) / 2,
      text: `${(w / 1000).toFixed(2)} × ${(h / 1000).toFixed(2)} m`,
    };
  }

  const bandPx = Math.max(2 / scale, thicknessMm * 0.35);

  return (
    <>
      {/* faint band preview so the user sees the wall width while drawing */}
      <Line
        points={flat}
        stroke={startCloseable ? 'rgba(22,163,74,0.18)' : 'rgba(37,99,235,0.14)'}
        strokeWidth={bandPx}
        lineCap="butt"
        lineJoin="miter"
        closed={mode === 'rect'}
        listening={false}
      />
      <Line
        points={flat}
        stroke={startCloseable ? '#16a34a' : '#2563eb'}
        strokeWidth={2 / scale}
        dash={[200 / scale, 120 / scale]}
        closed={mode === 'rect'}
        listening={false}
      />
      {/* closing-edge preview for rooms */}
      {mode === 'room' && cursor && points.length >= 2 && (
        <Line
          points={[cursor.x, cursor.y, points[0].x, points[0].y]}
          stroke="#94a3b8"
          strokeWidth={1 / scale}
          dash={[60 / scale, 60 / scale]}
          listening={false}
        />
      )}
      {points.map((p, i) => (
        <Circle
          key={`dp-${i}`}
          x={p.x}
          y={p.y}
          radius={(i === 0 ? 12 : 6) / scale}
          stroke={i === 0 && startCloseable ? '#16a34a' : '#2563eb'}
          strokeWidth={2 / scale}
          fill="#ffffff"
          listening={false}
        />
      ))}
      {startCloseable && (
        <Circle
          x={points[0].x}
          y={points[0].y}
          radius={closeRadiusMm}
          stroke="#16a34a"
          strokeWidth={1 / scale}
          dash={[60 / scale, 60 / scale]}
          listening={false}
        />
      )}
      {liveLabel && (
        <Text
          x={liveLabel.x}
          y={liveLabel.y}
          text={liveLabel.text}
          fontSize={140}
          fontFamily="Inter, system-ui, sans-serif"
          fill="#1e293b"
          offsetX={liveLabel.text.length * 34}
          offsetY={-40}
          listening={false}
        />
      )}
    </>
  );
}
