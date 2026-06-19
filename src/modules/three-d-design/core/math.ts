/**
 * Pure math primitives. No external deps. Everything is functional / immutable
 * so it's safe to use inside Zustand selectors and inside Three.js render loops
 * without churning GC.
 *
 * Convention: all distances are mm unless stated otherwise.
 */

import type { Vec2, Vec3 } from './types';

export const EPSILON = 1e-6;

export const v2 = (x: number, y: number): Vec2 => ({ x, y });
export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });

// ── Vec2 ────────────────────────────────────────────────────────────────────

export function add2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub2(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale2(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

export function dot2(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function cross2(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

export function length2(a: Vec2): number {
  return Math.hypot(a.x, a.y);
}

export function distance2(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize2(a: Vec2): Vec2 {
  const len = length2(a);
  return len < EPSILON ? { x: 0, y: 0 } : { x: a.x / len, y: a.y / len };
}

/** Right-hand 90° perpendicular. Useful for wall thickness offset. */
export function perp2(a: Vec2): Vec2 {
  return { x: -a.y, y: a.x };
}

export function angle2(a: Vec2): number {
  return Math.atan2(a.y, a.x);
}

export function rotate2(a: Vec2, radians: number): Vec2 {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

// ── Vec3 ────────────────────────────────────────────────────────────────────

export function add3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale3(a: Vec3, s: number): Vec3 {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function distance3(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

// ── Snapping & rounding ─────────────────────────────────────────────────────

/** Snap a value to the nearest multiple of `grid` (mm). */
export function snap(value: number, grid: number): number {
  if (grid <= 0) return value;
  return Math.round(value / grid) * grid;
}

export function snap2(p: Vec2, grid: number): Vec2 {
  return { x: snap(p.x, grid), y: snap(p.y, grid) };
}

// ── Geometry ────────────────────────────────────────────────────────────────

/** Closest point on segment AB to point P. */
export function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const ab = sub2(b, a);
  const ap = sub2(p, a);
  const ab2 = dot2(ab, ab);
  if (ab2 < EPSILON) return a;
  const t = Math.max(0, Math.min(1, dot2(ap, ab) / ab2));
  return add2(a, scale2(ab, t));
}

/**
 * Signed area of a polygon (shoelace). Positive = counter-clockwise.
 * Works for any simple polygon.
 */
export function polygonSignedArea(points: Vec2[]): number {
  let sum = 0;
  for (let i = 0, n = points.length; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    sum += (b.x - a.x) * (b.y + a.y);
  }
  return sum / 2;
}

export function polygonArea(points: Vec2[]): number {
  return Math.abs(polygonSignedArea(points));
}

/** Polygon perimeter in mm. */
export function polygonPerimeter(points: Vec2[]): number {
  let sum = 0;
  for (let i = 0, n = points.length; i < n; i++) {
    sum += distance2(points[i], points[(i + 1) % n]);
  }
  return sum;
}

/** Convert mm → meters (display unit for area/perimeter). */
export const mmToM = (mm: number) => mm / 1000;
/** Convert mm² → m². */
export const mm2ToM2 = (mm2: number) => mm2 / 1_000_000;
