/**
 * Het bureau van de foto (voorbeelden/bureau, 2026-11-05): IKEA-maten, op beide kernels opgebouwd.
 * Tafelblad 1400 x 600 x 34 op twee ALEX-ladekasten 360 x 580 x 700 met elk vijf lades op geleiders.
 * Een lade schuift alleen naar voren en achteren, tussen dicht (0) en open (450 mm), en raakt de kast nergens.
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
import { rebuildAssembly, solveMates } from '../core/assembly/assembly';
import { detectInterferences } from '../core/assembly/interference';
import { echteBotsingen } from './overlap';
import type { Component, Document } from '../core/document/types';

const open = (f: string): Document => parseDocument(readFileSync(`voorbeelden/bureau/${f}`, 'utf8'));

// korpus min holte plus tien geleiders (16 x 10 x 510, waarvan 2 mm in de zijwand)
const KAST = 360 * 564 * 700 - 328 * 668 * 556 + 10 * 14 * 10 * 510;
// bak (2 mm in het front) + front - holte + twee loopregels (2 mm in de bakwand en 2 mm in het front)
const LADE = 296 * 100 * 522 + (356 * 136 * 16 - 296 * 100 * 2) - 280 * 510 * 92 + 2 * (16 * 10 * 492 - 2 * 10 * 492 - 16 * 10 * 2 + 2 * 10 * 2);
const VERWACHT = {
  // min de uitsparingen voor de afzuiging (196 x 140, hoeken R5) en de knop (gatzaag Ø44)
  'LAGKAPTEN-tafelblad.kcad': { volume: (1400 * 600 - (196 * 140 - (4 - Math.PI) * 25) - Math.PI * 22 * 22) * 34, min: [-700, 0, -300], max: [700, 34, 300] },
  'ALEX-ladekast.kcad': { volume: KAST, min: [-180, 0, -290], max: [180, 700, 274] },
  'ALEX-lade.kcad': { volume: LADE, min: [-178, 0, -520], max: [178, 136, 16] },
};

function check(doc: Document, exp: (typeof VERWACHT)[keyof typeof VERWACHT]) {
  const r = rebuildDocument(doc) as unknown as { bodies: { geometry: THREE.BufferGeometry }[] };
  expect(r.bodies.length).toBe(1);
  const g = r.bodies[0].geometry;
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  expect(bb.min.toArray().map((v) => Math.round(v) + 0)).toEqual(exp.min); // + 0: geen -0
  expect(bb.max.toArray().map((v) => Math.round(v) + 0)).toEqual(exp.max);
  expect(Math.abs(meshVolume(g) - exp.volume)).toBeLessThan(exp.volume * 2e-5 + 1); // bogen R5 als veelhoek in de mesh
}

describe('bureau, mesh', () => {
  for (const [f, exp] of Object.entries(VERWACHT)) it(f, () => check(open(f), exp), 60000);

  const asm = () => open('Bureau.kcad') as Document & { components: Component[]; mates: NonNullable<Document['mates']> };
  const verschuif = (comps: Component[], id: string, d: [number, number, number]) => comps.map((c) => (c.id === id ? { ...c, position: [c.position[0] + d[0], c.position[1] + d[1], c.position[2] + d[2]] as [number, number, number] } : c));

  it('assemblage: kasten flush aan zijkant en achterkant, blad op 700 mm, tien lades met elk drie mates', () => {
    const a = asm();
    expect(a.components.filter((c) => c.part.name === 'ALEX lade').length).toBe(10);
    expect(a.mates.filter((m) => m.folder?.startsWith('Lades')).length).toBe(30);
    const afz = JSON.parse(readFileSync('voorbeelden/afzuiging/Afzuiging.kcad', 'utf8')) as { components: unknown[] };
    expect(a.components.filter((c) => c.id.startsWith('a')).length).toBe(afz.components.length); // de afzuiging, met alle schroeven
    expect(a.components.find((c) => c.id === 'k1')!.position).toEqual([-520, 0, -10]);
    expect(a.components.find((c) => c.id === 'k2')!.position).toEqual([520, 0, -10]);
    expect(a.components.find((c) => c.id === 't1')!.position).toEqual([0, 700, 0]);
    // de mates houden de lades waar ze staan: niets verschuift bij het oplossen
    const s = solveMates(a.components, a.mates);
    for (const c of a.components) expect(s.find((x) => x.id === c.id)!.position.map((v) => +v.toFixed(6))).toEqual(c.position);
  });

  it('een lade schuift langs de geleider tussen dicht en open, en springt terug als ze opzij of omhoog getrokken wordt', () => {
    const a = asm();
    const z0 = a.components.find((c) => c.id === 'l3')!.position;
    const pos = (comps: Component[]) => solveMates(comps, a.mates).find((c) => c.id === 'l3')!.position.map((v) => +v.toFixed(4));
    expect(pos(verschuif(a.components, 'l3', [0, 0, 300]))).toEqual([z0[0], z0[1], z0[2] + 300]);
    expect(pos(verschuif(a.components, 'l3', [0, 0, 900]))).toEqual([z0[0], z0[1], z0[2] + 450]);
    expect(pos(verschuif(a.components, 'l3', [0, 0, -60]))).toEqual(z0);
    expect(pos(verschuif(a.components, 'l3', [25, 40, 200]))).toEqual([z0[0], z0[1], z0[2] + 200]);
  });

  it('geen botsing tussen lades en kast, dicht en helemaal open', () => {
    const a = asm();
    for (const open of [0, 450]) {
      let comps = a.components;
      if (open) for (const c of a.components) if (c.part.name === 'ALEX lade') comps = verschuif(comps, c.id, [0, 0, open]);
      const r = rebuildAssembly({ ...a, components: comps } as Document);
      // rond de oorsprong rekenen (het bovenvlak van het blad op Y = 0): bij Y = 700 geeft de mesh-boolean met
      // 32-bit-coördinaten rond de klauwschroeven snippers van een paar mm³ die er in het echt niet zijn
      const bodies = r.bodies.map((b) => ({ ...b, geometry: b.geometry.clone().translate(0, -734, 0) }));
      expect(echteBotsingen(detectInterferences(bodies), bodies)).toEqual([]);
    }
  }, 1200000);
});

describe('bureau, B-rep', () => {
  afterAll(() => setBrepKernel(null));
  it('alle onderdelen exact', async () => {
    const require = createRequire(import.meta.url);
    const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
    const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
    const replicad = await import('replicad');
    replicad.setOC(OC as never);
    setBrepKernel(occtKernel(OC, replicad));
    for (const [f, exp] of Object.entries(VERWACHT)) check(open(f), exp);
  }, 60000);
});
