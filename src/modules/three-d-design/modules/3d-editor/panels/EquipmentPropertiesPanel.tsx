/**
 * EquipmentPropertiesPanel — floats top-right when an item is selected.
 *
 * Why a dedicated panel?
 *   Keyboard 'R' rotation alone doesn't cover real-world placement. Some
 *   GLBs / textured boxes face the wrong way out of the box, and B2B mutfak
 *   plans need 1 mm precision. The panel exposes:
 *     - X / Y position (mm) — slider + number input
 *     - Rotation (0-360°) with 90° step buttons + 180° front/back flip
 *     - Lock toggle, Delete
 *     - Read-only W × D × H so the user can see the real scale
 *
 * Writes go through the store with collision + edge-snap applied so the
 * physical invariant ("ürünler birbirinin içinden geçemez") holds whether
 * the user is dragging in 3D OR adjusting the slider.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Lock,
  Unlock,
  Trash2,
  RotateCw,
  RotateCcw,
  RefreshCw,
  Rotate3d,
  Move,
  ArrowUp,
  ArrowDown,
  Minus,
  Square as FloorIcon,
  PanelLeft as WallIcon,
  Layers as OverlapIcon,
} from 'lucide-react';
import { useProjectStore } from '../../../store';
import type { Equipment, EquipmentId } from '../../../core/types';
import { othersAtHeight, resolveCollision, snapToEdges } from '../interaction/collision';
import {
  containFloorItem,
  DEFAULT_WALL_MOUNT_Z,
  mountToWall,
  snapFloorItemToWalls,
} from '../interaction/placement';
import { deterministicHex } from '../../../lib/equipmentColor';

interface EquipmentPropertiesPanelProps {
  equipmentId: string | null;
  onClose: () => void;
  /** 3B döndürme halkaları (gizmo) açık mı? */
  gizmoEnabled?: boolean;
  /** Halkaları aç/kapat — tıklayınca otomatik açılmaz, kullanıcı buradan açar. */
  onToggleGizmo?: () => void;
}

const ROT_STEPS = [0, 90, 180, 270] as const;
const EDGE_SNAP_TOL_MM = 50;

export default function EquipmentPropertiesPanel({
  equipmentId,
  onClose,
  gizmoEnabled = false,
  onToggleGizmo,
}: EquipmentPropertiesPanelProps) {
  const { t } = useTranslation();
  const project = useProjectStore((s) => s.project);
  const update = useProjectStore((s) => s.update);
  const removeEquipment = useProjectStore((s) => s.removeEquipment);

  const eq = equipmentId ? (project.equipment[equipmentId as EquipmentId] as Equipment | undefined) : undefined;

  // Local mirrors for inputs (so typing doesn't fight live store updates).
  const [xInput, setXInput] = useState('');
  const [yInput, setYInput] = useState('');
  const [zInput, setZInput] = useState('');
  const [rotInput, setRotInput] = useState('');
  const [tiltXInput, setTiltXInput] = useState('');
  const [tiltYInput, setTiltYInput] = useState('');
  useEffect(() => {
    if (!eq) return;
    setXInput(Math.round(eq.position.x).toString());
    setYInput(Math.round(eq.position.y).toString());
    setZInput(Math.round(eq.position.z).toString());
    setRotInput(Math.round(((eq.rotation * 180) / Math.PI + 360) % 360).toString());
    setTiltXInput(Math.round(((eq.tiltX ?? 0) * 180) / Math.PI).toString());
    setTiltYInput(Math.round(((eq.tiltY ?? 0) * 180) / Math.PI).toString());
  }, [eq?.id, eq?.position.x, eq?.position.y, eq?.position.z, eq?.rotation, eq?.tiltX, eq?.tiltY]);

  const otherEquipment = useMemo(() => {
    if (!eq) return [];
    return Object.values(project.equipment).filter((o) => o.id !== eq.id);
  }, [project.equipment, eq?.id]);

  if (!eq) return null;

  const setPosition = (xMm: number, yMm: number, applySnap: boolean = true) => {
    let x = xMm;
    let y = yMm;
    if (applySnap) {
      // Only neighbours sharing this item's height band constrain it; overlap'e
      // izinli komşular çakışma dışı, overlap-izinli bu ürün de çakışma çözmesini atlar.
      const blockers = othersAtHeight(eq.position.z, eq.heightMm, otherEquipment)
        .filter((o) => !o.allowOverlap);
      if (!eq.allowOverlap) {
        const snapped = snapToEdges(
          { x, y },
          eq.rotation,
          eq.footprint.width,
          eq.footprint.depth,
          blockers,
          eq.id,
          EDGE_SNAP_TOL_MM,
        );
        const resolved = resolveCollision(
          snapped,
          eq.rotation,
          eq.footprint.width,
          eq.footprint.depth,
          blockers,
          eq.id,
        );
        x = resolved.x;
        y = resolved.y;
      }
      // Zemin ürünü: yakın duvara yapışsın (yanaşma) ve oda dışına çıkamasın (HER ZAMAN).
      if ((eq.mount ?? 'floor') === 'floor') {
        const snappedWall = snapFloorItemToWalls(
          project,
          { x, y },
          eq.rotation,
          eq.footprint.width,
          eq.footprint.depth,
        );
        const contained = containFloorItem(
          project,
          snappedWall,
          eq.rotation,
          eq.footprint.width,
          eq.footprint.depth,
        );
        x = contained.x;
        y = contained.y;
      }
    }
    update((d) => {
      const e = d.equipment[eq.id];
      if (!e) return;
      e.position = { x, y, z: e.position.z };
    });
  };

  const setZ = (zMm: number) => {
    const z = Math.max(0, Math.round(zMm));
    update((d) => {
      const e = d.equipment[eq.id];
      if (!e) return;
      e.position = { x: e.position.x, y: e.position.y, z };
    });
  };

  const mount = eq.mount ?? 'floor';

  const setMount = (next: 'floor' | 'wall') => {
    if (next === mount) return;
    if (next === 'wall') {
      // En yakın duvara yapıştır, odaya baksın, montaj yüksekliğine al.
      const center = {
        x: eq.position.x + (eq.footprint.width / 2),
        y: eq.position.y + (eq.footprint.depth / 2),
      };
      const mounted = mountToWall(project, center, eq.footprint.width, eq.footprint.depth);
      const z = eq.position.z > 0 ? eq.position.z : DEFAULT_WALL_MOUNT_Z;
      update((d) => {
        const e = d.equipment[eq.id];
        if (!e) return;
        e.mount = 'wall';
        if (mounted) {
          e.position = { x: mounted.pos.x, y: mounted.pos.y, z };
          e.rotation = mounted.rotation;
        } else {
          e.position = { x: e.position.x, y: e.position.y, z };
        }
      });
    } else {
      // Zemine indir, x/y koru ama oda içine clamp et.
      const contained = containFloorItem(
        project,
        { x: eq.position.x, y: eq.position.y },
        eq.rotation,
        eq.footprint.width,
        eq.footprint.depth,
      );
      update((d) => {
        const e = d.equipment[eq.id];
        if (!e) return;
        e.mount = 'floor';
        e.position = { x: contained.x, y: contained.y, z: 0 };
      });
    }
  };

  const setWallHeight = (zMm: number) => {
    const z = Math.max(0, Math.min(2400, Math.round(zMm)));
    update((d) => {
      const e = d.equipment[eq.id];
      if (!e) return;
      e.position = { x: e.position.x, y: e.position.y, z };
    });
  };

  const setRotation = (rad: number) => {
    // After rotation, OBB shifts — re-resolve collision so the rotated item
    // doesn't overlap a neighbour that was OK at the old angle.
    const blockers = othersAtHeight(eq.position.z, eq.heightMm, otherEquipment)
      .filter((o) => !o.allowOverlap);
    const resolved = eq.allowOverlap
      ? { x: eq.position.x, y: eq.position.y }
      : resolveCollision(
          { x: eq.position.x, y: eq.position.y },
          rad,
          eq.footprint.width,
          eq.footprint.depth,
          blockers,
          eq.id,
        );
    let rx = resolved.x;
    let ry = resolved.y;
    // Döndürme köşeleri duvara sokabilir — zemin ürününü oda/duvar içinde tut.
    if ((eq.mount ?? 'floor') === 'floor') {
      const contained = containFloorItem(
        project,
        { x: rx, y: ry },
        rad,
        eq.footprint.width,
        eq.footprint.depth,
      );
      rx = contained.x;
      ry = contained.y;
    }
    update((d) => {
      const e = d.equipment[eq.id];
      if (!e) return;
      e.rotation = rad;
      e.position = { x: rx, y: ry, z: e.position.z };
    });
  };

  const setTilt = (axis: 'x' | 'y', rad: number) => {
    update((d) => {
      const e = d.equipment[eq.id];
      if (!e) return;
      if (axis === 'x') e.tiltX = rad;
      else e.tiltY = rad;
    });
  };

  const toggleLock = () => {
    update((d) => {
      const e = d.equipment[eq.id];
      if (!e) return;
      e.locked = !e.locked;
    });
  };

  const handleDelete = () => {
    removeEquipment(eq.id);
    onClose();
  };

  const xMm = Math.round(eq.position.x);
  const yMm = Math.round(eq.position.y);
  const zMm = Math.round(eq.position.z);
  const rotDeg = Math.round(((eq.rotation * 180) / Math.PI + 360) % 360);
  const tiltXDeg = Math.round(((eq.tiltX ?? 0) * 180) / Math.PI);
  const tiltYDeg = Math.round(((eq.tiltY ?? 0) * 180) / Math.PI);
  const isUpright = tiltXDeg === 0 && tiltYDeg === 0;

  // Slider ranges: ±20 m around current position is plenty for any kitchen.
  const xMin = xMm - 20000;
  const xMax = xMm + 20000;
  const yMin = yMm - 20000;
  const yMax = yMm + 20000;

  return (
    <aside className="absolute top-3 right-3 w-72 rounded-2xl border border-slate-200/70 bg-white/95 backdrop-blur shadow-lg shadow-slate-900/5 text-[11px] flex flex-col max-h-[calc(100vh-7rem)] overflow-y-auto">
      <header className="px-4 h-11 flex items-center gap-2 border-b border-slate-100">
        <Move size={13} className="text-brand-red shrink-0" />
        <span className="text-[12px] font-semibold text-slate-800 truncate flex-1" title={eq.name}>
          {eq.name}
        </span>
        <button
          type="button"
          onClick={toggleLock}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          title={eq.locked ? 'Kilidi aç' : 'Kilitle'}
        >
          {eq.locked ? <Lock size={13} /> : <Unlock size={13} />}
        </button>
      </header>

      {/* Read-only scale info — kullanıcının ölçek bilgisini her zaman görmesi için. */}
      <Section title="Ölçü">
        <div className="grid grid-cols-3 gap-1.5 tabular-nums text-slate-700">
          <Stat label="G" value={eq.footprint.width} unit="mm" />
          <Stat label="D" value={eq.footprint.depth} unit="mm" />
          <Stat label="Y" value={eq.heightMm} unit="mm" />
        </div>
      </Section>

      {/* Görünüm — ayırt edici renk (2B dolgu + 3B fallback tonu) + üst üste izni */}
      <Section title={t('design3d.appearance')}>
        <Row label={t('design3d.color')}>
          <input
            type="color"
            value={eq.color ?? deterministicHex(eq.catalogId || eq.name || eq.id)}
            disabled={!!eq.locked}
            onChange={(e) =>
              update((d) => {
                const item = d.equipment[eq.id];
                if (item) item.color = e.target.value;
              })
            }
            className="h-8 w-10 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5 disabled:opacity-50"
          />
          <button
            type="button"
            disabled={!!eq.locked || !eq.color}
            onClick={() =>
              update((d) => {
                const item = d.equipment[eq.id];
                if (item) delete item.color;
              })
            }
            className="inline-flex items-center justify-center gap-1.5 h-8 rounded-xl text-[11px] font-medium bg-white text-slate-700 border border-slate-200 px-2 hover:bg-slate-50 disabled:opacity-50 transition"
          >
            {t('design3d.resetColor')}
          </button>
        </Row>
        <label className="mt-1.5 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={!!eq.allowOverlap}
            disabled={!!eq.locked}
            onChange={(e) =>
              update((d) => {
                const item = d.equipment[eq.id];
                if (item) item.allowOverlap = e.target.checked;
              })
            }
            className="h-4 w-4 rounded accent-[#931315]"
          />
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
            <OverlapIcon size={11} /> {t('design3d.allowOverlap')}
          </span>
        </label>
      </Section>

      <Section title="Montaj">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setMount('floor')}
            disabled={!!eq.locked}
            className={[
              'inline-flex items-center justify-center gap-1.5 h-8 rounded-xl text-[11px] transition',
              mount === 'floor'
                ? 'font-semibold bg-brand-red text-white shadow-sm hover:brightness-110'
                : 'font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
              eq.locked ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
            title="Zemine otur (z = 0)"
          >
            <FloorIcon size={12} /> Zemin
          </button>
          <button
            type="button"
            onClick={() => setMount('wall')}
            disabled={!!eq.locked}
            className={[
              'inline-flex items-center justify-center gap-1.5 h-8 rounded-xl text-[11px] transition',
              mount === 'wall'
                ? 'font-semibold bg-brand-red text-white shadow-sm hover:brightness-110'
                : 'font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
              eq.locked ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
            title="En yakın duvara yapıştır (asma dolap / davlumbaz)"
          >
            <WallIcon size={12} /> Duvar
          </button>
        </div>

        {mount === 'wall' && (
          <Row label="Yükseklik (zeminden)">
            <input
              type="range"
              min={0}
              max={2400}
              step={10}
              value={Math.min(2400, Math.max(0, zMm))}
              onChange={(e) => setWallHeight(Number(e.target.value))}
              disabled={!!eq.locked}
              className="flex-1 accent-[#931315]"
            />
            <NumberInput
              value={zInput}
              onChange={setZInput}
              onCommit={setWallHeight}
              disabled={!!eq.locked}
            />
          </Row>
        )}
        <p className="mt-2 text-[10px] text-slate-400 leading-snug">
          {mount === 'wall'
            ? 'Duvar ürünü en yakın duvara yapışır, odaya bakar; sürüklerken duvar boyunca kayar.'
            : 'Zemin ürünü yere oturur ve oda duvarlarının dışına çıkamaz.'}
        </p>
      </Section>

      <Section title="Konum">
        <Row label="X (sol-sağ)">
          <input
            type="range"
            min={xMin}
            max={xMax}
            step={10}
            value={xMm}
            onChange={(e) => setPosition(Number(e.target.value), eq.position.y)}
            disabled={!!eq.locked}
            className="flex-1 accent-[#931315]"
          />
          <NumberInput
            value={xInput}
            onChange={setXInput}
            onCommit={(v) => setPosition(v, eq.position.y)}
            disabled={!!eq.locked}
          />
        </Row>
        <Row label="Y (ön-arka)">
          <input
            type="range"
            min={yMin}
            max={yMax}
            step={10}
            value={yMm}
            onChange={(e) => setPosition(eq.position.x, Number(e.target.value))}
            disabled={!!eq.locked}
            className="flex-1 accent-[#931315]"
          />
          <NumberInput
            value={yInput}
            onChange={setYInput}
            onCommit={(v) => setPosition(eq.position.x, v)}
            disabled={!!eq.locked}
          />
        </Row>
        <Row label="Z (yükseklik — zeminden)">
          <input
            type="range"
            min={0}
            max={3000}
            step={10}
            value={Math.min(3000, Math.max(0, zMm))}
            onChange={(e) => setZ(Number(e.target.value))}
            disabled={!!eq.locked}
            className="flex-1 accent-[#931315]"
          />
          <NumberInput
            value={zInput}
            onChange={setZInput}
            onCommit={setZ}
            disabled={!!eq.locked}
          />
        </Row>
        {zMm > 0 && (
          <button
            type="button"
            onClick={() => setZ(0)}
            disabled={!!eq.locked}
            className="mt-1.5 w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-xl text-[11px] font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
            title="Ekipmanı zemine indir (Z = 0)"
          >
            <ArrowDown size={12} /> Zemine indir
          </button>
        )}
      </Section>

      <Section title="Yön">
        {onToggleGizmo && (
          <button
            type="button"
            onClick={onToggleGizmo}
            disabled={!!eq.locked}
            className={[
              'w-full mb-2 inline-flex items-center justify-center gap-1.5 h-8 rounded-xl text-[11px] transition',
              gizmoEnabled
                ? 'font-semibold bg-brand-red text-white shadow-sm hover:brightness-110'
                : 'font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
              eq.locked ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
            title="3B döndürme halkalarını aç/kapat (gizmo)"
          >
            <Rotate3d size={13} />
            {gizmoEnabled ? '3B döndürme açık — kapat' : '3B döndürme halkaları'}
          </button>
        )}
        <Row label="Açı">
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={rotDeg}
            onChange={(e) => setRotation((Number(e.target.value) * Math.PI) / 180)}
            disabled={!!eq.locked}
            className="flex-1 accent-[#931315]"
          />
          <NumberInput
            value={rotInput}
            onChange={setRotInput}
            onCommit={(v) => setRotation((((v % 360) + 360) % 360 * Math.PI) / 180)}
            disabled={!!eq.locked}
            suffix="°"
          />
        </Row>

        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {ROT_STEPS.map((deg) => {
            const active = rotDeg === deg;
            return (
              <button
                key={deg}
                type="button"
                onClick={() => setRotation((deg * Math.PI) / 180)}
                disabled={!!eq.locked}
                className={[
                  'h-8 rounded-xl text-[11px] tabular-nums transition',
                  active
                    ? 'font-semibold bg-brand-red text-white shadow-sm hover:brightness-110'
                    : 'font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
                  eq.locked ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {deg}°
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-1.5 mt-1.5">
          <ActionBtn
            onClick={() => setRotation(eq.rotation - Math.PI / 2)}
            disabled={!!eq.locked}
            title="-90°"
          >
            <RotateCcw size={11} /> -90°
          </ActionBtn>
          <ActionBtn
            onClick={() => setRotation(eq.rotation + Math.PI)}
            disabled={!!eq.locked}
            title="180° çevir (ön/arka)"
          >
            <RefreshCw size={11} /> Çevir
          </ActionBtn>
          <ActionBtn
            onClick={() => setRotation(eq.rotation + Math.PI / 2)}
            disabled={!!eq.locked}
            title="+90°"
          >
            <RotateCw size={11} /> +90°
          </ActionBtn>
        </div>
      </Section>

      <Section title="Eğim (dik / yatık)">
        <Row label="Ön-arka eğim (X)">
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={tiltXDeg}
            onChange={(e) => setTilt('x', (Number(e.target.value) * Math.PI) / 180)}
            disabled={!!eq.locked}
            className="flex-1 accent-[#931315]"
          />
          <NumberInput
            value={tiltXInput}
            onChange={setTiltXInput}
            onCommit={(v) => setTilt('x', (v * Math.PI) / 180)}
            disabled={!!eq.locked}
            suffix="°"
          />
        </Row>
        <Row label="Sağ-sol eğim (Y)">
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={tiltYDeg}
            onChange={(e) => setTilt('y', (Number(e.target.value) * Math.PI) / 180)}
            disabled={!!eq.locked}
            className="flex-1 accent-[#931315]"
          />
          <NumberInput
            value={tiltYInput}
            onChange={setTiltYInput}
            onCommit={(v) => setTilt('y', (v * Math.PI) / 180)}
            disabled={!!eq.locked}
            suffix="°"
          />
        </Row>

        <div className="grid grid-cols-4 gap-1.5 mt-2">
          <ActionBtn
            onClick={() => {
              setTilt('x', 0);
              setTilt('y', 0);
            }}
            disabled={!!eq.locked || isUpright}
            title="Düz dik (0°)"
          >
            <ArrowUp size={11} /> Düz
          </ActionBtn>
          <ActionBtn
            onClick={() => setTilt('x', Math.PI / 2)}
            disabled={!!eq.locked}
            title="Öne yat (X +90°)"
          >
            <Minus size={11} /> Öne yat
          </ActionBtn>
          <ActionBtn
            onClick={() => setTilt('x', -Math.PI / 2)}
            disabled={!!eq.locked}
            title="Arkaya yat (X -90°)"
          >
            <Minus size={11} /> Arka yat
          </ActionBtn>
          <ActionBtn
            onClick={() => setTilt('y', Math.PI / 2)}
            disabled={!!eq.locked}
            title="Yana yat (Y +90°)"
          >
            <Minus size={11} /> Yana yat
          </ActionBtn>
        </div>

        {!isUpright && (
          <p className="mt-2 text-[10px] text-amber-600 leading-snug">
            ⚠ Eğim aktif. Çakışma kontrolü dik (0°) hâlin tabanına göre yapılır.
          </p>
        )}
      </Section>

      <Section title="">
        <button
          type="button"
          onClick={handleDelete}
          className="inline-flex items-center justify-center gap-1.5 h-8 w-full rounded-xl text-[11px] font-medium bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition"
        >
          <Trash2 size={12} /> Ekipmanı sil
        </button>
        <p className="mt-2.5 text-[10px] text-slate-400 leading-snug">
          ⌨ Sürüklerken Shift basılı: çakışma kontrolünü geçici devre dışı bırakır.
        </p>
      </Section>
    </aside>
  );
}

// ── Inline atoms ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-3 border-b border-slate-100 last:border-b-0">
      {title && (
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 mb-2 last:mb-0">
      <span className="text-[11px] text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">{children}</div>
    </label>
  );
}

function Stat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 border border-slate-200/70 px-2 py-1.5">
      <span className="text-[10px] text-slate-400 font-semibold">{label}</span>
      <span className="text-[11px] font-mono tabular-nums text-slate-700">
        {Math.round(value)}
        <span className="text-slate-400">{unit}</span>
      </span>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  onCommit,
  disabled,
  suffix,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: (n: number) => void;
  disabled?: boolean;
  suffix?: string;
}) {
  return (
    <div className="relative shrink-0">
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          const n = Number.parseFloat(value);
          if (Number.isFinite(n)) onCommit(n);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const n = Number.parseFloat((e.target as HTMLInputElement).value);
            if (Number.isFinite(n)) onCommit(n);
          }
        }}
        className="w-16 h-8 px-2 pr-4 text-[11px] tabular-nums rounded-lg border border-slate-200 outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/15 disabled:bg-slate-50 disabled:text-slate-400 transition"
      />
      {suffix && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center justify-center gap-1.5 h-8 rounded-xl text-[11px] font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
    >
      {children}
    </button>
  );
}
