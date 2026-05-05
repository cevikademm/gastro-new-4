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
          color="#0a0606"
          emissive="#1a0a05"
          emissiveIntensity={0.6}
          metalness={0.85}
          roughness={0.35}
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
    type RIC = (cb: () => void, opts?: { timeout: number }) => number;
    const ric: RIC = (window as unknown as { requestIdleCallback?: RIC }).requestIdleCallback
      ?? ((cb) => window.setTimeout(cb, 250) as unknown as number);
    const idleId = ric(() => {
      if (!document.hidden) setActive(true);
    }, { timeout: 1500 });

    const onVis = () => setActive(!document.hidden);
    const onSet = (e: Event) => {
      const detail = (e as CustomEvent<boolean>).detail;
      if (typeof detail === 'boolean') setActive(detail && !document.hidden);
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('bg3d:set', onSet as EventListener);
    return () => {
      const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      if (cic) cic(idleId);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('bg3d:set', onSet as EventListener);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#050505]">
      {active && (
        <Canvas
          camera={{ position: [0, 0, 20], fov: 45 }}
          dpr={[1, 1.25]}
          frameloop="always"
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
            alpha: false,
            stencil: false,
            depth: true,
          }}
        >
          <fog attach="fog" args={['#050505', 10, 50]} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
          <directionalLight position={[-10, -10, -10]} intensity={2.5} color="#E85D26" />
          <LiquidCore />
          <SceneRig />
        </Canvas>
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] opacity-80" />
    </div>
  );
}
