/**
 * Topological naming over sweep, loft, pattern and shell (QA report 0.5.11, F47 / parity row 29): a fillet on an edge of
 * a sweep, a loft or a patterned instance must stay on the same edge after an earlier feature changes, and a fillet
 * before a shell must give the closed-form wall. Every model on the mesh kernel (the loss against the part's own
 * faceted sharp body) and on the B-rep kernel (against the closed form, to 0.001 mm³). Since edges of equal length
 * give equal volumes, every test also checks by position which sharp edges are gone and which are still there.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { rebuildDocument } from '../core/features/rebuild';
import { setBrepKernel } from '../core/features/brepKernel';
import { occtKernel } from '../core/occt/brep';
import { meshVolume } from '../core/features/solid';
import { edgeRef, type BodyEdge } from '../core/features/edgesets';
import type { Document } from '../core/document/types';
import { CORNER, edgesAt, edgesThrough, fillet, setLoftDistance, setPathLength, setPatternCount, shell, t4, T4_EXPECT, t5, T5_EXPECT, t6, T6_EXPECT, T6_SHARP, t7, T7_EXPECT, T7_SHARP } from './qaModels';

const LOG = !!process.env.QA_LOG;
const log = (...a: unknown[]) => { if (LOG) console.log(...a); };

const built = (doc: Document) => {
  const r = rebuildDocument(doc);
  expect(Object.keys(r.errors), JSON.stringify(r.errors)).toHaveLength(0);
  expect(r.bodies).toHaveLength(1);
  return r.bodies[0];
};
/** the edge is known by the names of its two faces (a sweep or a loft names its faces after the profile, QA 0.5.11) */
const named = (edge: BodyEdge) => expect(edgeRef(edge).faces, 'the edge reference carries the names of its two faces').toHaveLength(2);
const vol = (doc: Document) => Math.abs(meshVolume(built(doc).geometry));
/** the same part without its fillets */
const sharpOf = (doc: Document) => vol({ ...doc, features: doc.features.filter((f) => (f as { type: string }).type !== 'fillet') });

/** which sharp edges the body still has: [axis, position, expected count (0 = rounded away)] */
type Sharp = ['x' | 'y' | 'z', { x?: number; y?: number; z?: number }, number];
function expectSharp(edges: BodyEdge[], list: Sharp[], what: string): void {
  for (const [axis, at, n] of list) expect(edgesAt(edges, axis, at).length, `${what}: sharp edges along ${axis} at ${JSON.stringify(at)}`).toBe(n);
}
/** T4 with the arc: the rounded edge (through x = 5, y = 3 halfway along the line) is gone, the other three long edges are there */
function expectSharpArc(edges: BodyEdge[], L: number, what: string): void {
  expect(edgesThrough(edges, [5, 3, L / 2]), `${what}: the rounded edge is gone`).toHaveLength(0);
  for (const p of [[-5, 3, L / 2], [5, -3, L / 2], [-5, -3, L / 2]] as [number, number, number][]) expect(edgesThrough(edges, p), `${what}: the edge through ${p} is sharp`).toHaveLength(1);
}

/** the four long edges of T4 / T5 at x = ±a, y = ±b; only the one at (+a, +b) is rounded */
const long4 = (a: number, b: number): Sharp[] => [['z', { x: a, y: b }, 0], ['z', { x: -a, y: b }, 1], ['z', { x: a, y: -b }, 1], ['z', { x: -a, y: -b }, 1]];
/** the top edges at the +x side of the nubs of T6 (x = 15, 35, ...): rounded on the filleted nubs, sharp on the rest */
const nubEdges = (count: number, rounded: number[]): Sharp[] => Array.from({ length: count }, (_, i): Sharp => ['z', { x: 15 + 20 * i, y: 10 }, rounded.includes(i + 1) ? 0 : 1]);
/** the vertical edges of T7, outside and in the cavity: only the pair at the rounded corner is gone */
const T7_EDGES: Sharp[] = [
  ['y', { x: 40, z: -30 }, 0], ['y', { x: 0, z: 0 }, 1], ['y', { x: 40, z: 0 }, 1], ['y', { x: 0, z: -30 }, 1],
  ['y', { x: 39, z: -29 }, 0], ['y', { x: 1, z: -1 }, 1], ['y', { x: 39, z: -1 }, 1], ['y', { x: 1, z: -29 }, 1],
];
/** the material T4 with the arc loses to its round (the swept block by Pappus minus the closed form) */
const T4_ARC_LOSS = (L: number) => 60 * (L + (Math.PI / 2) * 30) - T4_EXPECT(L, true);

/** mesh kernel: the fillet removes `loss` from the part's own sharp body, to 2 % of the loss (at least 0.25, at most 1.5 mm³) */
function meshLoss(doc: Document, loss: number, what: string): BodyEdge[] {
  const b = built(doc);
  const v = Math.abs(meshVolume(b.geometry)), s = sharpOf(doc), got = s - v;
  log(`mesh ${what}: sharp ${s.toFixed(3)}, filleted ${v.toFixed(3)}, loss ${got.toFixed(3)} (exact ${loss.toFixed(3)}, ${(((got - loss) / loss) * 100).toFixed(2)} %)`);
  expect(Math.abs(got - loss), `${what}: loss ${got.toFixed(3)} vs ${loss.toFixed(3)}`).toBeLessThan(Math.min(Math.max(0.02 * loss, 0.25), 1.5));
  return b.edges;
}

describe('QA T4: fillet on an edge of a sweep, then a longer path (mesh kernel)', { timeout: 60000 }, () => {
  it('R1 on the long edge at x = 5, y = 3 of a straight sweep stays on that edge when the path goes from 50 to 70', () => {
    const { doc, edge } = t4(50);
    named(edge);
    doc.features.push(fillet('r1', 1, [edge]));
    expectSharp(meshLoss(doc, 50 * CORNER(1), 'T4 L50'), long4(5, 3), 'T4 L50');
    setPathLength(doc, 50, 70);
    expectSharp(meshLoss(doc, 70 * CORNER(1), 'T4 L70'), long4(5, 3), 'T4 L70');
  });
  it('the same along a path with a quarter arc: the round runs on along the arc, before and after the change', () => {
    const { doc, edge } = t4(50, true);
    named(edge);
    doc.features.push(fillet('r1', 1, [edge]));
    expectSharpArc(meshLoss(doc, T4_ARC_LOSS(50), 'T4 arc L50'), 50, 'T4 arc L50');
    setPathLength(doc, 50, 70);
    expectSharpArc(meshLoss(doc, T4_ARC_LOSS(70), 'T4 arc L70'), 70, 'T4 arc L70');
  });
});

describe('QA T5: fillet on an edge of a loft, then a larger distance (mesh kernel)', { timeout: 60000 }, () => {
  it('R1 on the side edge at x = 10, y = 5 stays on that edge when the profiles go from 30 to 45 apart', () => {
    const { doc, edge } = t5(30);
    named(edge);
    doc.features.push(fillet('r1', 1, [edge]));
    // the lofted block itself (QA 0.5.11 T5: the mesh loft cut two corners of the rectangles off)
    expect(Math.abs(sharpOf(doc) - 20 * 10 * 30)).toBeLessThan(1e-3);
    expectSharp(meshLoss(doc, 30 * CORNER(1), 'T5 h30'), long4(10, 5), 'T5 h30');
    setLoftDistance(doc, 45);
    expect(Math.abs(sharpOf(doc) - 20 * 10 * 45)).toBeLessThan(1e-3);
    expectSharp(meshLoss(doc, 45 * CORNER(1), 'T5 h45'), long4(10, 5), 'T5 h45');
  });
});

describe('QA T6: fillet on an edge of a patterned instance, then more instances (mesh kernel)', { timeout: 60000 }, () => {
  for (const nubs of [[2], [1, 2, 3]]) {
    it(`R1 on the top edge of nub ${nubs.join(', ')} stays on ${nubs.length > 1 ? 'those nubs' : 'that nub'} when the pattern goes from 3 to 5`, () => {
      const { doc, edges } = t6(3, nubs);
      doc.features.push(fillet('r1', 1, edges));
      expect(Math.abs(sharpOf(doc) - T6_SHARP(3))).toBeLessThan(1e-3);
      expectSharp(meshLoss(doc, nubs.length * 10 * CORNER(1), `T6 ${nubs} x3`), nubEdges(3, nubs), 'T6 x3');
      setPatternCount(doc, 5);
      expect(Math.abs(sharpOf(doc) - T6_SHARP(5))).toBeLessThan(1e-3);
      expectSharp(meshLoss(doc, nubs.length * 10 * CORNER(1), `T6 ${nubs} x5`), nubEdges(5, nubs), 'T6 x5');
    });
  }
});

describe('QA T7: fillet before a shell (mesh kernel)', { timeout: 60000 }, () => {
  it('R2 on a vertical edge, then a shell of 1 with the top open: the wall is rounded R2 outside and R1 inside', () => {
    const { doc, edge } = t7();
    doc.features.push(fillet('r1', 2, [edge]));
    doc.features.push(shell('sh1', 1));
    expect(Math.abs(sharpOf(doc) - T7_SHARP())).toBeLessThan(1e-3);
    expectSharp(meshLoss(doc, T7_SHARP() - T7_EXPECT(), 'T7'), T7_EDGES, 'T7');
  });
});

describe('QA T4-T7 on the B-rep kernel', { timeout: 120000 }, () => {
  beforeAll(async () => {
    const require = createRequire(import.meta.url);
    const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
    const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
    const replicad = await import('replicad');
    replicad.setOC(OC as never);
    setBrepKernel(occtKernel(OC, replicad));
  }, 60000);
  afterAll(() => setBrepKernel(null));
  /** the exact volume to 0.001 mm³; returns the edges of the tessellated exact body */
  const exact = (doc: Document, want: number, what: string): BodyEdge[] => {
    const b = built(doc);
    expect(b.exact, `${what}: the body is exact`).toBe(true);
    log(`brep ${what}: ${b.exactVolume!.toFixed(4)} vs ${want.toFixed(4)} (${(b.exactVolume! - want).toExponential(2)})`);
    expect(Math.abs(b.exactVolume! - want), `${what}: ${b.exactVolume!.toFixed(4)} vs ${want.toFixed(4)}`).toBeLessThan(1e-3);
    return b.edges;
  };

  it('T4: R1 on a sweep edge follows the path from 50 to 70', () => {
    const { doc, edge } = t4(50);
    named(edge);
    doc.features.push(fillet('r1', 1, [edge]));
    expectSharp(exact(doc, T4_EXPECT(50), 'T4 L50'), long4(5, 3), 'T4 L50');
    setPathLength(doc, 50, 70);
    expectSharp(exact(doc, T4_EXPECT(70), 'T4 L70'), long4(5, 3), 'T4 L70');
  });
  it('T4: the same along a path with a quarter arc', () => {
    const { doc, edge } = t4(50, true);
    named(edge);
    doc.features.push(fillet('r1', 1, [edge]));
    expectSharpArc(exact(doc, T4_EXPECT(50, true), 'T4 arc L50'), 50, 'T4 arc L50');
    setPathLength(doc, 50, 70);
    expectSharpArc(exact(doc, T4_EXPECT(70, true), 'T4 arc L70'), 70, 'T4 arc L70');
  });
  it('T5: R1 on a loft edge follows the distance from 30 to 45', () => {
    const { doc, edge } = t5(30);
    named(edge);
    doc.features.push(fillet('r1', 1, [edge]));
    expectSharp(exact(doc, T5_EXPECT(30), 'T5 h30'), long4(10, 5), 'T5 h30');
    setLoftDistance(doc, 45);
    expectSharp(exact(doc, T5_EXPECT(45), 'T5 h45'), long4(10, 5), 'T5 h45');
  });
  for (const nubs of [[2], [1, 2, 3]]) {
    it(`T6: R1 on nub ${nubs.join(', ')} stays there when the pattern goes from 3 to 5`, () => {
      const { doc, edges } = t6(3, nubs);
      doc.features.push(fillet('r1', 1, edges));
      expectSharp(exact(doc, T6_EXPECT(3, nubs.length), `T6 ${nubs} x3`), nubEdges(3, nubs), 'T6 x3');
      setPatternCount(doc, 5);
      expectSharp(exact(doc, T6_EXPECT(5, nubs.length), `T6 ${nubs} x5`), nubEdges(5, nubs), 'T6 x5');
    });
  }
  it('T7: fillet R2, then a shell of 1 with the top open', () => {
    const { doc, edge } = t7();
    doc.features.push(fillet('r1', 2, [edge]));
    doc.features.push(shell('sh1', 1));
    expectSharp(exact(doc, T7_EXPECT(), 'T7'), T7_EDGES, 'T7');
  });
});
