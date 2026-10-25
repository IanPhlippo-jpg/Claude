import * as THREE from 'three';
import { planarFaces } from './solid';
import { TOL } from './tolerance';

type V3 = [number, number, number];

/**
 * Delete Face: the picked faces leave the body. Delete: an open (surface) body is left; Delete and Patch / Delete
 * and Fill: every hole left behind is closed again — a flat patch when its rim lies in a plane (a hole in a plate,
 * a pocket's floor), else a fan over the rim. Faces are found again by their centroid (and normal for planar ones).
 */
export function deleteFaces(g: THREE.BufferGeometry, refs: { normal: V3; point: V3 }[], option: 'delete' | 'patch' | 'fill' = 'patch'): { geometry: THREE.BufferGeometry | null; error?: string } {
  const src = g.index ? g.toNonIndexed() : g;
  const pos = src.getAttribute('position');
  const faces = planarFaces(src, 'x');
  const gone = new Set<number>();
  for (const r of refs) {
    const p = new THREE.Vector3(...r.point), n = new THREE.Vector3(...r.normal);
    let best: (typeof faces)[number] | null = null, bd = Infinity;
    for (const f of faces) {
      if (!f.curved && new THREE.Vector3(...f.normal).dot(n) < TOL.parallel) continue;
      const d = new THREE.Vector3(...f.centroid).distanceTo(p);
      if (d < bd) { bd = d; best = f; }
    }
    if (!best || bd > TOL.reference) return { geometry: null, error: 'A face to delete is no longer there.' };
    for (const t of best.triangles) gone.add(t);
  }
  const tri = (t: number) => [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, t * 3 + k));
  const keep: THREE.Vector3[][] = [];
  for (let t = 0; t < pos.count / 3; t++) if (!gone.has(t)) keep.push(tri(t));
  const out: number[] = [];
  for (const v of keep) for (const p of v) out.push(p.x, p.y, p.z);
  if (option !== 'delete') {
    // the rim of every hole: the outline of the deleted faces themselves, run the same way round (the kept faces
    // meet it the other way); taken from the deleted triangles, so T-junctions elsewhere in the mesh do not matter
    const key = (p: THREE.Vector3) => `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)},${Math.round(p.z * 1e4)}`;
    const pts = new Map<string, THREE.Vector3>();
    const directed = new Set<string>();
    for (const t of gone) {
      const v = tri(t);
      for (let k = 0; k < 3; k++) {
        const a = key(v[k]), b = key(v[(k + 1) % 3]);
        pts.set(a, v[k]);
        if (a !== b) directed.add(a + '>' + b);
      }
    }
    const next = new Map<string, string>();
    for (const e of directed) {
      const [a, b] = e.split('>');
      if (!directed.has(b + '>' + a)) next.set(a, b);
    }
    const used = new Set<string>();
    for (const start of next.keys()) {
      if (used.has(start)) continue;
      const loop: THREE.Vector3[] = [];
      let cur: string | undefined = start;
      while (cur && !used.has(cur)) {
        used.add(cur);
        loop.push(pts.get(cur)!);
        cur = next.get(cur);
      }
      if (loop.length < 3) continue;
      // Newell normal of the rim in the patch's running order
      const nrm = new THREE.Vector3();
      for (let i = 0; i < loop.length; i++) {
        const a = loop[i], b = loop[(i + 1) % loop.length];
        nrm.x += (a.y - b.y) * (a.z + b.z);
        nrm.y += (a.z - b.z) * (a.x + b.x);
        nrm.z += (a.x - b.x) * (a.y + b.y);
      }
      if (nrm.lengthSq() < 1e-18) continue;
      nrm.normalize();
      const c = loop.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(loop.length);
      const flat = loop.every((p) => Math.abs(p.clone().sub(c).dot(nrm)) < 1e-3);
      if (flat) {
        const u = new THREE.Vector3(Math.abs(nrm.x) < 0.9 ? 1 : 0, Math.abs(nrm.x) < 0.9 ? 0 : 1, 0).cross(nrm).normalize();
        const w = nrm.clone().cross(u);
        const flat2 = loop.map((p) => new THREE.Vector2(p.clone().sub(c).dot(u), p.clone().sub(c).dot(w)));
        const ccw = !THREE.ShapeUtils.isClockWise(flat2);
        for (const t of THREE.ShapeUtils.triangulateShape(flat2, [])) {
          const [i0, i1, i2] = ccw ? t : [t[0], t[2], t[1]];
          for (const i of [i0, i1, i2]) out.push(loop[i].x, loop[i].y, loop[i].z);
        }
      } else {
        for (let i = 0; i < loop.length; i++) {
          const a = loop[i], b = loop[(i + 1) % loop.length];
          out.push(c.x, c.y, c.z, a.x, a.y, a.z, b.x, b.y, b.z);
        }
      }
    }
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  r.computeVertexNormals();
  return { geometry: r };
}
