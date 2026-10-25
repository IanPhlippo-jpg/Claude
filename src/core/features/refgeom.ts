import * as THREE from 'three';
import type { PlaneDef, RefGeometry } from '../document/types';
import type { BodyEdge } from './edgesets';
import type { PlanarFace } from './solid';
import { circleOfEdge } from './thread';
import { cylinderAxis } from '../assembly/assembly';

/** What the user picked for a reference axis / point / coordinate system. */
export interface RefSelection {
  edges: BodyEdge[];
  faces: { face: PlanarFace; geometry: THREE.BufferGeometry }[];
  planes: PlaneDef[];
}

const V = (a: [number, number, number] | THREE.Vector3) => (a instanceof THREE.Vector3 ? a.clone() : new THREE.Vector3(...a));
const T = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];

/** The line of a straight edge, the axis of a circular edge or cylindrical face, or where two planes meet. */
function axisCandidate(sel: RefSelection): { origin: THREE.Vector3; dir: THREE.Vector3; how: string } | null {
  const straight = sel.edges.find((e) => e.straight);
  if (straight && straight.points.length >= 2) {
    const a = straight.points[0], b = straight.points[straight.points.length - 1];
    return { origin: a.clone().add(b).multiplyScalar(0.5), dir: b.clone().sub(a).normalize(), how: 'One Line/Edge/Axis' };
  }
  const round = sel.edges.find((e) => !e.straight);
  if (round) {
    const c = circleOfEdge(round.points);
    if (c) return { origin: c.center, dir: c.normal.clone().normalize(), how: 'Cylindrical/Conical Face' };
  }
  const cyl = sel.faces.find((f) => f.face.curved);
  if (cyl) {
    const ax = cylinderAxis(cyl.geometry, cyl.face.triangles);
    if (ax) return { origin: ax.point, dir: ax.dir.clone().normalize(), how: 'Cylindrical/Conical Face' };
  }
  const planes: { n: THREE.Vector3; o: THREE.Vector3 }[] = [
    ...sel.planes.map((p) => ({ n: V(p.n).normalize(), o: V(p.origin) })),
    ...sel.faces.filter((f) => !f.face.curved).map((f) => ({ n: V(f.face.normal).normalize(), o: V(f.face.centroid) })),
  ];
  if (planes.length >= 2) {
    const [p, q] = planes;
    const dir = p.n.clone().cross(q.n);
    if (dir.lengthSq() < 1e-10) return null;
    dir.normalize();
    // a point on both planes: solve with the third equation dir · x = 0
    const m = new THREE.Matrix3().set(p.n.x, p.n.y, p.n.z, q.n.x, q.n.y, q.n.z, dir.x, dir.y, dir.z);
    const rhs = new THREE.Vector3(p.n.dot(p.o), q.n.dot(q.o), 0);
    const origin = rhs.applyMatrix3(m.invert());
    return { origin, dir, how: 'Two Planes' };
  }
  return null;
}

/** The centre of an arc or circular edge, the centre of a face, or the midpoint of a straight edge. */
function pointCandidate(sel: RefSelection): { p: THREE.Vector3; how: string } | null {
  const round = sel.edges.find((e) => !e.straight);
  if (round) {
    const c = circleOfEdge(round.points);
    if (c) return { p: c.center, how: 'Arc Center' };
  }
  const face = sel.faces[0];
  if (face) return { p: V(face.face.centroid), how: 'Center of Face' };
  const straight = sel.edges.find((e) => e.straight);
  if (straight && straight.points.length >= 2) {
    const a = straight.points[0], b = straight.points[straight.points.length - 1];
    return { p: a.clone().add(b).multiplyScalar(0.5), how: 'Along Curve Distance (50%)' };
  }
  if (sel.planes.length >= 1 && sel.edges.length === 0) return { p: V(sel.planes[0].origin), how: 'Projection' };
  return null;
}

/** Build the reference entity of the given kind from the selection; null when the selection does not define one. */
export function refGeometryFrom(kind: RefGeometry['kind'], sel: RefSelection, id: string, name: string): RefGeometry | null {
  if (kind === 'axis') {
    const a = axisCandidate(sel);
    return a ? { id, name, kind, origin: T(a.origin), dir: T(a.dir), how: a.how } : null;
  }
  if (kind === 'point') {
    const p = pointCandidate(sel);
    return p ? { id, name, kind, origin: T(p.p), how: p.how } : null;
  }
  // coordinate system: origin at a point (or the model origin), X along a straight edge, Z along a face normal
  const p = pointCandidate({ ...sel, edges: sel.edges.filter((e) => !e.straight) });
  const origin = p?.p ?? new THREE.Vector3();
  const straight = sel.edges.find((e) => e.straight);
  const flat = sel.faces.find((f) => !f.face.curved);
  let z = flat ? V(flat.face.normal).normalize() : sel.planes[0] ? V(sel.planes[0].n).normalize() : new THREE.Vector3(0, 0, 1);
  let x = straight && straight.points.length >= 2 ? straight.points[straight.points.length - 1].clone().sub(straight.points[0]).normalize() : Math.abs(z.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  x = x.sub(z.clone().multiplyScalar(x.dot(z)));
  if (x.lengthSq() < 1e-10) x = Math.abs(z.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  x.normalize();
  const y = z.clone().cross(x).normalize();
  z = x.clone().cross(y).normalize();
  return { id, name, kind, origin: T(origin), x: T(x), y: T(y), z: T(z), how: p ? p.how : 'Origin' };
}

/** Polylines that draw a reference entity in the graphics area (axis: a long dashed line; point: a small star; csys: a triad). */
export function refGeometryLines(r: RefGeometry, size = 40): { points: THREE.Vector3[]; dashed?: boolean; color?: string }[] {
  const o = V(r.origin);
  if (r.kind === 'axis' && r.dir) {
    const d = V(r.dir).multiplyScalar(size * 1.5);
    return [{ points: [o.clone().sub(d), o.clone().add(d)], dashed: true }];
  }
  if (r.kind === 'point') {
    const s = size / 12;
    return [
      { points: [o.clone().add(new THREE.Vector3(-s, 0, 0)), o.clone().add(new THREE.Vector3(s, 0, 0))] },
      { points: [o.clone().add(new THREE.Vector3(0, -s, 0)), o.clone().add(new THREE.Vector3(0, s, 0))] },
      { points: [o.clone().add(new THREE.Vector3(0, 0, -s)), o.clone().add(new THREE.Vector3(0, 0, s))] },
    ];
  }
  const L = size / 2;
  return [
    { points: [o, o.clone().addScaledVector(V(r.x!), L)], color: '#d9363e' },
    { points: [o, o.clone().addScaledVector(V(r.y!), L)], color: '#3ba55d' },
    { points: [o, o.clone().addScaledVector(V(r.z!), L)], color: '#2f6fd6' },
  ];
}
