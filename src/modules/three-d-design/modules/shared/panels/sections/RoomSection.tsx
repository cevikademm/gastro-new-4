import { useTranslation } from 'react-i18next';
import { Trash2, Unlink } from 'lucide-react';
import { useProjectStore } from '../../../../store';
import { roomAreaM2, roomPerimeterM } from '../../../../core/geometry';
import { DEFAULT_FLOOR_MATERIAL, DEFAULT_WALL_MATERIAL, FLOOR_PRESETS, WALL_PRESETS } from '../../../3d-editor/builders/materials';
import { Btn, Grid2, Help, NumField, Row, Section, Stat, SwatchPicker, TextField } from '../ui';
import type { PanelActions } from '../ContextPropertiesPanel';

export default function RoomSection({ roomId, actions }: { roomId: string; actions: PanelActions }) {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const update = useProjectStore((s) => s.update);
  const room = project.rooms[roomId];
  if (!room) return null;

  const walls = room.wallLoop.map((id) => project.walls[id]).filter(Boolean);
  const thickness = walls.length ? walls.reduce((s, w) => s + w.thickness, 0) / walls.length : 150;
  const height = walls.length ? walls.reduce((s, w) => s + w.height, 0) / walls.length : 3000;
  const uniformThickness = walls.every((w) => Math.round(w.thickness) === Math.round(thickness));
  const uniformHeight = walls.every((w) => Math.round(w.height) === Math.round(height));
  const openings = Object.values(project.openings).filter((o) => room.wallLoop.includes(o.wallId)).length;

  const applyAll = (field: 'thickness' | 'height', mm: number) =>
    update((d) => {
      for (const wid of room.wallLoop) {
        const w = d.walls[wid];
        if (w) w[field] = Math.max(field === 'thickness' ? 10 : 100, Math.round(mm));
      }
      if (field === 'height') {
        const r = d.rooms[roomId];
        if (r) r.ceilingHeight = Math.max(100, Math.round(mm));
      }
    });

  return (
    <>
      <Section title={t('design3d.props.roomName')}>
        <TextField
          value={room.name}
          onCommit={(name) =>
            update((d) => {
              const r = d.rooms[roomId];
              if (r) r.name = name;
            })
          }
        />
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <Stat label={t('design3d.plot.area')} value={`${roomAreaM2(project, room).toFixed(1)} m²`} />
          <Stat label={t('design3d.plot.perimeter')} value={`${roomPerimeterM(project, room).toFixed(1)} m`} />
          <Stat label={t('design3d.props.wallsCount')} value={`${walls.length} / ${openings}`} />
        </div>
      </Section>

      <Section title={t('design3d.props.allWalls')}>
        <Grid2>
          <Row label={t('design3d.props.thickness')} hint={uniformThickness ? undefined : t('design3d.props.mixedValues')}>
            <NumField value={thickness} step={10} min={10} max={1000} onCommit={(mm) => applyAll('thickness', mm)} />
          </Row>
          <Row label={t('design3d.props.height')} hint={uniformHeight ? undefined : t('design3d.props.mixedValues')}>
            <NumField value={height} step={50} min={100} max={10000} onCommit={(mm) => applyAll('height', mm)} />
          </Row>
        </Grid2>
        <Help>{uniformThickness && uniformHeight ? t('design3d.props.allWallsHelp') : t('design3d.props.allWallsMixedHelp')}</Help>
      </Section>

      <Section title={t('design3d.props.surfaces')}>
        <Row label={t('design3d.props.floorMaterial')}>
          <SwatchPicker
            presets={FLOOR_PRESETS}
            value={room.floorMaterial ?? DEFAULT_FLOOR_MATERIAL}
            onPick={(id) =>
              update((d) => {
                const r = d.rooms[roomId];
                if (r) r.floorMaterial = id;
              })
            }
            labelFor={(id) => t(`design3d.material.${id}`)}
          />
        </Row>
        <Row label={t('design3d.props.wallsMaterial')}>
          <SwatchPicker
            presets={WALL_PRESETS}
            value={walls[0]?.material ?? DEFAULT_WALL_MATERIAL}
            onPick={(id) =>
              update((d) => {
                for (const wid of room.wallLoop) {
                  const w = d.walls[wid];
                  if (w) w.material = id;
                }
              })
            }
            labelFor={(id) => t(`design3d.material.${id}`)}
          />
        </Row>
        <Help>{t('design3d.props.surfacesHelp')}</Help>
      </Section>

      <Section>
        <Grid2>
          <Btn onClick={() => actions.requestDeleteRoom(roomId, false)} title={t('design3d.props.deleteRoomKeepTitle')}>
            <Unlink size={13} /> {t('design3d.props.deleteRoomKeep')}
          </Btn>
          <Btn danger onClick={() => actions.requestDeleteRoom(roomId, true)} title={t('design3d.props.deleteRoomWallsTitle')}>
            <Trash2 size={13} /> {t('design3d.props.deleteRoomWalls')}
          </Btn>
        </Grid2>
      </Section>
    </>
  );
}
