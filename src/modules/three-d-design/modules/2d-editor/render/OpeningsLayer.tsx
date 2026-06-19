/**
 * OpeningsLayer — renders door / window symbols on top of walls.
 *
 * Door symbol
 *   - White rectangle clearing the wall band (gives the "cut" look)
 *   - Quarter-circle arc showing swing direction
 *   - Perpendicular line representing the door leaf
 *
 * Window symbol
 *   - White rectangle clearing the wall
 *   - Two parallel lines (frame + glazing) running along the wall
 *
 * Positioning
 *   Each opening lives ALONG its host wall by `offset` (mm from wall.start)
 *   and has a `width`. We resolve the wall's start/end vertices from the
 *   project doc, compute the opening's two endpoints in world space, then
 *   draw symbols centered on the wall's centerline (perpendicular to the
 *   wall direction).
 */

import { Shape } from 'react-konva';
import type { ProjectDocument, Vec2 } from '../../../core/types';
import { normalize2, perp2, sub2 } from '../../../core/math';

interface OpeningsLayerProps {
  project: ProjectDocument;
  scale: number;
  /** mm thickness applied to the wall band (drives the cleared rectangle). */
  wallThicknessMm?: number;
  selectedOpeningId: string | null;
  onClick: (openingId: string) => void;
}

interface OpeningRender {
  id: string;
  kind: 'door' | 'window' | 'pass-through';
  /** Two centerline endpoints in world mm — opening start (offset from wall start) and end. */
  a: Vec2;
  b: Vec2;
  /** Unit direction along the wall a→b. */
  dir: Vec2;
  /** Left-hand perpendicular unit vector (for symbol normal). */
  normal: Vec2;
  thicknessMm: number;
}

export default function OpeningsLayer({
  project,
  scale,
  wallThicknessMm = 150,
  selectedOpeningId,
  onClick,
}: OpeningsLayerProps) {
  const items: OpeningRender[] = [];

  for (const op of Object.values(project.openings)) {
    const wall = project.walls[op.wallId];
    if (!wall) continue;
    const va = project.vertices[wall.a];
    const vb = project.vertices[wall.b];
    if (!va || !vb) continue;
    const wallStart: Vec2 = { x: va.x, y: va.y };
    const wallEnd: Vec2 = { x: vb.x, y: vb.y };
    const dir = normalize2(sub2(wallEnd, wallStart));
    const normal = perp2(dir);
    const a: Vec2 = {
      x: wallStart.x + dir.x * op.offset,
      y: wallStart.y + dir.y * op.offset,
    };
    const b: Vec2 = {
      x: wallStart.x + dir.x * (op.offset + op.width),
      y: wallStart.y + dir.y * (op.offset + op.width),
    };
    items.push({
      id: op.id,
      kind: op.kind,
      a,
      b,
      dir,
      normal,
      thicknessMm: wall.thickness ?? wallThicknessMm,
    });
  }

  if (items.length === 0) return null;

  return (
    <>
      {items.map((it) => {
        const selected = it.id === selectedOpeningId;
        return (
          <Shape
            key={it.id}
            onClick={() => onClick(it.id)}
            onTap={() => onClick(it.id)}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }}
            sceneFunc={(ctx, shape) => {
              const half = it.thicknessMm / 2;
              const nx = it.normal.x * half;
              const ny = it.normal.y * half;
              // Four corners of the wall-band rectangle for this opening
              const c0 = { x: it.a.x + nx, y: it.a.y + ny };
              const c1 = { x: it.b.x + nx, y: it.b.y + ny };
              const c2 = { x: it.b.x - nx, y: it.b.y - ny };
              const c3 = { x: it.a.x - nx, y: it.a.y - ny };

              // ── Clear the wall band (white over the hatch) ─────────────
              ctx.beginPath();
              ctx.moveTo(c0.x, c0.y);
              ctx.lineTo(c1.x, c1.y);
              ctx.lineTo(c2.x, c2.y);
              ctx.lineTo(c3.x, c3.y);
              ctx.closePath();
              ctx.fillStyle = '#ffffff';
              ctx.fill();

              // ── Frame (the two short edges across the wall thickness) ──
              ctx.beginPath();
              ctx.moveTo(c0.x, c0.y); ctx.lineTo(c3.x, c3.y);
              ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y);
              ctx.lineWidth = (selected ? 2.5 : 1.5) / scale;
              ctx.strokeStyle = selected ? '#1d4ed8' : '#0f172a';
              ctx.stroke();

              if (it.kind === 'door' || it.kind === 'pass-through') {
                // ── Door leaf + swing arc ───────────────────────────────
                // Hinge at `a` (wall-start side), opens 90° toward the
                // INSIDE of the room (left-hand normal direction).
                const hinge = it.a;
                const widthMm = Math.hypot(it.b.x - it.a.x, it.b.y - it.a.y);
                // Door leaf endpoint when fully open (90° toward normal)
                const leafEnd = {
                  x: hinge.x + it.normal.x * widthMm,
                  y: hinge.y + it.normal.y * widthMm,
                };

                // Leaf
                ctx.beginPath();
                ctx.moveTo(hinge.x, hinge.y);
                ctx.lineTo(leafEnd.x, leafEnd.y);
                ctx.lineWidth = (selected ? 2.4 : 1.6) / scale;
                ctx.strokeStyle = selected ? '#1d4ed8' : '#1f2937';
                ctx.stroke();

                // Swing arc (90°)
                const startAngle = Math.atan2(it.b.y - hinge.y, it.b.x - hinge.x);
                const sweep = Math.atan2(it.normal.y, it.normal.x) - startAngle;
                // Normalize sweep to (-PI, PI] so we draw the short way
                let endAngle = startAngle + sweep;
                if (Math.abs(sweep) > Math.PI) {
                  endAngle = startAngle + (sweep > 0 ? sweep - 2 * Math.PI : sweep + 2 * Math.PI);
                }
                ctx.beginPath();
                ctx.arc(
                  hinge.x,
                  hinge.y,
                  widthMm,
                  startAngle,
                  endAngle,
                  endAngle < startAngle,
                );
                ctx.lineWidth = 1 / scale;
                ctx.strokeStyle = selected ? '#1d4ed8' : '#475569';
                (ctx as any).setLineDash?.([60 / scale, 40 / scale]);
                ctx.stroke();
                (ctx as any).setLineDash?.([]);
              } else {
                // ── Window: 3 parallel lines along the opening ──────────
                const offsets = [-it.thicknessMm * 0.18, 0, it.thicknessMm * 0.18];
                ctx.lineWidth = (selected ? 1.8 : 1.2) / scale;
                ctx.strokeStyle = selected ? '#1d4ed8' : '#0f172a';
                for (const off of offsets) {
                  const pa = {
                    x: it.a.x + it.normal.x * off,
                    y: it.a.y + it.normal.y * off,
                  };
                  const pb = {
                    x: it.b.x + it.normal.x * off,
                    y: it.b.y + it.normal.y * off,
                  };
                  ctx.beginPath();
                  ctx.moveTo(pa.x, pa.y);
                  ctx.lineTo(pb.x, pb.y);
                  ctx.stroke();
                }
              }

              // Konva needs a hit region. Use the wall-band rectangle.
              shape.getLayer()?.batchDraw();
            }}
            // Hit region — the four-corner rectangle around the opening.
            hitFunc={(ctx, shape) => {
              const half = it.thicknessMm / 2;
              const nx = it.normal.x * half;
              const ny = it.normal.y * half;
              ctx.beginPath();
              ctx.moveTo(it.a.x + nx, it.a.y + ny);
              ctx.lineTo(it.b.x + nx, it.b.y + ny);
              ctx.lineTo(it.b.x - nx, it.b.y - ny);
              ctx.lineTo(it.a.x - nx, it.a.y - ny);
              ctx.closePath();
              ctx.fillStrokeShape(shape);
            }}
          />
        );
      })}
    </>
  );
}
