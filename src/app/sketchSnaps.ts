/**
 * Sketch snapping by System Options ▸ Sketch ▸ Relations/Snaps (QA v0.5.11 F112): which inference snaps are on, the
 * grid snap, the angle snap and the parallel / perpendicular inference while a line is drawn, and whether a snap
 * adds its automatic relation. The sketch tools call snapPoint(); sketchSnaps.test.ts proves each option.
 */
import { getPref } from './prefs';
import { snap, type Snap, type SnapKind } from '../core/sketch/geometry';
import type { Id, Sketch, SketchPoint } from '../core/sketch/types';

const on = (key: string) => getPref(key) !== false;

/** the snaps that are switched on (null: snapping is off altogether) */
export function snapKinds(): Set<SnapKind> | null {
  if (!on('snaps.enableSnapping')) return null;
  const k = new Set<SnapKind>();
  if (on('snaps.endPoints')) k.add('endpoint').add('origin');
  if (on('snaps.centerPoints')) k.add('center');
  if (on('snaps.midPoints')) k.add('midpoint');
  if (on('snaps.quadrantPoints')) k.add('quadrant');
  if (on('snaps.intersections')) k.add('intersection');
  if (on('snaps.nearest')) k.add('on');
  if (on('snaps.hv')) k.add('horizontal').add('vertical');
  if (on('snaps.hvPoints')) k.add('align');
  return k;
}

/** Relations/Snaps ▸ Automatic relations: a snap adds its relation (coincident, midpoint, on the curve) */
export const automaticRelations = (): boolean => on('snaps.enableSnapping') && on('snaps.automaticRelations');

/**
 * Grid snap: the Quick Snaps button, or Relations/Snaps ▸ Grid, which by "Snap only when grid is displayed" works
 * only while Document Properties ▸ Grid/Snap ▸ Display grid shows the grid.
 */
export function gridSnapOn(quickSnap: boolean, gridShown: boolean): boolean {
  if (quickSnap) return true;
  if (!on('snaps.enableSnapping') || getPref('snaps.grid') !== true) return false;
  return !(getPref('snaps.gridOnlyWhenDisplayed') !== false && !gridShown);
}

/** the grid step the pointer snaps to: Document Properties ▸ Grid/Snap ▸ Snap points per minor divides the minor line */
export function gridSnapStep(gridSize: number): number {
  return gridSize / Math.max(1, Math.round(Number(getPref('doc.gridSnapPoints')) || 1));
}

const ANGLE_GATE = (1.5 * Math.PI) / 180;

/** p projected on the ray from `from` at angle a, when it lies within `tol` of it (and in front of `from`) */
function onRay(from: SketchPoint, p: SketchPoint, a: number, tol: number): SketchPoint | null {
  const ux = Math.cos(a), uy = Math.sin(a);
  const t = (p.x - from.x) * ux + (p.y - from.y) * uy;
  if (t <= tol) return null;
  const q = { x: from.x + ux * t, y: from.y + uy * t };
  return Math.hypot(p.x - q.x, p.y - q.y) <= tol ? q : null;
}

/**
 * Direction inference from the point a line starts at: Relations/Snaps ▸ Angle (multiples of the snap angle) and
 * Parallel / Perpendicular to the lines already in the sketch (within 1.5° and the pick tolerance).
 */
export function directionSnap(s: Sketch, p: SketchPoint, from: SketchPoint, tol: number): Snap | null {
  if (!on('snaps.enableSnapping')) return null;
  const a = Math.atan2(p.y - from.y, p.x - from.x);
  const diff = (x: number) => Math.abs(Math.atan2(Math.sin(a - x), Math.cos(a - x)));
  const lines = s.entityOrder.map((id) => s.entities[id]).filter((e) => e.kind === 'line') as { p1: Id; p2: Id }[];
  for (const [kind, key, turn] of [['parallel', 'snaps.parallel', 0], ['perpendicular', 'snaps.perpendicular', Math.PI / 2]] as const) {
    if (!on(key)) continue;
    for (const l of lines) {
      const A = s.points[l.p1], B = s.points[l.p2];
      // the line being continued from its own end point is not a reference
      if ((Math.hypot(A.x - from.x, A.y - from.y) < 1e-9 || Math.hypot(B.x - from.x, B.y - from.y) < 1e-9) && turn === 0) continue;
      const base = Math.atan2(B.y - A.y, B.x - A.x) + turn;
      for (const dir of [base, base + Math.PI]) {
        if (diff(dir) > ANGLE_GATE) continue;
        const q = onRay(from, p, dir, tol);
        if (q) return { kind, point: q, from };
      }
    }
  }
  if (getPref('snaps.angle') === true) {
    const step = ((Number(getPref('snaps.snapAngle')) || 45) * Math.PI) / 180;
    const q = onRay(from, p, Math.round(a / step) * step, tol);
    if (q) return { kind: 'angle', point: q, from };
  }
  return null;
}

export interface GridState { quick: boolean; shown: boolean; size: number }

/** the pointer on the grid when the grid snap is on */
export function gridPoint(p: SketchPoint, grid: GridState): SketchPoint {
  if (!gridSnapOn(grid.quick, grid.shown)) return p;
  const g = gridSnapStep(grid.size);
  return { x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g };
}

/** the snapped position of the pointer while sketching: inference snaps, then direction inference, then the grid */
export function snapPoint(s: Sketch, p: SketchPoint, tol: number, ref: SketchPoint | null, grid: GridState): { p: SketchPoint; snap: Snap | null } {
  const kinds = snapKinds();
  const hits = kinds ? snap(s, p, tol, ref, new Set(), kinds) : [];
  if (hits.length) return { p: hits[0].point, snap: hits[0] };
  const d = ref ? directionSnap(s, p, ref, tol) : null;
  if (d) return { p: d.point, snap: d };
  return { p: gridPoint(p, grid), snap: null };
}
