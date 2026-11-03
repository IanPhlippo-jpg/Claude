import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { Component, Document, Mate } from '../document/types';
import { createDocument } from '../document/types';
import { addLine, addPolygon, createSketch, newId } from '../sketch/model';
import { resolvePlaneDef } from '../features/planes';
import { componentMatrix } from './assembly';
import { isLibrarySize, requiredScrewLength, screwLengthFor, sizeForClearanceHole, type ClearanceSeries } from '../library/iso';
import { socketHeadCapScrew } from '../library/parts';

type Id = string;

/** Fastener types of the toolbox (ISO): socket head cap screw, countersunk socket screw, hex bolt. */
export type FastenerType = 'shcs' | 'csk' | 'hex';
export const FASTENER_NAMES: Record<FastenerType, string> = { shcs: 'Socket Head Cap Screw ISO 4762', csk: 'Countersunk Socket Screw ISO 10642', hex: 'Hex Bolt ISO 4017' };
const STD: Record<FastenerType, string> = { shcs: 'ISO 4762', csk: 'ISO 10642', hex: 'ISO 4017' };

/** M size: nominal d, clearance hole (ISO 273 normal), tap drill; SHCS head dk/k/socket s; CSK head; hex across flats/head height. */
export const METRIC: { size: string; d: number; clear: number; tap: number; dk: number; k: number; s: number; csk: number; hs: number; hk: number }[] = [
  { size: 'M3', d: 3, clear: 3.4, tap: 2.5, dk: 5.5, k: 3, s: 2.5, csk: 6, hs: 5.5, hk: 2 },
  { size: 'M4', d: 4, clear: 4.5, tap: 3.3, dk: 7, k: 4, s: 3, csk: 8, hs: 7, hk: 2.8 },
  { size: 'M5', d: 5, clear: 5.5, tap: 4.2, dk: 8.5, k: 5, s: 4, csk: 10, hs: 8, hk: 3.5 },
  { size: 'M6', d: 6, clear: 6.6, tap: 5, dk: 10, k: 6, s: 5, csk: 12, hs: 10, hk: 4 },
  { size: 'M8', d: 8, clear: 9, tap: 6.8, dk: 13, k: 8, s: 6, csk: 16, hs: 13, hk: 5.3 },
  { size: 'M10', d: 10, clear: 11, tap: 8.5, dk: 16, k: 10, s: 8, csk: 20, hs: 16, hk: 6.4 },
  { size: 'M12', d: 12, clear: 13.5, tap: 10.2, dk: 18, k: 12, s: 10, csk: 24, hs: 18, hk: 7.5 },
  { size: 'M16', d: 16, clear: 17.5, tap: 14, dk: 24, k: 16, s: 14, csk: 30, hs: 24, hk: 10 },
  { size: 'M20', d: 20, clear: 22, tap: 17.5, dk: 30, k: 20, s: 17, csk: 36, hs: 30, hk: 12.5 },
];
export const LENGTHS = [6, 8, 10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 80, 90, 100, 110, 120, 140, 160];

/** Smallest standard length of at least the given length. */
export const standardLength = (min: number) => LENGTHS.find((l) => l >= min - 1e-6) ?? LENGTHS[LENGTHS.length - 1];

/**
 * The length of a fastener through the grip: a tapped hole takes the grip, a clearance hole a washer, a nut and two
 * pitches beyond it; a socket head cap screw of M3 to M12 takes a length of its standard's range (Standard Parts).
 */
export function fastenerLength(type: FastenerType, size: string, grip: number, tapped = false): number {
  const need = requiredScrewLength(size, grip, tapped);
  return type === 'shcs' && isLibrarySize(size) ? screwLengthFor(size, need) : standardLength(need);
}

/**
 * A fastener part as the toolbox makes it: axis along +Z, the bearing face of the head at Z = 0 (for a countersunk
 * screw the top of the head), the shank down to Z = -length; a hexagon socket (or a hexagon head for the bolt).
 */
export function fastenerPart(type: FastenerType, size: string, length: number): Document {
  // M3 to M12 socket head cap screws come from the Standard Parts (the dimensions of ISO 4762)
  if (type === 'shcs' && isLibrarySize(size)) return socketHeadCapScrew(size, length);
  const m = METRIC.find((x) => x.size === size) ?? METRIC[3];
  const doc = createDocument(`${STD[type]} ${m.size} x ${length}`);
  const r = m.d / 2;
  // revolved profile on the Top Plane: sketch (r, -z) is the world point (x = r, z)
  let s1 = createSketch('s1', 'Sketch1', 'top');
  let prof: [number, number][];
  if (type === 'shcs') {
    const R = m.dk / 2, c = m.dk * 0.04;
    prof = [[0, -length], [r - 0.1 * m.d, -length], [r, -length + 0.1 * m.d], [r, 0], [R, 0], [R, m.k - c], [R - c, m.k], [0, m.k]];
  } else if (type === 'csk') {
    const R = m.csk / 2, h = R - r;
    prof = [[0, -length], [r - 0.1 * m.d, -length], [r, -length + 0.1 * m.d], [r, -h], [R, 0], [0, 0]];
  } else {
    prof = [[0, -length], [r - 0.1 * m.d, -length], [r, -length + 0.1 * m.d], [r, 0.01], [0, 0.01]];
  }
  let first: string | null = null, prev: string | null = null;
  for (let i = 0; i < prof.length; i++) {
    const a = prev ?? { x: prof[i][0], y: -prof[i][1] };
    const b = i + 1 < prof.length ? { x: prof[i + 1][0], y: -prof[i + 1][1] } : first!;
    const [n, l] = addLine(s1, a, b);
    s1 = n;
    if (!first) first = l.p1;
    prev = l.p2;
  }
  const zmax = Math.max(...prof.map((p) => p[1]));
  const [s1b, axis] = addLine(s1, { x: 0, y: -zmax - 5 }, { x: 0, y: length + 5 }, true);
  s1 = s1b;
  doc.sketches.s1 = s1;
  doc.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'f1', type: 'revolve', name: 'Revolve1', sketchId: 's1', suppressed: false, op: 'boss', axisEntityId: axis.id, angle: 360, reverse: false },
  ];
  if (type === 'hex') {
    // the hexagon head on the bearing face
    doc.planes.head = { id: 'head', name: 'Head', origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], kind: 'face' };
    doc.sketches.s2 = addPolygon(createSketch('s2', 'Sketch2', 'head'), { x: 0, y: 0 }, m.hs / Math.sqrt(3), 6)[0];
    doc.features.push({ id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false }, { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's2', suppressed: false, op: 'boss', end: 'blind', depth: m.hk, reverse: false });
  } else {
    // the hexagon socket in the top of the head
    const top = type === 'shcs' ? m.k : 0;
    doc.planes.top_face = { id: 'top_face', name: 'Top', origin: [0, 0, top], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], kind: 'face' };
    doc.sketches.s2 = addPolygon(createSketch('s2', 'Sketch2', 'top_face'), { x: 0, y: 0 }, m.s / Math.sqrt(3), 6)[0];
    doc.features.push({ id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false }, { id: 'f2', type: 'extrude', name: 'Cut-Extrude1', sketchId: 's2', suppressed: false, op: 'cut', end: 'blind', depth: type === 'shcs' ? m.k * 0.6 : (m.csk / 2 - r) * 0.9, reverse: true });
  }
  doc.material = { name: 'Alloy Steel', density: 7700, color: '#5a5c60' };
  return doc;
}

/** A Hole Tool hole of a component in the assembly (world). */
export interface AsmHole {
  componentId: Id;
  componentName: string;
  featureName: string;
  /** entry point on the face and the unit direction into the material (world) */
  entry: THREE.Vector3;
  axis: THREE.Vector3;
  diameter: number;
  holeType: string;
  /** distance from the entry to where the hole leaves the part */
  depth: number;
  /** local entry / axis in the component (for mates) */
  localEntry: [number, number, number];
  localAxis: [number, number, number];
}

/** All Hole Tool holes of the assembly's components, with their through depth (the plate thickness around the hole). */
export function assemblyHoles(doc: Document, bodies: { id: string; geometry: THREE.BufferGeometry }[]): AsmHole[] {
  const out: AsmHole[] = [];
  for (const c of doc.components ?? []) {
    if (c.suppressed) continue;
    const m = componentMatrix(c);
    const rot = new THREE.Matrix3().setFromMatrix4(m);
    const body = bodies.find((b) => b.id === c.id);
    const bvh = body ? new MeshBVH(body.geometry.index ? body.geometry.toNonIndexed() : body.geometry) : null;
    for (const f of c.part.features) {
      if (f.type !== 'hole' || f.suppressed) continue;
      const pl = resolvePlaneDef(c.part, f.plane);
      const o = new THREE.Vector3(...pl.origin), u = new THREE.Vector3(...pl.u), v = new THREE.Vector3(...pl.v), n = new THREE.Vector3(...pl.n);
      for (const p of f.points) {
        const le = o.clone().addScaledVector(u, p.x).addScaledVector(v, p.y);
        const la = n.clone().negate().normalize();
        const entry = le.clone().applyMatrix4(m), axis = la.clone().applyMatrix3(rot).normalize();
        // the material around the hole: a ray just outside the hole wall finds where the part ends
        let depth = f.depth > 0 ? f.depth : 0;
        if (bvh) {
          const side = (Math.abs(axis.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).cross(axis).normalize();
          const start = entry.clone().addScaledVector(side, Math.max(f.diameter, f.cbDiameter || 0, f.csDiameter || 0) / 2 + 0.4).addScaledVector(axis, -0.01);
          let far = 0;
          for (const h of bvh.raycast(new THREE.Ray(start, axis), THREE.DoubleSide)) if (h.distance < 1000) far = Math.max(far, h.distance);
          if (!f.depth || f.depth <= 0) depth = far;
        }
        out.push({ componentId: c.id, componentName: c.name, featureName: f.name, entry, axis, diameter: f.diameter, holeType: f.holeType, depth, localEntry: [le.x, le.y, le.z], localAxis: [la.x, la.y, la.z] });
      }
    }
  }
  return out;
}

/** One fastener location: coaxial holes through stacked parts, from the outermost entry. */
export interface FastenerSlot {
  holes: AsmHole[];
  top: AsmHole;
  grip: number;
  size: string;
  type: FastenerType;
  length: number;
  /** the ISO 273 series of the clearance hole the size was chosen from (absent for a tapped hole) */
  series?: ClearanceSeries;
  tapped?: boolean;
}

/** Group coaxial holes and choose the fastener for each group (size from the clearance hole, length from the grip). */
export function fastenerSlots(holes: AsmHole[]): FastenerSlot[] {
  const used = new Set<AsmHole>();
  const slots: FastenerSlot[] = [];
  for (const h of holes) {
    if (used.has(h)) continue;
    const ax = h.axis;
    const spanOf = (g: AsmHole) => {
      const t = g.entry.clone().sub(h.entry).dot(ax);
      const sgn = g.axis.dot(ax) > 0 ? 1 : -1;
      return { g, a: Math.min(t, t + sgn * g.depth), b: Math.max(t, t + sgn * g.depth) };
    };
    // coaxial holes share a fastener only when they touch (a stack of parts), not across a gap or a part without a hole
    const coaxial = holes.filter((o) => !used.has(o) && Math.abs(Math.abs(o.axis.dot(h.axis)) - 1) < 1e-3 && o.entry.clone().sub(h.entry).cross(h.axis).length() < 0.5).map(spanOf).sort((x, y) => x.a - y.a);
    const mine = coaxial.findIndex((x) => x.g === h);
    let i0 = mine, i1 = mine;
    while (i0 > 0 && coaxial[i0].a - coaxial[i0 - 1].b < 0.5) i0--;
    while (i1 < coaxial.length - 1 && coaxial[i1 + 1].a - coaxial[i1].b < 0.5) i1++;
    const span = coaxial.slice(i0, i1 + 1);
    const group = span.map((x) => x.g);
    group.forEach((g) => used.add(g));
    const lo = Math.min(...span.map((x) => x.a)), hi = Math.max(...span.map((x) => x.b));
    const top = span.find((x) => Math.abs(x.a - lo) < 1e-3 && x.g.axis.dot(ax) > 0)?.g ?? h;
    const grip = hi - lo;
    const tapped = group.some((g) => g.holeType === 'tap');
    // the size: the nearest tap drill, or the clearance hole of ISO 273 (fine, medium or coarse) the hole matches
    const fit = tapped ? null : sizeForClearanceHole(top.diameter);
    const m = tapped ? METRIC.reduce((b, x) => (Math.abs(x.tap - top.diameter) < Math.abs(b.tap - top.diameter) ? x : b)) : METRIC.find((x) => x.size === fit?.size) ?? METRIC[0];
    const type: FastenerType = top.holeType === 'countersink' ? 'csk' : 'shcs';
    slots.push({ holes: group, top, grip, size: m.size, type, length: fastenerLength(type, m.size, grip, tapped), tapped, ...(fit ? { series: fit.series } : {}) });
  }
  return slots;
}

/** Components and mates for the fasteners of the slots: the shank concentric with the hole, the head on the entry face. */
export function placeFasteners(doc: Document, slots: FastenerSlot[]): { components: Component[]; mates: Mate[] } {
  const comps: Component[] = [];
  const mates: Mate[] = [];
  const counters = new Map<string, number>();
  for (const c of doc.components ?? []) {
    const k = c.name.replace(/<\d+>$/, ''), m = /<(\d+)>$/.exec(c.name);
    counters.set(k, Math.max(counters.get(k) ?? 0, m ? Number(m[1]) : 0));
  }
  // mates are numbered per type, by design (Concentric7, Coincident9 …)
  let nConc = (doc.mates ?? []).filter((m) => m.type === 'concentric').length;
  let nCoin = (doc.mates ?? []).filter((m) => m.type === 'coincident').length;
  slots.forEach((s) => {
    const part = { ...fastenerPart(s.type, s.size, s.length), kind: 'part' as const };
    const base = part.name;
    const n = (counters.get(base) ?? 0) + 1;
    counters.set(base, n);
    // the fastener's +Z points out of the hole (against the drilling direction); its head sits on the entry
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), s.top.axis.clone().negate());
    const id = newId('comp');
    comps.push({ id, name: `${base}<${n}>`, part, position: [s.top.entry.x, s.top.entry.y, s.top.entry.z], rotation: [q.x, q.y, q.z, q.w], fixed: false, suppressed: false });
    const m = METRIC.find((x) => x.size === s.size)!;
    const holeLabel = `Face<1>@${s.top.componentName}`;
    mates.push({ id: newId('m'), type: 'concentric', name: `Concentric${++nConc}`, aligned: true, suppressed: false,
      refs: [{ componentId: s.top.componentId, kind: 'face', label: holeLabel, normal: s.top.localAxis, point: s.top.localEntry, cylindrical: true, radius: s.top.diameter / 2 },
        // the shank axis points down into the hole (-Z), as the hole axis does: aligned keeps the head out of the hole
        { componentId: id, kind: 'face', label: `Face<1>@${base}<${n}>`, normal: [0, 0, -1], point: [0, 0, 0], cylindrical: true, radius: m.d / 2 }] });
    const outward: [number, number, number] = [-s.top.localAxis[0], -s.top.localAxis[1], -s.top.localAxis[2]];
    mates.push({ id: newId('m'), type: 'coincident', name: `Coincident${++nCoin}`, aligned: false, suppressed: false,
      refs: [{ componentId: s.top.componentId, kind: 'face', label: `Face<2>@${s.top.componentName}`, normal: outward, point: s.top.localEntry },
        { componentId: id, kind: 'face', label: `Face<2>@${base}<${n}>`, normal: [0, 0, -1], point: [0, 0, 0] }] });
  });
  return { components: comps, mates };
}
