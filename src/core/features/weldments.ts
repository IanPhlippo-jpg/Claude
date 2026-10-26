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
}

const inch = 25.4;
export const PROFILE_LIBRARY: ProfileDef[] = [
  { standard: 'iso', type: 'square tube', size: '20 x 20 x 2', a: 20, b: 20, t: 2 },
  { standard: 'iso', type: 'square tube', size: '40 x 40 x 4', a: 40, b: 40, t: 4 },
  { standard: 'iso', type: 'square tube', size: '60 x 60 x 5', a: 60, b: 60, t: 5 },
  { standard: 'iso', type: 'square tube', size: '80 x 80 x 5', a: 80, b: 80, t: 5 },
  { standard: 'iso', type: 'square tube', size: '100 x 100 x 8', a: 100, b: 100, t: 8 },
  { standard: 'iso', type: 'rectangular tube', size: '50 x 30 x 2.6', a: 50, b: 30, t: 2.6 },
  { standard: 'iso', type: 'rectangular tube', size: '70 x 40 x 5', a: 70, b: 40, t: 5 },
  { standard: 'iso', type: 'rectangular tube', size: '80 x 40 x 5', a: 80, b: 40, t: 5 },
  { standard: 'iso', type: 'rectangular tube', size: '100 x 50 x 5', a: 100, b: 50, t: 5 },
  { standard: 'iso', type: 'pipe', size: '21.3 x 2.3', a: 21.3, b: 21.3, t: 2.3 },
  { standard: 'iso', type: 'pipe', size: '26.9 x 2.3', a: 26.9, b: 26.9, t: 2.3 },
  { standard: 'iso', type: 'pipe', size: '33.7 x 4.0', a: 33.7, b: 33.7, t: 4 },
  { standard: 'iso', type: 'pipe', size: '48.3 x 4.0', a: 48.3, b: 48.3, t: 4 },
  { standard: 'iso', type: 'pipe', size: '60.3 x 4.0', a: 60.3, b: 60.3, t: 4 },
  { standard: 'iso', type: 'angle iron', size: '25 x 25 x 3', a: 25, b: 25, t: 3 },
  { standard: 'iso', type: 'angle iron', size: '40 x 40 x 4', a: 40, b: 40, t: 4 },
  { standard: 'iso', type: 'angle iron', size: '50 x 50 x 5', a: 50, b: 50, t: 5 },
  { standard: 'iso', type: 'angle iron', size: '75 x 75 x 8', a: 75, b: 75, t: 8 },
  { standard: 'iso', type: 'c channel', size: 'CH 80 x 8', a: 80, b: 45, t: 6, tf: 8 },
  { standard: 'iso', type: 'c channel', size: 'CH 100 x 10', a: 100, b: 50, t: 6, tf: 8.5 },
  { standard: 'iso', type: 'c channel', size: 'CH 120 x 12', a: 120, b: 55, t: 7, tf: 9 },
  { standard: 'iso', type: 'sb beam', size: 'IPE 80', a: 80, b: 46, t: 3.8, tf: 5.2 },
  { standard: 'iso', type: 'sb beam', size: 'IPE 100', a: 100, b: 55, t: 4.1, tf: 5.7 },
  { standard: 'iso', type: 'sb beam', size: 'IPE 120', a: 120, b: 64, t: 4.4, tf: 6.3 },
  { standard: 'iso', type: 'sb beam', size: 'IPE 160', a: 160, b: 82, t: 5, tf: 7.4 },
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

/** The profile region, centred on the path point (the member's pierce point in the middle of the profile). */
export function profileRegion(p: ProfileDef): Region {
  const { a, b, t } = p;
  const tf = p.tf ?? t;
  switch (p.type) {
    case 'square tube':
    case 'rectangular tube':
      return { outer: rect(a, b), holes: [rect(a - 2 * t, b - 2 * t)], area: a * b - (a - 2 * t) * (b - 2 * t) };
    case 'pipe':
      return { outer: circle(a / 2), holes: [circle(a / 2 - t)], area: Math.PI * ((a / 2) ** 2 - (a / 2 - t) ** 2) };
    case 'angle iron': {
      // an L: legs a (vertical) and b (horizontal) of thickness t, the corner at the lower left
      const pts: SketchPoint[] = [{ x: -b / 2, y: -a / 2 }, { x: b / 2, y: -a / 2 }, { x: b / 2, y: -a / 2 + t }, { x: -b / 2 + t, y: -a / 2 + t }, { x: -b / 2 + t, y: a / 2 }, { x: -b / 2, y: a / 2 }];
      return { outer: pts, holes: [], area: a * t + (b - t) * t };
    }
    case 'c channel': {
      // a C open to the right: web of thickness t on the left, flanges of width b and thickness tf
      const pts: SketchPoint[] = [{ x: -b / 2, y: -a / 2 }, { x: b / 2, y: -a / 2 }, { x: b / 2, y: -a / 2 + tf }, { x: -b / 2 + t, y: -a / 2 + tf }, { x: -b / 2 + t, y: a / 2 - tf }, { x: b / 2, y: a / 2 - tf }, { x: b / 2, y: a / 2 }, { x: -b / 2, y: a / 2 }];
      return { outer: pts, holes: [], area: a * t + 2 * (b - t) * tf };
    }
    case 'sb beam': {
      // an I: flanges of width b and thickness tf, web of thickness t
      const w = t / 2;
      const pts: SketchPoint[] = [
        { x: -b / 2, y: -a / 2 }, { x: b / 2, y: -a / 2 }, { x: b / 2, y: -a / 2 + tf }, { x: w, y: -a / 2 + tf }, { x: w, y: a / 2 - tf }, { x: b / 2, y: a / 2 - tf }, { x: b / 2, y: a / 2 }, { x: -b / 2, y: a / 2 },
        { x: -b / 2, y: a / 2 - tf }, { x: -w, y: a / 2 - tf }, { x: -w, y: -a / 2 + tf }, { x: -b / 2, y: -a / 2 + tf },
      ];
      return { outer: pts, holes: [], area: 2 * b * tf + (a - 2 * tf) * t };
    }
  }
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
  length: number;
  /** the miter angles at the two ends (degrees, 0 = square cut) */
  angle1: number;
  angle2: number;
  segment: MemberSegment;
}

/**
 * Structural members along the segments: each straight segment becomes a body. Where two segments of one chain meet,
 * the corner treatment applies: End Miter cuts both on the bisector plane, End Butt extends one member over the other.
 */
export function structuralMembers(region: Region, segments: MemberSegment[], corner: CornerTreatment, gap = 0, mergeArcs = false): MemberBuild[] {
  void mergeArcs;
  const half = Math.max(...region.outer.map((p) => Math.hypot(p.x, p.y))) + 1;
  const out: MemberBuild[] = [];
  for (const seg of segments) {
    const prev = segments.find((s) => s.group === seg.group && s.index === seg.index - 1);
    const next = segments.find((s) => s.group === seg.group && s.index === seg.index + 1);
    const d = seg.b.clone().sub(seg.a).normalize();
    let a = seg.a.clone(), b = seg.b.clone();
    let angle1 = 0, angle2 = 0;
    const cuts: THREE.BufferGeometry[] = [];
    const cornerCut = (p: THREE.Vector3, dIn: THREE.Vector3, dOut: THREE.Vector3, atStart: boolean) => {
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
        return miter;
      }
      if (corner === 'endButt1' || corner === 'endButt2') {
        // End Butt 1: the first member runs through, the second stops at it; End Butt 2 the other way round
        const runsThrough = corner === 'endButt1' ? !atStart : atStart;
        if (runsThrough) {
          const ext = half - 1; // out to the far face of the other member (its half size)
          if (atStart) a = seg.a.clone().addScaledVector(d, -ext);
          else b = seg.b.clone().addScaledVector(d, ext);
        } else {
          const back = half - 1 + gap;
          if (atStart) a = seg.a.clone().addScaledVector(d, back);
          else b = seg.b.clone().addScaledVector(d, -back);
        }
        return 0;
      }
      return 0;
    };
    if (prev) angle1 = cornerCut(seg.a, prev.b.clone().sub(prev.a).normalize(), d, true);
    if (next) angle2 = cornerCut(seg.b, d, next.b.clone().sub(next.a).normalize(), false);
    const len = a.distanceTo(b);
    if (len < TOL.point) continue;
    const plane = memberPlane(a, b);
    let g = extrudeGeometry([region], plane, { end: 'blind', depth: len, reverse: false }, 0, 0);
    if (!g) continue;
    for (const c of cuts) g = csg(g, c, 'subtract');
    out.push({ geometry: g, length: seg.a.distanceTo(seg.b), angle1, angle2, segment: seg });
  }
  return out;
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

/** End Cap: a plate of the thickness over the end face of a tube, inset by the offset, inward (into the tube) or outward. */
export function endCapGeometry(g: THREE.BufferGeometry, face: PlanarFace, thickness: number, offset: number, outward: boolean, chamfer = 0): THREE.BufferGeometry | null {
  const o = faceOutline(g, face);
  if (!o) return null;
  let outer = shrinkPolygon(o.region.outer, offset);
  if (chamfer > 0) {
    // chamfered corners: every corner replaced by two points
    const n = outer.length;
    const pts: SketchPoint[] = [];
    for (let i = 0; i < n; i++) {
      const p = outer[i], prev = outer[(i - 1 + n) % n], next = outer[(i + 1) % n];
      const l1 = Math.hypot(p.x - prev.x, p.y - prev.y) || 1, l2 = Math.hypot(next.x - p.x, next.y - p.y) || 1;
      const c = Math.min(chamfer, l1 / 2.5, l2 / 2.5);
      pts.push({ x: p.x - ((p.x - prev.x) / l1) * c, y: p.y - ((p.y - prev.y) / l1) * c }, { x: p.x + ((next.x - p.x) / l2) * c, y: p.y + ((next.y - p.y) / l2) * c });
    }
    outer = pts;
  }
  const region: Region = { outer, holes: [], area: o.region.area };
  // inward: from the face plane into the tube (−n); the cap overlaps the wall a hair so it merges
  const cap = extrudeGeometry([region], o.plane, { end: 'blind', depth: thickness + EPS, reverse: !outward }, 0, 0);
  if (!cap) return null;
  if (!outward) { const n = new THREE.Vector3(...o.plane.n).multiplyScalar(EPS); cap.translate(n.x, n.y, n.z); }
  else { const n = new THREE.Vector3(...o.plane.n).multiplyScalar(-EPS); cap.translate(n.x, n.y, n.z); }
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

/** identical bodies (same volume and bounding size) grouped into cut list items, as the intended Cut-List-Item folders */
export function cutList(bodies: { id: string; geometry: THREE.BufferGeometry; description?: string; length?: number; angle1?: number; angle2?: number }[]): CutListItem[] {
  const items: CutListItem[] = [];
  const keyOf = (b: (typeof bodies)[number]) => {
    b.geometry.computeBoundingBox();
    const size = b.geometry.boundingBox!.getSize(new THREE.Vector3()).toArray().map((x) => Math.round(x * 10) / 10).sort((x, y) => x - y);
    const pos = b.geometry.getAttribute('position');
    let v = 0;
    for (let i = 0; i + 2 < pos.count; i += 3) {
      const ax = pos.getX(i), ay = pos.getY(i), az = pos.getZ(i), bx = pos.getX(i + 1), by = pos.getY(i + 1), bz = pos.getZ(i + 1), cx = pos.getX(i + 2), cy = pos.getY(i + 2), cz = pos.getZ(i + 2);
      v += (ax * (by * cz - bz * cy) + bx * (cy * az - cz * ay) + cx * (ay * bz - az * by)) / 6;
    }
    return { key: `${size.join('x')}|${Math.round(Math.abs(v))}|${b.description ?? ''}`, volume: Math.abs(v) };
  };
  for (const b of bodies) {
    const { key, volume } = keyOf(b);
    const it = items.find((x) => x.id === key);
    if (it) { it.bodyIds.push(b.id); it.quantity++; }
    else items.push({ id: key, name: `Cut-List-Item${items.length + 1}`, bodyIds: [b.id], quantity: 1, description: b.description ?? '', length: b.length ?? 0, angle1: b.angle1 ?? 0, angle2: b.angle2 ?? 0, volume });
  }
  return items;
}
