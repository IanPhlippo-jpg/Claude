/**
 * STEP in and out through OpenCascade (QA F51): the exchange format of desktop CAD. Pure functions on an initialised
 * OpenCascade instance and the replicad module, so the worker (src/workers/occt.worker.ts) and the unit tests share them.
 *
 * Import: every solid (or, without solids, every shell) of the file becomes a triangle mesh in millimetres.
 * Export: a body of the mesh kernel becomes a closed B-rep solid: the triangles are sewn into a shell and coplanar
 * triangles are merged into one planar face (ShapeUpgrade_UnifySameDomain), so a box exports as six faces.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type OCInstance = any;
type Replicad = typeof import('replicad');

export interface StepBody {
  name: string;
  /** flat xyz triangle positions in millimetres */
  positions: Float32Array;
  /** volume of the B-rep solid (mm³), 0 for an open shell */
  volume: number;
}

/**
 * The volume of a B-rep shape (mm³, signed by its orientation): Gauss-Kronrod integration per knot span. The plain
 * Gauss rule is off by tenths of a percent on faces bounded by B-spline curves of several spans (QA 0.5.11 F175).
 * A relative bound of 1e-6 keeps the error on the QA bodies under 3e-4 mm³; tighter bounds cost minutes on helix sweeps.
 */
export function shapeVolume(OC: OCInstance, shape: any): number {
  const props = new OC.GProp_GProps();
  try {
    OC.BRepGProp.VolumePropertiesGK(shape, props, 1e-6, false, true, false, false, false);
    return props.Mass();
  } finally {
    props.delete();
  }
}

/** STEP bytes -> meshes (mm). Tolerance is the chordal deviation of the tessellation. */
export async function stepToMeshes(replicad: Replicad, bytes: Uint8Array, tolerance = 0.02): Promise<StepBody[]> {
  let shape: any;
  try {
    shape = await replicad.importSTEP(new Blob([bytes as BlobPart]));
  } catch {
    shape = null;
  }
  if (!shape || shape.isNull) throw new Error('the file contains no solids or surfaces that can be read');
  const OC = replicad.getOC() as OCInstance;
  const parts: { shape: any; kind: 'solid' | 'shell' }[] = [];
  for (const [kind, en] of [['solid', OC.TopAbs_ShapeEnum.TopAbs_SOLID], ['shell', OC.TopAbs_ShapeEnum.TopAbs_SHELL]] as const) {
    const ex = new OC.TopExp_Explorer(shape.wrapped, en, OC.TopAbs_ShapeEnum.TopAbs_SHAPE);
    while (ex.More()) {
      parts.push({ shape: replicad.cast(ex.Current()), kind });
      ex.Next();
    }
    ex.delete();
    if (parts.length) break;
  }
  if (!parts.length) parts.push({ shape, kind: 'shell' });
  return parts.map((p, i) => {
    const m = p.shape.mesh({ tolerance, angularTolerance: 0.2 });
    const positions = new Float32Array(m.triangles.length * 3);
    for (let t = 0; t < m.triangles.length; t++) {
      const v = m.triangles[t] * 3;
      positions[t * 3] = m.vertices[v];
      positions[t * 3 + 1] = m.vertices[v + 1];
      positions[t * 3 + 2] = m.vertices[v + 2];
    }
    let volume = 0;
    if (p.kind === 'solid') { try { volume = shapeVolume(OC, p.shape.wrapped); } catch { volume = 0; } }
    return { name: `Body${i + 1}`, positions, volume };
  });
}

/** a closed triangle mesh -> one B-rep solid (planar faces merged); null when the mesh does not close */
export function meshToSolid(OC: OCInstance, positions: ArrayLike<number>, tolerance = 1e-4): any | null {
  const sewing = new OC.BRepBuilderAPI_Sewing(tolerance, true, true, true, false);
  // shared edges: one OpenCascade edge per mesh edge, so the faces are already connected before sewing
  const key = (i: number) => `${Math.round(positions[i] * 1e5)},${Math.round(positions[i + 1] * 1e5)},${Math.round(positions[i + 2] * 1e5)}`;
  const pts = new Map<string, any>();
  const edges = new Map<string, any>();
  const point = (i: number) => {
    const k = key(i);
    let p = pts.get(k);
    if (!p) { p = new OC.gp_Pnt(positions[i], positions[i + 1], positions[i + 2]); pts.set(k, p); }
    return p;
  };
  const edge = (a: number, b: number) => {
    const ka = key(a), kb = key(b);
    const k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    let e = edges.get(k);
    if (!e) {
      const me = new OC.BRepBuilderAPI_MakeEdge(point(a), point(b));
      e = me.Edge();
      me.delete();
      edges.set(k, e);
    }
    return e;
  };
  let faces = 0;
  for (let t = 0; t + 8 < positions.length; t += 9) {
    const a = t, b = t + 3, c = t + 6;
    if (key(a) === key(b) || key(b) === key(c) || key(a) === key(c)) continue; // degenerate
    const mw = new OC.BRepBuilderAPI_MakeWire(edge(a, b), edge(b, c), edge(c, a));
    if (!mw.IsDone()) { mw.delete(); continue; }
    const mf = new OC.BRepBuilderAPI_MakeFace(mw.Wire(), true);
    if (mf.IsDone()) { sewing.Add(mf.Face()); faces++; }
    mf.delete();
    mw.delete();
  }
  if (!faces) { sewing.delete(); return null; }
  sewing.Perform(new OC.Message_ProgressRange());
  const sewn = sewing.SewedShape();
  sewing.delete();
  const ex = new OC.TopExp_Explorer(sewn, OC.TopAbs_ShapeEnum.TopAbs_SHELL, OC.TopAbs_ShapeEnum.TopAbs_SHAPE);
  if (!ex.More()) { ex.delete(); return null; }
  const ms = new OC.BRepBuilderAPI_MakeSolid();
  while (ex.More()) { ms.Add(OC.TopoDS.Shell(ex.Current())); ex.Next(); }
  ex.delete();
  let solid = ms.Solid();
  ms.delete();
  // planar faces made of many triangles become one face, as a part modelled in a B-rep program has them
  const unify = new OC.ShapeUpgrade_UnifySameDomain(solid, true, true, false);
  unify.Build();
  solid = unify.Shape();
  unify.delete();
  return solid;
}

/** exact B-rep solids (and meshes for the rest) -> STEP (AP214) bytes */
export async function shapesToStep(replicad: Replicad, items: ({ name: string; shape: any } | { name: string; positions: ArrayLike<number> })[], unit: 'mm' | 'cm' | 'm' | 'in' = 'mm'): Promise<{ bytes: Uint8Array; volumes: number[]; exact: number }> {
  const OC = replicad.getOC() as OCInstance;
  const shapes: { shape: any; name: string }[] = [];
  const volumes: number[] = [];
  let exact = 0;
  for (const it of items) {
    let shape: any;
    if ('shape' in it) { shape = replicad.cast(it.shape); exact++; }
    else {
      const s = meshToSolid(OC, it.positions);
      if (!s) continue;
      shape = replicad.cast(s);
    }
    let v = 0;
    try { v = 'shape' in it ? shapeVolume(OC, shape.wrapped) : replicad.measureVolume(shape); } catch { v = 0; }
    if (v < 0) { shape = replicad.cast(shape.wrapped.Reversed()); v = -v; }
    volumes.push(v);
    shapes.push({ shape, name: it.name });
  }
  if (!shapes.length) throw new Error('none of the bodies is a closed solid');
  const blob = replicad.exportSTEP(shapes, { unit: unit === 'in' ? 'inch' : unit, modelUnit: 'mm' });
  return { bytes: new Uint8Array(await blob.arrayBuffer()), volumes, exact };
}

/** bodies -> STEP (AP214) bytes; the positions are in millimetres, `unit` is the length unit written in the file */
export async function meshesToStep(replicad: Replicad, bodies: { name: string; positions: ArrayLike<number> }[], unit: 'mm' | 'cm' | 'm' | 'in' = 'mm'): Promise<{ bytes: Uint8Array; volumes: number[] }> {
  const OC = replicad.getOC() as OCInstance;
  const shapes: { shape: any; name: string }[] = [];
  const volumes: number[] = [];
  for (const b of bodies) {
    const s = meshToSolid(OC, b.positions);
    if (!s) continue;
    let shape: any = replicad.cast(s);
    let v = 0;
    try { v = replicad.measureVolume(shape); } catch { v = 0; }
    // a mesh wound the other way round gives a solid inside out: turn it over
    if (v < 0) { shape = replicad.cast(s.Reversed()); v = -v; }
    volumes.push(v);
    shapes.push({ shape, name: b.name });
  }
  if (!shapes.length) throw new Error('none of the bodies is a closed solid');
  const blob = replicad.exportSTEP(shapes, { unit: unit === 'in' ? 'inch' : unit, modelUnit: 'mm' });
  return { bytes: new Uint8Array(await blob.arrayBuffer()), volumes };
}
