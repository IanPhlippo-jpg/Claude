import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createDocument, type Document, type ExtrudeFeature, type MoveBodyFeature, type SketchFeature } from '../document/types';
import type { IntersectFeature, SurfaceFeature } from '../document/types';
import { addLine, createSketch } from '../sketch/model';
import { rebuildDocument, type Body } from './rebuild';
import { setBrepKernel } from './brepKernel';
import { meshVolume } from './solid';
import { occtKernel } from '../occt/brep';
import { parseDocument, serializeDocument } from '../document/persistence';

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

/** a rectangle on the Front plane from (x0, y0) to (x1, y1) */
function rect(id: string, x0: number, y0: number, x1: number, y1: number) {
  let s = createSketch(id, id, 'front');
  const c = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  return s;
}
const sketchF = (id: string, sketchId: string): SketchFeature => ({ id, type: 'sketch', name: id, sketchId, suppressed: false });
const boss = (id: string, sketchId: string): ExtrudeFeature => ({
  id, type: 'extrude', name: id, sketchId, suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false, merge: false,
});

/** two 10 x 10 x 10 blocks (x -5..5 and 25..35) and a 4 mm strip from x 0 to 30 that notches both (5 x 4 x 10 each), for a through-all cut */
function twoBlocks(): Document {
  const doc = createDocument('Scope');
  doc.sketches = { s1: rect('s1', -5, -5, 5, 5), s2: rect('s2', 25, -5, 35, 5), s3: rect('s3', 0, -2, 30, 2) };
  doc.sketches.s0 = rect('s0', -35, -5, -25, 5);
  doc.features = [sketchF('k1', 's1'), boss('e1', 's1'), sketchF('k2', 's2'), boss('e2', 's2')];
  return doc;
}
const cut = (scope: string[]): ExtrudeFeature => ({ ...boss('c1', 's3'), name: 'Cut-Extrude1', op: 'cut', end: 'throughAll', scope });
/** the block a body was made from, and its volume (B-rep: the exact one) */
const made = (b: Body) => b.featureIds[0];
const vol = (b: Body) => (b.exact ? b.exactVolume! : Math.abs(meshVolume(b.geometry)));
const byMaker = (bodies: Body[], fid: string) => bodies.find((b) => made(b) === fid)!;

describe.each([['mesh', false], ['B-rep', true]] as const)('stable body ids (QA 0.5.14 P1-3), %s kernel', (_label, brep) => {
  beforeAll(() => setBrepKernel(brep ? kernel : null));
  afterAll(() => setBrepKernel(null));

  it('a body is named after the feature that made it, a copy gets the next number of that feature', () => {
    const doc = twoBlocks();
    const move: Pick<MoveBodyFeature, 'translate' | 'rotate' | 'origin'> = { translate: [0, 0, 50], rotate: [0, 0, 0], origin: [0, 0, 0] };
    doc.features.push({ id: 'mc', type: 'moveBody', name: 'Body-Move/Copy1', suppressed: false, bodies: ['e1#0'], copy: true, copies: 2, ...move });
    const r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    expect(r.bodies.map((b) => b.id)).toEqual(['e1#0', 'e2#0', 'mc#0', 'mc#1']);
    if (brep) expect(r.bodies.every((b) => b.exact)).toBe(true);
  });

  it('a Feature Scope stays on its body when a body-making feature is inserted earlier in the tree', () => {
    const doc = twoBlocks();
    // the user picks the second block for the scope, as the panel stores it: by the id of the rebuilt body
    const second = rebuildDocument(doc).bodies[1].id;
    doc.features.push(sketchF('k3', 's3'), cut([second]));
    doc.hiddenBodies = [second];
    doc.bodyAppearances = { [second]: '#ff0000' };
    doc.bodyMaterials = { [second]: { name: 'Copper', density: 8900, color: '#b87333' } };
    const before = rebuildDocument(doc);
    expect(before.errors).toEqual({});
    expect(vol(byMaker(before.bodies, 'e1'))).toBeCloseTo(1000, 3);
    expect(vol(byMaker(before.bodies, 'e2'))).toBeCloseTo(800, 3);
    // a third block goes in at the top of the tree
    doc.features = [sketchF('k0', 's0'), boss('e0', 's0'), ...doc.features];
    const after = rebuildDocument(doc);
    expect(after.errors).toEqual({});
    expect(after.bodies).toHaveLength(3);
    // the cut still takes the strip out of the second block only
    expect(vol(byMaker(after.bodies, 'e0'))).toBeCloseTo(1000, 3);
    expect(vol(byMaker(after.bodies, 'e1'))).toBeCloseTo(1000, 3);
    expect(vol(byMaker(after.bodies, 'e2'))).toBeCloseTo(800, 3);
    // hidden body, appearance and material still belong to the second block
    const owner = (id: string) => made(after.bodies.find((b) => b.id === id)!);
    expect(owner(doc.hiddenBodies[0])).toBe('e2');
    expect(Object.keys(doc.bodyAppearances).map(owner)).toEqual(['e2']);
    expect(Object.keys(doc.bodyMaterials).map(owner)).toEqual(['e2']);
  });

  it('a file of format 2 with body2 references opens pointing to the same body', () => {
    const doc = twoBlocks();
    doc.features = [sketchF('k0', 's0'), boss('e0', 's0'), ...doc.features, sketchF('k3', 's3'), cut(['body2'])];
    // in format 2, body2 was the second body made: the block of e1
    const old = {
      ...JSON.parse(serializeDocument(doc)),
      version: 2,
      hiddenBodies: ['body3'],
      bodyAppearances: { body2: '#00ff00' },
      bodyMaterials: { body3: { name: 'Copper', density: 8900, color: '#b87333' } },
      bodyNames: { body2: 'Middle block' },
    };
    delete old.app;
    const back = parseDocument(JSON.stringify(old));
    expect(back.version).toBe(4);
    const c1 = back.features.find((f) => f.id === 'c1') as ExtrudeFeature;
    expect(c1.scope).toEqual(['e1#0']);
    expect(back.hiddenBodies).toEqual(['e2#0']);
    expect(back.bodyAppearances).toEqual({ 'e1#0': '#00ff00' });
    expect(Object.keys(back.bodyMaterials!)).toEqual(['e2#0']);
    expect(back.bodyNames).toEqual({ 'e1#0': 'Middle block' });
    const r = rebuildDocument(back);
    expect(r.errors).toEqual({});
    expect(vol(byMaker(r.bodies, 'e1'))).toBeCloseTo(800, 3);
    expect(vol(byMaker(r.bodies, 'e2'))).toBeCloseTo(1000, 3);
  });
});

describe('stable surface body ids (QA 0.5.14 P1-3, surfaces)', () => {
  beforeAll(() => setBrepKernel(null));

  /** a rectangle on any plane */
  const onPlane = (id: string, plane: string, x0: number, y0: number, x1: number, y1: number) => {
    let s = createSketch(id, id, plane);
    const c = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    return s;
  };
  const planar = (id: string, sketchId: string): SurfaceFeature => ({ id, type: 'surface', name: id, suppressed: false, kind: 'planar', sketchId });
  const split = (bodies: string[]): IntersectFeature => ({
    id: 'ix', type: 'intersect', name: 'Intersect1', suppressed: false, bodies, exclude: [], merge: false, capPlanar: true,
  });
  /** a 10 mm block (x, y -5..5) and a planar surface on the Top plane through its middle (y = 0) */
  function blockAndSurface(): Document {
    const doc = createDocument('Surfaces');
    doc.sketches = { s1: rect('s1', -5, -5, 5, 5), t1: onPlane('t1', 'top', -20, -20, 20, 20), r0: onPlane('r0', 'right', -20, -20, 20, 20) };
    doc.features = [boss('e1', 's1'), planar('p1', 't1')];
    return doc;
  }
  /** the halves of the split block: their height along y (5 each for a split on the Top plane) */
  const heights = (bodies: Body[]) => bodies.map((b) => {
    b.geometry.computeBoundingBox();
    return Math.round((b.geometry.boundingBox!.max.y - b.geometry.boundingBox!.min.y) * 1000) / 1000;
  });

  it('a surface body is named after its feature and keeps the name when a surface is inserted before it', () => {
    const doc = blockAndSurface();
    const surf = rebuildDocument(doc).surfaceBodies![0].id;
    expect(surf).toBe('p1#0');
    doc.features.push(split(['e1#0', surf]));
    const before = rebuildDocument(doc);
    expect(before.errors).toEqual({});
    expect(heights(before.bodies)).toEqual([5, 5]);
    // a surface on the Right plane goes in first: with the old names (surf<N>) the Intersect took that one and split
    // the block along x; with ids after the feature it still takes the surface on the Top plane
    doc.features = [doc.features[0], planar('p0', 'r0'), ...doc.features.slice(1)];
    const after = rebuildDocument(doc);
    expect(after.errors).toEqual({});
    expect(after.surfaceBodies!.map((s) => s.id)).toEqual(['p0#0', 'p1#0']);
    expect(heights(after.bodies)).toEqual([5, 5]);
    expect(after.bodies.map((b) => b.id)).toEqual(['ix#0', 'ix#1']);
  });

  it('a file of format 2 with a surf<N> reference opens pointing to the same surface', () => {
    const doc = blockAndSurface();
    doc.features = [doc.features[0], planar('p0', 'r0'), doc.features[1], split(['body1', 'surf2'])];
    const old = { ...JSON.parse(serializeDocument(doc)), version: 2, hiddenBodies: ['surf1'] };
    delete old.app;
    const back = parseDocument(JSON.stringify(old));
    expect((back.features.find((f) => f.id === 'ix') as IntersectFeature).bodies).toEqual(['e1#0', 'p1#0']);
    expect(back.hiddenBodies).toEqual(['p0#0']);
    const r = rebuildDocument(back);
    expect(r.errors).toEqual({});
    expect(heights(r.bodies)).toEqual([5, 5]);
  });
});
