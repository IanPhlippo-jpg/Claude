/**
 * IGES 5.3 export of B-rep bodies (QA F114/F199): every face becomes a trimmed NURBS surface (144 on 128), its wires
 * curves on the surface (142) with B-spline curves in parameter and model space. The bundled OpenCascade build has no
 * IGES writer and no NURBS conversion of a whole shape, so the conversion is done here, face by face:
 *
 * - planes, cylinders, cones, spheres, tori, surfaces of revolution and extrusion are rebuilt exactly from their own
 *   point evaluation: a direction where the surface turns by its parameter (an angle) becomes a rational quadratic
 *   arc, a straight direction a linear span, the other direction the exact B-spline of the iso curve;
 * - B-spline and Bezier surfaces are written as they are;
 * - anything else (an offset surface) is interpolated by bicubic Hermite patches and counted as approximated.
 *
 * Every converted surface is checked against the B-rep surface on a grid before it is called exact. Where an angle
 * becomes the parameter of a rational arc, the trim curves in parameter space follow that map: lines along one
 * direction stay exact, other curves are fitted within 1e-9 of the map (counted); the model space curves are exact.
 */
import { meshToSolid, shapeVolume, type StepItem } from './step';
import { curvePoint, fullKnots, hermiteFit, IDENTITY, mapParam, reverseCurve, surfacePoint, transposeSurface, unitArc, type NurbsCurve, type NurbsSurface, type ParamMap } from './igesNurbs';
import { writeIges, IGES_UNITS, type IgesFace, type IgesLoop, type IgesUnit } from './igesFormat';

/* eslint-disable @typescript-eslint/no-explicit-any */
type OCInstance = any;
type Replicad = typeof import('replicad');
type V3 = number[];

/** the coordinates of an OpenCascade point or vector; the wrapper is freed (the call returned a copy) */
const xyz = (p: any): V3 => { const r = [p.X(), p.Y(), p.Z()]; p.delete(); return r; };
const dist = (a: number[], b: number[]) => Math.hypot(...a.map((x, k) => x - b[k]));
const lerp = (a: V3, b: V3, t: number) => a.map((x, k) => x + t * (b[k] - x));

/** counts of what is not an exact copy of the B-rep */
export interface IgesStats {
  faces: number;
  /** surfaces interpolated by Hermite patches (not exact) and the largest distance measured */
  approximatedSurfaces: number;
  maxSurfaceDeviation: number;
  /** trim curves in parameter space fitted to the arc map (within 1e-9), and model space curves fitted */
  fittedTrims: number;
  fittedEdges: number;
}

/** a B-spline curve of OpenCascade -> plain data */
function bsplineCurve(b: any, dim: 2 | 3): NurbsCurve {
  const n = b.NbPoles(), nk = b.NbKnots();
  const knots: number[] = [], mults: number[] = [];
  for (let i = 1; i <= nk; i++) { knots.push(b.Knot(i)); mults.push(b.Multiplicity(i)); }
  const poles: number[][] = [], weights: number[] = [];
  for (let i = 1; i <= n; i++) {
    const p = b.Pole(i);
    if (dim === 3) poles.push(xyz(p));
    else { poles.push([p.X(), p.Y()]); p.delete(); }
    weights.push(b.Weight(i));
  }
  if (b.IsPeriodic?.()) throw new Error('periodic B-spline');
  return { degree: b.Degree(), knots: fullKnots(knots, mults), poles, weights };
}

/**
 * A curve given by its point function on [t0, t1] -> an exact B-spline and the map from t to its parameter:
 * a straight line keeps t, a curve c + cos t a + sin t b (circle, ellipse) becomes rational arcs, anything else
 * goes through the exact conversion of OpenCascade when it keeps t. null when none of these is exact.
 */
function exactCurve(OC: OCInstance, at: (t: number) => V3, t0: number, t1: number, geom: (() => any) | null, tol: number): { curve: NurbsCurve; map: ParamMap } | null {
  const p0 = at(t0), p1 = at(t1);
  const probe = [0.13, 0.41, 0.77].map((s) => t0 + s * (t1 - t0));
  if (probe.every((t) => dist(at(t), lerp(p0, p1, (t - t0) / (t1 - t0))) < tol)) return { curve: { degree: 1, knots: [t0, t0, t1, t1], poles: [p0, p1], weights: [1, 1] }, map: IDENTITY };
  const c0 = at(0), cpi = at(Math.PI), c = lerp(c0, cpi, 0.5);
  const a = c0.map((x, k) => x - c[k]), b = at(Math.PI / 2).map((x, k) => x - c[k]);
  const ell = (t: number) => c.map((x, k) => x + Math.cos(t) * a[k] + Math.sin(t) * b[k]);
  if ([t0, t1, ...probe, 2.3].every((t) => dist(at(t), ell(t)) < tol) && Math.hypot(...a) > tol) {
    const arc = unitArc(t0, t1);
    return { curve: { degree: 2, knots: arc.knots, poles: arc.cs.map(([cs, sn]) => c.map((x, k) => x + cs * a[k] + sn * b[k])), weights: arc.weights }, map: arc.map };
  }
  if (!geom) return null;
  try {
    const trimmed = new OC.Geom_TrimmedCurve(geom(), t0, t1, true, false);
    const curve = bsplineCurve(OC.GeomConvert.CurveToBSplineCurve(trimmed, OC.Convert_ParameterisationType.Convert_TgtThetaOver2), 3);
    trimmed.delete();
    if ([t0, t1, ...probe].every((t) => dist(curvePoint(curve, t), at(t)) < tol)) return { curve, map: IDENTITY };
  } catch { /* not convertible */ }
  return null;
}

const sameStructure = (a: NurbsCurve, b: NurbsCurve) =>
  a.degree === b.degree && a.knots.length === b.knots.length && a.knots.every((k, i) => Math.abs(k - b.knots[i]) < 1e-12) && a.weights.every((w, i) => Math.abs(w - b.weights[i]) < 1e-12);

interface Converted { surface: NurbsSurface; mapU: ParamMap; mapV: ParamMap; exact: boolean; deviation: number }

/** the source surface of a face -> a B-spline surface and the parameter maps, exact where possible */
function convertSurface(OC: OCInstance, S: any, b: { UMin: number; UMax: number; VMin: number; VMax: number }, type: string, tol: number, breaks: { u: number[]; v: number[] }): Converted {
  const { UMin: u1, UMax: u2, VMin: v1, VMax: v2 } = b;
  const at = (u: number, v: number) => xyz(S.Value(u, v));
  const us = [u1, u1 + 0.37 * (u2 - u1), u2], vs = [v1, v1 + 0.41 * (v2 - v1), v2];
  const check = (c: Omit<Converted, 'exact' | 'deviation'>) => {
    let dev = 0;
    for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
      const u = u1 + ((u2 - u1) * i) / 6, v = v1 + ((v2 - v1) * j) / 6;
      dev = Math.max(dev, dist(surfacePoint(c.surface, mapParam(c.mapU, u).p, mapParam(c.mapV, v).p), at(u, v)));
    }
    return dev;
  };
  const candidates: (() => Omit<Converted, 'exact' | 'deviation'> | null)[] = [];
  if (type === 'GeomAbs_BSplineSurface' || type === 'GeomAbs_BezierSurface') {
    candidates.push(() => {
      const bs = OC.GeomConvert.SurfaceToBSplineSurface(S);
      if (bs.IsUPeriodic() || bs.IsVPeriodic()) return null;
      const nu = bs.NbUPoles(), nv = bs.NbVPoles();
      const kn = (n: number, k: (i: number) => number, m: (i: number) => number) => { const a: number[] = [], c: number[] = []; for (let i = 1; i <= n; i++) { a.push(k(i)); c.push(m(i)); } return fullKnots(a, c); };
      const poles: number[][][] = [], weights: number[][] = [];
      for (let i = 1; i <= nu; i++) {
        poles.push([]); weights.push([]);
        for (let j = 1; j <= nv; j++) { poles[i - 1].push(xyz(bs.Pole(i, j))); weights[i - 1].push(bs.Weight(i, j)); }
      }
      const surface = { uDegree: bs.UDegree(), vDegree: bs.VDegree(), uKnots: kn(bs.NbUKnots(), (i) => bs.UKnot(i), (i) => bs.UMultiplicity(i)), vKnots: kn(bs.NbVKnots(), (i) => bs.VKnot(i), (i) => bs.VMultiplicity(i)), poles, weights };
      return { surface, mapU: IDENTITY, mapV: IDENTITY };
    });
  }
  // u turns the surface about an axis by the angle u: S = A(v) + cos u B(v) + sin u D(v) (revolved surfaces)
  candidates.push(() => {
    for (const v of vs) {
      const a = lerp(at(0, v), at(Math.PI, v), 0.5);
      const B = at(0, v).map((x, k) => x - a[k]), D = at(Math.PI / 2, v).map((x, k) => x - a[k]);
      for (const u of [...us, 2.3, 4.1]) if (dist(at(u, v), a.map((x, k) => x + Math.cos(u) * B[k] + Math.sin(u) * D[k])) > tol) return null;
    }
    const mer = [0, Math.PI, Math.PI / 2].map((u) => exactCurve(OC, (v) => at(u, v), v1, v2, () => S.UIso(u), tol));
    if (mer.some((m) => !m) || !sameStructure(mer[0]!.curve, mer[1]!.curve) || !sameStructure(mer[0]!.curve, mer[2]!.curve)) return null;
    const [g0, gpi, gh] = mer.map((m) => m!.curve);
    const arc = unitArc(u1, u2);
    const poles = arc.cs.map(([cs, sn]) => g0.poles.map((p, j) => {
      const A = lerp(p, gpi.poles[j], 0.5);
      return A.map((x, k) => x + cs * (p[k] - x) + sn * (gh.poles[j][k] - x));
    }));
    const weights = arc.weights.map((wu) => g0.weights.map((wv) => wu * wv));
    return { surface: { uDegree: 2, vDegree: g0.degree, uKnots: arc.knots, vKnots: g0.knots, poles, weights }, mapU: arc.map, mapV: mer[0]!.map };
  });
  // a straight direction (planes, extrusions, ruled surfaces): S is linear between two iso curves
  for (const dir of ['v', 'u'] as const) {
    candidates.push(() => {
      const [a1, a2, b1, b2] = dir === 'v' ? [v1, v2, u1, u2] : [u1, u2, v1, v2];
      const pt = (b: number, a: number) => (dir === 'v' ? at(b, a) : at(a, b));
      for (const bb of dir === 'v' ? us : vs) for (const s of [0.29, 0.63]) if (dist(pt(bb, a1 + s * (a2 - a1)), lerp(pt(bb, a1), pt(bb, a2), s)) > tol) return null;
      const iso = [a1, a2].map((a) => exactCurve(OC, (t) => pt(t, a), b1, b2, () => (dir === 'v' ? S.VIso(a) : S.UIso(a)), tol));
      if (!iso[0] || !iso[1] || !sameStructure(iso[0].curve, iso[1].curve)) return null;
      const c = iso[0].curve;
      const surface: NurbsSurface = { uDegree: c.degree, vDegree: 1, uKnots: c.knots, vKnots: [a1, a1, a2, a2], poles: c.poles.map((p, i) => [p, iso[1]!.curve.poles[i]]), weights: c.weights.map((w) => [w, w]) };
      return dir === 'v' ? { surface, mapU: iso[0].map, mapV: IDENTITY } : { surface: transposeSurface(surface), mapU: IDENTITY, mapV: iso[0].map };
    });
  }
  for (const make of candidates) {
    let c: ReturnType<typeof make> = null;
    try { c = make(); } catch { c = null; }
    if (!c) continue;
    const deviation = check(c);
    if (deviation < tol) return { ...c, exact: true, deviation };
  }
  return hermiteSurface(S, b, tol, breaks);
}

/** the parameters where an adaptor is less smooth than C2 (its interval ends), from a count and a fill function */
function breaksOf(OC: OCInstance, n: number, fill: (T: any) => void): number[] {
  if (n <= 1) return [];
  const T = new OC.NCollection_Array1_double(1, n + 1);
  fill(T);
  const r: number[] = [];
  for (let i = 1; i <= n + 1; i++) r.push(T.Value(i));
  T.delete();
  return r;
}

/** a grid over [a, z] through the breaks, every interval cut in m */
function grid(a: number, z: number, breaks: number[], m: number): number[] {
  const cuts = [a, ...breaks.filter((x) => x > a + 1e-12 * (z - a) && x < z - 1e-12 * (z - a)), z];
  const out = [a];
  for (let k = 0; k + 1 < cuts.length; k++) for (let s = 1; s <= m; s++) out.push(s === m ? cuts[k + 1] : cuts[k] + ((cuts[k + 1] - cuts[k]) * s) / m);
  return out;
}

/**
 * Bicubic Hermite patches through the surface (value, both tangents, twist) on a grid through its less smooth lines,
 * refined until within 1e-4 mm or 1024 patches. Not exact: the face is counted as approximated with its deviation.
 */
function hermiteSurface(S: any, b: { UMin: number; UMax: number; VMin: number; VMax: number }, tol: number, breaks: { u: number[]; v: number[] }): Converted {
  const { UMin: u1, UMax: u2, VMin: v1, VMax: v2 } = b;
  let best: Converted | null = null;
  for (let m = 1; m <= 64; m *= 2) {
    const us = grid(u1, u2, breaks.u, m), vs = grid(v1, v2, breaks.v, m);
    const nu = us.length - 1, nv = vs.length - 1;
    if (nu < 4 || nv < 4) continue;
    if (best && nu * nv > 1024) break;
    const poles: number[][][] = Array.from({ length: 3 * nu + 1 }, () => []);
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const P = xyz(S.Value(us[i], vs[j]));
      for (const di of [-1, 0, 1]) for (const dj of [-1, 0, 1]) {
        const I = 3 * i + di, J = 3 * j + dj;
        if (I < 0 || J < 0 || I > 3 * nu || J > 3 * nv) continue;
        if (!di && !dj) { poles[I][J] = P; continue; }
        const hu = di > 0 ? us[i + 1] - us[i] : di < 0 ? us[i] - us[i - 1] : 0;
        const hv = dj > 0 ? vs[j + 1] - vs[j] : dj < 0 ? vs[j] - vs[j - 1] : 0;
        // the derivatives from inside the patch the pole belongs to: the surface may have a crease on a grid line
        const r = S.EvalD2(us[i] + di * 1e-9 * hu, vs[j] + dj * 1e-9 * hv);
        const Su = xyz(r.D1U), Sv = xyz(r.D1V), Suv = xyz(r.D2UV);
        for (const k of ['Point', 'D2U', 'D2V'] as const) r[k].delete();
        poles[I][J] = P.map((x, k) => x + (di * hu * Su[k]) / 3 + (dj * hv * Sv[k]) / 3 + (di * dj * hu * hv * Suv[k]) / 9);
      }
    }
    const knots = (g: number[]) => [g[0], ...g.flatMap((x) => [x, x, x]), g[g.length - 1]];
    const surface: NurbsSurface = { uDegree: 3, vDegree: 3, uKnots: knots(us), vKnots: knots(vs), poles, weights: poles.map((r) => r.map(() => 1)) };
    let deviation = 0;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const u = (us[i] + us[i + 1]) / 2, v = (vs[j] + vs[j + 1]) / 2;
      deviation = Math.max(deviation, dist(surfacePoint(surface, u, v), xyz(S.Value(u, v))));
    }
    if (!best || deviation < best.deviation) best = { surface, mapU: IDENTITY, mapV: IDENTITY, exact: deviation < tol, deviation };
    if (deviation < 1e-4) break;
  }
  return best!;
}

/** one face -> its IGES trimmed surface */
function faceOf(OC: OCInstance, face: any, stats: IgesStats, tol: number): IgesFace {
  const S = OC.BRep_Tool.Surface(face);
  const ad = new OC.BRepAdaptor_Surface(face, true);
  const type = String(ad.GetType());
  const C2 = OC.GeomAbs_Shape.GeomAbs_C2;
  const breaks = { u: [] as number[], v: [] as number[] };
  try {
    breaks.u = breaksOf(OC, ad.NbUIntervals(C2), (T) => ad.UIntervals(T, C2));
    breaks.v = breaksOf(OC, ad.NbVIntervals(C2), (T) => ad.VIntervals(T, C2));
  } catch { /* no intervals: a uniform grid */ }
  ad.delete();
  const bounds = OC.BRepTools.UVBounds(face);
  const conv = convertSurface(OC, S, bounds, type, tol, breaks);
  if (!conv.exact) { stats.approximatedSurfaces++; stats.maxSurfaceDeviation = Math.max(stats.maxSurfaceDeviation, conv.deviation); }
  // a reversed face: u and v exchanged, so the surface normal points out of the body and the outer loop runs anticlockwise
  const swap = face.Orientation() === OC.TopAbs_Orientation.TopAbs_REVERSED;
  const surface = swap ? transposeSurface(conv.surface) : conv.surface;
  const phi = (u: number, v: number) => { const a = mapParam(conv.mapU, u), b = mapParam(conv.mapV, v); return { p: swap ? [b.p, a.p] : [a.p, b.p], du: a.d, dv: b.d }; };
  const ident = conv.mapU.kind === 'id' && conv.mapV.kind === 'id';
  const outerWire = OC.BRepTools.OuterWire(face);
  const loops: { outer: boolean; loop: IgesLoop }[] = [];
  const wx = new OC.TopExp_Explorer(face, OC.TopAbs_ShapeEnum.TopAbs_WIRE, OC.TopAbs_ShapeEnum.TopAbs_SHAPE);
  for (; wx.More(); wx.Next()) {
    const wire = wx.Current();
    const pieces: { uv: NurbsCurve; xyz: NurbsCurve | null; uvExact: boolean; xyzExact: boolean }[] = [];
    const ex = new OC.TopExp_Explorer(wire, OC.TopAbs_ShapeEnum.TopAbs_EDGE, OC.TopAbs_ShapeEnum.TopAbs_SHAPE);
    for (; ex.More(); ex.Next()) {
      const edge = OC.TopoDS.Edge(ex.Current());
      const reversed = edge.Orientation() === OC.TopAbs_Orientation.TopAbs_REVERSED;
      const a2 = new OC.BRepAdaptor_Curve2d(edge, face);
      const f = a2.FirstParameter(), l = a2.LastParameter();
      const c2 = a2.Curve();
      const uvAt = (w: number) => { const p = a2.Value(w); const r = [p.X(), p.Y()]; p.delete(); return r; };
      let uv: NurbsCurve | null = null, uvExact = true;
      if (ident) {
        try {
          const tc = new OC.Geom2d_TrimmedCurve(c2, f, l, true, false);
          uv = bsplineCurve(OC.Geom2dConvert.CurveToBSplineCurve(tc, OC.Convert_ParameterisationType.Convert_TgtThetaOver2), 2);
          tc.delete();
          if (swap) uv.poles = uv.poles.map(([x, y]) => [y, x]);
        } catch { uv = null; }
      }
      if (!uv) {
        const s = uvAt(f), e = uvAt(l);
        const moves = [Math.abs(e[0] - s[0]) > 1e-12, Math.abs(e[1] - s[1]) > 1e-12];
        const straight = String(a2.GetType()) === 'GeomAbs_Line';
        // a line along one direction stays a line under the arc map; so does one where only identity directions move
        if (straight && (!(moves[0] && moves[1]) || ident)) uv = { degree: 1, knots: [f, f, l, l], poles: [phi(s[0], s[1]).p, phi(e[0], e[1]).p], weights: [1, 1] };
        else {
          let kinks: number[] = [];
          try { kinks = breaksOf(OC, a2.NbIntervals(C2), (T) => a2.Intervals(T, C2)); } catch { kinks = []; }
          const fit = hermiteFit((w) => {
            const r = a2.EvalD1(w);
            const m = phi(r.Point.X(), r.Point.Y());
            const d = [m.du * r.D1.X(), m.dv * r.D1.Y()];
            r.Point.delete();
            r.D1.delete();
            return { p: m.p, d: swap ? [d[1], d[0]] : d };
          }, f, l, 1e-9, kinks);
          uv = fit.curve;
          uvExact = false;
          stats.fittedTrims++;
        }
      }
      a2.delete();
      let curve3: NurbsCurve | null = null, xyzExact = true;
      if (!OC.BRep_Tool.Degenerated(edge)) {
        let c3 = OC.BRep_Tool.Curve(edge);
        if (!c3.returnValue) { OC.BRepLib.BuildCurve3d(edge); c3 = OC.BRep_Tool.Curve(edge); }
        const ac = new OC.BRepAdaptor_Curve(edge);
        try {
          const tc = new OC.Geom_TrimmedCurve(c3.returnValue, c3.First, c3.Last, true, false);
          curve3 = bsplineCurve(OC.GeomConvert.CurveToBSplineCurve(tc, OC.Convert_ParameterisationType.Convert_TgtThetaOver2), 3);
          tc.delete();
        } catch {
          let kinks: number[] = [];
          try { kinks = breaksOf(OC, ac.NbIntervals(C2), (T) => ac.Intervals(T, C2)); } catch { kinks = []; }
          curve3 = hermiteFit((w) => { const r = ac.EvalD1(w); return { p: xyz(r.Point), d: xyz(r.D1) }; }, ac.FirstParameter(), ac.LastParameter(), tol, kinks).curve;
          xyzExact = false;
          stats.fittedEdges++;
        }
        ac.delete();
      }
      pieces.push({ uv: reversed ? reverseCurve(uv) : uv, xyz: curve3 && reversed ? reverseCurve(curve3) : curve3, uvExact, xyzExact });
    }
    ex.delete();
    // the edges of a wire in loop order: each one starts where the one before ends (in the parameter space)
    const ordered = [pieces.shift()!];
    while (pieces.length) {
      const end = ordered[ordered.length - 1].uv.poles.at(-1)!;
      let k = 0;
      pieces.forEach((p, i) => { if (dist(p.uv.poles[0], end) < dist(pieces[k].uv.poles[0], end)) k = i; });
      ordered.push(pieces.splice(k, 1)[0]);
    }
    const e2 = ordered.every((p) => p.uvExact), e3 = ordered.every((p) => p.xyzExact);
    loops.push({ outer: wire.IsSame(outerWire), loop: { uv: ordered.map((p) => p.uv), xyz: ordered.flatMap((p) => (p.xyz ? [p.xyz] : [])), pref: e2 && e3 ? 3 : e2 ? 1 : 2 } });
  }
  wx.delete();
  const outer = loops.find((l) => l.outer) ?? loops[0];
  return { surface, outer: outer.loop, inner: loops.filter((l) => l !== outer).map((l) => l.loop) };
}

/** every face of a shape as IGES trimmed surfaces (millimetres) */
export function shapeToIgesFaces(OC: OCInstance, shape: any, stats: IgesStats, tol = 1e-7): IgesFace[] {
  const faces: IgesFace[] = [];
  const ex = new OC.TopExp_Explorer(shape, OC.TopAbs_ShapeEnum.TopAbs_FACE, OC.TopAbs_ShapeEnum.TopAbs_SHAPE);
  for (; ex.More(); ex.Next()) { faces.push(faceOf(OC, OC.TopoDS.Face(ex.Current()), stats, tol)); stats.faces++; }
  ex.delete();
  return faces;
}

/**
 * Bodies -> IGES 5.3 bytes (trimmed surfaces), mirroring shapesToStep: a body with a B-rep goes out as its faces, a
 * mesh body as the faces of its sewn solid; `exact` counts only the items marked exact whose surfaces all stayed exact.
 */
export async function shapesToIges(replicad: Replicad, items: StepItem[], unit: IgesUnit = 'mm', fileName = 'Part.igs'): Promise<{ bytes: Uint8Array; volumes: number[]; exact: number; stats: IgesStats }> {
  const OC = replicad.getOC() as OCInstance;
  const stats: IgesStats = { faces: 0, approximatedSurfaces: 0, maxSurfaceDeviation: 0, fittedTrims: 0, fittedEdges: 0 };
  const faces: IgesFace[] = [];
  const volumes: number[] = [];
  let exact = 0, tolerance = 1e-7;
  for (const it of items) {
    let shape = 'shape' in it ? it.shape : meshToSolid(OC, it.positions);
    if (!shape) continue;
    let v = 0;
    try { v = shapeVolume(OC, shape); } catch { v = 0; }
    // a solid inside out (a mesh wound the other way round) is turned over, so the surface normals point outwards
    if (v < 0) { shape = shape.Reversed(); v = -v; }
    const before = stats.approximatedSurfaces;
    faces.push(...shapeToIgesFaces(OC, shape, stats));
    try { tolerance = Math.max(tolerance, OC.BRep_Tool.MaxTolerance(shape, OC.TopAbs_ShapeEnum.TopAbs_EDGE)); } catch { /* keep */ }
    volumes.push(v);
    if ('shape' in it && it.exact === true && stats.approximatedSurfaces === before) exact++;
  }
  if (!faces.length) throw new Error('none of the bodies is a closed solid');
  const text = writeIges(faces, { fileName, unit, resolution: tolerance * IGES_UNITS[unit].perMm });
  return { bytes: new TextEncoder().encode(text), volumes, exact, stats };
}
