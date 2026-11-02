// Geometry of the plastic part features (QA v0.5.1 F121): Dome, Indent, Mounting Boss, Snap Hook, Lip/Groove.
// Every function returns tools in world coordinates; the rebuild adds or removes them like any other feature.
import * as THREE from 'three';
import type { PlaneDef } from '../document/types';
import type { DomeFeature, MountingBossFeature, SnapHookFeature } from '../document/plasticsTypes';
import { csg, extrudeGeometry, planarFaces, type PlanarFace } from './solid';
import type { Region } from './regions';

type P2 = [number, number];
/** the tools start this far inside the body they stand on, so their base is never coplanar with its face */
export const SINK = 0.02;

export const area2 = (p: P2[]) => p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q[0] * r[1] - r[0] * q[1]; }, 0) / 2;

/** a planar face's boundary loops in the face's own plane (largest first, counter-clockwise), with that plane */
export function faceLoops(g: THREE.BufferGeometry, face: PlanarFace): { plane: PlaneDef; loops: P2[][] } | null {
  const pos = (g.index ? g.toNonIndexed() : g).getAttribute('position');
  const n = new THREE.Vector3(...face.normal).normalize();
  const o = new THREE.Vector3(...face.centroid);
  const ref = Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const u = ref.clone().cross(n).normalize(), v = n.clone().cross(u).normalize();
  const tri2 = face.triangles.map((t) => [0, 1, 2].map((k): P2 => { const d = new THREE.Vector3().fromBufferAttribute(pos, t * 3 + k).sub(o); return [d.dot(u), d.dot(v)]; }));
  const inside = (x: number, y: number) => tri2.some(([a, b, c]) => {
    const d1 = (x - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (y - b[1]);
    const d2 = (x - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (y - c[1]);
    const d3 = (x - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (y - a[1]);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  });
  // outline segments: material on one side only (a T-junction of a boolean has material on both), material on the left
  const key = (p: P2) => `${Math.round(p[0] * 1e4)},${Math.round(p[1] * 1e4)}`;
  const next = new Map<string, P2[]>();
  for (const t of tri2) for (let k = 0; k < 3; k++) {
    const a = t[k], b = t[(k + 1) % 3], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-7) continue;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = (-(b[1] - a[1]) / l) * 1e-3, ny = ((b[0] - a[0]) / l) * 1e-3;
    const left = inside(mx + nx, my + ny), right = inside(mx - nx, my - ny);
    if (left === right) continue;
    const [p, q] = left ? [a, b] : [b, a];
    if (![...(next.get(key(p)) ?? [])].some((x) => key(x) === key(q))) next.set(key(p), [...(next.get(key(p)) ?? []), q]);
  }
  const loops: P2[][] = [];
  const used = new Set<string>();
  for (const [k0, outs] of next) for (const first of outs) {
    if (used.has(`${k0}>${key(first)}`)) continue;
    const loop: P2[] = [];
    let curKey = k0, cur = first;
    for (let guard = 0; guard < 100000; guard++) {
      used.add(`${curKey}>${key(cur)}`);
      loop.push(cur);
      if (key(cur) === k0) break;
      const cand = (next.get(key(cur)) ?? []).find((x) => !used.has(`${key(cur)}>${key(x)}`));
      if (!cand) break;
      curKey = key(cur);
      cur = cand;
    }
    if (loop.length >= 3 && key(loop[loop.length - 1]) === k0) loops.push(loop);
  }
  if (!loops.length) return null;
  const clean = loops.map(simplify).filter((l) => l.length >= 3).map((l) => (area2(l) < 0 ? l.reverse() : l)).sort((a, b) => area2(b) - area2(a));
  const plane: PlaneDef = { id: 'face', name: 'face', origin: o.toArray() as PlaneDef['origin'], u: u.toArray() as PlaneDef['u'], v: v.toArray() as PlaneDef['v'], n: n.toArray() as PlaneDef['n'] };
  return { plane, loops: clean };
}

/** drops repeated and collinear points (the tessellation splits straight edges) */
function simplify(p: P2[]): P2[] {
  let pts = p.filter((q, i) => Math.hypot(q[0] - p[(i + 1) % p.length][0], q[1] - p[(i + 1) % p.length][1]) > 1e-6);
  for (let changed = true; changed && pts.length > 3;) {
    changed = false;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i + pts.length - 1) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
      const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cross) < 1e-6 * Math.hypot(c[0] - a[0], c[1] - a[1])) { pts = pts.filter((_, k) => k !== i); changed = true; break; }
    }
  }
  return pts;
}

/** the centre and radius when the loop is a circle (all points at one distance from their mean) */
export function asCircle(loop: P2[]): { c: P2; r: number } | null {
  if (loop.length < 12) return null;
  const c: P2 = [loop.reduce((s, p) => s + p[0], 0) / loop.length, loop.reduce((s, p) => s + p[1], 0) / loop.length];
  const rs = loop.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1]));
  const lo = Math.min(...rs), hi = Math.max(...rs);
  return hi > 0 && (hi - lo) / hi < 0.02 ? { c, r: rs.reduce((s, x) => s + x, 0) / rs.length } : null;
}

/** height of a sphere segment of base radius R and height h at distance r from its axis */
const sphereCap = (R: number, h: number) => { const Rs = (R * R + h * h) / (2 * h); return (r: number) => Math.max(0, Math.sqrt(Math.max(0, Rs * Rs - r * r)) - (Rs - h)); };

/** which dome options a face offers: Elliptical dome on a round face, Continuous dome on a polygon that is not four-sided */
export function domeOptions(loop: P2[]): { round: boolean; continuous: boolean } {
  const round = !!asCircle(loop);
  return { round, continuous: !round && loop.length !== 4 };
}

/**
 * Dome tool on a planar face outline (the outer loop, in the plane's coordinates): a closed solid between the face
 * (sunk a little into the body) and the dome surface. Round face: a sphere segment (or a half ellipsoid); a
 * polygon: a sphere through its farthest corners, rising straight up from the edges, or (Continuous) a dome that
 * rises evenly from every edge. Reverse: the same shape into the body (a cut).
 */
export function domeTool(loop: P2[], plane: PlaneDef, f: Pick<DomeFeature, 'distance' | 'reverse' | 'elliptical' | 'continuous'>): THREE.BufferGeometry | { error: string } {
  const circle = asCircle(loop);
  const h = f.distance > 0 ? f.distance : circle ? circle.r : 0;
  if (!(h > 0)) return { error: 'The distance of the dome must be greater than 0.' };
  const verts: P2[] = [];
  const tris: [number, number, number][] = [];
  let height: (p: P2) => number;
  if (circle) {
    // polar grid on the face's own boundary points, so the dome meets the edge of the face
    const K = 16, ang = loop.map((p) => Math.atan2(p[1] - circle.c[1], p[0] - circle.c[0]));
    verts.push(circle.c);
    for (let k = 1; k <= K; k++) for (const a of ang) verts.push([circle.c[0] + (circle.r * k / K) * Math.cos(a), circle.c[1] + (circle.r * k / K) * Math.sin(a)]);
    const m = ang.length, at = (k: number, i: number) => 1 + (k - 1) * m + (i % m);
    for (let i = 0; i < m; i++) tris.push([0, at(1, i), at(1, i + 1)]);
    for (let k = 1; k < K; k++) for (let i = 0; i < m; i++) { tris.push([at(k, i), at(k + 1, i), at(k + 1, i + 1)]); tris.push([at(k, i), at(k + 1, i + 1), at(k, i + 1)]); }
    const cap = sphereCap(circle.r, h);
    const r = (p: P2) => Math.hypot(p[0] - circle.c[0], p[1] - circle.c[1]);
    height = f.elliptical ? (p) => h * Math.sqrt(Math.max(0, 1 - (r(p) / circle.r) ** 2)) : (p) => cap(r(p));
  } else {
    triangulateFine(loop, verts, tris);
    if (f.continuous && loop.length !== 4) {
      const dist = (p: P2) => Math.min(...loop.map((a, i) => segDist(p, a, loop[(i + 1) % loop.length])));
      const D = Math.max(...verts.map(dist));
      const cap = sphereCap(D, h);
      height = (p) => cap(D - dist(p));
    } else {
      const A = area2(loop);
      const c: P2 = [0, 0];
      loop.forEach((a, i) => { const b = loop[(i + 1) % loop.length], w = a[0] * b[1] - b[0] * a[1]; c[0] += (a[0] + b[0]) * w; c[1] += (a[1] + b[1]) * w; });
      c[0] /= 6 * A; c[1] /= 6 * A;
      const R = Math.max(...loop.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1])));
      const cap = sphereCap(R, h);
      height = (p) => cap(Math.hypot(p[0] - c[0], p[1] - c[1]));
    }
  }
  return liftedSolid(verts, tris, height, plane, f.reverse ? -1 : 1);
}

function segDist(p: P2, a: P2, b: P2): number {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

/** triangulates the polygon and splits every triangle in four until the edges are short (shared midpoints: no cracks) */
function triangulateFine(loop: P2[], verts: P2[], tris: [number, number, number][]): void {
  verts.push(...loop);
  for (const t of THREE.ShapeUtils.triangulateShape(loop.map((p) => new THREE.Vector2(p[0], p[1])), [])) tris.push([t[0], t[1], t[2]]);
  const size = Math.max(...loop.map((p) => Math.hypot(p[0] - loop[0][0], p[1] - loop[0][1])));
  const longest = () => Math.max(...tris.flatMap((t) => [0, 1, 2].map((k) => { const a = verts[t[k]], b = verts[t[(k + 1) % 3]]; return Math.hypot(a[0] - b[0], a[1] - b[1]); })));
  while (tris.length * 4 <= 4096 && longest() > size / 16) {
    const mid = new Map<string, number>();
    const m = (i: number, j: number) => {
      const key = i < j ? `${i},${j}` : `${j},${i}`;
      let k = mid.get(key);
      if (k === undefined) { k = verts.length; verts.push([(verts[i][0] + verts[j][0]) / 2, (verts[i][1] + verts[j][1]) / 2]); mid.set(key, k); }
      return k;
    };
    const next: [number, number, number][] = [];
    for (const [a, b, c] of tris) { const ab = m(a, b), bc = m(b, c), ca = m(c, a); next.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]); }
    tris.splice(0, tris.length, ...next);
  }
}

/** the closed solid between a triangulated region of the plane (sunk by SINK) and the same region lifted by height() */
function liftedSolid(verts: P2[], tris: [number, number, number][], height: (p: P2) => number, plane: PlaneDef, sign: 1 | -1): THREE.BufferGeometry {
  const o = new THREE.Vector3(...plane.origin), u = new THREE.Vector3(...plane.u), v = new THREE.Vector3(...plane.v), n = new THREE.Vector3(...plane.n);
  const at = (p: P2, z: number) => o.clone().addScaledVector(u, p[0]).addScaledVector(v, p[1]).addScaledVector(n, z);
  const top = verts.map((p) => at(p, sign * height(p))), bot = verts.map((p) => at(p, -sign * SINK));
  // every triangle counter-clockwise in the plane
  const ccw = tris.map(([a, b, c]) => { const A = verts[a], B = verts[b], C = verts[c]; return (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]) >= 0 ? [a, b, c] : [a, c, b]; });
  const out: number[] = [];
  const tri = (p: THREE.Vector3, q: THREE.Vector3, r: THREE.Vector3) => (sign > 0 ? out.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z) : out.push(p.x, p.y, p.z, r.x, r.y, r.z, q.x, q.y, q.z));
  const uses = new Map<string, number>();
  for (const [a, b, c] of ccw) {
    tri(top[a], top[b], top[c]);
    tri(bot[a], bot[c], bot[b]);
    for (const [i, j] of [[a, b], [b, c], [c, a]]) { const k = i < j ? `${i},${j}` : `${j},${i}`; uses.set(k, (uses.get(k) ?? 0) + 1); }
  }
  // walls on the outline: the boundary edges (one triangle), in the counter-clockwise direction of that triangle
  for (const [a, b, c] of ccw) for (const [i, j] of [[a, b], [b, c], [c, a]]) {
    if (uses.get(i < j ? `${i},${j}` : `${j},${i}`) !== 1) continue;
    tri(bot[i], bot[j], top[j]);
    tri(bot[i], top[j], top[i]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.computeVertexNormals();
  return g;
}

type Frame = { o: THREE.Vector3; n: THREE.Vector3; u: THREE.Vector3; w: THREE.Vector3 };
/** a frame on a plane at a point: origin, the plane's first axis turned by `deg` about the normal, and the normal */
function frame(plane: PlaneDef, pt: { x: number; y: number }, deg = 0): Frame {
  const o = new THREE.Vector3(...plane.origin).addScaledVector(new THREE.Vector3(...plane.u), pt.x).addScaledVector(new THREE.Vector3(...plane.v), pt.y);
  const n = new THREE.Vector3(...plane.n).normalize();
  const a = (deg * Math.PI) / 180;
  const u = new THREE.Vector3(...plane.u).multiplyScalar(Math.cos(a)).addScaledVector(new THREE.Vector3(...plane.v), Math.sin(a)).normalize();
  return { o, n, u, w: n.clone().cross(u) };
}

/** a (tapered) cylinder along n from z0 to z1 at the frame's origin, radius r0 at z0 and r1 at z1 */
function cone(fr: Frame, z0: number, z1: number, r0: number, r1: number): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r1, r0, z1 - z0, 48, 1, false);
  g.translate(0, (z0 + z1) / 2, 0);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(fr.u, fr.n, fr.u.clone().cross(fr.n)).setPosition(fr.o));
  const t = g.toNonIndexed();
  t.computeVertexNormals();
  return t;
}

/** a prism of a profile (x along `ax`, y along the frame normal) with the given width centred on the profile plane */
function profilePrism(fr: Frame, ax: THREE.Vector3, profile: P2[], width: number): THREE.BufferGeometry | null {
  const nrm = ax.clone().cross(fr.n).normalize();
  const plane: PlaneDef = { id: 'p', name: 'p', origin: fr.o.clone().addScaledVector(nrm, -width / 2).toArray() as PlaneDef['origin'], u: ax.toArray() as PlaneDef['u'], v: fr.n.toArray() as PlaneDef['v'], n: nrm.toArray() as PlaneDef['n'] };
  const pts = area2(profile) < 0 ? [...profile].reverse() : profile;
  const region: Region = { outer: pts.map(([x, y]) => ({ x, y })), holes: [], area: Math.abs(area2(profile)) };
  return extrudeGeometry([region], plane, { end: 'blind', depth: width, reverse: false });
}

/** a round piece of a tool along an axis (for an exact B-rep version: a cone or cylinder segment) */
export interface AxisPiece { base: THREE.Vector3; n: THREE.Vector3; u: THREE.Vector3; z0: number; z1: number; r0: number; r1: number }
export interface FeatureTools {
  add: { tool: THREE.BufferGeometry; axis?: AxisPiece }[];
  cut: { tool: THREE.BufferGeometry; axis?: AxisPiece }[];
}

/** Mounting Boss: the boss (with draft), its fins, then the hole or the pin */
export function mountingBossTools(f: MountingBossFeature, plane: PlaneDef): FeatureTools | { error: string } {
  if (!(f.height > 0) || !(f.diameter > 0)) return { error: 'Enter the height and the diameter of the boss.' };
  const fr = frame(plane, f.point, f.finAngle);
  const tan = (deg: number) => Math.tan((Math.max(0, Math.min(45, deg)) * Math.PI) / 180);
  const r0 = f.diameter / 2, r1 = Math.max(0.05, r0 - f.height * tan(f.draft));
  const piece = (z0: number, z1: number, a: number, b: number) => ({ tool: cone(fr, z0, z1, a, b), axis: { base: fr.o, n: fr.n, u: fr.u, z0, z1, r0: a, r1: b } });
  const out: FeatureTools = { add: [piece(-SINK, f.height, r0, r1)], cut: [] };
  const fins = Math.max(0, Math.min(16, Math.round(f.fins)));
  if (fins && f.finLength > 0 && f.finHeight > 0 && f.finWidth > 0) {
    const hf = Math.min(f.finHeight, f.height);
    const rin = r1 * 0.6, rb = r0 - hf * tan(f.draft);
    for (let i = 0; i < fins; i++) {
      const a = (i * 2 * Math.PI) / fins;
      const ax = fr.u.clone().multiplyScalar(Math.cos(a)).addScaledVector(fr.w, Math.sin(a)).normalize();
      // from inside the boss wall out to the fin length: full fin height at the boss, down to the face at its end
      const g = profilePrism(fr, ax, [[rin, -SINK], [r0 + f.finLength, -SINK], [r0 + f.finLength, 0], [rb, hf], [rin, hf]], f.finWidth);
      if (g) out.add.push({ tool: g });
    }
  }
  const hd = f.holeDiameter / 2;
  if (hd > 0 && hd < r1) {
    const rb = Math.max(0.05, hd - f.holeDepth * tan(f.holeDraft));
    if (f.bossType === 'pin' && f.pin === 'pin') out.add.push(piece(f.height - SINK, f.height + f.holeDepth, hd, rb));
    // head side: the screw goes through, the clearance hole runs through the boss and the wall under it
    else if (f.bossType === 'hardware' && f.hardware === 'head') out.cut.push(piece(-1e3, f.height + 1, hd, hd));
    else { const z0 = Math.max(-SINK, f.height - f.holeDepth); out.cut.push(piece(z0, f.height + 1, rb, hd)); }
  }
  return out;
}

/** Snap Hook: a beam of the given thickness and width with a hook lip that overhangs at its top, with a lead-in slope */
export function snapHookTool(f: SnapHookFeature, plane: PlaneDef): THREE.BufferGeometry | { error: string } {
  const { height: H, thickness: T, lipHeight: L, overhang: O } = f;
  if (!(H > 0 && T > 0 && f.width > 0)) return { error: 'Enter the height, thickness and width of the hook.' };
  if (!(L > 0 && L < H && O > 0)) return { error: 'The hook lip must be lower than the hook and overhang it.' };
  const fr = frame(plane, f.point, f.angle);
  const g = profilePrism(fr, fr.u, [[-T / 2, -SINK], [T / 2, -SINK], [T / 2, H - L], [T / 2 + O, H - L], [T / 2 + O, H - L + L * 0.2], [T / 2, H], [-T / 2, H]], f.width);
  return g ?? { error: 'Could not build the hook.' };
}

/** Lip/Groove: on a rim face (outer loop and inner loop), a band along the inner loop, `width` wide, `depth` high (or deep) */
export function rimBand(g: THREE.BufferGeometry, face: PlanarFace, width: number, depth: number, into: boolean): THREE.BufferGeometry | { error: string } {
  const fl = faceLoops(g, face);
  if (!fl || fl.loops.length < 2) return { error: 'Select the rim face of a shelled body (a face around an opening).' };
  const inner = fl.loops[1];
  const grown = growPolygon(inner, width);
  if (Math.abs(area2(grown)) >= Math.abs(area2(fl.loops[0]))) return { error: 'The lip is wider than the rim.' };
  const region: Region = { outer: grown.map(([x, y]) => ({ x, y })), holes: [[...inner].reverse().map(([x, y]) => ({ x, y }))], area: Math.abs(area2(grown)) - Math.abs(area2(inner)) };
  const n = new THREE.Vector3(...fl.plane.n);
  const pl: PlaneDef = { ...fl.plane, origin: new THREE.Vector3(...fl.plane.origin).addScaledVector(n, into ? SINK : -SINK).toArray() as PlaneDef['origin'] };
  const t = extrudeGeometry([region], pl, { end: 'blind', depth: depth + SINK, reverse: into });
  return t ?? { error: 'Could not build the lip.' };
}

/** the polygon moved outwards by d (counter-clockwise polygon; mitred corners) */
export function growPolygon(poly: P2[], d: number): P2[] {
  const m = poly.length;
  return poly.map((p, i) => {
    const a = poly[(i + m - 1) % m], b = poly[(i + 1) % m];
    const n1 = unit([p[1] - a[1], a[0] - p[0]]), n2 = unit([b[1] - p[1], p[0] - b[0]]);
    const bis = unit([n1[0] + n2[0], n1[1] + n2[1]]);
    const c = Math.max(0.2, bis[0] * n1[0] + bis[1] * n1[1]);
    return [p[0] + (bis[0] * d) / c, p[1] + (bis[1] * d) / c];
  });
}
const unit = (v: P2): P2 => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

/**
 * A body grown by d: every vertex moves so that each face through it moves d along its normal (least squares over
 * the distinct face normals at the vertex: exact for flat faces meeting at edges and corners, close for curved ones).
 */
export function offsetMesh(g: THREE.BufferGeometry, d: number): THREE.BufferGeometry {
  const pos = (g.index ? g.toNonIndexed() : g).getAttribute('position') as THREE.BufferAttribute;
  const key = (i: number) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  const normals = new Map<string, THREE.Vector3[]>();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t + 2 < pos.count; t += 3) {
    a.fromBufferAttribute(pos, t); b.fromBufferAttribute(pos, t + 1); c.fromBufferAttribute(pos, t + 2);
    const nn = b.clone().sub(a).cross(c.clone().sub(a));
    if (nn.lengthSq() < 1e-18) continue;
    nn.normalize();
    for (let k = 0; k < 3; k++) {
      const list = normals.get(key(t + k)) ?? [];
      if (!list.some((m) => m.dot(nn) > 0.9999)) list.push(nn);
      normals.set(key(t + k), list);
    }
  }
  const moves = new Map<string, THREE.Vector3>();
  for (const [k, list] of normals) {
    // (sum of n n^T + small I) x = sum of n d
    const A = [[1e-9, 0, 0], [0, 1e-9, 0], [0, 0, 1e-9]], r = [0, 0, 0];
    for (const m of list) { const v = [m.x, m.y, m.z]; for (let i = 0; i < 3; i++) { r[i] += v[i] * d; for (let j = 0; j < 3; j++) A[i][j] += v[i] * v[j]; } }
    const inv = new THREE.Matrix3().set(A[0][0], A[0][1], A[0][2], A[1][0], A[1][1], A[1][2], A[2][0], A[2][1], A[2][2]).invert();
    moves.set(k, new THREE.Vector3(r[0], r[1], r[2]).applyMatrix3(inv));
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const mv = moves.get(key(i)) ?? new THREE.Vector3();
    out[i * 3] = pos.getX(i) + mv.x; out[i * 3 + 1] = pos.getY(i) + mv.y; out[i * 3 + 2] = pos.getZ(i) + mv.z;
  }
  const res = new THREE.BufferGeometry();
  res.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  res.computeVertexNormals();
  return res;
}

/** Indent: the target with the tool (grown by the clearance) taken out and, unless Cut, a wall of the thickness around it */
export function indentGeometry(target: THREE.BufferGeometry, tool: THREE.BufferGeometry, clearance: number, thickness: number, cut: boolean): THREE.BufferGeometry {
  const inner = clearance > 0 ? offsetMesh(tool, clearance) : tool;
  if (cut) return csg(target, inner, 'subtract');
  if (!(thickness > 0)) throw new Error('The thickness of the indent must be greater than 0.');
  return csg(csg(target, offsetMesh(tool, clearance + thickness), 'union'), inner, 'subtract');
}

/** the planar face of a body that a picked face refers to (same normal, nearest plane, then nearest centroid) */
export function pickedFaceOn(g: THREE.BufferGeometry, bodyId: string, ref: { normal: [number, number, number]; point: [number, number, number] }): PlanarFace | null {
  const n = new THREE.Vector3(...ref.normal).normalize(), p = new THREE.Vector3(...ref.point);
  let best: PlanarFace | null = null, bd = Infinity;
  for (const fc of planarFaces(g, bodyId)) {
    if (fc.curved || new THREE.Vector3(...fc.normal).dot(n) < 0.999) continue;
    const c = new THREE.Vector3(...fc.centroid);
    const dd = Math.abs(p.clone().sub(c).dot(n)) * 100 + c.distanceTo(p);
    if (dd < bd) { bd = dd; best = fc; }
  }
  return best && bd < 50 ? best : null;
}
