/**
 * OpeningsLayer — renders door / window / pass-through symbols on top of walls
 * and exposes the pointer hooks the editor needs to SELECT and DRAG them.
 *
 * Door symbol (architectural convention)
 *   - White rectangle clearing the wall band (the "cut")
 *   - Leaf line from the HINGE jamb toward the swing side, plus a quarter
 *     arc from the far jamb to the leaf tip
 *   - `double`: two half-width leaves, one per jamb; `sliding`: a leaf slab
 *     drawn parallel to the wall on the swing side, parked on the hinge jamb
 *
 * Window symbol: cleared band + three parallel lines (frame + glazing).
 * Pass-through: cleared band + dashed centre line (no leaf, no glass).
 *
 * Geometry comes from `core/openings.openingSpan` (endpoints, hinge, swing),
 * so 2D and 3D agree by construction on which side a door opens.
 *
 * Drag preview: `previewOffset` (per opening id) overrides the stored offset
 * while the user drags, and `previewWidth` likewise for width-handle drags.
 */

import { Circle, Shape, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { ProjectDocument, Vec2 } from '../../../core/types';
import { effectiveDoorType, openingSpan, type OpeningSpan } from '../../../core/openings';

interface OpeningsLayerProps {
  project: ProjectDocument;
  scale: number;
  selectedIds: ReadonlySet<string>;
  hoverId?: string | null;
  /** Live drag overrides (opening id → offset / width in mm). */
  previewOffset?: Record<string, number>;
  previewWidth?: Record<string, number>;
  /** Pointer down on the opening body (select and/or start a slide drag). */
  onPointerDown: (openingId: string, evt: KonvaEventObject<PointerEvent>) => void;
  /** Pointer down on a width handle of a selected opening. */
  onHandleDown?: (openingId: string, end: 'start' | 'end', evt: KonvaEventObject<PointerEvent>) => void;
  /** Show a live "distance to both wall ends" label for this opening. */
  liveLabelFor?: string | null;
  touch?: boolean;
}

interface OpeningRender {
  id: string;
  kind: 'door' | 'window' | 'pass-through';
  doorType: 'single' | 'double' | 'sliding';
  span: OpeningSpan;
  offset: number;
}

/** Draw a quarter-arc from the `far` jamb around `hinge` to the leaf tip. */
function drawSwingArc(
  ctx: CanvasRenderingContext2D,
  hinge: Vec2,
  far: Vec2,
  swingDir: Vec2,
  radius: number,
): void {
  const startAngle = Math.atan2(far.y - hinge.y, far.x - hinge.x);
  const sweep = Math.atan2(swingDir.y, swingDir.x) - startAngle;
  let endAngle = startAngle + sweep;
  if (Math.abs(sweep) > Math.PI) {
    endAngle = startAngle + (sweep > 0 ? sweep - 2 * Math.PI : sweep + 2 * Math.PI);
  }
  ctx.beginPath();
  ctx.arc(hinge.x, hinge.y, radius, startAngle, endAngle, endAngle < startAngle);
  ctx.stroke();
}

export default function OpeningsLayer({
  project,
  scale,
  selectedIds,
  hoverId = null,
  previewOffset,
  previewWidth,
  onPointerDown,
  onHandleDown,
  liveLabelFor = null,
  touch = false,
}: OpeningsLayerProps) {
  const items: OpeningRender[] = [];
  for (const op of Object.values(project.openings)) {
    const po = previewOffset?.[op.id];
    const pw = previewWidth?.[op.id];
    const src = po !== undefined || pw !== undefined ? { ...op, offset: po ?? op.offset, width: pw ?? op.width } : op;
    const span = openingSpan(project, src);
    if (!span) continue;
    items.push({ id: op.id, kind: op.kind, doorType: effectiveDoorType(op), span, offset: src.offset });
  }
  if (items.length === 0) return null;
  void onHandleDown;
  void liveLabelFor;
  void previewWidth;
  void touch;

  return (
    <>
      {items.map((it) => {
        const selected = selectedIds.has(it.id);
        const hovered = hoverId === it.id;
        const { a, b, normal, hingePt, farPt, swingDir, widthMm, thicknessMm } = it.span;
        const half = thicknessMm / 2;
        const nx = normal.x * half;
        const ny = normal.y * half;
        const c0 = { x: a.x + nx, y: a.y + ny };
        const c1 = { x: b.x + nx, y: b.y + ny };
        const c2 = { x: b.x - nx, y: b.y - ny };
        const c3 = { x: a.x - nx, y: a.y - ny };
        const bandPath = (ctx: CanvasRenderingContext2D) => {
          ctx.beginPath();
          ctx.moveTo(c0.x, c0.y);
          ctx.lineTo(c1.x, c1.y);
          ctx.lineTo(c2.x, c2.y);
          ctx.lineTo(c3.x, c3.y);
          ctx.closePath();
        };
        const inkStrong = selected ? '#1d4ed8' : hovered ? '#2563eb' : '#0f172a';
        const inkLeaf = selected ? '#1d4ed8' : '#1f2937';
        const inkArc = selected ? '#1d4ed8' : '#475569';
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

        return (
          <Shape
            key={it.id}
            onPointerDown={(e: KonvaEventObject<PointerEvent>) => {
              e.cancelBubble = true;
              onPointerDown(it.id, e);
            }}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }}
            sceneFunc={(konvaCtx, shape) => {
              const ctx = konvaCtx as unknown as CanvasRenderingContext2D;

              bandPath(ctx);
              ctx.fillStyle = selected ? '#eff6ff' : '#ffffff';
              ctx.fill();

              ctx.beginPath();
              ctx.moveTo(c0.x, c0.y); ctx.lineTo(c3.x, c3.y);
              ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y);
              ctx.lineWidth = (selected ? 2.5 : 1.5) / scale;
              ctx.strokeStyle = inkStrong;
              ctx.stroke();

              if (it.kind === 'door') {
                ctx.setLineDash([]);
                if (it.doorType === 'sliding') {
                  const off = half + 40;
                  const dirToFar = {
                    x: (farPt.x - hingePt.x) / widthMm,
                    y: (farPt.y - hingePt.y) / widthMm,
                  };
                  const s0 = {
                    x: hingePt.x - dirToFar.x * (widthMm / 2) + swingDir.x * off,
                    y: hingePt.y - dirToFar.y * (widthMm / 2) + swingDir.y * off,
                  };
                  const s1 = {
                    x: hingePt.x + dirToFar.x * (widthMm / 2) + swingDir.x * off,
                    y: hingePt.y + dirToFar.y * (widthMm / 2) + swingDir.y * off,
                  };
                  ctx.beginPath();
                  ctx.moveTo(s0.x, s0.y);
                  ctx.lineTo(s1.x, s1.y);
                  ctx.lineWidth = (selected ? 5 : 4) / scale;
                  ctx.strokeStyle = inkLeaf;
                  ctx.stroke();
                  ctx.beginPath();
                  ctx.moveTo(a.x + swingDir.x * off, a.y + swingDir.y * off);
                  ctx.lineTo(b.x + swingDir.x * off, b.y + swingDir.y * off);
                  ctx.lineWidth = 1 / scale;
                  ctx.strokeStyle = inkArc;
                  ctx.setLineDash([60 / scale, 40 / scale]);
                  ctx.stroke();
                  ctx.setLineDash([]);
                } else if (it.doorType === 'double') {
                  const r = widthMm / 2;
                  const tipA = { x: a.x + swingDir.x * r, y: a.y + swingDir.y * r };
                  const tipB = { x: b.x + swingDir.x * r, y: b.y + swingDir.y * r };
                  ctx.lineWidth = (selected ? 2.4 : 1.6) / scale;
                  ctx.strokeStyle = inkLeaf;
                  ctx.beginPath();
                  ctx.moveTo(a.x, a.y); ctx.lineTo(tipA.x, tipA.y);
                  ctx.moveTo(b.x, b.y); ctx.lineTo(tipB.x, tipB.y);
                  ctx.stroke();
                  ctx.lineWidth = 1 / scale;
                  ctx.strokeStyle = inkArc;
                  ctx.setLineDash([60 / scale, 40 / scale]);
                  drawSwingArc(ctx, a, mid, swingDir, r);
                  drawSwingArc(ctx, b, mid, swingDir, r);
                  ctx.setLineDash([]);
                } else {
                  const tip = {
                    x: hingePt.x + swingDir.x * widthMm,
                    y: hingePt.y + swingDir.y * widthMm,
                  };
                  ctx.beginPath();
                  ctx.moveTo(hingePt.x, hingePt.y);
                  ctx.lineTo(tip.x, tip.y);
                  ctx.lineWidth = (selected ? 2.4 : 1.6) / scale;
                  ctx.strokeStyle = inkLeaf;
                  ctx.stroke();
                  ctx.lineWidth = 1 / scale;
                  ctx.strokeStyle = inkArc;
                  ctx.setLineDash([60 / scale, 40 / scale]);
                  drawSwingArc(ctx, hingePt, farPt, swingDir, widthMm);
                  ctx.setLineDash([]);
                }
              } else if (it.kind === 'window') {
                const offsets = [-thicknessMm * 0.18, 0, thicknessMm * 0.18];
                ctx.lineWidth = (selected ? 1.8 : 1.2) / scale;
                ctx.strokeStyle = inkStrong;
                for (const off of offsets) {
                  ctx.beginPath();
                  ctx.moveTo(a.x + normal.x * off, a.y + normal.y * off);
                  ctx.lineTo(b.x + normal.x * off, b.y + normal.y * off);
                  ctx.stroke();
                }
              } else {
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.lineWidth = (selected ? 1.8 : 1.2) / scale;
                ctx.strokeStyle = inkArc;
                ctx.setLineDash([80 / scale, 50 / scale]);
                ctx.stroke();
                ctx.setLineDash([]);
              }

              shape.getLayer()?.batchDraw();
            }}
            hitFunc={(konvaCtx, shape) => {
              const ctx = konvaCtx as unknown as CanvasRenderingContext2D;
              bandPath(ctx);
              (konvaCtx as unknown as { fillStrokeShape: (s: unknown) => void }).fillStrokeShape(shape);
            }}
          />
        );
      })}
    </>
  );
}

/**
 * Handles + live label for SELECTED openings (drawn on top of the symbols).
 */
export function OpeningHandlesLayer({
  project,
  scale,
  selectedIds,
  previewOffset,
  previewWidth,
  onHandleDown,
  liveLabelFor = null,
  touch = false,
}: Omit<OpeningsLayerProps, 'onPointerDown' | 'hoverId'>) {
  const nodes: React.ReactNode[] = [];
  const handleR = (touch ? 11 : 6) / scale;
  for (const op of Object.values(project.openings)) {
    const isSel = selectedIds.has(op.id);
    const isLive = liveLabelFor === op.id;
    if (!isSel && !isLive) continue;
    const po = previewOffset?.[op.id];
    const pw = previewWidth?.[op.id];
    const src = po !== undefined || pw !== undefined ? { ...op, offset: po ?? op.offset, width: pw ?? op.width } : op;
    const span = openingSpan(project, src);
    if (!span) continue;
    const { a, b, normal, thicknessMm, wallLengthMm, widthMm } = span;
    if (isSel && onHandleDown) {
      for (const [end, p] of [['start', a], ['end', b]] as const) {
        nodes.push(
          <Circle
            key={`h-${op.id}-${end}`}
            x={p.x}
            y={p.y}
            radius={handleR}
            fill="#ffffff"
            stroke="#1d4ed8"
            strokeWidth={2 / scale}
            hitStrokeWidth={Math.max(handleR, 12 / scale)}
            onPointerDown={(e: KonvaEventObject<PointerEvent>) => {
              e.cancelBubble = true;
              onHandleDown(op.id, end, e);
            }}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'ew-resize';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }}
          />,
        );
      }
    }
    if (isLive || isSel) {
      const text = `${(src.offset / 1000).toFixed(2)} m  |  ${((wallLengthMm - src.offset - widthMm) / 1000).toFixed(2)} m`;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const off = thicknessMm / 2 + 260;
      nodes.push(
        <Text
          key={`lbl-${op.id}`}
          x={mid.x - normal.x * off}
          y={mid.y - normal.y * off}
          text={text}
          fontSize={120}
          fontFamily="Inter, system-ui, sans-serif"
          fill="#1d4ed8"
          offsetX={text.length * 30}
          offsetY={60}
          listening={false}
        />,
      );
    }
  }
  return <>{nodes}</>;
}
