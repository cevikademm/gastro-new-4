/**
 * Square handles on vertices (room corners + ends of selected partitions);
 * selected vertices glow blue. Drag is wired by the editor — handles only
 * emit drag events with the vertex ID.
 */

import { Rect } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Vec2 } from '../../../core/types';

export interface VertexHandle {
  id: string;
  point: Vec2;
}

interface VertexHandlesLayerProps {
  handles: VertexHandle[];
  scale: number;
  selectedIds: ReadonlySet<string>;
  /** Larger targets for touch. */
  touch?: boolean;
  onSelect: (id: string, evt: KonvaEventObject<PointerEvent>) => void;
  onDragMove: (id: string, world: Vec2) => void;
  onDragEnd: (id: string, world: Vec2) => void;
}

export default function VertexHandlesLayer({
  handles,
  scale,
  selectedIds,
  touch = false,
  onSelect,
  onDragMove,
  onDragEnd,
}: VertexHandlesLayerProps) {
  const sizePx = touch ? 22 : 10;
  const sizeMm = sizePx / scale;

  return (
    <>
      {handles.map((h) => {
        const selected = selectedIds.has(h.id);
        return (
          <Rect
            key={`v-${h.id}`}
            x={h.point.x - sizeMm / 2}
            y={h.point.y - sizeMm / 2}
            width={sizeMm}
            height={sizeMm}
            fill={selected ? '#2563eb' : '#ffffff'}
            stroke={selected ? '#1d4ed8' : '#0f172a'}
            strokeWidth={1.5 / scale}
            hitStrokeWidth={Math.max(sizeMm, 16 / scale)}
            draggable
            onPointerDown={(e: KonvaEventObject<PointerEvent>) => {
              e.cancelBubble = true;
              onSelect(h.id, e);
            }}
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
              onDragMove(h.id, { x: node.x() + sizeMm / 2, y: node.y() + sizeMm / 2 });
            }}
            onDragEnd={(e: KonvaEventObject<DragEvent>) => {
              const node = e.target;
              onDragEnd(h.id, { x: node.x() + sizeMm / 2, y: node.y() + sizeMm / 2 });
            }}
          />
        );
      })}
    </>
  );
}
