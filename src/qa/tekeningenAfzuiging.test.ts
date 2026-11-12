/**
 * Werktekeningen van de afzuiging (voorbeelden/afzuiging/tekeningen): AFZUIGING_TEKENINGEN=1 npx vitest run
 * src/qa/tekeningenAfzuiging.test.ts. Elk blad is A3 liggend in Europese projectie (ISO E): aanzichten met verborgen
 * lijnen weggewerkt uit de tekenmodule van Phlippo CAD (HLR), een doorsnede met arcering waar het binnenwerk telt,
 * hoofdmaten, een tabel met de belangrijke maten en het titelblok. Daarnaast de samenstellingstekening met ballonnen
 * en stuklijst, en de bewerkingen in het tafelblad.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { Component, Document, DrawingViewType } from '../core/document/types';
import { projectedView, sectionGeometry, modelBodies, type ViewGeo } from '../core/drawing/sheet';
import { viewFrame } from '../core/drawing/hlr';
import { visibleAnchors, layoutBalloons } from '../core/drawing/balloons';
import { Blad, kader as kaderBasis, onderdeelBlad as onderdeelBladBasis, teken, getal, open, H, type Deel, type P } from './werktekening';
// @ts-expect-error: het generatorscript is plain JavaScript
import { M } from '../../voorbeelden/afzuiging/maak-afzuiging.mjs';
import { REVISIE } from '../../voorbeelden/afzuiging/revisie.mjs';

const DIR = 'voorbeelden/afzuiging';
const UIT = `${DIR}/tekeningen`;
const DATUM = REVISIE.datum;
const PROJECT = { naam: 'Afzuiging Lush Beauty', datum: DATUM, revisie: REVISIE.versie };
const kader = (b: Blad, t: Parameters<typeof kaderBasis>[1]) => kaderBasis(b, t, PROJECT);
const onderdeelBlad = (d: Deel, blad: string) => onderdeelBladBasis(d, blad, DIR, PROJECT);

const PET = 1.27, RVS = 7.9;
const m = M as Record<string, any>;
const DELEN: Deel[] = [
  { f: 'Romp.kcad', nr: 'AFZ-01', naam: 'Romp', materiaal: 'PETG (wit)', maken: '3D-print rechtop, 5 wanden, 40 % gyroid, zonder support', snede: true, dichtheid: PET, maten: [
    `Buitenmaat ${m.romp.b} x ${m.romp.d} x ${-m.romp.onder}, wand ${m.romp.wand}, hoeken R${m.romp.r}`,
    `4 torens met klauwkanaal, as op x ±${getal(m.klauw.x)} en z ±${m.klauw.z}`,
    `Gaten M5: Ø5,8 x 67 diep vanaf de bovenkant (in de torens)`,
    `Klauwkanaal ${2 * (m.klauw.naaf + 0.5)} x ${2 * (m.klauw.naaf + 0.5)} van ${m.toren.top} tot ${m.toren.bodem} (Y), zwaaivenster tot ${m.toren.zwaai} (klauw met rubber)`,
    `Richel instroomplaat: 3 treden van 1 mm onder Y ${m.inlaat.top - m.inlaat.dikte}`,
    `4 bussen midden in de wanden onderaan, gat Ø2,5 x 12 (M3, de oren van de kuip)`,
    `Achterwand onder de instroomplaat: Ø10,2 (M8-bus binder 718, M10 x 0,75) en Ø${2 * m.achter.slang.r} (slangetje)`,
    'Richel ook langs de torens: de naad met de instroomplaat rondom lijmen (luchtdicht)',
  ] },
  { f: 'Bovenframe.kcad', nr: 'AFZ-02', naam: 'Bovenframe', materiaal: 'PETG (wit)', maken: '3D-print plat, 5 wanden, 6 lagen boven/onder', dichtheid: PET, maten: [
    `Buitenmaat ${m.frame.b} x ${m.frame.d} x ${m.frame.dikte}, hoeken R${m.frame.r}`,
    `Opening ${2 * m.frame.opening.x} x ${2 * m.frame.opening.z}, hoeken R${m.frame.opening.r}`,
    `4 lippen boven de torens, met verzinking 90° Ø10,4 x 2 en gat Ø6 (M5)`,
    `4 magneetgaten Ø${getal(m.magneten.d + 0.2)} x ${getal(m.magneten.h + 0.1)} op x ±${getal(m.magneten.plaats[0][0], 2)}, z ±${m.magneten.plaats[0][1]}`,
    'Op de romp gelijmd (tweecomponentenlijm, rondom luchtdicht)',
  ] },
  { f: 'Rooster-LB.kcad', nr: 'AFZ-03', naam: 'RVS-plaat met LB-rooster', materiaal: 'RVS 430 (magnetisch), 1,5 mm, geborsteld', maken: 'Lasersnijden volgens laser/rooster.dxf', dichtheid: RVS, maten: [
    `Plaat ${m.frame.b} x ${m.frame.d} x 1,5, hoeken R${m.frame.r}`,
    'Rand 11 mm zonder gaten; LB-monogram 75 mm hoog',
    'Sleuven 5 mm, stegen 2 mm, nergens smaller dan 1,6 mm (versie 7.2)',
    '4 gaten Ø3,0 voor RVS-persbouten PEM FH4-M3-6 (laat de lasersnijder ze inpersen)',
    'Eén stuk staal, geen losse eilanden (zie het laserrapport)',
    'Snijden volgens laser/rooster.dxf (laag SNIJDEN)',
  ] },
  { f: 'Instroomplaat.kcad', nr: 'AFZ-04', naam: 'Instroomplaat', materiaal: 'PETG (wit)', maken: '3D-print plat, de trechter en de randen naar boven', snede: true, dichtheid: PET, maten: [
    `Plaat ${m.inlaat.dikte} dik, past tussen de torens in de romp (0,3 speling)`,
    `Steunrand ${m.filter.foam.b} breed en ${m.filter.rand} hoog, buitenmaat ${2 * (m.filter.x + m.filter.speling)} x ${2 * (m.filter.z + m.filter.speling)}: foamband ${m.filter.foam.b} x ${m.filter.foam.h} erop`,
    `Geleiderand ${m.filter.gids.dik} dik rondom, tot ${getal(m.filter.steun + m.filter.foam.h + m.filter.gids.h)} (Y): het filter ${2 * m.filter.z} x ${2 * m.filter.x} x ${m.filter.h} met ${m.filter.speling} mm speling`,
    `Vingerrooster in het oog: ${2 * m.inlaat.vinger.n} ribben ${getal(m.inlaat.vinger.rib)} mm op steek ${m.inlaat.vinger.steek}, een dwarsrib en ringen r ${m.inlaat.vinger.ringen.join(' en ')}, ${m.inlaat.vinger.h} hoog vanaf de onderkant (spleten ${getal(m.inlaat.vinger.steek - m.inlaat.vinger.rib)})`,
    `Afdichtlip (siliconenrubber ${getal(m.filter.lip.dik)}) op de geleiderand, ${getal(m.filter.lip.over)} over de rand van het filter: snijmal schema/Snijmal-afdichtlip`,
    `Trechter: Ø${2 * m.inlaat.kraag} - Ø${2 * (m.inlaat.kraag + m.inlaat.gat) / 2} - Ø${2 * m.inlaat.gat} (treden van 1 mm)`,
    `Gat Ø3,1 voor het messingbuisje op x ${m.achter.meet[0]}, z ${m.achter.meet[1]}`,
    'Op de getrapte richel van de romp gelijmd',
  ] },
  { f: 'Ventilatorkuip.kcad', nr: 'AFZ-05', naam: 'Ventilatorkuip', materiaal: 'PETG (wit)', maken: '3D-print rechtop, de bodem op het bed, zonder support', snede: true, dichtheid: PET, maten: [
    `Binnen Ø${2 * m.kuip.binnen}, wand ${m.kuip.wand}, buiten Ø${2 * (m.kuip.binnen + m.kuip.wand)}; rand op Y ${getal(m.kuip.rand)} (celband 6 x 2)`,
    `Wand recht tot Y ${m.kuip.recht}, dan bol: boog R${m.kuip.boog} tot 45°, dan 45° tot de bodem (Y ${m.kuip.bodem}, ${m.kuip.vloer} dik)`,
    `Lamellen onder 45° naar onder: 12 sectoren (±${m.kuip.lamel.hoeken.join(', ±')}° rond de X-as) van ${m.kuip.lamel.breed} breed, ${m.kuip.lamel.rijen} rijen, banden ${m.kuip.lamel.sleuf} mm`,
    `Bodem: ringsleuven ${m.kuip.ringen.map(([a, b]) => `r ${a}-${b}`).join(', ')} met ${m.kuip.spaken} spaken van ${m.kuip.spaak}`,
    `4 x M4 verzonken 90° (Ø8,2) op Ø${2 * m.fan.gat} onder 45° (rubberbuffers); gat Ø5 voor de aders op (0, ${m.kuip.draad[1]})`,
    `4 oren (console 45°) op de assen, gat Ø3,4 en kom Ø${m.kuip.oor.kom} van onderen (M3 x 12 DIN 912)`,
  ] },
  { f: 'Voedingsbox.kcad', nr: 'AFZ-06', naam: 'Voedingsbox', materiaal: 'PETG (wit)', maken: '3D-print rechtop, de bodem op het bed', snede: true, dichtheid: PET, maten: [
    `Bak ${m.box.b} x ${m.box.d} x ${m.box.boven - m.box.onder}, wand ${m.box.wand}, hoeken R${m.box.hoek}, onderaan ${m.box.schuin} x 45°; rand ${m.box.b + 2 * m.box.flens.x} x ${m.box.d + 2 * m.box.flens.z} x ${m.box.flensDik} met een schuine kant van 45°`,
    `De bovenste ${m.box.boven} mm zit in de uitsparing van ${m.box.frees.b} x ${m.box.frees.d} x ${m.box.frees.diep}, los deksel bovenin (AFZ-12)`,
    '4 gaten Ø4,5 in de rand, van onderen zitting Ø9 en verzinking 90° (4 x 16 in de onderhuid)',
    '4 paaltjes Ø10,4 in de hoeken met een gat Ø2,5 x 10 (M3 x 8, deksel)',
    'Ventilatie: sleuven 2,5 breed in de bodem en 2,5 x 12 achteraan (18 tot 30 onder het blad)',
    'Schuine kant uitgespaard voor C13, M8 en schakelaar (rand als brug)',
    'Aan/uit-schakelaar C&K D502 verzonken in de voorwand (kom 25 x 19 x 6, inbouwgat 19,41 x 12,90)',
    `2 paaltjes ${m.box.klem.b} x ${m.box.klem.d} tot de bovenkant van de adapter, gat Ø2,5 (M3, adapterklemmen)`,
    'Ring Ø5,6 tegen de voorwand voor het slangetje naar de drukmeter',
    'Opening C13 32 x 24 (links), M8 Ø10,2 (M10 x 0,75) en buisje Ø3,1 (voor)',
    'USB-C 9,8 x 4 (knop) en 9,4 x 3,6 (ESP32-C3) (rechts)',
  ] },
  { f: 'Knophouder.kcad', nr: 'AFZ-07', naam: 'Knophouder', materiaal: 'PETG (zwart)', maken: '3D-print ondersteboven, de plaat op het bed', snede: true, dichtheid: PET, maten: [
    `Plaat Ø${m.dial.d} x ${m.dial.plaat}, buis Ø${2 * m.dial.buis} tot ${m.dial.onder} (in een gat Ø${m.dial.gat})`,
    `Kom voor de naaf: Ø${2 * m.dial.naaf[0][0]} x ${m.dial.naaf[0][1]} en Ø${2 * m.dial.naaf[1][0]} x ${m.dial.naaf[1][1]}`,
    '2 x M2,5 verzonken van onderen (Ø2,8) en 2 pennen Ø1,7 in de vloer, sleuf voor de FPC',
    `2 klauwkanalen op x ±${getal(m.dial.klauw.x)}, M4 verzonken 90° (Ø8,4) in de plaat`,
    'Groeven voor de adapterprint, 2 bussen (M2,5) voor het deksel diagonaal',
    `Opening USB-C ${m.dial.usb.gat.b} x ${getal(m.dial.usb.gat.y[1] - m.dial.usb.gat.y[0])} in de achterwand (kant van de sleuf), onderkant op Y ${getal(m.dial.usb.gat.y[0])}`,
    `2 palen Ø5 met gat Ø1,6 x 6 (M2) voor het USB-C-printje, x ±${getal(m.dial.usb.paal.x)}`,
  ] },
  { f: 'Knopdeksel.kcad', nr: 'AFZ-08', naam: 'Deksel van de knophouder', materiaal: 'PETG (zwart)', maken: '3D-print plat', dichtheid: PET, maten: [
    `Schijf Ø${2 * m.dial.buis} x ${m.dial.deksel}`,
    `2 x M2,5 verzonken 90° (Ø5,2) op (${m.dial.bus[0].join(', ')}) en (${m.dial.bus[1].join(', ')})`,
    'Dicht: de USB-C zit in de wand van de houder',
    `2 gaatjes Ø4 op x ±${getal(m.dial.klauw.x)} voor de punten van de M4 x 65`,
  ] },
  { f: 'Klauw.kcad', nr: 'AFZ-09', naam: 'Klauw (module)', materiaal: 'PETG (wit), 100 % vulling', maken: '3D-print plat, de moerkamer op het bed', snede: true, dichtheid: PET, maten: [
    `Naaf R${m.klauw.naaf}, arm ${m.klauw.arm} x ${m.klauw.breed}, dikte ${m.klauw.dik}`,
    `Gat Ø5,5; van onderen zeskantkamer SW ${getal(m.klauw.moer.s + m.klauw.moer.speling)} x ${getal(m.klauw.moer.m + 0.2)} voor een M5-moer (DIN 934)`,
    'De moer van onderen inpersen: ze draait niet mee, de klauw draait met de schroef',
    `Rubberkussen neopreen Shore A 40, ${m.klauw.rubber.x[1] - m.klauw.rubber.x[0]} x ${m.klauw.breed} x ${m.klauw.rubber.h}, op de arm van ${m.klauw.rubber.x[0]} tot ${m.klauw.rubber.x[1]} mm (secondelijm)`,
    'Aantal: 4',
  ] },
  { f: 'Knopklauw.kcad', nr: 'AFZ-10', naam: 'Klauw (knophouder)', materiaal: 'PETG (zwart), 100 % vulling', maken: '3D-print plat, de moerkamer op het bed', snede: true, dichtheid: PET, maten: [
    `Naaf R${m.dial.klauw.naaf}, arm ${m.dial.klauw.arm} x ${m.dial.klauw.breed}, dikte ${m.dial.klauw.dik}`,
    `Gat Ø4,5; van onderen zeskantkamer SW ${getal(m.dial.klauw.moer.s + m.dial.klauw.moer.speling)} x ${getal(m.dial.klauw.moer.m + 0.2)} voor een M4-moer (DIN 934)`,
    'Aantal: 2',
  ] },
  { f: 'Deksel-voedingsbox.kcad', nr: 'AFZ-12', naam: 'Deksel van de voedingsbox', materiaal: 'PETG (wit)', maken: '3D-print plat', dichtheid: PET, maten: [
    `${getal(m.box.b - 2 * m.box.wand - 0.4)} x ${getal(m.box.d - 2 * m.box.wand - 0.4)} x ${m.box.deksel}, hoeken R1,8`,
    'Valt bovenin de bak op de 4 paaltjes; 4 x M3 verzonken 90° (Ø6,4)',
    'Zit mee in de uitsparing van het blad (1 mm onder het plafond)',
  ] },
  { f: 'Adapterklem.kcad', nr: 'AFZ-11', naam: 'Klem van de netadapter', materiaal: 'PETG (wit)', maken: '3D-print plat', dichtheid: PET, maten: [
    `${m.box.klem.b} x ${m.box.klem.d + 8.5} x 3, lip van 8 mm over de adapter`,
    'M3 verzonken 90° (Ø6,4) in het paaltje van de box (M3 x 10)',
    'Aantal: 2',
  ] },
];

/** bewerkingen in het tafelblad: bovenaanzicht (uitsparing, knopgat) en onderaanzicht (box, sleuven) met maten vanaf de randen */
function tafelbladBlad(blad: string): string {
  const model = open('voorbeelden/bureau/LAGKAPTEN-tafelblad.kcad');
  const b = new Blad();
  const u = m.uitsparing, d = m.dial, B = m.box, F = B.frees, K = m.sleuven;
  const boven = projectedView(model, 'top'), onder = projectedView(model, 'bottom');
  // in het bovenaanzicht is v = -z; in het onderaanzicht zoeken we de richting op aan het knopgat (z > 0)
  const knopO = onder.circles.find((k) => Math.abs(k.r - d.gat / 2) < 0.5)!;
  const kz = Math.sign(knopO.c[1]) || 1; // v = kz * z in het onderaanzicht
  const kx = Math.sign(knopO.c[0]) || 1; // u = kx * x
  // bovenaanzicht 1:10 linksboven
  const s = 0.1;
  const T = teken(b, boven, s, [106, 222], { mid: [0, 0] });
  b.tekst([106, T.y1 + 15], 'Bovenaanzicht (1:10, voorkant onderaan)', 3.2, 'middle', { vet: true });
  b.maatH(T.x0, T.x1, T.y1, T.y1 + 8, '1400');
  b.maatV(T.y0, T.y1, T.x0, T.x0 - 8, '600');
  const p = (x: number, z: number) => T.to([x, -z]);
  const ul = p(-u.b / 2, u.d / 2), k = p(d.x, d.z);
  b.maatH(T.x0, ul[0], T.y0, T.y0 - 7, getal(700 - u.b / 2));
  b.maatH(T.x0, k[0], T.y0, T.y0 - 14, getal(700 + d.x));
  b.maatV(T.y0, ul[1], T.x1, T.x1 + 7, getal(300 - u.d / 2));
  b.maatV(T.y0, k[1], T.x1, T.x1 + 15, getal(300 - d.z));
  // onderaanzicht 1:10 linksonder (blad omgedraaid over de lange rand: de voorkant ligt nu boven)
  const O = teken(b, onder, s, [106, 108], { mid: [0, 0] });
  b.tekst([106, O.y1 + 6], 'Onderaanzicht (1:10, blad omgedraaid, voorkant boven)', 3.2, 'middle', { vet: true });
  const q = (x: number, z: number) => O.to([kx * x, kz * z]);
  const bx = q(B.x - F.b / 2, B.z), bv = q(B.x, B.z + kz * 0 + (kz > 0 ? -F.d / 2 : F.d / 2));
  b.maatH(O.x0, Math.min(bx[0], q(B.x + F.b / 2, B.z)[0]), O.y0, O.y0 - 7, getal(700 - F.b / 2));
  const voorO = kz > 0 ? O.y1 : O.y0; // de voorrand in het onderaanzicht
  b.maatV(voorO, q(0, B.z)[1], O.x1, O.x1 + 7, getal(300 - B.z));
  void bv;
  // detail van de onderkant 1:5: uitsparing, box, sleuven en knopgat
  const sd = 0.2;
  const zc = (B.z + d.z) / 2, xc = (d.x - 120) / 2 + 10;
  const vak = { x0: 188, y0: 150, x1: 285, y1: 262 };
  const cD: P = [(vak.x0 + vak.x1) / 2, (vak.y0 + vak.y1) / 2];
  const D = teken(b, onder, sd, cD, { mid: [kx * xc, kz * zc], knip: vak });
  b.rect(vak.x0, vak.y0, vak.x1 - vak.x0, vak.y1 - vak.y0, 0.25);
  b.tekst([cD[0], vak.y1 + 3], 'Detail onderkant (1:5)', 3.2, 'middle', { vet: true });
  const r2 = (x: number, z: number) => D.to([kx * x, kz * z]);
  // maten van de box en de sleuven
  const b0 = r2(B.x - F.b / 2, B.z), b1 = r2(B.x + F.b / 2, B.z);
  const xl = Math.min(b0[0], b1[0]), xr = Math.max(b0[0], b1[0]);
  const yb = (z: number) => r2(0, z)[1];
  const by0 = Math.min(yb(B.z - F.d / 2), yb(B.z + F.d / 2)), by1 = Math.max(yb(B.z - F.d / 2), yb(B.z + F.d / 2));
  if (xl > vak.x0 && xr < vak.x1) b.maatH(xl, xr, kz > 0 ? by0 : by1, kz > 0 ? by0 - 6 : by1 + 6, `${F.b}`);
  b.maatV(by0, by1, xl, xl - 7, `${F.d}`);
  const uy = kz > 0 ? yb(-u.d / 2) : yb(-u.d / 2);
  const bnear = kz > 0 ? by1 : by0;
  b.maatV(Math.min(uy, bnear), Math.max(uy, bnear), xr - 30, xr - 30, getal(-B.z - F.d / 2 - u.d / 2));
  const ms = r2((K.module.x[0] + K.module.x[1]) / 2, (B.z + -u.d / 2) / 2);
  b.tekst([ms[0] - 4.5, ms[1] + 2.5], `sleuf ${K.module.x[1] - K.module.x[0]} x ${K.module.diep}`, 2.4, 'end');
  const ks = r2(d.x - 40, (B.z + d.z) / 2 + 60);
  b.tekst([ks[0] + 2, ks[1]], `sleuf ${K.knop.breed} x ${K.knop.diep}`, 2.4);
  const bc = r2(B.x, B.z);
  b.tekst([bc[0], bc[1] - 1], `${F.diep} diep, R${F.r}`, 2.4, 'middle');
  // bewerkingen
  const regels = [
    'Bovenkant (doorgaand):',
    `- uitsparing ${u.b} x ${u.d}, hoeken R${u.r} (MDF-mal AFZ-21, kopieerring Ø17, frees Ø12), midden`,
    `- gat Ø${d.gat} (gatzaag), ${700 + d.x} van links, ${300 - d.z} van voor`,
    'Onderkant (niet doorgaand):',
    `- uitsparing voedingsbox ${F.b} x ${F.d} x ${F.diep} diep, R${F.r},`,
    `  midden ${700 + B.x} van links, ${300 - B.z} van voor`,
    `- 4 voorboorgaten Ø${getal(B.plug.gat)} x ${B.plug.diep} (spaanplaatschroeven 4 x 16), ${2 * B.plug.x} x ${2 * B.plug.z} hart op hart rond de box`,
    `- sleuf naar de afzuiging ${K.module.x[1] - K.module.x[0]} breed x ${K.module.diep} diep,`,
    `  ${700 + K.module.x[0]} tot ${700 + K.module.x[1]} van links (box tot uitsparing)`,
    `- sleuf naar de knop ${K.knop.breed} x ${K.knop.diep}, van de box naar het knopgat`,
    'Maten vanaf de linkerrand en de voorrand (waar je zit).',
    'LAGKAPTEN is vanbinnen een honingraat: daarna latten',
    'tussen de huiden lijmen (AFZ-21): 28 x 44 rond de module,',
    '10 x 30 achter de box; dan pas de sleuven frezen.',
  ];
  let ty = 272;
  b.tekst([292, ty], 'Bewerkingen', 3.4, 'start', { vet: true });
  for (const r of regels) { ty -= 5.2; b.tekst([292, ty], r, 2.45); }
  kader(b, { nr: 'AFZ-20', naam: 'Tafelblad LAGKAPTEN: bewerkingen', materiaal: 'LAGKAPTEN 1400 x 600 x 34 (IKEA)', maken: 'Bovenfrees, kopieerring Ø17, frees Ø12 en Ø5, gatzaag Ø44', massa: '—', schaal: '1:10 en 1:5', blad });
  return b.svg();
}

/** afgeronde rechthoek (x0, y0 linksonder, y omhoog) */
function rrB(b: Blad, x0: number, y0: number, w: number, h: number, r: number, sw = 0.5, extra = '') {
  const Y = (v: number) => H - v, x1 = x0 + w, y1 = y0 + h;
  b.el.push(`<path d="M${x0 + r},${Y(y0)} H${x1 - r} A${r},${r} 0 0 0 ${x1},${Y(y0 + r)} V${Y(y1 - r)} A${r},${r} 0 0 0 ${x1 - r},${Y(y1)} H${x0 + r} A${r},${r} 0 0 0 ${x0},${Y(y1 - r)} V${Y(y0 + r)} A${r},${r} 0 0 0 ${x0 + r},${Y(y0)} Z" fill="none" stroke="#111" stroke-width="${sw}" ${extra}/>`);
}

/** versie 7.2 (advies Fable 5.2): de freesmallen uit MDF met kopieerring en de latten tussen de huiden van het blad */
function malBlad(blad: string): string {
  const b = new Blad();
  const { mdf: D, latten: L, uitsparing: u, box: B, blad: dik } = m;
  const off = (D.ring - D.frees) / 2, s = 0.2; // 1:5
  const mallen = [
    { naam: 'Freesmal module', plaat: D.plaat.afzuiging, open: [u.b + 2 * off, u.d + 2 * off], r: u.r + off, gaten: [] as P[], c: [85, 205] as P, uit: [u.b, u.d] },
    { naam: 'Freesmal voedingsbox', plaat: D.plaat.voedingsbox, open: [B.frees.b + 2 * off, B.frees.d + 2 * off], r: B.frees.r + off,
      gaten: [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, c]) => [a * B.plug.x, c * B.plug.z] as P), c: [85, 80] as P, uit: [B.frees.b, B.frees.d] },
  ];
  for (const M2 of mallen) {
    const [pw, ph] = M2.plaat, [ow, oh] = M2.open, [cx, cy] = M2.c;
    rrB(b, cx - pw * s / 2, cy - ph * s / 2, pw * s, ph * s, 10 * s, 0.5);
    rrB(b, cx - ow * s / 2, cy - oh * s / 2, ow * s, oh * s, M2.r * s, 0.5);
    rrB(b, cx - M2.uit[0] * s / 2, cy - M2.uit[1] * s / 2, M2.uit[0] * s, M2.uit[1] * s, (M2.r - off) * s, 0.2, 'stroke-dasharray="1.5 1"');
    b.lijn([cx - pw * s / 2 - 3, cy], [cx + pw * s / 2 + 3, cy], 0.18, 'stroke-dasharray="6 1.2 1.2 1.2"');
    b.lijn([cx, cy - ph * s / 2 - 3], [cx, cy + ph * s / 2 + 3], 0.18, 'stroke-dasharray="6 1.2 1.2 1.2"');
    for (const [gx2, gz2] of M2.gaten) b.cirkel([cx + gx2 * s, cy + gz2 * s], 1.5 * s * 2, 0.3);
    b.maatH(cx - pw * s / 2, cx + pw * s / 2, cy - ph * s / 2, cy - ph * s / 2 - 7, `${pw}`);
    b.maatV(cy - ph * s / 2, cy + ph * s / 2, cx - pw * s / 2, cx - pw * s / 2 - 7, `${ph}`);
    b.maatH(cx - ow * s / 2, cx + ow * s / 2, cy + oh * s / 2, cy + ph * s / 2 + 6, `${getal(ow)}`);
    b.tekst([cx, cy - 1], `opening ${getal(ow)} x ${getal(oh)}, R${getal(M2.r)}`, 2.4, 'middle');
    b.tekst([cx, cy + ph * s / 2 + 12], `${M2.naam} (MDF ${D.dikte}, 1:5)`, 3.2, 'middle', { vet: true });
    if (M2.gaten.length) b.tekst([cx, cy - 5], `4 gaatjes Ø3 (voorboren ${getal(B.plug.gat)} x ${B.plug.diep})`, 2.2, 'middle');
  }
  // doorsnede door de rand van de uitsparing met de lat (2:1)
  const k = 2, x0 = 175, y0 = 150, X = (x: number) => x0 + (x - 96) * k, Y = (y: number) => y0 + (y + dik) * k;
  const rh = (xa: number, ya: number, xb: number, yb: number, sw = 0.5, vul = 'none') => b.rect(Math.min(X(xa), X(xb)), Math.min(Y(ya), Y(yb)), Math.abs(X(xb) - X(xa)), Math.abs(Y(yb) - Y(ya)), sw, vul);
  rh(106, 0, 175, -L.huid); rh(106, -dik, 175, -dik + L.huid); // huiden
  rh(106, -dik + L.huid, 106 + L.module.b, -L.huid, 0.6, '#e9d8b4'); // lat
  rh(101, 0, 105, -30); rh(100.5, 0, 111, 2.5); rh(100, 2.5, 111, 4, 0.5, '#d6d9dd'); // romp, frame, plaat
  rh(96.5 + 9.5, -dik, 96.5 + 17, -dik - 4, 0.4, '#555'); rh(96.5, -dik - 4, 96.5 + 18, -dik - 10); // rubber en klauw
  b.tekst([X(128), Y(-17)], `lat ${L.module.h} x ${L.module.b} (vuren)`, 2.6, 'middle');
  b.tekst([X(176), Y(-1.5) - 0.8], `bovenhuid ${L.huid} (aanname)`, 2.2, 'start');
  b.tekst([X(176), Y(-dik + 1.5) - 0.8], 'onderhuid', 2.2, 'start');
  b.tekst([X(99.5), Y(3) - 0.8], 'RVS-plaat en frame (5 mm rand)', 2.2, 'end');
  b.tekst([X(107), Y(-dik - 12) - 2], 'klauw met rubber', 2.2, 'start');
  b.maatV(Y(-dik + L.huid), Y(-L.huid), X(106 + L.module.b), X(106 + L.module.b) + 8, `${L.module.h}`);
  b.maatH(X(106), X(106 + L.module.b), Y(0), Y(0) + 14, `${L.module.b}`);
  b.tekst([X(135), Y(0) + 24], 'Doorsnede door de rand van de uitsparing (2:1)', 3.2, 'middle', { vet: true });
  // onderaanzicht van de latten (1:5)
  const s2 = 0.2, cx = 345, cy = 118, P2 = (x: number, z: number): P => [cx + x * s2, cy + z * s2];
  const box = (xa: number, za: number, xb: number, zb: number, vul = '#e9d8b4') => { const a = P2(Math.min(xa, xb), Math.min(za, zb)); b.rect(a[0], a[1], Math.abs(xb - xa) * s2, Math.abs(zb - za) * s2, 0.4, vul); };
  const uw = u.b / 2, ud = u.d / 2, bz = B.z, bd = B.frees.d / 2, Lm = L.module.b;
  box(-uw, -ud, uw, ud, 'none');
  box(B.x - B.frees.b / 2, bz - bd, B.x + B.frees.b / 2, bz + bd, 'none');
  box(uw, -ud, uw + Lm, ud); box(-uw - Lm, -ud, -uw, ud); box(-uw, ud, uw, ud + Lm); box(-uw, bz + bd, uw, -ud);
  box(-L.box.l / 2, bz - bd - L.box.b, L.box.l / 2, bz - bd);
  b.tekst(P2(0, 0), 'module 212 x 212', 2.2, 'middle');
  b.tekst(P2(0, bz), 'box 212 x 102', 2.2, 'middle');
  b.tekst([cx, cy + (bz - bd - L.box.b) * s2 - 7], 'Latten, van onderen gezien (1:5, voorkant boven)', 3.2, 'middle', { vet: true });
  b.tekst(P2(uw + Lm + 4, 0), `4 x ${L.module.h} x ${Lm} x ${L.module.l}`, 2.2);
  b.tekst(P2(uw + 6, (bz + bd - ud) / 2 - 3), `achter: ${L.module.h} x ${getal(-(bz + bd) - ud)} (tot de box)`, 2.2);
  b.tekst(P2(L.box.l / 2 + 4, bz - bd - L.box.b / 2 - 3), `box: ${L.box.h} x ${L.box.b} x ${L.box.l}`, 2.2);
  // werkwijze
  const regels = [
    `Frezen: bovenfrees met kopieerring Ø${D.ring} (Bosch 2 609 200 139 of gelijk) en frees Ø${D.frees};`,
    `afstand = (${D.ring} - ${D.frees}) / 2 = ${getal(off)} mm: de opening in de mal is rondom ${getal(off)} mm groter, hoeken R${u.r} + ${getal(off)}.`,
    'De mallen laat je samen met het rooster lasersnijden uit MDF 12 mm: laser/freesmal-mdf.dxf (SNIJDEN, GRAVEREN = hartlijnen).',
    'Mal met dubbelzijdige tape en 2 lijmklemmen op het blad, hartlijnen op de potloodlijnen (700 van links, 300 van voor).',
    'In 3 tot 4 gangen; de honingraat is papier. Daarna de honingraat 45 mm diep rond de uitsparing wegsnijden,',
    'de latten met PU-lijm of houtlijm D3 op beide huiden schuiven, binnenkant gelijk met de uitsparing, klemmen (24 h).',
    `Box: mal van onderen, hartlijn ${-B.z} mm achter het midden; lat ${L.box.h} x ${L.box.b} achter de box tegen de onderhuid lijmen.`,
    'Pas dan de sleuven frezen (ze gaan 4 mm in de achterste lat) en de voorboorgaten boren (door de gaatjes van de mal).',
    'Kern 28 mm volgt uit huiden van 3 mm (aanname): meet in de eerste uitsparing en schaaf de lat op de echte maat.',
  ];
  let ty = 116; // tussen de doorsnede en het titelblok, links van de latten
  b.tekst([165, ty + 6], 'Werkwijze', 3.4, 'start', { vet: true });
  for (const r of regels) { b.tekst([165, ty], r, 2.1); ty -= 4.2; }
  kader(b, { nr: 'AFZ-21', naam: 'Freesmallen MDF en latten in het tafelblad', materiaal: 'MDF 12 mm; vurenhout 28 x 44; multiplex 10 x 30', maken: 'Lasersnijden (mallen); zagen en lijmen (latten)', massa: '—', schaal: '1:5 en 2:1', blad });
  return b.svg();
}

/** samenstelling: opengewerkte isometrie met ballonnen en de stuklijst */
function samenstellingBlad(blad: string): { svg: string; stuklijst: string[][] } {
  const asm = open(`${DIR}/Afzuiging.kcad`) as Document & { components: Component[] };
  // opengewerkt: rooster en filter omhoog, bodemplaat met ventilator omlaag, de box en de knop uit elkaar
  const op = (c: Component): [number, number, number] => {
    const [x, y, z] = c.position;
    const id = c.id;
    if (id === 'a2') return [x, y + 190, z];
    if (id === 'a3') return [x, y + 120, z];
    if (id === 'a3f') return [x, y + 70, z];
    if (id === 'a3l') return [x, y + 95, z];
    if (['a4', 'a4d', 'a5'].includes(id) || /^as3\d|^as4\d|^as6\d|^a4b\d/.test(id)) return [x, y - 120, z];
    if (/^a2p\d/.test(id)) return [x, y + 190, z];
    if (id === 'a9' || id === 'a18') return [x, y + 45, z];
    if (/^a2\d|^as25|^as2\d$|^asa\d$|^asbd?\d$/.test(id)) return [x, y - 60, z - 40];
    if (/^a(7|8|12|14|15|dkr?\d|dn\d|sd\d|sk\d|sdk\d|su\d)$/.test(id)) return [x, y + 40, z - 250];
    if (/^as5\d/.test(id)) return [x, y + 60, z];
    return [x, y, z];
  };
  const comps = asm.components.map((c) => ({ ...c, position: op(c) }));
  const doc = { ...asm, components: comps } as Document;
  const g = projectedView(doc, 'isometric');
  const b = new Blad();
  const s = Math.min(235 / (g.max[0] - g.min[0]), 200 / (g.max[1] - g.min[1]));
  const c: P = [148, 162];
  const T = teken(b, g, s, c, { hartlijnen: false });
  // stuklijst: één regel per onderdeel (naam zonder <n>), aantal
  const naamVan = (c2: Component) => c2.name.replace(/<\d+>$/, '');
  const groepen = new Map<string, Component[]>();
  for (const c2 of comps) { const n = naamVan(c2); groepen.set(n, [...(groepen.get(n) ?? []), c2]); }
  const tekeningVan: Record<string, string> = Object.fromEntries(DELEN.map((dd) => [open(`${DIR}/${dd.f}`).name, dd.nr]));
  const rijen = [...groepen.entries()].map(([naam, cs], i) => {
    const doc2 = cs[0].part as Document;
    const mat = (doc2.material?.name ?? '—');
    const nr = tekeningVan[doc2.name] ?? (/^M[\d,]+ x |DIN|zelftappend|cilinderkop/.test(naam) ? 'norm' : 'koop');
    return { pos: i + 1, naam, aantal: cs.length, mat, nr, ids: cs.map((x) => x.id) };
  });
  // ballonnen bij een zichtbaar punt van het eerste exemplaar
  const bodies = modelBodies(doc);
  const fr = viewFrame('isometric');
  const anchors = visibleAnchors(bodies.map((x) => ({ id: x.id, geometry: x.geometry })), fr);
  const ankers = rijen.map((r) => anchors.get(r.ids[0]) ?? anchors.get(r.ids.find((id) => anchors.has(id)) ?? '') ?? ([0, 0] as [number, number])).map((a) => T.to(a));
  const lay = layoutBalloons(ankers, { x: T.x0 - 6, y: T.y0 - 6, w: T.x1 - T.x0 + 12, h: T.y1 - T.y0 + 12 }, 'square', { offset: 8, gap: 7.5 });
  lay.positions.forEach((p, i) => {
    b.lijn(ankers[i], p, 0.18); b.cirkel(ankers[i], 0.5, 0.5);
    b.el.push(`<circle cx="${p[0].toFixed(2)}" cy="${(H - p[1]).toFixed(2)}" r="3.2" fill="#fff" stroke="#111" stroke-width="0.35"/>`);
    b.tekst([p[0], p[1] - 1.1], String(rijen[i].pos), 3, 'middle', { vet: true });
  });
  // stuklijst rechts
  const x0 = 285, kol = [x0, x0 + 9, x0 + 18, x0 + 78, x0 + 112];
  let y = 280;
  b.tekst([x0, y], 'Stuklijst', 3.4, 'start', { vet: true });
  y -= 5;
  const kop = ['Pos', 'Aant.', 'Benaming', 'Materiaal / type', 'Tek.'];
  kop.forEach((t, i) => b.tekst([kol[i], y], t, 2.3, 'start', { vet: true }));
  b.lijn([x0, y - 1.2], [x0 + 125, y - 1.2], 0.25);
  const h2 = Math.min(4.2, (y - 58) / rijen.length);
  for (const r of rijen) {
    y -= h2;
    const kort = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
    [String(r.pos), String(r.aantal), kort(r.naam, 34), kort(r.mat, 20), r.nr].forEach((t, i) => b.tekst([kol[i], y], t, 2.1));
  }
  b.tekst([24, 280], 'Opengewerkte isometrie (schaal vrij)', 3.2, 'start', { vet: true });
  kader(b, { nr: 'AFZ-00', naam: 'Samenstelling afzuiging met voedingsbox en knop', materiaal: 'zie stuklijst', maken: 'Montage volgens het bouwschema', massa: '—', schaal: 'vrij', blad });
  return { svg: b.svg(), stuklijst: rijen.map((r) => [String(r.pos), String(r.aantal), r.naam, r.mat, r.nr]) };
}

/** samenstelling in doorsnede (vlak z = 0, van voren gezien): hoe alles in elkaar zit */
function doorsnedeBlad(blad: string): string {
  const asm = open(`${DIR}/Afzuiging.kcad`) as Document & { components: Component[] };
  const doc = { ...asm, components: asm.components.filter((c) => !/^a(7|8|12|14|15|dkr?\d|dn\d|sd\d|sk\d|sdk\d|su\d)$/.test(c.id) && !/^a2\d|^as25|^as2\d$|^asa\d$|^asbd?\d$/.test(c.id)) } as Document;
  const sec = { parentId: 't', parentType: 'top' as DrawingViewType, axis: 'h' as const, at: 0, flip: true, label: 'B', autoHatch: true };
  const alles = sectionGeometry(doc, sec);
  const koop = /^(a5|a3|a3f|a3l|a4d|a4b\d|a2p\d|akr\d|adkr\d|a10|a18|as\d.*)$/;
  const eigen = sectionGeometry({ ...doc, components: (doc as Document & { components: Component[] }).components.filter((c) => !koop.test(c.id)) } as Document, sec);
  const g: ViewGeo = { ...alles, hatch: eigen.hatch, hatchVar: eigen.hatchVar };
  const b = new Blad();
  const s = 1;
  const T = teken(b, g, s, [175, 165]);
  b.maatH(T.x0, T.x1, T.y1, T.y1 + 10, getal(g.max[0] - g.min[0]));
  b.maatV(T.y0, T.y1, T.x0, T.x0 - 10, getal(g.max[1] - g.min[1]));
  // het blad (34 mm) als dunne lijnen ter oriëntatie
  const yb = T.to([0, 0])[1], yo = T.to([0, -m.blad])[1];
  for (const [x1, x2] of [[T.x0 - 30, T.to([-m.uitsparing.b / 2, 0])[0]], [T.to([m.uitsparing.b / 2, 0])[0], T.x1 + 30]]) {
    b.lijn([x1, yb], [x2, yb], 0.25, 'stroke-dasharray="3 1.5"'); b.lijn([x1, yo], [x2, yo], 0.25, 'stroke-dasharray="3 1.5"');
  }
  b.tekst([T.x0 - 28, yb + 2], 'blad 34 mm', 2.6);
  b.maatV(yo, T.y0, T.x1, T.x1 + 10, getal(-m.blad - m.kuip.bodem));
  b.tekst([T.x1 + 13, (yo + T.y0) / 2 - 18], 'onder het blad', 2.4, 'start', { hoek: 90 });
  b.tekst([150, T.y1 + 18], 'Doorsnede B-B door het midden (van voren gezien)', 3.4, 'middle', { vet: true });
  const regels = [
    'Van boven naar onder:',
    '1  RVS-plaat met LB-rooster op het bovenframe (magneten)',
    '2  bovenframe met de koppen van de M5-schroeven',
    '3  interieurfilter MANN CU 20 013 (195 x 145 x 30) op de foamband, rondom afgedicht met de lip',
    '4  instroomplaat met steunrand, geleiderand met lip, trechter en vingerrooster (7 mm, twee ringen)',
    '5  radiale ventilator San Ace C175 op 4 rubberbuffers Ø15 x 10',
    '6  ronde kuip met lamellen opzij en ringsleuven in de bodem, foamband op de rand',
    'Klauwen met rubber in de vier hoeken klemmen onder het blad.',
  ];
  let ty = 92; // linksonder, onder de doorsnede en links van het titelblok (binnen het kader, ISO 5457)
  regels.push('Koopdelen (ventilator, filter, foam, rubber) niet gearceerd.');
  for (const r of regels) { b.tekst([26, ty], r, 2.7); ty -= 5.5; }
  kader(b, { nr: 'AFZ-00', naam: 'Samenstelling in doorsnede', materiaal: 'zie stuklijst', maken: 'Montage volgens het bouwschema', massa: '—', schaal: '1:1', blad });
  return b.svg();
}

describe('tekeningen', () => {
  it.skipIf(!process.env.AFZUIGING_TEKENINGEN)('werktekeningen, samenstelling en tafelblad', () => {
    mkdirSync(UIT, { recursive: true });
    const totaal = DELEN.length + 4;
    const sam = samenstellingBlad(`1 / ${totaal}`);
    writeFileSync(`${UIT}/AFZ-00-samenstelling.svg`, sam.svg);
    writeFileSync(`${UIT}/AFZ-00-doorsnede.svg`, doorsnedeBlad(`2 / ${totaal}`));
    const csv = (v: string) => (/[;"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const regels = [['Pos', 'Aantal', 'Benaming', 'Materiaal / type', 'Tekening'], ...sam.stuklijst].map((r) => r.map(csv).join(';'));
    writeFileSync(`${UIT}/stuklijst.csv`, `﻿${regels.join('\r\n')}\r\n`); // met BOM en CRLF: Excel opent het meteen goed
    DELEN.forEach((d, i) => writeFileSync(`${UIT}/${d.nr}-${d.naam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}.svg`, onderdeelBlad(d, `${i + 3} / ${totaal}`)));
    writeFileSync(`${UIT}/AFZ-20-tafelblad.svg`, tafelbladBlad(`${totaal - 1} / ${totaal}`));
    writeFileSync(`${UIT}/AFZ-21-freesmallen-en-latten.svg`, malBlad(`${totaal} / ${totaal}`));
    expect(sam.stuklijst.length).toBeGreaterThan(20);
  }, 1800000);
});
