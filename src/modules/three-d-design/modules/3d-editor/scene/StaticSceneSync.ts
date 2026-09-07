/**
 * StaticSceneSync — incremental walls + floors under one root group.
 *
 * WHY: the previous "tear everything down and re-extrude every wall" approach
 * ran on EVERY store write (structuredClone hands the effect fresh references
 * for walls/rooms/… even when only an equipment slider moved). With transient
 * slider/drag edits writing per frame, that would re-triangulate the whole
 * kitchen 60 times a second.
 *
 * HOW: each wall / floor is keyed by id with a content signature
 * (`core/to3d.ts → wallSignature / floorSignature`). `sync()` removes objects
 * that are gone, rebuilds only those whose signature changed, and leaves the
 * rest untouched. Materials are shared singletons and are never disposed here;
 * per-object geometries are.
 */

import * as THREE from 'three';
import {
  ceilingSignature,
  floorSignature,
  wallSignature,
  type SceneDescription,
} from '../../../core/to3d';
import {
  boundsBoxFromDescription,
  buildCeilingMesh,
  buildFloorMesh,
  buildWallMesh,
  disposeOwnedResources,
} from '../builders/sceneBuilders';

export interface StaticSyncResult {
  /** Wall ids whose mesh was (re)built in this pass. */
  changedWallIds: string[];
  /** Wall ids removed in this pass. */
  removedWallIds: string[];
  /** Camera-framing bounds for the whole description. */
  boundsM: THREE.Box3;
}

export class StaticSceneSync {
  /** wallId → wall group (body + frames + leaves). */
  readonly wallById = new Map<string, THREE.Object3D>();
  /** roomId → floor mesh. */
  readonly floorById = new Map<string, THREE.Mesh>();
  /** roomId → ceiling mesh (visibility is driven by the editor). */
  readonly ceilingById = new Map<string, THREE.Mesh>();

  private readonly wallSig = new Map<string, string>();
  private readonly floorSig = new Map<string, string>();
  private readonly ceilingSig = new Map<string, string>();

  constructor(private readonly root: THREE.Group) {}

  sync(desc: SceneDescription): StaticSyncResult {
    const changedWallIds: string[] = [];
    const removedWallIds: string[] = [];

    // ── Walls ────────────────────────────────────────────────────────────
    const wantedWalls = new Set<string>();
    for (const fp of desc.walls) {
      wantedWalls.add(fp.wallId);
      const sig = wallSignature(fp);
      if (this.wallSig.get(fp.wallId) === sig && this.wallById.has(fp.wallId)) continue;
      const prev = this.wallById.get(fp.wallId);
      // Preserve view state (hidden) across a rebuild of the same wall.
      const visible = prev ? prev.visible : true;
      if (prev) {
        this.root.remove(prev);
        disposeOwnedResources(prev);
      }
      const next = buildWallMesh(fp);
      next.visible = visible;
      this.root.add(next);
      this.wallById.set(fp.wallId, next);
      this.wallSig.set(fp.wallId, sig);
      changedWallIds.push(fp.wallId);
    }
    for (const [id, obj] of Array.from(this.wallById)) {
      if (wantedWalls.has(id)) continue;
      this.root.remove(obj);
      disposeOwnedResources(obj);
      this.wallById.delete(id);
      this.wallSig.delete(id);
      removedWallIds.push(id);
    }

    // ── Floors ───────────────────────────────────────────────────────────
    const wantedFloors = new Set<string>();
    for (const f of desc.floors) {
      wantedFloors.add(f.roomId);
      const sig = floorSignature(f);
      if (this.floorSig.get(f.roomId) === sig && this.floorById.has(f.roomId)) continue;
      const prev = this.floorById.get(f.roomId);
      if (prev) {
        this.root.remove(prev);
        disposeOwnedResources(prev);
        this.floorById.delete(f.roomId);
      }
      const mesh = buildFloorMesh(f);
      if (mesh) {
        this.root.add(mesh);
        this.floorById.set(f.roomId, mesh);
      }
      this.floorSig.set(f.roomId, sig);
    }
    for (const [id, mesh] of Array.from(this.floorById)) {
      if (wantedFloors.has(id)) continue;
      this.root.remove(mesh);
      disposeOwnedResources(mesh);
      this.floorById.delete(id);
      this.floorSig.delete(id);
    }

    // ── Ceilings ─────────────────────────────────────────────────────────
    const wantedCeilings = new Set<string>();
    for (const c of desc.ceilings) {
      wantedCeilings.add(c.roomId);
      const sig = ceilingSignature(c);
      if (this.ceilingSig.get(c.roomId) === sig && this.ceilingById.has(c.roomId)) continue;
      const prev = this.ceilingById.get(c.roomId);
      const visible = prev ? prev.visible : false;
      if (prev) {
        this.root.remove(prev);
        disposeOwnedResources(prev);
        this.ceilingById.delete(c.roomId);
      }
      const mesh = buildCeilingMesh(c);
      if (mesh) {
        mesh.visible = visible;
        this.root.add(mesh);
        this.ceilingById.set(c.roomId, mesh);
      }
      this.ceilingSig.set(c.roomId, sig);
    }
    for (const [id, mesh] of Array.from(this.ceilingById)) {
      if (wantedCeilings.has(id)) continue;
      this.root.remove(mesh);
      disposeOwnedResources(mesh);
      this.ceilingById.delete(id);
      this.ceilingSig.delete(id);
    }

    return { changedWallIds, removedWallIds, boundsM: boundsBoxFromDescription(desc) };
  }

  /** Remove and dispose everything this sync owns. */
  dispose(): void {
    for (const obj of this.wallById.values()) {
      this.root.remove(obj);
      disposeOwnedResources(obj);
    }
    for (const mesh of this.floorById.values()) {
      this.root.remove(mesh);
      disposeOwnedResources(mesh);
    }
    for (const mesh of this.ceilingById.values()) {
      this.root.remove(mesh);
      disposeOwnedResources(mesh);
    }
    this.wallById.clear();
    this.floorById.clear();
    this.ceilingById.clear();
    this.wallSig.clear();
    this.floorSig.clear();
    this.ceilingSig.clear();
  }
}
