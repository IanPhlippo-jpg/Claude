import * as THREE from 'three';
import type { Document } from '../../../core/document/types';
import type { Id } from '../../../core/sketch/types';

/**
 * Drag Handles (the model handles of the Features tab toggle): one handle is an arrow on the model that changes one
 * value of one feature by dragging it. The handle knows where it sits, which way it moves when the value grows, and
 * how pointer travel turns into a value; HandleLayer.tsx draws it and runs the drag (live preview, one undo step,
 * Esc cancels, Alt fine steps, snapping to model geometry).
 */
export interface SnapFace {
  bodyId: Id;
  faceId: string;
  normal: [number, number, number];
  point: [number, number, number];
  label: string;
}

export interface ModelHandle {
  /** unique per layer (several handles of one feature: d1, d2, mid+, line ids …) */
  key: string;
  featureId: Id;
  /** the value now */
  value: number;
  /** where the arrow starts at the current value, and the way it moves (unit vector) when the value grows */
  anchor: THREE.Vector3;
  dir: THREE.Vector3;
  /** pointer travel along `dir` (mm, from the anchor at the current value) -> value, and back */
  toValue: (mm: number) => number;
  toOffset: (v: number) => number;
  /** ruler increment, the increment with Alt, and the range */
  step: number;
  fine: number;
  min: number;
  max: number;
  unit: 'mm' | '°';
  /** the handle moves straight with the value: ruler ticks and snapping to model geometry */
  linear: boolean;
  /** geometry snapping: the plane of what moves with the handle (its own face is no snap target); `surface`: a drop on
   *  a face parallel to it can make the end condition Up To Surface */
  snap?: { plane: { point: THREE.Vector3; normal: THREE.Vector3 }; surface?: boolean };
  /** the document with the new value (a face dropped on: Up To Surface); null when the value cannot be taken */
  apply: (doc: Document, v: number, face?: SnapFace | null) => { doc: Document; text?: string } | null;
  /** a sketch the drag solves: its solve state is refreshed after the drag */
  sketchId?: Id;
  /** drawing: the end of a feature, an edge of its sketch, or another value */
  kind: 'end' | 'profile' | 'value';
}

/** a handle whose value grows by `perMm` per millimetre of travel */
export function linearMap(v0: number, perMm: number): Pick<ModelHandle, 'toValue' | 'toOffset'> {
  return { toValue: (mm) => v0 + mm * perMm, toOffset: (v) => (v - v0) / perMm };
}

/** rounded to the ruler increment (Alt: the fine one) and kept in range; a snapped value is kept as it is (to 1e-6) */
export function roundValue(v: number, h: Pick<ModelHandle, 'step' | 'fine' | 'min' | 'max'>, fine: boolean, exact = false): number {
  const s = fine ? h.fine : h.step;
  const r = exact ? Math.round(v * 1e6) / 1e6 : Math.round(v / s) * s;
  return Number(Math.min(h.max, Math.max(h.min, r)).toFixed(6));
}

/** the value shown on the readout */
export function formatValue(v: number, unit: ModelHandle['unit']): string {
  if (unit === '°') return `${Math.abs(v - Math.round(v)) < 1e-6 ? v.toFixed(0) : v.toFixed(1)}°`;
  return `${v.toFixed(2)}mm`;
}

/** the value at a model point: the handle moved so far that its geometry reaches the point */
export function valueAtPoint(h: Pick<ModelHandle, 'anchor' | 'dir' | 'toValue'>, p: THREE.Vector3): number {
  return h.toValue(p.clone().sub(h.anchor).dot(h.dir));
}

/** ruler ticks in value units: an increment of at least 8 px, every fifth one a major tick with a number */
export function rulerTicks(pxPerUnit: number, lo: number, hi: number): { v: number; major: boolean }[] {
  if (!(pxPerUnit > 1e-9) || !(hi > lo)) return [];
  const nice = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const inc = nice.find((s) => s * pxPerUnit >= 8) ?? 1000;
  const out: { v: number; major: boolean }[] = [];
  const k0 = Math.ceil(lo / inc - 1e-9), k1 = Math.floor(hi / inc + 1e-9);
  for (let k = k0; k <= k1 && out.length < 400; k++) out.push({ v: Number((k * inc).toFixed(6)), major: k % 5 === 0 });
  return out;
}

/** a point of a 3D drag in pixels */
export type Project = (v: THREE.Vector3) => { x: number; y: number };

/** screen direction (unit) and pixels per millimetre of a handle */
export function screenAxis(project: Project, at: THREE.Vector3, dir: THREE.Vector3): { ux: number; uy: number; pxPerMm: number } | null {
  const p0 = project(at), p1 = project(at.clone().addScaledVector(dir, 10));
  const L = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  if (!(L > 1e-6)) return null;
  return { ux: (p1.x - p0.x) / L, uy: (p1.y - p0.y) / L, pxPerMm: L / 10 };
}
