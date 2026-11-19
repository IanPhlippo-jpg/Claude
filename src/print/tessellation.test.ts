import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createDocument } from '../core/document/types';
import { addCircle, createSketch } from '../core/sketch/model';
import { rebuildDocument } from '../core/features/rebuild';
import { brepKernel, PRINT_ANGULAR_TOLERANCE, setBrepKernel } from '../core/features/brepKernel';
import { meshVolume } from '../core/features/solid';
import { occtKernel } from '../core/occt/brep';

// docs/35 phase 1 condition (docs/34 3.1): the mesh the slicer gets from an exact body (its own B-rep tessellation,
// chord 0.01 mm, angle PRINT_ANGULAR_TOLERANCE = 0.07 rad = 4 degrees) keeps the volume of the kernel within 0.1 %; the
// screen and the rebuild keep 0.1 rad (docs/35 H-6)
describe('tessellation for the slicer', () => {
  beforeAll(async () => {
    const require = createRequire(import.meta.url);
    const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
    const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
    const replicad = await import('replicad');
    replicad.setOC(OC as never);
    setBrepKernel(occtKernel(OC, replicad));
  }, 600_000);
  afterAll(() => setBrepKernel(null));

  it('cylinders of 4, 20 and 80 mm: the slicer mesh within 0.1 % of the exact volume; the screen mesh stays at 0.1 rad', () => {
    for (const r of [2, 10, 40]) {
      const doc = createDocument('Cyl');
      doc.sketches.s1 = addCircle(createSketch('s1', 's1', 'top'), { x: 0, y: 0 }, r)[0];
      doc.features.push({ id: 's1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false } as never);
      doc.features.push({ id: 'e1', type: 'extrude', name: 'Boss', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false } as never);
      const res = rebuildDocument(doc);
      const b = res.bodies[0];
      expect(b.exact, `r=${r}`).toBe(true);
      const fine = brepKernel()!.tessellate(res.brep![b.id], PRINT_ANGULAR_TOLERANCE);
      const mesh = Math.abs(meshVolume(fine));
      expect(Math.abs(mesh - b.exactVolume!) / b.exactVolume!, `r=${r}: ${mesh} vs ${b.exactVolume}`).toBeLessThan(0.001);
      // the screen mesh: coarser (0.1 rad), so fewer triangles where the angle rules (small radii; at 40 mm the chord does)
      const screen = b.geometry.getAttribute('position').count, slicer = fine.getAttribute('position').count;
      if (r <= 10) expect(screen, `r=${r}: ${screen} vs ${slicer}`).toBeLessThan(slicer);
    }
  }, 600_000);
});
