import * as THREE from 'three';
import { csg } from './solid';

/** Plane reference of a face to remove (matched by normal and a point on it). */
export interface FaceRefData {
  normal: [number, number, number];
  point: [number, number, number];
}

/**
 * Inward offset of a closed mesh by `thickness`: every vertex moves to the intersection of
 * the offset planes of the faces around it (exact for polyhedra and facetted surfaces).
 * Faces listed in `open` are pushed outward instead, so a boolean subtraction of the
 * result from the body leaves them open (Shell with "faces to remove").
 */
export function offsetInward(g: THREE.BufferGeometry, thickness: number, open: FaceRefData[] = [], pushOut = 1e3, multi: (FaceRefData & { thickness: number })[] = []): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.getAttribute('position');
  const triCount = Math.floor(pos.count / 3);
  const P = (i: number) => new THREE.Vector3().fromBufferAttribute(pos, i);
  // planes per triangle
  const planes: ({ n: THREE.Vector3; d: number } | null)[] = [];
  const isOpen = (n: THREE.Vector3, d: number) => open.some((o) => {
    const on = new THREE.Vector3(...o.normal).normalize();
    return on.dot(n) > 0.999 && Math.abs(on.dot(new THREE.Vector3(...o.point)) - d) < 0.05;
  });
  for (let t = 0; t < triCount; t++) {
    const p0 = P(t * 3), p1 = P(t * 3 + 1), p2 = P(t * 3 + 2);
    const e1 = p1.clone().sub(p0), e2 = p2.clone().sub(p0);
    const n = e1.clone().cross(e2);
    const l = n.length();
    // sliver triangles left by a boolean have no reliable normal: they contribute no plane
    if (l < 1e-4 * e1.length() * e2.length() || l < 1e-9) {
      planes.push(null);
      continue;
    }
    n.divideScalar(l);
    const d = n.dot(p0);
    // Multi-thickness: a listed face moves in by its own thickness
    const own = multi.find((o) => new THREE.Vector3(...o.normal).normalize().dot(n) > 0.999 && Math.abs(new THREE.Vector3(...o.normal).normalize().dot(new THREE.Vector3(...o.point)) - d) < 0.05);
    planes.push({ n, d: isOpen(n, d) ? d + pushOut : d - (own ? own.thickness : thickness) });
  }
  // distinct planes per vertex position
  const key = (p: THREE.Vector3) => `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)},${Math.round(p.z * 1e4)}`;
  const vertexPlanes = new Map<string, { n: THREE.Vector3; d: number }[]>();
  for (let i = 0; i < pos.count; i++) {
    const k = key(P(i));
    const list = vertexPlanes.get(k) ?? vertexPlanes.set(k, []).get(k)!;
    const pl = planes[Math.floor(i / 3)];
    if (pl && !list.some((q) => q.n.dot(pl.n) > 0.9998)) list.push(pl);
  }
  // T-junctions: a vertex that lies on the edge of a triangle it does not belong to still
  // sits on that triangle's face, so that plane counts too (booleans leave many of these)
  ng.computeBoundingBox();
  const bb = ng.boundingBox!;
  const cell = Math.max(bb.getSize(new THREE.Vector3()).length() / 60, 1e-3);
  const cellKey = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  const edgeGrid = new Map<string, number[]>();
  for (let t = 0; t < triCount; t++) {
    if (!planes[t]) continue;
    for (let e = 0; e < 3; e++) {
      const a = P(t * 3 + e), b = P(t * 3 + ((e + 1) % 3));
      const lo = a.clone().min(b), hi = a.clone().max(b);
      for (let x = Math.floor(lo.x / cell); x <= Math.floor(hi.x / cell); x++)
        for (let y = Math.floor(lo.y / cell); y <= Math.floor(hi.y / cell); y++)
          for (let z = Math.floor(lo.z / cell); z <= Math.floor(hi.z / cell); z++) {
            const k = `${x},${y},${z}`;
            const list = edgeGrid.get(k) ?? edgeGrid.set(k, []).get(k)!;
            list.push(t * 3 + e);
          }
    }
  }
  const onEdgeTol = 1e-3;
  for (const [k, list] of vertexPlanes) {
    if (list.length >= 3) continue;
    const [kx, ky, kz] = k.split(',').map((v) => Number(v) / 1e4);
    const p = new THREE.Vector3(kx, ky, kz);
    const cands = edgeGrid.get(cellKey(kx, ky, kz));
    if (!cands) continue;
    for (const ei of cands) {
      const t = Math.floor(ei / 3), e = ei % 3;
      const pl = planes[t]!;
      if (list.some((q) => q.n.dot(pl.n) > 0.9998)) continue;
      const a = P(t * 3 + e), b = P(t * 3 + ((e + 1) % 3));
      const ab = b.clone().sub(a);
      const len2 = ab.lengthSq();
      if (len2 < 1e-12) continue;
      const u = p.clone().sub(a).dot(ab) / len2;
      if (u < -1e-6 || u > 1 + 1e-6) continue;
      const foot = a.clone().addScaledVector(ab, u);
      if (foot.distanceTo(p) > onEdgeTol) continue;
      list.push(pl);
    }
  }
  const moved = new Map<string, THREE.Vector3>();
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const p = P(i);
    const k = key(p);
    let q = moved.get(k);
    if (!q) {
      const list = vertexPlanes.get(k)!;
      q = list.length ? solveOffset(p, list) : p.clone();
      moved.set(k, q);
    }
    out[i * 3] = q.x;
    out[i * 3 + 1] = q.y;
    out[i * 3 + 2] = q.z;
  }
  const res = new THREE.BufferGeometry();
  res.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  res.computeVertexNormals();
  return res;
}

/** point closest to p that lies on all given (offset) planes, in the least-squares sense */
function solveOffset(p: THREE.Vector3, list: { n: THREE.Vector3; d: number }[]): THREE.Vector3 {
  if (list.length === 1) {
    const { n, d } = list[0];
    return p.clone().addScaledVector(n, d - n.dot(p));
  }
  // normal equations: minimise |x - p|² subject to planes → solve (A^T A) x = A^T b with p as prior
  // use up to 3 well-conditioned planes; otherwise least squares over all
  const A: number[][] = [], b: number[] = [];
  for (const pl of list) {
    A.push([pl.n.x, pl.n.y, pl.n.z]);
    b.push(pl.d);
  }
  // exact intersection of the three best-conditioned planes when there are three or more;
  // otherwise a weak prior keeps the solution near p (edge vertices, nearly parallel planes)
  const det3 = (a0: number[], a1: number[], a2: number[]) => Math.abs(a0[0] * (a1[1] * a2[2] - a1[2] * a2[1]) - a0[1] * (a1[0] * a2[2] - a1[2] * a2[0]) + a0[2] * (a1[0] * a2[1] - a1[1] * a2[0]));
  let best: [number, number, number] | null = null, bestDet = 1e-3;
  for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) for (let k = j + 1; k < A.length; k++) {
    const d = det3(A[i], A[j], A[k]);
    if (d > bestDet) { bestDet = d; best = [i, j, k]; }
  }
  if (best) {
    const m = new THREE.Matrix3().set(A[best[0]][0], A[best[0]][1], A[best[0]][2], A[best[1]][0], A[best[1]][1], A[best[1]][2], A[best[2]][0], A[best[2]][1], A[best[2]][2]);
    return new THREE.Vector3(b[best[0]], b[best[1]], b[best[2]]).applyMatrix3(m.clone().invert());
  }
  const w = 1e-3;
  const M = [
    [w, 0, 0],
    [0, w, 0],
    [0, 0, w],
  ];
  const r = [w * p.x, w * p.y, w * p.z];
  for (let k = 0; k < A.length; k++) {
    for (let i = 0; i < 3; i++) {
      r[i] += A[k][i] * b[k];
      for (let j = 0; j < 3; j++) M[i][j] += A[k][i] * A[k][j];
    }
  }
  const m = new THREE.Matrix3().set(M[0][0], M[0][1], M[0][2], M[1][0], M[1][1], M[1][2], M[2][0], M[2][1], M[2][2]);
  const inv = m.clone().invert();
  const x = new THREE.Vector3(r[0], r[1], r[2]).applyMatrix3(inv);
  return x;
}

/** Shell: hollow the body with the given wall thickness, removing the listed faces. */
export function applyShell(body: THREE.BufferGeometry, thickness: number, open: FaceRefData[], multi: (FaceRefData & { thickness: number })[] = []): THREE.BufferGeometry {
  const inner = offsetInward(body, thickness, open, 1e3, multi);
  return csg(body, inner, 'subtract');
}

/**
 * What the body was built from: the union of all added material and the tool solids of
 * every cut (cuts, holes, convex fillets and chamfers, their patterns and mirrors).
 */
export interface BuildHistory {
  boss: THREE.BufferGeometry | null;
  cuts: THREE.BufferGeometry[];
}

/**
 * Shell built from the history: the hollow is the inward offset of the added material
 * minus every cut tool grown by the wall thickness, each as a boolean. Unlike offsetting
 * the finished body, this stays a valid solid when holes or cuts sit closer together
 * than twice the wall thickness, and the walls around every cut get the right thickness.
 */
export function applyShellFromHistory(body: THREE.BufferGeometry, thickness: number, open: FaceRefData[], history: BuildHistory, multi: (FaceRefData & { thickness: number })[] = []): THREE.BufferGeometry {
  if (!history.boss) return applyShell(body, thickness, open, multi);
  let inner = offsetInward(history.boss, thickness, open, 1e3, multi);
  for (const tool of history.cuts) inner = csg(inner, offsetInward(tool, -thickness), 'subtract');
  return csg(body, inner, 'subtract');
}

/** Shell outward: the wall grows outside the body (the body becomes the cavity), open through the removed faces. */
export function applyShellOutward(body: THREE.BufferGeometry, thickness: number, open: FaceRefData[]): THREE.BufferGeometry {
  const outer = offsetInward(body, -thickness, []);
  const cavity = offsetInward(body, 0, open);
  return csg(outer, cavity, 'subtract');
}
