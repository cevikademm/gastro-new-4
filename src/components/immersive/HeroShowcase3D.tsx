import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Float, PresentationControls, Stage, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function EquipmentModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.y = t * 0.2;
    }
  });

  return (
    <primitive 
      ref={ref}
      object={scene} 
      scale={1.5} 
      position={[0, -1, 0]} 
    />
  );
}

function FallbackMachine() {
  const ref = useRef<THREE.Group>(null!);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (ref.current) {
      ref.current.rotation.y = t * 0.4;
    }
  });

  return (
    <group ref={ref}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.5, 3.5, 2]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0, 1.01]}>
        <planeGeometry args={[2.2, 3.2]} />
        <meshPhysicalMaterial color="#000" transmission={0.8} transparent opacity={1} roughness={0} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.6, 1]} />
        <meshStandardMaterial color="#DC2626" emissive="#DC2626" emissiveIntensity={2} wireframe />
      </mesh>
    </group>
  );
}

export default function HeroShowcase3D() {
  return (
    <div className="w-full h-full min-h-[450px] bg-transparent rounded-3xl overflow-hidden relative">
      <Canvas shadows dpr={[1, 1.5]}>
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={35} />
        <ambientLight intensity={0.3} />
        <spotLight position={[10, 15, 10]} angle={0.3} penumbra={1} intensity={3} castShadow />
        <pointLight position={[-10, -10, -5]} color="#ffffff" intensity={1} />
        <directionalLight position={[0, 5, 5]} intensity={1.5} />

        <PresentationControls
          global
          snap
          rotation={[0, 0.3, 0]}
          polar={[-Math.PI / 4, Math.PI / 4]}
          azimuth={[-Math.PI / 1.4, Math.PI / 1.4]}
        >
          <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
            <Stage environment="studio" intensity={0.8} shadows={false}>
              <Suspense fallback={<FallbackMachine />}>
                <EquipmentModel url="/models/PSB-202MI-2V.glb" />
              </Suspense>
            </Stage>
          </Float>
        </PresentationControls>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <shadowMaterial transparent opacity={0.4} />
        </mesh>
      </Canvas>
    </div>
  );
}

// Preload the main model
useGLTF.preload('/models/PSB-202MI-2V.glb');
