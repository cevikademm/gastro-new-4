import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Scroll-driven cinematic 3D scene - OPTIMIZED MASTER EDITION.
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
      '15 ülkede kurulum, eğitim ve servis ağı. 2MC Gastro, Avrupa\'nın profesyonel mutfak partneri.',
  },
];

export default function ImmersiveProductScene() {
  const [hasActivated, setHasActivated] = useState(false);
  const [scrollLength] = useState(3.5);
  const [phases] = useState(DEFAULT_PHASES);

  const wrapRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const phaseRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setHasActivated(true);
      },
      { rootMargin: '1000px' }
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!hasActivated) return;

    const wrap = wrapRef.current;
    const host = canvasHostRef.current;
    if (!wrap || !host) return;

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = host.clientWidth || window.innerWidth;
    let h = host.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.05); // SLIGHTLY DENSER FOG

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 150);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({
      antialias: false, // PERFORMANCE: Disabled
      alpha: false, // PERFORMANCE: Solid bg is faster
      powerPreference: 'high-performance',
      stencil: false,
      depth: true
    });
    
    renderer.setPixelRatio(1.0); // PERFORMANCE: Forced 1.0
    renderer.setSize(w, h);
    renderer.setClearColor(0x050505, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    host.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const key = new THREE.DirectionalLight(0xffd9b5, 2.0);
    key.position.set(5, 5, 10);
    scene.add(key);
    
    const rim = new THREE.DirectionalLight(0x6088ff, 1.5);
    rim.position.set(-5, -5, -5);
    scene.add(rim);

    // Group of premium "props"
    const group = new THREE.Group();
    scene.add(group);

    const props: { mesh: THREE.Object3D; baseRot: THREE.Vector3 }[] = [];

    const makeStandard = (color: number) =>
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.8,
        roughness: 0.2,
      });

    // Positions for props to fly past
    const positions: [number, number, number, number][] = [
      [-3,  1,   5, 1.2],
      [ 3, -1,   0, 1.4],
      [-4,  2,  -5, 1.5],
      [ 4, -2, -10, 1.3],
      [-2, -1, -15, 1.6],
      [ 3,  2, -20, 1.4],
      [-5,  0, -25, 1.8],
      [ 2, -2, -30, 1.5],
    ];

    // Fallback Geometries
    const geos = [
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.TorusKnotGeometry(0.6, 0.2, 64, 8),
      new THREE.BoxGeometry(1.2, 1.2, 1.2)
    ];
    
    const mats = [
      makeStandard(0xe85d26),
      makeStandard(0x222222),
      makeStandard(0xffffff)
    ];

    positions.forEach(([x, y, z, s], i) => {
      const mesh = new THREE.Mesh(geos[i % geos.length], mats[i % mats.length]);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(s);
      mesh.rotation.set(Math.random(), Math.random(), 0);
      group.add(mesh);
      props.push({ 
        mesh, 
        baseRot: new THREE.Vector3(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z) 
      });
    });

    // Particle dust (Reduced count for perf)
    const PCOUNT = 40;
    const pPos = new Float32Array(PCOUNT * 3);
    for (let i = 0; i < PCOUNT; i++) {
      pPos[i*3+0] = (Math.random() - 0.5) * 40;
      pPos[i*3+1] = (Math.random() - 0.5) * 20;
      pPos[i*3+2] = (Math.random() - 0.5) * 60 - 20;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xe85d26,
      size: 0.05,
      transparent: true,
      opacity: 0.4,
      additiveBlending: true
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // Camera path - More dramatic
    const camCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3( 0,  0,  12),
      new THREE.Vector3(-1,  1,   0),
      new THREE.Vector3( 1, -1, -12),
      new THREE.Vector3( 0,  0, -25),
    ]);

    let scrollProgress = 0;
    let smoothed = 0;

    const computeProgress = () => {
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const total = wrap.offsetHeight - window.innerHeight;
      const passed = Math.max(0, -rect.top);
      scrollProgress = Math.min(1, passed / Math.max(total, 1));

      // Update phases with less sensitivity
      phaseRefs.current.forEach((el, i) => {
        if (!el) return;
        const n = phases.length;
        const slot = 1 / n;
        const start = i * slot;
        const end = (i + 1) * slot;
        
        const local = (scrollProgress - start) / slot;
        
        // If this is the last phase, don't fade it out as we scroll past the center.
        // Let it stay visible until the section itself scrolls out of view.
        let opacity = 0;
        if (i === n - 1 && local > 0.5) {
          opacity = Math.max(0, Math.min(1, 1 - Math.abs(0.5 - 0.5) * 3)); // Stays at 1
        } else {
          opacity = Math.max(0, Math.min(1, 1 - Math.abs(local - 0.5) * 3));
        }
        
        el.style.opacity = String(opacity);
        el.style.transform = `translateY(${(1 - opacity) * 30}px)`;
        el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
      });
    };

    window.addEventListener('scroll', computeProgress, { passive: true });
    computeProgress();

    const clock = new THREE.Clock();
    let raf = 0;

    let isVisible = false;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          isVisible = e.isIntersecting;
        });
      },
      { threshold: 0.01 }
    );
    io.observe(wrap);

    const onResize = () => {
      w = host.clientWidth;
      h = host.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!isVisible) return; // Pause rendering if out of view

      const t = clock.getElapsedTime();
      smoothed += (scrollProgress - smoothed) * 0.05; // Smoother transitions

      const u = Math.max(0, Math.min(1, smoothed));
      const camPos = camCurve.getPointAt(u);
      camera.position.lerp(camPos, 0.1);
      camera.lookAt(0, 0, camPos.z - 5);

      props.forEach((p, i) => {
        p.mesh.rotation.x = p.baseRot.x + t * 0.1 + i;
        p.mesh.rotation.y = p.baseRot.y + t * 0.15;
        p.mesh.position.y += Math.sin(t * 0.5 + i) * 0.001;
      });

      points.rotation.y = t * 0.01;
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', computeProgress);
      window.removeEventListener('resize', onResize);
      
      // Explicit cleanup to prevent WebGL context leaks
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      
      renderer.dispose();
      renderer.forceContextLoss();
      scene.clear();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [hasActivated, phases.length, scrollLength]);

  return (
    <section
      ref={wrapRef}
      className="relative bg-[#050505]"
      style={{ height: `${scrollLength * 100}vh` }}
    >
      <div
        ref={stickyRef}
        className="sticky top-0 h-screen w-full overflow-hidden"
      >
        <div ref={canvasHostRef} className="absolute inset-0" />
        
        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

        {/* Phase content */}
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full relative h-[60vh]">
            {phases.map((p, i) => (
              <div
                key={i}
                ref={(el) => { if (el) phaseRefs.current[i] = el; }}
                className="absolute inset-0 flex flex-col justify-center opacity-0 transition-all duration-700 pointer-events-none"
              >
                <div className="max-w-2xl">
                  <span className="text-brand-red font-bold text-xs tracking-[0.3em] uppercase block mb-6">{p.eyebrow}</span>
                  <h3 className="text-4xl md:text-7xl font-display font-bold text-white leading-none mb-8 uppercase tracking-tighter">{p.title}</h3>
                  <p className="text-lg text-white/60 leading-relaxed max-w-lg">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overlay Labels */}
        <div className="absolute bottom-10 left-10 hidden md:block">
           <div className="flex items-center gap-4 text-[9px] font-bold text-white/30 uppercase tracking-[0.3em]">
             <div className="w-12 h-px bg-white/20" />
             CINEMATIC 3D EXPLORATION
           </div>
        </div>
      </div>
    </section>
  );
}
