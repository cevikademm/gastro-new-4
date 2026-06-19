/**
 * Editor3D — Three.js host inside React.
 *
 * Equipment sources
 *   1) Rich catalog from `useEquipmentStore` (the same products as Manuel
 *      Çizim — products.json). No GLB exists for these; we build a textured
 *      stainless-steel box at the product's real dimensions, with the
 *      product image stickered on the front face and top.
 *   2) (Legacy) Hardcoded `EQUIPMENT_CATALOG` GLB entries — used if a
 *      product's catalogId matches a known GLB URL. Kept as a fallback so
 *      future GLB releases drop in cleanly.
 *
 * Roots
 *   staticRoot      walls + floor (rebuilt on geometry change)
 *   equipmentRoot   per-equipment Object3D, diffed against project store —
 *                   GLBs/textured boxes survive across edits.
 *
 * Camera
 *   Auto-fit ONLY on the first non-empty build. Subsequent edits never
 *   yank the user's view.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Maximize2,
  Sun,
  Box,
  Grid as GridIcon,
  X,
  Square,
  ArrowDown,
  ArrowRight,
  Eye,
} from 'lucide-react';

import { useProjectStore } from '../../store';
import { MM_TO_THREE, projectToScene, THREE_TO_MM } from '../../core/to3d';
import { SceneManager } from './scene/SceneManager';
import { buildStaticScene } from './builders/sceneBuilders';
import { InteractionController } from './interaction/InteractionController';
import { resolveCollision, snapToEdges } from './interaction/collision';
import { loadEquipment } from './loaders/GLBLoader';
import { getCatalogEntry } from './loaders/equipmentCatalog';
import {
  buildProductMesh,
  mapEquipmentCategory,
  parseHeightMm,
} from './loaders/productMesh';
import EquipmentCatalogPanel from './panels/EquipmentCatalogPanel';
import EquipmentPropertiesPanel from './panels/EquipmentPropertiesPanel';
import {
  useEquipmentStore,
  type EquipmentItem,
} from '../../../../stores/equipmentStore';

const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export default function Editor3D() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const controllerRef = useRef<InteractionController | null>(null);

  const staticRootRef = useRef<THREE.Group | null>(null);
  const equipmentRootRef = useRef<THREE.Group | null>(null);
  /** Cache: equipmentId → loaded Object3D in equipmentRoot. */
  const equipmentCacheRef = useRef<Map<string, THREE.Object3D>>(new Map());

  const project = useProjectStore((s) => s.project);
  const [showGrid, setShowGrid] = useState(true);
  const [shadows, setShadows] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);

  // Click-to-place arming — holds the EquipmentItem (catalog product) the
  // user wants to drop. Ref mirror is read by the dom event listener.
  const [armedProduct, setArmedProduct] = useState<EquipmentItem | null>(null);
  const armedRef = useRef<EquipmentItem | null>(null);
  armedRef.current = armedProduct;

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const m = new SceneManager({ shadows: true });
    managerRef.current = m;
    m.attach(host);
    m.start();

    const staticRoot = new THREE.Group();
    staticRoot.name = 'static-root';
    const equipmentRoot = new THREE.Group();
    equipmentRoot.name = 'equipment-root';
    m.add(staticRoot);
    m.add(equipmentRoot);
    staticRootRef.current = staticRoot;
    equipmentRootRef.current = equipmentRoot;

    const c = new InteractionController(m, {
      onSelect: (id) => setSelectedEquipmentId(id),
    });
    controllerRef.current = c;
    c.attach();

    const dom = m.renderer.domElement;
    const onPlaceClick = (e: PointerEvent) => {
      const item = armedRef.current;
      if (!item) return;
      if (e.button !== 0) return;

      // Raycast against the floor plane in WORLD space, then convert to
      // contentRoot LOCAL space (domain coords, meters).
      const rect = dom.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, m.camera);
      const hitWorld = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(FLOOR_PLANE, hitWorld)) return;
      const local = m.contentRoot.worldToLocal(hitWorld.clone());

      // Center the footprint on the click point. Domain anchor convention:
      // position is the footprint MIN-CORNER.
      const heightMm = parseHeightMm(item.h);
      let xMm = local.x * THREE_TO_MM - item.l / 2;
      let yMm = local.y * THREE_TO_MM - item.w / 2;

      // Edge-snap to neighbours, then push out of any overlap. New items
      // never spawn inside existing ones — kesin kural.
      const others = Object.values(useProjectStore.getState().project.equipment);
      const snapped = snapToEdges(
        { x: xMm, y: yMm },
        0,
        item.l,
        item.w,
        others,
        null,
        50,
      );
      const safe = resolveCollision(snapped, 0, item.l, item.w, others, null);
      xMm = safe.x;
      yMm = safe.y;

      useProjectStore.getState().addEquipment({
        catalogId: item.id,
        name: item.name,
        category: mapEquipmentCategory(item.cat),
        position: { x: xMm, y: yMm, z: 0 },
        rotation: 0,
        footprint: { width: item.l, depth: item.w },
        heightMm,
      });

      // Multi-place with Shift; otherwise disarm.
      if (!e.shiftKey) {
        setArmedProduct(null);
        armedRef.current = null;
      }
      e.stopPropagation();
    };
    dom.addEventListener('pointerdown', onPlaceClick, { capture: true });

    return () => {
      controllerRef.current = null;
      managerRef.current = null;
      staticRootRef.current = null;
      equipmentRootRef.current = null;
      equipmentCacheRef.current.clear();
      dom.removeEventListener('pointerdown', onPlaceClick, { capture: true });
      c.detach();
      m.dispose();
    };
  }, []);

  // ── Static content sync (walls + floor) ──────────────────────────────────
  const firstFitDoneRef = useRef(false);
  useEffect(() => {
    const m = managerRef.current;
    const staticRoot = staticRootRef.current;
    if (!m || !staticRoot) return;

    while (staticRoot.children.length > 0) {
      const child = staticRoot.children[0];
      staticRoot.remove(child);
      disposeObject(child);
    }
    const desc = projectToScene(project);
    const built = buildStaticScene(desc);
    while (built.group.children.length > 0) staticRoot.add(built.group.children[0]);

    if (!firstFitDoneRef.current && !built.boundsM.isEmpty()) {
      m.fitCameraToBox(built.boundsM);
      firstFitDoneRef.current = true;
    }
  }, [project.walls, project.rooms, project.openings, project.vertices]);

  // ── Equipment sync (diffed against cache) ────────────────────────────────
  useEffect(() => {
    const equipmentRoot = equipmentRootRef.current;
    if (!equipmentRoot) return;
    const cache = equipmentCacheRef.current;

    const wantedIds = new Set(Object.keys(project.equipment));

    // Remove deleted.
    for (const [id, obj] of cache) {
      if (!wantedIds.has(id)) {
        equipmentRoot.remove(obj);
        disposeObject(obj);
        cache.delete(id);
      }
    }

    // Add new / update existing.
    for (const id of wantedIds) {
      const eq = project.equipment[id];
      const existing = cache.get(id);
      if (existing) {
        existing.position.set(
          eq.position.x * MM_TO_THREE,
          eq.position.y * MM_TO_THREE,
          eq.position.z * MM_TO_THREE,
        );
        existing.rotation.z = eq.rotation;
        // Tilts live on the inner pivot group so yaw and tilt don't fight.
        const pivot = existing.userData?.pivot as THREE.Object3D | undefined;
        if (pivot) {
          pivot.rotation.x = eq.tiltX ?? 0;
          pivot.rotation.y = eq.tiltY ?? 0;
        }
        continue;
      }

      // Async build — first try GLB catalog (legacy), then product image box.
      const glbEntry = getCatalogEntry(eq.catalogId);
      if (glbEntry) {
        void (async () => {
          const { group } = await loadEquipment(glbEntry);
          if (!equipmentRootRef.current) return;
          if (!useProjectStore.getState().project.equipment[id]) return;
          group.position.set(
            eq.position.x * MM_TO_THREE,
            eq.position.y * MM_TO_THREE,
            eq.position.z * MM_TO_THREE,
          );
          group.rotation.z = eq.rotation;
          group.userData = { equipmentId: id, kind: 'equipment', catalogId: glbEntry.id };
          // Pivot at footprint bottom-center so tilt rotates a real-object
          // axis (not the back-left corner). Children are pre-shifted to
          // compensate so the model stays put when tilt = 0.
          const pivot = wrapWithPivot(group, glbEntry.dimensionsMm);
          pivot.rotation.x = eq.tiltX ?? 0;
          pivot.rotation.y = eq.tiltY ?? 0;
          group.userData.pivot = pivot;
          equipmentRoot.add(group);
          cache.set(id, group);
        })();
        continue;
      }

      // Lookup in the rich product catalog (equipmentStore).
      const item = useEquipmentStore.getState().getItemById(eq.catalogId);
      if (item) {
        void (async () => {
          const group = await buildProductMesh(item, {
            equipmentId: id,
            positionMm: eq.position,
            rotationRad: eq.rotation,
            tiltXRad: eq.tiltX ?? 0,
            tiltYRad: eq.tiltY ?? 0,
          });
          if (!equipmentRootRef.current) return;
          if (!useProjectStore.getState().project.equipment[id]) return;
          equipmentRoot.add(group);
          cache.set(id, group);
        })();
        continue;
      }

      // Fallback: untextured grey box at footprint dimensions so the user
      // still sees SOMETHING (won't normally hit this since both paths
      // above cover everything we add).
      const boxGroup = buildFallbackBox(id, eq);
      equipmentRoot.add(boxGroup);
      cache.set(id, boxGroup);
    }
  }, [project.equipment]);

  // ── Toggles + cursor ─────────────────────────────────────────────────────
  useEffect(() => {
    const m = managerRef.current;
    if (m) m.grid.visible = showGrid;
  }, [showGrid]);

  useEffect(() => {
    const m = managerRef.current;
    if (!m) return;
    m.renderer.shadowMap.enabled = shadows;
    m.sun.castShadow = shadows;
    m.scene.traverse((o) => {
      const mesh = o as any;
      if (mesh.material) mesh.material.needsUpdate = true;
    });
  }, [shadows]);

  useEffect(() => {
    const m = managerRef.current;
    if (!m) return;
    m.renderer.domElement.style.cursor = armedProduct ? 'crosshair' : '';
  }, [armedProduct]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && armedProduct) {
        setArmedProduct(null);
        armedRef.current = null;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [armedProduct]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const fit = useCallback(() => {
    const m = managerRef.current;
    if (!m) return;
    const desc = projectToScene(project);
    const built = buildStaticScene(desc);
    if (!built.boundsM.isEmpty()) m.fitCameraToBox(built.boundsM);
  }, [project]);

  const setView = useCallback(
    (preset: 'top' | 'front' | 'side' | 'iso') => {
      const m = managerRef.current;
      if (!m) return;
      const desc = projectToScene(project);
      const built = buildStaticScene(desc);
      m.setViewPreset(preset, built.boundsM.isEmpty() ? undefined : built.boundsM);
    },
    [project],
  );

  const [fogOn, setFogOn] = useState(false);
  useEffect(() => {
    managerRef.current?.setFog(fogOn);
  }, [fogOn]);

  const wallCount = Object.keys(project.walls).length;
  const roomCount = Object.keys(project.rooms).length;
  const equipmentCount = Object.keys(project.equipment).length;

  return (
    <div className="relative h-full w-full bg-slate-100 overflow-hidden">
      <div ref={hostRef} className="absolute inset-0" />

      {/* ── Top toolbar ─────────────────────────────────────────────── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-1 bg-white/95 backdrop-blur border border-slate-200 rounded-lg shadow-sm">
        <ToolBtn onClick={fit} title="Sahneye sığdır"><Maximize2 size={14} /></ToolBtn>
        <Sep />
        <ToolBtn onClick={() => setView('iso')} title="İzometri görünüm">
          <Box size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => setView('top')} title="Üstten görünüm">
          <Square size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => setView('front')} title="Önden görünüm">
          <ArrowDown size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => setView('side')} title="Yandan görünüm">
          <ArrowRight size={14} />
        </ToolBtn>
        <Sep />
        <ToolBtn active={showGrid} onClick={() => setShowGrid((v) => !v)} title="Izgara">
          <GridIcon size={14} />
        </ToolBtn>
        <ToolBtn active={shadows} onClick={() => setShadows((v) => !v)} title="Gölgeler">
          <Sun size={14} />
        </ToolBtn>
        <ToolBtn active={fogOn} onClick={() => setFogOn((v) => !v)} title="Atmosferik sis (kapalı = net)">
          <Eye size={14} />
        </ToolBtn>
      </div>

      {/* ── Armed banner ───────────────────────────────────────────── */}
      {armedProduct && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg shadow-md z-10">
          <span className="font-semibold">{armedProduct.name}</span>
          <span className="opacity-80">· yerleştirmek için zemine tıklayın</span>
          <span className="opacity-60">· Shift+klik = ardışık</span>
          <button
            onClick={() => setArmedProduct(null)}
            className="ml-1 p-0.5 rounded hover:bg-white/20"
            aria-label="İptal (Esc)"
            title="İptal (Esc)"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── HUD ─────────────────────────────────────────────────────── */}
      <div className="absolute bottom-3 left-3 px-2 py-1 bg-white/90 border border-slate-200 rounded text-[11px] font-mono text-slate-500 flex items-center gap-2">
        <Box size={11} /> {wallCount} duvar · {roomCount} oda · {equipmentCount} ekipman
        {selectedEquipmentId && (
          <span className="ml-2 text-blue-600">
            seçili · sürükle (otomatik snap + çakışma) · sağ panelden hassas ayar · R döndür · Del sil · Shift = snap kapat
          </span>
        )}
      </div>

      {/* ── Kontrol ipucu (sağ alt) ─────────────────────────────────── */}
      <div className="absolute bottom-3 right-3 px-2.5 py-1.5 bg-white/90 border border-slate-200 rounded text-[10px] text-slate-500 flex items-center gap-3 pointer-events-none">
        <span><b className="text-slate-700">Sol</b> döndür</span>
        <span><b className="text-slate-700">Sağ</b> taşı</span>
        <span><b className="text-slate-700">Tekerlek</b> yakınlaş</span>
      </div>

      {/* ── Equipment catalog panel (rich, search + categories) ─────── */}
      <EquipmentCatalogPanel
        armedProductId={armedProduct?.id ?? null}
        onArm={(item) => setArmedProduct(item)}
        open={paletteOpen}
        onToggleOpen={() => setPaletteOpen((v) => !v)}
      />

      {/* ── Selected-equipment properties (X/Y/rotation/flip/lock) ──── */}
      <EquipmentPropertiesPanel
        equipmentId={selectedEquipmentId}
        onClose={() => setSelectedEquipmentId(null)}
      />

      {wallCount === 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-white/85 backdrop-blur border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-500 text-center max-w-xs">
            Önce 2D editörde bir oda çizin — 3D görünüm canlı güncellenir.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildFallbackBox(
  id: string,
  eq: import('../../core/types').Equipment,
): THREE.Group {
  const w = eq.footprint.width * MM_TO_THREE;
  const d = eq.footprint.depth * MM_TO_THREE;
  const h = eq.heightMm * MM_TO_THREE;
  const geom = new THREE.BoxGeometry(w, d, h);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xc0c5cc,
    roughness: 0.5,
    metalness: 0.4,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // Centered in pivot — pivot is at (w/2, d/2, 0) under the outer group.
  mesh.position.set(0, 0, h / 2);
  const group = new THREE.Group();
  group.userData = { equipmentId: id, kind: 'equipment', catalogId: eq.catalogId };
  const pivot = new THREE.Group();
  pivot.position.set(w / 2, d / 2, 0);
  pivot.rotation.x = eq.tiltX ?? 0;
  pivot.rotation.y = eq.tiltY ?? 0;
  pivot.add(mesh);
  group.add(pivot);
  group.userData.pivot = pivot;
  group.position.set(
    eq.position.x * MM_TO_THREE,
    eq.position.y * MM_TO_THREE,
    eq.position.z * MM_TO_THREE,
  );
  group.rotation.z = eq.rotation;
  return group;
}

/**
 * Reparent existing children of a yaw-only outer group into a new pivot
 * child positioned at the footprint bottom-center, so tilt rotates around a
 * real-object axis (taban orta noktası) instead of swinging the model around
 * its back-left corner.
 *
 * Pre-condition: the GLB has been normalized (bakeAnchorIntoChildren) so its
 * bbox sits at (0..w, 0..d, 0..h) in `group`'s local space. We then:
 *   - place pivot at (w/2, d/2, 0)
 *   - shift each existing child by (-w/2, -d/2, 0) so the model visually
 *     stays at the same place when tilt = 0.
 */
function wrapWithPivot(
  group: THREE.Group,
  dimensionsMm: { width: number; depth: number; height: number },
): THREE.Group {
  const w = dimensionsMm.width * MM_TO_THREE;
  const d = dimensionsMm.depth * MM_TO_THREE;

  const pivot = new THREE.Group();
  pivot.position.set(w / 2, d / 2, 0);

  while (group.children.length > 0) {
    const child = group.children[0];
    child.position.x -= w / 2;
    child.position.y -= d / 2;
    pivot.add(child);
  }
  group.add(pivot);
  return pivot;
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const mat of mats) mat.dispose();
  });
}

function ToolBtn({
  children,
  active,
  title,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={[
        'inline-flex items-center justify-center w-7 h-7 rounded text-xs transition-colors',
        active ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-slate-200 mx-0.5" />;
}
