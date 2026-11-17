/**
 * De kabeldoos van de treinverlichting, versie 5 (voorbeelden/treinverlichting): één langwerpige doos op één laag in 2
 * helften die in elkaar klikken (links de bordjes op 4 schroefpaaltjes, rechts de kant-en-klare modules op palen; geen
 * kabelgoten meer). Elk
 * onderdeel bouwt (de geprinte delen exact op de B-rep-kernel, elk als één lichaam), elke bakhelft blijft binnen het
 * rebuildbudget van de app, elk geprint deel past in 230 x 230 (het bed van de Centauri Carbon zonder de hoek van het
 * filamentmes, met skirt), de doos is hoogstens 80 hoog, in de assemblage botst niets (ook de klikhaken en de lip van het
 * deksel niet) en de naad klikt zonder te breken (rek onder 2 %) en print zonder support.
 * Snel alleen enkele onderdelen: TREIN_DELEN=Kabeldoos-bak-links. De STL's voor de printer: TREIN_STL=1.
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
import { M, indeling, rechts, haakKlik, dekselKlik } from '../../voorbeelden/treinverlichting/maak-kabeldoos.mjs';
// @ts-expect-error: plain JavaScript
import { tsmpHouder } from '../../voorbeelden/treinverlichting/maak-kabeldoos.mjs';
// @ts-expect-error: plain JavaScript
import { proefMaten } from '../../voorbeelden/treinverlichting/proefstuk.mjs';
// @ts-expect-error: plain JavaScript
import { MODULES, PLAATSING, voetafdruk, helft, controleerAlles, DRADEN, oogjes, oogSleuven, MET_DUPONT } from '../../voorbeelden/treinverlichting/opbouw.mjs';

const DIR = 'voorbeelden/treinverlichting';
const open = (f: string): Document => parseDocument(readFileSync(`${DIR}/${f}`, 'utf8'));
const KEUZE = process.env.TREIN_DELEN?.split(',').map((s) => `${s.trim().replace(/\.kcad$/, '')}.kcad`);
const DELEN = readdirSync(DIR).filter((f) => f.endsWith('.kcad') && f !== 'Kabeldoos.kcad' && (!KEUZE || KEUZE.includes(f)));
// printstand: de bakhelften met de bodem op het bed, de linkerhelft van het deksel met de buitenkant op het bed, de
// rechterhelft met de binnenkant op het bed (de lip aan de naad ligt dan op het bed)
// (het proefstuk van Fable 5.2 D1: rechtop, zoals de bakhelften)
const STL = { 'Kabeldoos-bak-links.kcad': 'rechtop', 'Kabeldoos-bak-rechts.kcad': 'rechtop', 'Kabeldoos-deksel-links.kcad': 'omgekeerd', 'Kabeldoos-deksel-rechts.kcad': 'rechtop', 'Hulpstukken.kcad': 'rechtop', 'Proefstuk.kcad': 'rechtop' } as const;
const PRINT = Object.keys(STL);
/** het aantal lichamen: de hulpstukken hebben er 2 (de 2 werkhaken in één lichaam, de ribben in één extrusie, en de spatel),
 *  het proefstuk ook (A uit de linkerhelft, B uit de rechterhelft) */
const lichamen = (f: string) => (f === 'Hulpstukken.kcad' || f === 'Proefstuk.kcad' ? 2 : 1);
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
 *  OCCT-instantie liep tegen de geheugengrens van de wasm aan) */
const exact: Record<string, R> = {};
const BED = (M as { bed: { max: number; hoog: number } }).bed;

describe('kabeldoos, onderdelen (mesh)', () => {
  it.each(DELEN)('%s bouwt', (f) => {
    mesh[f] = bouw(f);
    expect(mesh[f].n).toBeGreaterThan(0);
    if (PRINT.includes(f)) expect(mesh[f].n, 'een geprint deel: één lichaam (de hulpstukken: 2)').toBe(lichamen(f));
    // de app rekent hoogstens 45 s per onderdeel (rebuildbudget van de mesh-kernel); elke bakhelft apart
    if (f.startsWith('Kabeldoos-bak')) process.stderr.write(`rebuild ${f}: ${Math.round(mesh[f].tijd)} ms\n`);
    if (f.startsWith('Kabeldoos-bak')) expect(mesh[f].tijd, `rebuild ${f} ${Math.round(mesh[f].tijd)} ms`).toBeLessThan(45000);
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

  // de STL's uit de exacte vorm, in printstand (Z omhoog): de bakhelften met de bodem op het bed, de deksels zoals bij STL
  // hierboven, de hulpstukken plat; elk bestand dicht en manifold en binnen 230 x 230
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

describe('kabeldoos, bordjes vastgeschroefd (Ian, 2026-11-15: "ik wil ze geschroefd hebben")', () => {
  type Paal = { nr: number; x: number; z: number };
  const L = indeling() as { paaltjes: Paal[]; rijen: { soort: string; nr: number; cx: number; cz: number }[][]; bodem: number[][] };
  const B = (M as any).bordje, SP = (M as any).schroefpaal, D = (M as any).doos, voet = (M as any).voet;
  const bordjes = L.rijen.flat().filter((d) => d.soort === 'bordje');
  const rect = (x: number, z: number, r: number[]) => Math.hypot(Math.max(r[0] - x, 0, x - r[2]), Math.max(r[1] - z, 0, z - r[3]));
  it('4 schroefpaaltjes per bordje, recht onder de gaten (hart 2 mm van beide randen)', () => {
    expect(L.paaltjes.length).toBe(16 * 4);
    for (const d of bordjes) {
      const ps = L.paaltjes.filter((p) => p.nr === d.nr);
      expect(ps.length, `bordje ${d.nr}`).toBe(4);
      for (const p of ps) {
        expect(B.x / 2 - Math.abs(p.x - d.cx)).toBeCloseTo(SP.rand, 6);
        expect(B.z / 2 - Math.abs(p.z - d.cz)).toBeCloseTo(SP.rand, 6);
      }
    }
  });
  it('het paaltje houdt de schroef: wand minstens 1,2 (3 lijnen), voorgat 0,75 tot 0,85 x d, schroef 4 mm of meer in het paaltje en niet door de bodem', () => {
    const S = SP.schroef;
    expect((SP.d - SP.voorgat) / 2).toBeGreaterThanOrEqual(1.2);
    expect(SP.voorgat / S.d).toBeGreaterThanOrEqual(0.75);
    expect(SP.voorgat / S.d).toBeLessThanOrEqual(0.85);
    expect(S.l - B.pcb).toBeGreaterThanOrEqual(4);
    const punt = voet + B.pcb - S.l, bodemGat = -D.bodem + 0.4;
    expect(punt - bodemGat).toBeGreaterThanOrEqual(0.3);
    expect(S.kern).toBeLessThan(SP.voorgat); // in het model zit de kern vrij in het voorgat (geen botsing)
    expect(SP.gat).toBeGreaterThan(S.d); // de schroef gaat door het gat van de print
  });
  it('de schroefkop en de schroevendraaier raken de klemmen niet, de paaltjes niet elkaar of een draadsleuf', () => {
    const kop = SP.schroef.kop / 2, draaier = 2.5; // schacht van een PH1 Ø4,5 met 0,25 lucht
    for (const d of bordjes) {
      const strook = (s: number) => [d.cx - (B.klem.n * B.klem.steek) / 2, s > 0 ? d.cz + B.z / 2 - 0.2 - B.klem.diep : d.cz - B.z / 2 + 0.2, d.cx + (B.klem.n * B.klem.steek) / 2, s > 0 ? d.cz + B.z / 2 - 0.2 : d.cz - B.z / 2 + 0.2 + B.klem.diep];
      const eind = (k: number) => [k > 0 ? d.cx + B.x / 2 - 0.2 - B.eind.diep : d.cx - B.x / 2 + 0.2, d.cz - B.eind.steek, k > 0 ? d.cx + B.x / 2 - 0.2 : d.cx - B.x / 2 + 0.2 + B.eind.diep, d.cz + B.eind.steek];
      for (const p of L.paaltjes.filter((q) => q.nr === d.nr)) for (const r of [strook(-1), strook(1), eind(-1), eind(1)]) {
        expect(rect(p.x, p.z, r), `bordje ${d.nr}: kop`).toBeGreaterThan(kop + 0.3);
        expect(rect(p.x, p.z, r), `bordje ${d.nr}: schroevendraaier`).toBeGreaterThanOrEqual(draaier);
      }
    }
    for (let i = 0; i < L.paaltjes.length; i++) for (let j = i + 1; j < L.paaltjes.length; j++) expect(Math.hypot(L.paaltjes[i].x - L.paaltjes[j].x, L.paaltjes[i].z - L.paaltjes[j].z)).toBeGreaterThan(SP.d + 1.2);
    for (const p of L.paaltjes) for (const s of L.bodem) expect(rect(p.x, p.z, s)).toBeGreaterThan(SP.d / 2 + 1.0);
  });
});

describe('kabeldoos, versie 6 fase B: de modules van de uitbreiding', () => {
  const mods = MODULES as Record<string, { h: number; optioneel?: boolean }>, T = (M as any).tsmp, D = (M as any).doos;
  it('alle modules op hun plaats in hun helft, vrij van de bordjes en hun draden, niet over elkaar; elke draad op het juiste net', () => {
    expect(controleerAlles(indeling())).toEqual([]);
    for (const r of ['-K7', '-T3', '-X12', '-X13']) expect(helft(r), r).toBe('rechts');
    for (const r of ['-Q4', '-Q3', '-K5', '-K8']) expect(helft(r), r).toBe('links');
    expect((DRADEN as unknown[]).length).toBeGreaterThan(61);
  });
  it('elke module past onder het deksel (de servoprint met de stekkers ook)', () => {
    for (const r of Object.keys(mods)) expect((M as any).rechts.modulePaal.h + 1.6 + mods[r].h, r).toBeLessThan(D.h - 2);
  });
  it('de IR-leerontvanger: de lens recht achter het venstertje, het vakje groter dan de ontvanger, de houder vrij van de modules', () => {
    const th = tsmpHouder(), [b, h, d] = T.lichaam;
    expect(th.vloer + h / 2).toBeCloseTo(T.y, 0);
    expect(T.vak[0] - b).toBeGreaterThanOrEqual(0.4);
    expect(T.vak[1] - d).toBeGreaterThanOrEqual(0.3);
    expect(T.venster).toBeGreaterThan(4.0 + 1.0); // de lens (Ø4) ziet door het venster
    const [x0, z0, x1, z1] = th.blok;
    for (const r of Object.keys(mods).filter((q) => helft(q) === 'rechts')) {
      const [a0, b0, a1, b1] = voetafdruk(r) as number[];
      expect(x0 < a1 + 0.3 && a0 < x1 + 0.3 && z0 < b1 + 0.3 && b0 < z1 + 0.3, `houder op ${r}`).toBe(false);
    }
    const u = rechts().usb;
    expect(x0 > u.x1 + 1 || x1 < u.x0 - 1).toBe(true);
    expect(th.top + 12).toBeLessThan(D.h); // de pootjes en de dupontbusjes onder het deksel
  });
  it('de zekeringhouders (Fable 5.2 D9) zitten in de achterwand, vrij van de DC-bus en de tules, boven de WAGO-klemmen', () => {
    const Zk = (M as any).zekering, dc = (M as any).dcbus, T = (M as any).rechts.tules.achter, r = (M as any).doos.invoer.tule.d / 2;
    for (const x of Zk.x) {
      expect(Math.abs(x - dc.x), `DC-bus ${x}`).toBeGreaterThan((Zk.flens + dc.flens) / 2);
      for (const t of T) expect(Math.abs(x - t), `tule ${t}`).toBeGreaterThan(Zk.flens / 2 + r);
      expect(Zk.y - Zk.lijf / 2, 'boven de WAGO-klemmen in hun houder').toBeGreaterThan(8.3 + 5);
      expect(Zk.y + Zk.flens / 2, 'onder de bovenrand').toBeLessThan(D.h);
    }
    expect(Math.abs(Zk.x[0] - Zk.x[1])).toBeGreaterThan(Zk.flens);
  });
  it('Fable 5.2 DN2: de moeren van de zekeringhouders en de DC-bus raken elkaar niet, de WAGO-hendels gaan open', () => {
    const Zk = (M as any).zekering, dc = (M as any).dcbus, hoek = (sw: number) => sw / Math.cos(Math.PI / 6) / 2;
    // over de hoeken (zeskant) in het slechtste geval: moer 17 van de houder, 14 van de DC-bus
    expect(Math.abs(Zk.x[1] - Zk.x[0]), 'steek van de houders').toBeGreaterThanOrEqual(22);
    expect(Math.abs(Zk.x[1] - Zk.x[0])).toBeGreaterThan(2 * hoek(Zk.moer));
    for (const x of Zk.x) expect(Math.abs(x - dc.x), `moer DC-bus ${x}`).toBeGreaterThan(hoek(Zk.moer) + hoek(dc.moer));
    // WAGO 221-415 8,3 hoog in zijn houder (5) + de hendel open (± 10): het lijf van de houder komt er niet aan
    expect(Zk.y - Zk.lijf / 2, 'lijf boven de open hendels').toBeGreaterThan(8.3 + 5 + 10);
  });
  it('de servokabels hebben hun eigen tule (rechts, z 88) en de servoprint staat met zijn stekkers naar voren', () => {
    expect((M as any).rechts.tules.rechts).toContain(88);
    expect((PLAATSING as Record<string, { rot: number }>)['-K7'].rot).toBe(0);
  });
});

describe('kabeldoos, naad tussen de helften (versie 5)', () => {
  const N = (M as any).naad, D = (M as any).doos, P = rechts() as any;
  it('de klikhaken: rek onder 2 %, inklikken met de hand (5 tot 30 N per haak), een nok van 0,4 tot 0,8', () => {
    const h = haakKlik() as { rek: number; inklik: number; d: number };
    expect(h.rek).toBeLessThan(0.02);
    expect(h.inklik).toBeGreaterThan(5);
    expect(h.inklik).toBeLessThan(30);
    expect(h.d).toBeGreaterThanOrEqual(0.4);
    expect(h.d).toBeLessThanOrEqual(0.8);
    // het kuiltje is dieper dan de nok (de nok zit vrij) en de wand houdt minstens 1,4 achter het kuiltje
    expect(N.haak.kuil).toBeGreaterThan(N.haak.nok.d - N.spleet);
    expect(D.wand - N.haak.kuil).toBeGreaterThanOrEqual(1.4);
  });
  it('de klikhaken printen zonder support: onderkant 45° (stijgt even veel als hij uitsteekt), boven de bodem van links', () => {
    for (const h of P.haken as { prof: [number, number][] }[]) {
      const tip = h.prof[3], voet = h.prof[4];
      expect(Math.abs((tip[1] - voet[1]) - (voet[0] - tip[0]))).toBeLessThan(1e-9);
      expect(voet[1]).toBeGreaterThanOrEqual(N.spleet);
      expect(h.prof[2][1]).toBeLessThan(D.h - 10); // ruim onder het deksel
    }
  });
  it('de lip van het deksel: rek onder 2 %, de groeven dieper dan de nok, lijmspleet 0,2', () => {
    const k = dekselKlik() as { rek: number; inklik: number };
    expect(k.rek).toBeLessThan(0.02);
    expect(k.inklik).toBeLessThan(80);
    expect(N.deksel.groef).toBeGreaterThan(N.deksel.nok.h - N.spleet);
    expect(N.deksel.buiten + N.spleet + N.deksel.lip).toBeCloseTo(D.deksel, 6);
  });
  it('de bodemlippen: 0,3 speling rondom in hun uitsparing (Fable 5.2 D1: krimp van PETG), de lijmspleet 0,2', () => {
    expect(N.lip.speling).toBeCloseTo(0.3, 6);
    expect(N.spleet).toBeCloseTo(0.2, 6);
    (P.lippen as number[][]).forEach((l, i) => {
      const u = P.uitsparingen[i] as number[];
      expect(l[0] - u[0], `lip ${i + 1} aan de punt`).toBeCloseTo(N.lip.speling, 6);
      expect(l[1] - u[1], `lip ${i + 1} achter`).toBeCloseTo(N.lip.speling, 6);
      expect(u[3] - l[3], `lip ${i + 1} voor`).toBeCloseTo(N.lip.speling, 6);
      expect(u[2]).toBeGreaterThan(N.x); // de uitsparing loopt door tot de naad
    });
  });
  it('de naad van het deksel ligt niet boven die van de bak, de lip overlapt de naad van de bak', () => {
    expect(N.deksel.x).not.toBeCloseTo(N.x, 1);
    expect(N.deksel.x - N.deksel.lap).toBeLessThan(N.x - 5);
  });
});

describe('kabeldoos, Fable 5.2: proefstuk (D1) en oogjes voor kabelbinders (D2/D8)', () => {
  const D = (M as any).doos, O = (M as any).oog;
  it('het proefstuk: bordje 3 met zijn 4 paaltjes, één lip met zijn uitsparing, één haak met zijn kuiltje; A en B raken elkaar niet', () => {
    const Q = proefMaten() as any;
    expect(Q.paaltjes.length).toBe(4);
    const [ax0, az0, ax1, az1] = Q.A;
    for (const p of Q.paaltjes) expect(p.x > ax0 && p.x < ax1 && p.z > az0 && p.z < az1, `paaltje ${p.x}, ${p.z}`).toBe(true);
    expect(Q.uitsparing[1]).toBeGreaterThan(az0); expect(Q.uitsparing[3]).toBeLessThan(az1);
    expect(Q.lip[3] - Q.lip[1]).toBeCloseTo((M as any).naad.lip.b, 6);
    expect(az1 - az0 - D.wand).toBeGreaterThanOrEqual(30); // ± 30 mm naad
    expect(Q.haak.prof[3][0] + Q.dx).toBeGreaterThan(ax1 + 1); // de punt van de haak van B ligt naast A, niet erboven
    expect(Q.hw).toBeGreaterThan((M as any).naad.haak.top);
    expect(Math.max(Q.B[2] + Q.dx - ax0, az1 - az0)).toBeLessThanOrEqual(BED.max);
  });
  it('een oogje bij elke tule en bij elke module met dupont (minstens -K2, -K7, -K5, -Q4), vrij en printbaar', () => {
    const og = oogjes(indeling()) as { bij: string; helft: string; x: number; z: number; as: string; rect: number[] }[];
    const tules = (indeling() as any).tules.length + Object.values((M as any).rechts.tules as Record<string, number[]>).flat().length;
    expect(og.filter((o) => o.bij.startsWith('tule')).length).toBe(tules);
    for (const r of ['-K2', '-K7', '-K5', '-Q4', ...MET_DUPONT()]) expect(og.some((o) => o.bij === r), r).toBe(true);
    for (const o of og) {
      // de sleuven: een binder 2,5 x 1,1 gaat erdoor; het brugje houdt (1,0 boven het kanaal), het kanaal is een brug van 3,0
      const s = oogSleuven(o) as number[][];
      expect(s.length).toBe(2);
      for (const q of s) expect(Math.min(q[2] - q[0], q[3] - q[1])).toBeGreaterThanOrEqual(1.5);
      expect(O.sleuf.b).toBeGreaterThanOrEqual(2.5 + 0.4);
      expect(D.bodem - O.kanaal).toBeGreaterThanOrEqual(1.0);
      expect(O.kanaal).toBeGreaterThanOrEqual(1.1 + 0.2);
      expect(O.sleuf.b).toBeLessThanOrEqual(5); // brug onder het brugje: kort genoeg zonder support
    }
    expect(controleerAlles(indeling())).toEqual([]);
  });
});

describe('kabeldoos, assemblage', () => {
  it('niets botst en de dichte doos is hoogstens 80 hoog en 230 diep', () => {
    if (KEUZE) return;
    const a = open('Kabeldoos.kcad') as Document & { components: Component[] };
    const r = rebuildAssembly(a);
    expect(echteBotsingen(detectInterferences(r.bodies), r.bodies)).toEqual([]);
    const doos = new THREE.Box3();
    for (const b of r.bodies.filter((b) => /^d[1-4]$/.test(b.id))) { b.geometry.computeBoundingBox(); doos.union(b.geometry.boundingBox!); }
    const s = doos.getSize(new THREE.Vector3());
    expect(s.y).toBeLessThanOrEqual(BED.hoog);
    expect(s.z).toBeLessThanOrEqual(BED.max);
    expect(s.x).toBeLessThanOrEqual(2 * BED.max);
  }, 1800000);
});
