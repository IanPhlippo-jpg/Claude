/**
 * Het bureau van de foto (voorbeelden/bureau, 2026-11-05): IKEA-maten, op beide kernels opgebouwd.
 * Tafelblad 1400 x 600 x 34, ALEX-kast 360 x 580 x 700 met een voeg van 2 x 3 mm rond de deur.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import { rebuildDocument } from '../core/features/rebuild';
import { setBrepKernel } from '../core/features/brepKernel';
import { occtKernel } from '../core/occt/brep';
import { parseDocument } from '../core/document/persistence';
import { meshVolume } from '../core/features/solid';
import type { Document } from '../core/document/types';

const open = (f: string): Document => parseDocument(readFileSync(`voorbeelden/bureau/${f}`, 'utf8'));
const RING = (332 * 672 - 328 * 668) * 3; // voeg rond de deur
const VERWACHT = {
  'LAGKAPTEN-tafelblad.kcad': { volume: 1400 * 600 * 34, min: [-700, 0, -300], max: [700, 34, 300] },
  'ALEX-kast.kcad': { volume: 360 * 580 * 700 - RING, min: [-180, 0, -290], max: [180, 700, 290] },
};

function check(doc: Document, exp: (typeof VERWACHT)[keyof typeof VERWACHT]) {
  const r = rebuildDocument(doc) as unknown as { bodies: { geometry: THREE.BufferGeometry }[]; errors?: unknown };
  expect(r.bodies.length).toBe(1);
  const g = r.bodies[0].geometry;
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  expect(bb.min.toArray().map((v) => Math.round(v))).toEqual(exp.min);
  expect(bb.max.toArray().map((v) => Math.round(v))).toEqual(exp.max);
  expect(Math.abs(meshVolume(g) - exp.volume)).toBeLessThan(exp.volume * 1e-6 + 1);
}

describe('bureau, mesh', () => {
  for (const [f, exp] of Object.entries(VERWACHT)) it(f, () => check(open(f), exp));
  it('assemblage: kasten flush aan zijkant en achterkant, blad op 700 mm', () => {
    const a = open('Bureau.kcad') as unknown as { components: { name: string; position: number[] }[] };
    expect(a.components.map((c) => [c.name, c.position])).toEqual([
      ['ALEX kast<1>', [-520, 0, -10]],
      ['ALEX kast<2>', [520, 0, -10]],
      ['LAGKAPTEN tafelblad<1>', [0, 700, 0]],
    ]);
  });
});

describe('bureau, B-rep', () => {
  afterAll(() => setBrepKernel(null));
  it('beide onderdelen exact', async () => {
    const require = createRequire(import.meta.url);
    const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
    const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
    const replicad = await import('replicad');
    replicad.setOC(OC as never);
    setBrepKernel(occtKernel(OC, replicad));
    for (const [f, exp] of Object.entries(VERWACHT)) check(open(f), exp);
  }, 60000);
});
