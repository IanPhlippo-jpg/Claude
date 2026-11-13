/**
 * De kabeldoos van de treinverlichting, versie 4 (voorbeelden/treinverlichting): één doos met kabelgoten en een
 * moduleplaat met kant-en-klare modules (opbouw.mjs). Elk onderdeel
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
import { M, gootDeksels, indeling } from '../../voorbeelden/treinverlichting/maak-kabeldoos.mjs';
// @ts-expect-error: het generatorscript is plain JavaScript
import { klemlippen, lipRek, lipKracht } from '../../voorbeelden/treinverlichting/hulpstukken.mjs';

const DIR = 'voorbeelden/treinverlichting';
const open = (f: string): Document => parseDocument(readFileSync(`${DIR}/${f}`, 'utf8'));
const KEUZE = process.env.TREIN_DELEN?.split(',').map((s) => `${s.trim().replace(/\.kcad$/, '')}.kcad`);
const DELEN = readdirSync(DIR).filter((f) => f.endsWith('.kcad') && f !== 'Kabeldoos.kcad' && (!KEUZE || KEUZE.includes(f)));
const STL = { 'Kabeldoos-bak.kcad': 'rechtop', 'Kabeldoos-deksel.kcad': 'omgekeerd', 'Moduleplaat.kcad': 'rechtop', 'Gootdeksels-plaat.kcad': 'rechtop', 'Hulpstukken.kcad': 'rechtop' } as const;
const PRINT = [...Object.keys(STL), 'Gootdeksel.kcad'];
/** het aantal lichamen: de plaat met gootdeksels heeft één lichaam per lengte (de gelijke dekseltjes in één extrusie) */
const lichamen = (f: string) => (f === 'Gootdeksels-plaat.kcad' ? new Set((gootDeksels() as { l: number }[]).map((d) => d.l)).size : f === 'Hulpstukken.kcad' ? 2 : 1); // hulpstukken: de 2 werkhaken (één lichaam, de ribben in één extrusie) en de spatel
type R = { bodies: { geometry: THREE.BufferGeometry }[]; brep?: Record<string, unknown> };
const bouw = (f: string) => {
  const t0 = performance.now();
  const r = rebuildDocument(open(f)) as unknown as R;
  const tijd = performance.now() - t0;
  const box = new THREE.Box3();
  let volume = 0;
  for (const b of r.bodies) { b.geometry.computeBoundingBox(); box.union(b.geometry.boundingBox!); volume += meshVolume(b.geometry); }
  return { r, n: r.bodies.length, volume, bb: box, tijd, exact: r.bodies.length > 0 && Object.keys(r.brep ?? {}).length === r.bodies.length };
};
const mesh: Record<string, ReturnType<typeof bouw>> = {};
/** de exacte vorm van de geprinte delen (de STL-test gebruikt ze opnieuw: een tweede exacte rebuild van de bak in dezelfde
 *  OCCT-instantie liep met de klemlippen tegen de geheugengrens van de wasm aan) */
const exact: Record<string, R> = {};
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
      exact[f] = b.r;
      expect(b.n, f).toBe(lichamen(f));
      expect(b.exact, `${f} heeft geen exacte vorm`).toBe(true);
      if (mesh[f]) expect(Math.abs(b.volume - mesh[f].volume), f).toBeLessThan(mesh[f].volume * 2e-3);
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
      const r = exact[f] ?? (rebuildDocument(open(f)) as unknown as R);
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

describe('kabeldoos, klemlippen (advies Fable 5.2)', () => {
  type Lip = { nr: number; k: number; s: number; f: number; b: number; z0: number; z1: number; prof: [number, number][] };
  const L = indeling() as { rijen: { soort: string; nr: number; cx: number; cz: number }[][] };
  const lippen = klemlippen(L.rijen) as Lip[];
  const B = (M as any).bordje, P = (M as any).lip, top = (M as any).voet + B.pcb;
  it('elk bordje zit tussen 4 lippen: 2 aan elke korte kant, één aan elke lange kant van het midden', () => {
    for (let n = 1; n <= 16; n++) {
      const ls = lippen.filter((l) => l.nr === n);
      expect(ls.length, `bordje ${n}`).toBe(4);
      expect(new Set(ls.map((l) => `${l.k}${l.s}`)).size).toBe(4);
    }
  });
  it('de haak grijpt over de print (0,45 tot 0,75) en ligt er net boven (0,05 tot 0,2), de print past ertussen', () => {
    for (const l of lippen) {
      const d = lippen.find((q) => q.nr === l.nr)!, bord = L.rijen.flat().find((q) => q.nr === l.nr)!;
      const rand = bord.cx + l.k * B.x / 2, punt = l.prof[5][0], grip = l.k * (rand - punt), y0 = l.prof[5][1];
      expect(grip, `bordje ${l.nr}`).toBeGreaterThanOrEqual(0.45);
      expect(grip).toBeLessThanOrEqual(0.75);
      expect(y0 - top).toBeGreaterThanOrEqual(0.05);
      expect(y0 - top).toBeLessThanOrEqual(0.2);
      expect(l.k * (l.f - rand)).toBeGreaterThan(0.05); // de tong raakt de rand van de print niet
      expect(d).toBeTruthy();
      // de lip staat naast de eindklem (die 10 breed is, midden op het bordje) en binnen de lange kant
      expect(Math.min(Math.abs(l.z0 - bord.cz), Math.abs(l.z1 - bord.cz))).toBeGreaterThan(5 + 0.5);
      expect(Math.max(Math.abs(l.z0 - bord.cz), Math.abs(l.z1 - bord.cz))).toBeLessThan(B.z / 2);
    }
  });
  it('inklikken zonder breken: rek onder 2 %, de lip veert terug met meer dan 0,5 N', () => {
    expect(lipRek().rek).toBeLessThan(0.02);
    expect(lipKracht()).toBeGreaterThan(0.5);
    expect(P.t).toBeGreaterThanOrEqual(0.8); // 2 lijnen van 0,4
  });
  it('elke lip kan vrij veren: naar de lip van het buurbordje en naar de wand van de ring', () => {
    const veer = P.haak - P.speling, xi = (L as any).xi as number;
    for (const a of lippen) {
      if (a.k > 0) {
        const buur = lippen.find((q) => q.k < 0 && q.z0 === a.z0 && q.f > a.f && q.f - a.f < 12);
        if (buur) expect(buur.b - a.b, `bordje ${a.nr} naar ${buur.nr}`).toBeGreaterThan(2 * veer + 0.3);
      }
      const bord = L.rijen.flat().find((q) => q.nr === a.nr)!;
      if (Math.abs(bord.cx + a.k * B.x / 2) > xi - 3) expect(xi - Math.abs(a.b), `bordje ${a.nr} tegen de wand`).toBeGreaterThan(veer + 0.1);
    }
  });
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
