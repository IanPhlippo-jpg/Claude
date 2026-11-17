/**
 * Standard Parts: the part documents of the library (sketches and features, rebuilt by the normal rebuild). The models
 * are simplified: no thread, the shank at the nominal diameter d, a revolved profile where the part is round.
 *
 * Orientation of every part: the axis along +Z through the origin. A screw's bearing face (under the head) is at Z = 0,
 * its shank goes down to Z = -l and its head up to Z = k; a countersunk or set screw has its top at Z = 0. A nut, washer,
 * pin, ring or bearing stands on Z = 0 and goes up to its height.
 */
import type { Document } from '../document/types';
import { createDocument } from '../document/types';
import { addCircle, addLine, addPolygon, createSketch } from '../sketch/model';
import type { Sketch } from '../sketch/types';
import { ISO10642, ISO4017, ISO4026, ISO4032, ISO4762, ISO7040, ISO7089, ISO7380, THREAD, type LibrarySize } from './iso';
import { BEARINGS, bearingLands, DIN471, DIN472, ISO2338, ISO8752, ringGap, springSlot } from './pinsRingsBearings';

const STEEL = { name: 'Alloy Steel', density: 7700, color: '#5a5c60' };
const SQ3 = Math.sqrt(3);

function newPart(name: string): Document {
  const doc = createDocument(name);
  doc.material = { ...STEEL };
  return doc;
}

const sketchOn = (doc: Document, plane: string): Sketch => {
  const i = Object.keys(doc.sketches).length + 1;
  return createSketch(`s${i}`, `Sketch${i}`, plane);
};

/** a plane parallel to the XY plane at height z (normal +Z), for a hexagon or a socket */
function facePlane(doc: Document, id: string, name: string, z: number): string {
  doc.planes[id] = { id, name, origin: [0, 0, z], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], kind: 'face' };
  return id;
}

type Op = { type: 'revolve'; op: 'boss' | 'cut'; axis: string } | { type: 'extrude'; op: 'boss' | 'cut'; depth: number; reverse: boolean };
const BASE = { revolve: { boss: 'Revolve', cut: 'Cut-Revolve' }, extrude: { boss: 'Boss-Extrude', cut: 'Cut-Extrude' } };

/** the sketch and its feature, numbered as the feature tree numbers them (Sketch2, Cut-Extrude1 …) */
function step(doc: Document, sketch: Sketch, f: Op): void {
  doc.sketches[sketch.id] = sketch;
  const i = sketch.id.slice(1);
  const base = BASE[f.type][f.op];
  const n = doc.features.filter((x) => x.name.replace(/\d+$/, '') === base).length + 1;
  doc.features.push({ id: `k${i}`, type: 'sketch', name: sketch.name, sketchId: sketch.id, suppressed: false });
  const common = { id: `f${i}`, name: `${base}${n}`, sketchId: sketch.id, suppressed: false, op: f.op };
  if (f.type === 'revolve') doc.features.push({ ...common, type: 'revolve', axisEntityId: f.axis, angle: 360, reverse: false });
  else doc.features.push({ ...common, type: 'extrude', end: 'blind', depth: f.depth, reverse: f.reverse });
}

/** a closed polyline of sketch points */
function polyline(sketch: Sketch, pts: { x: number; y: number }[]): Sketch {
  let s = sketch;
  let first: string | null = null, prev: string | null = null;
  for (let i = 0; i < pts.length; i++) {
    const [n, l] = addLine(s, prev ?? pts[i], i + 1 < pts.length ? pts[i + 1] : first!);
    s = n;
    if (!first) first = l.p1;
    prev = l.p2;
  }
  return s;
}

/** closed polylines of [radius, z] points on the Top Plane with the Z axis as a construction line (for a revolve) */
export function axisProfile(sketch: Sketch, loops: [number, number][][]): [Sketch, string] {
  let s = sketch;
  let zmin = Infinity, zmax = -Infinity;
  for (const prof of loops) {
    // a point (r, z) on the Top Plane is the sketch point (r, -z)
    s = polyline(s, prof.map(([r, z]) => ({ x: r, y: -z })));
    for (const [, z] of prof) { zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
  }
  const [s2, axis] = addLine(s, { x: 0, y: -zmax - 5 }, { x: 0, y: -zmin + 5 }, true);
  return [s2, axis.id];
}

function revolve(doc: Document, op: 'boss' | 'cut', loops: [number, number][][]): void {
  const [s, axis] = axisProfile(sketchOn(doc, 'top'), loops);
  step(doc, s, { type: 'revolve', op, axis });
}

/** a hexagon socket s across flats, cut t deep into the face at height z */
function socket(doc: Document, z: number, s: number, t: number): void {
  const plane = facePlane(doc, 'socket_face', 'Socket Face', z);
  step(doc, addPolygon(sketchOn(doc, plane), { x: 0, y: 0 }, s / SQ3, 6)[0], { type: 'extrude', op: 'cut', depth: t, reverse: true });
}

/** a slot w wide through the wall on the +Y side, along the whole height zmin..zmax (split ring, spring pin) */
function slot(doc: Document, w: number, zmin: number, zmax: number, reach: number): void {
  const s = polyline(sketchOn(doc, 'top'), [{ x: -w / 2, y: -zmax - 1 }, { x: w / 2, y: -zmax - 1 }, { x: w / 2, y: -zmin + 1 }, { x: -w / 2, y: -zmin + 1 }]);
  step(doc, s, { type: 'extrude', op: 'cut', depth: reach + 1, reverse: false });
}

/** the 30° chamfer of a hexagon face at height z from the bearing diameter dw outwards (up: the face looks up) */
function hexChamfer(s: number, dw: number, z: number, up: boolean): [number, number][] {
  const E = s / SQ3 + 0.5, h = (E - dw / 2) * Math.tan(Math.PI / 6);
  return up ? [[dw / 2, z], [E, z - h], [E, z]] : [[dw / 2, z], [E, z], [E, z + h]];
}

/** the chamfers of the simplified screws: 45° on the end (one pitch, ISO 4753) and on the top edge of the head */
export function screwChamfers(size: LibrarySize): { tip: number; head: number } {
  return { tip: THREAD[size].P, head: Math.round(ISO4762[size].dk * 0.06 * 100) / 100 };
}

/** the shank of a screw from Z = top down to -l, the end chamfered 45° by one pitch */
const shank = (size: LibrarySize, l: number, top: number): [number, number][] => {
  const r = THREAD[size].d / 2, c = THREAD[size].P;
  return [[0, -l], [r - c, -l], [r, -l + c], [r, top], [0, top]];
};

/**
 * ISO 4762 socket head cap screw M(d) x l: the revolved shank (d, l, a 45° chamfered end of one pitch) and head (dk, k,
 * a small chamfer on the top edge), the hexagon socket s cut t deep into the top of the head.
 */
export function buildSocketHeadCapScrew(name: string, size: LibrarySize, l: number): Document {
  const { dk, k, s, t } = ISO4762[size];
  const doc = newPart(name);
  const r = THREAD[size].d / 2, R = dk / 2, c = screwChamfers(size);
  revolve(doc, 'boss', [[[0, -l], [r - c.tip, -l], [r, -l + c.tip], [r, 0], [R, 0], [R, k - c.head], [R - c.head, k], [0, k]]]);
  doc.planes.head_top = { id: 'head_top', name: 'Head Top', origin: [0, 0, k], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], kind: 'face' };
  step(doc, addPolygon(sketchOn(doc, 'head_top'), { x: 0, y: 0 }, s / SQ3, 6)[0], { type: 'extrude', op: 'cut', depth: t, reverse: true });
  return doc;
}

/** ISO 4017 hexagon head screw: the shank (into the head), the hexagon head s x k, its top chamfered 30° from dw */
export function buildHexHeadScrew(name: string, size: LibrarySize, l: number): Document {
  const { s, k, dw } = ISO4017[size];
  const doc = newPart(name);
  revolve(doc, 'boss', [shank(size, l, k / 2)]);
  step(doc, addPolygon(sketchOn(doc, facePlane(doc, 'head', 'Bearing Face', 0)), { x: 0, y: 0 }, s / SQ3, 6)[0], { type: 'extrude', op: 'boss', depth: k, reverse: false });
  revolve(doc, 'cut', [hexChamfer(s, dw, k, true)]);
  return doc;
}

/** the dome of a button head: a spherical cap dk wide and k high, as n straight segments from the rim to the axis */
export function domePoints(dk: number, k: number, n = 8): [number, number][] {
  const R = dk / 2, rho = (R * R + k * k) / (2 * k), a0 = Math.asin(R / rho);
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 * (1 - i / n);
    out.push([i === n ? 0 : rho * Math.sin(a), i === 0 ? 0 : k - rho + rho * Math.cos(a)]);
  }
  return out;
}

/** ISO 7380-1 button head socket screw: the shank, the domed head dk x k, the socket s cut t deep from the top */
export function buildButtonHeadScrew(name: string, size: LibrarySize, l: number): Document {
  const { dk, k, s, t } = ISO7380[size]!;
  const doc = newPart(name);
  revolve(doc, 'boss', [[...shank(size, l, 0).slice(0, 4), ...domePoints(dk, k)]]);
  socket(doc, k, s, t);
  return doc;
}

/** ISO 10642 countersunk socket screw: the shank, the 90° head cone from d at -k to dk at the top (Z = 0), the socket */
export function buildCountersunkScrew(name: string, size: LibrarySize, l: number): Document {
  const { dk, k, s, t } = ISO10642[size]!;
  const doc = newPart(name);
  revolve(doc, 'boss', [[...shank(size, l, -k).slice(0, 4), [dk / 2, 0], [0, 0]]]);
  socket(doc, 0, s, t);
  return doc;
}

/** ISO 4026 set screw with flat point: d x l, the flat point dp (45°), the top chamfered, the socket s cut t deep */
export function buildSetScrew(name: string, size: LibrarySize, l: number): Document {
  const { s, t, dp } = ISO4026[size];
  const doc = newPart(name);
  const r = THREAD[size].d / 2, c = 0.6 * THREAD[size].P;
  revolve(doc, 'boss', [[[0, -l], [dp / 2, -l], [r, -l + r - dp / 2], [r, -c], [r - c, 0], [0, 0]]]);
  socket(doc, 0, s, t);
  return doc;
}

/** the hexagon s with the hole d, m high from Z = 0 */
function hexWithHole(doc: Document, size: LibrarySize, s: number, m: number): void {
  const hex = addPolygon(sketchOn(doc, facePlane(doc, 'base', 'Bearing Face', 0)), { x: 0, y: 0 }, s / SQ3, 6)[0];
  step(doc, addCircle(hex, { x: 0, y: 0 }, THREAD[size].d / 2)[0], { type: 'extrude', op: 'boss', depth: m, reverse: false });
}

/**
 * ISO 4032 hexagon nut M(d): the hexagon s high m with the hole d (no thread), both faces chamfered 30° from the
 * bearing diameter dw outwards (a revolved cut).
 */
export function buildHexNut(name: string, size: LibrarySize): Document {
  const { s, m, dw } = ISO4032[size];
  const doc = newPart(name);
  hexWithHole(doc, size, s, m);
  revolve(doc, 'cut', [hexChamfer(s, dw, 0, false), hexChamfer(s, dw, m, true)]);
  return doc;
}

/**
 * ISO 7040 nylon insert lock nut: the ISO 4032 hexagon, on it the round collar dw up to h with its top edge chamfered;
 * the hole d and the 30° chamfer of the bearing face are one revolved cut (no cylinder of the hexagon and the collar
 * on the same radius, which a mesh boolean handles badly).
 */
export function buildLockNut(name: string, size: LibrarySize): Document {
  const { s, m, dw } = ISO4032[size];
  const { h } = ISO7040[size];
  // the chamfer of the collar's top edge leaves a flat ring around the hole
  const r = THREAD[size].d / 2, c = Math.min(0.4 * (h - m), 0.5 * (dw / 2 - r));
  const doc = newPart(name);
  step(doc, addPolygon(sketchOn(doc, facePlane(doc, 'base', 'Bearing Face', 0)), { x: 0, y: 0 }, s / SQ3, 6)[0], { type: 'extrude', op: 'boss', depth: m, reverse: false });
  revolve(doc, 'boss', [[[0, m / 2], [dw / 2, m / 2], [dw / 2, h - c], [dw / 2 - c, h], [0, h]]]);
  revolve(doc, 'cut', [[[0, -1], [r, -1], [r, h + 1], [0, h + 1]], hexChamfer(s, dw, 0, false)]);
  return doc;
}

/** ISO 7089 plain washer for M(d): the revolved ring d1 / d2, h thick */
export function buildPlainWasher(name: string, size: LibrarySize): Document {
  const { d1, d2, h } = ISO7089[size];
  const doc = newPart(name);
  revolve(doc, 'boss', [[[d1 / 2, 0], [d2 / 2, 0], [d2 / 2, h], [d1 / 2, h]]]);
  return doc;
}

/** ISO 2338 parallel pin d x l: both ends chamfered 45° by c */
export function buildParallelPin(name: string, size: string, l: number): Document {
  const { d, c } = ISO2338[size];
  const doc = newPart(name);
  const r = d / 2;
  revolve(doc, 'boss', [[[0, 0], [r - c, 0], [r, c], [r, l - c], [r - c, l], [0, l]]]);
  return doc;
}

/** ISO 8752 spring pin d x l as fitted: the tube d / d - 2s, the outer ends chamfered 45° by s/2, the slot */
export function buildSpringPin(name: string, size: string, l: number): Document {
  const { d, s } = ISO8752[size];
  const doc = newPart(name);
  const ro = d / 2, ri = ro - s, a = s / 2;
  revolve(doc, 'boss', [[[ri, 0], [ro - a, 0], [ro, a], [ro, l - a], [ro - a, l], [ri, l]]]);
  slot(doc, springSlot(s), 0, l, ro);
  return doc;
}

/** DIN 471 / 472 retaining ring: the split ring s thick, b wide, from d3 inwards (bore) or outwards (shaft) */
export function buildRetainingRing(name: string, kind: 'shaft' | 'bore', size: string): Document {
  const { d1, d3, b, s } = (kind === 'shaft' ? DIN471 : DIN472)[size];
  const doc = newPart(name);
  const ri = kind === 'shaft' ? d3 / 2 : d3 / 2 - b, ro = ri + b;
  revolve(doc, 'boss', [[[ri, 0], [ro, 0], [ro, s], [ri, s]]]);
  slot(doc, ringGap(d1), 0, s, ro);
  return doc;
}

/** the closed section of a deep groove ball bearing (see BEARINGS) */
export function bearingSection(size: string): [number, number][] {
  const { d, D, B, r } = BEARINGS[size];
  const { r1, r2, e } = bearingLands(BEARINGS[size]);
  const ri = d / 2, ro = D / 2;
  return [[ri + r, 0], [r1, 0], [r1, e], [r2, e], [r2, 0], [ro - r, 0], [ro, r], [ro, B - r], [ro - r, B], [r2, B], [r2, B - e], [r1, B - e], [r1, B], [ri + r, B], [ri, B - r], [ri, r]];
}

/** a deep groove ball bearing 60xx / 62xx (ISO 15 boundary dimensions): one revolved body d / D, B wide */
export function buildBallBearing(name: string, size: string): Document {
  const doc = newPart(name);
  doc.material = { ...STEEL, color: '#8a8d92' };
  revolve(doc, 'boss', [bearingSection(size)]);
  return doc;
}
