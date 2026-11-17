/**
 * The SPLINE entity of a DXF file as through points for the sketch spline: the fit points when the file has them,
 * else points on the (rational) B-spline, evaluated with de Boor's algorithm, densely enough that the sketch spline
 * through them stays on the curve.
 */
import type { P2 } from './dxfRead';

export interface DxfSplineData {
  degree: number;
  closed: boolean;
  knots: number[];
  weights: number[];
  control: P2[];
  fit: P2[];
}

/** a clamped uniform knot vector for n control points */
function clamped(n: number, p: number): number[] {
  const k: number[] = [];
  for (let i = 0; i < n + p + 1; i++) k.push(i <= p ? 0 : i >= n ? n - p : i - p);
  return k;
}

/** the point at parameter u (de Boor, homogeneous coordinates for the weights) */
export function deBoor(u: number, p: number, knots: number[], ctrl: P2[], w: number[]): P2 {
  const n = ctrl.length;
  let k = p;
  while (k < n - 1 && u >= knots[k + 1]) k++;
  const d = [];
  for (let j = 0; j <= p; j++) {
    const i = Math.min(n - 1, Math.max(0, j + k - p));
    const wi = w[i] ?? 1;
    d.push({ x: ctrl[i].x * wi, y: ctrl[i].y * wi, w: wi });
  }
  for (let r = 1; r <= p; r++) {
    for (let j = p; j >= r; j--) {
      const i = j + k - p;
      const den = knots[i + p - r + 1] - knots[i];
      const a = den > 1e-15 ? (u - knots[i]) / den : 0;
      d[j] = { x: (1 - a) * d[j - 1].x + a * d[j].x, y: (1 - a) * d[j - 1].y + a * d[j].y, w: (1 - a) * d[j - 1].w + a * d[j].w };
    }
  }
  const q = d[p];
  return { x: q.x / q.w, y: q.y / q.w };
}

export function splinePoints(s: DxfSplineData): P2[] {
  if (s.fit.length >= 2 && s.control.length < 2) return s.closed && !same(s.fit[0], s.fit[s.fit.length - 1]) ? [...s.fit, s.fit[0]] : s.fit;
  const n = s.control.length;
  if (n < 2) return s.fit.length >= 2 ? s.fit : [];
  const p = Math.max(1, Math.min(s.degree, n - 1));
  if (p === 1) return s.closed && !same(s.control[0], s.control[n - 1]) ? [...s.control, s.control[0]] : s.control;
  const knots = s.knots.length === n + p + 1 ? s.knots : clamped(n, p);
  const u0 = knots[p], u1 = knots[n];
  if (!(u1 > u0)) return [];
  // eight points per knot span, at least 16, at most 400
  const spans = new Set(knots.slice(p, n + 1)).size - 1;
  const count = Math.max(16, Math.min(400, spans * 8));
  const out: P2[] = [];
  for (let i = 0; i <= count; i++) out.push(deBoor(i === count ? u1 - 1e-12 * (u1 - u0) : u0 + ((u1 - u0) * i) / count, p, knots, s.control, s.weights));
  // a curve that ends where it starts (a closed or periodic spline) closes exactly
  if (Math.hypot(out[0].x - out[count].x, out[0].y - out[count].y) < 1e-6 * (1 + Math.hypot(out[0].x, out[0].y))) out[count] = out[0];
  return out;
}

const same = (a: P2, b: P2) => Math.abs(a.x - b.x) < 1e-12 && Math.abs(a.y - b.y) < 1e-12;
