import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface Product3DCardProps {
  modelUrl: string;
  eyebrow: string;
  title: string;
  description: string;
  accent?: string;
  cta?: string;
  onCtaClick?: () => void;
}

/**
 * Single inspectable 3D card.
 * - Lazy-mounts canvas via IntersectionObserver
 * - Drag-to-rotate, auto-rotate when idle
 * - Pauses render when off-screen / tab hidden
 */
export default function Product3DCard({
  modelUrl,
  eyebrow,
  title,
  description,
  accent = '#DC2626',
  cta,
  onCtaClick,
}: Product3DCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Lazy mount when card enters viewport.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setMounted(true);
          obs.disconnect();
        }
      },
      { rootMargin: '300px' }
    );
    obs.observe(wrap);
    return () => obs.disconnect();
  }, []);

  // Three.js scene
  useEffect(() => {
    if (!mounted) return;
    const host = hostRef.current;
    if (!host) return;

    let w = host.clientWidth || 320;
    let h = host.clientHeight || 256;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(0, 0.4, 5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    // Lights — bright studio so models read clearly on dark card background
    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 4, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc8d8ff, 1.1);
    fill.position.set(-4, 1, 2);
    scene.add(fill);
    const top = new THREE.DirectionalLight(0xffffff, 0.9);
    top.position.set(0, 6, 0);
    scene.add(top);
    const accentColor = new THREE.Color(accent);
    const rim = new THREE.PointLight(accentColor, 2.4, 14);
    rim.position.set(-2, -1.2, -2.5);
    scene.add(rim);

    // Pivot — model spins around this; user dragging adjusts pivot rotation
    const pivot = new THREE.Group();
    scene.add(pivot);

    // Floor disc — subtle reflection ground
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 64),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.18,
      })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -1.1;
    scene.add(disc);

    // Loading
    const loader = new GLTFLoader();
    let cancelled = false;
    let model: THREE.Object3D | null = null;

    loader.load(
      modelUrl,
      (g) => {
        if (cancelled) return;
        model = g.scene;

        // Center & scale model into a unit-ish box.
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 2.2 / maxDim;
        model.position.sub(center.multiplyScalar(scale));
        model.scale.setScalar(scale);

        model.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            const m = o as THREE.Mesh;
            const mat = m.material as THREE.MeshStandardMaterial;
            if (mat && 'metalness' in mat) {
              mat.metalness = Math.min(1, (mat.metalness ?? 0.3) + 0.15);
              mat.roughness = Math.max(0.2, (mat.roughness ?? 0.6) - 0.05);
            }
          }
        });

        pivot.add(model);
        setIsLoading(false);
      },
      undefined,
      () => {
        if (!cancelled) setIsLoading(false);
      }
    );

    // Interaction state
    const ROT = { x: 0.18, y: 0 };
    const TARGET_ROT = { x: 0.18, y: 0 };
    let dragging = false;
    let dragStart = { x: 0, y: 0 };
    let rotStart = { x: 0, y: 0 };
    let isHovered = false;
    let lastUserActivity = performance.now();

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
      rotStart = { x: TARGET_ROT.x, y: TARGET_ROT.y };
      lastUserActivity = performance.now();
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      TARGET_ROT.y = rotStart.y + dx * 0.012;
      TARGET_ROT.x = Math.max(-0.7, Math.min(1.0, rotStart.x + dy * 0.008));
      lastUserActivity = performance.now();
    };
    const onPointerUp = (e: PointerEvent) => {
      dragging = false;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onEnter = () => {
      isHovered = true;
      lastUserActivity = performance.now();
    };
    const onLeave = () => {
      isHovered = false;
      dragging = false;
    };
    const onDoubleClick = () => {
      TARGET_ROT.x = 0.18;
      TARGET_ROT.y = 0;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);
    renderer.domElement.addEventListener('pointerenter', onEnter);
    renderer.domElement.addEventListener('pointerleave', onLeave);
    renderer.domElement.addEventListener('dblclick', onDoubleClick);

    // Resize
    const onResize = () => {
      w = host.clientWidth;
      h = host.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    // Visibility
    let isVisible = true;
    const visObs = new IntersectionObserver(
      (entries) => entries.forEach((e) => (isVisible = e.isIntersecting)),
      { threshold: 0.05 }
    );
    visObs.observe(host);

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!isVisible || document.hidden) return;

      const t = clock.getElapsedTime();
      const idleFor = performance.now() - lastUserActivity;
      // Auto-rotate when not interacting for >900ms
      if (!dragging && idleFor > 900) {
        TARGET_ROT.y += 0.0035;
      }

      // Lerp current rotation toward target
      ROT.x += (TARGET_ROT.x - ROT.x) * 0.12;
      ROT.y += (TARGET_ROT.y - ROT.y) * 0.12;
      pivot.rotation.x = ROT.x;
      pivot.rotation.y = ROT.y;

      // Subtle hover float
      if (model) model.position.y = Math.sin(t * 0.8) * 0.04;

      // Light dance on hover
      const targetIntensity = isHovered ? 1.9 : 1.4;
      rim.intensity += (targetIntensity - rim.intensity) * 0.08;

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      visObs.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('pointerenter', onEnter);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      renderer.domElement.removeEventListener('dblclick', onDoubleClick);
      scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
          else m.material?.dispose();
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [mounted, modelUrl, accent]);

  return (
    <div
      ref={wrapRef}
      className="group relative bg-[#1a1a1f] border border-white/10 rounded-3xl overflow-hidden hover:border-white/25 transition-colors"
      style={{ boxShadow: '0 30px 60px -24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset' }}
    >
      <div className="relative h-72 sm:h-80 bg-gradient-to-br from-[#2a2a30] via-[#1a1a1f] to-[#0f0f12] overflow-hidden">
        <div ref={hostRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
        {/* Loading shimmer */}
        {isLoading && mounted && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-8 h-8 rounded-full border-2 border-white/15"
              style={{ borderTopColor: accent, animation: 'appspin 0.9s linear infinite' }}
            />
          </div>
        )}
        {/* Drag hint */}
        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-[9px] tracking-[0.3em] uppercase text-white/30 font-bold pointer-events-none">
          <span
            className="inline-block w-1 h-1 rounded-full"
            style={{ background: accent }}
          />
          Sürükleyerek inceleyin
        </div>
        {/* Top eyebrow */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: accent }}>
            {eyebrow}
          </span>
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/25">3D</span>
        </div>
      </div>

      <div className="p-7">
        <h3 className="font-display font-bold text-2xl text-white tracking-tight leading-tight mb-3">
          {title}
        </h3>
        <p className="text-white/55 text-sm leading-relaxed mb-5">{description}</p>
        {cta && (
          <button
            onClick={onCtaClick}
            className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.18em] uppercase text-white/85 hover:text-white transition-colors"
          >
            <span className="underline-magnetic">{cta}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:translate-x-1">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
