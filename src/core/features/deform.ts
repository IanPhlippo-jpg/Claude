import * as THREE from 'three';

/**
 * Features ▸ Deform ▸ Point: the mesh around a point is pushed along a direction with a smooth falloff inside the
 * deform region. The mesh is first refined (uniform midpoint subdivision, so neighbouring triangles keep their shared
 * edges) until the triangles are small against the region, then the vertices are displaced.
 */
export interface PointDeform {
  point: [number, number, number];
  direction: [number, number, number];
  distance: number;
  radius: number;
  /** Shape Options ▸ Stiffness: Rigid keeps the dent narrow, Flexible spreads it (falloff exponent) */
  stiffness?: 'rigid' | 'medium' | 'flexible';
}

/** one level of midpoint subdivision of a non-indexed triangle list */
export function subdivideOnce(pos: Float32Array): Float32Array<ArrayBuffer> {
  const n = pos.length / 9;
  const out = new Float32Array(n * 4 * 9);
  let o = 0;
  const put = (a: number[], b: number[], c: number[]) => { out.set(a, o); out.set(b, o + 3); out.set(c, o + 6); o += 9; };
  for (let i = 0; i < n; i++) {
    const A = [pos[i * 9], pos[i * 9 + 1], pos[i * 9 + 2]], B = [pos[i * 9 + 3], pos[i * 9 + 4], pos[i * 9 + 5]], C = [pos[i * 9 + 6], pos[i * 9 + 7], pos[i * 9 + 8]];
    const AB = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2], BC = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2, (B[2] + C[2]) / 2], CA = [(C[0] + A[0]) / 2, (C[1] + A[1]) / 2, (C[2] + A[2]) / 2];
    put(A, AB, CA); put(AB, B, BC); put(CA, BC, C); put(AB, BC, CA);
  }
  return out;
}

/** the falloff weight of a point at distance d from the deform point (1 at the point, 0 at the region edge) */
export function falloff(d: number, radius: number, stiffness: PointDeform['stiffness'] = 'medium'): number {
  if (d >= radius) return 0;
  const t = d / radius;
  const base = 0.5 * (1 + Math.cos(Math.PI * t));
  const k = stiffness === 'rigid' ? 2 : stiffness === 'flexible' ? 0.6 : 1;
  return Math.pow(base, k);
}

/** Deform ▸ Point on a body: the refined, displaced copy of the geometry (the body itself is untouched). */
export function pointDeform(g: THREE.BufferGeometry, d: PointDeform, maxTriangles = 60000): THREE.BufferGeometry {
  const src = (g.index ? g.toNonIndexed() : g).getAttribute('position');
  let pos: Float32Array<ArrayBuffer> = new Float32Array(src.array as ArrayLike<number>);
  // refine until the longest edge near the region is small against the radius (or the triangle budget is reached)
  const P = new THREE.Vector3(...d.point);
  const target = Math.max(0.5, d.radius / 6);
  for (let level = 0; level < 6; level++) {
    let longest = 0;
    for (let i = 0; i < pos.length; i += 9) {
      const a = new THREE.Vector3(pos[i], pos[i + 1], pos[i + 2]), b = new THREE.Vector3(pos[i + 3], pos[i + 4], pos[i + 5]), c = new THREE.Vector3(pos[i + 6], pos[i + 7], pos[i + 8]);
      // only triangles that can reach the region matter: their centroid within the region plus half their size
      const e = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
      const centroid = a.clone().add(b).add(c).multiplyScalar(1 / 3);
      if (centroid.distanceTo(P) > d.radius * 1.5 + e / 2) continue;
      longest = Math.max(longest, e);
    }
    if (longest <= target || pos.length / 9 * 4 > maxTriangles) break;
    pos = subdivideOnce(pos);
  }
  const dir = new THREE.Vector3(...d.direction).normalize();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.length; i += 3) {
    v.set(pos[i], pos[i + 1], pos[i + 2]);
    const w = falloff(v.distanceTo(P), d.radius, d.stiffness);
    if (w <= 0) continue;
    v.addScaledVector(dir, d.distance * w);
    pos[i] = v.x; pos[i + 1] = v.y; pos[i + 2] = v.z;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
}
