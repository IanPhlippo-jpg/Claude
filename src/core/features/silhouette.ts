import * as THREE from 'three';

/**
 * Silhouette edges of curved surfaces, by design draws them in Shaded With Edges / Hidden Lines Removed:
 * the smooth (non-crease) mesh edges between a triangle facing the viewer and one facing away.
 * The adjacency is built once per body; the silhouette follows the camera.
 */
export interface SmoothEdges {
  /** a.xyz, b.xyz per edge */
  pos: Float32Array;
  /** n1.xyz, n2.xyz per edge (unit face normals of the two triangles) */
  nrm: Float32Array;
  count: number;
}

export function smoothEdges(g: THREE.BufferGeometry, creaseDeg = 20): SmoothEdges {
  const ng = g.index ? g.toNonIndexed() : g;
  const p = ng.getAttribute('position');
  const triCount = Math.floor(p.count / 3);
  const cos = Math.cos((creaseDeg * Math.PI) / 180);
  // weld vertices by position (CSG output repeats them per triangle)
  const box = new THREE.Box3().setFromBufferAttribute(p as THREE.BufferAttribute);
  const tol = Math.max(1e-6, box.getSize(new THREE.Vector3()).length() * 1e-7);
  const ids = new Map<string, number>();
  const vid = new Int32Array(p.count);
  const key = (i: number) => `${Math.round(p.getX(i) / tol)},${Math.round(p.getY(i) / tol)},${Math.round(p.getZ(i) / tol)}`;
  for (let i = 0; i < p.count; i++) {
    const k = key(i);
    let id = ids.get(k);
    if (id === undefined) { id = ids.size; ids.set(k, id); }
    vid[i] = id;
  }
  const fn: THREE.Vector3[] = [];
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let t = 0; t < triCount; t++) {
    A.fromBufferAttribute(p, t * 3); B.fromBufferAttribute(p, t * 3 + 1); C.fromBufferAttribute(p, t * 3 + 2);
    const n = B.clone().sub(A).cross(C.clone().sub(A));
    fn.push(n.lengthSq() > 0 ? n.normalize() : n);
  }
  const edgeTri = new Map<number, { t: number; i: number; j: number }[]>();
  const N = ids.size + 1;
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k, j = t * 3 + ((k + 1) % 3);
      const a = vid[i], b = vid[j];
      if (a === b) continue;
      const ek = a < b ? a * N + b : b * N + a;
      const list = edgeTri.get(ek);
      if (list) list.push({ t, i, j });
      else edgeTri.set(ek, [{ t, i, j }]);
    }
  }
  const pos: number[] = [], nrm: number[] = [];
  for (const list of edgeTri.values()) {
    if (list.length !== 2) continue;
    const n1 = fn[list[0].t], n2 = fn[list[1].t];
    if (n1.lengthSq() === 0 || n2.lengthSq() === 0) continue;
    // a crease is drawn as a feature edge already; only smooth edges can be silhouettes
    if (n1.dot(n2) < cos) continue;
    const e = list[0];
    pos.push(p.getX(e.i), p.getY(e.i), p.getZ(e.i), p.getX(e.j), p.getY(e.j), p.getZ(e.j));
    nrm.push(n1.x, n1.y, n1.z, n2.x, n2.y, n2.z);
  }
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), count: pos.length / 6 };
}

/**
 * The silhouette segments for a viewer: orthographic (direction `dir` from the eye into the scene) or
 * perspective (eye position), both in the body's local coordinates. Writes into `out` and returns the count.
 */
export function silhouette(se: SmoothEdges, view: { dir?: THREE.Vector3; eye?: THREE.Vector3 }, out: Float32Array): number {
  let n = 0;
  const d = view.dir, e = view.eye;
  for (let k = 0; k < se.count; k++) {
    const o = k * 6;
    let vx: number, vy: number, vz: number;
    if (d) { vx = d.x; vy = d.y; vz = d.z; }
    else {
      vx = (se.pos[o] + se.pos[o + 3]) / 2 - e!.x;
      vy = (se.pos[o + 1] + se.pos[o + 4]) / 2 - e!.y;
      vz = (se.pos[o + 2] + se.pos[o + 5]) / 2 - e!.z;
    }
    const s1 = se.nrm[o] * vx + se.nrm[o + 1] * vy + se.nrm[o + 2] * vz;
    const s2 = se.nrm[o + 3] * vx + se.nrm[o + 4] * vy + se.nrm[o + 5] * vz;
    if ((s1 < 0) === (s2 < 0)) continue;
    for (let i = 0; i < 6; i++) out[n * 6 + i] = se.pos[o + i];
    n++;
  }
  return n;
}
