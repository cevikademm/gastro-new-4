import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, MeshDistortMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useScroll, useSpring } from 'framer-motion';

function LiquidCore({ scrollSpring }: { scrollSpring: any }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state) => {
    if (meshRef.current) {
      const scrollVal = scrollSpring.get();
      // Smooth continuous rotation independent of scroll
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.03;
      
      // Powerful scroll interaction: The shape moves and distorts based on scroll
      meshRef.current.position.y = -scrollVal * 0.005;
      meshRef.current.scale.setScalar(20 + scrollVal * 0.002);
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
      <mesh ref={meshRef} position={[0, 0, -20]}>
        <icosahedronGeometry args={[1, 32]} />
        <MeshDistortMaterial
          color="#050505"
          emissive="#110000"
          metalness={1}
          roughness={0.15}
          distort={0.4}
          speed={1.2}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>
    </Float>
  );
}

function SceneRig({ scrollSpring }: { scrollSpring: any }) {
  useFrame((state) => {
    // Silky smooth camera parallax driven by framer-motion spring
    const scrollVal = scrollSpring.get();
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 20 - scrollVal * 0.005, 0.1);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, scrollVal * 0.002, 0.1);
    
    // Slight mouse looking
    state.camera.lookAt(
      state.pointer.x * 2,
      state.pointer.y * 2,
      -30
    );
  });
  return null;
}

export default function Background3D() {
  const { scrollY } = useScroll();
  const scrollSpring = useSpring(scrollY, { damping: 30, stiffness: 100, mass: 1 });

  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-[#050505]">
      <Canvas camera={{ position: [0, 0, 20], fov: 45 }} dpr={[1, 1.5]} gl={{ antialias: false, powerPreference: "high-performance" }}>
        <fog attach="fog" args={['#050505', 10, 50]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={2} color="#ffffff" />
        <directionalLight position={[-10, -10, -10]} intensity={4} color="#DC2626" />
        <spotLight position={[0, 20, 0]} intensity={5} color="#DC2626" penumbra={1} angle={0.5} />
        
        <Environment preset="city" />
        
        <LiquidCore scrollSpring={scrollSpring} />
        <SceneRig scrollSpring={scrollSpring} />
      </Canvas>
      {/* Cinematic Vignette Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050505_100%)] opacity-80" />
    </div>
  );
}
