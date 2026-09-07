/**
 * WallBandsLayer — draws EVERY wall (room walls and free partitions alike)
 * from the shared wall bands (`core/wallBands.ts`): per-wall thickness,
 * mitred corners, clean T-junctions, free-end caps.
 *
 *   1. Union fill (nonzero) of all band polygons — white base, so overlapping
 *      pieces never show seams.
 *   2. 45° masonry hatch clipped to the same union.
 *   3. Outline: long edges + free caps + butt steps only (no mitre seams).
 *   4. Highlights: active-room walls get a faint tint, selected walls a blue
 *      band + thicker outline.
 *   5. Hit strips: an invisible line along each centre line with a generous
 *      hit width, reporting `onSelect(wallId)`. Bubbling is cancelled so the
 *      stage does not also run its click logic.
 */

import { Line, Shape } from 'react-konva';
import type Konva from 'konva';
import type { Vec2 } from '../../../core/types';
import type { WallBandsResult } from '../../../core/wallBands';

interface WallBandsLayerProps {
  bands: WallBandsResult;
  scale: number;
  /** Walls drawn with the strong (blue) selection style. */
  selectedWallIds?: ReadonlySet<string>;
  /** Walls of the active room — faint tint so the user sees which room is being edited. */
  activeWallIds?: ReadonlySet<string>;
  hoverWallId?: string | null;
  onSelect?: (wallId: string, evt: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  /** Minimum hit width in screen px along the centre line. */
  hitPx?: number;
}

let hatchPattern: CanvasPattern | null = null;
/** Light 45° masonry hatch — thin, mid-grey lines so walls read as solid
 *  without turning the plan black. */
function getHatchPattern(ctx: CanvasRenderingContext2D, color = '#8b98a8'): CanvasPattern | null {
  if (hatchPattern) return hatchPattern;
  const tile = document.createElement('canvas');
  tile.width = 40;
  tile.height = 40;
  const tctx = tile.getContext('2d');
  if (!tctx) return null;
  tctx.strokeStyle = color;
  tctx.lineWidth = 2.2;
  tctx.beginPath();
  for (let i = -40; i <= 80; i += 14) {
    tctx.moveTo(i, -2);
    tctx.lineTo(i + 42, 42);
  }
  tctx.stroke();
  hatchPattern = ctx.createPattern(tile, 'repeat');
  return hatchPattern;
}

function tracePolygon(ctx: CanvasRenderingContext2D, poly: Vec2[]): void {
  if (poly.length < 3) return;
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
}

const EMPTY: ReadonlySet<string> = new Set();

export default function WallBandsLayer({
  bands,
  scale,
  selectedWallIds = EMPTY,
  activeWallIds = EMPTY,
  hoverWallId = null,
  onSelect,
  hitPx = 14,
}: WallBandsLayerProps) {
  const list = Array.from(bands.bands.values());
  if (list.length === 0) return null;

  return (
    <>
      {/* 1+2+3: fill, hatch, outline — one non-interactive shape */}
      <Shape
        listening={false}
        sceneFunc={(konvaCtx) => {
          const ctx = konvaCtx as unknown as CanvasRenderingContext2D;

          // Union fill (white base)
          ctx.beginPath();
          for (const b of list) tracePolygon(ctx, b.polygon);
          ctx.fillStyle = '#ffffff';
          ctx.fill('nonzero');

          // Hatch clipped to the union
          const pattern = getHatchPattern(ctx);
          if (pattern) {
            ctx.save();
            ctx.beginPath();
            for (const b of list) tracePolygon(ctx, b.polygon);
            ctx.clip('nonzero');
            ctx.fillStyle = pattern;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const b of list) {
              for (const p of b.polygon) {
                if (p.x < minX) minX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.x > maxX) maxX = p.x;
                if (p.y > maxY) maxY = p.y;
              }
            }
            ctx.fillRect(minX - 100, minY - 100, maxX - minX + 200, maxY - minY + 200);
            ctx.restore();
          }

          // Tints: active room (faint) then selected (blue), on top of the hatch
          for (const b of list) {
            const sel = selectedWallIds.has(b.wallId);
            const act = activeWallIds.has(b.wallId);
            const hov = hoverWallId === b.wallId;
            if (!sel && !act && !hov) continue;
            ctx.beginPath();
            tracePolygon(ctx, b.polygon);
            ctx.fillStyle = sel ? 'rgba(59,130,246,0.28)' : hov ? 'rgba(59,130,246,0.14)' : 'rgba(59,130,246,0.07)';
            ctx.fill('nonzero');
          }

          // Outline (exterior segments only)
          ctx.beginPath();
          for (const [p, q] of bands.outline) {
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
          }
          ctx.lineWidth = 1.5 / scale;
          ctx.strokeStyle = '#1e293b';
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Selected walls: stronger outline around their own band
          for (const b of list) {
            if (!selectedWallIds.has(b.wallId)) continue;
            ctx.beginPath();
            tracePolygon(ctx, b.polygon);
            ctx.lineWidth = 2.6 / scale;
            ctx.strokeStyle = '#1d4ed8';
            ctx.stroke();
          }
        }}
      />

      {/* 5: hit strips (invisible, generous) */}
      {onSelect &&
        list.map((b) => (
          <Line
            key={b.wallId}
            points={[b.a.x, b.a.y, b.b.x, b.b.y]}
            stroke="rgba(0,0,0,0.001)"
            strokeWidth={Math.max(b.thicknessMm, hitPx / scale)}
            hitStrokeWidth={Math.max(b.thicknessMm, hitPx / scale)}
            lineCap="butt"
            onMouseDown={(e) => {
              if (e.evt.button !== 0) return;
              e.cancelBubble = true;
              onSelect(b.wallId, e);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              onSelect(b.wallId, e);
            }}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'pointer';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }}
          />
        ))}
    </>
  );
}
