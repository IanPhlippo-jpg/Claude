import * as THREE from 'three';
import { bodyEdges } from './edgesets';
import { circleSegments } from '../sketch/geometry';
import type { BodyEdge, CreaseSegment } from './edgesets';
import { csg, mergeGeometries } from './solid';

/**
 * Fillet and chamfer on the edges of a mesh body. Each crease segment gets a tool prism
 * (its cross-section is the material removed for a convex edge, or added for a concave
 * one) that is extruded along the segment and combined with the body by a boolean.
 */
// tiny step outside the faces so the tool never shares an edge with the body's faces (keeps the
// boolean robust); the tangent line shifts by EPS / tan(half facet angle), about 0.04 mm
const EPS = 0.003;

/** cross-section frame of a segment: t1 lies in face 1, t2 in face 2, both perpendicular to the edge and pointing away from it */
function frame(s: CreaseSegment) {
  const dir = s.b.clone().sub(s.a).normalize();
  const t1 = dir.clone().cross(s.n1).normalize();
  const t2 = dir.clone().cross(s.n2).normalize();
  // t1 points into face 1 (away from face 2's half space) on a convex edge: t1·n2 < 0
  if (t1.dot(s.n2) > 0) t1.negate();
  if (t2.dot(s.n1) > 0) t2.negate();
  // convex when the outside bisector (n1+n2) points away from the solid between the faces
  const convex = t1.clone().add(t2).dot(s.n1.clone().add(s.n2)) < 0;
  return { dir, t1, t2, convex };
}

/** prism with the given cross-section (world points in the plane through s.a perpendicular to dir), swept along the segment with a small overhang */
function prism(poly: THREE.Vector3[], s: CreaseSegment, dir: THREE.Vector3): THREE.BufferGeometry {
  const o = s.a;
  const u = poly[1].clone().sub(poly[0]);
  u.sub(dir.clone().multiplyScalar(u.dot(dir))).normalize();
  const v = dir.clone().cross(u).normalize();
  const pts = poly.map((p) => {
    const d = p.clone().sub(o);
    return new THREE.Vector2(d.dot(u), d.dot(v));
  });
  const len = s.a.distanceTo(s.b);
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: len + 4 * EPS, bevelEnabled: false });
  g.translate(0, 0, -2 * EPS);
  const m = new THREE.Matrix4().makeBasis(u, v, dir);
  m.setPosition(o);
  g.applyMatrix4(m);
  g.computeVertexNormals();
  return g;
}

/** tool for one segment: chamfer (distance d) or fillet (radius r) */
export function roundTool(s: CreaseSegment, kind: 'fillet' | 'chamfer', size: number, arcSegments = 10): { geometry: THREE.BufferGeometry; convex: boolean } | null {
  const { dir, t1, t2, convex } = frame(s);
  const cosPhi = t1.dot(t2);
  const phi = Math.acos(Math.max(-1, Math.min(1, cosPhi)));
  if (phi < 0.05 || phi > Math.PI - 0.05) return null;
  const o = s.a;
  const bis = t1.clone().add(t2).normalize();
  const outward = s.n1.clone().add(s.n2).normalize().multiplyScalar(convex ? 1 : -1);
  const poly: THREE.Vector3[] = [];
  if (kind === 'chamfer') {
    const p1 = o.clone().addScaledVector(t1, size), p2 = o.clone().addScaledVector(t2, size);
    poly.push(o.clone().addScaledVector(outward, EPS * 4), p1.clone().addScaledVector(s.n1, convex ? EPS : -EPS), p2.clone().addScaledVector(s.n2, convex ? EPS : -EPS));
  } else {
    // circle tangent to both faces at distance s = r / tan(phi/2) from the edge
    const tan = Math.tan(phi / 2);
    const d = size / tan;
    const c = o.clone().addScaledVector(bis, size / Math.sin(phi / 2));
    const p1 = o.clone().addScaledVector(t1, d), p2 = o.clone().addScaledVector(t2, d);
    // the arc starts and ends exactly at the tangent points; a small step outside the faces keeps
    // the tool's side faces clear of the body's faces
    poly.push(o.clone().addScaledVector(outward, EPS * 4));
    poly.push(p1.clone().addScaledVector(s.n1, convex ? EPS : -EPS));
    const v1 = p1.clone().sub(c), v2 = p2.clone().sub(c);
    const axis = v1.clone().cross(v2).normalize();
    const ang = v1.angleTo(v2);
    // a large radius gets more steps (0.02 mm chord deviation) on a straight edge; curved edges keep theirs (many tools)
    const nArc = arcSegments >= 10 ? Math.max(arcSegments, Math.min(48, Math.ceil((circleSegments(size, 40) * ang) / (Math.PI * 2)))) : arcSegments;
    for (let i = 1; i < nArc; i++) {
      const q = new THREE.Quaternion().setFromAxisAngle(axis, (ang * i) / nArc);
      poly.push(c.clone().add(v1.clone().applyQuaternion(q)));
    }
    poly.push(p2.clone().addScaledVector(s.n2, convex ? EPS : -EPS));
  }
  // the cross-section polygon must wind consistently for a valid prism; orientation is irrelevant for the boolean
  return { geometry: prism(poly, s, dir), convex };
}

/** Fillet / chamfer options of the PropertyManager. */
export interface RoundOptions {
  /** asymmetric: the distance on the second face (chamfer D2, fillet asymmetric) */
  size2?: number;
  /** fillet profile: circular (exact), conic by rho, or curvature continuous (rho 0.6) */
  profile?: 'circular' | 'conicRho' | 'conicRadius' | 'curvature';
  rho?: number;
  /** Multi Radius Fillet: a radius per edge (same order as the edges) */
  radii?: number[];
  /** Variable Size Fillet: the radius from the start to the end of each edge */
  variable?: { start: number; end: number };
  /** Partial Edge Parameters: only this part of each edge (fractions of its length) */
  partial?: { start: number; end: number };
}

/** cross-section of an asymmetric or conic fillet / chamfer between the faces (t1 side d1, t2 side d2) */
function profilePoly(o: THREE.Vector3, t1: THREE.Vector3, t2: THREE.Vector3, n1: THREE.Vector3, n2: THREE.Vector3, convex: boolean, outward: THREE.Vector3, kind: 'fillet' | 'chamfer', d1: number, d2: number, w: number, n: number): THREE.Vector3[] {
  const p1 = o.clone().addScaledVector(t1, d1), p2 = o.clone().addScaledVector(t2, d2);
  const poly = [o.clone().addScaledVector(outward, EPS * 4), p1.clone().addScaledVector(n1, convex ? EPS : -EPS)];
  if (kind === 'fillet') {
    // rational quadratic Bezier with the corner as control point: w = sin(phi/2) is the circular arc
    for (let i = 1; i < n; i++) {
      const t = i / n, u = 1 - t;
      const k0 = u * u, k1 = 2 * u * t * w, k2 = t * t, den = k0 + k1 + k2;
      poly.push(p1.clone().multiplyScalar(k0 / den).addScaledVector(o, k1 / den).addScaledVector(p2, k2 / den));
    }
  }
  poly.push(p2.clone().addScaledVector(n2, convex ? EPS : -EPS));
  return poly;
}

/** a closed solid between two cross-sections with the same number of points (ruled sides + end caps) */
function loftPrism(a: THREE.Vector3[], b: THREE.Vector3[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const push = (...v: THREE.Vector3[]) => { for (const p of v) pos.push(p.x, p.y, p.z); };
  const n = a.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    push(a[i], a[j], b[j]);
    push(a[i], b[j], b[i]);
  }
  for (let i = 1; i + 1 < n; i++) {
    push(a[0], a[i + 1], a[i]);
    push(b[0], b[i], b[i + 1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  // outward winding
  let v = 0;
  for (let i = 0; i + 8 < pos.length; i += 9) v += (pos[i] * (pos[i + 4] * pos[i + 8] - pos[i + 5] * pos[i + 7]) - pos[i + 1] * (pos[i + 3] * pos[i + 8] - pos[i + 5] * pos[i + 6]) + pos[i + 2] * (pos[i + 3] * pos[i + 7] - pos[i + 4] * pos[i + 6])) / 6;
  if (v < 0) {
    const at = g.getAttribute('position');
    for (let i = 0; i + 2 < at.count; i += 3) {
      const x = at.getX(i + 1), y = at.getY(i + 1), z = at.getZ(i + 1);
      at.setXYZ(i + 1, at.getX(i + 2), at.getY(i + 2), at.getZ(i + 2));
      at.setXYZ(i + 2, x, y, z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** The tool of one segment with the options: sizes at its start and end (variable size), asymmetric, conic profile. */
export function roundToolOpts(s: CreaseSegment, kind: 'fillet' | 'chamfer', sizeA: number, sizeB: number, o2: RoundOptions, arcSegments = 10): { geometry: THREE.BufferGeometry; convex: boolean } | null {
  const plain = !o2.size2 && (!o2.profile || o2.profile === 'circular') && Math.abs(sizeA - sizeB) < 1e-9;
  if (plain) return roundTool(s, kind, sizeA, arcSegments);
  const { t1, t2, convex } = frame(s);
  const phi = Math.acos(Math.max(-1, Math.min(1, t1.dot(t2))));
  if (phi < 0.05 || phi > Math.PI - 0.05) return null;
  const outward = s.n1.clone().add(s.n2).normalize().multiplyScalar(convex ? 1 : -1);
  const tan = Math.tan(phi / 2);
  const rho = o2.profile === 'conicRho' ? o2.rho ?? 0.5 : o2.profile === 'curvature' ? 0.6 : o2.profile === 'conicRadius' ? Math.min(0.9, Math.max(0.1, o2.rho ?? 0.5)) : Math.sin(phi / 2) / (1 + Math.sin(phi / 2));
  const w = rho / (1 - rho);
  const ratio = o2.size2 && sizeA > 0 ? o2.size2 / (kind === 'fillet' ? sizeA : sizeA) : 1;
  const sec = (o: THREE.Vector3, r: number) => {
    // a fillet of radius r touches the faces r / tan(phi/2) from the edge; a chamfer at r
    const d1 = kind === 'fillet' ? r / tan : r, d2 = d1 * ratio;
    return profilePoly(o, t1, t2, s.n1, s.n2, convex, outward, kind, d1, d2, w, arcSegments);
  };
  const dir = s.b.clone().sub(s.a).normalize();
  const a = s.a.clone().addScaledVector(dir, -2 * EPS), b = s.b.clone().addScaledVector(dir, 2 * EPS);
  return { geometry: loftPrism(sec(a, sizeA), sec(b, sizeB)), convex };
}

/** Fillet / chamfer tools with the options (multi radius, variable size, partial edge, asymmetric, conic). */
export function roundToolsOpts(edges: BodyEdge[], kind: 'fillet' | 'chamfer', size: number, o2: RoundOptions): { cutters: THREE.BufferGeometry[]; adders: THREE.BufferGeometry[] } {
  const cutters: THREE.BufferGeometry[] = [];
  const adders: THREE.BufferGeometry[] = [];
  edges.forEach((e, ei) => {
    const base = o2.radii?.[ei] ?? size;
    const total = e.segments.reduce((acc, sg) => acc + sg.a.distanceTo(sg.b), 0) || 1;
    let run = 0;
    for (const s0 of e.segments) {
      const L = s0.a.distanceTo(s0.b);
      let f0 = run / total, f1 = (run + L) / total;
      run += L;
      let s = s0;
      if (o2.partial) {
        const ps = Math.min(o2.partial.start, o2.partial.end), pe = Math.max(o2.partial.start, o2.partial.end);
        if (f1 <= ps || f0 >= pe) continue;
        const k0 = Math.max(0, (ps - f0) / (f1 - f0)), k1 = Math.min(1, (pe - f0) / (f1 - f0));
        s = { ...s0, a: s0.a.clone().lerp(s0.b, k0), b: s0.a.clone().lerp(s0.b, k1) };
        f0 = f0 + (f1 - f0) * k0;
        f1 = f0 + (f1 - f0) * (k1 - k0);
      }
      const rA = o2.variable ? o2.variable.start + (o2.variable.end - o2.variable.start) * f0 : base;
      const rB = o2.variable ? o2.variable.start + (o2.variable.end - o2.variable.start) * f1 : base;
      const t = roundToolOpts(s, kind, Math.max(0.01, rA), Math.max(0.01, rB), o2, e.straight ? 10 : 6);
      if (!t) continue;
      (t.convex ? cutters : adders).push(t.geometry);
    }
  });
  return { cutters, adders };
}

type FaceLike = { normal: [number, number, number]; centroid: [number, number, number]; curved: boolean };

/** the edges bounding a planar face: a segment with one of its face normals equal to the face and lying in its plane */
export function edgesOnFace(edges: BodyEdge[], face: FaceLike): BodyEdge[] {
  const n = new THREE.Vector3(...face.normal), c = new THREE.Vector3(...face.centroid);
  return edges.filter((e) => e.segments.some((s) => (s.n1.dot(n) > 0.999 || s.n2.dot(n) > 0.999) && Math.abs(s.a.clone().sub(c).dot(n)) < 1e-4 && Math.abs(s.b.clone().sub(c).dot(n)) < 1e-4));
}

/** Face Fillet: the edges shared by two faces (Face Set 1 and Face Set 2) */
export function faceFilletEdges(edges: BodyEdge[], f1: FaceLike, f2: FaceLike): BodyEdge[] {
  const on2 = new Set(edgesOnFace(edges, f2).map((e) => e.id));
  return edgesOnFace(edges, f1).filter((e) => on2.has(e.id));
}

/** Full Round Fillet: the two long parallel edges of the center face, filleted at half its width */
export function fullRoundEdges(edges: BodyEdge[], center: FaceLike): { edges: BodyEdge[]; size: number } | null {
  const on = edgesOnFace(edges, center).filter((e) => e.straight);
  let best: { edges: BodyEdge[]; size: number } | null = null;
  for (let i = 0; i < on.length; i++)
    for (let j = i + 1; j < on.length; j++) {
      const a = on[i], b = on[j];
      const da = a.points[a.points.length - 1].clone().sub(a.points[0]).normalize();
      const db = b.points[b.points.length - 1].clone().sub(b.points[0]).normalize();
      if (Math.abs(da.dot(db)) < 0.999) continue;
      const off = b.points[0].clone().sub(a.points[0]);
      const width = off.sub(da.clone().multiplyScalar(off.dot(da))).length();
      if (width < 1e-6) continue;
      const score = a.length + b.length;
      if (!best || score > best.edges[0].length + best.edges[1].length) best = { edges: [a, b], size: width / 2 };
    }
  return best ? { ...best, size: best.size * 0.999 } : null;
}

/** The tool solids of a fillet/chamfer on the given edges: cutters for convex edges, adders for concave ones. */
export function roundTools(edges: BodyEdge[], kind: 'fillet' | 'chamfer', size: number): { cutters: THREE.BufferGeometry[]; adders: THREE.BufferGeometry[] } {
  const cutters: THREE.BufferGeometry[] = [];
  const adders: THREE.BufferGeometry[] = [];
  for (const e of edges) {
    for (const s of e.segments) {
      const t = roundTool(s, kind, size, e.straight ? 10 : 6);
      if (!t) continue;
      (t.convex ? cutters : adders).push(t.geometry);
    }
  }
  return { cutters, adders };
}

/** Apply a fillet or chamfer to the given edges of a body geometry. */
export function applyRound(body: THREE.BufferGeometry, edges: BodyEdge[], kind: 'fillet' | 'chamfer', size: number): THREE.BufferGeometry {
  const { cutters, adders } = roundTools(edges, kind, size);
  return applyTools(body, cutters, adders);
}

/** Subtract the cutters and add the adders one by one (overlapping tools would make a non-manifold union). */
export function applyTools(body: THREE.BufferGeometry, cutters: THREE.BufferGeometry[], adders: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let out = body;
  for (const c of cutters) out = csg(out, c, 'subtract');
  for (const a of adders) out = csg(out, a, 'union');
  void mergeGeometries;
  return out;
}

/** cross-section curve of the rounded face at an edge point: the fillet arc (or the chamfer line) from face 1 to face 2 */
function roundSection(s: CreaseSegment, o: THREE.Vector3, kind: 'fillet' | 'chamfer', size: number, n: number): THREE.Vector3[] | null {
  const { t1, t2 } = frame(s);
  const phi = Math.acos(Math.max(-1, Math.min(1, t1.dot(t2))));
  if (phi < 0.05 || phi > Math.PI - 0.05) return null;
  if (kind === 'chamfer') return [o.clone().addScaledVector(t1, size), o.clone().addScaledVector(t2, size)];
  const d = size / Math.tan(phi / 2);
  const bis = t1.clone().add(t2).normalize();
  const c = o.clone().addScaledVector(bis, size / Math.sin(phi / 2));
  const v1 = o.clone().addScaledVector(t1, d).sub(c), v2 = o.clone().addScaledVector(t2, d).sub(c);
  const axis = v1.clone().cross(v2).normalize();
  const ang = v1.angleTo(v2);
  const out: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) out.push(c.clone().add(v1.clone().applyQuaternion(new THREE.Quaternion().setFromAxisAngle(axis, (ang * i) / n))));
  return out;
}

/**
 * The yellow preview of a fillet / chamfer, by design: the rounded faces as a see-through strip and thin
 * lines on it (cross-section arcs along the edge, the two tangent lines and the middle line).
 */
export function roundPreviewShapes(edges: BodyEdge[], kind: 'fillet' | 'chamfer', size: number): { strip: THREE.BufferGeometry; lines: THREE.Vector3[][] } {
  const pos: number[] = [];
  const lines: THREE.Vector3[][] = [];
  const n = kind === 'fillet' ? 12 : 1;
  for (const e of edges) {
    const total = e.segments.reduce((acc, sg) => acc + sg.a.distanceTo(sg.b), 0);
    // cross arcs about every 0.8 radius (6 to 14 along a straight edge), fewer on long curved chains
    const want = Math.max(6, Math.min(8, Math.round(total / Math.max(size * 0.25, 1e-6))));
    const step = total / want;
    let run = 0, next = 0;
    const along: THREE.Vector3[][] = [[], [], []];
    for (const s of e.segments) {
      const A = roundSection(s, s.a, kind, size, n), B = roundSection(s, s.b, kind, size, n);
      const L = s.a.distanceTo(s.b);
      if (A && B) {
        for (let i = 0; i < A.length - 1; i++) pos.push(...A[i].toArray(), ...B[i].toArray(), ...B[i + 1].toArray(), ...A[i].toArray(), ...B[i + 1].toArray(), ...A[i + 1].toArray());
        for (const [k, idx] of [[0, 0], [2, A.length - 1]] as const) {
          if (!along[k].length) along[k].push(A[idx]);
          along[k].push(B[idx]);
        }
        while (next <= run + L + 1e-9) {
          const t = L > 0 ? (next - run) / L : 0;
          const sec = roundSection(s, s.a.clone().lerp(s.b, t), kind, size, n);
          if (sec) lines.push(sec);
          next += step;
        }
      }
      run += L;
    }
    lines.push(...along.filter((l) => l.length > 1));
  }
  const strip = new THREE.BufferGeometry();
  strip.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  strip.computeVertexNormals();
  return { strip, lines };
}


/** the edges tangent-connected to the start edges (Tangent propagation): chains through shared ends with the same direction */
export function tangentChain(edges: BodyEdge[], startIds: string[]): string[] {
  const key = (v: THREE.Vector3) => `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
  const endDir = (e: BodyEdge, atStart: boolean) => {
    const p = e.points;
    if (p.length < 2) return null;
    return atStart ? p[1].clone().sub(p[0]).normalize() : p[p.length - 2].clone().sub(p[p.length - 1]).normalize();
  };
  const ends = (e: BodyEdge) => (e.closed ? [] : [{ k: key(e.points[0]), d: endDir(e, true) }, { k: key(e.points[e.points.length - 1]), d: endDir(e, false) }]);
  const out = new Set(startIds);
  const queue = [...startIds];
  while (queue.length) {
    const id = queue.pop()!;
    const e = edges.find((x) => x.id === id);
    if (!e) continue;
    for (const a of ends(e)) {
      for (const o of edges) {
        if (out.has(o.id)) continue;
        for (const b of ends(o)) {
          // tangent: they meet at the point and leave it in opposite directions (one continues the other)
          if (b.k === a.k && a.d && b.d && a.d.dot(b.d) < -0.996) { out.add(o.id); queue.push(o.id); }
        }
      }
    }
  }
  return [...out];
}

/** a box spanned by three directions from a corner (a, b, c along d1, d2, d3), a little past the corner */
function cornerCell(v: THREE.Vector3, d: THREE.Vector3[], r: number): THREE.BufferGeometry {
  const e = 4 * EPS;
  const o = v.clone().addScaledVector(d[0], -e).addScaledVector(d[1], -e).addScaledVector(d[2], -e);
  const g = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
  g.translate(0.5, 0.5, 0.5);
  const m = new THREE.Matrix4().makeBasis(d[0].clone().multiplyScalar(r + e), d[1].clone().multiplyScalar(r + e), d[2].clone().multiplyScalar(r + e)).setPosition(o);
  g.applyMatrix4(m);
  if (m.determinant() < 0) {
    const a = g.getAttribute('position');
    for (let i = 0; i < a.count; i += 3) { const x = a.getX(i + 1), y = a.getY(i + 1), z = a.getZ(i + 1); a.setXYZ(i + 1, a.getX(i + 2), a.getY(i + 2), a.getZ(i + 2)); a.setXYZ(i + 2, x, y, z); }
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Corner tools of the Fillet options: Round corners (two filleted edges meeting at a convex corner get a round
 * corner, a sphere of the radius inset from the corner) and Setback (three filleted edges at a corner blend into a
 * sphere of radius + setback). Each is the corner cell minus the sphere: material to remove.
 */
export function cornerTools(edges: BodyEdge[], size: number, opts: { roundCorners?: boolean; setback?: number }): THREE.BufferGeometry[] {
  const key = (v: THREE.Vector3) => `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
  const at = new Map<string, { v: THREE.Vector3; items: { e: BodyEdge; d: THREE.Vector3; s: CreaseSegment }[] }>();
  for (const e of edges) {
    if (!e.straight || e.closed || e.points.length < 2) continue;
    const a = e.points[0], b = e.points[e.points.length - 1];
    const s = e.segments[0];
    for (const [v, w] of [[a, b], [b, a]] as const) {
      const k = key(v);
      if (!at.has(k)) at.set(k, { v: v.clone(), items: [] });
      at.get(k)!.items.push({ e, d: w.clone().sub(v).normalize(), s });
    }
  }
  const out: THREE.BufferGeometry[] = [];
  for (const { v, items } of at.values()) {
    if (!items.every((it) => frame(it.s).convex)) continue;
    let dirs: THREE.Vector3[] | null = null;
    let r = size;
    if (items.length >= 3 && (opts.setback ?? 0) > 0) {
      dirs = items.slice(0, 3).map((it) => it.d);
      r = size + (opts.setback ?? 0);
    } else if (items.length === 2 && opts.roundCorners) {
      // the face both edges lie on: into the material is against its normal
      const [p, q] = items;
      const nf = [p.s.n1, p.s.n2].find((n) => q.s.n1.dot(n) > 0.999 || q.s.n2.dot(n) > 0.999);
      if (!nf) continue;
      dirs = [p.d, q.d, nf.clone().negate()];
    }
    if (!dirs) continue;
    const c = v.clone().addScaledVector(dirs[0], r).addScaledVector(dirs[1], r).addScaledVector(dirs[2], r);
    const sphere = new THREE.SphereGeometry(r, Math.max(24, circleSegments(r, 32)), Math.max(16, circleSegments(r, 32) / 2)).toNonIndexed();
    sphere.translate(c.x, c.y, c.z);
    try {
      out.push(csg(cornerCell(v, dirs, r), sphere, 'subtract'));
    } catch {
      /* a corner that cannot be built is left as it is */
    }
  }
  return out;
}

/** Overflow type > Keep edge: the largest radius per edge that keeps the tangent lines on the adjacent faces */
export function keepEdgeRadii(edges: BodyEdge[], size: number, faces: { normal: [number, number, number]; points: THREE.Vector3[] }[]): number[] {
  return edges.map((e) => {
    let limit = Infinity;
    for (const s of e.segments) {
      const { t1, t2 } = frame(s);
      const phi = Math.acos(Math.max(-1, Math.min(1, t1.dot(t2))));
      for (const [n, t] of [[s.n1, t1], [s.n2, t2]] as const) {
        const f = faces.find((fc) => new THREE.Vector3(...fc.normal).dot(n) > 0.999 && fc.points.some((p) => Math.abs(p.clone().sub(s.a).dot(n)) < 1e-3));
        if (!f) continue;
        const w = Math.max(...f.points.map((p) => p.clone().sub(s.a).dot(t)));
        if (w > 1e-6) limit = Math.min(limit, w * Math.tan(phi / 2) * 0.999);
      }
    }
    return Math.min(size, limit);
  });
}

/**
 * Chamfer ▸ Vertex: the tetrahedron cut off a corner where three straight edges meet, d1 / d2 / d3 along those edges.
 * The tool's apex sits a little outside the corner so the boolean never shares the corner itself.
 */
export function vertexChamferTool(geometry: THREE.BufferGeometry, vertex: THREE.Vector3, d1: number, d2: number, d3: number): THREE.BufferGeometry | null {
  const edges = bodyEdges(geometry, 'vc').filter((e) => e.straight && !e.closed && e.points.length >= 2);
  const dirs: THREE.Vector3[] = [];
  for (const e of edges) {
    const a = e.points[0], b = e.points[e.points.length - 1];
    if (a.distanceTo(vertex) < 1e-3) dirs.push(b.clone().sub(a).normalize());
    else if (b.distanceTo(vertex) < 1e-3) dirs.push(a.clone().sub(b).normalize());
    if (dirs.length === 3) break;
  }
  if (dirs.length < 3) return null;
  const ds = [d1, d2, d3].map((d) => Math.max(0.01, d));
  const P = dirs.map((d, i) => vertex.clone().addScaledVector(d, ds[i]));
  // the apex: the corner pushed outward (away from the three edge directions)
  const inward = dirs[0].clone().add(dirs[1]).add(dirs[2]).normalize();
  const apex = vertex.clone().addScaledVector(inward, -Math.max(...ds) * 0.05 - 0.05);
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, out: number[]) => out.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  const pos: number[] = [];
  // outward-facing winding: the face opposite the apex, and the three faces through the apex
  const n = P[1].clone().sub(P[0]).cross(P[2].clone().sub(P[0]));
  const flip = n.dot(P[0].clone().sub(apex)) < 0;
  const [A, B, C] = flip ? [P[0], P[2], P[1]] : [P[0], P[1], P[2]];
  tri(A, B, C, pos);
  tri(apex, B, A, pos);
  tri(apex, C, B, pos);
  tri(apex, A, C, pos);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
