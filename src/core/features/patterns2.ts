import * as THREE from 'three';
import type { Document, PatternFeature } from '../document/types';
import { planeMatrix } from './solid';
import { resolvePlaneDef } from './planes';
import { sketchChains } from './thin';
import { rotatedAbout, translated } from './pattern';

type Inst = (g: THREE.BufferGeometry) => THREE.BufferGeometry;

/** A polyline with its cumulative arc lengths. */
function measured(pts: THREE.Vector3[]): { pts: THREE.Vector3[]; s: number[]; total: number } {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, s, total: s[s.length - 1] };
}

function atLength(m: ReturnType<typeof measured>, d: number): { p: THREE.Vector3; t: THREE.Vector3 } {
  const L = Math.max(0, Math.min(m.total, d));
  let i = 1;
  while (i < m.pts.length - 1 && m.s[i] < L) i++;
  const a = m.pts[i - 1], b = m.pts[i];
  const seg = m.s[i] - m.s[i - 1] || 1;
  const k = (L - m.s[i - 1]) / seg;
  return { p: a.clone().lerp(b, k), t: b.clone().sub(a).normalize() };
}

/**
 * Curve Driven Pattern: instances along the first open chain of a sketch, starting where the seed sits
 * (its nearest point on the curve), at equal spacing over the whole curve or at the given spacing.
 * Tangent to curve: each instance also turns with the curve (about the sketch normal).
 */
export function curveInstances(doc: Document, f: PatternFeature, seedCentre: THREE.Vector3): { instances: Inst[]; error?: string } {
  const c = f.curve;
  const sk = c ? doc.sketches[c.sketchId] : undefined;
  if (!c || !sk) return { instances: [], error: 'Select the sketch with the curve (Pattern Direction).' };
  const chains = sketchChains(sk);
  const chain = chains.find((x) => !x.closed) ?? chains[0];
  if (!chain) return { instances: [], error: 'The curve sketch has no lines, arcs or splines.' };
  const pl = resolvePlaneDef(doc, sk.plane);
  const m4 = planeMatrix(pl);
  const pts = (chain.closed ? [...chain.points, chain.points[0]] : chain.points).map((p) => new THREE.Vector3(p.x, p.y, 0).applyMatrix4(m4));
  const m = measured(pts);
  if (m.total < 1e-6) return { instances: [], error: 'The curve has no length.' };
  // start: the curve point nearest to the seed
  let best = 0, bestD = Infinity;
  for (let i = 0; i <= 400; i++) {
    const d = (m.total * i) / 400;
    const q = atLength(m, d).p.distanceTo(seedCentre);
    if (q < bestD) { bestD = q; best = d; }
  }
  const n = Math.max(1, Math.round(c.count));
  const step = c.equal ? (chain.closed ? m.total / n : (m.total - best) / Math.max(1, n - 1)) : c.spacing;
  const start = atLength(m, best);
  const axisN = new THREE.Vector3(...pl.n).normalize();
  const out: Inst[] = [];
  for (let k = 1; k < n; k++) {
    let d = best + step * k * (c.reverse ? -1 : 1);
    if (chain.closed) d = ((d % m.total) + m.total) % m.total;
    else if (d > m.total + 1e-6 || d < -1e-6) break;
    const here = atLength(m, d);
    const v = here.p.clone().sub(start.p);
    if (c.tangent) {
      const ang = Math.atan2(start.t.clone().cross(here.t).dot(axisN), start.t.dot(here.t));
      out.push((g) => translated(rotatedAbout(g, start.p, axisN, ang), v));
    } else out.push((g) => translated(g, v));
  }
  return { instances: out };
}

/** Table Driven Pattern: X/Y offsets in a coordinate system (a reference one, or the seed's sketch plane). */
export function tableInstances(doc: Document, f: PatternFeature, seedPlaneId: string): Inst[] {
  const cs = f.csysId ? (doc.refGeometry ?? []).find((r) => r.id === f.csysId && r.kind === 'csys') : undefined;
  const pl = resolvePlaneDef(doc, seedPlaneId);
  const X = new THREE.Vector3(...(cs?.x ?? pl.u)).normalize();
  const Y = new THREE.Vector3(...(cs?.y ?? pl.v)).normalize();
  return (f.table ?? []).filter((r) => Math.abs(r.x) > 1e-9 || Math.abs(r.y) > 1e-9).map((r) => (g: THREE.BufferGeometry) => translated(g, X.clone().multiplyScalar(r.x).addScaledVector(Y, r.y)));
}

/** Is a point (face-plane coordinates) inside the polygon? */
function inside(poly: [number, number][], x: number, y: number): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi) c = !c;
  }
  return c;
}

function distToPoly(poly: [number, number][], x: number, y: number): number {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j], [bx, by] = poly[i];
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy || 1e-12;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t));
  }
  return best;
}

/**
 * Fill Pattern (perforation): a square or staggered (hexagonal) grid over the fill boundary, anchored at the
 * seed, keeping the margin to the boundary. Returns the instance translations (seed excluded).
 */
export function fillPoints(f: PatternFeature, seedCentre: THREE.Vector3): THREE.Vector3[] {
  const fl = f.fill;
  if (!fl || fl.polygon.length < 3) return [];
  const o = new THREE.Vector3(...fl.origin), u = new THREE.Vector3(...fl.u), v = new THREE.Vector3(...fl.v);
  const rel = seedCentre.clone().sub(o);
  const sx = rel.dot(u), sy = rel.dot(v);
  const xs = fl.polygon.map((p) => p[0]), ys = fl.polygon.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const sp = Math.max(0.1, fl.spacing);
  const rowH = fl.layout === 'hex' ? (sp * Math.sqrt(3)) / 2 : sp;
  const out: THREE.Vector3[] = [];
  const j0 = Math.floor((minY - sy) / rowH) - 1, j1 = Math.ceil((maxY - sy) / rowH) + 1;
  for (let j = j0; j <= j1; j++) {
    const shift = fl.layout === 'hex' && Math.abs(j) % 2 === 1 ? sp / 2 : 0;
    const i0 = Math.floor((minX - sx) / sp) - 1, i1 = Math.ceil((maxX - sx) / sp) + 1;
    for (let i = i0; i <= i1; i++) {
      if (i === 0 && j === 0) continue;
      const x = sx + i * sp + shift, y = sy + j * rowH;
      if (!inside(fl.polygon, x, y) || distToPoly(fl.polygon, x, y) < fl.margin) continue;
      out.push(u.clone().multiplyScalar(x - sx).addScaledVector(v, y - sy));
      if (out.length > 2000) return out;
    }
  }
  return out;
}

export function fillInstances(f: PatternFeature, seedCentre: THREE.Vector3): Inst[] {
  return fillPoints(f, seedCentre).map((t) => (g: THREE.BufferGeometry) => translated(g, t));
}

/** The outer boundary of a planar face (triangles of a body geometry) in the face's own plane coordinates. */
export function faceBoundary(g: THREE.BufferGeometry, triangles: number[], normal: [number, number, number], centroid: [number, number, number]): { origin: [number, number, number]; u: [number, number, number]; v: [number, number, number]; polygon: [number, number][] } {
  const n = new THREE.Vector3(...normal).normalize();
  const u = (Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).sub(n.clone().multiplyScalar(Math.abs(n.x) < 0.9 ? n.x : n.y)).normalize();
  const v = n.clone().cross(u).normalize();
  const o = new THREE.Vector3(...centroid);
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.getAttribute('position');
  const key = (p: THREE.Vector3) => `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)},${Math.round(p.z * 1e4)}`;
  const count = new Map<string, number>();
  const edges: [THREE.Vector3, THREE.Vector3][] = [];
  const P = (i: number) => new THREE.Vector3().fromBufferAttribute(pos, i);
  for (const t of triangles) {
    const a = P(t * 3), b = P(t * 3 + 1), c = P(t * 3 + 2);
    for (const [p, q] of [[a, b], [b, c], [c, a]] as [THREE.Vector3, THREE.Vector3][]) {
      const k = [key(p), key(q)].sort().join('|');
      count.set(k, (count.get(k) ?? 0) + 1);
      edges.push([p, q]);
    }
  }
  // boundary edges appear once; chain them into loops and keep the largest (outer) one. An edge that appears once
  // only because of a T-junction (a boolean split the neighbour) has face material on both sides: not a boundary.
  const tri2 = triangles.map((t) => [P(t * 3), P(t * 3 + 1), P(t * 3 + 2)].map((p) => { const r = p.clone().sub(o); return [r.dot(u), r.dot(v)] as [number, number]; }));
  const inTri = (x: number, y: number) => tri2.some(([a, b, c]) => {
    const d1 = (x - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (y - b[1]);
    const d2 = (x - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (y - c[1]);
    const d3 = (x - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (y - a[1]);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  });
  const onOutline = (p: THREE.Vector3, q: THREE.Vector3) => {
    const a = p.clone().sub(o), b = q.clone().sub(o);
    const ax = a.dot(u), ay = a.dot(v), bx = b.dot(u), by = b.dot(v);
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const l = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / l * 1e-3, ny = (bx - ax) / l * 1e-3;
    return !(inTri(mx + nx, my + ny) && inTri(mx - nx, my - ny));
  };
  const bnd = edges.filter(([p, q]) => count.get([key(p), key(q)].sort().join('|')) === 1 && onOutline(p, q));
  const next = new Map<string, THREE.Vector3[]>();
  for (const [p, q] of bnd) next.set(key(p), [p, q]);
  const used = new Set<string>();
  let best: THREE.Vector3[] = [];
  let bestArea = -1;
  const area2 = (loop: THREE.Vector3[]) => {
    let a = 0;
    for (let i = 0; i < loop.length; i++) {
      const p = loop[i].clone().sub(o), q = loop[(i + 1) % loop.length].clone().sub(o);
      a += p.dot(u) * q.dot(v) - q.dot(u) * p.dot(v);
    }
    return Math.abs(a);
  };
  for (const [p] of bnd) {
    if (used.has(key(p))) continue;
    const loop: THREE.Vector3[] = [];
    let cur = key(p);
    while (!used.has(cur) && next.has(cur)) {
      used.add(cur);
      const [a, b] = next.get(cur)!;
      loop.push(a);
      cur = key(b);
    }
    const ar = area2(loop);
    if (ar > bestArea) { best = loop; bestArea = ar; }
  }
  const polygon = best.map((p) => { const r = p.clone().sub(o); return [r.dot(u), r.dot(v)] as [number, number]; });
  return { origin: [o.x, o.y, o.z], u: [u.x, u.y, u.z], v: [v.x, v.y, v.z], polygon };
}

/** A closed polygon offset by d (positive: toward the inside), each vertex where the moved edges meet. */
export function offsetPolygon(poly: [number, number][], d: number): [number, number][] {
  const n = poly.length;
  if (n < 3) return poly.slice();
  let area = 0;
  for (let i = 0; i < n; i++) area += poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1];
  const ccw = area > 0;
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n];
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const l = Math.hypot(dx, dy) || 1;
    // inward normal of a ccw polygon is the left normal
    const nx = (ccw ? -dy : dy) / l, ny = (ccw ? dx : -dx) / l;
    return { p: [p[0] + nx * d, p[1] + ny * d] as [number, number], dir: [dx / l, dy / l] as [number, number] };
  });
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = lines[(i + n - 1) % n], b = lines[i];
    const den = a.dir[0] * b.dir[1] - a.dir[1] * b.dir[0];
    if (Math.abs(den) < 1e-9) { out.push(b.p); continue; }
    const t = ((b.p[0] - a.p[0]) * b.dir[1] - (b.p[1] - a.p[1]) * b.dir[0]) / den;
    out.push([a.p[0] + a.dir[0] * t, a.p[1] + a.dir[1] * t]);
  }
  return out;
}
