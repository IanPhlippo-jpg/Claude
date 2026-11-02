/**
 * Strict QA tests on the B-rep kernel (QA report 0.5.10, F152): the exact volume after a fillet must be the known
 * closed-form value to 0.01 mm³ (F140: a fillet on a split edge must round both pieces and nothing else).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { rebuildDocument } from '../core/features/rebuild';
import { setBrepKernel } from '../core/features/brepKernel';
import { occtKernel } from '../core/occt/brep';
import { edgeRef } from '../core/features/edgesets';
import { meshVolume } from '../core/features/solid';
import { extrude, fillet, holeVariant, PI, rect, setCircleRadius, t1, T1_EXPECT, t3, t3Slot, T3_WITH_SLOT_EXPECT, TOP_FACE } from './qaModels';
import { addCircle, createSketch } from '../core/sketch/model';
import { createDocument } from '../core/document/types';

let kernel: ReturnType<typeof occtKernel>;
beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
  const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
  const replicad = await import('replicad');
  replicad.setOC(OC as never);
  kernel = occtKernel(OC, replicad);
  setBrepKernel(kernel);
}, 60000);
afterAll(() => setBrepKernel(null));

const exact = (doc: Parameters<typeof rebuildDocument>[0]) => {
  const r = rebuildDocument(doc);
  expect(Object.keys(r.errors), JSON.stringify(r.errors)).toHaveLength(0);
  expect(r.bodies[0].exact).toBe(true);
  return r.bodies[0].exactVolume!;
};

describe('QA T1 on the B-rep kernel', { timeout: 60000 }, () => {
  it('fillet R2 on the rim of a Ø35 hole is exact and follows the hole to Ø50', () => {
    const { doc, rim } = t1(17.5);
    doc.features.push(fillet('r1', 2, [rim]));
    expect(Math.abs(exact(doc) - T1_EXPECT(17.5))).toBeLessThan(0.01);
    setCircleRadius(doc, 's1', 25);
    expect(Math.abs(exact(doc) - T1_EXPECT(25))).toBeLessThan(0.01);
  });
  for (const how of ['cut', 'holeTool', 'bottomRim'] as const) {
    it(`the same on the rim of a hole made by ${how}`, () => {
      const { doc, rim } = holeVariant(how);
      doc.features.push(fillet('r1', 2, [rim]));
      expect(Math.abs(exact(doc) - T1_EXPECT(17.5))).toBeLessThan(0.01);
    });
  }
  it('an edge picked on the mesh body (its reference carries the face names) is found on the exact body', () => {
    setBrepKernel(null);
    const { doc, rim } = t1(17.5);
    setBrepKernel(kernel);
    doc.features.push({ id: 'r1', type: 'fillet', name: 'r1', suppressed: false, size: 2, edges: [edgeRef(rim)] } as never);
    expect(Math.abs(exact(doc) - T1_EXPECT(17.5))).toBeLessThan(0.01);
  });
});

describe('QA T3 on the B-rep kernel', { timeout: 60000 }, () => {
  for (const slot of ['through', 'throughFromFace', 'blind5', 'stadium'] as const) {
    it(`a fillet on an edge split by a slot inserted before it rounds both pieces and nothing else (${slot}: ${T3_WITH_SLOT_EXPECT(slot).toFixed(2)} mm³)`, () => {
      const { doc, edge } = t3();
      doc.features.push(fillet('r1', 2, [edge]));
      t3Slot(doc, slot);
      doc.features.splice(1, 0, doc.features.pop()!);
      const v = exact(doc);
      expect(Math.abs(v - T3_WITH_SLOT_EXPECT(slot)), `${v.toFixed(3)} vs ${T3_WITH_SLOT_EXPECT(slot).toFixed(3)}`).toBeLessThan(0.01);
    });
  }
  it('the same with the edge picked on the mesh body', () => {
    setBrepKernel(null);
    const { doc, edge } = t3();
    setBrepKernel(kernel);
    doc.features.push({ id: 'r1', type: 'fillet', name: 'r1', suppressed: false, size: 2, edges: [edgeRef(edge)] } as never);
    t3Slot(doc, 'through');
    doc.features.splice(1, 0, doc.features.pop()!);
    expect(Math.abs(exact(doc) - T3_WITH_SLOT_EXPECT('through'))).toBeLessThan(0.01);
  });
});

describe('plastic part features on the B-rep kernel (QA F51/F121)', { timeout: 60000 }, () => {
  it('a Dome on a round pad is an exact sphere segment', () => {
    const doc = createDocument();
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 60);
    doc.features.push(extrude('e1', 's1', 'boss', 10));
    let c = createSketch('s2', 's2', 'f1');
    doc.planes.f1 = TOP_FACE as never;
    c = addCircle(c, { x: 40, y: 30 }, 15)[0];
    doc.sketches.s2 = c;
    doc.features.push(extrude('e2', 's2', 'boss', 5));
    const b0 = rebuildDocument(doc).bodies[0];
    expect(b0.exact).toBe(true);
    // the top face of the pad: planar, at y = 15
    const face = b0.faces.find((f) => !f.curved && Math.abs(f.centroid[1] - 15) < 1e-3)!;
    doc.features.push({ id: 'd1', type: 'dome', name: 'Dome1', suppressed: false, face: { normal: face.normal, point: face.centroid }, distance: 6 } as never);
    const v = exact(doc);
    // a cap of height 6 on a circle of radius 15: sphere radius (15² + 6²) / 12 = 21.75
    const cap = (PI * 36 * (3 * 21.75 - 6)) / 3;
    expect(Math.abs(v - (80 * 60 * 10 + PI * 225 * 5 + cap))).toBeLessThan(0.01);
    // the tessellation of the exact body (what the viewport and the e2e measure) carries the dome too
    const shown = Math.abs(meshVolume(rebuildDocument(doc).bodies[0].geometry));
    expect(Math.abs(shown - v) / v, `tessellation ${shown.toFixed(1)} vs exact ${v.toFixed(1)}`).toBeLessThan(0.01);
    (doc.features[2] as { reverse?: boolean }).reverse = true;
    const v2 = exact(doc);
    expect(Math.abs(v2 - (80 * 60 * 10 + PI * 225 * 5 - cap))).toBeLessThan(0.01);
  });
});

describe('QA wrap on the B-rep kernel', { timeout: 60000 }, () => {
  // the e2e model (e2e/wrap.mjs): a Ø40 x 60 roll along Y, a 10 x 10 patch on the Front plane at y 25..35 wrapped on it
  const roll = (kind: 'emboss' | 'deboss') => {
    const s1 = addCircle(createSketch('s1', 's1', 'top'), { x: 0, y: 0 }, 20)[0];
    const s2 = rect('s2', 'front', -5, 25, 5, 35);
    const doc = { ...createDocument('Rol'), sketches: { s1, s2 } };
    doc.features = [
      { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false } as never,
      extrude('f1', 's1', 'boss', 60),
      { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false } as never,
      { id: 'w1', type: 'wrap', name: 'Wrap1', sketchId: 's2', suppressed: false, kind, depth: 2, face: { center: [0, 0, 0], axis: [0, 1, 0], radius: 20, label: 'Face<1>' } } as never,
    ];
    return doc;
  };
  const cylinder = PI * 20 * 20 * 60;
  it('Emboss 2 mm keeps the roll exact and adds the wrapped patch (release path, was 138 of 210 as a faceted body)', () => {
    const add = (10 / 20) * ((22 * 22 - 20 * 20) / 2) * 10;
    expect(Math.abs(exact(roll('emboss')) - cylinder - add) / add).toBeLessThan(0.05);
  });
  it('Deboss 2 mm keeps the roll exact and cuts the patch (was 262 of 190)', () => {
    const cut = (10 / 20) * ((20 * 20 - 18 * 18) / 2) * 10;
    expect(Math.abs(cylinder - exact(roll('deboss')) - cut) / cut).toBeLessThan(0.05);
  });
});
