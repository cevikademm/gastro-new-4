/**
 * SceneManager — owns the Three.js renderer / scene / camera / lights /
 * controls / animation loop. The React host (Editor3D / 3DEditor.tsx)
 * passes a DOM container; everything below is plain Three.js.
 *
 * Why a class, not a hook?
 *  - The render loop has to keep going across re-renders, so it can't live
 *    in a component closure.
 *  - We want a stable handle to attach domain layers (walls, floor,
 *    equipment, interaction controller) without React re-creating GL
 *    resources every render.
 *
 * Units convention
 *   The internal model is in mm. The Three.js scene runs in METERS so GLB
 *   models drop in at correct real-world scale. Domain → scene callers use
 *   `MM_TO_THREE` from core/to3d.ts.
 *
 * Camera navigation
 *   Uses `camera-controls` (yomotsu) — a 3ds Max-style free orbit that is
 *   gimbal-lock safe (full top↔under-floor polar range, the floor never
 *   rolls/flips) and never "freezes". Orbit is paused via a REFERENCE-COUNTED
 *   interaction lock (push/pop) while an equipment body or the rotate gizmo is
 *   being dragged, so two drag sources can never clobber each other's enabled
 *   flag — the classic cause of the camera locking up.
 *
 * Lifecycle
 *   const m = new SceneManager();
 *   m.attach(containerEl);
 *   m.start();              // begins RAF loop
 *   m.add(group);           // attach a Three.Object3D
 *   m.fitCameraToBox(box3); // frame content
 *   m.dispose();            // tear down GL + DOM listeners
 */

import * as THREE from 'three';
import CameraControls from 'camera-controls';
import { createGradientBackground, createGroundGrid, createShadowCatcher } from './GroundGrid';

// camera-controls needs a one-time install with the THREE namespace before any
// instance is created. Guard so HMR / multiple SceneManagers don't re-install.
let cameraControlsInstalled = false;
function ensureCameraControlsInstalled(): void {
  if (cameraControlsInstalled) return;
  CameraControls.install({ THREE });
  cameraControlsInstalled = true;
}

export interface SceneManagerOptions {
  /** Solid background colour (hex) — used for fog and as the capture fallback. */
  background?: number;
  /**
   * Vertical gradient sweep behind the scene (CSS colours, top → bottom).
   * Pass `null` for a flat `background`. Default: soft studio sweep.
   */
  gradient?: { top: string; bottom: string } | null;
  /** Whether to enable antialias. Default true. */
  antialias?: boolean;
  /** Whether to enable shadows (perf cost ~30%). Default true. */
  shadows?: boolean;
  /** Atmospheric fog — default OFF (mimari sahnede netliği bozar). */
  fog?: boolean;
  /** Initial camera position (meters). */
  cameraStart?: { x: number; y: number; z: number };
}

export type FrameTickFn = (dt: number, t: number) => void;

export class SceneManager {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: CameraControls;

  /** Root group for domain content. Keep system objects (lights, grid) on the
   *  scene; put walls/floor/equipment under this so it can be cleared
   *  wholesale during scene rebuilds. */
  readonly contentRoot: THREE.Group;

  private container: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private rafId: number | null = null;
  private lastTime = 0;
  private tickFns: Set<FrameTickFn> = new Set();
  private disposed = false;

  // ── Render-on-demand ──────────────────────────────────────────────────
  // The RAF loop keeps ticking (camera-controls damping needs dt), but the
  // GPU only renders when the camera moved, something asked for a frame
  // (`requestRender`), a continuous interaction is running (drag / gizmo /
  // interaction lock), or the idle heartbeat is due. Idle GPU load → ~0.
  private needsRender = true;
  private continuousDepth = 0;
  private lastRenderAt = 0;
  /** Safety heartbeat so a missed `requestRender` never leaves a stale frame. */
  idleHeartbeatMs = 500;

  /**
   * Reference count for "pause the camera while something is being dragged".
   * Equipment-body drag and the rotate gizmo each push on start / pop on end.
   * The camera re-enables ONLY when the count returns to zero, so the two
   * sources can't fight over `controls.enabled` and leave it stuck disabled.
   */
  private interactionLocks = 0;

  // Lights — kept as fields so callers can tune them.
  readonly ambient: THREE.AmbientLight;
  readonly sun: THREE.DirectionalLight;
  readonly fill: THREE.HemisphereLight;
  /** Distance-faded reference grid (shader plane, see GroundGrid.ts). */
  readonly grid: THREE.Mesh;
  /** Shadow-only ground plane — contact shadows outside the room floors. */
  readonly ground: THREE.Mesh;
  /** Solid colour behind everything (fog colour + flat fallback). */
  readonly backgroundColor: THREE.Color;

  constructor(opts: SceneManagerOptions = {}) {
    const {
      background = 0xeef1f5,
      gradient = { top: '#fbfcfd', bottom: '#dfe4ea' },
      antialias = true,
      shadows = true,
      fog = false,
      cameraStart = { x: 6, y: 5, z: 8 },
    } = opts;

    ensureCameraControlsInstalled();

    // ── Renderer ──────────────────────────────────────────────────────
    // ÖNEMLİ: `preserveDrawingBuffer` KULLANILMAZ — her karede buffer kopyalanmaya
    // zorlar, sürekli render'da (serbest orbit) tekleme/kasma yapar (bilinen WebGL
    // perf tuzağı). capture() zaten render() + toDataURL()'i AYNI senkron tick'te
    // çağırdığı için buffer korumaya gerek yok; bu sayede orbit akıcı kalır.
    // `alpha:true` → capture(transparent) için saydam PNG mümkün; normal karede
    // scene.background her kareyi boyadığından görünüm birebir aynıdır.
    this.renderer = new THREE.WebGLRenderer({
      antialias,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = shadows;
    // PCFSoftShadowMap r183'te kaldırıldı; PCF + `shadow.radius` yumuşak kenar verir.
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // ── Scene ─────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.backgroundColor = new THREE.Color(background);
    // Yumuşak dikey geçiş: üst açık, zemin çizgisine doğru hafif koyu → derinlik
    // hissi; duvarlar arka plandan ayrışır. Düz renk istenirse gradient=null.
    this.scene.background = gradient
      ? createGradientBackground(gradient.top, gradient.bottom)
      : this.backgroundColor.clone();
    if (fog) {
      // Sis çok uzakta başlasın ki büyük sahnelerde bile yakın objeler net kalsın.
      this.scene.fog = new THREE.Fog(this.backgroundColor, 80, 200);
    }

    // ── Camera ────────────────────────────────────────────────────────
    // FOV 50 → 3ds Max benzeri daha doğal/derin perspektif. Yönelimi
    // camera-controls yönetir; burada lookAt çağırmıyoruz (up vektörü default
    // (0,1,0) kalsın → zemin daima yatay).
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    // Three uses Y-up by default — our internal model uses Z-up.
    // We rotate the contentRoot (below) so X/Y stay X/Y on the floor and
    // Z extrudes up; that way wall builders match the 2D editor exactly.

    // ── Lights ────────────────────────────────────────────────────────
    // Az ambient + gökyüzü/zemin dolgu + sıcak tonlu güneş: duvar yüzeyleri
    // birbirinden ayrışır (düz beyaz kutu görünümü yerine hacim okunur).
    this.ambient = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(this.ambient);

    this.fill = new THREE.HemisphereLight(0xffffff, 0xb9c2cd, 0.55);
    this.scene.add(this.fill);

    this.sun = new THREE.DirectionalLight(0xfff3e4, 1.35);
    this.sun.position.set(9, 13, 5);
    this.sun.castShadow = shadows;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 60;
    this.sun.shadow.camera.left = -20;
    this.sun.shadow.camera.right = 20;
    this.sun.shadow.camera.top = 20;
    this.sun.shadow.camera.bottom = -20;
    this.sun.shadow.bias = -0.00025;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun);

    // ── Ground: distance-faded grid + shadow catcher ──────────────────
    // Çift taraflı: kamera zeminin ALTINA indiğinde (özgür orbit) grid kaybolmasın.
    this.grid = createGroundGrid();
    this.scene.add(this.grid);
    this.ground = createShadowCatcher();
    this.ground.receiveShadow = shadows;
    this.scene.add(this.ground);

    // ── Content root: rotate -90° about X so +Y in domain → +Y on floor
    //    while the domain's +Z (up) maps to scene +Y (Three's up). This
    //    means everything we add to contentRoot uses domain coordinates.
    this.contentRoot = new THREE.Group();
    this.contentRoot.rotation.x = -Math.PI / 2;
    this.scene.add(this.contentRoot);

    // ── Controls (camera-controls — 3ds Max benzeri serbest orbit) ───────
    this.controls = new CameraControls(this.camera, this.renderer.domElement);
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 200;
    // Tam küresel orbit: tepeden zeminin ALTINA kadar kesintisiz dön.
    // camera-controls kutupları pürüzsüz yönetir (OrbitControls flip'i yok),
    // o yüzden epsilon GEREKMEZ.
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI;
    this.controls.dollyToCursor = true; // tekerlek imlece doğru zoom (3ds Max hissi)
    this.controls.smoothTime = 0.25; // genel yumuşaklık (damping)
    this.controls.draggingSmoothTime = 0.08; // sürüklerken daha tepkili
    // Mouse: sol döndür (web dostu), orta + sağ pan (truck), tekerlek zoom (dolly)
    this.controls.mouseButtons.left = CameraControls.ACTION.ROTATE;
    this.controls.mouseButtons.middle = CameraControls.ACTION.TRUCK;
    this.controls.mouseButtons.right = CameraControls.ACTION.TRUCK;
    this.controls.mouseButtons.wheel = CameraControls.ACTION.DOLLY;
    // Touch: tek parmak döndür, iki parmak zoom + pan
    this.controls.touches.one = CameraControls.ACTION.TOUCH_ROTATE;
    this.controls.touches.two = CameraControls.ACTION.TOUCH_DOLLY_TRUCK;
    // Başlangıç görünümü (iso) — yönelimi de set eder.
    this.controls.setLookAt(
      cameraStart.x, cameraStart.y, cameraStart.z,
      0, 0, 0,
      false,
    );
  }

  // ── Interaction lock (orbit'i sürükleme sırasında geçici kapatma) ────────
  //
  // Donma bug'ının kök çözümü: tek bir referans-sayacı. Hem ekipman-sürükleme
  // hem gizmo-döndürme push/pop eder; sayaç 0'a dönünce orbit tekrar açılır.

  /** Bir sürükleme/etkileşim başladı — orbit'i (gerekiyorsa) kapat. */
  pushInteractionLock(): void {
    if (this.interactionLocks++ === 0) this.controls.enabled = false;
    // Drags move meshes every frame without touching the camera → render continuously.
    this.beginContinuous();
  }

  /** Bir sürükleme/etkileşim bitti — son kilit bırakılınca orbit'i aç. */
  popInteractionLock(): void {
    if (this.interactionLocks > 0 && --this.interactionLocks === 0) {
      this.controls.enabled = true;
    }
    this.endContinuous();
  }

  /** Tüm kilitleri bırak (pencere blur / pointercancel güvenlik valfi). */
  releaseAllInteractionLocks(): void {
    this.interactionLocks = 0;
    this.controls.enabled = true;
    this.continuousDepth = 0;
    this.needsRender = true;
  }

  /** Mevcut orbit hedefini (world) döndür. camera-controls mutable `target`
   *  Vector3 sunmaz; dışarısı bunu kullanır. */
  getTarget(out?: THREE.Vector3): THREE.Vector3 {
    return this.controls.getTarget(out ?? new THREE.Vector3());
  }

  /**
   * Smoothly re-center the orbit on a world point so the camera ends up
   * orbiting AROUND that point ("uzayda yüzen ürün" hissi). Optionally dolly
   * the camera closer so the focused object fills more of the frame.
   *
   * @param worldPoint  Target in WORLD space (use object.getWorldPosition).
   * @param opts.distance  Desired camera→target distance (m). If omitted the
   *                       current distance is kept (sadece target kayar).
   * @param opts.duration  >0 → yumuşak geçiş; 0 → anında. Default 0.3.
   */
  focusOn(
    worldPoint: THREE.Vector3,
    opts: { distance?: number; duration?: number } = {},
  ): void {
    const { distance, duration = 0.3 } = opts;
    const target = this.controls.getTarget(new THREE.Vector3());
    const pos = this.controls.getPosition(new THREE.Vector3());

    // Keep the current viewing direction; only slide the eye so the new target
    // sits at the requested (or current) distance along the same ray.
    const dir = pos.clone().sub(target);
    let curDist = dir.length();
    if (curDist < 1e-4) {
      // Kamera ≈ hedef → yön belirsiz; iso yön kullan (NaN'i önler).
      dir.set(0.7, 0.55, 0.7);
      curDist = 1;
    }
    dir.normalize();
    const dist = THREE.MathUtils.clamp(
      distance ?? curDist,
      this.controls.minDistance,
      this.controls.maxDistance,
    );
    const eye = worldPoint.clone().add(dir.multiplyScalar(dist));
    this.controls.setLookAt(
      eye.x, eye.y, eye.z,
      worldPoint.x, worldPoint.y, worldPoint.z,
      duration > 0,
    );
  }

  /** Reset camera to a named view preset, framing the given content box. */
  setViewPreset(preset: 'top' | 'front' | 'side' | 'iso', box?: THREE.Box3): void {
    const target = new THREE.Vector3(0, 1.5, 0);
    const fallback = new THREE.Box3().setFromCenterAndSize(target, new THREE.Vector3(8, 3, 8));
    const useBox = box && !box.isEmpty() ? box : fallback;
    let dir: THREE.Vector3;
    switch (preset) {
      case 'top':   dir = new THREE.Vector3(0, 1, 0.001); break; // near top-down
      case 'front': dir = new THREE.Vector3(0, 0.05, 1); break;
      case 'side':  dir = new THREE.Vector3(1, 0.05, 0); break;
      case 'iso':   dir = new THREE.Vector3(0.7, 0.55, 0.7); break;
      default:      dir = new THREE.Vector3(0.7, 0.55, 0.7);
    }
    this.frameBox(useBox, dir.normalize(), 1.18, true);
  }

  /**
   * Point the camera along `dir` (world, pointing FROM the target TO the eye)
   * and pull back just far enough that `box` fits, with `padding` as margin.
   *
   * The distance comes from the box's extent PERPENDICULAR to the view — the
   * eight corners projected onto the camera's own right/up axes — checked
   * against both the horizontal and vertical field of view. A plain
   * "max dimension" estimate frames a wide room from far too far away on a
   * wide viewport (and crops a tall one on a narrow viewport).
   */
  private frameBox(box: THREE.Box3, dir: THREE.Vector3, padding: number, animate: boolean): void {
    const target = new THREE.Vector3();
    box.getCenter(target);

    // Camera basis. Near the poles the world-up is parallel to the view, so
    // fall back to world -Z as the reference up (top view keeps plan north up).
    const worldUp = new THREE.Vector3(0, 1, 0);
    const ref = Math.abs(dir.dot(worldUp)) > 0.999 ? new THREE.Vector3(0, 0, -1) : worldUp;
    const right = new THREE.Vector3().crossVectors(ref, dir).normalize();
    const up = new THREE.Vector3().crossVectors(dir, right).normalize();

    // Half-extent of the box along each screen axis.
    const size = new THREE.Vector3();
    box.getSize(size);
    const half = size.multiplyScalar(0.5);
    const halfW = Math.abs(half.x * right.x) + Math.abs(half.y * right.y) + Math.abs(half.z * right.z);
    const halfH = Math.abs(half.x * up.x) + Math.abs(half.y * up.y) + Math.abs(half.z * up.z);
    const halfD = Math.abs(half.x * dir.x) + Math.abs(half.y * dir.y) + Math.abs(half.z * dir.z);

    const fovV = (this.camera.fov * Math.PI) / 180;
    const aspect = Math.max(0.1, this.camera.aspect || 1);
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);
    const distV = (halfH * padding) / Math.tan(fovV / 2);
    const distH = (halfW * padding) / Math.tan(fovH / 2);
    // Stand off the box's own depth so a close fit never puts the near face
    // behind the camera.
    const dist = Math.max(distV, distH) + halfD;

    const safe = Math.max(dist, this.controls.minDistance + 0.5);
    const eye = target.clone().add(dir.clone().multiplyScalar(safe));
    this.camera.near = Math.max(0.05, safe / 2000);
    this.camera.far = Math.max(500, safe * 100);
    this.camera.updateProjectionMatrix();
    this.controls.setLookAt(eye.x, eye.y, eye.z, target.x, target.y, target.z, animate);
    this.needsRender = true;
  }

  /** Toggle atmospheric fog at runtime. */
  setFog(enabled: boolean): void {
    if (enabled) {
      this.scene.fog = new THREE.Fog(this.backgroundColor, 80, 200);
    } else {
      this.scene.fog = null;
    }
    this.needsRender = true;
  }

  // ── Yüksek kaliteli render capture ──────────────────────────────────────
  /**
   * Sahneyi süper-örnekleyerek yüksek kaliteli bir PNG/JPEG data URL'i üretir.
   *
   * Yöntem: çizim buffer'ını geçici olarak `scale` katı büyüt (pixelRatio),
   * TEK karede senkron render et, AYNI tick içinde `toDataURL` ile oku, sonra
   * her şeyi eski hâline getir. `preserveDrawingBuffer:true` sayesinde okuma
   * güvenlidir. GPU limitleri için buffer kenarı 4096'ya (≈4K) clamp edilir.
   *
   * @returns Üretilen görüntünün data URL'i + gerçek piksel boyutu.
   */
  capture(opts: {
    scale?: number;
    transparent?: boolean;
    hideGrid?: boolean;
    mime?: 'image/png' | 'image/jpeg';
    quality?: number;
  } = {}): { dataUrl: string; width: number; height: number } {
    const {
      scale = 4,
      transparent = false,
      hideGrid = true,
      mime = 'image/png',
      quality = 0.95,
    } = opts;

    const canvas = this.renderer.domElement;
    // CSS boyutundan bağımsız, mevcut buffer boyutundan yola çık.
    const baseW = canvas.width || 1;
    const baseH = canvas.height || 1;
    const cssW = Math.max(1, Math.round(baseW / (this.renderer.getPixelRatio() || 1)));
    const cssH = Math.max(1, Math.round(baseH / (this.renderer.getPixelRatio() || 1)));

    // Süper-örnekleme oranını GPU dostu olacak şekilde clamp et (kenar ≤ 4096).
    const maxEdge = 4096;
    const safeScale = Math.max(
      1,
      Math.min(scale, maxEdge / cssW, maxEdge / cssH),
    );

    // Mevcut durumu sakla.
    const prevPixelRatio = this.renderer.getPixelRatio();
    const prevGridVisible = this.grid.visible;
    const prevBackground = this.scene.background;
    const prevClear = this.renderer.getClearColor(new THREE.Color());
    const prevClearAlpha = this.renderer.getClearAlpha();

    try {
      if (hideGrid) this.grid.visible = false;
      if (transparent) {
        this.scene.background = null;
        this.renderer.setClearColor(0x000000, 0);
      }

      // Buffer'ı büyüt (CSS boyutunu koru → sahnedeki düzen değişmesin).
      this.renderer.setPixelRatio(safeScale);
      this.renderer.setSize(cssW, cssH, false);
      // camera-controls smooth geçişleri capture'ı bulanıklaştırmasın diye
      // hedefe anında oturt.
      this.controls.update(0);
      this.renderer.render(this.scene, this.camera);

      const outW = Math.round(cssW * safeScale);
      const outH = Math.round(cssH * safeScale);
      const dataUrl = canvas.toDataURL(mime, quality);
      return { dataUrl, width: outW, height: outH };
    } finally {
      // Her şeyi eski hâline getir.
      this.renderer.setPixelRatio(prevPixelRatio);
      this.renderer.setSize(cssW, cssH, false);
      this.grid.visible = prevGridVisible;
      this.scene.background = prevBackground;
      this.renderer.setClearColor(prevClear, prevClearAlpha);
      // Bir sonraki RAF karesi normal görünümü yeniden çizecek.
    }
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  attach(container: HTMLElement): void {
    if (this.container) this.detach();
    this.container = container;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    this.handleResize();

    // Robust resize: react to container size, not window — supports split
    // layouts and panel collapses.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', this.handleResize);
    }
  }

  detach(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    window.removeEventListener('resize', this.handleResize);
    if (this.container && this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.container = null;
  }

  /** Ask for one frame (scene changed outside the camera). */
  requestRender(): void {
    this.needsRender = true;
  }

  /** Render every frame until `endContinuous()` (drags, gizmo, animations). */
  beginContinuous(): void {
    this.continuousDepth += 1;
  }

  endContinuous(): void {
    this.continuousDepth = Math.max(0, this.continuousDepth - 1);
    this.needsRender = true;
  }

  start(): void {
    if (this.rafId !== null || this.disposed) return;
    this.lastTime = performance.now();
    const loop = (t: number) => {
      this.rafId = requestAnimationFrame(loop);
      const dt = (t - this.lastTime) / 1000;
      this.lastTime = t;
      for (const fn of this.tickFns) fn(dt, t);
      // camera-controls damping/transitions need delta-time updates each frame;
      // `update` reports whether the camera actually changed.
      const moved = this.controls.update(dt);
      const heartbeat = t - this.lastRenderAt >= this.idleHeartbeatMs;
      if (moved || this.needsRender || this.continuousDepth > 0 || heartbeat) {
        this.needsRender = false;
        this.lastRenderAt = t;
        this.renderer.render(this.scene, this.camera);
      }
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** Fully dispose GL resources + listeners. SceneManager is unusable after. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.detach();
    this.controls.dispose();
    this.disposeObject(this.scene);
    // Sahne başına üretilen sistem kaynakları (paylaşılan bayrağı taşısalar da
    // bu örneğe aittir): grid shader'ı, gölge zemini, gradyan arka planı.
    (this.grid.material as THREE.Material).dispose();
    (this.ground.material as THREE.Material).dispose();
    const bg = this.scene.background;
    if (bg && (bg as THREE.Texture).isTexture) (bg as THREE.Texture).dispose();
    this.renderer.dispose();
  }

  // ── Frame tick subscription ────────────────────────────────────────────
  onFrame(fn: FrameTickFn): () => void {
    this.tickFns.add(fn);
    return () => this.tickFns.delete(fn);
  }

  // ── Content helpers ────────────────────────────────────────────────────
  add(obj: THREE.Object3D): void {
    this.contentRoot.add(obj);
  }
  remove(obj: THREE.Object3D): void {
    this.contentRoot.remove(obj);
  }
  /** Drop everything under contentRoot (lights/grid stay). */
  clearContent(): void {
    while (this.contentRoot.children.length > 0) {
      const child = this.contentRoot.children[0];
      this.contentRoot.remove(child);
      this.disposeObject(child);
    }
  }

  // ── Camera framing ────────────────────────────────────────────────────
  fitCameraToBox(box: THREE.Box3, padding = 1.4): void {
    if (box.isEmpty()) return;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Hem yatay hem dikey FOV'u dikkate al — geniş ekranda kutu küçük kalmasın.
    const fovV = (this.camera.fov * Math.PI) / 180;
    const aspect = Math.max(0.1, this.camera.aspect || 1);
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * aspect);
    const distV = (size.y * padding) / (2 * Math.tan(fovV / 2));
    const distH = (Math.max(size.x, size.z) * padding) / (2 * Math.tan(fovH / 2));
    let dist = Math.max(distV, distH);
    dist = Math.max(dist, this.controls.minDistance + 1);

    const dir = new THREE.Vector3(0.7, 0.55, 0.7).normalize();
    const eye = center.clone().add(dir.multiplyScalar(dist));
    this.camera.near = Math.max(0.05, dist / 2000);
    this.camera.far = Math.max(500, dist * 100);
    this.camera.updateProjectionMatrix();
    this.controls.setLookAt(
      eye.x, eye.y, eye.z,
      center.x, center.y, center.z,
      true,
    );
  }

  // ── Internals ─────────────────────────────────────────────────────────
  private handleResize = (): void => {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.needsRender = true;
  };

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const mat of mats) {
        // Paylaşılan singleton materyaller (duvar/zemin/çelik) burada da atlanır —
        // ikinci bir Editor3D örneği (bölünmüş görünüm) hâlâ onları kullanıyor olabilir.
        if (mat.userData?.shared === true) continue;
        for (const k of Object.keys(mat) as (keyof THREE.Material)[]) {
          const v = (mat as any)[k];
          if (v && typeof v === 'object' && 'isTexture' in v && (v as any).isTexture) {
            (v as THREE.Texture).dispose();
          }
        }
        mat.dispose();
      }
    });
  }
}
