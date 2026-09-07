/**
 * useEquipmentInteraction — arm a catalog product and drop it, drag placed
 * items with the SHARED 2D/3D resolver (snap + collision + wall containment),
 * duplicate, nudge, rotate.
 */

import { useCallback, useRef, useState } from 'react';
import type { ProjectDocument, Vec2 } from '../../../core/types';
import type { EquipmentItem } from '../../../../../stores/equipmentStore';
import { useProjectStore } from '../../../store';
import { useEditor2DState } from '../state/editorState';
import { buildEquipmentPlacement } from '../../3d-editor/interaction/equipmentPlacement';
import { resolveEquipmentDrag } from '../../3d-editor/interaction/resolveDrag';
import { obbCenterFromMinCorner, containFloorItem } from '../../3d-editor/interaction/placement';
import { othersAtHeight, resolveCollision } from '../../3d-editor/interaction/collision';
import { removeEquipmentEverywhere } from '../../../../../lib/designDelete';

interface Args {
  project: ProjectDocument;
}

export function useEquipmentInteraction({ project }: Args) {
  const [armedProduct, setArmedProduct] = useState<EquipmentItem | null>(null);
  const dragCenterRef = useRef<Vec2 | null>(null);
  const st = () => useProjectStore.getState();
  const ed = () => useEditor2DState.getState();

  /** Drop the armed product centred on `world`. Shift keeps it armed. */
  const placeAt = useCallback(
    (world: Vec2, shift: boolean): boolean => {
      if (!armedProduct) return false;
      const proj = st().project;
      const id = st().addEquipment(buildEquipmentPlacement(proj, armedProduct, world));
      ed().select({ kind: 'equipment', id });
      if (!shift) setArmedProduct(null);
      return true;
    },
    [armedProduct],
  );

  // ── Drag (Konva node drag, constrained live) ─────────────────────────────
  const onDragStart = useCallback((id: string) => {
    const eq = st().project.equipment[id];
    dragCenterRef.current = eq
      ? obbCenterFromMinCorner(eq.position.x, eq.position.y, eq.rotation, eq.footprint.width, eq.footprint.depth)
      : null;
  }, []);

  const resolve = useCallback(
    (id: string, center: Vec2, shift: boolean) => {
      const proj = st().project;
      const eq = proj.equipment[id];
      if (!eq) return null;
      const w = eq.footprint.width;
      const d = eq.footprint.depth;
      const res = resolveEquipmentDrag({
        project: proj,
        eq,
        desiredMinCornerMm: { x: center.x - w / 2, y: center.y - d / 2 },
        snapGridMm: 10,
        edgeSnapTolMm: 50,
        collisionEnabled: !shift,
        prevValidCenter: dragCenterRef.current,
      });
      dragCenterRef.current = res.validCenter;
      return {
        nodeX: res.x + w / 2,
        nodeY: res.y + d / 2,
        rotationDeg: (res.rotation * 180) / Math.PI,
        rotationRad: res.rotation,
        minX: res.x,
        minY: res.y,
      };
    },
    [],
  );

  const onDragMove = useCallback(
    (id: string, center: Vec2) => {
      const r = resolve(id, center, false);
      return r ? { x: r.nodeX, y: r.nodeY, rotation: r.rotationDeg } : undefined;
    },
    [resolve],
  );

  const onDragEnd = useCallback(
    (id: string, center: Vec2) => {
      const r = resolve(id, center, false);
      const eq = st().project.equipment[id];
      if (r && eq) {
        st().updateEquipment(id, { position: { x: r.minX, y: r.minY, z: eq.position.z }, rotation: r.rotationRad });
      }
      dragCenterRef.current = null;
    },
    [resolve],
  );

  // ── Commands ─────────────────────────────────────────────────────────────
  const rotate = useCallback((ids: string[], deltaRad: number) => {
    const s = st();
    s.transaction(() => {
      for (const id of ids) {
        const eq = s.project.equipment[id];
        if (!eq || eq.locked) continue;
        s.updateEquipment(id, { rotation: eq.rotation + deltaRad });
      }
    });
  }, []);

  const nudge = useCallback((ids: string[], dx: number, dy: number) => {
    const s = st();
    s.transaction(() => {
      for (const id of ids) {
        const eq = s.project.equipment[id];
        if (!eq || eq.locked) continue;
        const res = resolveEquipmentDrag({
          project: s.project,
          eq,
          desiredMinCornerMm: { x: eq.position.x + dx, y: eq.position.y + dy },
          snapGridMm: 1,
          edgeSnapTolMm: 0,
          collisionEnabled: true,
          prevValidCenter: null,
        });
        s.updateEquipment(id, { position: { x: res.x, y: res.y, z: eq.position.z }, rotation: res.rotation });
      }
    });
  }, []);

  const duplicate = useCallback((ids: string[]): string[] => {
    const s = st();
    const created: string[] = [];
    s.transaction(() => {
      for (const id of ids) {
        const eq = s.project.equipment[id];
        if (!eq) continue;
        const others = othersAtHeight(eq.position.z, eq.heightMm, Object.values(s.project.equipment)).filter(
          (o) => !o.allowOverlap,
        );
        const start = { x: eq.position.x + 300, y: eq.position.y + 300 };
        const safe = eq.allowOverlap
          ? start
          : resolveCollision(start, eq.rotation, eq.footprint.width, eq.footprint.depth, others, null);
        const pos = containFloorItem(s.project, safe, eq.rotation, eq.footprint.width, eq.footprint.depth);
        const { id: _id, type: _type, ...rest } = eq;
        void _id;
        void _type;
        created.push(
          s.addEquipment({ ...rest, position: { x: pos.x, y: pos.y, z: eq.position.z }, locked: false }),
        );
      }
    });
    if (created.length > 0) ed().select(created.map((id) => ({ kind: 'equipment' as const, id })));
    return created;
  }, []);

  const remove = useCallback((ids: string[]) => {
    for (const id of ids) removeEquipmentEverywhere(id);
  }, []);

  const toggleLock = useCallback((ids: string[]) => {
    const s = st();
    s.transaction(() => {
      for (const id of ids) {
        const eq = s.project.equipment[id];
        if (eq) s.updateEquipment(id, { locked: !eq.locked });
      }
    });
  }, []);

  void project;
  return {
    armedProduct,
    setArmedProduct,
    placeAt,
    onDragStart,
    onDragMove,
    onDragEnd,
    rotate,
    nudge,
    duplicate,
    remove,
    toggleLock,
  };
}

export type EquipmentInteraction = ReturnType<typeof useEquipmentInteraction>;
