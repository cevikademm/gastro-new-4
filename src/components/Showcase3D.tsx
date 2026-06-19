import { useRef, Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Float, PresentationControls, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function EquipmentModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) ref.current.rotation.y = t * 0.2;
  });

  return <primitive ref={ref} object={scene} scale={1.5} position={[0, 0.4, 0]} />;
}

function FallbackMachine() {
  const ref = useRef<THREE.Group>(null!);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) ref.current.rotation.y = t * 0.4;
  });

  return (
    <group ref={ref}>
      <mesh>
        <boxGeometry args={[2.5, 3.5, 2]} />
        <meshStandardMaterial color="#0F2440" metalness={0.85} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0, 1.01]}>
        <planeGeometry args={[2.2, 3.2]} />
        <meshStandardMaterial color="#DC2626" emissive="#7f1d1d" emissiveIntensity={0.4} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.6, 1]} />
        <meshStandardMaterial color="#ffffff" emissive="#DC2626" emissiveIntensity={2} wireframe />
      </mesh>
    </group>
  );
}

export function Showcase3D() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);
  const [visible, setVisible] = useState(false);

  // Mount canvas only when section first scrolls near viewport.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting) setMount(true);
        setVisible(e.isIntersecting);
      },
      { rootMargin: '300px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="w-full h-full min-h-[450px] bg-transparent rounded-3xl overflow-hidden relative">
      {mount && (
        <Canvas
          dpr={[1, 1.25]}
          frameloop={visible ? 'always' : 'demand'}
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
            alpha: true,
            stencil: false,
          }}
        >
          <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={35} />
          <ambientLight intensity={0.6} />
          <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={2.5} />
          <pointLight position={[-10, -10, -5]} color="#ffffff" intensity={0.8} />
          <directionalLight position={[0, 5, 5]} intensity={1.2} color="#ffd9b5" />
          <directionalLight position={[-5, 2, -5]} intensity={0.8} color="#6088ff" />

          <PresentationControls
            global
            snap
            rotation={[0, 0.3, 0]}
            polar={[-Math.PI / 4, Math.PI / 4]}
            azimuth={[-Math.PI / 1.4, Math.PI / 1.4]}
          >
            <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.15}>
              <Suspense fallback={<FallbackMachine />}>
                <EquipmentModel url="/models/PSB-202MI-2V.glb" />
              </Suspense>
            </Float>
          </PresentationControls>

          <ContactShadows position={[0, -2.5, 0]} opacity={0.45} scale={12} blur={2.5} far={4} />
        </Canvas>
      )}
    </div>
  );
}

