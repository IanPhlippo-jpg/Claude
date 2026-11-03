/**
 * Standard Parts: parametric part documents for the ISO fasteners of iso.ts. Every part is an ordinary part document
 * (sketches and features), so the normal rebuild builds it and it can be opened, edited and inserted like any part.
 * The models are simplified: no thread, the shank at the nominal diameter d.
 *
 * Orientation of every part: the axis along +Z through the origin, the bearing face (under the head, under the nut or
 * washer) at Z = 0; a screw's shank goes down to Z = -l, its head up to Z = k; a nut or washer goes up to its height.
 */
import type { Document, Feature } from '../document/types';
import { createDocument } from '../document/types';
import { addCircle, addLine, addPolygon, createSketch } from '../sketch/model';
import type { Sketch } from '../sketch/types';
import { ISO4032, ISO4762, ISO7089, LIBRARY_SIZES, screwLengths, THREAD, type LibrarySize } from './iso';

export type StandardId = 'iso4762' | 'iso4032' | 'iso7089';

export interface StandardPartSpec {
  standard: StandardId;
  size: LibrarySize;
  /** nominal length (screws only) */
  length?: number;
}

/** the standards of the library, grouped as the library folders show them */
export const STANDARDS: { id: StandardId; label: string; folder: 'Bolts and Screws' | 'Nuts' | 'Washers' }[] = [
  { id: 'iso4762', label: 'Socket Head Cap Screw ISO 4762', folder: 'Bolts and Screws' },
  { id: 'iso4032', label: 'Hex Nut ISO 4032 (style 1)', folder: 'Nuts' },
  { id: 'iso7089', label: 'Plain Washer ISO 7089 (normal series)', folder: 'Washers' },
];

const STEEL = { name: 'Alloy Steel', density: 7700, color: '#5a5c60' };

/** the designation of the part, as its file and component name */
export function standardPartName(p: StandardPartSpec): string {
  if (p.standard === 'iso4762') return `ISO 4762 ${p.size} x ${p.length ?? screwLengths(p.size)[0]}`;
  if (p.standard === 'iso4032') return `ISO 4032 ${p.size}`;
  return `ISO 7089 ${p.size.slice(1)} - 200 HV`;
}

/** every part of the library: each screw size in each of its nominal lengths, each nut and each washer */
export function standardPartCatalog(): StandardPartSpec[] {
  const out: StandardPartSpec[] = [];
  for (const size of LIBRARY_SIZES) for (const length of screwLengths(size)) out.push({ standard: 'iso4762', size, length });
  for (const size of LIBRARY_SIZES) out.push({ standard: 'iso4032', size });
  for (const size of LIBRARY_SIZES) out.push({ standard: 'iso7089', size });
  return out;
}

/** the main dimensions of the part from the standard's table (shown in the library, checked by the tests) */
export function standardPartDimensions(p: StandardPartSpec): Record<string, number> {
  const { d, P } = THREAD[p.size];
  if (p.standard === 'iso4762') {
    const t = ISO4762[p.size];
    return { d, P, l: p.length ?? screwLengths(p.size)[0], dk: t.dk, k: t.k, s: t.s, t: t.t, b: t.b };
  }
  if (p.standard === 'iso4032') return { d, P, ...ISO4032[p.size] };
  return { ...ISO7089[p.size] };
}

/** a closed polyline of [radius, z] points on the Top Plane with the Z axis as a construction line (for a revolve) */
function axisProfile(sketch: Sketch, loops: [number, number][][]): [Sketch, string] {
  let s = sketch;
  let zmin = Infinity, zmax = -Infinity;
  for (const prof of loops) {
    // a point (r, z) on the Top Plane is the sketch point (r, -z)
    const pts = prof.map(([r, z]) => ({ x: r, y: -z }));
    let first: string | null = null, prev: string | null = null;
    for (let i = 0; i < pts.length; i++) {
      const [n, l] = addLine(s, prev ?? pts[i], i + 1 < pts.length ? pts[i + 1] : first!);
      s = n;
      if (!first) first = l.p1;
      prev = l.p2;
    }
    for (const [, z] of prof) { zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
  }
  const [s2, axis] = addLine(s, { x: 0, y: -zmax - 5 }, { x: 0, y: -zmin + 5 }, true);
  return [s2, axis.id];
}

const sketchFeature = (id: string, name: string, sketchId: string): Feature => ({ id, type: 'sketch', name, sketchId, suppressed: false });

/**
 * ISO 4762 socket head cap screw M(d) x l: the revolved shank (d, l, a 45° chamfered end of one pitch) and head (dk, k,
 * a small chamfer on the top edge), the hexagon socket s cut t deep into the top of the head.
 */
export function socketHeadCapScrew(size: LibrarySize, length: number): Document {
  const { d } = THREAD[size];
  const { dk, k, s, t } = ISO4762[size];
  const doc = createDocument(standardPartName({ standard: 'iso4762', size, length }));
  const r = d / 2, R = dk / 2, c = screwChamfers(size);
  const [s1, axis] = axisProfile(createSketch('s1', 'Sketch1', 'top'), [[
    [0, -length], [r - c.tip, -length], [r, -length + c.tip], [r, 0], [R, 0], [R, k - c.head], [R - c.head, k], [0, k],
  ]]);
  doc.sketches.s1 = s1;
  doc.planes.head_top = { id: 'head_top', name: 'Head Top', origin: [0, 0, k], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], kind: 'face' };
  doc.sketches.s2 = addPolygon(createSketch('s2', 'Sketch2', 'head_top'), { x: 0, y: 0 }, s / Math.sqrt(3), 6)[0];
  doc.features = [
    sketchFeature('k1', 'Sketch1', 's1'),
    { id: 'f1', type: 'revolve', name: 'Revolve1', sketchId: 's1', suppressed: false, op: 'boss', axisEntityId: axis, angle: 360, reverse: false },
    sketchFeature('k2', 'Sketch2', 's2'),
    { id: 'f2', type: 'extrude', name: 'Cut-Extrude1', sketchId: 's2', suppressed: false, op: 'cut', end: 'blind', depth: t, reverse: true },
  ];
  doc.material = { ...STEEL };
  return doc;
}

/** the chamfers of the simplified screw: 45° on the end (one pitch, ISO 4753) and on the top edge of the head */
export function screwChamfers(size: LibrarySize): { tip: number; head: number } {
  return { tip: THREAD[size].P, head: Math.round(ISO4762[size].dk * 0.06 * 100) / 100 };
}

/**
 * ISO 4032 hexagon nut M(d): the hexagon s high m with the hole d (no thread), both faces chamfered 30° from the
 * bearing diameter dw outwards (a revolved cut).
 */
export function hexNut(size: LibrarySize): Document {
  const { d } = THREAD[size];
  const { s, m, dw } = ISO4032[size];
  const doc = createDocument(standardPartName({ standard: 'iso4032', size }));
  doc.planes.base = { id: 'base', name: 'Bearing Face', origin: [0, 0, 0], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], kind: 'face' };
  const hex = addPolygon(createSketch('s1', 'Sketch1', 'base'), { x: 0, y: 0 }, s / Math.sqrt(3), 6)[0];
  doc.sketches.s1 = addCircle(hex, { x: 0, y: 0 }, d / 2)[0];
  // the chamfer: the triangles outside the 30° cone from dw on each face, past the corners
  const E = s / Math.sqrt(3) + 0.5, h = (E - dw / 2) * Math.tan(Math.PI / 6);
  const [s2, axis] = axisProfile(createSketch('s2', 'Sketch2', 'top'), [
    [[dw / 2, 0], [E, 0], [E, h]],
    [[dw / 2, m], [E, m - h], [E, m]],
  ]);
  doc.sketches.s2 = s2;
  doc.features = [
    sketchFeature('k1', 'Sketch1', 's1'),
    { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: m, reverse: false },
    sketchFeature('k2', 'Sketch2', 's2'),
    { id: 'f2', type: 'revolve', name: 'Cut-Revolve1', sketchId: 's2', suppressed: false, op: 'cut', axisEntityId: axis, angle: 360, reverse: false },
  ];
  doc.material = { ...STEEL };
  return doc;
}

/** ISO 7089 plain washer for M(d): the revolved ring d1 / d2, h thick */
export function plainWasher(size: LibrarySize): Document {
  const { d1, d2, h } = ISO7089[size];
  const doc = createDocument(standardPartName({ standard: 'iso7089', size }));
  const [s1, axis] = axisProfile(createSketch('s1', 'Sketch1', 'top'), [[[d1 / 2, 0], [d2 / 2, 0], [d2 / 2, h], [d1 / 2, h]]]);
  doc.sketches.s1 = s1;
  doc.features = [
    sketchFeature('k1', 'Sketch1', 's1'),
    { id: 'f1', type: 'revolve', name: 'Revolve1', sketchId: 's1', suppressed: false, op: 'boss', axisEntityId: axis, angle: 360, reverse: false },
  ];
  doc.material = { ...STEEL };
  return doc;
}

/** the part document of a library entry */
export function standardPart(p: StandardPartSpec): Document {
  if (p.standard === 'iso4762') return socketHeadCapScrew(p.size, p.length ?? screwLengths(p.size)[0]);
  if (p.standard === 'iso4032') return hexNut(p.size);
  return plainWasher(p.size);
}
