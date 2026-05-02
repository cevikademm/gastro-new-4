import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Scroll-driven cinematic 3D scene.
 *
 * Inspired by lusion.co / oryzo.ai:
 * - The user scrolls a tall section.
 * - Scroll progress (0..1) drives a camera path through floating objects
 *   AND a horizontal text reveal sequence.
 * - WebGL canvas is sticky so it stays put while text panels glide by.
 *
 * No external libs required (pure THREE + sticky CSS).
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

export default function ImmersiveProductScene({
  phases = DEFAULT_PHASES,
  scrollLength = 4,
}: {
  phases?: Phase[];
  scrollLength?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const phaseRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const host = canvasHostRef.current;
    if (!wrap || !host) return;

    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = host.clientWidth || window.innerWidth;
    let h = host.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0f2440, 0.045);

    const camera = new THREE.PerspectiveCamera(48, w / h, 0.1, 200);
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    host.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
    });

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffd9b5, 1.8);
    key.position.set(8, 6, 9);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x6088ff, 1.4);
    rim.position.set(-8, -4, -6);
    scene.add(rim);
    const flare = new THREE.PointLight(0xe85d26, 1.6, 30);
    flare.position.set(0, 0, 6);
    scene.add(flare);

    // Reflective floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({
        color: 0x0a1a2e,
        metalness: 0.9,
        roughness: 0.35,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.2;
    scene.add(floor);

    // Group of premium "props" we'll fly through
    const group = new THREE.Group();
    scene.add(group);

    type Prop = { mesh: THREE.Mesh; baseRot: THREE.Vector3 };
    const props: Prop[] = [];

    const makePhysical = (color: number, opts: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
      new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.9,
        roughness: 0.18,
        clearcoat: 1.0,
        clearcoatRoughness: 0.15,
        envMapIntensity: 1.3,
        ...opts,
      });
    const makeGlass = () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.0,
        roughness: 0.06,
        transmission: 0.95,
        thickness: 1.2,
        ior: 1.45,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.5,
        attenuationColor: new THREE.Color('#cfe1ff'),
        attenuationDistance: 2.4,
        transparent: true,
      });

    const place = (mesh: THREE.Mesh, x: number, y: number, z: number, scale = 1) => {
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(scale);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      group.add(mesh);
      props.push({ mesh, baseRot: new THREE.Vector3(mesh.rotation.x, mesh.rotation.y, mesh.rotation.z) });
    };

    // Camera will travel from z=12 → z=-30 along a gentle curve.
    // Place props between those z values so they fly past.
    const positions: [number, number, number, number][] = [
      [-2.8,  1.3,   8, 1.0],
      [ 3.0, -1.0,   3, 1.1],
      [-3.8,  0.4,  -2, 1.0],
      [ 2.5,  1.6,  -7, 1.2],
      [-2.2, -1.4, -12, 1.1],
      [ 3.5,  0.0, -16, 1.2],
      [-3.2,  1.0, -21, 1.0],
      [ 2.0, -1.6, -25, 1.1],
    ];

    const geos = [
      () => new THREE.IcosahedronGeometry(0.7, 0),
      () => new THREE.TorusKnotGeometry(0.55, 0.18, 110, 18),
      () => new THREE.SphereGeometry(0.65, 56, 56),
      () => new THREE.OctahedronGeometry(0.7, 0),
      () => new THREE.TorusGeometry(0.55, 0.18, 28, 110),
      () => new THREE.BoxGeometry(1.0, 1.0, 1.0),
      () => new THREE.DodecahedronGeometry(0.7, 0),
      () => new THREE.SphereGeometry(0.55, 56, 56),
    ];

    const mats = [
      () => makePhysical(0xe85d26),
      () => makePhysical(0xff7a45, { roughness: 0.28 }),
      () => makeGlass(),
      () => makePhysical(0x2d5a8e, { metalness: 0.95, roughness: 0.12 }),
      () => makePhysical(0xffd089, { metalness: 0.95, roughness: 0.18 }),
      () => makePhysical(0xffffff, { metalness: 0.6, roughness: 0.28 }),
      () => makePhysical(0xe85d26),
      () => makeGlass(),
    ];

    positions.forEach(([x, y, z, s], i) => {
      const m = new THREE.Mesh(geos[i % geos.length](), mats[i % mats.length]());
      place(m, x, y, z, s);
    });

    // Particle dust
    const PCOUNT = reduceMotion ? 200 : 700;
    const pPos = new Float32Array(PCOUNT * 3);
    for (let i = 0; i < PCOUNT; i++) {
      pPos[i*3+0] = (Math.random() - 0.5) * 30;
      pPos[i*3+1] = (Math.random() - 0.5) * 16;
      pPos[i*3+2] = (Math.random() - 0.5) * 50 - 12;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xffd0b0,
      size: 0.04,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pGeo, pMat);
    scene.add(points);

    // Camera path
    const camCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3( 0.0,  0.4,  12),
      new THREE.Vector3(-0.6,  0.6,   4),
      new THREE.Vector3( 0.8, -0.2,  -4),
      new THREE.Vector3(-0.5,  0.3, -12),
      new THREE.Vector3( 0.4, -0.4, -22),
      new THREE.Vector3( 0.0,  0.0, -30),
    ]);
    const lookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3( 0.0, 0.0,   8),
      new THREE.Vector3( 0.0, 0.0,   0),
      new THREE.Vector3( 0.0, 0.0,  -8),
      new THREE.Vector3( 0.0, 0.0, -16),
      new THREE.Vector3( 0.0, 0.0, -24),
      new THREE.Vector3( 0.0, 0.0, -32),
    ]);

    let scrollProgress = 0;
    let smoothed = 0;
    let mouseTilt = new THREE.Vector2(0, 0);
    let mouseTarget = new THREE.Vector2(0, 0);

    const onMouse = (e: MouseEvent) => {
      const rect = host.getBoundingClientRect();
      mouseTarget.x = ((e.clientX - rect.left) / rect.width - 0.5) * 0.6;
      mouseTarget.y = ((e.clientY - rect.top) / rect.height - 0.5) * 0.4;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    const computeProgress = () => {
      const rect = wrap.getBoundingClientRect();
      const total = wrap.offsetHeight - window.innerHeight;
      const passed = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      scrollProgress = passed / Math.max(total, 1);

      // Update phase opacity / transform
      const n = phaseRefs.current.length;
      const slot = 1 / n;
      phaseRefs.current.forEach((el, i) => {
        if (!el) return;
        const start = i * slot;
        const end = (i + 1) * slot;
        const local = (scrollProgress - start) / Math.max(end - start, 0.0001);
        const visible = local >= -0.25 && local <= 1.25;
        if (!visible) {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          el.style.transform = 'translateY(60px)';
          return;
        }
        const t = Math.max(0, Math.min(1, local));
        const easeIn = Math.pow(Math.max(0, Math.min(1, t * 3)), 0.7);
        const easeOut = 1 - Math.pow(Math.max(0, Math.min(1, (t - 0.6) / 0.4)), 1.4);
        const opacity = Math.min(easeIn, easeOut);
        el.style.opacity = String(Math.max(0, opacity));
        el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
        const y = (1 - easeIn) * 60 - (1 - easeOut) * 60;
        el.style.transform = `translateY(${y}px)`;
      });
    };

    const onScroll = () => computeProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    computeProgress();

    const clock = new THREE.Clock();
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => (visible = e.isIntersecting)),
      { threshold: 0.01 },
    );
    io.observe(host);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = clock.getElapsedTime();

      smoothed += (scrollProgress - smoothed) * 0.08;
      mouseTilt.x += (mouseTarget.x - mouseTilt.x) * 0.06;
      mouseTilt.y += (mouseTarget.y - mouseTilt.y) * 0.06;

      const u = Math.max(0, Math.min(1, smoothed));
      const camPos = camCurve.getPointAt(u);
      const lookAt = lookCurve.getPointAt(u);
      camera.position.set(
        camPos.x + mouseTilt.x * 1.2,
        camPos.y + mouseTilt.y * 0.8 + Math.sin(t * 0.4) * 0.05,
        camPos.z,
      );
      camera.lookAt(lookAt);

      props.forEach((p, i) => {
        const slow = reduceMotion ? 0.3 : 1.0;
        p.mesh.rotation.x = p.baseRot.x + t * 0.15 * slow * (i % 2 ? 1 : -1);
        p.mesh.rotation.y = p.baseRot.y + t * 0.20 * slow;
        p.mesh.position.y += Math.sin(t * 0.6 + i) * 0.0015;
      });

      points.rotation.y = t * 0.015;
      points.rotation.x = Math.sin(t * 0.1) * 0.04;

      flare.position.x = Math.cos(t * 0.5) * 4;
      flare.position.z = camera.position.z + 4;

      renderer.render(scene, camera);
    };
    tick();

    const onResize = () => {
      w = host.clientWidth || window.innerWidth;
      h = host.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouse);
      pGeo.dispose();
      pMat.dispose();
      props.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [scrollLength]);

  return (
    <section
      ref={wrapRef}
      style={{
        position: 'relative',
        height: `${scrollLength * 100}vh`,
        background:
          'linear-gradient(180deg, #06101e 0%, #0F2440 35%, #0F2440 65%, #06101e 100%)',
      }}
    >
      <div
        ref={stickyRef}
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <div ref={canvasHostRef} style={{ position: 'absolute', inset: 0 }} />

        {/* Vignette top + bottom for cinematic feel */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        {/* Phase text panels */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: '0 auto',
              padding: '0 clamp(20px, 5vw, 64px)',
              width: '100%',
              position: 'relative',
              minHeight: '60vh',
            }}
          >
            {phases.map((p, i) => (
              <div
                key={i}
                ref={(el) => {
                  if (el) phaseRefs.current[i] = el;
                }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  transform: 'translateY(60px)',
                  opacity: 0,
                  transition:
                    'opacity .6s cubic-bezier(.22,.8,.3,1), transform .9s cubic-bezier(.22,.8,.3,1)',
                  willChange: 'transform, opacity',
                  marginTop: '-12vh',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ maxWidth: 620 }}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: '#FF7A45',
                      marginBottom: 18,
                    }}
                  >
                    {p.eyebrow}
                  </p>
                  <h3
                    className="c-serif"
                    style={{
                      fontSize: 'clamp(2rem, 4.6vw, 3.8rem)',
                      lineHeight: 1.04,
                      letterSpacing: '-0.03em',
                      color: '#fff',
                      margin: 0,
                      marginBottom: 20,
                      textShadow: '0 4px 30px rgba(0,0,0,0.5)',
                    }}
                  >
                    {p.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 'clamp(15px, 1.4vw, 18px)',
                      lineHeight: 1.65,
                      color: 'rgba(255,255,255,0.78)',
                      margin: 0,
                      maxWidth: 540,
                    }}
                  >
                    {p.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section label + progress */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 32,
            left: 32,
            color: 'rgba(255,255,255,0.55)',
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          ◆ 2MC Gastro · Cinematic Showcase
        </div>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255,255,255,0.6)',
            fontSize: 11,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ width: 26, height: 1, background: 'rgba(255,255,255,0.5)' }} />
          Kaydırarak keşfet
          <span style={{ width: 26, height: 1, background: 'rgba(255,255,255,0.5)' }} />
        </div>
      </div>
    </section>
  );
}
