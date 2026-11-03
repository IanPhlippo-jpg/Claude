/**
 * The cross-check between the kernels catches one wrong feature (QA report 0.5.11, F172 and plan P0-2): a fillet the
 * mesh kernel skipped, or one edge too many rounded on the exact body (10 mm × R2 = 8.58 mm³, 0.03 % of the body,
 * far under the 0.5 % of the volume check). Correct parts stay quiet.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { rebuildDocument } from '../core/features/rebuild';
import { setBrepKernel } from '../core/features/brepKernel';
import { occtKernel } from '../core/occt/brep';
import { shapeDeviation, shapeMismatch, shapeTolerance, volumeMismatch } from '../core/features/volumeCheck';
import { meshVolume } from '../core/features/solid';
import { extrude, fillet, rect, t1, t3, t3Slot, TOP_FACE } from './qaModels';
import * as THREE from 'three';
import { addArc, addCircle, addLine, createSketch } from '../core/sketch/model';
import { createDocument, type Document } from '../core/document/types';
import { edgeRef, type BodyEdge } from '../core/features/edgesets';
import { sweepGeometry } from '../core/features/sweep';
import { sweptFlangeRegions } from '../core/features/sheetmetal4';
import { REFERENCE_PLANE_DEFS } from '../core/features/planes';

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
/** the body of a document on the mesh kernel and on the exact kernel */
function mesh(doc: Document) {
  setBrepKernel(null);
  const r = rebuildDocument(clone(doc));
  expect(Object.keys(r.errors), JSON.stringify(r.errors)).toHaveLength(0);
  return r.bodies[0];
}
function exact(doc: Document) {
  setBrepKernel(kernel);
  const r = rebuildDocument(clone(doc));
  setBrepKernel(null);
  expect(Object.keys(r.errors), JSON.stringify(r.errors)).toHaveLength(0);
  expect(r.bodies[0].exact).toBe(true);
  return r.bodies[0];
}
/** both checks as brepRefine runs them */
const check = (m: ReturnType<typeof mesh>, e: ReturnType<typeof exact>) =>
  volumeMismatch(Math.abs(meshVolume(m.geometry)), e.exactVolume ?? 0) ?? shapeMismatch(m.geometry, e.geometry);
const dev = (m: ReturnType<typeof mesh>, e: ReturnType<typeof exact>) => shapeDeviation(m.geometry, e.geometry)!.distance;

/** the vertical 10 mm edge of the T3 plate at the far corner (x 80, z 0) */
function cornerEdge(doc: Document): BodyEdge {
  const b = mesh(doc);
  return b.edges.filter((e) => e.straight && Math.abs(e.length - 10) < 1e-3).reduce((a, x) => (x.centroid.x - x.centroid.z > a.centroid.x - a.centroid.z ? x : a));
}

describe('kernel cross-check on the shape (QA F172)', { timeout: 120000 }, () => {
  it('stays quiet on correct parts: T1 fillet on the rim of a Ø35 hole, T3 with the slot before the fillet', () => {
    const a = t1(17.5);
    a.doc.features.push(fillet('r1', 2, [a.rim]));
    const m1 = mesh(a.doc), e1 = exact(a.doc);
    expect(check(m1, e1)).toBeNull();
    const b = t3();
    b.doc.features.push(fillet('r1', 2, [b.edge]));
    t3Slot(b.doc, 'through');
    b.doc.features.splice(1, 0, b.doc.features.pop()!);
    const m3 = mesh(b.doc), e3 = exact(b.doc);
    expect(check(m3, e3)).toBeNull();
    // both tessellations stay a few hundredths from the true surface: a fifth of the tolerance at most
    expect(dev(m1, e1)).toBeLessThan(shapeTolerance(m1.geometry) / 2);
    expect(dev(m3, e3)).toBeLessThan(shapeTolerance(m3.geometry) / 2);
  });

  it('speaks when the mesh kernel skipped the fillet of T3 (the volume differs by 0.2 % only)', () => {
    const { doc, edge } = t3();
    const sharp = mesh(doc);
    doc.features.push(fillet('r1', 2, [edge]));
    const e = exact(doc);
    expect(volumeMismatch(Math.abs(meshVolume(sharp.geometry)), e.exactVolume!)).toBeNull();
    const w = check(sharp, e);
    expect(w).toMatch(/B-rep and mesh disagree: the exact and the faceted surface lie 0\.\d\d mm apart/);
    // the corner of the sharp edge lies R(√2 − 1) from the round
    expect(dev(sharp, e)).toBeCloseTo(2 * (Math.SQRT2 - 1), 1);
  });

  it('speaks when the exact body rounds one 10 mm edge too many (8.58 mm³, 0.03 % of the body)', () => {
    const { doc, edge } = t3();
    const corner = cornerEdge(doc);
    doc.features.push(fillet('r1', 2, [edge]));
    const m = mesh(doc);
    const extra = clone(doc);
    (extra.features[extra.features.length - 1] as { edges: unknown[] }).edges.push((fillet('x', 2, [corner]) as { edges: unknown[] }).edges[0]);
    const e = exact(extra);
    expect(Math.abs(Math.abs(meshVolume(m.geometry)) - e.exactVolume!)).toBeLessThan(12);
    expect(check(m, e)).toMatch(/B-rep and mesh disagree/);
  });

  it('speaks when the faceted body has a round the exact body lacks', () => {
    const { doc, edge } = t3();
    const sharp = exact(doc);
    doc.features.push(fillet('r1', 2, [edge]));
    const m = mesh(doc);
    expect(check(m, sharp)).toMatch(/B-rep and mesh disagree/);
  });
});

/**
 * The four parts on which the cross-check spoke on the release path (QA 0.5.11, e2e doorhandle and ge): each built on
 * both kernels against its closed-form volume, and the two bodies must have the same shape. The fixes are described
 * in docs/29-parts/kernel-disagreements.md.
 */
describe('kernel disagreements found by the cross-check (QA F172)', { timeout: 120000 }, () => {
  /** the mesh body within `rel` of the expected volume, the B-rep body within 1e-3 mm³, and both the same shape */
  const agree = (doc: Document, expected: number, rel: number) => {
    const m = mesh(doc), e = exact(doc);
    expect(Math.abs(e.exactVolume! - expected)).toBeLessThan(1e-3);
    expect(Math.abs(Math.abs(meshVolume(m.geometry)) - expected)).toBeLessThan(rel * expected);
    expect(shapeMismatch(m.geometry, e.geometry)).toBeNull();
    // the exact body's facets enclose its volume too (a face meshed flat leaves a hole in the picture)
    expect(Math.abs(Math.abs(meshVolume(e.geometry)) - expected)).toBeLessThan(rel * expected);
    return { m, e };
  };

  it('countersink holes: the cone at the placement face, the hole through (the mesh kept the cone inside the hole)', () => {
    const doc = createDocument();
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 40, 40);
    doc.planes.f1 = TOP_FACE as never;
    doc.features.push(extrude('e1', 's1', 'boss', 10));
    doc.features.push({ id: 'h1', type: 'hole', name: 'CSK for M4', suppressed: false, plane: 'f1', points: [{ x: 12, y: 20 }, { x: 28, y: 20 }], holeType: 'countersink', diameter: 4.5, depth: 0, cbDiameter: 8, cbDepth: 4.4, csDiameter: 8.4, csAngle: 90 } as never);
    // the cone (90°) runs from Ø8.4 at the face to the hole's Ø4.5 at h = 1.95 mm
    const r = 2.25, R = 4.2, h = R - r;
    const hole = Math.PI * r * r * 10 + (Math.PI * h / 3) * (R * R + R * r + r * r) - Math.PI * r * r * h;
    agree(doc, 40 * 40 * 10 - 2 * hole, 2e-3);
  });

  it('a Ø16 tube swept along a line and an R25 bend ends square to the bend; a ball revolved onto its end', () => {
    const doc = createDocument();
    const [p0, line] = addLine(createSketch('s3', 'Path', 'top'), { x: 0, y: -38 }, { x: 92, y: -38 });
    doc.sketches.s3 = addArc(p0, { x: 92, y: -13 }, line.p2, { x: 117, y: -13 }, true)[0];
    doc.sketches.s4 = addCircle(createSketch('s4', 'Profile', 'right'), { x: -38, y: 0 }, 8)[0];
    doc.features.push({ id: 'f3', type: 'sweep', name: 'Sweep1', sketchId: 's4', pathSketchId: 's3', suppressed: false, op: 'boss' } as never);
    // Pappus: the profile at right angles to the path, the bend radius larger than the profile's
    const tube = Math.PI * 64 * (92 + (Math.PI * 25) / 2);
    agree(doc, tube, 5e-3);
    // the ball: a half disc on the end cap revolved about its diameter; the half inside the tube adds nothing
    const [b0, arc] = addArc(createSketch('s5', 'Ball', 'top'), { x: 117, y: -13 }, { x: 125, y: -13 }, { x: 109, y: -13 }, true);
    const [b1] = addLine(b0, arc.end, arc.start);
    const [b2, axis] = addLine(b1, { x: 100, y: -13 }, { x: 134, y: -13 }, true);
    doc.sketches.s5 = b2;
    doc.features.push({ id: 'f4', type: 'revolve', name: 'Revolve2', sketchId: 's5', suppressed: false, op: 'boss', axisEntityId: axis.id, angle: 360, reverse: false } as never);
    agree(doc, tube + (2 / 3) * Math.PI * 512, 5e-3);
  });

  it('a cut through the axis of a revolved part leaves no lid over the cut (zero-area triangles at the pole)', () => {
    const doc = createDocument();
    let s1 = createSketch('s1', 'Revolve', 'top');
    const c = [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: -8 }, { x: 0, y: -8 }];
    for (let i = 0; i < 4; i++) s1 = addLine(s1, c[i], c[(i + 1) % 4])[0];
    const [s1a, axis] = addLine(s1, { x: 0, y: 5 }, { x: 0, y: -13 }, true);
    doc.sketches.s1 = s1a;
    // the cut: a D (an R3.5 arc round (0, 3) over the top, 3.2 wide) down to y = -9, past the cylinder's rim
    const rc = 3.5, w = 1.6, d = Math.sqrt(rc * rc - w * w), yk = 3 - d;
    const [s2a, arc] = addArc(createSketch('s2', 'Cut', 'front'), { x: 0, y: 3 }, { x: w, y: yk }, { x: -w, y: yk }, true);
    const [s2b, l1] = addLine(s2a, arc.end, { x: -w, y: -9 });
    const [s2c, l2] = addLine(s2b, l1.p2, { x: w, y: -9 });
    doc.sketches.s2 = addLine(s2c, l2.p2, arc.start)[0];
    doc.features.push({ id: 'f1', type: 'revolve', name: 'Revolve1', sketchId: 's1', suppressed: false, op: 'boss', axisEntityId: axis.id, angle: 360, reverse: false } as never);
    doc.features.push({ id: 'f2', type: 'extrude', name: 'Cut-Extrude1', sketchId: 's2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false } as never);
    // the D's area, less the part of it outside the R8 cylinder (y below -√(64 - x²)), times the height 8
    const dArea = Math.PI * rc * rc - (rc * rc * Math.asin(w / rc) - w * d) + 2 * w * (yk + 9);
    const outside = 2 * w * 9 - (w * Math.sqrt(64 - w * w) + 64 * Math.asin(w / 8));
    agree(doc, Math.PI * 64 * 8 - 8 * (dArea - outside), 5e-3);
  });

  it('Swept Flange along a plate edge: the profile stays as drawn, whichever way the edge runs', () => {
    const doc = createDocument();
    doc.sketches.a = rect('a', 'top', -30, -20, 30, 20);
    const [pr0, up] = addLine(createSketch('pr', 'Profile', 'front'), { x: 30, y: 3 }, { x: 30, y: 15 });
    doc.sketches.pr = addLine(pr0, up.p2, { x: 20, y: 15 })[0];
    doc.sheetMetal = { thickness: 3, bendRadius: 3, kFactor: 0.5 };
    doc.features.push(extrude('e1', 'a', 'boss', 3));
    const edge = mesh(doc).edges.find((x) => x.straight && Math.abs(x.centroid.x - 30) < 1e-3 && Math.abs(x.centroid.y - 3) < 1e-3 && Math.abs(x.length - 40) < 1e-3)!;
    expect(edge).toBeTruthy();
    doc.features.push({ id: 'sf', type: 'sweptFlange', name: 'Swept Flange1', suppressed: false, sketchId: 'pr', pathSketchId: '', edges: [edgeRef(edge)], reverse: false, merge: true } as never);
    // the 3 mm sheet on the inside of the profile: the leg 3 x 9 above the plate, the lip 10 x 3, along 40
    const { m, e } = agree(doc, 60 * 40 * 3 + (3 * 9 + 10 * 3) * 40, 1e-6);
    for (const g of [m.geometry, e.geometry]) {
      const bb = new THREE.Box3().setFromBufferAttribute(g.getAttribute('position') as THREE.BufferAttribute);
      expect(bb.max.x).toBeCloseTo(30, 3);
      expect(bb.max.y).toBeCloseTo(15, 3);
    }
    // the same flange from a path that runs against the profile plane's normal (the edge's points the other way round)
    const regions = sweptFlangeRegions([{ x: 30, y: 3 }, { x: 30, y: 15 }, { x: 20, y: 15 }], 3, false);
    const along = [new THREE.Vector3(30, 3, -20), new THREE.Vector3(30, 3, 20)];
    const boxes = [along, along.slice().reverse()].map((path) => new THREE.Box3().setFromBufferAttribute(sweepGeometry(regions, REFERENCE_PLANE_DEFS.front, path)!.getAttribute('position') as THREE.BufferAttribute));
    const round = (v: THREE.Vector3) => v.toArray().map((x) => Math.round(x * 1e4) / 1e4);
    expect(round(boxes[1].min)).toEqual(round(boxes[0].min));
    expect(round(boxes[1].max)).toEqual(round(boxes[0].max));
    expect(boxes[0].max.x).toBeCloseTo(30, 4);
  });
});
