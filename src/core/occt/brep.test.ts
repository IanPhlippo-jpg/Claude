import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createDocument, type Document } from '../document/types';
import { addArc, addCircle, addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from '../features/rebuild';
import { setBrepKernel } from '../features/brepKernel';
import { edgeRef } from '../features/edgesets';
import { meshVolume } from '../features/solid';
import { occtKernel } from './brep';
import { shapesToStep, stepToMeshes } from './step';
import { parseDocument } from '../document/persistence';

let rep: typeof import('replicad');
let kernel: ReturnType<typeof occtKernel>;
beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
  const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
  const replicad = await import('replicad');
  replicad.setOC(OC as never);
  rep = replicad;
  kernel = occtKernel(OC, replicad);
  setBrepKernel(kernel);
}, 60000);
afterAll(() => setBrepKernel(null));

const PI = Math.PI;
function rect(id: string, plane: string, x0: number, y0: number, x1: number, y1: number, circle?: { x: number; y: number; r: number }) {
  let s = createSketch(id, id, plane);
  const c = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  if (circle) s = addCircle(s, { x: circle.x, y: circle.y }, circle.r)[0];
  return s;
}
const extrude = (id: string, sketchId: string, op: 'boss' | 'cut', depth: number, extra: Record<string, unknown> = {}) => ({ id, type: 'extrude', name: id, sketchId, suppressed: false, op, end: 'blind', depth, reverse: false, ...extra }) as never;

function plateWithHole(): Document {
  const doc = createDocument();
  doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 60, { x: 40, y: 30, r: 10 });
  doc.features.push(extrude('e1', 's1', 'boss', 10));
  return doc;
}

describe('B-rep kernel in the rebuild (OpenCascade)', () => {
  it('a plate with a hole is an exact solid: exact volume, the hole is one cylinder', () => {
    const r = rebuildDocument(plateWithHole());
    expect(r.bodies).toHaveLength(1);
    const b = r.bodies[0];
    expect(b.exact).toBe(true);
    expect(Math.abs(b.exactVolume! - (80 * 60 * 10 - PI * 100 * 10))).toBeLessThan(1e-6);
    // the tessellation is close to the exact solid and its edges are those of the part
    expect(Math.abs(meshVolume(b.geometry) - b.exactVolume!) / b.exactVolume!).toBeLessThan(0.002);
    expect(b.edges.filter((e) => e.straight)).toHaveLength(12);
    expect(b.edges.filter((e) => e.closed)).toHaveLength(2);
    expect(Object.keys(r.errors)).toHaveLength(0);
  });

  it('a blind cut and a through-all cut keep the body exact', () => {
    const doc = plateWithHole();
    doc.planes.top10 = { id: 'top10', name: 'Face', kind: 'offset', u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], origin: [0, 10, 0] } as never;
    doc.sketches.s2 = rect('s2', 'top', 5, 5, 25, 15);
    doc.features.push(extrude('c1', 's2', 'cut', 0, { end: 'throughAll' }));
    const r = rebuildDocument(doc);
    const b = r.bodies[0];
    expect(b.exact).toBe(true);
    expect(Math.abs(b.exactVolume! - (80 * 60 * 10 - PI * 100 * 10 - 20 * 10 * 10))).toBeLessThan(1e-6);
  });

  it('a fillet on a top edge is a true round; it follows the edge when the plate gets thicker', () => {
    const doc = plateWithHole();
    const b0 = rebuildDocument(doc).bodies[0];
    const edge = b0.edges.filter((e) => e.straight && Math.abs(e.centroid.y - 10) < 1e-3).reduce((a, x) => (x.centroid.x > a.centroid.x ? x : a));
    doc.features.push({ id: 'r1', type: 'fillet', name: 'Fillet1', suppressed: false, size: 3, edges: [edgeRef(edge)] } as never);
    const r = rebuildDocument(doc);
    expect(r.errors.r1).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    const loss = (1 - PI / 4) * 9;
    expect(Math.abs(r.bodies[0].exactVolume! - (80 * 60 * 10 - PI * 100 * 10 - loss * 60))).toBeLessThan(1e-4);
    (doc.features[0] as { depth: number }).depth = 25;
    const r2 = rebuildDocument(doc);
    expect(r2.errors.r1).toBeUndefined();
    expect(r2.bodies[0].exact).toBe(true);
    expect(Math.abs(r2.bodies[0].exactVolume! - (80 * 60 * 25 - PI * 100 * 25 - loss * 60))).toBeLessThan(1e-4);
  });

  it('a chamfer of 2 mm on the edges of the hole', () => {
    const doc = plateWithHole();
    const b0 = rebuildDocument(doc).bodies[0];
    const rim = b0.edges.filter((e) => e.closed).reduce((a, x) => (x.centroid.y > a.centroid.y ? x : a));
    doc.features.push({ id: 'k1', type: 'chamfer', name: 'Chamfer1', suppressed: false, size: 2, edges: [edgeRef(rim)] } as never);
    const r = rebuildDocument(doc);
    expect(r.errors.k1).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    // the cone ring removed around a hole of radius 10: pi * h * (r1^2 + r1 r2 + r2^2) / 3 minus the cylinder
    const cone = (PI * 2 * (12 * 12 + 12 * 10 + 10 * 10)) / 3 - PI * 100 * 2;
    expect(Math.abs(r.bodies[0].exactVolume! - (80 * 60 * 10 - PI * 100 * 10 - cone))).toBeLessThan(1e-4);
  });

  it('a full revolve of a rectangle beside the axis is an exact tube', () => {
    const doc = createDocument();
    let s = rect('s1', 'front', 10, 0, 15, 40);
    s = addLine(s, { x: 0, y: -5 }, { x: 0, y: 50 })[0];
    const axisId = s.entityOrder[s.entityOrder.length - 1];
    s.entities[axisId] = { ...s.entities[axisId], construction: true } as never;
    doc.sketches.s1 = s;
    doc.features.push({ id: 'v1', type: 'revolve', name: 'Revolve1', sketchId: 's1', suppressed: false, op: 'boss', axisEntityId: axisId, angle: 360, reverse: false } as never);
    const r = rebuildDocument(doc);
    expect(r.errors.v1).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    expect(Math.abs(r.bodies[0].exactVolume! - PI * (15 * 15 - 10 * 10) * 40)).toBeLessThan(1e-4);
  });

  it('a half revolve (180°) and a mid-plane revolve match the mesh kernel and are exact', () => {
    for (const extra of [{ angle: 180 }, { angle: 90, end: 'midPlane' }, { angle: 90, reverse: true }]) {
      const doc = createDocument();
      let s = rect('s1', 'front', 10, 0, 15, 40);
      s = addLine(s, { x: 0, y: -5 }, { x: 0, y: 50 })[0];
      const axisId = s.entityOrder[s.entityOrder.length - 1];
      s.entities[axisId] = { ...s.entities[axisId], construction: true } as never;
      doc.sketches.s1 = s;
      doc.features.push({ id: 'v1', type: 'revolve', name: 'Revolve1', sketchId: 's1', suppressed: false, op: 'boss', axisEntityId: axisId, reverse: false, ...extra } as never);
      setBrepKernel(null);
      const mesh = rebuildDocument(doc).bodies[0];
      setBrepKernel(kernel);
      const r = rebuildDocument(doc);
      const b = r.bodies[0];
      expect(b.exact).toBe(true);
      const ang = (extra.angle * PI) / 180;
      expect(Math.abs(b.exactVolume! - (ang / 2) * (15 * 15 - 10 * 10) * 40)).toBeLessThan(1e-4);
      // the same side as the mesh kernel: the boxes agree
      mesh.geometry.computeBoundingBox();
      b.geometry.computeBoundingBox();
      expect(mesh.geometry.boundingBox!.getCenter(new THREE.Vector3()).distanceTo(b.geometry.boundingBox!.getCenter(new THREE.Vector3()))).toBeLessThan(0.5);
    }
  });

  it('a slot of lines and arcs extrudes with exact half cylinders', () => {
    const doc = createDocument();
    let s = createSketch('s1', 's1', 'top');
    s = addLine(s, { x: 0, y: 0 }, { x: 40, y: 0 })[0];
    s = addLine(s, { x: 40, y: 10 }, { x: 0, y: 10 })[0];
    s = addArc(s, { x: 40, y: 5 }, { x: 40, y: 0 }, { x: 40, y: 10 }, true)[0];
    s = addArc(s, { x: 0, y: 5 }, { x: 0, y: 10 }, { x: 0, y: 0 }, true)[0];
    doc.sketches.s1 = s;
    doc.features.push(extrude('e1', 's1', 'boss', 5));
    const r = rebuildDocument(doc);
    expect(r.errors.e1).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    expect(Math.abs(r.bodies[0].exactVolume! - (40 * 10 + PI * 25) * 5)).toBeLessThan(1e-4);
  });

  it('Hole Tool holes are exact: a simple through hole, a counterbore and a countersink', () => {
    const doc = createDocument();
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 100, 40);
    doc.features.push(extrude('e1', 's1', 'boss', 20));
    // the top face plane (y = 20), as the Top Plane lifted: sketch x = world x, sketch y = -world z
    doc.planes.f1 = { id: 'f1', name: 'Face', kind: 'face', u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], origin: [0, 20, 0] } as never;
    const hole = (id: string, x: number, extra: Record<string, unknown>) => ({ id, type: 'hole', name: id, suppressed: false, plane: 'f1', points: [{ x, y: 20 }], diameter: 6, depth: 0, holeType: 'simple', cbDiameter: 11, cbDepth: 6, csDiameter: 12, csAngle: 90, ...extra }) as never;
    doc.features.push(hole('h1', 20, {}), hole('h2', 50, { holeType: 'counterbore' }), hole('h3', 80, { holeType: 'countersink' }));
    const r = rebuildDocument(doc);
    expect(Object.keys(r.errors)).toHaveLength(0);
    expect(r.bodies[0].exact).toBe(true);
    const cyl = PI * 9 * 20;
    const cb = PI * (5.5 * 5.5 - 9) * 6;
    // countersink 90°: a cone of radius 6 and height 6 down to the axis, minus the part inside the Ø6 hole
    const h = 6, coneAll = (PI * 36 * h) / 3, tipInside = (PI * 9 * 3) / 3, cylInCone = PI * 9 * 3;
    const cs = coneAll - tipInside - cylInCone;
    expect(Math.abs(r.bodies[0].exactVolume! - (100 * 40 * 20 - 3 * cyl - cb - cs))).toBeLessThan(1e-4);
  });

  it('the parts of the door handle example are all exact and agree with the mesh kernel', () => {
    for (const name of ['Deur', 'Rozet', 'Sleutelrozet', 'Vierkantstift', 'Kruk']) {
      const doc = parseDocument(readFileSync(`voorbeelden/deurkruk/${name}.kcad`, 'utf8'));
      setBrepKernel(null);
      const mesh = rebuildDocument(doc);
      setBrepKernel(kernel);
      const r = rebuildDocument(doc);
      expect(Object.keys(r.errors), name).toHaveLength(0);
      expect(r.bodies.length, name).toBe(mesh.bodies.length);
      for (const [i, b] of r.bodies.entries()) {
        expect(b.exact, `${name} body ${i + 1}`).toBe(true);
        const mv = Math.abs(meshVolume(mesh.bodies[i].geometry));
        expect(Math.abs(b.exactVolume! - mv) / mv, `${name} body ${i + 1}: ${b.exactVolume} vs ${mv}`).toBeLessThan(0.015);
      }
    }
  }, 60000);

  it('a shell with the top face open is exact: a 2 mm wall', () => {
    const doc = createDocument();
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 60);
    doc.features.push(extrude('e1', 's1', 'boss', 20));
    doc.features.push({ id: 'sh', type: 'shell', name: 'Shell1', suppressed: false, thickness: 2, faces: [{ normal: [0, 1, 0], point: [40, 20, -30] }] } as never);
    const r = rebuildDocument(doc);
    expect(r.errors.sh).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    expect(Math.abs(r.bodies[0].exactVolume! - (80 * 60 * 20 - 76 * 56 * 18))).toBeLessThan(1e-3);
  });

  it('linear and circular patterns of features are exact (every instance the seed tool moved)', () => {
    const doc = createDocument();
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 100, 100);
    doc.features.push(extrude('e1', 's1', 'boss', 10));
    doc.sketches.s2 = rect('s2', 'top', 5, 5, 15, 15);
    doc.features.push(extrude('b2', 's2', 'boss', 5, { reverse: true }));
    doc.features.push({ id: 'lp', type: 'linearPattern', name: 'LPattern1', suppressed: false, featureIds: ['b2'], dir1: { axis: [1, 0, 0], spacing: 20, count: 4 } } as never);
    doc.sketches.s3 = addCircle(createSketch('s3', 's3', 'top'), { x: 80, y: 50 }, 4)[0];
    doc.features.push(extrude('c3', 's3', 'cut', 0, { end: 'throughAll' }));
    doc.features.push({ id: 'cp', type: 'circularPattern', name: 'CirPattern1', suppressed: false, featureIds: ['c3'], axis: { origin: [50, 0, -50], dir: [0, 1, 0] }, angle: 360, count: 4 } as never);
    const r = rebuildDocument(doc);
    expect(Object.keys(r.errors)).toHaveLength(0);
    expect(r.bodies).toHaveLength(1);
    expect(r.bodies[0].exact).toBe(true);
    expect(Math.abs(r.bodies[0].exactVolume! - (100 * 100 * 10 + 4 * 10 * 10 * 5 - 4 * PI * 16 * 10))).toBeLessThan(1e-4);
  });

  it('mirror: a mirrored feature and a mirrored body are exact', () => {
    const doc = createDocument();
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 40, 30, { x: 20, y: 15, r: 5 });
    doc.features.push(extrude('e1', 's1', 'boss', 10));
    doc.features.push({ id: 'm1', type: 'mirror', name: 'Mirror1', suppressed: false, plane: 'right', featureIds: ['e1'] } as never);
    const r = rebuildDocument(doc);
    expect(Object.keys(r.errors)).toHaveLength(0);
    expect(r.bodies[0].exact).toBe(true);
    expect(Math.abs(r.bodies[0].exactVolume! - 2 * (40 * 30 * 10 - PI * 25 * 10))).toBeLessThan(1e-4);
    const doc2 = createDocument();
    doc2.sketches.s1 = rect('s1', 'top', 0, 0, 40, 30);
    doc2.features.push(extrude('e1', 's1', 'boss', 10));
    doc2.features.push({ id: 'm2', type: 'mirror', name: 'Mirror2', suppressed: false, plane: 'right' } as never);
    const r2 = rebuildDocument(doc2);
    expect(r2.bodies[0].exact).toBe(true);
    expect(Math.abs(r2.bodies[0].exactVolume! - 2 * 40 * 30 * 10)).toBeLessThan(1e-4);
  });

  it('a loft from a 40 mm square to a 20 mm square 30 mm higher is an exact frustum', () => {
    const doc = createDocument();
    doc.planes.p30 = { id: 'p30', name: 'Plane1', kind: 'offset', u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], origin: [0, 30, 0] } as never;
    doc.sketches.s1 = rect('s1', 'top', -20, -20, 20, 20);
    doc.sketches.s2 = rect('s2', 'p30', -10, -10, 10, 10);
    doc.features.push({ id: 'l1', type: 'loft', name: 'Loft1', suppressed: false, op: 'boss', sketchId: 's1', sketchId2: 's2' } as never);
    const r = rebuildDocument(doc);
    expect(r.errors.l1).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    expect(Math.abs(r.bodies[0].exactVolume! - (30 / 3) * (1600 + 400 + 800))).toBeLessThan(1e-3);
  });

  it('an extrude with a 5° draft and a Draft feature on the sides are exact (tapered planes)', () => {
    const doc = createDocument();
    doc.sketches.s1 = rect('s1', 'top', -20, -20, 20, 20);
    doc.features.push(extrude('e1', 's1', 'boss', 20, { draft: { angle: 5, outward: false } }));
    const r = rebuildDocument(doc);
    expect(r.errors.e1).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    // a frustum of squares: 40 at the base, 40 - 2 * 20 * tan 5° at the top
    const top = 40 - 2 * 20 * Math.tan((5 * PI) / 180);
    expect(Math.abs(r.bodies[0].exactVolume! - (20 / 3) * (1600 + top * top + 40 * top))).toBeLessThan(1e-3);

    const d2 = createDocument();
    d2.sketches.s1 = rect('s1', 'top', -20, -20, 20, 20);
    d2.features.push(extrude('e1', 's1', 'boss', 20));
    d2.features.push({ id: 'd1', type: 'draft', name: 'Draft1', suppressed: false, angle: 5, neutral: { normal: [0, 1, 0], point: [0, 20, 0], label: 'Face' }, faces: [{ normal: [1, 0, 0], point: [20, 10, 0], label: 'Face' }, { normal: [-1, 0, 0], point: [-20, 10, 0], label: 'Face' }] } as never);
    setBrepKernel(null);
    const mesh = rebuildDocument(d2);
    setBrepKernel(kernel);
    const r2 = rebuildDocument(d2);
    expect(r2.errors.d1).toBeUndefined();
    expect(r2.bodies[0].exact).toBe(true);
    const mv = Math.abs(meshVolume(mesh.bodies[0].geometry));
    expect(Math.abs(r2.bodies[0].exactVolume! - mv) / mv).toBeLessThan(0.005);
    expect(Math.abs(r2.bodies[0].exactVolume! - 40 * 40 * 20)).toBeGreaterThan(100);
  });

  it('extrude end conditions are exact and agree with the mesh kernel', () => {
    const base = () => {
      const doc = createDocument();
      doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 60);
      doc.features.push(extrude('e1', 's1', 'boss', 10));
      doc.planes.p30 = { id: 'p30', name: 'Plane1', kind: 'offset', u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], origin: [0, 30, 0] } as never;
      doc.sketches.s2 = rect('s2', 'top', 10, 10, 30, 30);
      doc.sketches.s3 = rect('s3', 'p30', 40, 10, 60, 30);
      return doc;
    };
    const cases: [string, Record<string, unknown>, string, number][] = [
      ['Up To Vertex', { end: 'upToVertex', vertex: { point: [0, 25, 0], label: 'Vertex' } }, 's2', 400 * 15],
      ['Up To Next (from a plane above, downwards)', { end: 'upToNext', reverse: true }, 's3', 400 * 20],
      ['Up To Surface', { end: 'upToSurface', surface: { normal: [0, 1, 0], point: [0, 15, 0], label: 'Face' } }, 's2', 400 * 5],
      ['Offset From Surface', { end: 'offsetFromSurface', offset: 3, surface: { normal: [0, 1, 0], point: [0, 15, 0], label: 'Face' } }, 's2', 400 * 2],
      ['From offset', { fromOffset: 20 }, 's2', 400 * 10],
    ];
    // toolVol: the material the new boss adds above the 80 x 60 x 10 plate (it starts inside the plate)
    for (const [label, extra, sk, toolVol] of cases) {
      const doc = base();
      doc.features.push(extrude('b2', sk, 'boss', 10, extra));
      setBrepKernel(null);
      const mesh = rebuildDocument(doc);
      setBrepKernel(kernel);
      const r = rebuildDocument(doc);
      expect(r.errors.b2, label).toBeUndefined();
      expect(r.bodies.every((b) => b.exact), label).toBe(true);
      const total = r.bodies.reduce((a, b) => a + b.exactVolume!, 0);
      const meshTotal = mesh.bodies.reduce((a, b) => a + Math.abs(meshVolume(b.geometry)), 0);
      // Up To Next ends 0.01 mm into the face (both kernels), the rest exactly
      expect(Math.abs(total - (48000 + toolVol)), label).toBeLessThan(label.startsWith('Up To Next') ? 5 : 1e-4);
      expect(Math.abs(total - meshTotal) / meshTotal, label).toBeLessThan(0.002);
    }
    // Up To Body: from the Top Plane up to the plate that floats at y = 30
    {
      const doc = createDocument();
      doc.planes.p30 = { id: 'p30', name: 'Plane1', kind: 'offset', u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], origin: [0, 30, 0] } as never;
      doc.sketches.s1 = rect('s1', 'p30', 0, 0, 80, 60);
      doc.features.push(extrude('e1', 's1', 'boss', 10));
      doc.sketches.s2 = rect('s2', 'top', 10, 10, 30, 30);
      doc.features.push(extrude('b2', 's2', 'boss', 10, { end: 'upToBody', upToBody: { bodyId: 'body1', label: 'Body' } }));
      setBrepKernel(null);
      const mesh = rebuildDocument(doc);
      setBrepKernel(kernel);
      const r = rebuildDocument(doc);
      expect(r.errors.b2).toBeUndefined();
      expect(r.bodies.every((b) => b.exact)).toBe(true);
      const total = r.bodies.reduce((a, b) => a + b.exactVolume!, 0);
      expect(Math.abs(total - (48000 + 400 * 30))).toBeLessThan(1e-4);
      expect(Math.abs(total - mesh.bodies.reduce((a, b) => a + Math.abs(meshVolume(b.geometry)), 0)) / total).toBeLessThan(0.002);
    }
    // Flip side to cut: everything outside the 20 x 20 profile goes
    const doc = base();
    doc.features.push(extrude('c2', 's2', 'cut', 0, { end: 'throughAll', flipSide: true }));
    const r = rebuildDocument(doc);
    expect(r.errors.c2).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    expect(Math.abs(r.bodies[0].exactVolume! - 400 * 10)).toBeLessThan(1e-4);
  });

  it('a thin revolve of an open L is exact and equal to the mesh kernel', () => {
    const doc = createDocument();
    let sk = createSketch('s1', 's1', 'front');
    sk = addLine(sk, { x: 10, y: 0 }, { x: 30, y: 0 })[0];
    sk = addLine(sk, { x: 30, y: 0 }, { x: 30, y: 25 })[0];
    sk = addLine(sk, { x: 0, y: -5 }, { x: 0, y: 40 })[0];
    const axisId = sk.entityOrder[sk.entityOrder.length - 1];
    sk.entities[axisId] = { ...sk.entities[axisId], construction: true } as never;
    doc.sketches.s1 = sk;
    doc.features.push({ id: 'v1', type: 'revolve', name: 'Revolve1', sketchId: 's1', suppressed: false, op: 'boss', axisEntityId: axisId, angle: 360, reverse: false, thin: { mode: 'one', thickness: 2 } } as never);
    setBrepKernel(null);
    const mesh = rebuildDocument(doc);
    setBrepKernel(kernel);
    const r = rebuildDocument(doc);
    expect(r.errors.v1).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    const mv = Math.abs(meshVolume(mesh.bodies[0].geometry));
    expect(Math.abs(r.bodies[0].exactVolume! - mv) / mv).toBeLessThan(0.01);
  });

  it('a thin feature of an open L of lines is exact and equal to the mesh kernel', () => {
    for (const mode of ['one', 'mid', 'two'] as const) {
      const doc = createDocument();
      let sk = createSketch('s1', 's1', 'top');
      sk = addLine(sk, { x: 0, y: 0 }, { x: 40, y: 0 })[0];
      sk = addLine(sk, { x: 40, y: 0 }, { x: 40, y: 30 })[0];
      doc.sketches.s1 = sk;
      doc.features.push(extrude('t1', 's1', 'boss', 10, { thin: { mode, thickness: 2, thickness2: 1 } }));
      setBrepKernel(null);
      const mesh = rebuildDocument(doc);
      setBrepKernel(kernel);
      const r = rebuildDocument(doc);
      expect(r.errors.t1, mode).toBeUndefined();
      expect(r.bodies[0].exact, mode).toBe(true);
      const mv = Math.abs(meshVolume(mesh.bodies[0].geometry));
      expect(Math.abs(r.bodies[0].exactVolume! - mv) / mv, mode).toBeLessThan(1e-6);
    }
  });

  it('a rib in a U-channel is exact: 90 x 15 x 4 between the walls', () => {
    const doc = createDocument();
    doc.sketches.s1 = rect('s1', 'front', -50, 0, 50, 30);
    doc.features.push(extrude('e1', 's1', 'boss', 60, { end: 'midPlane' }));
    doc.sketches.s2 = rect('s2', 'front', -45, 5, 45, 35);
    doc.features.push(extrude('c1', 's2', 'cut', 0, { end: 'throughAllBoth' }));
    doc.sketches.s3 = addLine(createSketch('s3', 's3', 'front'), { x: -30, y: 20 }, { x: 30, y: 20 })[0];
    doc.features.push({ id: 'r1', type: 'rib', name: 'Rib1', sketchId: 's3', suppressed: false, thickness: 4, side: 'both', direction: 'parallel', flip: false, draft: 0 } as never);
    const r = rebuildDocument(doc);
    expect(r.errors.r1).toBeUndefined();
    expect(r.bodies).toHaveLength(1);
    expect(r.bodies[0].exact).toBe(true);
    expect(Math.abs(r.bodies[0].exactVolume! - (100 * 30 * 60 - 90 * 25 * 60 + 90 * 15 * 4))).toBeLessThan(0.5);
  });

  it('a sheet metal base flange (U of lines) has true bend cylinders; a tab is an exact plate', () => {
    const doc = createDocument();
    doc.sheetMetal = { thickness: 2, bendRadius: 3, kFactor: 0.5, reliefType: 'rectangular', reliefRatio: 0.5 } as never;
    let sk = createSketch('s1', 's1', 'front');
    sk = addLine(sk, { x: 0, y: 40 }, { x: 0, y: 0 })[0];
    sk = addLine(sk, { x: 0, y: 0 }, { x: 60, y: 0 })[0];
    sk = addLine(sk, { x: 60, y: 0 }, { x: 60, y: 40 })[0];
    doc.sketches.s1 = sk;
    doc.features.push({ id: 'bf', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 30, midPlane: false, reverse: false } as never);
    setBrepKernel(null);
    const mesh = rebuildDocument(doc);
    setBrepKernel(kernel);
    const r = rebuildDocument(doc);
    expect(r.errors.bf).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    const mv = Math.abs(meshVolume(mesh.bodies[0].geometry));
    // the mesh bends are 12-segment polygons: close, the B-rep is a little larger (true arcs)
    expect(Math.abs(r.bodies[0].exactVolume! - mv) / mv).toBeLessThan(0.005);
    expect(r.brep && Object.keys(r.brep)).toHaveLength(1);
    const tab = createDocument();
    tab.sheetMetal = { thickness: 2, bendRadius: 3, kFactor: 0.5 } as never;
    tab.sketches.s1 = rect('s1', 'top', 0, 0, 50, 40, { x: 25, y: 20, r: 5 });
    tab.features.push({ id: 'tb', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 0, midPlane: false, reverse: false } as never);
    const rt = rebuildDocument(tab);
    expect(rt.bodies[0].exact).toBe(true);
    expect(Math.abs(rt.bodies[0].exactVolume! - (50 * 40 - PI * 25) * 2)).toBeLessThan(1e-4);
  });

  it('edge flanges (material outside and inside) and a hem on a tab have true bend cylinders', () => {
    for (const [label, extra] of [['flange outside', { type: 'edgeFlange', angle: 90, length: 20, lengthMode: 'outerSharp', position: 'materialOutside' }], ['flange inside', { type: 'edgeFlange', angle: 90, length: 20, lengthMode: 'outerSharp', position: 'materialInside' }], ['hem', { type: 'hem', hemType: 'closed', length: 10, gap: 0.5, position: 'materialInside', flip: false }]] as const) {
      const doc = createDocument();
      doc.sheetMetal = { thickness: 2, bendRadius: 3, kFactor: 0.5 } as never;
      doc.sketches.s1 = rect('s1', 'top', 0, 0, 60, 40);
      doc.features.push({ id: 'tb', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 0, midPlane: false, reverse: false } as never);
      setBrepKernel(null);
      const plate = rebuildDocument(doc).bodies[0];
      const edge = plate.edges.filter((e) => e.straight && e.length > 50).reduce((a, x) => (x.centroid.y > a.centroid.y || (x.centroid.y === a.centroid.y && x.centroid.z < a.centroid.z) ? x : a));
      doc.features.push({ id: 'ef', name: 'Edge-Flange1', suppressed: false, edge: edgeRef(edge), flip: false, ...extra } as never);
      const mesh = rebuildDocument(doc);
      setBrepKernel(kernel);
      const r = rebuildDocument(doc);
      expect(r.errors.ef, label).toBeUndefined();
      expect(mesh.errors.ef, label).toBeUndefined();
      expect(r.bodies[0].exact, label).toBe(true);
      const mv = Math.abs(meshVolume(mesh.bodies[0].geometry));
      expect(Math.abs(r.bodies[0].exactVolume! - mv) / mv, label).toBeLessThan(0.005);
    }
  });

  it('multi radius and variable size fillets are built by OpenCascade', () => {
    const doc = createDocument();
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 60);
    doc.features.push(extrude('e1', 's1', 'boss', 10));
    const b0 = rebuildDocument(doc).bodies[0];
    const tops = b0.edges.filter((e) => e.straight && Math.abs(e.centroid.y - 10) < 1e-3 && Math.abs(e.length - 60) < 1e-3).sort((a, c) => a.centroid.x - c.centroid.x);
    expect(tops).toHaveLength(2);
    const k = 1 - PI / 4;
    const multi = { ...doc, features: [...doc.features, { id: 'r1', type: 'fillet', name: 'Fillet1', suppressed: false, size: 2, radii: [2, 4], edges: tops.map(edgeRef) } as never] };
    const r = rebuildDocument(multi);
    expect(r.errors.r1).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    expect(Math.abs(r.bodies[0].exactVolume! - (48000 - k * 60 * (4 + 16)))).toBeLessThan(1e-3);
    const variable = { ...doc, features: [...doc.features, { id: 'r2', type: 'fillet', name: 'Fillet2', suppressed: false, size: 2, roundType: 'variable', variable: { start: 2, end: 4 }, edges: [edgeRef(tops[1])] } as never] };
    const rv = rebuildDocument(variable);
    expect(rv.errors.r2).toBeUndefined();
    expect(rv.bodies[0].exact).toBe(true);
    const removed = 48000 - rv.bodies[0].exactVolume!;
    const expected = k * 60 * (4 + 8 + 16) / 3;
    expect(Math.abs(removed - expected) / expected).toBeLessThan(0.02);
  });

  it('a sketched bend of 90° on a tab is exact', () => {
    const doc = createDocument();
    doc.sheetMetal = { thickness: 2, bendRadius: 3, kFactor: 0.5 } as never;
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 40);
    doc.features.push({ id: 'tb', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 0, midPlane: false, reverse: false } as never);
    doc.planes.f2 = { id: 'f2', name: 'Face', kind: 'face', u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], origin: [0, 2, 0] } as never;
    doc.sketches.s2 = addLine(createSketch('s2', 's2', 'f2'), { x: 50, y: -5 }, { x: 50, y: 45 })[0];
    doc.features.push({ id: 'sb', type: 'sketchedBend', name: 'SketchedBend1', sketchId: 's2', suppressed: false, angle: 90, flipSide: false, reverse: false } as never);
    setBrepKernel(null);
    const mesh = rebuildDocument(doc);
    setBrepKernel(kernel);
    const r = rebuildDocument(doc);
    expect(mesh.errors.sb).toBeUndefined();
    expect(r.errors.sb).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    const mv = Math.abs(meshVolume(mesh.bodies[0].geometry));
    expect(Math.abs(r.bodies[0].exactVolume! - mv) / mv).toBeLessThan(0.005);
  });

  it('a miter flange along two edges of a tab is exact and equal to the mesh kernel', () => {
    const doc = createDocument();
    doc.sheetMetal = { thickness: 2, bendRadius: 3, kFactor: 0.5 } as never;
    let s1 = createSketch('sk1', 'Sketch1', 'top');
    const c = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: -60 }, { x: 0, y: -60 }];
    for (let i = 0; i < 4; i++) s1 = addLine(s1, c[i], c[(i + 1) % 4])[0];
    doc.sketches.sk1 = s1;
    doc.features.push({ id: 'f2', type: 'baseFlange', name: 'Base-Flange1', sketchId: 'sk1', suppressed: false, depth: 10, midPlane: false, reverse: false, flipDir: false } as never);
    setBrepKernel(null);
    const body = rebuildDocument(doc).bodies[0];
    const t = 2;
    const along = (dir: THREE.Vector3, test: (m: THREE.Vector3) => boolean) => body.edges.find((e) => e.straight && Math.abs(e.points[e.points.length - 1].clone().sub(e.points[0]).normalize().dot(dir)) > 0.999 && test(e.centroid))!;
    const e1 = along(new THREE.Vector3(1, 0, 0), (m) => Math.abs(m.y - t) < 1e-3 && Math.abs(m.z - 60) < 1e-3);
    const e2 = along(new THREE.Vector3(0, 0, 1), (m) => Math.abs(m.y - t) < 1e-3 && Math.abs(m.x - 100) < 1e-3);
    // the right plane: u = (0, 0, -1), v = (0, 1, 0)
    doc.sketches.sk2 = addLine(createSketch('sk2', 'Sketch2', 'right'), { x: -60, y: t }, { x: -60, y: t + 20 })[0];
    doc.features.push({ id: 'f4', type: 'miterFlange', name: 'Miter Flange1', sketchId: 'sk2', suppressed: false, edges: [edgeRef(e1), edgeRef(e2)], reverse: false, gap: 0.25 } as never);
    const mesh = rebuildDocument(doc);
    setBrepKernel(kernel);
    const r = rebuildDocument(doc);
    expect(mesh.errors.f4).toBeUndefined();
    expect(r.errors.f4).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    const mv = Math.abs(meshVolume(mesh.bodies[0].geometry));
    expect(Math.abs(r.bodies[0].exactVolume! - mv) / mv).toBeLessThan(0.005);
  });

  it('a jog on a tab is exact: the far side moved up, two true bends', () => {
    const doc = createDocument();
    doc.sheetMetal = { thickness: 2, bendRadius: 3, kFactor: 0.5 } as never;
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 40);
    doc.features.push({ id: 'tb', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 0, midPlane: false, reverse: false } as never);
    doc.planes.f2 = { id: 'f2', name: 'Face', kind: 'face', u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], origin: [0, 2, 0] } as never;
    doc.sketches.s2 = addLine(createSketch('s2', 's2', 'f2'), { x: 40, y: -5 }, { x: 40, y: 45 })[0];
    doc.features.push({ id: 'jg', type: 'jog', name: 'Jog1', sketchId: 's2', suppressed: false, offset: 10, flipSide: false, reverse: false } as never);
    setBrepKernel(null);
    const mesh = rebuildDocument(doc);
    setBrepKernel(kernel);
    const r = rebuildDocument(doc);
    expect(mesh.errors.jg).toBeUndefined();
    expect(r.errors.jg).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    const mv = Math.abs(meshVolume(mesh.bodies[0].geometry));
    expect(Math.abs(r.bodies[0].exactVolume! - mv) / mv).toBeLessThan(0.005);
  });

  it('weldment frames: square tube and pipe members with end miters are exact', () => {
    for (const [type, size] of [['square tube', '40 x 40 x 4'], ['pipe', '48.3 x 4.0']] as const) {
      const doc = createDocument();
      doc.sketches.s1 = rect('s1', 'top', 0, 0, 200, 100);
      doc.features.push({ id: 'w', type: 'weldment', name: 'Weldment', suppressed: false } as never);
      doc.features.push({ id: 'sm', type: 'structuralMember', name: 'Structural Member1', suppressed: false, sketchId: 's1', standard: 'iso', profileType: type, size, corner: 'endMiter', gap: 0, mergeArcs: false, rotation: 0, mirror: false, locate: { x: 0, y: 0 } } as never);
      setBrepKernel(null);
      const mesh = rebuildDocument(doc);
      setBrepKernel(kernel);
      const r = rebuildDocument(doc);
      expect(r.errors.sm, type).toBeUndefined();
      expect(r.bodies, type).toHaveLength(4);
      expect(r.bodies.every((b) => b.exact), type).toBe(true);
      const total = r.bodies.reduce((a, b) => a + b.exactVolume!, 0);
      const mv = mesh.bodies.reduce((a, b) => a + Math.abs(meshVolume(b.geometry)), 0);
      expect(Math.abs(total - mv) / mv, type).toBeLessThan(0.01);
    }
  }, 60000);

  it('Combine (add, subtract, common) and Intersect of two exact bodies are exact', () => {
    const two = () => {
      const doc = createDocument();
      doc.sketches.s1 = rect('s1', 'top', 0, 0, 40, 40);
      doc.features.push(extrude('e1', 's1', 'boss', 10));
      doc.sketches.s2 = rect('s2', 'top', 20, 20, 60, 60);
      doc.features.push(extrude('e2', 's2', 'boss', 10, { merge: false }));
      return doc;
    };
    const cases: [string, Record<string, unknown>, number][] = [
      ['add', { type: 'combine', op: 'add', bodies: ['body1', 'body2'] }, 1600 * 10 * 2 - 400 * 10],
      ['subtract', { type: 'combine', op: 'subtract', mainBody: 'body1', bodies: ['body1', 'body2'] }, 1600 * 10 - 400 * 10],
      ['common', { type: 'combine', op: 'common', bodies: ['body1', 'body2'] }, 400 * 10],
    ];
    for (const [label, extra, vol] of cases) {
      const doc = two();
      doc.features.push({ id: 'cb', name: 'Combine1', suppressed: false, ...extra } as never);
      const r = rebuildDocument(doc);
      expect(r.errors.cb, label).toBeUndefined();
      expect(r.bodies, label).toHaveLength(1);
      expect(r.bodies[0].exact, label).toBe(true);
      expect(Math.abs(r.bodies[0].exactVolume! - vol), label).toBeLessThan(1e-4);
    }
    const doc = two();
    doc.features.push({ id: 'ix', type: 'intersect', name: 'Intersect1', suppressed: false, bodies: ['body1', 'body2'], exclude: [], merge: false } as never);
    const r = rebuildDocument(doc);
    expect(r.errors.ix).toBeUndefined();
    expect(r.bodies).toHaveLength(3);
    expect(r.bodies.every((b) => b.exact)).toBe(true);
    expect(Math.abs(r.bodies.reduce((a, b) => a + b.exactVolume!, 0) - (1600 * 10 * 2 - 400 * 10))).toBeLessThan(1e-3);
  });

  it('a stud on a plate and a trim of a member by a plane are exact', () => {
    const doc = createDocument();
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 40, 40);
    doc.features.push(extrude('e1', 's1', 'boss', 10));
    doc.planes.f1 = { id: 'f1', name: 'Face', kind: 'face', u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], origin: [0, 10, 0] } as never;
    doc.features.push({ id: 'st', type: 'stud', name: 'Stud1', suppressed: false, plane: 'f1', point: { x: 20, y: 20 }, diameter: 8, length: 20, threadLength: 15, pitch: 1.25 } as never);
    const r = rebuildDocument(doc);
    expect(r.errors.st).toBeUndefined();
    expect(r.bodies[0].exact).toBe(true);
    expect(Math.abs(r.bodies[0].exactVolume! - (16000 + PI * 16 * 20))).toBeLessThan(1e-4);

    const w = createDocument();
    w.sketches.s1 = addLine(createSketch('s1', 's1', 'top'), { x: 0, y: 0 }, { x: 100, y: 0 })[0];
    w.features.push({ id: 'sm', type: 'structuralMember', name: 'Structural Member1', suppressed: false, sketchId: 's1', standard: 'iso', profileType: 'square tube', size: '40 x 40 x 4', corner: 'none', gap: 0, mergeArcs: false, rotation: 0, mirror: false, locate: { x: 0, y: 0 } } as never);
    w.features.push({ id: 'tr', type: 'trimExtend', name: 'Trim/Extend1', suppressed: false, bodies: ['body1'], trimBy: 'face', trimBodies: [], weldGap: 0, face: { point: [70, 0, 0], normal: [1, 0, 0], label: 'Plane' } } as never);
    const rw = rebuildDocument(w);
    expect(rw.errors.tr).toBeUndefined();
    expect(rw.bodies[0].exact).toBe(true);
    expect(Math.abs(rw.bodies[0].exactVolume! - (40 * 40 - 32 * 32) * 70)).toBeLessThan(1e-3);
  });

  it('an end cap on a square tube is an exact plate', () => {
    const w = createDocument();
    w.sketches.s1 = addLine(createSketch('s1', 's1', 'top'), { x: 0, y: 0 }, { x: 100, y: 0 })[0];
    w.features.push({ id: 'sm', type: 'structuralMember', name: 'Structural Member1', suppressed: false, sketchId: 's1', standard: 'iso', profileType: 'square tube', size: '40 x 40 x 4', corner: 'none', gap: 0, mergeArcs: false, rotation: 0, mirror: false, locate: { x: 0, y: 0 } } as never);
    w.features.push({ id: 'ec', type: 'endCap', name: 'End cap1', suppressed: false, faces: [{ normal: [1, 0, 0], point: [100, 18, 0] }], thickness: 5, outward: true, useRatio: false, ratio: 0, offset: 0, chamfer: 0 } as never);
    setBrepKernel(null);
    const mesh = rebuildDocument(w);
    setBrepKernel(kernel);
    const r = rebuildDocument(w);
    expect(mesh.errors.ec).toBeUndefined();
    expect(r.errors.ec).toBeUndefined();
    expect(r.bodies).toHaveLength(2);
    expect(r.bodies.every((b) => b.exact)).toBe(true);
    const capMesh = Math.abs(meshVolume(mesh.bodies[1].geometry));
    expect(Math.abs(r.bodies[1].exactVolume! - capMesh) / capMesh).toBeLessThan(1e-3);
  });

  it('a mid-plane extrude with draft: its tool has only planar faces and becomes exact through the planar fallback', () => {
    const doc = plateWithHole();
    doc.sketches.s2 = rect('s2', 'top', 2, 2, 8, 8);
    doc.features.push(extrude('b2', 's2', 'boss', 15, { end: 'midPlane', draft: { angle: 5, outward: false } }));
    setBrepKernel(null);
    const mesh = rebuildDocument(doc);
    setBrepKernel(kernel);
    const r = rebuildDocument(doc);
    expect(r.bodies[0].exact).toBe(true);
    const mv = Math.abs(meshVolume(mesh.bodies[0].geometry));
    expect(Math.abs(r.bodies[0].exactVolume! - mv) / mv).toBeLessThan(0.002);
  });

  it('a modelled M10 thread (cut and extruded, one and two starts) follows a true helix and agrees with the mesh kernel', () => {
    for (const [label, extra] of [['cut', { method: 'cut' }], ['extrude', { method: 'extrude' }], ['two starts', { method: 'cut', starts: 2 }]] as const) {
      const doc = createDocument();
      doc.sketches.s1 = addCircle(createSketch('s1', 's1', 'top'), { x: 0, y: 0 }, 5)[0];
      doc.features.push(extrude('e1', 's1', 'boss', 30));
      doc.features.push({ id: 'th', type: 'thread', name: 'Thread1', suppressed: false, edge: { center: [0, 30, 0], axis: [0, -1, 0], radius: 5, internal: false, label: 'Edge' }, diameter: 10, pitch: 1.5, length: 20, rightHand: true, ...extra } as never);
      setBrepKernel(null);
      const mesh = rebuildDocument(doc);
      setBrepKernel(kernel);
      const r = rebuildDocument(doc);
      expect(mesh.errors.th, label).toBeUndefined();
      expect(r.errors.th, label).toBeUndefined();
      expect(r.bodies[0].exact, label).toBe(true);
      const mv = Math.abs(meshVolume(mesh.bodies[0].geometry));
      expect(Math.abs(r.bodies[0].exactVolume! - mv) / mv, label).toBeLessThan(0.01);
    }
  }, 120000);

  it('Move/Copy Bodies: three copies 100 mm apart and a 90° turn, exact and in the right place', () => {
    for (const kernelOn of [false, true]) {
      setBrepKernel(kernelOn ? kernel : null);
      const doc = plateWithHole();
      doc.features.push({ id: 'mc', type: 'moveBody', name: 'Body-Move/Copy1', suppressed: false, bodies: ['body1'], copy: true, copies: 3, translate: [100, 0, 0], rotate: [0, 0, 0], origin: [0, 0, 0] } as never);
      const r = rebuildDocument(doc);
      expect(r.errors.mc).toBeUndefined();
      expect(r.bodies).toHaveLength(4);
      const xs = r.bodies.map((b) => { b.geometry.computeBoundingBox(); return Math.round(b.geometry.boundingBox!.min.x); }).sort((a, c) => a - c);
      expect(xs).toEqual([0, 100, 200, 300]);
      if (kernelOn) expect(r.bodies.every((b) => b.exact)).toBe(true);
      const turn = plateWithHole();
      turn.features.push({ id: 'mv', type: 'moveBody', name: 'Body-Move/Copy1', suppressed: false, bodies: ['body1'], copy: false, copies: 1, translate: [0, 0, 0], rotate: [0, 90, 0], origin: [0, 0, 0] } as never);
      const rt = rebuildDocument(turn);
      rt.bodies[0].geometry.computeBoundingBox();
      const bb = rt.bodies[0].geometry.boundingBox!;
      // the plate (x 0..80, z -60..0) turned 90° about Y: x becomes -z, z becomes -x
      expect(Math.round(bb.min.x)).toBe(-60);
      expect(Math.round(bb.max.x)).toBe(0);
      expect(Math.round(bb.min.z)).toBe(-80);
      if (kernelOn) {
        expect(rt.bodies[0].exact).toBe(true);
        expect(Math.abs(rt.bodies[0].exactVolume! - (48000 - PI * 1000))).toBeLessThan(1e-4);
      }
    }
    setBrepKernel(kernel);
  });

  it('Bodies to Keep: a cut through a plate makes two bodies; keeping the largest leaves one', () => {
    for (const kernelOn of [false, true]) {
      setBrepKernel(kernelOn ? kernel : null);
      const base = () => {
        const doc = createDocument();
        doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 60);
        doc.features.push(extrude('e1', 's1', 'boss', 10));
        doc.sketches.s2 = rect('s2', 'top', 20, -5, 30, 65);
        return doc;
      };
      const doc = base();
      doc.features.push(extrude('c1', 's2', 'cut', 0, { end: 'throughAll' }));
      const r = rebuildDocument(doc);
      expect(r.errors.c1).toBeUndefined();
      expect(r.splitCounts?.c1).toBe(2);
      expect(r.bodies).toHaveLength(2);
      const vols = r.bodies.map((b) => Math.round(Math.abs(meshVolume(b.geometry)))).sort((a, c) => c - a);
      expect(vols[0]).toBeCloseTo(50 * 60 * 10, -1);
      expect(vols[1]).toBeCloseTo(20 * 60 * 10, -1);
      if (kernelOn) expect(r.bodies.every((b) => b.exact)).toBe(true);
      const keepOne = base();
      keepOne.features.push(extrude('c1', 's2', 'cut', 0, { end: 'throughAll', keepBodies: [0] }));
      const r1 = rebuildDocument(keepOne);
      expect(r1.bodies).toHaveLength(1);
      expect(Math.abs(Math.abs(meshVolume(r1.bodies[0].geometry)) - 30000)).toBeLessThan(5);
    }
    setBrepKernel(kernel);
  });

  it('a structural member along a circle is one curved member (not one per arc segment) and builds quickly', () => {
    setBrepKernel(null);
    const doc = createDocument();
    doc.sketches.s1 = addCircle(createSketch('s1', 's1', 'top'), { x: 0, y: 0 }, 100)[0];
    doc.features.push({ id: 'sm', type: 'structuralMember', name: 'Structural Member1', suppressed: false, sketchId: 's1', standard: 'iso', profileType: 'pipe', size: '33.7 x 4.0', corner: 'endMiter', gap: 0, mergeArcs: false, rotation: 0, mirror: false, locate: { x: 0, y: 0 } } as never);
    const t0 = performance.now();
    const r = rebuildDocument(doc);
    const ms = performance.now() - t0;
    setBrepKernel(kernel);
    expect(r.errors.sm).toBeUndefined();
    expect(r.bodies).toHaveLength(1);
    expect(ms).toBeLessThan(5000);
    // a torus: 2π R × the ring area of the pipe
    const ring = PI * ((33.7 / 2) ** 2 - (33.7 / 2 - 4) ** 2);
    expect(Math.abs(Math.abs(meshVolume(r.bodies[0].geometry)) - 2 * PI * 100 * ring) / (2 * PI * 100 * ring)).toBeLessThan(0.03);
  });

  it('a feature without a B-rep version continues on the mesh (fallback); the body is still built', () => {
    const doc = plateWithHole();
    // a thin feature of an arc: its wall is curved and has no B-rep version yet
    doc.sketches.s2 = addArc(createSketch('s2', 's2', 'top'), { x: 40, y: 30 }, { x: 55, y: 30 }, { x: 25, y: 30 }, true)[0];
    doc.features.push(extrude('b2', 's2', 'boss', 15, { thin: { mode: 'one', thickness: 2 } }));
    const r = rebuildDocument(doc);
    expect(r.bodies).toHaveLength(1);
    expect(r.bodies[0].exact).toBeFalsy();
  });

  it('STEP from the B-rep: the plate with a hole is 7 faces with a true cylinder, and reads back exactly', async () => {
    const r = rebuildDocument(plateWithHole());
    const b = r.bodies[0];
    expect(r.brep?.[b.id]).toBeTruthy();
    const out = await shapesToStep(rep, [{ name: 'Plate', shape: r.brep![b.id] }]);
    const text = new TextDecoder().decode(out.bytes);
    expect(out.exact).toBe(1);
    expect((text.match(/ADVANCED_FACE/g) ?? []).length).toBe(7);
    expect(text).toMatch(/CYLINDRICAL_SURFACE/);
    const back = await stepToMeshes(rep, out.bytes);
    expect(Math.abs(back[0].volume - (80 * 60 * 10 - PI * 100 * 10))).toBeLessThan(1e-6);
  }, 60000);

  it('without a kernel the same document builds as before (mesh)', () => {
    setBrepKernel(null);
    try {
      const r = rebuildDocument(plateWithHole());
      expect(r.bodies[0].exact).toBeFalsy();
      expect(Math.abs(meshVolume(r.bodies[0].geometry) - (80 * 60 * 10 - PI * 100 * 10))).toBeLessThan(15);
    } finally {
      // the next files get their own kernel; this file is done with it
    }
  });
});
