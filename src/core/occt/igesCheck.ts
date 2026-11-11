/**
 * Reads an IGES file written by shapesToIges back and measures it against the B-rep it came from (QA F114/F199):
 * the record layout, the pointers of every 144, how far points of each written surface, trim curve and edge curve lie
 * from the source face, whether the surface normals agree, and the area of every face rebuilt in OpenCascade from the
 * written surface and its trim curves in parameter space. Used by the tests; not part of the app bundle.
 */
import { curvePoint, curveRange, distinctKnots, surfacePoint, surfaceRange, type NurbsCurve, type NurbsSurface } from './igesNurbs';
import { igesTrimmedSurfaces, readIges } from './igesRead';
import { IGES_UNITS, type IgesUnit } from './igesFormat';

/* eslint-disable @typescript-eslint/no-explicit-any */
type OCInstance = any;

export interface IgesCheck {
  problems: string[];
  /** how many entities of each type the file has */
  entities: Record<number, number>;
  faces: number;
  /** largest distance (mm) of a point of a written surface from the source surface */
  surfaceDistance: number;
  /** largest distance (mm) of a point on a trim curve (through the written surface) from the source face */
  trimDistance: number;
  /** largest distance (mm) of a point of a model space curve from the source face */
  edgeDistance: number;
  /** the same two beyond the edge tolerance of the source face (a B-rep edge may lie that far from its face) */
  trimExcess: number;
  edgeExcess: number;
  /** largest gap between consecutive trim curves of a loop, in parameter space */
  loopGap: number;
  /** sample points where the written normal points the other way than the face normal */
  flippedNormals: number;
  areaSource: number;
  areaRead: number;
  /** largest relative area difference of one face */
  faceAreaError: number;
}

const scaled = (s: NurbsSurface, k: number): NurbsSurface => ({ ...s, poles: s.poles.map((r) => r.map((p) => p.map((x) => x * k))) });

function occSurface(OC: OCInstance, s: NurbsSurface): any {
  const nu = s.poles.length, nv = s.poles[0].length;
  const P = new OC.NCollection_Array2_gp_Pnt(1, nu, 1, nv), W = new OC.NCollection_Array2_double(1, nu, 1, nv);
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { P.SetValue(i + 1, j + 1, new OC.gp_Pnt(...s.poles[i][j])); W.SetValue(i + 1, j + 1, s.weights[i][j]); }
  const arr = (a: number[], T: string) => { const r = new OC[T](1, a.length); a.forEach((x, i) => r.SetValue(i + 1, x)); return r; };
  const u = distinctKnots(s.uKnots), v = distinctKnots(s.vKnots);
  return new OC.Geom_BSplineSurface(P, W, arr(u.knots, 'NCollection_Array1_double'), arr(v.knots, 'NCollection_Array1_double'), arr(u.mults, 'NCollection_Array1_int'), arr(v.mults, 'NCollection_Array1_int'), s.uDegree, s.vDegree, false, false);
}

function occCurve2d(OC: OCInstance, c: NurbsCurve): any {
  const P = new OC.NCollection_Array1_gp_Pnt2d(1, c.poles.length);
  c.poles.forEach((p, i) => P.SetValue(i + 1, new OC.gp_Pnt2d(p[0], p[1])));
  const arr = (a: number[], T: string) => { const r = new OC[T](1, a.length); a.forEach((x, i) => r.SetValue(i + 1, x)); return r; };
  const k = distinctKnots(c.knots);
  return new OC.Geom2d_BSplineCurve(P, arr(c.weights, 'NCollection_Array1_double'), arr(k.knots, 'NCollection_Array1_double'), arr(k.mults, 'NCollection_Array1_int'), c.degree, false);
}

function area(OC: OCInstance, face: any): number {
  const props = new OC.GProp_GProps();
  try { OC.BRepGProp.SurfaceProperties(face, props, 1e-9, false); return props.Mass(); } finally { props.delete(); }
}

/** the IGES text against the shape it was written from (`unit` as written; the shape in millimetres) */
export function checkIges(OC: OCInstance, shape: any, text: string, unit: IgesUnit = 'mm', samples = 5): IgesCheck {
  const file = readIges(text);
  const out: IgesCheck = { problems: [...file.problems], entities: {}, faces: 0, surfaceDistance: 0, trimDistance: 0, edgeDistance: 0, trimExcess: 0, edgeExcess: 0, loopGap: 0, flippedNormals: 0, areaSource: 0, areaRead: 0, faceAreaError: 0 };
  for (const e of file.entities) out.entities[e.type] = (out.entities[e.type] ?? 0) + 1;
  const k = 1 / IGES_UNITS[unit].perMm;
  const read = igesTrimmedSurfaces(file);
  const faces: any[] = [];
  const ex = new OC.TopExp_Explorer(shape, OC.TopAbs_ShapeEnum.TopAbs_FACE, OC.TopAbs_ShapeEnum.TopAbs_SHAPE);
  for (; ex.More(); ex.Next()) faces.push(OC.TopoDS.Face(ex.Current()));
  ex.delete();
  out.faces = read.length;
  if (read.length !== faces.length) out.problems.push(`${read.length} trimmed surfaces for ${faces.length} faces`);
  const toFace = (F: any, p: number[]) => {
    const v = new OC.BRepBuilderAPI_MakeVertex(new OC.gp_Pnt(p[0], p[1], p[2]));
    const d = new OC.BRepExtrema_DistShapeShape(v.Vertex(), F);
    const r = d.Value();
    d.delete();
    v.delete();
    return r;
  };
  const ts = (a: number, b: number) => Array.from({ length: samples }, (_, i) => a + ((b - a) * (i + 0.5)) / samples);
  read.forEach((t, i) => {
    const F = faces[i];
    if (!F) return;
    const So = OC.BRep_Tool.Surface(F);
    const s = scaled(t.surface, k);
    const Sb = occSurface(OC, s);
    const tolF = OC.BRep_Tool.MaxTolerance(F, OC.TopAbs_ShapeEnum.TopAbs_EDGE);
    const flip = F.Orientation() === OC.TopAbs_Orientation.TopAbs_REVERSED ? -1 : 1;
    const [u0, u1, v0, v1] = surfaceRange(s);
    for (const u of ts(u0, u1)) for (const v of ts(v0, v1)) {
      const p = surfacePoint(s, u, v);
      const proj = new OC.GeomAPI_ProjectPointOnSurf(new OC.gp_Pnt(p[0], p[1], p[2]), So);
      out.surfaceDistance = Math.max(out.surfaceDistance, proj.LowerDistance());
      const { U, V } = proj.LowerDistanceParameters();
      proj.delete();
      const a = So.EvalD1(U, V), b = Sb.EvalD1(u, v);
      const na = a.D1U.Crossed(a.D1V), nb = b.D1U.Crossed(b.D1V);
      if (na.Magnitude() > 1e-6 && nb.Magnitude() > 1e-6 && flip * na.Dot(nb) < 0) out.flippedNormals++;
    }
    const builder = new OC.TopoDS_Builder();
    let mf: any = null;
    for (const loop of t.loops) {
      loop.uv.forEach((c, j) => {
        const next = loop.uv[(j + 1) % loop.uv.length];
        const end = curvePoint(c, curveRange(c)[1]), start = curvePoint(next, curveRange(next)[0]);
        out.loopGap = Math.max(out.loopGap, Math.hypot(end[0] - start[0], end[1] - start[1]));
        const [a, b] = curveRange(c);
        for (const w of ts(a, b)) {
          const q = curvePoint(c, w), d = toFace(F, surfacePoint(s, q[0], q[1]));
          out.trimDistance = Math.max(out.trimDistance, d);
          out.trimExcess = Math.max(out.trimExcess, d - tolF);
        }
      });
      for (const c of loop.xyz) {
        const [a, b] = curveRange(c);
        for (const w of ts(a, b)) {
          const d = toFace(F, curvePoint(c, w).map((x) => x * k));
          out.edgeDistance = Math.max(out.edgeDistance, d);
          out.edgeExcess = Math.max(out.edgeExcess, d - tolF);
        }
      }
      const wire = new OC.TopoDS_Wire();
      builder.MakeWire(wire);
      for (const c of loop.uv) {
        const me = new OC.BRepBuilderAPI_MakeEdge(occCurve2d(OC, c), Sb);
        if (me.IsDone()) builder.Add(wire, me.Edge());
        me.delete();
      }
      if (!mf) mf = new OC.BRepBuilderAPI_MakeFace(Sb, wire, true);
      else mf.Add(wire);
    }
    const aSrc = area(OC, F), aRead = mf && mf.IsDone() ? area(OC, mf.Face()) : 0;
    mf?.delete();
    out.areaSource += aSrc;
    out.areaRead += aRead;
    if (aSrc > 1e-6) out.faceAreaError = Math.max(out.faceAreaError, Math.abs(aRead - aSrc) / aSrc);
  });
  return out;
}
