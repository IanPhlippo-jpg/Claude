import * as THREE from 'three';
import type { Body } from './rebuild';

/** Evaluate ▸ Check: closed-shell and face/edge checks of the bodies, as the original's Check Entity dialog. */
export function bodyCheck(bodies: Body[], shortEdge = 0.01): { body: string; openEdges: number; nonManifold: number; degenerate: number; short: number }[] {
  return bodies.map((b) => {
    const g = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry;
    const pos = g.getAttribute('position');
    const key = (i: number) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    const edgeUse = new Map<string, number>();
    const edgeDir = new Map<string, number>();
    let degenerate = 0, short = 0;
    const a = new THREE.Vector3(), bb = new THREE.Vector3(), c = new THREE.Vector3();
    for (let t = 0; t + 2 < pos.count; t += 3) {
      a.fromBufferAttribute(pos, t);
      bb.fromBufferAttribute(pos, t + 1);
      c.fromBufferAttribute(pos, t + 2);
      if (bb.clone().sub(a).cross(c.clone().sub(a)).length() < 1e-10) degenerate++;
      const ks = [key(t), key(t + 1), key(t + 2)];
      for (let k = 0; k < 3; k++) {
        const from = ks[k], to = ks[(k + 1) % 3];
        const e = from < to ? `${from}|${to}` : `${to}|${from}`;
        edgeUse.set(e, (edgeUse.get(e) ?? 0) + 1);
        // orientation balance: a consistent shell runs every edge once each way (or in matched pairs)
        edgeDir.set(e, (edgeDir.get(e) ?? 0) + (from < to ? 1 : -1));
      }
    }
    let nonManifold = 0;
    const single = new Set<string>();
    for (const [k, n] of edgeUse) {
      if (n === 1) single.add(k);
      else if (n > 2 && Math.abs(edgeDir.get(k) ?? 0) >= 2) nonManifold++;
    }
    // closed shell: the vector area (sum of normal x area) vanishes for any closed surface, T-junctions or not;
    // an opening leaves the vector area of the missing patch
    const va = new THREE.Vector3();
    let total = 0;
    for (let t = 0; t + 2 < pos.count; t += 3) {
      a.fromBufferAttribute(pos, t);
      bb.fromBufferAttribute(pos, t + 1);
      c.fromBufferAttribute(pos, t + 2);
      const cr = bb.clone().sub(a).cross(c.clone().sub(a));
      va.add(cr);
      total += cr.length();
    }
    const openEdges = total > 0 && va.length() / total > 1e-6 ? Math.max(1, single.size) : 0;
    for (const e of b.edges) if (e.length < shortEdge) short++;
    return { body: b.id, openEdges, nonManifold, degenerate, short };
  });
}

/** Section properties of a planar face: area, centroid, second moments about the centroid (in the face plane). */
export function sectionProperties(g: THREE.BufferGeometry, triangles: number[], normal: [number, number, number]): { area: number; centroid: THREE.Vector3; ixx: number; iyy: number; ixy: number; u: THREE.Vector3; v: THREE.Vector3 } {
  const n = new THREE.Vector3(...normal).normalize();
  const u = new THREE.Vector3().crossVectors(Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0), n).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.getAttribute('position');
  let A = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  const p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  let ref: THREE.Vector3 | null = null;
  for (const t of triangles) {
    for (let k = 0; k < 3; k++) p[k].fromBufferAttribute(pos, t * 3 + k);
    ref ??= p[0].clone();
    const q = p.map((x) => [x.clone().sub(ref!).dot(u), x.clone().sub(ref!).dot(v)]);
    const a = ((q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[2][0] - q[0][0]) * (q[1][1] - q[0][1])) / 2;
    const [x1, y1] = q[0], [x2, y2] = q[1], [x3, y3] = q[2];
    A += a;
    sx += (a * (x1 + x2 + x3)) / 3;
    sy += (a * (y1 + y2 + y3)) / 3;
    sxx += (a / 6) * (x1 * x1 + x2 * x2 + x3 * x3 + x1 * x2 + x1 * x3 + x2 * x3);
    syy += (a / 6) * (y1 * y1 + y2 * y2 + y3 * y3 + y1 * y2 + y1 * y3 + y2 * y3);
    sxy += (a / 12) * (2 * x1 * y1 + 2 * x2 * y2 + 2 * x3 * y3 + x1 * y2 + x2 * y1 + x1 * y3 + x3 * y1 + x2 * y3 + x3 * y2);
  }
  const s = Math.sign(A) || 1;
  A *= s; sx *= s; sy *= s; sxx *= s; syy *= s; sxy *= s;
  const cx = sx / (A || 1), cy = sy / (A || 1);
  const centroid = (ref ?? new THREE.Vector3()).clone().addScaledVector(u, cx).addScaledVector(v, cy);
  // about the centroid: Ixx = ∫ y² dA, Iyy = ∫ x² dA (area moments, mm^4)
  return { area: A, centroid, ixx: syy - A * cy * cy, iyy: sxx - A * cx * cx, ixy: sxy - A * cx * cy, u, v };
}

