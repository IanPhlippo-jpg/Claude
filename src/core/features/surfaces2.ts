import * as THREE from 'three';
import { openEdges } from './surfaces';
import type { PlaneDef } from '../document/types';

/**
 * Surface tools of the Surfaces tab beyond the basic set: Filled Surface / Untrim / Delete Hole (closing boundary
 * loops), Extend Surface, Ruled Surface, Surface Flatten, and the half-space box used by Cut With Surface.
 * Everything works on triangle soups: boundaries are the open edges of the mesh.
 */

const key = (p: THREE.Vector3) => `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)},${Math.round(p.z * 1e4)}`;

/** the open boundary loops of a surface, each as an ordered polyline (closed), largest area first */
export function boundaryLoops(g: THREE.BufferGeometry): THREE.Vector3[][] {
  const segs = openEdges(g);
  const next = new Map<string, THREE.Vector3[]>();
  const pts = new Map<string, THREE.Vector3>();
  for (const [a, b] of segs) {
    pts.set(key(a), a);
    pts.set(key(b), b);
    const list = next.get(key(a)) ?? [];
    list.push(b);
    next.set(key(a), list);
  }
  const used = new Set<string>();
  const loops: THREE.Vector3[][] = [];
  for (const [a] of segs) {
    const start = key(a);
    if (used.has(start)) continue;
    const loop: THREE.Vector3[] = [];
    let cur: string | undefined = start;
    let guard = 0;
    while (cur && !used.has(cur) && guard++ < 100000) {
      used.add(cur);
      loop.push(pts.get(cur)!);
      const nx = next.get(cur);
      cur = nx && nx.length ? key(nx[0]) : undefined;
    }
    if (loop.length >= 3) loops.push(loop);
  }
  const area = (loop: THREE.Vector3[]) => {
    const n = new THREE.Vector3();
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length];
      n.x += (a.y - b.y) * (a.z + b.z);
      n.y += (a.z - b.z) * (a.x + b.x);
      n.z += (a.x - b.x) * (a.y + b.y);
    }
    return n.length() / 2;
  };
  return loops.sort((p, q) => area(q) - area(p));
}

/** a flat (or fan) patch over a closed loop; the triangles face along the loop's Newell normal */
export function capLoop(loop: THREE.Vector3[]): number[] {
  const out: number[] = [];
  const nrm = new THREE.Vector3();
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length];
    nrm.x += (a.y - b.y) * (a.z + b.z);
    nrm.y += (a.z - b.z) * (a.x + b.x);
    nrm.z += (a.x - b.x) * (a.y + b.y);
  }
  if (nrm.lengthSq() < 1e-18) return out;
  nrm.normalize();
  const c = loop.reduce((s, p) => s.add(p), new THREE.Vector3()).divideScalar(loop.length);
  const flat = loop.every((p) => Math.abs(p.clone().sub(c).dot(nrm)) < 1e-3);
  if (flat) {
    const u = new THREE.Vector3(Math.abs(nrm.x) < 0.9 ? 1 : 0, Math.abs(nrm.x) < 0.9 ? 0 : 1, 0).cross(nrm).normalize();
    const w = nrm.clone().cross(u);
    const p2 = loop.map((p) => new THREE.Vector2(p.clone().sub(c).dot(u), p.clone().sub(c).dot(w)));
    const ccw = !THREE.ShapeUtils.isClockWise(p2);
    for (const t of THREE.ShapeUtils.triangulateShape(p2, [])) {
      const [i0, i1, i2] = ccw ? t : [t[0], t[2], t[1]];
      for (const i of [i0, i1, i2]) out.push(loop[i].x, loop[i].y, loop[i].z);
    }
  } else {
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length];
      out.push(c.x, c.y, c.z, a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  return out;
}

/** Filled Surface / Untrim / Delete Hole: close the boundary loops — the outer (largest) one, the inner ones, or all */
export function fillLoops(g: THREE.BufferGeometry, which: 'outer' | 'inner' | 'all'): THREE.BufferGeometry | null {
  const loops = boundaryLoops(g);
  const chosen = which === 'all' ? loops : which === 'outer' ? loops.slice(0, 1) : loops.slice(1);
  const pos: number[] = [];
  for (const loop of chosen) pos.push(...capLoop(loop));
  if (!pos.length) return null;
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return out;
}

/** Extend Surface: every open edge gets a strip of `distance`, in the plane of its triangle, away from it */
export function extendSurface(g: THREE.BufferGeometry, distance: number): THREE.BufferGeometry | null {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const edgeCount = new Map<string, number>();
  const tris: THREE.Vector3[][] = [];
  for (let t = 0; t + 2 < a.count; t += 3) {
    const v = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(a, t + k));
    tris.push(v);
    for (let k = 0; k < 3; k++) {
      const e = [key(v[k]), key(v[(k + 1) % 3])].sort().join('|');
      edgeCount.set(e, (edgeCount.get(e) ?? 0) + 1);
    }
  }
  const pos: number[] = [];
  for (const v of tris) {
    for (let k = 0; k < 3; k++) {
      const p = v[k], q = v[(k + 1) % 3], r = v[(k + 2) % 3];
      const e = [key(p), key(q)].sort().join('|');
      if (edgeCount.get(e) !== 1) continue;
      // outward in the triangle plane: perpendicular to the edge, away from the third vertex
      const edge = q.clone().sub(p);
      const n = edge.clone().cross(r.clone().sub(p)).normalize();
      const out = n.clone().cross(edge).normalize();
      if (out.dot(r.clone().sub(p)) > 0) out.negate();
      const p2 = p.clone().addScaledVector(out, distance), q2 = q.clone().addScaledVector(out, distance);
      pos.push(p.x, p.y, p.z, q.x, q.y, q.z, q2.x, q2.y, q2.z, p.x, p.y, p.z, q2.x, q2.y, q2.z, p2.x, p2.y, p2.z);
    }
  }
  if (!pos.length) return null;
  const outG = new THREE.BufferGeometry();
  outG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  outG.computeVertexNormals();
  return outG;
}

/** Ruled Surface: a strip from the edge polyline along a direction (per point) by `distance` */
export function ruledSurface(edge: THREE.Vector3[], dirAt: (i: number) => THREE.Vector3, distance: number): THREE.BufferGeometry | null {
  if (edge.length < 2) return null;
  const pos: number[] = [];
  const off = edge.map((p, i) => p.clone().addScaledVector(dirAt(i).normalize(), distance));
  for (let i = 0; i + 1 < edge.length; i++) {
    const p = edge[i], q = edge[i + 1], p2 = off[i], q2 = off[i + 1];
    pos.push(p.x, p.y, p.z, q.x, q.y, q.z, q2.x, q2.y, q2.z, p.x, p.y, p.z, q2.x, q2.y, q2.z, p2.x, p2.y, p2.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * Surface Flatten: a rigid unfold. The first triangle lies in the XY plane; every neighbour is laid down by the
 * distances of its free vertex to the two shared ones (exact for developable surfaces, an approximation otherwise).
 */
export function flattenSurface(g: THREE.BufferGeometry): THREE.BufferGeometry | null {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const n = Math.floor(a.count / 3);
  if (!n) return null;
  const V = (i: number) => new THREE.Vector3().fromBufferAttribute(a, i);
  const vkey = (i: number) => key(V(i));
  // vertex ids by position, edges → triangles
  const ids = new Map<string, number>();
  const tri: number[][] = [];
  for (let t = 0; t < n; t++) {
    const row: number[] = [];
    for (let k = 0; k < 3; k++) {
      const kk = vkey(t * 3 + k);
      if (!ids.has(kk)) ids.set(kk, ids.size);
      row.push(ids.get(kk)!);
    }
    tri.push(row);
  }
  const world: THREE.Vector3[] = new Array(ids.size);
  for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) world[tri[t][k]] = V(t * 3 + k);
  const byEdge = new Map<string, number[]>();
  for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) {
    const e = [tri[t][k], tri[t][(k + 1) % 3]].sort((x, y) => x - y).join('|');
    const l = byEdge.get(e) ?? [];
    l.push(t);
    byEdge.set(e, l);
  }
  const flat: (THREE.Vector2 | undefined)[] = new Array(ids.size);
  const placed: boolean[] = new Array(n).fill(false);
  const out: number[] = [];
  const place2 = (i: number, j: number, k: number): THREE.Vector2 | null => {
    // k's flat position from its 3D distances to i and j (circle intersection), on the side away from the triangle's other neighbours
    const A = flat[i]!, B = flat[j]!;
    const d = A.distanceTo(B);
    if (d < 1e-9) return null;
    const ra = world[i].distanceTo(world[k]), rb = world[j].distanceTo(world[k]);
    const x = (ra * ra - rb * rb + d * d) / (2 * d);
    const h2 = ra * ra - x * x;
    const h = Math.sqrt(Math.max(0, h2));
    const ex = B.clone().sub(A).divideScalar(d);
    const ey = new THREE.Vector2(-ex.y, ex.x);
    return A.clone().addScaledVector(ex, x).addScaledVector(ey, h);
  };
  // seed: the largest triangle, laid down with its first edge along +X
  let seed = 0, best = -1;
  for (let t = 0; t < n; t++) {
    const [i, j, k] = tri[t];
    const ar = world[j].clone().sub(world[i]).cross(world[k].clone().sub(world[i])).length();
    if (ar > best) { best = ar; seed = t; }
  }
  const queue: number[] = [];
  const start = (t: number) => {
    const [i, j, k] = tri[t];
    flat[i] = new THREE.Vector2(0, 0);
    flat[j] = new THREE.Vector2(world[i].distanceTo(world[j]), 0);
    flat[k] = place2(i, j, k) ?? new THREE.Vector2(0, 0);
    placed[t] = true;
    queue.push(t);
  };
  start(seed);
  const emit = (t: number) => { for (const v of tri[t]) { const p = flat[v]!; out.push(p.x, p.y, 0); } };
  emit(seed);
  while (queue.length) {
    const t = queue.shift()!;
    for (let k = 0; k < 3; k++) {
      const i = tri[t][k], j = tri[t][(k + 1) % 3];
      const e = [i, j].sort((x, y) => x - y).join('|');
      for (const u of byEdge.get(e) ?? []) {
        if (placed[u]) continue;
        const free = tri[u].find((v) => v !== i && v !== j)!;
        // the free vertex goes to the side opposite the current triangle's third vertex
        const other = tri[t].find((v) => v !== i && v !== j)!;
        let p = place2(i, j, free);
        if (!p) continue;
        const A = flat[i]!, B = flat[j]!, O = flat[other]!;
        const side = (P: THREE.Vector2) => (B.x - A.x) * (P.y - A.y) - (B.y - A.y) * (P.x - A.x);
        if (Math.sign(side(p)) === Math.sign(side(O))) {
          // mirror across the edge
          const ex = B.clone().sub(A).normalize();
          const rel = p.clone().sub(A);
          const along = rel.dot(ex);
          const perp = rel.clone().sub(ex.clone().multiplyScalar(along));
          p = A.clone().addScaledVector(ex, along).sub(perp);
        }
        if (flat[free] === undefined) flat[free] = p;
        placed[u] = true;
        emit(u);
        queue.push(u);
      }
    }
  }
  // triangles of other components (disconnected) are laid down after the first
  for (let t = 0; t < n; t++) if (!placed[t]) { start(t); emit(t); }
  const g2 = new THREE.BufferGeometry();
  g2.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g2.computeVertexNormals();
  return g2;
}

/** Cut With Surface: a big box on one side of a plane (the side along the normal, or the other with flip) */
export function halfSpaceBox(plane: { origin: [number, number, number]; n: [number, number, number] }, size: number, flip: boolean): THREE.BufferGeometry {
  const n = new THREE.Vector3(...plane.n).normalize();
  if (flip) n.negate();
  const o = new THREE.Vector3(...plane.origin);
  const box = new THREE.BoxGeometry(size * 2, size * 2, size * 2).toNonIndexed();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  box.applyQuaternion(q);
  box.translate(o.x + n.x * size, o.y + n.y * size, o.z + n.z * size);
  return box;
}

/** a plane definition from an origin and a normal (for the trim helpers) */
export function planeFrom(origin: [number, number, number], n: [number, number, number]): PlaneDef {
  const nn = new THREE.Vector3(...n).normalize();
  const ref = Math.abs(nn.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = ref.clone().cross(nn).normalize(), v = nn.clone().cross(u).normalize();
  return { id: 'fit', name: 'Fit plane', origin, u: [u.x, u.y, u.z], v: [v.x, v.y, v.z], n: [nn.x, nn.y, nn.z] };
}
