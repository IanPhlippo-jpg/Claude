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

  it('a feature without a B-rep version continues on the mesh (fallback); the body is still built', () => {
    const doc = plateWithHole();
    doc.sketches.s2 = rect('s2', 'top', 2, 2, 8, 8);
    doc.features.push(extrude('b2', 's2', 'boss', 15, { end: 'midPlane', draft: { angle: 5, outward: false } }));
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
