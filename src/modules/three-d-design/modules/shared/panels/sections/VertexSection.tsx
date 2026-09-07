import { useTranslation } from 'react-i18next';
import { Unlink } from 'lucide-react';
import { useProjectStore } from '../../../../store';
import { wallsAtVertex } from '../../../../core/openings';
import type { VertexId } from '../../../../core/types';
import { Btn, Grid2, Help, NumField, Row, Section } from '../ui';
import type { PanelActions } from '../ContextPropertiesPanel';

export default function VertexSection({ vertexId, actions }: { vertexId: string; actions: PanelActions }) {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const moveVertex = useProjectStore((s) => s.moveVertex);
  const v = project.vertices[vertexId];
  if (!v) return null;
  const walls = wallsAtVertex(project, vertexId);

  return (
    <>
      <Section title={t('design3d.props.cornerPosition')}>
        <Grid2>
          <Row label="X">
            <NumField value={v.x} step={10} onCommit={(mm) => moveVertex(vertexId as VertexId, { x: mm, y: v.y })} />
          </Row>
          <Row label="Y">
            <NumField value={v.y} step={10} onCommit={(mm) => moveVertex(vertexId as VertexId, { x: v.x, y: mm })} />
          </Row>
        </Grid2>
        <Help>{t('design3d.props.cornerHelp', { n: walls.length })}</Help>
      </Section>
      <Section>
        <Btn full disabled={walls.length !== 2} onClick={() => actions.deleteRefs([{ kind: 'vertex', id: vertexId }])} title={t('design3d.props.dissolveTitle')}>
          <Unlink size={13} /> {t('design3d.ctx.dissolveVertex')}
        </Btn>
      </Section>
    </>
  );
}
