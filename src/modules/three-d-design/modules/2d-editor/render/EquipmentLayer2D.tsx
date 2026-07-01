/**
 * EquipmentLayer2D — top-down Konva render of placed equipment.
 *
 * Equipment lives in the SAME `project.equipment` source-of-truth the 3D
 * editor uses, so anything placed in 3D shows here and vice-versa. Positions
 * are the footprint MIN-CORNER in mm (matching the domain convention); we draw
 * each item centered + rotated about its center so it reads like a real plan.
 */

import { Group, Rect, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Equipment } from '../../../core/types';
import { colorForKey, darkenHex } from '../../../lib/equipmentColor';

// Her ÜRÜN'e ayrı renk: kategoriye göre değil, ürün anahtarından (catalogId)
// türetilen kararlı bir ton (ortak `equipmentColor` util'inden). Override (eq.color)
// varsa onu kullanır; aynı ürün hep aynı rengi alır.

interface EquipmentLayer2DProps {
  equipment: Equipment[];
  scale: number;
  selectedId: string | null;
  draggable: boolean;
  onSelect: (id: string) => void;
  /** Sürükleme başında — anti-tünel referansını kurmak için. */
  onDragStart?: (id: string) => void;
  /** Canlı: kısıtlanmış düğüm merkezini (mm) + dönüşü (derece) döndür → sürüklerken snap. */
  onDragMove?: (id: string, center: { x: number; y: number }) => { x: number; y: number; rotation?: number } | undefined;
  /** Reports the new CENTER (mm) after a drag. */
  onDragEnd: (id: string, center: { x: number; y: number }) => void;
}

export default function EquipmentLayer2D({
  equipment,
  scale,
  selectedId,
  draggable,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}: EquipmentLayer2DProps) {
  const stroke = 2.2 / scale;
  const fontSize = 13 / scale;

  return (
    <>
      {equipment.map((eq) => {
        const w = eq.footprint.width;
        const d = eq.footprint.depth;
        const cx = eq.position.x + w / 2;
        const cy = eq.position.y + d / 2;
        const deg = (eq.rotation * 180) / Math.PI;
        const selected = eq.id === selectedId;
        const colors = colorForKey(eq.catalogId || eq.name || eq.id);
        // Kullanıcı override rengi varsa onu kullan; yoksa deterministik ton.
        const fill = eq.color ?? colors.fill;
        const line = selected ? '#DC2626' : (eq.color ? darkenHex(eq.color, 0.35) : colors.stroke);
        const showLabel = Math.min(w, d) * scale > 18;

        const select = (e: KonvaEventObject<MouseEvent>) => {
          e.cancelBubble = true;
          onSelect(eq.id);
        };

        return (
          <Group
            key={eq.id}
            x={cx}
            y={cy}
            rotation={deg}
            draggable={draggable}
            onMouseDown={select}
            onTap={select as unknown as (e: KonvaEventObject<Event>) => void}
            onDragStart={() => onDragStart?.(eq.id)}
            onDragMove={(e) => {
              const r = onDragMove?.(eq.id, { x: e.target.x(), y: e.target.y() });
              if (r) {
                e.target.x(r.x);
                e.target.y(r.y);
                if (typeof r.rotation === 'number') e.target.rotation(r.rotation);
              }
            }}
            onDragEnd={(e) => onDragEnd(eq.id, { x: e.target.x(), y: e.target.y() })}
          >
            <Rect
              x={-w / 2}
              y={-d / 2}
              width={w}
              height={d}
              fill={fill}
              opacity={1}
              stroke={line}
              strokeWidth={selected ? stroke * 1.6 : stroke}
              cornerRadius={Math.min(w, d) * 0.05}
              shadowColor={selected ? '#DC2626' : '#0F172A'}
              shadowBlur={(selected ? 12 : 6) / scale}
              shadowOpacity={selected ? 0.45 : 0.28}
              shadowOffset={{ x: 0, y: 2 / scale }}
            />
            {/* front-edge marker (helps read facing direction) */}
            <Rect
              x={-w / 2}
              y={d / 2 - Math.min(d * 0.12, 60)}
              width={w}
              height={Math.min(d * 0.12, 60)}
              fill={line}
              opacity={0.35}
              cornerRadius={0}
            />
            {showLabel && (
              <>
                {/* Ürün adı (üst satır) */}
                <Text
                  text={eq.name}
                  x={-w / 2 + 30}
                  y={-fontSize - 1 / scale}
                  width={w - 60}
                  align="center"
                  fontSize={fontSize}
                  fontStyle="bold"
                  fill="#0F172A"
                  listening={false}
                  wrap="none"
                  ellipsis
                />
                {/* Birebir ölçü etiketi: G×D (mm) — 3B kutu ile aynı footprint */}
                <Text
                  text={`${Math.round(w)}×${Math.round(d)}`}
                  x={-w / 2 + 30}
                  y={2 / scale}
                  width={w - 60}
                  align="center"
                  fontSize={fontSize * 0.82}
                  fill="#334155"
                  listening={false}
                  wrap="none"
                  ellipsis
                />
              </>
            )}
          </Group>
        );
      })}
    </>
  );
}
