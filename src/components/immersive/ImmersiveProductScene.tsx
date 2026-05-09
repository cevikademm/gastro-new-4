import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Cinematic phase-by-phase 3D scene.
 *
 * The page is fully scroll-locked while the section is in view. Every wheel
 * tick / swipe / arrow key advances exactly ONE phase (with a cooldown so
 * fast scrolling can't skip phases). Each phase fades in smoothly. After the
 * last phase, scrolling forward releases the lock and the page resumes
 * naturally. Same in reverse.
 */

interface Phase {
  eyebrow: string;
  title: string;
  body: string;
}

const DEFAULT_PHASES: Phase[] = [
  {
    eyebrow: '01 — Vizyon',
    title: 'Endüstriyel mutfak, sinematik bir deneyim.',
    body:
      'Profesyonel ekipmanları üç boyutlu olarak keşfedin. Her detay, her materyal, her ışık — tek bir akıcı sahnede.',
  },
  {
    eyebrow: '02 — Materyal',
    title: 'Saf paslanmaz çelik. Camlaşmış cam. Mat polimer.',
    body:
      'Premium markaların gerçekçi materyallerini fiziksel tabanlı render ile masanızda görün. Yansımalar gerçek — kararınız net.',
  },
  {
    eyebrow: '03 — Hassasiyet',
    title: 'Milimetrik hesap. Avrupa standardı.',
    body:
      'Her ürün, kurduğumuz dijital mutfakta birebir ölçeğiyle yaşar. Yerleşim, akış, sirkülasyon — hepsi sahne içinde.',
  },
  {
    eyebrow: '04 — Ortaklık',
    title: 'Satıştan sonra da yanınızdayız.',
    body:
      "15 ülkede kurulum, eğitim ve servis ağı. 2MC Gastro, Avrupa'nın profesyonel mutfak partneri.",
  },
];

const MODEL_URLS = [
  '/models/PSB-202MI-2V.glb',
  '/models/Meshy_AI_Commercial_Planetary__0411175135_texture.glb',
  '/models/Meshy_AI_ddd_0411175109_texture.glb',
  '/models/Meshy_AI_Rainbow_Bottles_in_a__0411175104_texture.glb',
];

export default function ImmersiveProductScene() {
  const [hasActivated, setHasActivated] = useState(false);
  const [phases] = useState(DEFAULT_PHASES);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const phaseRefs = useRef<HTMLDivElement[]>([]);
  const progressBarRef = useRef<HTMLDivElement>(null);
  // Active phase index 0..phases.length-1; smoothed for animation reads from this.
  const targetIndexRef = useRef(0);

  // Activation observer — also pauses Background3D while section is in view.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHasActivated(true);
        window.dispatchEvent(new CustomEvent('bg3d:set', { detail: !entry.isIntersecting }));
      },
      { rootMargin: '600px', threshold: 0.01 }
    );
    obs.observe(wrap);
    return () => {
      obs.disconnect();
      window.dispatchEvent(new CustomEvent('bg3d:set', { detail: true }));
    };
  }, []);

  // Phase-by-phase scroll lock — overflow:hidden lock + animated entry.
  useEffect(() => {
    if (!hasActivated) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    const PHASE_COUNT = phases.length;
    const COOLDOWN_MS = 800;
    const WHEEL_THRESHOLD = 30;
    const TOUCH_THRESHOLD = 50;
    const ENTRY_ANIM_MS = 850; // slow, cinematic entry
    const EXIT_ANIM_MS = 700;

    let locked = false;
    let pendingEntry = false; // animating into the section
    let savedScroll = 0;
    let cooldownUntil = 0;
    let engageBlockedUntil = 0;
    let wheelAccum = 0;
    let wheelLastTime = 0;
    let touchStartY = 0;
    let touchAccum = 0;
    let cameFromAbove = true;
    let scrollAnimRaf = 0;

    const cancelScrollAnim = () => {
      if (scrollAnimRaf) {
        cancelAnimationFrame(scrollAnimRaf);
        scrollAnimRaf = 0;
      }
    };

    // Custom eased scroll — slow, controlled, never gets fought by browser.
    const animateScrollTo = (target: number, duration: number, onDone?: () => void) => {
      cancelScrollAnim();
      const start = window.scrollY;
      const dist = target - start;
      if (Math.abs(dist) < 1) {
        onDone?.();
        return;
      }
      const startTime = performance.now();
      const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
      const step = () => {
        const elapsed = performance.now() - startTime;
        const t = Math.min(1, elapsed / duration);
        window.scrollTo(0, start + dist * ease(t));
        if (t < 1) {
          scrollAnimRaf = requestAnimationFrame(step);
        } else {
          scrollAnimRaf = 0;
          onDone?.();
        }
      };
      scrollAnimRaf = requestAnimationFrame(step);
    };

    const lockOverflow = () => {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    };
    const unlockOverflow = () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };

    const fire = (dir: 1 | -1) => {
      const cur = targetIndexRef.current;
      // Forward exit after last phase.
      if (cur >= PHASE_COUNT - 1 && dir > 0) {
        const target = savedScroll + window.innerHeight + 8;
        // Release lock immediately so animation runs against natural scroll.
        locked = false;
        engageBlockedUntil = performance.now() + 1000;
        unlockOverflow();
        cameFromAbove = false;
        wheelAccum = 0;
        touchAccum = 0;
        animateScrollTo(target, EXIT_ANIM_MS);
        return;
      }
      // Backward exit before first phase.
      if (cur <= 0 && dir < 0) {
        const target = Math.max(0, savedScroll - window.innerHeight - 8);
        locked = false;
        engageBlockedUntil = performance.now() + 1000;
        unlockOverflow();
        cameFromAbove = true;
        wheelAccum = 0;
        touchAccum = 0;
        animateScrollTo(target, EXIT_ANIM_MS);
        return;
      }
      targetIndexRef.current = Math.max(0, Math.min(PHASE_COUNT - 1, cur + dir));
      cooldownUntil = performance.now() + COOLDOWN_MS;
      wheelAccum = 0;
      touchAccum = 0;
    };

    const startEntry = (snapTo: number) => {
      if (locked || pendingEntry) return;
      if (performance.now() < engageBlockedUntil) return;

      pendingEntry = true;
      // Lock overflow immediately so user can't keep scrolling during entry anim.
      lockOverflow();
      // Initialize phase based on entry direction BEFORE animation so the
      // 3D scene renders the right phase as the camera flies in.
      targetIndexRef.current = cameFromAbove ? 0 : PHASE_COUNT - 1;
      animateScrollTo(snapTo, ENTRY_ANIM_MS, () => {
        pendingEntry = false;
        // Now hard-lock at exact position.
        locked = true;
        savedScroll = snapTo;
        window.scrollTo(0, snapTo);
      });
    };

    const onWheel = (e: WheelEvent) => {
      if (pendingEntry) {
        e.preventDefault();
        return;
      }
      if (!locked) return;
      e.preventDefault();
      const now = performance.now();
      if (now < cooldownUntil) return;

      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if (now - wheelLastTime > 180) wheelAccum = 0;
      wheelLastTime = now;
      wheelAccum += dy;

      if (Math.abs(wheelAccum) >= WHEEL_THRESHOLD) {
        fire(wheelAccum > 0 ? 1 : -1);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? 0;
      touchAccum = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (pendingEntry) {
        e.preventDefault();
        return;
      }
      if (!locked) return;
      e.preventDefault();
      const now = performance.now();
      if (now < cooldownUntil) return;

      const y = e.touches[0]?.clientY ?? touchStartY;
      const dy = touchStartY - y;
      touchStartY = y;
      touchAccum += dy;

      if (Math.abs(touchAccum) >= TOUCH_THRESHOLD) {
        fire(touchAccum > 0 ? 1 : -1);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const navKeys = ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' '];
      if (pendingEntry) {
        if (navKeys.includes(e.key)) e.preventDefault();
        return;
      }
      if (!locked) return;
      if (!navKeys.includes(e.key)) return;
      e.preventDefault();
      const now = performance.now();
      if (now < cooldownUntil) return;
      const dir: 1 | -1 = e.key === 'ArrowUp' || e.key === 'PageUp' ? -1 : 1;
      fire(dir);
    };

    const onScroll = () => {
      if (locked || pendingEntry) return;
      const r = wrap.getBoundingClientRect();
      if (r.top > window.innerHeight) cameFromAbove = true;
      else if (r.bottom < 0) cameFromAbove = false;
    };

    const engagementObs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (
            entry.intersectionRatio >= 0.4 &&
            !locked &&
            !pendingEntry &&
            performance.now() > engageBlockedUntil
          ) {
            const r = wrap.getBoundingClientRect();
            const targetScroll = Math.max(0, window.scrollY + r.top);
            startEntry(targetScroll);
          }
        }
      },
      { threshold: [0, 0.2, 0.4, 0.6, 0.85, 1] }
    );
    engagementObs.observe(wrap);

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKey, { passive: false });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      cancelScrollAnim();
      if (locked || pendingEntry) {
        locked = false;
        pendingEntry = false;
        unlockOverflow();
      }
      engagementObs.disconnect();
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
    };
  }, [hasActivated, phases.length]);

  // Three.js scene
  useEffect(() => {
    if (!hasActivated) return;

    const wrap = wrapRef.current;
    const host = canvasHostRef.current;
    if (!wrap || !host) return;

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const PHASE_COUNT = phases.length;

    let w = host.clientWidth || window.innerWidth;
    let h = host.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0e0e10, 0.04);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    camera.position.set(0, 0, 14);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w, h);
    renderer.setClearColor(0x0e0e10, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const key = new THREE.DirectionalLight(0xffd9b5, 2.4);
    key.position.set(6, 6, 10);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x6088ff, 1.6);
    rim.position.set(-6, -3, -8);
    scene.add(rim);
    const accent = new THREE.PointLight(0xdc2626, 2.0, 30);
    accent.position.set(0, -2, 5);
    scene.add(accent);

    const group = new THREE.Group();
    scene.add(group);

    interface Prop {
      object: THREE.Object3D;
      baseRot: THREE.Euler;
      basePos: THREE.Vector3;
    }
    const props: Prop[] = [];

    const positions: [number, number, number, number][] = [
      [-3.2, 0.4, 6, 1.5],
      [3.6, -0.8, 0, 1.7],
      [-4.2, 1.6, -8, 1.8],
      [4.0, -1.6, -16, 1.7],
      [-2.6, -0.8, -24, 1.9],
      [3.2, 1.6, -32, 1.7],
      [-4.6, 0.2, -40, 2.0],
      [2.8, -1.8, -48, 1.8],
    ];

    const loader = new GLTFLoader();
    let cancelled = false;
    const loadedScenes: THREE.Group[] = [];

    Promise.all(
      MODEL_URLS.map(
        (url) =>
          new Promise<THREE.Group | null>((resolve) => {
            loader.load(
              url,
              (g) => resolve(g.scene),
              undefined,
              () => resolve(null)
            );
          })
      )
    ).then((scenes) => {
      if (cancelled) return;
      const valid = scenes.filter(Boolean) as THREE.Group[];
      if (valid.length === 0) return;
      valid.forEach((s) => loadedScenes.push(s));

      positions.forEach(([x, y, z, s], i) => {
        const source = loadedScenes[i % loadedScenes.length];
        const inst = source.clone(true);
        inst.traverse((o: THREE.Object3D) => {
          if ((o as THREE.Mesh).isMesh) {
            const m = o as THREE.Mesh;
            m.castShadow = false;
            m.receiveShadow = false;
            const mat = m.material as THREE.MeshStandardMaterial;
            if (mat && 'metalness' in mat) {
              mat.metalness = Math.min(1, (mat.metalness ?? 0.3) + 0.2);
              mat.roughness = Math.max(0.18, (mat.roughness ?? 0.6) - 0.1);
              mat.envMapIntensity = 1.15;
            }
          }
        });
        inst.position.set(x, y, z);
        inst.scale.setScalar(s);
        inst.rotation.set(Math.random() * 0.4, Math.random() * Math.PI * 2, 0);
        group.add(inst);
        props.push({
          object: inst,
          baseRot: inst.rotation.clone(),
          basePos: inst.position.clone(),
        });
      });
    });

    const PCOUNT = 60;
    const pPos = new Float32Array(PCOUNT * 3);
    for (let i = 0; i < PCOUNT; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 60;
      pPos[i * 3 + 1] = (Math.random() - 0.5) * 28;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 100 - 30;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xef4444,
      size: 0.07,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    const camCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.5, 16),
      new THREE.Vector3(-1.2, 1.0, 4),
      new THREE.Vector3(1.4, -0.6, -10),
      new THREE.Vector3(-1.0, 0.6, -24),
      new THREE.Vector3(0.5, -0.2, -38),
      new THREE.Vector3(0, 0, -52),
    ]);

    let smoothed = 0;

    const updatePhases = (value: number) => {
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${value})`;
      }
      const n = PHASE_COUNT;
      phaseRefs.current.forEach((el, i) => {
        if (!el) return;
        const center = (i + 0.5) / n;
        const dist = Math.abs(value - center);
        const half = 0.5 / n;
        const holdRange = half * 0.55;
        const fadeRange = half * 0.6;
        let opacity = 1;
        if (dist > holdRange) {
          opacity = Math.max(0, 1 - (dist - holdRange) / fadeRange);
        }
        el.style.opacity = String(opacity);
        el.style.transform = `translate3d(0, ${(1 - opacity) * 28}px, 0)`;
        el.style.pointerEvents = opacity > 0.6 ? 'auto' : 'none';
      });
    };

    const onResize = () => {
      w = host.clientWidth;
      h = host.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    let isVisible = true;
    const visObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (isVisible = e.isIntersecting));
      },
      { threshold: 0.01 }
    );
    visObs.observe(wrap);

    const clock = new THREE.Clock();
    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!isVisible) return;

      const t = clock.getElapsedTime();
      // Target = center of current phase, smoothed into.
      const targetU = (targetIndexRef.current + 0.5) / PHASE_COUNT;
      smoothed += (targetU - smoothed) * (reduceMotion ? 1 : 0.06);

      const u = Math.max(0, Math.min(1, smoothed));
      updatePhases(u);

      const camPos = camCurve.getPointAt(u);
      camera.position.lerp(camPos, 0.1);
      camera.lookAt(0, 0, camPos.z - 5);

      props.forEach((p, i) => {
        p.object.rotation.x = p.baseRot.x + t * 0.07 + Math.sin(i) * 0.4;
        p.object.rotation.y = p.baseRot.y + t * 0.16;
        p.object.position.y = p.basePos.y + Math.sin(t * 0.5 + i) * 0.18;
      });

      points.rotation.y = t * 0.012;
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      visObs.disconnect();

      scene.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) {
          const m = object as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
          else m.material?.dispose();
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      scene.clear();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [hasActivated, phases.length]);

  return (
    <section
      ref={wrapRef}
      className="relative bg-[#0e0e10] w-full overflow-hidden"
      style={{ height: '100vh' }}
    >
      <div ref={canvasHostRef} className="absolute inset-0" />

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.55)_100%)]" />

      {/* Phase content */}
      <div className="absolute inset-0 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full relative h-[60vh]">
          {phases.map((p, i) => (
            <div
              key={i}
              ref={(el) => {
                if (el) phaseRefs.current[i] = el;
              }}
              className="absolute inset-0 flex flex-col justify-center opacity-0 will-change-[opacity,transform] pointer-events-none"
              style={{ transition: 'opacity 0.35s ease-out' }}
            >
              <div className="max-w-2xl">
                <span className="text-brand-red font-bold text-xs tracking-[0.3em] uppercase block mb-6">
                  {p.eyebrow}
                </span>
                <h3 className="text-4xl md:text-7xl font-display font-bold text-white leading-[0.95] mb-8 uppercase tracking-tighter">
                  {p.title}
                </h3>
                <p className="text-lg text-white/65 leading-relaxed max-w-lg">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phase indicator dots */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-3 pointer-events-none z-10">
        {phases.map((_, i) => (
          <PhaseDot key={i} index={i} count={phases.length} progressBarRef={progressBarRef} />
        ))}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5 pointer-events-none">
        <div
          ref={progressBarRef}
          className="h-full bg-brand-red origin-left"
          style={{ transform: 'scaleX(0)', transition: 'transform 0.1s linear' }}
        />
      </div>

      {/* Hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2">
        <div className="text-[9px] font-bold text-white/35 tracking-[0.4em] uppercase">
          KAYDIRMAYA DEVAM EDİN
        </div>
        <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent animate-pulse" />
      </div>

      {/* Overlay label */}
      <div className="absolute bottom-10 left-10 hidden md:block pointer-events-none">
        <div className="flex items-center gap-4 text-[9px] font-bold text-white/30 uppercase tracking-[0.3em]">
          <div className="w-12 h-px bg-white/20" />
          CINEMATIC 3D EXPLORATION
        </div>
      </div>
    </section>
  );
}

function PhaseDot({
  index,
  count,
  progressBarRef,
}: {
  index: number;
  count: number;
  progressBarRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const bar = progressBarRef.current;
      if (!bar || !ref.current) return;
      const t = bar.style.transform.match(/scaleX\(([\d.]+)\)/);
      const p = t ? parseFloat(t[1]) : 0;
      const center = (index + 0.5) / count;
      const dist = Math.abs(p - center);
      const half = 0.5 / count;
      const active = dist < half * 0.85;
      ref.current.style.opacity = active ? '1' : '0.3';
      ref.current.style.transform = active ? 'scale(1.2)' : 'scale(1)';
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [index, count, progressBarRef]);
  return (
    <div
      ref={ref}
      className="w-1.5 h-1.5 rounded-full bg-brand-red transition-all duration-300"
      style={{ opacity: 0.3 }}
    />
  );
}
