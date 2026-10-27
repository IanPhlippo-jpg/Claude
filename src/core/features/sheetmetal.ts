import * as THREE from 'three';
import type { PlaneDef } from '../document/types';
import type { SketchPoint } from '../sketch/types';
import { offsetPolyline } from './thin';
import { polyArea, type Region } from './regions';
import { csg, mergeGeometries, extrudeGeometry, THROUGH_ALL } from './solid';

/**
 * Sheet metal, as the intended Sheet Metal tab (basic set): Base Flange/Tab, Edge Flange and the
 * Flat Pattern. The sheet has one thickness and a default inner bend radius; the bend allowance
 * follows the K-factor (neutral axis at K * thickness from the inside of the bend).
 */
export interface SheetMetalParams {
  thickness: number;
  bendRadius: number;
  kFactor: number;
  /** Bend Allowance type: K-Factor (default), Bend Allowance (BA per 90 degrees), Bend Deduction (BD per 90 degrees), Bend Table */
  allowanceType?: 'kFactor' | 'bendAllowance' | 'bendDeduction' | 'bendTable';
  allowanceValue?: number;
  /** Sheet Metal Gauges: the table and gauge that set thickness and radius */
  gauge?: { table: string; gauge: string };
  /** Auto Relief: rectangle / tear / obround, its size as a ratio of the thickness */
  reliefType?: 'rectangle' | 'tear' | 'obround';
  reliefRatio?: number;
  useReliefRatio?: boolean;
  reliefWidth?: number;
  /** Use material sheet metal parameters (the K-factor of the material) */
  useMaterial?: boolean;
}

export const DEFAULT_SHEET_METAL: SheetMetalParams = { thickness: 3, bendRadius: 3, kFactor: 0.5 };

/** Sheet Metal Gauges: sample gauge tables (thickness and the default bend radius per gauge) */
export const GAUGE_TABLES: Record<string, { gauge: string; thickness: number; radius: number }[]> = {
  'Sample Table - Steel': [
    { gauge: 'Gauge 10', thickness: 3.416, radius: 3.4 }, { gauge: 'Gauge 12', thickness: 2.657, radius: 2.7 }, { gauge: 'Gauge 14', thickness: 1.897, radius: 1.9 },
    { gauge: 'Gauge 16', thickness: 1.519, radius: 1.5 }, { gauge: 'Gauge 18', thickness: 1.214, radius: 1.2 }, { gauge: 'Gauge 20', thickness: 0.912, radius: 0.9 },
    { gauge: 'Gauge 22', thickness: 0.759, radius: 0.8 }, { gauge: 'Gauge 24', thickness: 0.607, radius: 0.6 },
  ],
  'Sample Table - Aluminum': [
    { gauge: 'Gauge 10', thickness: 2.588, radius: 2.6 }, { gauge: 'Gauge 12', thickness: 2.052, radius: 2.1 }, { gauge: 'Gauge 14', thickness: 1.628, radius: 1.6 },
    { gauge: 'Gauge 16', thickness: 1.291, radius: 1.3 }, { gauge: 'Gauge 18', thickness: 1.024, radius: 1 }, { gauge: 'Gauge 20', thickness: 0.812, radius: 0.8 },
  ],
};

/** the K-factor of a bend table: a smaller K for tight bends (radius against thickness), as the sample bend tables */
export function bendTableK(r: number, t: number): number {
  const q = r / Math.max(1e-9, t);
  return q < 1 ? 0.33 : q < 3 ? 0.4 : 0.5;
}

/** the material's K-factor (Use material sheet metal parameters) */
export function materialKFactor(name: string | undefined): number | null {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes('alumin')) return 0.43;
  if (n.includes('copper') || n.includes('brass')) return 0.45;
  if (n.includes('stainless')) return 0.45;
  if (n.includes('steel') || n.includes('iron')) return 0.44;
  return null;
}

const ARC_STEPS = 12;

/** Bend allowance of one bend (neutral-axis arc length): angle in degrees, inner radius r. */
export function bendAllowance(angleDeg: number, r: number, p: SheetMetalParams): number {
  const type = p.allowanceType ?? 'kFactor';
  // Bend Allowance: the given length for a 90 degree bend, in proportion to the angle
  if (type === 'bendAllowance') return (p.allowanceValue ?? 0) * (angleDeg / 90);
  // Bend Deduction: the flat length is the two outer legs minus the deduction
  if (type === 'bendDeduction') return 2 * outerSetback(angleDeg, r, p) - (p.allowanceValue ?? 0) * (angleDeg / 90);
  const k = type === 'bendTable' ? bendTableK(r, p.thickness) : p.kFactor;
  return (angleDeg * Math.PI / 180) * (r + k * p.thickness);
}

/** Outer setback of one bend (distance from the outer virtual sharp to the bend tangent line). */
export function outerSetback(angleDeg: number, r: number, p: SheetMetalParams): number {
  return (r + p.thickness) * Math.tan((angleDeg * Math.PI / 180) / 2);
}

const sub = (a: SketchPoint, b: SketchPoint) => ({ x: a.x - b.x, y: a.y - b.y });
const len = (v: SketchPoint) => Math.hypot(v.x, v.y);
const unit = (v: SketchPoint) => { const l = len(v) || 1; return { x: v.x / l, y: v.y / l }; };
const cross = (a: SketchPoint, b: SketchPoint) => a.x * b.y - a.y * b.x;

/**
 * Replace every interior corner of an (offset) polyline by a tangent arc with the given radius.
 * The radius per corner comes from radiusAt(i) (i = index of the interior vertex).
 */
export function roundCorners(pts: SketchPoint[], radiusAt: (i: number) => number): SketchPoint[] {
  if (pts.length < 3) return pts.slice();
  const out: SketchPoint[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const d1 = unit(sub(p, pts[i - 1]));
    const d2 = unit(sub(pts[i + 1], p));
    const turn = cross(d1, d2);
    const dot = Math.max(-1, Math.min(1, d1.x * d2.x + d1.y * d2.y));
    const theta = Math.acos(dot); // deflection angle
    const r = radiusAt(i);
    if (Math.abs(turn) < 1e-9 || theta < 1e-6 || r <= 1e-9) {
      out.push(p);
      continue;
    }
    // tangent points at distance r * tan(theta / 2) from the corner along both segments
    const tdist = r * Math.tan(theta / 2);
    const maxA = len(sub(p, pts[i - 1])) * 0.999, maxB = len(sub(pts[i + 1], p)) * 0.999;
    const td = Math.min(tdist, maxA, maxB);
    const rr = td / Math.tan(theta / 2);
    const t1 = { x: p.x - d1.x * td, y: p.y - d1.y * td };
    const t2 = { x: p.x + d2.x * td, y: p.y + d2.y * td };
    // centre: from t1 along the inward normal of segment 1 (towards the turn side)
    const s = turn > 0 ? 1 : -1;
    const n1 = { x: -d1.y * s, y: d1.x * s };
    const c = { x: t1.x + n1.x * rr, y: t1.y + n1.y * rr };
    const a0 = Math.atan2(t1.y - c.y, t1.x - c.x);
    const a1 = Math.atan2(t2.y - c.y, t2.x - c.x);
    let sweep = a1 - a0;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
    for (let k = 0; k <= ARC_STEPS; k++) {
      const a = a0 + (sweep * k) / ARC_STEPS;
      out.push({ x: c.x + rr * Math.cos(a), y: c.y + rr * Math.sin(a) });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/**
 * Base Flange/Tab from an open chain: a wall of the sheet thickness on one side of the sketch,
 * every corner bent with the inner bend radius (outer radius = inner + thickness).
 */
export function baseFlangeRegion(chain: SketchPoint[], p: SheetMetalParams, reverse = false): Region | null {
  if (chain.length < 2) return null;
  const t = p.thickness, r = p.bendRadius;
  // material on the left (+offset) unless reversed
  const dl = reverse ? 0 : t, dr = reverse ? -t : 0;
  const left = offsetPolyline(chain, dl, false);
  const right = offsetPolyline(chain, dr, false);
  // inside of a bend = the side the chain turns to: left turn -> left side gets the inner radius
  const turnAt = (i: number) => cross(unit(sub(chain[i], chain[i - 1])), unit(sub(chain[i + 1], chain[i])));
  const leftR = (i: number) => (turnAt(i) > 0 ? r : r + t);
  const rightR = (i: number) => (turnAt(i) > 0 ? r + t : r);
  const a = roundCorners(left, leftR);
  const b = roundCorners(right, rightR);
  const poly = [...a, ...b.slice().reverse()];
  const area = polyArea(poly);
  return { outer: area < 0 ? poly.slice().reverse() : poly, holes: [], area: Math.abs(area) };
}

/** a segment of an exact profile: a line, or a circular arc through `m` (B-rep kernel) */
export interface ProfileSegment {
  a: SketchPoint;
  b: SketchPoint;
  m?: SketchPoint;
}

/** roundCorners() as exact segments: lines between the bends, one true arc per bend (same tangent points and radii) */
export function roundCornerSegments(pts: SketchPoint[], radiusAt: (i: number) => number): ProfileSegment[] {
  const segs: ProfileSegment[] = [];
  let from = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const d1 = unit(sub(p, pts[i - 1]));
    const d2 = unit(sub(pts[i + 1], p));
    const turn = cross(d1, d2);
    const dot = Math.max(-1, Math.min(1, d1.x * d2.x + d1.y * d2.y));
    const theta = Math.acos(dot);
    const r = radiusAt(i);
    if (Math.abs(turn) < 1e-9 || theta < 1e-6 || r <= 1e-9) {
      segs.push({ a: from, b: p });
      from = p;
      continue;
    }
    const tdist = r * Math.tan(theta / 2);
    const maxA = len(sub(p, pts[i - 1])) * 0.999, maxB = len(sub(pts[i + 1], p)) * 0.999;
    const td = Math.min(tdist, maxA, maxB);
    const rr = td / Math.tan(theta / 2);
    const t1 = { x: p.x - d1.x * td, y: p.y - d1.y * td };
    const t2 = { x: p.x + d2.x * td, y: p.y + d2.y * td };
    const s = turn > 0 ? 1 : -1;
    const n1 = { x: -d1.y * s, y: d1.x * s };
    const c = { x: t1.x + n1.x * rr, y: t1.y + n1.y * rr };
    const a0 = Math.atan2(t1.y - c.y, t1.x - c.x);
    const a1 = Math.atan2(t2.y - c.y, t2.x - c.x);
    let sweep = a1 - a0;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
    const am = a0 + sweep / 2;
    segs.push({ a: from, b: t1 });
    segs.push({ a: t1, b: t2, m: { x: c.x + rr * Math.cos(am), y: c.y + rr * Math.sin(am) } });
    from = t2;
  }
  segs.push({ a: from, b: pts[pts.length - 1] });
  return segs.filter((g) => Math.hypot(g.b.x - g.a.x, g.b.y - g.a.y) > 1e-9);
}

/** the closed exact profile of a base flange (baseFlangeRegion with true bend arcs) */
export function baseFlangeLoop(chain: SketchPoint[], p: SheetMetalParams, reverse = false): ProfileSegment[] | null {
  if (chain.length < 2) return null;
  const t = p.thickness, r = p.bendRadius;
  const dl = reverse ? 0 : t, dr = reverse ? -t : 0;
  const left = offsetPolyline(chain, dl, false);
  const right = offsetPolyline(chain, dr, false);
  const turnAt = (i: number) => cross(unit(sub(chain[i], chain[i - 1])), unit(sub(chain[i + 1], chain[i])));
  const a = roundCornerSegments(left, (i) => (turnAt(i) > 0 ? r : r + t));
  const b = roundCornerSegments(right, (i) => (turnAt(i) > 0 ? r + t : r));
  const back = b.slice().reverse().map((g) => ({ a: g.b, b: g.a, m: g.m }));
  return [...a, { a: left[left.length - 1], b: right[right.length - 1] }, ...back, { a: right[0], b: left[0] }];
}

/** Base flange solid: the bent wall extruded along the sketch normal (Blind or Mid Plane). */
export function baseFlangeGeometry(chain: SketchPoint[], plane: PlaneDef, p: SheetMetalParams, depth: number, midPlane: boolean, reverse = false, flipDir = false): THREE.BufferGeometry | null {
  const region = baseFlangeRegion(chain, p, reverse);
  if (!region) return null;
  return extrudeGeometry([region], plane, { end: midPlane ? 'midPlane' : 'blind', depth, reverse: flipDir }, THROUGH_ALL, 0);
}

/** Tab: a closed sketch becomes a flat plate of the sheet thickness. */
export function tabGeometry(regions: Region[], plane: PlaneDef, p: SheetMetalParams, reverse = false): THREE.BufferGeometry | null {
  return extrudeGeometry(regions, plane, { end: 'blind', depth: p.thickness, reverse }, THROUGH_ALL, 0);
}

export type FlangeLengthMode = 'outerSharp' | 'innerSharp' | 'tangentBend';
export type FlangePosition = 'materialInside' | 'materialOutside' | 'bendOutside';

export interface EdgeFlangeInput {
  /** the straight edge of the sheet (world) */
  a: [number, number, number];
  b: [number, number, number];
  /** normal of the sheet face the flange bends away from (world, pointing out of the material) */
  faceNormal: [number, number, number];
  /** a point inside the sheet face, to find the outward direction */
  faceCentroid: [number, number, number];
  angle: number;
  length: number;
  lengthMode: FlangeLengthMode;
  position: FlangePosition;
  /** bend radius override (absent = default) */
  radius?: number;
  flip: boolean;
  /** Edit Flange Profile: the flange starts / ends this far from the edge ends (relief cuts at the inner ends) */
  startOffset?: number;
  endOffset?: number;
  /** Gap distance (half at each end), Trim side bends (room for the bends of neighbouring flanges) */
  gap?: number;
  trimSideBends?: boolean;
  /** Flange Position > Offset: the flange moves this far in from the edge */
  offset?: number;
  /** Angle against a face: the flange perpendicular or parallel to it */
  angleFace?: { normal: [number, number, number]; mode: 'perpendicular' | 'parallel' };
  /** Flange Length > Up To Vertex: the leg runs up to this point */
  upToVertex?: [number, number, number];
  /**
   * Edit Flange Profile: the flange's outline drawn on the plane of its outer face (x along the edge from its start,
   * y up the leg from the end of the bend). Its bottom line sets the width, its top the length; holes cut through.
   */
  profile?: Region[];
}

/** The straight leg length that corresponds to the dimensioned flange length. */
export function flangeLeg(input: Pick<EdgeFlangeInput, 'angle' | 'length' | 'lengthMode'>, r: number, p: SheetMetalParams): number {
  const half = (input.angle * Math.PI / 180) / 2;
  if (input.lengthMode === 'outerSharp') return Math.max(0, input.length - (r + p.thickness) * Math.tan(half));
  if (input.lengthMode === 'innerSharp') return Math.max(0, input.length - r * Math.tan(half));
  return Math.max(0, input.length);
}

/**
 * Edge Flange: a bend (inner radius r) plus a straight leg, swept along the selected edge. Built
 * as a 2D profile in the (outward, normal) plane of the edge and extruded along the edge.
 */
/** an exact prism for the B-rep kernel: a closed loop of lines and arcs on a plane, extruded `depth` (reverse: the other way) */
export interface ExactPrism {
  plane: PlaneDef;
  loop: ProfileSegment[];
  depth: number;
  reverse: boolean;
}

export function edgeFlangeGeometry(input0: EdgeFlangeInput, p: SheetMetalParams): { geometry: THREE.BufferGeometry | null; error?: string; trim?: THREE.BufferGeometry | null; exact?: { flange: ExactPrism; trim?: ExactPrism } } {
  let input = input0;
  const A = new THREE.Vector3(...input.a), B = new THREE.Vector3(...input.b);
  const u = B.clone().sub(A);
  const L = u.length();
  if (L < 1e-6) return { geometry: null, error: 'The edge has no length.' };
  u.normalize();
  const n = new THREE.Vector3(...input.faceNormal).normalize();
  if (input.flip) n.negate();
  // outward: perpendicular to the edge in the sheet plane, away from the face
  let v = new THREE.Vector3().crossVectors(n, u).normalize();
  const mid = A.clone().add(B).multiplyScalar(0.5);
  const toCentroid = new THREE.Vector3(...input.faceCentroid).sub(mid);
  if (toCentroid.dot(v) > 0) {
    v.negate();
    u.negate();
  }
  const t = p.thickness;
  const r = input.radius ?? p.bendRadius;
  // Angle against a face: the leg direction (cos θ · outward + sin θ · normal) perpendicular / parallel to the face
  if (input.angleFace) {
    const f = new THREE.Vector3(...input.angleFace.normal).normalize();
    const fv = f.dot(v), fn = f.dot(n);
    let th = input.angleFace.mode === 'parallel' ? Math.atan2(-fv, fn) : Math.atan2(fn, fv);
    while (th <= 1e-3) th += Math.PI;
    while (th > Math.PI) th -= Math.PI;
    input = { ...input, angle: (th * 180) / Math.PI };
  }
  const theta = Math.max(1, Math.min(180, input.angle)) * Math.PI / 180;
  let leg = flangeLeg(input, r, p);
  // Edit Flange Profile: the width comes from the profile's bottom line, the leg from its top
  const prof = input.profile?.length ? input.profile : null;
  if (prof) {
    const pts = prof.flatMap((g) => g.outer);
    const y0 = Math.min(...pts.map((q) => q.y));
    const bottom = pts.filter((q) => Math.abs(q.y - y0) < 1e-6);
    input = { ...input, startOffset: Math.max(0, Math.min(...bottom.map((q) => q.x))), endOffset: Math.max(0, L - Math.max(...bottom.map((q) => q.x))) };
    leg = Math.max(0, Math.max(...pts.map((q) => q.y)));
  }
  // the flange starts at the edge (Material Outside) or the bend eats into the sheet (Material Inside); Offset moves it in
  const shift = -flangeSetback(input.angle, r, p, input.position) - Math.max(0, input.offset ?? 0);
  // Up To Vertex: the leg runs to the point (measured along the leg from the end of the bend)
  if (input.upToVertex) {
    const phiE = -Math.PI / 2 + theta;
    const endIn = { x: shift + r * Math.cos(phiE), y: r + r * Math.sin(phiE) };
    const legDir = v.clone().multiplyScalar(Math.cos(theta)).addScaledVector(n, Math.sin(theta));
    const start = A.clone().addScaledVector(v, endIn.x).addScaledVector(n, endIn.y);
    leg = Math.max(0, new THREE.Vector3(...input.upToVertex).sub(start).dot(legDir));
  }
  // 2D profile, x = outward (v), y = normal (n); the sheet's outer surface is y = 0 (face), inner y = -t
  const C = { x: shift, y: r };
  const inner: SketchPoint[] = [], outer: SketchPoint[] = [];
  for (let k = 0; k <= ARC_STEPS; k++) {
    const phi = -Math.PI / 2 + (theta * k) / ARC_STEPS;
    inner.push({ x: C.x + r * Math.cos(phi), y: C.y + r * Math.sin(phi) });
    outer.push({ x: C.x + (r + t) * Math.cos(phi), y: C.y + (r + t) * Math.sin(phi) });
  }
  const phiEnd = -Math.PI / 2 + theta;
  const tangent = { x: -Math.sin(phiEnd), y: Math.cos(phiEnd) };
  const Ei = inner[inner.length - 1], Eo = outer[outer.length - 1];
  const poly: SketchPoint[] = [
    ...inner,
    { x: Ei.x + tangent.x * leg, y: Ei.y + tangent.y * leg },
    { x: Eo.x + tangent.x * leg, y: Eo.y + tangent.y * leg },
    ...outer.slice().reverse(),
  ];
  const area = polyArea(poly);
  const region: Region = { outer: area < 0 ? poly.slice().reverse() : poly, holes: [], area: Math.abs(area) };
  const plane: PlaneDef = { id: 'flange', name: 'flange', origin: [A.x, A.y, A.z], u: [v.x, v.y, v.z], v: [n.x, n.y, n.z], n: [u.x, u.y, u.z] };
  // extrude along the edge (u may have been flipped: then extrude the other way from A)
  const along = B.clone().sub(A).dot(u) >= 0 ? false : true;
  // the flange's width: the profile offsets, the gap and the room for side bends come off the ends
  const eAB0 = B.clone().sub(A).normalize();
  const side = (input.gap ?? 0) / 2 + (input.trimSideBends ? r + t : 0);
  const s0 = Math.max(0, input.startOffset ?? 0) + side, s1 = Math.max(0, input.endOffset ?? 0) + side;
  if (s0 + s1 >= L - 1e-6) return { geometry: null, error: 'The flange offsets are longer than the edge.' };
  const A1 = A.clone().addScaledVector(eAB0, s0);
  const flangePlane: PlaneDef = { ...plane, origin: [A1.x, A1.y, A1.z] };
  const g = extrudeGeometry([region], flangePlane, { end: 'blind', depth: L - s0 - s1, reverse: along }, THROUGH_ALL, 0);
  if (!g) return { geometry: null, error: 'The flange has no volume.' };
  let flange = g;
  if (prof) {
    // the leg outside the profile goes: (a box over the leg) minus (the profile), both through the thickness
    const legDir = v.clone().multiplyScalar(tangent.x).addScaledVector(n, tangent.y);
    const o = A.clone().addScaledVector(v, Eo.x).addScaledVector(n, Eo.y);
    const ex = eAB0, pn = ex.clone().cross(legDir).normalize();
    const pp: PlaneDef = { id: 'flange-profile', name: 'Profile', origin: [o.x, o.y, o.z], u: [ex.x, ex.y, ex.z], v: [legDir.x, legDir.y, legDir.z], n: [pn.x, pn.y, pn.z] };
    const box: Region = { outer: [{ x: -1, y: 1e-3 }, { x: L + 1, y: 1e-3 }, { x: L + 1, y: leg + 1 }, { x: -1, y: leg + 1 }], holes: [], area: 0 };
    const deep = { end: 'midPlane' as const, depth: 2 * (t + 1), reverse: false };
    const keep = extrudeGeometry(prof, pp, deep, THROUGH_ALL, 0), all = extrudeGeometry([box], pp, deep, THROUGH_ALL, 0);
    if (keep && all) flange = csg(flange, csg(all, keep, 'subtract'), 'subtract');
  }
  // Auto Relief where the flange ends inside the edge: a notch behind each inner end of the bend
  const reliefs: THREE.BufferGeometry[] = [];
  const rw = p.reliefType === 'tear' ? 0.2 : p.useReliefRatio === false ? Math.max(0.1, p.reliefWidth ?? t) : Math.max(0.1, (p.reliefRatio ?? 0.5) * t);
  const rd = r + t + (p.reliefType === 'tear' ? 0 : rw / 2) - shift;
  for (const [at, dir, on] of [[A1, -1, (input.startOffset ?? 0) > 0], [B.clone().addScaledVector(eAB0, -s1), 1, (input.endOffset ?? 0) > 0]] as const) {
    if (!on) continue;
    const e = 0.05;
    const c0 = at.clone().addScaledVector(eAB0, (dir * rw) / 2);
    const box = new THREE.BoxGeometry(rw, rd + e, t + 2 * e).toNonIndexed();
    box.translate(0, -(rd + e) / 2 + e, -t / 2);
    const m = new THREE.Matrix4().makeBasis(eAB0, v, n).setPosition(c0);
    box.applyMatrix4(m);
    reliefs.push(box);
    if (p.reliefType === 'obround') {
      const cyl = new THREE.CylinderGeometry(rw / 2, rw / 2, t + 2 * e, 24).toNonIndexed();
      cyl.rotateX(Math.PI / 2);
      cyl.translate(0, -rd + e, -t / 2);
      cyl.applyMatrix4(m);
      reliefs.push(cyl);
    }
  }
  // Material Inside: the sheet is cut back by the setback so the bend fits inside the original length
  let trim: THREE.BufferGeometry | null = null;
  if (shift < -1e-9) {
    const e = 0.05;
    const tp: SketchPoint[] = [{ x: shift, y: -t - e }, { x: e, y: -t - e }, { x: e, y: e }, { x: shift, y: e }];
    const eAB = B.clone().sub(A).normalize();
    // only over the flange's width (the whole edge when there are no offsets)
    const full = s0 < 1e-9 && s1 < 1e-9;
    const o = A1.clone().addScaledVector(eAB, full ? -e : 0);
    const tplane: PlaneDef = { ...plane, origin: [o.x, o.y, o.z] };
    trim = extrudeGeometry([{ outer: tp, holes: [], area: 0 }], tplane, { end: 'blind', depth: L - s0 - s1 + (full ? 2 * e : 0), reverse: along }, THROUGH_ALL, 0);
  }
  if (reliefs.length) trim = mergeGeometries(trim ? [trim, ...reliefs] : reliefs);
  // the same flange as exact segments (true bend arcs) for the B-rep kernel; flanges with relief notches: mesh kernel
  let exact: { flange: ExactPrism; trim?: ExactPrism } | undefined;
  if (!reliefs.length && !prof) {
    const phiMid = -Math.PI / 2 + theta / 2;
    const mi = { x: C.x + r * Math.cos(phiMid), y: C.y + r * Math.sin(phiMid) };
    const mo = { x: C.x + (r + t) * Math.cos(phiMid), y: C.y + (r + t) * Math.sin(phiMid) };
    const Li = { x: Ei.x + tangent.x * leg, y: Ei.y + tangent.y * leg }, Lo = { x: Eo.x + tangent.x * leg, y: Eo.y + tangent.y * leg };
    const loop: ProfileSegment[] = [{ a: inner[0], b: Ei, m: mi }];
    if (leg > 1e-9) loop.push({ a: Ei, b: Li }, { a: Li, b: Lo }, { a: Lo, b: Eo });
    else loop.push({ a: Ei, b: Eo });
    loop.push({ a: Eo, b: outer[0], m: mo }, { a: outer[0], b: inner[0] });
    exact = { flange: { plane: flangePlane, loop, depth: L - s0 - s1, reverse: along } };
    if (shift < -1e-9) {
      const e = 0.05;
      const tp = [{ x: shift, y: -t - e }, { x: e, y: -t - e }, { x: e, y: e }, { x: shift, y: e }];
      const eAB = B.clone().sub(A).normalize();
      const full = s0 < 1e-9 && s1 < 1e-9;
      const o = A1.clone().addScaledVector(eAB, full ? -e : 0);
      exact.trim = { plane: { ...plane, origin: [o.x, o.y, o.z] }, loop: tp.map((q, i) => ({ a: q, b: tp[(i + 1) % 4] })), depth: L - s0 - s1 + (full ? 2 * e : 0), reverse: along };
    }
  }
  return { geometry: flange, trim, exact };
}

/**
 * The plane of an edge flange's outer face, where its profile is drawn (Edit Flange Profile): origin at the edge start
 * where the bend ends, x along the edge, y up the leg; with the edge length and the leg of the flange as it is now.
 */
export function flangeProfilePlane(input: EdgeFlangeInput, p: SheetMetalParams): { plane: PlaneDef; length: number; leg: number } | null {
  const A = new THREE.Vector3(...input.a), B = new THREE.Vector3(...input.b);
  const L = A.distanceTo(B);
  if (L < 1e-6) return null;
  const eAB = B.clone().sub(A).normalize();
  let u = eAB.clone();
  const n = new THREE.Vector3(...input.faceNormal).normalize();
  if (input.flip) n.negate();
  let v = new THREE.Vector3().crossVectors(n, u).normalize();
  if (new THREE.Vector3(...input.faceCentroid).sub(A.clone().add(B).multiplyScalar(0.5)).dot(v) > 0) { v.negate(); u = u.negate(); }
  void u;
  const r = input.radius ?? p.bendRadius, t = p.thickness;
  const theta = Math.max(1, Math.min(180, input.angle)) * Math.PI / 180, phi = -Math.PI / 2 + theta;
  const shift = -flangeSetback(input.angle, r, p, input.position) - Math.max(0, input.offset ?? 0);
  const Eo = { x: shift + (r + t) * Math.cos(phi), y: r + (r + t) * Math.sin(phi) };
  const legDir = v.clone().multiplyScalar(-Math.sin(phi)).addScaledVector(n, Math.cos(phi));
  const o = A.clone().addScaledVector(v, Eo.x).addScaledVector(n, Eo.y);
  const pn = eAB.clone().cross(legDir).normalize();
  return { plane: { id: 'flange-profile', name: 'Profile', origin: [o.x, o.y, o.z], u: [eAB.x, eAB.y, eAB.z], v: [legDir.x, legDir.y, legDir.z], n: [pn.x, pn.y, pn.z] }, length: L, leg: flangeLeg(input, r, p) };
}

/** How far a flange cuts the sheet back (Material Inside); 0 for Material Outside / Bend Outside. */
export function flangeSetback(angleDeg: number, r: number, p: SheetMetalParams, position: FlangePosition): number {
  if (position !== 'materialInside') return 0;
  const theta = (Math.max(1, Math.min(180, angleDeg)) * Math.PI) / 180;
  return (r + p.thickness) * (theta > Math.PI - 1e-3 ? 1 : Math.tan(theta / 2));
}

export type HemType = 'closed' | 'open' | 'tearDrop' | 'rolled';

/** A hem as an edge flange of 180 degrees: closed = (almost) no gap, open = gap between the sheet and the hem. */
export function hemFlangeParams(h: { hemType: HemType; length: number; gap: number; position: FlangePosition; flip: boolean }): { angle: number; length: number; lengthMode: FlangeLengthMode; position: FlangePosition; flip: boolean; radius: number } {
  const radius = h.hemType === 'open' ? Math.max(0.01, h.gap / 2) : 0.01;
  return { angle: 180, length: h.length, lengthMode: 'tangentBend', position: h.position, flip: h.flip, radius };
}

/**
 * Flat pattern of a base flange made from an open chain: the developed length of the outer face
 * (segments between the bend tangent lines plus the bend allowances), as a flat plate.
 */
export function flatLength(chain: SketchPoint[], p: SheetMetalParams): number {
  let total = 0;
  for (let i = 1; i < chain.length; i++) total += len(sub(chain[i], chain[i - 1]));
  for (let i = 1; i < chain.length - 1; i++) {
    const d1 = unit(sub(chain[i], chain[i - 1])), d2 = unit(sub(chain[i + 1], chain[i]));
    const dot = Math.max(-1, Math.min(1, d1.x * d2.x + d1.y * d2.y));
    const deg = (Math.acos(dot) * 180) / Math.PI;
    if (deg < 1e-6) continue;
    total += bendAllowance(deg, p.bendRadius, p) - 2 * outerSetback(deg, p.bendRadius, p);
  }
  return total;
}

/** Flat plate of the developed length x width x thickness on the sketch plane, starting at the chain's first point. */
export function flatPatternGeometry(chain: SketchPoint[], plane: PlaneDef, p: SheetMetalParams, width: number, midPlane: boolean, flangeExtensions: number[] = []): THREE.BufferGeometry | null {
  if (chain.length < 2) return null;
  const Lflat = flatLength(chain, p) + flangeExtensions.reduce((a, b) => a + b, 0);
  const d = unit(sub(chain[1], chain[0]));
  const nrm = { x: -d.y, y: d.x };
  const a = chain[0];
  const poly: SketchPoint[] = [a, { x: a.x + d.x * Lflat, y: a.y + d.y * Lflat }, { x: a.x + d.x * Lflat + nrm.x * p.thickness, y: a.y + d.y * Lflat + nrm.y * p.thickness }, { x: a.x + nrm.x * p.thickness, y: a.y + nrm.y * p.thickness }];
  const area = polyArea(poly);
  const region: Region = { outer: area < 0 ? poly.slice().reverse() : poly, holes: [], area: Math.abs(area) };
  return extrudeGeometry([region], plane, { end: midPlane ? 'midPlane' : 'blind', depth: width, reverse: false }, THROUGH_ALL, 0);
}
