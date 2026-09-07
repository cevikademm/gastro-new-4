/**
 * RoomLayer — floor fill + centred "name · area" label for every closed room.
 *
 * Drawn UNDER the wall bands so the plan reads like a real architectural
 * drawing: the paper is tinted, rooms are white, walls sit on top. The active
 * room gets a faint blue wash so the user sees which loop is being edited.
 * Non-interactive — picking still goes through the stage handlers.
 */

import { Group, Rect, Shape, Text } from 'react-konva';
import type { ProjectDocument, Vec2, WallId } from '../../../core/types';
import { roomAreaM2, roomPolygon } from '../../../core/geometry';
import { roomInnerPolygon, type WallBand } from '../../../core/wallBands';

interface RoomLayerProps {
  project: ProjectDocument;
  bands: Map<WallId, WallBand>;
  scale: number;
  activeRoomId?: string | null;
  selectedRoomIds?: ReadonlySet<string>;
  /**
   * 'fill'  → floor wash only (render UNDER the wall bands)
   * 'label' → name / area pill only (render ABOVE the walls so a partition
   *           crossing the room centre never slices through the text)
   * default → both (single-layer use)
   */
  part?: 'fill' | 'label';
}

const NAME_FS = 190; // mm
const AREA_FS = 150; // mm

function centroidOf(poly: Vec2[]): Vec2 {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const cross = p.x * q.y - q.x * p.y;
    a += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }
  if (Math.abs(a) < 1e-6) {
    const n = poly.length || 1;
    return {
      x: poly.reduce((s, p) => s + p.x, 0) / n,
      y: poly.reduce((s, p) => s + p.y, 0) / n,
    };
  }
  return { x: cx / (3 * a), y: cy / (3 * a) };
}

const EMPTY: ReadonlySet<string> = new Set();

export default function RoomLayer({
  project,
  bands,
  scale,
  activeRoomId = null,
  selectedRoomIds = EMPTY,
  part,
}: RoomLayerProps) {
  const rooms = Object.values(project.rooms);
  if (rooms.length === 0) return null;
  const showFill = part !== 'label';
  const showLabels = part !== 'fill';

  return (
    <>
      {rooms.map((room) => {
        const poly = roomInnerPolygon(project, room, bands) ?? roomPolygon(project, room);
        if (poly.length < 3) return null;
        const active = room.id === activeRoomId;
        const selected = selectedRoomIds.has(room.id);
        const areaM2 = roomAreaM2(project, room);
        // Label only when the room is at least ~110 px across on screen.
        const labelVisible = showLabels && Math.sqrt(Math.max(areaM2, 0)) * 1000 * scale > 110;
        const c = centroidOf(poly);
        const fill = selected
          ? 'rgba(219,234,254,0.9)'
          : active
            ? 'rgba(239,246,255,0.95)'
            : 'rgba(255,255,255,0.96)';
        // Soft halo behind the label so it stays legible over a partition
        // wall or a door swing that happens to cross the room centre.
        const areaText = `${areaM2.toFixed(1)} m²`;
        const haloW = Math.max(room.name.length * NAME_FS * 0.62, areaText.length * AREA_FS * 0.62) + NAME_FS * 1.2;
        const haloH = NAME_FS * 1.05 + AREA_FS * 1.45;

        return (
          <Group key={room.id} listening={false}>
            {showFill && (
              <Shape
                listening={false}
                sceneFunc={(konvaCtx, shape) => {
                  const ctx = konvaCtx as unknown as CanvasRenderingContext2D;
                  ctx.beginPath();
                  ctx.moveTo(poly[0].x, poly[0].y);
                  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
                  ctx.closePath();
                  ctx.fillStyle = fill;
                  ctx.fill();
                  // Konva bookkeeping (hit graph) — no stroke, fill handled above.
                  void shape;
                }}
              />
            )}
            {labelVisible && (
              <>
                <Rect
                  x={c.x - haloW / 2}
                  y={c.y - NAME_FS * 1.15}
                  width={haloW}
                  height={haloH}
                  cornerRadius={AREA_FS * 0.6}
                  fill="rgba(255,255,255,0.86)"
                  listening={false}
                />
                <Text
                  x={c.x}
                  y={c.y}
                  width={4000}
                  offsetX={2000}
                  offsetY={NAME_FS * 1.05}
                  align="center"
                  text={room.name}
                  fontSize={NAME_FS}
                  fontStyle="bold"
                  fontFamily="Inter, system-ui, sans-serif"
                  fill={active || selected ? '#1e3a8a' : '#334155'}
                  opacity={0.9}
                  listening={false}
                  wrap="none"
                  ellipsis
                />
                <Text
                  x={c.x}
                  y={c.y}
                  width={4000}
                  offsetX={2000}
                  offsetY={-AREA_FS * 0.15}
                  align="center"
                  text={areaText}
                  fontSize={AREA_FS}
                  fontFamily="Inter, system-ui, sans-serif"
                  fill={active || selected ? '#3b82f6' : '#64748b'}
                  listening={false}
                  wrap="none"
                />
              </>
            )}
          </Group>
        );
      })}
    </>
  );
}
