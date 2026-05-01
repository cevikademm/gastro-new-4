import { useEffect, useRef, useState } from 'react';
import {
  Pencil, MousePointer2, Undo2, Trash2,
  ZoomIn, ZoomOut, Maximize2, Info,
  Save, FolderOpen, X, Check, Clock, FileEdit
} from 'lucide-react';
import { debouncedSyncSketches, loadSketches as loadSketchesFromDb } from '../../lib/gastroSync';

/* ─── Types ──────────────────────────────────────────────────── */
interface Pt  { x: number; y: number }          // world coords → cm
interface Seg { id: string; a: Pt; b: Pt; color: string }
interface SavedSketch {
  id: string;
  name: string;
  segs: Seg[];
  savedAt: number;
}

/* ─── Constants ─────────────────────────────────────────────── */
const SNAP       = 0.5;   // snap = 0.5 cm = 5 mm
const HIT        = 22;    // touch hit radius px
const STORAGE_KEY = '2mc-sketches';
const COLORS     = ['#1e293b', '#dc2626', '#16a34a', '#2563eb', '#9333ea', '#ea580c'];

/* ─── Persist helpers ────────────────────────────────────────── */
const loadSketches = (): SavedSketch[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};
const saveSketches = (list: SavedSketch[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  debouncedSyncSketches(list);
};

/* ─── Helpers ───────────────────────────────────────────────── */
const snapV = (v: number) => Math.round(v / SNAP) * SNAP;
const dist  = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);

/* Format cm → mm / cm / m */
const fmt = (cm: number): string => {
  const abs = Math.abs(cm);
  if (abs === 0) return '0';
  if (abs < 1) {
    const mm = cm * 10;
    return `${Number.isInteger(mm) ? mm : mm.toFixed(1)} mm`;
  }
  if (abs < 100) {
    return `${Number.isInteger(cm) ? cm : cm.toFixed(1)} cm`;
  }
  const m = cm / 100;
  return `${Number.isInteger(m) ? m : m.toFixed(2)} m`;
};

const ortho = (a: Pt, b: Pt): Pt => {
  const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
  return dx >= dy ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
};

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* Adaptive grid: pick steps visible at current scale (min 10px spacing) */
const GRID_STEPS = [0.1, 0.5, 1, 5, 10, 50, 100, 500, 1000]; // cm
function visibleGridSteps(scale: number) {
  return GRID_STEPS.filter(s => s * scale >= 10);
}
/* Color/weight for a grid step (heavier = larger step) */
function gridStyle(step: number): { color: string; lw: number } {
  if (step >= 100) return { color: '#a8bbd4', lw: 1.2 };
  if (step >= 10)  return { color: '#c5d4e8', lw: 0.8 };
  if (step >= 1)   return { color: '#d8e4f0', lw: 0.5 };
  return           { color: '#e8eef6', lw: 0.4 };
}

/* ─── SketchPage ─────────────────────────────────────────────── */
export default function SketchPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ── UI state ── */
  const [uiMode,    setUiMode]    = useState<'draw' | 'edit'>('draw');
  const [lineCount, setLineCount] = useState(0);
  const [histLen,   setHistLen]   = useState(0);
  const [selColor,  setSelColor]  = useState(COLORS[0]);
  const [showHint,  setShowHint]  = useState(true);

  /* Save/Load modal state */
  const [showSave,   setShowSave]   = useState(false);
  const [showLoad,   setShowLoad]   = useState(false);
  const [sketchName, setSketchName] = useState('Yeni Eskiz');
  const [savedList,  setSavedList]  = useState<SavedSketch[]>(loadSketches);
  const [activeId,   setActiveId]   = useState<string | null>(null); // currently loaded sketch id

  /* ── All mutable drawing state ── */
  const st = useRef({
    segs:  [] as Seg[],
    hist:  [] as Seg[][],
    pan:   { x: 0, y: 0 } as Pt,
    scale: 8,             // px/cm → 8px = 1cm → ~800px = 1m (good for mm work)
    mode:  'draw' as 'draw' | 'edit',
    // drawing
    isDrawing: false,
    dA: null as Pt | null,
    dB: null as Pt | null,
    // editing
    editNode: null as { si: number; w: 'a' | 'b' } | null,
    // two-finger
    twoFinger: false,
    pinchDist: 0,
    pinchMidS: { x: 0, y: 0 } as Pt,
    pinchPanS: { x: 0, y: 0 } as Pt,
    // mouse
    mPanning:   false,
    mPanStart:  { x: 0, y: 0 } as Pt,
    mPanOrigin: { x: 0, y: 0 } as Pt,
    mDragging:  false,
  });

  const colorRef = useRef(COLORS[0]);
  colorRef.current = selColor;

  // Load from Supabase on mount (merge if local is empty)
  useEffect(() => {
    loadSketchesFromDb().then((remote) => {
      if (!remote || remote.length === 0) return;
      const local = loadSketches();
      if (local.length === 0) {
        saveSketches(remote);
        setSavedList(remote);
      }
    });
  }, []);

  const sync = () => {
    setLineCount(st.current.segs.length);
    setHistLen(st.current.hist.length);
  };

  const applyMode = (m: 'draw' | 'edit') => {
    st.current.mode = m;
    st.current.isDrawing = false;
    st.current.dA = null; st.current.dB = null;
    st.current.editNode = null;
    setUiMode(m);
  };

  const undo = () => {
    const s = st.current;
    if (!s.hist.length) return;
    s.segs = s.hist.pop()!; sync();
  };

  const clearAll = () => {
    const s = st.current;
    if (!s.segs.length) return;
    s.hist.push(s.segs.map(l => ({ ...l, a: { ...l.a }, b: { ...l.b } })));
    s.segs = []; sync();
  };

  const resetView = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    st.current.pan   = { x: rect.width / 2, y: rect.height / 2 };
    st.current.scale = 8;
  };

  /* ── Save current sketch ── */
  const handleSave = () => {
    const s      = st.current;
    const segs   = s.segs.map(l => ({ ...l, a: { ...l.a }, b: { ...l.b } }));
    const list   = loadSketches();
    const now    = Date.now();

    if (activeId) {
      // Overwrite existing
      const idx = list.findIndex(sk => sk.id === activeId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], name: sketchName, segs, savedAt: now };
      } else {
        list.push({ id: activeId, name: sketchName, segs, savedAt: now });
      }
    } else {
      const id = `sketch-${now}`;
      list.push({ id, name: sketchName, segs, savedAt: now });
      setActiveId(id);
    }

    saveSketches(list);
    setSavedList(list);
    setShowSave(false);
  };

  /* ── Save as new ── */
  const handleSaveAs = () => {
    const s    = st.current;
    const segs = s.segs.map(l => ({ ...l, a: { ...l.a }, b: { ...l.b } }));
    const list = loadSketches();
    const id   = `sketch-${Date.now()}`;
    list.push({ id, name: sketchName, segs, savedAt: Date.now() });
    saveSketches(list);
    setSavedList(list);
    setActiveId(id);
    setShowSave(false);
  };

  /* ── Load a sketch ── */
  const handleLoad = (sk: SavedSketch) => {
    const s = st.current;
    s.hist.push(s.segs.map(l => ({ ...l, a: { ...l.a }, b: { ...l.b } })));
    s.segs = sk.segs.map(l => ({ ...l, a: { ...l.a }, b: { ...l.b } }));
    setActiveId(sk.id);
    setSketchName(sk.name);
    setShowLoad(false);
    sync();
  };

  /* ── Delete a sketch ── */
  const handleDelete = (id: string) => {
    const list = savedList.filter(sk => sk.id !== id);
    saveSketches(list);
    setSavedList(list);
    if (activeId === id) setActiveId(null);
  };

  /* ─── Main canvas effect ──────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const dpr    = window.devicePixelRatio || 1;
    let raf: number;
    let initialized = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      if (!initialized) {
        st.current.pan = { x: rect.width / 2, y: rect.height / 2 };
        initialized = true;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* ── Render ── */
    const render = () => {
      const ctx = canvas.getContext('2d')!;
      const s   = st.current;
      const { pan, scale, segs, isDrawing, dA, dB, editNode, mode } = s;
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      /* Background */
      ctx.fillStyle = '#f0f4f8';
      ctx.fillRect(0, 0, W, H);

      const wL = -pan.x / scale, wT = -pan.y / scale;
      const wR = (W - pan.x) / scale, wB = (H - pan.y) / scale;

      /* ── Adaptive grid ── */
      const steps = visibleGridSteps(scale);
      // Draw from finest to coarsest (coarser overdraws finer at same position)
      steps.forEach(step => {
        const { color, lw } = gridStyle(step);
        ctx.strokeStyle = color; ctx.lineWidth = lw;
        ctx.beginPath();
        for (let wx = Math.floor(wL / step) * step; wx <= wR + step; wx += step) {
          const sx = wx * scale + pan.x;
          ctx.moveTo(sx, 0); ctx.lineTo(sx, H);
        }
        for (let wy = Math.floor(wT / step) * step; wy <= wB + step; wy += step) {
          const sy = wy * scale + pan.y;
          ctx.moveTo(0, sy); ctx.lineTo(W, sy);
        }
        ctx.stroke();
      });

      /* ── Grid labels — show at the largest visible step ── */
      const labelStep = steps[steps.length - 1] || 100;
      const lSize = Math.max(8, Math.min(11, scale * 1.5));
      ctx.font = `${lSize}px monospace`;
      ctx.fillStyle = '#7b93b0';
      ctx.textBaseline = 'top'; ctx.textAlign = 'left';
      for (let wx = Math.floor(wL / labelStep) * labelStep; wx <= wR; wx += labelStep) {
        const sx = wx * scale + pan.x;
        ctx.fillText(wx === 0 ? '0' : fmt(wx), sx + 2, pan.y + 2);
      }
      for (let wy = Math.floor(wT / labelStep) * labelStep; wy <= wB; wy += labelStep) {
        if (wy === 0) continue;
        const sy = wy * scale + pan.y;
        ctx.fillText(fmt(wy), pan.x + 2, sy + 2);
      }

      /* ── Axes ── */
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath();
      if (pan.x > 0 && pan.x < W) { ctx.moveTo(pan.x, 0); ctx.lineTo(pan.x, H); }
      if (pan.y > 0 && pan.y < H) { ctx.moveTo(0, pan.y); ctx.lineTo(W, pan.y); }
      ctx.stroke(); ctx.setLineDash([]);

      /* Origin dot */
      if (pan.x > 0 && pan.x < W && pan.y > 0 && pan.y < H) {
        ctx.fillStyle = '#64748b';
        ctx.beginPath(); ctx.arc(pan.x, pan.y, 4, 0, Math.PI * 2); ctx.fill();
      }

      /* ── Segments ── */
      segs.forEach((seg, si) => {
        const sax = seg.a.x * scale + pan.x, say = seg.a.y * scale + pan.y;
        const sbx = seg.b.x * scale + pan.x, sby = seg.b.y * scale + pan.y;
        const isSel = editNode?.si === si;

        ctx.shadowColor = 'rgba(0,0,0,0.12)'; ctx.shadowBlur = isSel ? 8 : 4;
        ctx.strokeStyle = seg.color;
        ctx.lineWidth   = isSel ? 4 : 3;
        ctx.lineCap     = 'round';
        ctx.beginPath(); ctx.moveTo(sax, say); ctx.lineTo(sbx, sby); ctx.stroke();
        ctx.shadowBlur  = 0; ctx.shadowColor = 'transparent';

        /* Measurement badge */
        const lenCm = dist(seg.a, seg.b);
        const mx = (sax + sbx) / 2, my = (say + sby) / 2;
        const txt = fmt(lenCm);
        ctx.font = 'bold 10px system-ui';
        const tw = ctx.measureText(txt).width;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.shadowColor = 'rgba(0,0,0,0.08)'; ctx.shadowBlur = 4;
        rrect(ctx, mx - tw / 2 - 6, my - 9, tw + 12, 17, 4); ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
        ctx.strokeStyle = seg.color + '55'; ctx.lineWidth = 1;
        rrect(ctx, mx - tw / 2 - 6, my - 9, tw + 12, 17, 4); ctx.stroke();
        ctx.fillStyle = seg.color;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(txt, mx, my);

        /* Handles */
        ([[sax, say, 'a'], [sbx, sby, 'b']] as [number, number, string][]).forEach(([px, py, w]) => {
          const isAN = isSel && editNode?.w === w;
          const r = mode === 'edit' ? (isAN ? 11 : 8) : 4;
          ctx.shadowColor = isAN ? seg.color + '66' : 'rgba(0,0,0,0.08)';
          ctx.shadowBlur  = isAN ? 10 : 3;
          ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fillStyle = isAN ? seg.color : (mode === 'edit' ? '#ffffff' : seg.color);
          ctx.fill();
          if (mode === 'edit') {
            ctx.strokeStyle = seg.color; ctx.lineWidth = 2; ctx.stroke();
          }
          ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
        });
      });

      /* ── Live drawing ── */
      if (isDrawing && dA && dB) {
        const sax = dA.x * scale + pan.x, say = dA.y * scale + pan.y;
        const sbx = dB.x * scale + pan.x, sby = dB.y * scale + pan.y;
        const col = colorRef.current;
        const isH = Math.abs(dB.x - dA.x) >= Math.abs(dB.y - dA.y);

        /* Preview line */
        ctx.strokeStyle = col; ctx.lineWidth = 2.5;
        ctx.setLineDash([7, 4]); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sax, say); ctx.lineTo(sbx, sby); ctx.stroke();
        ctx.setLineDash([]);

        /* Right-angle indicator */
        const cs = 10;
        ctx.strokeStyle = col + '80'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (isH) {
          ctx.moveTo(sax + (sbx > sax ? cs : -cs), say);
          ctx.lineTo(sax + (sbx > sax ? cs : -cs), say + cs);
          ctx.lineTo(sax, say + cs);
        } else {
          ctx.moveTo(sax, say + (sby > say ? cs : -cs));
          ctx.lineTo(sax + cs, say + (sby > say ? cs : -cs));
          ctx.lineTo(sax + cs, say);
        }
        ctx.stroke();

        /* Start dot */
        ctx.fillStyle = col;
        ctx.shadowColor = col + '55'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(sax, say, 7, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

        /* End dot (pulsing) */
        ctx.fillStyle = col + 'aa';
        ctx.beginPath(); ctx.arc(sbx, sby, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(sbx, sby, 5, 0, Math.PI * 2); ctx.fill();

        /* ── Live measurement tooltip ── */
        const lenCm = dist(dA, dB);
        if (lenCm >= 0.1) {
          const mainTxt = fmt(lenCm);
          const dirTxt  = isH ? '⟷ Yatay' : '⟺ Dikey';
          ctx.font = 'bold 15px system-ui';
          const tw  = ctx.measureText(mainTxt).width;
          const bw  = tw + 30; const bh = 44;
          let   tx  = sbx + 18; let ty = sby - 20;
          if (tx + bw > W - 8) tx = sbx - bw - 10;
          if (ty - 4  < 0)     ty = sby + 14;
          if (ty + bh > H - 8) ty = sby - bh - 8;

          ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 14;
          ctx.fillStyle = '#0f172a';
          rrect(ctx, tx - 8, ty - 6, bw, bh, 10); ctx.fill();
          ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

          /* Accent strip */
          ctx.fillStyle = col;
          rrect(ctx, tx - 8, ty - 6, 4, bh, 2); ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          ctx.font = 'bold 15px system-ui';
          ctx.fillText(mainTxt, tx + 2, ty + 13);

          ctx.font = '10px system-ui';
          ctx.fillStyle = '#93c5fd';
          ctx.fillText(dirTxt, tx + 2, ty + 28);

          /* Tick ruler */
          const tickY = ty + 38;
          const tickW = Math.min(tw, 60);
          ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tx + 2, tickY); ctx.lineTo(tx + 2 + tickW, tickY); ctx.stroke();
          [0, 0.25, 0.5, 0.75, 1].forEach(f => {
            const tx2 = tx + 2 + f * tickW;
            ctx.beginPath();
            ctx.moveTo(tx2, tickY - (f === 0 || f === 1 ? 4 : 2));
            ctx.lineTo(tx2, tickY); ctx.stroke();
          });
        }
      }

      /* ── Scale ruler (bottom-right) ── */
      const rulerCm = (() => {
        // Pick a "round" ruler length that fits nicely
        const targets = [0.5, 1, 5, 10, 50, 100, 500];
        for (const t of targets) {
          if (t * scale >= 60 && t * scale <= 160) return t;
        }
        return targets[targets.length - 1];
      })();
      const rulerPx = rulerCm * scale;
      const rx = W - 16, ry = H - 18;
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5; ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(rx - rulerPx, ry); ctx.lineTo(rx, ry);
      ctx.moveTo(rx - rulerPx, ry - 5); ctx.lineTo(rx - rulerPx, ry + 5);
      ctx.moveTo(rx, ry - 5);          ctx.lineTo(rx, ry + 5);
      ctx.stroke();
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(fmt(rulerCm), rx - rulerPx / 2, ry - 6);

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    /* ── Helpers ── */
    const canvasXY = (cx: number, cy: number): Pt => {
      const r = canvas.getBoundingClientRect();
      return { x: cx - r.left, y: cy - r.top };
    };
    const toWorld = (sp: Pt): Pt => ({
      x: snapV((sp.x - st.current.pan.x) / st.current.scale),
      y: snapV((sp.y - st.current.pan.y) / st.current.scale),
    });
    const hitNode = (sp: Pt) => {
      const { segs, scale, pan } = st.current;
      for (let si = segs.length - 1; si >= 0; si--) {
        const sax = segs[si].a.x * scale + pan.x, say = segs[si].a.y * scale + pan.y;
        const sbx = segs[si].b.x * scale + pan.x, sby = segs[si].b.y * scale + pan.y;
        if (Math.hypot(sp.x - sax, sp.y - say) < HIT) return { si, w: 'a' as const };
        if (Math.hypot(sp.x - sbx, sp.y - sby) < HIT) return { si, w: 'b' as const };
      }
      return null;
    };
    const commitDraw = () => {
      const s = st.current;
      if (!s.isDrawing || !s.dA || !s.dB) return;
      const len = dist(s.dA, s.dB);
      if (len >= SNAP) { // min 5mm
        s.hist.push(s.segs.map(l => ({ ...l, a: { ...l.a }, b: { ...l.b } })));
        s.segs = [...s.segs, {
          id: `${Date.now()}-${Math.random()}`,
          a: { ...s.dA }, b: { ...s.dB },
          color: colorRef.current,
        }];
        sync();
      }
      s.isDrawing = false; s.dA = null; s.dB = null;
    };

    /* ── Touch handlers ── */
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const s = st.current;
      if (e.touches.length >= 2) {
        s.twoFinger = true;
        s.isDrawing = false; s.dA = null; s.dB = null; s.editNode = null;
        const t1 = canvasXY(e.touches[0].clientX, e.touches[0].clientY);
        const t2 = canvasXY(e.touches[1].clientX, e.touches[1].clientY);
        s.pinchDist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
        s.pinchMidS = { x: (t1.x + t2.x) / 2, y: (t1.y + t2.y) / 2 };
        s.pinchPanS = { ...s.pan };
        return;
      }
      s.twoFinger = false;
      const sp = canvasXY(e.touches[0].clientX, e.touches[0].clientY);
      if (s.mode === 'edit') {
        const node = hitNode(sp);
        if (node) s.editNode = node;
        return;
      }
      const wp = toWorld(sp);
      s.isDrawing = true; s.dA = wp; s.dB = { ...wp };
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const s = st.current;
      if (e.touches.length >= 2 && s.twoFinger) {
        const t1  = canvasXY(e.touches[0].clientX, e.touches[0].clientY);
        const t2  = canvasXY(e.touches[1].clientX, e.touches[1].clientY);
        const mid = { x: (t1.x + t2.x) / 2, y: (t1.y + t2.y) / 2 };
        const d2  = Math.hypot(t2.x - t1.x, t2.y - t1.y);
        s.pan = { x: s.pinchPanS.x + mid.x - s.pinchMidS.x, y: s.pinchPanS.y + mid.y - s.pinchMidS.y };
        if (s.pinchDist > 0) {
          const ns = Math.max(0.3, Math.min(60, s.scale * (d2 / s.pinchDist)));
          const wx = (mid.x - s.pan.x) / s.scale, wy = (mid.y - s.pan.y) / s.scale;
          s.pan.x = mid.x - wx * ns; s.pan.y = mid.y - wy * ns; s.scale = ns;
          s.pinchDist = d2; s.pinchMidS = mid; s.pinchPanS = { ...s.pan };
        }
        return;
      }
      if (e.touches.length !== 1) return;
      const sp = canvasXY(e.touches[0].clientX, e.touches[0].clientY);
      if (s.mode === 'edit' && s.editNode) {
        const seg = s.segs[s.editNode.si];
        if (seg) seg[s.editNode.w] = toWorld(sp);
        return;
      }
      if (s.isDrawing && s.dA) s.dB = ortho(s.dA, toWorld(sp));
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      const s = st.current;
      if (e.touches.length === 0) s.twoFinger = false;
      if (s.editNode) { s.editNode = null; sync(); return; }
      commitDraw();
    };

    /* ── Mouse handlers ── */
    const onMouseDown = (e: MouseEvent) => {
      const s = st.current;
      const sp = canvasXY(e.clientX, e.clientY);
      if (e.button === 1 || e.altKey || e.button === 2) {
        s.mPanning = true; s.mPanStart = { ...sp }; s.mPanOrigin = { ...s.pan }; return;
      }
      if (s.mode === 'edit') {
        const node = hitNode(sp);
        if (node) { s.editNode = node; s.mDragging = true; } return;
      }
      const wp = toWorld(sp);
      s.isDrawing = true; s.dA = wp; s.dB = { ...wp }; s.mDragging = true;
    };

    const onMouseMove = (e: MouseEvent) => {
      const s = st.current;
      const sp = canvasXY(e.clientX, e.clientY);
      if (s.mPanning) {
        s.pan = { x: s.mPanOrigin.x + sp.x - s.mPanStart.x, y: s.mPanOrigin.y + sp.y - s.mPanStart.y }; return;
      }
      if (s.mode === 'edit' && s.editNode && s.mDragging) {
        const seg = s.segs[s.editNode.si];
        if (seg) seg[s.editNode.w] = toWorld(sp); return;
      }
      if (s.isDrawing && s.dA && s.mDragging) s.dB = ortho(s.dA, toWorld(sp));
    };

    const onMouseUp = () => {
      const s = st.current;
      s.mPanning = false; s.mDragging = false;
      if (s.editNode) { s.editNode = null; sync(); return; }
      commitDraw();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = st.current;
      const sp = canvasXY(e.clientX, e.clientY);
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      const ns = Math.max(0.3, Math.min(60, s.scale * factor));
      const wx = (sp.x - s.pan.x) / s.scale, wy = (sp.y - s.pan.y) / s.scale;
      s.pan.x = sp.x - wx * ns; s.pan.y = sp.y - wy * ns; s.scale = ns;
    };

    canvas.addEventListener('touchstart',  onTouchStart, { passive: false });
    canvas.addEventListener('touchmove',   onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',    onTouchEnd,   { passive: false });
    canvas.addEventListener('mousedown',   onMouseDown);
    canvas.addEventListener('mousemove',   onMouseMove);
    canvas.addEventListener('mouseup',     onMouseUp);
    canvas.addEventListener('mouseleave',  onMouseUp);
    canvas.addEventListener('wheel',       onWheel,      { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('touchstart',  onTouchStart);
      canvas.removeEventListener('touchmove',   onTouchMove);
      canvas.removeEventListener('touchend',    onTouchEnd);
      canvas.removeEventListener('mousedown',   onMouseDown);
      canvas.removeEventListener('mousemove',   onMouseMove);
      canvas.removeEventListener('mouseup',     onMouseUp);
      canvas.removeEventListener('mouseleave',  onMouseUp);
      canvas.removeEventListener('wheel',       onWheel);
    };
  }, []);

  /* ─── JSX ────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col bg-slate-50" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-white border-b border-slate-200 shadow-sm z-10 flex-wrap select-none">

        {/* Mode */}
        <div className="flex rounded-lg overflow-hidden border border-slate-200 shadow-sm">
          <button onClick={() => applyMode('draw')}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-bold transition-all ${uiMode === 'draw' ? 'bg-primary text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
            <Pencil size={13} /> Çiz
          </button>
          <div className="w-px bg-slate-200" />
          <button onClick={() => applyMode('edit')}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-bold transition-all ${uiMode === 'edit' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
            <MousePointer2 size={13} /> Düzenle
          </button>
        </div>

        <div className="w-px h-5 bg-slate-200" />

        {/* Colors */}
        <div className="flex items-center gap-1">
          {COLORS.map(c => (
            <button key={c} onClick={() => { setSelColor(c); colorRef.current = c; }}
              className={`w-5 h-5 rounded-full transition-all border-2 ${selColor === c ? 'border-slate-700 scale-125' : 'border-transparent hover:scale-110'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200" />

        {/* Undo / Clear */}
        <button onClick={undo} disabled={histLen === 0}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-all">
          <Undo2 size={12} /> Geri
        </button>
        <button onClick={clearAll} disabled={lineCount === 0}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-30 transition-all">
          <Trash2 size={12} /> Temizle
        </button>

        <div className="w-px h-5 bg-slate-200" />

        {/* Zoom */}
        <div className="flex rounded-lg overflow-hidden border border-slate-200">
          <button onClick={() => { st.current.scale = Math.min(60, st.current.scale * 1.25); }}
            className="px-2 py-1.5 bg-white hover:bg-slate-50 text-slate-500 transition-colors">
            <ZoomIn size={13} />
          </button>
          <div className="w-px bg-slate-200" />
          <button onClick={() => { st.current.scale = Math.max(0.3, st.current.scale / 1.25); }}
            className="px-2 py-1.5 bg-white hover:bg-slate-50 text-slate-500 transition-colors">
            <ZoomOut size={13} />
          </button>
          <div className="w-px bg-slate-200" />
          <button onClick={resetView} title="Görünümü sıfırla"
            className="px-2 py-1.5 bg-white hover:bg-slate-50 text-slate-500 transition-colors">
            <Maximize2 size={13} />
          </button>
        </div>

        <div className="w-px h-5 bg-slate-200" />

        {/* Save / Load */}
        <button onClick={() => setShowSave(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all">
          <Save size={13} /> Kaydet
        </button>
        <button onClick={() => { setSavedList(loadSketches()); setShowLoad(true); }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-[#7B1F26] hover:bg-red-100 transition-all">
          <FolderOpen size={13} /> Aç
        </button>

        {/* Active sketch name */}
        {activeId && (
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 hidden sm:flex">
            <FileEdit size={10} /> {sketchName}
          </span>
        )}

        <span className="text-[10px] text-slate-400 font-mono hidden md:inline ml-1">
          {lineCount} çizgi · snap 5mm
        </span>

        <button onClick={() => setShowHint(h => !h)}
          className={`ml-auto p-1.5 rounded-lg transition-colors ${showHint ? 'text-primary bg-primary/10' : 'text-slate-400 hover:bg-slate-100'}`}>
          <Info size={14} />
        </button>
      </div>

      {/* ── Canvas area ── */}
      <div className="relative flex-1 overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full touch-none block"
          style={{ cursor: uiMode === 'edit' ? 'default' : 'crosshair' }} />

        {/* Mode badge */}
        <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-md pointer-events-none select-none ${
          uiMode === 'draw' ? 'bg-primary text-white' : 'bg-amber-500 text-white'}`}>
          {uiMode === 'draw' ? '✏️ Çizim — snap 5mm' : '✋ Düzenleme Modu'}
        </div>

        {/* Hint */}
        {showHint && (
          <div className="absolute bottom-3 left-3 bg-white/92 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 p-3 text-[10px] text-slate-500 space-y-1 pointer-events-none select-none max-w-[210px]">
            <p className="font-bold text-slate-700 text-[11px] mb-1">Kullanım</p>
            {uiMode === 'draw' ? (
              <>
                <p>👆 <b>Basılı sürükle</b> → çizgi çiz</p>
                <p>📐 Otomatik dik açı · snap 5mm</p>
                <p>🔢 Canlı ölçü (mm / cm / m)</p>
                <p>🤙 <b>İki parmak</b> → kaydır + zoom</p>
                <p>🖱 <b>Tekerlek</b> → zoom</p>
              </>
            ) : (
              <>
                <p>👆 <b>Noktaya bas sürükle</b> → uzat/kısalt</p>
                <p>🤙 <b>İki parmak</b> → kaydır + zoom</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ══ Save Modal ══════════════════════════════════════════ */}
      {showSave && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSave(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-headline font-black text-on-surface flex items-center gap-2">
                <Save size={18} className="text-emerald-600" /> Eskizi Kaydet
              </h2>
              <button onClick={() => setShowSave(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Eskiz Adı</label>
              <input
                type="text"
                value={sketchName}
                onChange={e => setSketchName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Eskiz adı..."
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-1">
              {activeId && (
                <button onClick={handleSave}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all">
                  <Check size={15} /> Üzerine Kaydet
                </button>
              )}
              <button onClick={handleSaveAs}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeId ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                <Save size={15} /> {activeId ? 'Yeni Olarak' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Load Modal ══════════════════════════════════════════ */}
      {showLoad && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowLoad(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-base font-headline font-black text-on-surface flex items-center gap-2">
                <FolderOpen size={18} className="text-[#7B1F26]" /> Kayıtlı Eskizler
              </h2>
              <button onClick={() => setShowLoad(false)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {savedList.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FolderOpen size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Henüz kayıtlı eskiz yok</p>
                </div>
              ) : (
                savedList.slice().reverse().map(sk => (
                  <div key={sk.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                      activeId === sk.id ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    onClick={() => handleLoad(sk)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{sk.name}</p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock size={9} />
                        {new Date(sk.savedAt).toLocaleString('tr-TR')}
                        · {sk.segs.length} çizgi
                      </p>
                    </div>
                    {activeId === sk.id && (
                      <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Açık</span>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(sk.id); }}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400">{savedList.length} kayıtlı eskiz</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
