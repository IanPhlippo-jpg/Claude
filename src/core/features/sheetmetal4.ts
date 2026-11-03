import * as THREE from 'three';
import type { PlaneDef } from '../document/types';
import type { SketchPoint } from '../sketch/types';
import { bodyEdges, matchEdge, type BodyEdge, type EdgeRef } from './edgesets';
import { csg, extrudeGeometry, mergeGeometries, planarFaces, planeMatrix, type PlanarFace } from './solid';
import { thinRegions } from './thin';
import { sampleEntity } from '../sketch/geometry';
import type { Sketch } from '../sketch/types';
import { polyArea, sketchRegions } from './regions';
import type { Region } from './regions';
import { TOL } from './tolerance';

/**
 * Sheet metal, the remaining tools of the intended Sheet Metal tab: Vent, Forming Tool, Sheet Metal
 * Gusset, Tab and Slot, Rip and Swept Flange. Everything here builds tools (geometry to add or to cut)
 * on the sheet body; the rebuild applies them with the usual booleans.
 */

type V3 = [number, number, number];
const v3 = (a: V3 | THREE.Vector3) => (a instanceof THREE.Vector3 ? a.clone() : new THREE.Vector3(a[0], a[1], a[2]));
const EPS = 0.02;

/** a box with its own axes: centre c, unit axes (u, v, w) and the sizes along them */
export function orientedBox(c: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, w: THREE.Vector3, su: number, sv: number, sw: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(su, sv, sw).toNonIndexed();
  const un = u.clone().normalize(), vn = v.clone().normalize();
  let wn = w.clone().normalize();
  // a left-handed frame would turn the box inside out (flipped winding): the box is symmetric, so flip the third axis
  if (un.clone().cross(vn).dot(wn) < 0) wn = wn.negate();
  const m = new THREE.Matrix4().makeBasis(un, vn, wn).setPosition(c);
  g.applyMatrix4(m);
  g.computeVertexNormals();
  return g;
}

/** a box from intervals along the axes: [u0,u1] x [v0,v1] x [w0,w1] measured from the origin o */
export function intervalBox(o: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, w: THREE.Vector3, iu: [number, number], iv: [number, number], iw: [number, number]): THREE.BufferGeometry {
  const un = u.clone().normalize(), vn = v.clone().normalize(), wn = w.clone().normalize();
  const c = o.clone().addScaledVector(un, (iu[0] + iu[1]) / 2).addScaledVector(vn, (iv[0] + iv[1]) / 2).addScaledVector(wn, (iw[0] + iw[1]) / 2);
  return orientedBox(c, un, vn, wn, Math.abs(iu[1] - iu[0]), Math.abs(iv[1] - iv[0]), Math.abs(iw[1] - iw[0]));
}

/** a cylinder along the axis n from z0 to z1 (measured from o) with radius r */
export function axisCylinder(o: THREE.Vector3, n: THREE.Vector3, r: number, z0: number, z1: number, segments = 48): THREE.BufferGeometry {
  const h = Math.abs(z1 - z0);
  const g = new THREE.CylinderGeometry(r, r, h, segments).toNonIndexed();
  const nn = n.clone().normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), nn);
  g.applyQuaternion(q);
  const c = o.clone().addScaledVector(nn, (z0 + z1) / 2);
  g.translate(c.x, c.y, c.z);
  g.computeVertexNormals();
  return g;
}

/** a prism: a polygon in the (u, v) frame at o, extruded along w from w0 to w1 */
export function prism(o: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, w: THREE.Vector3, poly: [number, number][], w0: number, w1: number): THREE.BufferGeometry | null {
  const def: PlaneDef = { id: 'tmp', name: 'tmp', origin: o.toArray() as V3, u: u.clone().normalize().toArray() as V3, v: v.clone().normalize().toArray() as V3, n: w.clone().normalize().toArray() as V3 };
  const region: Region = { outer: poly.map(([x, y]) => ({ x, y })), holes: [], area: 0 };
  const g = extrudeGeometry([region], def, { end: 'blind', depth: Math.abs(w1 - w0), reverse: false }, 0, 0);
  if (!g) return null;
  const nn = w.clone().normalize();
  const k = Math.min(w0, w1);
  g.translate(nn.x * k, nn.y * k, nn.z * k);
  return g;
}

/**
 * The sheet face of a straight edge: of the two faces that meet at it, the larger. Only a face whose plane holds the edge
 * counts: a bigger face with the same normal elsewhere on the body (the top of the base leg of an L, for an edge at the
 * end of its upright) is not the edge's face, and taking it built the flange on the end face instead (QA 0.5.11 F197).
 */
export function sheetFaceOfEdge(faces: PlanarFace[], e: BodyEdge, flatOnly = false): PlanarFace | null {
  const seg = e.segments[0];
  const onPlane = (face: PlanarFace) => Math.abs(new THREE.Vector3(...face.normal).dot(e.centroid.clone().sub(new THREE.Vector3(...face.centroid)))) < 0.01;
  const pick = (n: THREE.Vector3) => faces.filter((face) => (!flatOnly || !face.curved) && new THREE.Vector3(...face.normal).dot(n) > 0.999 && onPlane(face)).reduce((best, face) => (face.area > (best?.area ?? -1) ? face : best), null as PlanarFace | null);
  const f1 = pick(seg.n1), f2 = pick(seg.n2);
  return (f1?.area ?? 0) >= (f2?.area ?? 0) ? f1 : f2;
}

/** The straight edge of a sheet and the (largest) sheet face it belongs to, with the in-plane direction away from the sheet. */
export function edgeSheetFace(geometry: THREE.BufferGeometry, bodyId: string, ref: EdgeRef): { e: BodyEdge; face: PlanarFace; a: THREE.Vector3; b: THREE.Vector3; dir: THREE.Vector3; n: THREE.Vector3; out: THREE.Vector3 } | { error: string } {
  const edges = bodyEdges(geometry, bodyId);
  const e = matchEdge(edges, ref);
  if (!e || !e.straight || e.points.length < 2) return { error: 'The selected edge no longer exists on the sheet (or is not straight).' };
  const face = sheetFaceOfEdge(planarFaces(geometry, bodyId), e, true);
  if (!face) return { error: 'Could not find the sheet face of the edge.' };
  const a = e.points[0].clone(), b = e.points[e.points.length - 1].clone();
  const dir = b.clone().sub(a).normalize();
  const n = new THREE.Vector3(...face.normal).normalize();
  const out = n.clone().cross(dir).normalize();
  const c = new THREE.Vector3(...face.centroid);
  if (c.clone().sub(a).dot(out) > 0) out.negate();
  return { e, face, a, b, dir, n, out };
}

// ---------------------------------------------------------------------------------------------
// Vent
// ---------------------------------------------------------------------------------------------
export interface VentInput {
  /** the enclosed area of the sketch (the regions of its arrangement; together they are the boundary) */
  regions: Region[];
  /** ribs: open entities with area on both sides, each becomes a strip of ribWidth that stays */
  ribs: SketchPoint[][];
  /** spars: closed entities inside the boundary, each becomes a ring of sparWidth that stays */
  spars: SketchPoint[][];
  /** fill-in boundary: closed regions that stay solid */
  fillIn: Region[];
  ribWidth: number;
  sparWidth: number;
}

const inPoly = (p: SketchPoint, poly: SketchPoint[]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};
/** inside the enclosed area of the sketch: the outer loops of the regions, holes filled (an inner circle is a spar, not a hole) */
const inRegions = (p: SketchPoint, regions: Region[]) => regions.some((r) => inPoly(p, r.outer));

/**
 * Vent: sort the sketch into its parts, as the intended boxes. The regions of the sketch together are the boundary.
 * An entity with enclosed area on both sides is a rib (open) or a spar (closed); one with area on one side only lies on
 * the boundary. Fill-In Boundary: the smallest closed entity stays solid.
 */
export function classifyVent(sketch: Sketch, fillIn: boolean): Omit<VentInput, 'ribWidth' | 'sparWidth'> & { boundaryArea: number } {
  const regions = sketchRegions(sketch);
  const ribs: SketchPoint[][] = [];
  const closed: { pts: SketchPoint[]; area: number }[] = [];
  const delta = 0.05;
  const bothSides = (pts: SketchPoint[]) => {
    // probe on both sides of the middle of the entity
    const k = Math.floor((pts.length - 1) / 2);
    const a = pts[k], b = pts[Math.min(pts.length - 1, k + 1)];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    return inRegions({ x: m.x + nx * delta, y: m.y + ny * delta }, regions) && inRegions({ x: m.x - nx * delta, y: m.y - ny * delta }, regions);
  };
  for (const id of sketch.entityOrder) {
    const e = sketch.entities[id];
    if (e.kind === 'point' || e.construction) continue;
    const pts = sampleEntity(sketch, e, 48);
    if (pts.length < 2) continue;
    const isClosed = e.kind === 'circle' || e.kind === 'ellipse' || (pts.length > 3 && Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 1e-6);
    if (isClosed) {
      const poly = pts.slice();
      if (Math.hypot(poly[0].x - poly[poly.length - 1].x, poly[0].y - poly[poly.length - 1].y) < 1e-6) poly.pop();
      if (bothSides(pts)) closed.push({ pts: poly, area: Math.abs(polyArea(poly)) });
    } else if (bothSides(pts)) ribs.push(pts);
  }
  closed.sort((a, b) => b.area - a.area);
  let fill: Region[] = [];
  let spars = closed.map((c) => c.pts);
  if (fillIn && closed.length) {
    const smallest = closed[closed.length - 1];
    fill = [{ outer: smallest.pts, holes: [], area: smallest.area }];
    spars = spars.slice(0, -1);
  }
  // the boundary: the outer loops with their holes filled (what is inside them is sorted into spars and fill-in above)
  const outers = regions.map((r) => ({ outer: r.outer, holes: [], area: Math.abs(polyArea(r.outer)) }));
  const boundaryArea = outers.reduce((a, r) => a + r.area, 0);
  return { regions: outers, ribs, spars, fillIn: fill, boundaryArea };
}

/** Vent: the cut tool through the sheet (the enclosed area minus the ribs, spars and fill-in boundary). */
export function ventTool(input: VentInput, plane: PlaneDef, extent: number): THREE.BufferGeometry | null {
  const ext = { end: 'throughAllBoth' as const, depth: 0, reverse: false };
  let tool: THREE.BufferGeometry | null = null;
  for (const r of input.regions) {
    const g = extrudeGeometry([r], plane, ext, extent, 0);
    if (!g) continue;
    tool = tool ? csg(tool, g, 'union') : g;
  }
  if (!tool) return null;
  const keep: Region[] = [...input.fillIn];
  for (const r of input.ribs) if (r.length >= 2 && input.ribWidth > 0) keep.push(...thinRegions([{ points: r, closed: false }], { mode: 'mid', thickness: input.ribWidth }));
  for (const s of input.spars) if (s.length >= 3 && input.sparWidth > 0) keep.push(...thinRegions([{ points: s, closed: true }], { mode: 'mid', thickness: input.sparWidth }));
  for (const k of keep) {
    const kg = extrudeGeometry([k], plane, ext, extent * 1.1, 0);
    if (kg) tool = csg(tool, kg, 'subtract');
  }
  return tool;
}

/** Vent: the area that is open (boundary minus what stays), from the sketch (an estimate for the message box). */
export function ventOpenArea(input: VentInput): number {
  const len = (p: SketchPoint[], closed: boolean) => p.reduce((s, q, i) => (i + 1 < p.length || closed ? s + Math.hypot(p[(i + 1) % p.length].x - q.x, p[(i + 1) % p.length].y - q.y) : s), 0);
  let a = input.regions.reduce((s, r) => s + Math.abs(r.area), 0);
  for (const f of input.fillIn) a -= Math.abs(polyArea(f.outer));
  for (const r of input.ribs) a -= len(r, false) * input.ribWidth;
  for (const s of input.spars) a -= len(s, true) * input.sparWidth;
  return Math.max(0, a);
}

// ---------------------------------------------------------------------------------------------
// Forming Tool
// ---------------------------------------------------------------------------------------------
export type FormToolShape = 'embossRound' | 'embossRect' | 'louver' | 'bridgeLance' | 'rib' | 'extrudedHole';
export const FORM_TOOL_LIBRARY: { id: FormToolShape; label: string; folder: string; width: number; length: number; height: number }[] = [
  { id: 'embossRound', label: 'circular emboss', folder: 'embosses', width: 20, length: 20, height: 4 },
  { id: 'embossRect', label: 'rectangular emboss', folder: 'embosses', width: 16, length: 30, height: 4 },
  { id: 'louver', label: 'louver', folder: 'louvers', width: 10, length: 40, height: 5 },
  { id: 'bridgeLance', label: 'bridge lance', folder: 'lances', width: 8, length: 24, height: 4 },
  { id: 'rib', label: 'single rib', folder: 'ribs', width: 6, length: 40, height: 3 },
  { id: 'extrudedHole', label: 'extruded hole', folder: 'extruded flanges', width: 12, length: 12, height: 4 },
];

export interface FormToolInput {
  shape: FormToolShape;
  /** the placement face plane (origin and axes) and the position on it */
  plane: PlaneDef;
  at: SketchPoint;
  rotation: number;
  flip: boolean;
  width: number;
  length: number;
  height: number;
  thickness: number;
}

/** Forming Tool: the material to add (the pressed form) and the material to remove (the hollow inside and the opened sheet). */
export function formToolGeometry(i: FormToolInput): { add: THREE.BufferGeometry; cut: THREE.BufferGeometry } {
  const pm = planeMatrix(i.plane);
  const o = new THREE.Vector3(i.at.x, i.at.y, 0).applyMatrix4(pm);
  const n = new THREE.Vector3(...i.plane.n).normalize().multiplyScalar(i.flip ? -1 : 1);
  const rot = (i.rotation * Math.PI) / 180;
  const u0 = new THREE.Vector3(...i.plane.u).normalize(), v0 = new THREE.Vector3(...i.plane.v).normalize();
  const u = u0.clone().multiplyScalar(Math.cos(rot)).addScaledVector(v0, Math.sin(rot));
  const v = n.clone().cross(u).normalize();
  const t = i.thickness, h = Math.max(t + 0.1, i.height), w = Math.max(2 * t + 0.1, i.width), L = Math.max(2 * t + 0.1, i.length);
  // the pressed form stands on the face: from -t (the back of the sheet) up to h; the hollow runs from below the sheet to h - t
  const back = -t - EPS;
  // the form starts just inside the sheet so no face of it is coplanar with the sheet's back
  const base = -t + EPS;
  switch (i.shape) {
    case 'embossRound':
      return { add: axisCylinder(o, n, w / 2, base, h), cut: axisCylinder(o, n, w / 2 - t, back, h - t) };
    case 'embossRect':
      return { add: intervalBox(o, u, v, n, [-L / 2, L / 2], [-w / 2, w / 2], [base, h]), cut: intervalBox(o, u, v, n, [-L / 2 + t, L / 2 - t], [-w / 2 + t, w / 2 - t], [back, h - t]) };
    case 'louver':
      // a louver is open on one long side: the hollow runs out of the form on +v
      return { add: intervalBox(o, u, v, n, [-L / 2, L / 2], [-w / 2, w / 2], [base, h]), cut: intervalBox(o, u, v, n, [-L / 2 + t, L / 2 - t], [-w / 2 + t, w / 2 + EPS], [back, h - t]) };
    case 'bridgeLance':
      // a bridge: open on both short ends
      return { add: intervalBox(o, u, v, n, [-L / 2, L / 2], [-w / 2, w / 2], [base, h]), cut: intervalBox(o, u, v, n, [-L / 2 - EPS, L / 2 + EPS], [-w / 2 + t, w / 2 - t], [back, h - t]) };
    case 'rib':
      return { add: intervalBox(o, u, v, n, [-L / 2, L / 2], [-w / 2, w / 2], [base, h]), cut: intervalBox(o, u, v, n, [-L / 2 + t, L / 2 - t], [-w / 2 + t, w / 2 - t], [back, h - t]) };
    case 'extrudedHole':
      // an extruded flange: a collar of the sheet thickness around a through hole
      return { add: axisCylinder(o, n, w / 2 + t, base, h), cut: axisCylinder(o, n, w / 2, back, h + EPS) };
  }
}

// ---------------------------------------------------------------------------------------------
// Sheet Metal Gusset
// ---------------------------------------------------------------------------------------------
export interface GussetInput {
  faces: { normal: V3; point: V3 }[];
  /** indent depth along both faces, the width of the gusset along the bend */
  depth: number;
  width: number;
  /** distance from the start of the bend line (null = centred) */
  offset: number | null;
  flip: boolean;
  thickness: number;
  /** the inner bend radius (to carry the dent through the outside of the bend) */
  bendRadius: number;
}

/** The bend line of two planar faces: the intersection line of their planes and the overlap of the faces along it. */
export function bendLine(geometry: THREE.BufferGeometry, bodyId: string, refs: { normal: V3; point: V3 }[]): { p: THREE.Vector3; dir: THREE.Vector3; lo: number; hi: number; n1: THREE.Vector3; n2: THREE.Vector3 } | { error: string } {
  if (refs.length < 2) return { error: 'Select the two faces that meet at the bend.' };
  const faces = planarFaces(geometry, bodyId).filter((f) => !f.curved);
  const find = (r: { normal: V3; point: V3 }) => {
    const n = v3(r.normal).normalize(), p = v3(r.point);
    let best: PlanarFace | null = null, bd = Infinity;
    for (const f of faces) {
      if (v3(f.normal).dot(n) < 0.99) continue;
      const d = v3(f.centroid).distanceTo(p);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  };
  const fa = find(refs[0]), fb = find(refs[1]);
  if (!fa || !fb) return { error: 'A selected face is no longer on the body.' };
  const n1 = v3(fa.normal).normalize(), n2 = v3(fb.normal).normalize();
  const dir = n1.clone().cross(n2);
  if (dir.length() < 1e-3) return { error: 'The two faces are parallel: select the faces on both sides of a bend.' };
  dir.normalize();
  const d1 = n1.dot(v3(fa.centroid)), d2 = n2.dot(v3(fb.centroid));
  const n12 = n1.dot(n2), den = 1 - n12 * n12;
  const p = n1.clone().multiplyScalar((d1 - d2 * n12) / den).addScaledVector(n2, (d2 - d1 * n12) / den);
  // the overlap of both faces along the line
  const pos = (geometry.index ? geometry.toNonIndexed() : geometry).getAttribute('position');
  const span = (f: PlanarFace): [number, number] => {
    let lo = Infinity, hi = -Infinity;
    for (const tri of f.triangles) {
      for (let k = 0; k < 3; k++) {
        const s = new THREE.Vector3().fromBufferAttribute(pos, tri * 3 + k).sub(p).dot(dir);
        lo = Math.min(lo, s);
        hi = Math.max(hi, s);
      }
    }
    return [lo, hi];
  };
  const [a0, a1] = span(fa), [b0, b1] = span(fb);
  const lo = Math.max(a0, b0), hi = Math.min(a1, b1);
  if (hi - lo < 1e-3) return { error: 'The two faces do not share a bend.' };
  return { p, dir, lo, hi, n1, n2 };
}

/** Sheet Metal Gusset: the material pressed into the inside of the bend (add) and the dent opened on the outside (cut). */
export function gussetTools(geometry: THREE.BufferGeometry, bodyId: string, i: GussetInput): { add: THREE.BufferGeometry; cut: THREE.BufferGeometry; centre: THREE.Vector3 } | { error: string } {
  const bl = bendLine(geometry, bodyId, i.faces);
  if ('error' in bl) return bl;
  const { p, dir, lo, hi, n1, n2 } = bl;
  const t = i.thickness, w = Math.max(2 * t + 0.1, i.width), d = Math.max(t * 2, i.depth);
  if (hi - lo < w) return { error: 'The gusset is wider than the bend.' };
  const s = i.offset === null ? (lo + hi) / 2 : Math.min(hi - w / 2, Math.max(lo + w / 2, lo + i.offset + w / 2));
  // along the faces away from the corner: on face A (normal n1) the direction is n2 projected into A
  const tA = n2.clone().addScaledVector(n1, -n1.dot(n2)).normalize();
  const tB = n1.clone().addScaledVector(n2, -n1.dot(n2)).normalize();
  const c = p.clone().addScaledVector(dir, s);
  // the triangle frame: u along tA, v the in-plane perpendicular (towards tB), w along the bend
  const u = tA.clone(), vv = dir.clone().cross(u).normalize();
  if (vv.dot(tB) < 0) vv.negate();
  const P2 = (q: THREE.Vector3): [number, number] => [q.clone().sub(c).dot(u), q.clone().sub(c).dot(vv)];
  const A = c.clone().addScaledVector(tA, d), B = c.clone().addScaledVector(tB, d);
  const outer: [number, number][] = [P2(c), P2(A), P2(B)];
  // the hollow: the same triangle with legs d - t*sqrt(2) (so the sloped wall is one thickness), its apex pushed through
  // the outer radius of the bend so the dent opens on the outside
  const ds = Math.max(0.5, d - t * Math.SQRT2);
  const apex = c.clone().addScaledVector(tA.clone().add(tB).normalize(), -(t + i.bendRadius) * 2.2);
  const inner: [number, number][] = [P2(apex), P2(c.clone().addScaledVector(tA, ds)), P2(c.clone().addScaledVector(tB, ds))];
  const add = prism(c, u, vv, dir, outer, -w / 2, w / 2);
  const cut = prism(c, u, vv, dir, inner, -w / 2 + t, w / 2 - t);
  if (!add || !cut) return { error: 'Could not build the gusset.' };
  const shift = n1.clone().add(n2).normalize().multiplyScalar(-EPS);
  add.translate(shift.x, shift.y, shift.z);
  if (i.flip) {
    // Flip: the gusset mirrored across the bend line (the form on the other side of the corner)
    const m = new THREE.Matrix4().makeBasis(u, vv, dir).setPosition(c);
    const inv = m.clone().invert();
    const flipM = m.clone().multiply(new THREE.Matrix4().makeScale(1, 1, -1)).multiply(inv);
    add.applyMatrix4(flipM);
    cut.applyMatrix4(flipM);
    add.computeVertexNormals();
    cut.computeVertexNormals();
  }
  return { add, cut, centre: c };
}

// ---------------------------------------------------------------------------------------------
// Tab and Slot
// ---------------------------------------------------------------------------------------------
export interface TabSlotInput {
  edge: EdgeRef;
  slotFace: { normal: V3; point: V3 };
  tabLength: number;
  /** tab height into the slot body (Link to thickness: the slot body's thickness) */
  tabHeight: number;
  count: number;
  /** distance of the first/last tab from the edge ends */
  edgeOffset: number;
  /** clearance of the slot around the tab (each side) */
  clearance: number;
  thickness: number;
}

/** Tab and Slot: the tabs along the edge (added to the edge's body) and the slots (cut from the slot face's body). */
export function tabSlotTools(edgeBody: THREE.BufferGeometry, edgeBodyId: string, i: TabSlotInput, slotExtent: number): { tabs: THREE.BufferGeometry; slots: THREE.BufferGeometry; positions: THREE.Vector3[] } | { error: string } {
  const r = edgeSheetFace(edgeBody, edgeBodyId, i.edge);
  if ('error' in r) return r;
  const { a, dir, n, out, e } = r;
  const L = Math.max(0.1, i.tabLength), H = Math.max(0.1, i.tabHeight), c = Math.max(0, i.clearance), t = i.thickness;
  const count = Math.max(1, Math.round(i.count));
  const off = Math.max(0, i.edgeOffset);
  const usable = e.length - 2 * off;
  // the tabs sit centred in equal pitches along the usable length (so neighbouring tabs never touch)
  const pitch = usable / count;
  if (pitch < L + 0.01) return { error: `${count} tab(s) of ${L} do not fit on an edge of ${e.length.toFixed(1)}.` };
  const starts: number[] = [];
  for (let k = 0; k < count; k++) starts.push(off + k * pitch + (pitch - L) / 2);
  const tabs: THREE.BufferGeometry[] = [], slots: THREE.BufferGeometry[] = [], positions: THREE.Vector3[] = [];
  // the slot body lies beyond the edge; its face normal points back towards the edge
  const sn = v3(i.slotFace.normal).normalize();
  const through = sn.dot(out) < 0 ? out.clone() : sn.clone().negate();
  for (const s of starts) {
    // the tab: the sheet continued past the edge by H (overlapping the sheet a little so it merges)
    tabs.push(intervalBox(a, dir, n, out, [s, s + L], [-t + EPS, -EPS], [-EPS, H]));
    slots.push(intervalBox(a, dir, n, through, [s - c, s + L + c], [-t - c, c], [-EPS, slotExtent]));
    positions.push(a.clone().addScaledVector(dir, s + L / 2).addScaledVector(n, -t / 2));
  }
  return { tabs: mergeGeometries(tabs), slots: mergeGeometries(slots), positions };
}

// ---------------------------------------------------------------------------------------------
// Rip
// ---------------------------------------------------------------------------------------------
export interface RipInput {
  edges: EdgeRef[];
  gap: number;
  /** which face is cut back: both sides, the first or the second face of the edge */
  direction: 'both' | 'first' | 'second';
  thickness: number;
}

/** Rip: the cut along the picked edges of a (shelled) solid that separates the two faces by the rip gap. */
export function ripTool(geometry: THREE.BufferGeometry, bodyId: string, i: RipInput): THREE.BufferGeometry | { error: string } {
  if (!i.edges.length) return { error: 'Select the edges to rip.' };
  const edges = bodyEdges(geometry, bodyId);
  const g = Math.max(0.01, i.gap), t = Math.max(0.1, i.thickness);
  const tools: THREE.BufferGeometry[] = [];
  for (const ref of i.edges) {
    const e = matchEdge(edges, ref);
    if (!e || !e.straight || e.points.length < 2) return { error: 'A selected edge no longer exists on the body (or is not straight).' };
    const seg = e.segments[0];
    const a = e.points[0].clone(), b = e.points[e.points.length - 1].clone();
    const dir = b.clone().sub(a).normalize();
    const n1 = seg.n1.clone().normalize(), n2 = seg.n2.clone().normalize();
    if (Math.abs(n1.dot(n2)) > 0.99) return { error: 'The faces at a selected edge are not at a corner.' };
    const len = a.distanceTo(b);
    const mid = a.clone().lerp(b, 0.5);
    // face A (normal n1) has its material at n1 in [-t, 0]; face B (normal n2) at n2 in [-t, 0]. Cutting a face back
    // by the gap: through its thickness, from the corner block to the gap beyond the other face's inner surface.
    const back = i.direction === 'both' ? g / 2 : g;
    const cutA = intervalBox(mid, dir, n1, n2, [-len / 2 - EPS, len / 2 + EPS], [-t - EPS, EPS], [-t - back, EPS]);
    const cutB = intervalBox(mid, dir, n2, n1, [-len / 2 - EPS, len / 2 + EPS], [-t - EPS, EPS], [-t - back, EPS]);
    if (i.direction === 'both') tools.push(csg(cutA, cutB, 'union'));
    else tools.push(i.direction === 'first' ? cutA : cutB);
  }
  return tools.length === 1 ? tools[0] : tools.reduce((acc, t) => csg(acc, t, 'union'));
}

// ---------------------------------------------------------------------------------------------
// Swept Flange
// ---------------------------------------------------------------------------------------------
/** Swept Flange: the open profile (thickened to the sheet) swept along the path. */
export function sweptFlangeRegions(profile: SketchPoint[], thickness: number, reverse: boolean): Region[] {
  return thinRegions([{ points: profile, closed: false }], { mode: 'one', thickness, reverse });
}

/** The polyline of one or more straight edges chained end to end (the path of a swept flange along the sheet). */
export function chainEdges(edges: BodyEdge[]): THREE.Vector3[] {
  if (!edges.length) return [];
  const pts = edges[0].points.map((p) => p.clone());
  const rest = edges.slice(1);
  const near = (a: THREE.Vector3, b: THREE.Vector3) => a.distanceTo(b) < TOL.reference;
  for (let guard = 0; rest.length && guard < 64; guard++) {
    const tail = pts[pts.length - 1], head = pts[0];
    const k = rest.findIndex((e) => near(e.points[0], tail) || near(e.points[e.points.length - 1], tail) || near(e.points[0], head) || near(e.points[e.points.length - 1], head));
    if (k < 0) break;
    const e = rest.splice(k, 1)[0];
    const ep = e.points.map((p) => p.clone());
    if (near(ep[0], tail)) pts.push(...ep.slice(1));
    else if (near(ep[ep.length - 1], tail)) pts.push(...ep.reverse().slice(1));
    else if (near(ep[ep.length - 1], head)) pts.unshift(...ep.slice(0, -1));
    else pts.unshift(...ep.reverse().slice(0, -1));
  }
  return pts;
}
