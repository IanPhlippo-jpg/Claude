import * as THREE from 'three';
import type { HoleFeature, PlaneDef } from '../document/types';

/** Mirror a geometry about a plane (point + normal); winding is flipped back so it stays outward. */
export function mirrorGeometry(g: THREE.BufferGeometry, origin: [number, number, number], normal: [number, number, number]): THREE.BufferGeometry {
  const n = new THREE.Vector3(...normal).normalize();
  const o = new THREE.Vector3(...origin);
  const ng = (g.index ? g.toNonIndexed() : g).clone();
  const pos = ng.getAttribute('position');
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const d = p.clone().sub(o).dot(n);
    p.addScaledVector(n, -2 * d);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  // a reflection inverts orientation: swap two vertices of every triangle
  for (let t = 0; t * 3 + 2 < pos.count; t++) {
    const x = pos.getX(t * 3 + 1), y = pos.getY(t * 3 + 1), z = pos.getZ(t * 3 + 1);
    pos.setXYZ(t * 3 + 1, pos.getX(t * 3 + 2), pos.getY(t * 3 + 2), pos.getZ(t * 3 + 2));
    pos.setXYZ(t * 3 + 2, x, y, z);
  }
  pos.needsUpdate = true;
  ng.computeVertexNormals();
  return ng;
}

/** Translated copy. */
export function translated(g: THREE.BufferGeometry, v: THREE.Vector3): THREE.BufferGeometry {
  const c = g.clone();
  c.translate(v.x, v.y, v.z);
  return c;
}

/** Copy rotated about an axis through a point. */
export function rotatedAbout(g: THREE.BufferGeometry, origin: THREE.Vector3, dir: THREE.Vector3, angleRad: number): THREE.BufferGeometry {
  const c = g.clone();
  const m = new THREE.Matrix4().makeTranslation(-origin.x, -origin.y, -origin.z);
  const r = new THREE.Matrix4().makeRotationAxis(dir.clone().normalize(), angleRad);
  const back = new THREE.Matrix4().makeTranslation(origin.x, origin.y, origin.z);
  c.applyMatrix4(back.multiply(r).multiply(m));
  c.computeVertexNormals();
  return c;
}

/** Instance transforms of a pattern feature (without the seed instance). */
/**
 * the most instances a pattern makes: every instance is a boolean on the UI thread, and 400 took close to a minute
 * in 0.3.1, so the limit stays well below that (F44)
 */
export const MAX_PATTERN_INSTANCES = 250;

export function patternInstances(f: { type: string; dir1?: { axis: [number, number, number]; spacing: number; count: number }; dir2?: { axis: [number, number, number]; spacing: number; count: number }; axis?: { origin: [number, number, number]; dir: [number, number, number] }; angle?: number; count?: number; instanceSpacing?: boolean; seedOnly?: boolean; modified?: { i: number; j: number; dx?: number; dy?: number }[] }): ((g: THREE.BufferGeometry) => THREE.BufferGeometry)[] {
  const out: ((g: THREE.BufferGeometry) => THREE.BufferGeometry)[] = [];
  if (f.type !== 'linearPattern' && f.type !== 'circularPattern') return out;
  // never more than MAX_PATTERN_INSTANCES transforms: the Property Panel previews every change, and a boolean
  // per instance beyond that takes minutes (the commit refuses such a count with a message)
  const push = (t: (g: THREE.BufferGeometry) => THREE.BufferGeometry) => { if (out.length < MAX_PATTERN_INSTANCES) out.push(t); };
  if (f.type === 'linearPattern') {
    const d1 = f.dir1 ? new THREE.Vector3(...f.dir1.axis).normalize().multiplyScalar(f.dir1.spacing) : new THREE.Vector3();
    const d2 = f.dir2 ? new THREE.Vector3(...f.dir2.axis).normalize().multiplyScalar(f.dir2.spacing) : new THREE.Vector3();
    const n1 = Math.max(1, f.dir1?.count ?? 1), n2 = Math.max(1, f.dir2?.count ?? 1);
    for (let i = 0; i < n1; i++) {
      for (let j = 0; j < n2; j++) {
        if (i === 0 && j === 0) continue;
        // Pattern seed only: direction 2 repeats the seed alone, not the whole row of direction 1
        if (f.seedOnly && j > 0 && i > 0) continue;
        const v = d1.clone().multiplyScalar(i).addScaledVector(d2, j);
        // Modified Instances: this instance sits off its grid spot
        const mod = f.modified?.find((m) => m.i === i && m.j === j);
        if (mod) v.addScaledVector(d1.clone().normalize(), mod.dx ?? 0).addScaledVector(d2.clone().normalize(), mod.dy ?? 0);
        push((g) => translated(g, v));
      }
    }
  } else {
    const n = Math.max(1, f.count ?? 1);
    const total = ((f.angle ?? 360) * Math.PI) / 180;
    const full = Math.abs(total - Math.PI * 2) < 1e-6;
    // Instance spacing: the angle is the step itself; Equal spacing: the total angle shared out
    const step = f.instanceSpacing ? total : full ? total / n : n > 1 ? total / (n - 1) : 0;
    const o = new THREE.Vector3(...(f.axis?.origin ?? [0, 0, 0]));
    const d = new THREE.Vector3(...(f.axis?.dir ?? [0, 1, 0]));
    for (let i = 1; i < n; i++) push((g) => rotatedAbout(g, o, d, step * i));
  }
  return out;
}

/** one solid of revolution of a hole: radius r0 at depth t0 to r1 at t1 (t along the hole axis, into the material) */
export interface HolePart { t0: number; t1: number; r0: number; r1: number }

type HoleSizes = Pick<HoleFeature, 'holeType' | 'diameter' | 'depth' | 'cbDiameter' | 'cbDepth' | 'csDiameter' | 'csAngle'> & Partial<Pick<HoleFeature, 'headClearance' | 'nearCs' | 'underHeadCs'>>;

/**
 * The parts of a Hole Tool hole along its axis (the cylinder, the counterbore, the countersink cones), each starting
 * EPS above the placement face so the cut has no coplanar face there. Both kernels build their tool from this list.
 */
export function holeParts(f: HoleSizes, throughAll: number): HolePart[] {
  const depth = f.depth > 0 ? f.depth : throughAll;
  const EPS = 0.5;
  const d2 = f.diameter / 2;
  const parts: HolePart[] = [{ t0: -EPS, t1: depth, r0: d2, r1: d2 }];
  if (f.holeType === 'counterbore') {
    // Head clearance: the counterbore goes deeper by the clearance
    const cbd = f.cbDepth + (f.headClearance ?? 0);
    parts.push({ t0: -EPS, t1: cbd, r0: f.cbDiameter / 2, r1: f.cbDiameter / 2 });
    // Under head countersink: a cone at the bottom of the counterbore, down to the hole
    if (f.underHeadCs && f.underHeadCs.diameter > f.diameter) {
      const h = (f.underHeadCs.diameter / 2 - d2) / Math.tan((f.underHeadCs.angle * Math.PI) / 360);
      parts.push({ t0: cbd - EPS, t1: cbd + h, r0: f.underHeadCs.diameter / 2, r1: d2 });
    }
  } else if (f.holeType === 'countersink') {
    // cone: radius r at the surface tapering to 0 at depth h; extended above the surface
    const r = f.csDiameter / 2;
    const h = r / Math.tan((f.csAngle * Math.PI) / 360);
    parts.push({ t0: -EPS, t1: h, r0: (r * (h + EPS)) / h, r1: 0 });
  }
  // Near side countersink: a cone at the hole entry (for a counterbore: at the counterbore's rim)
  if (f.nearCs && f.nearCs.diameter > (f.holeType === 'counterbore' ? f.cbDiameter : f.diameter)) {
    const r0 = (f.holeType === 'counterbore' ? f.cbDiameter : f.diameter) / 2;
    const r = f.nearCs.diameter / 2;
    const h = (r - r0) / Math.tan((f.nearCs.angle * Math.PI) / 360);
    parts.push({ t0: -EPS, t1: h, r0: r + EPS * Math.tan((f.nearCs.angle * Math.PI) / 360), r1: r0 });
  }
  return parts;
}

/** the outline (t, r) of the union of the parts: at every depth the largest radius, a step where one part ends */
export function holeOutline(parts: HolePart[]): { t: number; r: number }[] {
  const live = parts.filter((p) => p.t1 > p.t0);
  const at = (p: HolePart, t: number) => p.r0 + ((p.r1 - p.r0) * (t - p.t0)) / (p.t1 - p.t0);
  // the depths where the largest radius can change: the ends of every part and where two cones cross
  const ts = new Set<number>(live.flatMap((p) => [p.t0, p.t1]));
  for (const a of live) for (const b of live) {
    const lo = Math.max(a.t0, b.t0), hi = Math.min(a.t1, b.t1);
    if (!(hi > lo)) continue;
    const da = at(a, lo) - at(b, lo), db = at(a, hi) - at(b, hi);
    if (da * db < 0) ts.add(lo + ((hi - lo) * da) / (da - db));
  }
  const sorted = [...ts].sort((x, y) => x - y);
  const out: { t: number; r: number }[] = [];
  const add = (t: number, r: number) => {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.t - t) > 1e-9 || Math.abs(last.r - r) > 1e-9) out.push({ t, r });
  };
  for (let i = 0; i + 1 < sorted.length; i++) {
    const a = sorted[i], b = sorted[i + 1], m = (a + b) / 2;
    const cover = live.filter((p) => p.t0 <= m && m <= p.t1);
    if (!cover.length) continue;
    const top = cover.reduce((x, y) => (at(y, m) > at(x, m) ? y : x));
    add(a, Math.max(0, at(top, a)));
    add(b, Math.max(0, at(top, b)));
  }
  return out;
}

/**
 * Tool solid of one hole of the Hole Tool, in world coordinates (axis along -normal of the plane): one closed solid of
 * revolution around the outline of its parts. Separate overlapping shells (a cylinder and a cone merged) are no solid:
 * the boolean kept the walls of one inside the other (the countersink cone stood in the hole, F172).
 */
export function holeTool(f: HoleSizes, plane: PlaneDef, at: { x: number; y: number }, throughAll: number): THREE.BufferGeometry {
  const o = new THREE.Vector3(...plane.origin), u = new THREE.Vector3(...plane.u), v = new THREE.Vector3(...plane.v), n = new THREE.Vector3(...plane.n);
  const start = o.clone().addScaledVector(u, at.x).addScaledVector(v, at.y);
  // local frame: x = u, y into the material (-n), z = x × y
  const Y = n.clone().negate();
  const Z = u.clone().cross(Y);
  const prof = holeOutline(holeParts(f, throughAll));
  const SEG = 48;
  const ring = (k: number) => prof.map((q) => start.clone().addScaledVector(u, q.r * Math.cos((2 * Math.PI * k) / SEG)).addScaledVector(Z, q.r * Math.sin((2 * Math.PI * k) / SEG)).addScaledVector(Y, q.t));
  const rings = Array.from({ length: SEG }, (_, k) => ring(k));
  const pos: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  const last = prof.length - 1;
  const c0 = start.clone().addScaledVector(Y, prof[0].t), c1 = start.clone().addScaledVector(Y, prof[last].t);
  for (let k = 0; k < SEG; k++) {
    const A = rings[k], B = rings[(k + 1) % SEG];
    // the side: (i, k) (i + 1, k) (i, k + 1) faces outward; a radius 0 drops the triangle that would have no area
    for (let i = 0; i < last; i++) {
      if (prof[i].r > 1e-12) tri(A[i], A[i + 1], B[i]);
      if (prof[i + 1].r > 1e-12) tri(A[i + 1], B[i + 1], B[i]);
    }
    // the end caps: outward along -Y at the top, +Y at the bottom
    if (prof[0].r > 1e-12) tri(c0, A[0], B[0]);
    if (prof[last].r > 1e-12) tri(c1, B[last], A[last]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** World positions of the pattern instances (seed excluded), in the same order as patternInstances(). */
export function patternInstancePoints(f: Parameters<typeof patternInstances>[0], seedCentre: THREE.Vector3): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  if (f.type === 'linearPattern') {
    const d1 = f.dir1 ? new THREE.Vector3(...f.dir1.axis).normalize().multiplyScalar(f.dir1.spacing) : new THREE.Vector3();
    const d2 = f.dir2 ? new THREE.Vector3(...f.dir2.axis).normalize().multiplyScalar(f.dir2.spacing) : new THREE.Vector3();
    const n1 = Math.max(1, f.dir1?.count ?? 1), n2 = Math.max(1, f.dir2?.count ?? 1);
    for (let i = 0; i < n1; i++) for (let j = 0; j < n2; j++) {
      if (i === 0 && j === 0) continue;
      out.push(seedCentre.clone().addScaledVector(d1, i).addScaledVector(d2, j));
    }
  } else {
    const n = Math.max(1, f.count ?? 1);
    const total = ((f.angle ?? 360) * Math.PI) / 180;
    const full = Math.abs(total - Math.PI * 2) < 1e-6;
    const step = full ? total / n : n > 1 ? total / (n - 1) : 0;
    const o = new THREE.Vector3(...(f.axis?.origin ?? [0, 0, 0]));
    const d = new THREE.Vector3(...(f.axis?.dir ?? [0, 1, 0])).normalize();
    for (let i = 1; i < n; i++) out.push(seedCentre.clone().sub(o).applyAxisAngle(d, step * i).add(o));
  }
  return out;
}
