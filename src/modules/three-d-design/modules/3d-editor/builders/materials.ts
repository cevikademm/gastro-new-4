/**
 * Surface presets for walls and floors — small, procedural, shared.
 *
 * Every preset is a SINGLETON `MeshStandardMaterial` flagged `userData.shared`
 * (dispose helpers skip it). Textures are generated once on a canvas (no
 * downloads, no CDN), so the editor works offline and the JSON document only
 * stores the preset id (`Wall.material`, `Room.floorMaterial`).
 *
 * Adding a preset: one entry in WALL_PRESETS / FLOOR_PRESETS + i18n label
 * `design3d.material.<id>`.
 */

import * as THREE from 'three';

export interface MaterialPreset {
  id: string;
  /** Swatch colour for the UI (hex). */
  swatch: string;
  build: () => THREE.MeshStandardMaterial;
}

// ── Procedural textures ─────────────────────────────────────────────────────

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Grid of tiles with a grout line. `tilesPerMetre` controls scale (texture repeats per m). */
function tileTexture(base: string, grout: string, n: number): THREE.CanvasTexture {
  return canvasTexture(
    512,
    (ctx, s) => {
      ctx.fillStyle = grout;
      ctx.fillRect(0, 0, s, s);
      const cell = s / n;
      const g = Math.max(2, s * 0.008);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          // Slight per-tile tint variation so it doesn't look flat.
          const v = ((i * 7 + j * 13) % 5) - 2;
          ctx.fillStyle = shade(base, v * 2);
          ctx.fillRect(i * cell + g / 2, j * cell + g / 2, cell - g, cell - g);
        }
      }
    },
    1,
  );
}

function noiseTexture(base: string, amount: number): THREE.CanvasTexture {
  return canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, s, s);
      const img = ctx.getImageData(0, 0, s, s);
      const d = img.data;
      let seed = 1234;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let i = 0; i < d.length; i += 4) {
        const n = (rnd() - 0.5) * amount;
        d[i] = clamp(d[i] + n);
        d[i + 1] = clamp(d[i + 1] + n);
        d[i + 2] = clamp(d[i + 2] + n);
      }
      ctx.putImageData(img, 0, 0);
    },
    2,
  );
}

function brushedTexture(base: string): THREE.CanvasTexture {
  return canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, s, s);
      let seed = 42;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let y = 0; y < s; y++) {
        const v = (rnd() - 0.5) * 22;
        ctx.fillStyle = shade(base, v);
        ctx.fillRect(0, y, s, 1);
      }
    },
    3,
  );
}

function plankTexture(base: string): THREE.CanvasTexture {
  return canvasTexture(
    512,
    (ctx, s) => {
      const rows = 6;
      const h = s / rows;
      let seed = 7;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      for (let r = 0; r < rows; r++) {
        const tint = (rnd() - 0.5) * 24;
        ctx.fillStyle = shade(base, tint);
        ctx.fillRect(0, r * h, s, h);
        // grain lines
        ctx.strokeStyle = shade(base, tint - 14);
        ctx.lineWidth = 1;
        for (let k = 0; k < 5; k++) {
          const yy = r * h + rnd() * h;
          ctx.beginPath();
          ctx.moveTo(0, yy);
          ctx.lineTo(s, yy + (rnd() - 0.5) * 6);
          ctx.stroke();
        }
        // plank seam + offset joint
        ctx.fillStyle = shade(base, -30);
        ctx.fillRect(0, r * h, s, 2);
        const joint = ((r * 0.37) % 1) * s;
        ctx.fillRect(joint, r * h, 2, h);
      }
    },
    1,
  );
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, v));
}

function shade(hex: string, delta: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + delta);
  const g = clamp(((n >> 8) & 255) + delta);
  const b = clamp((n & 255) + delta);
  return `rgb(${r},${g},${b})`;
}

function shared(mat: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  mat.userData.shared = true;
  // Yüzeyleri bir tık geri it → kenar çizgileri (EdgesGeometry) yüzeyle
  // z-savaşına girmeden üstte kalır (bkz. sceneBuilders.addEdgeLines).
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = 1;
  mat.polygonOffsetUnits = 1;
  return mat;
}

// ── Presets ─────────────────────────────────────────────────────────────────

export const DEFAULT_WALL_MATERIAL = 'paint-white';
export const DEFAULT_FLOOR_MATERIAL = 'floor-grey';

export const WALL_PRESETS: ReadonlyArray<MaterialPreset> = [
  // Hafif sıcak kırık beyaz: mavi-gri arka plandan ayrışır, gölgede de gri kalmaz.
  { id: 'paint-white', swatch: '#f6f5f1', build: () => shared(new THREE.MeshStandardMaterial({ color: 0xf6f5f1, roughness: 0.82, side: THREE.DoubleSide })) },
  { id: 'paint-cream', swatch: '#f5efe0', build: () => shared(new THREE.MeshStandardMaterial({ color: 0xf5efe0, roughness: 0.85, side: THREE.DoubleSide })) },
  { id: 'paint-grey', swatch: '#cbd5e1', build: () => shared(new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.8, side: THREE.DoubleSide })) },
  { id: 'paint-blue', swatch: '#bfd7ea', build: () => shared(new THREE.MeshStandardMaterial({ color: 0xbfd7ea, roughness: 0.8, side: THREE.DoubleSide })) },
  { id: 'tile-white', swatch: '#eef2f5', build: () => shared(new THREE.MeshStandardMaterial({ map: tileTexture('#eef2f5', '#c7ced6', 4), roughness: 0.35, side: THREE.DoubleSide })) },
  { id: 'tile-grey', swatch: '#b9c2cc', build: () => shared(new THREE.MeshStandardMaterial({ map: tileTexture('#b9c2cc', '#7c8794', 4), roughness: 0.4, side: THREE.DoubleSide })) },
  { id: 'steel', swatch: '#c0c5cc', build: () => shared(new THREE.MeshStandardMaterial({ map: brushedTexture('#c8cdd3'), color: 0xffffff, roughness: 0.35, metalness: 0.85, side: THREE.DoubleSide })) },
  { id: 'concrete', swatch: '#a3a7ad', build: () => shared(new THREE.MeshStandardMaterial({ map: noiseTexture('#a8acb2', 26), roughness: 0.95, side: THREE.DoubleSide })) },
];

export const FLOOR_PRESETS: ReadonlyArray<MaterialPreset> = [
  // Duvardan bir ton koyu, hafif sıcak: zemin ile duvar dibi net ayrılır.
  { id: 'floor-grey', swatch: '#d2d4d0', build: () => shared(new THREE.MeshStandardMaterial({ color: 0xd2d4d0, roughness: 0.9 })) },
  { id: 'floor-tile', swatch: '#d6dbe0', build: () => shared(new THREE.MeshStandardMaterial({ map: tileTexture('#d9dee3', '#9aa3ad', 3), roughness: 0.45 })) },
  { id: 'floor-tile-dark', swatch: '#6b7280', build: () => shared(new THREE.MeshStandardMaterial({ map: tileTexture('#6f7681', '#3f454d', 3), roughness: 0.5 })) },
  { id: 'floor-concrete', swatch: '#9ca3af', build: () => shared(new THREE.MeshStandardMaterial({ map: noiseTexture('#9ea4ab', 30), roughness: 0.95 })) },
  { id: 'floor-epoxy', swatch: '#b91c1c', build: () => shared(new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.25, metalness: 0.05 })) },
  { id: 'floor-wood', swatch: '#b07a45', build: () => shared(new THREE.MeshStandardMaterial({ map: plankTexture('#b07a45'), roughness: 0.6 })) },
];

const cache = new Map<string, THREE.MeshStandardMaterial>();

function resolve(presets: ReadonlyArray<MaterialPreset>, id: string | undefined, fallback: string): THREE.MeshStandardMaterial {
  const key = id && presets.some((p) => p.id === id) ? id : fallback;
  let mat = cache.get(key);
  if (!mat) {
    const preset = presets.find((p) => p.id === key) ?? presets[0];
    mat = preset.build();
    cache.set(key, mat);
  }
  return mat;
}

/** Shared wall material for a preset id (default paint when undefined/unknown). */
export function getWallMaterialFor(id?: string): THREE.MeshStandardMaterial {
  return resolve(WALL_PRESETS, id, DEFAULT_WALL_MATERIAL);
}

/** Shared floor material for a preset id. */
export function getFloorMaterialFor(id?: string): THREE.MeshStandardMaterial {
  return resolve(FLOOR_PRESETS, id, DEFAULT_FLOOR_MATERIAL);
}

/** Ceiling: matte white, rendered from below only. */
let ceilingMat: THREE.MeshStandardMaterial | null = null;
export function getCeilingMaterial(): THREE.MeshStandardMaterial {
  if (!ceilingMat) {
    ceilingMat = shared(new THREE.MeshStandardMaterial({ color: 0xf7f6f3, roughness: 0.9, side: THREE.BackSide }));
  }
  return ceilingMat;
}
