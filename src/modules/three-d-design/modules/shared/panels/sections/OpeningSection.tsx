import { useTranslation } from 'react-i18next';
import { DoorOpen, RectangleHorizontal, ArrowLeftRight, FlipHorizontal2, Trash2 } from 'lucide-react';
import { useProjectStore } from '../../../../store';
import type { DoorType, OpeningKind } from '../../../../core/types';
import { effectiveDoorType, effectiveHinge, effectiveSwing, OPENING_DEFAULTS, openingSpan, wallLengthOf } from '../../../../core/openings';
import { roomPolygon } from '../../../../core/geometry';
import { dot2, polygonCentroidOf, sub2 } from '../../../../core/math';
import { Btn, Chips, Grid2, Help, NumField, Row, Section, Segmented } from '../ui';
import type { PanelActions } from '../ContextPropertiesPanel';

const DOOR_WIDTHS = [700, 800, 900, 1000, 1200, 1600];
const WINDOW_WIDTHS = [600, 900, 1200, 1500, 1800];

export default function OpeningSection({ openingId, actions }: { openingId: string; actions: PanelActions }) {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const updateOpening = useProjectStore((s) => s.updateOpening);
  const op = project.openings[openingId];
  if (!op) return null;
  const wall = project.walls[op.wallId];
  const wallLen = wall ? wallLengthOf(project, wall) : 0;
  const span = openingSpan(project, op);
  const room = Object.values(project.rooms).find((r) => r.wallLoop.includes(op.wallId));

  // "Into the room / outward" reads better than left/right when the wall
  // belongs to a room: compare the swing direction with the room centroid.
  let swingLabel: 'in' | 'out' | 'left' | 'right' = effectiveSwing(op);
  if (room && span) {
    const c = polygonCentroidOf(roomPolygon(project, room));
    const mid = { x: (span.a.x + span.b.x) / 2, y: (span.a.y + span.b.y) / 2 };
    swingLabel = dot2(span.swingDir, sub2(c, mid)) > 0 ? 'in' : 'out';
  }

  const patch = (p: Parameters<typeof updateOpening>[1]) => updateOpening(openingId, p);
  const kindIcon = op.kind === 'door' ? <DoorOpen size={13} /> : op.kind === 'window' ? <RectangleHorizontal size={13} /> : <ArrowLeftRight size={13} />;
  const kindOptions: Array<{ value: OpeningKind; label: React.ReactNode; title?: string }> = [
    { value: 'door', label: t('design3d.openings.door') },
    { value: 'window', label: t('design3d.openings.window') },
    { value: 'pass-through', label: t('design3d.openings.passThrough') },
  ];
  const doorTypes: Array<{ value: DoorType; label: React.ReactNode }> = [
    { value: 'single', label: t('design3d.props.doorSingle') },
    { value: 'double', label: t('design3d.props.doorDouble') },
    { value: 'sliding', label: t('design3d.props.doorSliding') },
  ];

  const changeKind = (kind: OpeningKind) => {
    const defs = OPENING_DEFAULTS[kind];
    patch({ kind, height: defs.height, sillHeight: defs.sillHeight });
  };

  return (
    <>
      <Section title={t('design3d.openings.kind')} right={<span className="text-slate-400">{kindIcon}</span>}>
        <Segmented value={op.kind} options={kindOptions} onChange={changeKind} />
        {op.kind === 'door' && (
          <div className="mt-2">
            <Segmented value={effectiveDoorType(op)} options={doorTypes} onChange={(v) => patch({ doorType: v })} />
          </div>
        )}
      </Section>

      <Section title={t('design3d.props.openingSize')}>
        <Grid2>
          <Row label={t('design3d.props.width')}>
            <NumField value={op.width} step={10} min={100} max={Math.max(100, wallLen)} onCommit={(mm) => patch({ width: mm })} />
          </Row>
          <Row label={t('design3d.props.height')}>
            <NumField value={op.height} step={10} min={100} max={wall ? wall.height : 6000} onCommit={(mm) => patch({ height: mm })} />
          </Row>
        </Grid2>
        <Chips values={op.kind === 'window' ? WINDOW_WIDTHS : DOOR_WIDTHS} current={op.width} onPick={(mm) => patch({ width: mm })} />
        <Grid2>
          <Row label={t('design3d.props.offset')} hint={t('design3d.props.offsetHint')}>
            <NumField value={op.offset} step={10} min={0} max={Math.max(0, wallLen - op.width)} onCommit={(mm) => patch({ offset: mm })} />
          </Row>
          <Row label={t('design3d.props.offsetFromEnd')}>
            <NumField
              value={Math.max(0, wallLen - op.offset - op.width)}
              step={10}
              min={0}
              max={Math.max(0, wallLen - op.width)}
              onCommit={(mm) => patch({ offset: wallLen - op.width - mm })}
            />
          </Row>
        </Grid2>
        {op.kind !== 'door' && (
          <Row label={t('design3d.props.sill')}>
            <NumField value={op.sillHeight} step={10} min={0} max={wall ? wall.height : 6000} onCommit={(mm) => patch({ sillHeight: mm })} />
          </Row>
        )}
        <Help>{t('design3d.props.wallLengthInfo', { m: (wallLen / 1000).toFixed(2) })}</Help>
      </Section>

      {op.kind === 'door' && (
        <Section title={t('design3d.props.doorSwing')}>
          <Grid2>
            <Btn onClick={() => patch({ hinge: effectiveHinge(op) === 'start' ? 'end' : 'start' })} title={t('design3d.props.flipHingeTitle')}>
              <FlipHorizontal2 size={13} /> {t('design3d.props.flipHinge')}
            </Btn>
            <Btn onClick={() => patch({ swing: effectiveSwing(op) === 'left' ? 'right' : 'left' })} title={t('design3d.props.flipSwingTitle')}>
              <ArrowLeftRight size={13} /> {t('design3d.props.flipSwing')}
            </Btn>
          </Grid2>
          <Help>
            {t('design3d.props.hingeReadout', {
              side: effectiveHinge(op) === 'start' ? t('design3d.props.hingeStart') : t('design3d.props.hingeEnd'),
              swing:
                swingLabel === 'in'
                  ? t('design3d.props.swingIn')
                  : swingLabel === 'out'
                    ? t('design3d.props.swingOut')
                    : swingLabel === 'left'
                      ? t('design3d.props.swingLeft')
                      : t('design3d.props.swingRight'),
            })}
          </Help>
        </Section>
      )}

      <Section>
        <Btn danger full onClick={() => actions.deleteRefs([{ kind: 'opening', id: openingId }])}>
          <Trash2 size={13} /> {t('design3d.props.deleteOpening')}
        </Btn>
      </Section>
    </>
  );
}
