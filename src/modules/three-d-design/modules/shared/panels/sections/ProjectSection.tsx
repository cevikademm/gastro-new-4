import { useTranslation } from 'react-i18next';
import { useProjectStore } from '../../../../store';
import { roomAreaM2 } from '../../../../core/geometry';
import { Grid2, Help, NumField, Row, Section, SelectField, Stat, TextField, Toggle } from '../ui';

/** 2D editor drawing settings (absent in the 3D editor). */
export interface EditorSettingsProps {
  defaultThickness: number;
  setDefaultThickness: (mm: number) => void;
  defaultHeight: number;
  setDefaultHeight: (mm: number) => void;
  gridMm: number;
  setGridMm: (mm: number) => void;
  snapOn: boolean;
  setSnapOn: (v: boolean) => void;
  orthoOn: boolean;
  setOrthoOn: (v: boolean) => void;
  showGrid: boolean;
  setShowGrid: (v: boolean) => void;
  showDims: boolean;
  setShowDims: (v: boolean) => void;
  lengthUnit: 'mm' | 'cm' | 'm';
  setLengthUnit: (u: 'mm' | 'cm' | 'm') => void;
}

export default function ProjectSection({ settings }: { settings?: EditorSettingsProps }) {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const renameProject = useProjectStore((s) => s.renameProject);
  const rooms = Object.values(project.rooms);
  const area = rooms.reduce((s, r) => s + roomAreaM2(project, r), 0);

  return (
    <>
      <Section title={t('design3d.props.projectName')}>
        <TextField value={project.name} onCommit={renameProject} />
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          <Stat label={t('design3d.props.statWalls')} value={String(Object.keys(project.walls).length)} />
          <Stat label={t('design3d.props.statRooms')} value={String(rooms.length)} />
          <Stat label={t('design3d.props.statOpenings')} value={String(Object.keys(project.openings).length)} />
          <Stat label={t('design3d.props.statItems')} value={String(Object.keys(project.equipment).length)} />
        </div>
        <Help>{t('design3d.props.totalArea', { m2: area.toFixed(1) })}</Help>
      </Section>

      {settings && (
        <>
          <Section title={t('design3d.props.newWallDefaults')}>
            <Grid2>
              <Row label={t('design3d.props.thickness')}>
                <NumField value={settings.defaultThickness} step={10} min={10} max={1000} onCommit={settings.setDefaultThickness} />
              </Row>
              <Row label={t('design3d.props.height')}>
                <NumField value={settings.defaultHeight} step={50} min={100} max={10000} onCommit={settings.setDefaultHeight} />
              </Row>
            </Grid2>
          </Section>

          <Section title={t('design3d.props.drawingAids')}>
            <Grid2>
              <Row label={t('design3d.tool.gridSize')}>
                <SelectField
                  value={String(settings.gridMm)}
                  options={[10, 50, 100, 250, 500].map((g) => ({ value: String(g), label: `${g} mm` }))}
                  onChange={(v) => settings.setGridMm(Number(v))}
                />
              </Row>
              <Row label={t('design3d.props.entryUnit')}>
                <SelectField
                  value={settings.lengthUnit}
                  options={[
                    { value: 'mm', label: 'mm' },
                    { value: 'cm', label: 'cm' },
                    { value: 'm', label: 'm' },
                  ]}
                  onChange={settings.setLengthUnit}
                />
              </Row>
            </Grid2>
            <Toggle checked={settings.snapOn} onChange={settings.setSnapOn} label={t('design3d.tool.snap')} />
            <Toggle checked={settings.orthoOn} onChange={settings.setOrthoOn} label={`${t('design3d.tool.ortho')} (F8)`} />
            <Toggle checked={settings.showGrid} onChange={settings.setShowGrid} label={t('design3d.tool.grid')} />
            <Toggle checked={settings.showDims} onChange={settings.setShowDims} label={t('design3d.tool.dims')} />
          </Section>

          <Section title={t('design3d.props.shortcuts')}>
            <ul className="space-y-0.5 text-[10px] leading-snug text-slate-500">
              <li><b>V</b> {t('design3d.tool.select')} · <b>R</b> {t('design3d.tool.drawRoom')} · <b>T</b> {t('design3d.tool.drawRect')} · <b>W</b> {t('design3d.tool.drawWall')}</li>
              <li><b>D</b> {t('design3d.openings.door')} · <b>P</b> {t('design3d.openings.window')} · <b>G</b> {t('design3d.openings.passThrough')}</li>
              <li>{t('design3d.props.shortcutDraw')}</li>
              <li>{t('design3d.props.shortcutEdit')}</li>
              <li>{t('design3d.props.shortcutView')}</li>
            </ul>
          </Section>
        </>
      )}
    </>
  );
}
