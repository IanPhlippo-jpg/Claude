/**
 * De ingebouwde nagelstofafzuiging (voorbeelden/afzuiging, versie 3.2, 2026-11-05):
 * - elk onderdeel bouwt op beide kernels tot één body met dezelfde vorm; het rooster is lasersnijbaar;
 * - de PETG-delen passen op een printbed van 220 x 220; de module hangt hoogstens 52 mm onder een blad van 34 mm;
 * - niets botst; de klauwen passen bij elke bladdikte van 10 tot 50 mm en liggen ingetrokken binnen de romp;
 * - de filtercassette gaat vrij naar boven uit de module;
 * - het luchtkanaal is dicht: lucht kan er alleen in langs het rooster en uit langs de uitblaasplaat, en het
 *   elektronicavak hoort niet bij het kanaal.
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
import { rebuildAssembly } from '../core/assembly/assembly';
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

  it('maten: romp, frame, rooster, klauw, ventilator; de module hangt hoogstens 52 mm onder een blad van 34 mm', () => {
    expect(rond(mesh['Romp.kcad'].bb.min)).toEqual([-97, -79, -69]);
    expect(rond(mesh['Romp.kcad'].bb.max)).toEqual([97, 0, 69]);
    expect(rond(mesh['Bovenframe.kcad'].bb.min)).toEqual([-103, 0, -75]);
    expect(rond(mesh['Bovenframe.kcad'].bb.max)).toEqual([103, 2.5, 75]);
    // de RVS-plaat ligt op het frame en is er even groot als het: bovenkant 4 mm boven het blad
    expect(rond(mesh['Rooster-LB.kcad'].bb.min)).toEqual([-103, 2.5, -75]);
    expect(rond(mesh['Rooster-LB.kcad'].bb.max)).toEqual([103, 4, 75]);
    expect(rond(mesh['Klauw.kcad'].bb.max)).toEqual([18, 4, 6.5]);
    expect(rond(mesh['Ventilator-Delta-PFR1212UHE.kcad'].bb.min)).toEqual([-60, -79, -60]);
    const onder = mesh['Bodemplaat.kcad'].bb.min.y;
    expect(rond(mesh['Bodemplaat.kcad'].bb.min)).toEqual([-97, -85, -69]); // één plaat over de hele onderkant
    expect(rond(mesh['Bodemplaat.kcad'].bb.max)).toEqual([97, -79, 69]);
    expect(-onder - 34).toBeLessThanOrEqual(52);
  });

  it('PETG-delen passen op een printbed van 220 x 220 mm (en 250 hoog)', () => {
    for (const f of DELEN) {
      const doc = open(f);
      if (!/^PETG/.test(doc.material?.name ?? '')) continue;
      const s = mesh[f].bb.getSize(new THREE.Vector3()).toArray().sort((a, b) => b - a);
      expect(s[0], f).toBeLessThanOrEqual(220);
      expect(s[2], f).toBeLessThanOrEqual(250);
    }
  });

  it('rooster: volume = (plaat - gaten) x 1,5, het laserrapport is schoon en er is genoeg open boven de cassette', () => {
    const L = JSON.parse(readFileSync(`${DIR}/laser/rooster.loops`, 'utf8')) as { outer: number[][]; holes: number[][][]; dikte: number; rapport: Record<string, number> };
    const area = (p: number[][]) => Math.abs(p.reduce((a, q, i) => a + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0) / 2);
    const v = (area(L.outer) - L.holes.reduce((a, h) => a + area(h), 0)) * L.dikte;
    expect(Math.abs(mesh['Rooster-LB.kcad'].volume - v)).toBeLessThan(v * 1e-6);
    expect(L.rapport.losse_eilanden).toBe(0);
    expect(L.rapport.stukken_staal).toBe(1);
    expect(L.rapport.stukken_staal_met_steg_onder_min).toBe(0);
    expect(L.rapport.sleuven_met_vernauwing_onder_min).toBe(0);
    expect(L.rapport.open_boven_cassette_cm2).toBeGreaterThan(75);
  });
});

describe('afzuiging, assemblage', () => {
  const asm = () => open('Afzuiging.kcad') as Document & { components: Component[] };
  const verschuif = (comps: Component[], ids: string[], d: [number, number, number]) =>
    comps.map((c) => (ids.includes(c.id) ? { ...c, position: [c.position[0] + d[0], c.position[1] + d[1], c.position[2] + d[2]] as [number, number, number] } : c));
  const botsingen = (comps: Component[]) => {
    const a = asm();
    const r = rebuildAssembly({ ...a, components: comps } as Document);
    return echteBotsingen(detectInterferences(r.bodies), r.bodies);
  };

  it('niets botst', () => {
    expect(botsingen(asm().components)).toEqual([]);
  }, 900000);

  it('de filtercassette gaat met de filters vrij naar boven uit de module (zonder rooster)', () => {
    const a = asm();
    const zonder = a.components.filter((c) => c.id !== 'a2');
    for (const dy of [10, 60]) expect(botsingen(verschuif(zonder, ['a3', 'af1', 'af2', 'af3'], [0, dy, 0])), String(dy)).toEqual([]);
  }, 900000);

  it('de klauwen passen bij elke bladdikte van 10 tot 50 mm en reiken voorbij de uitsparing', () => {
    const a = asm();
    const klauwen = a.components.filter((c) => /^ak/.test(c.id)).map((c) => c.id);
    for (const t of [10, 20, 34, 50]) {
      const comps = a.components.map((c) => (klauwen.includes(c.id) ? { ...c, position: [c.position[0], -t - 4, c.position[2]] as [number, number, number] } : c))
        .filter((c) => ['a1', 'a6', ...klauwen].includes(c.id));
      expect(botsingen(comps), `blad ${t} mm`).toEqual([]);
    }
    const r = rebuildAssembly(a);
    for (const id of klauwen) {
      const g = r.bodies.find((b) => b.id === id)!.geometry;
      g.computeBoundingBox();
      expect(Math.max(Math.abs(g.boundingBox!.min.x), Math.abs(g.boundingBox!.max.x)), id).toBeGreaterThan(104); // uitsparing tot 98
    }
  }, 900000);

  it('de klauwen van de knophouder passen bij elke bladdikte van 10 tot 50 mm en reiken voorbij het gat', () => {
    const a = asm();
    const d = a.components.find((c) => c.id === 'a7')!.position;
    const klauwen = a.components.filter((c) => /^adk/.test(c.id)).map((c) => c.id);
    for (const t of [10, 20, 34, 50]) {
      const comps = a.components.map((c) => (klauwen.includes(c.id) ? { ...c, position: [c.position[0], -t - 3, c.position[2]] as [number, number, number] } : c))
        .filter((c) => ['a7', 'a12', 'a8', 'a14', ...klauwen].includes(c.id) || /^as(d|k|dk)\d/.test(c.id));
      expect(botsingen(comps), `blad ${t} mm`).toEqual([]);
    }
    const r = rebuildAssembly(a);
    for (const id of klauwen) {
      const g = r.bodies.find((b) => b.id === id)!.geometry;
      g.computeBoundingBox();
      expect(Math.max(Math.abs(g.boundingBox!.min.x - d[0]), Math.abs(g.boundingBox!.max.x - d[0])), id).toBeGreaterThan(27); // gat Ø44
    }
  }, 900000);

  it('ingetrokken liggen de klauwen binnen de romp (de module zakt door de uitsparing)', () => {
    const a = asm();
    const q = (deg: number) => { const h = (deg * Math.PI) / 360; return [0, Math.sin(h), 0, Math.cos(h)] as [number, number, number, number]; };
    const comps = a.components.map((c) => {
      if (!/^ak/.test(c.id)) return c;
      const rechts = c.position[0] > 0;
      // rechts: arm naar -Z (+90° om Y), links: arm naar +Z (vanuit -X: +90° om Y op de draai van 180°)
      return { ...c, position: [c.position[0], -60.5, c.position[2]] as [number, number, number], rotation: rechts ? q(90) : q(270) };
    }).filter((c) => ['a1', 'a6'].includes(c.id) || /^ak/.test(c.id));
    expect(botsingen(comps)).toEqual([]);
    const r = rebuildAssembly({ ...a, components: comps } as Document);
    for (const b of r.bodies.filter((b) => /^ak/.test(b.id))) {
      b.geometry.computeBoundingBox();
      const bb = b.geometry.boundingBox!;
      expect(Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x)), b.id).toBeLessThan(97);
      expect(Math.max(Math.abs(bb.min.z), Math.abs(bb.max.z)), b.id).toBeLessThan(69);
    }
  }, 180000);
});

/**
 * Luchtdicht: de onderdelen in kubusjes van 1 mm; vanuit de ruimte onder de filters vloeit de lucht naar alle buren
 * die geen materiaal zijn. Ze mag de buitenkant van de romp (|x| > 97,5 of |z| > 69,5) en het elektronicavak
 * (x < -62,5 onder het plafond) nergens bereiken. Boven stopt het bij het rooster, onder bij de uitblaasplaat.
 */
function lek(geoms: THREE.BufferGeometry[]): { lek: boolean; waar?: number[]; vrij: number } {
  const X0 = -110, Z0 = -90, Y0 = -78.73, nx = 220, nz = 180, ny = 82, off = 0.27; // tot net onder de bovenkant van het frame
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
        for (let j = 0; j < ny; j++) { const y = Y0 + j; if (y < hi && y > lo) vast[idx(i, j, k)] = 1; }
      }
    }
  }
  const zien = new Uint8Array(nx * ny * nz);
  const start = idx(110, Math.round(-38 - Y0), 90); // (0, -38, 0): onder de filters, boven de ventilator
  if (vast[start]) throw new Error('startpunt zit in materiaal');
  const q = [start];
  zien[start] = 1;
  let vrij = 0;
  while (q.length) {
    const c = q.pop()!;
    vrij++;
    const i = c % nx, k = Math.floor(c / nx) % nz, j = Math.floor(c / (nx * nz));
    const x = X0 + i + off, y = Y0 + j, z = Z0 + k + off;
    // boven het blad is alles binnen het frame inlaat; een lek is buiten de romp onder het blad of in het elektronicavak
    if ((y < -0.5 && (Math.abs(x) > 97.5 || Math.abs(z) > 69.5)) || (x < -62.5 && y < -42.5)) return { lek: true, waar: [x, y, z], vrij };
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
  const g = (f: string) => (rebuildDocument(open(f)) as unknown as R).bodies[0].geometry;
  // het slangetje op het tuitje (naar de drukmeter) en de tule in de doorvoer van de ventilatorkabel
  const dicht = [
    new THREE.CylinderGeometry(1.3, 1.3, 12, 16).translate(-72, -44, -50),
    new THREE.CylinderGeometry(3.2, 3.2, 4, 24).rotateZ(Math.PI / 2).translate(-61.25, -70, 50),
    // de M5-schroeven: de kop dicht de verzinking in het frame af, de schacht het gat
    ...[[88.5, 40], [88.5, -40], [-88.5, 40], [-88.5, -40]].flatMap(([x, z]) => [
      new THREE.CylinderGeometry(5.3, 5.3, 2.5, 24).translate(x, 1.25, z), // de kop zit in de lip van het frame
      new THREE.CylinderGeometry(3, 3, 66, 16).translate(x, -33, z),
    ]),
  ];
  it('lucht kan alleen langs het rooster in en langs de bodemplaat uit', () => {
    const r = lek([g('Romp.kcad'), g('Bovenframe.kcad'), g('Filtercassette.kcad'), ...dicht]);
    expect(r.lek, JSON.stringify(r.waar)).toBe(false);
    expect(r.vrij).toBeGreaterThan(400000);
  }, 180000);
  it('tegenproef: zonder slangetje lekt het langs het tuitje het elektronicavak in', () => {
    const r = lek([g('Romp.kcad'), g('Bovenframe.kcad'), g('Filtercassette.kcad'), dicht[1]]);
    expect(r.lek).toBe(true);
    expect(r.waar![0]).toBeLessThan(-62.5);
  }, 180000);
  it('tegenproef: zonder tule lekt het langs de doorvoer van de ventilatorkabel het elektronicavak in', () => {
    const r = lek([g('Romp.kcad'), g('Bovenframe.kcad'), g('Filtercassette.kcad'), dicht[0], ...dicht.slice(2)]);
    expect(r.lek).toBe(true);
    expect(r.waar![0]).toBeLessThan(-60);
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
  // (Z omhoog): de romp rechtop, het frame en de platen plat, de cassette en de knophouder met de rand op het bed.
  it.skipIf(!process.env.AFZUIGING_STL)('STL voor de printer', async () => {
    const { mkdirSync, writeFileSync, rmSync, existsSync } = await import('node:fs');
    const { prepareTriangles, stlBinary } = await import('../core/document/export3d');
    const plat = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1); // (x, y, z) -> (x, -z, y)
    const rand = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1); // (x, y, z) -> (x, z, -y)
    const stand: Record<string, THREE.Matrix4> = {
      'Romp.kcad': plat, 'Bovenframe.kcad': plat, 'Bodemplaat.kcad': plat,
      'Filtercassette.kcad': rand, 'Knophouder.kcad': rand, 'Knopdeksel.kcad': plat,
    };
    if (existsSync(`${DIR}/print`)) rmSync(`${DIR}/print`, { recursive: true });
    mkdirSync(`${DIR}/print`, { recursive: true });
    for (const [f, m] of Object.entries(stand)) {
      const r = rebuildDocument(open(f)) as unknown as R;
      const geo = r.bodies[0].geometry.clone().applyMatrix4(m);
      const { tris } = prepareTriangles([{ geometry: geo }], { format: 'stl' });
      writeFileSync(`${DIR}/print/${f.replace('.kcad', '.stl')}`, new Uint8Array(stlBinary(tris[0], f.replace('.kcad', ''))));
      geo.computeBoundingBox();
      const s = geo.boundingBox!.getSize(new THREE.Vector3());
      expect(Math.max(s.x, s.y), f).toBeLessThanOrEqual(220);
    }
  }, 300000);
});
