import * as THREE from 'three';
import { planeMatrix } from './solid';
import type { PlaneDef } from '../document/types';
import type { Sketch, SketchPoint } from '../sketch/types';
import { sampleEntity } from '../sketch/geometry';
import { polyArea, type Region } from './regions';
import { meshVolume } from './solid';

/** world transform helpers for a plane */
const frameOf = (plane: PlaneDef) => ({
  o: new THREE.Vector3(...plane.origin),
  u: new THREE.Vector3(...plane.u),
  v: new THREE.Vector3(...plane.v),
  n: new THREE.Vector3(...plane.n),
});
const toWorld = (f: ReturnType<typeof frameOf>, p: SketchPoint) => f.o.clone().addScaledVector(f.u, p.x).addScaledVector(f.v, p.y);

/**
 * Open path of a sketch (lines, arcs, splines chained end to end) as world points.
 * Returns null when the sketch has no usable path.
 */
export function sketchPath(sketch: Sketch, plane: PlaneDef): THREE.Vector3[] | null {
  const f = frameOf(plane);
  const pieces: SketchPoint[][] = [];
  for (const id of sketch.entityOrder) {
    const e = sketch.entities[id];
    if (e.kind === 'point' || e.construction) continue;
    pieces.push(sampleEntity(sketch, e, 32));
  }
  if (!pieces.length) return null;
  const same = (a: SketchPoint, b: SketchPoint) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-4;
  // chain greedily
  const chain = pieces.shift()!.slice();
  let guard = 0;
  while (pieces.length && guard++ < 1000) {
    const end = chain[chain.length - 1], start = chain[0];
    let found = -1, reverse = false, atStart = false;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (same(p[0], end)) { found = i; break; }
      if (same(p[p.length - 1], end)) { found = i; reverse = true; break; }
      if (same(p[p.length - 1], start)) { found = i; atStart = true; break; }
      if (same(p[0], start)) { found = i; atStart = true; reverse = true; break; }
    }
    if (found < 0) break;
    const p = pieces.splice(found, 1)[0];
    const seq = reverse ? p.slice().reverse() : p;
    if (atStart) chain.unshift(...seq.slice(0, -1));
    else chain.push(...seq.slice(1));
  }
  if (chain.length < 2) return null;
  return chain.map((p) => toWorld(f, p));
}

/** polygon in 3D from a profile loop placed in a frame (origin o, axes u, v) */
const placeLoop = (loop: SketchPoint[], o: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, offset: SketchPoint) =>
  loop.map((p) => o.clone().addScaledVector(u, p.x - offset.x).addScaledVector(v, p.y - offset.y));

/** triangulated cap of a region in a frame (returns triangles as flat positions) */
function capTriangles(region: Region, o: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, offset: SketchPoint, flip: boolean): number[] {
  const shape = new THREE.Shape(region.outer.map((p) => new THREE.Vector2(p.x - offset.x, p.y - offset.y)));
  for (const h of region.holes) shape.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p.x - offset.x, p.y - offset.y))));
  const g = new THREE.ShapeGeometry(shape).toNonIndexed();
  const pos = g.getAttribute('position');
  const out: number[] = [];
  for (let t = 0; t * 3 + 2 < pos.count; t++) {
    const idx = flip ? [t * 3, t * 3 + 2, t * 3 + 1] : [t * 3, t * 3 + 1, t * 3 + 2];
    for (const i of idx) {
      const w = o.clone().addScaledVector(u, pos.getX(i)).addScaledVector(v, pos.getY(i));
      out.push(w.x, w.y, w.z);
    }
  }
  return out;
}

/** walls between two rings of equal length (quads as two triangles); outward for a counter-clockwise ring when b lies along the ring normal */
function wallTriangles(a: THREE.Vector3[], b: THREE.Vector3[], out: number[]): void {
  const n = a.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    out.push(a[i].x, a[i].y, a[i].z, b[j].x, b[j].y, b[j].z, b[i].x, b[i].y, b[i].z);
    out.push(a[i].x, a[i].y, a[i].z, a[j].x, a[j].y, a[j].z, b[j].x, b[j].y, b[j].z);
  }
}

/** outer loop counter-clockwise, holes clockwise (so the same wall rule faces outward for both) */
function orient(region: Region): Region {
  const ccw = (loop: SketchPoint[]) => (polyArea(loop) < 0 ? loop.slice().reverse() : loop);
  const cw = (loop: SketchPoint[]) => (polyArea(loop) > 0 ? loop.slice().reverse() : loop);
  return { outer: ccw(region.outer), holes: region.holes.map(cw), area: region.area };
}

/**
 * where each triangle of a sweep or loft came from (QA F47): a cap ('-' at the start, '+' at the end) or the point of
 * the (first) profile, in its sketch coordinates, that its wall was swept from; kept as `userData.faceSrc` so that
 * nameFeatureFaces can name the faces after the profile entities, as those of an extrusion
 */
export type FaceSource = '+' | '-' | SketchPoint;
/** the sources of `rows` rows of walls of a loop (two triangles per side, in the order of wallTriangles) */
function wallSources(loop: SketchPoint[], rows: number, src: FaceSource[]): void {
  const n = loop.length;
  for (let k = 0; k < rows; k++) for (let i = 0; i < n; i++) {
    const a = loop[i], b = loop[(i + 1) % n], m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    src.push(m, m);
  }
}
/** a cap's triangles added to the positions, with their source */
function pushCap(tris: number[], side: '+' | '-', pos: number[], src: FaceSource[]): void {
  pos.push(...tris);
  for (let i = 0; i < tris.length / 9; i++) src.push(side);
}

function finish(pos: number[], src?: FaceSource[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (src && src.length * 9 === pos.length) g.userData.faceSrc = src;
  // make the surface outward facing
  if (meshVolume(g) < 0) {
    const p = g.getAttribute('position');
    for (let t = 0; t * 3 + 2 < p.count; t++) {
      const x = p.getX(t * 3 + 1), y = p.getY(t * 3 + 1), z = p.getZ(t * 3 + 1);
      p.setXYZ(t * 3 + 1, p.getX(t * 3 + 2), p.getY(t * 3 + 2), p.getZ(t * 3 + 2));
      p.setXYZ(t * 3 + 2, x, y, z);
    }
    p.needsUpdate = true;
  }
  g.computeVertexNormals();
  return g;
}

/**
 * The tangent at an end of the path (index `e`, `s` = +1 at the start, -1 at the end) where the path ends on an arc:
 * the last chord lies half a step off the arc's tangent there, so an end cap at right angles to the chord stood tilted
 * (0.31 mm at the end of an R25 bend under a Ø16 profile, QA F172). On an arc sampled in equal steps (three equal
 * chords turning by the same small angle about the same axis) the tangent at the end is the one at the next point
 * mirrored in the chord between them; a polyline corner keeps its chord.
 */
function arcEndTangent(path: THREE.Vector3[], tangents: THREE.Vector3[], e: number, s: 1 | -1): void {
  if (path.length < 4) return;
  const c = [0, 1, 2].map((k) => path[e + s * (k + 1)].clone().sub(path[e + s * k]));
  const len = c.map((x) => x.length());
  if (!(len[0] > 1e-9) || len.some((l) => Math.abs(l - len[0]) > 1e-6 * len[0])) return;
  const d = c.map((x) => x.clone().normalize());
  const ax1 = d[0].clone().cross(d[1]), ax2 = d[1].clone().cross(d[2]);
  const a1 = ax1.length(), a2 = ax2.length();
  // a turn between 1e-6 and about 15° per step, the same at both points, about the same axis
  if (!(a1 > 1e-6 && a1 < 0.26) || Math.abs(a1 - a2) > 1e-4 || ax1.dot(ax2) < a1 * a2 * (1 - 1e-6)) return;
  // the tangent at the next point (central difference: exact on an evenly sampled arc), mirrored in the chord
  const tn = tangents[e + s].clone().multiplyScalar(s);
  const m = d[0].clone().multiplyScalar(2 * d[0].dot(tn)).sub(tn);
  tangents[e] = m.multiplyScalar(s).normalize();
}

/**
 * Sweep the profile regions along the path (parallel-transport frames). The profile is
 * taken relative to the path start projected onto the profile plane, so a profile drawn
 * around the path's start point stays centred on the path.
 */
export function sweepGeometry(regions: Region[], profilePlane: PlaneDef, path: THREE.Vector3[], opts: { keepNormal?: boolean; twist?: number } = {}): THREE.BufferGeometry | null {
  if (!regions.length || path.length < 2) return null;
  const pf = frameOf(profilePlane);
  // profile offset: path start in profile-plane coordinates
  const rel = path[0].clone().sub(pf.o);
  const offset = { x: rel.dot(pf.u), y: rel.dot(pf.v) };
  // frames along the path: tangent t, and (u, v) transported from the profile plane's axes
  const tangents = path.map((_, i) => {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    return b.clone().sub(a).normalize();
  });
  arcEndTangent(path, tangents, 0, 1);
  arcEndTangent(path, tangents, path.length - 1, -1);
  let u = pf.u.clone(), v = pf.v.clone();
  // start frame: align the profile normal with the first tangent
  const t0 = tangents[0];
  const q0 = new THREE.Quaternion().setFromUnitVectors(pf.n, t0.dot(pf.n) < 0 ? t0.clone().negate() : t0);
  u.applyQuaternion(q0);
  v.applyQuaternion(q0);
  // a path that leaves against the plane normal keeps the profile as drawn (finish() turns the faces outward); turning
  // u round mirrored it: a Swept Flange along an edge whose points ran the other way stood on the other side (QA F172)
  const frames: { o: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3 }[] = [];
  let prevT = tangents[0];
  // Keep normal constant: the profile keeps the orientation of its plane along the whole path
  if (opts.keepNormal) {
    u = pf.u.clone();
    v = pf.v.clone();
  }
  // Profile Twist: the profile turns `twist` revolutions about the path from start to end
  const twistTotal = (opts.twist ?? 0) * Math.PI * 2;
  for (let i = 0; i < path.length; i++) {
    const t = tangents[i];
    if (i > 0 && !opts.keepNormal) {
      const q = new THREE.Quaternion().setFromUnitVectors(prevT, t);
      u = u.clone().applyQuaternion(q);
      v = v.clone().applyQuaternion(q);
    }
    let fu = u.clone(), fv = v.clone();
    if (twistTotal) {
      const ang = (twistTotal * i) / (path.length - 1);
      const axis = opts.keepNormal ? pf.n.clone() : t;
      fu = fu.applyAxisAngle(axis, ang);
      fv = fv.applyAxisAngle(axis, ang);
    }
    frames.push({ o: path[i], u: fu, v: fv });
    prevT = t;
  }
  const pos: number[] = [], src: FaceSource[] = [];
  for (const r0 of regions) {
    const r = orient(r0);
    const loops = [r.outer, ...r.holes];
    for (const loop of loops) {
      const rings = frames.map((f) => placeLoop(loop, f.o, f.u, f.v, offset));
      for (let i = 0; i + 1 < rings.length; i++) wallTriangles(rings[i], rings[i + 1], pos);
      wallSources(loop, rings.length - 1, src);
    }
    const f0 = frames[0], f1 = frames[frames.length - 1];
    // ShapeGeometry triangles face -n of the (u, v) frame: the start cap keeps them, the end cap flips them
    pushCap(capTriangles(r, f0.o, f0.u, f0.v, offset, false), '-', pos, src);
    pushCap(capTriangles(r, f1.o, f1.u, f1.v, offset, true), '+', pos, src);
  }
  return finish(pos, src);
}

/**
 * resample a closed loop to n points, starting at the point nearest `start`: a loop of at most n points keeps every
 * point (its corners) and gets the rest on its sides in proportion to their lengths; a longer loop is resampled by arc
 * length (a loft between two rectangles cut two of their corners off: 2 x 5.9 mm³ too little, QA 0.5.11 T5)
 */
function resample(loop: SketchPoint[], n: number, start?: SketchPoint): SketchPoint[] {
  const pts = loop.slice();
  if (start) {
    let best = 0, bd = Infinity;
    pts.forEach((p, i) => {
      const d = Math.hypot(p.x - start.x, p.y - start.y);
      if (d < bd) { bd = d; best = i; }
    });
    pts.push(...pts.splice(0, best));
  }
  if (pts.length <= n) return keepCorners(pts, n);
  const closed = [...pts, pts[0]];
  const cum = [0];
  for (let i = 1; i < closed.length; i++) cum.push(cum[i - 1] + Math.hypot(closed[i].x - closed[i - 1].x, closed[i].y - closed[i - 1].y));
  const total = cum[cum.length - 1];
  const out: SketchPoint[] = [];
  let k = 0;
  for (let i = 0; i < n; i++) {
    const s = (i / n) * total;
    while (k + 1 < cum.length - 1 && cum[k + 1] < s) k++;
    const t = (s - cum[k]) / ((cum[k + 1] - cum[k]) || 1);
    out.push({ x: closed[k].x + (closed[k + 1].x - closed[k].x) * t, y: closed[k].y + (closed[k + 1].y - closed[k].y) * t });
  }
  return out;
}

/** the loop with n - (its points) more points on its sides, each side's share by its length (largest remainders) */
function keepCorners(pts: SketchPoint[], n: number): SketchPoint[] {
  const m = pts.length;
  const len = pts.map((p, i) => Math.hypot(pts[(i + 1) % m].x - p.x, pts[(i + 1) % m].y - p.y));
  const total = len.reduce((a, l) => a + l, 0) || 1;
  const quota = len.map((l) => ((n - m) * l) / total);
  const extra = quota.map(Math.floor);
  const order = quota.map((q, i) => ({ r: q - extra[i], i })).sort((a, b) => b.r - a.r);
  for (let k = 0, left = n - m - extra.reduce((a, e) => a + e, 0); k < left; k++) extra[order[k % m].i]++;
  const out: SketchPoint[] = [];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % m];
    for (let j = 0; j <= extra[i]; j++) out.push({ x: p.x + ((q.x - p.x) * j) / (extra[i] + 1), y: p.y + ((q.y - p.y) * j) / (extra[i] + 1) });
  });
  return out;
}

/** The connected polylines of a 3D sketch (segments joined at shared end points). */
/**
 * Sketch Fillet in a 3D sketch: each corner with a fillet is replaced by an arc of radius r tangent to its two lines,
 * in the plane of those lines. A radius too large for the shorter line, or a straight corner, is left sharp.
 */
export function filletCorners(chain: THREE.Vector3[], fillets: { at: [number, number, number]; r: number }[]): THREE.Vector3[] {
  if (!fillets.length || chain.length < 3) return chain;
  const out: THREE.Vector3[] = [chain[0]];
  for (let i = 1; i < chain.length - 1; i++) {
    const v = chain[i];
    const fl = fillets.find((f) => v.distanceTo(new THREE.Vector3(...f.at)) < 1e-6);
    const a = chain[i - 1].clone().sub(v), b = chain[i + 1].clone().sub(v);
    const la = a.length(), lb = b.length();
    a.normalize(); b.normalize();
    const theta = Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
    if (!fl || !(fl.r > 0) || theta < 1e-6 || Math.PI - theta < 1e-6) { out.push(v); continue; }
    const t = fl.r / Math.tan(theta / 2);
    if (t > Math.min(la, lb) + 1e-9) { out.push(v); continue; }
    const p1 = v.clone().addScaledVector(a, t), p2 = v.clone().addScaledVector(b, t);
    const c = v.clone().addScaledVector(a.clone().add(b).normalize(), fl.r / Math.sin(theta / 2));
    const u1 = p1.clone().sub(c), u2 = p2.clone().sub(c);
    const phi = Math.PI - theta, n = Math.max(4, Math.ceil(phi / (Math.PI / 36)));
    const axis = u1.clone().cross(u2).normalize();
    for (let k = 0; k <= n; k++) out.push(c.clone().add(u1.clone().applyAxisAngle(axis, (phi * k) / n)));
  }
  out.push(chain[chain.length - 1]);
  return out;
}

export function sketch3DChains(segments: [[number, number, number], [number, number, number]][], fillets: { at: [number, number, number]; r: number }[] = []): THREE.Vector3[][] {
  const segs = segments.map(([a, b]) => [new THREE.Vector3(...a), new THREE.Vector3(...b)]);
  const used = new Array(segs.length).fill(false);
  const out: THREE.Vector3[][] = [];
  const tol = 1e-6;
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const chain = [segs[i][0].clone(), segs[i][1].clone()];
    for (let grow = true; grow; ) {
      grow = false;
      for (let j = 0; j < segs.length; j++) {
        if (used[j]) continue;
        const [a, b] = segs[j];
        const head = chain[0], tail = chain[chain.length - 1];
        if (a.distanceTo(tail) < tol) chain.push(b.clone());
        else if (b.distanceTo(tail) < tol) chain.push(a.clone());
        else if (b.distanceTo(head) < tol) chain.unshift(a.clone());
        else if (a.distanceTo(head) < tol) chain.unshift(b.clone());
        else continue;
        used[j] = true;
        grow = true;
      }
    }
    out.push(chain);
  }
  return fillets.length ? out.map((c) => filletCorners(c, fillets)) : out;
}

function centroidOf(pts: THREE.Vector3[]): THREE.Vector3 {
  const c = new THREE.Vector3();
  for (const p of pts) c.add(p);
  return c.multiplyScalar(1 / (pts.length || 1));
}

/**
 * Loft between the outer loops of two profiles on their own planes; optional guide curves and
 * Start/End Constraints "Normal To Profile" (the loft leaves / meets the profile perpendicular, tangent length factor).
 */
export function loftGeometry(a: Region, planeA: PlaneDef, b: Region, planeB: PlaneDef, segments = 64, guides: THREE.Vector3[][] = [], constraints: { centerline?: THREE.Vector3[]; start?: number; end?: number; startDir?: [number, number, number]; endDir?: [number, number, number] } = {}): THREE.BufferGeometry | null {
  const fa = frameOf(planeA), fb = frameOf(planeB);
  // consistent orientation: both loops counter-clockwise in their planes
  const ccw = (loop: SketchPoint[]) => (polyArea(loop) < 0 ? loop.slice().reverse() : loop);
  const la = resample(ccw(a.outer), segments), lb = resample(ccw(b.outer), segments, la[0]);
  const ra = la.map((p) => toWorld(fa, p)), rb = lb.map((p) => toWorld(fb, p));
  // pick the rotation of b that minimises twist
  let bestShift = 0, bestD = Infinity;
  for (let s = 0; s < segments; s++) {
    let d = 0;
    for (let i = 0; i < segments; i += 4) d += ra[i].distanceToSquared(rb[(i + s) % segments]);
    if (d < bestD) { bestD = d; bestShift = s; }
  }
  const rbs = rb.map((_, i) => rb[(i + bestShift) % segments]);
  const pos: number[] = [];
  const normalStart = constraints.start !== undefined, normalEnd = constraints.end !== undefined;
  // Centerline Parameters: the section centres follow this curve (by arc length) instead of the straight axis
  const cl = constraints.centerline && constraints.centerline.length >= 2 ? constraints.centerline : null;
  const src: FaceSource[] = [];
  if (!guides.length && !normalStart && !normalEnd && !cl) {
    wallTriangles(ra, rbs, pos);
    wallSources(la, 1, src);
  } else {
    // Guide Curves: intermediate sections, each scaled in its plane so that its profile point nearest the
    // guide start runs along the guide (one guide: uniform scale; two: a linear map through both)
    const ca = centroidOf(ra), cb = centroidOf(rbs);
    const axis = cb.clone().sub(ca);
    const L2 = axis.lengthSq() || 1;
    const param = (g: THREE.Vector3) => g.clone().sub(ca).dot(axis) / L2;
    const at = (guide: THREE.Vector3[], t: number): THREE.Vector3 => {
      for (let i = 0; i + 1 < guide.length; i++) {
        const t0 = param(guide[i]), t1 = param(guide[i + 1]);
        if ((t - t0) * (t - t1) <= 0 && Math.abs(t1 - t0) > 1e-12) return guide[i].clone().lerp(guide[i + 1], (t - t0) / (t1 - t0));
      }
      return (Math.abs(param(guide[0]) - t) < Math.abs(param(guide[guide.length - 1]) - t) ? guide[0] : guide[guide.length - 1]).clone();
    };
    const gs = guides.filter((g) => g.length >= 2).map((g) => (param(g[0]) <= param(g[g.length - 1]) ? g : g.slice().reverse()));
    const idx = gs.map((g) => {
      let best = 0, bd = Infinity;
      ra.forEach((p, i) => { const d = p.distanceToSquared(g[0]); if (d < bd) { bd = d; best = i; } });
      return best;
    });
    const K = 48;
    // Normal To Profile: cubic Hermite paths whose end tangents are the profile normals (pointing to the other profile)
    const span = cb.clone().sub(ca).length();
    const nA = new THREE.Vector3(...planeA.n), nB = new THREE.Vector3(...planeB.n);
    if (nA.dot(axis) < 0) nA.negate();
    if (nB.dot(axis) < 0) nB.negate();
    // Direction Vector: the given direction instead of the profile normal
    if (constraints.startDir) nA.set(...constraints.startDir).normalize();
    if (constraints.endDir) nB.set(...constraints.endDir).normalize();
    const pathAt = (i: number, t: number): THREE.Vector3 => {
      if (!normalStart && !normalEnd) return ra[i].clone().lerp(rbs[i], t);
      const chord = rbs[i].clone().sub(ra[i]);
      const t0 = normalStart ? nA.clone().multiplyScalar(span * (constraints.start ?? 1)) : chord;
      const t1 = normalEnd ? nB.clone().multiplyScalar(span * (constraints.end ?? 1)) : chord;
      const t2 = t * t, t3 = t2 * t;
      return ra[i].clone().multiplyScalar(2 * t3 - 3 * t2 + 1).addScaledVector(t0, t3 - 2 * t2 + t).addScaledVector(rbs[i], -2 * t3 + 3 * t2).addScaledVector(t1, t3 - t2);
    };
    let prev = ra;
    const clLen: number[] = [0];
    if (cl) for (let i = 1; i < cl.length; i++) clLen.push(clLen[i - 1] + cl[i].distanceTo(cl[i - 1]));
    const clAt = (t: number): THREE.Vector3 => {
      const s = t * clLen[clLen.length - 1];
      let i = 0;
      while (i + 1 < clLen.length - 1 && clLen[i + 1] < s) i++;
      const f = (s - clLen[i]) / ((clLen[i + 1] - clLen[i]) || 1);
      return cl![i].clone().lerp(cl![i + 1], f);
    };
    // the centerline may run from b to a: take it the way that starts nearest profile a
    if (cl && cl[0].distanceTo(ca) > cl[cl.length - 1].distanceTo(ca)) cl.reverse();
    for (let k = 1; k <= K; k++) {
      const t = k / K;
      const sec = ra.map((_, i) => pathAt(i, t));
      if (cl && k < K) {
        const shift = clAt(t).sub(ca.clone().lerp(cb, t));
        for (const p of sec) p.add(shift);
      }
      if (k < K && gs.length) {
        const c = centroidOf(sec);
        const v = gs.map((_, j) => sec[idx[j]].clone().sub(c));
        const w = gs.map((g) => at(g, t).sub(c));
        const nrm = axis.clone().normalize();
        // in-plane parts only (the section moves along the axis by the lerp)
        const flat = (x: THREE.Vector3) => x.clone().addScaledVector(nrm, -x.dot(nrm));
        const v0 = flat(v[0]), w0 = flat(w[0]);
        if (gs.length === 1 || v0.lengthSq() < 1e-12) {
          const s = v0.length() > 1e-9 ? w0.length() / v0.length() : 1;
          for (const p of sec) p.sub(c).multiplyScalar(s).add(c);
          // keep the axial position of each point, shift the section where the guide leads
        } else {
          const v1 = flat(v[1]), w1 = flat(w[1]);
          const e1 = v0.clone().normalize(), e2 = nrm.clone().cross(e1).normalize();
          const a11 = v0.dot(e1), a21 = v0.dot(e2), a12 = v1.dot(e1), a22 = v1.dot(e2);
          const det = a11 * a22 - a12 * a21;
          if (Math.abs(det) < 1e-6 * v0.length() * v1.length()) {
            const s = (w0.length() / v0.length() + w1.length() / (v1.length() || 1)) / 2;
            for (const p of sec) p.sub(c).multiplyScalar(s).add(c);
          } else {
            // M maps v0 -> w0 and v1 -> w1 in the section plane (columns in the e1/e2 basis)
            const b11 = w0.dot(e1), b21 = w0.dot(e2), b12 = w1.dot(e1), b22 = w1.dot(e2);
            const i11 = a22 / det, i12 = -a12 / det, i21 = -a21 / det, i22 = a11 / det;
            const m11 = b11 * i11 + b12 * i21, m12 = b11 * i12 + b12 * i22, m21 = b21 * i11 + b22 * i21, m22 = b21 * i12 + b22 * i22;
            for (const p of sec) {
              const d = p.clone().sub(c);
              const ax = d.dot(nrm), x = d.dot(e1), y = d.dot(e2);
              p.copy(c).addScaledVector(nrm, ax).addScaledVector(e1, m11 * x + m12 * y).addScaledVector(e2, m21 * x + m22 * y);
            }
          }
        }
      }
      wallTriangles(prev, sec, pos);
      prev = sec;
    }
    wallSources(la, K, src);
  }
  const zero = { x: 0, y: 0 };
  pushCap(capTriangles({ outer: la, holes: [], area: 0 }, fa.o, fa.u, fa.v, zero, false), '-', pos, src);
  pushCap(capTriangles({ outer: lb, holes: [], area: 0 }, fb.o, fb.u, fb.v, zero, true), '+', pos, src);
  return finish(pos, src);
}

/** sections through which a smooth loft is one polynomial per point (OpenCascade's ThruSections: degree 8 at most) */
export const LOFT_POLY_SECTIONS = 9;

/**
 * Loft through the outer loops of two or more profiles in loft order, each on its own plane (QA 0.5.11, parity row 10).
 * Ruled: straight walls between consecutive profiles. Smooth: each point runs along the polynomial through its places
 * on the profiles, at chord-length parameters measured as OpenCascade measures them (see KAPPA2), as
 * OpenCascade's ThruSections lofts up to nine sections, so the mesh and the exact body agree; more sections: a
 * Catmull-Rom curve through them. Closed: the last profile lofts back to the first, without end faces.
 */
export function loftThroughGeometry(profiles: { region: Region; plane: PlaneDef }[], opts: { ruled?: boolean; closed?: boolean } = {}, segments = 64): THREE.BufferGeometry | null {
  const n = profiles.length;
  if (n < 2) return null;
  const closed = !!opts.closed && n >= 3;
  const ccw = (loop: SketchPoint[]) => (polyArea(loop) < 0 ? loop.slice().reverse() : loop);
  const frames = profiles.map((p) => frameOf(p.plane));
  // polygons with as many corners each (OpenCascade lofts them corner to corner): as many points on every side, so the
  // corners meet; otherwise points spread evenly along each outline
  const corners = profiles[0].region.outer.length;
  const polygons = corners <= 24 && profiles.every((p) => p.region.outer.length === corners);
  const step = polygons ? Math.ceil(segments / corners) : 1;
  const count = polygons ? step * corners : segments;
  const flat = profiles.map((p) => {
    const loop = ccw(p.region.outer);
    if (!polygons) return resample(loop, count);
    return loop.flatMap((a, i) => Array.from({ length: step }, (_, j) => {
      const b = loop[(i + 1) % corners];
      return { x: a.x + ((b.x - a.x) * j) / step, y: a.y + ((b.y - a.y) * j) / step };
    }));
  });
  const centres = flat.map((l, k) => centroidOf(l.map((q) => toWorld(frames[k], q))));
  // the direction the loft runs through each profile: every loop turns counter-clockwise about it
  const along = (k: number) => centres[closed ? (k + 1) % n : Math.min(n - 1, k + 1)].clone().sub(centres[closed ? (k - 1 + n) % n : Math.max(0, k - 1)]);
  const loops = flat.map((l, k) => (frames[k].n.dot(along(k)) < 0 ? [l[0], ...l.slice(1).reverse()] : l));
  // each loop starts where the one before it starts (the rotation with the least twist)
  const rings: THREE.Vector3[][] = [];
  loops.forEach((l, k) => {
    const w = l.map((q) => toWorld(frames[k], q));
    if (!k) { rings.push(w); return; }
    let best = 0, bd = Infinity;
    for (let s = 0; s < count; s += step) {
      let d = 0;
      for (let i = 0; i < count; i += 2) d += rings[k - 1][i].distanceToSquared(w[(i + s) % count]);
      if (d < bd) { bd = d; best = s; }
    }
    rings.push(w.map((_, i) => w[(i + best) % count]));
  });
  if (closed) rings.push(rings[0]);
  const m = rings.length;
  // OpenCascade measures the chord between two sections over the poles of their B-spline curves: the move of the centre
  // and the change of shape about it, the latter over poles that spread KAPPA2 times wider about the centre than points
  // spread evenly along the outline (a line's poles are its ends, a circle's lie outside it)
  const KAPPA2 = 1.6;
  const t = [0];
  for (let k = 1; k < m; k++) {
    const c0 = centroidOf(rings[k - 1]), dc = centroidOf(rings[k]).sub(c0);
    const shape = rings[k].reduce((s, p, i) => s + p.clone().sub(rings[k - 1][i]).sub(dc).lengthSq(), 0);
    t.push(t[k - 1] + Math.sqrt(count * dc.lengthSq() + KAPPA2 * shape));
  }
  const pos: number[] = [], src: FaceSource[] = [];
  let rows = m - 1;
  if (opts.ruled) for (let k = 1; k < m; k++) wallTriangles(rings[k - 1], rings[k], pos);
  else {
    const per = 16;
    rows = per * (m - 1);
    /** the section at parameter u: the weight of every profile (Lagrange) or of the four around u (Catmull-Rom) */
    const section = (u: number): THREE.Vector3[] => {
      const w = new Array<number>(m).fill(0);
      if (m <= LOFT_POLY_SECTIONS) for (let k = 0; k < m; k++) w[k] = t.reduce((acc, tj, j) => (j === k ? acc : (acc * (u - tj)) / (t[k] - tj)), 1);
      else {
        let k = 1;
        while (k < m - 1 && t[k] < u) k++;
        const s = (u - t[k - 1]) / (t[k] - t[k - 1]), h = t[k] - t[k - 1];
        const h00 = 2 * s ** 3 - 3 * s ** 2 + 1, h10 = s ** 3 - 2 * s ** 2 + s, h01 = -2 * s ** 3 + 3 * s ** 2, h11 = s ** 3 - s ** 2;
        w[k - 1] += h00; w[k] += h01;
        // tangents (P[j+1] - P[j-1]) / (t[j+1] - t[j-1]), one-sided at the ends
        const tangent = (j: number, f: number) => {
          const a = Math.max(0, j - 1), b = Math.min(m - 1, j + 1);
          w[b] += (f * h) / (t[b] - t[a]); w[a] -= (f * h) / (t[b] - t[a]);
        };
        tangent(k - 1, h10); tangent(k, h11);
      }
      return rings[0].map((_, i) => rings.reduce((acc, r, k) => (w[k] ? acc.addScaledVector(r[i], w[k]) : acc), new THREE.Vector3()));
    };
    let prev = rings[0];
    for (let k = 1; k < m; k++) for (let j = 1; j <= per; j++) {
      const sec = j === per ? rings[k] : section(t[k - 1] + ((t[k] - t[k - 1]) * j) / per);
      wallTriangles(prev, sec, pos);
      prev = sec;
    }
  }
  wallSources(loops[0], rows, src);
  if (!closed) {
    // the end faces turn the same way as the walls (finish() then turns the whole surface outward)
    const zero = { x: 0, y: 0 }, fa = frames[0], fb = frames[n - 1];
    pushCap(capTriangles({ outer: loops[0], holes: [], area: 0 }, fa.o, fa.u, fa.v, zero, fa.n.dot(along(0)) < 0), '-', pos, src);
    pushCap(capTriangles({ outer: loops[n - 1], holes: [], area: 0 }, fb.o, fb.u, fb.v, zero, fb.n.dot(along(n - 1)) > 0), '+', pos, src);
  }
  return finish(pos, src);
}

/**
 * Helix on the first circle of a sketch: the axis is the sketch normal through the circle centre.
 * Defined by pitch + revolutions, height + revolutions or height + pitch; 48 points per turn.
 */
export function helixPath(sketch: Sketch, plane: PlaneDef, f: { definedBy: 'pitchRevolution' | 'heightRevolution' | 'heightPitch'; pitch: number; revolutions: number; height: number; startAngle: number; clockwise: boolean; reverse: boolean; variable?: { rev: number; pitch: number; diameter: number }[]; taper?: { angle: number; outward: boolean } }): THREE.Vector3[] | null {
  const circle = sketch.entityOrder.map((id) => sketch.entities[id]).find((e) => e.kind === 'circle' && !e.construction) as { center: string; r: string } | undefined;
  if (!circle) return null;
  const c = sketch.points[circle.center];
  const r = sketch.scalars[circle.r];
  if (!(r > 0)) return null;
  let pitch = f.pitch, revs = f.revolutions;
  if (f.definedBy === 'heightRevolution') pitch = f.revolutions > 0 ? f.height / f.revolutions : 0;
  else if (f.definedBy === 'heightPitch') revs = f.pitch > 0 ? f.height / f.pitch : 0;
  if (!(pitch > 0) || !(revs > 0)) return null;
  const m = planeMatrix(plane);
  // Variable pitch: pitch and diameter interpolated between the region parameters (by revolution)
  const regions = f.variable && f.variable.length >= 2 ? [...f.variable].sort((p, q) => p.rev - q.rev) : null;
  if (regions) revs = regions[regions.length - 1].rev;
  const at = (t: number) => {
    if (!regions) return { pitch, radius: r };
    let i = 0;
    while (i < regions.length - 2 && t > regions[i + 1].rev) i++;
    const A = regions[i], B = regions[i + 1];
    const k = B.rev > A.rev ? Math.min(1, Math.max(0, (t - A.rev) / (B.rev - A.rev))) : 0;
    return { pitch: A.pitch + (B.pitch - A.pitch) * k, radius: (A.diameter + (B.diameter - A.diameter) * k) / 2 };
  };
  const tan = f.taper ? Math.tan((f.taper.angle * Math.PI) / 180) * (f.taper.outward ? 1 : -1) : 0;
  const n = Math.max(8, Math.ceil(revs * 48));
  const dir = f.clockwise ? -1 : 1;
  const out: THREE.Vector3[] = [];
  let z = 0;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * revs;
    if (i > 0) z += at(t).pitch * (revs / n);
    const a = (f.startAngle * Math.PI) / 180 + dir * t * Math.PI * 2;
    const rr = Math.max(0.01, at(t).radius + tan * z);
    out.push(new THREE.Vector3(c.x + rr * Math.cos(a), c.y + rr * Math.sin(a), (f.reverse ? -1 : 1) * z).applyMatrix4(m));
  }
  return out;
}


/** Swept Surface: open (or closed) profile curves moved along the path, without caps. */
export function sweepCurves(chains: SketchPoint[][], profilePlane: PlaneDef, path: THREE.Vector3[]): THREE.BufferGeometry | null {
  if (!chains.length || path.length < 2) return null;
  const pf = frameOf(profilePlane);
  const rel = path[0].clone().sub(pf.o);
  const offset = { x: rel.dot(pf.u), y: rel.dot(pf.v) };
  const tangents = path.map((_, i) => path[Math.min(path.length - 1, i + 1)].clone().sub(path[Math.max(0, i - 1)]).normalize());
  let u = pf.u.clone(), v = pf.v.clone();
  const t0 = tangents[0];
  const q0 = new THREE.Quaternion().setFromUnitVectors(pf.n, t0.dot(pf.n) < 0 ? t0.clone().negate() : t0);
  u.applyQuaternion(q0);
  v.applyQuaternion(q0);
  if (t0.dot(pf.n) < 0) u.negate();
  const frames: { o: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3 }[] = [];
  let prevT = tangents[0];
  for (let i = 0; i < path.length; i++) {
    if (i > 0) {
      const q = new THREE.Quaternion().setFromUnitVectors(prevT, tangents[i]);
      u = u.clone().applyQuaternion(q);
      v = v.clone().applyQuaternion(q);
    }
    frames.push({ o: path[i], u: u.clone(), v: v.clone() });
    prevT = tangents[i];
  }
  const pos: number[] = [];
  for (const ch of chains) {
    const rings = frames.map((f) => placeLoop(ch, f.o, f.u, f.v, offset));
    for (let k = 0; k + 1 < rings.length; k++) {
      const a = rings[k], b = rings[k + 1];
      for (let i = 0; i + 1 < a.length; i++) {
        pos.push(a[i].x, a[i].y, a[i].z, b[i + 1].x, b[i + 1].y, b[i + 1].z, b[i].x, b[i].y, b[i].z);
        pos.push(a[i].x, a[i].y, a[i].z, a[i + 1].x, a[i + 1].y, a[i + 1].z, b[i + 1].x, b[i + 1].y, b[i + 1].z);
      }
    }
  }
  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Lofted Surface: a ruled surface between two profile curves (resampled to the same number of points). */
export function loftCurves(a: THREE.Vector3[], b: THREE.Vector3[], n = 64): THREE.BufferGeometry | null {
  if (a.length < 2 || b.length < 2) return null;
  const resample3 = (pts: THREE.Vector3[]) => {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const out: THREE.Vector3[] = [];
    for (let k = 0; k <= n; k++) {
      const t = (L[L.length - 1] * k) / n;
      let i = 1;
      while (i < L.length - 1 && L[i] < t) i++;
      const f = (t - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
      out.push(pts[i - 1].clone().lerp(pts[i], Math.max(0, Math.min(1, f))));
    }
    return out;
  };
  let ra = resample3(a), rb = resample3(b);
  // run both curves the same way round
  if (ra[0].distanceTo(rb[0]) + ra[n].distanceTo(rb[n]) > ra[0].distanceTo(rb[n]) + ra[n].distanceTo(rb[0])) rb = rb.reverse();
  const pos: number[] = [];
  for (let i = 0; i < n; i++) {
    pos.push(ra[i].x, ra[i].y, ra[i].z, rb[i + 1].x, rb[i + 1].y, rb[i + 1].z, rb[i].x, rb[i].y, rb[i].z);
    pos.push(ra[i].x, ra[i].y, ra[i].z, ra[i + 1].x, ra[i + 1].y, ra[i + 1].z, rb[i + 1].x, rb[i + 1].y, rb[i + 1].z);
  }
  void ra;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
