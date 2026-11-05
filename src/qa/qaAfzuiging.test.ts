/**
 * De ingebouwde nagelstofafzuiging (voorbeelden/afzuiging, versie 2, 2026-11-05): elk onderdeel bouwt op beide kernels
 * tot één body met dezelfde vorm, het rooster is lasersnijbaar, de PLA-delen passen op een printbed van 220 x 220, de
 * filterlade schuift tussen dicht en 110 mm open (de filters schuiven mee), niets botst en het luchtkanaal is dicht:
 * lucht kan er alleen in langs het rooster en uit langs de uitblaasplaat.
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
import { echteBotsingen } from './overlap';
import { MeshBVH } from 'three-mesh-bvh';
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
    expect(rond(mesh['Inbouwmodule.kcad'].bb.min)).toEqual([-107, -144, -79]);
    expect(rond(mesh['Inbouwmodule.kcad'].bb.max)).toEqual([107, 3, 79]);
    expect(rond(mesh['Rooster-LB.kcad'].bb.min)).toEqual([-98, 1.4, -70]);
    expect(rond(mesh['Rooster-LB.kcad'].bb.max)).toEqual([98, 2.9, 70]);
    expect(rond(mesh['Klauw.kcad'].bb.max)).toEqual([17, 8, 6]);
    expect(rond(mesh['Ventilator-Delta-PFR1212UHE.kcad'].bb.min)).toEqual([-60, -144, -60]);
    expect(rond(mesh['Uitblaasplaat.kcad'].bb.min)).toEqual([-97, -150, -69]);
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

  it('de filterlade schuift tussen dicht en 110 mm open; de filters schuiven mee', () => {
    const a = asm();
    const pos = (comps: Component[], id: string) => solveMates(comps, a.mates).find((c) => c.id === id)!.position.map((v) => +v.toFixed(4));
    expect(pos(schuif(a.components, 'a3', [0, 0, 60]), 'a3')).toEqual([0, 0, 60]);
    expect(pos(schuif(a.components, 'a3', [0, 0, 400]), 'a3')).toEqual([0, 0, 110]);
    expect(pos(schuif(a.components, 'a3', [0, 0, -30]), 'a3')).toEqual([0, 0, 0]);
    expect(pos(schuif(a.components, 'a3', [8, 5, 50]), 'a3')).toEqual([0, 0, 50]);
    for (const f of ['af1', 'af2', 'af3']) expect(pos(schuif(a.components, 'a3', [0, 0, 80]), f)).toEqual([0, 0, 80]);
  });

  it('niets botst, met de lade dicht en open', () => {
    const a = asm();
    for (const z of [0, 110]) {
      let comps = schuif(a.components, 'a3', [0, 0, z]);
      for (const f of ['af1', 'af2', 'af3']) comps = schuif(comps, f, [0, 0, z]);
      const r = rebuildAssembly({ ...a, components: comps } as Document);
      expect(echteBotsingen(detectInterferences(r.bodies), r.bodies)).toEqual([]);
    }
  }, 120000);
});

/**
 * Luchtdicht: het binnenste van de module (en het dichte ladefront) in kubusjes van 1 mm; vanuit het midden van het
 * kanaal vloeit de lucht naar alle buren die geen materiaal zijn. Ze mag de buitenkant van de romp (|x| > 97,5 of
 * |z| > 69,5) nergens bereiken. Boven stopt het bij het rooster (y = 1), onder bij de uitblaasplaat (y = -143).
 */
function lek(geoms: THREE.BufferGeometry[]): { lek: boolean; waar?: number[]; vrij: number } {
  const X0 = -110, Z0 = -90, Y0 = -143, nx = 220, nz = 180, ny = 145, off = 0.27;
  const vast = new Uint8Array(nx * ny * nz);
  const idx = (i: number, j: number, k: number) => (j * nz + k) * nx + i;
  const ray = new THREE.Ray();
  for (const g of geoms) {
    const bvh = new MeshBVH(g);
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
      const x = X0 + i + off, z = Z0 + k + off;
      ray.origin.set(x, 60, z);
      ray.direction.set(0, -1, 0);
      const ys = (bvh.raycast(ray, THREE.DoubleSide) as { point: THREE.Vector3 }[]).map((h) => h.point.y).sort((a, b) => b - a);
      const u: number[] = [];
      for (const y of ys) if (!u.length || Math.abs(u[u.length - 1] - y) > 1e-5) u.push(y);
      for (let p = 0; p + 1 < u.length; p += 2) {
        const hi = u[p], lo = u[p + 1];
        for (let j = 0; j < ny; j++) { const y = Y0 + j + off; if (y < hi && y > lo) vast[idx(i, j, k)] = 1; }
      }
    }
  }
  const zien = new Uint8Array(nx * ny * nz);
  const start = idx(110, 100, 90); // (0, -43, 0): midden van het kanaal
  if (vast[start]) throw new Error('startpunt zit in materiaal');
  const q = [start];
  zien[start] = 1;
  let vrij = 0;
  while (q.length) {
    const c = q.pop()!;
    vrij++;
    const i = c % nx, k = Math.floor(c / nx) % nz, j = Math.floor(c / (nx * nz));
    const x = X0 + i + off, z = Z0 + k + off;
    if (Math.abs(x) > 97.5 || Math.abs(z) > 69.5) return { lek: true, waar: [x, Y0 + j + off, z], vrij };
    for (const [di, dj, dk] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const a = i + di, b = j + dj, e = k + dk;
      if (a < 0 || a >= nx || b < 0 || b >= ny || e < 0 || e >= nz) continue;
      const n = idx(a, b, e);
      if (!zien[n] && !vast[n]) { zien[n] = 1; q.push(n); }
    }
  }
  return { lek: false, vrij };
}

describe('afzuiging, luchtdicht', () => {
  it('tegenproef: zonder slangen lekt het langs de meetpunten', () => {
    const r = lek([g('Inbouwmodule.kcad'), g('Filterlade.kcad')]);
    expect(r.lek).toBe(true);
    expect(r.waar![0]).toBeLessThan(-97);
  }, 180000);
  const g = (f: string) => (rebuildDocument(open(f)) as unknown as R).bodies[0].geometry;
  // de siliconeslangen in de twee meetpunten (links, y = -45 en -125) lopen gesloten naar de drukmeter
  const slangen = [-45, -125].map((y) => new THREE.CylinderGeometry(3.2, 3.2, 12, 24).rotateZ(Math.PI / 2).translate(-92, y, 0));
  it('met de lade dicht kan de lucht alleen langs het rooster en de uitblaasplaat', () => {
    const r = lek([g('Inbouwmodule.kcad'), g('Filterlade.kcad'), ...slangen]);
    expect(r.lek, JSON.stringify(r.waar)).toBe(false);
    expect(r.vrij).toBeGreaterThan(500000); // het kanaal zelf is ruim een halve liter
  }, 180000);
  it('tegenproef: zonder lade lekt het door de opening in de voorwand', () => {
    const r = lek([g('Inbouwmodule.kcad'), ...slangen]);
    expect(r.lek).toBe(true);
    expect(r.waar![2]).toBeGreaterThan(69);
  }, 180000);
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
  // (Z omhoog, op het bed): de module, de dialhouder en de elektronicabox met de flens op het bed, de lade met het front
  // op het bed, de uitblaasplaat zoals ze zit (lamellen onder 45°), de rest plat.
  it.skipIf(!process.env.AFZUIGING_STL)('STL voor de printer', async () => {
    const { mkdirSync, writeFileSync } = await import('node:fs');
    const { prepareTriangles, stlBinary } = await import('../core/document/export3d');
    const plat = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1); // (x, y, z) -> (x, -z, y)
    const flens = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1); // (x, y, z) -> (x, z, -y)
    const voorOpBed = new THREE.Matrix4().makeRotationX(Math.PI); // (x, y, z) -> (x, -y, -z): het front (+Z) op het bed
    const stand: Record<string, THREE.Matrix4> = {
      'Inbouwmodule.kcad': flens, 'Dialhouder.kcad': flens, 'Elektronicabox.kcad': flens,
      'Filterlade.kcad': voorOpBed, 'Uitblaasplaat.kcad': plat, 'Klauw.kcad': plat, 'Deksel-elektronicabox.kcad': plat,
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
