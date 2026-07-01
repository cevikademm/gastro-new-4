/**
 * ViewCube — 3ds Max / AutoCAD tarzi navigasyon kubu.
 *
 * NEDEN ayri bir canvas/renderer?
 *   Kup, ANA sahnenin render dongusune DOKUNMAZ: kendi kucuk WebGLRenderer +
 *   Scene + OrthographicCamera'si olan izole bir overlay'dir. Boylece:
 *     - TransformControls raycast'i ve camera-controls orbit'iyle cakismaz
 *       (ayri DOM elemani),
 *     - ana render performansini (serbest orbit) riske atmaz.
 *
 * Nasil senkron olur?
 *   Her karede `sync(mainCamera)` cagrilir: kup kamerasinin YONELIMI ana
 *   kameraninkiyle birebir kopyalanir (quaternion) ve gorus yonu boyunca sabit
 *   ortho mesafeye konur. Boylece kup, sahnenin o anki yonelimini birebir gosterir
 *   (kutuplarda bile lookAt bozulmasi olmadan).
 *
 * Kup = 26 tiklanabilir bolge (6 yuz + 12 kenar + 8 kose) — 3x3x3 "Rubik"
 *   yuzey bolunmesi. Her bolge dunya-uzayi bir gorus yonu tasir; tiklaninca
 *   `onView(dir)` cagrilir (Editor3D bunu `controls.setLookAt` ile uygular).
 */
import * as THREE from 'three';

export interface ViewCubeOptions {
  /** Bir bolge tiklaninca cagrilir — dunya-uzayi normalize gorus yonu. */
  onView: (worldDir: THREE.Vector3) => void;
  /** Kenar uzunlugu (px). Varsayilan konteyner genisligi ya da 112. */
  size?: number;
}

// Yuz yon anahtari -> Ingilizce etiket (3ds Max standardi).
const FACE_LABELS: Record<string, string> = {
  '0,1,0': 'TOP',
  '0,-1,0': 'BOTTOM',
  '0,0,1': 'FRONT',
  '0,0,-1': 'BACK',
  '1,0,0': 'RIGHT',
  '-1,0,0': 'LEFT',
};

const BASE_COLOR = 0xfbfcfe; // yumusak beyaz yuz (modern, temiz)
const EDGE_COLOR = 0xeaeef4; // kenar/kose hafif gri (ince pah hissi)
const HOVER_COLOR = 0xfecdd0; // yumusak kirmizi vurgu (koyu metin okunur)
const HOVER_EMISSIVE = 0x2a0406; // hover'da cok hafif ic parilti
const BAND = 0.3; // kenar/kose bandi — dar -> yuzler buyuk ve okunur
const GAP = 0.022; // bolgeler arasi cok ince bosluk (zarif dikis)
const ORTHO_D = 12; // ortho kamera mesafesi (boyutu etkilemez)

/** [-1,1] ekseninde bir bilesenin (-1|0|+1) kapladigi aralik. */
function slot(comp: number): { min: number; max: number } {
  if (comp < 0) return { min: -1, max: -1 + BAND };
  if (comp > 0) return { min: 1 - BAND, max: 1 };
  return { min: -1 + BAND, max: 1 - BAND };
}

/** Yuz etiketi icin CanvasTexture uret — SEFFAF zemin (yuz rengi gorunur ->
 *  hover'da kirmizi yuzun ustunde koyu metin okunur), keskin tipografi. */
function makeLabelTexture(text: string): THREE.CanvasTexture {
  const s = 256; // yuksek cozunurluk -> keskin metin
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, s, s); // seffaf zemin
  ctx.fillStyle = '#475569'; // slate-600 — modern, yumusak
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { (ctx as unknown as { letterSpacing: string }).letterSpacing = '2px'; } catch { /* eski tarayici */ }
  // Metni canvas'a sigdir (BOTTOM/FRONT gibi uzun etiketler tasmasin).
  const maxW = s * 0.86;
  let fontPx = 52;
  ctx.font = `700 ${fontPx}px Inter, system-ui, sans-serif`;
  const measured = ctx.measureText(text).width;
  if (measured > maxW) {
    fontPx = Math.max(20, Math.floor((fontPx * maxW) / measured));
    ctx.font = `700 ${fontPx}px Inter, system-ui, sans-serif`;
  }
  ctx.fillText(text, s / 2, s / 2 + 3);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export class ViewCube {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly cube: THREE.Group;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly opts: ViewCubeOptions;
  private container: HTMLElement | null;

  /** Interaktif bolgeler (raycast hedefleri). */
  private readonly regions: THREE.Mesh[] = [];
  private hovered: THREE.Mesh | null = null;
  private disposables: Array<THREE.Material | THREE.BufferGeometry | THREE.Texture> = [];

  // Tik/surukleme ayrimi icin pointer down konumu.
  private downX = 0;
  private downY = 0;
  private downActive = false;

  private readonly tmpFwd = new THREE.Vector3();

  constructor(container: HTMLElement, opts: ViewCubeOptions) {
    this.container = container;
    this.opts = opts;
    const size = opts.size ?? (container.clientWidth || 112);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(size, size, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const el = this.renderer.domElement;
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.display = 'block';
    el.style.cursor = 'pointer';
    el.style.touchAction = 'none';
    // Seffaf canvas'ta yumusak golge -> kup havada suzuluyormus gibi (modern).
    el.style.filter = 'drop-shadow(0 6px 10px rgba(15, 23, 42, 0.18))';
    container.appendChild(el);

    this.scene = new THREE.Scene();

    // Ortho kamera — perspektif bozulmasi yok; boyut mesafeden bagimsiz.
    const S = 1.75;
    this.camera = new THREE.OrthographicCamera(-S, S, S, -S, 0.1, 100);
    this.camera.position.set(0, 0, ORTHO_D);
    this.camera.lookAt(0, 0, 0);

    // Isiklar: guclu ambient (etiketler her yonelimde okunur) + iki yumusak yon
    // isigi (kupe temiz, modern hacim). Kup SABIT, kamera doner -> golgeleme kararli.
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 0.45);
    key.position.set(4, 6, 5);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xdfe6f0, 0.25);
    rim.position.set(-5, -2, -4);
    this.scene.add(rim);

    this.cube = new THREE.Group();
    this.scene.add(this.cube);
    this.buildRegions();
    this.buildOutline();

    // Pointer olaylari — SADECE kup canvas'inda (ana sahneye sizmaz).
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointerleave', this.onPointerLeave);

    this.renderer.render(this.scene, this.camera);
  }

  /** 26 bolgeyi (yuz/kenar/kose) 3x3x3 yuzey bolunmesi olarak kur. */
  private buildRegions(): void {
    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        for (const dz of [-1, 0, 1]) {
          if (dx === 0 && dy === 0 && dz === 0) continue; // ic hucre yok
          const nonZero = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
          const isFace = nonZero === 1;

          const sx = slot(dx);
          const sy = slot(dy);
          const sz = slot(dz);
          const w = sx.max - sx.min - GAP;
          const h = sy.max - sy.min - GAP;
          const d = sz.max - sz.min - GAP;
          const cx = (sx.min + sx.max) / 2;
          const cy = (sy.min + sy.max) / 2;
          const cz = (sz.min + sz.max) / 2;

          const geo = new THREE.BoxGeometry(w, h, d);
          const mat = new THREE.MeshStandardMaterial({
            color: isFace ? BASE_COLOR : EDGE_COLOR,
            roughness: 0.62,
            metalness: 0.0,
          });
          this.disposables.push(geo, mat);
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(cx, cy, cz);

          // Snap yonu: geometrik yon; saf +-Y icin kucuk epsilon (top/bottom'da
          // dejenere "yukari" vektorunu onler — setViewPreset ile ayni numara).
          const viewDir = new THREE.Vector3(dx, dy, dz);
          if (dx === 0 && dz === 0) viewDir.z = dy > 0 ? 0.0015 : -0.0015;
          viewDir.normalize();
          mesh.userData = {
            viewDir,
            baseColor: (mat.color as THREE.Color).getHex(),
          };
          this.cube.add(mesh);
          this.regions.push(mesh);

          // Yuz etiketi (yalnizca 6 yuzde) — disa bakan, raycast'i engellemeyen
          // ince plane.
          if (isFace) {
            const label = FACE_LABELS[`${dx},${dy},${dz}`];
            if (label) this.addFaceLabel(dx, dy, dz, label);
          }
        }
      }
    }
  }

  private addFaceLabel(dx: number, dy: number, dz: number, text: string): void {
    const tex = makeLabelTexture(text);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const geo = new THREE.PlaneGeometry(1.2, 1.2);
    this.disposables.push(tex, mat, geo);
    const plane = new THREE.Mesh(geo, mat);
    // Yuzun biraz disina yerlestir + disa bakacak sekilde yonlendir (metin dik).
    const off = 1.02;
    plane.position.set(dx * off, dy * off, dz * off);
    if (dy > 0) plane.rotation.x = -Math.PI / 2; // TOP
    else if (dy < 0) plane.rotation.x = Math.PI / 2; // BOTTOM
    else if (dz > 0) {/* FRONT — varsayilan +Z */}
    else if (dz < 0) plane.rotation.y = Math.PI; // BACK
    else if (dx > 0) plane.rotation.y = Math.PI / 2; // RIGHT
    else if (dx < 0) plane.rotation.y = -Math.PI / 2; // LEFT
    // Etiket ray'i engellemesin — yalnizca alttaki kutu secilir.
    plane.raycast = () => {};
    this.cube.add(plane);
  }

  /** Kupu tanimlayan hafif dis tel cerceve. */
  private buildOutline(): void {
    const box = new THREE.BoxGeometry(2, 2, 2);
    const edges = new THREE.EdgesGeometry(box);
    const mat = new THREE.LineBasicMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.35 });
    this.disposables.push(box, edges, mat);
    const lines = new THREE.LineSegments(edges, mat);
    lines.raycast = () => {};
    this.cube.add(lines);
  }

  /**
   * Kup yonelimini ana kameraya birebir esle + render et. Her karede cagrilir.
   * Ana kameranin quaternion'i kopyalanir (kutup dejenerasyonu yok), kup kamerasi
   * gorus yonu boyunca sabit ortho mesafeye konur.
   */
  sync(mainCamera: THREE.Camera): void {
    mainCamera.getWorldDirection(this.tmpFwd).normalize();
    this.camera.quaternion.copy(mainCamera.quaternion);
    this.camera.position.copy(this.tmpFwd).multiplyScalar(-ORTHO_D);
    this.camera.updateMatrixWorld();
    this.renderer.render(this.scene, this.camera);
  }

  // -- Pointer -------------------------------------------------------------
  private setNDC(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pick(): THREE.Mesh | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.regions, false);
    return hits.length ? (hits[0].object as THREE.Mesh) : null;
  }

  private setHover(mesh: THREE.Mesh | null): void {
    if (mesh === this.hovered) return;
    if (this.hovered) {
      const m = this.hovered.material as THREE.MeshStandardMaterial;
      m.color.setHex(this.hovered.userData.baseColor as number);
      m.emissive.setHex(0x000000);
    }
    this.hovered = mesh;
    if (mesh) {
      const m = mesh.material as THREE.MeshStandardMaterial;
      m.color.setHex(HOVER_COLOR);
      m.emissive.setHex(HOVER_EMISSIVE);
    }
  }

  private onPointerMove = (e: PointerEvent): void => {
    this.setNDC(e);
    this.setHover(this.pick());
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.downActive = true;
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.downActive || e.button !== 0) return;
    this.downActive = false;
    // Tik mi surukleme mi (kucuk kayma -> tik).
    if (Math.abs(e.clientX - this.downX) > 4 || Math.abs(e.clientY - this.downY) > 4) return;
    this.setNDC(e);
    const hit = this.pick();
    if (hit) this.opts.onView((hit.userData.viewDir as THREE.Vector3).clone());
  };

  private onPointerLeave = (): void => {
    this.setHover(null);
    this.downActive = false;
  };

  dispose(): void {
    const el = this.renderer.domElement;
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    for (const disp of this.disposables) disp.dispose();
    this.disposables = [];
    this.renderer.dispose();
    if (this.container && el.parentNode === this.container) {
      this.container.removeChild(el);
    }
    this.container = null;
  }
}
