import { useTranslation } from 'react-i18next';
import { Copy, Lock, Unlock, RefreshCw, RotateCcw, RotateCw, Trash2, Layers as OverlapIcon } from 'lucide-react';
import { useProjectStore } from '../../../../store';
import { deterministicHex } from '../../../../lib/equipmentColor';
import { removeEquipmentEverywhere } from '../../../../../../lib/designDelete';
import { resolveEquipmentDrag } from '../../../3d-editor/interaction/resolveDrag';
import { Btn, Grid2, Help, NumField, Row, Section, TextField, Toggle } from '../ui';
import type { PanelActions } from '../ContextPropertiesPanel';

export default function EquipmentSection({ equipmentId, actions }: { equipmentId: string; actions: PanelActions }) {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const update = useProjectStore((s) => s.update);
  const updateEquipment = useProjectStore((s) => s.updateEquipment);
  const eq = project.equipment[equipmentId];
  if (!eq) return null;
  const locked = !!eq.locked;

  const setDims = (patch: { width?: number; depth?: number; heightMm?: number }) =>
    update((d) => {
      const e = d.equipment[equipmentId];
      if (!e) return;
      if (patch.width) e.footprint = { ...e.footprint, width: Math.max(10, Math.round(patch.width)) };
      if (patch.depth) e.footprint = { ...e.footprint, depth: Math.max(10, Math.round(patch.depth)) };
      if (patch.heightMm) e.heightMm = Math.max(10, Math.round(patch.heightMm));
    });

  /** Move via the shared resolver so walls/collision stay respected. */
  const setPosition = (x: number, y: number) => {
    const res = resolveEquipmentDrag({
      project,
      eq,
      desiredMinCornerMm: { x, y },
      snapGridMm: 1,
      edgeSnapTolMm: 0,
      collisionEnabled: true,
      prevValidCenter: null,
    });
    updateEquipment(equipmentId, { position: { x: res.x, y: res.y, z: eq.position.z }, rotation: res.rotation });
  };
  const rotateBy = (deg: number) => updateEquipment(equipmentId, { rotation: eq.rotation + (deg * Math.PI) / 180 });
  const degNow = Math.round((((eq.rotation * 180) / Math.PI) % 360 + 360) % 360);

  return (
    <>
      <Section title={t('design3d.props.equipmentName')}>
        <TextField value={eq.name} onCommit={(name) => updateEquipment(equipmentId, { name })} disabled={locked} />
        <Help>{eq.catalogId}</Help>
      </Section>

      <Section title={t('design3d.dimensions')}>
        <div className="grid grid-cols-3 gap-1.5">
          <Row label={t('design3d.props.dimW')}>
            <NumField value={eq.footprint.width} step={10} min={10} disabled={locked} onCommit={(mm) => setDims({ width: mm })} />
          </Row>
          <Row label={t('design3d.props.dimD')}>
            <NumField value={eq.footprint.depth} step={10} min={10} disabled={locked} onCommit={(mm) => setDims({ depth: mm })} />
          </Row>
          <Row label={t('design3d.props.dimH')}>
            <NumField value={eq.heightMm} step={10} min={10} disabled={locked} onCommit={(mm) => setDims({ heightMm: mm })} />
          </Row>
        </div>
        <Help>{t('design3d.props.dimsHelp')}</Help>
      </Section>

      <Section title={t('design3d.props.position')}>
        <Grid2>
          <Row label="X">
            <NumField value={eq.position.x} step={10} disabled={locked} onCommit={(mm) => setPosition(mm, eq.position.y)} />
          </Row>
          <Row label="Y">
            <NumField value={eq.position.y} step={10} disabled={locked} onCommit={(mm) => setPosition(eq.position.x, mm)} />
          </Row>
        </Grid2>
        <Row label={t('design3d.props.angle')}>
          <NumField value={degNow} step={5} min={0} max={359} suffix="°" disabled={locked} onCommit={(deg) => updateEquipment(equipmentId, { rotation: (deg * Math.PI) / 180 })} />
        </Row>
        <div className="grid grid-cols-3 gap-1.5">
          <Btn disabled={locked} onClick={() => rotateBy(-90)} title="−90°"><RotateCcw size={13} /> 90°</Btn>
          <Btn disabled={locked} onClick={() => rotateBy(180)}>{t('design3d.flip')}</Btn>
          <Btn disabled={locked} onClick={() => rotateBy(90)} title="+90°"><RotateCw size={13} /> 90°</Btn>
        </div>
      </Section>

      <Section title={t('design3d.appearance')}>
        <div className="flex items-center gap-1.5">
          <input
            type="color"
            value={eq.color ?? deterministicHex(eq.catalogId || eq.name || eq.id)}
            disabled={locked}
            onChange={(e) => updateEquipment(equipmentId, { color: e.target.value })}
            className="h-8 w-11 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5 disabled:opacity-50 transition"
            title={t('design3d.color')}
          />
          <Btn
            disabled={locked || !eq.color}
            onClick={() =>
              update((d) => {
                const e = d.equipment[equipmentId];
                if (e) delete e.color;
              })
            }
          >
            <RefreshCw size={12} /> {t('design3d.resetColor')}
          </Btn>
        </div>
        <div className="mt-2">
          <Toggle
            checked={!!eq.allowOverlap}
            disabled={locked}
            onChange={(v) => updateEquipment(equipmentId, { allowOverlap: v })}
            label={<span className="inline-flex items-center gap-1"><OverlapIcon size={12} /> {t('design3d.allowOverlap')}</span>}
          />
        </div>
      </Section>

      <Section>
        <Grid2>
          <Btn onClick={() => actions.duplicateEquipment([equipmentId])} title="Ctrl+D"><Copy size={13} /> {t('design3d.ctx.duplicate')}</Btn>
          <Btn onClick={() => updateEquipment(equipmentId, { locked: !locked })}>
            {locked ? <Unlock size={13} /> : <Lock size={13} />} {locked ? t('design3d.props.unlock') : t('design3d.props.lock')}
          </Btn>
        </Grid2>
        <div className="mt-1.5">
          <Btn danger full onClick={() => removeEquipmentEverywhere(equipmentId)} title={t('design3d.props.deleteFullTitle')}>
            <Trash2 size={13} /> {t('design3d.props.deleteFull')}
          </Btn>
        </div>
        <Help>{t('design3d.props.deleteHelp')}</Help>
      </Section>
    </>
  );
}
