import { sweepGeometry } from './sweep';
import * as THREE from 'three';
import type { PlaneDef } from '../document/types';
import type { SketchPoint } from '../sketch/types';
import type { Region } from './regions';
import { csg, extrudeGeometry, planarFaces, type PlanarFace } from './solid';
import { halfSpaceBox, boundaryLoops } from './surfaces2';
import { circleSegments } from '../sketch/geometry';
import { TOL } from './tolerance';

/**
 * Weldments, as the intended Weldments tab: the structural member profile library (ISO / ANSI inch), structural
 * members swept along the straight segments of a path with the corner treatments (end miter, end butt), Trim/Extend,
 * End Cap, the weldment Gusset, the Weld Bead and the cut list grouping of identical bodies.
 */

type V3 = [number, number, number];
const EPS = 0.02;

// ---------------------------------------------------------------------------------------------
// Profile library
// ---------------------------------------------------------------------------------------------
export type ProfileType = 'square tube' | 'rectangular tube' | 'pipe' | 'angle iron' | 'c channel' | 'sb beam';
export interface ProfileDef {
  standard: 'iso' | 'ansi inch';
  type: ProfileType;
  size: string;
  /** the dimensions in mm: outer sizes and the wall / leg thickness */
  a: number;
  b: number;
  t: number;
  /** flange thickness for channels and beams */
  tf?: number;
  /** hollow sections: the outer and inner corner radii (EN 10219-2: ro = 2t, ri = t up to t = 6 mm) */
  ro?: number;
  ri?: number;
  /** rolled sections: the root radius (web to flange, inside corner of an angle) and the toe radius of an angle */
  r1?: number;
  r2?: number;
}

/** an ISO cold formed hollow section (EN 10219-2) with its corner radii: ro / ri = 2t / t, 2.5t / 1.5t, 3t / 2t */
const hss = (type: 'square tube' | 'rectangular tube', a: number, b: number, t: number): ProfileDef => {
  const [ko, ki] = t <= 6 ? [2, 1] : t <= 10 ? [2.5, 1.5] : [3, 2];
  return { standard: 'iso', type, size: `${a} x ${b} x ${t}`, a, b, t, ro: ko * t, ri: ki * t };
};

const inch = 25.4;
export const PROFILE_LIBRARY: ProfileDef[] = [
  // cold formed hollow sections (EN 10219-2) with the corner radii
  hss('square tube', 20, 20, 2), hss('square tube', 40, 40, 3), hss('square tube', 40, 40, 4), hss('square tube', 60, 60, 5), hss('square tube', 80, 80, 5), hss('square tube', 100, 100, 8),
  hss('rectangular tube', 50, 30, 2.6), hss('rectangular tube', 50, 30, 3), hss('rectangular tube', 70, 40, 5), hss('rectangular tube', 80, 40, 5), hss('rectangular tube', 100, 50, 5),
  { standard: 'iso', type: 'pipe', size: '21.3 x 2.3', a: 21.3, b: 21.3, t: 2.3 },
  { standard: 'iso', type: 'pipe', size: '26.9 x 2.3', a: 26.9, b: 26.9, t: 2.3 },
  { standard: 'iso', type: 'pipe', size: '33.7 x 4.0', a: 33.7, b: 33.7, t: 4 },
  { standard: 'iso', type: 'pipe', size: '48.3 x 4.0', a: 48.3, b: 48.3, t: 4 },
  { standard: 'iso', type: 'pipe', size: '60.3 x 4.0', a: 60.3, b: 60.3, t: 4 },
  // equal leg angles (EN 10056-1) with the root and toe radii
  { standard: 'iso', type: 'angle iron', size: '25 x 25 x 3', a: 25, b: 25, t: 3, r1: 3.5, r2: 2 },
  { standard: 'iso', type: 'angle iron', size: '40 x 40 x 4', a: 40, b: 40, t: 4, r1: 6, r2: 3 },
  { standard: 'iso', type: 'angle iron', size: '50 x 50 x 5', a: 50, b: 50, t: 5, r1: 7, r2: 3.5 },
  { standard: 'iso', type: 'angle iron', size: '75 x 75 x 8', a: 75, b: 75, t: 8, r1: 10, r2: 5 },
  // channels with the sizes of UPN 80 / 100 / 120 (EN 10279): parallel flanges of the mean flange thickness
  { standard: 'iso', type: 'c channel', size: 'CH 80 x 8', a: 80, b: 45, t: 6, tf: 8 },
  { standard: 'iso', type: 'c channel', size: 'CH 100 x 10', a: 100, b: 50, t: 6, tf: 8.5 },
  { standard: 'iso', type: 'c channel', size: 'CH 120 x 12', a: 120, b: 55, t: 7, tf: 9 },
  // IPE beams (EN 10365) with the root radius
  { standard: 'iso', type: 'sb beam', size: 'IPE 80', a: 80, b: 46, t: 3.8, tf: 5.2, r1: 5 },
  { standard: 'iso', type: 'sb beam', size: 'IPE 100', a: 100, b: 55, t: 4.1, tf: 5.7, r1: 7 },
  { standard: 'iso', type: 'sb beam', size: 'IPE 120', a: 120, b: 64, t: 4.4, tf: 6.3, r1: 7 },
  { standard: 'iso', type: 'sb beam', size: 'IPE 160', a: 160, b: 82, t: 5, tf: 7.4, r1: 9 },
  { standard: 'ansi inch', type: 'square tube', size: '1 x 1 x 0.065', a: inch, b: inch, t: 0.065 * inch },
  { standard: 'ansi inch', type: 'square tube', size: '2 x 2 x 0.25', a: 2 * inch, b: 2 * inch, t: 0.25 * inch },
  { standard: 'ansi inch', type: 'square tube', size: '3 x 3 x 0.25', a: 3 * inch, b: 3 * inch, t: 0.25 * inch },
  { standard: 'ansi inch', type: 'rectangular tube', size: '3 x 2 x 0.25', a: 3 * inch, b: 2 * inch, t: 0.25 * inch },
  { standard: 'ansi inch', type: 'pipe', size: '0.5 sch 40', a: 0.84 * inch, b: 0.84 * inch, t: 0.109 * inch },
  { standard: 'ansi inch', type: 'pipe', size: '1.0 sch 40', a: 1.315 * inch, b: 1.315 * inch, t: 0.133 * inch },
  { standard: 'ansi inch', type: 'pipe', size: '2.0 sch 40', a: 2.375 * inch, b: 2.375 * inch, t: 0.154 * inch },
  { standard: 'ansi inch', type: 'angle iron', size: '2 x 2 x 0.25', a: 2 * inch, b: 2 * inch, t: 0.25 * inch },
  { standard: 'ansi inch', type: 'angle iron', size: '3 x 3 x 0.375', a: 3 * inch, b: 3 * inch, t: 0.375 * inch },
  { standard: 'ansi inch', type: 'c channel', size: '3 x 4.1', a: 3 * inch, b: 1.41 * inch, t: 0.17 * inch, tf: 0.273 * inch },
  { standard: 'ansi inch', type: 'c channel', size: '4 x 5.4', a: 4 * inch, b: 1.584 * inch, t: 0.184 * inch, tf: 0.296 * inch },
  { standard: 'ansi inch', type: 'sb beam', size: 'S3 x 5.7', a: 3 * inch, b: 2.33 * inch, t: 0.17 * inch, tf: 0.26 * inch },
  { standard: 'ansi inch', type: 'sb beam', size: 'S4 x 7.7', a: 4 * inch, b: 2.663 * inch, t: 0.193 * inch, tf: 0.293 * inch },
];

export const profileTypes = (standard: ProfileDef['standard']) => Array.from(new Set(PROFILE_LIBRARY.filter((p) => p.standard === standard).map((p) => p.type)));
export const profileSizes = (standard: ProfileDef['standard'], type: ProfileType) => PROFILE_LIBRARY.filter((p) => p.standard === standard && p.type === type).map((p) => p.size);
export const findProfile = (standard: ProfileDef['standard'], type: ProfileType, size: string) => PROFILE_LIBRARY.find((p) => p.standard === standard && p.type === type && p.size === size) ?? PROFILE_LIBRARY.find((p) => p.standard === standard && p.type === type) ?? PROFILE_LIBRARY[1];

const rect = (w: number, h: number, cx = 0, cy = 0): SketchPoint[] => [{ x: cx - w / 2, y: cy - h / 2 }, { x: cx + w / 2, y: cy - h / 2 }, { x: cx + w / 2, y: cy + h / 2 }, { x: cx - w / 2, y: cy + h / 2 }];
const circle = (r: number) => { const n = Math.max(32, circleSegments(r, 48)); return Array.from({ length: n }, (_, i) => ({ x: r * Math.cos((2 * Math.PI * i) / n), y: r * Math.sin((2 * Math.PI * i) / n) })); };

type ProfileSeg = { a: SketchPoint; b: SketchPoint; m?: SketchPoint };

/** a closed polygon with rounded corners (a radius per vertex, 0 = sharp) as exact segments: lines and arcs (m = arc middle) */
export function roundedLoop(pts: SketchPoint[], radii: number[]): ProfileSeg[] {
  const n = pts.length;
  const unit = (x: number, y: number) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };
  const corners = pts.map((p, i) => {
    const r = radii[i] ?? 0;
    const prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
    const d1 = unit(p.x - prev.x, p.y - prev.y), d2 = unit(next.x - p.x, next.y - p.y);
    const turn = d1.x * d2.y - d1.y * d2.x;
    if (r <= 0 || Math.abs(turn) < 1e-9) return { t1: p, t2: p };
    const td = r * Math.tan(Math.acos(Math.max(-1, Math.min(1, d1.x * d2.x + d1.y * d2.y))) / 2);
    const t1 = { x: p.x - d1.x * td, y: p.y - d1.y * td }, t2 = { x: p.x + d2.x * td, y: p.y + d2.y * td };
    const s = turn > 0 ? 1 : -1;
    const c = { x: t1.x - d1.y * s * r, y: t1.y + d1.x * s * r };
    const u = unit(p.x - c.x, p.y - c.y);
    return { t1, t2, m: { x: c.x + u.x * r, y: c.y + u.y * r } };
  });
  const segs: ProfileSeg[] = [];
  corners.forEach((k, i) => {
    if (k.m) segs.push({ a: k.t1, b: k.t2, m: k.m });
    const to = corners[(i + 1) % n].t1;
    if (Math.hypot(to.x - k.t2.x, to.y - k.t2.y) > 1e-9) segs.push({ a: k.t2, b: to });
  });
  return segs;
}

/** the polygon of a loop of segments: every arc as short chords (8 per quarter turn) */
export function loopPolygon(segs: ProfileSeg[]): SketchPoint[] {
  const out: SketchPoint[] = [];
  for (const g of segs) {
    out.push(g.a);
    if (!g.m) continue;
    // the circle through a, m and b
    const { a, m, b } = g;
    const d = 2 * (a.x * (m.y - b.y) + m.x * (b.y - a.y) + b.x * (a.y - m.y));
    const sq = (q: SketchPoint) => q.x * q.x + q.y * q.y;
    const c = { x: (sq(a) * (m.y - b.y) + sq(m) * (b.y - a.y) + sq(b) * (a.y - m.y)) / d, y: (sq(a) * (b.x - m.x) + sq(m) * (a.x - b.x) + sq(b) * (m.x - a.x)) / d };
    const r = Math.hypot(a.x - c.x, a.y - c.y);
    const a0 = Math.atan2(a.y - c.y, a.x - c.x), am = Math.atan2(m.y - c.y, m.x - c.x);
    let half = am - a0;
    while (half > Math.PI) half -= 2 * Math.PI;
    while (half < -Math.PI) half += 2 * Math.PI;
    const steps = Math.max(2, Math.ceil((Math.abs(2 * half) / (Math.PI / 2)) * 8));
    for (let k = 1; k < steps; k++) { const t = a0 + (2 * half * k) / steps; out.push({ x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) }); }
  }
  return out;
}

const shoelace = (p: SketchPoint[]) => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q.x * r.y - r.x * q.y; }, 0) / 2);

/** the profile as exact loops in profile coordinates (corner, root and toe radii as arcs; not for the pipe) */
function profileSegs(p: ProfileDef): { outer: ProfileSeg[]; holes: ProfileSeg[][] } {
  const { a, b, t } = p;
  const tf = p.tf ?? t, r1 = p.r1 ?? 0, r2 = p.r2 ?? 0;
  switch (p.type) {
    case 'square tube':
    case 'rectangular tube':
    case 'pipe':
      return { outer: roundedLoop(rect(a, b), [0, 1, 2, 3].map(() => p.ro ?? 0)), holes: [roundedLoop(rect(a - 2 * t, b - 2 * t), [0, 1, 2, 3].map(() => p.ri ?? 0))] };
    case 'angle iron': {
      // an L: legs a (vertical) and b (horizontal) of thickness t, the heel at the lower left; toe radii at the leg ends, root radius inside
      const pts: SketchPoint[] = [{ x: -b / 2, y: -a / 2 }, { x: b / 2, y: -a / 2 }, { x: b / 2, y: -a / 2 + t }, { x: -b / 2 + t, y: -a / 2 + t }, { x: -b / 2 + t, y: a / 2 }, { x: -b / 2, y: a / 2 }];
      return { outer: roundedLoop(pts, [0, 0, r2, r1, r2, 0]), holes: [] };
    }
    case 'c channel': {
      // a C open to the right: web of thickness t on the left, flanges of width b and thickness tf
      const pts: SketchPoint[] = [{ x: -b / 2, y: -a / 2 }, { x: b / 2, y: -a / 2 }, { x: b / 2, y: -a / 2 + tf }, { x: -b / 2 + t, y: -a / 2 + tf }, { x: -b / 2 + t, y: a / 2 - tf }, { x: b / 2, y: a / 2 - tf }, { x: b / 2, y: a / 2 }, { x: -b / 2, y: a / 2 }];
      return { outer: roundedLoop(pts, [0, 0, 0, r1, r1, 0, 0, 0]), holes: [] };
    }
    case 'sb beam': {
      // an I: flanges of width b and thickness tf, web of thickness t, root radii where the web meets the flanges
      const w = t / 2;
      const pts: SketchPoint[] = [
        { x: -b / 2, y: -a / 2 }, { x: b / 2, y: -a / 2 }, { x: b / 2, y: -a / 2 + tf }, { x: w, y: -a / 2 + tf }, { x: w, y: a / 2 - tf }, { x: b / 2, y: a / 2 - tf }, { x: b / 2, y: a / 2 }, { x: -b / 2, y: a / 2 },
        { x: -b / 2, y: a / 2 - tf }, { x: -w, y: a / 2 - tf }, { x: -w, y: -a / 2 + tf }, { x: -b / 2, y: -a / 2 + tf },
      ];
      return { outer: roundedLoop(pts, [0, 0, 0, r1, r1, 0, 0, 0, 0, r1, r1, 0]), holes: [] };
    }
  }
}

/** The profile region, centred on the path point (the member's pierce point in the middle of the profile). */
export function profileRegion(p: ProfileDef): Region {
  if (p.type === 'pipe') return { outer: circle(p.a / 2), holes: [circle(p.a / 2 - p.t)], area: Math.PI * ((p.a / 2) ** 2 - (p.a / 2 - p.t) ** 2) };
  const sg = profileSegs(p);
  const outer = loopPolygon(sg.outer), holes = sg.holes.map(loopPolygon);
  return { outer, holes, area: shoelace(outer) - holes.reduce((s, h) => s + shoelace(h), 0) };
}

/** one point of a profile with the Settings applied (as placedProfile) */
export function placedPoint(p: SketchPoint, rotation: number, mirror: boolean, offset: SketchPoint = { x: 0, y: 0 }): SketchPoint {
  const c = Math.cos((rotation * Math.PI) / 180), s = Math.sin((rotation * Math.PI) / 180);
  const x0 = (mirror ? -p.x : p.x) - offset.x, y0 = p.y - offset.y;
  return { x: x0 * c - y0 * s, y: x0 * s + y0 * c };
}

/**
 * The profile as exact loops for the B-rep kernel: polygons as lines, the pipe as true circles (two half arcs each).
 * Segments: { a, b, m? } with m the middle of an arc.
 */
export function profileLoops(p: ProfileDef, rotation: number, mirror: boolean, offset: SketchPoint = { x: 0, y: 0 }): { outer: { a: SketchPoint; b: SketchPoint; m?: SketchPoint }[]; holes: { a: SketchPoint; b: SketchPoint; m?: SketchPoint }[][] } {
  const P = (q: SketchPoint) => placedPoint(q, rotation, mirror, offset);
  const ring = (r: number) => {
    const e = P({ x: r, y: 0 }), n = P({ x: 0, y: r }), w = P({ x: -r, y: 0 }), s = P({ x: 0, y: -r });
    return [{ a: e, b: w, m: n }, { a: w, b: e, m: s }];
  };
  if (p.type === 'pipe') return { outer: ring(p.a / 2), holes: [ring(p.a / 2 - p.t)] };
  // the rounded corners as true arcs; a mirror flips the winding, so the loops are reversed as placedProfile does
  const sg = profileSegs(p);
  const place = (loop: ProfileSeg[]) => {
    const out = loop.map((g) => ({ a: P(g.a), b: P(g.b), ...(g.m ? { m: P(g.m) } : {}) }));
    return mirror ? out.reverse().map((g) => ({ ...g, a: g.b, b: g.a })) : out;
  };
  return { outer: place(sg.outer), holes: sg.holes.map(place) };
}

/** the profile with the Settings applied: rotation (degrees), mirror, locate-profile offset (in profile coordinates) */
export function placedProfile(r: Region, rotation: number, mirror: boolean, offset: SketchPoint = { x: 0, y: 0 }): Region {
  const c = Math.cos((rotation * Math.PI) / 180), s = Math.sin((rotation * Math.PI) / 180);
  const T = (p: SketchPoint): SketchPoint => {
    const x0 = (mirror ? -p.x : p.x) - offset.x, y0 = p.y - offset.y;
    return { x: x0 * c - y0 * s, y: x0 * s + y0 * c };
  };
  const outer = r.outer.map(T), holes = r.holes.map((h) => h.map(T));
  // a mirror flips the winding: keep the loops oriented as they were
  return { outer: mirror ? outer.reverse() : outer, holes: mirror ? holes.map((h) => h.reverse()) : holes, area: r.area };
}

// ---------------------------------------------------------------------------------------------
// Structural member
// ---------------------------------------------------------------------------------------------
export type CornerTreatment = 'endMiter' | 'endButt1' | 'endButt2' | 'none';

export interface MemberSegment {
  a: THREE.Vector3;
  b: THREE.Vector3;
  /** the chain (group) the segment belongs to and its index in the chain */
  group: number;
  index: number;
}

/** the straight segments of the path polylines (each a member) */
export function memberSegments(paths: THREE.Vector3[][]): MemberSegment[] {
  const out: MemberSegment[] = [];
  paths.forEach((pts, g) => {
    for (let i = 0; i + 1 < pts.length; i++) if (pts[i].distanceTo(pts[i + 1]) > TOL.point) out.push({ a: pts[i].clone(), b: pts[i + 1].clone(), group: g, index: i });
  });
  return out;
}

/** the frame of a member: n along the segment, u the profile's horizontal (the world up projected out, so a vertical member keeps its width along X) */
export function memberPlane(a: THREE.Vector3, b: THREE.Vector3, id = 'member'): PlaneDef {
  const n = b.clone().sub(a).normalize();
  const up = Math.abs(n.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const u = up.clone().cross(n).normalize();
  const v = n.clone().cross(u).normalize();
  return { id, name: id, origin: a.toArray() as V3, u: u.toArray() as V3, v: v.toArray() as V3, n: n.toArray() as V3 };
}

export interface MemberBuild {
  geometry: THREE.BufferGeometry;
  /** the member for the B-rep kernel: its plane and length, and the half-spaces cut away at mitered corners (absent: a curved member) */
  exact?: { plane: PlaneDef; length: number; clips: { point: V3; normal: V3 }[] };
  /** the cut list length: the member's extent along its axis after the corner treatment (a miter counts to its long edge) */
  length: number;
  /** the length of its path segment(s) */
  pathLength: number;
  /** the miter angles at the two ends (degrees, 0 = square cut) */
  angle1: number;
  angle2: number;
  segment: MemberSegment;
}

/**
 * Structural members along the segments: each straight segment becomes a body. Where two segments of one chain meet,
 * the corner treatment applies: End Miter cuts both on the bisector plane, End Butt extends one member over the other.
 */
export function structuralMembers(region: Region, segments0: MemberSegment[], corner: CornerTreatment, gap = 0, mergeArcs = false): MemberBuild[] {
  void mergeArcs;
  const half = Math.max(...region.outer.map((p) => Math.hypot(p.x, p.y))) + 1;
  const out: MemberBuild[] = [];
  // an arc or a spline in the path comes as many short segments that turn a little each: such a run is one curved
  // member (the profile swept along it), as the intended design builds a member along an arc
  const dirOf = (s: MemberSegment) => s.b.clone().sub(s.a).normalize();
  const curvedRuns: MemberSegment[][] = [];
  const inCurve = new Set<MemberSegment>();
  for (const g of [...new Set(segments0.map((s) => s.group))]) {
    const chain = segments0.filter((s) => s.group === g).sort((x, y) => x.index - y.index);
    let run: MemberSegment[] = [chain[0]];
    const flush = () => {
      if (run.length >= 3) { curvedRuns.push(run); run.forEach((x) => inCurve.add(x)); }
    };
    for (let i = 1; i < chain.length; i++) {
      const p = chain[i - 1], c = chain[i];
      const turn = Math.acos(Math.max(-1, Math.min(1, dirOf(p).dot(dirOf(c))))) * (180 / Math.PI);
      if (p.b.distanceTo(c.a) < TOL.point && turn > 1e-3 && turn < 20) run.push(c);
      else { flush(); run = [c]; }
    }
    flush();
  }
  for (const run of curvedRuns) {
    const path = [run[0].a.clone(), ...run.map((x) => x.b.clone())];
    const g = sweepGeometry([region], memberPlane(path[0], path[1]), path);
    if (!g) continue;
    const length = run.reduce((a, x) => a + x.a.distanceTo(x.b), 0);
    out.push({ geometry: g, length, pathLength: length, angle1: 0, angle2: 0, segment: run[0] });
  }
  const segments = segments0;
  // how far the (placed) profile of a member reaches along the world direction w from its path
  const reach = (m: MemberSegment, w: THREE.Vector3) => {
    const pl = memberPlane(m.a, m.b);
    const cu = new THREE.Vector3(...pl.u).dot(w), cv = new THREE.Vector3(...pl.v).dot(w);
    return Math.max(...region.outer.map((q) => q.x * cu + q.y * cv));
  };
  for (const seg of segments) {
    if (inCurve.has(seg)) continue;
    // a closed path (its last point is its first): the first and the last member meet at a corner too
    const group = segments.filter((s) => s.group === seg.group);
    const first = group.reduce((x, y) => (y.index < x.index ? y : x)), last = group.reduce((x, y) => (y.index > x.index ? y : x));
    const closed = group.length > 2 && first.a.distanceTo(last.b) < TOL.point;
    const prev = segments.find((s) => s.group === seg.group && s.index === seg.index - 1) ?? (closed && seg === first ? last : undefined);
    const next = segments.find((s) => s.group === seg.group && s.index === seg.index + 1) ?? (closed && seg === last ? first : undefined);
    const d = seg.b.clone().sub(seg.a).normalize();
    let a = seg.a.clone(), b = seg.b.clone();
    let angle1 = 0, angle2 = 0;
    const cuts: THREE.BufferGeometry[] = [];
    const clips: { point: V3; normal: V3 }[] = [];
    const cornerCut = (p: THREE.Vector3, dIn: THREE.Vector3, dOut: THREE.Vector3, atStart: boolean, other: MemberSegment) => {
      // the miter plane of the corner: its normal bisects the two member axes (dIn + dOut); a U-turn has no miter
      const bis = dIn.clone().add(dOut);
      if (bis.length() < 1e-6) return 0;
      bis.normalize();
      const ang = (Math.acos(Math.max(-1, Math.min(1, dIn.dot(dOut)))) * 180) / Math.PI;
      const miter = ang / 2;
      if (corner === 'endMiter') {
        // extend the end past the corner, then cut it back on the bisector (half the gap each side)
        if (atStart) a = seg.a.clone().addScaledVector(d, -half);
        else b = seg.b.clone().addScaledVector(d, half);
        // the half space on the far side of the bisector is removed; the plane moves by half the gap towards the member
        const keepDir = atStart ? d.clone() : d.clone().negate();
        const side = Math.sign(bis.dot(keepDir)) || 1;
        const origin = p.clone().addScaledVector(bis, (side * gap) / 2);
        cuts.push(halfSpaceBox({ origin: origin.toArray() as V3, n: bis.toArray() as V3 }, half * 20 + seg.a.distanceTo(seg.b) * 2, side > 0));
        const away = side > 0 ? bis.clone().negate() : bis.clone();
        clips.push({ point: origin.toArray() as V3, normal: away.toArray() as V3 });
        return miter;
      }
      if (corner === 'endButt1' || corner === 'endButt2') {
        // End Butt 1: the corner's first member runs through, the second stops at it; End Butt 2 the other way round. The
        // first and every other member of a chain count as first (a closed rectangle: two members run through at both
        // ends, the two others fit between them); where that does not decide (an odd closed chain), the earlier one
        const evenSelf = seg.index % 2 === 0, evenOther = other.index % 2 === 0;
        const first = evenSelf !== evenOther ? evenSelf : !atStart;
        const runsThrough = corner === 'endButt1' ? first : !first;
        // the other member's faces across this member's axis: run out to its far face, or stop at its near face
        const out = atStart ? d.clone().negate() : d.clone();
        if (runsThrough) {
          const ext = reach(other, out);
          if (atStart) a = seg.a.clone().addScaledVector(d, -ext);
          else b = seg.b.clone().addScaledVector(d, ext);
        } else {
          const back = reach(other, out.clone().negate()) + gap;
          if (atStart) a = seg.a.clone().addScaledVector(d, back);
          else b = seg.b.clone().addScaledVector(d, -back);
        }
        return 0;
      }
      return 0;
    };
    if (prev) angle1 = cornerCut(seg.a, prev.b.clone().sub(prev.a).normalize(), d, true, prev);
    if (next) angle2 = cornerCut(seg.b, d, next.b.clone().sub(next.a).normalize(), false, next);
    const len = a.distanceTo(b);
    if (len < TOL.point) continue;
    const plane = memberPlane(a, b);
    let g = extrudeGeometry([region], plane, { end: 'blind', depth: len, reverse: false }, 0, 0);
    if (!g) continue;
    for (const c of cuts) g = csg(g, c, 'subtract');
    out.push({ geometry: g, length: axialExtent(g, d), pathLength: seg.a.distanceTo(seg.b), angle1, angle2, segment: seg, exact: { plane, length: len, clips } });
  }
  return out;
}

/** the extent of a body along a direction (the cut length of a straight member) */
export function axialExtent(g: THREE.BufferGeometry, d: THREE.Vector3): number {
  const pos = g.getAttribute('position');
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < pos.count; i++) { const s = pos.getX(i) * d.x + pos.getY(i) * d.y + pos.getZ(i) * d.z; lo = Math.min(lo, s); hi = Math.max(hi, s); }
  return hi > lo ? hi - lo : 0;
}

// ---------------------------------------------------------------------------------------------
// Trim/Extend
// ---------------------------------------------------------------------------------------------
/** Trim/Extend ▸ End Trim with bodies: the trimmed body loses what lies inside the trimming bodies (plus the weld gap). */
export function trimByBodies(body: THREE.BufferGeometry, trimming: THREE.BufferGeometry[], weldGap = 0): THREE.BufferGeometry {
  let g = body;
  for (const t of trimming) {
    let tool = t;
    if (weldGap > 0) {
      // the gap: the trimming body grown by the gap (its bounding box, enough for straight members)
      t.computeBoundingBox();
      const bb = t.boundingBox!;
      const size = bb.getSize(new THREE.Vector3()).addScalar(2 * weldGap);
      tool = new THREE.BoxGeometry(size.x, size.y, size.z).toNonIndexed();
      const c = bb.getCenter(new THREE.Vector3());
      tool.translate(c.x, c.y, c.z);
    }
    g = csg(g, tool, 'subtract');
  }
  return g;
}

/** Trim/Extend with a face / plane: the body is cut back to the plane (the side the plane normal points to is removed). */
export function trimByPlane(body: THREE.BufferGeometry, plane: { origin: V3; n: V3 }, size = 1000): THREE.BufferGeometry {
  return csg(body, halfSpaceBox(plane, size, false), 'subtract');
}

// ---------------------------------------------------------------------------------------------
// End Cap
// ---------------------------------------------------------------------------------------------
/** the outer boundary of a planar face as a region in the face plane (holes filled: the cap closes the tube) */
export function faceOutline(g: THREE.BufferGeometry, face: PlanarFace): { region: Region; plane: PlaneDef } | null {
  const pos = (g.index ? g.toNonIndexed() : g).getAttribute('position');
  const arr: number[] = [];
  for (const t of face.triangles) for (let k = 0; k < 3; k++) arr.push(pos.getX(t * 3 + k), pos.getY(t * 3 + k), pos.getZ(t * 3 + k));
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  const loops = boundaryLoops(fg);
  if (!loops.length) return null;
  const n = new THREE.Vector3(...face.normal).normalize();
  const o = new THREE.Vector3(...face.centroid);
  const ref = Math.abs(n.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const u = ref.clone().cross(n).normalize(), v = n.clone().cross(u).normalize();
  const to2 = (p: THREE.Vector3): SketchPoint => { const d = p.clone().sub(o); return { x: d.dot(u), y: d.dot(v) }; };
  const polys = loops.map((l) => l.map(to2));
  const area = (p: SketchPoint[]) => Math.abs(p.reduce((s, q, i) => { const r = p[(i + 1) % p.length]; return s + q.x * r.y - r.x * q.y; }, 0) / 2);
  polys.sort((a, b) => area(b) - area(a));
  const plane: PlaneDef = { id: 'cap', name: 'cap', origin: o.toArray() as V3, u: u.toArray() as V3, v: v.toArray() as V3, n: n.toArray() as V3 };
  return { region: { outer: polys[0], holes: [], area: area(polys[0]) }, plane };
}

/** the polygon moved inwards by d (a simple vertex offset along the bisectors; convex outlines) */
export function shrinkPolygon(poly: SketchPoint[], d: number): SketchPoint[] {
  if (d <= 0) return poly;
  const n = poly.length;
  const signed = poly.reduce((s, q, i) => { const r = poly[(i + 1) % n]; return s + q.x * r.y - r.x * q.y; }, 0);
  const sgn = signed > 0 ? 1 : -1;
  return poly.map((p, i) => {
    const prev = poly[(i - 1 + n) % n], next = poly[(i + 1) % n];
    const e1 = { x: p.x - prev.x, y: p.y - prev.y }, e2 = { x: next.x - p.x, y: next.y - p.y };
    const l1 = Math.hypot(e1.x, e1.y) || 1, l2 = Math.hypot(e2.x, e2.y) || 1;
    // inward normals of the two edges
    const n1 = { x: (-e1.y / l1) * sgn, y: (e1.x / l1) * sgn }, n2 = { x: (-e2.y / l2) * sgn, y: (e2.x / l2) * sgn };
    const bx = n1.x + n2.x, by = n1.y + n2.y, bl = Math.hypot(bx, by) || 1;
    const cosHalf = Math.max(0.3, (bx * n1.x + by * n1.y) / bl);
    return { x: p.x + (bx / bl) * (d / cosHalf), y: p.y + (by / bl) * (d / cosHalf) };
  });
}

/** the outline of an end cap: the end face's outer boundary inset by the offset, its sharp corners chamfered */
function endCapOutline(g: THREE.BufferGeometry, face: PlanarFace, offset: number, chamfer: number): { outer: SketchPoint[]; plane: PlaneDef; area: number } | null {
  const o = faceOutline(g, face);
  if (!o) return null;
  let outer = shrinkPolygon(o.region.outer, offset);
  if (chamfer > 0) {
    // chamfered corners: every sharp corner (not the chords of a corner radius) replaced by two points
    const n = outer.length;
    const pts: SketchPoint[] = [];
    for (let i = 0; i < n; i++) {
      const p = outer[i], prev = outer[(i - 1 + n) % n], next = outer[(i + 1) % n];
      const l1 = Math.hypot(p.x - prev.x, p.y - prev.y) || 1, l2 = Math.hypot(next.x - p.x, next.y - p.y) || 1;
      const turn = ((p.x - prev.x) * (next.x - p.x) + (p.y - prev.y) * (next.y - p.y)) / (l1 * l2);
      if (turn > Math.cos(Math.PI / 6)) { pts.push(p); continue; }
      const c = Math.min(chamfer, l1 / 2.5, l2 / 2.5);
      pts.push({ x: p.x - ((p.x - prev.x) / l1) * c, y: p.y - ((p.y - prev.y) / l1) * c }, { x: p.x + ((next.x - p.x) / l2) * c, y: p.y + ((next.y - p.y) / l2) * c });
    }
    outer = pts;
  }
  return { outer, plane: o.plane, area: o.region.area };
}

/**
 * End Cap as a prism along the end face's normal: inward from the face into the tube (z from -thickness to 0, flush with
 * the end); outward on the end face (z from -EPS, a hair into the tube so it touches, to thickness). For the B-rep kernel.
 */
export function endCapPrism(g: THREE.BufferGeometry, face: PlanarFace, thickness: number, offset: number, outward: boolean, chamfer = 0): { plane: PlaneDef; loop: { a: SketchPoint; b: SketchPoint }[]; zStart: number; depth: number; outer: SketchPoint[]; area: number } | null {
  const o = endCapOutline(g, face, offset, chamfer);
  if (!o) return null;
  return { plane: o.plane, outer: o.outer, area: o.area, loop: o.outer.map((q, i) => ({ a: q, b: o.outer[(i + 1) % o.outer.length] })), zStart: outward ? -EPS : -thickness, depth: outward ? thickness + EPS : thickness };
}

/** End Cap: a plate of the thickness over the end face of a tube, inset by the offset, inward (into the tube) or outward. */
export function endCapGeometry(g: THREE.BufferGeometry, face: PlanarFace, thickness: number, offset: number, outward: boolean, chamfer = 0): THREE.BufferGeometry | null {
  const pr = endCapPrism(g, face, thickness, offset, outward, chamfer);
  if (!pr) return null;
  const cap = extrudeGeometry([{ outer: pr.outer, holes: [], area: pr.area }], pr.plane, { end: 'blind', depth: pr.depth, reverse: false }, 0, 0);
  if (!cap) return null;
  const n = new THREE.Vector3(...pr.plane.n).multiplyScalar(pr.zStart);
  cap.translate(n.x, n.y, n.z);
  return cap;
}

// ---------------------------------------------------------------------------------------------
// Gusset and Weld Bead between two faces (of one or two bodies)
// ---------------------------------------------------------------------------------------------
export interface FaceOnBody { body: THREE.BufferGeometry; face: PlanarFace }

/** find the planar face nearest to a reference on any of the bodies */
export function findFaceOnBodies(bodies: { id: string; geometry: THREE.BufferGeometry }[], ref: { normal: V3; point: V3 }): FaceOnBody | null {
  const n = new THREE.Vector3(...ref.normal).normalize(), p = new THREE.Vector3(...ref.point);
  let best: FaceOnBody | null = null, bd = Infinity;
  for (const b of bodies) {
    for (const f of planarFaces(b.geometry, b.id)) {
      if (f.curved || new THREE.Vector3(...f.normal).dot(n) < 0.99) continue;
      const d = new THREE.Vector3(...f.centroid).distanceTo(p);
      if (d < bd) { bd = d; best = { body: b.geometry, face: f }; }
    }
  }
  return best && bd < 50 ? best : null;
}

/** the corner line where the planes of two faces meet, and the overlap of both faces along it */
export function cornerLine(a: FaceOnBody, b: FaceOnBody): { p: THREE.Vector3; dir: THREE.Vector3; lo: number; hi: number; n1: THREE.Vector3; n2: THREE.Vector3 } | { error: string } {
  const n1 = new THREE.Vector3(...a.face.normal).normalize(), n2 = new THREE.Vector3(...b.face.normal).normalize();
  const dir = n1.clone().cross(n2);
  if (dir.length() < 1e-3) return { error: 'The two faces are parallel: select two faces that meet at a corner.' };
  dir.normalize();
  const d1 = n1.dot(new THREE.Vector3(...a.face.centroid)), d2 = n2.dot(new THREE.Vector3(...b.face.centroid));
  const n12 = n1.dot(n2), den = 1 - n12 * n12;
  const p = n1.clone().multiplyScalar((d1 - d2 * n12) / den).addScaledVector(n2, (d2 - d1 * n12) / den);
  const span = (fb: FaceOnBody): [number, number] => {
    const pos = (fb.body.index ? fb.body.toNonIndexed() : fb.body).getAttribute('position');
    let lo = Infinity, hi = -Infinity;
    for (const t of fb.face.triangles) for (let k = 0; k < 3; k++) { const s = new THREE.Vector3().fromBufferAttribute(pos, t * 3 + k).sub(p).dot(dir); lo = Math.min(lo, s); hi = Math.max(hi, s); }
    return [lo, hi];
  };
  const [a0, a1] = span(a), [b0, b1] = span(b);
  const lo = Math.max(a0, b0), hi = Math.min(a1, b1);
  if (hi - lo < 1e-3) return { error: 'The two faces do not meet along a common corner.' };
  return { p, dir, lo, hi, n1, n2 };
}

/** Weldment Gusset: a triangular (or polygonal, with a flat top) plate in the corner between two faces. */
export function weldGussetGeometry(a: FaceOnBody, b: FaceOnBody, opt: { profile: 'triangular' | 'polygonal'; d1: number; d2: number; d3?: number; thickness: number; location: 'start' | 'mid' | 'end'; offset: number }): { geometry: THREE.BufferGeometry; centre: THREE.Vector3 } | { error: string } {
  const c0 = cornerLine(a, b);
  if ('error' in c0) return c0;
  const { p, dir, lo, hi, n1, n2 } = c0;
  const t = Math.max(0.5, opt.thickness);
  const s = opt.location === 'start' ? lo + opt.offset + t / 2 : opt.location === 'end' ? hi - opt.offset - t / 2 : (lo + hi) / 2 + opt.offset;
  const c = p.clone().addScaledVector(dir, Math.min(hi - t / 2, Math.max(lo + t / 2, s)));
  // along face A away from the corner (n2 projected into A), along face B (n1 projected into B)
  const tA = n2.clone().addScaledVector(n1, -n1.dot(n2)).normalize();
  const tB = n1.clone().addScaledVector(n2, -n1.dot(n2)).normalize();
  const u = tA.clone(), v = dir.clone().cross(u).normalize();
  if (v.dot(tB) < 0) v.negate();
  const P2 = (q: THREE.Vector3): SketchPoint => ({ x: q.clone().sub(c).dot(u), y: q.clone().sub(c).dot(v) });
  const A = c.clone().addScaledVector(tA, opt.d1), B = c.clone().addScaledVector(tB, opt.d2);
  const poly: SketchPoint[] = [P2(c), P2(A)];
  if (opt.profile === 'polygonal') {
    const d3 = Math.max(0.5, Math.min(opt.d3 ?? Math.min(opt.d1, opt.d2) / 2, opt.d1, opt.d2));
    // the flat: cut off the hypotenuse corner at d3 from each leg end
    poly.push(P2(c.clone().addScaledVector(tA, opt.d1).addScaledVector(tB, d3)), P2(c.clone().addScaledVector(tB, opt.d2).addScaledVector(tA, d3)));
  }
  poly.push(P2(B));
  // a hair into the faces so the gusset touches (and merges nothing: it is its own body)
  const plane: PlaneDef = { id: 'g', name: 'g', origin: c.clone().addScaledVector(dir, -t / 2).addScaledVector(tA.clone().add(tB).normalize(), -EPS).toArray() as V3, u: u.toArray() as V3, v: v.toArray() as V3, n: dir.toArray() as V3 };
  const g = extrudeGeometry([{ outer: poly, holes: [], area: 0 }], plane, { end: 'blind', depth: t, reverse: false }, 0, 0);
  if (!g) return { error: 'Could not build the gusset.' };
  return { geometry: g, centre: c };
}

/** Weld Bead: a fillet-shaped bead (a triangular prism of the bead size) along the corner between two faces; intermittent beads as pieces. */
export function weldBeadGeometry(a: FaceOnBody, b: FaceOnBody, opt: { size: number; intermittent?: { length: number; pitch: number } | null; from?: number; to?: number }): { geometry: THREE.BufferGeometry; length: number; pieces: number } | { error: string } {
  const c0 = cornerLine(a, b);
  if ('error' in c0) return c0;
  const { p, dir, lo, hi, n1, n2 } = c0;
  const tA = n2.clone().addScaledVector(n1, -n1.dot(n2)).normalize();
  const tB = n1.clone().addScaledVector(n2, -n1.dot(n2)).normalize();
  const u = tA.clone(), v = dir.clone().cross(u).normalize();
  if (v.dot(tB) < 0) v.negate();
  const s = Math.max(0.5, opt.size);
  const start = lo + (opt.from ?? 0), end = hi - (opt.to ?? 0);
  const pieces: [number, number][] = [];
  if (opt.intermittent && opt.intermittent.length > 0 && opt.intermittent.pitch > opt.intermittent.length) {
    for (let x = start; x < end - 1e-6; x += opt.intermittent.pitch) pieces.push([x, Math.min(end, x + opt.intermittent.length)]);
  } else pieces.push([start, end]);
  const P2 = (q: THREE.Vector3, c: THREE.Vector3): SketchPoint => ({ x: q.clone().sub(c).dot(u), y: q.clone().sub(c).dot(v) });
  let geometry: THREE.BufferGeometry | null = null;
  let length = 0;
  for (const [x0, x1] of pieces) {
    const c = p.clone().addScaledVector(dir, x0);
    // the bead profile: a triangle on the two faces with a slightly convex face (3 points on the arc)
    const A = c.clone().addScaledVector(tA, s), B = c.clone().addScaledVector(tB, s);
    const mid = c.clone().addScaledVector(tA, s * 0.5).addScaledVector(tB, s * 0.5).addScaledVector(tA.clone().add(tB).normalize(), s * 0.12);
    const poly = [P2(c.clone().addScaledVector(tA.clone().add(tB).normalize(), -EPS), c), P2(A, c), P2(mid, c), P2(B, c)];
    const plane: PlaneDef = { id: 'w', name: 'w', origin: c.toArray() as V3, u: u.toArray() as V3, v: v.toArray() as V3, n: dir.toArray() as V3 };
    const g = extrudeGeometry([{ outer: poly, holes: [], area: 0 }], plane, { end: 'blind', depth: x1 - x0, reverse: false }, 0, 0);
    if (!g) continue;
    geometry = geometry ? mergeTwo(geometry, g) : g;
    length += x1 - x0;
  }
  if (!geometry) return { error: 'The weld bead has no length.' };
  return { geometry, length, pieces: pieces.length };
}

function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const pa = a.getAttribute('position'), pb = b.getAttribute('position');
  const arr = new Float32Array(pa.count * 3 + pb.count * 3);
  arr.set(pa.array as Float32Array, 0);
  arr.set(pb.array as Float32Array, pa.count * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------------------------
// Cut list
// ---------------------------------------------------------------------------------------------
export interface CutListItem {
  id: string;
  name: string;
  bodyIds: string[];
  quantity: number;
  description: string;
  length: number;
  angle1: number;
  angle2: number;
  volume: number;
}

/**
 * identical bodies (same description, bounding size within 0.05 mm and volume within 0.1 %) grouped into cut list items,
 * as the intended Cut-List-Item folders; a tolerance, not rounding, so two members that differ only by the boolean's
 * triangulation still land in one item
 */
export function cutList(bodies: { id: string; geometry: THREE.BufferGeometry; description?: string; length?: number; angle1?: number; angle2?: number }[]): CutListItem[] {
  const items: (CutListItem & { size: number[] })[] = [];
  const keyOf = (b: (typeof bodies)[number]) => {
    b.geometry.computeBoundingBox();
    const size = b.geometry.boundingBox!.getSize(new THREE.Vector3()).toArray().sort((x, y) => x - y);
    const pos = b.geometry.getAttribute('position');
    let v = 0;
    for (let i = 0; i + 2 < pos.count; i += 3) {
      const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i), bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1), cx = pos.getX(i + 2), cy = pos.getY(i + 2), cz = pos.getZ(i + 2);
      v += (ax * (by * cz - bz * cy) + bx * (cy * az - cz * ay) + cx * (ay * bz - az * by)) / 6;
    }
    return { key: `${size.map((x) => x.toFixed(1)).join('x')}|${Math.round(Math.abs(v))}|${b.description ?? ''}`, size, volume: Math.abs(v) };
  };
  for (const b of bodies) {
    const { key, size, volume } = keyOf(b);
    const it = items.find((x) => x.description === (b.description ?? '') && x.size.every((s, i) => Math.abs(s - size[i]) < 0.05) && Math.abs(x.volume - volume) <= 1e-3 * Math.max(x.volume, volume));
    if (it) { it.bodyIds.push(b.id); it.quantity++; }
    else items.push({ id: key, name: `Cut-List-Item${items.length + 1}`, bodyIds: [b.id], quantity: 1, description: b.description ?? '', length: b.length ?? 0, angle1: b.angle1 ?? 0, angle2: b.angle2 ?? 0, volume, size });
  }
  return items.map(({ size, ...it }) => { void size; return it; });
}
