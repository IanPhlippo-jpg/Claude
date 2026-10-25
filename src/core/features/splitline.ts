import * as THREE from 'three';
import type { PlaneDef } from '../document/types';
import type { Region } from './regions';
import { csg, extrudeGeometry, mergeGeometries, THROUGH_ALL, type PlanarFace } from './solid';
import type { CreaseSegment } from './edgesets';

/** A Split Line (projection): the sketch regions, the plane they are projected along. */
export interface SplitRegions {
  plane: PlaneDef;
  regions: Region[];
  /** projection (default), silhouette (by the facet normal against the plane normal) or intersection (by the plane) */
  kind?: 'projection' | 'silhouette' | 'intersection';
  /** projection in one direction only: behind the sketch plane */
  single?: boolean;
}

function inPoly(x: number, y: number, poly: { x: number; y: number }[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y || 1e-12) + a.x) c = !c;
  }
  return c;
}

/** Is a world point, projected along the plane normal, inside one of the regions? */
export function insideSplit(s: SplitRegions, p: THREE.Vector3, facetNormal?: THREE.Vector3): boolean {
  const o = new THREE.Vector3(...s.plane.origin), u = new THREE.Vector3(...s.plane.u), v = new THREE.Vector3(...s.plane.v), n = new THREE.Vector3(...s.plane.n);
  const r = p.clone().sub(o);
  if (s.kind === 'silhouette') return !!facetNormal && facetNormal.dot(n) > 1e-6;
  if (s.kind === 'intersection') return r.dot(n) > 0;
  if (s.single && r.dot(n) > 1e-6) return false;
  const x = r.dot(u), y = r.dot(v);
  return s.regions.some((rg) => inPoly(x, y, rg.outer) && !rg.holes.some((h) => inPoly(x, y, h)));
}

/**
 * Split Line ▸ Projection: the body's surface is cut along the projected sketch so the faces it crosses
 * fall apart in two. The volume does not change: the triangles inside and outside the projection are kept,
 * the walls of the projection tool are dropped.
 */
export function splitBodySurface(g: THREE.BufferGeometry, s: SplitRegions): THREE.BufferGeometry {
  // a silhouette follows the facet edges: the surface stays as it is, only the faces are divided
  if (s.kind === 'silhouette') return g;
  let tool: THREE.BufferGeometry | null;
  if (s.kind === 'intersection') {
    // the half space on the normal side of the plane
    const big = THROUGH_ALL * 4;
    const o = new THREE.Vector3(...s.plane.origin), u = new THREE.Vector3(...s.plane.u), v = new THREE.Vector3(...s.plane.v), nn = new THREE.Vector3(...s.plane.n);
    const box = new THREE.BoxGeometry(big, big, big).toNonIndexed();
    box.translate(0, 0, big / 2);
    box.applyMatrix4(new THREE.Matrix4().makeBasis(u, v, nn).setPosition(o));
    tool = box;
  } else tool = s.single
    ? extrudeGeometry(s.regions, s.plane, { end: 'blind', depth: THROUGH_ALL, reverse: true } as never, THROUGH_ALL)
    : extrudeGeometry(s.regions, s.plane, { end: 'blind', depth: THROUGH_ALL, reverse: false, direction2: { end: 'blind', depth: THROUGH_ALL } } as never, THROUGH_ALL);
  if (!tool) return g;
  const inside = csg(g, tool, 'intersect');
  const outside = csg(g, tool, 'subtract');
  const n = new THREE.Vector3(...s.plane.n).normalize();
  const keep = (geo: THREE.BufferGeometry) => {
    const ng = geo.index ? geo.toNonIndexed() : geo;
    const pos = ng.getAttribute('position');
    const out: number[] = [];
    const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
    for (let t = 0; t * 3 + 2 < pos.count; t++) {
      A.fromBufferAttribute(pos, t * 3); B.fromBufferAttribute(pos, t * 3 + 1); C.fromBufferAttribute(pos, t * 3 + 2);
      const nn = B.clone().sub(A).cross(C.clone().sub(A));
      if (nn.lengthSq() < 1e-16) continue;
      nn.normalize();
      // a wall of the projection tool: parallel to the projection and on the region outline
      const c = A.clone().add(B).add(C).divideScalar(3);
      if (s.kind === 'intersection') {
        // the cut face of the half space: on the plane, not part of the original surface
        const o = new THREE.Vector3(...s.plane.origin);
        if (Math.abs(nn.dot(n)) > 0.9999 && Math.abs(c.clone().sub(o).dot(n)) < 1e-4 && !onOriginal(g, c, nn)) continue;
        out.push(A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z);
        continue;
      }
      if (Math.abs(nn.dot(n)) < 1e-4) {
        const step = nn.clone().multiplyScalar(1e-3);
        const a = insideSplit(s, c.clone().add(step)), b = insideSplit(s, c.clone().sub(step));
        if (a !== b && !onOriginal(g, c, nn)) continue;
      }
      out.push(A.x, A.y, A.z, B.x, B.y, B.z, C.x, C.y, C.z);
    }
    const r = new THREE.BufferGeometry();
    r.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
    return r;
  };
  const merged = mergeGeometries([keep(inside), keep(outside)]);
  merged.computeVertexNormals();
  return merged;
}

/** Does the original surface have a face through this point with this normal (a side wall of the part itself)? */
function onOriginal(g: THREE.BufferGeometry, c: THREE.Vector3, n: THREE.Vector3): boolean {
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.getAttribute('position');
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let t = 0; t * 3 + 2 < pos.count; t++) {
    A.fromBufferAttribute(pos, t * 3); B.fromBufferAttribute(pos, t * 3 + 1); C.fromBufferAttribute(pos, t * 3 + 2);
    const nn = B.clone().sub(A).cross(C.clone().sub(A));
    if (nn.lengthSq() < 1e-16) continue;
    nn.normalize();
    if (nn.dot(n) < 0.999 || Math.abs(nn.dot(c) - nn.dot(A)) > 1e-3) continue;
    // inside the triangle?
    const v0 = C.clone().sub(A), v1 = B.clone().sub(A), v2 = c.clone().sub(A);
    const d00 = v0.dot(v0), d01 = v0.dot(v1), d02 = v0.dot(v2), d11 = v1.dot(v1), d12 = v1.dot(v2);
    const inv = 1 / (d00 * d11 - d01 * d01 || 1e-12);
    const uu = (d11 * d02 - d01 * d12) * inv, vv = (d00 * d12 - d01 * d02) * inv;
    if (uu >= -1e-6 && vv >= -1e-6 && uu + vv <= 1 + 1e-6) return true;
  }
  return false;
}

/**
 * The faces after the split: every face whose triangles lie partly inside and partly outside the projection
 * becomes two faces; the border between them is returned as imprint segments (drawn and picked as edges).
 */
export function splitFaces(g: THREE.BufferGeometry, faces: PlanarFace[], splits: SplitRegions[]): { faces: PlanarFace[]; segments: CreaseSegment[] } {
  if (!splits.length) return { faces, segments: [] };
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.getAttribute('position');
  const P = (i: number) => new THREE.Vector3().fromBufferAttribute(pos, i);
  const out: PlanarFace[] = [];
  const segments: CreaseSegment[] = [];
  const vk = (p: THREE.Vector3) => `${Math.round(p.x * 1e3)},${Math.round(p.y * 1e3)},${Math.round(p.z * 1e3)}`;
  for (const f of faces) {
    const side = (t: number) => {
      const a = P(t * 3), b = P(t * 3 + 1), cc = P(t * 3 + 2);
      const c = a.clone().add(b).add(cc).divideScalar(3);
      const fn = b.clone().sub(a).cross(cc.clone().sub(a)).normalize();
      return splits.map((s) => (insideSplit(s, c, fn) ? '1' : '0')).join('');
    };
    const groups = new Map<string, number[]>();
    for (const t of f.triangles) (groups.get(side(t)) ?? groups.set(side(t), []).get(side(t))!).push(t);
    if (groups.size < 2) {
      out.push(f);
      continue;
    }
    let k = 0;
    const owner = new Map<number, string>();
    for (const [key, tris] of groups) {
      let area = 0;
      const c = new THREE.Vector3();
      for (const t of tris) {
        owner.set(t, key);
        const a = P(t * 3), b = P(t * 3 + 1), cc = P(t * 3 + 2);
        const ar = b.clone().sub(a).cross(cc.clone().sub(a)).length() / 2;
        area += ar;
        c.addScaledVector(a.add(b).add(cc).divideScalar(3), ar);
      }
      c.divideScalar(area || 1);
      out.push({ ...f, id: k === 0 ? f.id : `${f.id}s${k}`, triangles: tris, area, centroid: [c.x, c.y, c.z] });
      k++;
    }
    // edges shared by triangles of two different groups are the split line
    const edgeTri = new Map<string, { t: number; a: THREE.Vector3; b: THREE.Vector3 }>();
    const n = new THREE.Vector3(...f.normal);
    for (const t of f.triangles) {
      for (let e = 0; e < 3; e++) {
        const a = P(t * 3 + e), b = P(t * 3 + ((e + 1) % 3));
        const ka = vk(a), kb = vk(b);
        const key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
        const other = edgeTri.get(key);
        if (other && owner.get(other.t) !== owner.get(t)) segments.push({ a, b, n1: n.clone(), n2: n.clone() });
        else edgeTri.set(key, { t, a, b });
      }
    }
  }
  return { faces: out, segments };
}
