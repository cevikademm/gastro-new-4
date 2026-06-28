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

// camera-controls needs a one-time install with the THREE namespace before any
// instance is created. Guard so HMR / multiple SceneManagers don't re-install.
let cameraControlsInstalled = false;
function ensureCameraControlsInstalled(): void {
  if (cameraControlsInstalled) return;
  CameraControls.install({ THREE });
  cameraControlsInstalled = true;
}

export interface SceneManagerOptions {
  /** Background color (hex). Default light room. */
  background?: number;
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
  readonly grid: THREE.GridHelper;

  constructor(opts: SceneManagerOptions = {}) {
    const {
      background = 0xf8fafc,
      antialias = true,
      shadows = true,
      fog = false,
      cameraStart = { x: 6, y: 5, z: 8 },
    } = opts;

    ensureCameraControlsInstalled();

    // ── Renderer ──────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({
      antialias,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ── Scene ─────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(background);
    if (fog) {
      // Sis çok uzakta başlasın ki büyük sahnelerde bile yakın objeler net kalsın.
      this.scene.fog = new THREE.Fog(background, 80, 200);
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
    this.ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(this.ambient);

    this.fill = new THREE.HemisphereLight(0xffffff, 0xc8cdd4, 0.7);
    this.scene.add(this.fill);

    this.sun = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sun.position.set(8, 12, 6);
    this.sun.castShadow = shadows;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 60;
    this.sun.shadow.camera.left = -20;
    this.sun.shadow.camera.right = 20;
    this.sun.shadow.camera.top = 20;
    this.sun.shadow.camera.bottom = -20;
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun);

    // ── Grid (1 m squares, 100 m total) ──────────────────────────────
    this.grid = new THREE.GridHelper(100, 100, 0xcbd5e1, 0xe2e8f0);
    (this.grid.material as THREE.Material).transparent = true;
    (this.grid.material as THREE.Material).opacity = 0.6;
    // Çift taraflı: kamera zeminin ALTINA indiğinde (özgür orbit) grid kaybolmasın.
    (this.grid.material as THREE.Material).side = THREE.DoubleSide;
    this.scene.add(this.grid);

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
  }

  /** Bir sürükleme/etkileşim bitti — son kilit bırakılınca orbit'i aç. */
  popInteractionLock(): void {
    if (this.interactionLocks > 0 && --this.interactionLocks === 0) {
      this.controls.enabled = true;
    }
  }

  /** Tüm kilitleri bırak (pencere blur / pointercancel güvenlik valfi). */
  releaseAllInteractionLocks(): void {
    this.interactionLocks = 0;
    this.controls.enabled = true;
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
    const target = new THREE.Vector3();
    const size = new THREE.Vector3(8, 4, 8);
    if (box && !box.isEmpty()) {
      box.getCenter(target);
      box.getSize(size);
    }
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (this.camera.fov * Math.PI) / 180;
    const dist = Math.max(2, (maxDim * 1.6) / (2 * Math.tan(fov / 2)));
    let dir: THREE.Vector3;
    switch (preset) {
      case 'top':   dir = new THREE.Vector3(0, 1, 0.001); break; // near top-down
      case 'front': dir = new THREE.Vector3(0, 0.05, 1); break;
      case 'side':  dir = new THREE.Vector3(1, 0.05, 0); break;
      case 'iso':   dir = new THREE.Vector3(0.7, 0.55, 0.7); break;
      default:      dir = new THREE.Vector3(0.7, 0.55, 0.7);
    }
    dir.normalize();
    const eye = target.clone().add(dir.multiplyScalar(dist));
    this.camera.near = Math.max(0.05, dist / 2000);
    this.camera.far = Math.max(500, dist * 100);
    this.camera.updateProjectionMatrix();
    this.controls.setLookAt(
      eye.x, eye.y, eye.z,
      target.x, target.y, target.z,
      true,
    );
  }

  /** Toggle atmospheric fog at runtime. */
  setFog(enabled: boolean): void {
    if (enabled) {
      const bg = this.scene.background as THREE.Color;
      this.scene.fog = new THREE.Fog(bg ?? new THREE.Color(0xf8fafc), 80, 200);
    } else {
      this.scene.fog = null;
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

  start(): void {
    if (this.rafId !== null || this.disposed) return;
    this.lastTime = performance.now();
    const loop = (t: number) => {
      this.rafId = requestAnimationFrame(loop);
      const dt = (t - this.lastTime) / 1000;
      this.lastTime = t;
      for (const fn of this.tickFns) fn(dt, t);
      // camera-controls damping/transitions need delta-time updates each frame.
      this.controls.update(dt);
      this.renderer.render(this.scene, this.camera);
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
  };

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
      for (const mat of mats) {
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
