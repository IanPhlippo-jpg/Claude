import type { Id, Sketch, SketchPoint } from '../sketch/types';
import { entityPoints, entityScalars } from '../sketch/model';
import { ata, atv, dependentRows, determinedParams, rref, solveSPD, zeros, type Matrix } from './linalg';
import { buildEquations, ParamIndex, type Equation } from './equations';

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

function residuals(eqs: Equation[], x: number[]): number[] {
  const f = new Array(eqs.length);
  for (let i = 0; i < eqs.length; i++) f[i] = eqs[i].f(x);
  return f;
}

function norm2(v: number[]): number {
  let s = 0;
  for (const a of v) s += a * a;
  return s;
}

/** Sparse-aware numerical Jacobian (forward differences on the dependency set). */
function jacobian(eqs: Equation[], x: number[], f0: number[], n: number): Matrix {
  const J = zeros(eqs.length, n);
  const xs = x.slice();
  for (let r = 0; r < eqs.length; r++) {
    const eq = eqs[r];
    for (const c of eq.deps) {
      const h = 1e-6 * Math.max(1, Math.abs(xs[c]));
      const old = xs[c];
      xs[c] = old + h;
      J[r][c] = (eq.f(xs) - f0[r]) / h;
      xs[c] = old;
    }
  }
  return J;
}

/** Levenberg-Marquardt least squares on the equation set. */
function levenbergMarquardt(
  eqs: Equation[],
  x0: number[],
  n: number,
  maxIter: number,
  tol: number,
): { x: number[]; iterations: number; residual: number; J: Matrix } {
  let x = x0.slice();
  let f = residuals(eqs, x);
  let cost = norm2(f);
  let lambda = 1e-3;
  let it = 0;
  let J = jacobian(eqs, x, f, n);
  const tol2 = tol * tol;
  for (; it < maxIter && cost > tol2; it++) {
    const A = ata(J, n);
    const g = atv(J, f, n);
    for (let i = 0; i < n; i++) g[i] = -g[i];
    let improved = false;
    for (let tries = 0; tries < 12; tries++) {
      const Ad = A.map((row, i) => {
        const r = row.slice();
        r[i] += lambda * (A[i][i] + 1);
        return r;
      });
      const d = solveSPD(Ad, g);
      if (d) {
        const xn = x.map((v, i) => v + d[i]);
        const fn = residuals(eqs, xn);
        const cn = norm2(fn);
        if (cn < cost) {
          x = xn;
          f = fn;
          cost = cn;
          lambda = Math.max(lambda / 4, 1e-12);
          improved = true;
          break;
        }
      }
      lambda *= 8;
    }
    if (!improved) break;
    J = jacobian(eqs, x, f, n);
  }
  return { x, iterations: it, residual: Math.sqrt(cost), J };
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

  const lm = levenbergMarquardt(eqs, ix.values, ix.n, maxIter, tol);
  // a drag that cannot be satisfied: keep the user-constraints consistent by
  // re-solving without the drag target from the dragged configuration
  let x = lm.x;
  let residual = lm.residual;
  let iterations = lm.iterations;
  let J = lm.J;
  if (opts.drag && residual > tol * 100) {
    const lm2 = levenbergMarquardt(equations, x, ix.n, maxIter, tol);
    x = lm2.x;
    residual = lm2.residual;
    iterations += lm2.iterations;
    J = lm2.J;
  } else if (opts.drag) {
    // Jacobian for analysis must not include the drag rows
    J = J.slice(0, equations.length);
  }

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
    const f = residuals(equations, x);
    const determined = determinedParams(J, ix.n);
    const dependent = dependentRows(J);
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
    dof = Math.max(0, ix.n - rref(J).rank);

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
