import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProjectStore, type ProductItem } from '../stores/projectStore';
import { useEquipmentStore, CATEGORIES, type EquipmentItem } from '../stores/equipmentStore';
import {
  RotateCw, Trash2, Copy, Undo2, Redo2,
  Grid3x3, Magnet, Flame, Droplets,
  Microwave, Waves, Table, Refrigerator,
  MousePointer2, Hand, Plus, Minus, Lock, Unlock,
  Package, ArrowLeft, Search, X, Heart, Zap, ChevronRight,
  Ruler, Euro, ExternalLink, Pen, RotateCcw,
  DoorOpen, AppWindow, FileDown, StickyNote, Loader2, Box
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { debouncedSyncFloorPlan, loadFloorPlan } from '../lib/gastroSync';

/* ─── Types ─── */
interface Point { x: number; y: number; }

interface Task {
  id: string;
  text: string;
  done: boolean;
  assignee: string;
  createdAt: string;
}

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

type RoomShape = 'rectangle' | 'polygon';

type OpeningType = 'door' | 'window' | 'double-door';

interface WallOpening {
  id: string;
  type: OpeningType;
  wallIndex: number;
  t: number;
  widthCm: number;
  swingDir: 1 | -1;
}

const ICON_MAP: Record<string, any> = {
  refrigerator: Refrigerator, flame: Flame, droplets: Droplets,
  microwave: Microwave, waves: Waves, table: Table,
};

const CATEGORY_COLORS: Record<string, string> = {
  cooking: '#fef2f2', cooling: '#eff6ff', dishwash: '#ecfeff', prep_hygiene: '#f9fafb',
  self_service: '#fffbeb', pizza_pasta: '#fef2f2', dynamic_prep: '#f5f3ff',
  cook_chill: '#ecfdf5', ventilation: '#f8fafc', bakery: '#fffbeb',
  trolley_gn: '#fafaf9', coffee_tea: '#fdf4e8', laundry: '#f5f3ff',
  ice_cream: '#fdf2f8', hospitality: '#ecfeff', cleaning_products: '#ecfdf5',
  spare_parts: '#f9fafb', cold: '#eff6ff', cleaning: '#ecfeff', neutral: '#f9fafb', other: '#f5f3ff',
};
const CATEGORY_BORDERS: Record<string, string> = {
  cooking: '#fca5a5', cooling: '#93c5fd', dishwash: '#67e8f9', prep_hygiene: '#d1d5db',
  self_service: '#fcd34d', pizza_pasta: '#fca5a5', dynamic_prep: '#c4b5fd',
  cook_chill: '#6ee7b7', ventilation: '#94a3b8', bakery: '#fcd34d',
  trolley_gn: '#a8a29e', coffee_tea: '#d97706', laundry: '#c4b5fd',
  ice_cream: '#f9a8d4', hospitality: '#67e8f9', cleaning_products: '#6ee7b7',
  spare_parts: '#d1d5db', cold: '#93c5fd', cleaning: '#67e8f9', neutral: '#d1d5db', other: '#c4b5fd',
};

const snapVal = (val: number, gridSize: number) => Math.round(val / gridSize) * gridSize;

/* ─── Geometry helpers ─── */
function polygonArea(pts: Point[]): number {
  if (pts.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

function polygonPerimeter(pts: Point[]): number {
  if (pts.length < 2) return 0;
  let perim = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const dx = pts[j].x - pts[i].x;
    const dy = pts[j].y - pts[i].y;
    perim += Math.sqrt(dx * dx + dy * dy);
  }
  return perim;
}

function polygonBounds(pts: Point[]): { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number } {
  if (pts.length === 0) return { minX: 0, minY: 0, maxX: 1000, maxY: 600, w: 1000, h: 600 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function polygonSVGPath(pts: Point[]): string {
  if (pts.length < 2) return '';
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
}

function distancePP(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/* ─── Signed area: >0 CW in SVG space (y-down), <0 CCW ─── */
function signedArea(pts: Point[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    s += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return s / 2;
}

/* ─── Offset polygon inward by `d` cm. Handles convex/concave via bisector miter. ─── */
function offsetPolygonInward(pts: Point[], d: number): Point[] {
  const n = pts.length;
  if (n < 3 || d <= 0) return pts.slice();
  // In SVG (y-down): CW winding => signed area > 0, inward normal is LEFT of edge dir.
  // CCW winding => signed area < 0, inward normal is RIGHT. We flip sign accordingly.
  const sign = signedArea(pts) > 0 ? 1 : -1;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const e1x = curr.x - prev.x, e1y = curr.y - prev.y;
    const e2x = next.x - curr.x, e2y = next.y - curr.y;
    const l1 = Math.hypot(e1x, e1y) || 1;
    const l2 = Math.hypot(e2x, e2y) || 1;
    // Left normals in SVG (y-down)
    const n1x = -e1y / l1, n1y = e1x / l1;
    const n2x = -e2y / l2, n2y = e2x / l2;
    let bx = n1x + n2x, by = n1y + n2y;
    const bl = Math.hypot(bx, by);
    let scale = 1;
    if (bl < 1e-6) {
      bx = n1x; by = n1y;
    } else {
      const dot = n1x * n2x + n1y * n2y;
      scale = 1 / Math.sqrt(Math.max(0.02, (1 + dot) / 2));
      bx /= bl; by /= bl;
    }
    out.push({ x: curr.x + bx * d * scale * sign, y: curr.y + by * d * scale * sign });
  }
  return out;
}

/* ─── AutoCAD-style rendering configuration ─── */
const CAD = {
  wallThicknessCm: 15,              // 15 cm wall thickness (masonry standard)
  wallOuterStroke: '#0f172a',       // near-black outer wall line
  wallInnerStroke: '#0f172a',       // near-black inner wall line
  wallOuterWidth: 2.2,              // outer line weight
  wallInnerWidth: 1.2,              // inner line weight
  hatchColor: '#334155',            // wall hatch line color
  dimColor: '#0f172a',              // dimension text & lines
  dimOffsetCm: 55,                  // distance of dim line from wall
  dimExtOvershootCm: 8,             // extension line overshoot past dim line
  dimExtGapCm: 6,                   // gap from wall to start of extension line
  gridMinorColor: '#e2e8f0',        // subtle minor grid
  gridMajorColor: '#cbd5e1',        // bold major grid (1m)
  gridMinorEvery: 10,               // 10 cm
  gridMajorEvery: 100,              // 1 m
  bgColor: '#fafafa',               // near-white engineering paper
  titleColor: '#0f172a',
};

/** Returns { wallIndex, t, dist } for the closest wall segment to point p */
function nearestWall(p: Point, polygon: Point[]): { wallIndex: number; t: number; dist: number; foot: Point } {
  let best = { wallIndex: 0, t: 0, dist: Infinity, foot: p };
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq < 1) continue;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
    const fx = a.x + t * dx;
    const fy = a.y + t * dy;
    const dist = Math.sqrt((p.x - fx) ** 2 + (p.y - fy) ** 2);
    if (dist < best.dist) {
      best = { wallIndex: i, t, dist, foot: { x: fx, y: fy } };
    }
  }
  return best;
}

/* ─── Clamp item position inside room bounds ─── */
function clampToRoom(
  x: number, y: number, itemW: number, itemH: number,
  roomShape: RoomShape, roomWidthCm: number, roomHeightCm: number,
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): { x: number; y: number } {
  if (roomShape === 'polygon') {
    const clamped_x = Math.max(bounds.minX, Math.min(bounds.maxX - itemW, x));
    const clamped_y = Math.max(bounds.minY, Math.min(bounds.maxY - itemH, y));
    return { x: clamped_x, y: clamped_y };
  }
  return {
    x: Math.max(0, Math.min(roomWidthCm - itemW, x)),
    y: Math.max(0, Math.min(roomHeightCm - itemH, y)),
  };
}

/* ─── Product Image Component ─── */
function ProductImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  if (error || !src) {
    return <div className={`bg-slate-100 flex items-center justify-center ${className}`}><Package size={20} className="text-slate-300" /></div>;
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setError(true)} className={`object-contain ${className}`} />;
}

/* ─── Editable wall dimension label ─── */
function WallLabel({ a, b, zoom, wallIndex, onLengthChange }: {
  a: Point; b: Point; zoom: number; wallIndex: number;
  onLengthChange?: (wallIndex: number, newLengthCm: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const len = distancePP(a, b);
  if (len < 30) return null;
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  const displayAngle = (angle > 90 || angle < -90) ? angle + 180 : angle;
  const lenM = (len / 100).toFixed(2);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onLengthChange) return;
    setInputVal(lenM);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSubmit = () => {
    const val = parseFloat(inputVal.replace(',', '.'));
    if (!isNaN(val) && val > 0 && onLengthChange) {
      onLengthChange(wallIndex, val * 100); // m → cm
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') setIsEditing(false);
  };

  if (isEditing) {
    return (
      <foreignObject x={mx - 35} y={my - 14} width={70} height={28} style={{ overflow: 'visible' }}>
        <div style={{ transform: `rotate(${displayAngle}deg)`, transformOrigin: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSubmit}
            style={{
              width: 68, height: 26, fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace',
              textAlign: 'center', border: '2px solid #1d4ed8', borderRadius: 4,
              background: '#eff6ff', color: '#1d4ed8', outline: 'none', padding: 0,
            }}
          />
        </div>
      </foreignObject>
    );
  }

  return (
    <g transform={`translate(${mx}, ${my}) rotate(${displayAngle})`}
       onClick={handleClick} style={{ cursor: onLengthChange ? 'pointer' : 'default' }}>
      <rect x={-28} y={-11} width={56} height={18} rx={4} fill="white" stroke={onLengthChange ? '#3b82f6' : '#94a3b8'} strokeWidth={onLengthChange ? 1 : 0.5} opacity={0.95} />
      <text textAnchor="middle" dominantBaseline="central" fontSize={Math.min(9, 9 / zoom)} fontWeight="bold" fill="#334155" fontFamily="monospace">
        {lenM}m
      </text>
      {onLengthChange && (
        <text textAnchor="middle" y={16} fontSize={Math.min(6, 6 / zoom)} fill="#3b82f6" fontFamily="sans-serif" opacity={0.7}>
          tiklayip degistir
        </text>
      )}
    </g>
  );
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

const DEFAULT_ROOM_PROPS: RoomProps = {
  name: '', height: '280', floor: '1', wallMaterial: '', floorMaterial: '', usageType: '', fireZone: '',
};

export default function DesignStudio({ manualMode = false }: { manualMode?: boolean }) {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { projects } = useProjectStore();
  const equipmentStore = useEquipmentStore();
  const canvasRef = useRef<HTMLDivElement>(null);

  const project = id ? projects.find(p => p.id === id) : null;
  const isProjectMode = !!project;
  const storageKey = id ? `2mc-floorplan-${id}` : '2mc-floorplan-global';

  // Load saved data
  const loadSaved = useCallback(() => {
    try {
      const s = localStorage.getItem(storageKey);
      if (s) return JSON.parse(s);
    } catch {}
    return null;
  }, [storageKey]);

  const saved = loadSaved();

  // Room shape state — always polygon (architectural mode)
  const [roomShape, setRoomShape] = useState<RoomShape>('polygon');
  const [roomWidthCm, setRoomWidthCm] = useState(saved?.roomWidthCm || project?.roomWidthCm || 1000);
  const [roomHeightCm, setRoomHeightCm] = useState(saved?.roomHeightCm || project?.roomHeightCm || 600);
  const [roomPolygon, setRoomPolygon] = useState<Point[]>(saved?.roomPolygon || []);
  const savedPolygonExists = (saved?.roomPolygon?.length ?? 0) >= 3;
  const [isDrawingRoom, setIsDrawingRoom] = useState(!savedPolygonExists);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
  const [draggingVertex, setDraggingVertex] = useState<number | null>(null);

  // Canvas state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize] = useState(10);
  const [activeTool, setActiveTool] = useState<'select' | 'pan' | 'draw'>(savedPolygonExists ? 'select' : 'draw');

  // Items on canvas
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>(saved?.items || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Wall openings (doors/windows)
  const [wallOpenings, setWallOpenings] = useState<WallOpening[]>(saved?.wallOpenings || []);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const [addOpeningMode, setAddOpeningMode] = useState<OpeningType | null>(null);

  // History
  const [history, setHistory] = useState<PlacedItem[][]>([saved?.items || []]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Right panel
  const [rightPanelTab, setRightPanelTab] = useState<'catalog' | 'properties' | 'notes' | 'info' | 'room'>(manualMode ? 'room' : 'catalog');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('');
  const [trayDragItem, setTrayDragItem] = useState<any>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [popupItem, setPopupItem] = useState<PlacedItem | null>(null);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [showMobileProps, setShowMobileProps] = useState(false);
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>(saved?.notes || '');
  const [roomProps, setRoomProps] = useState<RoomProps>(saved?.roomProps || DEFAULT_ROOM_PROPS);
  const [description, setDescription] = useState<string>(saved?.description || '');
  const [pricePerM2, setPricePerM2] = useState<number>(saved?.pricePerM2 || 0);
  const [tasks, setTasks] = useState<Task[]>(saved?.tasks || []);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [pdfExporting, setPdfExporting] = useState(false);

  const saveProject = () => {
    const projectId = id || 'global';
    debouncedSyncFloorPlan(projectId, {
      roomWidthCm,
      roomHeightCm,
      roomShape,
      roomPolygon,
      wallLengthsCm: [],
      placedItems,
      wallOpenings,
      roomProps,
      selectedItemId: selectedId,
      canvasState: { notes, description, pricePerM2, tasks, zoom, panOffset: { x: panOffset.x, y: panOffset.y } },
    });
    alert('Tasarım başarıyla kaydedildi!');
  };

  const canvasWrapRef = useRef<HTMLDivElement>(null);

  const selectedItem = placedItems.find(i => i.id === selectedId) || null;

  // Compute room bounds
  const bounds = useMemo(() => {
    if (roomShape === 'polygon' && roomPolygon.length >= 3) {
      return polygonBounds(roomPolygon);
    }
    return { minX: 0, minY: 0, maxX: roomWidthCm, maxY: roomHeightCm, w: roomWidthCm, h: roomHeightCm };
  }, [roomShape, roomPolygon, roomWidthCm, roomHeightCm]);

  // Room area in m2
  const roomAreaM2 = useMemo(() => {
    if (roomShape === 'polygon' && roomPolygon.length >= 3) {
      return (polygonArea(roomPolygon) / 10000).toFixed(1);
    }
    return ((roomWidthCm * roomHeightCm) / 10000).toFixed(1);
  }, [roomShape, roomPolygon, roomWidthCm, roomHeightCm]);

  const roomPerimeterM = useMemo(() => {
    if (roomShape === 'polygon' && roomPolygon.length >= 3) {
      return (polygonPerimeter(roomPolygon) / 100).toFixed(1);
    }
    return (((roomWidthCm + roomHeightCm) * 2) / 100).toFixed(1);
  }, [roomShape, roomPolygon, roomWidthCm, roomHeightCm]);

  // Canvas dimensions for rendering
  const canvasW = roomShape === 'polygon' && roomPolygon.length >= 3 ? bounds.w + 100 : roomWidthCm;
  const canvasH = roomShape === 'polygon' && roomPolygon.length >= 3 ? bounds.h + 100 : roomHeightCm;

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        items: placedItems,
        roomWidthCm,
        roomHeightCm,
        roomShape,
        roomPolygon,
        wallOpenings,
        notes,
        roomProps,
        description,
        pricePerM2,
        tasks,
      }));
    } catch {}
  }, [placedItems, roomWidthCm, roomHeightCm, roomShape, roomPolygon, wallOpenings, notes, roomProps, description, pricePerM2, tasks, storageKey]);

  // Auto-save to Supabase (debounced 2s)
  useEffect(() => {
    const projectId = id || 'global';
    debouncedSyncFloorPlan(projectId, {
      roomWidthCm,
      roomHeightCm,
      roomShape,
      roomPolygon,
      wallLengthsCm: [],
      placedItems,
      wallOpenings,
      roomProps,
      selectedItemId: selectedId,
      canvasState: { notes, description, pricePerM2, tasks, zoom, panOffset: { x: panOffset.x, y: panOffset.y } },
    });
  }, [placedItems, roomWidthCm, roomHeightCm, roomShape, roomPolygon, wallOpenings, roomProps, notes, description, pricePerM2, tasks, id, selectedId, zoom, panOffset]);

  // Load from Supabase on mount (fallback if localStorage empty)
  useEffect(() => {
    const projectId = id || 'global';
    loadFloorPlan(projectId).then((remote) => {
      if (!remote) return;
      // Only restore from Supabase if local has no data
      const localHasData = placedItems.length > 0 || roomPolygon.length >= 3;
      if (localHasData) return;
      if (remote.placedItems?.length > 0) setPlacedItems(remote.placedItems);
      if (remote.roomPolygon?.length >= 3) {
        setRoomPolygon(remote.roomPolygon);
        setIsDrawingRoom(false);
        setActiveTool('select');
      }
      if (remote.roomWidthCm) setRoomWidthCm(remote.roomWidthCm);
      if (remote.roomHeightCm) setRoomHeightCm(remote.roomHeightCm);
      if (remote.wallOpenings?.length > 0) setWallOpenings(remote.wallOpenings);
      if (remote.roomProps) setRoomProps(remote.roomProps);
      if (remote.canvasState?.notes) setNotes(remote.canvasState.notes);
      if (remote.canvasState?.description) setDescription(remote.canvasState.description);
      if (remote.canvasState?.tasks?.length > 0) setTasks(remote.canvasState.tasks);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Catalog items
  const getCatalogItems = useCallback(() => {
    let items = equipmentStore.allItems;
    if (showFavoritesOnly) items = items.filter(i => equipmentStore.favorites.includes(i.id));
    if (catalogCategory) items = items.filter(i => i.cat === catalogCategory);
    if (catalogSearch) {
      const q = catalogSearch.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q));
    }
    return items.slice(0, 60);
  }, [equipmentStore.allItems, equipmentStore.favorites, catalogCategory, catalogSearch, showFavoritesOnly]);
  const catalogItems = getCatalogItems();

  // Stats
  const totalKW = placedItems.reduce((sum, i) => sum + i.kw, 0);
  const totalPrice = placedItems.reduce((sum, i) => sum + (i.price || 0), 0);
  const totalItems = placedItems.length;
  const equipmentAreaM2 = (placedItems.reduce((sum, i) => sum + (i.width * i.height), 0) / 10000).toFixed(1);

  const formatPrice = (p: number) => p > 0 ? `€${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })}` : '';

  // History management
  const saveHistory = useCallback((items: PlacedItem[]) => {
    setHistory(prev => {
      const nh = prev.slice(0, historyIndex + 1);
      nh.push(JSON.parse(JSON.stringify(items)));
      return nh;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = () => { if (historyIndex > 0) { setHistoryIndex(historyIndex - 1); setPlacedItems(JSON.parse(JSON.stringify(history[historyIndex - 1]))); } };
  const redo = () => { if (historyIndex < history.length - 1) { setHistoryIndex(historyIndex + 1); setPlacedItems(JSON.parse(JSON.stringify(history[historyIndex + 1]))); } };

  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panOffset.x) / zoom,
      y: (e.clientY - rect.top - panOffset.y) / zoom,
    };
  }, [zoom, panOffset]);

  const getCanvasCoordsFromTouch = useCallback((touch: React.Touch) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left - panOffset.x) / zoom,
      y: (touch.clientY - rect.top - panOffset.y) / zoom,
    };
  }, [zoom, panOffset]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      // Drawing mode: add point on tap
      if (isDrawingRoom) {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        let px = (touch.clientX - rect.left - panOffset.x) / zoom;
        let py = (touch.clientY - rect.top - panOffset.y) / zoom;
        if (snapToGrid) { px = snapVal(px, gridSize); py = snapVal(py, gridSize); }
        // Close polygon if tapping near first point
        if (drawingPoints.length >= 3 && distancePP({ x: px, y: py }, drawingPoints[0]) < 30 / zoom) {
          finishDrawingRoom();
          return;
        }
        setDrawingPoints(prev => [...prev, { x: px, y: py }]);
        return;
      }
      setPanStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
      setIsPanning(true);
    }
  }, [panOffset, isDrawingRoom, drawingPoints, zoom, snapToGrid, gridSize]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && isPanning && !isDrawingRoom) {
      const touch = e.touches[0];
      setPanOffset({ x: touch.clientX - panStart.x, y: touch.clientY - panStart.y });
    }
  }, [isPanning, panStart, isDrawingRoom]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
  }, []);

  /* ─── Wall length editing ─── */
  const handleWallLengthChange = useCallback((wallIndex: number, newLengthCm: number) => {
    if (roomPolygon.length < 3 || newLengthCm < 10) return;
    const pts = [...roomPolygon];
    const aIdx = wallIndex;
    const bIdx = (wallIndex + 1) % pts.length;
    const a = pts[aIdx];
    const b = pts[bIdx];
    const currentLen = distancePP(a, b);
    if (currentLen < 1) return;

    // Direction vector from A to B
    const dx = (b.x - a.x) / currentLen;
    const dy = (b.y - a.y) / currentLen;

    // New position of B along same direction
    const newB = {
      x: Math.round(a.x + dx * newLengthCm),
      y: Math.round(a.y + dy * newLengthCm),
    };

    // Offset = how much B moved
    const offX = newB.x - b.x;
    const offY = newB.y - b.y;

    // Shift B and all subsequent vertices (up to but not including A) by the offset
    // This keeps the rest of the shape intact, just translated
    const n = pts.length;
    const newPts = pts.map((p, i) => {
      if (i === aIdx) return p; // A stays fixed
      // Check if i is "between" B and A (going forward from B)
      // i.e. i is in the chain: bIdx, bIdx+1, ..., aIdx-1
      let inChain = false;
      if (bIdx <= aIdx) {
        // Normal case: bIdx < aIdx, chain is [bIdx .. aIdx-1]
        // But if bIdx > aIdx (wrapping), chain wraps around
        inChain = i >= bIdx && i < aIdx; // won't happen since bIdx = aIdx+1 mod n, so bIdx > aIdx only when aIdx is last
      }
      // General wrap-safe check
      let idx = bIdx;
      while (idx !== aIdx) {
        if (i === idx) { inChain = true; break; }
        idx = (idx + 1) % n;
      }
      if (inChain) return { x: p.x + offX, y: p.y + offY };
      return p;
    });

    setRoomPolygon(newPts);
  }, [roomPolygon]);

  /* ─── Drawing mode handlers ─── */
  const startDrawingRoom = () => {
    setActiveTool('draw');
    setIsDrawingRoom(true);
    setDrawingPoints([]);
  };

  const finishDrawingRoom = () => {
    if (drawingPoints.length >= 3) {
      setRoomPolygon(drawingPoints);
      setRoomShape('polygon');
    }
    setIsDrawingRoom(false);
    setDrawingPoints([]);
    setActiveTool('select');
  };

  const cancelDrawingRoom = () => {
    setIsDrawingRoom(false);
    setDrawingPoints([]);
    setActiveTool('select');
  };

  const switchToRectangle = () => {
    setRoomShape('rectangle');
    setRoomPolygon([]);
    setActiveTool('select');
  };

  /* ─── Wall opening helpers ─── */
  const getOpeningPoint = useCallback((opening: WallOpening): { px: number; py: number; dx: number; dy: number } | null => {
    if (roomPolygon.length < 3) return null;
    const n = roomPolygon.length;
    const a = roomPolygon[opening.wallIndex];
    const b = roomPolygon[(opening.wallIndex + 1) % n];
    const wx = b.x - a.x;
    const wy = b.y - a.y;
    const wlen = Math.sqrt(wx * wx + wy * wy);
    if (wlen < 1) return null;
    return {
      px: a.x + opening.t * wx,
      py: a.y + opening.t * wy,
      dx: wx / wlen,
      dy: wy / wlen,
    };
  }, [roomPolygon]);

  /* ─── Canvas mouse handlers ─── */
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Opening placement mode
    if (addOpeningMode && roomPolygon.length >= 3) {
      const coords = getCanvasCoords(e);
      const nearest = nearestWall(coords, roomPolygon);
      if (nearest.dist < 40 / zoom) {
        const newOpening: WallOpening = {
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          type: addOpeningMode,
          wallIndex: nearest.wallIndex,
          t: nearest.t,
          widthCm: addOpeningMode === 'window' ? 100 : 90,
          swingDir: 1,
        };
        setWallOpenings(prev => [...prev, newOpening]);
        setSelectedOpeningId(newOpening.id);
        setAddOpeningMode(null);
      }
      return;
    }

    // Drawing mode: add point on click
    if (isDrawingRoom) {
      const coords = getCanvasCoords(e);
      let px = coords.x;
      let py = coords.y;
      if (snapToGrid) { px = snapVal(px, gridSize); py = snapVal(py, gridSize); }

      // Close polygon if clicking near first point
      if (drawingPoints.length >= 3 && distancePP({ x: px, y: py }, drawingPoints[0]) < 20 / zoom) {
        finishDrawingRoom();
        return;
      }

      setDrawingPoints(prev => [...prev, { x: px, y: py }]);
      return;
    }

    // Pan mode
    if (activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      e.preventDefault();
      return;
    }

    // Check if clicking a polygon vertex (for dragging/selecting)
    if (roomShape === 'polygon' && roomPolygon.length >= 3 && activeTool === 'select') {
      const coords = getCanvasCoords(e);
      for (let i = 0; i < roomPolygon.length; i++) {
        if (distancePP(coords, roomPolygon[i]) < 14 / zoom) {
          setDraggingVertex(i);
          setSelectedVertex(i);
          e.preventDefault();
          return;
        }
      }
      // Right-click on edge → insert vertex
      if (e.button === 2) {
        for (let i = 0; i < roomPolygon.length; i++) {
          const a = roomPolygon[i];
          const b = roomPolygon[(i + 1) % roomPolygon.length];
          const dx = b.x - a.x, dy = b.y - a.y;
          const lenSq = dx * dx + dy * dy;
          if (lenSq < 1) continue;
          const t = Math.max(0, Math.min(1, ((coords.x - a.x) * dx + (coords.y - a.y) * dy) / lenSq));
          const fx = a.x + t * dx, fy = a.y + t * dy;
          if (Math.sqrt((coords.x - fx) ** 2 + (coords.y - fy) ** 2) < 12 / zoom) {
            insertVertex(i);
            e.preventDefault();
            return;
          }
        }
      }
      setSelectedVertex(null);
    }

    // Check if clicking near an opening handle
    if (roomPolygon.length >= 3 && activeTool === 'select') {
      const coords = getCanvasCoords(e);
      for (const op of wallOpenings) {
        const pt = getOpeningPoint(op);
        if (pt && distancePP(coords, { x: pt.px, y: pt.py }) < 14 / zoom) {
          setSelectedOpeningId(op.id);
          setSelectedId(null);
          return;
        }
      }
      setSelectedOpeningId(null);
    }

    // Deselect
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('room-floor') || (e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).tagName === 'rect' || (e.target as HTMLElement).tagName === 'path') {
      setSelectedId(null);
      setPopupItem(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);

    // Track mouse for drawing preview
    if (isDrawingRoom) {
      let px = coords.x, py = coords.y;
      if (snapToGrid) { px = snapVal(px, gridSize); py = snapVal(py, gridSize); }
      setMousePos({ x: px, y: py });
      return;
    }

    // Dragging polygon vertex
    if (draggingVertex !== null) {
      let px = coords.x, py = coords.y;
      if (snapToGrid) { px = snapVal(px, gridSize); py = snapVal(py, gridSize); }
      // Snap to nearby vertex for merging
      const MERGE_DIST = 15 / zoom;
      let snapped = false;
      for (let i = 0; i < roomPolygon.length; i++) {
        if (i === draggingVertex) continue;
        if (distancePP({ x: px, y: py }, roomPolygon[i]) < MERGE_DIST) {
          px = roomPolygon[i].x;
          py = roomPolygon[i].y;
          snapped = true;
          break;
        }
      }
      setRoomPolygon(prev => prev.map((p, i) => i === draggingVertex ? { x: px, y: py } : p));
      return;
    }

    if (isPanning) {
      setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (draggingId) {
      let newX = coords.x - dragOffset.x;
      let newY = coords.y - dragOffset.y;
      if (snapToGrid) { newX = snapVal(newX, gridSize); newY = snapVal(newY, gridSize); }
      setPlacedItems(prev => prev.map(i => {
        if (i.id !== draggingId) return i;
        const clamped = clampToRoom(newX, newY, i.width, i.height, roomShape, roomWidthCm, roomHeightCm, bounds);
        return { ...i, x: clamped.x, y: clamped.y };
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingVertex !== null) {
      // Merge vertices that are on top of each other
      const MERGE_DIST = 15 / zoom;
      const draggedPt = roomPolygon[draggingVertex];
      let mergeTarget = -1;
      for (let i = 0; i < roomPolygon.length; i++) {
        if (i === draggingVertex) continue;
        if (distancePP(draggedPt, roomPolygon[i]) < MERGE_DIST) {
          mergeTarget = i;
          break;
        }
      }
      if (mergeTarget !== -1 && roomPolygon.length > 3) {
        // Remove the dragged vertex (merge it into target)
        setRoomPolygon(prev => prev.filter((_, i) => i !== draggingVertex));
      }
      setDraggingVertex(null);
      return;
    }
    if (draggingId) { saveHistory(placedItems); setDraggingId(null); }
    setIsPanning(false);
  };

  const handleItemMouseDown = (e: React.MouseEvent, item: PlacedItem) => {
    e.stopPropagation();
    setSelectedId(item.id);
    // Mobilde seçilen ürün panel'ini aç
    if (window.innerWidth < 1024) setShowMobileProps(true);
    if (item.locked) return;
    const coords = getCanvasCoords(e);
    setDragOffset({ x: coords.x - item.x, y: coords.y - item.y });
    setDraggingId(item.id);
  };

  const handleItemDoubleClick = (e: React.MouseEvent, item: PlacedItem) => {
    e.stopPropagation();
    setDraggingId(null);
    setPopupItem(item);
  };

  // Add from catalog
  const addEquipmentToFloorPlan = useCallback((eq: EquipmentItem) => {
    // Gerçek ölçüler: mm → cm, minimum 5cm (çok küçük ekipmanlar için)
    const widthCm = Math.max(5, Math.round(eq.l / 10));
    const heightCm = Math.max(5, Math.round(eq.w / 10));
    const centerX = roomShape === 'polygon' && roomPolygon.length >= 3 ? (bounds.minX + bounds.w / 2) : roomWidthCm / 2;
    const centerY = roomShape === 'polygon' && roomPolygon.length >= 3 ? (bounds.minY + bounds.h / 2) : roomHeightCm / 2;

    const newItem: PlacedItem = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      equipmentId: eq.id,
      name: eq.name,
      icon: CATEGORIES.find(c => c.id === eq.cat)?.icon || 'table',
      imageData: eq.img,
      x: centerX - widthCm / 2,
      y: centerY - heightCm / 2,
      width: widthCm, height: heightCm,
      rotation: 0, locked: false,
      category: eq.cat,
      color: CATEGORY_COLORS[eq.cat] || '#f9fafb',
      kw: eq.kw, price: eq.price, brand: eq.brand, desc: eq.desc,
    };
    const updated = [...placedItems, newItem];
    setPlacedItems(updated);
    setSelectedId(newItem.id);
    saveHistory(updated);
  }, [placedItems, roomWidthCm, roomHeightCm, roomShape, roomPolygon, bounds, saveHistory]);

  // Drop from catalog
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!trayDragItem) return;
    const coords = getCanvasCoords(e as any);
    const widthCm = Math.max(5, Math.round((trayDragItem.l || 700) / 10));
    const heightCm = Math.max(5, Math.round((trayDragItem.w || 700) / 10));
    let x = coords.x - widthCm / 2;
    let y = coords.y - heightCm / 2;
    if (snapToGrid) { x = snapVal(x, gridSize); y = snapVal(y, gridSize); }
    const clamped = clampToRoom(x, y, widthCm, heightCm, roomShape, roomWidthCm, roomHeightCm, bounds);
    x = clamped.x; y = clamped.y;

    const catKey = trayDragItem.cat || trayDragItem.category || 'neutral';
    const newItem: PlacedItem = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      equipmentId: trayDragItem.id || undefined,
      name: trayDragItem.name,
      icon: CATEGORIES.find(c => c.id === catKey)?.icon || trayDragItem.icon || 'table',
      imageData: trayDragItem.img || trayDragItem.imageData,
      x, y, width: widthCm, height: heightCm,
      rotation: 0, locked: false, category: catKey,
      color: CATEGORY_COLORS[catKey] || '#f9fafb',
      kw: trayDragItem.kw || 0, price: trayDragItem.price, brand: trayDragItem.brand, desc: trayDragItem.desc,
    };
    const updated = [...placedItems, newItem];
    setPlacedItems(updated);
    setSelectedId(newItem.id);
    saveHistory(updated);
    setTrayDragItem(null);
  };

  // Actions
  const rotateSelected = () => {
    if (!selectedId) return;
    const updated = placedItems.map(item =>
      item.id === selectedId && !item.locked ? { ...item, rotation: (item.rotation + 90) % 360, width: item.height, height: item.width } : item
    );
    setPlacedItems(updated);
    saveHistory(updated);
  };
  const deleteSelected = () => {
    if (!selectedId) return;
    setPlacedItems(prev => { const u = prev.filter(i => i.id !== selectedId); saveHistory(u); return u; });
    setSelectedId(null);
    setPopupItem(null);
  };
  const duplicateSelected = () => {
    if (!selectedId) return;
    const item = placedItems.find(i => i.id === selectedId);
    if (!item) return;
    const newItem = { ...item, id: Date.now().toString(), x: item.x + 20, y: item.y + 20 };
    const updated = [...placedItems, newItem];
    setPlacedItems(updated);
    setSelectedId(newItem.id);
    saveHistory(updated);
  };
  const toggleLockSelected = () => {
    if (!selectedId) return;
    setPlacedItems(prev => prev.map(i => i.id === selectedId ? { ...i, locked: !i.locked } : i));
  };

  const zoomIn = () => setZoom(z => Math.min(3, z + 0.1));
  const zoomOut = () => setZoom(z => Math.max(0.2, z - 0.1));
  const zoomFit = () => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const w = roomShape === 'polygon' && roomPolygon.length >= 3 ? bounds.w + 100 : roomWidthCm;
    const h = roomShape === 'polygon' && roomPolygon.length >= 3 ? bounds.h + 100 : roomHeightCm;
    const scaleX = (rect.width - 80) / Math.max(w, 200);
    const scaleY = (rect.height - 80) / Math.max(h, 200);
    const newZoom = Math.min(scaleX, scaleY, 1.5);
    setZoom(newZoom);
    const offX = roomShape === 'polygon' && roomPolygon.length >= 3 ? bounds.minX - 50 : 0;
    const offY = roomShape === 'polygon' && roomPolygon.length >= 3 ? bounds.minY - 50 : 0;
    setPanOffset({
      x: (rect.width - w * newZoom) / 2 - offX * newZoom,
      y: (rect.height - h * newZoom) / 2 - offY * newZoom,
    });
  };

  useEffect(() => {
    const t = setTimeout(zoomFit, 300);
    window.addEventListener('resize', zoomFit);
    return () => { clearTimeout(t); window.removeEventListener('resize', zoomFit); };
  }, []);

  /* ─── Vertex operations ─── */
  const deleteVertex = useCallback((idx: number) => {
    if (roomPolygon.length <= 3) return; // minimum 3 vertices
    const newPts = roomPolygon.filter((_, i) => i !== idx);
    setRoomPolygon(newPts);
    setSelectedVertex(null);
  }, [roomPolygon]);

  // Insert a new vertex on the edge between idx and idx+1
  const insertVertex = useCallback((edgeIdx: number) => {
    const a = roomPolygon[edgeIdx];
    const b = roomPolygon[(edgeIdx + 1) % roomPolygon.length];
    const mid = { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
    const newPts = [...roomPolygon];
    newPts.splice(edgeIdx + 1, 0, mid);
    setRoomPolygon(newPts);
    setSelectedVertex(edgeIdx + 1);
  }, [roomPolygon]);

  /* ─── PDF export ─── */
  const exportFloorPlanPDF = useCallback(async () => {
    if (!canvasWrapRef.current) return;
    setPdfExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(canvasWrapRef.current, {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#f1f5f9',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const { ensurePdfFont } = await import('../lib/pdfFont');
      const FONT = await ensurePdfFont(doc); // Unicode font so Turkish/German render correctly
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      // Hologram watermark
      const { drawPdfHologram } = await import('../lib/pdfWatermark');
      await drawPdfHologram(doc, pageW, pageH);
      // Header
      doc.setFillColor(147, 19, 21);
      doc.rect(0, 0, pageW, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont(FONT, 'bold');
      doc.text(`2MC Gastro — Kat Planı${project ? ': ' + project.name : ''}`, 8, 8);
      doc.text(new Date().toLocaleDateString('tr-TR'), pageW - 8, 8, { align: 'right' });
      // Canvas image
      const imgH = (canvas.height * (pageW - 16)) / canvas.width;
      const startY = 14;
      doc.addImage(imgData, 'PNG', 8, startY, pageW - 16, Math.min(imgH, pageH - startY - 16));
      // Footer info
      const footerY = pageH - 8;
      doc.setFillColor(248, 250, 252);
      doc.rect(0, footerY - 5, pageW, 13, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont(FONT, 'normal');
      doc.text(`Alan: ${roomAreaM2}m²  |  Çevre: ${roomPerimeterM}m  |  Ekipman: ${totalItems}  |  Güç: ${totalKW.toFixed(1)}kW${totalPrice > 0 ? '  |  Toplam: €' + totalPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 }) : ''}`, 8, footerY);
      if (notes) {
        const noteText = notes.length > 120 ? notes.substring(0, 120) + '...' : notes;
        doc.text(`Not: ${noteText}`, 8, footerY + 4);
      }
      doc.save(`KatPlani_${project?.name || 'Plan'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setPdfExporting(false);
    }
  }, [project, roomAreaM2, roomPerimeterM, totalItems, totalKW, totalPrice, notes]);

  // Listen for floorPlanItemId from catalog
  useEffect(() => {
    const itemId = equipmentStore.floorPlanItemId;
    if (itemId) {
      const eq = equipmentStore.getItemById(itemId);
      if (eq) addEquipmentToFloorPlan(eq);
      equipmentStore.setFloorPlanItem(null);
    }
  }, [equipmentStore.floorPlanItemId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isDrawingRoom) {
        if (e.key === 'Escape') cancelDrawingRoom();
        if (e.key === 'Enter') finishDrawingRoom();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if (e.key === 'r' && !e.ctrlKey) rotateSelected();
      if (e.key === 'd' && e.ctrlKey) { e.preventDefault(); duplicateSelected(); }
      if (e.key === 'z' && e.ctrlKey) { e.preventDefault(); undo(); }
      if (e.key === 'y' && e.ctrlKey) { e.preventDefault(); redo(); }
      if (e.key === 'Escape') { setSelectedId(null); setPopupItem(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, placedItems, historyIndex, isDrawingRoom, drawingPoints]);

  /* ─── Render ─── */
  const renderSVGWidth = roomShape === 'polygon' && roomPolygon.length >= 3 ? bounds.maxX + 50 : roomWidthCm;
  const renderSVGHeight = roomShape === 'polygon' && roomPolygon.length >= 3 ? bounds.maxY + 50 : roomHeightCm;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#f9f9ff] font-body text-[#121c2c]">
      <style>{`
        .blueprint-grid {
          background-size: 20px 20px;
          background-image: radial-gradient(circle, #c4c6cf 1px, transparent 1px);
        }
        .canvas-container {
          box-shadow: inset 0 0 100px rgba(0,32,69,0.03);
        }
      `}</style>

      {/* TopAppBar — Updated to match demo style */}
      <header className="w-full bg-white border-b border-[#d9e3f9] shadow-sm z-40 shrink-0">
        <div className="flex justify-between items-center px-4 md:px-6 py-3">
          <div className="flex items-center gap-4">
            <Link to={id ? `/projects/${id}` : "/welcome"} className="p-2 text-[#002045] hover:bg-[#dee8ff] rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-[#43474e] font-bold">Proje Durumu</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ffb783] shadow-[0_0_8px_#ffb783]"></span>
                <span className="text-sm font-semibold text-[#002045] truncate max-w-[200px]">
                  {id ? `${project?.name || 'Düzenleniyor'}` : 'Yeni Mutfak Tasarımı'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden lg:flex bg-[#dee8ff] rounded-lg p-1 gap-1">
              <button className="px-4 py-1.5 rounded-md bg-white shadow-sm text-xs font-bold text-[#002045] flex items-center gap-2 transition-all">
                <Grid3x3 size={14} /> 2D
              </button>
              <button 
                onClick={() => navigate(id ? `/projects/${id}/design/3d` : '/design/3d')}
                className="px-4 py-1.5 rounded-md text-xs font-bold text-[#43474e] hover:bg-white/50 transition-all flex items-center gap-2"
              >
                <Box size={14} /> 3D
              </button>
            </div>

            <div className="w-[1px] h-6 bg-[#d9e3f9] mx-1 hidden md:block" />

            <div className="flex items-center gap-1">
              <button onClick={undo} className="p-2 text-[#43474e] hover:bg-[#dee8ff] rounded-lg transition-colors" title="Geri Al"><Undo2 size={18} /></button>
              <button onClick={redo} className="p-2 text-[#43474e] hover:bg-[#dee8ff] rounded-lg transition-colors" title="İleri Al"><Redo2 size={18} /></button>
            </div>

            <div className="w-[1px] h-6 bg-[#d9e3f9] mx-1 hidden md:block" />

            <button
              onClick={saveProject}
              className="bg-[#d5e0f7] text-[#002045] px-4 md:px-6 py-2 rounded-lg text-xs font-bold hover:bg-[#002045] hover:text-white transition-all active:scale-95 uppercase tracking-wider shadow-sm"
            >
              {id ? 'Güncelle' : 'Kaydet'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 relative flex flex-col overflow-hidden blueprint-grid canvas-container">
        
        {/* Floating Toolbar (Left) — Updated to match demo style */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-30">
          <div className="bg-[#1a365d] p-2 rounded-2xl flex flex-col gap-4 shadow-2xl border border-white/10">
            <button 
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                activeTool === 'select' ? 'bg-[#ffb783] text-[#371800] shadow-lg' : 'text-white/70 hover:bg-white/10'
              }`}
              onClick={() => { setActiveTool('select'); cancelDrawingRoom(); }}
              title="Seç / Taşı (V)"
            >
              <MousePointer2 size={22} />
            </button>
            <button 
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                activeTool === 'pan' ? 'bg-[#ffb783] text-[#371800] shadow-lg' : 'text-white/70 hover:bg-white/10'
              }`}
              onClick={() => { setActiveTool('pan'); cancelDrawingRoom(); }}
              title="Kaydır (H)"
            >
              <Hand size={22} />
            </button>
            <div className="h-[1px] bg-white/10 mx-2" />
            <button 
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                activeTool === 'draw' ? 'bg-[#ffb783] text-[#371800] shadow-lg' : 'text-white/70 hover:bg-white/10'
              }`}
              onClick={startDrawingRoom}
              title="Duvar Çiz (W)"
            >
              <Pen size={20} />
            </button>
            <button 
              className="w-11 h-11 rounded-xl text-white/70 hover:bg-white/10 flex items-center justify-center transition-colors"
              title="Ölçüm Aracı"
            >
              <Ruler size={20} />
            </button>
            <div className="h-[1px] bg-white/10 mx-2" />
            <button 
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                showGrid ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'
              }`}
              onClick={() => setShowGrid(!showGrid)}
              title="Izgarayı Göster"
            >
              <Grid3x3 size={20} />
            </button>
            <button 
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                snapToGrid ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'
              }`}
              onClick={() => setSnapToGrid(!snapToGrid)}
              title="Mıknatıs Modu"
            >
              <Magnet size={20} />
            </button>
          </div>
        </div>

        {/* Catalog Trigger & Bottom Sheet (Mobile) / Compact Tray (Desktop) */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-[60%] lg:w-[50%] z-30 transition-all">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,32,69,0.15)] border border-[#d9e3f9] p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold text-[#002045] uppercase tracking-widest flex items-center gap-2">
                <Package size={14} className="text-[#ffb783]" />
                Aktif Ekipman Kataloğu
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowMobilePanel(!showMobilePanel)}
                  className="text-[10px] font-bold text-[#43474e] hover:text-[#002045] flex items-center gap-1 transition-colors"
                >
                  Tümünü Gör <ChevronRight size={14} />
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
              {equipmentStore.allItems.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('equipmentId', item.id); }}
                  className="min-w-[100px] bg-[#f0f3ff] rounded-xl p-2 flex flex-col gap-1.5 cursor-grab active:cursor-grabbing hover:bg-[#dee8ff] transition-all group/card"
                >
                  <div className="aspect-square bg-white rounded-lg p-1.5 relative overflow-hidden flex items-center justify-center shadow-sm">
                    <img src={item.img} alt="" className="w-full h-full object-contain group-hover/card:scale-110 transition-transform" />
                  </div>
                  <p className="text-[9px] font-bold text-[#002045] truncate px-0.5">{item.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas Area Container */}
        <div ref={canvasWrapRef} className="flex-1 overflow-hidden relative flex flex-col">
          <div
            ref={canvasRef}
            className="flex-1 overflow-hidden relative"

          style={{
            cursor: isDrawingRoom ? 'crosshair' : activeTool === 'pan' || isPanning ? 'grab' : draggingVertex !== null ? 'move' : 'default',
            background: manualMode ? CAD.bgColor : '#ffffff',
            backgroundImage: manualMode
              ? 'none'
              : 'radial-gradient(circle, #c4c6cf 1px, transparent 1px)',
            backgroundSize: manualMode ? 'auto' : '20px 20px',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Drawing guide overlay */}
          {isDrawingRoom && drawingPoints.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="bg-emerald-600/90 text-white text-sm font-bold px-6 py-3 rounded-2xl shadow-xl text-center max-w-xs">
                Tuvale tıklayarak oda köşelerini çizin.<br />
                <span className="text-emerald-200 text-xs font-normal">Enter ile tamamlayın • Esc ile iptal edin</span>
              </div>
            </div>
          )}

          {/* Add opening mode overlay */}
          {addOpeningMode && (
            <div className="absolute inset-0 flex items-start justify-center pt-4 pointer-events-none z-10">
              <div className="bg-blue-600/90 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2">
                {addOpeningMode === 'door' ? <DoorOpen size={16} /> : <AppWindow size={16} />}
                {addOpeningMode === 'door' ? 'Kapı' : addOpeningMode === 'double-door' ? 'Çift Kanat Kapı' : 'Pencere'} eklemek için bir duvara tıklayın
                <button className="pointer-events-auto ml-2 text-blue-200 hover:text-white" onClick={() => setAddOpeningMode(null)}><X size={14} /></button>
              </div>
            </div>
          )}

          {/* Area info overlay — top-left of canvas */}
          {roomPolygon.length >= 3 && (
            <div className="absolute top-3 left-3 z-20 bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-slate-200 px-3 py-2 flex items-center gap-4 pointer-events-none text-xs font-bold">
              <div className="flex items-center gap-1.5 text-primary">
                <Ruler size={13} />
                <span>{roomAreaM2} m²</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="text-slate-500">Çevre: {roomPerimeterM} m</div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="text-slate-500">{roomPolygon.length} köşe</div>
              {selectedVertex !== null && (
                <>
                  <div className="w-px h-4 bg-slate-200" />
                  <div className="text-[#DC2626]">Nokta {selectedVertex + 1} seçili</div>
                </>
              )}
            </div>
          )}

          <div style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`, transformOrigin: '0 0', position: 'absolute', willChange: 'transform' }}>
            <svg width={renderSVGWidth} height={renderSVGHeight} className="overflow-visible">

              {/* Global SVG patterns (grid + wall hatch) */}
              <defs>
                {/* Minor + major grid (AutoCAD engineering style) */}
                <pattern id="cadMinorGrid" width={CAD.gridMinorEvery} height={CAD.gridMinorEvery} patternUnits="userSpaceOnUse">
                  <path d={`M ${CAD.gridMinorEvery} 0 L 0 0 0 ${CAD.gridMinorEvery}`} fill="none" stroke={CAD.gridMinorColor} strokeWidth="0.4" />
                </pattern>
                <pattern id="cadMajorGrid" width={CAD.gridMajorEvery} height={CAD.gridMajorEvery} patternUnits="userSpaceOnUse">
                  <rect width={CAD.gridMajorEvery} height={CAD.gridMajorEvery} fill="url(#cadMinorGrid)" />
                  <path d={`M ${CAD.gridMajorEvery} 0 L 0 0 0 ${CAD.gridMajorEvery}`} fill="none" stroke={CAD.gridMajorColor} strokeWidth="0.9" />
                </pattern>
                {/* Legacy grid (non-manual) */}
                <pattern id="sGrid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                  <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
                <pattern id="bGrid" width={gridSize * 10} height={gridSize * 10} patternUnits="userSpaceOnUse">
                  <rect width={gridSize * 10} height={gridSize * 10} fill="url(#sGrid)" />
                  <path d={`M ${gridSize * 10} 0 L 0 0 0 ${gridSize * 10}`} fill="none" stroke="#cbd5e1" strokeWidth="1" />
                </pattern>
                {/* Wall hatch pattern (45° diagonal, masonry style) */}
                <pattern id="wallHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="6" stroke={CAD.hatchColor} strokeWidth="0.6" />
                </pattern>
                {/* Dimension arrow/tick markers */}
                <marker id="dimTick" viewBox="-5 -5 10 10" refX="0" refY="0" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
                  <line x1="-3" y1="-3" x2="3" y2="3" stroke={CAD.dimColor} strokeWidth="1.2" />
                </marker>
              </defs>

              {/* Grid */}
              {showGrid && (
                manualMode ? (
                  <>
                    <rect x={-500} y={-500} width={renderSVGWidth + 1000} height={renderSVGHeight + 1000} fill="url(#cadMajorGrid)" />
                    {/* X / Y origin axes */}
                    <line x1={-500} y1={0} x2={renderSVGWidth + 500} y2={0} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="4 3" />
                    <line x1={0} y1={-500} x2={0} y2={renderSVGHeight + 500} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="4 3" />
                    {/* Origin marker */}
                    <g>
                      <circle cx={0} cy={0} r={3} fill="#ef4444" />
                      <text x={6} y={-6} fontSize={10} fontFamily="monospace" fontWeight="bold" fill="#ef4444">0,0</text>
                    </g>
                  </>
                ) : (
                  <rect x={-500} y={-500} width={renderSVGWidth + 1000} height={renderSVGHeight + 1000} fill="url(#bGrid)" />
                )
              )}

              {/* Room shape — architectural polygon */}
              {roomPolygon.length >= 3 && (
                <>
                  {manualMode ? (() => {
                    const innerPoly = offsetPolygonInward(roomPolygon, CAD.wallThicknessCm);
                    const outerPath = polygonSVGPath(roomPolygon);
                    const innerPath = polygonSVGPath(innerPoly);
                    const sign = signedArea(roomPolygon) > 0 ? 1 : -1;
                    return (
                      <g className="cad-walls">
                        {/* Interior floor (inside the inner polygon) */}
                        <path d={innerPath} fill="#ffffff" stroke="none" />
                        {/* Wall band = outer polygon minus inner polygon (even-odd fill) */}
                        <path
                          d={`${outerPath} ${innerPath}`}
                          fill="url(#wallHatch)"
                          stroke="none"
                          fillRule="evenodd"
                        />
                        {/* Outer wall line (thicker) */}
                        <path d={outerPath} fill="none" stroke={CAD.wallOuterStroke} strokeWidth={CAD.wallOuterWidth} strokeLinejoin="miter" />
                        {/* Inner wall line (thinner) */}
                        <path d={innerPath} fill="none" stroke={CAD.wallInnerStroke} strokeWidth={CAD.wallInnerWidth} strokeLinejoin="miter" />
                        {/* External architectural dimensions (extension lines + dim line + tick marks + text) */}
                        {roomPolygon.map((p, i) => {
                          const next = roomPolygon[(i + 1) % roomPolygon.length];
                          const dx = next.x - p.x;
                          const dy = next.y - p.y;
                          const len = Math.hypot(dx, dy);
                          if (len < 30) return null;
                          const ux = dx / len, uy = dy / len;
                          // Outward normal (opposite of inward)
                          const nx = -(-uy) * sign;
                          const ny = -(ux) * sign;
                          const off = CAD.dimOffsetCm;
                          const gap = CAD.dimExtGapCm;
                          const over = CAD.dimExtOvershootCm;
                          // Extension line start points (offset slightly away from wall to not overlap)
                          const a1 = { x: p.x + nx * gap, y: p.y + ny * gap };
                          const a2 = { x: p.x + nx * (off + over), y: p.y + ny * (off + over) };
                          const b1 = { x: next.x + nx * gap, y: next.y + ny * gap };
                          const b2 = { x: next.x + nx * (off + over), y: next.y + ny * (off + over) };
                          // Dimension line endpoints
                          const da = { x: p.x + nx * off, y: p.y + ny * off };
                          const db = { x: next.x + nx * off, y: next.y + ny * off };
                          // Mid-point for text
                          const mx = (da.x + db.x) / 2;
                          const my = (da.y + db.y) / 2;
                          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                          const textAngle = (angle > 90 || angle < -90) ? angle + 180 : angle;
                          const lenM = (len / 100).toFixed(2);
                          return (
                            <g key={`dim-${i}`} className="cad-dim" style={{ pointerEvents: 'none' }}>
                              {/* Extension lines */}
                              <line x1={a1.x} y1={a1.y} x2={a2.x} y2={a2.y} stroke={CAD.dimColor} strokeWidth="0.6" />
                              <line x1={b1.x} y1={b1.y} x2={b2.x} y2={b2.y} stroke={CAD.dimColor} strokeWidth="0.6" />
                              {/* Dimension line */}
                              <line x1={da.x} y1={da.y} x2={db.x} y2={db.y} stroke={CAD.dimColor} strokeWidth="0.9" />
                              {/* Architectural 45° tick marks at endpoints */}
                              {(() => {
                                const tick = 5;
                                const tx = (ux + nx) * tick;
                                const ty = (uy + ny) * tick;
                                return (
                                  <>
                                    <line x1={da.x - tx} y1={da.y - ty} x2={da.x + tx} y2={da.y + ty} stroke={CAD.dimColor} strokeWidth="1.2" />
                                    <line x1={db.x - tx} y1={db.y - ty} x2={db.x + tx} y2={db.y + ty} stroke={CAD.dimColor} strokeWidth="1.2" />
                                  </>
                                );
                              })()}
                              {/* Dimension text (above the line, architectural convention) */}
                              <g transform={`translate(${mx}, ${my}) rotate(${textAngle})`}>
                                <rect x={-22} y={-10} width={44} height={13} rx={1} fill={CAD.bgColor} stroke="none" />
                                <text textAnchor="middle" dominantBaseline="central" y={-3.5} fontSize={9} fontWeight="bold" fontFamily="'Consolas','Courier New',monospace" fill={CAD.dimColor}>
                                  {lenM} m
                                </text>
                              </g>
                            </g>
                          );
                        })}
                      </g>
                    );
                  })() : (
                    <path d={polygonSVGPath(roomPolygon)} fill="#ffffff" stroke="#334155" strokeWidth={3} className="room-floor" />
                  )}
                  {/* Wall dimension labels (non-manual mode only; manualMode has its own CAD dims) */}
                  {!manualMode && roomPolygon.map((p, i) => {
                    const next = roomPolygon[(i + 1) % roomPolygon.length];
                    return <WallLabel key={`wall-${i}`} a={p} b={next} zoom={zoom} wallIndex={i} onLengthChange={handleWallLengthChange} />;
                  })}
                  {/* Editable wall length pill (manual mode) — small clickable pill near dim line */}
                  {manualMode && roomPolygon.map((p, i) => {
                    const next = roomPolygon[(i + 1) % roomPolygon.length];
                    return <WallLabel key={`wlabel-${i}`} a={p} b={next} zoom={zoom} wallIndex={i} onLengthChange={handleWallLengthChange} />;
                  })}
                  {/* Midpoint "+" handles to insert new vertex */}
                  {!isDrawingRoom && roomPolygon.map((p, i) => {
                    const next = roomPolygon[(i + 1) % roomPolygon.length];
                    const mx = (p.x + next.x) / 2;
                    const my = (p.y + next.y) / 2;
                    const edgeLen = distancePP(p, next);
                    if (edgeLen < 60) return null;
                    return (
                      <g key={`mp-${i}`} style={{ cursor: 'copy' }} onClick={(e) => { e.stopPropagation(); insertVertex(i); }}>
                        <circle cx={mx} cy={my} r={5 / zoom} fill="#ffffff" stroke="#10b981" strokeWidth={1.5 / zoom} opacity={0.8} />
                        <line x1={mx - 3 / zoom} y1={my} x2={mx + 3 / zoom} y2={my} stroke="#10b981" strokeWidth={1.5 / zoom} />
                        <line x1={mx} y1={my - 3 / zoom} x2={mx} y2={my + 3 / zoom} stroke="#10b981" strokeWidth={1.5 / zoom} />
                      </g>
                    );
                  })}
                  {/* Vertex handles (draggable, selectable, deletable) */}
                  {!isDrawingRoom && roomPolygon.map((p, i) => {
                    const isVSel = selectedVertex === i;
                    return (
                      <g key={`v-${i}`}>
                        <circle
                          cx={p.x} cy={p.y} r={7 / zoom}
                          fill={isVSel ? '#1d4ed8' : draggingVertex === i ? '#3b82f6' : '#ffffff'}
                          stroke={isVSel ? '#1d4ed8' : '#3b82f6'}
                          strokeWidth={2 / zoom}
                          style={{ cursor: 'move' }}
                          onMouseDown={(e) => { e.stopPropagation(); setDraggingVertex(i); setSelectedVertex(i); }}
                          onDoubleClick={(e) => { e.stopPropagation(); deleteVertex(i); }}
                        />
                        <text cx={p.x} cy={p.y} textAnchor="middle" dominantBaseline="central"
                          fontSize={6 / zoom} fill={isVSel ? 'white' : '#3b82f6'} fontWeight="bold" style={{ pointerEvents: 'none' }}>
                          {i + 1}
                        </text>
                        {/* Delete button when vertex is selected */}
                        {isVSel && roomPolygon.length > 3 && (
                          <g transform={`translate(${p.x + 12 / zoom}, ${p.y - 12 / zoom})`} style={{ cursor: 'pointer' }}
                            onClick={(e) => { e.stopPropagation(); deleteVertex(i); }}>
                            <circle r={7 / zoom} fill="#ef4444" stroke="white" strokeWidth={1.5 / zoom} />
                            <line x1={-3 / zoom} y1={-3 / zoom} x2={3 / zoom} y2={3 / zoom} stroke="white" strokeWidth={1.5 / zoom} />
                            <line x1={3 / zoom} y1={-3 / zoom} x2={-3 / zoom} y2={3 / zoom} stroke="white" strokeWidth={1.5 / zoom} />
                          </g>
                        )}
                      </g>
                    );
                  })}
                </>
              )}

              {/* ─── Wall Openings (doors/windows) ─── */}
              {roomPolygon.length >= 3 && wallOpenings.map((op) => {
                const pt = getOpeningPoint(op);
                if (!pt) return null;
                const { px, py, dx, dy } = pt;
                const hw = op.widthCm / 2;
                const nx = -dy;
                const ny = dx;
                const isSelected = selectedOpeningId === op.id;
                const ax = px - dx * hw;
                const ay = py - dy * hw;
                const bx = px + dx * hw;
                const by = py + dy * hw;

                return (
                  <g key={op.id} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSelectedOpeningId(op.id); setSelectedId(null); }}>
                    {/* White gap over wall */}
                    <line x1={ax} y1={ay} x2={bx} y2={by} stroke="white" strokeWidth={6} />

                    {op.type === 'door' && (
                      <>
                        {/* Door leaf line */}
                        <line x1={ax} y1={ay} x2={ax + nx * op.widthCm * op.swingDir} y2={ay + ny * op.widthCm * op.swingDir} stroke={isSelected ? '#1d4ed8' : '#475569'} strokeWidth={2} />
                        {/* Swing arc */}
                        <path
                          d={`M ${ax} ${ay} A ${op.widthCm} ${op.widthCm} 0 0 ${op.swingDir === 1 ? 1 : 0} ${ax + nx * op.widthCm * op.swingDir} ${ay + ny * op.widthCm * op.swingDir}`}
                          fill="none" stroke={isSelected ? '#3b82f6' : '#94a3b8'} strokeWidth={1.5} strokeDasharray="4 2"
                        />
                        {/* Door frame lines */}
                        <line x1={ax} y1={ay} x2={ax + nx * 4} y2={ay + ny * 4} stroke={isSelected ? '#1d4ed8' : '#475569'} strokeWidth={2} />
                        <line x1={bx} y1={by} x2={bx + nx * 4} y2={by + ny * 4} stroke={isSelected ? '#1d4ed8' : '#475569'} strokeWidth={2} />
                      </>
                    )}

                    {op.type === 'double-door' && (
                      <>
                        {/* Left door */}
                        <line x1={px} y1={py} x2={px - dx * hw + nx * hw} y2={py - dy * hw + ny * hw} stroke={isSelected ? '#1d4ed8' : '#475569'} strokeWidth={2} />
                        <path d={`M ${px} ${py} A ${hw} ${hw} 0 0 0 ${px - dx * hw + nx * hw} ${py - dy * hw + ny * hw}`} fill="none" stroke={isSelected ? '#3b82f6' : '#94a3b8'} strokeWidth={1.5} strokeDasharray="4 2" />
                        {/* Right door */}
                        <line x1={px} y1={py} x2={px + dx * hw + nx * hw} y2={py + dy * hw + ny * hw} stroke={isSelected ? '#1d4ed8' : '#475569'} strokeWidth={2} />
                        <path d={`M ${px} ${py} A ${hw} ${hw} 0 0 1 ${px + dx * hw + nx * hw} ${py + dy * hw + ny * hw}`} fill="none" stroke={isSelected ? '#3b82f6' : '#94a3b8'} strokeWidth={1.5} strokeDasharray="4 2" />
                        {/* Frame lines */}
                        <line x1={ax} y1={ay} x2={ax + nx * 4} y2={ay + ny * 4} stroke={isSelected ? '#1d4ed8' : '#475569'} strokeWidth={2} />
                        <line x1={bx} y1={by} x2={bx + nx * 4} y2={by + ny * 4} stroke={isSelected ? '#1d4ed8' : '#475569'} strokeWidth={2} />
                      </>
                    )}

                    {op.type === 'window' && (
                      <>
                        {/* Double parallel lines */}
                        <line x1={ax} y1={ay} x2={bx} y2={by} stroke={isSelected ? '#1d4ed8' : '#475569'} strokeWidth={2} />
                        <line x1={ax + nx * 5} y1={ay + ny * 5} x2={bx + nx * 5} y2={by + ny * 5} stroke={isSelected ? '#3b82f6' : '#64748b'} strokeWidth={2} />
                        {/* Frame ends */}
                        <line x1={ax} y1={ay} x2={ax + nx * 5} y2={ay + ny * 5} stroke={isSelected ? '#1d4ed8' : '#475569'} strokeWidth={2} />
                        <line x1={bx} y1={by} x2={bx + nx * 5} y2={by + ny * 5} stroke={isSelected ? '#1d4ed8' : '#475569'} strokeWidth={2} />
                      </>
                    )}

                    {/* Selection handle circle */}
                    <circle cx={px} cy={py} r={6 / zoom} fill={isSelected ? '#1d4ed8' : '#f8fafc'} stroke={isSelected ? '#1d4ed8' : '#94a3b8'} strokeWidth={1.5 / zoom} />

                    {/* Delete X when selected */}
                    {isSelected && (
                      <g transform={`translate(${px + 10 / zoom}, ${py - 10 / zoom})`} style={{ cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); setWallOpenings(prev => prev.filter(o => o.id !== op.id)); setSelectedOpeningId(null); }}>
                        <circle r={7 / zoom} fill="#ef4444" stroke="white" strokeWidth={1.5 / zoom} />
                        <line x1={-3 / zoom} y1={-3 / zoom} x2={3 / zoom} y2={3 / zoom} stroke="white" strokeWidth={1.5 / zoom} />
                        <line x1={3 / zoom} y1={-3 / zoom} x2={-3 / zoom} y2={3 / zoom} stroke="white" strokeWidth={1.5 / zoom} />
                      </g>
                    )}
                  </g>
                );
              })}

              {/* ─── Scale Ruler (AutoCAD graphic scale bar) ─── */}
              {(() => {
                const hasPoly = roomShape === 'polygon' && roomPolygon.length >= 3;
                const rulerX = hasPoly ? bounds.minX : 0;
                // In manualMode push ruler below the dimension lines
                const rulerY = (hasPoly ? bounds.maxY : roomHeightCm) + (manualMode ? (CAD.dimOffsetCm + 40) : 20);
                if (manualMode) {
                  // Segmented 0-1-2-3-4-5 m graphic scale: alternating black/white blocks
                  const seg = 100; // 1 m
                  const segs = 5;
                  const h = 6;
                  return (
                    <g className="cad-scalebar">
                      {Array.from({ length: segs }).map((_, i) => (
                        <rect
                          key={`sb-${i}`}
                          x={rulerX + i * seg}
                          y={rulerY - h / 2}
                          width={seg}
                          height={h}
                          fill={i % 2 === 0 ? CAD.dimColor : '#ffffff'}
                          stroke={CAD.dimColor}
                          strokeWidth="0.7"
                        />
                      ))}
                      {/* Tick labels 0..5 m */}
                      {Array.from({ length: segs + 1 }).map((_, i) => (
                        <g key={`sbl-${i}`}>
                          <line x1={rulerX + i * seg} y1={rulerY + h / 2} x2={rulerX + i * seg} y2={rulerY + h / 2 + 4} stroke={CAD.dimColor} strokeWidth="0.7" />
                          <text x={rulerX + i * seg} y={rulerY + h / 2 + 14} textAnchor="middle" fontSize={9} fontFamily="'Consolas','Courier New',monospace" fontWeight="bold" fill={CAD.dimColor}>{i}</text>
                        </g>
                      ))}
                      <text x={rulerX + segs * seg + 8} y={rulerY + 3} fontSize={10} fontFamily="'Consolas','Courier New',monospace" fontWeight="bold" fill={CAD.dimColor}>m</text>
                      <text x={rulerX} y={rulerY - h / 2 - 6} fontSize={9} fontFamily="'Consolas','Courier New',monospace" fill={CAD.dimColor}>GRAFİK ÖLÇEK 1:100</text>
                    </g>
                  );
                }
                const rulerLen = 100;
                return (
                  <g>
                    <line x1={rulerX} y1={rulerY} x2={rulerX + rulerLen} y2={rulerY} stroke="#64748b" strokeWidth={2 / zoom} />
                    <line x1={rulerX} y1={rulerY - 5 / zoom} x2={rulerX} y2={rulerY + 5 / zoom} stroke="#64748b" strokeWidth={2 / zoom} />
                    <line x1={rulerX + rulerLen} y1={rulerY - 5 / zoom} x2={rulerX + rulerLen} y2={rulerY + 5 / zoom} stroke="#64748b" strokeWidth={2 / zoom} />
                    <text x={rulerX + rulerLen / 2} y={rulerY + 14 / zoom} textAnchor="middle" fontSize={10 / zoom} fontWeight="bold" fill="#64748b" fontFamily="monospace">1 m</text>
                    <line x1={rulerX + 50} y1={rulerY - 3 / zoom} x2={rulerX + 50} y2={rulerY + 3 / zoom} stroke="#94a3b8" strokeWidth={1 / zoom} />
                    <text x={rulerX + 50} y={rulerY + 14 / zoom} textAnchor="middle" fontSize={8 / zoom} fill="#94a3b8" fontFamily="monospace">50cm</text>
                  </g>
                );
              })()}

              {/* ─── North arrow (manualMode only) ─── */}
              {manualMode && roomPolygon.length >= 3 && (() => {
                const nx0 = bounds.maxX + CAD.dimOffsetCm + 40;
                const ny0 = bounds.minY + 10;
                return (
                  <g className="cad-north" transform={`translate(${nx0}, ${ny0})`}>
                    <circle cx={0} cy={0} r={22} fill="#ffffff" stroke={CAD.dimColor} strokeWidth="0.9" />
                    {/* North triangle (filled) */}
                    <polygon points="0,-18 4,0 0,-4 -4,0" fill={CAD.dimColor} />
                    {/* South triangle (outline) */}
                    <polygon points="0,18 4,0 0,4 -4,0" fill="#ffffff" stroke={CAD.dimColor} strokeWidth="0.8" />
                    <text x={0} y={-26} textAnchor="middle" fontSize={10} fontFamily="'Consolas','Courier New',monospace" fontWeight="bold" fill={CAD.dimColor}>K</text>
                  </g>
                );
              })()}

              {/* ─── Mini title block (manualMode only) ─── */}
              {manualMode && roomPolygon.length >= 3 && (() => {
                const tbX = bounds.maxX + CAD.dimOffsetCm + 10;
                const tbY = bounds.maxY - 60;
                return (
                  <g className="cad-titleblock" transform={`translate(${tbX}, ${tbY})`}>
                    <rect x={0} y={0} width={160} height={60} fill="#ffffff" stroke={CAD.dimColor} strokeWidth="0.9" />
                    <line x1={0} y1={18} x2={160} y2={18} stroke={CAD.dimColor} strokeWidth="0.6" />
                    <line x1={0} y1={36} x2={160} y2={36} stroke={CAD.dimColor} strokeWidth="0.6" />
                    <line x1={60} y1={18} x2={60} y2={60} stroke={CAD.dimColor} strokeWidth="0.6" />
                    <text x={80} y={12} textAnchor="middle" fontSize={10} fontFamily="'Consolas','Courier New',monospace" fontWeight="bold" fill={CAD.dimColor}>2MC GASTRO</text>
                    <text x={4} y={30} fontSize={8} fontFamily="'Consolas','Courier New',monospace" fill={CAD.dimColor}>ALAN</text>
                    <text x={64} y={30} fontSize={8} fontFamily="'Consolas','Courier New',monospace" fontWeight="bold" fill={CAD.dimColor}>{roomAreaM2} m²</text>
                    <text x={4} y={48} fontSize={8} fontFamily="'Consolas','Courier New',monospace" fill={CAD.dimColor}>ÇEVRE</text>
                    <text x={64} y={48} fontSize={8} fontFamily="'Consolas','Courier New',monospace" fontWeight="bold" fill={CAD.dimColor}>{roomPerimeterM} m</text>
                    <text x={4} y={58} fontSize={7} fontFamily="'Consolas','Courier New',monospace" fill="#64748b">ÖLÇEK 1:100</text>
                  </g>
                );
              })()}

              {/* Drawing preview */}
              {isDrawingRoom && drawingPoints.length > 0 && (
                <>
                  {/* Existing lines */}
                  <polyline
                    points={[...drawingPoints, mousePos].map(p => `${p.x},${p.y}`).join(' ')}
                    fill="none" stroke="#10b981" strokeWidth={2} strokeDasharray="6 3"
                  />
                  {/* Fill preview if enough points */}
                  {drawingPoints.length >= 3 && (
                    <polygon
                      points={drawingPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="#10b98120" stroke="none"
                    />
                  )}
                  {/* Point handles */}
                  {drawingPoints.map((p, i) => (
                    <circle key={`dp-${i}`} cx={p.x} cy={p.y} r={5 / zoom}
                      fill={i === 0 && drawingPoints.length >= 3 ? '#10b981' : '#ffffff'}
                      stroke="#10b981" strokeWidth={2 / zoom}
                    />
                  ))}
                  {/* Close indicator */}
                  {drawingPoints.length >= 3 && distancePP(mousePos, drawingPoints[0]) < 20 / zoom && (
                    <circle cx={drawingPoints[0].x} cy={drawingPoints[0].y} r={12 / zoom} fill="none" stroke="#10b981" strokeWidth={2 / zoom} strokeDasharray="4 2" />
                  )}
                  {/* Current mouse point */}
                  <circle cx={mousePos.x} cy={mousePos.y} r={4 / zoom} fill="#10b981" opacity={0.6} />
                  {/* Mouse coords label */}
                  <text x={mousePos.x + 12} y={mousePos.y - 8} fontSize={9 / zoom} fill="#10b981" fontWeight="bold" fontFamily="monospace">
                    ({Math.round(mousePos.x)}, {Math.round(mousePos.y)})
                  </text>
                  {/* Distance from last point */}
                  {drawingPoints.length > 0 && (
                    <text x={(mousePos.x + drawingPoints[drawingPoints.length - 1].x) / 2} y={(mousePos.y + drawingPoints[drawingPoints.length - 1].y) / 2 - 8} fontSize={9 / zoom} fill="#059669" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                      {(distancePP(mousePos, drawingPoints[drawingPoints.length - 1]) / 100).toFixed(2)}m
                    </text>
                  )}
                </>
              )}
            </svg>

            {/* Placed items (HTML overlay on top of SVG) */}
            <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
              {placedItems.map((item) => {
                const Icon = ICON_MAP[item.icon] || Package;
                const isSelected = item.id === selectedId;
                const isDragging = item.id === draggingId;
                const borderColor = CATEGORY_BORDERS[item.category] || '#d1d5db';

                return (
                  <div
                    key={item.id}
                    className={`absolute flex flex-col items-center justify-center transition-shadow`}
                    style={{
                      left: item.x, top: item.y, width: item.width, height: item.height,
                      backgroundColor: item.color || '#f9fafb',
                      border: `2px solid ${isSelected ? '#1d4ed8' : borderColor}`,
                      borderRadius: 4,
                      cursor: item.locked ? 'not-allowed' : draggingId === item.id ? 'grabbing' : 'grab',
                      boxShadow: isSelected ? '0 0 0 3px rgba(29,78,216,0.3), 0 4px 12px rgba(0,0,0,0.15)' : isDragging ? '0 8px 24px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.08)',
                      zIndex: isDragging ? 100 : isSelected ? 50 : 1,
                      userSelect: 'none',
                      opacity: isDragging ? 0.8 : 1,
                      pointerEvents: 'auto',
                    }}
                    onMouseDown={(e) => handleItemMouseDown(e, item)}
                    onDoubleClick={(e) => handleItemDoubleClick(e, item)}
                  >
                    {item.imageData ? (
                      <img src={item.imageData} alt={item.name} className="object-contain" style={{ pointerEvents: 'none', width: '70%', height: '55%', maxWidth: '100%', maxHeight: '55%' }} />
                    ) : (
                      <Icon size={Math.max(10, Math.min(item.width, item.height) * 0.28)} className="text-slate-500" style={{ pointerEvents: 'none' }} />
                    )}
                    {/* Ürün adı — sadece yeterince büyükse göster */}
                    {item.width > 20 && item.height > 15 && (
                      <span className="text-center font-bold leading-tight text-slate-700" style={{ fontSize: Math.max(6, Math.min(9, item.width * 0.07)), maxWidth: item.width - 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pointerEvents: 'none', marginTop: 1 }}>
                        {item.name}
                      </span>
                    )}
                    {/* Ölçü etiketi — her zaman göster (seçiliyse daha belirgin) */}
                    <span
                      className="font-mono font-bold"
                      style={{
                        fontSize: Math.max(5, Math.min(8, item.width * 0.06)),
                        color: isSelected ? '#1d4ed8' : '#64748b',
                        background: isSelected ? 'rgba(219,234,254,0.9)' : 'rgba(255,255,255,0.7)',
                        padding: '0 2px',
                        borderRadius: 2,
                        pointerEvents: 'none',
                        marginTop: 1,
                      }}
                    >
                      {item.width}×{item.height}cm
                    </span>
                    {item.locked && <div className="absolute top-1 right-1"><Lock size={8} className="text-slate-400" /></div>}
                    {isSelected && !item.locked && (
                      <>
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full" style={{ pointerEvents: 'none' }} />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full" style={{ pointerEvents: 'none' }} />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full" style={{ pointerEvents: 'none' }} />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-600 rounded-full" style={{ pointerEvents: 'none' }} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        </div>{/* end canvasWrapRef */}
        {/* Status bar */}
        <div className="h-7 bg-white border-t border-slate-200 flex items-center px-4 text-[10px] font-mono text-slate-500 gap-4 shrink-0 overflow-x-auto">
          <span className="font-bold text-primary shrink-0">1px = {(1/zoom).toFixed(1)}cm</span>
          <span className="shrink-0">Alan: {roomAreaM2}m²</span>
          <span className="hidden sm:inline shrink-0">Ekipman: {totalItems}</span>
          <span className="hidden sm:inline shrink-0">Güç: {totalKW.toFixed(1)} kW</span>
          {totalPrice > 0 && <span className="hidden md:inline shrink-0">Toplam: {formatPrice(totalPrice)}</span>}
          <span className="ml-auto shrink-0 font-bold">{Math.round(zoom * 100)}%</span>
        </div>
      </main>

      {/* Right Panel */}
      <aside className="w-72 xl:w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 hidden lg:flex" style={{ height: 'calc(100vh - 3.5rem)' }}>
        <div className="flex border-b border-slate-200 shrink-0">
          {manualMode ? (
            <>
              <button onClick={() => setRightPanelTab('room')} className={`flex-1 py-2.5 text-[10px] font-bold text-center transition-all ${rightPanelTab === 'room' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-400 hover:text-slate-600'}`}>Oda</button>
              <button onClick={() => setRightPanelTab('info')} className={`flex-1 py-2.5 text-[10px] font-bold text-center transition-all ${rightPanelTab === 'info' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-400 hover:text-slate-600'}`}>Görevler</button>
              <button onClick={() => setRightPanelTab('notes')} className={`flex-1 py-2.5 text-[10px] font-bold text-center transition-all ${rightPanelTab === 'notes' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-400 hover:text-slate-600'}`}>Notlar</button>
            </>
          ) : (
            <>
              <button onClick={() => setRightPanelTab('catalog')} className={`flex-1 py-2.5 text-[10px] font-bold text-center transition-all ${rightPanelTab === 'catalog' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-400 hover:text-slate-600'}`}>Ekipman</button>
              <button onClick={() => setRightPanelTab('properties')} className={`flex-1 py-2.5 text-[10px] font-bold text-center transition-all ${rightPanelTab === 'properties' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-400 hover:text-slate-600'}`}>Özellik</button>
              <button onClick={() => setRightPanelTab('info')} className={`flex-1 py-2.5 text-[10px] font-bold text-center transition-all ${rightPanelTab === 'info' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-400 hover:text-slate-600'}`}>Görevler</button>
              <button onClick={() => setRightPanelTab('notes')} className={`flex-1 py-2.5 text-[10px] font-bold text-center transition-all ${rightPanelTab === 'notes' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-slate-400 hover:text-slate-600'}`}>Notlar</button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {rightPanelTab === 'room' && (() => {
            const roomM2Num = Number(roomAreaM2);
            const eqM2Num = Number(equipmentAreaM2);
            const occupancyPct = roomM2Num > 0 ? Math.min(100, Math.round((eqM2Num / roomM2Num) * 100)) : 0;
            const occupancyColor = occupancyPct < 40 ? 'text-emerald-600' : occupancyPct < 70 ? 'text-amber-600' : 'text-red-600';
            const occupancyBg = occupancyPct < 40 ? 'bg-emerald-500' : occupancyPct < 70 ? 'bg-amber-500' : 'bg-red-500';
            return (
            <div className="p-3 space-y-4">
              {/* ─── Oda Ölçüleri (4-up grid) ─── */}
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-3 space-y-2 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1"><Ruler size={11} className="text-primary" /> Oda Ölçüleri</h4>
                  {roomPolygon.length >= 3 && <span className="text-[9px] font-bold text-slate-400">{roomPolygon.length} köşe</span>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Alan</div>
                    <div className="text-lg font-black text-primary leading-tight">{roomAreaM2}<span className="text-[10px] ml-0.5">m²</span></div>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Çevre</div>
                    <div className="text-lg font-black text-slate-700 leading-tight">{roomPerimeterM}<span className="text-[10px] ml-0.5">m</span></div>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Ekipman</div>
                    <div className="text-lg font-black text-slate-700 leading-tight">{equipmentAreaM2}<span className="text-[10px] ml-0.5">m²</span></div>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Doluluk</div>
                    <div className={`text-lg font-black leading-tight ${occupancyColor}`}>{occupancyPct}<span className="text-[10px] ml-0.5">%</span></div>
                  </div>
                </div>
                {/* Doluluk progress bar */}
                <div className="pt-1">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${occupancyBg}`} style={{ width: `${occupancyPct}%` }} />
                  </div>
                  <div className="flex justify-between text-[8px] text-slate-400 mt-0.5 font-mono">
                    <span>Boş: {Math.max(0, (roomM2Num - eqM2Num)).toFixed(1)} m²</span>
                    <span>{placedItems.length} ekipman</span>
                  </div>
                </div>
                <button onClick={startDrawingRoom} className="w-full py-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center gap-1 transition-all">
                  <RotateCcw size={11} /> {roomPolygon.length >= 3 ? 'Yeniden Çiz' : 'Çizmeye Başla'}
                </button>
              </div>

              {/* ─── Mimari Özellikler ─── */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Mimari Özellikler</h4>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Oda / Alan Adı</label>
                  <input type="text" value={roomProps.name} onChange={e => setRoomProps(p => ({ ...p, name: e.target.value }))}
                    placeholder="örn. Ana Mutfak" className="w-full mt-0.5 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Kat</label>
                    <select value={roomProps.floor} onChange={e => setRoomProps(p => ({ ...p, floor: e.target.value }))}
                      className="w-full mt-0.5 px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
                      <option value="-2">-2. Bodrum</option>
                      <option value="-1">-1. Bodrum</option>
                      <option value="0">Zemin Kat</option>
                      <option value="1">1. Kat</option>
                      <option value="2">2. Kat</option>
                      <option value="3">3. Kat</option>
                      <option value="4">4. Kat</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Tavan Yüks. (cm)</label>
                    <input type="number" value={roomProps.height} onChange={e => setRoomProps(p => ({ ...p, height: e.target.value }))}
                      placeholder="280" className="w-full mt-0.5 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Kullanım Türü</label>
                  <select value={roomProps.usageType} onChange={e => setRoomProps(p => ({ ...p, usageType: e.target.value }))}
                    className="w-full mt-0.5 px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary">
                    <option value="">Seçin...</option>
                    <option value="sicak-mutfak">Sıcak Mutfak</option>
                    <option value="soguk-mutfak">Soğuk Mutfak</option>
                    <option value="hazirlik">Hazırlık Alanı</option>
                    <option value="bulaşıkhane">Bulaşıkhane</option>
                    <option value="depo">Depo</option>
                    <option value="soguk-oda">Soğuk Oda</option>
                    <option value="servis">Servis Alanı</option>
                    <option value="ofis">Ofis</option>
                    <option value="wc-soyunma">WC / Soyunma</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Duvar Kaplama</label>
                    <input type="text" value={roomProps.wallMaterial} onChange={e => setRoomProps(p => ({ ...p, wallMaterial: e.target.value }))}
                      placeholder="örn. Fayans" className="w-full mt-0.5 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Zemin Kaplama</label>
                    <input type="text" value={roomProps.floorMaterial} onChange={e => setRoomProps(p => ({ ...p, floorMaterial: e.target.value }))}
                      placeholder="örn. Epoksi" className="w-full mt-0.5 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Yangın Bölgesi</label>
                  <input type="text" value={roomProps.fireZone} onChange={e => setRoomProps(p => ({ ...p, fireZone: e.target.value }))}
                    placeholder="örn. Z-1" className="w-full mt-0.5 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>

              {/* ─── Açıklıklar ─── */}
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Açıklıklar (Kapı / Pencere)</h4>
                {roomPolygon.length >= 3 && (
                  <div className="flex gap-1 mb-2">
                    <button onClick={() => { setAddOpeningMode(addOpeningMode === 'door' ? null : 'door'); setActiveTool('select'); }}
                      className={`flex-1 py-1 text-[9px] font-bold rounded flex items-center justify-center gap-0.5 transition-all ${addOpeningMode === 'door' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      <DoorOpen size={10} /> Kapı</button>
                    <button onClick={() => { setAddOpeningMode(addOpeningMode === 'double-door' ? null : 'double-door'); setActiveTool('select'); }}
                      className={`flex-1 py-1 text-[9px] font-bold rounded flex items-center justify-center gap-0.5 transition-all ${addOpeningMode === 'double-door' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      <DoorOpen size={10} /> Çift</button>
                    <button onClick={() => { setAddOpeningMode(addOpeningMode === 'window' ? null : 'window'); setActiveTool('select'); }}
                      className={`flex-1 py-1 text-[9px] font-bold rounded flex items-center justify-center gap-0.5 transition-all ${addOpeningMode === 'window' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                      <AppWindow size={10} /> Pencere</button>
                  </div>
                )}
                {wallOpenings.length > 0 ? (
                  <div className="space-y-1">
                    {wallOpenings.map(op => (
                      <div key={op.id} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] cursor-pointer ${selectedOpeningId === op.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                        onClick={() => setSelectedOpeningId(selectedOpeningId === op.id ? null : op.id)}>
                        {op.type === 'window' ? <AppWindow size={10} /> : <DoorOpen size={10} />}
                        <span className="flex-1 font-bold">{op.type === 'door' ? 'Kapı' : op.type === 'double-door' ? 'Çift Kanat' : 'Pencere'} — {op.widthCm}cm</span>
                        <button onClick={(e) => { e.stopPropagation(); setWallOpenings(prev => prev.filter(o => o.id !== op.id)); if (selectedOpeningId === op.id) setSelectedOpeningId(null); }} className="text-red-300 hover:text-red-500"><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[9px] text-slate-400">Duvar üzerine tıklayarak kapı/pencere ekleyin.</p>
                )}
              </div>

              {/* ─── Yerleştirilen Ekipmanlar (placed list with area %) ─── */}
              {placedItems.length > 0 && (
                <div className="space-y-2 border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Yerleştirilenler</h4>
                    <span className="text-[9px] font-bold text-slate-400">{placedItems.length} adet</span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {placedItems.map((it) => {
                      const itM2 = (it.width * it.height) / 10000;
                      const pctOfRoom = roomM2Num > 0 ? (itM2 / roomM2Num) * 100 : 0;
                      const borderColor = CATEGORY_BORDERS[it.category] || '#cbd5e1';
                      const isSel = it.id === selectedId;
                      return (
                        <div key={it.id}
                          onClick={() => setSelectedId(it.id)}
                          className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer border transition-all ${isSel ? 'bg-primary/5 border-primary/40' : 'bg-white hover:bg-slate-50 border-slate-200'}`}>
                          <div className="w-1.5 h-8 rounded-full shrink-0" style={{ background: borderColor }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold text-slate-700 truncate">{it.name}</div>
                            <div className="text-[9px] text-slate-400 font-mono flex items-center gap-2">
                              <span>{it.width}×{it.height}cm</span>
                              <span>·</span>
                              <span>{itM2.toFixed(2)}m²</span>
                              <span className="text-primary font-bold">·</span>
                              <span className="text-primary font-bold">%{pctOfRoom.toFixed(1)}</span>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setPlacedItems(prev => prev.filter(p => p.id !== it.id)); if (selectedId === it.id) setSelectedId(null); }}
                            className="shrink-0 p-1 rounded text-red-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ─── Ekipman Kataloğu (inline, manualMode için) ─── */}
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1"><Package size={11} className="text-primary" /> Ekipman Kataloğu</h4>
                  <span className="text-[8px] text-slate-400 font-mono">{catalogItems.length < 60 ? `${catalogItems.length} ürün` : '60+'}</span>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input type="text" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Ürün ara..."
                    className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                  {catalogSearch && (
                    <button onClick={() => setCatalogSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"><X size={11} /></button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all ${showFavoritesOnly ? 'bg-pink-50 text-pink-600 border border-pink-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                    title="Favoriler">
                    <Heart size={10} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
                    {equipmentStore.favorites.length > 0 && <span className="text-[8px]">{equipmentStore.favorites.length}</span>}
                  </button>
                  <select value={catalogCategory} onChange={(e) => setCatalogCategory(e.target.value)}
                    className="flex-1 text-[10px] font-bold px-2 py-1 border border-slate-200 rounded-md bg-white text-slate-600 outline-none">
                    <option value="">Tüm Kategoriler</option>
                    {CATEGORIES.filter(c => c.count > 0).map(c => <option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}
                  </select>
                </div>

                {roomPolygon.length < 3 && (
                  <div className="text-[9px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                    ⚠️ Önce odayı çizin, sonra ürün ekleyin.
                  </div>
                )}

                {/* Product grid — scale-accurate, drag or click to add */}
                <div className="grid grid-cols-2 gap-1.5 max-h-96 overflow-y-auto pr-1">
                  {catalogItems.map((item) => {
                    const isFav = equipmentStore.favorites.includes(item.id);
                    // Product size in cm (equipment items store l/w in mm)
                    const prodWcm = Math.round(item.l / 10);
                    const prodHcm = Math.round(item.w / 10);
                    const prodM2 = (prodWcm * prodHcm) / 10000;
                    const prodPctOfRoom = roomM2Num > 0 ? (prodM2 / roomM2Num) * 100 : 0;
                    const canAdd = roomPolygon.length >= 3;
                    return (
                      <div key={item.id}
                        draggable={canAdd}
                        onDragStart={(e) => { if (!canAdd) { e.preventDefault(); return; } setTrayDragItem(item); e.dataTransfer.effectAllowed = 'copy'; }}
                        className={`bg-white rounded-lg border border-slate-200 ${canAdd ? 'hover:border-primary/40 cursor-grab active:cursor-grabbing' : 'opacity-60 cursor-not-allowed'} transition-all group relative overflow-hidden`}>
                        {/* Fav button */}
                        <button onClick={(e) => { e.stopPropagation(); equipmentStore.toggleFavorite(item.id); }} className="absolute top-1 right-1 z-10 p-0.5 rounded-full bg-white/90 shadow-sm">
                          <Heart size={9} fill={isFav ? '#ec4899' : 'none'} className={isFav ? 'text-pink-500' : 'text-slate-300'} />
                        </button>
                        {/* Quick-add button */}
                        <button onClick={(e) => { e.stopPropagation(); if (canAdd) addEquipmentToFloorPlan(item); }}
                          disabled={!canAdd}
                          className="absolute top-1 left-1 z-10 p-0.5 rounded-full bg-primary text-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
                          title="Mutfağa ekle">
                          <Plus size={10} />
                        </button>
                        {/* Image */}
                        <div className="w-full aspect-[4/3] bg-slate-50 flex items-center justify-center p-1">
                          <ProductImage src={item.img} alt={item.name} className="w-full h-full" />
                        </div>
                        {/* Meta */}
                        <div className="p-1.5">
                          <div className="text-[9px] font-bold text-slate-700 leading-tight line-clamp-2 min-h-[24px]">{item.name}</div>
                          {/* Size + m² + % of kitchen */}
                          <div className="mt-1 flex items-center justify-between text-[8px] font-mono">
                            <span className="text-slate-500">{prodWcm}×{prodHcm}cm</span>
                            <span className="text-slate-700 font-bold">{prodM2.toFixed(2)}m²</span>
                          </div>
                          {/* Proportional bar: shows how much of kitchen this one unit fills */}
                          {canAdd && (
                            <div className="mt-1">
                              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary/70 rounded-full" style={{ width: `${Math.min(100, prodPctOfRoom)}%` }} />
                              </div>
                              <div className="text-[8px] text-primary font-bold mt-0.5">Mutfağın %{prodPctOfRoom.toFixed(1)}'i</div>
                            </div>
                          )}
                          {/* Price + kW */}
                          <div className="flex items-center justify-between mt-1">
                            {item.kw > 0 ? <span className="flex items-center gap-0.5 text-[8px] text-amber-600"><Zap size={7} />{item.kw}kW</span> : <span />}
                            {item.price > 0 && <span className="text-[9px] font-bold text-primary">{formatPrice(item.price)}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {catalogItems.length === 0 && (
                  <div className="text-center py-6 text-slate-400">
                    <Package size={22} className="mx-auto mb-1 opacity-40" />
                    <p className="text-[10px] font-medium">Ürün bulunamadı</p>
                  </div>
                )}
              </div>

              {/* ─── m² Birim Fiyatı ─── */}
              <div className="border-t border-slate-200 pt-3 space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400">m² Birim Fiyatı (€)</label>
                <input type="number" value={pricePerM2 || ''} onChange={e => setPricePerM2(Number(e.target.value))}
                  placeholder="0" className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                {pricePerM2 > 0 && (
                  <div className="flex justify-between text-[10px] font-bold text-primary bg-primary/5 rounded-lg px-2.5 py-1.5">
                    <span>Tahmini Toplam</span>
                    <span>€{(pricePerM2 * roomM2Num).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {/* ─── PDF ─── */}
              <button onClick={exportFloorPlanPDF} disabled={pdfExporting}
                className="w-full py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-sm">
                {pdfExporting ? <><Loader2 size={14} className="animate-spin" /> Hazırlanıyor...</> : <><FileDown size={14} /> PDF İndir</>}
              </button>
            </div>
            );
          })()}

          {rightPanelTab === 'catalog' && (
            <div className="p-3 space-y-3">
              {/* Room shape controls — architectural (polygon) mode only */}
              <div className="p-3 bg-slate-50 rounded-lg space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-500">Oda Planı</h4>
                {roomPolygon.length >= 3 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-white rounded-lg p-2 border border-slate-200">
                        <div className="text-[8px] font-bold text-slate-400 uppercase">Alan</div>
                        <div className="text-sm font-black text-primary">{roomAreaM2}m²</div>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-slate-200">
                        <div className="text-[8px] font-bold text-slate-400 uppercase">Çevre</div>
                        <div className="text-sm font-black text-primary">{roomPerimeterM}m</div>
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-400">
                      {roomPolygon.length} köşe — noktaları sürükleyerek düzenleyin
                    </div>
                    <button onClick={startDrawingRoom} className="w-full py-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center gap-1 transition-all">
                      <RotateCcw size={11} /> Yeniden Çiz
                    </button>

                    {/* Wall openings section */}
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <h5 className="text-[10px] font-black uppercase text-slate-500 mb-2">Açıklıklar</h5>
                      <div className="flex gap-1 mb-2">
                        <button
                          onClick={() => { setAddOpeningMode(addOpeningMode === 'door' ? null : 'door'); setActiveTool('select'); }}
                          className={`flex-1 py-1 text-[9px] font-bold rounded flex items-center justify-center gap-0.5 transition-all ${addOpeningMode === 'door' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        ><DoorOpen size={10} /> Kapı</button>
                        <button
                          onClick={() => { setAddOpeningMode(addOpeningMode === 'double-door' ? null : 'double-door'); setActiveTool('select'); }}
                          className={`flex-1 py-1 text-[9px] font-bold rounded flex items-center justify-center gap-0.5 transition-all ${addOpeningMode === 'double-door' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        ><DoorOpen size={10} /> Çift</button>
                        <button
                          onClick={() => { setAddOpeningMode(addOpeningMode === 'window' ? null : 'window'); setActiveTool('select'); }}
                          className={`flex-1 py-1 text-[9px] font-bold rounded flex items-center justify-center gap-0.5 transition-all ${addOpeningMode === 'window' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        ><AppWindow size={10} /> Pencere</button>
                      </div>

                      {/* Selected opening properties */}
                      {selectedOpeningId && (() => {
                        const op = wallOpenings.find(o => o.id === selectedOpeningId);
                        if (!op) return null;
                        return (
                          <div className="bg-blue-50 rounded-lg p-2 space-y-1.5 mb-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-blue-700">{op.type === 'door' ? 'Kapı' : op.type === 'double-door' ? 'Çift Kanat' : 'Pencere'}</span>
                              <button onClick={() => { setWallOpenings(prev => prev.filter(o => o.id !== selectedOpeningId)); setSelectedOpeningId(null); }} className="text-red-400 hover:text-red-600"><Trash2 size={11} /></button>
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400">Genişlik (cm)</label>
                              <input type="number" value={op.widthCm} onChange={(e) => setWallOpenings(prev => prev.map(o => o.id === selectedOpeningId ? { ...o, widthCm: Math.max(30, Number(e.target.value)) } : o))}
                                className="w-full mt-0.5 px-2 py-1 text-xs border border-slate-200 rounded outline-none focus:ring-1 focus:ring-blue-400" />
                            </div>
                            {op.type === 'door' && (
                              <button onClick={() => setWallOpenings(prev => prev.map(o => o.id === selectedOpeningId ? { ...o, swingDir: (o.swingDir === 1 ? -1 : 1) as 1 | -1 } : o))}
                                className="w-full py-1 text-[9px] font-bold bg-white text-slate-600 rounded border border-slate-200 hover:bg-slate-50">
                                Kapı yönü çevir ({op.swingDir === 1 ? '→' : '←'})
                              </button>
                            )}
                          </div>
                        );
                      })()}

                      {/* List of openings */}
                      {wallOpenings.length > 0 && (
                        <div className="space-y-1">
                          {wallOpenings.map(op => (
                            <div key={op.id} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] cursor-pointer ${selectedOpeningId === op.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                              onClick={() => setSelectedOpeningId(selectedOpeningId === op.id ? null : op.id)}>
                              {op.type === 'window' ? <AppWindow size={10} /> : <DoorOpen size={10} />}
                              <span className="flex-1 font-bold">{op.type === 'door' ? 'Kapı' : op.type === 'double-door' ? 'Çift Kanat' : 'Pencere'} — {op.widthCm}cm</span>
                              <button onClick={(e) => { e.stopPropagation(); setWallOpenings(prev => prev.filter(o => o.id !== op.id)); if (selectedOpeningId === op.id) setSelectedOpeningId(null); }} className="text-red-300 hover:text-red-500"><X size={10} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      {wallOpenings.length === 0 && (
                        <p className="text-[9px] text-slate-400">Henüz açıklık yok. Kapı veya pencere ekleyin.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400">Oda sınırlarını çizmek için tuvale tıklayın.</p>
                    <button onClick={startDrawingRoom} className="w-full py-1.5 text-[10px] font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg flex items-center justify-center gap-1 transition-all">
                      <Pen size={11} /> Çizmeye Başla
                    </button>
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input type="text" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} placeholder="Urun ara..." className="w-full pl-8 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                {catalogSearch && <button onClick={() => setCatalogSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"><X size={12} /></button>}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${showFavoritesOnly ? 'bg-pink-50 text-pink-600 border border-pink-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                  <Heart size={11} fill={showFavoritesOnly ? 'currentColor' : 'none'} /> Favoriler
                  {equipmentStore.favorites.length > 0 && <span className="ml-1 bg-pink-200 text-pink-700 rounded-full px-1.5 text-[9px]">{equipmentStore.favorites.length}</span>}
                </button>
                <select value={catalogCategory} onChange={(e) => setCatalogCategory(e.target.value)} className="flex-1 text-[10px] font-bold px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 outline-none">
                  <option value="">Tum Kategoriler</option>
                  {CATEGORIES.filter(c => c.count > 0).map(c => <option key={c.id} value={c.id}>{c.name} ({c.count})</option>)}
                </select>
              </div>

              <div className="text-[10px] text-slate-400 font-medium px-1">
                {catalogItems.length < 60 ? `${catalogItems.length} urun` : '60+ urun (ilk 60)'}
              </div>

              {/* Equipment grid */}
              <div className="grid grid-cols-2 gap-2">
                {catalogItems.map((item) => {
                  const isFav = equipmentStore.favorites.includes(item.id);
                  return (
                    <div key={item.id} draggable onDragStart={(e) => { setTrayDragItem(item); e.dataTransfer.effectAllowed = 'copy'; }}
                      className="bg-white hover:bg-slate-50 rounded-lg border border-slate-200 hover:border-primary/40 cursor-grab active:cursor-grabbing transition-all group relative overflow-hidden">
                      <button onClick={(e) => { e.stopPropagation(); equipmentStore.toggleFavorite(item.id); }} className="absolute top-1.5 right-1.5 z-10 p-1 rounded-full bg-white/80 hover:bg-white shadow-sm">
                        <Heart size={10} fill={isFav ? '#ec4899' : 'none'} className={isFav ? 'text-pink-500' : 'text-slate-300 group-hover:text-slate-400'} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); addEquipmentToFloorPlan(item); }} className="absolute top-1.5 left-1.5 z-10 p-1 rounded-full bg-white/80 hover:bg-primary hover:text-white text-slate-400 shadow-sm opacity-0 group-hover:opacity-100" title="Ekle">
                        <Plus size={10} />
                      </button>
                      <div className="w-full aspect-[4/3] bg-slate-50 flex items-center justify-center p-1">
                        <ProductImage src={item.img} alt={item.name} className="w-full h-full" />
                      </div>
                      <div className="p-2">
                        <div className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-2 min-h-[28px]">{item.name}</div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">{item.id}</div>
                        <div className="flex items-center justify-between mt-1.5">
                          {item.kw > 0 && <span className="flex items-center gap-0.5 text-[9px] text-amber-600"><Zap size={8} />{item.kw}kW</span>}
                          {item.price > 0 && <span className="text-[9px] font-bold text-primary">{formatPrice(item.price)}</span>}
                        </div>
                        <div className="text-[8px] text-slate-400 mt-1">{Math.round(item.l / 10)}x{Math.round(item.w / 10)}cm</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {catalogItems.length === 0 && (
                <div className="text-center py-8 text-slate-400"><Package size={28} className="mx-auto mb-2 opacity-40" /><p className="text-xs font-medium">Urun bulunamadi</p></div>
              )}
            </div>
          )}

          {rightPanelTab === 'info' && (
            <div className="p-3 space-y-4">
              {/* Area stats */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-200">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Alan Hesabı</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Oda Alanı</div>
                    <div className="text-lg font-black text-primary">{roomAreaM2}<span className="text-[10px] ml-0.5">m²</span></div>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Çevre</div>
                    <div className="text-lg font-black text-slate-700">{roomPerimeterM}<span className="text-[10px] ml-0.5">m</span></div>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Ekipman Alanı</div>
                    <div className="text-lg font-black text-slate-700">{equipmentAreaM2}<span className="text-[10px] ml-0.5">m²</span></div>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Doluluk</div>
                    <div className="text-lg font-black text-amber-600">{roomAreaM2 !== '0.0' ? Math.round((Number(equipmentAreaM2) / Number(roomAreaM2)) * 100) : 0}<span className="text-[10px] ml-0.5">%</span></div>
                  </div>
                </div>

                {/* Price per m² */}
                <div className="bg-white rounded-lg p-2.5 border border-slate-200 space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400">m² Birim Fiyatı (€)</label>
                  <input
                    type="number"
                    value={pricePerM2 || ''}
                    onChange={(e) => setPricePerM2(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-primary outline-none"
                  />
                  {pricePerM2 > 0 && (
                    <div className="flex justify-between text-[10px] font-bold text-primary bg-primary/5 rounded px-2 py-1">
                      <span>Tahmini Toplam</span>
                      <span>€{(pricePerM2 * Number(roomAreaM2)).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Açıklama</h4>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Proje veya oda hakkında açıklama..."
                  rows={4}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 resize-none focus:ring-2 focus:ring-primary outline-none text-slate-700 placeholder:text-slate-300 leading-relaxed"
                />
              </div>

              {/* Task list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">İş Adımları</h4>
                  <span className="text-[9px] text-slate-400">{tasks.filter(t => t.done).length}/{tasks.length} tamamlandı</span>
                </div>

                {/* Add task */}
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTaskText.trim()) {
                        const task: Task = {
                          id: Date.now().toString(),
                          text: newTaskText.trim(),
                          done: false,
                          assignee: newTaskAssignee.trim(),
                          createdAt: new Date().toLocaleDateString('tr-TR'),
                        };
                        setTasks(prev => [...prev, task]);
                        setNewTaskText('');
                        setNewTaskAssignee('');
                      }
                    }}
                    placeholder="Yeni görev ekle (Enter ile kaydet)"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      placeholder="Atanan kişi (opsiyonel)"
                      className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                    />
                    <button
                      onClick={() => {
                        if (!newTaskText.trim()) return;
                        const task: Task = {
                          id: Date.now().toString(),
                          text: newTaskText.trim(),
                          done: false,
                          assignee: newTaskAssignee.trim(),
                          createdAt: new Date().toLocaleDateString('tr-TR'),
                        };
                        setTasks(prev => [...prev, task]);
                        setNewTaskText('');
                        setNewTaskAssignee('');
                      }}
                      className="px-3 py-1.5 text-[10px] font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-all"
                    >
                      Ekle
                    </button>
                  </div>
                </div>

                {/* Task list */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {tasks.length === 0 && (
                    <p className="text-[9px] text-slate-400 text-center py-4">Henüz görev yok. Yukarıdan ekleyin.</p>
                  )}
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border transition-all ${task.done ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-200'}`}
                    >
                      <button
                        onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t))}
                        className={`mt-0.5 shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${task.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-primary'}`}
                      >
                        {task.done && <span className="text-white text-[8px] font-black">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[10px] font-medium leading-tight ${task.done ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>{task.text}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {task.assignee && <span className="text-[8px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded-full">@{task.assignee}</span>}
                          <span className="text-[8px] text-slate-400">{task.createdAt}</span>
                          {task.done && <span className="text-[8px] text-emerald-600 font-bold">✓ Tamamlandı</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))}
                        className="shrink-0 text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                {tasks.length > 0 && (
                  <div className="space-y-1">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${(tasks.filter(t => t.done).length / tasks.length) * 100}%` }}
                      />
                    </div>
                    <p className="text-[8px] text-slate-400 text-center">{Math.round((tasks.filter(t => t.done).length / tasks.length) * 100)}% tamamlandı</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {rightPanelTab === 'notes' && (
            <div className="p-4 space-y-4">
              {/* Project summary info */}
              {project && (
                <div className="bg-primary/5 rounded-xl p-4 space-y-2 border border-primary/10">
                  <h4 className="text-[10px] font-black uppercase text-primary tracking-wider">Proje Bilgileri</h4>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Proje Adı</span>
                      <span className="font-bold">{project.name}</span>
                    </div>
                    {project.clientName && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Müşteri</span>
                        <span className="font-bold">{project.clientName}</span>
                      </div>
                    )}
                    {project.deadline && (
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-medium">Teslim</span>
                        <span className="font-bold">{project.deadline}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Room stats */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-200">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Alan Bilgileri</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Alan</div>
                    <div className="text-lg font-black text-primary">{roomAreaM2}<span className="text-[10px] ml-0.5">m²</span></div>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Çevre</div>
                    <div className="text-lg font-black text-slate-700">{roomPerimeterM}<span className="text-[10px] ml-0.5">m</span></div>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Ekipman</div>
                    <div className="text-lg font-black text-slate-700">{totalItems}</div>
                  </div>
                  <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Güç</div>
                    <div className="text-lg font-black text-amber-600">{totalKW.toFixed(1)}<span className="text-[10px] ml-0.5">kW</span></div>
                  </div>
                </div>
                {totalPrice > 0 && (
                  <div className="bg-primary/5 rounded-lg p-2.5 text-center border border-primary/20">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">Tahmini Toplam</div>
                    <div className="text-lg font-black text-primary">€{totalPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</div>
                  </div>
                )}
                {roomPolygon.length >= 3 && (
                  <div className="text-[9px] text-slate-400 text-center">
                    {roomPolygon.length} köşe nokta · {Math.round((Number(equipmentAreaM2) / Number(roomAreaM2)) * 100)}% ekipman kapasitesi
                  </div>
                )}
              </div>

              {/* Notes textarea */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StickyNote size={13} className="text-primary" />
                  <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Proje Notları</h4>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Proje ile ilgili notlarınızı buraya yazın...&#10;&#10;Örn: Müşteri, havalandırma tarafına dikkat edilmesini istedi. Izgara ekipmanları güneye yerleştirilecek."
                  rows={10}
                  className="w-full text-xs border border-slate-200 rounded-xl p-3 resize-none focus:ring-2 focus:ring-primary outline-none text-slate-700 leading-relaxed placeholder:text-slate-300"
                />
                <p className="text-[9px] text-slate-400">{notes.length} karakter · Otomatik kaydedilir</p>
              </div>

              {/* PDF export button */}
              <button
                onClick={exportFloorPlanPDF}
                disabled={pdfExporting}
                className="w-full py-3 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-sm"
              >
                {pdfExporting ? <><Loader2 size={14} className="animate-spin" /> Hazırlanıyor...</> : <><FileDown size={14} /> Kat Planını PDF İndir</>}
              </button>
            </div>
          )}

          {rightPanelTab === 'properties' && (
            <div className="p-4">
              {selectedItem ? (() => {
                const item = selectedItem;
                const eqItem = item.equipmentId ? equipmentStore.getItemById(item.equipmentId) : null;
                const isFav = item.equipmentId ? equipmentStore.favorites.includes(item.equipmentId) : false;
                const catInfo = CATEGORIES.find(c => c.id === item.category);
                return (
                  <div className="space-y-4">
                    <div className="relative rounded-xl overflow-hidden bg-white border border-slate-200 shadow-sm">
                      <div className="w-full h-40 bg-slate-50 flex items-center justify-center">
                        {item.imageData ? <ProductImage src={item.imageData} alt={item.name} className="w-full h-full p-2" /> : <Package size={40} className="text-slate-300" />}
                      </div>
                      {catInfo && <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: catInfo.color }}>{catInfo.name}</span>}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">{item.name}</h3>
                      {item.equipmentId && <p className="text-[10px] text-slate-400 font-mono mt-1">{item.equipmentId}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Boyutlar</div>
                        <p className="text-xs font-bold text-slate-700">{item.width} x {item.height} cm</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5">
                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Guc</div>
                        <p className="text-xs font-bold text-slate-700">{item.kw > 0 ? `${item.kw} kW` : 'Yok'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase text-slate-400">Konum</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400">X (cm)</label>
                          <input type="number" value={Math.round(item.x)} onChange={(e) => setPlacedItems(prev => prev.map(i => i.id === item.id ? { ...i, x: Number(e.target.value) } : i))} className="w-full mt-0.5 px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-primary outline-none" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400">Y (cm)</label>
                          <input type="number" value={Math.round(item.y)} onChange={(e) => setPlacedItems(prev => prev.map(i => i.id === item.id ? { ...i, y: Number(e.target.value) } : i))} className="w-full mt-0.5 px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-primary outline-none" />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={rotateSelected} className="flex-1 py-2 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg flex items-center justify-center gap-1"><RotateCw size={12} /> Dondur</button>
                      <button onClick={duplicateSelected} className="flex-1 py-2 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1"><Copy size={12} /> Kopyala</button>
                    </div>
                    <button onClick={deleteSelected} className="w-full py-2 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center gap-1"><Trash2 size={12} /> Sil</button>
                  </div>
                );
              })() : (
                <div className="text-center py-12 text-slate-400">
                  <MousePointer2 size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-xs font-medium">Bir ekipman secin</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
          <div className="grid grid-cols-4 gap-2 text-center">
            <div><div className="text-[8px] font-bold text-slate-400 uppercase">Alan</div><div className="text-sm font-black text-primary">{roomAreaM2}m2</div></div>
            <div><div className="text-[8px] font-bold text-slate-400 uppercase">Ekipman</div><div className="text-sm font-black text-primary">{totalItems}</div></div>
            <div><div className="text-[8px] font-bold text-slate-400 uppercase">Guc</div><div className="text-sm font-black text-primary">{totalKW.toFixed(1)}kW</div></div>
            <div><div className="text-[8px] font-bold text-slate-400 uppercase">Favori</div><div className="text-sm font-black text-pink-500">{equipmentStore.favorites.length}</div></div>
          </div>
        </div>
      </aside>

      {/* Full product card modal (double click) */}
      {popupItem && (() => {
        const eqItem = popupItem.equipmentId ? equipmentStore.getItemById(popupItem.equipmentId) : null;
        const isFav = popupItem.equipmentId ? equipmentStore.favorites.includes(popupItem.equipmentId) : false;
        const catInfo = CATEGORIES.find(c => c.id === popupItem.category);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPopupItem(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <div className="w-full h-56 bg-slate-50 flex items-center justify-center">
                  {popupItem.imageData ? <ProductImage src={popupItem.imageData} alt={popupItem.name} className="w-full h-full p-4" /> : <Package size={56} className="text-slate-300" />}
                </div>
                <button onClick={() => setPopupItem(null)} className="absolute top-3 right-3 bg-black/40 text-white rounded-full p-2 hover:bg-black/60"><X size={16} /></button>
                {popupItem.equipmentId && (
                  <button onClick={() => equipmentStore.toggleFavorite(popupItem.equipmentId!)} className="absolute top-3 right-14 p-2 bg-white/90 rounded-full shadow-md hover:shadow-lg">
                    <Heart size={16} fill={isFav ? '#ec4899' : 'none'} className={isFav ? 'text-pink-500' : 'text-slate-300'} />
                  </button>
                )}
                {catInfo && <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: catInfo.color }}>{catInfo.name}</span>}
                {popupItem.brand && <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded bg-black/50 text-white text-[10px] font-bold">{popupItem.brand}</span>}
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800">{popupItem.name}</h2>
                  {popupItem.equipmentId && <p className="text-xs font-mono text-slate-400 mt-1">{popupItem.equipmentId}</p>}
                </div>
                {popupItem.desc && <p className="text-sm text-slate-500 leading-relaxed">{popupItem.desc}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase mb-1.5"><Ruler size={12} /> Boyutlar</div>
                    <p className="font-bold text-slate-700 text-sm">{popupItem.width} x {popupItem.height} cm</p>
                    {eqItem && <p className="text-[10px] text-slate-400 mt-0.5">{eqItem.l} x {eqItem.w} x {eqItem.h} mm</p>}
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase mb-1.5"><Zap size={12} /> Guc</div>
                    <p className="font-bold text-slate-700 text-sm">{popupItem.kw > 0 ? `${popupItem.kw} kW` : 'Yok'}</p>
                  </div>
                  {popupItem.price && popupItem.price > 0 && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase mb-1.5"><Euro size={12} /> Fiyat</div>
                      <p className="font-bold text-primary text-sm">{formatPrice(popupItem.price)}</p>
                    </div>
                  )}
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase mb-1.5"><Package size={12} /> Konum</div>
                    <p className="font-bold text-slate-700 text-sm">X: {Math.round(popupItem.x)}, Y: {Math.round(popupItem.y)}</p>
                  </div>
                </div>
                {eqItem && (eqItem.sub || eqItem.fam || eqItem.line) && (
                  <div className="flex flex-wrap gap-2">
                    {eqItem.sub && <span className="px-2.5 py-1 bg-slate-100 rounded-full text-[10px] font-medium text-slate-500">{eqItem.sub}</span>}
                    {eqItem.fam && <span className="px-2.5 py-1 bg-slate-100 rounded-full text-[10px] font-medium text-slate-500">{eqItem.fam}</span>}
                    {eqItem.line && <span className="px-2.5 py-1 bg-slate-100 rounded-full text-[10px] font-medium text-slate-500">{eqItem.line}</span>}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setPopupItem(null); rotateSelected(); }} className="flex-1 py-2.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg flex items-center justify-center gap-1.5"><RotateCw size={14} /> Dondur</button>
                  <button onClick={() => { setPopupItem(null); duplicateSelected(); }} className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-1.5"><Copy size={14} /> Kopyala</button>
                  <button onClick={() => { setPopupItem(null); deleteSelected(); }} className="py-2.5 px-4 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center gap-1.5"><Trash2 size={14} /> Sil</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mobile Properties Bottom Sheet */}
      {showMobileProps && selectedItem && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileProps(false)} />
          <div className="relative bg-white rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-sm text-slate-800 truncate pr-4">{selectedItem.name}</h3>
              <button onClick={() => setShowMobileProps(false)} className="p-1.5 text-slate-400 rounded-full shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Image */}
              {selectedItem.imageData && (
                <div className="w-full h-40 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden">
                  <ProductImage src={selectedItem.imageData} alt={selectedItem.name} className="w-full h-full p-2" />
                </div>
              )}
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Boyutlar</div>
                  <p className="text-xs font-bold text-slate-700">{selectedItem.width} × {selectedItem.height} cm</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Güç</div>
                  <p className="text-xs font-bold text-slate-700">{selectedItem.kw > 0 ? `${selectedItem.kw} kW` : 'Yok'}</p>
                </div>
                {selectedItem.price && selectedItem.price > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Fiyat</div>
                    <p className="text-xs font-bold text-primary">{formatPrice(selectedItem.price)}</p>
                  </div>
                )}
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Konum</div>
                  <p className="text-xs font-bold text-slate-700">X:{Math.round(selectedItem.x)} Y:{Math.round(selectedItem.y)}</p>
                </div>
              </div>
              {/* Actions */}
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => { rotateSelected(); }} className="py-2.5 text-[11px] font-bold text-primary bg-primary/10 rounded-xl flex items-center justify-center gap-1">
                  <RotateCw size={14} /> Döndür
                </button>
                <button onClick={() => { duplicateSelected(); setShowMobileProps(false); }} className="py-2.5 text-[11px] font-bold text-slate-600 bg-slate-100 rounded-xl flex items-center justify-center gap-1">
                  <Copy size={14} /> Kopyala
                </button>
                <button onClick={() => { deleteSelected(); setShowMobileProps(false); }} className="py-2.5 text-[11px] font-bold text-red-500 bg-red-50 rounded-xl flex items-center justify-center gap-1">
                  <Trash2 size={14} /> Sil
                </button>
              </div>
              <button onClick={() => { toggleLockSelected(); }} className={`w-full py-2.5 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 ${selectedItem.locked ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                {selectedItem.locked ? <><Lock size={13} /> Kilidi Aç</> : <><Unlock size={13} /> Kilitle</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Equipment Bottom Sheet */}
      {showMobilePanel && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobilePanel(false)} />
          <div className="relative bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[80vh]">
            {/* Handle */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800">Ekipman Ekle</h3>
              <button onClick={() => setShowMobilePanel(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Ürün ara..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Equipment list */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {catalogItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { addEquipmentToFloorPlan(item); setShowMobilePanel(false); }}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden text-left active:scale-95 transition-transform shadow-sm"
                  >
                    <div className="w-full aspect-[4/3] bg-slate-50 flex items-center justify-center p-1">
                      <ProductImage src={item.img} alt={item.name} className="w-full h-full" />
                    </div>
                    <div className="p-2">
                      <p className="text-[11px] font-bold text-slate-700 leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.id}</p>
                      {item.price > 0 && <p className="text-[10px] font-bold text-[#DC2626] mt-1">{formatPrice(item.price)}</p>}
                    </div>
                  </button>
                ))}
                {catalogItems.length === 0 && (
                  <div className="col-span-2 text-center py-10 text-slate-400">
                    <Package size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs">Ürün bulunamadı</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

