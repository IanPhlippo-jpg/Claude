/**
 * The fabrication core next to the oracles of the product libraries (docs/36 L2.6, L4.4, O1.6, P2.7, P3.3, P5.5; docs/37
 * ch. 8 and 9). Proefstukken, fixed here:
 *   LF4 / OA2  pivot door TD-01 (bibliotheek/taatsdeuren/modellen/TD-01-strak-1000x2400.kcad). The stored model draws
 *              every tube solid (recognized "Vierkant 40"); the same door is built by the generator with its option
 *              `werkplaats` (hollow tubes with the wall of their bar, glass laths as bars, glass and hinge as purchased
 *              parts, the frame and the leaf each one welded part). The test checks that both draw the same tubes.
 *   LF5        fitness rack FR-13 Kettlebellrek (thuis): twelve tubes 40 x 40 x 2 and two shelves of 3 mm, no mitres
 *   PP8        the laser plates of FR-04 Opklapbaar wandrek (thuis): twelve positions in 8 and 15 mm, holes, a triangle,
 *              an octagon
 * A fitness machine has no .kcad: src/qa/fitnessDoc.ts draws the generator's own pieces as bodies. Every price and
 * hour of the oracle is set in the fabrication settings ("the same settings"); what still differs is measured and
 * explained per test, not averaged away.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { setRebuildBudget, rebuildDocument, type RebuildResult } from '../core/features/rebuild';
import { parseDocument } from '../core/document/persistence';
import type { Document } from '../core/document/types';
import { analyze, nestGroups, type FabResult } from '../fab/analyze';
import { defaultSettings, type FabSettings } from '../fab/settings';
import { costModel } from '../fab/cost';
import { plateDxf } from '../fab/dxf';
import type { Sourced } from '../fab/types';
import { fitnessDocument } from './fitnessDoc';
import { toestel } from '../../bibliotheek/fitness/catalogus.mjs';
import { stuklijst, zaagplan, nesting } from '../../bibliotheek/fitness/stuklijst.mjs';
import { kostprijs as fitKost } from '../../bibliotheek/fitness/prijzen.mjs';
import { dxfBestanden } from '../../bibliotheek/fitness/dxf.mjs';
import { aabb } from '../../bibliotheek/fitness/model.mjs';
// @ts-expect-error: de bibliotheek is plain JavaScript
import { UREN as FIT_UREN } from '../../bibliotheek/fitness/werkwijze.mjs';
// @ts-expect-error: idem
import { ontwerp } from '../../bibliotheek/taatsdeuren/deuren.mjs';
// @ts-expect-error: idem
import { samenstelling } from '../../bibliotheek/taatsdeuren/model.mjs';
// @ts-expect-error: idem
import { zaagplan as deurZaagplan } from '../../bibliotheek/taatsdeuren/bestel.mjs';
// @ts-expect-error: idem
import { kostprijs as deurKost, STAAF } from '../../bibliotheek/taatsdeuren/prijzen.mjs';
// @ts-expect-error: idem
import { UREN as DEUR_UREN } from '../../bibliotheek/taatsdeuren/werkwijze.mjs';

setRebuildBudget(Number.POSITIVE_INFINITY);
/* eslint-disable @typescript-eslint/no-explicit-any */

/** one rebuild per document name: the second analysis (with Ian's choices) reuses the geometry */
const rebuilt = new Map<string, RebuildResult>();
const rebuild = (d: Document) => rebuilt.get(d.name) ?? rebuilt.set(d.name, rebuildDocument(d)).get(d.name)!;
const orakel = (waarde: number, bron: string): Sourced<number> => ({ waarde, eenheid: '', bron: `orakel: ${bron}`, aanname: true, datum: '2026-11-19' });
const rel = (ours: number, theirs: number) => (ours - theirs) / theirs;
const euro = (r: FabResult, ids: (id: string) => boolean) => r.cost.regels.filter((l) => ids(l.id)).reduce((t, l) => t + l.bedragCent, 0) / 100;
const uren = (r: FabResult, id: string) => r.cost.regels.find((l) => l.id === id)?.hoeveelheid ?? 0;
const sorted = (xs: number[]) => [...xs].sort((a, b) => b - a);

// ---- the pivot door TD-01 (LF4, OA2)
const DEUR = ontwerp('strak', 1000, 2400, { systeem: 'koker' });
/** the oracle's bars (prijzen.mjs STAAF) and the catalogue profile each one is */
const DEUR_PROF: Record<string, string> = { koker40x40x2: 'EN10219/SHS/40x40x2', plat15x4: 'EN10058/FL/15x4', hoek15x15x3: 'EN10056/L/15x15x3', rond25: 'EN10060/RD/25' };
let deurMemo: FabResult | null = null;
function deurSettings(): FabSettings {
  const s = defaultSettings(), K = deurKost(DEUR);
  // the oracle prices bars per metre (metallshopper.de and estimates) plus 10 % saw loss, in used metres
  for (const [k, id] of Object.entries(DEUR_PROF)) s.materials.profielM[id] = orakel(STAAF[k].prijs, `taatsdeuren STAAF.${k}`);
  s.rates.afvalProfiel = orakel(10, 'taatsdeuren kostprijs: + 10 % zaagverlies');
  s.rates.materiaalModus = 'verbruikt';
  // glass and the hinge set are purchased parts at the oracle's amounts; the hinge set is pot, axle and top pin together
  const regel = (re: RegExp) => K.regels.find((r: any) => re.test(r.wat)).bedrag as number;
  s.materials.koop['Glas vleugel 1.1'] = orakel(regel(/^Glas:/), 'taatsdeuren kostprijs, regel Glas');
  s.materials.koop['Taatspot Ø60 (vloer)'] = orakel(regel(/^Scharnier/), 'taatsdeuren kostprijs, regel Scharnier (pot, as en bovenpen)');
  s.materials.koop['Taatsas Ø20 onder'] = orakel(0, 'in de scharnierset van de taatspot');
  // the hours of the oracle where the generic model has the same step: sawing per piece, a mitre corner per joint
  s.machines.zagen.perStuk = orakel(DEUR_UREN.zaagPerStuk, 'taatsdeuren UREN.zaagPerStuk');
  s.machines.zagen.perSchuin = orakel(0, 'taatsdeuren: verstek zit in zaagPerStuk');
  s.machines.lassen.perVerbinding = orakel(DEUR_UREN.hoekTig, 'taatsdeuren UREN.hoekTig');
  s.machines.lassen.perMeter = orakel(0, 'taatsdeuren: lassen per hoek, niet per meter');
  return s;
}
function deur(): FabResult {
  if (deurMemo) return deurMemo;
  const doc = parseDocument(JSON.stringify(samenstelling(DEUR, 'TD-01 werkplaats', { werkplaats: true })));
  const plaatsen = deurKost(DEUR).plaatsen.kost as number;
  return (deurMemo = analyze(doc, deurSettings(), { vrij: [{ omschrijving: 'Plaatsen (orakel: 3 u)', bedragCent: Math.round(plaatsen * 100) }] }, { rebuild }));
}

// ---- the fitness rack FR-13 (LF5) and the laser plates of FR-04 (PP8)
const REK = toestel('FR-13', 'thuis');
const LIJN_O = 16, PUNT_O = 4, LIJN_TOL = 0.05;
const FIT_PROF: Record<string, string> = { k40x40x2: 'EN10219/SHS/40x40x2' };
let rekMemo: FabResult | null = null;
const rek = () => (rekMemo ??= analyze(fitnessDocument(REK, 'FR-13'), defaultSettings(), {}, { rebuild }));
const WANDREK = toestel('FR-04', 'thuis');
let laserMemo: FabResult | null = null;
/** the laser parts of FR-04; the J-cup sides (200 x 45 x 8, no hole) are recognized as flat bar first (docs/37 B-9) and set to plate as Ian would */
function laser(): FabResult {
  if (laserMemo) return laserMemo;
  const doc = fitnessDocument(WANDREK, 'FR-04 laserdelen', { alleen: 'laser' });
  const eerst = analyze(doc, defaultSettings(), {}, { rebuild });
  const wang = eerst.recs.filter((r) => r.naam === 'J-cup wang');
  expect(wang.map((r) => [r.soort, r.alternatief])).toEqual(Array(4).fill(['profiel', 'plaat']));
  return (laserMemo = analyze(doc, defaultSettings(), { overrides: Object.fromEntries(wang.map((r) => [r.key, { soort: 'plaat' as const, t: 8 }])) }, { rebuild }));
}
const ORAKEL_LASER = () => stuklijst(WANDREK).posities.filter((p: any) => p.soort === 'plaat' && p.laser);

describe('fabrication core next to the library oracles', () => {
  it('LF4 the stored TD-01 draws its tubes solid; the werkplaats model of the generator draws the same tubes hollow', () => {
    const stored = analyze(parseDocument(readFileSync('bibliotheek/taatsdeuren/modellen/TD-01-strak-1000x2400.kcad', 'utf8')), defaultSettings(), {}, { rebuild });
    const buizen = (r: FabResult, re: RegExp) => r.recs.filter((x) => re.test(x.naam)).map((x) => `${x.profielId} ${Math.round(x.lengte ?? 0)} ${x.hoek1}/${x.hoek2}`).sort();
    const vol = buizen(stored, /^(Kozijn|Vleugel) (kozijn|kader)/);
    // measured: a solid 40 x 40 is the bar EN 10059 "Vierkant 40", which makes bars and weights meaningless. The
    // posts (one end square, one mitred) read 0,3° / 45,3° before the axis was taken from the side faces (recognize.ts barAxis)
    expect(vol.length).toBe(7);
    expect(vol.every((x) => x.startsWith('EN10059/SQ/40 '))).toBe(true);
    const hol = buizen(deur(), /^(Kozijn|Vleugel) (kozijn|kader)/);
    expect(hol.map((x) => x.replace('EN10219/SHS/40x40x2', 'EN10059/SQ/40'))).toEqual(vol);
  }, 300000);

  it('L2.6 LF4: bars per profile equal to zaagplan() of the door library, or fewer', () => {
    const a = deur(), z = deurZaagplan(DEUR);
    expect(Object.keys(DEUR_PROF).sort()).toEqual(z.profielen.map((p: any) => p.prof).sort());
    for (const p of z.profielen) {
      const plan = a.plans.find((x) => x.profielId === DEUR_PROF[p.prof])!;
      expect(plan.fouten, p.prof).toEqual([]);
      // the same pieces (the oracle rounds a length up to the mm) on bars of 6000 with a cut of 4
      expect(sorted(plan.staven.flatMap((s) => s.stukken.map((x) => Math.ceil(x.l - 0.01))))).toEqual(sorted(p.staven.flatMap((s: any) => s.stukken.map((x: any) => x.l))));
      expect(plan.teBestellen, p.prof).toBeLessThanOrEqual(p.n);
    }
    // measured: koker 3 = 3, platstaal 15 x 4 2 = 2, hoeklijn 15 x 15 x 3 2 = 2, rond 25 1 = 1 (equal, none better)
    expect(z.profielen.map((p: any) => `${p.prof} ${a.plans.find((x) => x.profielId === DEUR_PROF[p.prof])!.teBestellen}/${p.n}`).sort())
      .toEqual(['hoek15x15x3 2/2', 'koker40x40x2 3/3', 'plat15x4 2/2', 'rond25 1/1']);
  }, 300000);

  it('L2.6 LF5 (FR-13): bars per profile equal to zaagplan() of the fitness library, or fewer', () => {
    const a = rek(), z = zaagplan(REK);
    expect(z.profielen.map((p) => p.prof)).toEqual(Object.keys(FIT_PROF));
    for (const p of z.profielen) {
      const plan = a.plans.find((x) => x.profielId === FIT_PROF[p.prof])!;
      expect(sorted(plan.staven.flatMap((s) => s.stukken.map((x) => x.l)))).toEqual(sorted(p.stukken.map((x) => x.l)));
      expect(plan.teBestellen).toBeLessThanOrEqual(p.n);
      expect([plan.teBestellen, p.n]).toEqual([2, 2]);
    }
  }, 300000);

  it('L4.4 LF5 (FR-13) next to kostprijs(): steel and sawing within 2 %, welding within 2 % (face and line contacts, stitches), the rest explained', () => {
    const a = rek(), s = defaultSettings();
    // the settings are the oracle's: steel € 1,80/kg + 15 %, the hours of werkwijze.mjs UREN, € 45/u; the series of
    // 20 has learning factor 1.0 (the generic model has no learning curve; the default series 5 multiplies by 1.6)
    expect([s.materials.profielKg.waarde, s.rates.afvalProfiel.waarde, s.rates.uurloon.waarde]).toEqual([1.8, 15, 45]);
    expect([s.machines.zagen.perStuk.waarde, s.machines.zagen.perSchuin.waarde, s.machines.lassen.perVerbinding.waarde, s.machines.lassen.perMeter.waarde])
      .toEqual([FIT_UREN.zaag, FIT_UREN.verstek, FIT_UREN.verbinding, FIT_UREN.lasM]);
    const K = fitKost(REK, { reeks: 20 }), stap = (t: string) => K.stappen.find((x: any) => x.titel === t).uren as number;
    // steel: the oracle adds the 4 mm cut to every piece (zaagplan().nodig); with that the two agree to the cent.
    // Measured: € 44,44 against € 44,67 (-0,5 %)
    const staalO = K.regels.find((r: any) => r.cat === 'staal').bedrag as number, staal = euro(a, (id) => id.startsWith('profiel:'));
    const m = a.saw.reduce((t, l) => t + l.n * l.zaaglengte, 0), n = a.saw.reduce((t, l) => t + l.n, 0);
    expect(Math.abs(rel(staal, staalO))).toBeLessThan(0.02);
    expect(Math.abs(rel(staal * (m + 4 * n) / m, staalO))).toBeLessThan(0.001);
    // sawing: 12 pieces, no mitre: 12 x 0,07 u on both sides
    expect(uren(a, 'zagen')).toBeCloseTo(stap('Zagen'), 6);
    // welding: the oracle counts every pair of boxes within 0,6 mm (bibliotheek/fitness/model.mjs contact). Of its 36,
    // 16 are a tube end on a face, the others touch along an edge (the shelf on the beams, the side beam against the
    // front beam on a corner line) or in a point (a shelf corner against a post, 3 mm). The core proposes a joint for
    // the face contacts and, since docs/37 ch. 9, for the line contacts (src/fab/weldEdge.ts); a point is no seam.
    const overlap = (l: any) => { const [A, B] = [aabb(l.A.geo[0]), aabb(l.B.geo[0])]; return [0, 1, 2].map((i) => Math.min(A[1][i], B[1][i]) - Math.max(A[0][i], B[0][i])); };
    const vlak = REK.lassen.filter((l: any) => overlap(l).filter((x) => x > 0.5).length >= 2);
    const lijn = REK.lassen.filter((l: any) => !vlak.includes(l) && Math.max(...overlap(l)) >= 5);
    const punt = REK.lassen.filter((l: any) => !vlak.includes(l) && !lijn.includes(l));
    const vlakM = vlak.reduce((t: number, l: any) => t + l.naad, 0) / 1000;
    const ours = { vlak: a.joints.filter((j) => j.rondom), lijn: a.joints.filter((j) => !j.rondom) };
    expect([REK.lassen.length, vlak.length, lijn.length, punt.length]).toEqual([36, 16, LIJN_O, PUNT_O]);
    expect([ours.vlak.length, ours.lijn.length]).toEqual([vlak.length, lijn.length]);
    expect(Math.abs(rel(ours.vlak.reduce((t, j) => t + j.lengte, 0) / 1000, vlakM))).toBeLessThan(0.02);
    const lijnM = lijn.reduce((t: number, l: any) => t + l.naad, 0) / 1000;
    // both weld a line contact on its two sides. A shelf over 1120 mm: the oracle 25 % of 2 x 1120 = 560 mm, the core
    // 6 whole stitches of 50 per side = 600 mm; with the side beams (2 x 2 x 50) and the corners equal: +4,3 % in all
    const seam = (j: (typeof a.joints)[number]) => (j.onderbroken ? j.onderbroken.n * j.onderbroken.l : j.lengte) * (j.tweezijdig ? 2 : 1);
    expect(Math.abs(rel(ours.lijn.reduce((t, j) => t + seam(j), 0) / 1000, lijnM))).toBeLessThan(LIJN_TOL);
    // the whole welding step of the oracle against the core: the difference is the point contacts only
    const lassen = uren(a, 'hechten') + uren(a, 'lassen');
    // measured: 6,57 u against 6,51 u (+0,9 %), the whole stitches of the shelves
    const punten = punt.length * FIT_UREN.verbinding + punt.reduce((t: number, l: any) => t + l.naad, 0) / 1000 * FIT_UREN.lasM;
    expect(Math.abs(rel(lassen + punten, stap('Lassen')))).toBeLessThan(0.02);
  }, 300000);

  it('O1.6 OA2 (TD-01) next to kostprijs(): steel within 5 %; glass, hinge and placing as purchased and free lines; labour reconciled step by step', () => {
    const a = deur(), K = deurKost(DEUR);
    const regel = (re: RegExp) => K.regels.find((r: any) => re.test(r.wat)).bedrag as number;
    // steel: the same bars at the same price per metre + 10 %: equal to the cent
    expect(Math.abs(rel(euro(a, (id) => id.startsWith('profiel:')), regel(/^Staven/)))).toBeLessThan(0.001);
    // glass and the hinge set are purchased parts, placing a free line, each at the oracle's amount
    const koop = a.cost.regels.filter((l) => l.categorie === 'koop').map((l) => [l.omschrijving, l.bedragCent / 100]);
    expect(koop).toEqual([['Glas vleugel 1.1', regel(/^Glas:/)], ['Taatspot Ø60 (vloer)', regel(/^Scharnier/)], ['Taatsas Ø20 onder', 0]]);
    expect(a.cost.regels.filter((l) => l.categorie === 'vrij').map((l) => l.bedragCent / 100)).toEqual([K.plaatsen.kost]);
    // labour, the steps that map: sawing per piece (17 pieces: the 7 tubes, 8 glass laths, 2 handles; the oracle
    // lists the laths as one bar per profile, sawn while glazing, so 11, plus 0,5 u preparation) and the mitre corners
    // (6 tube-to-tube joints x 0,3 u = the oracle's "Kader hechten en lassen" exactly)
    const stap = (t: string) => K.stappen.find((x: any) => x.titel === t).uren as number;
    expect(uren(a, 'zagen')).toBeCloseTo(17 * DEUR_UREN.zaagPerStuk, 6);
    expect(stap('Voorbereiden en zagen')).toBeCloseTo(DEUR_UREN.voorbereiden + 11 * DEUR_UREN.zaagPerStuk, 6);
    const koker = (k: string) => a.recs.find((r) => r.key === k)?.profielId === DEUR_PROF.koker40x40x2;
    const hoeken = a.joints.filter((j) => koker(j.bodies[0]) && koker(j.bodies[1]));
    expect(hoeken.length * DEUR_UREN.hoekTig).toBeCloseTo(stap('Kader hechten en lassen'), 6);
    // the 12 other joints are the front laths on the frame (welded, the oracle's "Glaslatten" step per metre of lath);
    // opspannen, taatsplaten, richten, coater, glazen have no line in the generic model (they are free lines for Ian).
    // Measured: the oracle 8,54 u without placing, the core 1,02 + 18 x 0,3 + 0,35 afwerken + 0,12 laserdeel = 6,89 u
    const kern = ['zagen', 'hechten', 'lassen', 'afwerken'].reduce((t, id) => t + uren(a, id), 0) + a.cost.regels.filter((l) => l.id.startsWith('laserdeel:')).reduce((t, l) => t + l.hoeveelheid, 0);
    // the glass laths touch each other at their corners along 15 mm: shorter than a weld seam (30 mm, EN 1993-1-8), no joint
    expect(kern).toBeCloseTo(6.89, 2);
    expect(K.uren - K.plaatsen.uren).toBeCloseTo(8.54, 2);
    // laser: the oracle cuts taatsplaten, busplaat and 2 greephouders 25 x 40 x 10 (5 parts, € 19,62); the model draws
    // none of them and 4 handle feet 16 x 16 instead (recognized as plate 16 mm): not compared
    expect(a.flats.map((f) => [f.naam, f.n, f.t])).toEqual([['Greepvoet 16 x 16', 4, 16]]);
  }, 300000);

  it('P2.7 PP8 (FR-04): one DXF per laser position with the cut length and pierces of dxfBestanden() / snijden(), within 0,5 %', () => {
    const a = laser(), orakelPos = ORAKEL_LASER();
    // dxfBestanden() also writes a drilling template (DXF 1:1) and a hole table (CSV) for the drilled post: no laser parts
    const files = dxfBestanden(WANDREK);
    expect(files.length).toBe(orakelPos.length + 2);
    expect(files.filter((f) => /boormal|gatentabel/.test(f.naam)).length).toBe(2);
    for (const p of orakelPos.filter((x: any) => x.naam !== 'Kopplaat')) {
      const f = a.flats.filter((x) => x.naam === p.naam);
      expect(f.length, p.naam).toBe(1);
      expect([f[0].n, f[0].t, f[0].betrouwbaar], p.naam).toEqual([p.n, p.t, 'exact']);
      expect(Math.abs(rel(f[0].snijlengte.buiten + f[0].snijlengte.binnen, p.snij.m * 1000)), p.naam).toBeLessThan(0.005);
      expect(f[0].insteken, p.naam).toBe(p.snij.insteken);
      // the file: one closed contour and a CIRCLE per hole, as the oracle's file has its holes on GATEN
      const dxf = plateDxf(f[0]), ent = (e: string) => dxf.split('\r\n').filter((x, i, all) => x === e && all[i - 1] === '0').length;
      const theirs = files.find((x) => x.pos === p.pos)!.dxf;
      expect([ent('POLYLINE'), ent('CIRCLE')], p.naam).toEqual([1 + f[0].binnen.length, (theirs.match(/CIRCLE\n8\nGATEN/g) ?? []).length]);
    }
  }, 300000);

  // known fault of src/fab/flat.ts fitArcs (not in this agent's files): a loop of 8 or more points that all lie on one
  // circle is taken as a full circle without the 30 degree turn check its arc rule has. The octagon 70 x 70 with 6 mm
  // chamfers has all 8 corners on a circle of Ø90,9: two 'geen' positions of Ø90,9 instead of one octagon of 265,9 mm.
  it('P2.7 PP8 (FR-04): the octagonal Kopplaat is one exact position like snijden() (fitArcs checks the turn)', () => {
    const f = laser().flats.filter((x) => x.naam === 'Kopplaat'), p = ORAKEL_LASER().find((x: any) => x.naam === 'Kopplaat');
    expect(f.map((x) => [x.n, x.betrouwbaar])).toEqual([[2, 'exact']]);
    expect(Math.abs(rel(f[0].snijlengte.buiten, p.snij.m * 1000))).toBeLessThan(0.005);
  }, 300000);

  it('P3.3 PP8 (FR-04): not more sheets than nesting() of the library for the same pieces on its sheet 3000 x 1500', () => {
    const a = laser(), s = defaultSettings();
    s.materials.platen = [{ id: 'orakel-3000x1500', materiaal: '*', t: 0, l: 3000, b: 1500, voorraad: 0, restplaat: false }];
    const ours = nestGroups(a.flats, s), theirs = nesting(WANDREK);
    expect(ours.map((n) => n.t).sort()).toEqual(theirs.map((n) => n.t).sort());
    for (const n of theirs) expect(ours.find((x) => x.t === n.t)!.bladen.length, `${n.t} mm`).toBeLessThanOrEqual(n.platen.length);
    // every piece placed once: the same count as the oracle's nest, less the positions without a valid flat (the two
    // Kopplaat pieces of the known fault are not nested)
    const stuks = (t: number) => ours.find((x) => x.t === t)!.bladen.reduce((q, b) => q + b.stukken.length, 0);
    const geen = (t: number) => a.flats.filter((f) => f.betrouwbaar === 'geen' && f.t === t).reduce((q, f) => q + f.n, 0);
    for (const n of theirs) expect(stuks(n.t) + geen(n.t), `${n.t} mm`).toBe(n.platen.reduce((q, b) => q + b.stukken.length, 0));
  }, 300000);

  it('P5.5 PP8 (FR-04): laser cost within 2 % of kostprijs() (category laser) with the same settings', () => {
    const a = laser(), s = defaultSettings();
    // the same prices: plate € 1,60/kg, cutting per metre in the same thickness bands, € 0,25 per pierce
    const K = fitKost(WANDREK, { reeks: 20 }), I = K.instellingen;
    expect([s.materials.plaatKg.S235!.waarde, s.machines.laser.insteek.waarde]).toEqual([I.plaatKg, I.insteek]);
    expect(s.machines.laser.snijM.map((b) => [b.tot, b.prijs.waarde])).toEqual(Object.entries(I.snijM).map(([k, v]) => [Number(k), v]));
    // the oracle charges the net plate mass (holes out, no waste, no spacing); the core the bounding rectangle with a
    // spacing of max(5, t) and 20 % waste. With waste 0 and spacing 0 the methods agree but for the holes (the oracle
    // takes them out) and the two Kopplaat positions (Ø90,9 instead of the octagon, see the known fault above)
    s.rates.afvalPlaat = orakel(0, 'fitness kostprijs: laserdelen zonder afval');
    const ours = (spacing?: number) => costModel({ ...a, settings: s, spacing }).regels.filter((l) => /^(plaat|snijden|insteken):/.test(l.id))
      .reduce((t, l) => t + l.bedragCent, 0) / 100;
    const theirs = K.regels.find((r: any) => r.cat === 'laser').bedrag as number;
    // measured: € 117,11 against € 115,67 (+1,2 %)
    expect(Math.abs(rel(ours(0), theirs))).toBeLessThan(0.02);
    // with the core's own spacing around each plate (the default) the material share is larger: € 125,54 (+8,5 %), and
    // with the default 20 % waste as well € 138,13 (+19 %): a choice of the settings, not a difference of method
    expect(rel(ours(), theirs)).toBeGreaterThan(rel(ours(0), theirs));
    // the finishing of the laser parts is labour on both sides: 36 parts x 0,03 u
    expect(a.cost.regels.filter((l) => l.id.startsWith('laserdeel:')).reduce((t, l) => t + l.hoeveelheid, 0)).toBeCloseTo(K.stappen.find((x: any) => x.titel === 'Laserdelen').uren, 6);
  }, 300000);
});
