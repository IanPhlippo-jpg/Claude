import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type Component, type Document, type HoleFeature } from '../document/types';
import { REFERENCE_PLANE_DEFS } from '../features/planes';
import { rebuildDocument } from '../features/rebuild';
import { meshVolume } from '../features/solid';
import { bodyCheck } from '../features/inspect';
import { rebuildAssembly } from '../assembly/assembly';
import { assemblyHoles, fastenerLengths, fastenerPart, fastenerSlots, METRIC, placeFasteners } from '../assembly/fasteners';
import { ISO273, LIBRARY_SIZES } from './iso';
import { ringGap, springSlot } from './pinsRingsBearings';
import { bearingSection, domePoints } from './partBuilders';
import { LIBRARY_FOLDERS, STANDARDS, standardLengths, standardPart, standardPartCatalog, standardPartDimensions, standardPartName, standardSizes, type StandardId } from './parts';

// the values of the standards' tables for sample sizes, typed once more by hand (size: values in the given order), so
// a slip in the tables of iso.ts / pinsRingsBearings.ts shows
const REF: Record<StandardId, { keys: string; rows: string }> = {
  iso4762: { keys: 'dk k s t', rows: 'M3 5.5 3 2.5 1.3|M16 24 16 14 8|M20 30 20 17 10|M24 36 24 19 12' },
  iso4017: { keys: 's k e dw', rows: 'M3 5.5 2 6.01 4.57|M8 13 5.3 14.38 11.63|M16 24 10 26.75 22.49|M24 36 15 39.98 33.61' },
  iso7380: { keys: 'dk k s t', rows: 'M3 5.7 1.65 2 1.04|M6 10.5 3.3 4 2.08|M10 17.5 5.5 6 3.12|M16 28 8.8 10 5.2' },
  iso10642: { keys: 'dk k s t', rows: 'M3 6.72 1.86 2 1.1|M6 13.44 3.72 4 2.2|M12 26.88 7.44 8 4.3|M20 40.32 10.16 12 5.6' },
  iso4026: { keys: 's t dp', rows: 'M3 1.5 1.2 2|M6 3 2 4|M12 6 4.8 8.5|M24 12 10 18' },
  iso4032: { keys: 's m e dw', rows: 'M3 5.5 2.4 6.01 4.6|M16 24 14.8 26.75 22.5|M20 30 18 32.95 27.7|M24 36 21.5 39.55 33.3' },
  iso7040: { keys: 's h', rows: 'M3 5.5 4.5|M6 10 8|M12 18 14|M24 36 26.5' },
  iso7089: { keys: 'd1 d2 h', rows: 'M3 3.2 7 0.5|M16 17 30 3|M20 21 37 3|M24 25 44 4' },
  iso2338: { keys: 'd c', rows: '3 3 0.5|6 6 1.2|10 10 2|20 20 3.5' },
  iso8752: { keys: 'd d1 s', rows: '3 3 3.5 0.6|6 6 6.7 1.2|10 10 10.8 2|20 20 20.9 4' },
  din471: { keys: 'd1 s d3 d2 m', rows: '10 10 1 9.3 9.6 1.1|20 20 1.2 18.5 19 1.3|40 40 1.75 36.5 37.5 1.85' },
  din472: { keys: 'd1 s d3 d2 m', rows: '12 12 1 13 12.5 1.1|20 20 1 21.5 21 1.1|40 40 1.75 43.5 42.5 1.85' },
  iso15: { keys: 'd D B r', rows: '6000 10 26 8 0.3|6004 20 42 12 0.6|6204 20 47 14 1|6210 50 90 20 1.1' },
};

/** the volume of a closed [r, z] profile revolved about the Z axis (a sum of cone frustums) */
const revolved = (pts: [number, number][]) => {
  let v = 0;
  for (let i = 0; i < pts.length; i++) {
    const [r1, z1] = pts[i], [r2, z2] = pts[(i + 1) % pts.length];
    v += (r1 * r1 + r1 * r2 + r2 * r2) * (z2 - z1);
  }
  return Math.abs((Math.PI / 3) * v);
};
const hexPrism = (s: number, h: number) => (Math.sqrt(3) / 2) * s * s * h;

const build = (doc: Document) => {
  const r = rebuildDocument(doc, null);
  expect(r.errors).toEqual({});
  expect(r.bodies.length).toBe(1);
  const chk = bodyCheck(r.bodies)[0];
  // a closed shell (Check: the vector area of the surface vanishes); the T-junctions of the mesh booleans are allowed
  expect(chk.openEdges).toBe(0);
  const g = r.bodies[0].geometry;
  g.computeBoundingBox();
  return { volume: meshVolume(g), box: g.boundingBox!, size: g.boundingBox!.getSize(new THREE.Vector3()) };
};

/** the expected volume of a part: [lowest, highest] (equal for an exact formula) */
function expectedVolume(p: { standard: StandardId; size: string; length?: number }): [number, number] {
  const d = standardPartDimensions(p);
  const l = d.l, r = d.d / 2;
  const exact = (v: number): [number, number] => [v, v];
  switch (p.standard) {
    case 'iso4762': {
      const c = Math.round(d.dk * 0.06 * 100) / 100, R = d.dk / 2;
      return exact(revolved([[0, -l], [r - d.P, -l], [r, -l + d.P], [r, 0], [R, 0], [R, d.k - c], [R - c, d.k], [0, d.k]]) - hexPrism(d.s, d.t));
    }
    case 'iso4017': {
      // shank to the head + hexagon head; the 30° chamfer on top takes a little from the corners
      const full = revolved([[0, -l], [r - d.P, -l], [r, -l + d.P], [r, 0], [0, 0]]) + hexPrism(d.s, d.k);
      return [full * 0.97, full];
    }
    case 'iso7380': {
      const full = revolved([[0, -l], [r - d.P, -l], [r, -l + d.P], [r, 0], ...domePoints(d.dk, d.k)]);
      // the socket cut from the top of the dome removes less than the full prism
      return [full - hexPrism(d.s, d.t), full - 0.5 * hexPrism(d.s, d.t)];
    }
    case 'iso10642':
      return exact(revolved([[0, -l], [r - d.P, -l], [r, -l + d.P], [r, -d.k], [d.dk / 2, 0], [0, 0]]) - hexPrism(d.s, d.t));
    case 'iso4026': {
      const c = 0.6 * d.P;
      return exact(revolved([[0, -l], [d.dp / 2, -l], [r, -l + r - d.dp / 2], [r, -c], [r - c, 0], [0, 0]]) - hexPrism(d.s, d.t));
    }
    case 'iso4032': {
      const full = hexPrism(d.s, d.m) - Math.PI * r * r * d.m;
      return [full * 0.85, full];
    }
    case 'iso7040': {
      const c = Math.min(0.4 * (d.h - d.m), 0.5 * (d.dw / 2 - r));
      const full = hexPrism(d.s, d.m) - Math.PI * r * r * d.m + revolved([[r, d.m], [d.dw / 2, d.m], [d.dw / 2, d.h - c], [d.dw / 2 - c, d.h], [r, d.h]]);
      return [full * 0.9, full];
    }
    case 'iso7089':
      return exact((Math.PI / 4) * (d.d2 ** 2 - d.d1 ** 2) * d.h);
    case 'iso2338': {
      const R = d.d / 2;
      return exact(revolved([[0, 0], [R - d.c, 0], [R, d.c], [R, l - d.c], [R - d.c, l], [0, l]]));
    }
    case 'iso8752': {
      const ro = d.d / 2, ri = ro - d.s, a = d.s / 2;
      return exact(revolved([[ri, 0], [ro - a, 0], [ro, a], [ro, l - a], [ro - a, l], [ri, l]]) - springSlot(d.s) * d.s * l);
    }
    case 'din471':
    case 'din472': {
      const ri = p.standard === 'din471' ? d.d3 / 2 : d.d3 / 2 - d.b, ro = ri + d.b;
      return exact(Math.PI * (ro * ro - ri * ri) * d.s - ringGap(d.d1) * d.b * d.s);
    }
    case 'iso15':
      return exact(revolved(bearingSection(p.size)));
    default:
      return exact(NaN);
  }
}

describe('Standard Parts catalog', () => {
  it('has the fasteners, pins, retaining rings and bearings in their folders, each size of its standard', () => {
    const ids = STANDARDS.map((s) => s.id).sort();
    expect(ids).toEqual(Object.keys(REF).sort());
    for (const f of LIBRARY_FOLDERS) expect(STANDARDS.some((s) => s.folder === f)).toBe(true);
    expect(standardSizes('iso4762')).toEqual(['M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12', 'M16', 'M20', 'M24']);
    expect(standardSizes('iso7380')).toEqual(['M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12', 'M16']); // the standard ends at M16
    expect(standardSizes('iso10642')).toEqual(['M3', 'M4', 'M5', 'M6', 'M8', 'M10', 'M12', 'M16', 'M20']); // ends at M20
    expect(standardSizes('iso15')).toHaveLength(22); // 6000 to 6010 and 6200 to 6210
    expect(standardSizes('din471')).toContain('20');
    // every size of every standard has a part, every part a designation of its own
    const all = standardPartCatalog();
    for (const s of STANDARDS) for (const z of standardSizes(s.id)) expect(all.some((p) => p.standard === s.id && p.size === z)).toBe(true);
    expect(new Set(all.map(standardPartName)).size).toBe(all.length);
    expect(all.length).toBeGreaterThan(900);
    // screws and pins come in the lengths of their standard's range, the others have none
    expect(standardLengths('iso4762', 'M24')[0]).toBe(40);
    expect(standardLengths('iso4762', 'M24').at(-1)).toBe(200);
    expect(standardLengths('iso4017', 'M16')).toEqual([30, 35, 40, 45, 50, 55, 60, 65, 70, 80, 90, 100, 110, 120, 130, 140, 150]);
    expect(standardLengths('iso4026', 'M6')).toEqual([6, 8, 10, 12, 16, 20, 25, 30]);
    expect(standardLengths('iso2338', '6')[0]).toBe(12);
    expect(standardLengths('iso4032', 'M6')).toEqual([]);
    expect(standardLengths('iso7380', 'M24')).toEqual([]);
  });

  it('designations as the BOM shows them', () => {
    const n = (standard: StandardId, size: string, length?: number) => standardPartName({ standard, size, length });
    expect(n('iso4017', 'M16', 60)).toBe('ISO 4017 M16 x 60');
    expect(n('iso7380', 'M6', 12)).toBe('ISO 7380-1 M6 x 12');
    expect(n('iso10642', 'M8', 25)).toBe('ISO 10642 M8 x 25');
    expect(n('iso4026', 'M5', 8)).toBe('ISO 4026 M5 x 8');
    expect(n('iso7040', 'M10')).toBe('ISO 7040 M10');
    expect(n('iso7089', 'M24')).toBe('ISO 7089 24 - 200 HV');
    expect(n('iso2338', '6', 20)).toBe('ISO 2338 6 m6 x 20');
    expect(n('iso8752', '8', 40)).toBe('ISO 8752 8 x 40');
    expect(n('din471', '20')).toBe('DIN 471 20 x 1.2');
    expect(n('din472', '30')).toBe('DIN 472 30 x 1.2');
    expect(n('iso15', '6204')).toBe('Ball Bearing 6204');
    // without a length the first length of the range
    expect(n('iso4762', 'M20')).toBe('ISO 4762 M20 x 30');
  });

  it('the dimensions match the tables of the standards for sample sizes', () => {
    for (const [std, { keys, rows }] of Object.entries(REF) as [StandardId, { keys: string; rows: string }][]) {
      for (const row of rows.split('|')) {
        const [size, ...vals] = row.split(' ');
        const d = standardPartDimensions({ standard: std, size });
        expect(keys.split(' ').map((k) => d[k]), `${std} ${size}`).toEqual(vals.map(Number));
      }
    }
  });

  it('every standard rebuilds to one closed body of the expected volume and outline (smallest and largest size)', () => {
    for (const s of STANDARDS) {
      const sizes = standardSizes(s.id);
      for (const size of [sizes[0], sizes[sizes.length - 1]]) {
        const ls = standardLengths(s.id, size);
        const p = { standard: s.id, size, length: ls.length ? ls[Math.floor(ls.length / 2)] : undefined };
        const doc = standardPart(p);
        expect(doc.name).toBe(standardPartName(p));
        const b = build(doc);
        const [lo, hi] = expectedVolume(p);
        const label = `${standardPartName(p)}: ${b.volume.toFixed(1)} in [${lo.toFixed(1)}, ${hi.toFixed(1)}]`;
        // 1.5 % for the faceting of the round faces
        expect(b.volume >= lo * 0.985 && b.volume <= hi * 1.005, label).toBe(true);
        const d = standardPartDimensions(p);
        if (s.folder === 'Bolts and Screws') expect(b.box.min.z, label).toBeCloseTo(-d.l, 3);
        if (s.id === 'iso4762' || s.id === 'iso4017') expect(b.box.max.z, label).toBeCloseTo(d.k, 3);
        // the socket takes the top of the dome away: the highest point is the dome at the corners of the socket
        if (s.id === 'iso7380') expect(b.box.max.z > d.k - d.t && b.box.max.z < d.k, label).toBe(true);
        if (s.id === 'iso10642' || s.id === 'iso4026') expect(b.box.max.z, label).toBeCloseTo(0, 3);
        if (s.id === 'iso7040') expect(b.size.z, label).toBeCloseTo(d.h, 3);
        if (s.id === 'iso4017') expect(b.size.y, label).toBeCloseTo(d.s, 2); // across flats
        if (s.id === 'iso2338' || s.id === 'iso8752') expect(b.size.z, label).toBeCloseTo(d.l, 3);
        if (s.id === 'iso15') {
          expect(b.size.x, label).toBeCloseTo(d.D, 0);
          expect(b.size.z, label).toBeCloseTo(d.B, 3);
        }
      }
    }
  }, 600_000);
});

/** a 60 x 60 x 10 plate on the Top Plane with one through hole of diameter D (simple, or a countersink) in the middle */
function plate(D: number, holeType: 'simple' | 'countersink' = 'simple'): Document {
  const doc = createDocument('Plaat');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: -30, y: -30 }, { x: 30, y: -30 }, { x: 30, y: 30 }, { x: -30, y: 30 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  doc.sketches.sk1 = s;
  doc.planes.face = { ...REFERENCE_PLANE_DEFS.top, id: 'face', name: 'Face', origin: [0, 10, 0], kind: 'face' };
  const hole: HoleFeature = { id: 'f3', type: 'hole', name: `Ø${D} Hole1`, suppressed: false, plane: 'face', points: [{ x: 0, y: 0 }], holeType, diameter: D, depth: 0, cbDiameter: D * 1.6, cbDepth: 5, csDiameter: D * 2, csAngle: 90 };
  doc.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false },
    { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    hole,
  ];
  return doc;
}

const slotsFor = (doc: Document) => {
  const asm = createDocument('Asm', 'assembly');
  const c: Component = { id: 'p', name: 'Plaat<1>', part: { ...doc, kind: 'part' }, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false };
  asm.components = [c];
  asm.mates = [];
  return { asm, slots: fastenerSlots(assemblyHoles(asm, rebuildAssembly(asm).bodies)) };
};

describe('Auto Fasteners with the extended Standard Parts', () => {
  it('chooses M16, M20 and M24 from their ISO 273 clearance holes, with a length of the standard range', () => {
    expect(METRIC.map((m) => m.size)).toEqual([...LIBRARY_SIZES]);
    for (const [size, hole] of [['M16', ISO273.M16.medium], ['M20', ISO273.M20.medium], ['M24', ISO273.M24.medium]] as const) {
      const { slots } = slotsFor(plate(hole));
      expect(slots[0]).toMatchObject({ size, type: 'shcs', series: 'medium' });
      expect(fastenerLengths('shcs', size)).toContain(slots[0].length);
    }
    // M20 through 10 mm: 10 + washer 3 + nut 18 + 2 x 2.5 = 36 -> 40 (ISO 4762 M20 runs 30 to 200)
    expect(slotsFor(plate(22)).slots[0].length).toBe(40);
  });

  it('puts the library part in: ISO 4762 M24 in a Ø26 hole, ISO 10642 in a countersink', () => {
    const big = slotsFor(plate(26));
    const placed = placeFasteners(big.asm, big.slots);
    expect(placed.components[0].name).toBe(`ISO 4762 M24 x ${big.slots[0].length}<1>`);
    // the head dk 36 of ISO 4762 M24
    expect(Math.max(...Object.values(placed.components[0].part.sketches.s1.points).map((q) => q.x))).toBeCloseTo(18, 6);
    const csk = slotsFor(plate(6.6, 'countersink'));
    expect(csk.slots[0]).toMatchObject({ size: 'M6', type: 'csk' });
    expect(fastenerLengths('csk', 'M6')).toContain(csk.slots[0].length);
    expect(placeFasteners(csk.asm, csk.slots).components[0].name).toBe(`ISO 10642 M6 x ${csk.slots[0].length}<1>`);
    // a size the standard does not define keeps the general model (ISO 10642 ends at M20)
    expect(fastenerPart('csk', 'M24', 60).name).toBe('ISO 10642 M24 x 60');
    expect(fastenerPart('csk', 'M24', 60).features.length).toBe(4);
    expect(fastenerPart('hex', 'M24', 60).features.map((f) => f.name)).toEqual(['Sketch1', 'Revolve1', 'Sketch2', 'Boss-Extrude1', 'Sketch3', 'Cut-Revolve1']);
  });
});
