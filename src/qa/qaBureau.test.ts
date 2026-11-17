/**
 * Het bureau van de foto (voorbeelden/bureau, 2026-11-05): IKEA-maten, op beide kernels opgebouwd.
 * Tafelblad 1400 x 600 x 34 op twee ALEX-ladekasten 360 x 580 x 700 met elk vijf lades op geleiders.
 * Een lade schuift alleen naar voren en achteren, tussen dicht (0) en open (450 mm), en raakt de kast nergens.
 * Versie 7.4 (advies Fable 5.2 v1, B-1, B-3, B-8): het blad zit met 4 schroeven vast op de kasten (in de rand van het blad),
 * de module zit in de uitsparing en de knieruimte onder het blad is nagerekend (AANNAME EN 527-1).
 */
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import { rebuildDocument } from './rebuildStreng';
import { setBrepKernel } from '../core/features/brepKernel';
import { occtKernel } from '../core/occt/brep';
import { parseDocument } from '../core/document/persistence';
import { meshVolume } from '../core/features/solid';
import { rebuildAssembly, solveMates } from '../core/assembly/assembly';
import { detectInterferences } from '../core/assembly/interference';
import { echteBotsingen } from './overlap';
import type { Component, Document } from '../core/document/types';
// @ts-expect-error: het generatorscript is plain JavaScript
import { MATEN, bevestigingsSchroeven, knieruimte } from '../../voorbeelden/bureau/maak-bureau.mjs';

const open = (f: string): Document => parseDocument(readFileSync(`voorbeelden/bureau/${f}`, 'utf8'));

// korpus min holte plus tien geleiders (16 x 10 x 510, waarvan 2 mm in de zijwand)
const KAST = 360 * 564 * 700 - 328 * 668 * 556 + 10 * 14 * 10 * 510;
// bak (2 mm in het front) + front - holte + twee loopregels (2 mm in de bakwand en 2 mm in het front)
const LADE = 296 * 100 * 522 + (356 * 136 * 16 - 296 * 100 * 2) - 280 * 510 * 92 + 2 * (16 * 10 * 492 - 2 * 10 * 492 - 16 * 10 * 2 + 2 * 10 * 2);
const VERWACHT = {
  // min de uitsparingen voor de afzuiging (212 x 212, hoeken R6) en de knop (gatzaag Ø44); onderaan de uitsparing voor de
  // voedingsbox (212 x 102 x 15, R5) met 4 voorboorgaten Ø2,5 x 14 voor de schroeven van de rand, de sleuf naar de knop
  // (5 x 5, schuin; 7.4: geen sleuf meer naar de module) en 4 voorboorgaten Ø2,5 x 14 voor de schroeven naar de kasten
  'LAGKAPTEN-tafelblad.kcad': {
    volume: (1400 * 600 - (212 * 212 - (4 - Math.PI) * 36) - Math.PI * 22 * 22) * 34 - (212 * 102 - (4 - Math.PI) * 25) * 15 - 8 * Math.PI * 1.25 * 1.25 * 14
      - 25 * (Math.hypot(146, 425) * (1 - 2 / 146) - 22),
    min: [-700, 0, -300], max: [700, 34, 300],
  },
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
      // de schroeven blad-kast tappen hun eigen gat in de bovenplaat van de ALEX (daar is geen gat getekend)
      const hits = detectInterferences(bodies).filter((h) => !(/^bs\d$/.test(h.a) && /^k\d$/.test(h.b)) && !(/^bs\d$/.test(h.b) && /^k\d$/.test(h.a)));
      expect(echteBotsingen(hits, bodies)).toEqual([]);
    }
  }, 1200000);
});

describe('bureau: blad, module en knieruimte (7.4)', () => {
  const asm = () => open('Bureau.kcad') as Document & { components: Component[] };

  it('B-3: het blad zit met 4 schroeven vast op de kasten, in de rand van het blad en in de bovenplaat van een ALEX', () => {
    const { blad, kast, bevestiging: Bv } = MATEN;
    const s = bevestigingsSchroeven() as [number, number][];
    expect(s.length).toBe(4);
    const a = asm();
    expect(a.components.filter((c) => /^bs\d$/.test(c.id)).length).toBe(4);
    const goed = ([x, z]: [number, number]) => {
      const inRand = blad.breedte / 2 - Math.abs(x) <= Bv.rand; // AANNAME: rand van minstens 30 mm
      const opKast = Math.abs(x) <= blad.breedte / 2 - kast.wand - 2 && Math.abs(x) >= blad.breedte / 2 - kast.breedte + kast.wand;
      const inDiepte = Math.abs(z + MATEN.overstekVoor / 2) <= kast.diepte / 2 - kast.wand;
      return inRand && opKast && inDiepte;
    };
    for (const p of s) expect(goed(p), String(p)).toBe(true);
    // tegenproef: een schroef aan de binnenkant van de kast (x = 366) zit in de honingraat, niet in de rand
    expect(goed([366, 0])).toBe(false);
    // de schroef gaat 14 mm in het blad (30 lang door een bovenplaat van 16)
    expect(Bv.schroef.l - kast.wand).toBe(14);
  });

  it('B-8: de module zit in de uitsparing, het frame op het blad; de knieruimte is nagerekend (B-1)', () => {
    const a = asm();
    const r = rebuildAssembly({ ...a, components: a.components.filter((c) => /^a(1|4|6)$/.test(c.id)) } as Document);
    const top = MATEN.kast.hoogte + MATEN.blad.dikte;
    for (const b of r.bodies) {
      b.geometry.computeBoundingBox();
      const bb = b.geometry.boundingBox!;
      if (b.id === 'a6') expect(bb.min.y, 'frame op het blad').toBeCloseTo(top, 3);
      else expect(Math.max(-bb.min.x, bb.max.x, -bb.min.z, bb.max.z), b.id).toBeLessThan(106);
    }
    // het laagste punt van de afzuiging is de bodem van de kuip
    const k = r.bodies.find((b) => b.id === 'a4')!.geometry;
    k.computeBoundingBox();
    const kr = knieruimte();
    expect(k.boundingBox!.min.y).toBeCloseTo(kr.onderKuip, 1);
    // B-1: de vrije hoogte onder de kuip haalt de AANNAME van 620 mm (EN 527-1) NIET: dat staat eerlijk in het rekenwerk en
    // er is een poort vóór het frezen (kartonproef). Wordt de kuip ooit lager, dan faalt deze test (geen stille verslechtering)
    expect(kr.onderKuip).toBeGreaterThanOrEqual(598);
    if (!kr.voldoet) {
      expect(readFileSync('voorbeelden/afzuiging/README.md', 'utf8')).toMatch(/Kartonproef \(B-1\)/);
      expect(readFileSync('voorbeelden/afzuiging/docs/Vrijgave-en-meetplan.md', 'utf8')).toMatch(/karton/i);
    }
  }, 600000);
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
  }, 600000);
});
