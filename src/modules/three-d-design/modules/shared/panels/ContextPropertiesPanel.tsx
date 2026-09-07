/**
 * ContextPropertiesPanel — ONE right-hand properties panel whose content
 * follows the primary selection: wall / opening / room / equipment / corner,
 * or the project itself when nothing is selected. Shared by the 2D and (from
 * Faz 2) the 3D editor; editor-specific behaviour comes in through `actions`
 * and `editorSettings`.
 */

import { useTranslation } from 'react-i18next';
import { X, BrickWall, DoorOpen, Home, Package, Dot, Boxes } from 'lucide-react';
import type { OpeningKind } from '../../../core/types';
import { useProjectStore } from '../../../store';
import type { SelectionRef } from '../../2d-editor/state/editorState';
import WallSection from './sections/WallSection';
import OpeningSection from './sections/OpeningSection';
import RoomSection from './sections/RoomSection';
import EquipmentSection from './sections/EquipmentSection';
import VertexSection from './sections/VertexSection';
import ProjectSection, { type EditorSettingsProps } from './sections/ProjectSection';
import { PANEL } from '../../../components/ui/chrome';

export interface PanelActions {
  deleteRefs: (refs: SelectionRef[]) => void;
  requestDeleteRoom: (roomId: string, withWalls: boolean) => void;
  splitWallAtMiddle: (wallId: string) => void;
  addOpeningOnWall: (wallId: string, kind: OpeningKind, t01?: number) => void;
  setWallLength: (wallId: string, mm: number) => void;
  duplicateEquipment: (ids: string[]) => void;
  flashHint: (msg: string) => void;
}

interface Props {
  primary: SelectionRef | null;
  selectionCount: number;
  actions: PanelActions;
  editorSettings?: EditorSettingsProps;
  onClose: () => void;
  /** Extra classes for the aside (position/size differ between editors). */
  className?: string;
}

export default function ContextPropertiesPanel({ primary, selectionCount, actions, editorSettings, onClose, className }: Props) {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);

  let title = t('design3d.props.projectTitle');
  let icon = <Boxes size={13} />;
  let body: React.ReactNode = <ProjectSection settings={editorSettings} />;
  if (primary) {
    switch (primary.kind) {
      case 'wall': {
        const w = project.walls[primary.id];
        // `props.wallTitle` is the equipment panel's "snap to wall" tooltip —
        // the panel heading lives under `ctx` ("Duvar · {{mm}} mm").
        title = w ? t('design3d.ctx.wallTitle', { mm: Math.round(w.thickness) }) : '';
        icon = <BrickWall size={13} />;
        body = <WallSection wallId={primary.id} actions={actions} />;
        break;
      }
      case 'opening': {
        const op = project.openings[primary.id];
        title = op
          ? op.kind === 'door'
            ? t('design3d.openings.door')
            : op.kind === 'window'
              ? t('design3d.openings.window')
              : t('design3d.openings.passThrough')
          : '';
        icon = <DoorOpen size={13} />;
        body = <OpeningSection openingId={primary.id} actions={actions} />;
        break;
      }
      case 'room': {
        title = project.rooms[primary.id]?.name ?? '';
        icon = <Home size={13} />;
        body = <RoomSection roomId={primary.id} actions={actions} />;
        break;
      }
      case 'equipment': {
        title = project.equipment[primary.id]?.name ?? '';
        icon = <Package size={13} />;
        body = <EquipmentSection equipmentId={primary.id} actions={actions} />;
        break;
      }
      case 'vertex': {
        title = t('design3d.props.cornerTitle');
        icon = <Dot size={13} />;
        body = <VertexSection vertexId={primary.id} actions={actions} />;
        break;
      }
    }
  }

  return (
    <aside
      className={[
        'pointer-events-auto flex flex-col overflow-hidden',
        PANEL,
        // Varsayılan (2B): sağda yüzen kart; 3B kendi konumunu geçer.
        className ?? 'absolute top-3 right-3 bottom-3 z-30 w-[60vw] max-w-[15rem] sm:w-72 sm:max-w-none',
      ].join(' ')}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-100 px-4">
        <span className="text-brand-red">{icon}</span>
        <h2 className="flex-1 truncate text-[12px] font-semibold text-slate-800" title={title}>
          {title}
        </h2>
        {selectionCount > 1 && (
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500">
            {selectionCount}
          </span>
        )}
        {primary && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            title={t('common.close')}
          >
            <X size={13} />
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
    </aside>
  );
}
