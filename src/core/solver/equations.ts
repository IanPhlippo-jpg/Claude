import type { Constraint, Entity, Id, Sketch } from '../sketch/types';

/** Maps every solvable parameter (point x/y, scalar) to an index in the parameter vector. */
export class ParamIndex {
  readonly pointIx = new Map<Id, [number, number]>();
  readonly scalarIx = new Map<Id, number>();
  readonly n: number;
  readonly values: number[] = [];

  constructor(s: Sketch) {
    let i = 0;
    for (const [id, p] of Object.entries(s.points)) {
      this.pointIx.set(id, [i, i + 1]);
      this.values.push(p.x, p.y);
      i += 2;
    }
    for (const [id, v] of Object.entries(s.scalars)) {
      this.scalarIx.set(id, i);
      this.values.push(v);
      i += 1;
    }
    this.n = i;
  }

  px(id: Id): number {
    const ix = this.pointIx.get(id);
    if (!ix) throw new Error(`unknown point ${id}`);
    return ix[0];
  }
  py(id: Id): number {
    return this.px(id) + 1;
  }
  sc(id: Id): number {
    const ix = this.scalarIx.get(id);
    if (ix === undefined) throw new Error(`unknown scalar ${id}`);
    return ix;
  }

  /** Write a parameter vector back into a new sketch object. */
  apply(s: Sketch, x: number[]): Sketch {
    const points: Sketch['points'] = {};
    for (const [id, [ix, iy]] of this.pointIx) points[id] = { x: x[ix], y: x[iy] };
    const scalars: Sketch['scalars'] = {};
    for (const [id, ix] of this.scalarIx) scalars[id] = x[ix];
    return { ...s, points, scalars };
  }
}

export interface Equation {
  /** owning constraint id, or null for internal rules (arc geometry) */
  constraintId: Id | null;
  /** parameter indices this equation depends on */
  deps: number[];
  /** residual, 0 when satisfied */
  f: (x: number[]) => number;
}

const DEG = Math.PI / 180;

type P = { x: number; y: number };

function pt(x: number[], ix: ParamIndex, id: Id): P {
  const i = ix.px(id);
  return { x: x[i], y: x[i + 1] };
}

function entityOf(s: Sketch, id: Id): Entity {
  const e = s.entities[id];
  if (!e) throw new Error(`unknown entity ${id}`);
  return e;
}

function linePts(s: Sketch, id: Id): [Id, Id] {
  const e = entityOf(s, id);
  if (e.kind !== 'line') throw new Error(`${id} is not a line`);
  return [e.p1, e.p2];
}

function circleLike(s: Sketch, id: Id): { center: Id; r: Id } {
  const e = entityOf(s, id);
  if (e.kind !== 'circle' && e.kind !== 'arc') throw new Error(`${id} is not circular`);
  return { center: e.center, r: e.r };
}

/** Two point ids from refs that may be points or point-entities. */
function resolvePoint(s: Sketch, id: Id): Id {
  if (id in s.points) return id;
  const e = s.entities[id];
  if (e && e.kind === 'point') return e.p;
  throw new Error(`${id} is not a point`);
}

export class EquationBuildError extends Error {}

/** Builds the equation list for a sketch. Invalid constraints are skipped and reported. */
export function buildEquations(
  s: Sketch,
  ix: ParamIndex,
  opts: { includeDriven?: boolean } = {},
): { equations: Equation[]; invalid: Id[] } {
  const equations: Equation[] = [];
  const invalid: Id[] = [];

  // --- helpers producing equations -----------------------------------------
  const pointDeps = (id: Id) => [ix.px(id), ix.py(id)];

  const eqCoincident = (cid: Id | null, a: Id, b: Id) => {
    const ax = ix.px(a), ay = ix.py(a), bx = ix.px(b), by = ix.py(b);
    equations.push({ constraintId: cid, deps: [ax, bx], f: (x) => x[ax] - x[bx] });
    equations.push({ constraintId: cid, deps: [ay, by], f: (x) => x[ay] - x[by] });
  };
  const eqHorizontal = (cid: Id | null, a: Id, b: Id) => {
    const ay = ix.py(a), by = ix.py(b);
    equations.push({ constraintId: cid, deps: [ay, by], f: (x) => x[ay] - x[by] });
  };
  const eqVertical = (cid: Id | null, a: Id, b: Id) => {
    const ax = ix.px(a), bx = ix.px(b);
    equations.push({ constraintId: cid, deps: [ax, bx], f: (x) => x[ax] - x[bx] });
  };
  /** signed distance of point p to the infinite line through a,b */
  const pointLineDist = (x: number[], p: Id, a: Id, b: Id) => {
    const P0 = pt(x, ix, p), A = pt(x, ix, a), B = pt(x, ix, b);
    const dx = B.x - A.x, dy = B.y - A.y;
    const len = Math.hypot(dx, dy) || 1e-12;
    return (dx * (P0.y - A.y) - dy * (P0.x - A.x)) / len;
  };
  const eqPointOnLine = (cid: Id | null, p: Id, a: Id, b: Id) => {
    equations.push({
      constraintId: cid,
      deps: [...pointDeps(p), ...pointDeps(a), ...pointDeps(b)],
      f: (x) => pointLineDist(x, p, a, b),
    });
  };
  const eqPointOnCircle = (cid: Id | null, p: Id, c: Id, r: Id) => {
    const ri = ix.sc(r);
    equations.push({
      constraintId: cid,
      deps: [...pointDeps(p), ...pointDeps(c), ri],
      f: (x) => {
        const P0 = pt(x, ix, p), C = pt(x, ix, c);
        return Math.hypot(P0.x - C.x, P0.y - C.y) - x[ri];
      },
    });
  };
  const eqParallel = (cid: Id | null, l1: Id, l2: Id) => {
    const [a, b] = linePts(s, l1), [c, d] = linePts(s, l2);
    equations.push({
      constraintId: cid,
      deps: [...pointDeps(a), ...pointDeps(b), ...pointDeps(c), ...pointDeps(d)],
      f: (x) => {
        const A = pt(x, ix, a), B = pt(x, ix, b), C = pt(x, ix, c), D = pt(x, ix, d);
        const d1x = B.x - A.x, d1y = B.y - A.y, d2x = D.x - C.x, d2y = D.y - C.y;
        const n = (Math.hypot(d1x, d1y) || 1e-12) * (Math.hypot(d2x, d2y) || 1e-12);
        return (d1x * d2y - d1y * d2x) / Math.sqrt(n);
      },
    });
  };
  const eqPerpendicular = (cid: Id | null, l1: Id, l2: Id) => {
    const [a, b] = linePts(s, l1), [c, d] = linePts(s, l2);
    equations.push({
      constraintId: cid,
      deps: [...pointDeps(a), ...pointDeps(b), ...pointDeps(c), ...pointDeps(d)],
      f: (x) => {
        const A = pt(x, ix, a), B = pt(x, ix, b), C = pt(x, ix, c), D = pt(x, ix, d);
        const d1x = B.x - A.x, d1y = B.y - A.y, d2x = D.x - C.x, d2y = D.y - C.y;
        const n = (Math.hypot(d1x, d1y) || 1e-12) * (Math.hypot(d2x, d2y) || 1e-12);
        return (d1x * d2x + d1y * d2y) / Math.sqrt(n);
      },
    });
  };
  const eqLineCircleTangent = (cid: Id | null, l: Id, c: Id) => {
    const [a, b] = linePts(s, l);
    const { center, r } = circleLike(s, c);
    const ri = ix.sc(r);
    equations.push({
      constraintId: cid,
      deps: [...pointDeps(a), ...pointDeps(b), ...pointDeps(center), ri],
      f: (x) => Math.abs(pointLineDist(x, center, a, b)) - x[ri],
    });
  };
  const eqCircleCircleTangent = (cid: Id | null, c1: Id, c2: Id, internal: boolean) => {
    const A = circleLike(s, c1), B = circleLike(s, c2);
    const r1 = ix.sc(A.r), r2 = ix.sc(B.r);
    equations.push({
      constraintId: cid,
      deps: [...pointDeps(A.center), ...pointDeps(B.center), r1, r2],
      f: (x) => {
        const P1 = pt(x, ix, A.center), P2 = pt(x, ix, B.center);
        const d = Math.hypot(P1.x - P2.x, P1.y - P2.y);
        return internal ? d - Math.abs(x[r1] - x[r2]) : d - (x[r1] + x[r2]);
      },
    });
  };
  const eqAngle = (cid: Id | null, l1: Id, l2: Id, deg: number) => {
    const [a, b] = linePts(s, l1), [c, d] = linePts(s, l2);
    const target = deg * DEG;
    equations.push({
      constraintId: cid,
      deps: [...pointDeps(a), ...pointDeps(b), ...pointDeps(c), ...pointDeps(d)],
      f: (x) => {
        const A = pt(x, ix, a), B = pt(x, ix, b), C = pt(x, ix, c), D = pt(x, ix, d);
        const a1 = Math.atan2(B.y - A.y, B.x - A.x);
        const a2 = Math.atan2(D.y - C.y, D.x - C.x);
        let diff = a2 - a1 - target;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        // residual in "length-like" units so it balances with distances
        return diff * 10;
      },
    });
  };

  // --- internal rules: arc end points lie on the arc radius -----------------
  for (const id of s.entityOrder) {
    const e = s.entities[id];
    if (e.kind === 'arc') {
      eqPointOnCircle(null, e.start, e.center, e.r);
      eqPointOnCircle(null, e.end, e.center, e.r);
    }
    if (e.kind === 'ellipseArc') {
      // Partial Ellipse: start and end lie on the ellipse
      for (const p of [e.start, e.end]) {
        const c = e.center, m = e.major, r2 = e.r2;
        equations.push({
          constraintId: null,
          deps: [ix.px(p), ix.py(p), ix.px(c), ix.py(c), ix.px(m), ix.py(m), ix.sc(r2)],
          f: (x) => {
            const P0 = pt(x, ix, p), C = pt(x, ix, c), M = pt(x, ix, m);
            const b = Math.abs(x[ix.sc(r2)]) || 1e-9;
            const a = Math.hypot(M.x - C.x, M.y - C.y) || 1e-9;
            const ux = (M.x - C.x) / a, uy = (M.y - C.y) / a;
            const dx = P0.x - C.x, dy = P0.y - C.y;
            const lx = dx * ux + dy * uy, ly = -dx * uy + dy * ux;
            return (Math.hypot(lx / a, ly / b) - 1) * Math.min(a, b);
          },
        });
      }
    }
  }
  // origin is always fixed
  {
    const ox = ix.px(s.origin), oy = ix.py(s.origin);
    equations.push({ constraintId: null, deps: [ox], f: (x) => x[ox] });
    equations.push({ constraintId: null, deps: [oy], f: (x) => x[oy] });
  }

  // --- user constraints ------------------------------------------------------
  for (const cid of s.constraintOrder) {
    const c: Constraint = s.constraints[cid];
    if (c.driven && !opts.includeDriven) continue;
    try {
      switch (c.kind) {
        case 'coincident': {
          const [a, b] = c.refs.map((r) => resolvePoint(s, r));
          eqCoincident(cid, a, b);
          break;
        }
        case 'pointOnEntity': {
          const p = resolvePoint(s, c.refs[0]);
          const e = entityOf(s, c.refs[1]);
          if (e.kind === 'line') eqPointOnLine(cid, p, e.p1, e.p2);
          else if (e.kind === 'circle' || e.kind === 'arc') eqPointOnCircle(cid, p, e.center, e.r);
          else throw new EquationBuildError('pointOnEntity needs line/circle/arc');
          break;
        }
        case 'horizontal':
        case 'vertical': {
          let a: Id, b: Id;
          if (c.refs.length === 1) [a, b] = linePts(s, c.refs[0]);
          else [a, b] = c.refs.map((r) => resolvePoint(s, r)) as [Id, Id];
          if (c.kind === 'horizontal') eqHorizontal(cid, a, b);
          else eqVertical(cid, a, b);
          break;
        }
        case 'parallel':
          eqParallel(cid, c.refs[0], c.refs[1]);
          break;
        case 'perpendicular':
          eqPerpendicular(cid, c.refs[0], c.refs[1]);
          break;
        case 'tangent': {
          const e1 = entityOf(s, c.refs[0]), e2 = entityOf(s, c.refs[1]);
          if (e1.kind === 'line' && e2.kind !== 'line') eqLineCircleTangent(cid, e1.id, e2.id);
          else if (e2.kind === 'line' && e1.kind !== 'line') eqLineCircleTangent(cid, e2.id, e1.id);
          else if (e1.kind !== 'line' && e2.kind !== 'line') eqCircleCircleTangent(cid, e1.id, e2.id, !!c.internal);
          else throw new EquationBuildError('tangent needs a curve');
          break;
        }
        case 'equal': {
          const e1 = entityOf(s, c.refs[0]), e2 = entityOf(s, c.refs[1]);
          if (e1.kind === 'line' && e2.kind === 'line') {
            const deps = [...pointDeps(e1.p1), ...pointDeps(e1.p2), ...pointDeps(e2.p1), ...pointDeps(e2.p2)];
            equations.push({
              constraintId: cid,
              deps,
              f: (x) => {
                const A = pt(x, ix, e1.p1), B = pt(x, ix, e1.p2), C = pt(x, ix, e2.p1), D = pt(x, ix, e2.p2);
                return Math.hypot(B.x - A.x, B.y - A.y) - Math.hypot(D.x - C.x, D.y - C.y);
              },
            });
          } else if (e1.kind !== 'line' && e2.kind !== 'line' && e1.kind !== 'point' && e2.kind !== 'point' && e1.kind !== 'spline' && e2.kind !== 'spline' && (e1.kind === 'circle' || e1.kind === 'arc') && (e2.kind === 'circle' || e2.kind === 'arc')) {
            const r1 = ix.sc(e1.r), r2 = ix.sc(e2.r);
            equations.push({ constraintId: cid, deps: [r1, r2], f: (x) => x[r1] - x[r2] });
          } else throw new EquationBuildError('equal needs two lines or two circular entities');
          break;
        }
        case 'concentric': {
          const A = circleLike(s, c.refs[0]), B = circleLike(s, c.refs[1]);
          eqCoincident(cid, A.center, B.center);
          break;
        }
        case 'coradial': {
          // same centre and the same radius
          const A = circleLike(s, c.refs[0]), B = circleLike(s, c.refs[1]);
          eqCoincident(cid, A.center, B.center);
          const r1 = ix.sc(A.r), r2 = ix.sc(B.r);
          equations.push({ constraintId: cid, deps: [r1, r2], f: (x) => x[r1] - x[r2] });
          break;
        }
        case 'equalCurveLength': {
          // the lengths of two curves: a line's length, an arc's radius × sweep, a circle's circumference
          const curve = (id: string): { deps: number[]; f: (x: number[]) => number } => {
            const e = entityOf(s, id);
            if (e.kind === 'line') {
              const [a, b] = linePts(s, id);
              return { deps: [...pointDeps(a), ...pointDeps(b)], f: (x) => { const A = pt(x, ix, a), B = pt(x, ix, b); return Math.hypot(B.x - A.x, B.y - A.y); } };
            }
            if (e.kind === 'arc') {
              const ri = ix.sc(e.r);
              return {
                deps: [ri, ...pointDeps(e.center), ...pointDeps(e.start), ...pointDeps(e.end)],
                f: (x) => {
                  const C = pt(x, ix, e.center), S = pt(x, ix, e.start), E = pt(x, ix, e.end);
                  const a0 = Math.atan2(S.y - C.y, S.x - C.x), a1 = Math.atan2(E.y - C.y, E.x - C.x);
                  let sw = e.ccw ? a1 - a0 : a0 - a1;
                  while (sw < 0) sw += Math.PI * 2;
                  return x[ri] * sw;
                },
              };
            }
            const { r } = circleLike(s, id);
            const ri = ix.sc(r);
            return { deps: [ri], f: (x) => 2 * Math.PI * x[ri] };
          };
          const u = curve(c.refs[0]), w = curve(c.refs[1]);
          equations.push({ constraintId: cid, deps: [...u.deps, ...w.deps], f: (x) => u.f(x) - w.f(x) });
          break;
        }
        case 'collinear': {
          const [a, b] = linePts(s, c.refs[0]), [p, q] = linePts(s, c.refs[1]);
          eqPointOnLine(cid, p, a, b);
          eqPointOnLine(cid, q, a, b);
          break;
        }
        case 'midpoint': {
          const p = resolvePoint(s, c.refs[0]);
          const [a, b] = linePts(s, c.refs[1]);
          const px = ix.px(p), py = ix.py(p), ax = ix.px(a), ay = ix.py(a), bx = ix.px(b), by = ix.py(b);
          equations.push({ constraintId: cid, deps: [px, ax, bx], f: (x) => x[px] - (x[ax] + x[bx]) / 2 });
          equations.push({ constraintId: cid, deps: [py, ay, by], f: (x) => x[py] - (x[ay] + x[by]) / 2 });
          break;
        }
        case 'symmetric': {
          const [a, b] = linePts(s, c.refs[2]);
          const pairs: [Id, Id][] = [];
          const e1 = s.entities[c.refs[0]], e2 = s.entities[c.refs[1]];
          if (e1 && e2 && e1.kind === 'line' && e2.kind === 'line') pairs.push([e1.p1, e2.p1], [e1.p2, e2.p2]);
          else if (e1 && e2 && (e1.kind === 'circle' || e1.kind === 'arc') && (e2.kind === 'circle' || e2.kind === 'arc')) {
            pairs.push([e1.center, e2.center]);
            const r1 = ix.sc(e1.r), r2 = ix.sc(e2.r);
            equations.push({ constraintId: cid, deps: [r1, r2], f: (x) => x[r1] - x[r2] });
          } else pairs.push([resolvePoint(s, c.refs[0]), resolvePoint(s, c.refs[1])]);
          for (const [p, q] of pairs) {
            const deps = [...pointDeps(p), ...pointDeps(q), ...pointDeps(a), ...pointDeps(b)];
            // midpoint on the axis
            equations.push({
              constraintId: cid,
              deps,
              f: (x) => {
                const P0 = pt(x, ix, p), Q = pt(x, ix, q), A = pt(x, ix, a), B = pt(x, ix, b);
                const mx = (P0.x + Q.x) / 2, my = (P0.y + Q.y) / 2;
                const dx = B.x - A.x, dy = B.y - A.y;
                const len = Math.hypot(dx, dy) || 1e-12;
                return (dx * (my - A.y) - dy * (mx - A.x)) / len;
              },
            });
            // p->q perpendicular to axis
            equations.push({
              constraintId: cid,
              deps,
              f: (x) => {
                const P0 = pt(x, ix, p), Q = pt(x, ix, q), A = pt(x, ix, a), B = pt(x, ix, b);
                const dx = B.x - A.x, dy = B.y - A.y;
                const len = Math.hypot(dx, dy) || 1e-12;
                return ((Q.x - P0.x) * dx + (Q.y - P0.y) * dy) / len;
              },
            });
          }
          break;
        }
        case 'pierce':
        case 'fix': {
          const p = resolvePoint(s, c.refs[0]);
          const t = c.target ?? s.points[p];
          const px = ix.px(p), py = ix.py(p);
          equations.push({ constraintId: cid, deps: [px], f: (x) => x[px] - t.x });
          equations.push({ constraintId: cid, deps: [py], f: (x) => x[py] - t.y });
          break;
        }
        case 'distance': {
          const v = c.value ?? 0;
          const ref1 = c.refs[1];
          const e2 = s.entities[ref1];
          // Arc Condition (Shift+click): the distance is to the edge of the arc = centre distance -/+ radius
          const arcs = Object.values(c.arcCondition ?? {}).map((ac) => ({ r: ix.sc((s.entities[ac.entityId] as { r: Id }).r), sign: ac.mode === 'max' ? 1 : -1 }));
          const radii = (x: number[]) => arcs.reduce((sum, a) => sum + a.sign * x[a.r], 0);
          const arcDeps = arcs.map((a) => a.r);
          if (e2 && e2.kind === 'line') {
            const p = resolvePoint(s, c.refs[0]);
            equations.push({
              constraintId: cid,
              deps: [...pointDeps(p), ...pointDeps(e2.p1), ...pointDeps(e2.p2), ...arcDeps],
              f: (x) => (c.doubled ? 2 : 1) * Math.abs(pointLineDist(x, p, e2.p1, e2.p2)) + radii(x) - v,
            });
          } else {
            const a = resolvePoint(s, c.refs[0]), b = resolvePoint(s, ref1);
            equations.push({
              constraintId: cid,
              deps: [...pointDeps(a), ...pointDeps(b), ...arcDeps],
              f: (x) => {
                const A = pt(x, ix, a), B = pt(x, ix, b);
                return Math.hypot(B.x - A.x, B.y - A.y) + radii(x) - v;
              },
            });
          }
          break;
        }
        case 'hDistance':
        case 'vDistance': {
          const v = c.value ?? 0;
          const a = resolvePoint(s, c.refs[0]), b = resolvePoint(s, c.refs[1]);
          const ia = c.kind === 'hDistance' ? ix.px(a) : ix.py(a);
          const ib = c.kind === 'hDistance' ? ix.px(b) : ix.py(b);
          equations.push({ constraintId: cid, deps: [ia, ib], f: (x) => Math.abs(x[ib] - x[ia]) - v });
          break;
        }
        case 'length': {
          const v = c.value ?? 0;
          const [a, b] = linePts(s, c.refs[0]);
          equations.push({
            constraintId: cid,
            deps: [...pointDeps(a), ...pointDeps(b)],
            f: (x) => {
              const A = pt(x, ix, a), B = pt(x, ix, b);
              return Math.hypot(B.x - A.x, B.y - A.y) - v;
            },
          });
          break;
        }
        case 'radius':
        case 'diameter': {
          const { r } = circleLike(s, c.refs[0]);
          const ri = ix.sc(r);
          const v = c.kind === 'radius' ? c.value ?? 0 : (c.value ?? 0) / 2;
          equations.push({ constraintId: cid, deps: [ri], f: (x) => x[ri] - v });
          break;
        }
        case 'angle':
          eqAngle(cid, c.refs[0], c.refs[1], c.value ?? 0);
          break;
      }
    } catch (err) {
      if (err instanceof Error) invalid.push(cid);
      else throw err;
    }
  }
  return { equations, invalid };
}
