/**
 * Least-squares solving and Jacobians for one part (connected group) of a sketch's equation system.
 * A part works in place on the global parameter vector: only its own parameters change.
 */
import type { Equation } from './equations';
import { choleskyFlat, type FoldTest, type SparseRow } from './linalg';

/** One part of the system: the equation rows (ascending) and the parameters (global indices) they depend on. */
export interface Part {
  rows: number[];
  cols: number[];
}

/** The distinct parameters each equation depends on. */
export function uniqueDeps(eqs: Equation[]): number[][] {
  return eqs.map((e) => (e.deps.length < 2 ? e.deps.slice() : [...new Set(e.deps)]));
}

function localIndex(cols: number[]): Map<number, number> {
  const loc = new Map<number, number>();
  cols.forEach((c, i) => loc.set(c, i));
  return loc;
}

/**
 * Levenberg-Marquardt on one part (forward-difference Jacobian, damping lambda * (diag + 1), 12 attempts per
 * step), the same method as the former whole-sketch solver. A^T A is built from the sparse rows and factored
 * with an envelope Cholesky. Returns the iterations and the final sum of squared residuals.
 */
export function levenbergMarquardt(
  eqs: Equation[],
  deps: number[][],
  part: Part,
  x: number[],
  maxIter: number,
  tol: number,
): { iterations: number; cost: number } {
  const { rows, cols } = part;
  const m = cols.length, nr = rows.length;
  const loc = localIndex(cols);
  const rIdx = rows.map((r) => deps[r].map((c) => loc.get(c) as number));
  const evaluate = (out: Float64Array) => {
    let c = 0;
    for (let k = 0; k < nr; k++) {
      const v = eqs[rows[k]].f(x);
      out[k] = v;
      c += v * v;
    }
    return c;
  };
  let f = new Float64Array(nr);
  let cost = evaluate(f);
  const J = rIdx.map((ix) => new Float64Array(ix.length));
  const jacobian = () => {
    for (let k = 0; k < nr; k++) {
      const eq = eqs[rows[k]], d = deps[rows[k]], Jk = J[k];
      for (let t = 0; t < d.length; t++) {
        const c = d[t];
        const old = x[c];
        const h = 1e-6 * Math.max(1, Math.abs(old));
        x[c] = old + h;
        Jk[t] = (eq.f(x) - f[k]) / h;
        x[c] = old;
      }
    }
  };
  const tol2 = tol * tol;
  let lambda = 1e-3;
  let it = 0;
  if (m === 0) return { iterations: 0, cost };
  jacobian();
  const A = new Float64Array(m * m), g = new Float64Array(m), first = new Int32Array(m);
  const saved = new Float64Array(m);
  for (; it < maxIter && cost > tol2; it++) {
    A.fill(0);
    g.fill(0);
    for (let k = 0; k < nr; k++) {
      const ix = rIdx[k], v = J[k], fk = f[k];
      for (let a = 0; a < ix.length; a++) {
        const va = v[a];
        if (va === 0) continue;
        const ra = ix[a] * m;
        g[ix[a]] -= va * fk;
        for (let b = 0; b < ix.length; b++) A[ra + ix[b]] += va * v[b];
      }
    }
    for (let i = 0; i < m; i++) {
      let j = 0;
      while (j < i && A[i * m + j] === 0) j++;
      first[i] = j;
    }
    let improved = false;
    for (let tries = 0; tries < 12; tries++) {
      const Ad = A.slice();
      for (let i = 0; i < m; i++) Ad[i * m + i] += lambda * (A[i * m + i] + 1);
      const d = choleskyFlat(Ad, m, g, first);
      if (d) {
        for (let i = 0; i < m; i++) {
          saved[i] = x[cols[i]];
          x[cols[i]] = saved[i] + d[i];
        }
        const fn = new Float64Array(nr);
        const cn = evaluate(fn);
        if (cn < cost) {
          f = fn;
          cost = cn;
          lambda = Math.max(lambda / 4, 1e-12);
          improved = true;
          break;
        }
        for (let i = 0; i < m; i++) x[cols[i]] = saved[i];
      }
      lambda *= 8;
    }
    if (!improved) break;
    jacobian();
  }
  return { iterations: it, cost };
}

/**
 * The Jacobian rows of a part for the status analysis, in the part's local column numbering. Central differences
 * (error O(h^2) instead of O(h), which matters on long lines); at a kink (|.| at zero, where the one-sided slopes
 * differ in sign or size) the forward slope is kept, as the former analysis did.
 */
export function analysisRows(eqs: Equation[], deps: number[][], rows: number[], cols: number[], x: number[]): SparseRow[] {
  const loc = localIndex(cols);
  return rows.map((r) => {
    const eq = eqs[r], d = deps[r];
    const f0 = eq.f(x);
    const idx: number[] = [], val: number[] = [];
    for (const c of d) {
      const old = x[c];
      const h = 1e-6 * Math.max(1, Math.abs(old));
      x[c] = old + h;
      const fp = eq.f(x);
      x[c] = old - h;
      const fm = eq.f(x);
      x[c] = old;
      const fwd = (fp - f0) / h, bwd = (f0 - fm) / h;
      const kink = Math.abs(fwd - bwd) > 0.5 * Math.max(Math.abs(fwd), Math.abs(bwd));
      idx.push(loc.get(c) as number);
      val.push(kink ? fwd : (fp - fm) / (2 * h));
    }
    return { idx, val };
  });
}

/**
 * The second-order test for rowRank (see FoldTest). With the dependent row's gradient written as a combination of
 * earlier rows, g = f_r/|grad f_r| - sum(lambda_b f_b/|grad f_b|) has a zero gradient; the row is truly redundant
 * when g also has no curvature along the null space T of the earlier rows (then f_r is constant on their solution
 * set). The curvature is probed along one pseudo-random direction v in T: u = P_T (Hessian of g) v, from central
 * differences of the gradient of g at x +/- eps v. A fold must give the same u at eps and eps/4 (a fourth-order
 * artefact of small features shrinks with eps^2 and is rejected).
 */
export function foldTest(eqs: Equation[], deps: number[][], rows: number[], cols: number[], x: number[], jrows: SparseRow[]): FoldTest {
  const loc = localIndex(cols);
  const m = cols.length;
  const norms = jrows.map((r) => Math.hypot(...r.val));
  return (pos, combo, projectT) => {
    const terms = [{ row: rows[pos], k: 1 / norms[pos] }];
    combo.pos.forEach((p, i) => terms.push({ row: rows[p], k: -combo.coef[i] / norms[p] }));
    const S: number[] = [];
    const inS = new Set<number>();
    let scale = 1;
    for (const t of terms) {
      for (const c of deps[t.row]) {
        const j = loc.get(c) as number;
        if (inS.has(j)) continue;
        inS.add(j);
        S.push(j);
        scale = Math.max(scale, Math.abs(x[c]));
      }
    }
    const g = () => {
      let v = 0;
      for (const t of terms) v += t.k * eqs[t.row].f(x);
      return v;
    };
    let seed = (12345 + pos * 7919) >>> 0;
    const v = new Float64Array(m);
    for (const j of S) {
      seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
      v[j] = (seed / 0xffffffff) * 2 - 1;
    }
    projectT(v);
    let nv = 0;
    for (const j of S) nv += v[j] * v[j];
    nv = Math.sqrt(nv);
    if (nv < 1e-3) return null;
    const grad = (eps: number, sign: number) => {
      const out = new Float64Array(S.length);
      for (const j of S) x[cols[j]] += (sign * eps * v[j]) / nv;
      S.forEach((j, k) => {
        const c = cols[j], old = x[c];
        const h = 1e-6 * Math.max(1, Math.abs(old));
        x[c] = old + h;
        const gp = g();
        x[c] = old - h;
        const gm = g();
        x[c] = old;
        out[k] = (gp - gm) / (2 * h);
      });
      for (const j of S) x[cols[j]] -= (sign * eps * v[j]) / nv;
      return out;
    };
    const hv = (eps: number) => {
      const gp = grad(eps, 1), gm = grad(eps, -1);
      const u = new Float64Array(m);
      S.forEach((j, k) => (u[j] = (gp[k] - gm[k]) / (2 * eps)));
      projectT(u);
      return u;
    };
    const len = (u: Float64Array) => {
      let q = 0;
      for (let i = 0; i < m; i++) q += u[i] * u[i];
      return Math.sqrt(q);
    };
    const e1 = 1e-4 * scale;
    const u1 = hv(e1), n1 = len(u1);
    if (n1 * scale < 1e-3) return null;
    const u2 = hv(e1 / 4), n2 = len(u2);
    let diff = 0;
    for (let i = 0; i < m; i++) diff += (u1[i] - u2[i]) ** 2;
    if (Math.sqrt(diff) > 0.2 * n2) return null;
    for (let i = 0; i < m; i++) u2[i] /= n2;
    return u2;
  };
}
