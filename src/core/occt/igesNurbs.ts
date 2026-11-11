/**
 * NURBS data for the IGES writer and reader (QA F114/F199): plain arrays, no OpenCascade, so the file writer, the
 * reader and the tests share them. Knot vectors are full sequences (every knot repeated by its multiplicity), poles
 * are Euclidean (not multiplied by the weight), as entities 126 and 128 store them.
 */

export interface NurbsCurve {
  degree: number;
  /** full knot sequence: poles.length + degree + 1 values */
  knots: number[];
  /** [x, y, z] in model space, or [u, v] in the parameter space of a surface */
  poles: number[][];
  weights: number[];
}

export interface NurbsSurface {
  uDegree: number;
  vDegree: number;
  uKnots: number[];
  vKnots: number[];
  /** poles[i][j]: i along u, j along v */
  poles: number[][][];
  weights: number[][];
}

/** the parameter map of one direction from a source surface to its B-spline: the identity, or a rational arc */
export type ParamMap = { kind: 'id' } | { kind: 'arc'; t0: number; delta: number; n: number };
export const IDENTITY: ParamMap = { kind: 'id' };

/** the full knot sequence from distinct knots and their multiplicities */
export function fullKnots(knots: ArrayLike<number>, mults: ArrayLike<number>): number[] {
  const out: number[] = [];
  for (let i = 0; i < knots.length; i++) for (let m = 0; m < mults[i]; m++) out.push(knots[i]);
  return out;
}

/** distinct knots and multiplicities of a full sequence (knots closer than tol count as one) */
export function distinctKnots(seq: number[], tol = 0): { knots: number[]; mults: number[] } {
  const knots: number[] = [];
  const mults: number[] = [];
  for (const k of seq) {
    if (knots.length && Math.abs(k - knots[knots.length - 1]) <= tol) mults[mults.length - 1]++;
    else { knots.push(k); mults.push(1); }
  }
  return { knots, mults };
}

/** the span index i with knots[i] <= t < knots[i + 1], clamped to the valid range [degree, n - 1] */
function span(knots: number[], degree: number, n: number, t: number): number {
  if (t >= knots[n]) return n - 1;
  if (t <= knots[degree]) return degree;
  let lo = degree, hi = n;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (t < knots[mid]) hi = mid;
    else lo = mid;
  }
  return lo;
}

/** the non-zero basis functions N[i-degree..i] at t (the algorithm of de Boor and Cox) */
function basis(knots: number[], degree: number, i: number, t: number): number[] {
  const N = [1];
  const left: number[] = [], right: number[] = [];
  for (let j = 1; j <= degree; j++) {
    left[j] = t - knots[i + 1 - j];
    right[j] = knots[i + j] - t;
    let saved = 0;
    for (let r = 0; r < j; r++) {
      const den = right[r + 1] + left[j - r];
      const tmp = den === 0 ? 0 : N[r] / den;
      N[r] = saved + right[r + 1] * tmp;
      saved = left[j - r] * tmp;
    }
    N[j] = saved;
  }
  return N;
}

/** a point of a rational B-spline curve */
export function curvePoint(c: NurbsCurve, t: number): number[] {
  const n = c.poles.length;
  const i = span(c.knots, c.degree, n, t);
  const N = basis(c.knots, c.degree, i, t);
  const dim = c.poles[0].length;
  const out = new Array(dim).fill(0);
  let w = 0;
  for (let r = 0; r <= c.degree; r++) {
    const k = i - c.degree + r;
    const f = N[r] * c.weights[k];
    w += f;
    for (let d = 0; d < dim; d++) out[d] += f * c.poles[k][d];
  }
  return out.map((x) => x / w);
}

/** a point of a rational B-spline surface */
export function surfacePoint(s: NurbsSurface, u: number, v: number): number[] {
  const nu = s.poles.length, nv = s.poles[0].length;
  const iu = span(s.uKnots, s.uDegree, nu, u), iv = span(s.vKnots, s.vDegree, nv, v);
  const Nu = basis(s.uKnots, s.uDegree, iu, u), Nv = basis(s.vKnots, s.vDegree, iv, v);
  const out = [0, 0, 0];
  let w = 0;
  for (let a = 0; a <= s.uDegree; a++) {
    const i = iu - s.uDegree + a;
    for (let b = 0; b <= s.vDegree; b++) {
      const j = iv - s.vDegree + b;
      const f = Nu[a] * Nv[b] * s.weights[i][j];
      w += f;
      for (let d = 0; d < 3; d++) out[d] += f * s.poles[i][j][d];
    }
  }
  return out.map((x) => x / w);
}

export const curveRange = (c: NurbsCurve): [number, number] => [c.knots[c.degree], c.knots[c.poles.length]];
export const surfaceRange = (s: NurbsSurface): [number, number, number, number] => [s.uKnots[s.uDegree], s.uKnots[s.poles.length], s.vKnots[s.vDegree], s.vKnots[s.poles[0].length]];

/** the same curve run the other way, over the same parameter range */
export function reverseCurve(c: NurbsCurve): NurbsCurve {
  const a = c.knots[0], b = c.knots[c.knots.length - 1];
  return { degree: c.degree, knots: c.knots.map((k) => a + b - k).reverse(), poles: c.poles.slice().reverse(), weights: c.weights.slice().reverse() };
}

/** u and v exchanged: the transposed pole net (the surface normal turns over) */
export function transposeSurface(s: NurbsSurface): NurbsSurface {
  const nu = s.poles.length, nv = s.poles[0].length;
  const poles: number[][][] = [], weights: number[][] = [];
  for (let j = 0; j < nv; j++) {
    poles.push([]);
    weights.push([]);
    for (let i = 0; i < nu; i++) { poles[j].push(s.poles[i][j]); weights[j].push(s.weights[i][j]); }
  }
  return { uDegree: s.vDegree, vDegree: s.uDegree, uKnots: s.vKnots, vKnots: s.uKnots, poles, weights };
}

/**
 * The unit circle from angle t0 to t1 as a rational quadratic B-spline in spans of at most 90°: control points
 * [cos, sin], weights, the knots placed at the span angles. Its parameter follows the angle through `arcMap`.
 */
export function unitArc(t0: number, t1: number): { map: ParamMap & { kind: 'arc' }; cs: number[][]; weights: number[]; knots: number[] } {
  const n = Math.max(1, Math.ceil((t1 - t0) / (Math.PI / 2) - 1e-9));
  const delta = (t1 - t0) / n;
  const wm = Math.cos(delta / 2);
  const cs: number[][] = [], weights: number[] = [], knots = [t0, t0, t0];
  for (let i = 0; i < n; i++) {
    const a = t0 + i * delta;
    if (i === 0) { cs.push([Math.cos(a), Math.sin(a)]); weights.push(1); }
    cs.push([Math.cos(a + delta / 2) / wm, Math.sin(a + delta / 2) / wm]);
    weights.push(wm);
    cs.push([Math.cos(a + delta), Math.sin(a + delta)]);
    weights.push(1);
    if (i < n - 1) knots.push(a + delta, a + delta);
  }
  knots.push(t1, t1, t1);
  return { map: { kind: 'arc', t0, delta, n }, cs, weights, knots };
}

/**
 * The B-spline parameter of the angle `t` on an arc made by `unitArc`, and its derivative. On a span of angle delta
 * the rational quadratic runs tan((t - mid) / 2) = tan(delta / 4) (2s - 1), s in [0, 1].
 */
export function mapParam(m: ParamMap, t: number): { p: number; d: number } {
  if (m.kind === 'id') return { p: t, d: 1 };
  const i = Math.min(m.n - 1, Math.max(0, Math.floor((t - m.t0) / m.delta)));
  const k = m.t0 + i * m.delta;
  const x = (t - k - m.delta / 2) / 2;
  const T = Math.tan(m.delta / 4);
  const c = Math.cos(x);
  return { p: k + (m.delta * (Math.tan(x) / T + 1)) / 2, d: m.delta / (4 * T * c * c) };
}

/**
 * A cubic B-spline through f on [w0, w1] that keeps f's value and first derivative at every break (cubic Hermite
 * pieces joined with triple knots), split until the curve stays within tol of f between the breaks. `breaks` are
 * parameters where f is less smooth (the knots of a source B-spline): pieces start there, so none straddles a kink.
 */
export function hermiteFit(f: (w: number) => { p: number[]; d: number[] }, w0: number, w1: number, tol: number, breaks: number[] = [], maxDepth = 10): { curve: NurbsCurve; maxError: number } {
  const poles: number[][] = [];
  const knots = [w0, w0, w0, w0];
  let maxError = 0;
  const piece = (a: number, b: number, fa: { p: number[]; d: number[] }, fb: { p: number[]; d: number[] }) => {
    const h = (b - a) / 3;
    return [fa.p, fa.p.map((x, k) => x + h * fa.d[k]), fb.p.map((x, k) => x - h * fb.d[k]), fb.p];
  };
  const bez = (P: number[][], s: number) => {
    const t = 1 - s;
    const c = [t * t * t, 3 * s * t * t, 3 * s * s * t, s * s * s];
    return P[0].map((_, k) => c[0] * P[0][k] + c[1] * P[1][k] + c[2] * P[2][k] + c[3] * P[3][k]);
  };
  const go = (a: number, b: number, fa: { p: number[]; d: number[] }, fb: { p: number[]; d: number[] }, depth: number) => {
    const P = piece(a, b, fa, fb);
    let err = 0;
    for (const s of [0.25, 0.5, 0.75]) {
      const q = bez(P, s), r = f(a + s * (b - a)).p;
      err = Math.max(err, Math.hypot(...q.map((x, k) => x - r[k])));
    }
    if (err > tol && depth < maxDepth) {
      const m = (a + b) / 2, fm = f(m);
      go(a, m, fa, fm, depth + 1);
      go(m, b, fm, fb, depth + 1);
      return;
    }
    maxError = Math.max(maxError, err);
    if (!poles.length) poles.push(P[0]);
    poles.push(P[1], P[2], P[3]);
    if (b < w1) knots.push(b, b, b);
  };
  const cuts = [w0, ...breaks.filter((b) => b > w0 + 1e-12 * (w1 - w0) && b < w1 - 1e-12 * (w1 - w0)).sort((a, b) => a - b), w1];
  for (let i = 0; i + 1 < cuts.length; i++) {
    // at a break the derivative is taken from inside the piece: f may turn a corner there
    const a = cuts[i], b = cuts[i + 1], e = 1e-9 * (b - a);
    const fa = { p: f(a).p, d: f(a + e).d }, fb = { p: f(b).p, d: f(b - e).d };
    go(a, b, fa, fb, 0);
  }
  knots.push(w1, w1, w1, w1);
  return { curve: { degree: 3, knots, poles, weights: poles.map(() => 1) }, maxError };
}
