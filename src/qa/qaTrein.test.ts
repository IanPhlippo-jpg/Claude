/**
 * De kabeldoos van de treinverlichting, versie 2 (voorbeelden/treinverlichting): één doos met kabelgoten. Elk onderdeel
 * bouwt (de geprinte delen exact op de B-rep-kernel; de bak en het deksel als één lichaam), de bak blijft binnen het
 * rebuildbudget van de app, elk geprint deel past in 230 x 230 (het bed van de Centauri Carbon zonder de hoek van het
 * filamentmes, met skirt), de doos is hoogstens 80 hoog en in de assemblage botst niets (ook de gootdeksels niet).
 * Snel alleen enkele onderdelen: TREIN_DELEN=Kabeldoos-bak. De STL's voor de printer: TREIN_STL=1.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import { rebuildDocument } from './rebuildStreng';
import { stlControle } from './stlControle';
import { setBrepKernel } from '../core/features/brepKernel';
import { occtKernel } from '../core/occt/brep';
import { parseDocument } from '../core/document/persistence';
import { meshVolume } from '../core/features/solid';
import { rebuildAssembly } from '../core/assembly/assembly';
import { echteBotsingen } from './overlap';
import { detectInterferences } from '../core/assembly/interference';
import type { Component, Document } from '../core/document/types';
// @ts-expect-error: het generatorscript is plain JavaScript
import { M, gootDeksels } from '../../voorbeelden/treinverlichting/maak-kabeldoos.mjs';

const DIR = 'voorbeelden/treinverlichting';
const open = (f: string): Document => parseDocument(readFileSync(`${DIR}/${f}`, 'utf8'));
const KEUZE = process.env.TREIN_DELEN?.split(',').map((s) => `${s.trim().replace(/\.kcad$/, '')}.kcad`);
const DELEN = readdirSync(DIR).filter((f) => f.endsWith('.kcad') && f !== 'Kabeldoos.kcad' && (!KEUZE || KEUZE.includes(f)));
const STL = { 'Kabeldoos-bak.kcad': 'rechtop', 'Kabeldoos-deksel.kcad': 'omgekeerd', 'Gootdeksels-plaat.kcad': 'rechtop' } as const;
const PRINT = [...Object.keys(STL), 'Gootdeksel.kcad'];
/** het aantal lichamen: de plaat met gootdeksels heeft één lichaam per lengte (de gelijke dekseltjes in één extrusie) */
const lichamen = (f: string) => (f === 'Gootdeksels-plaat.kcad' ? new Set((gootDeksels() as { l: number }[]).map((d) => d.l)).size : 1);
type R = { bodies: { geometry: THREE.BufferGeometry }[]; brep?: Record<string, unknown> };
const bouw = (f: string) => {
  const t0 = performance.now();
  const r = rebuildDocument(open(f)) as unknown as R;
  const tijd = performance.now() - t0;
  const box = new THREE.Box3();
  let volume = 0;
  for (const b of r.bodies) { b.geometry.computeBoundingBox(); box.union(b.geometry.boundingBox!); volume += meshVolume(b.geometry); }
  return { n: r.bodies.length, volume, bb: box, tijd, exact: r.bodies.length > 0 && Object.keys(r.brep ?? {}).length === r.bodies.length };
};
const mesh: Record<string, ReturnType<typeof bouw>> = {};
const BED = (M as { bed: { max: number; hoog: number } }).bed;

describe('kabeldoos, onderdelen (mesh)', () => {
  it.each(DELEN)('%s bouwt', (f) => {
    mesh[f] = bouw(f);
    expect(mesh[f].n).toBeGreaterThan(0);
    if (PRINT.includes(f)) expect(mesh[f].n, 'een geprint deel: één lichaam (de plaat: één per lengte)').toBe(lichamen(f));
    // de app rekent hoogstens 45 s per onderdeel (rebuildbudget van de mesh-kernel)
    if (f === 'Kabeldoos-bak.kcad') expect(mesh[f].tijd, `rebuild ${Math.round(mesh[f].tijd)} ms`).toBeLessThan(45000);
  }, 600000);

  it('elk geprint deel past in 230 x 230 (het bed zonder de hoek van het filamentmes, met skirt)', () => {
    for (const f of PRINT.filter((f) => mesh[f])) {
      const s = mesh[f].bb.getSize(new THREE.Vector3());
      expect(Math.max(s.x, s.z), f).toBeLessThanOrEqual(BED.max);
    }
  });
});

describe('kabeldoos, B-rep', () => {
  afterAll(() => setBrepKernel(null));
  it('de geprinte delen exact, zelfde volume als de mesh', async () => {
    const require = createRequire(import.meta.url);
    const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
    const OC = await init({ wasmBinary: readFileSync(require.resolve('replicad-opencascadejs/wasm')) });
    const replicad = await import('replicad');
    replicad.setOC(OC as never);
    setBrepKernel(occtKernel(OC, replicad));
    for (const f of PRINT.filter((f) => DELEN.includes(f))) {
      const b = bouw(f);
      expect(b.n, f).toBe(lichamen(f));
      expect(b.exact, `${f} heeft geen exacte vorm`).toBe(true);
      expect(Math.abs(b.volume - mesh[f].volume), f).toBeLessThan(mesh[f].volume * 2e-3);
    }
  }, 1800000);

  // de STL's uit de exacte vorm, in printstand (Z omhoog): de bak met de bodem op het bed, het deksel met de buitenkant op
  // het bed (de drukribben en de centreerrand naar boven), de gootdeksels met de vlakke kant op het bed; elk bestand dicht
  // en manifold en binnen 230 x 230
  it.skipIf(!process.env.TREIN_STL)('STL voor de printer', async () => {
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const { prepareTriangles, stlBinary } = await import('../core/document/export3d');
    const stand = {
      rechtop: new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1), // (x, y, z) -> (x, -z, y)
      omgekeerd: new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1), // (x, y, z) -> (x, z, -y)
    };
    mkdirSync(`${DIR}/print`, { recursive: true });
    for (const [f, s] of Object.entries(STL)) {
      const r = rebuildDocument(open(f)) as unknown as R;
      expect(Object.keys(r.brep ?? {}).length, `${f}: STL niet uit de exacte vorm`).toBe(lichamen(f));
      const geos = r.bodies.map((b) => b.geometry.clone().applyMatrix4(stand[s]));
      const bb = new THREE.Box3();
      for (const g of geos) { g.computeBoundingBox(); bb.union(g.boundingBox!); }
      for (const g of geos) g.translate(0, 0, -bb.min.z); // op het bed
      const { tris } = prepareTriangles(geos.map((geometry) => ({ geometry })), { format: 'stl' });
      writeFileSync(`${DIR}/print/${f.replace('.kcad', '.stl')}`, new Uint8Array(stlBinary(tris.flat(), f.replace('.kcad', ''))));
      for (const g of geos) {
        const c = stlControle(g);
        expect({ f, open: c.open, dubbel: c.dubbel }).toEqual({ f, open: 0, dubbel: 0 });
        expect(c.plat, f).toBeLessThan(c.driehoeken / 100);
      }
      const m = bb.getSize(new THREE.Vector3());
      expect(Math.max(m.x, m.y), `${f}: ${m.x.toFixed(1)} x ${m.y.toFixed(1)}`).toBeLessThanOrEqual(BED.max);
    }
  }, 1800000);
});

describe('kabeldoos, assemblage', () => {
  it('niets botst en de dichte doos is hoogstens 80 hoog', () => {
    if (KEUZE) return;
    const a = open('Kabeldoos.kcad') as Document & { components: Component[] };
    const r = rebuildAssembly(a);
    expect(echteBotsingen(detectInterferences(r.bodies), r.bodies)).toEqual([]);
    const doos = new THREE.Box3();
    for (const b of r.bodies.filter((b) => b.id === 'd1' || b.id === 'd2')) { b.geometry.computeBoundingBox(); doos.union(b.geometry.boundingBox!); }
    const s = doos.getSize(new THREE.Vector3());
    expect(s.y).toBeLessThanOrEqual(BED.hoog);
    expect(Math.max(s.x, s.z)).toBeLessThanOrEqual(BED.max);
  }, 1800000);
});
