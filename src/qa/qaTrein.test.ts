/**
 * De kabeldoos van de treinverlichting (voorbeelden/treinverlichting): elk onderdeel bouwt (de geprinte delen als één
 * lichaam, exact op de B-rep-kernel), de doos past op het bed van de Centauri Carbon (256 x 256), en in de assemblage
 * botst niets. Snel alleen enkele onderdelen: TREIN_DELEN=Kabeldoos-bak. De STL's voor de printer: TREIN_STL=1.
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

const DIR = 'voorbeelden/treinverlichting';
const open = (f: string): Document => parseDocument(readFileSync(`${DIR}/${f}`, 'utf8'));
const KEUZE = process.env.TREIN_DELEN?.split(',').map((s) => `${s.trim().replace(/\.kcad$/, '')}.kcad`);
const DELEN = readdirSync(DIR).filter((f) => f.endsWith('.kcad') && f !== 'Kabeldoos.kcad' && (!KEUZE || KEUZE.includes(f)));
const PRINT = ['Kabeldoos-bak.kcad', 'Kabeldoos-deksel.kcad'];
type R = { bodies: { geometry: THREE.BufferGeometry }[]; brep?: Record<string, unknown> };
const bouw = (f: string) => {
  const r = rebuildDocument(open(f)) as unknown as R;
  const box = new THREE.Box3();
  let volume = 0;
  for (const b of r.bodies) { b.geometry.computeBoundingBox(); box.union(b.geometry.boundingBox!); volume += meshVolume(b.geometry); }
  return { n: r.bodies.length, volume, bb: box, exact: r.bodies.length > 0 && Object.keys(r.brep ?? {}).length === r.bodies.length };
};
const mesh: Record<string, ReturnType<typeof bouw>> = {};

describe('kabeldoos, onderdelen (mesh)', () => {
  it.each(DELEN)('%s bouwt', (f) => {
    mesh[f] = bouw(f);
    expect(mesh[f].n).toBeGreaterThan(0);
    if (PRINT.includes(f)) expect(mesh[f].n, 'een geprint deel is één lichaam').toBe(1);
  }, 600000);

  it('de geprinte delen passen op het bed van 256 x 256 (3 mm marge)', () => {
    for (const f of PRINT.filter((f) => mesh[f])) {
      const s = mesh[f].bb.getSize(new THREE.Vector3());
      expect(Math.max(s.x, s.z), f).toBeLessThanOrEqual(250);
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
      expect(b.n, f).toBe(1);
      expect(b.exact, `${f} heeft geen exacte vorm`).toBe(true);
      expect(Math.abs(b.volume - mesh[f].volume), f).toBeLessThan(mesh[f].volume * 2e-3);
    }
  }, 600000);

  // de STL's uit de exacte vorm, in printstand (Z omhoog): de bak met de bodem op het bed, het deksel met de buitenkant op
  // het bed (de drukribben en de centreerrand naar boven); elk bestand dicht en manifold
  it.skipIf(!process.env.TREIN_STL)('STL voor de printer', async () => {
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const { prepareTriangles, stlBinary } = await import('../core/document/export3d');
    const rechtop = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1); // (x, y, z) -> (x, -z, y)
    const omgekeerd = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1); // (x, y, z) -> (x, z, -y)
    mkdirSync(`${DIR}/print`, { recursive: true });
    for (const [f, m] of [['Kabeldoos-bak.kcad', rechtop], ['Kabeldoos-deksel.kcad', omgekeerd]] as const) {
      const r = rebuildDocument(open(f)) as unknown as R;
      expect(Object.keys(r.brep ?? {}).length, `${f}: STL niet uit de exacte vorm`).toBe(1);
      const geo = r.bodies[0].geometry.clone().applyMatrix4(m);
      geo.computeBoundingBox();
      geo.translate(0, 0, -geo.boundingBox!.min.z); // op het bed
      const { tris } = prepareTriangles([{ geometry: geo }], { format: 'stl' });
      writeFileSync(`${DIR}/print/${f.replace('.kcad', '.stl')}`, new Uint8Array(stlBinary(tris[0], f.replace('.kcad', ''))));
      const c = stlControle(geo);
      expect({ f, open: c.open, dubbel: c.dubbel }).toEqual({ f, open: 0, dubbel: 0 });
      expect(c.plat, f).toBeLessThan(c.driehoeken / 100);
    }
  }, 900000);
});

describe('kabeldoos, assemblage', () => {
  it('niets botst', () => {
    if (KEUZE) return;
    const a = open('Kabeldoos.kcad') as Document & { components: Component[] };
    const r = rebuildAssembly(a);
    expect(echteBotsingen(detectInterferences(r.bodies), r.bodies)).toEqual([]);
  }, 900000);
});
