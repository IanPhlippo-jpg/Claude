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
  const n = p.count, triCount = Math.floor(n / 3);
  const cos = Math.cos((creaseDeg * Math.PI) / 180);
  // weld vertices by position (CSG output repeats them per triangle): an open-addressing table on the rounded
  // coordinates (QA 0.5.13, F137: a map of strings took 90 ms of the window's thread on every rebuild of a large part)
  const box = new THREE.Box3().setFromBufferAttribute(p as THREE.BufferAttribute);
  const tol = Math.max(1e-6, box.getSize(new THREE.Vector3()).length() * 1e-7);
  const q = new Int32Array(n * 3);
  for (let i = 0; i < n; i++) { q[i * 3] = Math.round(p.getX(i) / tol); q[i * 3 + 1] = Math.round(p.getY(i) / tol); q[i * 3 + 2] = Math.round(p.getZ(i) / tol); }
  const vsize = 1 << Math.ceil(Math.log2(n * 2 + 2));
  const vtab = new Int32Array(vsize).fill(-1);
  const vid = new Int32Array(n);
  let ids = 0;
  for (let i = 0; i < n; i++) {
    const x = q[i * 3], y = q[i * 3 + 1], z = q[i * 3 + 2];
    let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) & (vsize - 1);
    let id = -1;
    for (let j = vtab[h]; j !== -1; h = (h + 1) & (vsize - 1), j = vtab[h]) {
      if (q[j * 3] === x && q[j * 3 + 1] === y && q[j * 3 + 2] === z) { id = vid[j]; break; }
    }
    if (id === -1) { id = ids++; vtab[h] = i; }
    vid[i] = id;
  }
  // unit face normals (zero for a degenerate triangle)
  const fn = new Float64Array(triCount * 3);
  for (let t = 0; t < triCount; t++) {
    const i = t * 3;
    const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i);
    const ux = p.getX(i + 1) - ax, uy = p.getY(i + 1) - ay, uz = p.getZ(i + 1) - az;
    const vx = p.getX(i + 2) - ax, vy = p.getY(i + 2) - ay, vz = p.getZ(i + 2) - az;
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    const l = Math.hypot(cx, cy, cz);
    if (l > 0) { fn[t * 3] = cx / l; fn[t * 3 + 1] = cy / l; fn[t * 3 + 2] = cz / l; }
  }
  // every welded edge with the triangles on it, in the order the edges first appear: a table on the vertex pair
  const esize = 1 << Math.ceil(Math.log2(triCount * 6 + 2));
  const etab = new Int32Array(esize).fill(-1);
  const ea = new Int32Array(triCount * 3), eb = new Int32Array(triCount * 3), t1 = new Int32Array(triCount * 3), t2 = new Int32Array(triCount * 3);
  const ei = new Int32Array(triCount * 3), ej = new Int32Array(triCount * 3), cnt = new Uint8Array(triCount * 3);
  let m = 0;
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k, j = t * 3 + ((k + 1) % 3);
      const va = vid[i], vb = vid[j];
      if (va === vb) continue;
      const lo = va < vb ? va : vb, hi = va < vb ? vb : va;
      let h = (Math.imul(lo, 73856093) ^ Math.imul(hi, 19349663)) & (esize - 1);
      let e = -1;
      for (let x = etab[h]; x !== -1; h = (h + 1) & (esize - 1), x = etab[h]) if (ea[x] === lo && eb[x] === hi) { e = x; break; }
      if (e === -1) { e = m++; etab[h] = e; ea[e] = lo; eb[e] = hi; t1[e] = t; ei[e] = i; ej[e] = j; cnt[e] = 1; }
      else { if (cnt[e] === 1) t2[e] = t; if (cnt[e] < 3) cnt[e]++; }
    }
  }
  const pos: number[] = [], nrm: number[] = [];
  for (let e = 0; e < m; e++) {
    if (cnt[e] !== 2) continue;
    const a = t1[e] * 3, b = t2[e] * 3;
    const n1x = fn[a], n1y = fn[a + 1], n1z = fn[a + 2], n2x = fn[b], n2y = fn[b + 1], n2z = fn[b + 2];
    if ((n1x === 0 && n1y === 0 && n1z === 0) || (n2x === 0 && n2y === 0 && n2z === 0)) continue;
    // a crease is drawn as a feature edge already; only smooth edges can be silhouettes
    if (n1x * n2x + n1y * n2y + n1z * n2z < cos) continue;
    const i = ei[e], j = ej[e];
    pos.push(p.getX(i), p.getY(i), p.getZ(i), p.getX(j), p.getY(j), p.getZ(j));
    nrm.push(n1x, n1y, n1z, n2x, n2y, n2z);
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
