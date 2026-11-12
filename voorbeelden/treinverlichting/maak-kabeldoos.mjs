// Kabeldoos voor de verlichting van de modelbaan (versie 2, 2026-11-11), als Phlippo CAD-documenten.
//
// Versie 1 was 248,9 x 245,6: te groot, want de slicer van de Centauri Carbon houdt rechtsvoor 10 x 20 mm vrij voor het
// filamentmes. Versie 2 (EISEN.md, "Versie 2"): één doos van 229,8 x 229,8 x 44,4 (elk geprint deel hoogstens 230 x 230,
// alles samen hoogstens 80 hoog) met echte kabelgoten: smal (5,4) en 28 hoog (net boven de bordjes, 17), met klikdeksels.
// - Rij 1 tot 5: telkens 3 bordjes; rij 6: bordje 16, uitgangsprint, PCA9685; rij 7 (vooraan): voedingsprint,
//   ingangsprint, ESP (de USB-poorten in de rechterwand, de DC-bus in de linkerwand). Versie 3 (Fable 5.2): klemlippen,
//   uitgangsprint over de hele rij 6 met de PCA9685 erboven, DC-bus, gaatjesprints uit opbouw.mjs, hulpstukken.
// - Elke rij van 1 tot 6 ligt in een ring: de wanden van de goten zijn ook het kader van de bordjes (0,3 speling).
//   Goten (goten.mjs): langs de achterwand, tussen elke twee rijen, langs de linker- en de rechterwand (rij 1 tot 6),
//   met vingers en sleuven en een klikdeksel per goot. De draden komen van boven door sleuven in de bodem onder de
//   goten (de doos hangt ondersteboven onder de baan, het deksel onderaan) of door de 18 membraantules in de wanden.
// - 4 sleutelgaten in de bodem van de zijgoten (6 mm schuiven naar achteren), 4 schroefbussen voor het deksel in de hoeken.
// Assenstelsel: oorsprong in het midden van de binnenkant van de bodem, Y omhoog (in de doos), X naar rechts, +Z = voorkant.
// Alle geprinte delen printen zonder support (PETG). Gebruik: node voorbeelden/treinverlichting/maak-kabeldoos.mjs
import { writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { component } from '../lib/schets.mjs';
import { M } from './maten.mjs';
import { yv, xv, zv, deel, snede, cirkels, PETG, PETG_DEKSEL } from './hulp.mjs';
import { gootwanden, groefSneden, vingers, gootdeksel, dekselPlaat, dekselBreedte, sleufPatroon, klemSleuven, KLIK_REK } from './goten.mjs';
import { bordjePcb, klemstrook, smdRij, tule, dcBus, schroefVerzonken, bolkopSchroef, espStapel, uitgangStapel, ingangStapel, voedingStapel, espY, espDragerX, dragerGaten, hoekGaten, draaiY } from './onderdelen.mjs';
import { lippenOpBak, hulpstukkenPlaat } from './hulpstukken.mjs';
import { PRINTS, pinnen, gatXY } from './opbouw.mjs';

export { M };
const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- indeling
let cache;
/**
 * De indeling van de doos: de ringen (rij 1 tot 6), de goten, de bordjes en prints per rij, de sleuven in de wanden,
 * de klikgroeven, de gootdeksels, de kabelinvoeren, de sleuven in de bodem, de sleutelgaten en de schroefbussen.
 */
export function indeling() {
  if (cache) return cache;
  const { bordje: B, doos: D, goot: G, rij: R } = M, w = G.wand, c = G.speling;
  const X = D.binnen / 2, Z = D.binnen / 2, xr = X - G.zij, xi = xr - w; // ring buiten en binnen (halve breedte)
  const diep = [20.9, 20.9, 20.9, 20.9, 20.9, Math.max(M.uitgang.z, M.pca.z, B.z), Math.max(M.voeding.z, M.ingang.z, M.drager.z)];
  const goten = [{ soort: 'achter', z0: -Z, z1: -Z + G.achter }], ringen = [];
  let z = -Z + G.achter;
  for (let r = 0; r < 6; r++) {
    const zi0 = z + w, zi1 = zi0 + diep[r] + 2 * c;
    ringen.push({ z0: z, z1: zi1 + w, zi0, zi1, cz: (zi0 + zi1) / 2 });
    z = zi1 + w;
    goten.push({ soort: 'midden', z0: z, z1: z + G.b });
    z += G.b;
  }
  const wand7 = [z, z + w], cz7 = z + w + c + diep[6] / 2, voor = Z - (z + w + c + diep[6]);
  if (Math.abs(voor - D.voor) > 0.05) throw new Error(`voorrand ${voor.toFixed(2)} in plaats van ${D.voor}`);
  goten.forEach((g) => { g.zc = (g.z0 + g.z1) / 2; });
  // rijen: per rij de onderdelen met hun x-midden, z-midden, breedte en diepte
  const rijen = [], bd = (nr, cx, cz) => ({ soort: 'bordje', nr, cx, cz, x: B.x, z: B.z });
  const ce = R.eind, gb = (2 * xi - 2 * ce - 3 * B.x) / 2; // tussen de bordjes van een rij (aan de uiteinden R.eind: de klemlippen)
  let nr = 1;
  for (let r = 0; r < 5; r++) rijen.push([-1, 0, 1].map((k) => bd(nr++, k * (B.x + gb), ringen[r].cz)));
  {
    // bordje 16 links, de uitgangsprint (met de PCA9685 erboven) vult de rest van de ring
    const e = ringen[5], x16 = -xi + ce + B.x / 2, xu = x16 + B.x / 2 + R.tussen6 + M.uitgang.x / 2;
    if (xu + M.uitgang.x / 2 > xi - 0.5) throw new Error(`uitgangsprint te breed: ${(xu + M.uitgang.x / 2 - xi).toFixed(2)} in de wand`);
    rijen.push([bd(nr++, x16, e.cz), { soort: 'uitgang', cx: xu, cz: e.cz, x: M.uitgang.x, z: M.uitgang.z }]);
  }
  {
    const espB = Math.max(M.esp.x + M.esp.module.voorbij, M.drager.x), xv0 = -X + R.rand7 + M.voeding.x / 2, xe = X - espB / 2;
    const xg = ((xv0 + M.voeding.x / 2) + (xe - espB / 2)) / 2;
    rijen.push([{ soort: 'voeding', cx: xv0, cz: cz7, x: M.voeding.x, z: M.voeding.z }, { soort: 'ingang', cx: xg, cz: cz7, x: M.ingang.x, z: M.ingang.z }, { soort: 'esp', cx: xe, cz: cz7, x: espB, z: M.drager.z }]);
  }
  cache = { X, Z, xr, xi, ringen, goten, wand7, cz7, rijen, gb };
  Object.assign(cache, details(cache));
  return cache;
}

/** sleuven in de wanden, klikgroeven, gootdeksels, kabelinvoeren, bodemsleuven, sleutelgaten, bussen en palen */
function details(L) {
  const { doos: D, goot: G, bordje: B, kader: K } = M, w = G.wand, { X, Z, xr, xi, ringen, goten, wand7, rijen } = L;
  const Kd = G.deksel, been = Kd.speling + Kd.been; // het been van een deksel ligt 0,1 tot 1,3 buiten het vingervlak
  const iz = (w - G.vingerDik) / 2; // de vingers staan 0,2 binnen de voet: hun vlak ligt 0,2 verder van het bordje
  // gootdeksels: langs de achterwand (rand), langs de zijwanden (rand, van achter de achtergoot tot de goot voor rij 7),
  // tussen de ringen en voor rij 7 (midden); het been van de zijdeksels loopt binnen de ringen langs hun zijwand
  const xb = X - D.bus.hart - D.bus.r - 0.3; // vrij van de schroefbussen in de hoeken
  const zs0 = ringen[0].zi0 - iz + been + 0.3, zs1 = wand7[0] - 0.3, xm = xi + iz - been - 0.3;
  // klikplaatsen: in de wanden langs X een klikvinger op x = ±34,5 (tussen de bordjes) en ±93 (tussen de laatste klemmen
  // en de hoek van de ring),
  // in de zijwanden van ring 2 en 5 de vinger achter de eindklem; daar een groef in de vinger en een nok aan het deksel
  const KX = [-93, -34.5, 34.5, 93], kv = G.klik / 2, gl = G.groefLang / 2;
  const KZ = [ringen[1], ringen[4]].map((r) => [r.cz + 4.0, r.zi1 - 0.7]);
  const nokZ = KZ.map(([a, e]) => (a + e) / 2);
  const deksels = [
    { soort: 'rand', b: G.achter, as: 'x', a: -xb, e: xb, kant: 'achter', nokken: KX.map((x) => x + xb) },
    { soort: 'rand', b: G.zij, as: 'z', a: zs0, e: zs1, kant: 'links', nokken: nokZ.map((z) => zs1 - z) },
    { soort: 'rand', b: G.zij, as: 'z', a: zs0, e: zs1, kant: 'rechts', nokken: nokZ.map((z) => z - zs0) },
    ...goten.slice(1).map((g) => ({ soort: 'midden', b: G.b, as: 'x', a: -xm, e: xm, c: g.zc, nokken: KX.map((x) => x + xm) })),
  ].map((d) => ({ ...d, l: Math.round((d.e - d.a) * 100) / 100 }));
  // de wanden met hun sleuven (langs de wand): voor elke klemmenrij een sleuf per twee klemmen, elders gewone sleuven;
  // in de hoeken van de ringen geen vingers op de plaats van het been van de zijdeksels (de wanden langs X) en van het
  // achterdeksel (de zijwanden van ring 1)
  const wanden = [], hoek = [[-xr - 1, -(xi - 1.4)], [xi - 1.4, xr + 1]], vol = KX.map((x) => [x - kv, x + kv]);
  ringen.forEach((r, i) => {
    for (const [zw, kant] of [[r.z0, -1], [r.z1 - w, 1]]) {
      const vast = [];
      for (const d of rijen[i]) {
        if (d.soort === 'bordje') vast.push(...klemSleuven(d.cx, B.klem.n, B.klem.steek));
        if (d.soort === 'uitgang' && kant > 0) vast.push(...uitgangSleuven(d));
      }
      wanden.push({ as: 'x', c: zw + w / 2, van: -xr + iz, tot: xr - iz, sleuven: [...sleufPatroon(-xm, xm, vast, G, vol), ...hoek] });
    }
    for (const k of [-1, 1]) {
      const eind = rijen[i].find((d) => d.soort === 'bordje' && Math.abs(d.cx + (k * B.x) / 2 - k * (xi - M.rij.eind)) < 0.01);
      const vast = eind ? [[r.cz, B.eind.steek + 1.4 + 0.6]] : [];
      const extra = i === 0 ? [[r.zi0 - 0.5, r.zi0 - iz + been + 0.3]] : []; // het been van het achterdeksel
      wanden.push({ as: 'z', c: k * (xi + w / 2), van: r.zi0, tot: r.zi1, sleuven: [...sleufPatroon(r.zi0, r.zi1, vast), ...extra] });
    }
  });
  wanden.push({ as: 'x', c: (wand7[0] + wand7[1]) / 2, van: -X - 0.8, tot: X + 0.8, sleuven: sleufPatroon(-X, X, [], G, vol) });
  // klikgroeven: aan de binnenkant van de ringen en aan de voorkant van de wand voor rij 7 (voor de benen), in de
  // buitenwanden voor de neus van de randdeksels (midden in de plaat van het deksel)
  const yn = G.top + Kd.dik / 2, dn = G.neus.diep, yg = G.groef.y;
  const lijnenX = [...ringen.map((r) => ({ c: r.zi0 - iz, s: 1, y: yg })), ...ringen.map((r) => ({ c: r.zi1 + iz, s: -1, y: yg })), { c: wand7[1] - iz, s: 1, y: yg }];
  const groeven = [
    ...KX.map((x, i) => ({ naam: `X ${i + 1}`, as: 'x', van: x - gl, tot: x + gl, lijnen: lijnenX })),
    ...KZ.map(([a, e], i) => ({ naam: `Z ${i + 1}`, as: 'z', van: a, tot: e, lijnen: [{ c: -(xi + iz), s: 1, y: yg }, { c: xi + iz, s: -1, y: yg }] })),
  ];
  const wandGroeven = [
    { naam: 'achterwand', as: 'x', van: -xb, tot: xb, lijnen: [{ c: -Z, s: 1, y: yn, d: dn }] },
    { naam: 'zijwanden', as: 'z', van: zs0, tot: zs1, lijnen: [{ c: -X, s: 1, y: yn, d: dn }, { c: X, s: -1, y: yn, d: dn }] },
  ];
  // kabelinvoeren: links en rechts bij de goten tussen rij 1 en 6, vooraan 8 (4 bij de klemmen van de ingangsprint)
  const ing = rijen[6].find((d) => d.soort === 'ingang');
  const tules = [
    ...goten.slice(1, 6).flatMap((g) => [{ wand: 'links', c: g.zc }, { wand: 'rechts', c: g.zc }]),
    ...[-80, -58, ing.cx - 33, ing.cx - 11, ing.cx + 11, ing.cx + 33, 52.4, 74.4].map((c) => ({ wand: 'voor', c })),
  ];
  // sleuven in de bodem onder de goten: onder elke goot één per bordje (de leddraden komen van de baan naar beneden),
  // in de zijgoten één per rij 2 tot 5; sleutelgaten in de bodem van de zijgoten bij rij 1 en rij 6
  const S = D.sleuf, xz = X - G.zij / 2, bodem = [];
  goten.forEach((g, j) => {
    const bs = j === 0 ? rijen[0] : j <= 5 ? rijen[j - 1] : [rijen[5][0]], bw = j === 0 ? G.achter - 1.2 : S.b;
    for (const d of bs.filter((q) => q.soort === 'bordje')) bodem.push([d.cx - S.l / 2, g.zc - bw / 2, d.cx + S.l / 2, g.zc + bw / 2, bw / 2 - 0.01]);
  });
  for (const r of ringen.slice(1, 5)) for (const k of [-1, 1]) bodem.push([k * xz - S.zij.b / 2, r.cz - S.zij.l / 2, k * xz + S.zij.b / 2, r.cz + S.zij.l / 2, S.zij.b / 2 - 0.01]);
  const sleutelgaten = [-1, 1].flatMap((k) => [[k * xz, ringen[0].cz], [k * xz, ringen[5].cz]]);
  const bussen = [-1, 1].flatMap((k) => [[k * (X - D.bus.hart), -(Z - D.bus.hart)], [k * (X - D.bus.hart), Z - D.bus.hart]]);
  // palen tussen de bordjes (houden ze in X) en stroken langs bordje 16 (houden het in zijn bredere ring in Z)
  const pk = M.rij.paal, palen = [];
  for (const rij of rijen.slice(0, 5)) for (const k of [-1, 1]) { const cx = k * (B.x / 2 + L.gb / 2) + rij[1].cx; palen.push([cx - L.gb / 2 + pk, rij[1].cz - 7.5, cx + L.gb / 2 - pk, rij[1].cz + 7.5]); }
  const b16 = rijen[5][0], ui = rijen[5][1];
  palen.push([b16.cx + B.x / 2 + pk, b16.cz - 7.5, ui.cx - ui.x / 2 - pk, b16.cz + 7.5]);
  const r6 = ringen[5];
  palen.push([b16.cx - B.x / 2, r6.zi0 - 0.5, b16.cx + B.x / 2, b16.cz - B.z / 2 - K.speling], [b16.cx - B.x / 2, b16.cz + B.z / 2 + K.speling, b16.cx + B.x / 2, r6.zi1 + 0.5]);
  return { deksels, wanden, groeven, wandGroeven, tules, bodem, sleutelgaten, bussen, palen };
}

/** de sleuven voor de klemmen van de uitgangsprint (-X3:1..16 steek 2,54 en -X3:17/18 steek 5,08, opbouw.mjs) */
function uitgangSleuven(d) {
  const P = PRINTS.uitgang, x = (c) => d.cx - P.w / 2 + gatXY(P, c, 0)[0], uit = [];
  for (const o of P.onderdelen.filter((q) => q.ref === '-X3')) {
    const cs = pinnen({ ...P, onderdelen: [o] }).map((p) => p.c), m = (x(Math.min(...cs)) + x(Math.max(...cs))) / 2;
    uit.push(...klemSleuven(m, o.n, o.soort === 'mkds' ? 5.08 : 2.54, o.soort === 'mkds' ? 2.4 : 1.4));
  }
  return uit;
}

/** de 4 sleutelgaten (het grote gat) */
export function bevestigingsGaten() { return indeling().sleutelgaten; }
const dcZ = () => indeling().cz7 + M.dcbus.dz;
const dcY = () => M.dcbus.y;
function usbOpening(d) {
  const y = espY() + M.esp.pcb;
  return { y0: y - 2.5, y1: y + 6.5, z0: d.cz - M.esp.z / 2 + 0.5, z1: d.cz + M.esp.z / 2 - 0.5 }; // ruim genoeg voor de stekker (11 x 7)
}
/** de schroefpaaltjes van de prints in rij 6 en 7 */
function printPalen() {
  const palen = [];
  for (const rij of indeling().rijen) for (const d of rij) {
    if (d.soort === 'bordje') continue;
    const b = { uitgang: M.uitgang, ingang: M.ingang, voeding: M.voeding, esp: M.drager }[d.soort];
    const P = PRINTS[d.soort], off = d.soort === 'esp' ? dragerGaten() : P.schroeven.map(([x, y]) => [x - P.w / 2, y - P.h / 2]);
    if (d.soort !== 'esp' && P.w !== b.x) throw new Error(`${d.soort}: opbouw.mjs ${P.w} breed, maten.mjs ${b.x}`);
    const cx = d.soort === 'esp' ? espDragerX(d) : d.cx;
    off.forEach(([ox, oz]) => palen.push([cx + ox, d.cz + oz]));
  }
  return palen;
}

// ---------------------------------------------------------------- de bak
/** de bak (rechtop geprint: de bodem op het bed). Volgorde: eerst de sneden in wanden en bodem terwijl de bak nog
 *  eenvoudig is, dan de goten, de palen en tot slot de ronde bussen en alle schroefgaten in één keer: elke bewerking
 *  kost meer naarmate het lichaam meer driehoeken heeft (de mesh-kernel) */
export function bak() {
  const L = indeling(), D = M.doos, G = M.goot, w = D.wand, { X, Z } = L, XB = X + w, ZB = Z + w;
  const o = deel('Kabeldoos (bak)', PETG);
  o.schets(yv(-D.bodem, 'Plane onderkant bodem'), (s) => s.rrectW([-XB, 0, -ZB], [XB, 0, ZB], D.r));
  o.extrude('boss', D.bodem + D.h, { naam: 'Blok' });
  o.schets(yv(D.h, 'Plane bovenrand'), (s) => s.rrectW([-X, 0, -Z], [X, 0, Z], 1.6));
  o.extrude('cut', D.h, { omkeren: true, naam: 'Binnenruimte' });
  // de groeven in de buitenwanden voor de neus van de randdeksels (vroeg: de wanden zijn dan nog eenvoudig)
  groefSneden(o, L.wandGroeven);
  // kabelinvoeren: ronde gaten Ø16,5 voor een membraantule Wiska EMT 16 (M16, wand 2 tot 9,5, kabels 1 tot 9 mm, IP66)
  const yi = D.invoer.y, ri = D.invoer.gat / 2;
  const vlakken = { links: () => xv(-XB, 'Plane kabelinvoer links', -1), rechts: () => xv(XB, 'Plane kabelinvoer rechts'), voor: () => zv(ZB, 'Plane kabelinvoer voor') };
  const punt = { links: (c) => [-XB, yi, c], rechts: (c) => [XB, yi, c], voor: (c) => [c, yi, ZB] };
  for (const kant of ['links', 'rechts', 'voor']) {
    o.schets(vlakken[kant](), (s) => L.tules.filter((t) => t.wand === kant).forEach((t) => s.cirkelW(punt[kant](t.c), ri)));
    o.extrude('cut', w + 1, { omkeren: true, naam: `Kabelinvoer ${kant}` });
  }
  const esp = L.rijen[6].find((d) => d.soort === 'esp'), u = usbOpening(esp);
  o.schets(xv(XB, 'Plane opening USB'), (s) => s.rrectW([XB, u.y0, u.z0], [XB, u.y1, u.z1], 1));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Opening USB' });
  // DC-chassisbus 5,5 x 2,5 in de linkerwand, boven de voedingsprint (de adapter houdt zijn stekker: niets doorknippen)
  o.schets(xv(-XB, 'Plane DC-bus', -1), (s) => s.cirkelW([-XB, dcY(), dcZ()], M.dcbus.gat / 2));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Gat DC-bus' });
  // ophangen onder de baan: 4 sleutelgaten in de zijgoten (bolkopschroef 4 x 20 half in de baan, de doos over de koppen,
  // 6 mm naar achteren schuiven: de sleuf loopt naar voren)
  const SG = D.sleutelgat;
  o.schets(yv(0.01, 'Plane sleutelgaten'), (s) => L.sleutelgaten.forEach(([x, z]) => s.cirkelW([x, 0, z], SG.kop / 2)));
  o.extrude('cut', D.bodem + 1, { omkeren: true, naam: 'Sleutelgaten (kop)' });
  o.schets(yv(0.01, 'Plane sleutelgaten sleuf'), (s) => L.sleutelgaten.forEach(([x, z]) => s.rrectW([x - SG.schacht / 2, 0, z], [x + SG.schacht / 2, 0, z + SG.slag + SG.schacht / 2], SG.schacht / 2 - 0.01)));
  o.extrude('cut', D.bodem + 1, { omkeren: true, naam: 'Sleutelgaten (sleuf)' });
  snede(o, 0.01, D.bodem + 1, L.bodem, 'Draadsleuven');
  // steunrails onder de bordjes, palen tussen de bordjes en stroken langs bordje 16 (0,3 speling)
  const rails = L.rijen.slice(0, 6).map((rij) => { const bs = rij.filter((d) => d.soort === 'bordje'); return [Math.min(...bs.map((d) => d.cx)) - M.bordje.x / 2 + 1, rij[0].cz - 3, Math.max(...bs.map((d) => d.cx)) + M.bordje.x / 2 - 1, rij[0].cz + 3]; });
  o.schets(yv(-0.5, 'Plane steunrails'), (s) => rails.forEach(([x0, z0, x1, z1]) => s.rrectW([x0, 0, z0], [x1, 0, z1], 1)));
  o.extrude('boss', M.voet + 0.5, { naam: 'Steunrails' });
  o.schets(yv(-0.5, 'Plane palen'), (s) => L.palen.forEach(([x0, z0, x1, z1]) => s.rrectW([x0, 0, z0], [x1, 0, z1], 0.5)));
  o.extrude('boss', M.kader.h + 0.5, { naam: 'Palen bordjes' });
  // schroefpaaltjes Ø6 voor de prints (gat Ø2,2, M2,5 zelftappend in PETG) en 4 schroefbussen Ø7 in de hoeken (gat Ø2,6)
  const palen = printPalen();
  cirkels(o, -0.5, M.voet + 0.5, palen.map(([x, z]) => [x, z, 3]), 'Schroefpaaltjes');
  cirkels(o, -0.5, D.h + 0.5, L.bussen.map(([x, z]) => [x, z, D.bus.r]), 'Schroefbussen');
  cirkels(o, D.h, D.h + D.bodem - 0.4, [...palen.map(([x, z]) => [x, z, 1.1]), ...L.bussen.map(([x, z]) => [x, z, 1.3])], 'Schroefgaten', 'cut');
  // tot slot de kabelgoten: 6 ringen (rij 1 tot 6) en de wand voor rij 7, de vingers en hun klikgroeven
  gootwanden(o, { ringen: L.ringen.map((r) => [-L.xr, r.z0, L.xr, r.z1]), balken: [[-X - 1, L.wand7[0], X + 1, L.wand7[1]]], wanden: L.wanden, groeven: L.groeven });
  // helemaal op het einde de klemlippen (4 per bordje, hulpstukken.mjs): de kuiltjes in de bodem vroeg in de boom
  // maakten elke latere bewerking trager (bak 75 s in plaats van 40 s); achteraan kosten ze 4 tot 5 s
  lippenOpBak(o, L.rijen);
  return o.doc();
}

// ---------------------------------------------------------------- het deksel
/** het deksel (plat geprint, de buitenkant op het bed): plaat, centreerrand die 1,55 in de bak valt, drukribben op de
 *  eindklemmen van de bordjes, 4 verzonken gaten */
export function deksel() {
  const L = indeling(), D = M.doos, { X, Z } = L, XB = X + D.wand, ZB = Z + D.wand, y0 = D.h;
  const o = deel('Kabeldoos (deksel)', PETG_DEKSEL);
  o.schets(yv(y0, 'Plane deksel'), (s) => s.rrectW([-XB, 0, -ZB], [XB, 0, ZB], D.r));
  o.extrude('boss', D.deksel, { naam: 'Plaat' });
  o.schets(yv(y0 + 0.05, 'Plane rand'), (s) => { s.rrectW([-X + 0.3, 0, -Z + 0.3], [X - 0.3, 0, Z - 0.3], 1.6); s.rrectW([-X + 2.3, 0, -Z + 2.3], [X - 2.3, 0, Z - 2.3], 0.6); });
  o.extrude('boss', 1.55, { omkeren: true, naam: 'Centreerrand' });
  // drukribben: per bordje twee ribben (4 x 10) boven de eindklemmen, tot 0,3 mm boven de klemmen
  const B = M.bordje, ribben = [];
  for (const rij of L.rijen) for (const d of rij) if (d.soort === 'bordje') for (const k of [-1, 1]) {
    const x = d.cx + k * (B.x / 2 - 0.2 - B.eind.diep / 2);
    ribben.push([x - 2, d.cz - 5, x + 2, d.cz + 5]);
  }
  const yr = M.voet + B.h + 0.3;
  o.schets(yv(y0 + 0.05, 'Plane drukribben'), (s) => ribben.forEach(([x0, z0, x1, z1]) => s.rrectW([x0, 0, z0], [x1, 0, z1], 1)));
  o.extrude('boss', y0 + 0.05 - yr, { omkeren: true, naam: 'Drukribben' });
  // de rand rond de bussen in de hoeken weg
  snede(o, y0 + 0.05, 1.6, L.bussen.map(([x, z]) => [x - 4.6, z - 4.6, x + 4.6, z + 4.6, 4.6]), 'Ruimte bussen');
  cirkels(o, y0 + D.deksel, D.deksel + 1, L.bussen.map(([x, z]) => [x, z, 1.6]), 'Gaten', 'cut');
  o.schets(yv(y0 + D.deksel, 'Plane verzinking'), (s) => L.bussen.forEach(([x, z]) => s.cirkelW([x, 0, z], 3.1)));
  o.extrude('cut', 1.5, { omkeren: true, naam: 'Verzinking', draft: 45 });
  return o.doc();
}

// ---------------------------------------------------------------- gootdeksels
/** alle gootdeksels: soort (midden of rand), binnenbreedte van de goot, as, begin, einde, lengte */
export const gootDeksels = () => indeling().deksels;
/** de printplaat met alle gootdeksels naast elkaar */
export const dekselPlaatDoc = () => dekselPlaat(`Gootdeksels (${gootDeksels().length} stuks)`, gootDeksels());
/** het breedste deel van de plaat (voor de controle op het bed) */
export const plaatBreedte = () => gootDeksels().reduce((a, d) => a + dekselBreedte(d.soort, d.b), 0) + 4 * (gootDeksels().length - 1);

// ---------------------------------------------------------------- assemblage
export function kabeldoos() {
  const L = indeling(), comps = [], D = M.doos, B = M.bordje, { X, Z } = L, XB = X + D.wand, ZB = Z + D.wand;
  const at = (id, naam, doc, p, rot) => comps.push(component(id, naam, doc, p, rot ? { rotation: rot } : {}));
  at('d1', 'Kabeldoos (bak)<1>', bak(), [0, 0, 0]);
  at('d2', 'Kabeldoos (deksel)<1>', deksel(), [0, 0, 0]);
  // de 16 bordjes: print, 2 klemstroken van 16 (draadingang naar de goot), 2 eindklemmen (5,0, 2-polig), 16 weerstanden
  const pcb = bordjePcb(), strook = klemstrook('Klemstrook 16-polig 2,54', B.klem.n, B.klem.steek, B.klem.diep, B.klem.h);
  const eind = klemstrook('Klem 2-polig 5,0', 2, B.eind.steek, B.eind.diep, B.h - B.pcb), smd = smdRij('16 SMD-weerstanden 0805', 16, 2.54);
  for (const rij of L.rijen) for (const d of rij) {
    const y = M.voet, n = d.nr;
    if (d.soort === 'bordje') {
      at(`b${n}`, `Bordje ${n} (print)<${n}>`, pcb, [d.cx, y, d.cz]);
      at(`b${n}k1`, `Bordje ${n} klemstrook achter<${n}>`, strook, [d.cx, y + B.pcb, d.cz - B.z / 2 + B.klem.diep / 2 + 0.2]);
      at(`b${n}k2`, `Bordje ${n} klemstrook voor<${n}>`, strook, [d.cx, y + B.pcb, d.cz + B.z / 2 - B.klem.diep / 2 - 0.2], draaiY(180));
      at(`b${n}e1`, `Bordje ${n} klem links<${n}>`, eind, [d.cx - B.x / 2 + B.eind.diep / 2 + 0.2, y + B.pcb, d.cz], draaiY(90));
      at(`b${n}e2`, `Bordje ${n} klem rechts<${n}>`, eind, [d.cx + B.x / 2 - B.eind.diep / 2 - 0.2, y + B.pcb, d.cz], draaiY(-90));
      at(`b${n}r`, `Bordje ${n} weerstanden<${n}>`, smd, [d.cx, y + B.pcb, d.cz]);
    } else if (d.soort === 'esp') espStapel(at, d);
    else if (d.soort === 'uitgang') uitgangStapel(at, d);
    else if (d.soort === 'ingang') ingangStapel(at, d);
    else if (d.soort === 'voeding') voedingStapel(at, d);
  }
  // de DC-bus in de linkerwand, de membraantules (flens buiten, langs de normaal van de wand naar buiten)
  at('w1', 'DC-chassisbus 5,5 x 2,5<1>', dcBus(), [-XB, dcY(), dcZ()], draaiY(180));
  const tl = tule(), yi = D.invoer.y;
  L.tules.forEach((t, i) => {
    const p = { links: [-XB, yi, t.c], rechts: [XB, yi, t.c], voor: [t.c, yi, ZB] }[t.wand];
    const r = { links: draaiY(180), rechts: undefined, voor: draaiY(-90) }[t.wand];
    at(`t${i + 1}`, `Membraantule EMT 16<${i + 1}>`, tl, p, r);
  });
  // deksel: 4 verzonken schroeven; ophangen: 4 bolkopschroeven in de vergrendelde stand (aan het eind van de sleuf)
  const kop3 = schroefVerzonken('Plaatschroef 3 x 12 verzonken', 3, 2.4, 12), hout = bolkopSchroef('Bolkopschroef 4 x 20 (hout)', 4, 8, 2.8, 20);
  L.bussen.forEach(([x, z], i) => at(`sd${i + 1}`, `Plaatschroef 3 x 12 verzonken<${i + 1}>`, kop3, [x, D.h + D.deksel, z]));
  L.sleutelgaten.forEach(([x, z], i) => at(`sv${i + 1}`, `Bolkopschroef 4 x 20<${i + 1}>`, hout, [x, 0, z + D.sleutelgat.slag]));
  // de gootdeksels: een deksel langs X begint op a; de randdeksels met hun neus in de buitenwand
  const docs = new Map(), doc = (d) => { const k = `${d.soort}|${d.b}|${d.l}|${d.nokken}`; if (!docs.has(k)) docs.set(k, gootdeksel(d.soort, d.b, d.l, d.nokken)); return docs.get(k); };
  L.deksels.forEach((d, i) => {
    const naam = `Gootdeksel ${d.soort === 'rand' ? 'rand ' : ''}${String(d.l).replace('.', ',')}<${i + 1}>`;
    if (d.kant === 'achter') at(`g${i + 1}`, naam, doc(d), [d.a, 0, -Z]);
    else if (d.kant === 'links') at(`g${i + 1}`, naam, doc(d), [-X, 0, d.e], draaiY(90));
    else if (d.kant === 'rechts') at(`g${i + 1}`, naam, doc(d), [X, 0, d.a], draaiY(-90));
    else at(`g${i + 1}`, naam, doc(d), [d.a, 0, d.c]);
  });
  return { format: 'phlippo-cad', version: 1, name: 'Kabeldoos treinverlichting', units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components: comps, mates: [] };
}

// ---------------------------------------------------------------- rekenwerk voor het rekenblad en de README
/** vulgraad van een goot tussen twee rijen (draden: 0,25 mm² LiY Ø1,4; 0,5 mm² Ø1,8) */
export function vulgraad() {
  const G = M.goot, A = (d) => (Math.PI * d * d) / 4;
  // tot de onderkant van het deksel; boven de voet staan de vingers 0,2 terug (de goot is daar 0,4 breder)
  const binnen = G.b * G.sleufBodem + (G.b + G.wand - G.vingerDik) * (G.top - G.sleufBodem);
  const ergst = 96 * A(1.4) + 8 * A(1.8); // de klemmenrijen van 6 bordjes (3 per rij) en hun voeding in één doorsnede
  const gewoon = 48 * A(1.4) + 8 * A(1.8); // de helft van de leddraden: ze komen door de sleuf onder hun eigen bordje
  return { binnen, gewoon, ergst, pGewoon: gewoon / binnen, pErgst: ergst / binnen };
}

export const ONDERDELEN = {
  'Kabeldoos-bak.kcad': bak,
  'Kabeldoos-deksel.kcad': deksel,
  'Gootdeksels-plaat.kcad': dekselPlaatDoc,
  'Gootdeksel.kcad': () => { const d = gootDeksels().find((q) => q.soort === 'midden'); return gootdeksel(d.soort, d.b, d.l, d.nokken); },
  'Bordje-PCB.kcad': bordjePcb,
  'Hulpstukken.kcad': hulpstukkenPlaat,
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const schrijf = (naam, doc) => writeFileSync(join(HERE, naam), JSON.stringify(doc, null, 1) + '\n');
  for (const [naam, f] of Object.entries(ONDERDELEN)) schrijf(naam, f());
  schrijf('Kabeldoos.kcad', kabeldoos());
  const L = indeling(), D = M.doos, v = vulgraad();
  console.log(`doos: buiten ${(2 * (L.X + D.wand)).toFixed(1)} x ${(2 * (L.Z + D.wand)).toFixed(1)} x ${(D.bodem + D.h + D.deksel).toFixed(1)} met deksel, binnen ${(2 * L.X).toFixed(1)} x ${(2 * L.Z).toFixed(1)} x ${D.h}`);
  console.log(`gootdeksels: ${L.deksels.map((d) => `${d.soort} ${d.l}`).join(', ')}; plaat ${plaatBreedte().toFixed(1)} breed; ${L.wanden.flatMap((w) => vingers(w)).length} vingers`);
  console.log(`vulgraad: gewoon ${(v.pGewoon * 100).toFixed(0)} %, ergst ${(v.pErgst * 100).toFixed(0)} % van ${v.binnen.toFixed(0)} mm²; rek klik ${(KLIK_REK() * 100).toFixed(2)} %`);
}
