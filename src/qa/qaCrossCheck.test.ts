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
import { kernelMismatch, shapeDeviation, shapeMismatch, shapeTolerance, volumeMismatch } from '../core/features/volumeCheck';
import { meshVolume, planarFaces } from '../core/features/solid';
import { extrude, fillet, rect, t1, t3, t3Slot, TOP_FACE } from './qaModels';
import * as THREE from 'three';
import { addArc, addCircle, addLine, addText, createSketch } from '../core/sketch/model';
import { textBeziers, textOutlines, TEXT_DEVIATION } from '../core/sketch/text';
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
  kernelMismatch(m.geometry, Math.abs(meshVolume(m.geometry)), e.geometry, e.exactVolume ?? 0, m.faces);
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
    // the flat 0.5 % was blind to it; the faceted body has no curved surface, so its own limit (0.01 %) is not (F172)
    expect(volumeMismatch(Math.abs(meshVolume(sharp.geometry)), e.exactVolume!)).toBeNull();
    expect(check(sharp, e)).toMatch(/B-rep and mesh disagree: the exact volume .* differ by 0\.\d+ % \(the tessellation allows 0\.010 %\)/);
    expect(shapeMismatch(sharp.geometry, e.geometry)).toMatch(/B-rep and mesh disagree: the exact and the faceted surface lie 0\.\d\d mm apart/);
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

  it('a curve pattern drills a hole again where a table pattern already drilled one: nothing changes there', () => {
    const doc = createDocument();
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 40);
    doc.sketches.s2 = addCircle(createSketch('s2', 'Hole', 'top'), { x: 10, y: 20 }, 3)[0];
    doc.sketches.s3 = addLine(createSketch('s3', 'Curve', 'top'), { x: 10, y: 20 }, { x: 70, y: 20 })[0];
    doc.features.push(extrude('e1', 's1', 'boss', 10));
    doc.features.push({ id: 'c1', type: 'extrude', name: 'Cut-Extrude1', sketchId: 's2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false } as never);
    // holes at x = 30, 50, 70; then along the line at x = 40 and again at 70
    doc.features.push({ id: 'tp', type: 'tablePattern', name: 'TPattern1', suppressed: false, featureIds: ['c1'], table: [{ x: 20, y: 0 }, { x: 40, y: 0 }, { x: 60, y: 0 }] } as never);
    doc.features.push({ id: 'cp', type: 'curvePattern', name: 'CrvPattern1', suppressed: false, featureIds: ['c1'], curve: { sketchId: 's3', count: 3, spacing: 20, equal: true, tangent: false } } as never);
    const { m } = agree(doc, 80 * 40 * 10 - 5 * Math.PI * 9 * 10, 2e-3);
    // the drilled-again hole left no piece of the tool standing above the plate
    expect(new THREE.Box3().setFromBufferAttribute(m.geometry.getAttribute('position') as THREE.BufferAttribute).max.y).toBeCloseTo(10, 3);
  });

  it('Variable Size fillet R2 → R8: the start size where the edge started when it was picked, on both kernels', () => {
    // the law of both kernels: start + (end - start)·h(s), h = (3s + 12s² - 8s³) / 7; ∫h = 1/2, ∫h² = (3 + 18 + 96/5 - 32 + 64/7) / 49
    const ih2 = (3 + 18 + 96 / 5 - 32 + 64 / 7) / 49;
    const removed = (r1: number, r2: number, L: number) => (1 - Math.PI / 4) * L * (r1 * r1 + r1 * (r2 - r1) + (r2 - r1) * (r2 - r1) * ih2);
    for (const sign of [-1, 1]) {
      const doc = createDocument();
      doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 40);
      doc.features.push(extrude('e1', 's1', 'boss', 20));
      const edge = mesh(doc).edges.find((x) => x.straight && Math.abs(x.length - 80) < 1e-3 && Math.abs(x.centroid.y - 20) < 1e-3 && Math.abs(x.centroid.z) < 1e-3)!;
      // the reference as picked running along -x (start at x = 80) or along +x (start at x = 0)
      const ref = { ...edgeRef(edge), dir: [sign, 0, 0] as [number, number, number] };
      doc.features.push({ id: 'vf', type: 'fillet', name: 'Fillet1', suppressed: false, size: 10, edges: [ref], roundType: 'variable', variable: { start: 2, end: 8 } } as never);
      const { m, e } = agree(doc, 80 * 40 * 20 - removed(2, 8, 80), 2e-4);
      // where the round meets the top face (y = 20) at the end x = 0: z = -R there
      const atStart = sign < 0 ? 8 : 2;
      for (const g of [m.geometry, e.geometry]) {
        const p = g.getAttribute('position');
        let zMax = -Infinity;
        for (let i = 0; i < p.count; i++) if (Math.abs(p.getX(i)) < 1e-4 && Math.abs(p.getY(i) - 20) < 1e-4) zMax = Math.max(zMax, p.getZ(i));
        expect(Math.abs(zMax + atStart)).toBeLessThan(0.1);
      }
    }
  });

  it('chamfered hex nut: the chamfer cones lying in the end faces cut every corner', () => {
    const doc = createDocument();
    const a = 10 / Math.sqrt(3);
    let s1 = createSketch('s1', 'Hex', 'front');
    const hex = [0, 1, 2, 3, 4, 5].map((k) => ({ x: a * Math.cos((k * Math.PI) / 3), y: a * Math.sin((k * Math.PI) / 3) }));
    for (let k = 0; k < 6; k++) s1 = addLine(s1, hex[k], hex[(k + 1) % 6])[0];
    doc.sketches.s1 = addCircle(s1, { x: 0, y: 0 }, 3)[0];
    // two 30° chamfer triangles from r = 4.45 out past the corners, at both end faces (z = 0 and 5.2), turned about z
    const r0 = 4.45, r1 = a + 0.5, h = (r1 - r0) / Math.sqrt(3);
    let s2 = createSketch('s2', 'Chamfer', 'top');
    for (const tri of [[{ x: r0, y: 0 }, { x: r1, y: 0 }, { x: r1, y: -h }], [{ x: r0, y: -5.2 }, { x: r1, y: -5.2 + h }, { x: r1, y: -5.2 }]]) {
      const [t0, l0] = addLine(s2, tri[0], tri[1]);
      const [t1, l1] = addLine(t0, l0.p2, tri[2]);
      s2 = addLine(t1, l1.p2, l0.p1)[0];
    }
    const [s2a, axis] = addLine(s2, { x: 0, y: -10.2 }, { x: 0, y: 5 }, true);
    doc.sketches.s2 = s2a;
    doc.features.push(extrude('e1', 's1', 'boss', 5.2));
    doc.features.push({ id: 'cr', type: 'revolve', name: 'Cut-Revolve1', sketchId: 's2', suppressed: false, op: 'cut', axisEntityId: axis.id, angle: 360, reverse: false } as never);
    // per end: the slice at height z keeps the hexagon inside the cone radius ρ = r0 + z·√3 (6 segments past the flats)
    const hexArea = 2 * Math.sqrt(3) * 25;
    const kept = (rho: number) => (rho <= 5 ? Math.PI * rho * rho : Math.PI * rho * rho - 6 * (rho * rho * Math.acos(5 / rho) - 5 * Math.sqrt(rho * rho - 25)));
    const zTop = (a - r0) / Math.sqrt(3), N = 20000;
    let chamfer = 0;
    for (let i = 0; i < N; i++) chamfer += (hexArea - kept(r0 + ((i + 0.5) / N) * zTop * Math.sqrt(3))) * (zTop / N);
    agree(doc, (hexArea - Math.PI * 9) * 5.2 - 2 * chamfer, 5e-3);
  });

  it('Edge Flange and Hem on the top edge of a base flange stand on the sheet face, not on the 3 mm end face', () => {
    const base = () => {
      const doc = createDocument();
      const [s0, l0] = addLine(createSketch('s1', 'Sketch1', 'front'), { x: 0, y: 0 }, { x: 40, y: 0 });
      doc.sketches.s1 = addLine(s0, l0.p2, { x: 40, y: 30 })[0];
      doc.sheetMetal = { thickness: 3, bendRadius: 3, kFactor: 0.5 };
      doc.features.push({ id: 'bf', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 60, midPlane: true, reverse: false, flipDir: false } as never);
      return doc;
    };
    // the faceted sheet keeps its flat faces beside the bend: the outer wall (y 6..30) and the underside (x 0..34)
    const sheet = mesh(base()).geometry;
    const flat = (n: [number, number, number]) => planarFaces(sheet, 'b').filter((f) => !f.curved && f.normal.every((v, i) => Math.abs(v - n[i]) < 1e-6)).map((f) => f.area);
    expect(flat([1, 0, 0]).some((a) => Math.abs(a - 24 * 60) < 1e-6)).toBe(true);
    expect(flat([0, -1, 0]).some((a) => Math.abs(a - 34 * 60) < 1e-6)).toBe(true);
    const top = mesh(base()).edges.find((x) => x.straight && Math.abs(x.length - 60) < 1e-3 && Math.abs(x.centroid.x - 40) < 1e-3 && Math.abs(x.centroid.y - 30) < 1e-3)!;
    expect(top).toBeTruthy();
    const both = (doc: Document) => {
      const m = mesh(doc), e = exact(doc);
      expect(shapeMismatch(m.geometry, e.geometry)).toBeNull();
      expect(Math.abs(Math.abs(meshVolume(m.geometry)) - e.exactVolume!) / e.exactVolume!).toBeLessThan(2e-3);
      return [m.geometry, e.geometry].map((g) => new THREE.Box3().setFromBufferAttribute(g.getAttribute('position') as THREE.BufferAttribute));
    };
    // Edge Flange 90°: bent off the vertical wall, so it runs out horizontally (x past 60), not up (y stays under 40)
    const ef = base();
    ef.features.push({ id: 'ef', type: 'edgeFlange', name: 'Edge-Flange1', suppressed: false, edge: edgeRef(top), angle: 90, length: 32, lengthMode: 'outerSharp', position: 'materialOutside', flip: false } as never);
    for (const bb of both(ef)) {
      expect(bb.max.x).toBeGreaterThan(60);
      expect(bb.max.y).toBeLessThan(40);
    }
    // closed Hem: folded back down along the outside of the wall (x past 40, nothing above y = 30)
    const hm = base();
    hm.features.push({ id: 'hm', type: 'hem', name: 'Hem1', suppressed: false, edge: edgeRef(top), hemType: 'closed', length: 10, gap: 2, position: 'materialInside', flip: false } as never);
    for (const bb of both(hm)) {
      expect(bb.max.x).toBeGreaterThan(42);
      expect(bb.max.y).toBeCloseTo(30, 2);
    }
  });
});

describe('independent edge choice on the exact kernel (QA 0.5.12 F179)', { timeout: 120000 }, () => {
  /**
   * checkEdges on the exact shape a fillet starts from, on its way into the kernel (the rebuild frees it afterwards);
   * the answers are returned, not asserted inside: the rebuild would catch a failed assertion and fall back to the mesh
   */
  function atFillet(doc: Document, cases: [BodyEdge[], BodyEdge][]): (string | null)[] {
    let out: (string | null)[] | null = null;
    setBrepKernel({ ...kernel, fillet: (s, e, r) => { out = cases.map(([found, ref]) => kernel.checkEdges!(s, [found], [edgeRef(ref)])); return kernel.fillet(s, e, r); } });
    const r = rebuildDocument(clone(doc));
    setBrepKernel(null);
    expect(Object.keys(r.errors), JSON.stringify(r.errors)).toHaveLength(0);
    expect(out).not.toBeNull();
    return out!;
  }

  it('agrees with the mesh matcher on a straight edge and on a hole rim, and speaks when the shared pick is wrong', () => {
    // T3: the long top edge; the shared matcher handing the exact kernel the other long top edge is caught
    const { doc, edge } = t3();
    doc.features.push(fillet('r1', 2, [edge]));
    const other = mesh(t3().doc).edges.find((e) => e.straight && Math.abs(e.length - 80) < 1e-3 && Math.abs(e.centroid.y - 10) < 1e-3 && e.centroid.distanceTo(edge.centroid) > 1)!;
    expect(other).toBeTruthy();
    const [same, wrong, none] = atFillet(doc, [[[edge], edge], [[other], edge], [[], edge]]);
    expect(same).toBeNull();
    expect(wrong).toMatch(/edge reference 1 of 1 as other edges/);
    expect(none).toMatch(/other edges/);
    // T1: the top rim of the Ø35 hole; the bottom rim (same length, 10 mm lower) is caught
    const a = t1(17.5);
    a.doc.features.push(fillet('r1', 2, [a.rim]));
    const bottom = mesh(t1(17.5).doc).edges.filter((e) => e.closed).reduce((x, y) => (y.centroid.y < x.centroid.y ? y : x));
    const [rim, low] = atFillet(a.doc, [[[a.rim], a.rim], [[bottom], a.rim]]);
    expect(rim).toBeNull();
    expect(low).toMatch(/other edges/);
  });

  it('stays quiet when a later cut split the edge (all pieces on both kernels)', () => {
    const b = t3();
    b.doc.features.push(fillet('r1', 2, [b.edge]));
    t3Slot(b.doc, 'through');
    b.doc.features.splice(1, 0, b.doc.features.pop()!);
    const m = mesh({ ...clone(b.doc), features: b.doc.features.filter((f) => f.id !== 'r1') });
    const pieces = m.edges.filter((e) => e.straight && Math.abs(e.length - 35) < 1e-3 && Math.abs(e.centroid.y - 10) < 1e-3 && Math.abs(e.centroid.z - b.edge.centroid.z) < 1e-3);
    expect(pieces).toHaveLength(2);
    const [both, one] = atFillet(b.doc, [[pieces, b.edge], [pieces.slice(0, 1), b.edge]]);
    expect(both).toBeNull();
    expect(one).toMatch(/other edges/);
  });
});

describe('Sketch Text on the exact kernel follows the letter curves (QA 0.5.12 F201)', { timeout: 120000 }, () => {
  /** the area inside loops of Bezier segments (Green: ½∮ x dy − y dx; 8-point Gauss is exact for these polynomials) */
  function bezierArea(loops: { x: number; y: number }[][][]): number {
    const G = [[-0.9602898565, 0.1012285363], [-0.7966664774, 0.2223810345], [-0.5255324099, 0.3137066459], [-0.1834346425, 0.3626837834], [0.1834346425, 0.3626837834], [0.5255324099, 0.3137066459], [0.7966664774, 0.2223810345], [0.9602898565, 0.1012285363]];
    let a = 0;
    for (const loop of loops) for (const p of loop) {
      const d = p.length - 1;
      const at = (t: number, q: { x: number; y: number }[]): { x: number; y: number } => (q.length === 1 ? q[0] : at(t, q.slice(1).map((b, i) => ({ x: q[i].x + (b.x - q[i].x) * t, y: q[i].y + (b.y - q[i].y) * t }))));
      const dq = p.slice(1).map((b, i) => ({ x: d * (b.x - p[i].x), y: d * (b.y - p[i].y) }));
      for (const [xg, w] of G) { const t = (xg + 1) / 2, P = at(t, p), D = at(t, dq); a += (w / 2) * 0.5 * (P.x * D.y - P.y * D.x); }
    }
    return Math.abs(a);
  }
  const polyArea = (loops: { x: number; y: number }[][]) => Math.abs(loops.reduce((a, l) => a + l.reduce((s, p, i) => { const q = l[(i + 1) % l.length]; return s + (p.x * q.y - q.x * p.y) / 2; }, 0), 0));

  it('the exact volume is the area of the letter curves times the depth; the mesh stays within the text deviation', () => {
    const doc = createDocument();
    let s = createSketch('s1', 's1', 'top');
    [s] = addText(s, { x: 0, y: 0 }, 'OBI', 10);
    doc.sketches.s1 = s;
    doc.features.push(extrude('e1', 's1', 'boss', 2));
    const area = bezierArea(textBeziers('OBI', 10));
    const poly = polyArea(textOutlines('OBI', 10));
    // the polylines lie within 0.01 mm of the curves: their area differs, but by less than perimeter × deviation
    expect(Math.abs(area - poly)).toBeGreaterThan(1e-4);
    const e = exact(doc), m = mesh(doc);
    // the exact body has the curves themselves, not the polylines (the B-rep before F201 extruded the polyline)
    expect(Math.abs(e.exactVolume! - area * 2) / (area * 2)).toBeLessThan(1e-6);
    expect(Math.abs(e.exactVolume! - poly * 2)).toBeGreaterThan(1e-4);
    // the mesh body is the polylines extruded, exactly (Earcut once filled part of the counter of the O: solid.ts earcutStart)
    expect(Math.abs(Math.abs(meshVolume(m.geometry)) - poly * 2)).toBeLessThan(1e-6 * poly * 2);
    expect(Math.abs(poly - area)).toBeLessThan(150 * TEXT_DEVIATION);
    expect(check(m, e)).toBeNull();
  });
});
