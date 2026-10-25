import * as THREE from 'three';

/**
 * Feature edges of a triangle mesh for "Shaded With Edges": an edge is drawn where the
 * surface creases (dihedral angle above the threshold) or has no neighbour. Unlike
 * THREE.EdgesGeometry this tolerates the T-junctions that boolean operations leave
 * behind: neighbours are found by collinear overlap, not by identical end points.
 */
export type TangentMode = 'visible' | 'phantom' | 'removed';

/** Feature edges as one geometry; tangent edges follow the mode (visible, phantom = drawn dashed by the caller, removed). */
export function featureEdges(g: THREE.BufferGeometry, thresholdDeg = 20, tangent: TangentMode = 'visible'): THREE.BufferGeometry {
  return featureEdgeSets(g, thresholdDeg, tangent).edges;
}

/** Crease edges and tangent edges separately (tangent edges are empty unless the mode is 'phantom'). */
export function featureEdgeSets(g: THREE.BufferGeometry, thresholdDeg = 20, tangent: TangentMode = 'visible'): { edges: THREE.BufferGeometry; tangentEdges: THREE.BufferGeometry } {
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.getAttribute('position');
  const triCount = Math.floor(pos.count / 3);
  const P = (i: number) => new THREE.Vector3().fromBufferAttribute(pos, i);
  const normals: THREE.Vector3[] = [];
  interface Edge {
    tri: number;
    a: THREE.Vector3;
    b: THREE.Vector3;
    dir: THREE.Vector3;
    len: number;
  }
  const edges: Edge[] = [];
  // lines: key by the infinite line the edge lies on -> edges on it
  const lines = new Map<string, Edge[]>();
  const Q = 1e-3;
  // edges are grouped by (canonical) direction; collinearity is then tested by distance to the line,
  // which tolerates the small numerical noise booleans leave behind
  // the line of an edge: canonical direction plus the foot point of the origin on it (0.5 mm cells, neighbours
  // searched too), so only edges on one line are compared (direction alone is quadratic on cylinders and threads)
  const CELL = 0.5;
  const dirKey = (e: Edge): string => {
    const d = e.dir.clone();
    const firstNonZero = Math.abs(d.x) > 1e-6 ? d.x : Math.abs(d.y) > 1e-6 ? d.y : d.z;
    if (firstNonZero < 0) d.negate();
    const r = (v: number) => Math.round(v / 0.02);
    return `${r(d.x)},${r(d.y)},${r(d.z)}`;
  };
  const lineKey = (e: Edge, dx = 0, dy = 0, dz = 0): string => {
    const q = e.a.clone().addScaledVector(e.dir, -e.a.dot(e.dir));
    return `${dirKey(e)}|${Math.round(q.x / CELL) + dx},${Math.round(q.y / CELL) + dy},${Math.round(q.z / CELL) + dz}`;
  };
  const NEAR: [number, number, number][] = [];
  for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) for (const dz of [-1, 0, 1]) NEAR.push([dx, dy, dz]);
  const lineGroup = (e: Edge): Edge[] => { const out: Edge[] = []; for (const [dx, dy, dz] of NEAR) { const g2 = lines.get(lineKey(e, dx, dy, dz)); if (g2) out.push(...g2); } return out; };
  const distToLine = (p: THREE.Vector3, e: Edge) => p.clone().sub(e.a).cross(e.dir).length();
  const collinear = (o: Edge, e: Edge) => distToLine(o.a, e) < 0.02 && distToLine(o.b, e) < 0.02;
  void Q;
  for (let t = 0; t < triCount; t++) {
    const p0 = P(t * 3), p1 = P(t * 3 + 1), p2 = P(t * 3 + 2);
    const n = p1.clone().sub(p0).cross(p2.clone().sub(p0));
    const l = n.length();
    normals.push(l > 1e-12 ? n.divideScalar(l) : n);
    if (l <= 1e-12) continue;
    for (const [a, b] of [[p0, p1], [p1, p2], [p2, p0]] as [THREE.Vector3, THREE.Vector3][]) {
      const dir = b.clone().sub(a);
      const len = dir.length();
      if (len < 1e-9) continue;
      dir.divideScalar(len);
      const e: Edge = { tri: t, a, b, dir, len };
      edges.push(e);
      const k = lineKey(e);
      (lines.get(k) ?? lines.set(k, []).get(k)!).push(e);
    }
  }
  const cosT = Math.cos((thresholdDeg * Math.PI) / 180);
  // planar faces versus facets of curved surfaces: a tangent edge (planar face meeting a
  // fillet or cylinder) is drawn too, as the original shows tangent edges by default
  const groups = new Map<string, { tris: number[]; area: number }>();
  const groupOf: string[] = [];
  let totalArea = 0;
  for (let t = 0; t < triCount; t++) {
    const n = normals[t];
    const d = n.dot(P(t * 3));
    const fx = (v: number) => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2));
    const k = `${fx(n.x)},${fx(n.y)},${fx(n.z)}|${d.toFixed(1)}`;
    const area = P(t * 3 + 1).sub(P(t * 3)).cross(P(t * 3 + 2).sub(P(t * 3))).length() / 2;
    totalArea += area;
    const gr = groups.get(k) ?? groups.set(k, { tris: [], area: 0 }).get(k)!;
    gr.tris.push(t);
    gr.area += area;
    groupOf[t] = k;
  }
  // big planar faces; a triangle is planar when it lies (within 1.5°, 0.05 units) in one of them,
  // so the slivers that booleans leave on flat faces are not mistaken for facets of a curved surface
  const bigPlanes: { n: THREE.Vector3; d: number }[] = [];
  for (const gr of groups.values()) {
    if (gr.area > totalArea * 0.02) {
      const t = gr.tris[0];
      bigPlanes.push({ n: normals[t], d: normals[t].dot(P(t * 3)) });
    }
  }
  // slivers on a planar face have unreliable normals: give every triangle whose vertices lie
  // on a big plane that plane's normal, so its edges are judged like the rest of the face
  for (let t = 0; t < triCount; t++) {
    const q0 = P(t * 3), q1 = P(t * 3 + 1), q2 = P(t * 3 + 2);
    let best: { n: THREE.Vector3; d: number } | null = null, bestDot = -Infinity;
    for (const pl of bigPlanes) {
      if (Math.abs(pl.n.dot(q0) - pl.d) < 0.005 && Math.abs(pl.n.dot(q1) - pl.d) < 0.005 && Math.abs(pl.n.dot(q2) - pl.d) < 0.005) {
        const dot = pl.n.dot(normals[t]);
        if (dot > bestDot) { bestDot = dot; best = pl; }
      }
    }
    if (best) normals[t] = best.n.clone();
  }
  const planarCache = new Map<number, boolean>();
  // a triangle is planar when all three of its vertices lie on one of the big planes (its own
  // normal may be off for degenerate slivers); facets of fillets and cylinders never do
  const planar = (t: number) => {
    const c = planarCache.get(t);
    if (c !== undefined) return c;
    const q0 = P(t * 3), q1 = P(t * 3 + 1), q2 = P(t * 3 + 2);
    const v = bigPlanes.some((pl) => Math.abs(pl.n.dot(q0) - pl.d) < 0.005 && Math.abs(pl.n.dot(q1) - pl.d) < 0.005 && Math.abs(pl.n.dot(q2) - pl.d) < 0.005);
    planarCache.set(t, v);
    return v;
  };
  void groupOf;
  const cosTangent = Math.cos((1.5 * Math.PI) / 180);
  // triangles per big plane, for the interior test below
  const planeTris = new Map<number, number[]>();
  for (let t = 0; t < triCount; t++) {
    if (!planar(t)) continue;
    const q0 = P(t * 3);
    const idx = bigPlanes.findIndex((pl) => Math.abs(pl.n.dot(q0) - pl.d) < 0.005 && Math.abs(pl.n.dot(normals[t])) > 0.9);
    if (idx >= 0) (planeTris.get(idx) ?? planeTris.set(idx, []).get(idx)!).push(t);
  }
  const triOf = (t: number) => [P(t * 3), P(t * 3 + 1), P(t * 3 + 2)];
  const inTriangle = (p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, n: THREE.Vector3) => {
    const s1 = b.clone().sub(a).cross(p.clone().sub(a)).dot(n);
    const s2 = c.clone().sub(b).cross(p.clone().sub(b)).dot(n);
    const s3 = a.clone().sub(c).cross(p.clone().sub(c)).dot(n);
    return (s1 >= -1e-9 && s2 >= -1e-9 && s3 >= -1e-9) || (s1 <= 1e-9 && s2 <= 1e-9 && s3 <= 1e-9);
  };
  /** an uncovered edge of a planar triangle is interior when a coplanar triangle lies just across it */
  const interiorOfPlane = (t: number, a: THREE.Vector3, b: THREE.Vector3): boolean => {
    const q0 = P(t * 3);
    const idx = bigPlanes.findIndex((pl) => Math.abs(pl.n.dot(q0) - pl.d) < 0.005 && Math.abs(pl.n.dot(normals[t])) > 0.9);
    if (idx < 0) return false;
    const n = bigPlanes[idx].n;
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a).normalize();
    const w = n.clone().cross(dir).normalize();
    const [t0, t1, t2] = triOf(t);
    const centroid = t0.clone().add(t1).add(t2).divideScalar(3);
    const side = Math.sign(centroid.clone().sub(mid).dot(w)) || 1;
    const probe = mid.clone().addScaledVector(w, -side * 0.05);
    for (const o of planeTris.get(idx) ?? []) {
      if (o === t) continue;
      const [a0, a1, a2] = triOf(o);
      if (inTriangle(probe, a0, a1, a2, n)) return true;
    }
    return false;
  };
  const out: number[] = [];
  const outTangent: number[] = [];
  const seen = new Set<string>();
  const r2 = (v: number) => Math.round(v / 0.01);
  const emit = (a: THREE.Vector3, b: THREE.Vector3, isTangent = false) => {
    const ka = `${r2(a.x)},${r2(a.y)},${r2(a.z)}`, kb = `${r2(b.x)},${r2(b.y)},${r2(b.z)}`;
    const key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
    if (seen.has(key)) return;
    seen.add(key);
    (isTangent ? outTangent : out).push(a.x, a.y, a.z, b.x, b.y, b.z);
  };
  for (const e of edges) {
    const group = lineGroup(e);
    // intervals along the edge covered by smooth neighbours (same or nearly same normal)
    const covered: [number, number][] = [];
    // parts covered only because the neighbour meets at a tangent (planar face ↔ curved surface)
    const tangentCovered: [number, number][] = [];
    for (const o of group) {
      if (o.tri === e.tri || !collinear(o, e)) continue;
      // parameter range of o on e's axis
      const t0 = o.a.clone().sub(e.a).dot(e.dir), t1 = o.b.clone().sub(e.a).dot(e.dir);
      const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(e.len, Math.max(t0, t1));
      if (hi - lo < 1e-6) continue;
      const dot = normals[o.tri].dot(normals[e.tri]);
      const bothCurved = !planar(o.tri) && !planar(e.tri);
      // smooth continuation: within the crease threshold between facets of one curved surface,
      // or (nearly) exactly coplanar between planar faces; a planar face meeting a curved
      // surface at a visible angle is a tangent edge and gets drawn
      const smooth = bothCurved ? dot > cosT : dot > (planar(o.tri) && planar(e.tri) ? cosT : cosTangent);
      if (smooth) covered.push([lo, hi]);
      else if (!bothCurved && !(planar(o.tri) && planar(e.tri)) && dot > cosT) {
        // a tangent edge: hidden when removed, listed separately when phantom
        if (tangent === 'removed') covered.push([lo, hi]);
        else if (tangent === 'phantom') tangentCovered.push([lo, hi]);
      }
    }
    // uncovered parts are creases or open boundaries: draw them
    covered.sort((x, y) => x[0] - y[0]);
    let cursor = 0;
    const tangentAt = (t: number) => tangentCovered.some(([lo, hi]) => t >= lo - 1e-6 && t <= hi + 1e-6);
    const emitChecked = (a: THREE.Vector3, b: THREE.Vector3) => {
      if (planar(e.tri) && interiorOfPlane(e.tri, a, b)) return;
      const mid = a.clone().add(b).multiplyScalar(0.5).sub(e.a).dot(e.dir);
      emit(a, b, tangentAt(mid));
    };
    for (const [lo, hi] of covered) {
      if (lo > cursor + 1e-6) emitChecked(e.a.clone().addScaledVector(e.dir, cursor), e.a.clone().addScaledVector(e.dir, lo));
      cursor = Math.max(cursor, hi);
    }
    if (cursor < e.len - 1e-6) emitChecked(e.a.clone().addScaledVector(e.dir, cursor), e.b);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  const tg = new THREE.BufferGeometry();
  tg.setAttribute('position', new THREE.Float32BufferAttribute(outTangent, 3));
  return { edges: geom, tangentEdges: tg };
}

/**
 * Vertex normals that are smooth across gentle angles (cylinders) and sharp across
 * creases: each vertex of a non-indexed mesh averages the normals of the triangles
 * at the same position whose normal is within the threshold of its own.
 */
export function smoothNormals(g: THREE.BufferGeometry, thresholdDeg = 30): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.getAttribute('position');
  const triCount = Math.floor(pos.count / 3);
  const faceN: THREE.Vector3[] = [];
  const byPos = new Map<string, number[]>();
  const key = (i: number) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
  for (let t = 0; t < triCount; t++) {
    p0.fromBufferAttribute(pos, t * 3);
    p1.fromBufferAttribute(pos, t * 3 + 1);
    p2.fromBufferAttribute(pos, t * 3 + 2);
    const n = p1.clone().sub(p0).cross(p2.clone().sub(p0));
    const l = n.length();
    faceN.push(l > 1e-12 ? n.divideScalar(l) : new THREE.Vector3(0, 1, 0));
    for (let k = 0; k < 3; k++) {
      const kk = key(t * 3 + k);
      (byPos.get(kk) ?? byPos.set(kk, []).get(kk)!).push(t);
    }
  }
  const cosT = Math.cos((thresholdDeg * Math.PI) / 180);
  const out = new Float32Array(pos.count * 3);
  const acc = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.floor(i / 3);
    acc.copy(faceN[t]);
    for (const o of byPos.get(key(i)) ?? []) {
      if (o !== t && faceN[o].dot(faceN[t]) > cosT) acc.add(faceN[o]);
    }
    acc.normalize();
    out[i * 3] = acc.x;
    out[i * 3 + 1] = acc.y;
    out[i * 3 + 2] = acc.z;
  }
  ng.setAttribute('normal', new THREE.Float32BufferAttribute(out, 3));
  return ng;
}
