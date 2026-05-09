import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Eye, EyeOff, Maximize2, RotateCcw, Zap,
  Download, Loader2, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/* ─── Types ─── */
interface Point { x: number; y: number; }

interface PlacedItem {
  id: string;
  equipmentId?: string;
  name: string;
  icon: string;
  imageData?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  category: string;
  color: string;
  kw: number;
  price?: number;
  brand?: string;
  desc?: string;
}

/* ─── GLB Model Cache ─── */
const glbCache = new Map<string, THREE.Group>();
const glbUrlCache = new Map<string, string | null>();
const gltfLoader = new GLTFLoader();

async function fetchGlbUrl(productKey: string): Promise<string | null> {
  if (glbUrlCache.has(productKey)) return glbUrlCache.get(productKey) ?? null;
  if (!supabase) { glbUrlCache.set(productKey, null); return null; }

  try {
    const { data } = await supabase
      .from('product_3d_models')
      .select('glb_url, status')
      .eq('product_key', productKey)
      .eq('status', 'done')
      .maybeSingle();

    const url = data?.glb_url ?? null;
    glbUrlCache.set(productKey, url);
    return url;
  } catch {
    glbUrlCache.set(productKey, null);
    return null;
  }
}

function loadGlbModel(url: string): Promise<THREE.Group> {
  if (glbCache.has(url)) return Promise.resolve(glbCache.get(url)!.clone());

  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        glbCache.set(url, model);
        resolve(model.clone());
      },
      undefined,
      (err) => reject(err)
    );
  });
}

/** Fit a loaded GLB model into the target bounding box (width x height x depth in meters) */
function fitModelToBox(model: THREE.Group, targetW: number, targetH: number, targetD: number) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Scale uniformly to fit inside target box
  const scaleX = size.x > 0 ? targetW / size.x : 1;
  const scaleY = size.y > 0 ? targetH / size.y : 1;
  const scaleZ = size.z > 0 ? targetD / size.z : 1;
  const scale = Math.min(scaleX, scaleY, scaleZ);
  model.scale.setScalar(scale);

  // Re-center after scaling
  const newBox = new THREE.Box3().setFromObject(model);
  const newCenter = newBox.getCenter(new THREE.Vector3());
  model.position.sub(newCenter); // center at origin
}

type OpeningType = 'door' | 'window' | 'double-door';

interface WallOpening {
  id: string;
  type: OpeningType;
  wallIndex: number;
  t: number;
  widthCm: number;
  swingDir: 1 | -1;
}

interface RoomProps {
  name: string;
  height: string;
  floor: string;
  wallMaterial: string;
  floorMaterial: string;
  usageType: string;
  fireZone: string;
}

interface FloorPlanData {
  roomPolygon: Point[];
  items: PlacedItem[];
  wallOpenings: WallOpening[];
  roomProps: RoomProps;
  roomWidthCm: number;
  roomHeightCm: number;
}

type CameraPreset = 'top' | 'front' | 'side' | 'perspective' | 'isometric';

/* ─── Main Component ─── */
export default function FloorPlan3DViewer({
  projectId,
  onClose,
}: {
  projectId?: string;
  onClose?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const axisRef = useRef<THREE.Group | null>(null);
  const floorPlanGroupRef = useRef<THREE.Group | null>(null);

  // UI State
  const [loading, setLoading] = useState(true);
  const [wallHeight, setWallHeight] = useState(280);
  const [showWalls, setShowWalls] = useState(true);
  const [wallTransparency, setWallTransparency] = useState(0.1);
  const [showEquipment, setShowEquipment] = useState(true);
  const [isOrthographic, setIsOrthographic] = useState(false);
  const [measurement, setMeasurement] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [floorPlanData, setFloorPlanData] = useState<FloorPlanData | null>(null);
  const [glbLoadingCount, setGlbLoadingCount] = useState(0);
  const [glbLoadedCount, setGlbLoadedCount] = useState(0);
  const [glbTotalCount, setGlbTotalCount] = useState(0);

  // Load floor plan data from localStorage
  useEffect(() => {
    const storageKey = projectId ? `2mc-floorplan-${projectId}` : '2mc-floorplan-global';
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        setFloorPlanData(data);
        setWallHeight(parseInt(data.roomProps?.height || '280', 10));
      }
    } catch (e) {
      console.error('Failed to load floor plan:', e);
    }
    setLoading(false);
  }, [projectId]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || !floorPlanData) return;

    // Scene setup — SolidWorks-style studio background (radial gradient)
    const scene = new THREE.Scene();
    scene.background = createStudioBackground();
    sceneRef.current = scene;

    // Renderer — must be created before environment map
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    containerRef.current.appendChild(renderer.domElement);

    // Environment map for subtle PBR reflections (studio feel)
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // Studio 3-point lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(12, 18, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 60;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xb8d4ff, 0.6);
    fillLight.position.set(-10, 8, -6);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
    rimLight.position.set(-4, 10, 12);
    scene.add(rimLight);

    const hemLight = new THREE.HemisphereLight(0xdde8ff, 0x1a1f2e, 0.4);
    scene.add(hemLight);

    // Cameras
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 10000);
    camera.position.set(15, 12, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const orthoCamera = new THREE.OrthographicCamera(
      -30, 30, 20, -20, 0.1, 1000
    );
    orthoCamera.position.set(0, 25, 0);
    orthoCamera.lookAt(0, 0, 0);
    orthoCameraRef.current = orthoCamera;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 2;
    controlsRef.current = controls;

    // CAD-style grid (subtle, non-intrusive)
    const gridHelper = new THREE.GridHelper(60, 60, 0x3a4a6a, 0x1e2a3f);
    const gridMat = gridHelper.material as THREE.Material | THREE.Material[];
    if (Array.isArray(gridMat)) {
      gridMat.forEach(m => { (m as THREE.Material).transparent = true; (m as THREE.Material).opacity = 0.35; });
    } else {
      gridMat.transparent = true;
      gridMat.opacity = 0.35;
    }
    gridHelper.position.y = -0.002;
    scene.add(gridHelper);

    // Ground shadow catcher — makes shadows feel grounded
    const shadowGeom = new THREE.PlaneGeometry(80, 80);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const shadowPlane = new THREE.Mesh(shadowGeom, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.001;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Axis indicator (corner)
    const axisGroup = createAxisIndicator();
    axisRef.current = axisGroup;
    scene.add(axisGroup);

    // Floor plan group
    const floorPlanGroup = new THREE.Group();
    floorPlanGroupRef.current = floorPlanGroup;
    scene.add(floorPlanGroup);

    // Render floor plan (walls + floor synchronously, equipment async with GLB)
    renderFloorPlanStructure(floorPlanGroup, floorPlanData, wallHeight, showWalls, wallTransparency);
    if (showEquipment && floorPlanData.items?.length) {
      loadEquipmentModels(floorPlanGroup, floorPlanData.items, wallHeight, setGlbLoadingCount, setGlbLoadedCount, setGlbTotalCount);
    }

    // Animation loop
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();

      // Update axis position (stay in corner)
      const rect = renderer.domElement.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      axisGroup.position.copy(camera.position).normalize().multiplyScalar(8);

      const currentCamera = isOrthographic ? orthoCamera : camera;
      renderer.render(scene, currentCamera);
    };
    animate();

    // Handle resize
    const onResize = () => {
      const ww = containerRef.current?.clientWidth || w;
      const hh = containerRef.current?.clientHeight || h;
      camera.aspect = ww / hh;
      camera.updateProjectionMatrix();
      orthoCamera.left = -ww / 80;
      orthoCamera.right = ww / 80;
      orthoCamera.top = hh / 80;
      orthoCamera.bottom = -hh / 80;
      orthoCamera.updateProjectionMatrix();
      renderer.setSize(ww, hh);
    };
    window.addEventListener('resize', onResize);

    // Handle fullscreen
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      renderer.dispose();
      if (renderer.domElement.parentNode === containerRef.current) {
        containerRef.current?.removeChild(renderer.domElement);
      }
    };
  }, [floorPlanData, wallHeight, showWalls, wallTransparency, showEquipment, isOrthographic]);

  // Update floor plan when parameters change
  useEffect(() => {
    if (floorPlanGroupRef.current && floorPlanData) {
      floorPlanGroupRef.current.clear();
      renderFloorPlanStructure(floorPlanGroupRef.current, floorPlanData, wallHeight, showWalls, wallTransparency);
      if (showEquipment && floorPlanData.items?.length) {
        loadEquipmentModels(floorPlanGroupRef.current, floorPlanData.items, wallHeight, setGlbLoadingCount, setGlbLoadedCount, setGlbTotalCount);
      }
    }
  }, [floorPlanData, wallHeight, showWalls, wallTransparency, showEquipment]);

  const setCameraPreset = useCallback((preset: CameraPreset) => {
    const camera = cameraRef.current;
    const orthoCamera = orthoCameraRef.current;
    if (!camera || !orthoCamera) return;

    const positions: Record<CameraPreset, [number, number, number]> = {
      top: [0, 50, 0],
      front: [0, 15, 30],
      side: [30, 15, 0],
      perspective: [15, 12, 15],
      isometric: [20, 20, 20],
    };

    const [x, y, z] = positions[preset];
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    orthoCamera.position.set(x, y, z);
    orthoCamera.lookAt(0, 0, 0);
    controlsRef.current?.target.set(0, 0, 0);
    controlsRef.current?.update();
  }, []);

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleExport = () => {
    if (rendererRef.current) {
      const link = document.createElement('a');
      link.href = rendererRef.current.domElement.toDataURL('image/png');
      link.download = `floorplan-3d-${Date.now()}.png`;
      link.click();
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 text-[#DC2626] animate-spin" />
      </div>
    );
  }

  if (!floorPlanData) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400">
        <div className="text-center">
          <p className="mb-2">Zemin planı verisi bulunamadı</p>
          <p className="text-xs">Lütfen önce 2D editörde bir zemin planı oluşturun</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-900">
      {/* 3D Canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ touchAction: 'none' }}
      />

      {/* Controls Panel */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg p-4 max-w-xs shadow-xl">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Zap size={14} className="text-[#C62828]" />
          3D Kontroller
        </h3>

        {/* Wall Height Slider */}
        <div className="mb-4">
          <label className="text-xs text-slate-300 block mb-1.5">
            Duvar Yüksekliği: <span className="text-[#C62828] font-bold">{wallHeight}cm</span>
          </label>
          <input
            type="range"
            min="200"
            max="400"
            step="10"
            value={wallHeight}
            onChange={(e) => setWallHeight(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #C62828 0%, #C62828 ${((wallHeight - 200) / 200) * 100}%, #334155 ${((wallHeight - 200) / 200) * 100}%, #334155 100%)`
            }}
          />
        </div>

        {/* Wall Transparency Slider */}
        <div className="mb-4">
          <label className="text-xs text-slate-300 block mb-1.5">
            Duvar Şeffaflığı: <span className="text-[#C62828] font-bold">{Math.round(wallTransparency * 100)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={wallTransparency}
            onChange={(e) => setWallTransparency(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #C62828 0%, #C62828 ${wallTransparency * 100}%, #334155 ${wallTransparency * 100}%, #334155 100%)`
            }}
          />
        </div>

        {/* Toggle Visibility */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowWalls(!showWalls)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              showWalls
                ? 'bg-[#C62828] text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {showWalls ? <Eye size={12} /> : <EyeOff size={12} />}
            Duvarlar
          </button>
          <button
            onClick={() => setShowEquipment(!showEquipment)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              showEquipment
                ? 'bg-[#C62828] text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {showEquipment ? <Eye size={12} /> : <EyeOff size={12} />}
            Ekipman
          </button>
        </div>

        {/* Camera Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setIsOrthographic(!isOrthographic)}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              isOrthographic
                ? 'bg-[#C62828] text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {isOrthographic ? 'Ortho' : 'Perspektif'}
          </button>
        </div>

        {/* Camera Presets */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['top', 'front', 'side', 'isometric'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => setCameraPreset(preset)}
              className="px-2 py-1.5 rounded text-xs font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
            >
              {preset === 'top' && 'Üst'}
              {preset === 'front' && 'Ön'}
              {preset === 'side' && 'Yan'}
              {preset === 'isometric' && 'İzometrik'}
            </button>
          ))}
        </div>

        {/* Info */}
        {floorPlanData.roomProps?.name && (
          <div className="pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-400">
              <span className="font-medium">{floorPlanData.roomProps.name}</span>
            </p>
          </div>
        )}
      </div>

      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setCameraPreset('perspective')}
          className="p-2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded hover:bg-slate-800 transition-colors"
          title="Sıfırla"
        >
          <RotateCcw size={16} className="text-slate-300" />
        </button>
        <button
          onClick={handleExport}
          className="p-2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded hover:bg-slate-800 transition-colors"
          title="Dışa Aktar"
        >
          <Download size={16} className="text-slate-300" />
        </button>
        <button
          onClick={handleFullscreen}
          className="p-2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded hover:bg-slate-800 transition-colors"
          title="Tam Ekran"
        >
          <Maximize2 size={16} className="text-slate-300" />
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 bg-[#C62828]/90 backdrop-blur border border-[#C62828] rounded hover:bg-[#b71c1c] transition-colors"
            title="Kapat / 2D Çizime Dön"
          >
            <X size={16} className="text-white" />
          </button>
        )}
      </div>

      {/* Bottom Info */}
      {measurement && (
        <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-700 rounded px-3 py-2 text-xs text-slate-300">
          {measurement}
        </div>
      )}

      {/* GLB Loading Indicator */}
      {glbLoadingCount > 0 && (
        <div className="absolute bottom-4 right-4 z-10 bg-slate-900/90 backdrop-blur border border-[#C62828]/40 rounded-lg px-4 py-3 flex items-center gap-3 shadow-xl">
          <Loader2 size={16} className="text-[#C62828] animate-spin" />
          <div>
            <p className="text-xs text-white font-medium">3D Modeller Yükleniyor</p>
            <p className="text-[10px] text-slate-400">{glbLoadedCount} / {glbTotalCount} ekipman</p>
            <div className="mt-1 w-32 h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#C62828] rounded-full transition-all duration-300"
                style={{ width: `${glbTotalCount > 0 ? (glbLoadedCount / glbTotalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helper Functions ─── */

function createAxisIndicator(): THREE.Group {
  const group = new THREE.Group();

  const arrowLength = 1.5;
  const arrowHeadLength = 0.3;

  // X axis (red)
  const xMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const xGeom = new THREE.ConeGeometry(0.15, arrowHeadLength, 8);
  const xHead = new THREE.Mesh(xGeom, xMat);
  xHead.position.x = arrowLength;
  xHead.rotation.z = Math.PI / 2;
  group.add(xHead);

  const xLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(arrowLength, 0, 0),
    ]),
    new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 })
  );
  group.add(xLine);

  // Y axis (green)
  const yMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const yGeom = new THREE.ConeGeometry(0.15, arrowHeadLength, 8);
  const yHead = new THREE.Mesh(yGeom, yMat);
  yHead.position.y = arrowLength;
  group.add(yHead);

  const yLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, arrowLength, 0),
    ]),
    new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 })
  );
  group.add(yLine);

  // Z axis (blue)
  const zMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
  const zGeom = new THREE.ConeGeometry(0.15, arrowHeadLength, 8);
  const zHead = new THREE.Mesh(zGeom, zMat);
  zHead.position.z = arrowLength;
  zHead.rotation.x = -Math.PI / 2;
  group.add(zHead);

  const zLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, arrowLength),
    ]),
    new THREE.LineBasicMaterial({ color: 0x0000ff, linewidth: 2 })
  );
  group.add(zLine);

  return group;
}

/** Render walls and floor (synchronous) */
function renderFloorPlanStructure(
  group: THREE.Group,
  data: FloorPlanData,
  wallHeight: number,
  showWalls: boolean,
  wallTransparency: number
) {
  const scale = 1 / 100; // cm to meters
  const wallThickness = 0.15; // 15cm walls
  const roomHeight = wallHeight * scale;

  // Draw floor
  if (data.roomPolygon && data.roomPolygon.length >= 3) {
    const floorPoints = data.roomPolygon.map(p => new THREE.Vector2(p.x * scale, p.y * scale));
    const floorShape = new THREE.Shape(floorPoints);
    const floorGeom = new THREE.ShapeGeometry(floorShape);
    // Zemin — sıcak bej/kum tonu, duvarların soğuk beyazından net ayrışsın diye
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xc9a66b,
      roughness: 0.75,
      metalness: 0.03,
      side: THREE.DoubleSide,
      envMapIntensity: 0.4,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.castShadow = false;
    // Zemini tavan düzleminden biraz aşağı al ki ince ürünler z-fighting yapmasın
    floor.position.y = 0.001;
    group.add(floor);

    // Floor outline — thin dark line around perimeter (CAD drawing feel)
    const outlinePts = data.roomPolygon.map(p => new THREE.Vector3(p.x * scale, 0.003, p.y * scale));
    outlinePts.push(outlinePts[0].clone());
    const outlineGeom = new THREE.BufferGeometry().setFromPoints(outlinePts);
    const outlineMat = new THREE.LineBasicMaterial({ color: 0x1a1f2e });
    const outline = new THREE.Line(outlineGeom, outlineMat);
    group.add(outline);

    // Draw walls — with door/window openings
    if (showWalls) {
      const openings = data.wallOpenings || [];
      for (let i = 0; i < data.roomPolygon.length; i++) {
        const p1 = data.roomPolygon[i];
        const p2 = data.roomPolygon[(i + 1) % data.roomPolygon.length];
        const wallOpenings = openings.filter(o => o.wallIndex === i);

        const wallGroup = createWallWithOpenings(
          p1.x * scale,
          p1.y * scale,
          p2.x * scale,
          p2.y * scale,
          roomHeight,
          wallThickness,
          wallTransparency,
          wallOpenings,
          scale
        );
        group.add(wallGroup);
      }
    }
  }
}

/** Fallback: GLB yoksa ürün kategorisine göre renkli basit bir kutu üret. */
function createFallbackBox(item: PlacedItem, w: number, h: number, d: number): THREE.Group {
  const wrapper = new THREE.Group();

  const color = new THREE.Color(item.color || '#94a3b8');
  const geom = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.1,
    envMapIntensity: 0.6,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  wrapper.add(mesh);

  // Üst yüzeye soluk bir kapak rengi — kutuların birbirinden ayrılmasını kolaylaştırır
  const topGeom = new THREE.BoxGeometry(w * 0.98, 0.01, d * 0.98);
  const topMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.2,
  });
  const top = new THREE.Mesh(topGeom, topMat);
  top.position.y = h / 2 + 0.006;
  wrapper.add(top);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geom, 15),
    new THREE.LineBasicMaterial({ color: 0x1e293b, transparent: true, opacity: 0.55 }),
  );
  wrapper.add(edges);

  return wrapper;
}

/** Ekipmanları sahneye yerleştir — GLB varsa GLB, yoksa kutu fallback. */
async function loadEquipmentModels(
  group: THREE.Group,
  items: PlacedItem[],
  wallHeight: number,
  setLoadingCount: (n: number) => void,
  setLoadedCount: (n: number) => void,
  setTotalCount: (n: number) => void
) {
  const scale = 1 / 100;
  const roomHeight = wallHeight * scale;

  if (items.length === 0) return;

  setTotalCount(items.length);
  setLoadedCount(0);
  setLoadingCount(items.length);

  let loaded = 0;

  const promises = items.map(async (item) => {
    const itemW = item.width * scale;
    const itemD = item.height * scale;
    const defaultH = Math.min(roomHeight * 0.7, 1);
    const posX = item.x * scale;
    const posZ = item.y * scale;

    try {
      let placed: THREE.Object3D | null = null;
      let itemH = defaultH;

      // 1) GLB varsa yükle
      if (item.equipmentId) {
        try {
          const glbUrl = await fetchGlbUrl(item.equipmentId);
          if (glbUrl) {
            const model = await loadGlbModel(glbUrl);
            fitModelToBox(model, itemW, itemH, itemD);
            placed = model;
          }
        } catch (err) {
          console.warn(`GLB load failed for ${item.name} (${item.equipmentId}):`, err);
        }
      }

      // 2) GLB yoksa renkli kutu fallback — en azından 2D'deki ürün 3D'de de görünür olsun
      if (!placed) {
        placed = createFallbackBox(item, itemW, itemH, itemD);
      }

      const wrapper = new THREE.Group();
      wrapper.add(placed);
      wrapper.position.set(posX, itemH / 2, posZ);
      wrapper.rotation.y = -(item.rotation * Math.PI) / 180;
      wrapper.userData.name = item.name;
      wrapper.userData.equipmentId = item.equipmentId;
      group.add(wrapper);
    } finally {
      loaded++;
      setLoadedCount(loaded);
    }
  });

  await Promise.all(promises);
  setLoadingCount(0);
}

/**
 * Duvar + kapı/pencere boşlukları.
 * Duvarı [0..length] parametresine böler, her açıklık için:
 *   - door: tam yükseklikte boşluk (yalnız üst lento parçası kalır)
 *   - window: alt (sill) + üst (lintel) + yanlar dolu, orta bölümü cam panel
 *   - double-door: door gibi ama daha geniş varsayılan
 * Açıklık aralıklarının dışında kalan kısımlar normal solid duvar olarak çizilir.
 */
function createWallWithOpenings(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  height: number,
  thickness: number,
  transparency: number,
  openings: WallOpening[],
  scale: number,
): THREE.Group {
  const group = new THREE.Group();

  const dx = x2 - x1;
  const dz = y2 - y1;
  const length = Math.sqrt(dx * dx + dz * dz);
  if (length < 1e-6) return group;

  const ux = dx / length;
  const uz = dz / length;
  const yaw = -Math.atan2(dz, dx);

  const opaque = transparency < 0.01;

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf1f3f7,
    roughness: 0.85,
    metalness: 0.0,
    transparent: !opaque,
    opacity: 1 - transparency,
    side: THREE.DoubleSide,
    envMapIntensity: 0.35,
  });

  // Standart yükseklikler (metre)
  const doorHeight = Math.min(2.1, height * 0.9);          // 210 cm kapı
  const windowSill = Math.min(1.0, height * 0.35);         // 100 cm pencere alt hizası
  const windowTop = Math.min(2.2, height * 0.85);          // 220 cm pencere üstü

  /** Belirli dikey aralıkta (yMin..yMax) ve yatay aralıkta (sMin..sMax) bir duvar parçası ekle. */
  const addSlab = (sMin: number, sMax: number, yMin: number, yMax: number) => {
    const segLen = sMax - sMin;
    const segH = yMax - yMin;
    if (segLen < 1e-3 || segH < 1e-3) return;

    const geom = new THREE.BoxGeometry(segLen, segH, thickness);
    const mesh = new THREE.Mesh(geom, wallMat);

    const cx = x1 + ux * ((sMin + sMax) / 2);
    const cz = y1 + uz * ((sMin + sMax) / 2);
    mesh.position.set(cx, (yMin + yMax) / 2, cz);
    mesh.rotation.y = yaw;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const edgesGeom = new THREE.EdgesGeometry(geom, 15);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0x1a2540,
      transparent: true,
      opacity: opaque ? 0.85 : Math.max(0.15, 1 - transparency * 1.2),
    });
    const edges = new THREE.LineSegments(edgesGeom, edgesMat);
    edges.position.copy(mesh.position);
    edges.rotation.copy(mesh.rotation);
    group.add(edges);
  };

  /** Pencere için cam panel. */
  const addGlass = (sMin: number, sMax: number, yMin: number, yMax: number) => {
    const segLen = sMax - sMin;
    const segH = yMax - yMin;
    if (segLen < 1e-3 || segH < 1e-3) return;
    const geom = new THREE.BoxGeometry(segLen, segH, thickness * 0.3);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xbcd4e6,
      transmission: 0.85,
      transparent: true,
      opacity: 0.55,
      roughness: 0.05,
      metalness: 0,
      envMapIntensity: 1.0,
      clearcoat: 0.5,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, glassMat);
    const cx = x1 + ux * ((sMin + sMax) / 2);
    const cz = y1 + uz * ((sMin + sMax) / 2);
    mesh.position.set(cx, (yMin + yMax) / 2, cz);
    mesh.rotation.y = yaw;
    group.add(mesh);

    // Pencere çerçevesi (kenar çizgisi)
    const edgesGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(segLen, segH, thickness));
    const edges = new THREE.LineSegments(
      edgesGeom,
      new THREE.LineBasicMaterial({ color: 0x334155 }),
    );
    edges.position.copy(mesh.position);
    edges.rotation.copy(mesh.rotation);
    group.add(edges);
  };

  // Açıklıkların [sMin, sMax] aralıklarını hesapla (metre cinsinden, duvar ekseninde)
  type Span = { sMin: number; sMax: number; op: WallOpening };
  const spans: Span[] = openings
    .map((op) => {
      const centerS = op.t * length;
      const halfW = (op.widthCm * scale) / 2;
      return {
        sMin: Math.max(0, centerS - halfW),
        sMax: Math.min(length, centerS + halfW),
        op,
      };
    })
    .filter((s) => s.sMax > s.sMin)
    .sort((a, b) => a.sMin - b.sMin);

  // Açıklıklar arası solid duvar parçalarını ekle (tam yükseklikte)
  let cursor = 0;
  for (const span of spans) {
    if (span.sMin > cursor) addSlab(cursor, span.sMin, 0, height);

    if (span.op.type === 'window') {
      // Alt (sill) — yerden pencere altına kadar
      addSlab(span.sMin, span.sMax, 0, windowSill);
      // Üst (lintel) — pencere üstünden tavana
      addSlab(span.sMin, span.sMax, windowTop, height);
      // Cam panel
      addGlass(span.sMin, span.sMax, windowSill, windowTop);
    } else {
      // door / double-door — sadece lento (kapı üstü) dolu, alt boş
      addSlab(span.sMin, span.sMax, doorHeight, height);
    }

    cursor = Math.max(cursor, span.sMax);
  }
  if (cursor < length) addSlab(cursor, length, 0, height);

  // Hiç açıklık yoksa ekstra bir şey yapmaya gerek yok — üstteki döngü tüm duvarı çizer

  return group;
}

/** Create a radial-gradient canvas texture used as the studio background. */
function createStudioBackground(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size / 1.2);
  grad.addColorStop(0, '#3b4b6b');
  grad.addColorStop(0.55, '#1e2a3f');
  grad.addColorStop(1, '#0b1220');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

