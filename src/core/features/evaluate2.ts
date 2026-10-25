import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { Body } from './rebuild';
import type { Document, Feature } from '../document/types';
import { csg, meshVolume } from './solid';
import { DRAFT_COLORS } from './analysis';

/**
 * Evaluate, the remaining tools of the original's Evaluate tab: Symmetry Check, Deviation Analysis, Parting Line
 * Analysis, Compare (Body Compare, Compare Documents), Performance Evaluation statistics and the SimulationXpress
 * estimate. Everything works on the rebuilt mesh bodies.
 */

type V3 = [number, number, number];
const vol = (g: THREE.BufferGeometry) => Math.abs(meshVolume(g));

// ---------------------------------------------------------------------------------------------
// Symmetry Check
// ---------------------------------------------------------------------------------------------
export interface SymmetryResult {
  /** largest distance of a mirrored surface point to the surface (mm) */
  maxDeviation: number;
  meanDeviation: number;
  symmetric: boolean;
  /** faces whose mirror image is not on the body (per body id) */
  asymmetricFaces: Record<string, string[]>;
  samples: number;
}

/** Symmetry Check: the body mirrored across the plane must lie on itself; faces that do not are listed. */
export function symmetryCheck(bodies: Body[], plane: { origin: V3; n: V3 }, tolerance = 0.05): SymmetryResult {
  const o = new THREE.Vector3(...plane.origin), n = new THREE.Vector3(...plane.n).normalize();
  const mirror = (p: THREE.Vector3) => p.clone().addScaledVector(n, -2 * p.clone().sub(o).dot(n));
  let max = 0, sum = 0, count = 0;
  const asymmetricFaces: Record<string, string[]> = {};
  if (!bodies.length) return { maxDeviation: 0, meanDeviation: 0, symmetric: false, asymmetricFaces, samples: 0 };
  const all = bodies.map((b) => (b.geometry.index ? b.geometry.toNonIndexed() : b.geometry));
  const bvhs = all.map((g) => new MeshBVH(g));
  const distance = (p: THREE.Vector3) => {
    let best = Infinity;
    for (const bvh of bvhs) {
      const h = bvh.closestPointToPoint(p);
      if (h && h.distance < best) best = h.distance;
    }
    return best;
  };
  const v = new THREE.Vector3();
  bodies.forEach((b, bi) => {
    const pos = all[bi].getAttribute('position');
    for (const f of b.faces) {
      // the centroid and the triangle corners of each face (sub-sampled for big faces)
      const pts: THREE.Vector3[] = [new THREE.Vector3(...f.centroid)];
      const step = Math.max(1, Math.floor(f.triangles.length / 24));
      for (let k = 0; k < f.triangles.length; k += step) {
        const t = f.triangles[k];
        pts.push(v.fromBufferAttribute(pos, t * 3).clone(), v.fromBufferAttribute(pos, t * 3 + 1).clone(), v.fromBufferAttribute(pos, t * 3 + 2).clone());
      }
      let faceMax = 0;
      for (const p of pts) {
        const d = distance(mirror(p));
        faceMax = Math.max(faceMax, d);
        sum += d;
        count++;
      }
      max = Math.max(max, faceMax);
      if (faceMax > tolerance) (asymmetricFaces[b.id] ??= []).push(f.id);
    }
  });
  return { maxDeviation: max, meanDeviation: count ? sum / count : 0, symmetric: max <= tolerance, asymmetricFaces, samples: count };
}

// ---------------------------------------------------------------------------------------------
// Deviation Analysis
// ---------------------------------------------------------------------------------------------
export interface DeviationResult {
  edgeId: string;
  /** angle between the faces across the edge (degrees) at the sample points */
  min: number;
  max: number;
  avg: number;
  samples: number;
}

/** Deviation Analysis: the angle between the two faces along each selected edge (0 degrees = tangent). */
export function deviationAnalysis(bodies: Body[], edgeIds: string[], sampleCount = 10): DeviationResult[] {
  const out: DeviationResult[] = [];
  for (const id of edgeIds) {
    const e = bodies.flatMap((b) => b.edges).find((x) => x.id === id);
    if (!e || !e.segments.length) continue;
    const angles = e.segments.map((s) => (Math.acos(Math.max(-1, Math.min(1, s.n1.dot(s.n2)))) * 180) / Math.PI);
    // the sample points spread along the edge: the segments nearest to each sample position
    const picks: number[] = [];
    const n = Math.max(1, Math.min(sampleCount, angles.length));
    for (let k = 0; k < n; k++) picks.push(angles[Math.min(angles.length - 1, Math.round((k * (angles.length - 1)) / Math.max(1, n - 1)))]);
    const min = Math.min(...picks), max = Math.max(...picks), avg = picks.reduce((a, b) => a + b, 0) / picks.length;
    out.push({ edgeId: id, min, max, avg, samples: picks.length });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Parting Line Analysis
// ---------------------------------------------------------------------------------------------
export interface PartingLineResult {
  colors: Record<string, Record<string, string>>;
  /** the parting line: the crease segments between faces that face up and faces that face down the pull */
  lines: THREE.Vector3[][];
  length: number;
  positive: number;
  negative: number;
  straddle: number;
}

/** Parting Line Analysis: faces coloured by their side of the pull, the parting line where the sides meet. */
export function partingLineAnalysis(bodies: Body[], pull: V3, angleDeg = 1): PartingLineResult {
  const d = new THREE.Vector3(...pull).normalize();
  const limit = Math.sin((angleDeg * Math.PI) / 180);
  const colors: Record<string, Record<string, string>> = {};
  let positive = 0, negative = 0, straddle = 0;
  const lines: THREE.Vector3[][] = [];
  let length = 0;
  for (const b of bodies) {
    const c: Record<string, string> = {};
    for (const f of b.faces) {
      const k = new THREE.Vector3(...f.normal).dot(d);
      if (k > limit) { c[f.id] = DRAFT_COLORS.positive; positive++; }
      else if (k < -limit) { c[f.id] = DRAFT_COLORS.negative; negative++; }
      else { c[f.id] = DRAFT_COLORS.requires; straddle++; }
    }
    colors[b.id] = c;
    for (const e of b.edges) {
      const pts: THREE.Vector3[] = [];
      for (const s of e.segments) {
        const k1 = s.n1.dot(d), k2 = s.n2.dot(d);
        if ((k1 > 0 && k2 < 0) || (k1 < 0 && k2 > 0)) {
          if (!pts.length) pts.push(s.a.clone());
          pts.push(s.b.clone());
          length += s.a.distanceTo(s.b);
        }
      }
      if (pts.length >= 2) lines.push(pts);
    }
  }
  return { colors, lines, length, positive, negative, straddle };
}

// ---------------------------------------------------------------------------------------------
// Compare: Body Compare, Compare Documents
// ---------------------------------------------------------------------------------------------
export interface BodyCompareResult {
  volumeA: number;
  volumeB: number;
  common: number;
  onlyA: number;
  onlyB: number;
  /** largest difference of the bounding boxes (mm) */
  boxDeviation: number;
  identical: boolean;
}

/** Body Compare: the common volume and the material only in one of the two bodies. */
export function bodyCompare(a: THREE.BufferGeometry, b: THREE.BufferGeometry, tolerance = 0.01): BodyCompareResult {
  const volumeA = vol(a), volumeB = vol(b);
  let common = 0;
  try {
    common = vol(csg(a, b, 'intersect'));
  } catch {
    common = 0;
  }
  const onlyA = Math.max(0, volumeA - common), onlyB = Math.max(0, volumeB - common);
  a.computeBoundingBox();
  b.computeBoundingBox();
  const ba = a.boundingBox!, bb = b.boundingBox!;
  const boxDeviation = Math.max(ba.min.distanceTo(bb.min), ba.max.distanceTo(bb.max));
  const identical = onlyA <= tolerance * Math.max(1, volumeA) && onlyB <= tolerance * Math.max(1, volumeB) && boxDeviation < 0.05;
  return { volumeA, volumeB, common, onlyA, onlyB, boxDeviation, identical };
}

export interface DocCompareResult {
  added: string[];
  removed: string[];
  changed: string[];
  unchanged: number;
  properties: { name: string; a: string; b: string }[];
}

const featureKey = (f: Feature) => {
  const { id: _id, name: _name, ...rest } = f as Feature & { id: string; name: string };
  void _id;
  void _name;
  return JSON.stringify(rest, (_k, v) => (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v));
};

/** Compare Documents: features added, removed or changed (by name) and the document properties that differ. */
export function compareDocuments(a: Document, b: Document): DocCompareResult {
  const byName = (d: Document) => new Map(d.features.map((f) => [f.name, f] as const));
  const ma = byName(a), mb = byName(b);
  const added: string[] = [], removed: string[] = [], changed: string[] = [];
  let unchanged = 0;
  for (const [name, fb] of mb) {
    const fa = ma.get(name);
    if (!fa) added.push(name);
    else if (featureKey(fa) !== featureKey(fb) || JSON.stringify(sketchOf(a, fa)) !== JSON.stringify(sketchOf(b, fb))) changed.push(name);
    else unchanged++;
  }
  for (const name of ma.keys()) if (!mb.has(name)) removed.push(name);
  const properties: DocCompareResult['properties'] = [];
  const prop = (label: string, va: unknown, vb: unknown) => {
    const sa = va === undefined ? '—' : typeof va === 'object' ? JSON.stringify(va) : String(va);
    const sb = vb === undefined ? '—' : typeof vb === 'object' ? JSON.stringify(vb) : String(vb);
    if (sa !== sb) properties.push({ name: label, a: sa, b: sb });
  };
  prop('Name', a.name, b.name);
  prop('Kind', a.kind, b.kind);
  prop('Units', a.units, b.units);
  prop('Material', a.material?.name, b.material?.name);
  prop('Sheet metal', a.sheetMetal, b.sheetMetal);
  prop('Features', a.features.length, b.features.length);
  prop('Sketches', Object.keys(a.sketches).length, Object.keys(b.sketches).length);
  return { added, removed, changed, unchanged, properties };
}

function sketchOf(d: Document, f: Feature) {
  const id = (f as { sketchId?: string }).sketchId;
  if (!id) return null;
  const s = d.sketches[id];
  if (!s) return null;
  return { points: Object.values(s.points).map((p) => [Math.round(p.x * 1e3) / 1e3, Math.round(p.y * 1e3) / 1e3]), entities: Object.keys(s.entities).length, plane: s.plane };
}

// ---------------------------------------------------------------------------------------------
// Performance Evaluation
// ---------------------------------------------------------------------------------------------
export interface PerformanceRow {
  id: string;
  name: string;
  type: string;
  time: number;
  share: number;
  order: number;
}

/** Performance Evaluation: the rebuild time per feature, slowest first, with its share of the total. */
export function performanceRows(features: Feature[], times: Record<string, number>): { rows: PerformanceRow[]; total: number } {
  const total = features.reduce((a, f) => a + (times[f.id] ?? 0), 0);
  const rows = features
    .map((f, i) => ({ id: f.id, name: f.name, type: f.type, time: times[f.id] ?? 0, share: total > 0 ? ((times[f.id] ?? 0) / total) * 100 : 0, order: i + 1 }))
    .sort((a, b) => b.time - a.time);
  return { rows, total };
}

// ---------------------------------------------------------------------------------------------
// SimulationXpress estimate
// ---------------------------------------------------------------------------------------------
export interface SimXpressInput {
  body: THREE.BufferGeometry;
  fixture: { normal: V3; point: V3 };
  load: { normal: V3; point: V3; area: number };
  /** force in N along the load face normal (into the face) */
  force: number;
  /** material: Young's modulus (Pa) and yield strength (Pa) */
  elasticModulus: number;
  yieldStrength: number;
}

export interface SimXpressResult {
  /** beam model: span between the fixture and the load (mm), cross-section (mm) */
  span: number;
  width: number;
  height: number;
  /** von Mises stress estimate (Pa), max displacement (mm), factor of safety */
  stress: number;
  displacement: number;
  fos: number;
  bendingStress: number;
  shearStress: number;
}

/**
 * SimulationXpress estimate: the part as a cantilever between the fixed face and the loaded face (bending plus shear
 * from the beam formulas on the part's cross-section). It gives the order of magnitude of stress, displacement and
 * factor of safety, not a finite element solution.
 */
export function simXpressEstimate(i: SimXpressInput): SimXpressResult {
  const fp = new THREE.Vector3(...i.fixture.point), lp = new THREE.Vector3(...i.load.point);
  const axis = lp.clone().sub(fp);
  const span = Math.max(1e-3, axis.length());
  axis.normalize();
  const loadDir = new THREE.Vector3(...i.load.normal).normalize().negate();
  // the cross-section of the part perpendicular to the span: the bounding box extents across the axis
  i.body.computeBoundingBox();
  const size = i.body.boundingBox!.getSize(new THREE.Vector3());
  const along = (v: THREE.Vector3) => Math.abs(v.x * size.x) + Math.abs(v.y * size.y) + Math.abs(v.z * size.z);
  // height: the extent along the load direction (bending depth); width: the extent along the third axis
  const third = axis.clone().cross(loadDir);
  const height = Math.max(0.1, third.length() > 1e-6 ? along(loadDir) : Math.min(size.x, size.y, size.z));
  const width = Math.max(0.1, third.length() > 1e-6 ? along(third.normalize()) : Math.min(size.x, size.y, size.z));
  // a thin-walled / hollow part has less section than the box: scale the section by the solidity (volume / box volume)
  const solidity = Math.min(1, Math.max(0.05, vol(i.body) / Math.max(1e-6, size.x * size.y * size.z)));
  const A = width * height * solidity; // mm²
  const I = ((width * height ** 3) / 12) * solidity; // mm⁴
  const F = Math.abs(i.force);
  const M = F * span; // N·mm
  const bendingStress = (M * (height / 2)) / I * 1e6; // N/mm² -> Pa
  const shearStress = (1.5 * F) / A * 1e6; // Pa (parabolic shear, max)
  const stress = Math.sqrt(bendingStress ** 2 + 3 * shearStress ** 2);
  // E in Pa -> N/mm²: /1e6
  const E = i.elasticModulus / 1e6;
  const displacement = (F * span ** 3) / (3 * E * I); // mm
  const fos = stress > 0 ? i.yieldStrength / stress : Infinity;
  return { span, width, height, stress, displacement, fos, bendingStress, shearStress };
}
