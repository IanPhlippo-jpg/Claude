import * as THREE from 'three';
import type { PlaneDef } from '../document/types';
import type { SketchPoint } from '../sketch/types';
import type { Region } from './regions';
import { flipWinding, meshVolume } from './solid';
import { MeshBVH } from 'three-mesh-bvh';

/** A cylindrical face: axis point, unit axis direction and radius (world). */
export interface Cylinder {
  center: [number, number, number];
  axis: [number, number, number];
  radius: number;
}

/**
 * Fit a cylinder to the triangles of a curved face: the axis is perpendicular to all facet normals
 * (smallest spread of the normals), the radius and centre come from a circle fit in the plane across the axis.
 */
export function fitCylinder(g: THREE.BufferGeometry, triangles: number[]): Cylinder | null {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const normals: THREE.Vector3[] = [], pts: THREE.Vector3[] = [];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (const t of triangles) {
    A.fromBufferAttribute(a, t * 3); B.fromBufferAttribute(a, t * 3 + 1); C.fromBufferAttribute(a, t * 3 + 2);
    const n = B.clone().sub(A).cross(C.clone().sub(A));
    if (n.lengthSq() < 1e-12) continue;
    normals.push(n.normalize());
    pts.push(A.clone(), B.clone(), C.clone());
  }
  if (normals.length < 3) return null;
  // axis: cross product of the two most different normals
  let best = 0, axis = new THREE.Vector3();
  for (let i = 0; i < normals.length; i++) for (let j = i + 1; j < normals.length; j += Math.max(1, Math.floor(normals.length / 40))) {
    const c = normals[i].clone().cross(normals[j]);
    if (c.lengthSq() > best) { best = c.lengthSq(); axis = c; }
  }
  if (best < 1e-6) return null;
  axis.normalize();
  const e1 = (Math.abs(axis.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).cross(axis).normalize();
  const e2 = axis.clone().cross(e1);
  // algebraic circle fit (Kasa) in the plane across the axis
  let sxx = 0, sxy = 0, syy = 0, sx = 0, sy = 0, sxz = 0, syz = 0, sz = 0;
  const n = pts.length;
  let zmean = 0;
  for (const p of pts) {
    const x = p.dot(e1), y = p.dot(e2), z = x * x + y * y;
    sxx += x * x; sxy += x * y; syy += y * y; sx += x; sy += y; sxz += x * z; syz += y * z; sz += z; zmean += p.dot(axis);
  }
  const M = new THREE.Matrix3().set(sxx, sxy, sx, sxy, syy, sy, sx, sy, n);
  const inv = M.clone().invert();
  const rhs = new THREE.Vector3(sxz, syz, sz);
  const sol = rhs.applyMatrix3(inv);
  const cx = sol.x / 2, cy = sol.y / 2;
  const r = Math.sqrt(Math.max(0, sol.z + cx * cx + cy * cy));
  if (!Number.isFinite(r) || r <= 0) return null;
  const c = e1.clone().multiplyScalar(cx).addScaledVector(e2, cy).addScaledVector(axis, zmean / n);
  return { center: [c.x, c.y, c.z], axis: [axis.x, axis.y, axis.z], radius: r };
}

/**
 * Wrap a closed sketch onto a cylinder (as the original's Wrap, analytical method): the sketch plane's coordinate
 * across the axis becomes arc length on the cylinder, along the axis it stays. Emboss grows outward by depth,
 * Deboss cuts inward by depth; the returned solid is the tool (union for emboss, subtract for deboss).
 */
export function wrapTool(regions: Region[], plane: PlaneDef, cyl: Cylinder, kind: 'emboss' | 'deboss', depth: number): THREE.BufferGeometry | null {
  const C = new THREE.Vector3(...cyl.center), ax = new THREE.Vector3(...cyl.axis).normalize(), R = cyl.radius;
  const o = new THREE.Vector3(...plane.origin), U = new THREE.Vector3(...plane.u), V = new THREE.Vector3(...plane.v);
  // the reference direction from the axis toward the sketch plane, and the direction around the cylinder
  const toPlane = o.clone().sub(C);
  const d0 = toPlane.clone().addScaledVector(ax, -toPlane.dot(ax));
  if (d0.lengthSq() < 1e-9) d0.copy(new THREE.Vector3(...plane.n));
  d0.addScaledVector(ax, -d0.dot(ax)).normalize();
  const e = ax.clone().cross(d0).normalize();
  const foot = C.clone().addScaledVector(d0, d0.dot(o.clone().sub(C)));
  const map = (q: SketchPoint, rho: number): THREE.Vector3 => {
    const P = o.clone().addScaledVector(U, q.x).addScaledVector(V, q.y);
    const z = P.clone().sub(C).dot(ax), x = P.clone().sub(foot).dot(e);
    const th = x / R;
    return C.clone().addScaledVector(ax, z).addScaledVector(d0, rho * Math.cos(th)).addScaledVector(e, rho * Math.sin(th));
  };
  const r0 = kind === 'emboss' ? R - 0.05 : R - depth;
  const r1 = kind === 'emboss' ? R + depth : R + 0.5;
  const step = Math.max(0.3, Math.min(2, R * 0.05));
  const pos: number[] = [];
  const push = (p: THREE.Vector3) => pos.push(p.x, p.y, p.z);
  const subdivide = (tri: SketchPoint[]): SketchPoint[][] => {
    const l = Math.max(Math.hypot(tri[1].x - tri[0].x, tri[1].y - tri[0].y), Math.hypot(tri[2].x - tri[1].x, tri[2].y - tri[1].y), Math.hypot(tri[0].x - tri[2].x, tri[0].y - tri[2].y));
    if (l <= step) return [tri];
    const m = (p: SketchPoint, q: SketchPoint) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    const [a, b, c] = tri, ab = m(a, b), bc = m(b, c), ca = m(c, a);
    return [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]].flatMap(subdivide);
  };
  const area2 = (l: SketchPoint[]) => l.reduce((acc, p, i) => { const q = l[(i + 1) % l.length]; return acc + p.x * q.y - q.x * p.y; }, 0);
  const ccw = (t: SketchPoint[]) => ((t[1].x - t[0].x) * (t[2].y - t[0].y) - (t[1].y - t[0].y) * (t[2].x - t[0].x) >= 0 ? t : [t[0], t[2], t[1]]);
  for (const reg0 of regions) {
    // outer loop counter-clockwise, holes clockwise: caps and walls then face the same way
    const reg = { outer: area2(reg0.outer) < 0 ? [...reg0.outer].reverse() : reg0.outer, holes: reg0.holes.map((h) => (area2(h) > 0 ? [...h].reverse() : h)) };
    const contour = reg.outer.map((p) => new THREE.Vector2(p.x, p.y));
    const holes = reg.holes.map((h) => h.map((p) => new THREE.Vector2(p.x, p.y)));
    const all = [...contour, ...holes.flat()];
    const faces = THREE.ShapeUtils.triangulateShape(contour, holes);
    for (const f of faces) {
      for (const t of subdivide(ccw(f.map((i) => ({ x: all[i].x, y: all[i].y }))))) {
        push(map(t[0], r1)); push(map(t[1], r1)); push(map(t[2], r1));
        push(map(t[0], r0)); push(map(t[2], r0)); push(map(t[1], r0));
      }
    }
    // side walls along every boundary loop, split into short pieces so they follow the cylinder
    for (const loop of [reg.outer, ...reg.holes]) {
      for (let i = 0; i < loop.length; i++) {
        const p = loop[i], q = loop[(i + 1) % loop.length];
        const k = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / step));
        for (let j = 0; j < k; j++) {
          const a = { x: p.x + ((q.x - p.x) * j) / k, y: p.y + ((q.y - p.y) * j) / k };
          const b = { x: p.x + ((q.x - p.x) * (j + 1)) / k, y: p.y + ((q.y - p.y) * (j + 1)) / k };
          const a0 = map(a, r0), b0 = map(b, r0), a1 = map(a, r1), b1 = map(b, r1);
          push(a0); push(b0); push(b1);
          push(a0); push(b1); push(a1);
        }
      }
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // the loops' orientation decides the walls; make the whole tool face outward
  if (meshVolume(g) < 0) flipWinding(g);
  g.computeVertexNormals();
  return g;
}


/**
 * Wrap > Spline Surface: the closed sketch is projected along the sketch plane's normal onto any face and grown off
 * it along the face normal (emboss) or into it (deboss). face: the triangles of the target face (world).
 */
export function wrapSplineTool(regions: Region[], plane: PlaneDef, face: THREE.BufferGeometry, kind: 'emboss' | 'deboss', depth: number): THREE.BufferGeometry | null {
  const o = new THREE.Vector3(...plane.origin), U = new THREE.Vector3(...plane.u), V = new THREE.Vector3(...plane.v), N = new THREE.Vector3(...plane.n).normalize();
  const fg = face.index ? face.toNonIndexed() : face;
  const bvh = new MeshBVH(fg);
  const fa = fg.getAttribute('position');
  const cache = new Map<string, { p: THREE.Vector3; n: THREE.Vector3 } | null>();
  const hitAt = (q: SketchPoint) => {
    const k = `${q.x.toFixed(5)},${q.y.toFixed(5)}`;
    if (cache.has(k)) return cache.get(k)!;
    const P = o.clone().addScaledVector(U, q.x).addScaledVector(V, q.y);
    let best: { p: THREE.Vector3; n: THREE.Vector3 } | null = null;
    for (const d of [N.clone().negate(), N]) {
      const h = bvh.raycastFirst(new THREE.Ray(P, d), THREE.DoubleSide);
      if (h && (!best || h.point.distanceTo(P) < best.p.distanceTo(P))) {
        const i = (h.faceIndex ?? 0) * 3;
        const a = new THREE.Vector3().fromBufferAttribute(fa, i), b = new THREE.Vector3().fromBufferAttribute(fa, i + 1), c = new THREE.Vector3().fromBufferAttribute(fa, i + 2);
        best = { p: h.point.clone(), n: b.sub(a).cross(c.sub(a)).normalize() };
      }
    }
    // off the face: the closest point of the face (the projection overhangs its edge)
    if (!best) {
      const cp = bvh.closestPointToPoint(P);
      if (cp) {
        const i = (cp.faceIndex ?? 0) * 3;
        const a = new THREE.Vector3().fromBufferAttribute(fa, i), b = new THREE.Vector3().fromBufferAttribute(fa, i + 1), c = new THREE.Vector3().fromBufferAttribute(fa, i + 2);
        best = { p: cp.point.clone(), n: b.sub(a).cross(c.sub(a)).normalize() };
      }
    }
    cache.set(k, best);
    return best;
  };
  const map = (q: SketchPoint, h: number): THREE.Vector3 => {
    const hit = hitAt(q);
    return hit ? hit.p.clone().addScaledVector(hit.n, h) : o.clone().addScaledVector(U, q.x).addScaledVector(V, q.y);
  };
  const h0 = kind === 'emboss' ? -0.05 : -depth;
  const h1 = kind === 'emboss' ? depth : 0.5;
  const pos: number[] = [];
  const push = (p: THREE.Vector3) => pos.push(p.x, p.y, p.z);
  const step = 1;
  const subdivide = (tri: SketchPoint[]): SketchPoint[][] => {
    const l = Math.max(Math.hypot(tri[1].x - tri[0].x, tri[1].y - tri[0].y), Math.hypot(tri[2].x - tri[1].x, tri[2].y - tri[1].y), Math.hypot(tri[0].x - tri[2].x, tri[0].y - tri[2].y));
    if (l <= step) return [tri];
    const m = (p: SketchPoint, q: SketchPoint) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    const [a, b, c] = tri, ab = m(a, b), bc = m(b, c), ca = m(c, a);
    return [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]].flatMap(subdivide);
  };
  const area2 = (l: SketchPoint[]) => l.reduce((acc, p, i) => { const q = l[(i + 1) % l.length]; return acc + p.x * q.y - q.x * p.y; }, 0);
  const ccw = (t: SketchPoint[]) => ((t[1].x - t[0].x) * (t[2].y - t[0].y) - (t[1].y - t[0].y) * (t[2].x - t[0].x) >= 0 ? t : [t[0], t[2], t[1]]);
  for (const reg0 of regions) {
    const reg = { outer: area2(reg0.outer) < 0 ? [...reg0.outer].reverse() : reg0.outer, holes: reg0.holes.map((hh) => (area2(hh) > 0 ? [...hh].reverse() : hh)) };
    const contour = reg.outer.map((p) => new THREE.Vector2(p.x, p.y));
    const holes = reg.holes.map((hh) => hh.map((p) => new THREE.Vector2(p.x, p.y)));
    const all = [...contour, ...holes.flat()];
    for (const f of THREE.ShapeUtils.triangulateShape(contour, holes)) {
      for (const t of subdivide(ccw(f.map((i) => ({ x: all[i].x, y: all[i].y }))))) {
        push(map(t[0], h1)); push(map(t[1], h1)); push(map(t[2], h1));
        push(map(t[0], h0)); push(map(t[2], h0)); push(map(t[1], h0));
      }
    }
    for (const loop of [reg.outer, ...reg.holes]) {
      for (let i = 0; i < loop.length; i++) {
        const p = loop[i], q = loop[(i + 1) % loop.length];
        const k = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / step));
        for (let j = 0; j < k; j++) {
          const a = { x: p.x + ((q.x - p.x) * j) / k, y: p.y + ((q.y - p.y) * j) / k };
          const b = { x: p.x + ((q.x - p.x) * (j + 1)) / k, y: p.y + ((q.y - p.y) * (j + 1)) / k };
          const a0 = map(a, h0), b0 = map(b, h0), a1 = map(a, h1), b1 = map(b, h1);
          push(a0); push(b0); push(b1);
          push(a0); push(b1); push(a1);
        }
      }
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (meshVolume(g) < 0) flipWinding(g);
  g.computeVertexNormals();
  return g;
}
