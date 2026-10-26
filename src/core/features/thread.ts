import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { flipWinding, meshVolume } from './solid';

/** Metric coarse threads (ISO 261): name, major diameter, pitch. */
export const METRIC_THREADS: [string, number, number][] = [
  ['M3x0.5', 3, 0.5], ['M4x0.7', 4, 0.7], ['M5x0.8', 5, 0.8], ['M6x1.0', 6, 1], ['M8x1.25', 8, 1.25], ['M10x1.5', 10, 1.5],
  ['M12x1.75', 12, 1.75], ['M14x2.0', 14, 2], ['M16x2.0', 16, 2], ['M20x2.5', 20, 2.5], ['M24x3.0', 24, 3],
];

/** The thread size closest to a diameter: a rod takes its major diameter, a hole its minor (tap drill) diameter. */
export function nearestThread(diameter: number, internal: boolean): [string, number, number] {
  let best = METRIC_THREADS[0], err = Infinity;
  for (const t of METRIC_THREADS) {
    const d = internal ? t[1] - 1.0825 * t[2] : t[1];
    if (Math.abs(d - diameter) < err) { err = Math.abs(d - diameter); best = t; }
  }
  return best;
}

/** Circle through the points of a closed edge: centre, unit plane normal and radius. */
export function circleOfEdge(points: THREE.Vector3[]): { center: THREE.Vector3; normal: THREE.Vector3; radius: number } | null {
  if (points.length < 3) return null;
  const c = new THREE.Vector3();
  for (const p of points) c.add(p);
  c.divideScalar(points.length);
  const n = new THREE.Vector3();
  for (let i = 0; i < points.length; i++) {
    const a = points[i].clone().sub(c), b = points[(i + 1) % points.length].clone().sub(c);
    n.add(a.cross(b));
  }
  if (n.lengthSq() < 1e-12) return null;
  n.normalize();
  let r = 0;
  for (const p of points) r += p.distanceTo(c);
  return { center: c, normal: n, radius: r / points.length };
}

/** Material at a point: odd number of crossings along a ray. */
export function insideBody(g: THREE.BufferGeometry, p: THREE.Vector3): boolean {
  const geom = g.index ? g.toNonIndexed() : g;
  const bvh = new MeshBVH(geom);
  const hits = bvh.raycast(new THREE.Ray(p, new THREE.Vector3(0.577, 0.577, 0.577).normalize()), THREE.DoubleSide);
  return hits.length % 2 === 1;
}

export interface ThreadSpec {
  center: [number, number, number];
  /** unit axis pointing from the start edge into the material */
  axis: [number, number, number];
  /** the cylinder the thread is on: the rod (external) or the hole (internal) */
  radius: number;
  internal: boolean;
  pitch: number;
  length: number;
  method: 'cut' | 'extrude';
  rightHand: boolean;
  /** start angle (degrees) */
  angle?: number;
  /** Multiple Start: the lead is starts x pitch */
  starts?: number;
  /** Mirror Profile: the flank offsets reversed */
  mirror?: boolean;
}

/**
 * Thread tool, as the intended Thread feature: an ISO 60° V profile (depth 0.6134·P outside, 0.5413·P inside) swept
 * along a helix with the pitch, from the start edge over the length. Cut thread removes it, Extrude thread adds a ridge.
 */
/** the profile swept along the helix: ring(k) gives the profile corners at step k of steps */
function helixRings(t: ThreadSpec, prof: [number, number][], C: THREE.Vector3, ax: THREE.Vector3, e1: THREE.Vector3, e2: THREE.Vector3) {
  const s = t.rightHand ? 1 : -1;
  const lead = (t as ThreadSpec & { leadOverride?: number }).leadOverride ?? t.pitch * Math.max(1, t.starts ?? 1);
  const turns = t.length / lead;
  const steps = Math.max(8, Math.ceil(turns * 24));
  const th0 = ((t.angle ?? 0) * Math.PI) / 180;
  const ring = (k: number) => {
    const u = k / steps;
    const th = turns * 2 * Math.PI * u;
    const a = lead * (th / (2 * Math.PI));
    const ang = s * th + th0;
    const radial = e1.clone().multiplyScalar(Math.cos(ang)).addScaledVector(e2, Math.sin(ang));
    return prof.map(([rho, off]) => C.clone().addScaledVector(ax, a + off).addScaledVector(radial, rho));
  };
  return { ring, steps };
}

/**
 * The preview of the intended Thread PropertyManager: the paths of the profile's corners along the
 * helix and the profile at both ends, as cyan lines; no shaded result until OK.
 */
export function threadPreviewCurves(t: ThreadSpec): THREE.Vector3[][] {
  const out: THREE.Vector3[][] = [];
  const n = Math.max(1, Math.round(t.starts ?? 1));
  for (let st = 0; st < n; st++) {
    const spec = n > 1 ? ({ ...t, starts: 1, angle: (t.angle ?? 0) + (360 * st) / n, leadOverride: t.pitch * n } as ThreadSpec) : t;
    const C = new THREE.Vector3(...spec.center), ax = new THREE.Vector3(...spec.axis).normalize();
    const e1 = (Math.abs(ax.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).cross(ax).normalize();
    const e2 = ax.clone().cross(e1).normalize();
    const { ring, steps } = helixRings(spec, threadProfile(spec), C, ax, e1, e2);
    const rings = Array.from({ length: steps + 1 }, (_, k) => ring(k));
    for (let i = 0; i < 3; i++) out.push(rings.map((r) => r[i]));
    out.push([...rings[0], rings[0][0]], [...rings[steps], rings[steps][0]]);
  }
  return out;
}

/** the V profile (radial, axial) of a groove (cut) or ridge (extrude) */
function threadProfile(t: ThreadSpec): [number, number][] {
  const P = t.pitch, R = t.radius;
  const h = (t.internal ? 0.5413 : 0.6134) * P;
  const over = Math.min(0.3, P * 0.25);
  const tan30 = Math.tan(Math.PI / 6);
  let prof: [number, number][];
  if (t.method === 'cut') {
    prof = t.internal
      ? [[R - over, -(h + over) * tan30], [R + h, 0], [R - over, (h + over) * tan30]]
      : [[R + over, -(h + over) * tan30], [R - h, 0], [R + over, (h + over) * tan30]];
  } else {
    prof = t.internal
      ? [[R + 0.05, -h * tan30], [R - h, 0], [R + 0.05, h * tan30]]
      : [[R - 0.05, -h * tan30], [R + h, 0], [R - 0.05, h * tan30]];
  }
  return t.mirror ? prof.map(([rho, off]) => [rho, -off] as [number, number]) : prof;
}

export function threadTool(t: ThreadSpec): THREE.BufferGeometry {
  // Multiple Start: the same thread turned by 360°/n for every start
  if ((t.starts ?? 1) > 1) {
    const parts: THREE.BufferGeometry[] = [];
    const n = Math.round(t.starts!);
    for (let i = 0; i < n; i++) parts.push(threadTool({ ...t, starts: 1, angle: (t.angle ?? 0) + (360 * i) / n, pitch: t.pitch, length: t.length, leadOverride: t.pitch * n } as ThreadSpec & { leadOverride: number }));
    const out = new THREE.BufferGeometry();
    const pos: number[] = [];
    for (const p of parts) pos.push(...(p.getAttribute('position').array as Float32Array));
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.computeVertexNormals();
    return out;
  }
  const C = new THREE.Vector3(...t.center), ax = new THREE.Vector3(...t.axis).normalize();
  const e1 = (Math.abs(ax.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).cross(ax).normalize();
  const e2 = ax.clone().cross(e1).normalize();
  const prof = threadProfile(t);
  const { ring, steps } = helixRings(t, prof, C, ax, e1, e2);
  const pos: number[] = [];
  const push = (...v: THREE.Vector3[]) => { for (const p of v) pos.push(p.x, p.y, p.z); };
  let prev = ring(0);
  push(prev[0], prev[2], prev[1]);
  for (let k = 1; k <= steps; k++) {
    const cur = ring(k);
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      push(prev[i], prev[j], cur[j]);
      push(prev[i], cur[j], cur[i]);
    }
    prev = cur;
  }
  push(prev[0], prev[1], prev[2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (meshVolume(g) < 0) flipWinding(g);
  g.computeVertexNormals();
  return g;
}
