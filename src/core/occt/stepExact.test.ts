import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createDocument, type Document } from '../document/types';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from '../features/rebuild';
import { setBrepKernel } from '../features/brepKernel';
import { meshVolume } from '../features/solid';
import { parseDocument, serializeDocument } from '../document/persistence';
import { occtKernel } from './brep';
import { shapesToStep, stepItems, stepToMeshes } from './step';
import { readStepSolid } from './stepRead';

/* eslint-disable @typescript-eslint/no-explicit-any */
let rep: typeof import('replicad');
let OC: any;
let kernel: ReturnType<typeof occtKernel>;
beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
  OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
  rep = await import('replicad');
  rep.setOC(OC as never);
  kernel = occtKernel(OC, rep);
}, 600_000);
afterAll(() => setBrepKernel(null));

/** an 80 x 60 x 10 plate with a D20 hole, built by the B-rep kernel (the hole a true cylinder) */
function plateWithHole(): Document {
  const doc = createDocument();
  let s = createSketch('s1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 60 }, { x: 0, y: 60 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  s = addCircle(s, { x: 40, y: 30 }, 10)[0];
  doc.sketches.s1 = s;
  doc.features.push({ id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
  return doc;
}

/** the faces of a shape by surface type (Plane, Cylinder, …) */
function faceTypes(shape: any): Record<string, number> {
  const out: Record<string, number> = {};
  const ex = new OC.TopExp_Explorer(shape, OC.TopAbs_ShapeEnum.TopAbs_FACE, OC.TopAbs_ShapeEnum.TopAbs_SHAPE);
  while (ex.More()) {
    const ad = new OC.BRepAdaptor_Surface(OC.TopoDS.Face(ex.Current()), true);
    const name = String(ad.GetType().constructor?.name ?? '');
    const key = Object.entries(OC.GeomAbs_SurfaceType).find(([, v]) => v === ad.GetType())?.[0] ?? name;
    out[key] = (out[key] ?? 0) + 1;
    ad.delete();
    ex.Next();
  }
  ex.delete();
  return out;
}

const VOLUME = 80 * 60 * 10 - Math.PI * 100 * 10;

describe('STEP import as an exact B-rep (docs/32 item 5, F161)', () => {
  it('a plate with a hole written as STEP comes back with its STEP text, and the B-rep kernel rebuilds the exact solid', async () => {
    setBrepKernel(kernel);
    const r0 = rebuildDocument(plateWithHole());
    expect(r0.bodies[0].exact).toBe(true);
    const { bytes } = await shapesToStep(rep, stepItems(r0));
    kernel.release();

    // File ▸ Open: one body, its triangles and the STEP text of its solid
    const bodies = await stepToMeshes(rep, bytes, 0.01);
    expect(bodies).toHaveLength(1);
    expect(bodies[0].step?.startsWith('ISO-10303-21;')).toBe(true);
    expect(bodies[0].step).not.toMatch(/\r/);
    expect(Math.abs(bodies[0].volume - VOLUME)).toBeLessThan(1e-3);

    const doc = createDocument('Plaat');
    doc.features.push({ id: 'i1', type: 'imported', name: 'Imported1', suppressed: false, positions: Array.from(bodies[0].positions), source: 'Plaat.step', step: bodies[0].step });

    // the B-rep kernel: the body is the exact solid, 7 faces of which one is a cylinder, and its exact volume
    const r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    expect(r.warnings ?? {}).toEqual({});
    expect(r.bodies).toHaveLength(1);
    expect(r.bodies[0].exact).toBe(true);
    expect(Math.abs((r.bodies[0].exactVolume ?? 0) - VOLUME)).toBeLessThan(1e-3);
    const shape = r.brep?.[r.bodies[0].id] as any;
    expect(shape).toBeTruthy();
    expect(faceTypes(shape)).toEqual({ GeomAbs_Plane: 6, GeomAbs_Cylinder: 1 });
    // and it exports again as the same B-rep (7 faces, the cylinder), not as sewn facets
    const again = new TextDecoder().decode((await shapesToStep(rep, stepItems(r))).bytes);
    expect((again.match(/ADVANCED_FACE/g) ?? []).length).toBe(7);
    expect(again).toMatch(/CYLINDRICAL_SURFACE/);
    kernel.release();

    // the mesh kernel builds the same body from the stored triangles
    setBrepKernel(null);
    const m = rebuildDocument(doc);
    expect(m.bodies).toHaveLength(1);
    expect(m.bodies[0].exact).toBeFalsy();
    expect(Math.abs(meshVolume(m.bodies[0].geometry) - VOLUME) / VOLUME).toBeLessThan(2e-3);
  }, 600_000);

  it('the STEP text survives saving and opening; a damaged one is refused, a missing one leaves the mesh body', async () => {
    setBrepKernel(kernel);
    const r0 = rebuildDocument(plateWithHole());
    const { bytes } = await shapesToStep(rep, stepItems(r0));
    kernel.release();
    const [body] = await stepToMeshes(rep, bytes, 0.05);
    const doc = createDocument('Plaat');
    doc.features.push({ id: 'i1', type: 'imported', name: 'Imported1', suppressed: false, positions: Array.from(body.positions), source: 'Plaat.step', step: body.step });
    const back = parseDocument(serializeDocument(doc));
    const f = back.features[0];
    expect(f.type === 'imported' && f.step).toBe(body.step);
    // a file of an older build (no step field) opens and builds the mesh body
    const old = JSON.parse(serializeDocument(doc));
    delete old.features[0].step;
    const r = rebuildDocument(parseDocument(JSON.stringify(old)));
    expect(r.bodies).toHaveLength(1);
    expect(r.bodies[0].exact).toBeFalsy();
    kernel.release();
    // a step field that is no STEP text is a damaged file
    const bad = JSON.parse(serializeDocument(doc));
    bad.features[0].step = 'hello';
    expect(() => parseDocument(JSON.stringify(bad))).toThrow(/STEP source is damaged/);
    // a STEP text without a solid: a warning, the body is the stored mesh
    const empty = { ...doc, features: [{ ...doc.features[0], step: 'ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n' }] } as Document;
    const w = rebuildDocument(empty);
    expect(w.bodies).toHaveLength(1);
    expect(w.warnings?.i1).toMatch(/could not be read again/);
    kernel.release();
    setBrepKernel(null);
  }, 600_000);

  it('readStepSolid reads the solid of a STEP text synchronously', async () => {
    setBrepKernel(kernel);
    const r0 = rebuildDocument(plateWithHole());
    const text = new TextDecoder().decode((await shapesToStep(rep, stepItems(r0))).bytes);
    kernel.release();
    setBrepKernel(null);
    const solid = readStepSolid(OC, text);
    expect(solid).not.toBeNull();
    expect(Math.abs(kernel.volume(solid) - VOLUME)).toBeLessThan(1e-3);
    solid.delete();
    expect(readStepSolid(OC, 'ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\nENDSEC;\nEND-ISO-10303-21;\n')).toBeNull();
  }, 600_000);
});
