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
  Rotate3d,
} from 'lucide-react';

import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

import { useProjectStore } from '../../store';
import { MM_TO_THREE, projectToScene, THREE_TO_MM } from '../../core/to3d';
import { SceneManager } from './scene/SceneManager';
import { buildStaticScene } from './builders/sceneBuilders';
import { InteractionController } from './interaction/InteractionController';
import { othersAtHeight, resolveCollision, snapToEdges } from './interaction/collision';
import {
  containFloorItem,
  defaultMountFor,
  defaultZForMount,
  mountToWall,
} from './interaction/placement';
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
  /** Wall/vertex content signature last processed by re-containment. */
  const lastWallSigRef = useRef<string>('');

  /** Rotate gizmo (TransformControls) + state. */
  const gizmoRef = useRef<TransformControls | null>(null);
  /**
   * equipmentId the gizmo is ATTACHED to. While attached, that item's tilt is
   * baked into its outer group (pivot identity), so the equipment-sync effect
   * must NOT re-seat it (would un-bake mid-session). Cleared on detach.
   */
  const gizmoAttachedIdRef = useRef<string | null>(null);
  /** True while a gizmo ring is being dragged (suppresses body-drag/select). */
  const gizmoActiveRef = useRef<boolean>(false);

  const project = useProjectStore((s) => s.project);
  const [showGrid, setShowGrid] = useState(true);
  const [shadows, setShadows] = useState(true);
  // 3B döndürme halkaları (gizmo) varsayılan KAPALI — ürüne tıklamak sadece
  // seçer, döndürme halkaları açılmaz. Kullanıcı toolbar'dan veya sağ panelden
  // açar.
  const [gizmoEnabled, setGizmoEnabled] = useState(false);
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
      // Active while a ring is being dragged (gizmoActiveRef) OR while the
      // pointer is merely HOVERING a ring (`gizmo.axis` is set on hover, before
      // pointerdown). The hover check is what makes the very first click on a
      // ring NOT fall through to body-drag/deselect — InteractionController's
      // pointerdown runs before TransformControls flips `dragging`.
      isGizmoActive: () =>
        gizmoActiveRef.current ||
        (gizmoRef.current as unknown as { axis: string | null } | null)?.axis != null,
    });
    controllerRef.current = c;
    c.attach();

    // ── Rotate gizmo (3ds Max 'Rotate' benzeri) ──────────────────────────
    // Seçili & kilitsiz ürünün DIŞ group'una attach edilir (ayrı effect).
    // Halka çevrildikçe ürün CANLI döner; bırakınca değer store'a yazılıp
    // kanonik şekilde (yaw dış + tilt iç pivot + seatOnFloor) yeniden oturur.
    const gizmo = new TransformControls(m.camera, m.renderer.domElement);
    gizmo.setMode('rotate');
    gizmo.setSpace('local'); // halkalar ürünün yerel eksenlerine hizalı (yaw=Z)
    gizmo.setSize(0.85);
    gizmoRef.current = gizmo;
    m.scene.add(gizmo.getHelper());

    gizmo.addEventListener('dragging-changed', (event) => {
      const dragging = (event as unknown as { value: boolean }).value;
      // OrbitControls ile çakışmasın: gizmo sürüklenirken orbit kapalı.
      m.controls.enabled = !dragging;
      gizmoActiveRef.current = dragging;
      // Bırakma anında (dragging=false) yönelimi store'a yaz. Sürükleme boyunca
      // equipment-sync zaten bu ürünü atlar (gizmoAttachedIdRef), o yüzden ayrı
      // bir "drag" bayrağı gerekmez.
      if (dragging) return;
      const obj = gizmo.object as THREE.Object3D | undefined;
      const eqId = obj?.userData?.equipmentId as string | undefined;
      if (!obj || !eqId) return;

      // Son yönelimi ZXY euler olarak çöz, store'a TEK update yaz (undo/redo
      // tek adım). Sahnedeki nesne zaten doğru yönde; store ↔ görsel tutarlı
      // kalsın diye kanonik re-seat'i hemen elle uygularız.
      const { yaw, tiltX, tiltY } = readZXY(obj);
      useProjectStore.getState().update((d) => {
        const e = d.equipment[eqId];
        if (!e) return;
        e.rotation = yaw;
        e.tiltX = tiltX;
        e.tiltY = tiltY;
        // Döndürme OBB'yi kaydırır — gizmo da sürükleme/panel ile aynı çakışma
        // kuralını uygulasın ki ürün komşusunun içine dönmesin. Yalnızca aynı
        // yükseklik bandındaki ürünler engeller.
        const others = othersAtHeight(
          e.position.z,
          e.heightMm,
          Object.values(d.equipment).filter((o) => o.id !== eqId),
        );
        const resolved = resolveCollision(
          { x: e.position.x, y: e.position.y },
          yaw,
          e.footprint.width,
          e.footprint.depth,
          others,
          eqId,
        );
        e.position = { x: resolved.x, y: resolved.y, z: e.position.z };
      });
      // Kanonik re-seat (yaw dış + tilt iç pivot + seatOnFloor) + tekrar bake →
      // gizmo oturumu kesintisiz sürsün, halka eksenleri hizalı kalsın.
      const eq = useProjectStore.getState().project.equipment[eqId];
      if (eq) reseatAndRebake(obj, eq);
    });

    // Shift basılıyken 15° snap (3ds Max angle-snap hissi).
    const onGizmoKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') gizmo.setRotationSnap((15 * Math.PI) / 180);
    };
    const onGizmoKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') gizmo.setRotationSnap(null);
    };
    window.addEventListener('keydown', onGizmoKeyDown);
    window.addEventListener('keyup', onGizmoKeyUp);

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
      const category = mapEquipmentCategory(item.cat);
      const mount = defaultMountFor(category);
      let xMm = local.x * THREE_TO_MM - item.l / 2;
      let yMm = local.y * THREE_TO_MM - item.w / 2;
      let rotation = 0;
      const zMm = defaultZForMount(mount);

      const project = useProjectStore.getState().project;
      // Yeni ürün yalnızca kendi yükseklik bandındaki ürünlerle çakışsın
      // (tezgah üstüne mikrodalga / range üstüne davlumbaz serbest kalsın).
      const others = othersAtHeight(zMm, heightMm, Object.values(project.equipment));

      if (mount === 'wall') {
        // Davlumbaz vb.: en yakın duvara, odaya bakar şekilde yapıştır.
        const clickCenter = { x: local.x * THREE_TO_MM, y: local.y * THREE_TO_MM };
        const mounted = mountToWall(project, clickCenter, item.l, item.w);
        if (mounted) {
          rotation = mounted.rotation;
          const safe = resolveCollision(mounted.pos, rotation, item.l, item.w, others, null);
          xMm = safe.x;
          yMm = safe.y;
        }
      } else {
        // Edge-snap to neighbours, then push out of any overlap. New items
        // never spawn inside existing ones — kesin kural.
        const snapped = snapToEdges({ x: xMm, y: yMm }, 0, item.l, item.w, others, null, 50);
        const safe = resolveCollision(snapped, 0, item.l, item.w, others, null);
        // Oda duvarlarının dışına taşmasın.
        const contained = containFloorItem(project, safe, 0, item.l, item.w);
        xMm = contained.x;
        yMm = contained.y;
      }

      useProjectStore.getState().addEquipment({
        catalogId: item.id,
        name: item.name,
        category,
        position: { x: xMm, y: yMm, z: zMm },
        rotation,
        mount,
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
      window.removeEventListener('keydown', onGizmoKeyDown);
      window.removeEventListener('keyup', onGizmoKeyUp);
      gizmo.detach();
      m.scene.remove(gizmo.getHelper());
      gizmo.dispose();
      gizmoRef.current = null;
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

  // ── Re-contain floor items when walls change ─────────────────────────────
  // If a wall is drawn (or moved) THROUGH an existing product, push the product
  // back out so nothing ever ends up inside a wall. Only writes when an item
  // actually has to move (>1 mm), so ordinary wall edits add no history noise.
  // Depends on walls/vertices only → updating equipment never re-triggers it.
  useEffect(() => {
    const proj = useProjectStore.getState().project;
    if (Object.keys(proj.walls).length === 0) return;
    // Guard: our own equipment write makes update() hand back NEW walls/vertices
    // references (same content). Re-run only when wall geometry truly changed,
    // so we can't loop on our own write or oscillate on a stuck item.
    let sig = '';
    for (const w of Object.values(proj.walls)) sig += `${w.a},${w.b},${w.thickness};`;
    for (const v of Object.values(proj.vertices)) sig += `${v.id}:${v.x},${v.y};`;
    if (sig === lastWallSigRef.current) return;
    lastWallSigRef.current = sig;

    const moves: Array<{ id: string; x: number; y: number }> = [];
    for (const eq of Object.values(proj.equipment)) {
      if ((eq.mount ?? 'floor') !== 'floor') continue;
      if (eq.locked) continue;
      const c = containFloorItem(
        proj,
        { x: eq.position.x, y: eq.position.y },
        eq.rotation,
        eq.footprint.width,
        eq.footprint.depth,
      );
      if (Math.abs(c.x - eq.position.x) > 1 || Math.abs(c.y - eq.position.y) > 1) {
        moves.push({ id: eq.id, x: c.x, y: c.y });
      }
    }
    if (moves.length > 0) {
      useProjectStore.getState().update((d) => {
        for (const mv of moves) {
          const e = d.equipment[mv.id];
          if (e) e.position = { ...e.position, x: mv.x, y: mv.y };
        }
      });
    }
  }, [project.walls, project.vertices]);

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
        // Gizmo bu ürüne bağlıyken tilt'i DIŞ group'a yedirilmiş (pivot identity)
        // durumda; kanonik re-seat onu un-bake eder, o yüzden ATLA. Gizmo bırakınca
        // (reseatAndRebake) zaten elle kanonik konuma getiriyoruz.
        if (gizmoAttachedIdRef.current === id) continue;
        reseatCanonical(existing, eq);
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
          seatOnFloor(group, eq.position.z * MM_TO_THREE);
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
          seatOnFloor(group, eq.position.z * MM_TO_THREE);
          cache.set(id, group);
        })();
        continue;
      }

      // Fallback: untextured grey box at footprint dimensions so the user
      // still sees SOMETHING (won't normally hit this since both paths
      // above cover everything we add).
      const boxGroup = buildFallbackBox(id, eq);
      equipmentRoot.add(boxGroup);
      seatOnFloor(boxGroup, eq.position.z * MM_TO_THREE);
      cache.set(id, boxGroup);
    }
  }, [project.equipment]);

  // ── Rotate gizmo attach/detach ───────────────────────────────────────────
  // Attach to the selected & UNLOCKED item's outer group; detach otherwise.
  // On attach the item's tilt is baked into the outer group (single rotation
  // source for the gizmo); on detach it's re-seated to the canonical structure.
  const selectedLocked = selectedEquipmentId
    ? !!project.equipment[selectedEquipmentId]?.locked
    : false;
  useEffect(() => {
    const gizmo = gizmoRef.current;
    if (!gizmo) return;
    const id = selectedEquipmentId;
    const obj = id ? equipmentCacheRef.current.get(id) : undefined;

    // Detach previous attachment → re-seat it canonically from the store.
    const prevId = gizmoAttachedIdRef.current;
    if (prevId && prevId !== id) {
      const prevObj = equipmentCacheRef.current.get(prevId);
      const prevEq = useProjectStore.getState().project.equipment[prevId];
      if (prevObj && prevEq) reseatCanonical(prevObj, prevEq);
    }

    if (id && obj && !selectedLocked && gizmoEnabled) {
      gizmoAttachedIdRef.current = id;
      bakeTiltIntoOuter(obj);
      gizmo.attach(obj);
    } else {
      gizmoAttachedIdRef.current = null;
      gizmo.detach();
    }
  }, [selectedEquipmentId, selectedLocked, gizmoEnabled]);

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
        <Sep />
        <ToolBtn
          active={gizmoEnabled}
          onClick={() => setGizmoEnabled((v) => !v)}
          title="3B döndürme halkaları (seçili ürünü gizmo ile döndür)"
        >
          <Rotate3d size={14} />
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
            seçili · gövdeyi sürükle (snap + çakışma) · 3B döndürme için ↻ butonu (toolbar / sağ panel) · F / çift tık = odaklan · R 90° · Del sil
          </span>
        )}
      </div>

      {/* ── Kontrol ipucu (sağ alt) ─────────────────────────────────── */}
      <div className="absolute bottom-3 right-3 px-2.5 py-1.5 bg-white/90 border border-slate-200 rounded text-[10px] text-slate-500 flex items-center gap-3 pointer-events-none">
        <span><b className="text-slate-700">Sol</b> döndür</span>
        <span><b className="text-slate-700">Sağ</b> taşı</span>
        <span><b className="text-slate-700">Tekerlek</b> yakınlaş</span>
        <span><b className="text-slate-700">Çift tık</b> ürüne odaklan</span>
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
        gizmoEnabled={gizmoEnabled}
        onToggleGizmo={() => setGizmoEnabled((v) => !v)}
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

/**
 * Lift `group` so its LOWEST point rests at `baseZ` meters (domain z, which maps
 * to world Y under contentRoot's -90° X rotation).
 *
 * Two problems this solves:
 *  1) Tilt pivots sit at the footprint bottom-center (z = 0), so a tilted model
 *     swings half its body BELOW the floor. We measure the post-tilt bounding box
 *     and push the group up so nothing dips under `baseZ`.
 *  2) Manual height: `baseZ = eq.position.z` lets the user lift an item onto a
 *     counter / wall — its base lands at the requested height instead of z = 0.
 */
function seatOnFloor(group: THREE.Object3D, baseZ: number): void {
  group.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) return;
  // box.min.y is the lowest WORLD-Y (= lowest domain-z). A delta on the group's
  // local z shifts world Y 1:1 (parent equipmentRoot is untransformed).
  group.position.z += baseZ - box.min.y;
}

/**
 * Re-seat an outer group into the CANONICAL structure from store values:
 * position from eq.position, yaw on the outer group (Z), tilt on the inner
 * pivot (X/Y), then seatOnFloor. Single source of truth = store. Used by the
 * equipment-sync effect and after a gizmo session ends.
 */
function reseatCanonical(group: THREE.Object3D, eq: import('../../core/types').Equipment): void {
  group.position.set(
    eq.position.x * MM_TO_THREE,
    eq.position.y * MM_TO_THREE,
    eq.position.z * MM_TO_THREE,
  );
  group.rotation.set(0, 0, eq.rotation); // yaw only on the outer group
  const pivot = group.userData?.pivot as THREE.Object3D | undefined;
  if (pivot) {
    pivot.rotation.x = eq.tiltX ?? 0;
    pivot.rotation.y = eq.tiltY ?? 0;
  }
  seatOnFloor(group, eq.position.z * MM_TO_THREE);
}

/**
 * After a gizmo release: re-seat canonically (so seatOnFloor handles vertical
 * sink + tilt returns to the inner pivot), then re-bake the tilt into the outer
 * group so the gizmo session can continue with axes still aligned to the item.
 */
function reseatAndRebake(group: THREE.Object3D, eq: import('../../core/types').Equipment): void {
  reseatCanonical(group, eq);
  bakeTiltIntoOuter(group);
}

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

/**
 * Drag-başı tilt yedirme.
 *
 * Sürükleme süresince TEK bir döndürme kaynağı olsun diye, iç pivot'taki tilt'i
 * (Rt) DIŞ group'un kendi transformuna katarız ve iç pivot rotasyonunu sıfırlarız.
 * İçeriği yerinde tutmak için konjugasyon kullanılır:
 *   G_new = G_old · T(p0) · Rt · T(p0)⁻¹
 * Böylece pivot rotasyonu identity olsa da tüm mesh'ler aynı dünya pozunda kalır.
 * Bırakıldığında store'dan kanonik re-seat yapıldığı için bu geçici durum kalıcı
 * değildir (position store'dan yeniden hesaplanır).
 */
function bakeTiltIntoOuter(group: THREE.Object3D): void {
  const pivot = group.userData?.pivot as THREE.Object3D | undefined;
  if (!pivot) return;
  if (pivot.rotation.x === 0 && pivot.rotation.y === 0) return; // tilt yok

  group.updateMatrix();
  const Gold = group.matrix.clone();

  const Tp0 = new THREE.Matrix4().makeTranslation(
    pivot.position.x,
    pivot.position.y,
    pivot.position.z,
  );
  const Tp0Inv = new THREE.Matrix4().copy(Tp0).invert();
  const Rt = new THREE.Matrix4().makeRotationFromEuler(pivot.rotation);

  const Gnew = new THREE.Matrix4()
    .multiply(Gold)
    .multiply(Tp0)
    .multiply(Rt)
    .multiply(Tp0Inv);

  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  Gnew.decompose(pos, quat, scl);
  group.position.copy(pos);
  group.quaternion.copy(quat);
  group.updateMatrix();

  pivot.rotation.set(0, 0, 0);
}

/**
 * DIŞ group'un quaternion'ını 'ZXY' sırasında euler'e çöz → yaw=z, tiltX=x,
 * tiltY=y. Seating modeliyle tutarlı: dış group yaw'ı (Z) ana eksen, X/Y tilt.
 */
function readZXY(group: THREE.Object3D): { yaw: number; tiltX: number; tiltY: number } {
  const e = new THREE.Euler().setFromQuaternion(group.quaternion, 'ZXY');
  return { yaw: e.z, tiltX: e.x, tiltY: e.y };
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
