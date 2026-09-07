/**
 * useSelectionCommands — pick helpers + delete / split / room commands that
 * work on the unified selection. Destructive room deletes go through a
 * ConfirmDialog (state exposed here, rendered by the editor).
 */

import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProjectDocument, RoomId, VertexId, WallId } from '../../../core/types';
import { roomContaining } from '../../../core/geometry';
import { useProjectStore } from '../../../store';
import { idsOfKind, useEditor2DState, type SelectionRef } from '../state/editorState';
import type { EquipmentInteraction } from './useEquipmentInteraction';

export interface ConfirmState {
  kind: 'room' | 'roomWithWalls' | 'clearAll';
  roomId?: string;
  title: string;
  description: string;
}

interface Args {
  project: ProjectDocument;
  equipment: EquipmentInteraction;
  flashHint: (msg: string) => void;
}

export function useSelectionCommands({ project, equipment, flashHint }: Args) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const st = () => useProjectStore.getState();
  const ed = () => useEditor2DState.getState();

  const roomOfWall = useCallback(
    (wallId: string): string | null => {
      for (const r of Object.values(project.rooms)) if (r.wallLoop.includes(wallId)) return r.id;
      return null;
    },
    [project],
  );

  // ── Picks ────────────────────────────────────────────────────────────────
  const pick = useCallback(
    (ref: SelectionRef, additive: boolean) => {
      const e = ed();
      if (additive) e.toggle(ref);
      else e.select(ref);
      if (ref.kind === 'wall') {
        const rid = roomOfWall(ref.id);
        if (rid) e.setActiveRoom(rid);
      } else if (ref.kind === 'room') {
        e.setActiveRoom(ref.id);
      } else if (ref.kind === 'opening') {
        const op = st().project.openings[ref.id];
        const rid = op ? roomOfWall(op.wallId) : null;
        if (rid) e.setActiveRoom(rid);
      }
    },
    [roomOfWall],
  );

  /** Click on empty canvas: select the room under the pointer, else clear. */
  const pickAt = useCallback(
    (world: { x: number; y: number }, additive: boolean) => {
      const room = roomContaining(st().project, world);
      const e = ed();
      if (room) {
        pick({ kind: 'room', id: room.id }, additive);
      } else if (!additive) {
        e.clearSelection();
      }
    },
    [pick],
  );

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteRefs = useCallback(
    (refs: ReadonlyArray<SelectionRef>) => {
      const s = st();
      const e = ed();
      const equipmentIds = idsOfKind(refs, 'equipment');
      const openingIds = idsOfKind(refs, 'opening');
      const vertexIds = idsOfKind(refs, 'vertex');
      const wallIds = idsOfKind(refs, 'wall');
      const roomIds = idsOfKind(refs, 'room');

      // Rooms are confirmed separately (walls go with them).
      if (roomIds.length > 0 && equipmentIds.length + openingIds.length + vertexIds.length + wallIds.length === 0) {
        const room = s.project.rooms[roomIds[0]];
        if (!room) return;
        setConfirm({
          kind: 'room',
          roomId: room.id,
          title: t('design3d.confirm.deleteRoomTitle', { name: room.name }),
          description: t('design3d.confirm.deleteRoomDesc'),
        });
        return;
      }

      let dissolved = 0;
      let refusedVertices = 0;
      s.transaction(() => {
        if (equipmentIds.length) equipment.remove(equipmentIds);
        for (const id of openingIds) s.removeOpening(id);
        for (const id of vertexIds) {
          if (!s.project.vertices[id]) continue;
          if (!s.dissolveVertex(id as VertexId)) refusedVertices += 1;
        }
        if (wallIds.length) dissolved = s.removeWalls(wallIds as WallId[]).length;
      });
      e.clearSelection();
      if (dissolved > 0) flashHint(t('design3d.hint.roomDissolved'));
      if (refusedVertices > 0) flashHint(t('design3d.hint.vertexNotDeletable'));
    },
    [equipment, flashHint, t],
  );

  const deleteSelection = useCallback(() => {
    const sel = ed().selection;
    if (sel.length === 0) return;
    deleteRefs(sel);
  }, [deleteRefs]);

  const requestDeleteRoom = useCallback(
    (roomId: string, withWalls: boolean) => {
      const room = st().project.rooms[roomId];
      if (!room) return;
      setConfirm({
        kind: withWalls ? 'roomWithWalls' : 'room',
        roomId,
        title: t(withWalls ? 'design3d.confirm.deleteRoomWallsTitle' : 'design3d.confirm.deleteRoomTitle', { name: room.name }),
        description: t(withWalls ? 'design3d.confirm.deleteRoomWallsDesc' : 'design3d.confirm.deleteRoomDesc'),
      });
    },
    [t],
  );

  const requestClearAll = useCallback(() => {
    setConfirm({
      kind: 'clearAll',
      title: t('design3d.confirm.clearAllTitle'),
      description: t('design3d.confirm.clearAllDesc'),
    });
  }, [t]);

  const runConfirm = useCallback(() => {
    const c = confirm;
    setConfirm(null);
    if (!c) return;
    const s = st();
    const e = ed();
    if (c.kind === 'clearAll') {
      s.newProject();
      e.clearSelection();
      e.setActiveRoom(null);
      e.cancelDraft();
      equipment.setArmedProduct(null);
      return;
    }
    if (!c.roomId) return;
    s.removeRoom(c.roomId as RoomId, { keepWalls: c.kind === 'room' });
    e.clearSelection();
    if (e.activeRoomId === c.roomId) e.setActiveRoom(null);
  }, [confirm, equipment]);

  const cancelConfirm = useCallback(() => setConfirm(null), []);

  // ── Wall / room commands ─────────────────────────────────────────────────
  const splitWallAtMiddle = useCallback((wallId: string) => {
    if (!st().project.walls[wallId]) return;
    st().splitWall(wallId as WallId, 0.5);
  }, []);

  const splitWallAt = useCallback((wallId: string, t01: number) => {
    if (!st().project.walls[wallId]) return;
    const r = st().splitWall(wallId as WallId, Math.max(0.02, Math.min(0.98, t01)));
    ed().select({ kind: 'vertex', id: r.newVertexId });
  }, []);

  const createRoomFromSelectedWalls = useCallback((): boolean => {
    const ids = idsOfKind(ed().selection, 'wall') as WallId[];
    if (ids.length < 3) {
      flashHint(t('design3d.hint.needThreeWalls'));
      return false;
    }
    try {
      const rid = st().createRoomFromWalls(ids);
      ed().setActiveRoom(rid);
      ed().select({ kind: 'room', id: rid });
      flashHint(t('design3d.hint.roomCreated'));
      return true;
    } catch {
      flashHint(t('design3d.hint.wallsNotLoop'));
      return false;
    }
  }, [flashHint, t]);

  return {
    pick,
    pickAt,
    deleteSelection,
    deleteRefs,
    requestDeleteRoom,
    requestClearAll,
    confirm,
    runConfirm,
    cancelConfirm,
    splitWallAtMiddle,
    splitWallAt,
    createRoomFromSelectedWalls,
    roomOfWall,
  };
}

export type SelectionCommands = ReturnType<typeof useSelectionCommands>;
