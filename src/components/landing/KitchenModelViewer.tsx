import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URLS = {
  kitchenDraft: '/models/kitchen-model.glb',
  mixerNormal: new URL(
    '../../../3d tasarım dosyaları/Meshy_AI_Commercial_Planetary__0407075736_texture.glb',
    import.meta.url
  ).href,
  mixerCutaway: new URL(
    '../../../gastro resimler/Meshy_AI_Industrial_Spiral_Mix_0605190748_texture.glb',
    import.meta.url
  ).href,
  iceNormal: new URL(
    '../../../gastro resimler/Meshy_AI_CombiSteel_Upright_Fr_0605150158_texture.glb',
    import.meta.url
  ).href,
  iceCutaway: new URL(
    '../../../gastro resimler/Meshy_AI_Exploded_Assembly_Vie_0605141814_texture.glb',
    import.meta.url
  ).href,
};

export type ModelKey = keyof typeof MODEL_URLS;

interface ModelProps {
  url: string;
  onLoad: () => void;
  rotation?: [number, number, number];
}

function Model({ url, onLoad, rotation = [0, 0, 0] }: ModelProps) {
  const { scene } = useGLTF(url);
  const preparedScene = useMemo(() => {
    const root = scene.clone(true);

    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;

      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = true;

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const nextMaterials = materials.map((material) => {
        const next = material.clone();

        if (next instanceof THREE.MeshStandardMaterial || next instanceof THREE.MeshPhysicalMaterial) {
          next.envMapIntensity = Math.max(next.envMapIntensity ?? 1, 1.35);
          next.roughness = Math.min(Math.max(next.roughness ?? 0.45, 0.28), 0.58);
          next.metalness = Math.min(next.metalness ?? 0.5, 0.62);
          next.color.lerp(new THREE.Color(0xffffff), 0.05);
        }

        next.needsUpdate = true;
        return next;
      });

      mesh.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0];
    });

    return root;
  }, [scene]);

  useEffect(() => {
    if (preparedScene) onLoad();
  }, [preparedScene, onLoad]);

  return (
    <group rotation={rotation}>
      <primitive object={preparedScene} />
    </group>
  );
}

interface KitchenModelViewerProps {
  model?: ModelKey;
  className?: string;
  interactive?: boolean;
  autoRotate?: boolean;
  transparent?: boolean;
  fitMargin?: number;
}

function ModelCanvas({
  model,
  onLoad,
  interactive = true,
  rotation,
  autoRotate = false,
  active = false,
  fitMargin = 1.0,
}: {
  model: ModelKey;
  onLoad: () => void;
  interactive?: boolean;
  rotation?: [number, number, number];
  autoRotate?: boolean;
  active?: boolean;
  fitMargin?: number;
}) {
  return (
    <Canvas
      camera={{ position: [50, 38, 52], fov: 42 }}
      dpr={1}
      performance={{ min: 0.5 }}
      frameloop={active ? "always" : "demand"}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        stencil: false,
        alpha: true,
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(0xffffff, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.55;
      }}
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
    >
      <ambientLight intensity={2.1} />
      <hemisphereLight args={[0xffffff, 0xdbeafe, 1.35]} />
      <directionalLight position={[8, 10, 7]} intensity={2.25} />
      <directionalLight position={[-7, 5, -5]} intensity={1.15} />
      <directionalLight position={[0, -4, 6]} intensity={0.55} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={fitMargin}>
          <Model url={MODEL_URLS[model]} onLoad={onLoad} rotation={rotation} />
        </Bounds>
      </Suspense>
      {interactive && (
        <OrbitControls
          enableZoom={!autoRotate}
          enablePan={false}
          enableDamping={false}
          autoRotate={autoRotate}
          autoRotateSpeed={0.6}
          minDistance={1}
          maxDistance={200}
        />
      )}
    </Canvas>
  );
}

export function KitchenModelViewer({
  model = 'kitchenDraft',
  className = '',
  interactive = true,
  autoRotate = false,
  transparent = false,
  fitMargin = 1.0,
}: KitchenModelViewerProps) {
  const [loading, setLoading] = useState(true);
  const handleLoad = useCallback(() => setLoading(false), []);
  const surface = transparent ? 'bg-transparent' : 'bg-[#f8fafc] rounded-2xl overflow-hidden';

  // Render the heavy model continuously ONLY while it is on screen — saves GPU when scrolled away.
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`w-full h-full min-h-[220px] relative ${surface} flex items-center justify-center ${className}`}>
      {loading && (
        <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 ${transparent ? 'bg-[#0c1420]/80' : 'bg-[#f8fafc]/95'}`}>
          <div className="w-8 h-8 border-t-2 border-brand-red rounded-full animate-spin" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            3D Model Yükleniyor...
          </span>
        </div>
      )}

      <ModelCanvas model={model} onLoad={handleLoad} interactive={interactive} autoRotate={autoRotate} active={autoRotate && inView} fitMargin={fitMargin} />
    </div>
  );
}

export function ModelComparisonViewer({
  split,
  normalModel = 'mixerNormal',
  cutawayModel = 'mixerCutaway',
}: {
  split: number;
  normalModel?: ModelKey;
  cutawayModel?: ModelKey;
}) {
  const [normalLoaded, setNormalLoaded] = useState(false);
  const [cutawayLoaded, setCutawayLoaded] = useState(false);
  const [modelRotation, setModelRotation] = useState<[number, number, number]>([0, 0, 0]);
  const dragState = useRef<{
    pointerId: number;
    x: number;
    y: number;
    rotation: [number, number, number];
  } | null>(null);
  const loading = !normalLoaded || !cutawayLoaded;

  useEffect(() => {
    setNormalLoaded(false);
    setCutawayLoaded(false);
    setModelRotation([0, 0, 0]);
  }, [normalModel, cutawayModel]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    event.preventDefault();
    dragState.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rotation: modelRotation,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const currentDrag = dragState.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - currentDrag.x;
    const deltaY = event.clientY - currentDrag.y;
    const [baseX, baseY, baseZ] = currentDrag.rotation;
    const nextX = Math.min(Math.max(baseX + deltaY * 0.006, -0.7), 0.7);

    setModelRotation([nextX, baseY + deltaX * 0.009, baseZ]);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId !== event.pointerId) return;

    dragState.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      className="absolute inset-0 bg-white cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-white">
          <div className="w-8 h-8 border-t-2 border-brand-red rounded-full animate-spin" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            3D Karşılaştırma Yükleniyor...
          </span>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none">
        <ModelCanvas
          key={`cutaway-${cutawayModel}`}
          model={cutawayModel}
          onLoad={() => setCutawayLoaded(true)}
          interactive={false}
          rotation={modelRotation}
        />
      </div>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{ clipPath: `polygon(0 0, ${split}% 0, ${split}% 100%, 0 100%)` }}
      >
        <div className="absolute inset-0 bg-white" />
        <div className="absolute inset-0">
          <ModelCanvas
            key={`normal-${normalModel}`}
            model={normalModel}
            onLoad={() => setNormalLoaded(true)}
            interactive={false}
            rotation={modelRotation}
          />
        </div>
      </div>
    </div>
  );
}
