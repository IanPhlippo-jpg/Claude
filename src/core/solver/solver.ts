import type { Id, Sketch, SketchPoint } from '../sketch/types';
import { entityPoints, entityScalars } from '../sketch/model';
import { rowRank } from './linalg';
import { buildEquations, ParamIndex } from './equations';
import { partition } from './groups';
import { analysisRows, foldTest, levenbergMarquardt, uniqueDeps, type Part } from './lm';

export type SketchStatus = 'under' | 'full' | 'over' | 'conflict' | 'invalid';
export type EntityStatus = 'under' | 'full' | 'over';
export type ConstraintStatus = 'ok' | 'redundant' | 'conflicting' | 'invalid' | 'driven';

export interface SolveOptions {
  /** temporarily pin a point to a target (dragging) */
  drag?: { point: Id; target: SketchPoint };
  maxIterations?: number;
  tolerance?: number;
  /** skip the (comparatively costly) DOF / redundancy analysis */
  skipAnalysis?: boolean;
  /** solve and analyse the sketch as one system instead of independent groups (for tests and diagnostics) */
  joint?: boolean;
}

export interface SolveResult {
  sketch: Sketch;
  status: SketchStatus;
  dof: number;
  residual: number;
  iterations: number;
  timeMs: number;
  entityStatus: Record<Id, EntityStatus>;
  constraintStatus: Record<Id, ConstraintStatus>;
  /** points (param ids) that are free to move */
  freePoints: Set<Id>;
}

export function solveSketch(sketch: Sketch, opts: SolveOptions = {}): SolveResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const tol = opts.tolerance ?? 1e-8;
  const maxIter = opts.maxIterations ?? 80;
  const ix = new ParamIndex(sketch);
  const { equations, invalid } = buildEquations(sketch, ix);

  const eqs = equations.slice();
  if (opts.drag) {
    const px = ix.px(opts.drag.point), py = ix.py(opts.drag.point);
    const { x: tx, y: ty } = opts.drag.target;
    eqs.push({ constraintId: '__drag', deps: [px], f: (x) => x[px] - tx });
    eqs.push({ constraintId: '__drag', deps: [py], f: (x) => x[py] - ty });
  }

  const nA = equations.length;
  const deps = uniqueDeps(eqs);
  const P = partition(eqs, deps, nA, ix.values, ix.n, !!opts.joint);
  const x = ix.values.slice();
  let iterations = 0;
  const dropped = new Set<number>();
  // one part: solve; a drag that cannot be satisfied is dropped and the part re-solved from the dragged state,
  // so the user's relations stay consistent
  const run = (p: Part) => {
    const lm = levenbergMarquardt(eqs, deps, p, x, maxIter, tol);
    let it = lm.iterations, cost = lm.cost;
    if (p.rows[p.rows.length - 1] >= nA && Math.sqrt(cost) > tol * 100) {
      const lm2 = levenbergMarquardt(eqs, deps, { rows: p.rows.filter((r) => r < nA), cols: p.cols }, x, maxIter, tol);
      for (const r of p.rows) if (r >= nA) dropped.add(r);
      it += lm2.iterations;
      cost = lm2.cost;
    }
    iterations = Math.max(iterations, it);
    return cost;
  };
  for (const p of P.pinParts) run(p);
  let joint = false;
  for (const p of P.parts) {
    const kept = p.pinned.map((q) => x[q]);
    const cost = run(p);
    let moved = 0;
    p.pinned.forEach((q, i) => {
      moved = Math.max(moved, Math.abs(x[q] - kept[i]));
      x[q] = kept[i];
    });
    // a conflict that pulls on fixed parameters (the origin, a Fix) spreads over every group hanging on them:
    // solve the whole system together, as before the split
    if (moved > tol * 10 && Math.sqrt(cost) > tol * 100) joint = true;
  }
  if (joint) {
    const all = partition(eqs, deps, nA, ix.values, ix.n, true);
    for (let i = 0; i < ix.n; i++) x[i] = ix.values[i];
    iterations = 0;
    dropped.clear();
    for (const p of all.parts) run(p);
  }
  let cost = 0;
  for (let r = 0; r < eqs.length; r++) {
    if (dropped.has(r)) continue;
    const v = eqs[r].f(x);
    cost += v * v;
  }
  const residual = Math.sqrt(cost);

  const solved = ix.apply(sketch, x);
  const entityStatus: Record<Id, EntityStatus> = {};
  const constraintStatus: Record<Id, ConstraintStatus> = {};
  const freePoints = new Set<Id>();
  let dof = 0;
  let status: SketchStatus = 'full';

  for (const cid of sketch.constraintOrder) {
    const c = sketch.constraints[cid];
    constraintStatus[cid] = c.driven ? 'driven' : 'ok';
  }
  for (const cid of invalid) constraintStatus[cid] = 'invalid';

  if (!opts.skipAnalysis) {
    const conflicting = residual > tol * 100;
    // per-equation residual to identify conflicting constraints
    const f = equations.map((e) => e.f(x));
    // rank, dependent rows and determined parameters per part (see groups.ts for why this equals the whole)
    const determined: boolean[] = new Array(ix.n).fill(false);
    const dependent: number[] = P.emptyRows.filter((r) => r < nA);
    let rank = 0;
    const analyse = (p: Part, shared: number) => {
      const rows = p.rows.filter((r) => r < nA);
      const jr = analysisRows(eqs, deps, rows, p.cols, x);
      const rr = rowRank(jr, p.cols.length, foldTest(eqs, deps, rows, p.cols, x, jr));
      rank += rr.rank - shared;
      for (const k of rr.dependent) dependent.push(rows[k]);
      return rr.determined;
    };
    for (const p of P.pinParts) {
      const det = analyse(p, 0);
      p.cols.forEach((c, i) => (determined[c] = det[i]));
    }
    for (const p of P.parts) {
      const det = analyse(p, p.pinned.length);
      const shared = new Set(p.pinned);
      p.cols.forEach((c, i) => {
        if (!shared.has(c)) determined[c] = det[i];
      });
    }
    const overConstraints = new Set<Id>();
    for (const r of dependent) {
      const cid = equations[r].constraintId;
      if (cid) overConstraints.add(cid);
    }
    if (conflicting) {
      for (let r = 0; r < equations.length; r++) {
        const cid = equations[r].constraintId;
        if (cid && Math.abs(f[r]) > tol * 100) overConstraints.add(cid);
      }
    }
    for (const cid of overConstraints) constraintStatus[cid] = conflicting ? 'conflicting' : 'redundant';

    // rank = n - free params; dof = n - rank, minus the always-fixed origin (2 internal eqs count already)
    for (const [pid, [a, b]] of ix.pointIx) {
      if (!determined[a] || !determined[b]) freePoints.add(pid);
    }
    dof = Math.max(0, ix.n - rank);

    const overEntities = new Set<Id>();
    for (const cid of overConstraints) {
      const c = sketch.constraints[cid];
      for (const r of c.refs) {
        const e = sketch.entities[r];
        if (e) overEntities.add(e.id);
        else {
          // point ref -> find owning entities
          for (const eid of sketch.entityOrder) {
            if (entityPoints(sketch.entities[eid]).includes(r)) overEntities.add(eid);
          }
        }
      }
    }
    for (const eid of sketch.entityOrder) {
      const e = sketch.entities[eid];
      if (overEntities.has(eid)) {
        entityStatus[eid] = 'over';
        continue;
      }
      let full = true;
      for (const p of entityPoints(e)) if (freePoints.has(p)) full = false;
      for (const sc of entityScalars(e)) if (!determined[ix.sc(sc)]) full = false;
      entityStatus[eid] = full ? 'full' : 'under';
    }
    if (invalid.length) status = 'invalid';
    else if (conflicting) status = 'conflict';
    else if (overConstraints.size) status = 'over';
    else status = dof > 0 ? 'under' : 'full';
  }

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    sketch: solved,
    status,
    dof,
    residual,
    iterations,
    timeMs: t1 - t0,
    entityStatus,
    constraintStatus,
    freePoints,
  };
}

/** The number of independent parts the solver splits a sketch into (pinned-parameter parts included). */
export function countSolveGroups(sketch: Sketch): number {
  const ix = new ParamIndex(sketch);
  const { equations } = buildEquations(sketch, ix);
  const P = partition(equations, uniqueDeps(equations), equations.length, ix.values, ix.n);
  return P.parts.length + P.pinParts.length;
}

const solveCache = new WeakMap<Sketch, SolveResult>();

/**
 * solveSketch with default options, remembered per sketch object. Sketches are immutable values in the document,
 * so the same object always gives the same result: undo/redo/open can call this for every sketch and only the
 * sketches that changed are solved again. A converged result is also remembered under its own solved sketch
 * (solving that again changes nothing); a result that did not converge is not, so it keeps iterating as before.
 */
export function solveSketchCached(sketch: Sketch): SolveResult {
  const hit = solveCache.get(sketch);
  if (hit) return hit;
  const r = solveSketch(sketch);
  solveCache.set(sketch, r);
  if (r.residual <= 1e-8 && r.status !== 'conflict') solveCache.set(r.sketch, r);
  return r;
}
