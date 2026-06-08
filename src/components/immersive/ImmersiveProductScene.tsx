import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const mixerModel = new URL(
  '../../../gastro resimler/Meshy_AI_CombiSteel_Upright_Fr_0605150158_texture.glb',
  import.meta.url
).href;
const mechanismModel = new URL(
  '../../../gastro resimler/Meshy_AI_Exploded_Assembly_Vie_0605141814_texture.glb',
  import.meta.url
).href;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

type TrackedMesh = {
  mesh: THREE.Mesh;
  base: THREE.Vector3;
  direction: THREE.Vector3;
  strength: number;
};

const PHASES = [
  {
    eyebrow: '01 — Dış gövde',
    title: 'Spiral mikser sahneye girer.',
    body: 'Kazan, güvenlik kafesi ve ana gövde tek parça ürün algısıyla okunur.',
  },
  {
    eyebrow: '02 — Gövde açılır',
    title: 'Dış kabuk geri çekilir.',
    body: 'Mekanizma modeli öne gelmeye başlar; gövde yarı şeffaf bir referans katmanına dönüşür.',
  },
  {
    eyebrow: '03 — Güç aktarımı',
    title: 'Motor ve redüktör ayrışır.',
    body: 'İç bileşenler kendi eksenlerine doğru açılır ve teknik yapı görünür hale gelir.',
  },
  {
    eyebrow: '04 — Patlatılmış görünüm',
    title: 'Parçalar teknik düzende dağılır.',
    body: 'Bakım, servis ve satış sunumları için cihazın iç mimarisi anlaşılır bir 3D kompozisyona dönüşür.',
  },
];

function cloneMaterials(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    const mesh = object as THREE.Mesh;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const cloned = materials.map((material) => {
      const next = material.clone();
      next.transparent = true;
      next.depthWrite = true;
      return next;
    });
    mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
  });
}

function collectMaterials(root: THREE.Object3D): THREE.Material[] {
  const materials: THREE.Material[] = [];
  root.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    const mesh = object as THREE.Mesh;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    list.forEach((material) => materials.push(material));
  });
  return materials;
}

function setMaterialOpacity(materials: THREE.Material[], opacity: number) {
  materials.forEach((material) => {
    material.transparent = opacity < 0.98;
    material.opacity = opacity;
    material.depthWrite = opacity > 0.32;
  });
}

function fitModel(root: THREE.Object3D, targetSize: number) {
  const box = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -center.y * scale - 0.08, -center.z * scale);
}

function collectMechanismMeshes(root: THREE.Object3D): TrackedMesh[] {
  const meshes: TrackedMesh[] = [];
  root.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh) return;
    const mesh = object as THREE.Mesh;
    const base = mesh.position.clone();
    const direction = base.clone();

    if (direction.lengthSq() < 0.003) {
      direction.set(
        Math.sin(mesh.id * 12.9898),
        Math.cos(mesh.id * 78.233) * 0.52,
        Math.sin(mesh.id * 37.719)
      );
    }
    direction.normalize();

    meshes.push({
      mesh,
      base,
      direction,
      strength: 0.1 + ((mesh.id % 11) / 11) * 0.34,
    });
  });
  return meshes;
}

export default function ImmersiveProductScene() {
  const wrapRef = useRef<HTMLElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef(0);
  const [activePhase, setActivePhase] = useState(0);
  const [webglFailed, setWebglFailed] = useState(false);
  const [shouldSkip3D, setShouldSkip3D] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        window.dispatchEvent(new CustomEvent('bg3d:set', { detail: !entry.isIntersecting }));
      },
      { rootMargin: '200px', threshold: 0.01 }
    );
    observer.observe(wrap);
    return () => {
      observer.disconnect();
      window.dispatchEvent(new CustomEvent('bg3d:set', { detail: true }));
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const lowMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (reducedMotion || (typeof lowMemory === 'number' && lowMemory <= 3)) {
      setShouldSkip3D(true);
    }
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const host = hostRef.current;
    if (!wrap || !host || webglFailed || shouldSkip3D) return;

    let width = host.clientWidth || window.innerWidth;
    let height = host.clientHeight || window.innerHeight;
    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
      });
    } catch (error) {
      console.warn('ImmersiveProductScene disabled: WebGL renderer could not be created.', error);
      setWebglFailed(true);
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0b1524, 0.032);

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(0, 0.72, 6.2);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.45));
    renderer.setSize(width, height);
    renderer.setClearColor(0x0b1524, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    host.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.06));
    const key = new THREE.DirectionalLight(0xffffff, 2.9);
    key.position.set(4.2, 5.5, 4.8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbfd7ff, 1.3);
    fill.position.set(-5, 2.2, 2.8);
    scene.add(fill);
    const redRim = new THREE.PointLight(0xdc2626, 3.4, 18);
    redRim.position.set(-2.8, -1.2, 3.2);
    scene.add(redRim);
    const blueRim = new THREE.PointLight(0x38bdf8, 2.4, 18);
    blueRim.position.set(3.2, 1.5, -2.8);
    scene.add(blueRim);

    const stage = new THREE.Group();
    const normalGroup = new THREE.Group();
    const mechanismGroup = new THREE.Group();
    stage.add(normalGroup, mechanismGroup);
    scene.add(stage);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.85, 96),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.24 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.18;
    scene.add(floor);

    const grid = new THREE.GridHelper(6.8, 24, 0xdc2626, 0x334155);
    grid.position.y = -1.17;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.24;
    scene.add(grid);

    const loader = new GLTFLoader();
    let cancelled = false;
    let normalMaterials: THREE.Material[] = [];
    let mechanismMaterials: THREE.Material[] = [];
    let mechanismMeshes: TrackedMesh[] = [];
    let lastNormalOpacity = -1;
    let lastMechanismOpacity = -1;

    loader.load(
      mixerModel,
      (gltf) => {
        if (cancelled) return;
        const root = gltf.scene;
        cloneMaterials(root);
        fitModel(root, 2.7);
        normalMaterials = collectMaterials(root);
        normalGroup.add(root);
        setMaterialOpacity(normalMaterials, 1);
      },
      undefined,
      (error) => console.warn('Mixer model could not be loaded.', error)
    );

    loader.load(
      mechanismModel,
      (gltf) => {
        if (cancelled) return;
        const root = gltf.scene;
        cloneMaterials(root);
        fitModel(root, 2.95);
        mechanismMaterials = collectMaterials(root);
        mechanismMeshes = collectMechanismMeshes(root);
        mechanismGroup.add(root);
        setMaterialOpacity(mechanismMaterials, 0);
      },
      undefined,
      (error) => console.warn('Mechanism model could not be loaded.', error)
    );

    const updateProgress = () => {
      const rect = wrap.getBoundingClientRect();
      const max = Math.max(1, rect.height - window.innerHeight);
      const progress = clamp(-rect.top / max);
      progressRef.current = progress;
      const nextPhase = Math.min(PHASES.length - 1, Math.floor(progress * PHASES.length));
      setActivePhase((current) => (current === nextPhase ? current : nextPhase));
    };

    const onResize = () => {
      width = host.clientWidth || window.innerWidth;
      height = host.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      updateProgress();
    };
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    let isVisible = true;
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { rootMargin: '200px', threshold: 0.01 }
    );
    visibilityObserver.observe(wrap);

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || !isVisible) return;

      const time = clock.getElapsedTime();
      const progress = progressRef.current;
      const reveal = smoothstep(0.1, 0.82, progress);
      const spread = smoothstep(0.28, 1, progress);

      stage.rotation.x = 0.12 + Math.sin(reveal * Math.PI) * 0.2;
      stage.rotation.y = -0.55 + progress * Math.PI * 1.75 + time * 0.035;
      stage.rotation.z = -0.04 + reveal * 0.1;
      stage.position.y = Math.sin(time * 0.55) * 0.035;

      normalGroup.position.x = -0.62 * reveal;
      normalGroup.rotation.z = -0.08 * reveal;
      normalGroup.scale.setScalar(1 - reveal * 0.065);
      const normalOpacity = 1 - smoothstep(0.08, 0.74, progress);
      normalGroup.visible = normalOpacity > 0.015;
      if (Math.abs(normalOpacity - lastNormalOpacity) > 0.004) {
        setMaterialOpacity(normalMaterials, normalOpacity);
        lastNormalOpacity = normalOpacity;
      }

      mechanismGroup.position.x = 0.42 * (1 - reveal);
      mechanismGroup.rotation.z = 0.035 * reveal;
      mechanismGroup.scale.setScalar(0.86 + reveal * 0.18);
      if (Math.abs(reveal - lastMechanismOpacity) > 0.004) {
        setMaterialOpacity(mechanismMaterials, reveal);
        lastMechanismOpacity = reveal;
      }

      mechanismMeshes.forEach(({ mesh, base, direction, strength }) => {
        mesh.position.copy(base).addScaledVector(direction, spread * strength);
      });

      camera.position.x += ((reveal - 0.5) * 0.62 - camera.position.x) * 0.035;
      camera.position.y += (0.72 + Math.sin(progress * Math.PI) * 0.18 - camera.position.y) * 0.035;
      camera.position.z += (6.25 - reveal * 1.18 - camera.position.z) * 0.035;
      camera.lookAt(0, 0, 0);

      redRim.intensity = 2.1 + reveal * 1.8 + Math.sin(time * 0.85) * 0.32;
      blueRim.intensity = 1.4 + reveal * 1.4;
      floor.scale.setScalar(1 + reveal * 0.08);

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', updateProgress);
      visibilityObserver.disconnect();

      scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          const mesh = object as THREE.Mesh;
          mesh.geometry?.dispose();
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((material) => material?.dispose());
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      scene.clear();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [shouldSkip3D, webglFailed]);

  const active = PHASES[activePhase] ?? PHASES[0];

  return (
    <section
      ref={wrapRef}
      className="relative w-full bg-[#0B1524] text-white"
      style={{ height: '360vh' }}
    >
      <div className="sticky top-0 min-h-screen overflow-hidden">
        <div ref={hostRef} className="absolute inset-0" />

        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:62px_62px]" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(120deg,rgba(220,38,38,0.18),transparent_26%,transparent_66%,rgba(56,189,248,0.11)),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_44%,rgba(0,0,0,0.34))]" />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(11,21,36,0.58)_100%)]" />

        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-[0.62fr_1.38fr]">
            <div className="relative z-10 max-w-xl">
              <span className="block text-xs font-bold uppercase tracking-[0.3em] text-red-300">
                {active.eyebrow}
              </span>
              <h3 className="mt-6 text-4xl font-display font-bold leading-[0.98] tracking-tight text-white md:text-7xl">
                {active.title}
              </h3>
              <p className="mt-7 text-base leading-7 text-white/68 md:text-lg">{active.body}</p>
              <div className="mt-9 h-px w-full max-w-sm overflow-hidden bg-white/10">
                <div
                  className="h-full bg-gradient-to-r from-red-400 to-sky-300 transition-[width] duration-300"
                  style={{ width: `${((activePhase + 1) / PHASES.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {(webglFailed || shouldSkip3D) && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
            <p className="max-w-md text-sm font-semibold text-white/70">3D sahne bu cihazda sade moda alındı.</p>
          </div>
        )}
      </div>
    </section>
  );
}
