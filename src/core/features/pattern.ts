import * as THREE from 'three';
import type { HoleFeature, PlaneDef } from '../document/types';
import { mergeGeometries } from './solid';

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

/** Tool solid of one hole of the Hole Tool, in world coordinates (axis along -normal of the plane). */
export function holeTool(f: Pick<HoleFeature, 'holeType' | 'diameter' | 'depth' | 'cbDiameter' | 'cbDepth' | 'csDiameter' | 'csAngle'> & Partial<Pick<HoleFeature, 'headClearance' | 'nearCs' | 'underHeadCs'>>, plane: PlaneDef, at: { x: number; y: number }, throughAll: number): THREE.BufferGeometry {
  const o = new THREE.Vector3(...plane.origin), u = new THREE.Vector3(...plane.u), v = new THREE.Vector3(...plane.v), n = new THREE.Vector3(...plane.n);
  const start = o.clone().addScaledVector(u, at.x).addScaledVector(v, at.y);
  const depth = f.depth > 0 ? f.depth : throughAll;
  const EPS = 0.5;
  const parts: THREE.BufferGeometry[] = [];
  // cylinder geometry is along +Y; map local Y to -n
  const place = (g: THREE.BufferGeometry, top: number, height: number) => {
    // CylinderGeometry is centred on local y; local +y points into the material, so the tool spans [top, top + height]
    g.translate(0, height / 2 + top, 0);
    // right-handed frame: local Y points into the material (-n)
    const Y = n.clone().negate();
    const m = new THREE.Matrix4().makeBasis(u, Y, u.clone().cross(Y));
    m.setPosition(start);
    g.applyMatrix4(m);
    return g.toNonIndexed();
  };
  parts.push(place(new THREE.CylinderGeometry(f.diameter / 2, f.diameter / 2, depth + EPS, 48, 1, false), -EPS, depth + EPS));
  if (f.holeType === 'counterbore') {
    // Head clearance: the counterbore goes deeper by the clearance
    const cbd = f.cbDepth + (f.headClearance ?? 0);
    parts.push(place(new THREE.CylinderGeometry(f.cbDiameter / 2, f.cbDiameter / 2, cbd + EPS, 48, 1, false), -EPS, cbd + EPS));
    // Under head countersink: a cone at the bottom of the counterbore, down to the hole
    if (f.underHeadCs && f.underHeadCs.diameter > f.diameter) {
      const h = (f.underHeadCs.diameter / 2 - f.diameter / 2) / Math.tan((f.underHeadCs.angle * Math.PI) / 360);
      parts.push(place(new THREE.CylinderGeometry(f.diameter / 2, f.underHeadCs.diameter / 2, h + EPS, 48, 1, false), cbd - EPS, h + EPS));
    }
  } else if (f.holeType === 'countersink') {
    const r = f.csDiameter / 2;
    const h = r / Math.tan((f.csAngle * Math.PI) / 360);
    // cone: radius r at the surface tapering to 0 at depth h; extended above the surface
    const ext = EPS;
    const rTop = r * (h + ext) / h;
    // wide at the surface (local -y side), tapering to a point at depth h
    parts.push(place(new THREE.CylinderGeometry(0, rTop, h + ext, 48, 1, false), -ext, h + ext));
  }
  // Near side countersink: a cone at the hole entry (for a counterbore: at the counterbore's rim)
  if (f.nearCs && f.nearCs.diameter > (f.holeType === 'counterbore' ? f.cbDiameter : f.diameter)) {
    const r0 = (f.holeType === 'counterbore' ? f.cbDiameter : f.diameter) / 2;
    const r = f.nearCs.diameter / 2;
    const h = (r - r0) / Math.tan((f.nearCs.angle * Math.PI) / 360);
    const rTop = r + EPS * Math.tan((f.nearCs.angle * Math.PI) / 360);
    parts.push(place(new THREE.CylinderGeometry(r0, rTop, h + EPS, 48, 1, false), -EPS, h + EPS));
  }
  const g = mergeGeometries(parts);
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
