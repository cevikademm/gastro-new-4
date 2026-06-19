/**
 * Construction grid: 10 cm minor lines + 1 m major lines.
 * Drawn with one Konva Shape using sceneFunc — far cheaper than emitting a
 * Line per gridline as the viewport zooms out.
 */

import { Shape } from 'react-konva';

interface GridLayerProps {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

const MINOR_MM = 100;   // 10 cm
const MAJOR_MM = 1000;  // 1 m

export default function GridLayer({
  width,
  height,
  scale,
  offsetX,
  offsetY,
}: GridLayerProps) {
  return (
    <Shape
      listening={false}
      sceneFunc={(ctx) => {
        const minorPx = MINOR_MM * scale;
        const majorPx = MAJOR_MM * scale;

        // Hide minor lines when they collapse below ~6 px (visual noise).
        const drawMinor = minorPx >= 6;

        // Visible world bounds (mm)
        const worldLeft = -offsetX / scale;
        const worldTop = -offsetY / scale;
        const worldRight = worldLeft + width / scale;
        const worldBottom = worldTop + height / scale;

        if (drawMinor) {
          ctx.beginPath();
          const startX = Math.floor(worldLeft / MINOR_MM) * MINOR_MM;
          const startY = Math.floor(worldTop / MINOR_MM) * MINOR_MM;
          for (let x = startX; x <= worldRight; x += MINOR_MM) {
            ctx.moveTo(x, worldTop);
            ctx.lineTo(x, worldBottom);
          }
          for (let y = startY; y <= worldBottom; y += MINOR_MM) {
            ctx.moveTo(worldLeft, y);
            ctx.lineTo(worldRight, y);
          }
          ctx.strokeStyle = '#e5e7eb';
          ctx.lineWidth = 1 / scale;
          ctx.stroke();
        }

        // Major lines
        ctx.beginPath();
        const mStartX = Math.floor(worldLeft / MAJOR_MM) * MAJOR_MM;
        const mStartY = Math.floor(worldTop / MAJOR_MM) * MAJOR_MM;
        for (let x = mStartX; x <= worldRight; x += MAJOR_MM) {
          ctx.moveTo(x, worldTop);
          ctx.lineTo(x, worldBottom);
        }
        for (let y = mStartY; y <= worldBottom; y += MAJOR_MM) {
          ctx.moveTo(worldLeft, y);
          ctx.lineTo(worldRight, y);
        }
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = (majorPx > 80 ? 1.4 : 1) / scale;
        ctx.stroke();

        // Origin crosshair
        ctx.beginPath();
        ctx.moveTo(-30 / scale, 0);
        ctx.lineTo(30 / scale, 0);
        ctx.moveTo(0, -30 / scale);
        ctx.lineTo(0, 30 / scale);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5 / scale;
        ctx.stroke();
      }}
    />
  );
}
