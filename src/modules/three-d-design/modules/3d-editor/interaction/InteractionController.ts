/**
 * InteractionController — pointer + keyboard interactions on the 3D scene.
 *
 * Responsibilities
 *   - Raycast to find equipment under the cursor.
 *   - Select / hover with visual feedback (emissive outline).
 *   - Drag selected equipment along the floor plane (z = 0 in scene units),
 *     with optional grid snapping.
 *   - Rotate selection in 90° steps via the R key.
 *   - Delete via Delete / Backspace.
 *
 * Interaction with OrbitControls
 *   While dragging an equipment, OrbitControls is disabled so right-mouse-
 *   pan vs. left-mouse-drag don't fight. Re-enabled on pointer up.
 *
 * Coordinate notes
 *   The Editor3D's contentRoot is rotated -90° around X so domain Z (up) maps
 *   to scene Y. We raycast against the floor plane (scene y=0) and convert
 *   hit points back into domain mm before writing to the store.
 */

import * as THREE from 'three';
import { MM_TO_THREE, THREE_TO_MM } from '../../../core/to3d';
import type { SceneManager } from '../scene/SceneManager';
import { useProjectStore } from '../../../store';
import { resolveCollision, snapToEdges } from './collision';

// ── Helpers ────────────────────────────────────────────────────────────────

const PLANE_FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // scene y=0

/**
 * Walk up from a hit object until we find a node tagged with userData.kind=='equipment'.
 * Equipment GLBs have many child meshes; the equipmentId lives on the root group.
 */
function findEquipmentRoot(obj: THREE.Object3D): THREE.Object3D | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.userData && cur.userData.kind === 'equipment' && cur.userData.equipmentId) {
      return cur;
    }
    cur = cur.parent;
  }
  return null;
}

export interface InteractionEvents {
  onSelect?: (equipmentId: string | null) => void;
  onHover?: (equipmentId: string | null) => void;
}

export class InteractionController {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly dragOffset = new THREE.Vector3();
  private readonly tmpVec = new THREE.Vector3();

  private selectedRoot: THREE.Object3D | null = null;
  private hoveredRoot: THREE.Object3D | null = null;
  private dragging: boolean = false;
  private events: InteractionEvents;

  /** mm grid for drag snapping. 0 = no snap. Domain-space mm. */
  snapGridMm: number = 10;
  /** Edge-snap tolerance for placing items flush against neighbours. */
  edgeSnapTolMm: number = 50;
  /** Collision detection during drag. Hold Shift to bypass. */
  collisionEnabled: boolean = true;
  private shiftHeld: boolean = false;

  /** Outline material we apply to selected / hovered meshes (cached). */
  private readonly emissiveSelected = new THREE.Color(0x2563eb);
  private readonly emissiveHovered = new THREE.Color(0x60a5fa);
  /** Original material params per mesh, so we can restore on deselect. */
  private readonly originals: WeakMap<THREE.Mesh, { color: THREE.Color; intensity: number }> = new WeakMap();

  private detachFns: Array<() => void> = [];

  constructor(private readonly manager: SceneManager, events: InteractionEvents = {}) {
    this.events = events;
  }

  attach(): void {
    const dom = this.manager.renderer.domElement;
    const onPointerMove = this.onPointerMove.bind(this);
    const onPointerDown = this.onPointerDown.bind(this);
    const onPointerUp = this.onPointerUp.bind(this);
    const onKeyDown = this.onKeyDown.bind(this);
    const onKeyUp = this.onKeyUp.bind(this);
    const onContextMenu = (e: Event) => e.preventDefault();

    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    this.detachFns.push(
      () => dom.removeEventListener('pointermove', onPointerMove),
      () => dom.removeEventListener('pointerdown', onPointerDown),
      () => dom.removeEventListener('pointerup', onPointerUp),
      () => dom.removeEventListener('contextmenu', onContextMenu),
      () => window.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('keyup', onKeyUp),
    );
  }

  detach(): void {
    for (const fn of this.detachFns) fn();
    this.detachFns = [];
    this.clearHover();
    this.clearSelection();
  }

  // ── Pointer handlers ──────────────────────────────────────────────────

  private updatePointerNDC(e: PointerEvent): void {
    const rect = this.manager.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onPointerMove(e: PointerEvent): void {
    this.updatePointerNDC(e);
    if (this.dragging && this.selectedRoot) {
      this.dragSelectedTo(e);
      return;
    }
    // While ANY mouse button is held the user is orbiting/panning the camera.
    // Skip the per-move hover raycast (it traverses every wall + GLB mesh and
    // was the main cause of sluggish, stuttery rotation).
    if (e.buttons !== 0) return;
    this.updateHover();
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return; // left click only
    this.updatePointerNDC(e);

    const hit = this.raycastEquipment();
    if (hit) {
      this.select(hit.root);
      const eqId = hit.root.userData?.equipmentId as string | undefined;
      const eq = eqId ? useProjectStore.getState().project.equipment[eqId] : undefined;
      // Locked items are selectable (so the panel opens) but not draggable.
      if (!eq?.locked) {
        this.beginDrag(hit.point);
        this.manager.controls.enabled = false;
      }
    } else {
      this.select(null);
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (e.button !== 0) return;
    if (this.dragging) {
      this.endDrag();
      this.manager.controls.enabled = true;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Shift') this.shiftHeld = true;
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }
    if (!this.selectedRoot) return;
    const equipmentId: string | undefined = this.selectedRoot.userData.equipmentId;
    if (!equipmentId) return;

    if (e.key.toLowerCase() === 'r') {
      this.rotateSelected(e.shiftKey ? -90 : 90);
      e.preventDefault();
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      useProjectStore.getState().removeEquipment(equipmentId);
      this.manager.remove(this.selectedRoot);
      this.clearSelection();
      e.preventDefault();
    }
    if (e.key === 'Escape') {
      this.select(null);
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.key === 'Shift') this.shiftHeld = false;
  }

  // ── Raycasting ─────────────────────────────────────────────────────────

  private raycastEquipment(): { root: THREE.Object3D; point: THREE.Vector3 } | null {
    this.raycaster.setFromCamera(this.pointer, this.manager.camera);
    const hits = this.raycaster.intersectObject(this.manager.contentRoot, true);
    for (const h of hits) {
      const root = findEquipmentRoot(h.object);
      if (root) return { root, point: h.point.clone() };
    }
    return null;
  }

  private floorHitPoint(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.pointer, this.manager.camera);
    const hit = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(PLANE_FLOOR, hit)) return hit;
    return null;
  }

  // ── Selection ──────────────────────────────────────────────────────────

  select(root: THREE.Object3D | null): void {
    if (root === this.selectedRoot) return;
    if (this.selectedRoot) this.applyOutline(this.selectedRoot, null);
    this.selectedRoot = root;
    if (root) this.applyOutline(root, this.emissiveSelected);
    const id: string | null = root?.userData?.equipmentId ?? null;
    this.events.onSelect?.(id);
  }

  clearSelection(): void {
    this.select(null);
  }

  private updateHover(): void {
    const hit = this.raycastEquipment();
    const root = hit?.root ?? null;
    if (root === this.hoveredRoot) return;
    if (this.hoveredRoot && this.hoveredRoot !== this.selectedRoot) {
      this.applyOutline(this.hoveredRoot, null);
    }
    this.hoveredRoot = root;
    if (root && root !== this.selectedRoot) {
      this.applyOutline(root, this.emissiveHovered);
    }
    this.events.onHover?.(root?.userData?.equipmentId ?? null);
  }

  private clearHover(): void {
    if (this.hoveredRoot && this.hoveredRoot !== this.selectedRoot) {
      this.applyOutline(this.hoveredRoot, null);
    }
    this.hoveredRoot = null;
  }

  /** Emissive outline by toggling MeshStandardMaterial.emissive on each mesh. */
  private applyOutline(root: THREE.Object3D, color: THREE.Color | null): void {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!(mesh as any).isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        const std = mat as THREE.MeshStandardMaterial;
        if (!std || !('emissive' in std)) continue;
        if (color) {
          if (!this.originals.has(mesh)) {
            this.originals.set(mesh, { color: std.emissive.clone(), intensity: std.emissiveIntensity });
          }
          std.emissive.copy(color);
          std.emissiveIntensity = 0.35;
        } else {
          const orig = this.originals.get(mesh);
          if (orig) {
            std.emissive.copy(orig.color);
            std.emissiveIntensity = orig.intensity;
            this.originals.delete(mesh);
          }
        }
      }
    });
  }

  // ── Drag ───────────────────────────────────────────────────────────────
  //
  // Coordinate systems
  //  - Raycaster gives us WORLD/scene coords (Y-up).
  //  - Equipment is parented to contentRoot which has rotation.x = -π/2,
  //    so its LOCAL space is the domain (Z-up, mm × MM_TO_THREE).
  //  - position.{x,y,z} that we read/write is in PARENT-LOCAL coords.
  //  - So we must convert world hits → contentRoot.worldToLocal() before
  //    touching `position`. Doing this naively (writing world coords) was
  //    the source of the "ürünleri istediğim gibi yerleştiremiyorum" bug.

  private beginDrag(hitWorld: THREE.Vector3): void {
    if (!this.selectedRoot) return;
    const local = this.tmpVec.copy(hitWorld);
    this.manager.contentRoot.worldToLocal(local);
    // Offset from the grab point to the model anchor — kept in LOCAL space.
    this.dragOffset.copy(local).sub(this.selectedRoot.position);
    this.dragOffset.z = 0; // we drag on the floor plane (domain z = 0)
    this.dragging = true;
  }

  private dragSelectedTo(_e: PointerEvent): void {
    if (!this.selectedRoot) return;
    const hit = this.floorHitPoint(); // world coords
    if (!hit) return;
    const local = this.tmpVec.copy(hit);
    this.manager.contentRoot.worldToLocal(local);
    local.sub(this.dragOffset);

    // Convert to domain mm — collision and edge-snap work in mm so we don't
    // accumulate float error from mm↔m round-trips.
    let xMm = local.x * THREE_TO_MM;
    let yMm = local.y * THREE_TO_MM;

    // 1) Coarse grid snap (10 mm) keeps numbers clean for B2B reports.
    if (this.snapGridMm > 0) {
      xMm = Math.round(xMm / this.snapGridMm) * this.snapGridMm;
      yMm = Math.round(yMm / this.snapGridMm) * this.snapGridMm;
    }

    const eqId = this.selectedRoot.userData?.equipmentId as string | undefined;
    const project = useProjectStore.getState().project;
    const eq = eqId ? project.equipment[eqId] : undefined;

    if (eq && this.collisionEnabled && !this.shiftHeld) {
      const others = Object.values(project.equipment);
      // 2) Edge-snap to neighbours so kabin sıraları 0 mm gap'le otursun.
      const snapped = snapToEdges(
        { x: xMm, y: yMm },
        eq.rotation,
        eq.footprint.width,
        eq.footprint.depth,
        others,
        eq.id,
        this.edgeSnapTolMm,
      );
      // 3) Resolve any remaining overlap (push out along smallest axis).
      const resolved = resolveCollision(
        snapped,
        eq.rotation,
        eq.footprint.width,
        eq.footprint.depth,
        others,
        eq.id,
      );
      xMm = resolved.x;
      yMm = resolved.y;
    }

    this.selectedRoot.position.x = xMm * MM_TO_THREE;
    this.selectedRoot.position.y = yMm * MM_TO_THREE;
    // Keep on the floor (domain z = floor height = 0 by default).
    this.selectedRoot.position.z = 0;
  }

  private endDrag(): void {
    this.dragging = false;
    if (!this.selectedRoot) return;
    const equipmentId: string | undefined = this.selectedRoot.userData.equipmentId;
    if (!equipmentId) return;
    // contentRoot LOCAL (x, y) are domain (x, y) in METERS. Convert to mm.
    const xMm = this.selectedRoot.position.x * THREE_TO_MM;
    const yMm = this.selectedRoot.position.y * THREE_TO_MM;
    useProjectStore.getState().update((d) => {
      const eq = d.equipment[equipmentId];
      if (!eq) return;
      eq.position = { x: xMm, y: yMm, z: eq.position.z };
    });
  }

  // ── Rotation ───────────────────────────────────────────────────────────
  private rotateSelected(deltaDeg: number): void {
    if (!this.selectedRoot) return;
    const equipmentId: string | undefined = this.selectedRoot.userData.equipmentId;
    if (!equipmentId) return;
    const newRotRad = this.selectedRoot.rotation.z + (deltaDeg * Math.PI) / 180;
    this.selectedRoot.rotation.z = newRotRad;
    useProjectStore.getState().update((d) => {
      const eq = d.equipment[equipmentId];
      if (eq) eq.rotation = newRotRad;
    });
  }
}
