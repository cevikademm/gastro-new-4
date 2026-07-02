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
import { useTranslation } from 'react-i18next';
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
  EyeOff,
  Rotate3d,
  Camera,
  Images,
  BrickWall,
  Loader2,
  RotateCcw,
  RotateCw,
  Home,
} from 'lucide-react';

import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

import { useProjectStore } from '../../store';
import { MM_TO_THREE, projectToScene, THREE_TO_MM } from '../../core/to3d';
import { flipPointY, flipEquipPlacement } from '../../core/renderSpace';
import { useEditor2DState } from '../2d-editor/state/editorState';
import { SceneManager } from './scene/SceneManager';
import {
  buildStaticScene,
  getWallMaterial,
  getSelectedWallMaterial,
} from './builders/sceneBuilders';
import { InteractionController } from './interaction/InteractionController';
import { othersAtHeight, resolveCollision, snapToEdges } from './interaction/collision';
import {
  containFloorItem,
  defaultMountFor,
  defaultZForMount,
  mountToWall,
  snapFloorItemToWalls,
} from './interaction/placement';
import { loadEquipment, preloadEquipment } from './loaders/GLBLoader';
import { getCatalogEntry, type CatalogEntry } from './loaders/equipmentCatalog';
import {
  buildProductMesh,
  mapEquipmentCategory,
  parseHeightMm,
} from './loaders/productMesh';
import EquipmentCatalogPanel from './panels/EquipmentCatalogPanel';
import EquipmentPropertiesPanel from './panels/EquipmentPropertiesPanel';
import WallListPanel from './panels/WallListPanel';
import RenderGalleryPanel from './panels/RenderGalleryPanel';
import { captureAndStoreRender } from './render/captureRender';
import { ViewCube } from './viewcube/ViewCube';
import {
  useEquipmentStore,
  type EquipmentItem,
} from '../../../../stores/equipmentStore';
import { STANDALONE_KEY } from '../../../../lib/gastroDesignSync';
import { downloadDataUrl } from '../../../../lib/errorReport';
import { useMeshStore } from '../../../../stores/meshStore';
import { productKeyFor } from '../../../../lib/meshyClient';

const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/** Ultra render süper-örnekleme oranı (≈4K, GPU limitine clamp'lenir). */
const RENDER_SCALE = 4;

interface Editor3DProps {
  /** Kalıcılık anahtarı — render'ler Storage'a bu yol altında yüklenir. */
  projectKey?: string;
}

export default function Editor3D({ projectKey }: Editor3DProps = {}) {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const managerRef = useRef<SceneManager | null>(null);
  const controllerRef = useRef<InteractionController | null>(null);

  const staticRootRef = useRef<THREE.Group | null>(null);
  const equipmentRootRef = useRef<THREE.Group | null>(null);
  /** wallId → duvar grubu (staticRoot içinde). Görünürlük/vurgu bunun üzerinden
   *  uygulanır; her yeniden-kurulumda tazelenir. */
  const wallMeshByIdRef = useRef<Map<string, THREE.Object3D>>(new Map());
  /** ViewCube (sağ üst navigasyon küpü) host'u + instance'ı. */
  const viewCubeHostRef = useRef<HTMLDivElement | null>(null);
  const viewCubeRef = useRef<ViewCube | null>(null);
  /** Cache: equipmentId → loaded Object3D in equipmentRoot. */
  const equipmentCacheRef = useRef<Map<string, THREE.Object3D>>(new Map());
  /** Görsel imza: equipmentId → sig (renk/footprint/yükseklik/catalogId). Değişince
   *  mevcut mesh yeniden kurulur (cache yalnız id ekle/çıkar diff'ler; bu görünüm
   *  değişimlerini de yakalar). */
  const equipmentSigRef = useRef<Map<string, string>>(new Map());
  /** equipmentId → o an geçerli kurulum jetonu. Async mesh kurulumları (GLB/kutu)
   *  yarışabilir (ör. kutu kurulurken MeshAI GLB'si gelirse). Her yeni kurulumda
   *  jeton artırılır; async biten ESKİ kurulum jetonu tutmuyorsa kendini iptal eder
   *  → aynı ürün için iki mesh (öksüz kopya) oluşması engellenir. */
  const equipmentBuildTokenRef = useRef<Map<string, number>>(new Map());
  /** Wall/vertex content signature last processed by re-containment. */
  const lastWallSigRef = useRef<string>('');
  /** GLB footprint'i gerçek ölçüye göre düzeltilen ürün id'leri (tek sefer). */
  const correctedFootprintIdsRef = useRef<Set<string>>(new Set());

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
  const hiddenWallIds = useProjectStore((s) => s.view.hiddenWallIds);
  const selectedWallId = useProjectStore((s) => s.view.selectedWallId);
  // MeshAI ile Supabase'e üretilmiş GLB'ler (product_3d_models). Ekipman
  // senkronu bunu okuyup GLB'si olan ürünü kutu yerine gerçek 3B modelle kurar.
  const meshRows = useMeshStore((s) => s.rows);
  const [showGrid, setShowGrid] = useState(true);
  const [shadows, setShadows] = useState(true);

  // Duvar paneli / render galerisi / capture durumu.
  const [wallPanelOpen, setWallPanelOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [captureMsg, setCaptureMsg] = useState<string | null>(null);
  /** 3B'de bir duvara tıklanınca imlecin yanında beliren hızlı "Gizle" çipi. */
  const [wallAction, setWallAction] = useState<{ wallId: string; sx: number; sy: number } | null>(null);
  // 3B döndürme halkaları (gizmo) varsayılan KAPALI — ürüne tıklamak sadece
  // seçer, döndürme halkaları açılmaz. Kullanıcı toolbar'dan veya sağ panelden
  // açar.
  const [gizmoEnabled, setGizmoEnabled] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );
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
      onSelect: (id) => {
        setSelectedEquipmentId(id);
        // Ekipman seçilince (id) sağdaki tek panel kuralı: duvar panelini kapat +
        // duvar seçimini/vurgusunu temizle.
        if (id) {
          setWallPanelOpen(false);
          setWallAction(null);
          useProjectStore.getState().selectWall(null);
        }
      },
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

    // Gizmo sürükleme kilidinin push/pop dengesini koruyan guard (çift-fire'a karşı).
    let gizmoLockHeld = false;
    gizmo.addEventListener('dragging-changed', (event) => {
      const dragging = (event as unknown as { value: boolean }).value;
      // Gizmo sürüklenirken orbit'i kilitle (referans-sayımlı). Ekipman-sürükleme
      // ile aynı kilidi paylaştığı için ikisi birbirinin durumunu ezemez.
      if (dragging && !gizmoLockHeld) {
        m.pushInteractionLock();
        gizmoLockHeld = true;
      } else if (!dragging && gizmoLockHeld) {
        m.popInteractionLock();
        gizmoLockHeld = false;
      }
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
      const { yaw: renderYaw, tiltX, tiltY } = readZXY(obj);
      // obj render min-köşesi (mm). Döndürme render min-köşe etrafında olduğundan
      // konum değişmez; ama render→domain yansıması konum+yaw'ı BİRLİKTE çevirir.
      const rxMm = obj.position.x * THREE_TO_MM;
      const ryMm = obj.position.y * THREE_TO_MM;
      useProjectStore.getState().update((d) => {
        const e = d.equipment[eqId];
        if (!e) return;
        const dom = flipEquipPlacement(rxMm, ryMm, renderYaw, e.footprint.width, e.footprint.depth);
        const yaw = dom.yaw;
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
          { x: dom.x, y: dom.y },
          yaw,
          e.footprint.width,
          e.footprint.depth,
          others,
          eqId,
        );
        let fx = resolved.x;
        let fy = resolved.y;
        // Döndürme köşeleri duvara sokabilir — zemin ürününü oda/duvar içinde
        // tut (gizmo da sürükleme/panel ile aynı duvar kuralını uygulasın).
        if ((e.mount ?? 'floor') !== 'wall') {
          const contained = containFloorItem(
            d,
            { x: fx, y: fy },
            yaw,
            e.footprint.width,
            e.footprint.depth,
          );
          fx = contained.x;
          fy = contained.y;
        }
        e.position = { x: fx, y: fy, z: e.position.z };
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

      // Tıklama noktasının DOMAIN merkezi (render → domain: Y'yi geri yansıt,
      // bkz. renderSpace.ts). Yerleştirme matematiği (footprint min-köşe, mount,
      // çakışma/oda-içi tutma) karta-tıkla yoluyla ORTAK: buildEquipmentPlacement.
      const centerMm = { x: local.x * THREE_TO_MM, y: flipPointY(local.y * THREE_TO_MM) };
      const project = useProjectStore.getState().project;
      useProjectStore.getState().addEquipment(buildEquipmentPlacement(project, item, centerMm));

      // Multi-place with Shift; otherwise disarm.
      if (!e.shiftKey) {
        setArmedProduct(null);
        armedRef.current = null;
      }
      e.stopPropagation();
    };
    dom.addEventListener('pointerdown', onPlaceClick, { capture: true });

    // ── Duvar seçimi (3B'de tıklayarak) ──────────────────────────────────
    // Ekipman seçimini InteractionController yönetir; burada YALNIZCA duvarları
    // ele alırız. Sürükleme (orbit) ile karışmasın diye seçim pointerUP'ta ve
    // yalnızca imleç kayması eşik altındaysa (gerçek tık) yapılır.
    const wallPick = { x: 0, y: 0, moved: false, active: false };
    const wallRay = new THREE.Raycaster();
    const onWallPickDown = (e: PointerEvent) => {
      setWallAction(null);
      if (e.button !== 0) { wallPick.active = false; return; }
      wallPick.x = e.clientX;
      wallPick.y = e.clientY;
      wallPick.moved = false;
      wallPick.active = true;
    };
    const onWallPickMove = (e: PointerEvent) => {
      if (!wallPick.active) return;
      if (Math.abs(e.clientX - wallPick.x) > 6 || Math.abs(e.clientY - wallPick.y) > 6) {
        wallPick.moved = true;
      }
    };
    const onWallPickUp = (e: PointerEvent) => {
      if (!wallPick.active) return;
      wallPick.active = false;
      if (e.button !== 0 || wallPick.moved) return;
      if (armedRef.current) return; // ürün yerleştiriliyor
      if (gizmoActiveRef.current) return; // gizmo sürükleniyor
      if ((gizmoRef.current as unknown as { axis: string | null } | null)?.axis != null) return;

      const rect = dom.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      wallRay.setFromCamera(ndc, m.camera);

      // En yakın EKİPMAN mesafesi (önündeki ekipman duvarı gölgeler → duvar seçme).
      let eqDist = Infinity;
      const eqRoot = equipmentRootRef.current;
      if (eqRoot) {
        const hitsE = wallRay.intersectObjects(eqRoot.children, true);
        if (hitsE.length) eqDist = hitsE[0].distance;
      }
      // En yakın DUVAR (gizli duvarlar visible=false → raycaster atlar).
      const wallGroups = Array.from(wallMeshByIdRef.current.values());
      const hitsW = wallGroups.length ? wallRay.intersectObjects(wallGroups, true) : [];
      const wallHit = hitsW.length ? hitsW[0] : null;

      if (wallHit && wallHit.distance <= eqDist) {
        let o: THREE.Object3D | null = wallHit.object;
        while (o && !(o.userData && o.userData.wallId)) o = o.parent;
        const wallId = o?.userData?.wallId as string | undefined;
        if (wallId) {
          useProjectStore.getState().selectWall(wallId);
          setSelectedEquipmentId(null);
          setWallPanelOpen(true);
          setWallAction({ wallId, sx: e.clientX, sy: e.clientY });
          return;
        }
      }
      // Boşluğa / ekipmana tıklandı → duvar seçimini ve çipi temizle.
      useProjectStore.getState().selectWall(null);
      setWallAction(null);
    };
    dom.addEventListener('pointerdown', onWallPickDown);
    dom.addEventListener('pointermove', onWallPickMove);
    dom.addEventListener('pointerup', onWallPickUp);

    // ── ViewCube (3ds Max tarzı navigasyon küpü) ─────────────────────────
    // İzole overlay canvas → ana render döngüsüne dokunmaz. Her karede ana
    // kamerayla senkronlanır; yüz/kenar/köşe tıklaması hedef+mesafeyi koruyarak
    // yalnızca yönü değiştirir (setLookAt transition).
    let offCubeFrame: (() => void) | null = null;
    if (viewCubeHostRef.current) {
      const vc = new ViewCube(viewCubeHostRef.current, {
        onView: (viewDir) => {
          const target = m.getTarget(new THREE.Vector3());
          const dist = Math.max(0.001, m.camera.position.distanceTo(target));
          const eye = target
            .clone()
            .add(viewDir.clone().normalize().multiplyScalar(dist));
          m.controls.setLookAt(eye.x, eye.y, eye.z, target.x, target.y, target.z, true);
        },
      });
      viewCubeRef.current = vc;
      offCubeFrame = m.onFrame(() => vc.sync(m.camera));
    }

    // 2D'den gelen paylaşılan odağa bak (açı/mesafe korunur). Hata olursa
    // görünümü etkilemeden geç → mevcut çalışma mantığı bozulmaz.
    try {
      const f = useEditor2DState.getState().focusWorld;
      if (f) {
        const wp = m.contentRoot.localToWorld(
          new THREE.Vector3(f.x * MM_TO_THREE, flipPointY(f.y) * MM_TO_THREE, 0),
        );
        m.focusOn(wp, { duration: 0 });
        firstFitDoneRef.current = true; // odak korunsun, otomatik sığdırma ezmesin
      }
    } catch { /* odak senkronu opsiyonel */ }

    return () => {
      // 3D'den ayrılırken kamera hedefini paylaş → 2D aynı noktaya pan'lar.
      try {
        const local = m.contentRoot.worldToLocal(m.getTarget());
        useEditor2DState.getState().setFocusWorld({
          x: local.x * THREE_TO_MM,
          y: flipPointY(local.y * THREE_TO_MM),
        });
      } catch { /* yoksay */ }
      controllerRef.current = null;
      managerRef.current = null;
      staticRootRef.current = null;
      equipmentRootRef.current = null;
      equipmentCacheRef.current.clear();
      equipmentSigRef.current.clear();
      dom.removeEventListener('pointerdown', onPlaceClick, { capture: true });
      dom.removeEventListener('pointerdown', onWallPickDown);
      dom.removeEventListener('pointermove', onWallPickMove);
      dom.removeEventListener('pointerup', onWallPickUp);
      offCubeFrame?.();
      viewCubeRef.current?.dispose();
      viewCubeRef.current = null;
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

    // Duvar gruplarının haritasını sakla (child'ları staticRoot'a taşımak grup
    // referanslarını bozmaz) ve mevcut gizli/seçili durumu YENİDEN uygula →
    // görünürlük yeniden-kurulumu aşar. Store'dan taze oku (bayat closure yok,
    // toggle'da geometri yeniden kurulmaz).
    wallMeshByIdRef.current = built.meshByWallId;
    const view = useProjectStore.getState().view;
    applyWallVisibility(built.meshByWallId, view.hiddenWallIds);
    applyWallHighlight(built.meshByWallId, view.selectedWallId);

    if (!firstFitDoneRef.current && !built.boundsM.isEmpty()) {
      m.fitCameraToBox(built.boundsM);
      firstFitDoneRef.current = true;
    }
  }, [project.walls, project.rooms, project.openings, project.vertices]);

  // ── Duvar görünürlüğü (yalnızca .visible — geometri işi yok) ──────────────
  useEffect(() => {
    applyWallVisibility(wallMeshByIdRef.current, hiddenWallIds);
  }, [hiddenWallIds]);

  // ── Duvar vurgusu (seçili duvarın malzemesini değiştir) ───────────────────
  useEffect(() => {
    applyWallHighlight(wallMeshByIdRef.current, selectedWallId);
  }, [selectedWallId]);

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
        equipmentSigRef.current.delete(id);
      }
    }

    // Add new / update existing.
    for (const id of wantedIds) {
      const eq = project.equipment[id];
      // GLB kaynağını çöz: statik katalog / yüklenen / manifest / MeshAI-Supabase.
      // meshRows sonradan gelirse `sig` değişir → mevcut kutu otomatik GLB'ye yükseltilir.
      const glbEntry = resolveGlbEntry(eq, meshRows);
      const sig = equipmentSig(eq, glbEntry?.glbUrl);
      const existing = cache.get(id);
      if (existing) {
        // Gizmo bu ürüne bağlıyken tilt'i DIŞ group'a yedirilmiş (pivot identity)
        // durumda; kanonik re-seat onu un-bake eder, o yüzden ATLA. Gizmo bırakınca
        // (reseatAndRebake) zaten elle kanonik konuma getiriyoruz.
        if (gizmoAttachedIdRef.current === id) continue;
        // Görsel imza (renk/footprint/yükseklik/catalogId) değiştiyse mesh'i baştan
        // kur — cache yalnız id ekle/çıkar diff'ler, bu değişimleri yakalamaz.
        if (equipmentSigRef.current.get(id) !== sig) {
          equipmentRoot.remove(existing);
          disposeObject(existing);
          cache.delete(id);
          equipmentSigRef.current.delete(id);
          // aşağıdaki yeniden-kurma yollarına düş (continue YOK)
        } else {
          reseatCanonical(existing, eq);
          continue;
        }
      }

      // Bu id için yeni bir kurulum başlıyor: jeton üret. Async biten eski/yarışan
      // kurulumlar bu jetonu görüp kendini iptal eder (çift/öksüz mesh önlenir).
      const buildToken = (equipmentBuildTokenRef.current.get(id) ?? 0) + 1;
      equipmentBuildTokenRef.current.set(id, buildToken);

      // Async build — GLB (katalog/MeshAI) varsa gerçek modeli kur, yoksa ürün görselli kutu.
      if (glbEntry) {
        // ── Anında yer tutucu ──────────────────────────────────────────
        // GLB (çoğu zaman MB'lerce) inerken sahne BOŞ kalmasın: ürünü yerine
        // HEMEN koy. Tercih ürün görselli kutu (buildProductMesh) — katalog
        // item'ı varsa gerçek foto/ölçüyle; yoksa gri fallback kutu. GLB gelince
        // (aşağıdaki blok) bu yer tutucuyla değiştirilir. Aynı buildToken'ı
        // paylaştıkları için yeni bir kurulum başlarsa ikisi de kendini iptal eder.
        const phItem = useEquipmentStore.getState().getItemById(eq.catalogId);
        void (async () => {
          // Yer tutucu kurulmadan önce hızlı çık: GLB zaten geldiyse ya da yeni
          // kurulum başladıysa gereksiz.
          if (equipmentBuildTokenRef.current.get(id) !== buildToken) return;
          if (cache.has(id)) return;
          let placeholder: THREE.Group;
          if (phItem) {
            const rPh = flipEquipPlacement(eq.position.x, eq.position.y, eq.rotation, eq.footprint.width, eq.footprint.depth);
            placeholder = await buildProductMesh(phItem, {
              equipmentId: id,
              positionMm: { x: rPh.x, y: rPh.y, z: eq.position.z },
              rotationRad: rPh.yaw,
              tiltXRad: eq.tiltX ?? 0,
              tiltYRad: eq.tiltY ?? 0,
              widthMm: eq.footprint.width,
              depthMm: eq.footprint.depth,
              heightMm: eq.heightMm,
              color: eq.color,
            });
          } else {
            placeholder = buildFallbackBox(id, eq);
          }
          if (!equipmentRootRef.current) return;
          if (!useProjectStore.getState().project.equipment[id]) return;
          // buildProductMesh await'i sonrası tekrar kontrol: bu arada GLB gelmiş
          // veya yeni kurulum başlamış olabilir → yer tutucuyu at (yalnız kendi
          // benzersiz geometrisi; paylaşılan çelik materyaller Three tarafından
          // sonraki kullanımda yeniden derlenir).
          if (equipmentBuildTokenRef.current.get(id) !== buildToken) { disposeObject(placeholder); return; }
          if (cache.has(id)) { disposeObject(placeholder); return; }
          placeholder.userData.isPlaceholder = true;
          equipmentRoot.add(placeholder);
          seatOnFloor(placeholder, eq.position.z * MM_TO_THREE);
          cache.set(id, placeholder);
          equipmentSigRef.current.set(id, sig);
        })();

        void (async () => {
          const { group } = await loadEquipment(glbEntry);
          if (!equipmentRootRef.current) return;
          if (!useProjectStore.getState().project.equipment[id]) return;
          // Yarış koruması: bu id için daha yeni bir kurulum başladıysa bu (eski)
          // GLB sonucunu at (klonun paylaşılan geometrisini dispose ETME).
          if (equipmentBuildTokenRef.current.get(id) !== buildToken) return;
          // Önceden kurulmuş mesh varsa (anlık yer tutucu VEYA kutu→GLB
          // yükseltmesindeki kutu) sahneden kaldır + dispose et (öksüz/çift mesh
          // olmasın, yer tutucu GPU kaynağı sızmasın).
          const staleG = cache.get(id);
          if (staleG && staleG !== group) { equipmentRoot.remove(staleG); disposeObject(staleG); cache.delete(id); }
          const rGlb = flipEquipPlacement(eq.position.x, eq.position.y, eq.rotation, eq.footprint.width, eq.footprint.depth);
          group.position.set(
            rGlb.x * MM_TO_THREE,
            rGlb.y * MM_TO_THREE,
            eq.position.z * MM_TO_THREE,
          );
          group.rotation.z = rGlb.yaw;
          group.userData = { equipmentId: id, kind: 'equipment', catalogId: glbEntry.id };
          // MeshAI (Y-up) GLB'leri dik durması için varsayılan +90° X eğimi ister.
          // Kullanıcı eğimi henüz değiştirmediyse (tiltX undefined) varsayılanı uygula
          // VE store'a yaz (panelde 90° görünsün + reload'da korunsun + reseat/gizmo
          // ile tutarlı olsun). Kullanıcı bir değer verdiyse (0 dahil) dokunma.
          const wantsUpright = glbEntry.needsUprightTilt === true && eq.tiltX === undefined;
          const effTiltX = eq.tiltX ?? (wantsUpright ? Math.PI / 2 : 0);
          // Pivot at footprint bottom-center so tilt rotates a real-object
          // axis (not the back-left corner). Children are pre-shifted to
          // compensate so the model stays put when tilt = 0.
          const pivot = wrapWithPivot(group, glbEntry.dimensionsMm);
          pivot.rotation.x = effTiltX;
          pivot.rotation.y = eq.tiltY ?? 0;
          group.userData.pivot = pivot;
          equipmentRoot.add(group);
          if (wantsUpright) {
            useProjectStore.getState().update((d) => {
              const e = d.equipment[id];
              if (e && e.tiltX === undefined) { e.tiltX = Math.PI / 2; e.tiltY = e.tiltY ?? 0; }
            });
          }
          seatOnFloor(group, eq.position.z * MM_TO_THREE);
          cache.set(id, group);
          equipmentSigRef.current.set(id, sig);

          // GLB footprint düzeltmesi (tek sefer): çarpışma görselle uyuşsun.
          // loadEquipment uniform ölçekleme yapar; kayıtlı footprint gerçek
          // modelden sapabilir → ürünler birbirinin içinden geçer. Gerçek domain
          // footprint'ini ölçüp belirgin sapma varsa store'a yaz.
          if (!correctedFootprintIdsRef.current.has(id)) {
            correctedFootprintIdsRef.current.add(id);
            const fp = measureDomainFootprint(group);
            const cur = useProjectStore.getState().project.equipment[id];
            if (
              cur &&
              fp.width > 10 &&
              fp.depth > 10 &&
              (Math.abs(fp.width - cur.footprint.width) > cur.footprint.width * 0.05 ||
                Math.abs(fp.depth - cur.footprint.depth) > cur.footprint.depth * 0.05)
            ) {
              useProjectStore.getState().update((d) => {
                const e = d.equipment[id];
                if (e) {
                  e.footprint = { width: Math.round(fp.width), depth: Math.round(fp.depth) };
                }
              });
            }
          }
        })();
        continue;
      }

      // Lookup in the rich product catalog (equipmentStore).
      const item = useEquipmentStore.getState().getItemById(eq.catalogId);
      if (item) {
        void (async () => {
          const rPm = flipEquipPlacement(eq.position.x, eq.position.y, eq.rotation, eq.footprint.width, eq.footprint.depth);
          const group = await buildProductMesh(item, {
            equipmentId: id,
            positionMm: { x: rPm.x, y: rPm.y, z: eq.position.z },
            rotationRad: rPm.yaw,
            tiltXRad: eq.tiltX ?? 0,
            tiltYRad: eq.tiltY ?? 0,
            // Kutu ölçüsünü Equipment instance'ından besle → 2B dikdörtgen = 3B kutu.
            widthMm: eq.footprint.width,
            depthMm: eq.footprint.depth,
            heightMm: eq.heightMm,
            color: eq.color,
          });
          if (!equipmentRootRef.current) return;
          if (!useProjectStore.getState().project.equipment[id]) return;
          // Yarış koruması (bkz. GLB yolu): daha yeni kurulum başladıysa bu kutuyu at.
          // dispose YOK: sahneye hiç eklenmedi (GPU kaynağı yok) + kutular paylaşılan
          // çelik materyal/doku kullanır, dispose diğer kutuları bozabilir.
          if (equipmentBuildTokenRef.current.get(id) !== buildToken) return;
          // Önceden kurulmuş mesh varsa sahneden kaldır (çift/öksüz mesh olmasın).
          const staleB = cache.get(id);
          if (staleB && staleB !== group) { equipmentRoot.remove(staleB); cache.delete(id); }
          equipmentRoot.add(group);
          seatOnFloor(group, eq.position.z * MM_TO_THREE);
          cache.set(id, group);
          equipmentSigRef.current.set(id, sig);
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
      equipmentSigRef.current.set(id, sig);
    }
  }, [project.equipment, meshRows]);

  // ── Seçili ürüne kamerayı yakınlaştır ────────────────────────────────────
  // Ürünü kareyi dolduracak şekilde merkeze alır (F tuşu / çift-tık ile aynı
  // odak; panel butonundan tetiklenir). Kamera ürünün etrafında dönmeye devam
  // eder — sadece hedef + mesafe ürüne göre ayarlanır.
  const zoomToEquipment = useCallback((id: string | null) => {
    const m = managerRef.current;
    const obj = id ? equipmentCacheRef.current.get(id) : null;
    if (!m || !obj) return;
    obj.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (m.camera.fov * Math.PI) / 180;
    const fitDist = (maxDim * 1.8) / (2 * Math.tan(fov / 2));
    m.focusOn(center, { distance: Math.max(fitDist, 1.2), duration: 0.4 });
  }, []);

  // ── Karta tıkla → ürünü SAHNEYE HEMEN yerleştir ──────────────────────────
  // Kullanıcı şikâyeti: "ürünü tıklayınca ekranda gözüksün". Katalog kartına
  // tıklamak artık zemine tıklamayı beklemeden ürünü oda merkezine düşürür.
  // Aynı yerleştirme boru hattı (buildEquipmentPlacement) kullanılır → çakışma/
  // oda-içi tutma/duvara yaslama korunur, ürün üst üste binmez / dışarı taşmaz.
  // Ardışık tıklamalar resolveCollision sayesinde aynı noktaya yığılmaz.
  const placeItemAtCenter = useCallback((item: EquipmentItem) => {
    const project = useProjectStore.getState().project;
    const center = roomCenterDomain(project);
    const id = useProjectStore.getState().addEquipment(
      buildEquipmentPlacement(project, item, center),
    );
    // Yerleştirdikten sonra seç → sağ panel açılsın, kullanıcı hemen taşıyabilsin
    // (InteractionController seçimiyle tutarlı: duvar panelini/seçimini kapat).
    setSelectedEquipmentId(id);
    setWallPanelOpen(false);
    setWallAction(null);
    useProjectStore.getState().selectWall(null);
  }, []);

  // ── GLB ön-yükleme (arm/hover) ───────────────────────────────────────────
  // Ürün silahlandığında ya da kartı hover'landığında, GLB'si varsa GLBLoader'ın
  // per-URL cache'ini ısıt → yerleştirme anında model çoktan inmiş olur, yer
  // tutucu→GLB geçişi ışınlanma gibi anında olur. GLB yoksa güvenli no-op.
  const preloadItem = useCallback((item: EquipmentItem) => {
    let entry = getCatalogEntry(item.id);
    if (!entry) {
      // MeshAI ile Supabase'e üretilmiş GLB (resolveGlbEntry ile aynı mantık,
      // ama elimizde Equipment değil katalog item'ı var → ölçüyü item'dan al).
      const key = productKeyFor(item.img, item.id);
      const row = key ? meshRows[key] : undefined;
      if (row && row.status === 'done' && row.glb_url) {
        entry = {
          id: item.id,
          name: item.name,
          category: mapEquipmentCategory(item.cat),
          dimensionsMm: { width: item.l, depth: item.w, height: parseHeightMm(item.h) },
          glbUrl: row.glb_url,
          anchor: 'bottom-center',
          defaultRotationDeg: 0,
          needsUprightTilt: true,
        };
      }
    }
    if (entry) preloadEquipment(entry);
  }, [meshRows]);

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

  // ViewCube yay-okları: görünümü 90° azimut döndür (hedef+mesafe sabit).
  const rotateView = useCallback((sign: 1 | -1) => {
    managerRef.current?.controls.rotate((sign * Math.PI) / 2, 0, true);
  }, []);

  const [fogOn, setFogOn] = useState(false);
  useEffect(() => {
    managerRef.current?.setFog(fogOn);
  }, [fogOn]);

  // ── Render capture (Ultra 4× / ~4K PNG → projeye kaydet + indir) ──────────
  const onCapture = useCallback(async () => {
    const m = managerRef.current;
    if (!m || capturing) return;
    setCapturing(true);
    setCaptureMsg(null);
    // Yakalama anında duvar seçimi vurgusu görüntüye girmesin.
    useProjectStore.getState().selectWall(null);
    setWallAction(null);
    try {
      // Bir kare bekle → gizmo/seçim vurgusu vs. temizlensin.
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const key = projectKey ?? STANDALONE_KEY;
      const { render, dataUrl } = await captureAndStoreRender(m, {
        scale: RENDER_SCALE,
        projectKey: key,
      });
      useProjectStore.getState().update((d) => {
        (d.renders ??= []).push(render);
      });
      downloadDataUrl(dataUrl, `2mc-render-${render.id}.png`);
      setCaptureMsg(
        render.path
          ? t('design3d.render.savedDownloaded', { w: render.width, h: render.height })
          : t('design3d.render.downloadedNoCloud'),
      );
    } catch (err) {
      console.warn('[Render] capture başarısız:', (err as Error)?.message || err);
      setCaptureMsg(t('design3d.render.failed'));
    } finally {
      setCapturing(false);
      window.setTimeout(() => setCaptureMsg(null), 4500);
    }
  }, [capturing, projectKey, t]);

  // Duvar hızlı-çipini Escape ile kapat.
  useEffect(() => {
    if (!wallAction) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setWallAction(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wallAction]);

  const wallCount = Object.keys(project.walls).length;
  const roomCount = Object.keys(project.rooms).length;
  const equipmentCount = Object.keys(project.equipment).length;

  return (
    <div className="relative h-full w-full bg-slate-100 overflow-hidden">
      <div ref={hostRef} className="absolute inset-0" />

      {/* ── ViewCube (3ds Max tarzı navigasyon küpü) ────────────────── */}
      {/* Sol üst köşe: sağ kenardaki ekipman kataloğu + özellik panelleriyle
          hiç çakışmaz (o taraf hep dolu). */}
      <div className="absolute top-3 left-3 z-20 flex flex-col items-center gap-1.5">
        <div
          ref={viewCubeHostRef}
          className="h-28 w-28 select-none"
          title={t('design3d.viewcube.tooltip')}
        />
        <div className="inline-flex items-center gap-1 rounded-xl bg-white/95 backdrop-blur border border-slate-200/70 shadow-lg shadow-slate-900/5 p-1">
          <button
            type="button"
            onClick={() => rotateView(-1)}
            title={t('design3d.viewcube.rotateLeft')}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 transition"
          >
            <RotateCcw size={13} />
          </button>
          <button
            type="button"
            onClick={() => setView('iso')}
            title={t('design3d.viewcube.home')}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 transition"
          >
            <Home size={13} />
          </button>
          <button
            type="button"
            onClick={() => rotateView(1)}
            title={t('design3d.viewcube.rotateRight')}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 transition"
          >
            <RotateCw size={13} />
          </button>
        </div>
      </div>

      {/* ── Top toolbar ─────────────────────────────────────────────── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-white/95 backdrop-blur border border-slate-200/70 shadow-lg shadow-slate-900/5">
        <ToolBtn onClick={fit} title={t('design3d.toolbar.fitScene')}><Maximize2 size={14} /></ToolBtn>
        <Sep />
        <ToolBtn onClick={() => setView('iso')} title={t('design3d.toolbar.viewIso')}>
          <Box size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => setView('top')} title={t('design3d.toolbar.viewTop')}>
          <Square size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => setView('front')} title={t('design3d.toolbar.viewFront')}>
          <ArrowDown size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => setView('side')} title={t('design3d.toolbar.viewSide')}>
          <ArrowRight size={14} />
        </ToolBtn>
        <Sep />
        <ToolBtn active={showGrid} onClick={() => setShowGrid((v) => !v)} title={t('design3d.toolbar.grid')}>
          <GridIcon size={14} />
        </ToolBtn>
        <ToolBtn active={shadows} onClick={() => setShadows((v) => !v)} title={t('design3d.toolbar.shadows')}>
          <Sun size={14} />
        </ToolBtn>
        <ToolBtn active={fogOn} onClick={() => setFogOn((v) => !v)} title={t('design3d.toolbar.fog')}>
          <Eye size={14} />
        </ToolBtn>
        <Sep />
        <ToolBtn
          active={gizmoEnabled}
          onClick={() => setGizmoEnabled((v) => !v)}
          title={t('design3d.toolbar.rotateGizmo')}
        >
          <Rotate3d size={14} />
        </ToolBtn>
        <Sep />
        <ToolBtn
          active={wallPanelOpen}
          onClick={() =>
            setWallPanelOpen((v) => {
              const next = !v;
              if (next) setSelectedEquipmentId(null); // sağda tek panel
              return next;
            })
          }
          title={t('design3d.toolbar.walls')}
        >
          <BrickWall size={14} />
        </ToolBtn>
        <ToolBtn
          onClick={onCapture}
          active={capturing}
          title={t('design3d.toolbar.captureRender')}
        >
          {capturing ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </ToolBtn>
        <ToolBtn
          active={galleryOpen}
          onClick={() => setGalleryOpen((v) => !v)}
          title={t('design3d.toolbar.renderGallery')}
        >
          <Images size={14} />
        </ToolBtn>
      </div>

      {/* ── Render durum bildirimi ──────────────────────────────────── */}
      {captureMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/90 text-white text-[11px] shadow-lg z-30">
          <Camera size={12} /> {captureMsg}
        </div>
      )}

      {/* ── Duvar hızlı-çipi (3B'de tıklanan duvarı gizle) ──────────── */}
      {wallAction && (
        <div
          className="fixed z-40 -translate-x-1/2 -translate-y-full"
          style={{ left: wallAction.sx, top: wallAction.sy - 10 }}
        >
          <div className="inline-flex items-center gap-1 rounded-xl bg-white shadow-lg shadow-slate-900/15 border border-slate-200/70 p-1">
            <button
              type="button"
              onClick={() => {
                useProjectStore.getState().setWallHidden(wallAction.wallId, true);
                setWallAction(null);
              }}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold bg-brand-red text-white hover:brightness-110 transition"
              title={t('design3d.wallChip.hideTitle')}
            >
              <EyeOff size={13} /> {t('design3d.wallChip.hide')}
            </button>
            <button
              type="button"
              onClick={() => {
                setWallPanelOpen(true);
                setSelectedEquipmentId(null);
                setWallAction(null);
              }}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 transition"
              title={t('design3d.wallChip.openPanel')}
            >
              <BrickWall size={13} />
            </button>
            <button
              type="button"
              onClick={() => setWallAction(null)}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 transition"
              title={t('common.close')}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── Armed banner ───────────────────────────────────────────── */}
      {armedProduct && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-brand-red text-white text-[11px] shadow-lg shadow-slate-900/10 z-10">
          <span className="font-semibold">{armedProduct.name}</span>
          <span className="opacity-80">· {t('design3d.armed.hint3d')}</span>
          <span className="opacity-60">· {t('design3d.armed.chained')}</span>
          <button
            onClick={() => setArmedProduct(null)}
            className="ml-1 p-1 rounded-lg hover:bg-white/20 transition"
            aria-label={t('common.cancelEsc')}
            title={t('common.cancelEsc')}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── HUD ─────────────────────────────────────────────────────── */}
      <div className="absolute bottom-3 left-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur border border-slate-200/70 shadow-lg shadow-slate-900/5 text-[11px] tabular-nums text-slate-500">
        <Box size={11} className="text-slate-400" />{' '}
        {t('design3d.hud.counts', { walls: wallCount, rooms: roomCount, count: equipmentCount })}
        {selectedEquipmentId && (
          <span className="ml-1 text-brand-red font-medium">
            {t('design3d.hud.selectedHelp')}
          </span>
        )}
      </div>

      {/* ── Kontrol ipucu (sağ alt) ─────────────────────────────────── */}
      <div className="absolute bottom-3 right-3 inline-flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-white/95 backdrop-blur border border-slate-200/70 shadow-lg shadow-slate-900/5 text-[10px] text-slate-500 pointer-events-none">
        <span><b className="font-semibold text-slate-700">{t('design3d.controls.left')}</b> {t('design3d.controls.rotate')}</span>
        <span><b className="font-semibold text-slate-700">{t('design3d.controls.right')}</b> {t('design3d.controls.pan')}</span>
        <span><b className="font-semibold text-slate-700">{t('design3d.controls.wheel')}</b> {t('design3d.controls.zoom')}</span>
        <span><b className="font-semibold text-slate-700">{t('design3d.controls.doubleClick')}</b> {t('design3d.controls.focus')}</span>
      </div>

      {/* ── Equipment catalog panel (rich, search + categories) ─────── */}
      <EquipmentCatalogPanel
        armedProductId={armedProduct?.id ?? null}
        onArm={(item) => {
          setArmedProduct(item);
          if (item) preloadItem(item); // GLB cache'ini şimdiden ısıt
        }}
        onPlace={placeItemAtCenter}
        onPreload={preloadItem}
        open={paletteOpen}
        onToggleOpen={() => setPaletteOpen((v) => !v)}
      />

      {/* ── Selected-equipment properties (X/Y/rotation/flip/lock) ──── */}
      {!wallPanelOpen && (
        <EquipmentPropertiesPanel
          equipmentId={selectedEquipmentId}
          onClose={() => setSelectedEquipmentId(null)}
          gizmoEnabled={gizmoEnabled}
          onToggleGizmo={() => setGizmoEnabled((v) => !v)}
          onZoom={() => zoomToEquipment(selectedEquipmentId)}
        />
      )}

      {/* ── Duvarlar paneli (yükseklik + render için gizle) ─────────── */}
      <WallListPanel
        open={wallPanelOpen}
        onClose={() => {
          setWallPanelOpen(false);
          useProjectStore.getState().selectWall(null);
        }}
      />

      {/* ── Render galerisi (projeye kaydedilen görüntüler) ─────────── */}
      <RenderGalleryPanel open={galleryOpen} onClose={() => setGalleryOpen(false)} />

      {wallCount === 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="rounded-2xl border border-slate-200/70 bg-white/95 backdrop-blur shadow-lg shadow-slate-900/5 px-4 py-3 text-[12px] text-slate-500 text-center max-w-xs">
            {t('design3d.emptyState.noWalls')}
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
/**
 * Bir ekipman group'unun GERÇEK domain footprint'ini (genişlik × derinlik, mm)
 * ölç. Yaw'ı geçici sıfırlayıp WORLD AABB'sini alır; contentRoot'un -90° X
 * dönüşü gereği domain genişlik = world.x, domain derinlik = world.z.
 *
 * Oryantasyondan/uniform-ölçekten bağımsız: çizilen ne ise onu ölçer. GLB
 * ürünlerin çarpışma footprint'ini görsele eşitlemek için kullanılır (kutu
 * ürünler zaten footprint = görseldir, onlara gerek yok).
 */
function measureDomainFootprint(group: THREE.Object3D): { width: number; depth: number } {
  const prevZ = group.rotation.z;
  group.rotation.z = 0;
  group.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(group);
  group.rotation.z = prevZ;
  group.updateWorldMatrix(true, true);
  if (box.isEmpty()) return { width: 0, depth: 0 };
  return {
    width: (box.max.x - box.min.x) * THREE_TO_MM,
    depth: (box.max.z - box.min.z) * THREE_TO_MM,
  };
}

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
  // 2D↔3D aynalama: domain yerleşimini render uzayına yansıt (bkz. renderSpace.ts).
  const r = flipEquipPlacement(eq.position.x, eq.position.y, eq.rotation, eq.footprint.width, eq.footprint.depth);
  group.position.set(
    r.x * MM_TO_THREE,
    r.y * MM_TO_THREE,
    eq.position.z * MM_TO_THREE,
  );
  group.rotation.set(0, 0, r.yaw); // yaw only on the outer group
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

/**
 * Bir ekipmanın GÖRSEL imzası — değişince 3B mesh'in yeniden kurulması gerekenler:
 * renk, footprint, yükseklik, catalogId. Konum/dönüş/tilt mesh'i yeniden kurmadan
 * güncellendiği için imzaya DAHİL DEĞİL.
 */
function equipmentSig(
  eq: import('../../core/types').Equipment,
  glbUrl?: string | null,
): string {
  return [
    eq.color ?? '',
    eq.footprint.width,
    eq.footprint.depth,
    eq.heightMm,
    eq.catalogId,
    // GLB URL'i imzaya dahil: MeshAI modeli sonradan gelince kutu→GLB rebuild tetiklenir.
    glbUrl ?? '',
  ].join('|');
}

/**
 * Bir ekipman için kullanılacak GLB kaynağını çöz.
 *  1) Statik katalog / kullanıcı yüklemesi / manifest  (getCatalogEntry)
 *  2) MeshAI ile Supabase'e üretilmiş GLB (product_3d_models → meshStore)
 * Hiçbiri yoksa undefined → çağıran ürün görselli kutuya (buildProductMesh) düşer.
 *
 * MeshAI durumunda ölçü, YERLEŞTİRİLMİŞ footprint + yükseklikten alınır; GLBLoader
 * modeli bu ölçüye göre uniform ölçekler → sahnedeki boyut ürünle birebir olur.
 */
function resolveGlbEntry(
  eq: import('../../core/types').Equipment,
  meshRows: Record<string, { status?: string; glb_url?: string | null }>,
): CatalogEntry | undefined {
  const direct = getCatalogEntry(eq.catalogId);
  if (direct) return direct;

  const item = useEquipmentStore.getState().getItemById(eq.catalogId);
  const key = productKeyFor(item?.img, eq.catalogId);
  const row = key ? meshRows[key] : undefined;
  if (row && row.status === 'done' && row.glb_url) {
    return {
      id: eq.catalogId,
      name: eq.name,
      category: eq.category,
      dimensionsMm: {
        width: eq.footprint.width,
        depth: eq.footprint.depth,
        height: eq.heightMm,
      },
      glbUrl: row.glb_url,
      anchor: 'bottom-center',
      defaultRotationDeg: 0,
      // MeshAI çıktısı Y-up → sahnede dik durması için varsayılan +90° X eğimi.
      needsUprightTilt: true,
    };
  }
  return undefined;
}

/**
 * Ortak yerleştirme matematiği — bir katalog ürününü domain uzayında `centerMm`
 * MERKEZLİ olacak şekilde yerleştirmek için `addEquipment` girdisini üretir.
 *
 * Hem zemine-tıkla (onPlaceClick, raycast noktası) hem de karta-tıkla
 * (placeItemAtCenter, oda merkezi) yolları bunu kullanır → footprint min-köşe
 * çevrimi, mount (zemin/duvar), çakışma çözme, komşuya yaslama ve oda-içi tutma
 * kuralları TEK yerde. Katalog varsayılan overlap izni korunur.
 */
function buildEquipmentPlacement(
  project: import('../../core/types').ProjectDocument,
  item: EquipmentItem,
  centerMm: { x: number; y: number },
): Omit<import('../../core/types').Equipment, 'id' | 'type'> {
  const heightMm = parseHeightMm(item.h);
  const category = mapEquipmentCategory(item.cat);
  const mount = defaultMountFor(category);
  // Domain anchor: position = footprint MIN-KÖŞE. Merkezi min-köşeye çevir.
  let xMm = centerMm.x - item.l / 2;
  let yMm = centerMm.y - item.w / 2;
  let rotation = 0;
  const zMm = defaultZForMount(mount);

  // Yeni ürünün overlap izni katalog varsayılanından gelir (yoksa undefined/false).
  const allowOverlap = getCatalogEntry(item.id)?.allowOverlap;
  // Yalnızca kendi yükseklik bandındaki + overlap-izinSİZ ürünler çakışsın
  // (tezgah üstüne mikrodalga / range üstüne davlumbaz serbest kalsın).
  const others = othersAtHeight(zMm, heightMm, Object.values(project.equipment))
    .filter((o) => !o.allowOverlap);

  if (mount === 'wall') {
    // Davlumbaz vb.: en yakın duvara, odaya bakar şekilde yapıştır.
    const mounted = mountToWall(project, centerMm, item.l, item.w);
    if (mounted) {
      rotation = mounted.rotation;
      const pos = allowOverlap
        ? mounted.pos
        : resolveCollision(mounted.pos, rotation, item.l, item.w, others, null);
      xMm = pos.x;
      yMm = pos.y;
    }
  } else {
    // Overlap'e izinli DEĞİLSE: komşuya yanaş, örtüşmeyi it. (İzinliyse üst üste serbest.)
    let px = xMm;
    let py = yMm;
    if (!allowOverlap) {
      const snapped = snapToEdges({ x: px, y: py }, 0, item.l, item.w, others, null, 50);
      const safe = resolveCollision(snapped, 0, item.l, item.w, others, null);
      px = safe.x;
      py = safe.y;
    }
    // Yakın duvara yapıştır (yanaşma), sonra oda duvarlarının dışına taşmasın (HER ZAMAN).
    const snappedWall = snapFloorItemToWalls(project, { x: px, y: py }, 0, item.l, item.w);
    const contained = containFloorItem(project, snappedWall, 0, item.l, item.w);
    xMm = contained.x;
    yMm = contained.y;
  }

  return {
    catalogId: item.id,
    name: item.name,
    category,
    position: { x: xMm, y: yMm, z: zMm },
    rotation,
    mount,
    footprint: { width: item.l, depth: item.w },
    heightMm,
    allowOverlap,
  };
}

/**
 * Karta tıklayarak yerleştirme için makul bir varsayılan domain noktası: çizilen
 * duvarların köşe (vertex) ortalaması ≈ odanın iç merkezi. Buradan sonra
 * containFloorItem ürünü oda poligonuna çeker, resolveCollision üst üste
 * binmeyi engeller — yani merkezin tam "içeride" olması şart değil. Boş projede
 * origin.
 */
function roomCenterDomain(
  project: import('../../core/types').ProjectDocument,
): { x: number; y: number } {
  const verts = Object.values(project.vertices);
  if (verts.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const v of verts) { sx += v.x; sy += v.y; }
  return { x: sx / verts.length, y: sy / verts.length };
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
    color: eq.color ?? 0xc0c5cc,
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
  const r = flipEquipPlacement(eq.position.x, eq.position.y, eq.rotation, eq.footprint.width, eq.footprint.depth);
  group.position.set(
    r.x * MM_TO_THREE,
    r.y * MM_TO_THREE,
    eq.position.z * MM_TO_THREE,
  );
  group.rotation.z = r.yaw;
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

/** Gizli duvar gruplarını görünmez yap (render/görünüm için). `visible=false`
 *  gölge dökümünü de düşürür → iç mekân renderı için istenen davranış. */
function applyWallVisibility(map: Map<string, THREE.Object3D>, hiddenIds: string[]): void {
  const hidden = new Set(hiddenIds);
  for (const [id, group] of map) group.visible = !hidden.has(id);
}

/** Seçili duvarın ana mesh'ini vurgu malzemesiyle boya; diğerlerini normale al.
 *  Duvar grubunun ilk (ana ekstrüde) mesh'i `userData.kind==='wall'` taşır;
 *  çerçeve/cam/kanat mesh'leri farklıdır ve dokunulmaz. */
function applyWallHighlight(map: Map<string, THREE.Object3D>, selId: string | null): void {
  for (const [id, group] of map) {
    const mesh = group.children.find(
      (c) => (c as THREE.Mesh).isMesh && c.userData?.kind === 'wall',
    ) as THREE.Mesh | undefined;
    if (!mesh) continue;
    mesh.material = id === selId ? getSelectedWallMaterial() : getWallMaterial();
  }
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
        'inline-flex items-center justify-center h-9 w-9 rounded-xl transition',
        active
          ? 'bg-brand-red/10 text-brand-red ring-1 ring-brand-red/20'
          : 'text-slate-500 hover:bg-slate-100',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-6 bg-slate-200 mx-0.5" />;
}
