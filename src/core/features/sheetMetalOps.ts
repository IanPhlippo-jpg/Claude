// Sheet metal operations on a mesh body (Edge Flange, Hem, Miter Flange, Jog, Sketched Bend, Cross-Break); split out of
// rebuild.ts (QA 0.5.12 F134). The rebuild and the viewport previews call these; sheetMetalBuild.ts applies them.
import * as THREE from 'three';
import type { Document, EdgeFlangeFeature, HemFeature, JogFeature, MiterFlangeFeature, PlaneDef, SketchedBendFeature } from '../document/types';
import type { Id, SketchPoint } from '../sketch/types';
import { polyArea, type Region } from './regions';
import { resolvePlaneDef } from './planes';
import { clipToSurface, csg, extrudeGeometry, mergeGeometries, planarFaces, planeMatrix } from './solid';
import { bodyEdges, matchEdge, type BodyEdge } from './edgesets';
import { sketchChains } from './thin';
import { baseFlangeLoop, baseFlangeRegion, bendAllowance, edgeFlangeGeometry, hemFlangeParams, type ProfileSegment, type SheetMetalParams } from './sheetmetal';
import { edgeEnds, sheetFaceOfEdge } from './sheetmetal4';

/**
 * Edge Flange on a body: the matched edge, the sheet face it belongs to (the larger of its two
 * faces) and the flange geometry.
 */
/** A hem as edge-flange parameters (180 degrees, tangent-bend length, radius from the gap). */
export function hemAsFlange(h: HemFeature, t = 1):
  Pick<EdgeFlangeFeature, 'edge' | 'angle' | 'length' | 'lengthMode' | 'position' | 'flip' | 'radius'> & Partial<EdgeFlangeFeature> & { curl?: 'tearDrop' | 'rolled' } {
  return { edge: h.edge, ...hemFlangeParams(h, t), gap: h.miterGap, customAllowance: h.customAllowance, customRelief: h.customRelief, startOffset: h.startOffset, endOffset: h.endOffset };
}

export function edgeFlangeOnBody(geometry: THREE.BufferGeometry, bodyId: string, f: Pick<EdgeFlangeFeature, 'edge' | 'angle' | 'length' | 'lengthMode' | 'position' | 'flip' | 'radius'> & Partial<EdgeFlangeFeature> & { profile?: Region[]; curl?: 'tearDrop' | 'rolled' }, params0: SheetMetalParams): { geometry: THREE.BufferGeometry | null; error?: string; edge?: BodyEdge; trim?: THREE.BufferGeometry | null; exact?: ReturnType<typeof edgeFlangeGeometry>['exact'] } {
  const params = flangeParams(params0, f);
  if (!f.edge) return { geometry: null, error: 'Select a straight edge of the sheet.' };
  const edges = bodyEdges(geometry, bodyId);
  const e = matchEdge(edges, f.edge);
  if (!e || !e.straight || e.points.length < 2) return { geometry: null, error: 'The selected edge no longer exists on the sheet (or is not straight).' };
  const face = sheetFaceOfEdge(planarFaces(geometry, bodyId), e);
  if (!face) return { geometry: null, error: 'Could not find the sheet face of the edge.' };
  const [a, b] = edgeEnds(e, f.edge.dir);
  const r = edgeFlangeGeometry({ a: [a.x, a.y, a.z], b: [b.x, b.y, b.z], faceNormal: face.normal, faceCentroid: face.centroid, angle: f.angle, length: f.length, lengthMode: f.lengthMode, position: f.position, flip: f.flip, radius: f.radius, startOffset: f.startOffset, endOffset: f.endOffset, gap: f.gap, trimSideBends: f.trimSideBends, offset: f.offset, angleFace: f.angleFace, upToVertex: f.lengthEnd === 'upToVertex' ? f.vertex?.point : undefined, profile: f.profile, curl: f.curl }, params);
  return { ...r, edge: e };
}

/**
 * Miter Flange on a body: the open profile of the sketch (drawn on a plane across the first edge, at
 * one of its ends) is swept along the chain of selected straight edges; adjacent flanges meet in a
 * miter plane (bisector of the corner), with half the gap on each side.
 */
/** a miter flange for the B-rep kernel: the exact profile and per leg its plane, length and the two cut planes */
export interface ExactMiter {
  loop: NonNullable<ReturnType<typeof baseFlangeLoop>>;
  legs: { plane: PlaneDef; depth: number; clips: { point: [number, number, number]; normal: [number, number, number] }[] }[];
}

export function miterFlangeOnBody(doc: Document, geometry: THREE.BufferGeometry, bodyId: string, f: Pick<MiterFlangeFeature, 'sketchId' | 'edges' | 'reverse' | 'gap'> & Partial<MiterFlangeFeature>, params0: SheetMetalParams): { geometry: THREE.BufferGeometry | null; error?: string; exact?: ExactMiter } {
  const params = f.radius !== undefined ? { ...params0, bendRadius: f.radius } : params0;
  const sketch = doc.sketches[f.sketchId];
  if (!sketch) return { geometry: null, error: 'Select the sketch of the miter flange profile (an open line/arc chain).' };
  const chain = sketchChains(sketch).find((c) => !c.closed && c.points.length >= 2);
  if (!chain) return { geometry: null, error: 'The miter flange profile must be an open chain of lines and arcs.' };
  if (!f.edges.length) return { geometry: null, error: 'Select the edges of the sheet the flange runs along.' };
  const edges = bodyEdges(geometry, bodyId);
  const faces = planarFaces(geometry, bodyId);
  const picked: BodyEdge[] = [];
  for (const ref of f.edges) {
    const e = matchEdge(edges, ref);
    if (!e || !e.straight || e.points.length < 2) return { geometry: null, error: 'A selected edge no longer exists on the sheet (or is not straight).' };
    picked.push(e);
  }
  const plane = resolvePlaneDef(doc, sketch.plane);
  const pm = planeMatrix(plane);
  const P3 = chain.points.map((p) => new THREE.Vector3(p.x, p.y, 0).applyMatrix4(pm));
  // the first edge starts at the end nearest to the sketch plane
  const sheetNormal = (e: BodyEdge): THREE.Vector3 | null => {
    const face = sheetFaceOfEdge(faces, e);
    return face ? new THREE.Vector3(...face.normal) : null;
  };
  interface Leg { a: THREE.Vector3; b: THREE.Vector3; dir: THREE.Vector3; n: THREE.Vector3 }
  const ends = (e: BodyEdge) => [e.points[0].clone(), e.points[e.points.length - 1].clone()];
  const planeN = new THREE.Vector3(...plane.n), planeO = new THREE.Vector3(...plane.origin);
  let [a0, b0] = ends(picked[0]);
  if (Math.abs(b0.clone().sub(planeO).dot(planeN)) < Math.abs(a0.clone().sub(planeO).dot(planeN))) [a0, b0] = [b0, a0];
  const n0 = sheetNormal(picked[0]);
  if (!n0) return { geometry: null, error: 'Could not find the sheet face of the first edge.' };
  const legs: Leg[] = [{ a: a0, b: b0, dir: b0.clone().sub(a0).normalize(), n: n0 }];
  // chain the other edges on both ends of the first one
  const rest = picked.slice(1);
  const tol = 1e-3;
  for (let guard = 0; rest.length && guard < 64; guard++) {
    const last = legs[legs.length - 1], first = legs[0];
    let used = false;
    for (let i = 0; i < rest.length; i++) {
      const [p, q] = ends(rest[i]);
      const n = sheetNormal(rest[i]);
      if (!n) continue;
      if (p.distanceTo(last.b) < tol || q.distanceTo(last.b) < tol) {
        const [s, t] = p.distanceTo(last.b) < tol ? [p, q] : [q, p];
        legs.push({ a: s, b: t, dir: t.clone().sub(s).normalize(), n });
      } else if (p.distanceTo(first.a) < tol || q.distanceTo(first.a) < tol) {
        const [s, t] = p.distanceTo(first.a) < tol ? [q, p] : [p, q];
        legs.unshift({ a: s, b: t, dir: t.clone().sub(s).normalize(), n });
      } else continue;
      rest.splice(i, 1);
      used = true;
      break;
    }
    if (!used) return { geometry: null, error: 'The selected edges must form one connected chain along the sheet.' };
  }
  // profile in the frame of the first leg: u across (n × dir), v along the sheet normal
  const L0 = legs[legs.findIndex((l) => l.a.equals(a0))] ?? legs[0];
  const b1 = L0.n.clone().cross(L0.dir).normalize();
  const prof = P3.map((p) => ({ x: p.clone().sub(L0.a).dot(b1), y: p.clone().sub(L0.a).dot(L0.n) }));
  const region = baseFlangeRegion(prof, params, !!f.reverse);
  if (!region) return { geometry: null, error: 'The profile has no length.' };
  let size = 0;
  for (const p of region.outer) size = Math.max(size, Math.hypot(p.x, p.y));
  const ext = size * 2 + 10;
  const gap = Math.max(0, f.gap ?? 0.25);
  const parts: THREE.BufferGeometry[] = [];
  // exact only for a profile of straight lines (a chain with arcs is sampled into many corners here)
  const linesOnly = !Object.values(sketch.entities).some((e) => !e.construction && e.kind !== 'line' && e.kind !== 'point');
  const exactLoop = linesOnly ? baseFlangeLoop(prof, params, !!f.reverse) : null;
  const exactLegs: ExactMiter['legs'] = [];
  /** the cut plane of clipToSurface as a half-space normal: away from the side that stays */
  const cutAway = (p: THREE.Vector3, n: THREE.Vector3, keep: THREE.Vector3) => {
    const m = keep.clone().sub(p).dot(n) > 0 ? n.clone().negate() : n.clone();
    return { point: [p.x, p.y, p.z] as [number, number, number], normal: [m.x, m.y, m.z] as [number, number, number] };
  };
  for (let k = 0; k < legs.length; k++) {
    const L = legs[k];
    const u = L.n.clone().cross(L.dir).normalize();
    const start = L.a.clone().addScaledVector(L.dir, -ext);
    const len = L.a.distanceTo(L.b) + 2 * ext;
    const pl: PlaneDef = { id: 'mf', name: 'mf', origin: [start.x, start.y, start.z], u: [u.x, u.y, u.z], v: [L.n.x, L.n.y, L.n.z], n: [L.dir.x, L.dir.y, L.dir.z] };
    let g = extrudeGeometry([region], pl, { end: 'blind', depth: len, reverse: false }, len + 10, 0);
    if (!g) continue;
    const prev = legs[k - 1], next = legs[k + 1];
    // start: miter with the previous leg, or square at the edge end
    const mS = prev ? prev.dir.clone().add(L.dir).normalize() : L.dir.clone();
    const pS = L.a.clone().addScaledVector(mS, prev ? gap / 2 : Math.max(0, f.startOffset ?? 0));
    g = clipToSurface(g, { normal: [mS.x, mS.y, mS.z], point: [pS.x, pS.y, pS.z] }, [L.b.x, L.b.y, L.b.z]);
    const mE = next ? L.dir.clone().add(next.dir).normalize() : L.dir.clone();
    const pE = L.b.clone().addScaledVector(mE, next ? -gap / 2 : -Math.max(0, f.endOffset ?? 0));
    g = clipToSurface(g, { normal: [mE.x, mE.y, mE.z], point: [pE.x, pE.y, pE.z] }, [L.a.x, L.a.y, L.a.z]);
    parts.push(g);
    exactLegs.push({ plane: pl, depth: len, clips: [cutAway(pS, mS, L.b), cutAway(pE, mE, L.a)] });
  }
  if (!parts.length) return { geometry: null, error: 'Could not build the miter flange.' };
  let out = parts[0];
  for (const g of parts.slice(1)) out = csg(out, g, 'union');
  return { geometry: out, ...(exactLoop && exactLegs.length === parts.length ? { exact: { loop: exactLoop, legs: exactLegs } } : {}) };
}

/**
 * Jog: a sketch line on a planar face of the sheet; the sheet on one side of the line is raised (or
 * lowered) by the jog offset with two bends (inner radius of the sheet metal parameters).
 */
/** a jog or sketched bend for the B-rep kernel: the cut plane, the move of the far side (matrix) and the exact bend region */
export interface ExactJog {
  origin: [number, number, number];
  /** the cut of the moving side when it differs from origin (a jog: the tangent line of its second bend) */
  cut2?: [number, number, number];
  m: [number, number, number];
  move: number[];
  plane: PlaneDef;
  loop: ReturnType<typeof baseFlangeLoop>;
  depth: number;
}

export function jogOnBody(doc: Document, geometry: THREE.BufferGeometry, bodyId: string, f: Pick<JogFeature, 'sketchId' | 'offset' | 'flipSide' | 'reverse'> & Partial<JogFeature>, params0: SheetMetalParams): { geometry: THREE.BufferGeometry | null; region?: THREE.BufferGeometry; error?: string; exact?: ExactJog } {
  // Up To Vertex: the offset is the height of the picked corner above the sketch (face) plane
  if (f.offsetEnd === 'upToVertex') {
    const sk = doc.sketches[f.sketchId];
    if (!f.vertex || !sk) return { geometry: null, error: 'Select a vertex for Up To Vertex.' };
    const pl = resolvePlaneDef(doc, sk.plane);
    const d = Math.abs((f.vertex.point[0] - pl.origin[0]) * pl.n[0] + (f.vertex.point[1] - pl.origin[1]) * pl.n[1] + (f.vertex.point[2] - pl.origin[2]) * pl.n[2]);
    if (d < 1e-6) return { geometry: null, error: 'The vertex lies in the sketch plane.' };
    return jogOnBody(doc, geometry, bodyId, { ...f, offsetEnd: undefined, offset: d }, params0);
  }
  const params = flangeParams(f.radius !== undefined ? { ...params0, bendRadius: f.radius } : params0, { customAllowance: f.customAllowance });
  const sketch = doc.sketches[f.sketchId];
  if (!sketch) return { geometry: null, error: 'Select the sketch with the jog line.' };
  const line = sketch.entityOrder.map((id) => sketch.entities[id]).find((e) => e.kind === 'line' && !e.construction);
  if (!line || line.kind !== 'line') return { geometry: null, error: 'The jog sketch needs one line on a face of the sheet.' };
  const plane = resolvePlaneDef(doc, sketch.plane);
  const pm = planeMatrix(plane);
  const A = new THREE.Vector3(sketch.points[line.p1].x, sketch.points[line.p1].y, 0).applyMatrix4(pm);
  const B = new THREE.Vector3(sketch.points[line.p2].x, sketch.points[line.p2].y, 0).applyMatrix4(pm);
  const l = B.clone().sub(A).normalize();
  // the face the line lies on: a planar face whose plane contains both end points and whose normal is across the line
  const faces = planarFaces(geometry, bodyId);
  const onFace = faces
    .filter((fc) => {
      const n = new THREE.Vector3(...fc.normal), c = new THREE.Vector3(...fc.centroid);
      return Math.abs(n.dot(l)) < 1e-6 && Math.abs(A.clone().sub(c).dot(n)) < 1e-3 && Math.abs(B.clone().sub(c).dot(n)) < 1e-3;
    })
    .sort((x, y) => y.area - x.area)[0];
  if (!onFace) return { geometry: null, error: 'Sketch the jog line on a planar face of the sheet.' };
  const t = params.thickness;
  let nf = new THREE.Vector3(...onFace.normal);
  let origin = A.clone();
  if (f.reverse) {
    // jog the other way: work from the opposite face of the sheet
    origin = origin.addScaledVector(nf, -t);
    nf = nf.negate();
  }
  let m = nf.clone().cross(l).normalize();
  if (f.flipSide) m = m.negate();
  // Jog Offset (SW / docs): Outside = sketch face to the far face of the moved part (the move D), Inside = to its near
  // face (D - t), Overall dimension = from the other face of the sheet to the far face (D + t)
  const D = Math.max(t, f.offsetType === 'inside' ? f.offset + t : f.offsetType === 'overall' ? f.offset - t : f.offset);
  const r = params.bendRadius;
  // Jog Angle: the middle leg leans when the angle is under 90 degrees; an offset too small for two full bends with a
  // straight leg between them gives two shallower bends that meet (S curve)
  const ja = (Math.max(10, Math.min(90, f.jogAngle ?? 90)) * Math.PI) / 180;
  const sec = jogSection(D, ja, r, t);
  const deg = (sec.phi * 180) / Math.PI, ba = bendAllowance(deg, r, params);
  // Jog Position: where the first bend starts (X1, along m from the line): Bend Centerline = the line in the middle of
  // the first bend in the flat, Material Inside = the outer face of the middle leg on the line, Material Outside = its
  // inner face on the line, Bend Outside = the bend starts at the line
  const tan2 = Math.tan(sec.phi / 2);
  const X1 = f.position === 'materialInside' ? -(r + t) * tan2 : f.position === 'materialOutside' ? -r * tan2 : f.position === 'bendOutside' ? 0 : -ba / 2;
  const X2 = X1 + sec.run;
  // Fix projected length (default on): the far part keeps its place along the sheet, material is added for the jog;
  // off: no material is added, the far part is cut where the developed jog (two bends + leg) ends and slides back
  const cut2 = f.fixProjected === false ? X1 + 2 * ba + sec.h : X2;
  const along = X2 - cut2;
  const P = (x: number) => origin.clone().addScaledVector(m, x);
  const pFix = P(X1), pCut = P(cut2);
  // the width of the sheet along the line: the cut of the body at the line
  const loops = sliceMeshLoops(geometry, m, m.dot(origin), l, nf);
  if (!loops.length) return { geometry: null, error: 'The jog line does not cross the sheet.' };
  let s0 = Infinity, s1 = -Infinity;
  for (const loop of loops) for (const p of loop) { s0 = Math.min(s0, p[0]); s1 = Math.max(s1, p[0]); }
  // right-handed frame (u = m, v = nf, n = m × nf): extrude from the end of the sheet the normal points away from
  const nn = m.clone().cross(nf).normalize();
  const startP = pFix.clone().addScaledVector(l, (nn.dot(l) > 0 ? s0 : s1) - l.dot(pFix));
  const pl: PlaneDef = { id: 'jog', name: 'jog', origin: [startP.x, startP.y, startP.z], u: [m.x, m.y, m.z], v: [nf.x, nf.y, nf.z], n: [nn.x, nn.y, nn.z] };
  // the bend zone (two bends and the middle leg) as one extrusion from the tangent line of the first bend to the
  // tangent line of the second: it only touches the fixed and the moved part in those two planes (one clean sheet)
  const zg = extrudeGeometry([sec.region], pl, { end: 'blind', depth: s1 - s0, reverse: false }, s1 - s0 + 10, 0);
  if (!zg) return { geometry: null, error: 'Could not build the jog.' };
  const fixed = clipToSurface(geometry, { normal: [m.x, m.y, m.z], point: [pFix.x, pFix.y, pFix.z] }, pFix.clone().addScaledVector(m, -1).toArray());
  const moving = clipToSurface(geometry, { normal: [m.x, m.y, m.z], point: [pCut.x, pCut.y, pCut.z] }, pCut.clone().addScaledVector(m, 1).toArray());
  const mv = nf.clone().multiplyScalar(D).addScaledVector(m, along);
  moving.translate(mv.x, mv.y, mv.z);
  // the three pieces meet in the two tangent planes: joined there without a boolean (a union of solids that only touch
  // leaves slivers in the bend facets); a cut that is not the full cross-section of the bend zone falls back to the union
  const pEnd = P(X2), a = dropCap(fixed, pFix, m), z1 = dropCap(zg, pFix, m), z2 = dropCap(z1.g, pEnd, m), b = dropCap(moving, pEnd, m);
  const same = (x: number, y: number) => x > 1e-9 && Math.abs(x - y) <= 1e-6 * x + 1e-6;
  const out = same(a.area, z1.area) && same(b.area, z2.area) ? mergeGeometries([a.g, z2.g, b.g]) : csg(csg(fixed, zg, 'union'), moving, 'union');
  const exact: ExactJog = { origin: [pFix.x, pFix.y, pFix.z], cut2: [pCut.x, pCut.y, pCut.z], m: [m.x, m.y, m.z], move: new THREE.Matrix4().makeTranslation(mv.x, mv.y, mv.z).elements.slice(), plane: pl,
    loop: sec.loop, depth: s1 - s0 };
  return { geometry: out, region: zg, exact };
}

/** a mesh without its triangles in the plane through p with normal n (the cap of a cut), and their area */
function dropCap(g: THREE.BufferGeometry, p: THREE.Vector3, n: THREE.Vector3): { g: THREE.BufferGeometry; area: number } {
  const ng = g.index ? g.toNonIndexed() : g, pos = ng.getAttribute('position'), keep: number[] = [];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  let area = 0;
  for (let i = 0; i + 2 < pos.count; i += 3) {
    A.fromBufferAttribute(pos, i); B.fromBufferAttribute(pos, i + 1); C.fromBufferAttribute(pos, i + 2);
    const N = B.clone().sub(A).cross(C.clone().sub(A));
    const inPlane = [A, B, C].every((v) => Math.abs(v.clone().sub(p).dot(n)) < 1e-5);
    if (inPlane && Math.abs(N.dot(n)) >= 0.999 * N.length()) area += N.length() / 2;
    else keep.push(i);
  }
  const out = new THREE.BufferGeometry();
  for (const [name, at] of Object.entries(ng.attributes)) {
    const src = at as THREE.BufferAttribute, w = src.itemSize, arr: number[] = [];
    for (const i of keep) for (let k = 0; k < 3 * w; k++) arr.push(src.array[i * w + k]);
    out.setAttribute(name, new THREE.Float32BufferAttribute(arr, w));
  }
  return { g: out, area };
}

/**
 * The cross-section of a jog's bend zone in (x along the sheet from the tangent line of the first bend, y along the
 * jog): two bends of angle phi (inner radius r, outer r + t) with a straight leg h between them; the top face rises
 * by D. The first bend has its inner radius on the top face, the second its outer radius.
 */
export function jogSection(D: number, ja: number, r: number, t: number): { region: Region; loop: ProfileSegment[]; phi: number; h: number; run: number } {
  let phi = ja, h = (D - (2 * r + t) * (1 - Math.cos(ja))) / Math.sin(ja);
  if (h < 0) {
    phi = Math.acos(Math.max(-1, 1 - D / (2 * r + t)));
    h = 0;
  }
  const d = { x: Math.cos(phi), y: Math.sin(phi) }, nm = { x: Math.sin(phi), y: -Math.cos(phi) };
  const c1 = { x: 0, y: r };
  const p1 = { x: c1.x + r * nm.x + h * d.x, y: c1.y + r * nm.y + h * d.y };
  const c2 = { x: p1.x + (r + t) * nm.x, y: p1.y + (r + t) * nm.y };
  const run = c2.x;
  const at = (c: SketchPoint, R: number, a: number) => ({ x: c.x + R * Math.cos(a), y: c.y + R * Math.sin(a) });
  const arc = (c: SketchPoint, R: number, a0: number, a1: number) => Array.from({ length: 13 }, (_, k) => at(c, R, a0 + ((a1 - a0) * k) / 12));
  const q = Math.PI / 2;
  // top face: bend 1 (inner) then bend 2 (outer); bottom face back: bend 2 (inner) then bend 1 (outer)
  const top = [...arc(c1, r, -q, -q + phi), ...arc(c2, r + t, q + phi, q)];
  const bottom = [...arc(c2, r, q, q + phi), ...arc(c1, r + t, -q + phi, -q)];
  const poly = [...top, ...bottom].filter((p, i, a) => i === 0 || Math.hypot(p.x - a[i - 1].x, p.y - a[i - 1].y) > 1e-9);
  const area = polyArea(poly);
  const seg = (c: SketchPoint, R: number, a0: number, a1: number): ProfileSegment => ({ a: at(c, R, a0), b: at(c, R, a1), m: at(c, R, (a0 + a1) / 2) });
  const line = (a: SketchPoint, b: SketchPoint): ProfileSegment[] => (Math.hypot(b.x - a.x, b.y - a.y) > 1e-9 ? [{ a, b }] : []);
  const loop: ProfileSegment[] = [
    seg(c1, r, -q, -q + phi), ...line(at(c1, r, -q + phi), at(c2, r + t, q + phi)), seg(c2, r + t, q + phi, q),
    { a: at(c2, r + t, q), b: at(c2, r, q) },
    seg(c2, r, q, q + phi), ...line(at(c2, r, q + phi), at(c1, r + t, -q + phi)), seg(c1, r + t, -q + phi, -q),
    { a: at(c1, r + t, -q), b: at(c1, r, -q) },
  ];
  return { region: { outer: area < 0 ? poly.slice().reverse() : poly, holes: [], area: Math.abs(area) }, loop, phi, h, run };
}

/**
 * Sketched Bend: the sketch line on a face of the sheet is the bend line; the side away from the fixed
 * face turns by the bend angle around it (inner radius of the sheet metal parameters).
 */
export function sketchedBendOnBody(doc: Document, geometry: THREE.BufferGeometry, bodyId: string, f: Pick<SketchedBendFeature, 'sketchId' | 'angle' | 'flipSide' | 'reverse'> & Partial<SketchedBendFeature>, params0: SheetMetalParams): { geometry: THREE.BufferGeometry | null; region?: THREE.BufferGeometry; error?: string; exact?: ExactJog } {
  const params = f.radius !== undefined ? { ...params0, bendRadius: f.radius } : params0;
  const fr = sheetLineFrame(doc, geometry, bodyId, f.sketchId, f.reverse, f.flipSide, params);
  if ('error' in fr) return { geometry: null, error: fr.error };
  const { l, nf, m, s0, s1 } = fr;
  // Bend Position: where the bend lies against the line
  const origin = fr.origin.clone().addScaledVector(m, positionShift(f.position, params.bendRadius, params.thickness));
  const th = (Math.max(1, Math.min(179, f.angle)) * Math.PI) / 180;
  const run = params.bendRadius + 2 * params.thickness + 2;
  const chain = [{ x: -run, y: 0 }, { x: 0, y: 0 }, { x: run * Math.cos(th), y: run * Math.sin(th) }];
  const region = baseFlangeRegion(chain, params, true);
  if (!region) return { geometry: null, error: 'The bend has no size.' };
  const nn = m.clone().cross(nf).normalize();
  const startP = origin.clone().addScaledVector(l, (nn.dot(l) > 0 ? s0 : s1) - l.dot(origin));
  const pl: PlaneDef = { id: 'sb', name: 'sb', origin: [startP.x, startP.y, startP.z], u: [m.x, m.y, m.z], v: [nf.x, nf.y, nf.z], n: [nn.x, nn.y, nn.z] };
  const zg = extrudeGeometry([region], pl, { end: 'blind', depth: s1 - s0, reverse: false }, s1 - s0 + 10, 0);
  if (!zg) return { geometry: null, error: 'Could not build the bend.' };
  const behind = origin.clone().addScaledVector(m, -1), ahead = origin.clone().addScaledVector(m, 1);
  const fixed = clipToSurface(geometry, { normal: [m.x, m.y, m.z], point: [origin.x, origin.y, origin.z] }, [behind.x, behind.y, behind.z]);
  const moving = clipToSurface(geometry, { normal: [m.x, m.y, m.z], point: [origin.x, origin.y, origin.z] }, [ahead.x, ahead.y, ahead.z]);
  // turn the moving side about the bend line (through the outer corner of the bend): +m goes toward +nf
  const rot = new THREE.Matrix4().makeTranslation(origin.x, origin.y, origin.z).multiply(new THREE.Matrix4().makeRotationAxis(nn, th)).multiply(new THREE.Matrix4().makeTranslation(-origin.x, -origin.y, -origin.z));
  moving.applyMatrix4(rot);
  let out = csg(fixed, zg, 'union');
  out = csg(out, moving, 'union');
  return { geometry: out, region: zg, exact: { origin: [origin.x, origin.y, origin.z], m: [m.x, m.y, m.z], move: rot.elements.slice(), plane: pl, loop: baseFlangeLoop(chain, params, true), depth: s1 - s0 } };
}

/** Frame of a sheet-metal sketch line on a face: origin on the line (top face), l along it, nf the face normal, m across. */
function sheetLineFrame(doc: Document, geometry: THREE.BufferGeometry, bodyId: string, sketchId: Id, reverse: boolean, flipSide: boolean, params: SheetMetalParams): { origin: THREE.Vector3; l: THREE.Vector3; nf: THREE.Vector3; m: THREE.Vector3; s0: number; s1: number } | { error: string } {
  const sketch = doc.sketches[sketchId];
  if (!sketch) return { error: 'Select the sketch with the bend line.' };
  const line = sketch.entityOrder.map((id) => sketch.entities[id]).find((e) => e.kind === 'line' && !e.construction);
  if (!line || line.kind !== 'line') return { error: 'The sketch needs one line on a face of the sheet.' };
  const plane = resolvePlaneDef(doc, sketch.plane);
  const pm = planeMatrix(plane);
  const A = new THREE.Vector3(sketch.points[line.p1].x, sketch.points[line.p1].y, 0).applyMatrix4(pm);
  const B = new THREE.Vector3(sketch.points[line.p2].x, sketch.points[line.p2].y, 0).applyMatrix4(pm);
  const l = B.clone().sub(A).normalize();
  const onFace = planarFaces(geometry, bodyId)
    .filter((fc) => {
      const n = new THREE.Vector3(...fc.normal), c = new THREE.Vector3(...fc.centroid);
      return Math.abs(n.dot(l)) < 1e-6 && Math.abs(A.clone().sub(c).dot(n)) < 1e-3 && Math.abs(B.clone().sub(c).dot(n)) < 1e-3;
    })
    .sort((x, y) => y.area - x.area)[0];
  if (!onFace) return { error: 'Sketch the line on a planar face of the sheet.' };
  let nf = new THREE.Vector3(...onFace.normal);
  let origin = A.clone();
  if (reverse) {
    origin = origin.addScaledVector(nf, -params.thickness);
    nf = nf.negate();
  }
  let m = nf.clone().cross(l).normalize();
  if (flipSide) m = m.negate();
  const loops = sliceMeshLoops(geometry, m, m.dot(origin), l, nf);
  if (!loops.length) return { error: 'The line does not cross the sheet.' };
  let s0 = Infinity, s1 = -Infinity;
  for (const loop of loops) for (const p of loop) { s0 = Math.min(s0, p[0]); s1 = Math.max(s1, p[0]); }
  return { origin, l, nf, m, s0, s1 };
}

/** Plane cut of a mesh as loops of (s, n) points (s along l, n along nf) — the extent of a sheet along a line. */
function sliceMeshLoops(g: THREE.BufferGeometry, n: THREE.Vector3, d: number, l: THREE.Vector3, nf: THREE.Vector3): [number, number][][] {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const pts: [number, number][] = [];
  const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i + 2 < a.count; i += 3) {
    for (let k = 0; k < 3; k++) P[k].fromBufferAttribute(a, i + k);
    const s = P.map((p) => p.dot(n) - d);
    for (let k = 0; k < 3; k++) {
      const x = k, y = (k + 1) % 3;
      if ((s[x] < 0) !== (s[y] < 0)) {
        const q = P[x].clone().lerp(P[y], s[x] / (s[x] - s[y]));
        pts.push([q.dot(l), q.dot(nf)]);
      }
    }
  }
  return pts.length ? [pts] : [];
}

/** the sheet metal parameters of one flange: its Custom Bend Allowance and Custom Relief Type over the document's */
export function flangeParams(p: SheetMetalParams, f: Partial<EdgeFlangeFeature>): SheetMetalParams {
  let out = p;
  if (f.customAllowance) out = { ...out, allowanceType: f.customAllowance.type, allowanceValue: f.customAllowance.value, kFactor: f.customAllowance.type === 'kFactor' ? f.customAllowance.value : out.kFactor };
  if (f.customRelief) out = { ...out, reliefType: f.customRelief.type, reliefRatio: f.customRelief.ratio, useReliefRatio: true };
  return out;
}

/** Bend / Jog Position: the shift of the bend against the sketch line (centerline, material inside / outside, bend outside) */
function positionShift(p: 'centerline' | 'materialInside' | 'materialOutside' | 'bendOutside' | undefined, r: number, t: number): number {
  return p === 'materialInside' ? -(r + t) / 2 : p === 'materialOutside' ? (r + t) / 2 : p === 'bendOutside' ? r + t : 0;
}

/**
 * Cross-Break lines: the planar face through the picked point is collected from the body's triangles,
 * its outline is boxed along its longest hull edge and the two diagonals of that box are returned (slightly inset).
 */
export function crossBreakLines(g: THREE.BufferGeometry, face: { normal: [number, number, number]; point: [number, number, number] }): THREE.Vector3[][] | null {
  const n = new THREE.Vector3(...face.normal).normalize();
  const p0 = new THREE.Vector3(...face.point);
  const u = (Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).cross(n).normalize();
  const v = n.clone().cross(u).normalize();
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const pts: [number, number][] = [];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), N = new THREE.Vector3();
  for (let t = 0; t + 2 < a.count; t += 3) {
    A.fromBufferAttribute(a, t); B.fromBufferAttribute(a, t + 1); C.fromBufferAttribute(a, t + 2);
    N.subVectors(B, A).cross(C.clone().sub(A));
    if (N.lengthSq() < 1e-12) continue;
    N.normalize();
    if (N.dot(n) < 0.999 || Math.abs(A.clone().sub(p0).dot(n)) > 1e-3) continue;
    for (const P of [A, B, C]) { const d = P.clone().sub(p0); pts.push([d.dot(u), d.dot(v)]); }
  }
  if (pts.length < 3) return null;
  // convex hull (monotone chain)
  const sorted = [...pts].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o: [number, number], p: [number, number], q: [number, number]) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const p of sorted) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (const p of [...sorted].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  let best = 0, ang = 0;
  for (let i = 0; i < hull.length; i++) {
    const p = hull[i], q = hull[(i + 1) % hull.length];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (l > best) { best = l; ang = Math.atan2(q[1] - p[1], q[0] - p[0]); }
  }
  const ca = Math.cos(ang), sa = Math.sin(ang);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of hull) { const x = p[0] * ca + p[1] * sa, y = -p[0] * sa + p[1] * ca; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const lift = 0.02;
  const to3 = (x: number, y: number) => { const px = x * ca - y * sa, py = x * sa + y * ca; return p0.clone().addScaledVector(u, px).addScaledVector(v, py).addScaledVector(n, lift); };
  return [[to3(x0, y0), to3(x1, y1)], [to3(x0, y1), to3(x1, y0)]];
}
