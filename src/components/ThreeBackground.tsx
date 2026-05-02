import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, MeshDistortMaterial, Environment, Sparkles, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function KitchenEquipments() {
  const group = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });

  // Load actual equipment models
  const mixer = useGLTF('/models/Meshy_AI_Commercial_Planetary__0411175135_texture.glb');
  const oven = useGLTF('/models/PSB-202MI-2V.glb');
  const logo = useGLTF('/models/2mc-logo.glb');

  useMemo(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  useFrame((state, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.03;
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, mouse.current.x * 1.5, 0.05);
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, mouse.current.y * 1.5, 0.05);
    }
  });

  return (
    <group ref={group}>
      {/* Floating Mixer */}
      <Float speed={1.2} rotationIntensity={1} floatIntensity={1.5}>
        <primitive 
          object={mixer.scene} 
          position={[3, 1, -4]} 
          scale={2.2} 
          rotation={[0.2, -0.5, 0.1]}
        />
      </Float>

      {/* Floating Oven/Industrial Unit */}
      <Float speed={0.8} rotationIntensity={0.5} floatIntensity={1}>
        <primitive 
          object={oven.scene} 
          position={[-4, -2, -6]} 
          scale={1.8} 
          rotation={[0.1, 0.4, -0.1]}
        />
      </Float>

      {/* Floating Brand Logo piece */}
      <Float speed={2} rotationIntensity={1.5} floatIntensity={2}>
        <primitive 
          object={logo.scene} 
          position={[1.5, -2, -2]} 
          scale={1.5} 
          rotation={[Math.PI / 4, 0, 0]}
        />
      </Float>
      
      <Sparkles count={200} scale={20} size={2} speed={0.3} opacity={0.3} color="#FF7A45" />
    </group>
  );
}

export default function ThreeBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0" style={{ opacity: 0.8 }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} color="#90caf9" />
          
          <Environment preset="city" />
          <KitchenEquipments />
        </Suspense>
      </Canvas>
    </div>
  );
}
