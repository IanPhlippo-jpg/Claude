/**
 * The team round of QA report 0.5.11, as tests with asserts:
 * - F177: T3 (a fillet R2 on an edge that a slot inserted before it splits) and then the plate made longer, 80 -> 100:
 *   both pieces (35 + 55 mm) stay rounded, on the mesh kernel and on the B-rep kernel (the fillet used to round only
 *   the near piece, silently: +47.212 mm³);
 * - F178: the curved edge of an exact body is one edge (a quarter round R10 was 32 straight edges of 0.491 mm): with
 *   its tangent lines one chain, as tangent propagation selects it, and a fillet R2 on it removes the corner along the
 *   lines plus the Pappus volume along the round.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { rebuildDocument } from '../core/features/rebuild';
import { setBrepKernel } from '../core/features/brepKernel';
import { occtKernel } from '../core/occt/brep';
import { meshVolume } from '../core/features/solid';
import { CORNER, CORNER_K, PI, fillet, t3, t3Slot } from './qaModels';
import { addArc, addLine, createSketch } from '../core/sketch/model';
import { createDocument, type Document } from '../core/document/types';

let kernel: ReturnType<typeof occtKernel>;
beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
  const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
  const replicad = await import('replicad');
  replicad.setOC(OC as never);
  kernel = occtKernel(OC, replicad);
}, 60000);
afterAll(() => setBrepKernel(null));

const clone = (d: Document): Document => JSON.parse(JSON.stringify(d));
function build(doc: Document, exact: boolean) {
  setBrepKernel(exact ? kernel : null);
  const r = rebuildDocument(clone(doc));
  setBrepKernel(null);
  expect(Object.keys(r.errors), JSON.stringify(r.errors)).toHaveLength(0);
  expect(r.warnings ?? {}, JSON.stringify(r.warnings)).toEqual({});
  const b = r.bodies[0];
  return { v: exact ? b.exactVolume! : Math.abs(meshVolume(b.geometry)), b };
}
/** the plate sketch of T3 made longer: every point at x = 80 moves to x = len */
function lengthen(doc: Document, len: number) {
  for (const p of Object.values(doc.sketches.s1.points)) if (Math.abs(p.x - 80) < 1e-9) p.x = len;
}

describe('QA 0.5.11 F177: a fillet on a split edge after the part got longer', { timeout: 120000 }, () => {
  // 100 x 40 x 10, the slot 10 x 15 through, both pieces of the edge (35 + 55 = 90 mm) rounded with R2
  const EXPECT = 100 * 40 * 10 - 10 * 15 * 10 - 90 * CORNER(2);
  for (const exact of [false, true]) {
    it(`rounds both pieces on the ${exact ? 'B-rep' : 'mesh'} kernel (${EXPECT.toFixed(3)} mm³)`, () => {
      const { doc, edge } = t3();
      doc.features.push(fillet('r1', 2, [edge]));
      t3Slot(doc, 'through');
      doc.features.splice(1, 0, doc.features.pop()!);
      lengthen(doc, 100);
      const { v } = build(doc, exact);
      // the mesh against its own faceted sharp plate (no curved faces besides the round: the facets of R2 only)
      expect(Math.abs(v - EXPECT), `${v.toFixed(3)} vs ${EXPECT.toFixed(3)}`).toBeLessThan(exact ? 1e-3 : 1.5);
    });
  }
  it('without the slot the longer edge is one piece and rounded whole (B-rep)', () => {
    const { doc, edge } = t3();
    doc.features.push(fillet('r1', 2, [edge]));
    lengthen(doc, 100);
    const { v } = build(doc, true);
    expect(Math.abs(v - (100 * 40 * 10 - 100 * CORNER(2)))).toBeLessThan(1e-3);
  });
});

describe('QA 0.5.11 F178: the curved edge of an exact body is one edge', { timeout: 120000 }, () => {
  /** plate 80 x 40 x 10 with one corner rounded R10 in the sketch (top plane: sketch y = -world z) */
  function plate(): Document {
    const doc = createDocument();
    let s = createSketch('s1', 's1', 'top');
    s = addLine(s, { x: 0, y: 0 }, { x: 70, y: 0 })[0];
    s = addArc(s, { x: 70, y: 10 }, { x: 70, y: 0 }, { x: 80, y: 10 }, true)[0];
    s = addLine(s, { x: 80, y: 10 }, { x: 80, y: 40 })[0];
    s = addLine(s, { x: 80, y: 40 }, { x: 0, y: 40 })[0];
    s = addLine(s, { x: 0, y: 40 }, { x: 0, y: 0 })[0];
    doc.sketches.s1 = s;
    doc.features.push({ id: 'e1', type: 'extrude', name: 'e1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false } as never);
    return doc;
  }
  const SHARP = 80 * 40 * 10 - (100 - 25 * PI) * 10;
  it('the top rim with the round is one tangent chain (line 70, round R10, line 30) on both kernels', () => {
    for (const exact of [false, true]) {
      const { v, b } = build(plate(), exact);
      if (exact) expect(Math.abs(v - SHARP)).toBeLessThan(1e-3);
      const arcs = b.edges.filter((e) => !e.straight && Math.abs(e.centroid.y - 10) < 0.5);
      expect(arcs.length, `${exact ? 'B-rep' : 'mesh'}: ${b.edges.filter((e) => Math.abs(e.centroid.y - 10) < 0.5).map((e) => (e.straight ? 'L' : 'C') + e.length.toFixed(3)).join(' ')}`).toBe(1);
      expect(Math.abs(arcs[0].length - (70 + 5 * PI + 30)), `${exact ? 'B-rep' : 'mesh'} ${arcs[0].length.toFixed(3)}`).toBeLessThan(0.05);
    }
  });
  it('a fillet R2 on that chain removes 100 mm of corner plus the Pappus volume of the round (B-rep exact, mesh to 2 %)', () => {
    // the lines: 100 mm of CORNER(2); the round: CORNER(2) turned around the arc's axis at the radius of its centroid
    // (10 - k·2, the corner lies inside the round) over 90°
    const loss = 100 * CORNER(2) + CORNER(2) * (PI / 2) * (10 - CORNER_K * 2);
    for (const exact of [false, true]) {
      const doc = plate();
      const b = build(doc, false).b;
      const rim = b.edges.find((e) => !e.straight && Math.abs(e.centroid.y - 10) < 0.5)!;
      doc.features.push(fillet('r1', 2, [rim]));
      const { v } = build(doc, exact);
      const lost = (exact ? SHARP : build(plate(), false).v) - v;
      expect(Math.abs(lost - loss) / loss, `${exact ? 'B-rep' : 'mesh'} loss ${lost.toFixed(3)} vs ${loss.toFixed(3)}`).toBeLessThan(exact ? 1e-4 : 0.02);
    }
  });
});
