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
 * Lifecycle
 *   const m = new SceneManager();
 *   m.attach(containerEl);
 *   m.start();              // begins RAF loop
 *   m.add(group);           // attach a Three.Object3D
 *   m.fitCameraToBox(box3); // frame content
 *   m.dispose();            // tear down GL + DOM listeners
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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
  readonly controls: OrbitControls;

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
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(cameraStart.x, cameraStart.y, cameraStart.z);
    this.camera.lookAt(0, 0, 0);
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
    this.scene.add(this.grid);

    // ── Content root: rotate -90° about X so +Y in domain → +Y on floor
    //    while the domain's +Z (up) maps to scene +Y (Three's up). This
    //    means everything we add to contentRoot uses domain coordinates.
    this.contentRoot = new THREE.Group();
    this.contentRoot.rotation.x = -Math.PI / 2;
    this.scene.add(this.contentRoot);

    // ── Controls (orbit) ─────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0, 0);
    // Üstten bakış ↔ neredeyse yatay arası: tam yatay görünüme yaklaşmaya izin
    // ver ama zeminin altına sarkmasın. Top-down (90° from horizon) serbest.
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI * 0.499;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 200;
    this.controls.rotateSpeed = 1.0;
    this.controls.zoomSpeed = 1.2;
    this.controls.panSpeed = 1.2;
    this.controls.screenSpacePanning = true;
    // Touch: tek parmak döndür, iki parmak pan/zoom
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    // Mouse: sol döndür, orta zoom, sağ pan
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.update();
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
    this.camera.position.copy(target.clone().add(dir.multiplyScalar(dist)));
    this.camera.near = Math.max(0.05, dist / 2000);
    this.camera.far = Math.max(500, dist * 100);
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(target);
    this.controls.update();
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
      this.controls.update();
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
    this.camera.position.copy(center.clone().add(dir.multiplyScalar(dist)));
    this.camera.near = Math.max(0.05, dist / 2000);
    this.camera.far = Math.max(500, dist * 100);
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(center);
    this.controls.update();
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
