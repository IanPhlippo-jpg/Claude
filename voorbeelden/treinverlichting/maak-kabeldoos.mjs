// Kabeldoos voor de verlichting van de modelbaan, als Phlippo CAD-documenten.
//
// Versie 1 was 248,9 x 245,6: te groot, want de slicer van de Centauri Carbon houdt rechtsvoor 10 x 20 mm vrij voor het
// filamentmes. Versie 2: één doos van 229,8 x 229,8 met echte kabelgoten (5,4 breed, 28 hoog) met klikdeksels. Versie 3
// (Fable 5.2): klemlippen, DC-bus, hulpstukken. Versie 4 (kant-en-klare printjes): de modules op een moduleplaat boven
// de bordjes. Versie 5 (Ian, 2026-11-15: "Als je met 2 lagen werkt is het te moeilijk om de kabels aan te sluiten"):
// één langwerpige doos van 440,9 x 229,8 x 45,2 op één laag, geprint in 2 helften die in elkaar klikken en gelijmd
// kunnen worden ("De doos moet in elkaar kunnen klikken en nog kunnen lijmen"), binnen geen tussenwand.
// - Linkerhelft (224,9 x 229,8): rij 1 tot 5 telkens 3 bordjes, rij 6 bordje 16, vooraan vrij; geen kabelgoten (Ian,
//   2026-11-15: "Kabel goten mogen weg"); elk bordje ligt op een steunrail en is vastgeschroefd op 4 schroefpaaltjes in
//   zijn hoeken (Ian, 2026-11-15: "ik wil ze geschroefd hebben", gaten 2 mm van de randen); de draden lopen rechtstreeks
//   van de tule of de draadsleuf in de bodem naar hun klem.
// - Rechterhelft (229,8 x 229,8 met de klikhaken): alle modules (opbouw.mjs) op palen in de bodem, de MOSFET-modules met
//   hun uitgangen naar de bordjes, de ESP met haar USB in een opening in de voorwand, de DC-bus in de achterwand.
// - Naad (maten.mjs, M.naad): 5 bodemlippen, 2 klikhaken met een 45°-onderkant (printen zonder support), 2 pilaren,
//   lijmspleet 0,2; het deksel in 2 helften met een overlap van 12 (lip met 4 klikvingers).
// - 4 sleutelgaten (2 per helft), 6 schroefbussen voor het deksel, 18 membraantules.
// Assenstelsel: oorsprong in het midden van de bordjesruimte (linkerhelft) op de binnenkant van de bodem, Y omhoog (in de
// doos), X naar rechts, +Z = voorkant. Gebruik: node voorbeelden/treinverlichting/maak-kabeldoos.mjs
import { writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { component } from '../lib/schets.mjs';
import { M } from './maten.mjs';
import { yv, xv, zv, deel, snede, cirkels, veelhoeken, hoekRechthoek, PETG, PETG_DEKSEL } from './hulp.mjs';
import { bordjePcb, klemstrook, smdRij, tule, dcBus, zekeringhouder, schroefVerzonken, bolkopSchroef, modulesOp, espUsb, draaiY, tsmp58000 } from './onderdelen.mjs';
import { hulpstukkenPlaat } from './hulpstukken.mjs';
import { proefstuk } from './proefstuk.mjs';
import { MODULES, gatenDoos, voetafdruk, helft, oogjes, oogSleuven } from './opbouw.mjs';
/** de oogjes voor kabelbinders in één helft (Fable 5.2 D2/D8): de 2 sleuven door de bodem (snede van boven, samen met de
 *  andere sneden in de bodem) en het kanaal eronder (snede van onderen, 1,4 diep: de binder ligt verzonken) */
const oogjesIn = (h) => oogjes(indeling()).filter((o) => o.helft === h);
function kanalenOogjes(o, h) { snede(o, -M.doos.bodem + M.oog.kanaal, M.oog.kanaal + 1, oogjesIn(h).map((q) => q.rect), 'Kanalen oogjes kabelbinders'); }
/** de gaten van de modules in één helft (versie 6 fase B: ook modules in de linkerhelft) */
const gatenIn = (h) => Object.keys(MODULES).filter((r) => helft(r) === h).flatMap((r) => gatenDoos(r));

export { M };
const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- indeling
let cache;
/**
 * De indeling van de linkerhelft: de vakken van de rijen (rij 1 tot 6, op dezelfde plaatsen als in versie 4), de
 * bordjes per rij, de kabelinvoeren, de draadsleuven in de bodem, de sleutelgaten, de schroefbussen en de schroefpaaltjes
 * van de bordjes (versie 5 zonder kabelgoten: Ian, 2026-11-15, "Kabel goten mogen weg").
 */
export function indeling() {
  if (cache) return cache;
  const { bordje: B, doos: D, raster: G, rij: R } = M, w = G.wand, c = G.speling;
  const X = D.binnen / 2, Z = D.binnen / 2, xr = X - G.zij, xi = xr - w; // het vak van de bordjes (halve breedte)
  const diep = [20.9, 20.9, 20.9, 20.9, 20.9, M.rij6, M.rij7];
  const tussen = [{ soort: 'achter', z0: -Z, z1: -Z + G.achter }], ringen = [];
  let z = -Z + G.achter;
  for (let r = 0; r < 6; r++) {
    const zi0 = z + w, zi1 = zi0 + diep[r] + 2 * c;
    ringen.push({ z0: z, z1: zi1 + w, zi0, zi1, cz: (zi0 + zi1) / 2 });
    z = zi1 + w;
    tussen.push({ soort: 'midden', z0: z, z1: z + G.b });
    z += G.b;
  }
  const cz7 = z + w + c + diep[6] / 2, voor = Z - (z + w + c + diep[6]);
  if (Math.abs(voor - D.voor) > 0.05) throw new Error(`voorrand ${voor.toFixed(2)} in plaats van ${D.voor}`);
  tussen.forEach((g) => { g.zc = (g.z0 + g.z1) / 2; });
  // rijen: per rij de onderdelen met hun x-midden, z-midden, breedte en diepte
  const rijen = [], bd = (nr, cx, cz) => ({ soort: 'bordje', nr, cx, cz, x: B.x, z: B.z });
  const ce = R.eind, gb = (2 * xi - 2 * ce - 3 * B.x) / 2; // tussen de bordjes van een rij (de plaatsen van versie 4)
  let nr = 1;
  for (let r = 0; r < 5; r++) rijen.push([-1, 0, 1].map((k) => bd(nr++, k * (B.x + gb), ringen[r].cz)));
  // rij 6: bordje 16 links; vooraan (rij 7) vrij: daar komen de draden van de tules vooraan binnen
  rijen.push([bd(nr++, -xi + ce + B.x / 2, ringen[5].cz)]);
  rijen.push([]);
  cache = { X, Z, xr, xi, ringen, tussen, cz7, rijen, gb, xn: M.naad.x + M.naad.spleet };
  Object.assign(cache, details(cache));
  return cache;
}

/** kabelinvoeren, draadsleuven in de bodem, sleutelgaten, bussen en de schroefpaaltjes van de bordjes (linkerhelft) */
function details(L) {
  const { doos: D, raster: G, bordje: B, kader: K, rij: R } = M, { X, Z, ringen, tussen, rijen } = L;
  // kabelinvoeren van de linkerhelft: links tussen de rijen, vooraan 4 (de rechterhelft: rechts())
  const tules = [
    ...tussen.slice(1, 6).map((g) => ({ wand: 'links', c: g.zc })),
    ...M.links.tulesVoor.map((c) => ({ wand: 'voor', c })),
  ];
  // draadsleuven in de bodem: tussen de rijen één per bordje (de leddraden komen van de baan rechtstreeks naast hun
  // bordje binnen), links één per rij 2 tot 5
  const S = D.sleuf, bodem = [];
  tussen.forEach((g, j) => {
    const bs = j === 0 ? rijen[0] : j <= 5 ? rijen[j - 1] : [rijen[5][0]], bw = j === 0 ? G.achter - 1.2 : S.b;
    for (const d of bs.filter((q) => q.soort === 'bordje')) bodem.push([d.cx - S.l / 2, g.zc - bw / 2, d.cx + S.l / 2, g.zc + bw / 2, bw / 2 - 0.01]);
  });
  for (const r of ringen.slice(1, 5)) bodem.push([-(X - G.zij / 2) - S.zij.b / 2, r.cz - S.zij.l / 2, -(X - G.zij / 2) + S.zij.b / 2, r.cz + S.zij.l / 2, S.zij.b / 2 - 0.01]);
  // de schroefpaaltjes: per bordje 4, onder de gaten in de hoeken van de print (hart 2 van beide randen)
  const SP = M.schroefpaal, paaltjes = [];
  for (const rij of rijen) for (const d of rij) {
    if (d.soort !== 'bordje') continue;
    for (const kx of [-1, 1]) for (const kz of [-1, 1]) paaltjes.push({ nr: d.nr, x: d.cx + kx * (B.x / 2 - SP.rand), z: d.cz + kz * (B.z / 2 - SP.rand) });
  }
  const xz = X - G.zij / 2;
  // de linkerhelft: 2 sleutelgaten links, 2 bussen in de linkerhoeken (de rest in de rechterhelft)
  const sleutelgaten = [[-xz, ringen[0].cz], [-xz, ringen[5].cz]];
  const bussen = [[-(X - D.bus.hart), -(Z - D.bus.hart)], [-(X - D.bus.hart), Z - D.bus.hart]];
  return { tules, bodem, sleutelgaten, bussen, paaltjes };
}

/** de 4 sleutelgaten (het grote gat): 2 in de linkerhelft, 2 in de rechterhelft */
export function bevestigingsGaten() { return [...indeling().sleutelgaten, ...rechts().sleutelgaten]; }
/** de 6 schroefbussen voor het deksel: 2 links, 2 in de pilaren aan de naad, 2 rechts */
export function alleBussen() { return [...indeling().bussen, ...rechts().bussen]; }
const acht = (x, z, r) => Array.from({ length: 8 }, (_, i) => { const a = Math.PI / 8 + (i * Math.PI) / 4, R = r / Math.cos(Math.PI / 8); return [x + R * Math.cos(a), z + R * Math.sin(a)]; });

// ---------------------------------------------------------------- de rechterhelft en de naad
let cacheR;
/** de rechterhelft: buitenmaat, pilaren, klikhaken met hun nok, bodemlippen, tules, sleutelgaten, bussen,
 *  de opening voor de USB */
export function rechts() {
  if (cacheR) return cacheR;
  const L = indeling(), N = M.naad, D = M.doos, R = M.rechts, H = N.haak, Z = L.Z, ZB = Z + D.wand;
  const xs = L.xn, XR = R.x1, XRB = XR + D.wand;
  const pilaren = [[xs, -Z, xs + N.pilaar.l, -Z + N.pilaar.d], [xs, Z - N.pilaar.d, xs + N.pilaar.l, Z]];
  const bussen = [[xs + 5.3, -(Z - D.bus.hart)], [xs + 5.3, Z - D.bus.hart], [XR - D.bus.hart, -(Z - D.bus.hart)], [XR - D.bus.hart, Z - D.bus.hart]];
  // klikhaken: het zijprofiel (x, y) met de 45°-onderkant, de wandkant op z = k (Z - spleet); de nok (bovenaanzicht,
  // schuine kant naar de punt) op de wandkant van y0 tot y1; het kuiltje in de wand van de linkerhelft
  const tip = xs - H.l, haken = [-1, 1].map((k) => {
    const zw = k * (Z - N.spleet), zb = zw - k * H.t;
    const prof = [[xs + 2, 0], [xs + 2, H.top], [tip, H.top], [tip, N.spleet + H.l], [xs, N.spleet], [xs, 0]];
    const zn = k * (Z + H.nok.d - N.spleet);
    const nok = [[tip, zw - k * 0.1], [tip, zw], [tip + H.nok.ramp, zn], [tip + H.nok.l, zn], [tip + H.nok.l, zw - k * 0.1]];
    const kuil = k < 0 ? [tip - 0.3, -Z - H.kuil, tip + H.nok.l + 0.3, -Z + 0.1] : [tip - 0.3, Z - 0.1, tip + H.nok.l + 0.3, Z + H.kuil];
    return { k, z0: Math.min(zw, zb), z1: Math.max(zw, zb), prof, nok, kuil };
  });
  // bodemlippen van de rechterhelft (in de uitsparingen van de linkerhelft, 0,3 rondom: Fable 5.2 D1)
  const lippen = N.lip.z.map((z) => [xs - N.lip.l, z - N.lip.b / 2, xs + 1, z + N.lip.b / 2]);
  const ls = N.lip.speling, uitsparingen = N.lip.z.map((z) => [xs - N.lip.l - ls, z - N.lip.b / 2 - ls, N.x + 1, z + N.lip.b / 2 + ls]);
  const T = R.tules, yi = D.invoer.y;
  const tules = [...T.voor.map((c) => ({ wand: 'voor', c })), ...T.achter.map((c) => ({ wand: 'achter', c })), ...T.rechts.map((c) => ({ wand: 'rechts', c }))];
  const sleutelgaten = R.sleutelgatZ.map((z) => [R.sleutelgatX, z]);
  const u = espUsb();
  cacheR = { xs, XR, XRB, Z, ZB, pilaren, bussen, haken, lippen, uitsparingen, tules, yi, sleutelgaten, usb: { x0: u.x0, x1: u.x1, y0: u.y - 5.5, y1: u.y + 5.5 } };
  return cacheR;
}

/** de klik van een haak (PETG, E = 2100 MPa): een uitkragende balk met lengte l en dikte t; door de 45°-onderkant groeit
 *  de hoogte van b0 aan de punt tot b0 + l aan de voet. Doorbuiging d (de nok) aan de punt: F = d E t³ / (12 J) met
 *  J = ∫ x² / (b0 + x) dx van 0 tot l; rek aan de voet = 6 F l / ((b0 + l) t² E). Inklikken over de schuine kant van de
 *  nok (atan(nok / ramp)) met wrijving 0,3: P = F (µ + tan a) / (1 - µ tan a) */
export function haakKlik() {
  const N = M.naad, H = N.haak, E = 2100, l = H.l, t = H.t, d = H.nok.d, b0 = H.top - (N.spleet + l), mu = 0.3;
  const J = (l * l) / 2 - b0 * l + b0 * b0 * Math.log((b0 + l) / b0), F = (d * E * t ** 3) / (12 * J), rek = (6 * F * l) / ((b0 + l) * t * t * E);
  const ta = d / H.nok.ramp, P = (F * (mu + ta)) / (1 - mu * ta);
  return { l, t, d, b0, bVoet: b0 + l, F, rek, hoek: (Math.atan(ta) * 180) / Math.PI, inklik: P, rekRecht: (1.5 * t * d) / (l * l) };
}
/** de klik van het deksel: elke vinger van de lip (1,4 dik, 12 lang) buigt de nokhoogte min de spleet door */
export function dekselKlik() {
  const Nd = M.naad.deksel, E = 2100, t = Nd.lip, l = Nd.lap, d = Nd.nok.h - M.naad.spleet, s = Nd.sleuven, mu = 0.3;
  const vingers = s.slice(0, -1).map((a, i) => s[i + 1] - a - Nd.sleuf);
  const F = vingers.map((b) => (3 * E * ((b * t ** 3) / 12) * d) / l ** 3), ta = Nd.nok.h / Nd.nok.ramp;
  return { t, l, d, vingers, F, rek: (1.5 * t * d) / (l * l), inklik: (F.reduce((a, q) => a + q, 0) * (mu + ta)) / (1 - mu * ta), hoek: (Math.atan(ta) * 180) / Math.PI };
}

// ---------------------------------------------------------------- de linkerhelft (bordjes)
/** de linkerhelft van de bak (rechtop geprint: de bodem op het bed). Volgorde: eerst de sneden in wanden en bodem terwijl
 *  de bak nog eenvoudig is, dan de steunrails, de schroefpaaltjes en de bussen met hun schroefgaten: elke bewerking kost
 *  meer naarmate het lichaam meer driehoeken heeft (de mesh-kernel) */
export function bakLinks() {
  const L = indeling(), D = M.doos, N = M.naad, w = D.wand, { X, Z } = L, XB = X + w, ZB = Z + w;
  const o = deel('Kabeldoos (bak links)', PETG);
  o.schets(yv(-D.bodem, 'Plane onderkant bodem'), (s) => hoekRechthoek(s, -XB, -ZB, N.x, ZB, [D.r, 0, 0, D.r]));
  o.extrude('boss', D.bodem + D.h, { naam: 'Blok' });
  o.schets(yv(D.h, 'Plane bovenrand'), (s) => hoekRechthoek(s, -X, -Z, N.x + 1, Z, [1.6, 0, 0, 1.6]));
  o.extrude('cut', D.h, { omkeren: true, naam: 'Binnenruimte' });
  // de kuiltjes voor de nokken van de klikhaken van de rechterhelft (in de achter- en de voorwand, 0,8 diep)
  const H = N.haak;
  snede(o, H.nok.y1 + 0.4, H.nok.y1 - H.nok.y0 + 0.8, rechts().haken.map((h) => h.kuil), 'Kuiltjes klikhaken');
  // kabelinvoeren: ronde gaten Ø16,5 voor een membraantule Wiska EMT 16 (M16, wand 2 tot 9,5, kabels 1 tot 9 mm, IP66)
  const yi = D.invoer.y, ri = D.invoer.gat / 2;
  o.schets(xv(-XB, 'Plane kabelinvoer links', -1), (s) => L.tules.filter((t) => t.wand === 'links').forEach((t) => s.cirkelW([-XB, yi, t.c], ri)));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Kabelinvoer links' });
  o.schets(zv(ZB, 'Plane kabelinvoer voor'), (s) => L.tules.filter((t) => t.wand === 'voor').forEach((t) => s.cirkelW([t.c, yi, ZB], ri)));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Kabelinvoer voor' });
  sleutelgatenOp(o, L.sleutelgaten);
  // draadsleuven tussen de rijen en de uitsparingen voor de bodemlippen van de rechterhelft (één snede)
  snede(o, 0.01, D.bodem + 1, [...L.bodem, ...rechts().uitsparingen, ...oogjesIn('links').flatMap(oogSleuven)], 'Draadsleuven, uitsparingen naad en oogjes');
  kanalenOogjes(o, 'links');
  // steunrails onder het midden van de bordjes (de print buigt niet door als je een klem aandraait)
  const rails = L.rijen.slice(0, 6).map((rij) => { const bs = rij.filter((d) => d.soort === 'bordje'); return [Math.min(...bs.map((d) => d.cx)) - M.bordje.x / 2 + 1, rij[0].cz - 3, Math.max(...bs.map((d) => d.cx)) + M.bordje.x / 2 - 1, rij[0].cz + 3]; });
  o.schets(yv(-0.5, 'Plane steunrails'), (s) => rails.forEach(([x0, z0, x1, z1]) => s.rrectW([x0, 0, z0], [x1, 0, z1], 1)));
  o.extrude('boss', M.voet + 0.5, { naam: 'Steunrails' });
  // versie 6 fase B: de palen van de IR-driver, de AOD4184 en de MCP23017 (ook voor de optionele tweede) naast bordje 16
  // (vroeg in de boom: elke latere bewerking kost meer)
  const gl = gatenIn('links'), pr = M.rechts.modulePaal;
  cirkels(o, -0.5, pr.h + 0.5, gl.map(([x, z]) => [x, z, pr.r]), 'Palen modules');
  // de schroefpaaltjes van de bordjes (Ø5, tot onder de print) en de schroefbussen van het deksel (Ø7)
  const SP = M.schroefpaal;
  cirkels(o, -0.5, M.voet + 0.5, L.paaltjes.map((p) => [p.x, p.z, SP.d / 2]), 'Schroefpaaltjes bordjes');
  cirkels(o, -0.5, D.h + 0.5, L.bussen.map(([x, z]) => [x, z, D.bus.r]), 'Schroefbussen');
  // de voorgaten als achthoek (de vlakken op de maat: daar tapt de schroef; een printer maakt een klein gat toch hoekig):
  // een achthoek kost de kernel veel minder dan een cirkel. Voorgaten van de bordjes en van de modules in één snede van
  // de bovenkant van de modulepalen tot 0,4 boven de onderkant van de bodem (boven de lagere paaltjes snijdt ze lucht)
  veelhoeken(o, pr.h, pr.h + D.bodem - 0.4, [...L.paaltjes.map((p) => acht(p.x, p.z, SP.voorgat / 2)), ...gl.map(([x, z, d]) => acht(x, z, d < 2.8 ? 1.1 : 1.3))], 'Voorgaten bordjes en modules', 'cut');
  veelhoeken(o, D.h, D.h + D.bodem - 0.4, L.bussen.map(([x, z]) => acht(x, z, 1.3)), 'Schroefgaten', 'cut');
  return o.doc();
}
/** de houder van de IR-leerontvanger (versie 6 fase B): een blokje tegen de voorwand met een vakje (van boven open) waar
 *  de TSMP58000 met zijn lens naar het venstertje in staat; het venster Ø6 met een punt van 45° bovenaan (zonder support) */
export function tsmpHouder() {
  const T = M.tsmp, Z = M.doos.binnen / 2, [bx, bz] = T.blok, [vx, vz] = T.vak, h = T.lichaam[1];
  const vloer = T.y - h / 2 - 0.2, top = T.y + h / 2 + 1.0, r = T.venster / 2;
  const venster = [...Array.from({ length: 13 }, (_, i) => { const a = (Math.PI * 3) / 4 + (i * Math.PI * 1.5) / 12; return [T.x + r * Math.cos(a), T.y + r * Math.sin(a)]; }), [T.x, T.y + r * Math.SQRT2]];
  return { blok: [T.x - bx / 2, Z - bz, T.x + bx / 2, Z + 0.5], vak: [T.x - vx / 2, Z - vz, T.x + vx / 2, Z], vloer, top, venster };
}
/** sleutelgaten in de bodem (bolkopschroef 4 x 20 half in de baan, de doos over de koppen, 6 mm naar achteren schuiven:
 *  de sleuf loopt naar voren) */
function sleutelgatenOp(o, gaten) {
  const D = M.doos, SG = D.sleutelgat;
  o.schets(yv(0.01, 'Plane sleutelgaten'), (s) => gaten.forEach(([x, z]) => s.cirkelW([x, 0, z], SG.kop / 2)));
  o.extrude('cut', D.bodem + 1, { omkeren: true, naam: 'Sleutelgaten (kop)' });
  o.schets(yv(0.01, 'Plane sleutelgaten sleuf'), (s) => gaten.forEach(([x, z]) => s.rrectW([x - SG.schacht / 2, 0, z], [x + SG.schacht / 2, 0, z + SG.slag + SG.schacht / 2], SG.schacht / 2 - 0.01)));
  o.extrude('cut', D.bodem + 1, { omkeren: true, naam: 'Sleutelgaten (sleuf)' });
}

// ---------------------------------------------------------------- de rechterhelft (modules)
/** de klikhouders van de WAGO-klemmen: per rij van 3 klemmen een U (1,2 dik, 5 hoog) om 3 kanten, open aan de kant van de
 *  draden (+z); de klemmen staan met 0,4 vrij naast elkaar en klemmen tussen de eindwanden */
export function wagoHouders() {
  const uit = [], t = 1.2, c = 0.2, rijen = new Map();
  for (const ref of Object.keys(MODULES).filter((r) => MODULES[r].wago)) {
    const v = voetafdruk(ref), k = v[1].toFixed(2), r = rijen.get(k) ?? [Infinity, v[1], -Infinity, v[3]];
    rijen.set(k, [Math.min(r[0], v[0]), v[1], Math.max(r[2], v[2]), v[3]]);
  }
  for (const [x0, z0, x1, z1] of rijen.values()) {
    const xa = x0 - c - t, xb = x0 - c, xc = x1 + c, xd = x1 + c + t, za = z0 - c - t, zb = z0 - c, ze = z1 - 4;
    uit.push([[xa, za], [xd, za], [xd, ze], [xc, ze], [xc, zb], [xb, zb], [xb, ze], [xa, ze]]);
  }
  return uit;
}
/** de rechterhelft van de bak (rechtop geprint, de bodem op het bed): bodem en 3 wanden (aan de naad open), de pilaren met
 *  de klikhaken, de bodemlippen, de palen van de modules, de klikhouders van de WAGO-klemmen, de bussen */
export function bakRechts() {
  const P = rechts(), D = M.doos, N = M.naad, H = N.haak, w = D.wand, { xs, XR, XRB, Z, ZB } = P;
  const o = deel('Kabeldoos (bak rechts)', PETG);
  o.schets(yv(-D.bodem, 'Plane onderkant bodem'), (s) => hoekRechthoek(s, xs, -ZB, XRB, ZB, [0, D.r, D.r, 0]));
  o.extrude('boss', D.bodem + D.h, { naam: 'Blok' });
  o.schets(yv(D.h, 'Plane bovenrand'), (s) => hoekRechthoek(s, xs - 1, -Z, XR, Z, [0, 1.6, 1.6, 0]));
  o.extrude('cut', D.h, { omkeren: true, naam: 'Binnenruimte' });
  const yi = P.yi, ri = D.invoer.gat / 2, kant = (k) => P.tules.filter((t) => t.wand === k);
  o.schets(zv(ZB, 'Plane kabelinvoer voor'), (s) => kant('voor').forEach((t) => s.cirkelW([t.c, yi, ZB], ri)));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Kabelinvoer voor' });
  o.schets(zv(-ZB, 'Plane kabelinvoer achter', -1), (s) => kant('achter').forEach((t) => s.cirkelW([t.c, yi, -ZB], ri)));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Kabelinvoer achter' });
  o.schets(xv(XRB, 'Plane kabelinvoer rechts'), (s) => kant('rechts').forEach((t) => s.cirkelW([XRB, yi, t.c], ri)));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Kabelinvoer rechts' });
  // de USB-poorten van de ESP achter een opening in de voorwand (flashen met de doos dicht)
  const u = P.usb;
  o.schets(zv(ZB, 'Plane opening USB'), (s) => s.rrectW([u.x0, u.y0, ZB], [u.x1, u.y1, ZB], 1));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Opening USB' });
  // DC-chassisbus 5,5 x 2,5 in de achterwand, boven de WAGO-klemmen (de adapter houdt zijn stekker: niets doorknippen)
  // en ernaast de 2 zekeringhouders 5 x 20 (Fable 5.2 D9: de zekeringen van buiten te vervangen)
  o.schets(zv(-ZB, 'Plane DC-bus', -1), (s) => { s.cirkelW([M.dcbus.x, M.dcbus.y, -ZB], M.dcbus.gat / 2); M.zekering.x.forEach((x) => s.cirkelW([x, M.zekering.y, -ZB], M.zekering.gat / 2)); });
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Gat DC-bus en zekeringhouders' });
  sleutelgatenOp(o, P.sleutelgaten);
  // de oogjes voor de kabelbinders (Fable 5.2 D2/D8): sleuven door de bodem, kanaal eronder
  snede(o, 0.01, D.bodem + 1, oogjesIn('rechts').flatMap(oogSleuven), 'Sleuven oogjes kabelbinders');
  kanalenOogjes(o, 'rechts');
  // de bodemlippen (op het bed: geen overhang) en de pilaren aan de naad
  o.schets(yv(-D.bodem, 'Plane bodemlippen'), (s) => P.lippen.forEach(([x0, z0, x1, z1]) => s.rrectW([x0, 0, z0], [x1, 0, z1])));
  o.extrude('boss', D.bodem, { naam: 'Bodemlippen naad' });
  o.schets(yv(-0.5, 'Plane pilaren'), (s) => P.pilaren.forEach(([x0, z0, x1, z1]) => s.rrectW([x0, 0, z0 < 0 ? z0 - 0.5 : z0], [x1, 0, z1 > 0 ? z1 + 0.5 : z1])));
  o.extrude('boss', D.h + 0.5, { naam: 'Pilaren naad' });
  // de klikhaken: het zijprofiel met de 45°-onderkant, 1,6 dik; daarop de nok (0,6, schuine kant naar de punt)
  for (const h of P.haken) {
    o.schets(zv(h.z0, `Plane klikhaak ${h.k < 0 ? 'achter' : 'voor'}`), (s) => s.lusW(h.prof.map(([x, y]) => [x, y, h.z0])));
    o.extrude('boss', H.t, { naam: `Klikhaak ${h.k < 0 ? 'achter' : 'voor'}` });
  }
  o.schets(yv(H.nok.y0, 'Plane nokken klikhaken'), (s) => P.haken.forEach((h) => s.lusW(h.nok.map(([x, z]) => [x, H.nok.y0, z]))));
  o.extrude('boss', H.nok.y1 - H.nok.y0, { naam: 'Nokken klikhaken' });
  // de palen van de modules (Ø6, 5 hoog) en de schroefbussen (Ø7 tot het deksel)
  const gaten = gatenIn('rechts'), pr = M.rechts.modulePaal;
  cirkels(o, -0.5, pr.h + 0.5, gaten.map(([x, z]) => [x, z, pr.r]), 'Palen modules');
  cirkels(o, -0.5, D.h + 0.5, P.bussen.map(([x, z]) => [x, z, D.bus.r]), 'Schroefbussen');
  veelhoeken(o, -0.5, 5.5, wagoHouders(), 'Klikhouders WAGO');
  veelhoeken(o, pr.h, pr.h + D.bodem - 0.6, gaten.map(([x, z, d]) => acht(x, z, d < 2.8 ? 1.1 : 1.3)), 'Schroefgaten modules', 'cut');
  veelhoeken(o, D.h, D.h + D.bodem - 0.4, P.bussen.map(([x, z]) => acht(x, z, 1.3)), 'Schroefgaten bussen', 'cut');
  // versie 6 fase B: het venstertje voor de IR-leerontvanger in de voorwand en zijn houder (Ian kan zijn eigen IR-zender
  // ervoor houden, de doos dicht)
  const th = tsmpHouder(), [hx0, hz0, hx1, hz1] = th.blok, [vx0, vz0, vx1, vz1] = th.vak;
  veelhoeken(o, -0.5, th.top + 0.5, [[[hx0, hz0], [hx1, hz0], [hx1, hz1], [hx0, hz1]]], 'Houder IR-leerontvanger');
  veelhoeken(o, th.top + 0.5, th.top + 0.5 - th.vloer, [[[vx0, vz0], [vx1, vz0], [vx1, vz1 + 0.01], [vx0, vz1 + 0.01]]], 'Vak IR-leerontvanger', 'cut');
  // het venster na de houder (anders vult het blokje het venster weer op)
  o.schets(zv(ZB, 'Plane venster IR'), (s) => s.lusW(th.venster.map(([x, y]) => [x, y, ZB])));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Venster IR-leerontvanger' });
  return o.doc();
}

// ---------------------------------------------------------------- het deksel (2 helften)
/** de nokken van de lip van het deksel: per vinger (tussen de sleuven) één nok van 20 breed in het midden: [z0, z1]; de
 *  stukjes boven de wanden (buiten de buitenste sleuven) hebben er geen (ze liggen op de wand) */
export function dekselNokken() {
  const Nd = M.naad.deksel, s = Nd.sleuven;
  return s.slice(0, -1).map((a, i) => (a + s[i + 1]) / 2).map((c) => [c - Nd.nok.b / 2, c + Nd.nok.b / 2]);
}
/** de linkerhelft van het deksel (plat geprint, de buitenkant op het bed): plaat 3,2, centreerrand langs links, achter en
 *  voor (valt 1,55 in de bak), aan de naad een sponning (daar 1,6 dik) met 4 groeven voor de nokken van de lip van de
 *  rechterhelft, 2 verzonken gaten */
export function dekselLinks() {
  const L = indeling(), D = M.doos, Nd = M.naad.deksel, { X, Z } = L, XB = X + D.wand, ZB = Z + D.wand, y0 = D.h, xt = Nd.x - Nd.lap;
  const o = deel('Kabeldoos (deksel links)', PETG_DEKSEL);
  o.schets(yv(y0, 'Plane deksel'), (s) => hoekRechthoek(s, -XB, -ZB, Nd.x, ZB, [D.r, 0, 0, D.r]));
  o.extrude('boss', D.deksel, { naam: 'Plaat' });
  // de centreerrand: een U langs links, achter en voor (aan de naad niet: daar ligt de lip van de rechterhelft)
  const xe = xt - 0.5, a = 0.3, b = 2.3;
  o.schets(yv(y0 + 0.05, 'Plane rand'), (s) => s.lusW([[-X + a, -Z + a], [xe, -Z + a], [xe, -Z + b], [-X + b, -Z + b], [-X + b, Z - b], [xe, Z - b], [xe, Z - a], [-X + a, Z - a]].map(([x, z]) => [x, y0 + 0.05, z])));
  o.extrude('boss', 1.55, { omkeren: true, naam: 'Centreerrand' });
  snede(o, y0 + 0.05, 1.6, L.bussen.map(([x, z]) => [x - 4.6, z - 4.6, x + 4.6, z + 4.6, 4.6]), 'Ruimte bussen');
  // de sponning aan de naad: de binnenste 1,6 weg over 12,2 (de lip van 1,4 met 0,2 lijmspleet), de groeven voor de nokken
  o.schets(yv(y0 + D.deksel - Nd.buiten, 'Plane sponning'), (s) => s.rrectW([xt - M.naad.spleet, 0, -ZB - 1], [Nd.x + 1, 0, ZB + 1]));
  o.extrude('cut', D.deksel - Nd.buiten + 0.1, { omkeren: true, naam: 'Sponning naad' });
  snede(o, y0 + D.deksel - Nd.buiten + Nd.groef, Nd.groef + 0.05, dekselNokken().map(([z0, z1]) => [xt, z0 - 1, xt + 0.2 + Nd.nok.l + 0.3, z1 + 1]), 'Groeven kliklip');
  cirkels(o, y0 + D.deksel, D.deksel + 1, L.bussen.map(([x, z]) => [x, z, 1.6]), 'Gaten', 'cut');
  o.schets(yv(y0 + D.deksel, 'Plane verzinking'), (s) => L.bussen.forEach(([x, z]) => s.cirkelW([x, 0, z], 3.1)));
  o.extrude('cut', 1.5, { omkeren: true, naam: 'Verzinking', draft: 45 });
  return o.doc();
}
/** de rechterhelft van het deksel (plat geprint, de BINNENKANT op het bed: zo ligt de lip op het bed): plaat 3,2, aan de
 *  naad een lip van 12 x 1,4 onder de linkerhelft, in vingers gesneden, met een nok per vinger; 4 verzonken gaten */
export function dekselRechts() {
  const P = rechts(), D = M.doos, Nd = M.naad.deksel, { XRB, ZB } = P, y0 = D.h, xt = Nd.x - Nd.lap, yl = y0 + Nd.lip;
  const o = deel('Kabeldoos (deksel rechts)', PETG_DEKSEL);
  o.schets(yv(y0, 'Plane deksel'), (s) => hoekRechthoek(s, Nd.x, -ZB, XRB, ZB, [0, D.r, D.r, 0]));
  o.extrude('boss', D.deksel, { naam: 'Plaat' });
  o.schets(yv(y0, 'Plane lip'), (s) => s.rrectW([xt, 0, -ZB], [Nd.x + 0.5, 0, ZB]));
  o.extrude('boss', Nd.lip, { naam: 'Lip naad' });
  // de nok over de hele breedte (zijprofiel: schuine kant naar de punt, recht aan de kant van de plaat), daarna alles
  // tussen de nokken weg
  const x0 = xt + 0.2, n = Nd.nok;
  o.schets(zv(-ZB, 'Plane nok lip'), (s) => s.lusW([[x0, yl - 0.05], [x0 + n.l, yl - 0.05], [x0 + n.l, yl + n.h], [x0 + n.ramp, yl + n.h], [x0, yl]].map(([x, y]) => [x, y, -ZB])));
  o.extrude('boss', 2 * ZB, { naam: 'Nok lip' });
  const vrij = [];
  let z = -ZB - 1;
  for (const [a, e] of dekselNokken()) { vrij.push([xt - 0.5, z, x0 + n.l + 0.5, a]); z = e; }
  vrij.push([xt - 0.5, z, x0 + n.l + 0.5, ZB + 1]);
  snede(o, yl + n.h + 0.1, n.h + 0.15, vrij, 'Nokken lip');
  // de sleuven tussen de vingers (door de lip, tot de plaat)
  snede(o, yl + 0.01, Nd.lip + 0.1, Nd.sleuven.map((c) => [xt - 1, c - Nd.sleuf / 2, Nd.x, c + Nd.sleuf / 2]), 'Sleuven lip');
  cirkels(o, y0 + D.deksel, D.deksel + 1, P.bussen.map(([x, z]) => [x, z, 1.6]), 'Gaten', 'cut');
  o.schets(yv(y0 + D.deksel, 'Plane verzinking'), (s) => P.bussen.forEach(([x, z]) => s.cirkelW([x, 0, z], 3.1)));
  o.extrude('cut', 1.5, { omkeren: true, naam: 'Verzinking', draft: 45 });
  return o.doc();
}

// ---------------------------------------------------------------- assemblage
export function kabeldoos() {
  const L = indeling(), P = rechts(), comps = [], D = M.doos, B = M.bordje, { X, Z } = L, XB = X + D.wand, ZB = Z + D.wand;
  const at = (id, naam, doc, p, rot) => comps.push(component(id, naam, doc, p, rot ? { rotation: rot } : {}));
  // de 2 helften van de bak (d1 links, d3 rechts) en van het deksel (d2 links, d4 rechts)
  at('d1', 'Kabeldoos (bak links)<1>', bakLinks(), [0, 0, 0]);
  at('d3', 'Kabeldoos (bak rechts)<1>', bakRechts(), [0, 0, 0]);
  at('d2', 'Kabeldoos (deksel links)<1>', dekselLinks(), [0, 0, 0]);
  at('d4', 'Kabeldoos (deksel rechts)<1>', dekselRechts(), [0, 0, 0]);
  // de 16 bordjes: print, 2 klemstroken van 16 (draadingang naar buiten), 2 eindklemmen (5,0, 2-polig), 16 weerstanden
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
    }
  }
  // alle modules op hun palen (opbouw.mjs; versie 6 fase B ook in de linkerhelft)
  modulesOp(at);
  // de IR-leerontvanger in zijn houder achter het venstertje (de pootjes naar boven, dupont van boven)
  const th = tsmpHouder(), [tb, tp] = tsmp58000();
  at('ir1', 'IR-leerontvanger TSMP58000 -B1<1>', tb, [M.tsmp.x, th.vloer, Z - 0.05]);
  at('ir2', 'Pootjes TSMP58000<1>', tp, [M.tsmp.x, th.vloer, Z - 0.05]);
  // de bordjes vastgeschroefd: 4 plaatschroeven 2,0 x 6 bolkop per bordje (de kern Ø1,5 in het voorgat Ø1,6)
  const SPS = M.schroefpaal.schroef, schroefB = bolkopSchroef('Plaatschroef 2,0 x 6 bolkop (kunststof)', SPS.d, SPS.kop, SPS.kern, SPS.l);
  L.paaltjes.forEach((p, i) => at(`bs${i + 1}`, `Plaatschroef 2,0 x 6 bolkop<${i + 1}>`, schroefB, [p.x, M.voet + B.pcb, p.z]));
  // de DC-bus in de achterwand van de rechterhelft, de membraantules (flens buiten, langs de normaal van de wand naar buiten)
  at('w1', 'DC-chassisbus 5,5 x 2,5<1>', dcBus(), [M.dcbus.x, M.dcbus.y, -ZB], draaiY(90));
  const zh = zekeringhouder();
  M.zekering.x.forEach((x, i) => at(`f${i + 1}`, `Zekeringhouder 5 x 20 ${i ? '-F19 (3,15 A)' : '-F1 (8 A)'}<${i + 1}>`, zh, [x, M.zekering.y, -ZB], draaiY(90)));
  const tl = tule(), yi = D.invoer.y;
  [...L.tules, ...P.tules].forEach((t, i) => {
    const p = { links: [-XB, yi, t.c], rechts: [P.XRB, yi, t.c], voor: [t.c, yi, ZB], achter: [t.c, yi, -ZB] }[t.wand];
    const r = { links: draaiY(180), rechts: undefined, voor: draaiY(-90), achter: draaiY(90) }[t.wand];
    at(`t${i + 1}`, `Membraantule EMT 16<${i + 1}>`, tl, p, r);
  });
  // deksel: 6 verzonken schroeven; ophangen: 4 bolkopschroeven in de vergrendelde stand (aan het eind van de sleuf)
  const kop3 = schroefVerzonken('Plaatschroef 3 x 12 verzonken', 3, 2.4, 12), hout = bolkopSchroef('Bolkopschroef 4 x 20 (hout)', 4, 8, 2.8, 20);
  alleBussen().forEach(([x, z], i) => at(`sd${i + 1}`, `Plaatschroef 3 x 12 verzonken<${i + 1}>`, kop3, [x, D.h + D.deksel, z]));
  bevestigingsGaten().forEach(([x, z], i) => at(`sv${i + 1}`, `Bolkopschroef 4 x 20<${i + 1}>`, hout, [x, 0, z + D.sleutelgat.slag]));
  return { format: 'phlippo-cad', version: 1, name: 'Kabeldoos treinverlichting', units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components: comps, mates: [] };
}

export const ONDERDELEN = {
  'Kabeldoos-bak-links.kcad': bakLinks,
  'Kabeldoos-bak-rechts.kcad': bakRechts,
  'Kabeldoos-deksel-links.kcad': dekselLinks,
  'Kabeldoos-deksel-rechts.kcad': dekselRechts,
  'Bordje-PCB.kcad': bordjePcb,
  'Hulpstukken.kcad': hulpstukkenPlaat,
  // Fable 5.2 D1: eerst dit proefstuk printen (± 20 minuten) en de krimp compenseren, dan de helften
  'Proefstuk.kcad': proefstuk,
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const schrijf = (naam, doc) => writeFileSync(join(HERE, naam), JSON.stringify(doc, null, 1) + '\n');
  // versie 4 had één bak, één deksel, een moduleplaat en gootdeksels (versie 5 heeft geen kabelgoten meer)
  for (const oud of ['Kabeldoos-bak.kcad', 'Kabeldoos-deksel.kcad', 'Moduleplaat.kcad', 'Gootdeksels-plaat.kcad', 'Gootdeksel.kcad', 'print/Kabeldoos-bak.stl', 'print/Kabeldoos-deksel.stl', 'print/Moduleplaat.stl', 'print/Gootdeksels-plaat.stl']) if (existsSync(join(HERE, oud))) unlinkSync(join(HERE, oud));
  for (const [naam, f] of Object.entries(ONDERDELEN)) schrijf(naam, f());
  schrijf('Kabeldoos.kcad', kabeldoos());
  const L = indeling(), D = M.doos;
  const P = rechts(), N = M.naad, h = haakKlik(), k = dekselKlik();
  console.log(`doos: buiten ${(P.XRB + L.X + D.wand).toFixed(1)} x ${(2 * (L.Z + D.wand)).toFixed(1)} x ${(D.bodem + D.h + D.deksel).toFixed(1)} met deksel, binnen ${D.h} hoog; linkerhelft ${(N.x + L.X + D.wand).toFixed(1)}, rechterhelft ${(P.XRB - (P.xs - N.haak.l)).toFixed(1)} (met de haken); deksel links ${(N.deksel.x + L.X + D.wand).toFixed(1)}, rechts ${(P.XRB - (N.deksel.x - N.deksel.lap)).toFixed(1)}`);
  console.log(`klikhaak: rek ${(h.rek * 100).toFixed(2)} % (recht gerekend ${(h.rekRecht * 100).toFixed(2)} %), veerkracht ${h.F.toFixed(1)} N, inklikken ${h.inklik.toFixed(1)} N per haak (nok ${h.hoek.toFixed(0)} graden); dekselvinger: rek ${(k.rek * 100).toFixed(2)} %, samen ${k.inklik.toFixed(0)} N`);
}
