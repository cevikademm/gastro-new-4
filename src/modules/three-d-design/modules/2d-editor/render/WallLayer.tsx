/**
 * Renders a closed wall polygon as a double-line wall with a 45° diagonal
 * masonry hatch in the wall band — matches the AutoCAD-style look of the
 * legacy Manuel Çizim editor.
 *
 * Outer/inner outlines come from the SHARED offsetPolygon utility — same
 * code is used by 3D footprint generation, so 2D and 3D agree by
 * construction.
 */

import { Shape } from 'react-konva';
import type { Vec2 } from '../../../core/types';
import { offsetPolygon } from '../../../core/polygon';

interface WallLayerProps {
  points: Vec2[];
  thicknessMm?: number;
  scale: number;
  selected?: boolean;
}

// ── Cached hatch pattern ───────────────────────────────────────────────────
// Built once per session; Canvas repeats it across the wall band.
let hatchPattern: CanvasPattern | null = null;
function getHatchPattern(ctx: CanvasRenderingContext2D, color = '#334155'): CanvasPattern | null {
  if (hatchPattern) return hatchPattern;
  const tile = document.createElement('canvas');
  // Pattern coords are in WORLD MM (ctx is already transformed). We pick a
  // tile that's coarse enough to read at typical zoom levels: 40 mm spacing,
  // 1.2 mm line. Konva handles HiDPI on the parent canvas so the pattern
  // stays crisp.
  const tilePx = 40;
  tile.width = tilePx;
  tile.height = tilePx;
  const tctx = tile.getContext('2d');
  if (!tctx) return null;
  tctx.strokeStyle = color;
  tctx.lineWidth = 4;
  // Draw three parallel diagonals so the tile seams disappear
  tctx.beginPath();
  for (let i = -tilePx; i <= tilePx * 2; i += 14) {
    tctx.moveTo(i, -2);
    tctx.lineTo(i + tilePx + 2, tilePx + 2);
  }
  tctx.stroke();
  hatchPattern = ctx.createPattern(tile, 'repeat');
  return hatchPattern;
}

export default function WallLayer({
  points,
  thicknessMm = 150,
  scale,
  selected = false,
}: WallLayerProps) {
  if (points.length < 3) return null;

  const half = thicknessMm / 2;
  const outer = offsetPolygon(points, half);
  const inner = offsetPolygon(points, -half);

  return (
    <Shape
      sceneFunc={(ctx) => {
        const native = ctx as unknown as CanvasRenderingContext2D;

        // ── Wall band: outer minus inner via even-odd fill ────────────
        ctx.beginPath();
        ctx.moveTo(outer[0].x, outer[0].y);
        for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i].x, outer[i].y);
        ctx.closePath();
        ctx.moveTo(inner[0].x, inner[0].y);
        for (let i = 1; i < inner.length; i++) ctx.lineTo(inner[i].x, inner[i].y);
        ctx.closePath();

        // White base so the hatch reads cleanly
        ctx.fillStyle = selected ? '#eff6ff' : '#ffffff';
        native.fill('evenodd');

        // Diagonal hatch on top of the band, clipped to the same shape.
        const pattern = getHatchPattern(native);
        if (pattern) {
          native.save();
          // Re-build the same path so we can clip to it.
          ctx.beginPath();
          ctx.moveTo(outer[0].x, outer[0].y);
          for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i].x, outer[i].y);
          ctx.closePath();
          ctx.moveTo(inner[0].x, inner[0].y);
          for (let i = 1; i < inner.length; i++) ctx.lineTo(inner[i].x, inner[i].y);
          ctx.closePath();
          (native as any).clip('evenodd');
          ctx.fillStyle = pattern as unknown as string;
          // Cover bbox of outer with one fillRect call.
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const p of outer) {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
          }
          ctx.fillRect(minX - 100, minY - 100, maxX - minX + 200, maxY - minY + 200);
          native.restore();
        }

        // ── Outer outline ──────────────────────────────────────────────
        ctx.beginPath();
        ctx.moveTo(outer[0].x, outer[0].y);
        for (let i = 1; i < outer.length; i++) ctx.lineTo(outer[i].x, outer[i].y);
        ctx.closePath();
        ctx.lineWidth = (selected ? 2.6 : 1.6) / scale;
        ctx.strokeStyle = selected ? '#1d4ed8' : '#0f172a';
        ctx.stroke();

        // ── Inner outline ──────────────────────────────────────────────
        ctx.beginPath();
        ctx.moveTo(inner[0].x, inner[0].y);
        for (let i = 1; i < inner.length; i++) ctx.lineTo(inner[i].x, inner[i].y);
        ctx.closePath();
        ctx.lineWidth = (selected ? 2.6 : 1.6) / scale;
        ctx.strokeStyle = selected ? '#1d4ed8' : '#0f172a';
        ctx.stroke();
      }}
    />
  );
}
