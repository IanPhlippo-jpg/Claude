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

function finish(pos: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
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
 * Sweep the profile regions along the path (parallel-transport frames). The profile is
 * taken relative to the path start projected onto the profile plane, so a profile drawn
 * around the path's start point stays centred on the path.
 */
export function sweepGeometry(regions: Region[], profilePlane: PlaneDef, path: THREE.Vector3[]): THREE.BufferGeometry | null {
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
  let u = pf.u.clone(), v = pf.v.clone();
  // start frame: align the profile normal with the first tangent
  const t0 = tangents[0];
  const q0 = new THREE.Quaternion().setFromUnitVectors(pf.n, t0.dot(pf.n) < 0 ? t0.clone().negate() : t0);
  u.applyQuaternion(q0);
  v.applyQuaternion(q0);
  if (t0.dot(pf.n) < 0) {
    u.negate();
  }
  const frames: { o: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3 }[] = [];
  let prevT = tangents[0];
  for (let i = 0; i < path.length; i++) {
    const t = tangents[i];
    if (i > 0) {
      const q = new THREE.Quaternion().setFromUnitVectors(prevT, t);
      u = u.clone().applyQuaternion(q);
      v = v.clone().applyQuaternion(q);
    }
    frames.push({ o: path[i], u: u.clone(), v: v.clone() });
    prevT = t;
  }
  const pos: number[] = [];
  for (const r0 of regions) {
    const r = orient(r0);
    const loops = [r.outer, ...r.holes];
    for (const loop of loops) {
      const rings = frames.map((f) => placeLoop(loop, f.o, f.u, f.v, offset));
      for (let i = 0; i + 1 < rings.length; i++) wallTriangles(rings[i], rings[i + 1], pos);
    }
    const f0 = frames[0], f1 = frames[frames.length - 1];
    // ShapeGeometry triangles face -n of the (u, v) frame: the start cap keeps them, the end cap flips them
    pos.push(...capTriangles(r, f0.o, f0.u, f0.v, offset, false));
    pos.push(...capTriangles(r, f1.o, f1.u, f1.v, offset, true));
  }
  return finish(pos);
}

/** resample a closed loop to n points by arc length, starting at the point nearest `start` */
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

/** The connected polylines of a 3D sketch (segments joined at shared end points). */
export function sketch3DChains(segments: [[number, number, number], [number, number, number]][]): THREE.Vector3[][] {
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
  return out;
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
export function loftGeometry(a: Region, planeA: PlaneDef, b: Region, planeB: PlaneDef, segments = 64, guides: THREE.Vector3[][] = [], constraints: { start?: number; end?: number; startDir?: [number, number, number]; endDir?: [number, number, number] } = {}): THREE.BufferGeometry | null {
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
  if (!guides.length && !normalStart && !normalEnd) wallTriangles(ra, rbs, pos);
  else {
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
    for (let k = 1; k <= K; k++) {
      const t = k / K;
      const sec = ra.map((_, i) => pathAt(i, t));
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
  }
  const zero = { x: 0, y: 0 };
  pos.push(...capTriangles({ outer: la, holes: [], area: 0 }, fa.o, fa.u, fa.v, zero, false));
  pos.push(...capTriangles({ outer: lb, holes: [], area: 0 }, fb.o, fb.u, fb.v, zero, true));
  return finish(pos);
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
