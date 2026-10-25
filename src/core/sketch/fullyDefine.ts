import type { ConstraintKind, Id, Sketch } from './types';
import { addConstraint } from './model';
import { measure } from './relations';
import { solveSketch } from '../solver/solver';

/**
 * Fully Define Sketch, as the original: first relations (horizontal / vertical for nearly level lines),
 * then dimensions (line lengths, radii / diameters), then the positions of the remaining free points
 * measured horizontally and vertically from the origin. A candidate is kept only when it lowers the
 * degrees of freedom without over-defining the sketch. Returns the sketch and how many items were added.
 */
export function fullyDefineSketch(s: Sketch, opts: { relations?: boolean; dimensions?: boolean; entityIds?: Id[]; hScheme?: 'baseline' | 'chain' | 'ordinate'; vScheme?: 'baseline' | 'chain' | 'ordinate' } = {}): { sketch: Sketch; added: number; dof: number } {
  const relations = opts.relations ?? true;
  const dimensions = opts.dimensions ?? true;
  let k = s;
  // Entities to Fully Define ▸ Selected entities: only those get relations and dimensions
  const only = opts.entityIds && opts.entityIds.length ? new Set(opts.entityIds) : null;
  const order = () => k.entityOrder.filter((id) => !only || only.has(id));
  let r = solveSketch(k);
  let dof = r.dof;
  let added = 0;
  if (dof <= 0) return { sketch: k, added, dof };
  const tryAdd = (kind: ConstraintKind, refs: Id[], value?: number): boolean => {
    const [k2] = addConstraint(k, kind, refs, value === undefined ? {} : { value });
    const r2 = solveSketch(k2);
    if (r2.status === 'over' || r2.status === 'conflict' || r2.status === 'invalid' || r2.dof >= dof) return false;
    k = r2.sketch;
    dof = r2.dof;
    added++;
    return true;
  };
  const has = (kind: ConstraintKind, ref: Id) => k.constraintOrder.some((id) => k.constraints[id]?.kind === kind && k.constraints[id].refs.includes(ref));
  const DEG = Math.PI / 180;

  if (relations) {
    for (const id of order()) {
      if (dof <= 0) break;
      const e = k.entities[id];
      if (e?.kind !== 'line' || has('horizontal', id) || has('vertical', id)) continue;
      const a = k.points[e.p1], b = k.points[e.p2];
      const ang = Math.abs(Math.atan2(b.y - a.y, b.x - a.x));
      if (Math.min(ang, Math.PI - ang) < 1 * DEG) tryAdd('horizontal', [id]);
      else if (Math.abs(ang - Math.PI / 2) < 1 * DEG) tryAdd('vertical', [id]);
    }
  }
  if (dimensions) {
    // sizes first
    for (const id of order()) {
      if (dof <= 0) break;
      const e = k.entities[id];
      if (!e) continue;
      if (e.kind === 'line' && !e.construction) tryAdd('length', [id], measure(k, { kind: 'length', refs: [id], label: '' }));
      else if (e.kind === 'circle') tryAdd('diameter', [id], 2 * k.scalars[e.r]);
      else if (e.kind === 'arc') tryAdd('radius', [id], k.scalars[e.r]);
    }
    // then positions from the origin (horizontal and vertical ordinate-like dimensions)
    const pts: Id[] = [];
    for (const id of order()) {
      const e = k.entities[id];
      if (!e) continue;
      const ids = e.kind === 'point' ? [e.p] : e.kind === 'line' ? [e.p1, e.p2] : e.kind === 'circle' || e.kind === 'ellipse' ? [e.center] : e.kind === 'arc' ? [e.center, e.start, e.end] : e.kind === 'spline' ? e.points : e.kind === 'ellipseArc' ? [e.center, e.major, e.start, e.end] : e.kind === 'conic' ? [e.start, e.end, e.control] : [e.anchor];
      for (const p of ids) if (!pts.includes(p)) pts.push(p);
    }
    // Dimension schemes: Baseline / Ordinate measure every point from the origin, Chain from the previous point
    const hChain = opts.hScheme === 'chain', vChain = opts.vScheme === 'chain';
    const byX = [...pts].sort((a, b) => k.points[a].x - k.points[b].x), byY = [...pts].sort((a, b) => k.points[a].y - k.points[b].y);
    const prevOf = (list: Id[], p: Id) => { const i = list.indexOf(p); return i > 0 ? list[i - 1] : k.origin; };
    for (const p of pts) {
      if (dof <= 0) break;
      if (p === k.origin) continue;
      const o = k.points[hChain ? prevOf(byX, p) : k.origin], q = k.points[p];
      const ho = hChain ? prevOf(byX, p) : k.origin;
      // a chain link that adds nothing (already fixed by the sizes) falls back to the origin
      const or = k.points[k.origin];
      if (Math.abs(q.x - o.x) > 1e-9) tryAdd('hDistance', [ho, p], Math.abs(q.x - o.x)) || (hChain && Math.abs(q.x - or.x) > 1e-9 && tryAdd('hDistance', [k.origin, p], Math.abs(q.x - or.x)));
      else tryAdd('coincident', [k.origin, p]) || tryAdd('hDistance', [ho, p], 0);
      if (dof <= 0) break;
      const vo = vChain ? prevOf(byY, p) : k.origin;
      const q2 = k.points[p], o2 = k.points[vo];
      if (Math.abs(q2.y - o2.y) > 1e-9) tryAdd('vDistance', [vo, p], Math.abs(q2.y - o2.y)) || (vChain && Math.abs(q2.y - or.y) > 1e-9 && tryAdd('vDistance', [k.origin, p], Math.abs(q2.y - or.y)));
    }
    // whatever is left (ellipse minor radius, conic shape): fix the point
    for (const p of pts) {
      if (dof <= 0) break;
      if (p !== k.origin && !has('fix', p)) tryAdd('fix', [p]);
    }
  }
  r = solveSketch(k);
  return { sketch: k, added, dof: r.dof };
}
