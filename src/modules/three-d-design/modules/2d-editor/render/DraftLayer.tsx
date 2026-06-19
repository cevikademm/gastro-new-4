/**
 * Renders the in-progress polygon (the "rubber band") while the user is
 * drawing a room. Highlights the start vertex with a magnet pad once the
 * cursor is close enough to close the loop.
 */

import { Circle, Line, Text } from 'react-konva';
import type { Vec2 } from '../../../core/types';
import { distance2 } from '../../../core/math';

interface DraftLayerProps {
  points: Vec2[];
  cursor: Vec2 | null;
  scale: number;
  closeRadiusMm: number;
}

export default function DraftLayer({
  points,
  cursor,
  scale,
  closeRadiusMm,
}: DraftLayerProps) {
  if (points.length === 0) return null;

  const flat: number[] = [];
  for (const p of points) flat.push(p.x, p.y);
  if (cursor) flat.push(cursor.x, cursor.y);

  const startCloseable =
    cursor !== null &&
    points.length >= 3 &&
    distance2(cursor, points[0]) <= closeRadiusMm;

  // Live distance label on the rubber-band segment
  let liveLabel: { x: number; y: number; text: string } | null = null;
  if (cursor && points.length > 0) {
    const last = points[points.length - 1];
    const d = distance2(last, cursor);
    liveLabel = {
      x: (last.x + cursor.x) / 2,
      y: (last.y + cursor.y) / 2,
      text: `${(d / 1000).toFixed(2)} m`,
    };
  }

  return (
    <>
      <Line
        points={flat}
        stroke={startCloseable ? '#16a34a' : '#2563eb'}
        strokeWidth={2 / scale}
        dash={[200 / scale, 120 / scale]}
        listening={false}
      />
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
          offsetX={liveLabel.text.length * 36}
          offsetY={-40}
          listening={false}
        />
      )}
    </>
  );
}
