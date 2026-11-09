/**
 * Tekeningen van de lastafel op de heftafel (voorbeelden/lastafel/tekeningen): LASTAFEL_TEKENINGEN=1 VOORBEELDEN=1 npx
 * vitest run src/qa/tekeningenLastafel.test.ts. A3 liggend, Europese projectie (ISO 5456-2), kader ISO 5457, titelblok
 * ISO 7200, lijnen ISO 128, maten ISO 129-1 (zie werktekening.ts):
 * LFT-00 overzicht in de laagste en de hoogste stand, LFT-01 gatenplan van de tafel (1:10), LFT-02.. de lasdelen.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Blad, kader, onderdeelBlad, getal, type Deel, type P } from './werktekening';
// @ts-expect-error: het generatorscript is plain JavaScript
import { M, stand, TAFELGATEN } from '../../voorbeelden/lastafel/maak-lastafel.mjs';

const DIR = 'voorbeelden/lastafel';
const UIT = `${DIR}/tekeningen`;
const datum = /\((\d{4}-\d{2}-\d{2})\)/.exec(readFileSync(`${DIR}/README.md`, 'utf8'))?.[1] ?? '';
const PROJECT = { naam: 'Lastafel op heftafel', datum, revisie: '1' };
const m = M as Record<string, any>;
const STAAL = 7.85;

/** zijaanzicht (Z naar rechts, Y omhoog) van de lift met de tafel bij bovenkant H, schaal s, linksonder op o */
function zijaanzicht(b: Blad, H: number, s: number, o: P) {
  const to = (z: number, y: number): P => [o[0] + (z + 1200) * s, o[1] + y * s];
  const r = (z0: number, y0: number, z1: number, y1: number, w = 0.35) => { const a = to(z0, y0), c = to(z1, y1); b.rect(a[0], a[1], c[0] - a[0], c[1] - a[1], w); };
  r(-1195, 0, 1195, 10);
  r(-1195, 10, 1195, 110);
  r(-1195, H - 120, 1195, H - 10);
  for (const z of [-1145, 0, 1145]) r(z - 50, H - 10, z + 50, H, 0.25);
  r(-1200, H, 1200, H + 200, 0.5);
  for (let i = 0; i < 24; i++) for (const y of [50, 150]) b.cirkel(to(-1150 + i * 100, H + y), 14 * s, 0.18);
  for (let i = 0; i < 23; i++) b.cirkel(to(-1100 + i * 100, H + 100), 14 * s, 0.18);
  // armen als omtrek (koker 116 aan de scharnieren, 160 in het midden), de middenpen
  const S = stand(H), L = m.arm, c = Math.cos(S.th), sn = Math.sin(S.th);
  const arm = (p: [number, number], richting: 1 | -1) => {
    const d: [number, number] = [c, richting * sn], n: [number, number] = [-d[1], d[0]];
    const at = (t: number, h: number): P => to(p[0] + d[0] * t + n[0] * h, p[1] + d[1] * t + n[1] * h);
    for (const k of [1, -1]) { b.lijn(at(0, 58 * k), at(L / 2, 80 * k), 0.35); b.lijn(at(L / 2, 80 * k), at(L, 58 * k), 0.35); }
    for (const t of [0, L]) b.cirkel(at(t, 0), 58 * s, 0.25);
  };
  arm([m.z0, m.yb], 1);
  arm([m.z0, H - m.dt], -1);
  b.cirkel(to(S.midden[2], S.midden[1]), 23 * s, 0.35);
  // cilinder van de voet naar het oog op arm B
  const p0 = to(m.cil.p0[1], m.cil.p0[0]), p1 = to(m.cil.p0[1] + Math.cos(S.phi) * S.d, m.cil.p0[0] + Math.sin(S.phi) * S.d);
  b.lijn(p0, p1, 0.7);
  return { to, S };
}

function overzicht(blad: string): string {
  const b = new Blad(), s = 1 / 20;
  const laag = zijaanzicht(b, m.hMin, s, [40, 120]);
  const hoog = zijaanzicht(b, m.hMax, s, [205, 120]);
  for (const [v, H, x0] of [[laag, m.hMin, 40], [hoog, m.hMax, 205]] as const) {
    const a = v.to(-1200, 0), top = v.to(-1200, H), t2 = v.to(-1200, H + 200), e = v.to(1200, 0);
    b.maatV(a[1], top[1], a[0], a[0] - 6, getal(H, 0));
    b.maatV(a[1], t2[1], a[0], a[0] - 13, getal(H + 200, 0));
    b.maatH(a[0], e[0], a[1], a[1] - 8, '2400');
    b.tekst([(x0 + e[0]) / 2 + 4, t2[1] + 6], H === m.hMin ? 'Laagste stand' : 'Hoogste stand', 3.2, 'middle', { vet: true });
    b.tekst([(x0 + e[0]) / 2 + 4, a[1] - 15], `armhoek ${getal((v.S.th * 180) / Math.PI, 1)}°, cilinder ${getal(v.S.d, 0)}`, 2.5, 'middle');
  }
  b.tekst([40, 108], 'Zijaanzichten 1:20 (de tafel met de rijen gaten in de langswand, de schaar met de middenpen, de cilinder als lijn)', 2.5);
  // bovenaanzicht 1:20: tafel, onderframe in streeplijn, ankergaten en het voetpedaal
  const o: P = [40, 30], to = (x: number, z: number): P => [o[0] + (z + 1200) / 20, o[1] + (x + 600) / 20];
  const bl = to(-600, -1200);
  b.rect(bl[0], bl[1], 120, 60, 0.5);
  const fl = to(-595, -1195);
  b.el.push(`<rect x="${fl[0]}" y="${b.y(fl[1] + 59.5)}" width="119.5" height="59.5" fill="none" stroke="#111" stroke-width="0.25" stroke-dasharray="3 1.5"/>`);
  for (const x of [-560, 560]) for (const z of [-1165, -400, 400, 1165]) b.cirkel(to(x, z), 0.45, 0.25);
  b.maatH(bl[0], bl[0] + 120, bl[1] + 60, bl[1] + 66, '2400');
  b.maatV(bl[1], bl[1] + 60, bl[0] + 120, bl[0] + 128, '1200');
  b.tekst([100, 24], 'Bovenaanzicht 1:20 (streeplijn: onderframe 1190 x 2390, 8 ankergaten Ø18)', 2.5, 'middle');
  // technische gegevens
  const S0 = stand(m.hMin), S1 = stand(m.hMax);
  const regels = [
    'Technische gegevens',
    'Lastafel 2400 x 1200 x 200, Ø28 raster 100 DG, 541 gaten in het blad',
    'S690QL, blad 25, wanden 12, gasgenitreerd 800 HV',
    `Heftafel: bovenkant ${m.hMin} tot ${m.hMax} (zonder blad), met blad ${m.hMin + 200} tot ${m.hMax + 200}`,
    'Last: 4000 kg inclusief het blad (± 3280 kg nuttig met deze tafel)',
    `Schaar: armen ${m.arm} tussen de scharnieren, ${getal((S0.th * 180) / Math.PI, 1)}° tot ${getal((S1.th * 180) / Math.PI, 1)}°`,
    `2 cilinders Ø${m.cil.boring}/${m.cil.stang}, slag 360, ${getal(S0.d, 0)} tot ${getal(S1.d, 0)} oog-oog`,
    'Hoogste druk 119 bar (laagste stand), overdruk 140 bar',
    'Aggregaat 230 V 2,2 kW, omhoog ± 46 s, omlaag ± 36 s',
    'Bediening: dubbel voetpedaal met noodstop (dodemans)',
    'Leidingbreukventielen en mechanische valbeveiliging',
    'Kleuren: zwart RAL 9005, geel RAL 1032, kast RAL 7035',
  ];
  let ty = 272;
  for (const r of regels) { b.tekst([300, ty], r, r === regels[0] ? 3.2 : 2.5, 'start', { vet: r === regels[0] }); ty -= 5.4; }
  kader(b, { nr: 'LFT-00', naam: 'Overzicht en hoofdmaten', materiaal: 'zie de werktekeningen', maken: 'samenstelling', massa: '± 1900 kg (lift ± 1180 + tafel ± 720)', schaal: '1:20', blad, soort: 'Overzichtstekening' }, PROJECT);
  return b.svg();
}

/** gatenplan van de tafel 1:10: blad van boven, een langswand en een kopwand, met de steek en de randafstanden */
function gatenplan(blad: string): string {
  const b = new Blad(), s = 1 / 10, o: P = [40, 120];
  const to = (x: number, z: number): P => [o[0] + (z + 1200) * s, o[1] + (x + 600) * s];
  b.rect(o[0], o[1], 240, 120, 0.5);
  for (const [x, z] of TAFELGATEN.g as [number, number][]) b.cirkel(to(x, z), 1.4, 0.25);
  for (const [x, z] of TAFELGATEN.d as [number, number][]) b.cirkel(to(x, z), 1.4, 0.18);
  b.maatH(o[0], o[0] + 240, o[1] + 120, o[1] + 128, '2400');
  b.maatV(o[1], o[1] + 120, o[0], o[0] - 8, '1200');
  b.maatH(o[0], to(0, -1150)[0], o[1] + 120, o[1] + 136, '50');
  b.maatH(to(0, -1150)[0], to(0, -1050)[0], o[1] + 120, o[1] + 136, '100');
  b.maatH(to(0, -1050)[0], to(0, -1000)[0], o[1] + 120, o[1] + 144, '50 (diagonaal)');
  b.maatV(to(550, 0)[1], o[1] + 120, o[0] + 240, o[0] + 248, '50');
  b.maatV(to(450, 0)[1], to(550, 0)[1], o[0] + 240, o[0] + 248, '100');
  b.tekst([o[0] + 120, o[1] + 152], 'Blad van boven 1:10 — 288 gaten Ø28 op het raster 100 (dik), 253 diagonale gaten (dun)', 2.8, 'middle', { vet: true });
  // langswand en kopwand (van buiten gezien), gaten op 50 / 100 / 150 onder de bovenkant
  const wand = (x0: number, y0: number, l: number, titel: string) => {
    b.rect(x0, y0, l * s, 20, 0.5);
    for (let i = 0; i < l / 100; i++) for (const y of [50, 150]) b.cirkel([x0 + (50 + i * 100) * s, y0 + y * s], 1.4, 0.25);
    for (let i = 0; i < l / 100 - 1; i++) b.cirkel([x0 + (100 + i * 100) * s, y0 + 100 * s], 1.4, 0.18);
    b.maatV(y0, y0 + 20, x0, x0 - 6, '200');
    b.maatH(x0, x0 + l * s, y0, y0 - 7, String(l));
    b.tekst([x0, y0 + 24], titel, 2.6, 'start', { vet: true });
  };
  wand(40, 70, 2400, 'Langswand (2 x, 71 gaten): rijen op 50 en 150 op het raster, 100 diagonaal');
  wand(40, 30, 1200, 'Kopwand (2 x, 35 gaten); de kopwand zit tussen de langswanden');
  const regels = [
    'Gaten en maken',
    'Alle gaten Ø28 H7, hart-op-hart 100 ± 0,05,',
    'gecumuleerd ± 0,1 over de hele tafel.',
    'Blad: vlakheid 0,1 per m na nitreren.',
    'Gaten boren of frezen na het lassen',
    '(blad, wanden en ribben samen opgespannen).',
    'Kanten van de gaten 1 x 45°.',
    'Gasnitreren 800 HV, nitreerdiepte ± 0,5 mm.',
    'Liniaal (mm) gelaserd op één lengte- en',
    'één breedtekant van het blad.',
    'Badge Ø44 in de langswand (eigen merk).',
  ];
  let ty = 105;
  for (const r of regels) { b.tekst([300, ty], r, r === regels[0] ? 3.2 : 2.5, 'start', { vet: r === regels[0] }); ty -= 5.2; }
  kader(b, { nr: 'LFT-01', naam: 'Lastafel: gatenplan', materiaal: 'S690QL, gasgenitreerd 800 HV', maken: 'lassen, CNC-frezen, nitreren', massa: '± 723 kg', schaal: '1:10', blad }, PROJECT);
  return b.svg();
}

const DELEN: Deel[] = [
  { f: 'delen/Armpaar-A.kcad', nr: 'LFT-02', schaal: [1, 20], naam: 'Armpaar A (buiten)', materiaal: 'S355, koker 116-160 x 45 x 5', maken: 'lasersnijden, zetten, lassen, nafrezen', dichtheid: STAAL, maten: [
    `Scharnierafstand ${m.arm} (onder vast, boven op rollen), armen op x ±${m.A[0]} tot ±${m.A[1]}`,
    'Koker 116 hoog aan de scharnieren, 160 in het midden; uiteinden R58',
    'Buizen Ø80 x 5 aan beide uiteinden, gelast tussen de armen',
    'Boring middenpen Ø31 H8 in het midden, beide armen in één opspanning',
    'Lagerbussen (glijlager) in de ogen, smeernippel',
  ] },
  { f: 'delen/Armpaar-B.kcad', nr: 'LFT-03', schaal: [1, 20], naam: 'Armpaar B (binnen)', materiaal: 'S355, koker 116-160 x 45 x 5', maken: 'lasersnijden, zetten, lassen, nafrezen', dichtheid: STAAL, maten: [
    `Scharnierafstand ${m.arm} (boven vast, onder op rollen), armen op x ±${m.Bx[0]} tot ±${m.Bx[1]}`,
    `Cilinderbuis Ø90 op ${m.cil.s} van het vaste scharnier, 2 x 2 ogen 12 mm`,
    `Pen stangoog Ø40 op ${m.cil.n} boven de as van de arm`,
    'Astappen Ø40 voor de rollen onderaan',
  ] },
  { f: 'delen/Bovenframe.kcad', nr: 'LFT-04', schaal: [1, 20], naam: 'Bovenframe', materiaal: 'S355, koker 110 x 50 x 5 / 110 x 60 x 5', maken: 'zagen, lassen, poedercoat', dichtheid: STAAL, maten: [
    `Buitenmaat ${m.B} x ${m.L} x 110`,
    'Rolbanen voor de rollen van paar A (40 x 10), z 450 tot 1136',
    'Scharnierblokken paar B op z -1000',
    'Steunvlakken (6 x 100 x 100 x 10) na het lassen vlak frezen, boring M16',
  ] },
  { f: 'delen/Onderframe.kcad', nr: 'LFT-05', schaal: [1, 20], naam: 'Onderframe', materiaal: 'S355, UNP 100', maken: 'zagen, lassen, poedercoat', dichtheid: STAAL, maten: [
    `Buitenmaat ${m.B} x ${m.L}, UNP 100 open naar buiten`,
    'Rolbanen voor de rollen van paar B (40 x 20), z 400 tot 1137',
    'Scharnierbokken paar A op z -1000, pen Ø44',
    '4 hijsogen (plaat 16, gat Ø30) op z ±800',
  ] },
  { f: 'delen/Valbeveiliging-kap.kcad', nr: 'LFT-06', naam: 'Valbeveiliging: kap', materiaal: 'S355, plaat 6 en 8', maken: 'lasersnijden, zetten, lassen, poedercoat geel', dichtheid: STAAL, maten: [
    'Zijden 8 mm met zaagtand: steek 30, diepte 14 (15 tanden)',
    'Dak 162 x 6, kopplaat met doorvoer Ø57 en klembus om de stang Ø56',
    'Pal op de koker in hetzelfde vlak, scharnier achteraan',
  ] },
  { f: 'delen/Cilinderbok.kcad', nr: 'LFT-07', naam: 'Cilinderbok', materiaal: 'S355, plaat 8 en 12', maken: 'lasersnijden, lassen', dichtheid: STAAL, maten: [
    `Dwarsplaat 620 x 100 x 8, 2 x 2 lipplaten 12, pen Ø40 op ${m.cil.p0[0]} hoogte`,
    `Hart cilinders op x ±${m.cil.x}`,
  ] },
  { f: 'delen/Opvanglade.kcad', nr: 'LFT-08', schaal: [1, 20], naam: 'Opvanglade', materiaal: 'staalplaat 3 mm, verzinkt', maken: 'knippen, zetten, verzinken', dichtheid: STAAL, maten: [
    '1090 x 2270 x 3 met 3 tussenstrips en opstaande randen',
  ] },
];

describe('tekeningen lastafel', () => {
  it.skipIf(!process.env.LASTAFEL_TEKENINGEN)('overzicht, gatenplan en lasdelen', () => {
    mkdirSync(UIT, { recursive: true });
    const totaal = DELEN.length + 2;
    writeFileSync(`${UIT}/LFT-00-overzicht.svg`, overzicht(`1 / ${totaal}`));
    writeFileSync(`${UIT}/LFT-01-gatenplan.svg`, gatenplan(`2 / ${totaal}`));
    DELEN.forEach((d, i) => writeFileSync(`${UIT}/${d.nr}-${d.f.slice(6, -5).toLowerCase()}.svg`, onderdeelBlad(d, `${i + 3} / ${totaal}`, DIR, PROJECT)));
    expect(TAFELGATEN.g.length + TAFELGATEN.d.length).toBe(541);
  }, 1800000);
});
