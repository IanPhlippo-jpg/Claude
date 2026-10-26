import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createDocument } from '../document/types';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from '../features/rebuild';
import { meshVolume } from '../features/solid';
import { meshesToStep, meshToSolid, stepToMeshes } from './step';

type Replicad = typeof import('replicad');
let replicad: Replicad;

beforeAll(async () => {
  const require = createRequire(import.meta.url);
  const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
  const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
  replicad = await import('replicad');
  replicad.setOC(OC as never);
}, 60000);

const flat = (g: import('three').BufferGeometry) => (g.index ? g.toNonIndexed() : g).getAttribute('position').array as Float32Array;

function plate(hole: boolean) {
  const doc = createDocument();
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 60 }, { x: 0, y: 60 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  if (hole) s = addCircle(s, { x: 40, y: 30 }, 10)[0];
  doc.sketches.sk1 = s;
  doc.features.push({ id: 'f1', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
  return rebuildDocument(doc).bodies[0].geometry;
}

describe('STEP through OpenCascade (F51)', () => {
  it('a box mesh becomes a B-rep solid with six planar faces and its exact volume', () => {
    const OC = replicad.getOC() as never as { TopExp_Explorer: new (...a: unknown[]) => { More(): boolean; Next(): void; delete(): void }; TopAbs_ShapeEnum: Record<string, unknown> };
    const solid = meshToSolid(OC, flat(plate(false)));
    expect(solid).not.toBeNull();
    const shape = replicad.cast(solid);
    expect(Math.abs(Math.abs(replicad.measureVolume(shape as never)) - 80 * 60 * 10)).toBeLessThan(1e-6);
    let faces = 0;
    const ex = new OC.TopExp_Explorer(solid, OC.TopAbs_ShapeEnum.TopAbs_FACE, OC.TopAbs_ShapeEnum.TopAbs_SHAPE);
    while (ex.More()) { faces++; ex.Next(); }
    ex.delete();
    expect(faces).toBe(6);
  });

  it('a plate with a hole goes out as STEP and comes back with the same volume', async () => {
    const g = plate(true);
    const meshVol = meshVolume(g);
    const { bytes, volumes } = await meshesToStep(replicad, [{ name: 'Plate', positions: flat(g) }]);
    expect(new TextDecoder().decode(bytes.slice(0, 13))).toBe('ISO-10303-21;');
    expect(Math.abs(volumes[0] - meshVol)).toBeLessThan(1e-3);
    const back = await stepToMeshes(replicad, bytes, 0.01);
    expect(back).toHaveLength(1);
    expect(Math.abs(back[0].volume - meshVol)).toBeLessThan(1e-3);
    expect(back[0].positions.length % 9).toBe(0);
  }, 60000);

  it('a file in inches comes in in millimetres', async () => {
    const { bytes } = await meshesToStep(replicad, [{ name: 'Plate', positions: flat(plate(false)) }], 'in');
    expect(new TextDecoder().decode(bytes)).toMatch(/INCH/);
    const back = await stepToMeshes(replicad, bytes);
    expect(Math.abs(back[0].volume - 80 * 60 * 10)).toBeLessThan(1e-3);
  }, 60000);
});
