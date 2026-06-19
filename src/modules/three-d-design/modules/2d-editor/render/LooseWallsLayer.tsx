/**
 * Renders walls that don't belong to any closed-room loop — i.e., the
 * partition walls drawn freely with the wall tool. Each is drawn as a
 * thin hatched rectangle with double-line edges, matching the room walls.
 *
 * Walls are clickable; the selected wall gets a blue highlight + the
 * editor shows endpoint handles + an edge-length input via DesignStudio2D.
 */

import { Group, Shape, Line } from 'react-konva';
import type Konva from 'konva';
import type { ProjectDocument, Vec2, WallId } from '../../../core/types';
import { normalize2, perp2, sub2 } from '../../../core/math';

interface LooseWallsLayerProps {
  project: ProjectDocument;
  scale: number;
  selectedWallId: string | null;
  onSelect: (id: WallId | null) => void;
}

let hatchPattern: CanvasPattern | null = null;
function getHatchPattern(ctx: CanvasRenderingContext2D, color = '#334155'): CanvasPattern | null {
  if (hatchPattern) return hatchPattern;
  const tile = document.createElement('canvas');
  tile.width = 40;
  tile.height = 40;
  const tctx = tile.getContext('2d');
  if (!tctx) return null;
  tctx.strokeStyle = color;
  tctx.lineWidth = 4;
  tctx.beginPath();
  for (let i = -40; i <= 80; i += 14) {
    tctx.moveTo(i, -2);
    tctx.lineTo(i + 42, 42);
  }
  tctx.stroke();
  hatchPattern = ctx.createPattern(tile, 'repeat');
  return hatchPattern;
}

export default function LooseWallsLayer({
  project,
  scale,
  selectedWallId,
  onSelect,
}: LooseWallsLayerProps) {
  // Collect ids of walls already part of a room loop.
  const roomWallIds = new Set<string>();
  for (const r of Object.values(project.rooms)) {
    for (const w of r.wallLoop) roomWallIds.add(w);
  }

  const looseWalls = Object.values(project.walls).filter((w) => !roomWallIds.has(w.id));
  if (looseWalls.length === 0) return null;

  return (
    <>
      {looseWalls.map((wall) => {
        const va = project.vertices[wall.a];
        const vb = project.vertices[wall.b];
        if (!va || !vb) return null;
        const a: Vec2 = { x: va.x, y: va.y };
        const b: Vec2 = { x: vb.x, y: vb.y };
        const dir = normalize2(sub2(b, a));
        const normal = perp2(dir);
        const half = wall.thickness / 2;
        const c0 = { x: a.x + normal.x * half, y: a.y + normal.y * half };
        const c1 = { x: b.x + normal.x * half, y: b.y + normal.y * half };
        const c2 = { x: b.x - normal.x * half, y: b.y - normal.y * half };
        const c3 = { x: a.x - normal.x * half, y: a.y - normal.y * half };
        const isSelected = wall.id === selectedWallId;
        const stroke = isSelected ? '#1d4ed8' : '#0f172a';
        const strokeW = (isSelected ? 2.6 : 1.6) / scale;
        const hitWidthPx = 12; // generous click target along the wall axis

        return (
          <Group
            key={wall.id}
            onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
              if (e.evt.button !== 0) return;
              e.cancelBubble = true;
              onSelect(wall.id as WallId);
            }}
            onTap={(e: Konva.KonvaEventObject<TouchEvent>) => {
              e.cancelBubble = true;
              onSelect(wall.id as WallId);
            }}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }}
          >
            {/* Filled body + hatch — visual only, hit-testing by Group */}
            <Shape
              listening={false}
              sceneFunc={(ctx) => {
                const native = ctx as unknown as CanvasRenderingContext2D;

                ctx.beginPath();
                ctx.moveTo(c0.x, c0.y);
                ctx.lineTo(c1.x, c1.y);
                ctx.lineTo(c2.x, c2.y);
                ctx.lineTo(c3.x, c3.y);
                ctx.closePath();
                ctx.fillStyle = isSelected ? '#eff6ff' : '#ffffff';
                ctx.fill();

                const pattern = getHatchPattern(native);
                if (pattern) {
                  native.save();
                  ctx.beginPath();
                  ctx.moveTo(c0.x, c0.y);
                  ctx.lineTo(c1.x, c1.y);
                  ctx.lineTo(c2.x, c2.y);
                  ctx.lineTo(c3.x, c3.y);
                  ctx.closePath();
                  native.clip();
                  ctx.fillStyle = pattern as unknown as string;
                  const minX = Math.min(c0.x, c1.x, c2.x, c3.x);
                  const minY = Math.min(c0.y, c1.y, c2.y, c3.y);
                  const maxX = Math.max(c0.x, c1.x, c2.x, c3.x);
                  const maxY = Math.max(c0.y, c1.y, c2.y, c3.y);
                  ctx.fillRect(minX - 50, minY - 50, maxX - minX + 100, maxY - minY + 100);
                  native.restore();
                }

                ctx.beginPath();
                ctx.moveTo(c0.x, c0.y);
                ctx.lineTo(c1.x, c1.y);
                ctx.lineTo(c2.x, c2.y);
                ctx.lineTo(c3.x, c3.y);
                ctx.closePath();
                ctx.lineWidth = strokeW;
                ctx.strokeStyle = stroke;
                ctx.stroke();
              }}
            />
            {/* Invisible click strip down the wall centerline — keeps the
                whole wall pickable even when zoomed out, regardless of
                where in the rectangle the cursor lands. */}
            <Line
              points={[a.x, a.y, b.x, b.y]}
              stroke="rgba(0,0,0,0.001)"
              strokeWidth={Math.max(wall.thickness, hitWidthPx / scale)}
              lineCap="butt"
              hitStrokeWidth={Math.max(wall.thickness, hitWidthPx / scale)}
            />
          </Group>
        );
      })}
    </>
  );
}
