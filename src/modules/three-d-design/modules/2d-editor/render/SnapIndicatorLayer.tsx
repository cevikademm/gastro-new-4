/**
 * Snap feedback: a small CAD-style glyph at the snapped point, plus a dashed
 * guide line for ortho / extension snaps. Constant on-screen size via `scale`.
 */

import { Shape } from 'react-konva';
import type { SnapHit } from '../state/editorState';

interface SnapIndicatorLayerProps {
  hit: SnapHit | null;
  scale: number;
}

const COLOR: Record<SnapHit['kind'], string> = {
  vertex: '#16a34a',
  draft: '#16a34a',
  edge: '#2563eb',
  midpoint: '#2563eb',
  perpendicular: '#7c3aed',
  extension: '#7c3aed',
  ortho: '#f59e0b',
  grid: '#94a3b8',
};

export default function SnapIndicatorLayer({ hit, scale }: SnapIndicatorLayerProps) {
  if (!hit) return null;
  const r = 7 / scale;
  const { x, y } = hit.point;
  const color = COLOR[hit.kind];

  return (
    <Shape
      listening={false}
      sceneFunc={(konvaCtx) => {
        const ctx = konvaCtx as unknown as CanvasRenderingContext2D;
        ctx.lineWidth = 1.5 / scale;
        ctx.strokeStyle = color;
        ctx.setLineDash([]);

        // Guide line from the anchor (ortho / extension)
        if (hit.from && (hit.kind === 'ortho' || hit.kind === 'extension')) {
          ctx.beginPath();
          ctx.moveTo(hit.from.x, hit.from.y);
          ctx.lineTo(x, y);
          ctx.setLineDash([80 / scale, 60 / scale]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        switch (hit.kind) {
          case 'vertex':
          case 'draft':
            ctx.rect(x - r, y - r, 2 * r, 2 * r);
            break;
          case 'midpoint':
            ctx.moveTo(x, y - r * 1.2);
            ctx.lineTo(x + r * 1.1, y + r * 0.8);
            ctx.lineTo(x - r * 1.1, y + r * 0.8);
            ctx.closePath();
            break;
          case 'edge':
          case 'perpendicular':
            ctx.moveTo(x - r, y - r);
            ctx.lineTo(x + r, y + r);
            ctx.moveTo(x - r, y + r);
            ctx.lineTo(x + r, y - r);
            break;
          case 'extension':
          case 'ortho':
            ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
            break;
          case 'grid':
            ctx.moveTo(x - r * 0.6, y);
            ctx.lineTo(x + r * 0.6, y);
            ctx.moveTo(x, y - r * 0.6);
            ctx.lineTo(x, y + r * 0.6);
            break;
        }
        ctx.stroke();
      }}
    />
  );
}
