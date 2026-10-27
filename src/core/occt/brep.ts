/**
 * The OpenCascade implementation of the B-rep kernel of the rebuild (src/core/features/brepKernel.ts, QA F51).
 * Profiles become exact wires: lines, circular arcs and circles stay lines, arcs and circles (cylinders after an
 * extrude, not facets); ellipses and splines are followed by short segments for now. Every OpenCascade object made
 * during a rebuild is tracked and freed by `release()`.
 */
import * as THREE from 'three';
import type { PlaneDef } from '../document/types';
import type { Sketch, SketchPoint, Id } from '../sketch/types';
import { sampleEntity } from '../sketch/geometry';
import type { ContourRegion } from '../features/regions';
import type { BodyEdge } from '../features/edgesets';
import type { BrepKernel, BrepShape } from '../features/brepKernel';
import type { Contour } from '../sketch/contours';
import { meshToSolid } from './step';

/* eslint-disable @typescript-eslint/no-explicit-any */
type OC = any;
type Replicad = typeof import('replicad');

export function occtKernel(oc: OC, replicad: Replicad, opts: { tolerance?: number; angularTolerance?: number } = {}): BrepKernel {
  const arena: any[] = [];
  const t = <T>(x: T): T => {
    if (x && typeof (x as { delete?: unknown }).delete === 'function') arena.push(x);
    return x;
  };
  const progress = () => t(new oc.Message_ProgressRange());
  const S = (x: any) => x as BrepShape;
  const R = (x: BrepShape) => x as any;

  /** sketch point -> 3D point on the plane, lifted z along its normal */
  const to3 = (plane: PlaneDef, p: { x: number; y: number }, z: number) => [
    plane.origin[0] + plane.u[0] * p.x + plane.v[0] * p.y + plane.n[0] * z,
    plane.origin[1] + plane.u[1] * p.x + plane.v[1] * p.y + plane.n[1] * z,
    plane.origin[2] + plane.u[2] * p.x + plane.v[2] * p.y + plane.n[2] * z,
  ];
  const pnt = (c: number[]) => t(new oc.gp_Pnt(c[0], c[1], c[2]));
  const dir = (c: number[]) => t(new oc.gp_Dir(c[0], c[1], c[2]));
  const same = (a: SketchPoint, b: SketchPoint) => Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;

  const lineEdge = (a: number[], b: number[]) => t(new oc.BRepBuilderAPI_MakeEdge(pnt(a), pnt(b))).Edge();

  /** the edges of one sketch entity in the direction of the contour */
  function entityEdges(sketch: Sketch, plane: PlaneDef, id: Id, rev: boolean, z: number): any[] | null {
    const e = sketch.entities[id];
    if (!e) return null;
    if (e.kind === 'line') {
      const a = sketch.points[e.p1], b = sketch.points[e.p2];
      if (same(a, b)) return [];
      return [rev ? lineEdge(to3(plane, b, z), to3(plane, a, z)) : lineEdge(to3(plane, a, z), to3(plane, b, z))];
    }
    if (e.kind === 'arc') {
      const poly = sampleEntity(sketch, e, 64);
      if (poly.length < 3) return null;
      const a = poly[0], m = poly[Math.floor(poly.length / 2)], b = poly[poly.length - 1];
      const [p, q] = rev ? [b, a] : [a, b];
      const arc = t(new oc.GC_MakeArcOfCircle(pnt(to3(plane, p, z)), pnt(to3(plane, m, z)), pnt(to3(plane, q, z)))).Value();
      return [t(new oc.BRepBuilderAPI_MakeEdge(arc)).Edge()];
    }
    if (e.kind === 'circle') {
      const c = sketch.points[e.center];
      const poly = sampleEntity(sketch, e, 64);
      const r = Math.hypot(poly[0].x - c.x, poly[0].y - c.y);
      if (!(r > 1e-9)) return null;
      const ax = t(new oc.gp_Ax2(pnt(to3(plane, c, z)), dir(plane.n), dir(plane.u)));
      return [t(new oc.BRepBuilderAPI_MakeEdge(t(new oc.gp_Circ(ax, r)))).Edge()];
    }
    // ellipse, ellipse arc, conic, spline: short segments along the curve (exact curves follow later)
    let poly = sampleEntity(sketch, e, 96);
    if (e.kind === 'ellipse' || (poly.length > 2 && same(poly[0], poly[poly.length - 1]))) {
      if (!same(poly[0], poly[poly.length - 1])) poly = [...poly, poly[0]];
    }
    if (rev) poly = poly.slice().reverse();
    const out: any[] = [];
    for (let i = 0; i + 1 < poly.length; i++) if (!same(poly[i], poly[i + 1])) out.push(lineEdge(to3(plane, poly[i], z), to3(plane, poly[i + 1], z)));
    return out;
  }

  function polygonEdges(plane: PlaneDef, pts: SketchPoint[], z: number): any[] {
    const out: any[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if (!same(a, b)) out.push(lineEdge(to3(plane, a, z), to3(plane, b, z)));
    }
    return out;
  }

  /** the closed wire of a contour (exact entities when the contour knows them, else its polygon) */
  function contourWire(sketch: Sketch, plane: PlaneDef, c: Contour, z: number): any | null {
    let edges: any[] | null = null;
    if (c.path) {
      edges = [];
      for (const step of c.path) {
        const es = entityEdges(sketch, plane, step.id, step.rev, z);
        if (!es) { edges = null; break; }
        edges.push(...es);
      }
    }
    if (edges && edges.length) {
      const mw = t(new oc.BRepBuilderAPI_MakeWire());
      for (const e of edges) mw.Add(e);
      if (mw.IsDone()) return mw.Wire();
    }
    const pw = t(new oc.BRepBuilderAPI_MakeWire());
    for (const e of polygonEdges(plane, c.points, z)) pw.Add(e);
    return pw.IsDone() ? pw.Wire() : null;
  }

  /** a planar face bounded by the contour (exact entities when the contour knows them, else its polygon) */
  function contourFace(sketch: Sketch, plane: PlaneDef, c: Contour, z: number): any | null {
    let edges: any[] | null = null;
    if (c.path) {
      edges = [];
      for (const step of c.path) {
        const es = entityEdges(sketch, plane, step.id, step.rev, z);
        if (!es) { edges = null; break; }
        edges.push(...es);
      }
    }
    if (!edges || !edges.length) edges = polygonEdges(plane, c.points, z);
    const mw = t(new oc.BRepBuilderAPI_MakeWire());
    for (const e of edges) mw.Add(e);
    if (!mw.IsDone()) {
      // the exact edges did not close (a contour through a spur, tolerances): the polygon always does
      const pw = t(new oc.BRepBuilderAPI_MakeWire());
      for (const e of polygonEdges(plane, c.points, z)) pw.Add(e);
      if (!pw.IsDone()) return null;
      const pf = t(new oc.BRepBuilderAPI_MakeFace(pw.Wire(), true));
      return pf.IsDone() ? pf.Face() : null;
    }
    const mf = t(new oc.BRepBuilderAPI_MakeFace(mw.Wire(), true));
    return mf.IsDone() ? mf.Face() : null;
  }

  /** the open (or closed) chain of a path sketch as one wire, in order */
  function pathWire(sketch: Sketch, plane: PlaneDef): any | null {
    const key = (p: SketchPoint) => `${Math.round(p.x * 1e6)},${Math.round(p.y * 1e6)}`;
    type Item = { id: Id; a: string; b: string };
    const items: Item[] = [];
    for (const id of sketch.entityOrder) {
      const e = sketch.entities[id];
      if (!e || e.construction) continue;
      if (e.kind === 'line') items.push({ id, a: key(sketch.points[e.p1]), b: key(sketch.points[e.p2]) });
      else if (e.kind === 'arc' || e.kind === 'spline' || e.kind === 'ellipseArc' || e.kind === 'conic') {
        const poly = sampleEntity(sketch, e, 64);
        items.push({ id, a: key(poly[0]), b: key(poly[poly.length - 1]) });
      } else return null;
    }
    if (!items.length) return null;
    const deg = new Map<string, number>();
    for (const it of items) for (const k of [it.a, it.b]) deg.set(k, (deg.get(k) ?? 0) + 1);
    if ([...deg.values()].some((d) => d > 2)) return null; // a branch: not one path
    let at = [...deg.entries()].find(([, d]) => d === 1)?.[0] ?? items[0].a;
    const left = [...items];
    const mw = t(new oc.BRepBuilderAPI_MakeWire());
    while (left.length) {
      const i = left.findIndex((it) => it.a === at || it.b === at);
      if (i < 0) return null; // two separate pieces
      const it = left.splice(i, 1)[0];
      const rev = it.b === at;
      const es = entityEdges(sketch, plane, it.id, rev, 0);
      if (!es) return null;
      for (const e of es) mw.Add(e);
      at = rev ? it.a : it.b;
    }
    return mw.IsDone() ? mw.Wire() : null;
  }

  /** the faces of a shape (each once) */
  function facesOf(shape: any): any[] {
    const out: any[] = [];
    const ex = t(new oc.TopExp_Explorer(shape, oc.TopAbs_ShapeEnum.TopAbs_FACE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE));
    while (ex.More()) {
      const f = t(oc.TopoDS.Face(ex.Current()));
      ex.Next();
      if (!out.some((g) => g.IsSame(f))) out.push(f);
    }
    return out;
  }
  const faceNormal = (face: any): { x: number; y: number; z: number } | null => {
    try { return (replicad.cast(face) as any).normalAt(); } catch { return null; }
  };
  /** the faces of a shape at these planes (normal and a point on the face) */
  function matchFaces(shape: any, refs: { normal: [number, number, number]; point: [number, number, number] }[]): any[] {
    const out: any[] = [];
    for (const ref of refs) {
      const ln = Math.hypot(...ref.normal) || 1;
      const v = t(t(new oc.BRepBuilderAPI_MakeVertex(pnt(ref.point))).Vertex());
      for (const face of facesOf(shape)) {
        const n = faceNormal(face);
        if (!n || (n.x * ref.normal[0] + n.y * ref.normal[1] + n.z * ref.normal[2]) / ln < 0.99) continue;
        const dist = t(new oc.BRepExtrema_DistShapeShape(v, face));
        if (dist.IsDone() && dist.Value() < 1e-3) { if (!out.some((g) => g.IsSame(face))) out.push(face); break; }
      }
    }
    return out;
  }

  const fuse = (a: any, b: any) => {
    const op = t(new oc.BRepAlgoAPI_Fuse(a, b, progress()));
    if (!op.IsDone()) throw new Error('B-rep union failed');
    return clean(op.Shape());
  };
  const cut = (a: any, b: any) => {
    const op = t(new oc.BRepAlgoAPI_Cut(a, b, progress()));
    if (!op.IsDone()) throw new Error('B-rep cut failed');
    return clean(op.Shape());
  };
  /** faces split by the booleans on one surface become one face again (as a desktop CAD program shows them) */
  const clean = (s: any) => {
    const u = t(new oc.ShapeUpgrade_UnifySameDomain(s, true, true, false));
    u.Build();
    return t(u.Shape());
  };

  /** one solid per region: the outer prism minus the prisms of its holes */
  function regionSolids(sketch: Sketch, plane: PlaneDef, regions: ContourRegion[], z: number, make: (face: any) => any): any | null {
    let result: any = null;
    for (const r of regions) {
      const of = contourFace(sketch, plane, r.outer, z);
      if (!of) return null;
      let solid = make(of);
      for (const h of r.holes) {
        const hf = contourFace(sketch, plane, h, z);
        if (!hf) return null;
        solid = cut(solid, make(hf));
      }
      result = result ? fuse(result, solid) : solid;
    }
    return result;
  }

  // ---- matching mesh edges to B-rep edges
  const edgeSamples = (edge: any): THREE.Vector3[] => {
    const ad = t(new oc.BRepAdaptor_Curve(edge));
    const a = ad.FirstParameter(), b = ad.LastParameter();
    const out: THREE.Vector3[] = [];
    for (const k of [0, 0.25, 0.5, 0.75, 1]) {
      const p = t(ad.Value(a + (b - a) * k));
      out.push(new THREE.Vector3(p.X(), p.Y(), p.Z()));
    }
    return out;
  };
  const distToPolyline = (p: THREE.Vector3, pts: THREE.Vector3[]) => {
    let best = Infinity;
    const seg = new THREE.Line3();
    const q = new THREE.Vector3();
    for (let i = 0; i + 1 < pts.length; i++) {
      seg.set(pts[i], pts[i + 1]);
      seg.closestPointToPoint(p, true, q);
      best = Math.min(best, q.distanceTo(p));
    }
    return best;
  };
  /** the B-rep edges that lie on the mesh edges (within the tessellation's deviation) */
  function brepEdgesOn(shape: any, edges: BodyEdge[]): any[] {
    const found: any[] = [];
    const ex = t(new oc.TopExp_Explorer(shape, oc.TopAbs_ShapeEnum.TopAbs_EDGE, oc.TopAbs_ShapeEnum.TopAbs_SHAPE));
    const seen: any[] = [];
    while (ex.More()) {
      const edge = t(oc.TopoDS.Edge(ex.Current()));
      ex.Next();
      if (seen.some((s) => s.IsSame(edge))) continue;
      seen.push(edge);
      const samples = edgeSamples(edge);
      const len = samples[0].distanceTo(samples[4]) + samples[2].distanceTo(samples[0]);
      const tol = Math.max(0.05, len * 0.01);
      if (edges.some((m) => samples.every((p) => distToPolyline(p, m.points) < tol))) found.push(edge);
    }
    return found;
  }

  return {
    extrude(sketch, plane, regions, zStart, total) {
      if (!regions.length || !(total > 1e-9)) return null;
      const v = t(new oc.gp_Vec(plane.n[0] * total, plane.n[1] * total, plane.n[2] * total));
      const s = regionSolids(sketch, plane, regions, zStart, (face) => {
        const pr = t(new oc.BRepPrimAPI_MakePrism(face, v, false, true));
        return t(pr.Shape());
      });
      return s ? S(s) : null;
    },
    revolve(sketch, plane, regions, axis, angle, startAngle) {
      if (!regions.length) return null;
      const a = to3(plane, axis[0], 0), b = to3(plane, axis[1], 0);
      const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      if (Math.hypot(d[0], d[1], d[2]) < 1e-9) return null;
      const ax = t(new oc.gp_Ax1(pnt(a), dir(d)));
      const rad = (Math.min(360, angle) * Math.PI) / 180;
      const s = regionSolids(sketch, plane, regions, 0, (face) => {
        let f = face;
        if (startAngle) {
          const tr = t(new oc.gp_Trsf());
          tr.SetRotation(ax, (startAngle * Math.PI) / 180);
          f = t(t(new oc.BRepBuilderAPI_Transform(face, tr, true, false)).Shape());
        }
        const rv = angle >= 360 ? t(new oc.BRepPrimAPI_MakeRevol(f, ax, false)) : t(new oc.BRepPrimAPI_MakeRevol(f, ax, rad, false));
        return t(rv.Shape());
      });
      return s ? S(s) : null;
    },
    axisymmetric(origin, axis, ref, parts) {
      const P = (t: number, r: number) => [origin[0] + axis[0] * t + ref[0] * r, origin[1] + axis[1] * t + ref[1] * r, origin[2] + axis[2] * t + ref[2] * r];
      const ax = t(new oc.gp_Ax1(pnt(origin), dir(axis)));
      let out: any = null;
      for (const p of parts) {
        if (!(p.t1 > p.t0) || (p.r0 <= 0 && p.r1 <= 0)) continue;
        // the half profile in the plane of axis and ref: (t0, 0) (t1, 0) (t1, r1) (t0, r0), a point radius drops a corner
        const pts = [P(p.t0, 0), P(p.t1, 0)];
        if (p.r1 > 1e-12) pts.push(P(p.t1, p.r1));
        if (p.r0 > 1e-12) pts.push(P(p.t0, p.r0));
        const mw = t(new oc.BRepBuilderAPI_MakeWire());
        for (let i = 0; i < pts.length; i++) mw.Add(lineEdge(pts[i], pts[(i + 1) % pts.length]));
        const face = t(new oc.BRepBuilderAPI_MakeFace(mw.Wire(), true)).Face();
        const solid = t(t(new oc.BRepPrimAPI_MakeRevol(face, ax, false)).Shape());
        out = out ? fuse(out, solid) : solid;
      }
      if (!out) throw new Error('empty solid of revolution');
      return S(out);
    },
    sweep(profile, profilePlane, regions, path, pathPlane) {
      if (!regions.length) return null;
      const spine = pathWire(path, pathPlane);
      if (!spine) return null;
      const s = regionSolids(profile, profilePlane, regions, 0, (face) => {
        const mp = t(new oc.BRepOffsetAPI_MakePipe(spine, face));
        mp.Build(progress());
        if (!mp.IsDone()) throw new Error('the sweep failed');
        return t(mp.Shape());
      });
      return s ? S(s) : null;
    },
    transform(shape, m) {
      const e = m;
      const det = e[0] * (e[5] * e[10] - e[9] * e[6]) - e[4] * (e[1] * e[10] - e[9] * e[2]) + e[8] * (e[1] * e[6] - e[5] * e[2]);
      if (Math.abs(det - 1) > 1e-6) return null;
      const tr = t(new oc.gp_Trsf());
      tr.SetValues(e[0], e[4], e[8], e[12], e[1], e[5], e[9], e[13], e[2], e[6], e[10], e[14]);
      return S(t(t(new oc.BRepBuilderAPI_Transform(R(shape), tr, true, false)).Shape()));
    },
    mirror(shape, origin, normal) {
      const tr = t(new oc.gp_Trsf());
      tr.SetMirror(t(new oc.gp_Ax2(pnt(origin), dir(normal))));
      return S(t(t(new oc.BRepBuilderAPI_Transform(R(shape), tr, true, false)).Shape()));
    },
    loft(s1, p1, r1, s2, p2, r2) {
      if (r1.holes.length || r2.holes.length) return null;
      const w1 = contourWire(s1, p1, r1.outer, 0), w2 = contourWire(s2, p2, r2.outer, 0);
      if (!w1 || !w2) return null;
      const ts = t(new oc.BRepOffsetAPI_ThruSections(true, false, 1e-6));
      ts.AddWire(w1);
      ts.AddWire(w2);
      ts.Build(progress());
      if (!ts.IsDone()) return null;
      return S(clean(t(ts.Shape())));
    },
    clipByPlane(shape, point, normal) {
      const pln = t(new oc.gp_Pln(pnt(point), dir(normal)));
      const face = t(new oc.BRepBuilderAPI_MakeFace(pln, -1e5, 1e5, -1e5, 1e5)).Face();
      const ref = pnt([point[0] + normal[0], point[1] + normal[1], point[2] + normal[2]]);
      const half = t(t(new oc.BRepPrimAPI_MakeHalfSpace(face, ref)).Solid());
      return S(cut(R(shape), half));
    },
    cutKeepTouching(a, b, point, normal) {
      const rest = cut(R(a), R(b));
      const pln = t(new oc.gp_Pln(pnt(point), dir(normal)));
      const face = t(new oc.BRepBuilderAPI_MakeFace(pln, -1e5, 1e5, -1e5, 1e5)).Face();
      let out: any = null;
      const ex = t(new oc.TopExp_Explorer(rest, oc.TopAbs_ShapeEnum.TopAbs_SOLID, oc.TopAbs_ShapeEnum.TopAbs_SHAPE));
      while (ex.More()) {
        const solid = t(ex.Current());
        ex.Next();
        const d = t(new oc.BRepExtrema_DistShapeShape(solid, face));
        if (d.IsDone() && d.Value() < 1e-6) out = out ? fuse(out, solid) : solid;
      }
      return out ? S(out) : null;
    },
    fromMesh(g) {
      const src = g.index ? g.toNonIndexed() : g;
      const solid = meshToSolid(oc, src.getAttribute('position').array as ArrayLike<number>);
      if (!solid) return null;
      t(solid);
      let v = 0;
      try { v = replicad.measureVolume(replicad.cast(solid) as never); } catch { return null; }
      return S(v < 0 ? t(solid.Reversed()) : solid);
    },
    extrudeLoop(plane, loop, zStart, total) {
      if (!loop.length || !(total > 1e-9)) return null;
      const mw = t(new oc.BRepBuilderAPI_MakeWire());
      for (const g of loop) {
        if (g.m) {
          const arc = t(new oc.GC_MakeArcOfCircle(pnt(to3(plane, g.a, zStart)), pnt(to3(plane, g.m, zStart)), pnt(to3(plane, g.b, zStart)))).Value();
          mw.Add(t(new oc.BRepBuilderAPI_MakeEdge(arc)).Edge());
        } else mw.Add(lineEdge(to3(plane, g.a, zStart), to3(plane, g.b, zStart)));
      }
      if (!mw.IsDone()) return null;
      const mf = t(new oc.BRepBuilderAPI_MakeFace(mw.Wire(), true));
      if (!mf.IsDone()) return null;
      const v = t(new oc.gp_Vec(plane.n[0] * total, plane.n[1] * total, plane.n[2] * total));
      return S(t(t(new oc.BRepPrimAPI_MakePrism(mf.Face(), v, false, true)).Shape()));
    },
    helixSweep(center, axis, xdir, radius, lead, length, sign, startAngle, profile) {
      if (!(lead > 0) || !(length > 0) || profile.length < 3) return null;
      const ax3 = t(new oc.gp_Ax3(t(new oc.gp_Ax2(pnt(center), dir(axis), dir(xdir)))));
      const surf = t(new oc.Geom_CylindricalSurface(ax3, radius));
      const line = t(new oc.Geom2d_Line(t(new oc.gp_Pnt2d(startAngle, 0)), t(new oc.gp_Dir2d(sign * 2 * Math.PI, lead))));
      const L = (length / lead) * Math.sqrt((2 * Math.PI) ** 2 + lead ** 2);
      const seg = t(new oc.GC_MakeSegment2d(t(line.Value(0)), t(line.Value(L))));
      const edge = t(new oc.BRepBuilderAPI_MakeEdge(t(seg.Value()), surf)).Edge();
      const spine = t(new oc.BRepBuilderAPI_MakeWire(edge)).Wire();
      oc.BRepLib.BuildCurves3d(spine);
      const pw = t(new oc.BRepBuilderAPI_MakeWire());
      for (let i = 0; i < profile.length; i++) pw.Add(lineEdge(profile[i], profile[(i + 1) % profile.length]));
      if (!pw.IsDone()) return null;
      const pipe = t(new oc.BRepOffsetAPI_MakePipeShell(spine));
      pipe.SetMode(dir(axis));
      pipe.Add(pw.Wire(), false, false);
      pipe.Build(progress());
      if (!pipe.IsDone() || !pipe.MakeSolid()) return null;
      return S(t(pipe.Shape()));
    },
    solids(shape) {
      const out: { s: any; v: number }[] = [];
      const ex = t(new oc.TopExp_Explorer(R(shape), oc.TopAbs_ShapeEnum.TopAbs_SOLID, oc.TopAbs_ShapeEnum.TopAbs_SHAPE));
      while (ex.More()) {
        const s = t(ex.Current());
        ex.Next();
        let v = 0;
        try { v = Math.abs(replicad.measureVolume(replicad.cast(s) as never)); } catch { v = 0; }
        if (v > 1e-9) out.push({ s, v });
      }
      return out.sort((x, y) => y.v - x.v).map((x) => S(x.s));
    },
    fuse: (a, b) => S(fuse(R(a), R(b))),
    cut: (a, b) => S(cut(R(a), R(b))),
    common: (a, b) => {
      const op = t(new oc.BRepAlgoAPI_Common(R(a), R(b), progress()));
      if (!op.IsDone()) throw new Error('B-rep intersection failed');
      return S(clean(op.Shape()));
    },
    fillet(shape, edges, radius) {
      const list = brepEdgesOn(R(shape), edges);
      if (!list.length) throw new Error('the selected edges were not found on the B-rep body');
      const mk = t(new oc.BRepFilletAPI_MakeFillet(R(shape), oc.ChFi3d_FilletShape.ChFi3d_Rational));
      for (const e of list) mk.Add(radius, e);
      mk.Build(progress());
      if (!mk.IsDone()) throw new Error('the fillet does not fit (radius too large for the faces next to the edge)');
      return S(clean(mk.Shape()));
    },
    filletEach(shape, items) {
      const mk = t(new oc.BRepFilletAPI_MakeFillet(R(shape), oc.ChFi3d_FilletShape.ChFi3d_Rational));
      let n = 0;
      for (const it of items) {
        const start = it.edge.segments[0]?.a ?? it.edge.points[0];
        for (const e of brepEdgesOn(R(shape), [it.edge])) {
          if (it.r2 === undefined || Math.abs(it.r2 - it.r1) < 1e-12) mk.Add(it.r1, e);
          else {
            // R1 belongs to the B-rep edge's first vertex: the mesh edge's start decides which radius that is
            const s = edgeSamples(e);
            const forward = s[0].distanceTo(start) <= s[4].distanceTo(start);
            mk.Add(forward ? it.r1 : it.r2, forward ? it.r2 : it.r1, e);
          }
          n++;
        }
      }
      if (!n) throw new Error('the selected edges were not found on the B-rep body');
      mk.Build(progress());
      if (!mk.IsDone()) throw new Error('the fillet does not fit');
      return S(clean(mk.Shape()));
    },
    chamfer(shape, edges, distance) {
      const list = brepEdgesOn(R(shape), edges);
      if (!list.length) throw new Error('the selected edges were not found on the B-rep body');
      const mk = t(new oc.BRepFilletAPI_MakeChamfer(R(shape)));
      for (const e of list) mk.Add(distance, e);
      mk.Build(progress());
      if (!mk.IsDone()) throw new Error('the chamfer does not fit (distance too large for the faces next to the edge)');
      return S(clean(mk.Shape()));
    },
    draft(shape, faces, pull, angle, neutral) {
      const mk = t(new oc.BRepOffsetAPI_DraftAngle(R(shape)));
      const pd = dir(pull);
      const pln = t(new oc.gp_Pln(pnt(neutral.origin), dir(neutral.normal)));
      const list = faces === 'sides'
        ? facesOf(R(shape)).filter((f) => { const n = faceNormal(f); return !!n && Math.abs(n.x * pull[0] + n.y * pull[1] + n.z * pull[2]) < 1e-6; })
        : matchFaces(R(shape), faces);
      if (!list.length) throw new Error('no faces to draft');
      for (const f of list) {
        mk.Add(f, pd, (angle * Math.PI) / 180, pln, true);
        if (!mk.AddDone()) throw new Error('a face cannot be drafted');
      }
      mk.Build(progress());
      if (!mk.IsDone()) throw new Error('the draft failed');
      return S(t(mk.Shape()));
    },
    shell(shape, openFaces, thickness, outward) {
      const list = t(new oc.NCollection_List_TopoDS_Shape());
      const matched = matchFaces(R(shape), openFaces);
      for (const f of matched) list.Append(f);
      if (openFaces.length && matched.length < openFaces.length) throw new Error('a face to remove was not found on the B-rep body');
      const mk = t(new oc.BRepOffsetAPI_MakeThickSolid());
      mk.MakeThickSolidByJoin(R(shape), list, outward ? thickness : -thickness, 1e-3, oc.BRepOffset_Mode.BRepOffset_Skin, false, false, oc.GeomAbs_JoinType.GeomAbs_Arc, false, progress());
      if (!mk.IsDone()) throw new Error('the shell failed');
      return S(t(mk.Shape()));
    },
    tessellate(shape) {
      const m = (replicad.cast(R(shape)) as any).mesh({ tolerance: opts.tolerance ?? 0.01, angularTolerance: opts.angularTolerance ?? 0.1 });
      const n = m.triangles.length;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const v = m.triangles[i] * 3;
        pos[i * 3] = m.vertices[v]; pos[i * 3 + 1] = m.vertices[v + 1]; pos[i * 3 + 2] = m.vertices[v + 2];
        nor[i * 3] = m.normals[v]; nor[i * 3 + 1] = m.normals[v + 1]; nor[i * 3 + 2] = m.normals[v + 2];
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      return g;
    },
    volume(shape) {
      return replicad.measureVolume(replicad.cast(R(shape)) as never);
    },
    release(keep = []) {
      const kept = new Set<unknown>(keep);
      for (const x of arena.splice(0)) {
        if (kept.has(x)) { arena.push(x); continue; }
        try { x.delete(); } catch { /* already freed */ }
      }
    },
  };
}
