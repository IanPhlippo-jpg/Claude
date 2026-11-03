/**
 * Exact OpenCascade edges for the curved sketch entities without a circle form (QA 0.5.11 F175): ellipses and
 * partial ellipses on gp_Elips, splines and conics as B-spline curves whose poles reproduce the sketch curve exactly.
 * A Catmull-Rom span is a cubic Bezier (the whole spline a C1 cubic B-spline), a Style Spline is one Bezier span and
 * a conic is a rational quadratic Bezier, so the exact body follows the same curve the sketch and the mesh draw.
 */
import type { Entity, Sketch, SketchPoint } from '../sketch/types';
import { ellipseArcRange, ellipseParams } from '../sketch/geometry';

/* eslint-disable @typescript-eslint/no-explicit-any */
type P = SketchPoint;

/** the poles, weights and knots of a B-spline curve in sketch coordinates */
export interface BSplineData { poles: P[]; weights?: number[]; knots: number[]; mults: number[]; degree: number }

/** the C1 cubic B-spline (knots 0..n-1) that is the Catmull-Rom curve through the points, as sampleCatmullRom draws it */
export function catmullRomBSpline(pts: P[]): BSplineData | null {
  const n = pts.length;
  if (n < 3) return null;
  const at = (i: number) => pts[Math.max(0, Math.min(n - 1, i))];
  // the tangent at a through-point; the end points use themselves as their outer neighbour
  const tan = (i: number) => ({ x: (at(i + 1).x - at(i - 1).x) / 2, y: (at(i + 1).y - at(i - 1).y) / 2 });
  const poles: P[] = [pts[0]];
  for (let i = 0; i < n - 1; i++) {
    const m1 = tan(i), m2 = tan(i + 1);
    poles.push({ x: pts[i].x + m1.x / 3, y: pts[i].y + m1.y / 3 }, { x: pts[i + 1].x - m2.x / 3, y: pts[i + 1].y - m2.y / 3 });
  }
  poles.push(pts[n - 1]);
  // the inner through-points lie halfway between their two neighbouring poles: knots of multiplicity 2 drop them
  const knots = Array.from({ length: n }, (_, i) => i);
  const mults = knots.map((_, i) => (i === 0 || i === n - 1 ? 4 : 2));
  return { poles, knots, mults, degree: 3 };
}

/** the B-spline of a sketch spline or conic (null for what is a straight line or has no exact form here) */
export function entityBSpline(sketch: Sketch, e: Entity): BSplineData | null {
  if (e.kind === 'spline') {
    const pts = e.points.map((id) => sketch.points[id]);
    if (pts.some((p) => !p)) return null;
    if (!e.style) return catmullRomBSpline(pts);
    const d = pts.length - 1;
    if (d < 2 || d > 25) return null;
    return { poles: pts, knots: [0, 1], mults: [d + 1, d + 1], degree: d };
  }
  if (e.kind === 'conic') {
    const a = sketch.points[e.start], c = sketch.points[e.control], b = sketch.points[e.end];
    if (!a || !b || !c) return null;
    return { poles: [a, c, b], weights: [1, e.rho / (1 - e.rho), 1], knots: [0, 1], mults: [3, 3], degree: 2 };
  }
  return null;
}

/** the frame and parameter shift of an ellipse in OpenCascade: the major radius runs along X */
function ellipseFrame(a: number, b: number, rot: number) {
  return b > a ? { A: b, B: a, xa: rot + Math.PI / 2, shift: -Math.PI / 2 } : { A: a, B: b, xa: rot, shift: 0 };
}

export interface CurveContext {
  oc: any;
  /** registers an OpenCascade object for release */
  track: <T>(x: T) => T;
  /** sketch point -> 3D point (on the plane, at the profile's offset) */
  lift: (p: P) => number[];
  /** the plane's u and v in 3D */
  u: number[];
  v: number[];
}

/** the deviation an ellipse end may have from its sketch point and still meet the next edge of the wire */
const END_TOL = 1e-7;

/**
 * The exact edges of an ellipse, partial ellipse, spline or conic in the direction of the contour, or null when the
 * entity has no exact form here (the caller then follows it with short segments).
 */
export function exactCurveEdges(ctx: CurveContext, sketch: Sketch, e: Entity, rev: boolean): any[] | null {
  const { oc, track: t, lift } = ctx;
  const pnt = (c: number[]) => t(new oc.gp_Pnt(c[0], c[1], c[2]));
  const reversed = (edge: any) => t(oc.TopoDS.Edge(t(edge.Reversed())));
  try {
    if (e.kind === 'ellipse' || e.kind === 'ellipseArc') {
      const { c, a, b, rot } = ellipseParams(sketch, e as never);
      if (!(a > 1e-9) || !(b > 1e-9)) return null;
      const f = ellipseFrame(a, b, rot);
      const { u, v } = ctx;
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const x = [0, 1, 2].map((k) => u[k] * Math.cos(f.xa) + v[k] * Math.sin(f.xa));
      const ax = t(new oc.gp_Ax2(pnt(lift(c)), t(new oc.gp_Dir(n[0], n[1], n[2])), t(new oc.gp_Dir(x[0], x[1], x[2]))));
      const elips = t(new oc.gp_Elips(ax, f.A, f.B));
      if (e.kind === 'ellipse') return [t(t(new oc.BRepBuilderAPI_MakeEdge(elips)).Edge())];
      const { t0, sweep } = ellipseArcRange(sketch, e);
      const on = (tt: number) => ({ x: c.x + a * Math.cos(tt) * Math.cos(rot) - b * Math.sin(tt) * Math.sin(rot), y: c.y + a * Math.cos(tt) * Math.sin(rot) + b * Math.sin(tt) * Math.cos(rot) });
      const ps = sketch.points[e.start], pe = sketch.points[e.end];
      const qs = on(t0), qe = on(t0 + sweep);
      if (Math.hypot(qs.x - ps.x, qs.y - ps.y) > END_TOL || Math.hypot(qe.x - pe.x, qe.y - pe.y) > END_TOL) return null;
      const p0 = t0 + f.shift;
      const [p1, p2] = sweep > 0 ? [p0, p0 + sweep] : [p0 + sweep, p0];
      const mk = t(new oc.BRepBuilderAPI_MakeEdge(elips, p1, p2));
      if (!mk.IsDone()) return null;
      const edge = t(mk.Edge());
      // the edge runs with the parameter: start -> end for a counter-clockwise arc
      return [rev !== sweep < 0 ? reversed(edge) : edge];
    }
    const data = entityBSpline(sketch, e);
    if (!data) return null;
    const poles = t(new oc.NCollection_Array1_gp_Pnt(1, data.poles.length));
    data.poles.forEach((p, i) => poles.SetValue(i + 1, pnt(lift(p))));
    const knots = t(new oc.NCollection_Array1_double(1, data.knots.length));
    data.knots.forEach((k, i) => knots.SetValue(i + 1, k));
    const mults = t(new oc.NCollection_Array1_int(1, data.mults.length));
    data.mults.forEach((m, i) => mults.SetValue(i + 1, m));
    let curve: any;
    if (data.weights) {
      const w = t(new oc.NCollection_Array1_double(1, data.weights.length));
      data.weights.forEach((x, i) => w.SetValue(i + 1, x));
      curve = t(new oc.Geom_BSplineCurve(poles, w, knots, mults, data.degree, false, true));
    } else curve = t(new oc.Geom_BSplineCurve(poles, knots, mults, data.degree, false));
    const mk = t(new oc.BRepBuilderAPI_MakeEdge(curve));
    if (!mk.IsDone()) return null;
    const edge = t(mk.Edge());
    return [rev ? reversed(edge) : edge];
  } catch {
    return null;
  }
}
