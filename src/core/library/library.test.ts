import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type Component, type Document, type ExtrudeFeature, type HoleFeature, type SketchFeature } from '../document/types';
import { REFERENCE_PLANE_DEFS } from '../features/planes';
import { rebuildDocument } from '../features/rebuild';
import { meshVolume } from '../features/solid';
import { rebuildAssembly } from '../assembly/assembly';
import { assemblyHoles, fastenerSlots, placeFasteners } from '../assembly/fasteners';
import { ISO273, LIBRARY_SIZES, requiredScrewLength, screwLengthFor, screwLengths, sizeForClearanceHole, type LibrarySize } from './iso';
import { screwChamfers, standardPart, standardPartCatalog, standardPartDimensions, standardPartName } from './parts';

// the reference values of the standards, written out once more by hand (size: values) so a slip in iso.ts shows
const REF_4762 = 'M3 5.5 3 2.5 1.3|M4 7 4 3 2|M5 8.5 5 4 2.5|M6 10 6 5 3|M8 13 8 6 4|M10 16 10 8 5|M12 18 12 10 6'; // dk k s t
const REF_4032 = 'M3 5.5 2.4|M4 7 3.2|M5 8 4.7|M6 10 5.2|M8 13 6.8|M10 16 8.4|M12 18 10.8'; // s m
const REF_7089 = 'M3 3.2 7 0.5|M4 4.3 9 0.8|M5 5.3 10 1|M6 6.4 12 1.6|M8 8.4 16 1.6|M10 10.5 20 2|M12 13 24 2.5'; // d1 d2 h
const REF_273 = 'M3 3.2 3.4 3.6|M4 4.3 4.5 4.8|M5 5.3 5.5 5.8|M6 6.4 6.6 7|M8 8.4 9 10|M10 10.5 11 12|M12 13 13.5 14.5'; // fine medium coarse
const ref = (t: string) => Object.fromEntries(t.split('|').map((r) => { const [k, ...v] = r.split(' '); return [k, v.map(Number)]; })) as Record<LibrarySize, number[]>;

const built = (doc: Document) => {
  const r = rebuildDocument(doc, null);
  expect(r.errors).toEqual({});
  expect(r.bodies.length).toBe(1);
  const g = r.bodies[0].geometry;
  g.computeBoundingBox();
  return { volume: meshVolume(g), box: g.boundingBox! };
};
const size = (b: THREE.Box3) => b.getSize(new THREE.Vector3());

describe('Standard Parts library', () => {
  it('holds at least 30 parts, each with its own designation', () => {
    const all = standardPartCatalog();
    expect(all.length).toBeGreaterThanOrEqual(30);
    expect(new Set(all.map(standardPartName)).size).toBe(all.length);
    expect(all.filter((p) => p.standard === 'iso4032').length).toBe(7);
    expect(all.filter((p) => p.standard === 'iso7089').length).toBe(7);
    // the lengths of a screw stay in its standard range (M6: 10 to 60)
    expect(screwLengths('M6')).toEqual([10, 12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
    expect(standardPartName({ standard: 'iso4762', size: 'M6', length: 20 })).toBe('ISO 4762 M6 x 20');
  });

  it('every part carries the dimensions of its standard table', () => {
    const r4762 = ref(REF_4762), r4032 = ref(REF_4032), r7089 = ref(REF_7089);
    for (const p of standardPartCatalog()) {
      const d = standardPartDimensions(p);
      if (p.standard === 'iso4762') expect([d.dk, d.k, d.s, d.t]).toEqual(r4762[p.size]);
      else if (p.standard === 'iso4032') expect([d.s, d.m]).toEqual(r4032[p.size]);
      else expect([d.d1, d.d2, d.h]).toEqual(r7089[p.size]);
      // the part document is built from these values: its sketches hold the outline of the table
      const doc = standardPart(p);
      expect(doc.name).toBe(standardPartName(p));
      const xs = Object.values(doc.sketches.s1.points).map((q) => q.x);
      if (p.standard === 'iso4762') {
        // the outline (off the axis line): sketch y = -z
        const ys = Object.values(doc.sketches.s1.points).filter((q) => q.x > 1e-9).map((q) => q.y);
        expect(Math.max(...xs)).toBeCloseTo(d.dk / 2, 6); // head diameter dk
        expect(Math.max(...ys)).toBeCloseTo(d.l, 6); // shank down to -l
        expect(Math.min(...ys)).toBeCloseTo(-d.k, 6); // head height k
      } else if (p.standard === 'iso7089') {
        expect(Math.max(...xs)).toBeCloseTo(d.d2 / 2, 6);
      }
    }
  });

  it('screws, nuts and washers rebuild to the main dimensions of the standard', () => {
    for (const z of LIBRARY_SIZES) {
      const l = screwLengths(z)[2];
      const sc = standardPartDimensions({ standard: 'iso4762', size: z, length: l });
      const a = built(standardPart({ standard: 'iso4762', size: z, length: l }));
      const sa = size(a.box);
      expect(sa.x).toBeCloseTo(sc.dk, 1); // head diameter
      expect(a.box.max.z).toBeCloseTo(sc.k, 3); // head height above the bearing face
      expect(a.box.min.z).toBeCloseTo(-l, 3); // nominal length under the head

      const nt = standardPartDimensions({ standard: 'iso4032', size: z });
      const b = built(standardPart({ standard: 'iso4032', size: z }));
      const sb = size(b.box);
      expect(sb.z).toBeCloseTo(nt.m, 3); // height m
      expect(sb.y).toBeCloseTo(nt.s, 2); // across flats s
      expect(sb.x).toBeLessThanOrEqual((2 * nt.s) / Math.sqrt(3) + 1e-3); // across corners
      const hexArea = (Math.sqrt(3) / 2) * nt.s ** 2, hole = Math.PI * (nt.d / 2) ** 2;
      expect(b.volume).toBeLessThan((hexArea - hole) * nt.m); // the chamfer took material from the corners
      expect(b.volume).toBeGreaterThan((hexArea - hole) * nt.m * 0.85);

      const w = standardPartDimensions({ standard: 'iso7089', size: z });
      const c = built(standardPart({ standard: 'iso7089', size: z }));
      expect(size(c.box).x).toBeCloseTo(w.d2, 1);
      expect(size(c.box).z).toBeCloseTo(w.h, 3);
      const ring = (Math.PI / 4) * (w.d2 ** 2 - w.d1 ** 2) * w.h;
      expect(Math.abs(c.volume - ring) / ring).toBeLessThan(0.02);
    }
  }, 60000); // 21 rebuilds: more than the default 5 s when the suite runs in parallel

  it('volume of ISO 4762 M6 x 20 within 2 % of the hand calculation (cylinder + head - chamfers - socket)', () => {
    const d = 6, l = 20, dk = 10, k = 6, s = 5, t = 3;
    const { tip, head } = screwChamfers('M6');
    const r = d / 2, R = dk / 2;
    // a 45° chamfer ring of leg c at radius x removes 2π (x - c/3) c²/2 (Pappus)
    const ringCut = (x: number, c: number) => 2 * Math.PI * (x - c / 3) * (c * c) / 2;
    const expected = Math.PI * r * r * l + Math.PI * R * R * k - ringCut(r, tip) - ringCut(R, head) - (Math.sqrt(3) / 2) * s * s * t;
    const v = built(standardPart({ standard: 'iso4762', size: 'M6', length: 20 })).volume;
    expect(Math.abs(v - expected) / expected).toBeLessThan(0.02);
  });

  it('ISO 273 clearance holes give the screw size: Ø6.6 -> M6, Ø9 -> M8, every series of every size', () => {
    expect(sizeForClearanceHole(6.6)).toEqual({ size: 'M6', series: 'medium', clearance: 6.6 });
    expect(sizeForClearanceHole(9)).toEqual({ size: 'M8', series: 'medium', clearance: 9 });
    expect(sizeForClearanceHole(7)?.size).toBe('M6');
    expect(sizeForClearanceHole(10)).toMatchObject({ size: 'M8', series: 'coarse' });
    expect(sizeForClearanceHole(5.3)).toMatchObject({ size: 'M5', series: 'fine' });
    expect(sizeForClearanceHole(3)).toBeNull();
    const r273 = ref(REF_273);
    for (const z of LIBRARY_SIZES) {
      expect([ISO273[z].fine, ISO273[z].medium, ISO273[z].coarse]).toEqual(r273[z]);
      for (const series of ['fine', 'medium', 'coarse'] as const) expect(sizeForClearanceHole(ISO273[z][series])).toEqual({ size: z, series, clearance: ISO273[z][series] });
    }
  });

  it('the length comes from the standard series and reaches through the plates, a washer and a nut', () => {
    // M6, 20 mm of plates: 20 + 1.6 + 5.2 + 2 = 28.8 -> 30
    expect(requiredScrewLength('M6', 20)).toBeCloseTo(28.8, 6);
    expect(screwLengthFor('M6', requiredScrewLength('M6', 20))).toBe(30);
    // M8 through 10 mm: 10 + 1.6 + 6.8 + 2.5 = 20.9 -> 25; past the range the longest length of the size
    expect(screwLengthFor('M8', requiredScrewLength('M8', 10))).toBe(25);
    expect(screwLengthFor('M3', 80)).toBe(30);
    // into a tapped hole the grip itself
    expect(requiredScrewLength('M6', 16, true)).toBe(16);
  });

  it('Auto Fasteners on a plate with a Ø9 hole puts an ISO 4762 M8 screw of the standard series in it', () => {
    const asm = createDocument('Asm', 'assembly');
    const c: Component = { id: 'p', name: 'Plaat<1>', part: { ...plate(9), kind: 'part' }, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false };
    asm.components = [c];
    asm.mates = [];
    const slots = fastenerSlots(assemblyHoles(asm, rebuildAssembly(asm).bodies));
    expect(slots.length).toBe(1);
    expect(slots[0]).toMatchObject({ size: 'M8', series: 'medium', type: 'shcs', length: 25 });
    const placed = placeFasteners(asm, slots);
    expect(placed.components[0].name).toBe('ISO 4762 M8 x 25<1>');
    // the screw is the library part (head dk 13 of ISO 4762)
    expect(Math.max(...Object.values(placed.components[0].part.sketches.s1.points).map((q) => q.x))).toBeCloseTo(6.5, 6);
    // after the mates solve: the head on the top face (y = 10 .. 10 + k), the shank down through the plate
    const r = rebuildAssembly({ ...asm, components: [c, ...placed.components], mates: placed.mates });
    const body = r.bodies.find((x) => x.id === placed.components[0].id)!;
    const bb = new THREE.Box3().setFromBufferAttribute(body.geometry.getAttribute('position') as THREE.BufferAttribute);
    expect(bb.max.y).toBeCloseTo(10 + 8, 3); // head k = 8 above the top face
    expect(bb.min.y).toBeCloseTo(10 - 25, 3); // the 25 long shank down through the 10 thick plate
  });
});

/** a 40 x 40 x 10 plate on the Top Plane with one through hole of diameter D in the middle of the top face */
function plate(D: number): Document {
  const doc = createDocument('Plaat');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: -20, y: -20 }, { x: 20, y: -20 }, { x: 20, y: 20 }, { x: -20, y: 20 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  doc.sketches.sk1 = s;
  doc.planes.face = { ...REFERENCE_PLANE_DEFS.top, id: 'face', name: 'Face', origin: [0, 10, 0], kind: 'face' };
  const ex: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false };
  const hole: HoleFeature = { id: 'f3', type: 'hole', name: `Ø${D} Diameter Hole1`, suppressed: false, plane: 'face', points: [{ x: 0, y: 0 }], holeType: 'simple', diameter: D, depth: 0, cbDiameter: 11, cbDepth: 6.4, csDiameter: 12.4, csAngle: 90 };
  doc.features = [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature, ex, hole];
  return doc;
}
