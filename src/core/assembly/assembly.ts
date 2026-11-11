import { documentForConfiguration } from '../document/configurations';
import * as THREE from 'three';
import type { Component, ComponentPattern, Document, Mate, MateRef } from '../document/types';
import type { Id } from '../sketch/types';
import { applyRoundFeature, featureGeometry, rebuildDocument, type Body, type RebuildResult } from '../features/rebuild';
import { holeTool } from '../features/pattern';
import { resolvePlaneDef } from '../features/planes';
import { isRoundFeature } from '../document/types';
import { beltPath } from './belt';
import { csg, meshVolume, planarFaces, THROUGH_ALL } from '../features/solid';
import { bodyEdges } from '../features/edgesets';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PlanarFace } from '../features/solid';
import type { BodyEdge } from '../features/edgesets';

/** Rigid transform of a component as a matrix. */
export function componentMatrix(c: Pick<Component, 'position' | 'rotation'>): THREE.Matrix4 {
  const q = new THREE.Quaternion(...c.rotation).normalize();
  return new THREE.Matrix4().compose(new THREE.Vector3(...c.position), q, new THREE.Vector3(1, 1, 1));
}

/** the image axes of a decal on a face with normal n (as the graphics area lays it: right along X, or -Z on faces facing X) */
function decalAxes(n: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
  const ref = Math.abs(n.x) > 0.9 ? new THREE.Vector3(0, 0, -Math.sign(n.x)) : new THREE.Vector3(1, 0, 0);
  const u = ref.addScaledVector(n, -ref.dot(n)).normalize();
  return [u, n.clone().cross(u).normalize()];
}
type PlacedDecal = NonNullable<Document['decals']>[number] & { bodies: string[] };
const placedDecals = new WeakMap<Component[], PlacedDecal[]>();
const NO_DECALS: PlacedDecal[] = [];
/**
 * The decals of the parts in an assembly: a part's decals show in every assembly that uses it. Each decal
 * moves with its component (face plane and image direction) and lies on that component's body only. One array per
 * component list, so the graphics area rebuilds the decal meshes only when the assembly changes.
 */
export function assemblyDecals(doc: Pick<Document, 'kind' | 'components'>): PlacedDecal[] {
  if (doc.kind !== 'assembly' || !doc.components?.length) return NO_DECALS;
  const hit = placedDecals.get(doc.components);
  if (hit) return hit;
  const out: PlacedDecal[] = [];
  for (const c of doc.components) {
    if (c.hidden || !c.part.decals?.length) continue;
    const m = componentMatrix(c), rot = new THREE.Matrix3().setFromMatrix4(m);
    for (const d of c.part.decals) {
      const n0 = new THREE.Vector3(...d.face.normal).normalize(), [u0, v0] = decalAxes(n0.clone());
      const r = (d.rotation * Math.PI) / 180;
      const uw = u0.multiplyScalar(Math.cos(r)).addScaledVector(v0, Math.sin(r)).applyMatrix3(rot);
      const n = n0.applyMatrix3(rot).normalize(), [a, b] = decalAxes(n.clone());
      const p = new THREE.Vector3(...d.face.point).applyMatrix4(m);
      out.push({ ...d, id: `${c.id}/${d.id}`, face: { normal: [n.x, n.y, n.z], point: [p.x, p.y, p.z] }, rotation: (Math.atan2(uw.dot(b), uw.dot(a)) * 180) / Math.PI, bodies: [c.id] });
    }
  }
  const res = out.length ? out : NO_DECALS;
  placedDecals.set(doc.components, res);
  return res;
}

export function matrixToTransform(m: THREE.Matrix4): { position: [number, number, number]; rotation: [number, number, number, number] } {
  const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  m.decompose(p, q, s);
  return { position: [p.x, p.y, p.z], rotation: [q.x, q.y, q.z, q.w] };
}

const V = (a: [number, number, number]) => new THREE.Vector3(...a);

/** A mate reference in world coordinates (normal/axis direction and a point). */
export function worldRef(ref: MateRef, comp: Pick<Component, 'position' | 'rotation'>): { n: THREE.Vector3; p: THREE.Vector3 } {
  const m = componentMatrix(comp);
  const rot = new THREE.Matrix3().setFromMatrix4(m);
  return { n: V(ref.normal).applyMatrix3(rot).normalize(), p: V(ref.point).applyMatrix4(m) };
}

/** World-frame face data converted to the component's local frame (for storing a mate reference). */
export function localRef(normal: THREE.Vector3, point: THREE.Vector3, comp: Pick<Component, 'position' | 'rotation'>): { normal: [number, number, number]; point: [number, number, number] } {
  const inv = componentMatrix(comp).invert();
  const rot = new THREE.Matrix3().setFromMatrix4(inv);
  const n = normal.clone().applyMatrix3(rot).normalize(), p = point.clone().applyMatrix4(inv);
  return { normal: [n.x, n.y, n.z], point: [p.x, p.y, p.z] };
}

/**
 * Axis of a cylindrical face from its facet planes: the axis direction is the direction all facet
 * normals are perpendicular to; a point on the axis is at equal distance r from every facet plane.
 */
export function cylinderAxis(g: THREE.BufferGeometry, triangles: number[]): { dir: THREE.Vector3; point: THREE.Vector3; radius: number } | null {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const P = (i: number) => new THREE.Vector3().fromBufferAttribute(a, i);
  const planes: { n: THREE.Vector3; p: THREE.Vector3; w: number }[] = [];
  const centroid = new THREE.Vector3();
  let wsum = 0;
  for (const t of triangles) {
    const p0 = P(t * 3), p1 = P(t * 3 + 1), p2 = P(t * 3 + 2);
    const n = p1.clone().sub(p0).cross(p2.clone().sub(p0));
    const area = n.length() / 2;
    if (area < 1e-9) continue;
    n.normalize();
    planes.push({ n, p: p0, w: area });
    centroid.addScaledVector(p0.clone().add(p1).add(p2).divideScalar(3), area);
    wsum += area;
  }
  if (planes.length < 3) return null;
  centroid.divideScalar(wsum);
  // axis: eigenvector of the smallest eigenvalue of the normal covariance (all normals ⟂ axis)
  const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const pl of planes) {
    const v = [pl.n.x, pl.n.y, pl.n.z];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += pl.w * v[i] * v[j];
  }
  const dir = smallestEigenvector(C);
  if (!dir) return null;
  // point on the axis and radius: n_i · x + r = n_i · p_i, minimised with a weak prior at the centroid (x along the axis is free)
  const A: number[][] = [], b: number[] = [];
  for (const pl of planes) {
    A.push([pl.n.x * pl.w, pl.n.y * pl.w, pl.n.z * pl.w, pl.w]);
    b.push(pl.n.dot(pl.p) * pl.w);
  }
  const w = 1e-4 * wsum;
  A.push([w, 0, 0, 0], [0, w, 0, 0], [0, 0, w, 0]);
  b.push(w * centroid.x, w * centroid.y, w * centroid.z);
  const x = leastSquares(A, b);
  if (!x) return null;
  const point = new THREE.Vector3(x[0], x[1], x[2]);
  // project onto the plane through the centroid perpendicular to the axis (a tidy representative point)
  point.addScaledVector(dir, centroid.clone().sub(point).dot(dir));
  return { dir, point, radius: Math.abs(x[3]) };
}

function smallestEigenvector(C: number[][]): THREE.Vector3 | null {
  // Jacobi eigen decomposition of a symmetric 3×3
  const a = C.map((r) => r.slice());
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) off += a[p][q] * a[p][q];
    if (off < 1e-20) break;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) {
      if (Math.abs(a[p][q]) < 1e-30) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const cs = 1 / Math.sqrt(t * t + 1), sn = t * cs;
      for (let k = 0; k < 3; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = cs * akp - sn * akq; a[k][q] = sn * akp + cs * akq; }
      for (let k = 0; k < 3; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = cs * apk - sn * aqk; a[q][k] = sn * apk + cs * aqk; }
      for (let k = 0; k < 3; k++) { const vkp = v[k][p], vkq = v[k][q]; v[k][p] = cs * vkp - sn * vkq; v[k][q] = sn * vkp + cs * vkq; }
    }
  }
  let best = 0;
  for (let i = 1; i < 3; i++) if (a[i][i] < a[best][best]) best = i;
  // the smallest must be clearly smaller than the next (a sphere or plane has no axis)
  const vals = [a[0][0], a[1][1], a[2][2]].sort((x, y) => x - y);
  if (vals[1] < 1e-9 || vals[0] > 0.2 * vals[1]) return null;
  return new THREE.Vector3(v[0][best], v[1][best], v[2][best]).normalize();
}

/** least squares x = argmin |A x - b| (normal equations, 4 unknowns) */
function leastSquares(A: number[][], b: number[]): number[] | null {
  const n = A[0].length;
  const M = Array.from({ length: n }, () => new Array(n + 1).fill(0));
  for (let r = 0; r < A.length; r++) for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) M[i][j] += A[r][i] * A[r][j];
    M[i][n] += A[r][i] * b[r];
  }
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-14) return null;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/** Minimal rotation taking a to b (unit vectors). */
const rotationBetween = (a: THREE.Vector3, b: THREE.Vector3) => new THREE.Quaternion().setFromUnitVectors(a.clone().normalize(), b.clone().normalize());

/** Rotate a component about a world point. */
function rotateAbout(comp: Component, q: THREE.Quaternion, pivot: THREE.Vector3): Component {
  const m = componentMatrix(comp);
  const r = new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
  return { ...comp, ...matrixToTransform(r.multiply(m)) };
}

function translate(comp: Component, d: THREE.Vector3): Component {
  return { ...comp, position: [comp.position[0] + d.x, comp.position[1] + d.y, comp.position[2] + d.z] };
}

/**
 * Satisfy one mate by moving `mov` (the component of refs[movIdx]) relative to the other one.
 * Returns the moved component; the fixed one is untouched.
 */
export function solveMate(mate: Mate, fixed: Component, mov: Component, movIdx: 0 | 1, lookup?: (id: string) => Component | undefined): Component {
  const rf = mate.refs[movIdx === 0 ? 1 : 0], rm = mate.refs[movIdx];
  const F = worldRef(rf, fixed);
  let out = mov;
  const M = () => worldRef(rm, out);
  const alignDir = (target: THREE.Vector3) => {
    const cur = M();
    const q = rotationBetween(cur.n, target);
    out = rotateAbout(out, q, cur.p);
  };
  switch (mate.type) {
    case 'coincident':
    case 'distance': {
      // faces: anti-aligned by default (normals opposite), planes/origins aligned
      const anti = mate.aligned ? false : true;
      alignDir(anti ? F.n.clone().negate() : F.n.clone());
      const cur = M();
      const d = mate.type === 'distance' ? (mate.flip ? -(mate.value ?? 0) : mate.value ?? 0) : 0;
      // the moving face lies d along the fixed normal
      const gap = cur.p.clone().sub(F.p).dot(F.n) - d;
      out = translate(out, F.n.clone().multiplyScalar(-gap));
      break;
    }
    case 'parallel': {
      const cur = M();
      alignDir(cur.n.dot(F.n) < 0 ? F.n.clone().negate() : F.n.clone());
      break;
    }
    case 'perpendicular': {
      const cur = M();
      // remove the component of the moving normal along the fixed normal
      const target = cur.n.clone().addScaledVector(F.n, -cur.n.dot(F.n));
      if (target.lengthSq() < 1e-9) target.copy(new THREE.Vector3(1, 0, 0).cross(F.n).lengthSq() > 1e-6 ? new THREE.Vector3(1, 0, 0).cross(F.n) : new THREE.Vector3(0, 1, 0).cross(F.n));
      alignDir(target.normalize());
      break;
    }
    case 'angle': {
      const cur = M();
      const ang = ((mate.value ?? 0) * Math.PI) / 180;
      const axis = cur.n.clone().cross(F.n);
      if (axis.lengthSq() < 1e-9) axis.copy(Math.abs(F.n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).cross(F.n);
      axis.normalize();
      const target = F.n.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis, ang));
      alignDir(target);
      break;
    }
    case 'concentric': {
      const cur = M();
      const target = cur.n.dot(F.n) < 0 && !mate.aligned ? F.n.clone().negate() : F.n.clone();
      alignDir(mate.aligned ? F.n.clone() : target);
      // Lock rotation: the turn about the shaft stays as it was when the mate was made (base: both components then)
      if (mate.lockRotation && mate.base) {
        const qa = new THREE.Quaternion(...mate.base.a.rotation), qb = new THREE.Quaternion(...mate.base.b.rotation);
        const rel = qa.clone().invert().multiply(qb);
        const qf = new THREE.Quaternion(...fixed.rotation);
        const q = movIdx === 1 ? qf.multiply(rel) : qf.multiply(rel.invert());
        out = { ...out, rotation: [q.x, q.y, q.z, q.w] };
      }
      const c2 = M();
      // move the moving axis point onto the fixed axis line (perpendicular to the axis)
      const d = F.p.clone().sub(c2.p);
      d.addScaledVector(F.n, -d.dot(F.n));
      out = translate(out, d);
      break;
    }
    case 'tangent': {
      // plane ↔ cylinder: the cylinder axis parallel to the plane at distance r; cylinder ↔ cylinder: axes parallel at r1 + r2
      const cur = M();
      if (rf.cylindrical && rm.cylindrical) {
        alignDir(cur.n.dot(F.n) < 0 ? F.n.clone().negate() : F.n.clone());
        const c2 = M();
        const d = F.p.clone().sub(c2.p);
        d.addScaledVector(F.n, -d.dot(F.n));
        const want = (rf.radius ?? 0) + (rm.radius ?? 0);
        const len = d.length();
        if (len > 1e-9) out = translate(out, d.multiplyScalar((len - want) / len));
      } else {
        const planeRef = rf.cylindrical ? rm : rf;
        const plane = rf.cylindrical ? cur : F;
        const cyl = rf.cylindrical ? F : cur;
        if (!rf.cylindrical) {
          // moving part is the cylinder: axis perpendicular to the plane normal
          const target = cyl.n.clone().addScaledVector(plane.n, -cyl.n.dot(plane.n));
          if (target.lengthSq() > 1e-9) alignDir(target.normalize());
          const c2 = M();
          const gap = c2.p.clone().sub(plane.p).dot(plane.n) - (rm.radius ?? 0);
          out = translate(out, plane.n.clone().multiplyScalar(-gap));
        } else {
          // moving part is the plane: its normal perpendicular to the axis, at distance r from the axis
          const target = plane.n.clone().addScaledVector(cyl.n, -plane.n.dot(cyl.n));
          if (target.lengthSq() > 1e-9) alignDir(target.normalize());
          const c2 = M();
          const gap = cyl.p.clone().sub(c2.p).dot(c2.n) - (rf.radius ?? 0);
          out = translate(out, c2.n.clone().multiplyScalar(gap));
        }
        void planeRef;
      }
      break;
    }
    case 'profileCenter': {
      // coincident faces with their centres on one line through the fixed face's centre
      alignDir(mate.aligned ? F.n.clone() : F.n.clone().negate());
      const cur = M();
      out = translate(out, F.p.clone().sub(cur.p));
      break;
    }
    case 'symmetric': {
      const pr = mate.extra?.[0];
      const owner = pr ? (pr.componentId === fixed.id ? fixed : pr.componentId === mov.id ? out : lookup?.(pr.componentId)) : undefined;
      if (!pr || !owner) break;
      const P = worldRef(pr, owner);
      const n = P.n.clone().normalize();
      const reflect = (v: THREE.Vector3) => v.clone().addScaledVector(n, -2 * v.dot(n));
      const tp = reflect(F.p.clone().sub(P.p)).add(P.p);
      const tn = reflect(F.n.clone());
      const cur = M();
      alignDir(cur.n.dot(tn) < 0 ? tn.clone().negate() : tn);
      const c2 = M();
      if (rm.cylindrical) {
        const d = tp.clone().sub(c2.p);
        d.addScaledVector(tn, -d.dot(tn));
        out = translate(out, d);
      } else out = translate(out, tn.clone().multiplyScalar(tp.clone().sub(c2.p).dot(tn)));
      break;
    }
    case 'width':
    case 'slot': {
      // the moving part (tab or pin) centred between two faces of the other one
      const e = mate.extra ?? [];
      const w2 = e[0];
      if (!w2) break;
      const W2 = worldRef(w2, fixed);
      const n = F.n.clone().normalize();
      const mid = F.p.clone().add(W2.p).multiplyScalar(0.5);
      if (mate.type === 'width') {
        const t2 = e[1];
        if (!t2) break;
        const cur = M();
        alignDir(cur.n.dot(n) < 0 ? n.clone().negate() : n.clone());
        const T1 = M(), T2 = worldRef(t2, out);
        const tmid = T1.p.clone().add(T2.p).multiplyScalar(0.5);
        out = translate(out, n.clone().multiplyScalar(mid.clone().sub(tmid).dot(n)));
      } else {
        // slot: the pin axis lies in the middle plane of the slot, square to the slot sides
        const cur = M();
        const target = cur.n.clone().addScaledVector(n, -cur.n.dot(n));
        if (target.lengthSq() > 1e-9) alignDir(target.normalize());
        const c2 = M();
        out = translate(out, n.clone().multiplyScalar(mid.clone().sub(c2.p).dot(n)));
      }
      break;
    }
    case 'path': {
      // the moving reference point runs along the fixed line (a cylinder axis or a face normal line) at a distance
      const cur = M();
      const dir = F.n.clone().normalize();
      const target = F.p.clone().addScaledVector(dir, mate.value ?? 0);
      out = translate(out, target.sub(cur.p));
      break;
    }
    case 'distanceLimit':
    case 'angleLimit': {
      if (mate.type === 'distanceLimit') {
        alignDir(mate.aligned ? F.n.clone() : F.n.clone().negate());
        const cur = M();
        const gap = cur.p.clone().sub(F.p).dot(F.n);
        const lo = mate.min ?? 0, hi = mate.max ?? lo;
        const want = Math.min(hi, Math.max(lo, gap));
        out = translate(out, F.n.clone().multiplyScalar(want - gap));
      } else {
        const cur = M();
        const ang = (Math.acos(Math.max(-1, Math.min(1, cur.n.dot(F.n)))) * 180) / Math.PI;
        const lo = mate.min ?? 0, hi = mate.max ?? 180;
        const want = Math.min(hi, Math.max(lo, ang));
        if (Math.abs(want - ang) > 1e-6) {
          const axis = cur.n.clone().cross(F.n);
          if (axis.lengthSq() < 1e-9) axis.copy(Math.abs(F.n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).cross(F.n);
          axis.normalize();
          alignDir(F.n.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis, (-want * Math.PI) / 180)));
        }
      }
      break;
    }
    case 'cam': {
      // follower against a round cam: tangent, as the tangent mate
      return solveMate({ ...mate, type: 'tangent' }, fixed, mov, movIdx, lookup);
    }
    case 'hinge': {
      out = solveMate({ ...mate, type: 'concentric' }, fixed, out, movIdx, lookup);
      const e = mate.extra ?? [];
      if (e.length >= 2) out = solveMate({ ...mate, type: 'coincident', refs: [e[0], e[1]], extra: undefined }, fixed, out, movIdx, lookup);
      break;
    }
    case 'gear':
    case 'rackPinion':
    case 'screw':
    case 'universalJoint':
    case 'linearCoupler': {
      if (!mate.base) break;
      const baseOf = (idx: 0 | 1) => (idx === 0 ? mate.base!.a : mate.base!.b);
      const drvIdx: 0 | 1 = movIdx === 0 ? 1 : 0;
      const drvBase = baseOf(drvIdx), movBase = baseOf(movIdx);
      const drvAxis = worldRef(rf, { position: drvBase.position, rotation: drvBase.rotation });
      const movAxis0 = worldRef(rm, { position: movBase.position, rotation: movBase.rotation });
      // how far the driver turned (about its own axis) or moved (along its direction) since the mate was made
      const qNow = new THREE.Quaternion(...fixed.rotation), q0 = new THREE.Quaternion(...drvBase.rotation);
      const dq = qNow.clone().multiply(q0.clone().invert());
      const ang = 2 * Math.atan2(new THREE.Vector3(dq.x, dq.y, dq.z).dot(drvAxis.n), dq.w);
      const moved = new THREE.Vector3(...fixed.position).sub(new THREE.Vector3(...drvBase.position)).dot(drvAxis.n);
      // the ratio is the second reference's motion per motion of the first; the first one driven by the second takes 1/ratio
      const ratio = movIdx === 1 ? mate.ratio ?? 1 : 1 / (mate.ratio || 1);
      let next: Component = { ...out, position: [...movBase.position] as [number, number, number], rotation: [...movBase.rotation] as [number, number, number, number] };
      if (mate.type === 'gear' || mate.type === 'universalJoint') {
        const turn = mate.type === 'gear' ? -ratio * ang : ang;
        next = rotateAbout(next, new THREE.Quaternion().setFromAxisAngle(movAxis0.n, turn), movAxis0.p);
      } else if (mate.type === 'rackPinion') {
        // the rack travels pitch per revolution of the pinion (the round reference); either one drives the other
        const pinionMoves = !!rm.cylindrical && !rf.cylindrical;
        const per = mate.pitch ?? 2 * Math.PI * ((pinionMoves ? rm.radius : rf.radius) ?? 10);
        if (pinionMoves) next = rotateAbout(next, new THREE.Quaternion().setFromAxisAngle(movAxis0.n, (2 * Math.PI * moved) / per), movAxis0.p);
        else next = translate(next, movAxis0.n.clone().multiplyScalar((per * ang) / (2 * Math.PI)));
      } else if (mate.type === 'screw') {
        out = solveMate({ ...mate, type: 'concentric' }, fixed, out, movIdx, lookup);
        const qm = new THREE.Quaternion(...out.rotation).multiply(new THREE.Quaternion(...movBase.rotation).invert());
        const own = 2 * Math.atan2(new THREE.Vector3(qm.x, qm.y, qm.z).dot(movAxis0.n), qm.w);
        // the moving part goes along with the driver's shift along the axis, plus pitch per turn of the one against the other
        const axial = moved * drvAxis.n.dot(movAxis0.n) + ((mate.pitch ?? 1) * (own - ang)) / (2 * Math.PI);
        const cur = new THREE.Vector3(...out.position).sub(new THREE.Vector3(...movBase.position)).dot(movAxis0.n);
        out = translate(out, movAxis0.n.clone().multiplyScalar(axial - cur));
        break;
      } else {
        next = translate(next, movAxis0.n.clone().multiplyScalar(ratio * moved));
      }
      out = next;
      break;
    }
    case 'lock': {
      if (mate.relative) {
        const rel = componentMatrix(mate.relative);
        const base = componentMatrix(fixed);
        const m = movIdx === 1 ? base.clone().multiply(rel) : base.clone().multiply(rel.clone().invert());
        out = { ...out, ...matrixToTransform(m) };
      }
      break;
    }
  }
  return out;
}

/** which side of a mate moves when the other stays (the one further from the fixed components; as in solveMates) */
export function movingSide(a: Component, b: Component, ground: Map<Id, number>): 0 | 1 {
  if (a.fixed && !b.fixed) return 1;
  if (b.fixed && !a.fixed) return 0;
  return (ground.get(a.id) ?? Infinity) > (ground.get(b.id) ?? Infinity) ? 0 : 1;
}

/** hops from a fixed component over the mates, in both directions (unreachable: no entry) */
export function groundDistance(components: Component[], mates: Mate[]): Map<Id, number> {
  const d = new Map<Id, number>();
  const queue: Id[] = [];
  for (const c of components) if (c.fixed) { d.set(c.id, 0); queue.push(c.id); }
  const next = new Map<Id, Id[]>();
  for (const m of mates) {
    if (m.suppressed) continue;
    const [x, y] = [m.refs[0].componentId, m.refs[1].componentId];
    next.set(x, [...(next.get(x) ?? []), y]);
    next.set(y, [...(next.get(y) ?? []), x]);
  }
  while (queue.length) {
    const id = queue.shift()!;
    for (const o of next.get(id) ?? []) if (!d.has(o)) { d.set(o, d.get(id)! + 1); queue.push(o); }
  }
  return d;
}

/** the passes the solver makes over the mates before it stops; mateStatus says when they were not enough (F166) */
export const MATE_PASSES = 16;
/** the passes after which a solver that still moves parts by more than a micron per pass has mates that conflict */
const CONFLICT_PASSES = 128;

/**
 * passes over the mates; `last` is the largest move of the last pass made (0 once nothing moves any more), `prev` the
 * one of the pass before it (their ratio says whether the passes still contract or go back and forth)
 */
function runPasses(components: Component[], mates: Mate[], passes: number): { out: Component[]; last: number; prev: number; made: number } {
  const byId = new Map(components.map((c) => [c.id, { ...c }]));
  const ground = groundDistance(components, mates.filter((m) => !m.suppressed));
  const far = (m: Mate) => Math.max(ground.get(m.refs[0].componentId) ?? Infinity, ground.get(m.refs[1].componentId) ?? Infinity);
  const active = mates.filter((m) => !m.suppressed).sort((x, y) => far(x) - far(y));
  let last = passes > 0 ? Infinity : 0, prev = Infinity, made = 0;
  for (let pass = 0; pass < passes; pass++) {
    prev = last;
    made++;
    last = 0;
    for (const m of active) {
      const a = byId.get(m.refs[0].componentId), b = byId.get(m.refs[1].componentId);
      if (!a || !b || a === b || (a.fixed && b.fixed)) continue;
      const idx = movingSide(a, b, ground);
      const fixed = idx === 1 ? a : b, mov = idx === 1 ? b : a;
      const next = solveMate(m, fixed, mov, idx, (id) => byId.get(id));
      const delta = Math.hypot(next.position[0] - mov.position[0], next.position[1] - mov.position[1], next.position[2] - mov.position[2]) + Math.abs(1 - Math.abs(next.rotation[0] * mov.rotation[0] + next.rotation[1] * mov.rotation[1] + next.rotation[2] * mov.rotation[2] + next.rotation[3] * mov.rotation[3]));
      if (delta > 1e-7) last = Math.max(last, delta);
      byId.set(mov.id, next);
    }
    if (!last) break;
  }
  return { out: components.map((c) => byId.get(c.id)!), last, prev, made };
}

/**
 * What the solver itself found (QA 0.5.13 F186), so the mate status needs no solve of its own:
 *   settled   the passes stopped: nothing moved any more, or less than a micron per pass after the extra passes
 *   conflict  the mate the solver had to leave out before the others settled (the newest of the last eight that
 *             makes the difference); null when it settled with every mate or found no single mate to blame
 *   rate      the largest move of the last pass over the one before: below 1 the passes still contract (a long chain
 *             that needs more passes), about 1 they go back and forth (mates that cannot all be met)
 */
export interface MateSolveReport {
  out: Component[];
  settled: boolean;
  conflict: Id | null;
  passes: number;
  last: number;
  rate: number;
}

/** the move ratio between two passes above which the passes no longer contract: they go back and forth */
export const CYCLING_RATE = 0.9;

export function solveMatesReport(components: Component[], mates: Mate[], passes = MATE_PASSES): MateSolveReport {
  const report = (r: { out: Component[]; last: number; prev: number }, made: number, conflict: Id | null = null): MateSolveReport => ({ out: r.out, settled: r.last < 1e-3 && Number.isFinite(r.last), conflict, passes: made, last: r.last, rate: Number.isFinite(r.prev) && r.prev > 0 ? r.last / r.prev : r.last > 0 ? 1 : 0 });
  const first = runPasses(components, mates, passes);
  if (!first.last || passes < MATE_PASSES) return { ...report(first, first.made), settled: first.last === 0 && first.made > 0 };
  // still moving: a long chain settles with more passes, mates that conflict never do
  const more = runPasses(first.out, mates, CONFLICT_PASSES);
  if (more.last < 1e-3) return report(more, first.made + more.made);
  const active = mates.filter((m) => !m.suppressed);
  for (let i = active.length - 1; i >= Math.max(0, active.length - 8); i--) {
    const without = runPasses(components, mates.filter((m) => m !== active[i]), CONFLICT_PASSES);
    if (!without.last) return report(without, first.made + more.made + without.made, active[i].id);
  }
  return report(more, first.made + more.made);
}

/**
 * All mates of an assembly, solved by moving the free components. Per mate the component further from the fixed
 * ones moves and the nearer one stays, whichever reference was picked first (QA v0.5.1 F109: a free part picked as the
 * first reference was never moved); the mates nearest the fixed components go first, and the passes repeat until
 * nothing moves any more.
 * Mates that conflict keep moving the parts back and forth: then the older mates hold and the newest mate that cannot
 * be met is left unmet, the one mateStatus marks (QA 0.5.11 F141: the part followed the newest, marked mate and the
 * older mate, shown as met, was not).
 */
export function solveMates(components: Component[], mates: Mate[], passes = MATE_PASSES): Component[] {
  return solveMatesReport(components, mates, passes).out;
}

// ---------- rebuild ----------

const partCache = new WeakMap<Document, RebuildResult>();

/** the exact (B-rep) rebuild of a part replaces its mesh rebuild in the cache (docs/14); the next assembly rebuild uses it */
export function setPartRebuild(part: Document, r: RebuildResult): void {
  partCache.set(part, r);
}

/** Rebuild of a part document, cached by document identity (documents are immutable). */
export function partRebuild(part: Document): RebuildResult {
  let r = partCache.get(part);
  if (!r) {
    r = rebuildDocument(part, null);
    partCache.set(part, r);
  }
  return r;
}

function transformFace(f: PlanarFace, m: THREE.Matrix4, rot: THREE.Matrix3, bodyId: string): PlanarFace {
  const n = V(f.normal).applyMatrix3(rot).normalize(), c = V(f.centroid).applyMatrix4(m);
  return { ...f, id: f.id.replace(/^[^:]+/, bodyId), normal: [n.x, n.y, n.z], centroid: [c.x, c.y, c.z] };
}

function transformEdge(e: BodyEdge, m: THREE.Matrix4, rot: THREE.Matrix3, bodyId: string): BodyEdge {
  return {
    ...e,
    id: e.id.replace(/^[^:]+/, bodyId),
    points: e.points.map((p) => p.clone().applyMatrix4(m)),
    centroid: e.centroid.clone().applyMatrix4(m),
    segments: e.segments.map((s) => ({ a: s.a.clone().applyMatrix4(m), b: s.b.clone().applyMatrix4(m), n1: s.n1.clone().applyMatrix3(rot).normalize(), n2: s.n2.clone().applyMatrix3(rot).normalize() })),
  };
}

export interface PatternInstance {
  id: string;
  name: string;
  patternId: Id;
  seedId: Id;
  matrix: THREE.Matrix4;
}

export interface AssemblyRebuild extends RebuildResult {
  /** solved component transforms (mates applied) */
  components: Component[];
  /** instances of the component patterns (bodies with these ids are in `bodies`) */
  patternInstances: PatternInstance[];
  /** what the mate solver found, with the document's components and mates it solved (mateStatus reads it, F186) */
  mateReport?: MateSolveReport & { from: { components: Document['components']; mates: Document['mates'] } };
}

/** World transforms of a pattern's instances (the seed itself excluded), applied before the seed's own transform. */
export function patternOffsets(p: ComponentPattern): THREE.Matrix4[] {
  const out: THREE.Matrix4[] = [];
  if (p.kind === 'linear') {
    const d1 = new THREE.Vector3(...p.dir).normalize();
    const d2 = p.dir2 ? new THREE.Vector3(...p.dir2).normalize() : null;
    const n2 = d2 ? Math.max(1, p.count2 ?? 1) : 1;
    for (let j = 0; j < n2; j++) {
      for (let i = 0; i < Math.max(1, p.count); i++) {
        if (i === 0 && j === 0) continue;
        const t = d1.clone().multiplyScalar(p.spacing * i);
        if (d2) t.addScaledVector(d2, (p.spacing2 ?? 0) * j);
        out.push(new THREE.Matrix4().makeTranslation(t.x, t.y, t.z));
      }
    }
    return out;
  }
  const axis = new THREE.Vector3(...p.dir).normalize();
  const o = new THREE.Vector3(...(p.axisPoint ?? [0, 0, 0]));
  const n = Math.max(1, p.count);
  const total = p.angle ?? 360;
  const step = p.equal !== false ? (Math.abs(total - 360) < 1e-9 ? total / n : total / Math.max(1, n - 1)) : total;
  for (let i = 1; i < n; i++) {
    const r = new THREE.Matrix4().makeRotationAxis(axis, (step * i * Math.PI) / 180);
    out.push(new THREE.Matrix4().makeTranslation(o.x, o.y, o.z).multiply(r).multiply(new THREE.Matrix4().makeTranslation(-o.x, -o.y, -o.z)));
  }
  return out;
}

/** the reflection of an opposite-hand component (identity otherwise), applied before the placement */
function handMatrix(c: Component): THREE.Matrix4 | null {
  if (!c.mirror) return null;
  const n = new THREE.Vector3(...c.mirror).normalize();
  return new THREE.Matrix4().set(1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.z, 0, -2 * n.y * n.x, 1 - 2 * n.y * n.y, -2 * n.y * n.z, 0, -2 * n.z * n.x, -2 * n.z * n.y, 1 - 2 * n.z * n.z, 0, 0, 0, 0, 1);
}

/** a mirrored triangle list has its winding reversed: swap two corners of every triangle so the faces look out again */
function flipWinding(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(ng.attributes)) {
    const a = ng.getAttribute(name) as THREE.BufferAttribute;
    const k = a.itemSize, arr = a.array as Float32Array;
    for (let t = 0; t + 2 < a.count; t += 3) for (let j = 0; j < k; j++) {
      const i1 = (t + 1) * k + j, i2 = (t + 2) * k + j;
      const tmp = arr[i1]; arr[i1] = arr[i2]; arr[i2] = tmp;
    }
    a.needsUpdate = true;
  }
  return ng;
}

/** A multibody part as one component body: the visible bodies merged (faces and edges recomputed on the merge). */
const mergedCache = new WeakMap<RebuildResult, Body | null>();
export function componentBody(r: RebuildResult): Body | null {
  const visible = r.bodies.filter((b) => !(r.autoHidden ?? []).includes(b.id));
  if (visible.length <= 1) return visible[0] ?? r.bodies[0] ?? null;
  const hit = mergedCache.get(r);
  if (hit !== undefined) return hit;
  let out: Body | null = null;
  try {
    const g = mergeGeometries(visible.map((b) => { const x = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry.clone(); for (const k of Object.keys(x.attributes)) if (k !== 'position' && k !== 'normal') x.deleteAttribute(k); if (!x.getAttribute('normal')) x.computeVertexNormals(); return x; }), false);
    if (g) out = { id: 'merged', geometry: g, faces: planarFaces(g, 'merged'), edges: bodyEdges(g, 'merged'), featureIds: visible.flatMap((b) => b.featureIds) };
  } catch {
    out = null;
  }
  mergedCache.set(r, out ?? visible[0]);
  return out ?? visible[0];
}

/** World bodies of an assembly: every component's part rebuilt (cached), mates solved, geometry transformed. */
export function rebuildAssembly(doc: Document): AssemblyRebuild {
  const errors: Record<string, string> = {};
  const comps0 = (doc.components ?? []).filter((c) => !c.suppressed);
  const mateReport = solveMatesReport(comps0, doc.mates ?? []);
  const components = mateReport.out;
  const bodies: Body[] = [];
  const curves: { id: string; name: string; points: THREE.Vector3[]; dashed?: boolean }[] = [];
  // Exploded View: every step adds its offset to its components (display only; the solved transforms stay)
  const offsets = new Map<string, THREE.Vector3>();
  // rotation steps: per component the rotations about the step direction (applied about its centre)
  const turns = new Map<string, THREE.Quaternion>();
  if (doc.exploded) {
    for (const step of doc.explodeSteps ?? []) {
      const dir = new THREE.Vector3(...step.dir).normalize();
      const d = dir.clone().multiplyScalar(step.distance * (doc.explodeFactor ?? 1));
      step.componentIds.forEach((id, i) => {
        // Auto-space: every next component of the step one more distance further along the direction
        offsets.set(id, (offsets.get(id) ?? new THREE.Vector3()).addScaledVector(d, step.autoSpace ? i + 1 : 1));
        if (step.angle) turns.set(id, new THREE.Quaternion().setFromAxisAngle(dir, (step.angle * (doc.explodeFactor ?? 1) * Math.PI) / 180).multiply(turns.get(id) ?? new THREE.Quaternion()));
      });
    }
  }
  for (const c0 of components) {
    const off = offsets.get(c0.id);
    const r = partRebuild(documentForConfiguration(c0.part, c0.configuration));
    const src = componentBody(r);
    let c = off ? { ...c0, position: [c0.position[0] + off.x, c0.position[1] + off.y, c0.position[2] + off.z] as [number, number, number] } : c0;
    const turn = turns.get(c0.id);
    if (turn && src) {
      // rotate about the component's centre: p' = centre + q (p - centre)
      src.geometry.computeBoundingBox();
      const centre = src.geometry.boundingBox!.getCenter(new THREE.Vector3()).applyMatrix4(componentMatrix(c));
      const p = new THREE.Vector3(...c.position).sub(centre).applyQuaternion(turn).add(centre);
      const q = turn.clone().multiply(new THREE.Quaternion(...c.rotation));
      c = { ...c, position: [p.x, p.y, p.z], rotation: [q.x, q.y, q.z, q.w] };
    }
    if (c.hidden) continue;
    for (const [id, err] of Object.entries(r.errors)) errors[`${c.id}:${id}`] = `${c.name}: ${err}`;
    if (!src) continue;
    const hand = handMatrix(c);
    const m = hand ? componentMatrix(c).multiply(hand) : componentMatrix(c);
    const rot = new THREE.Matrix3().setFromMatrix4(m);
    const g0 = src.geometry.clone().applyMatrix4(m);
    const g = hand ? flipWinding(g0) : g0;
    bodies.push({ id: c.id, geometry: g, faces: src.faces.map((f) => transformFace(f, m, rot, c.id)), edges: src.edges.map((e) => transformEdge(e, m, rot, c.id)), featureIds: [c.id], ...(src.exact ? { exact: true, exactVolume: src.exactVolume } : {}) });
    // explode line: from the assembled to the exploded position of the component's centre (dashed, by design)
    if (off && off.lengthSq() > 1e-9 && !(doc.explodeSteps ?? []).some((s) => s.componentIds.includes(c.id) && s.angle && !s.distance)) {
      src.geometry.computeBoundingBox();
      const centre = src.geometry.boundingBox!.getCenter(new THREE.Vector3());
      const from = centre.clone().applyMatrix4(componentMatrix(c0));
      curves.push({ id: 'explode-' + c.id, name: `ExplodeLine (${c.name})`, points: [from, from.clone().add(off)], dashed: true });
    }
  }
  // Component patterns: every instance is the seed's body moved by the pattern offset
  const patternInstances: PatternInstance[] = [];
  const counters = new Map<string, number>();
  const baseName = (n: string) => n.replace(/<\d+>$/, '');
  for (const c of doc.components ?? []) {
    const k = baseName(c.name), m = /<(\d+)>$/.exec(c.name);
    counters.set(k, Math.max(counters.get(k) ?? 0, m ? Number(m[1]) : 0));
  }
  for (const p of doc.componentPatterns ?? []) {
    if (p.suppressed) continue;
    const offs = patternOffsets(p);
    for (const seedId of p.seeds) {
      const seed = components.find((c) => c.id === seedId);
      if (!seed) continue;
      const k = baseName(seed.name);
      const r = partRebuild(documentForConfiguration(seed.part, seed.configuration));
      const src = componentBody(r);
      offs.forEach((off, i) => {
        if (p.skip?.includes(i + 1)) return;
        const n = (counters.get(k) ?? 0) + 1;
        counters.set(k, n);
        const id = `${p.id}~${seedId}~${i + 1}`;
        const hand = handMatrix(seed);
        const m = off.clone().multiply(hand ? componentMatrix(seed).multiply(hand) : componentMatrix(seed));
        patternInstances.push({ id, name: `${k}<${n}>`, patternId: p.id, seedId, matrix: m });
        if (!src || seed.hidden) return;
        const rot = new THREE.Matrix3().setFromMatrix4(m);
        bodies.push({ id, geometry: hand ? flipWinding(src.geometry.clone().applyMatrix4(m)) : src.geometry.clone().applyMatrix4(m), faces: src.faces.map((f) => transformFace(f, m, rot, id)), edges: src.edges.map((e) => transformEdge(e, m, rot, id)), featureIds: [p.id] });
      });
    }
  }
  // Assembly Features ▸ Extruded Cut: cuts made in the assembly through the components in its scope (the parts stay as they are)
  const consumed = new Set<string>();
  /** bodies an assembly cut or hole takes away completely */
  const cutAway = new Set<Body>();
  for (const f of doc.features ?? []) {
    if (f.type === 'sketch' || f.suppressed) continue;
    // Fillet / Chamfer on component edges (weld-like assembly features)
    if (isRoundFeature(f)) {
      let done = false;
      for (const b of bodies) {
        const rr = applyRoundFeature(b.geometry, f);
        if (!rr.geometry) continue;
        b.geometry = rr.geometry;
        b.faces = planarFaces(rr.geometry, b.id);
        b.edges = bodyEdges(rr.geometry, b.id);
        b.featureIds = [...b.featureIds, f.id];
        done = true;
        break;
      }
      if (!done) errors[f.id] = 'The selected edges are not on a component.';
      continue;
    }
    // Belt/Chain: the belt path around the pulleys
    if (f.type === 'belt') {
      const path = beltPath(f.pulleys, f.thickness);
      if (!path) errors[f.id] = 'Select two or more cylindrical faces with parallel axes (the pulleys).';
      else curves.push({ id: f.id, name: f.name, points: path.points });
      continue;
    }
    // Hole Tool through the components
    if (f.type === 'hole') {
      const pl = resolvePlaneDef(doc, f.plane);
      let hit = 0;
      for (const pt of f.points) {
        const tool = holeTool(f, pl, pt, THROUGH_ALL);
        tool.computeBoundingBox();
        for (const b of bodies) {
          b.geometry.computeBoundingBox();
          if (!b.geometry.boundingBox!.intersectsBox(tool.boundingBox!)) continue;
          let g: THREE.BufferGeometry;
          try {
            g = csg(b.geometry, tool, 'subtract');
          } catch (err) {
            // a component entirely inside the tool is removed by it, by design shows it; anything else is an error
            if (/leaves nothing/.test((err as Error).message)) { cutAway.add(b); b.featureIds = [...b.featureIds, f.id]; hit++; continue; }
            errors[f.id] = `The hole failed on ${b.id.split('~')[0]}: ${(err as Error).message}`;
            continue;
          }
          if (Math.abs(meshVolume(g) - meshVolume(b.geometry)) < 1e-6) continue;
          b.geometry = g;
          b.faces = planarFaces(g, b.id);
          b.edges = bodyEdges(g, b.id);
          b.featureIds = [...b.featureIds, f.id];
          hit++;
        }
      }
      if (!hit) errors[f.id] = f.points.length ? 'The hole does not touch any component.' : 'Place at least one hole position.';
      continue;
    }
    if ((f.type !== 'extrude' && f.type !== 'revolve') || f.op !== 'cut') continue;
    consumed.add(f.sketchId);
    const r = featureGeometry(doc, f, THROUGH_ALL);
    if (!r.geometry) {
      errors[f.id] = r.error ?? 'The cut has no closed contour.';
      continue;
    }
    let hit = 0;
    for (const b of bodies) {
      if (f.scope && !f.scope.includes(b.id) && !f.scope.includes(b.id.split('~')[1] ?? '')) continue;
      b.geometry.computeBoundingBox();
      r.geometry.computeBoundingBox();
      if (!b.geometry.boundingBox!.intersectsBox(r.geometry.boundingBox!)) continue;
      let g: THREE.BufferGeometry;
      try {
        g = csg(b.geometry, r.geometry, 'subtract');
      } catch (err) {
        // a component entirely inside the cut is cut away completely; only a real boolean failure is an error (F60)
        if (/leaves nothing/.test((err as Error).message)) { cutAway.add(b); b.featureIds = [...b.featureIds, f.id]; hit++; continue; }
        errors[f.id] = `The cut failed on ${b.id.split('~')[0]}: ${(err as Error).message}`;
        continue;
      }
      if (Math.abs(meshVolume(g) - meshVolume(b.geometry)) < 1e-6) continue;
      b.geometry = g;
      b.faces = planarFaces(g, b.id);
      b.edges = bodyEdges(g, b.id);
      b.featureIds = [...b.featureIds, f.id];
      hit++;
    }
    if (!hit) errors[f.id] = 'The cut does not touch any component in its scope.';
  }
  if (cutAway.size) for (let k = bodies.length - 1; k >= 0; k--) if (cutAway.has(bodies[k])) bodies.splice(k, 1);
  return { bodies, errors, consumedSketches: consumed, components, curves, patternInstances, mateReport: { ...mateReport, from: { components: doc.components, mates: doc.mates } } };
}

/** Next instance name: Part1<1>, Part1<2>, … */
export function instanceName(doc: Document, partName: string): string {
  const n = (doc.components ?? []).filter((c) => c.name.startsWith(`${partName}<`)).length + 1;
  return `${partName}<${n}>`;
}
