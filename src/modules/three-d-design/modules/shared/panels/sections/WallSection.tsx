import { useTranslation } from 'react-i18next';
import { DoorOpen, RectangleHorizontal, ArrowLeftRight, Scissors, Trash2 } from 'lucide-react';
import { useProjectStore } from '../../../../store';
import type { OpeningKind, WallId, WallType } from '../../../../core/types';
import { DEFAULT_WALL_MATERIAL, WALL_PRESETS } from '../../../3d-editor/builders/materials';
import { setWallMaterial } from '../../wallOps';
import { Btn, Chips, Grid2, Help, NumField, Row, Section, SelectField, SwatchPicker } from '../ui';
import type { PanelActions } from '../ContextPropertiesPanel';

const THICKNESS_PRESETS = [100, 150, 200, 250, 300];
const HEIGHT_PRESETS = [2400, 2700, 3000, 3500, 4000];

export default function WallSection({ wallId, actions }: { wallId: string; actions: PanelActions }) {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const update = useProjectStore((s) => s.update);
  const transaction = useProjectStore((s) => s.transaction);
  const wall = project.walls[wallId];
  if (!wall) return null;

  const a = project.vertices[wall.a];
  const b = project.vertices[wall.b];
  const lengthMm = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
  const room = Object.values(project.rooms).find((r) => r.wallLoop.includes(wallId));
  const openingsOnWall = Object.values(project.openings).filter((o) => o.wallId === wallId).length;

  const setThickness = (mm: number) =>
    update((d) => {
      const w = d.walls[wallId];
      if (w) w.thickness = Math.max(10, Math.round(mm));
    });
  const setHeight = (mm: number) =>
    update((d) => {
      const w = d.walls[wallId];
      if (w) w.height = Math.max(100, Math.round(mm));
    });
  const applyToRoom = (field: 'thickness' | 'height') => {
    if (!room) return;
    const v = wall[field];
    transaction(() => {
      update((d) => {
        for (const wid of room.wallLoop) {
          const w = d.walls[wid];
          if (w) w[field] = v;
        }
      });
    });
  };

  const typeOptions: Array<{ value: WallType; label: string }> = [
    { value: 'exterior', label: t('design3d.props.wallTypeExterior') },
    { value: 'interior', label: t('design3d.props.wallTypeInterior') },
    { value: 'partition', label: t('design3d.props.wallTypePartition') },
  ];
  const addOpening = (kind: OpeningKind) => actions.addOpeningOnWall(wallId, kind);

  return (
    <>
      <Section title={t('design3d.props.wallGeometry')}>
        <Row label={t('design3d.props.length')}>
          <NumField value={lengthMm} step={10} min={10} onCommit={(mm) => actions.setWallLength(wallId, mm)} />
        </Row>
        <Row label={t('design3d.props.thickness')}>
          <NumField value={wall.thickness} step={10} min={10} max={1000} onCommit={setThickness} />
        </Row>
        <Chips values={THICKNESS_PRESETS} current={wall.thickness} onPick={setThickness} />
        <Row label={t('design3d.props.height')}>
          <NumField value={wall.height} step={50} min={100} max={10000} onCommit={setHeight} />
        </Row>
        <Chips values={HEIGHT_PRESETS} current={wall.height} onPick={setHeight} />
        <Row label={t('design3d.props.wallType')}>
          <SelectField
            value={wall.wallType}
            options={typeOptions}
            onChange={(v) =>
              update((d) => {
                const w = d.walls[wallId];
                if (w) w.wallType = v;
              })
            }
          />
        </Row>
        {room && (
          <Grid2>
            <Btn onClick={() => applyToRoom('thickness')} title={t('design3d.props.applyThicknessRoomTitle')}>
              {t('design3d.props.applyThicknessRoom')}
            </Btn>
            <Btn onClick={() => applyToRoom('height')} title={t('design3d.props.applyHeightRoomTitle')}>
              {t('design3d.props.applyHeightRoom')}
            </Btn>
          </Grid2>
        )}
        <Help>
          {room
            ? t('design3d.props.wallInRoom', { name: room.name, n: openingsOnWall })
            : t('design3d.props.wallLoose', { n: openingsOnWall })}
        </Help>
      </Section>

      <Section title={t('design3d.props.wallMaterial')}>
        <SwatchPicker
          presets={WALL_PRESETS}
          value={wall.material ?? DEFAULT_WALL_MATERIAL}
          onPick={(id) => setWallMaterial(wallId, id)}
          labelFor={(id) => t(`design3d.material.${id}`)}
        />
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-600">{t(`design3d.material.${wall.material ?? DEFAULT_WALL_MATERIAL}`)}</span>
          {room && (
            <Btn onClick={() => setWallMaterial(wallId, wall.material ?? DEFAULT_WALL_MATERIAL, true)} title={t('design3d.props.applyMaterialRoomTitle')}>
              {t('design3d.props.applyMaterialRoom')}
            </Btn>
          )}
        </div>
      </Section>

      <Section title={t('design3d.props.wallActions')}>
        <div className="grid grid-cols-3 gap-1.5">
          <Btn onClick={() => addOpening('door')} title={t('design3d.props.addDoorTitle')}><DoorOpen size={13} /> {t('design3d.openings.door')}</Btn>
          <Btn onClick={() => addOpening('window')} title={t('design3d.props.addWindowTitle')}><RectangleHorizontal size={13} /> {t('design3d.openings.window')}</Btn>
          <Btn onClick={() => addOpening('pass-through')} title={t('design3d.props.addPassTitle')}><ArrowLeftRight size={13} /> {t('design3d.openings.passThrough')}</Btn>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <Btn onClick={() => actions.splitWallAtMiddle(wallId)} title={t('design3d.props.splitTitle')}><Scissors size={13} /> {t('design3d.props.split')}</Btn>
          <Btn danger onClick={() => actions.deleteRefs([{ kind: 'wall', id: wallId }])} title={t('design3d.props.deleteWallTitle')}><Trash2 size={13} /> {t('design3d.delete')}</Btn>
        </div>
        <Help>{room ? t('design3d.props.deleteWallRoomHelp') : t('design3d.props.deleteWallHelp')}</Help>
      </Section>
    </>
  );
}

void ((_: WallId) => _);
