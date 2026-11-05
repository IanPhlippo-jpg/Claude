/**
 * De ingebouwde nagelstofafzuiging (voorbeelden/afzuiging, 2026-11-05): elk onderdeel bouwt op beide kernels tot één
 * body met dezelfde vorm, het rooster is lasersnijbaar, de PLA-delen passen op een printbed van 220 x 220, de
 * filterlade schuift tussen dicht en 110 mm open (de filtermat schuift mee) en niets botst.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import { rebuildDocument } from '../core/features/rebuild';
import { setBrepKernel } from '../core/features/brepKernel';
import { occtKernel } from '../core/occt/brep';
import { parseDocument } from '../core/document/persistence';
import { meshVolume } from '../core/features/solid';
import { rebuildAssembly, solveMates } from '../core/assembly/assembly';
import { detectInterferences } from '../core/assembly/interference';
import type { Component, Document } from '../core/document/types';

const DIR = 'voorbeelden/afzuiging';
const open = (f: string): Document => parseDocument(readFileSync(`${DIR}/${f}`, 'utf8'));
const DELEN = readdirSync(DIR).filter((f) => f.endsWith('.kcad') && f !== 'Afzuiging.kcad');
type R = { bodies: { geometry: THREE.BufferGeometry }[] };
const bouw = (f: string) => {
  const r = rebuildDocument(open(f)) as unknown as R;
  const g = r.bodies[0]?.geometry;
  g?.computeBoundingBox();
  return { n: r.bodies.length, volume: g ? meshVolume(g) : 0, bb: g?.boundingBox ?? new THREE.Box3() };
};
const rond = (v: THREE.Vector3) => v.toArray().map((x) => Math.round(x * 10) / 10 + 0); // + 0: geen -0

const mesh: Record<string, ReturnType<typeof bouw>> = {};

describe('afzuiging, onderdelen (mesh)', () => {
  it.each(DELEN)('%s is één body', (f) => {
    mesh[f] = bouw(f);
    expect(mesh[f].n).toBe(1);
  }, 60000);

  it('maten: module, rooster, klauw en ventilator', () => {
    expect(rond(mesh['Inbouwmodule.kcad'].bb.min)).toEqual([-107, -100, -79]);
    expect(rond(mesh['Inbouwmodule.kcad'].bb.max)).toEqual([107, 3, 79]);
    expect(rond(mesh['Rooster-LB.kcad'].bb.min)).toEqual([-98, 1.4, -70]);
    expect(rond(mesh['Rooster-LB.kcad'].bb.max)).toEqual([98, 2.9, 70]);
    expect(rond(mesh['Klauw.kcad'].bb.max)).toEqual([17, 8, 6]);
    expect(rond(mesh['Ventilator-NF-F12.kcad'].bb.min)).toEqual([-60, -128, -60]);
  });

  it('PLA-delen passen op een printbed van 220 x 220 mm (en 250 hoog)', () => {
    for (const f of DELEN) {
      const doc = open(f);
      if (!/^PLA/.test(doc.material?.name ?? '')) continue;
      const s = mesh[f].bb.getSize(new THREE.Vector3()).toArray().sort((a, b) => b - a);
      expect(s[0], f).toBeLessThanOrEqual(220);
      expect(s[2], f).toBeLessThanOrEqual(250);
    }
  });

  it('rooster: volume = (plaat - gaten) x 1,5 en het laserrapport is schoon', () => {
    const L = JSON.parse(readFileSync(`${DIR}/laser/rooster.loops`, 'utf8')) as { outer: number[][]; holes: number[][][]; dikte: number; rapport: Record<string, number> };
    const area = (p: number[][]) => Math.abs(p.reduce((a, q, i) => a + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0) / 2);
    const v = (area(L.outer) - L.holes.reduce((a, h) => a + area(h), 0)) * L.dikte;
    expect(Math.abs(mesh['Rooster-LB.kcad'].volume - v)).toBeLessThan(v * 1e-6);
    expect(L.rapport.losse_eilanden).toBe(0);
    expect(L.rapport.stukken_staal).toBe(1);
    expect(L.rapport.stukken_staal_met_steg_onder_min).toBe(0);
    expect(L.rapport.sleuven_met_vernauwing_onder_min).toBe(0);
    expect(L.rapport.open_cm2).toBeGreaterThan(93); // ~ het doorstroomoppervlak van een ventilator van 120 mm
  });
});

describe('afzuiging, assemblage', () => {
  const asm = () => open('Afzuiging.kcad') as Document & { components: Component[]; mates: NonNullable<Document['mates']> };
  const schuif = (comps: Component[], id: string, d: [number, number, number]) => comps.map((c) => (c.id === id ? { ...c, position: [c.position[0] + d[0], c.position[1] + d[1], c.position[2] + d[2]] as [number, number, number] } : c));

  it('de filterlade schuift tussen dicht en 110 mm open; de filtermat schuift mee', () => {
    const a = asm();
    const pos = (comps: Component[], id: string) => solveMates(comps, a.mates).find((c) => c.id === id)!.position.map((v) => +v.toFixed(4));
    expect(pos(schuif(a.components, 'a3', [0, 0, 60]), 'a3')).toEqual([0, 0, 60]);
    expect(pos(schuif(a.components, 'a3', [0, 0, 400]), 'a3')).toEqual([0, 0, 110]);
    expect(pos(schuif(a.components, 'a3', [0, 0, -30]), 'a3')).toEqual([0, 0, 0]);
    expect(pos(schuif(a.components, 'a3', [8, 5, 50]), 'a3')).toEqual([0, 0, 50]);
    expect(pos(schuif(a.components, 'a3', [0, 0, 80]), 'a4')).toEqual([0, 0, 80]);
  });

  it('niets botst, met de lade dicht en open', () => {
    const a = asm();
    for (const z of [0, 110]) {
      const comps = schuif(schuif(a.components, 'a3', [0, 0, z]), 'a4', [0, 0, z]);
      const r = rebuildAssembly({ ...a, components: comps } as Document);
      const hits = detectInterferences(r.bodies).filter((h) => h.volume > 1);
      expect(hits.map((h) => `${h.a} x ${h.b}: ${h.volume.toFixed(0)}`)).toEqual([]);
    }
  }, 120000);
});

describe('afzuiging, B-rep', () => {
  afterAll(() => setBrepKernel(null));
  it('elk onderdeel exact, zelfde volume als de mesh', async () => {
    const require = createRequire(import.meta.url);
    const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
    const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
    const replicad = await import('replicad');
    replicad.setOC(OC as never);
    setBrepKernel(occtKernel(OC, replicad));
    for (const f of DELEN) {
      const b = bouw(f);
      expect(b.n, f).toBe(1);
      expect(Math.abs(b.volume - mesh[f].volume), f).toBeLessThan(mesh[f].volume * 2e-3);
      expect(rond(b.bb.min), f).toEqual(rond(mesh[f].bb.min));
      expect(rond(b.bb.max), f).toEqual(rond(mesh[f].bb.max));
    }
  }, 300000);

  // AFZUIGING_STL=1 npx vitest run src/qa/qaAfzuiging.test.ts: de STL's voor de printer, uit de exacte vorm, in printstand
  // (Z omhoog, op het bed): de module, de dialhouder en de elektronicabox met de flens op het bed, de lade op haar
  // achterkant, de rest plat.
  it.skipIf(!process.env.AFZUIGING_STL)('STL voor de printer', async () => {
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const { prepareTriangles, stlBinary } = await import('../core/document/export3d');
    const plat = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1); // (x, y, z) -> (x, -z, y)
    const flens = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1); // (x, y, z) -> (x, z, -y)
    const stand: Record<string, THREE.Matrix4> = {
      'Inbouwmodule.kcad': flens, 'Dialhouder.kcad': flens, 'Elektronicabox.kcad': flens,
      'Filterlade.kcad': new THREE.Matrix4(), 'Ventilatorplaat.kcad': plat, 'Klauw.kcad': plat, 'Deksel-elektronicabox.kcad': plat,
    };
    mkdirSync(`${DIR}/print`, { recursive: true });
    for (const [f, m] of Object.entries(stand)) {
      const r = rebuildDocument(open(f)) as unknown as R;
      const g = r.bodies[0].geometry.clone().applyMatrix4(m);
      const { tris } = prepareTriangles([{ geometry: g }], { format: 'stl' });
      writeFileSync(`${DIR}/print/${f.replace('.kcad', '.stl')}`, new Uint8Array(stlBinary(tris[0], f.replace('.kcad', ''))));
      g.computeBoundingBox();
      const s = g.boundingBox!.getSize(new THREE.Vector3());
      expect(Math.max(s.x, s.y), f).toBeLessThanOrEqual(220);
    }
  }, 300000);
});
