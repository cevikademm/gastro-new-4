/**
 * Context-menu item builders for every target kind on the 2D canvas.
 * Pure: takes what it needs, returns `ContextMenuItem[]`.
 */

import type { TFunction } from 'i18next';
import {
  Scissors,
  DoorOpen,
  RectangleHorizontal,
  ArrowLeftRight,
  Trash2,
  Copy,
  Lock,
  Unlock,
  RotateCw,
  RotateCcw,
  FlipHorizontal2,
  Pencil,
  Maximize2,
  Home,
  Unlink,
  Ruler,
} from 'lucide-react';
import type { OpeningKind, ProjectDocument, Vec2 } from '../../../core/types';
import { nearestWallHit } from '../../../core/openings';
import type { SelectionRef } from '../state/editorState';
import type { ContextMenuItem } from './ContextMenu';

export interface MenuContext {
  t: TFunction;
  project: ProjectDocument;
  target: SelectionRef | { kind: 'canvas' };
  world: Vec2;
  selection: SelectionRef[];
  scale: number;
  // actions
  deleteRefs: (refs: SelectionRef[]) => void;
  requestDeleteRoom: (roomId: string, withWalls: boolean) => void;
  splitWallAt: (wallId: string, t01: number) => void;
  addOpeningOnWall: (wallId: string, kind: OpeningKind, t01?: number) => void;
  setWallThickness: (wallId: string, mm: number) => void;
  applyThicknessToRoom: (wallId: string) => void;
  beginEditEdge: (wallId: string) => void;
  dissolveVertex: (vertexId: string) => void;
  beginEditAngle: (vertexId: string) => void;
  flipHinge: (openingId: string) => void;
  flipSwing: (openingId: string) => void;
  duplicateEquipment: (ids: string[]) => void;
  rotateEquipment: (ids: string[], deg: number) => void;
  toggleLockEquipment: (ids: string[]) => void;
  renameRoom: (roomId: string) => void;
  createRoomFromSelectedWalls: () => void;
  fitToContent: () => void;
  selectRoomWalls: (roomId: string) => void;
}

const THICKNESS_PRESETS = [100, 150, 200, 250, 300];

export function buildContextMenuItems(c: MenuContext): { title: string; items: ContextMenuItem[] } {
  const { t, target, project } = c;

  if (target.kind === 'wall') {
    const wall = project.walls[target.id];
    if (!wall) return { title: '', items: [] };
    const hit = nearestWallHit(project, c.world, 1e9);
    const t01 = hit && hit.wallId === target.id ? hit.t : 0.5;
    const inRoom = Object.values(project.rooms).some((r) => r.wallLoop.includes(target.id));
    const selectedWalls = c.selection.filter((s) => s.kind === 'wall');
    return {
      title: t('design3d.ctx.wallTitle', { mm: Math.round(wall.thickness) }),
      items: [
        { id: 'door', label: t('design3d.ctx.addDoorHere'), icon: <DoorOpen size={13} />, onClick: () => c.addOpeningOnWall(target.id, 'door', t01) },
        { id: 'window', label: t('design3d.ctx.addWindowHere'), icon: <RectangleHorizontal size={13} />, onClick: () => c.addOpeningOnWall(target.id, 'window', t01) },
        { id: 'pass', label: t('design3d.ctx.addPassHere'), icon: <ArrowLeftRight size={13} />, onClick: () => c.addOpeningOnWall(target.id, 'pass-through', t01) },
        { id: 'split', label: t('design3d.ctx.splitHere'), icon: <Scissors size={13} />, separator: true, onClick: () => c.splitWallAt(target.id, t01) },
        { id: 'len', label: t('design3d.ctx.editLength'), icon: <Ruler size={13} />, onClick: () => c.beginEditEdge(target.id) },
        ...THICKNESS_PRESETS.map((mm, i) => ({
          id: `thk-${mm}`,
          label: t('design3d.ctx.setThickness', { mm }),
          icon: i === 0 ? <Pencil size={13} /> : undefined,
          separator: i === 0,
          disabled: Math.round(wall.thickness) === mm,
          onClick: () => c.setWallThickness(target.id, mm),
        })),
        ...(inRoom
          ? [{ id: 'thk-room', label: t('design3d.ctx.applyThicknessRoom'), onClick: () => c.applyThicknessToRoom(target.id) }]
          : []),
        ...(selectedWalls.length >= 3
          ? [{ id: 'mkroom', label: t('design3d.ctx.roomFromWalls', { n: selectedWalls.length }), icon: <Home size={13} />, separator: true, onClick: c.createRoomFromSelectedWalls }]
          : []),
        {
          id: 'del',
          label: selectedWalls.length > 1 ? t('design3d.ctx.deleteWalls', { n: selectedWalls.length }) : t('design3d.ctx.deleteWall'),
          icon: <Trash2 size={13} />,
          danger: true,
          separator: true,
          onClick: () => c.deleteRefs(selectedWalls.length > 1 ? selectedWalls : [target]),
        },
      ],
    };
  }

  if (target.kind === 'vertex') {
    return {
      title: t('design3d.ctx.vertexTitle'),
      items: [
        { id: 'angle', label: t('design3d.ctx.editAngle'), icon: <Pencil size={13} />, onClick: () => c.beginEditAngle(target.id) },
        { id: 'dissolve', label: t('design3d.ctx.dissolveVertex'), icon: <Unlink size={13} />, danger: true, separator: true, onClick: () => c.dissolveVertex(target.id) },
      ],
    };
  }

  if (target.kind === 'opening') {
    const op = project.openings[target.id];
    if (!op) return { title: '', items: [] };
    const label = op.kind === 'door' ? t('design3d.openings.door') : op.kind === 'window' ? t('design3d.openings.window') : t('design3d.openings.passThrough');
    return {
      title: `${label} · ${Math.round(op.width)}×${Math.round(op.height)} mm`,
      items: [
        ...(op.kind === 'door'
          ? [
              { id: 'hinge', label: t('design3d.ctx.flipHinge'), icon: <FlipHorizontal2 size={13} />, onClick: () => c.flipHinge(target.id) },
              { id: 'swing', label: t('design3d.ctx.flipSwing'), icon: <ArrowLeftRight size={13} />, onClick: () => c.flipSwing(target.id) },
            ]
          : []),
        { id: 'del', label: t('design3d.ctx.deleteOpening'), icon: <Trash2 size={13} />, danger: true, separator: op.kind === 'door', onClick: () => c.deleteRefs([target]) },
      ],
    };
  }

  if (target.kind === 'room') {
    const room = project.rooms[target.id];
    if (!room) return { title: '', items: [] };
    return {
      title: room.name,
      items: [
        { id: 'rename', label: t('design3d.ctx.renameRoom'), icon: <Pencil size={13} />, onClick: () => c.renameRoom(target.id) },
        { id: 'selwalls', label: t('design3d.ctx.selectRoomWalls'), icon: <Home size={13} />, onClick: () => c.selectRoomWalls(target.id) },
        { id: 'delkeep', label: t('design3d.ctx.deleteRoomKeepWalls'), icon: <Unlink size={13} />, separator: true, onClick: () => c.requestDeleteRoom(target.id, false) },
        { id: 'delall', label: t('design3d.ctx.deleteRoomWalls'), icon: <Trash2 size={13} />, danger: true, onClick: () => c.requestDeleteRoom(target.id, true) },
      ],
    };
  }

  if (target.kind === 'equipment') {
    const eq = project.equipment[target.id];
    if (!eq) return { title: '', items: [] };
    const ids = c.selection.filter((s) => s.kind === 'equipment').map((s) => s.id);
    const all = ids.includes(target.id) ? ids : [target.id];
    return {
      title: eq.name,
      items: [
        { id: 'dup', label: t('design3d.ctx.duplicate'), icon: <Copy size={13} />, shortcut: 'Ctrl+D', onClick: () => c.duplicateEquipment(all) },
        { id: 'rotl', label: t('design3d.ctx.rotateLeft'), icon: <RotateCcw size={13} />, shortcut: 'Q', onClick: () => c.rotateEquipment(all, -90) },
        { id: 'rotr', label: t('design3d.ctx.rotateRight'), icon: <RotateCw size={13} />, shortcut: 'E', onClick: () => c.rotateEquipment(all, 90) },
        { id: 'flip', label: t('design3d.flip'), icon: <FlipHorizontal2 size={13} />, onClick: () => c.rotateEquipment(all, 180) },
        { id: 'lock', label: eq.locked ? t('design3d.props.unlock') : t('design3d.props.lock'), icon: eq.locked ? <Unlock size={13} /> : <Lock size={13} />, separator: true, onClick: () => c.toggleLockEquipment(all) },
        { id: 'del', label: all.length > 1 ? t('design3d.ctx.deleteItems', { n: all.length }) : t('design3d.ctx.deleteItem'), icon: <Trash2 size={13} />, danger: true, separator: true, onClick: () => c.deleteRefs(all.map((id) => ({ kind: 'equipment' as const, id }))) },
      ],
    };
  }

  // canvas
  const selectedWalls = c.selection.filter((s) => s.kind === 'wall');
  return {
    title: t('design3d.ctx.canvasTitle'),
    items: [
      { id: 'fit', label: t('design3d.tool.fitToContent'), icon: <Maximize2 size={13} />, onClick: c.fitToContent },
      ...(selectedWalls.length >= 3
        ? [{ id: 'mkroom', label: t('design3d.ctx.roomFromWalls', { n: selectedWalls.length }), icon: <Home size={13} />, separator: true, onClick: c.createRoomFromSelectedWalls }]
        : []),
    ],
  };
}
