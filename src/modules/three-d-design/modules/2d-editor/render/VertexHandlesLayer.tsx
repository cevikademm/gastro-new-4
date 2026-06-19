/**
 * Square handles on each polygon vertex; selected vertex glows blue.
 * Drag is wired in DesignStudio2D — these handles just emit drag events.
 */

import { Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Vec2 } from '../../../core/types';

interface VertexHandlesLayerProps {
  points: Vec2[];
  scale: number;
  selectedIndex: number | null;
  onDragMove: (index: number, world: Vec2) => void;
  onDragEnd: (index: number, world: Vec2) => void;
  onClick: (index: number) => void;
}

export default function VertexHandlesLayer({
  points,
  scale,
  selectedIndex,
  onDragMove,
  onDragEnd,
  onClick,
}: VertexHandlesLayerProps) {
  const sizePx = 10;
  const sizeMm = sizePx / scale;

  return (
    <>
      {points.map((p, i) => {
        const selected = i === selectedIndex;
        return (
          <Rect
            key={`v-${i}`}
            x={p.x - sizeMm / 2}
            y={p.y - sizeMm / 2}
            width={sizeMm}
            height={sizeMm}
            fill={selected ? '#2563eb' : '#ffffff'}
            stroke={selected ? '#1d4ed8' : '#0f172a'}
            strokeWidth={1.5 / scale}
            draggable
            onClick={() => onClick(i)}
            onTap={() => onClick(i)}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'move';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }}
            onDragMove={(e: KonvaEventObject<DragEvent>) => {
              const node = e.target;
              const world = {
                x: node.x() + sizeMm / 2,
                y: node.y() + sizeMm / 2,
              };
              onDragMove(i, world);
            }}
            onDragEnd={(e: KonvaEventObject<DragEvent>) => {
              const node = e.target;
              const world = {
                x: node.x() + sizeMm / 2,
                y: node.y() + sizeMm / 2,
              };
              onDragEnd(i, world);
            }}
          />
        );
      })}
    </>
  );
}
