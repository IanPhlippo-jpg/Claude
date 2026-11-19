/**
 * De ingebouwde nagelstofafzuiging (voorbeelden/afzuiging, versie 7.4, 2026-11-17): radiale ventilator San Ace C175 star
 * op een geribde naaf in een ronde kuip onder een vierkante romp met een interieurfilter (MANN CU 20 013), voedingsbox apart.
 * - elk onderdeel bouwt op beide kernels tot één body met dezelfde vorm; het rooster is lasersnijbaar;
 * - de geprinte delen passen op een printbed van 230 x 230 (opdracht; het bovenframe in 4 latten); de module hangt
 *   hoogstens 102 mm onder een blad van 34 mm (in het midden; de vierkante romp 36 mm, de rand van de kuip 76 mm);
 * - advies Fable 5.2 v1 (7.4): de module zakt door de uitsparing met de M8-bus erop (P1-2), de haakse M8-stekkers hebben
 *   ruimte (P1-1), elk met een tegenproef op de maten van 7.3;
 * - niets botst (ook de voedingsbox); de klauwen passen bij elke bladdikte van 10 tot 50 mm en liggen ingetrokken
 *   binnen de romp (met hun rubber); het filter gaat vrij naar boven uit de module;
 * - het luchtkanaal is dicht: lucht kan er alleen in langs het rooster en uit langs de lamellen en sleuven van de kuip.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as THREE from 'three';
import { rebuildDocument } from './rebuildStreng';
import { setBrepKernel } from '../core/features/brepKernel';
import { occtKernel } from '../core/occt/brep';
import { parseDocument } from '../core/document/persistence';
import { meshVolume } from '../core/features/solid';
import { rebuildAssembly } from '../core/assembly/assembly';
import { detectInterferences } from '../core/assembly/interference';
import { echteBotsingen } from './overlap';
import { MeshBVH } from 'three-mesh-bvh';
import type { Component, Document } from '../core/document/types';
// @ts-expect-error: het generatorscript is plain JavaScript
import { M, m8connector, m8Ruimte } from '../../voorbeelden/afzuiging/maak-afzuiging.mjs';

const DIR = 'voorbeelden/afzuiging';
const open = (f: string): Document => parseDocument(readFileSync(`${DIR}/${f}`, 'utf8'));
// snelle controle van alleen gewijzigde onderdelen: AFZ_DELEN=Instroomplaat,Romp (zie npm run test:afz-snel)
const KEUZE = process.env.AFZ_DELEN?.split(',').map((s) => `${s.trim().replace(/\.kcad$/, '')}.kcad`);
const DELEN = readdirSync(DIR).filter((f) => f.endsWith('.kcad') && f !== 'Afzuiging.kcad' && (!KEUZE || KEUZE.includes(f)));
type R = { bodies: { geometry: THREE.BufferGeometry }[] };
const bouw = (f: string) => {
  const r = rebuildDocument(open(f)) as unknown as R & { brep?: Record<string, unknown> };
  const g = r.bodies[0]?.geometry;
  g?.computeBoundingBox();
  // exact: elke body heeft een B-rep-vorm (geen stille terugval op de mesh, bv. een verzinking op een face-vlak)
  const exact = r.bodies.length > 0 && Object.keys(r.brep ?? {}).length === r.bodies.length;
  return { n: r.bodies.length, volume: g ? meshVolume(g) : 0, bb: g?.boundingBox ?? new THREE.Box3(), exact };
};
const rond = (v: THREE.Vector3) => v.toArray().map((x) => Math.round(x * 10) / 10 + 0); // + 0: geen -0

const mesh: Record<string, ReturnType<typeof bouw>> = {};
// de 11 geprinte onderdelen: exact (B-rep) en als dichte STL
const PRINT = ['Romp.kcad', 'Bovenframe.kcad', 'Ventilatorkuip.kcad', 'Instroomplaat.kcad', 'Voedingsbox.kcad',
  'Knophouder.kcad', 'Knopdeksel.kcad', 'Klauw.kcad', 'Knopklauw.kcad', 'Adapterklem.kcad', 'Deksel-voedingsbox.kcad',
  'Bovenframe-zijlat.kcad', 'Bovenframe-dwarslat.kcad', 'Instroomtuit.kcad'];

describe('afzuiging, onderdelen (mesh)', () => {
  it.each(DELEN)('%s is één body', (f) => {
    mesh[f] = bouw(f);
    expect(mesh[f].n).toBe(1);
  }, 600000);

  it('maten: romp, frame, rooster, klauw, filter, ventilator, kuip; de module hangt hoogstens 102 mm onder een blad van 34 mm', () => {
    expect(rond(mesh['Romp.kcad'].bb.min)).toEqual([-105, -70, -105]);
    expect(rond(mesh['Romp.kcad'].bb.max)).toEqual([105, 0, 105]);
    expect(rond(mesh['Bovenframe.kcad'].bb.min)).toEqual([-111, 0, -111]);
    expect(rond(mesh['Bovenframe.kcad'].bb.max)).toEqual([111, 2.5, 111]);
    // de RVS-plaat ligt op het frame en is er even groot als het: bovenkant 4 mm boven het blad
    expect(rond(mesh['Rooster-LB.kcad'].bb.min)).toEqual([-111, 2.5, -111]);
    expect(rond(mesh['Rooster-LB.kcad'].bb.max)).toEqual([111, 4, 111]);
    expect(rond(mesh['Klauw.kcad'].bb.max)).toEqual([18, 6, 6.5]);
    expect(rond(mesh['Klauwrubber.kcad'].bb.min)).toEqual([9.5, 6, -4]);
    expect(rond(mesh['Klauwrubber.kcad'].bb.max)).toEqual([17, 10, 4]);
    // het filter (195 x 145 x 30) op de foamband (4 mm) op de steunrand; in rust 4 mm onder de RVS-plaat (2,5): versie 7.2
    expect(rond(mesh['Interieurfilter-CU20013.kcad'].bb.min)).toEqual([-72.5, -31.5, -97.5]);
    expect(rond(mesh['Interieurfilter-CU20013.kcad'].bb.max)).toEqual([72.5, -1.5, 97.5]);
    expect(rond(mesh['Foamband.kcad'].bb.min)).toEqual([-73.5, -35.5, -98.5]);
    // de afdichtlip op de geleiderand (tot -25,5), 2,5 mm naar onder geplooid tegen het filter
    expect(rond(mesh['Afdichtlip.kcad'].bb.min)).toEqual([-75, -28, -100]);
    expect(rond(mesh['Afdichtlip.kcad'].bb.max)).toEqual([75, -25, 100]);
    expect(rond(mesh['Knopklauwrubber.kcad'].bb.min)).toEqual([7.5, 5, -3]);
    expect(rond(mesh['Knopklauwrubber.kcad'].bb.max)).toEqual([13.5, 8, 3]);
    // 7.4: de waaier staat 4 mm onder de instroomplaat (P1-4), de motor star op 4 bussen van 8 mm op de naaf van de kuip;
    // de instroomtuit steekt 2 mm in het oog (onderkant -57)
    expect(rond(mesh['Ventilator-San-Ace-C175.kcad'].bb.min)).toEqual([-87.5, -124, -87.5]);
    expect(rond(mesh['Ventilator-San-Ace-C175.kcad'].bb.max)).toEqual([87.5, -55, 87.5]);
    expect(rond(mesh['Instroomplaat.kcad'].bb.min)).toEqual([-100.7, -51, -100.7]);
    // de losse instroomtuit: van 2 mm in het oog (-57) tot de bovenkant van het vingerrooster, 21 mm boven de waaier (-34)
    expect(rond(mesh['Instroomtuit.kcad'].bb.min)).toEqual([-71.2, -57, -71.2]);
    expect(rond(mesh['Instroomtuit.kcad'].bb.max)).toEqual([71.2, -34, 71.2]);
    expect(rond(mesh['Instroomplaat.kcad'].bb.max)).toEqual([100.7, -25.5, 100.7]);
    // de kuip: Ø189 (oren tot 103 op de assen), rand 1,5 mm onder de instroomplaat (de foamband), bodem op -136
    const onder = mesh['Ventilatorkuip.kcad'].bb.min.y;
    expect(rond(mesh['Ventilatorkuip.kcad'].bb.min)).toEqual([-103, -136, -103]);
    expect(rond(mesh['Ventilatorkuip.kcad'].bb.max)).toEqual([103, -52.5, 103]);
    expect(-onder - 34).toBeLessThanOrEqual(102);
  });

  it('geprinte delen passen op een bed van 230 x 230 met 5 mm marge (P2-8); het bovenframe wordt in 4 latten geprint', () => {
    // marge 5 mm per kant (rand en schoonveeg; op de buitenste millimeters hecht een dun deel slecht): 220 x 220 bruikbaar.
    // Smalle latten mogen schuin op het bed: (lengte + breedte) / √2
    const vrij = 230 - 2 * 5;
    const past = (s: number[]) => (s[1] <= vrij && s[0] <= vrij) || (s[1] < 30 && (s[0] + s[1]) / Math.SQRT2 <= vrij);
    for (const f of DELEN) {
      const doc = open(f);
      if (!/^(PETG|PA12)/.test(doc.material?.name ?? '') || f === 'Bovenframe.kcad') continue; // het hele frame: gelijmd uit de latten
      const s = mesh[f].bb.getSize(new THREE.Vector3()).toArray().sort((a, b) => b - a);
      expect(past(s), `${f}: ${s.map((v) => v.toFixed(1)).join(' x ')}`).toBe(true);
    }
    // de latten vormen samen het frame (2 x zij + 2 x dwars = het hele frame)
    const som = 2 * mesh['Bovenframe-zijlat.kcad'].volume + 2 * mesh['Bovenframe-dwarslat.kcad'].volume;
    expect(Math.abs(som - mesh['Bovenframe.kcad'].volume)).toBeLessThan(mesh['Bovenframe.kcad'].volume * 2e-3);
    // tegenproef: het frame uit één stuk (222 x 222) en de box van 7.3 (rand 7,5: 225 breed) passen niet met 5 mm marge
    expect(past([M.frame.b, M.frame.d, 5])).toBe(false);
    expect(past([M.box.b + 2 * 7.5, M.box.d + 2 * M.box.flens.z, 50])).toBe(false);
    expect(past([M.box.b + 2 * M.box.flens.x, M.box.d + 2 * M.box.flens.z, 50])).toBe(true);
  });

  it('P1-2: de module zakt door de uitsparing van 212 x 212, met de M8-bus erop (en de bus van 7.3 niet)', () => {
    const asm = open('Afzuiging.kcad') as Document & { components: Component[] };
    // alles wat met de module door het blad gaat (zonder de klauwen: die liggen ingetrokken, zie hieronder)
    const door = /^(a1|a1i\d|a4|a4d|a5|a9|a9t|a3|a3f|a3l|a10|a18|as3\d|as4\d|as5\d)$/;
    const r = rebuildAssembly({ ...asm, components: asm.components.filter((c) => door.test(c.id)) } as Document);
    expect(r.bodies.length).toBeGreaterThan(10);
    const half = M.uitsparing.b / 2;
    for (const b of r.bodies) {
      b.geometry.computeBoundingBox();
      const bb = b.geometry.boundingBox!;
      expect(Math.max(-bb.min.x, bb.max.x, -bb.min.z, bb.max.z), b.id).toBeLessThan(half);
    }
    // tegenproef: de bus van 7.3 in de achterwand van de romp (as op z = -101, naar -Z) steekt 10 mm voorbij de uitsparing
    const oud = rebuildDocument(parseDocument(JSON.stringify(m8connector('M8 7.3', [-60, -62, -M.romp.d / 2 + M.romp.wand], [0, 0, -1], M.romp.wand, true)))) as unknown as R;
    oud.bodies[0].geometry.computeBoundingBox();
    expect(-oud.bodies[0].geometry.boundingBox!.min.z).toBeGreaterThan(half + 9);
  }, 600000);

  it('P1-1: de haakse M8-stekkers hebben ruimte (AANNAME 20 tot 32 mm vanaf het paneel), in 7.3 niet', () => {
    const r = m8Ruimte();
    const [kort, lang] = M.m8kabel.lengte;
    expect(r.module).toBeGreaterThanOrEqual(lang + 10);
    expect(r.box).toBeGreaterThanOrEqual(lang + 10);
    // 7.3: twee koppelingen op één lijn met 17,8 mm ertussen: zelfs twee korte haakse stekkers passen niet
    expect(r.oud).toBeLessThan(2 * kort);
    // de stekkers en de kabel zitten als onderdeel in de assemblage (de botstest neemt ze mee), en de kabel hangt niet
    // lager dan de bodem van de kuip
    const asm = open('Afzuiging.kcad') as Document & { components: Component[] };
    const k = rebuildAssembly({ ...asm, components: asm.components.filter((c) => c.id === 'a11') } as Document).bodies[0];
    k.geometry.computeBoundingBox();
    expect(k.geometry.boundingBox!.min.y).toBeGreaterThan(M.kuip.bodem);
  }, 600000);

  it('rooster: volume = (plaat - gaten) x 1,5, het laserrapport is schoon en er is genoeg open boven het filter', () => {
    const L = JSON.parse(readFileSync(`${DIR}/laser/rooster.loops`, 'utf8')) as { outer: number[][]; holes: number[][][]; dikte: number; rapport: Record<string, number> };
    const area = (p: number[][]) => Math.abs(p.reduce((a, q, i) => a + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0) / 2);
    const v = (area(L.outer) - L.holes.reduce((a, h) => a + area(h), 0)) * L.dikte;
    expect(Math.abs(mesh['Rooster-LB.kcad'].volume - v)).toBeLessThan(v * 1e-6);
    expect(L.rapport.losse_eilanden).toBe(0);
    expect(L.rapport.stukken_staal).toBe(1);
    expect(L.rapport.stukken_staal_met_steg_onder_min).toBe(0);
    expect(L.rapport.sleuven_met_vernauwing_onder_min).toBe(0);
    expect(L.rapport.open_boven_filter_cm2).toBeGreaterThan(100); // filter 145 x 195
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
  }, 1800000);

  it('het filter gaat vrij naar boven uit de module (zonder rooster)', () => {
    const a = asm();
    const zonder = a.components.filter((c) => c.id !== 'a2');
    for (const dy of [10, 60]) expect(botsingen(verschuif(zonder, ['a3'], [0, dy, 0])), String(dy)).toEqual([]);
  }, 1800000);

  it('de klauwen passen bij elke bladdikte van 10 tot 50 mm en reiken voorbij de uitsparing', () => {
    const a = asm();
    const klauwen = a.components.filter((c) => /^ak/.test(c.id)).map((c) => c.id);
    for (const t of [10, 20, 34, 50]) {
      // klauw en rubber samen: het rubber (4 mm) tegen het blad
      const comps = a.components.map((c) => (klauwen.includes(c.id) ? { ...c, position: [c.position[0], -t - 10, c.position[2]] as [number, number, number] } : c))
        .filter((c) => ['a1', 'a6', ...klauwen].includes(c.id));
      expect(botsingen(comps), `blad ${t} mm`).toEqual([]);
    }
    const r = rebuildAssembly(a);
    for (const id of klauwen) {
      const g = r.bodies.find((b) => b.id === id)!.geometry;
      g.computeBoundingBox();
      expect(Math.max(Math.abs(g.boundingBox!.min.x), Math.abs(g.boundingBox!.max.x)), id).toBeGreaterThan(112); // uitsparing tot 106
    }
  }, 1800000);

  it('de klauwen van de knophouder passen bij elke bladdikte van 10 tot 50 mm en reiken voorbij het gat', () => {
    const a = asm();
    const d = a.components.find((c) => c.id === 'a7')!.position;
    const klauwen = a.components.filter((c) => /^adk/.test(c.id)).map((c) => c.id);
    for (const t of [10, 20, 34, 50]) {
      const comps = a.components.map((c) => (klauwen.includes(c.id) ? { ...c, position: [c.position[0], -t - 8, c.position[2]] as [number, number, number] } : c)) // klauw 5 + rubber 3
        .filter((c) => ['a7', 'a12', 'a8', 'a14', ...klauwen].includes(c.id) || /^as(d|k|dk)\d/.test(c.id));
      expect(botsingen(comps), `blad ${t} mm`).toEqual([]);
    }
    const r = rebuildAssembly(a);
    for (const id of klauwen) {
      const g = r.bodies.find((b) => b.id === id)!.geometry;
      g.computeBoundingBox();
      expect(Math.max(Math.abs(g.boundingBox!.min.x - d[0]), Math.abs(g.boundingBox!.max.x - d[0])), id).toBeGreaterThan(27); // gat Ø44
    }
  }, 1800000);

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
      expect(Math.max(Math.abs(bb.min.x), Math.abs(bb.max.x)), b.id).toBeLessThan(105);
      expect(Math.max(Math.abs(bb.min.z), Math.abs(bb.max.z)), b.id).toBeLessThan(105);
    }
  }, 1800000);
});

/**
 * Luchtdicht: de onderdelen in kubusjes van 1 mm; vanuit de ruimte onder de filters (boven de instroomplaat) vloeit de
 * lucht naar alle buren die geen materiaal zijn. Ze mag de buitenkant van de romp (|x| of |z| > 105,5) onder het blad
 * nergens bereiken. Boven stopt het bij het rooster, onder bij de bodemplaat.
 */
function lek(geoms: THREE.BufferGeometry[]): { lek: boolean; waar?: number[]; vrij: number } {
  const X0 = -115, Z0 = -115, Y0 = -139.73, nx = 230, nz = 230, ny = 142, off = 0.27; // tot net onder de bovenkant van het frame
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
  const start = idx(127, Math.round(-40.73 - Y0), 127); // (12,3, -40,7, 12,3): onder het filter, boven de instroomplaat, tussen de ribben van het vingerrooster
  if (vast[start]) throw new Error('startpunt zit in materiaal');
  const q = [start];
  zien[start] = 1;
  let vrij = 0;
  while (q.length) {
    const c = q.pop()!;
    vrij++;
    const i = c % nx, k = Math.floor(c / nx) % nz, j = Math.floor(c / (nx * nz));
    const x = X0 + i + off, y = Y0 + j, z = Z0 + k + off;
    // boven het blad is alles binnen het frame inlaat; een lek is buiten de romp onder het blad
    if (y < -0.5 && (Math.abs(x) > 105.5 || Math.abs(z) > 105.5)) return { lek: true, waar: [x, y, z], vrij };
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
  // de M8-bus en het slangetje zitten onder de instroomplaat, buiten de luchtweg (die ruimte staat op kamerdruk). Dicht te
  // zetten: het messingbuisje in de instroomplaat, de uitgang van de goot voor de aders (7.4, kit) en de M5-schroeven; de
  // uitlaten van de kuip (lamellen en ringsleuven) worden voor de proef afgedekt
  const ga = (M.kuip.goot.hoek * Math.PI) / 180;
  const opHoek = (g: THREE.BufferGeometry, a: number, r: number, y: number) => g.rotateY(-a).translate(r * Math.cos(a), y, r * Math.sin(a));
  const dicht = [
    new THREE.CylinderGeometry(1.8, 1.8, 14, 16).translate(-55, -54, -85), // messingbuisje (meetpunt)
    opHoek(new THREE.BoxGeometry(6, 7, 7), ga, 98, -59.5), // uitgang van de goot voor de aders, met kit
    // de 4 schroeven M4 van de buffers in de bodem (de kop dicht de verzinking af)
    ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => new THREE.CylinderGeometry(4.3, 2.3, 6, 16).translate(a * 20.506, -134, b * 20.506)),
    // afdekking lamellen: per sector een dicht blok (r 84 tot 100, -125 tot -55): de goot achteraan blijft vrij
    ...[...M.kuip.lamel.hoeken, ...M.kuip.lamel.hoeken.map((h: number) => -h)].flatMap((h: number) => [h, 180 + h])
      .map((h: number) => opHoek(new THREE.BoxGeometry(16, 70, M.kuip.lamel.breed + 2), (h * Math.PI) / 180, 92, -90)),
    // afdekking ringsleuven onder de bodem: een dichte ring van r 44 tot 80 (het gat voor de aders in het midden blijft open)
    new THREE.LatheGeometry([[44, -137.2], [80, -137.2], [80, -135.9], [44, -135.9], [44, -137.2]].map(([r, y]) => new THREE.Vector2(r, y)), 96),
    // de M5-schroeven: de kop dicht de verzinking in het frame af, de schacht het gat
    ...[[96.5, 72], [96.5, -72], [-96.5, 72], [-96.5, -72]].flatMap(([x, z]) => [
      new THREE.CylinderGeometry(5.3, 5.3, 2.5, 24).translate(x, 1.25, z), // de kop zit in de lip van het frame
      new THREE.CylinderGeometry(3, 3, 66, 16).translate(x, -33, z),
    ]),
  ];
  const delen = () => [g('Romp.kcad'), g('Bovenframe.kcad'), g('Instroomplaat.kcad'), g('Instroomtuit.kcad'), g('Ventilatorkuip.kcad')];
  it('lucht kan alleen langs het rooster in en langs de lamellen en sleuven van de kuip uit', () => {
    const r = lek([...delen(), g('Kuipdichting.kcad'), ...dicht]);
    expect(r.lek, JSON.stringify(r.waar)).toBe(false);
    expect(r.vrij).toBeGreaterThan(1000000);
  }, 1800000);
  it('tegenproef: zonder de foamband op de kuip lekt het langs de rand van de kuip', () => {
    const r = lek([...delen(), ...dicht]);
    expect(r.lek).toBe(true);
  }, 1800000);
  it('tegenproef: zonder kit in de uitgang van de goot voor de aders lekt het langs de goot', () => {
    const r = lek([...delen(), g('Kuipdichting.kcad'), ...dicht.filter((_, i) => i !== 1)]);
    expect(r.lek).toBe(true);
  }, 1800000);
});

describe('afzuiging, B-rep', () => {
  afterAll(() => setBrepKernel(null));
  it('elk onderdeel exact, zelfde volume als de mesh', async () => {
    const require = createRequire(import.meta.url);
    const init = (await import('replicad-opencascadejs')).default as unknown as (o: { wasmBinary: Uint8Array }) => Promise<unknown>;
    const wasm = readFileSync(require.resolve('replicad-opencascadejs/wasm'));
    const replicad = await import('replicad');
    const vers = async () => { const OC = await init({ wasmBinary: wasm }); replicad.setOC(OC as never); setBrepKernel(occtKernel(OC, replicad)); };
    // 7.4: elk geprint deel op een verse kernel (met alle delen na elkaar raakte het geheugen van OCCT vol en viel de exacte
    // vorm van de kuip of de box stil weg; de STL-test met een eigen kernel bevestigt ze)
    for (const f of DELEN) {
      if (PRINT.includes(f) || f === DELEN[0]) await vers();
      const b = bouw(f);
      expect(b.n, f).toBe(1);
      if (PRINT.includes(f)) expect(b.exact, `${f} heeft geen exacte vorm`).toBe(true);
      expect(Math.abs(b.volume - mesh[f].volume), f).toBeLessThan(mesh[f].volume * 2e-3);
      expect(rond(b.bb.min), f).toEqual(rond(mesh[f].bb.min));
      expect(rond(b.bb.max), f).toEqual(rond(mesh[f].bb.max));
    }
  }, 1800000);

  // de STL's voor de printer: src/qa/stlAfzuiging.test.ts (eigen OCCT-kernel, AFZUIGING_STL=1)
});
