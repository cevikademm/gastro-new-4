import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

function LiquidCore() {
  const meshRef = useRef<THREE.Mesh>(null!);
  const scrollRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      scrollRef.current = window.scrollY;
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        update();
        raf = 0;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useFrame((state) => {
    const m = meshRef.current;
    if (!m) return;
    const s = scrollRef.current;
    m.rotation.y = state.clock.elapsedTime * 0.05;
    m.rotation.x = state.clock.elapsedTime * 0.03;
    m.position.y = -s * 0.005;
    m.scale.setScalar(20 + s * 0.002);
  });

  return (
    <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.15}>
      <mesh ref={meshRef} position={[0, 0, -20]}>
        <icosahedronGeometry args={[1, 4]} />
        <meshStandardMaterial
          color="#DC2626"
          emissive="#7f1d1d"
          emissiveIntensity={0.35}
          metalness={0.85}
          roughness={0.4}
          transparent
          opacity={0.18}
        />
      </mesh>
    </Float>
  );
}

function SceneRig() {
  const pointer = useRef({ x: 0, y: 0 });
  const scrollRef = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onScroll = () => { scrollRef.current = window.scrollY; };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useFrame((state) => {
    const s = scrollRef.current;
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 20 - s * 0.005, 0.08);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, s * 0.002, 0.08);
    state.camera.lookAt(pointer.current.x * 2, pointer.current.y * 2, -30);
  });
  return null;
}

export function Background3D() {
  // Defer canvas creation past first paint so it doesn't compete with the
  // hero's critical render path.
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Honor reduced-motion + low-memory devices — skip 3D entirely.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const lowMem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (reduced || (typeof lowMem === 'number' && lowMem <= 4)) return;

    type RIC = (cb: () => void, opts?: { timeout: number }) => number;
    const ric: RIC = (window as unknown as { requestIdleCallback?: RIC }).requestIdleCallback
      ?? ((cb) => window.setTimeout(cb, 250) as unknown as number);

    let scrollPastHero = false;
    let raf = 0;
    const recompute = () => {
      const past = window.scrollY > window.innerHeight * 0.9;
      if (past !== scrollPastHero) {
        scrollPastHero = past;
        if (!document.hidden) setActive(!past);
      }
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { recompute(); raf = 0; });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const idleId = ric(() => {
      if (!document.hidden && !scrollPastHero) setActive(true);
    }, { timeout: 1500 });

    const onVis = () => setActive(!document.hidden && !scrollPastHero);
    const onSet = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') setActive(detail && !document.hidden && !scrollPastHero);
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('bg3d:set', onSet as EventListener);
    return () => {
      const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      if (cic) cic(idleId);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('bg3d:set', onSet as EventListener);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#FAFAFA]">
      {active && (
        <Canvas
          camera={{ position: [0, 0, 20], fov: 45 }}
          dpr={[1, 1.25]}
          frameloop="always"
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
            alpha: true,
            stencil: false,
            depth: true,
          }}
        >
          <fog attach="fog" args={['#FAFAFA', 10, 50]} />
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 10, 10]} intensity={1.4} color="#ffffff" />
          <directionalLight position={[-10, -10, -10]} intensity={1.8} color="#DC2626" />
          <LiquidCore />
          <SceneRig />
        </Canvas>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(220,38,38,0.06),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(220,38,38,0.08),transparent_55%)]" />
    </div>
  );
}
