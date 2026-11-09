// Robotarm die deuren van een lopende band neemt (Ian, 2026-11-09; eisen in EISEN.md).
// Een industriële 6-assige knikarmrobot in de klasse 120 kg / 2,7 m (zoals de gangbare palletiseer- en handlingrobots):
// A1 draaivoet, A2 schouder, A3 elleboog, A4-A5-A6 een centrale pols; gewichtscompensatie op A2 met een
// hydropneumatische cilinder; de motoren van de pols achter op de elleboog als tegengewicht. Toolflens ISO 9409-1-A125.
// Maakwijze: armdelen als lasconstructie uit lasergesneden S355-plaat (zijplaten met de omtrek hieronder, gezet
// omtrekband), gestraald en gepoedercoat; draaiende verbindingen via cycloïdale reductoren met holle as.
// Assen (rust-stand): +Y omhoog, de arm in het XY-vlak; A1 om Y, A2/A3/A5 om Z, A4/A6 langs de arm.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Onderdeel, component, vlak } from '../lib/schets.mjs';
import { typenaam, asLabel, waarschuwing, typeplaat } from './opschriften.mjs';
import { Plaat } from '../lib/printplaat.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- maten (mm)
export const M = {
  a1: 350, d1: 675, // A2 ligt 350 voor en 675 boven A1
  a2: 1150, // A2 -> A3
  a3: 120, // A3 -> as van de onderarm (naar boven)
  d4: 1200, // A3 -> polsmidden langs de onderarm
  d6: 215, // polsmidden -> toolflens
  flens: { d: 160, pcd: 125, gaten: 6, centr: 80 }, // ISO 9409-1-A125: 6 x M10 op Ø125, centreerboring Ø80 H7
  band: { hoogte: 800, breed: 1200, lang: 7800, x: 1950 }, // rollenbaan langs Z, de deur ligt plat
  deur: { l: 2115, b: 1015, d: 54 },
  stopZ: 1050, // stopper tussen twee rollen (hart op 975 en 1125): de voorkant van het stuk ligt hier, de grijpplaats
  // veiligheidshek (EN ISO 14120 / 13857): 2000 hoog, palen RAL 1003, panelen met gaas; de band loopt door twee
  // openingen met lichtschermen (muting); toegangsdeur met vergrendeling achteraan
  hek: { x0: -2000, x1: 3400, z0: -3500, z1: 3500, h: 2000, veld: 1350 },
};

// ---------------------------------------------------------------- materialen en kleuren
const ROBOT = { name: 'S355, gelast en gepoedercoat (RAL 2004 zuiver oranje)', density: 7850, color: '#e8641b' };
const ANTRACIET = { name: 'S355, gepoedercoat (RAL 7016 antracietgrijs)', density: 7850, color: '#33383d' };
const MOTOR = { name: 'servomotor (zwart)', density: 5000, color: '#17191b' };
const ALU = { name: 'aluminium, blank geanodiseerd', density: 2700, color: '#c3c7cc' };
const STAAL = { name: 'staal, verzinkt', density: 7850, color: '#a9adb2' };
const CHROOM = { name: 'staal, hardverchroomd', density: 7850, color: '#dfe3e6' };
const RUBBER = { name: 'NBR, zwart', density: 1200, color: '#1b1c1e' };
const DEUR = { name: 'deur, HPL wit (EI30, 60 kg)', density: 520, color: '#ecebe6' };
const BAND = { name: 'S235, gepoedercoat (RAL 5010 gentiaanblauw)', density: 7850, color: '#1f4e8c' };
const ROL = { name: 'staal, verzinkt (rol)', density: 7850, color: '#b8bcc0' };

// ---------------------------------------------------------------- hulpjes
let tel = 0;
const zv = (z, naam) => vlak(`z${++tel}`, naam ?? `Plane ${tel}`, [0, 0, z], [0, 0, 1], 'reference');
const xv = (x, naam) => vlak(`x${++tel}`, naam ?? `Plane ${tel}`, [x, 0, 0], [1, 0, 0], 'reference');
const yv = (y, naam) => vlak(`y${++tel}`, naam ?? `Plane ${tel}`, [0, y, 0], [0, 1, 0], 'reference');
const deel = (naam, mat) => new Onderdeel(naam, mat);
const met = (doc, ...decals) => ({ ...doc, decals });
/** profiel in het XY-vlak (pad met lijnen en bogen), symmetrisch geëxtrudeerd over breedte b langs Z */
function profielZ(o, items, b, naam, op = 'boss') {
  o.schets(zv(-b / 2, `Plane ${naam}`), (s) => s.pad(items));
  o.extrude(op, b, { naam });
  return o;
}
/** omwentelingslichaam om de lokale Y-as (profiel [r, y] met r >= 0) */
function draaiY(o, rys, naam) {
  o.schets(zv(0, `Plane ${naam}`), (s) => { s.lus(rys.map(([r, y]) => [r, y])); o._as = s.as(0, Math.min(...rys.map((p) => p[1])) - 10, 0, Math.max(...rys.map((p) => p[1])) + 10); });
  o.revolve('boss', o._as, 360, { naam });
  return o;
}
/** omwentelingslichaam om de lokale X-as (profiel [x, r]) */
function draaiX(o, xrs, naam) {
  o.schets(zv(0, `Plane ${naam}`), (s) => { s.lus(xrs.map(([x, r]) => [x, r])); o._as = s.as(Math.min(...xrs.map((p) => p[0])) - 10, 0, Math.max(...xrs.map((p) => p[0])) + 10, 0); });
  o.revolve('boss', o._as, 360, { naam });
  return o;
}
/** cilinder langs Z (midden x, y; van z0 tot z1) */
function cilZ(o, x, y, r, z0, z1, naam, op = 'boss') {
  o.schets(zv(z0, `Plane ${naam}`), (s) => s.cirkel(x, y, r));
  o.extrude(op, z1 - z0, { naam });
  return o;
}
/** blok (x0,y0,z0)-(x1,y1,z1), afgeronde hoeken r in het XZ-vlak */
function blok(o, [x0, y0, z0, x1, y1, z1], naam, r = 0) {
  o.schets(yv(y0, `Plane ${naam}`), (s) => s.rrectW([x0, y0, z0], [x1, y0, z1], r));
  o.extrude('boss', y1 - y0, { naam });
  return o;
}

// ---------------------------------------------------------------- de robot
/** voet (vast): vloerplaat met 8 ankergaten M20, gegoten-ogende sokkel, A1-reductor bovenin */
export function voet() {
  const o = deel('Voet (A1)', ANTRACIET);
  blok(o, [-475, 0, -475, 475, 40, 475], 'Vloerplaat', 40);
  o.schets(yv(40, 'Plane ankergaten'), (s) => { for (const [x, z] of [[-410, -410], [410, -410], [-410, 410], [410, 410], [0, -425], [0, 425], [-425, 0], [425, 0]]) s.cirkelW([x, 40, z], 11); });
  o.extrude('cut', 40, { omkeren: true, naam: 'Ankergaten M20' });
  draaiY(o, [[0, 39], [390, 39], [390, 75], [345, 110], [320, 330], [330, 360], [330, 395], [0, 395]], 'Sokkel');
  // A1-motor: liggend achteraan, in een uitbouw
  blok(o, [-470, 120, -120, -300, 330, 120], 'Motoruitbouw A1', 30);
  return met(o.doc(), typeplaat().decal('dc1', 'Typeplaatje', [-470, 225, 0], { normaal: [-1, 0, 0] }));
}
export function motorA1() {
  const o = deel('Servomotor A1 (2,9 kW, rem)', MOTOR);
  draaiX(o, [[-710, 0], [-710, 85], [-700, 95], [-470, 95], [-470, 0]], 'Motor');
  return o.doc();
}
/** draaistuk (A1): draaikrans Ø660 en het schouderblok met de lagering van A2; A2 ligt op (a1, d1) */
export function draaistuk() {
  const { a1, d1 } = M, o = deel('Draaistuk (A1-A2)', ROBOT);
  draaiY(o, [[0, 395], [325, 395], [325, 440], [300, 470], [0, 470]], 'Draaikrans');
  // schouder als vork: twee wangen (z 160 tot 260) met een ronde kop om A2 (R 238), de bovenarm draait ertussen
  const R = 238, kop = [[-300, 460], [a1 - 60, d1 - Math.sqrt(R * R - 60 * 60)], { boog: [a1, d1], naar: [a1 + 230, d1 - Math.sqrt(R * R - 230 * 230)] }, { boog: [a1, d1], naar: [a1 - 120, d1 + Math.sqrt(R * R - 120 * 120)] }, [-180, 700], { boog: [-180, 560], naar: [-320, 560] }, [-300, 460]];
  for (const z of [-260, 160]) { o.schets(zv(z, 'Plane schouderwang'), (s) => s.pad(kop)); o.extrude('boss', 100, { naam: 'Schouderwang' }); }
  // achterblok tussen de wangen (achter de bovenarm) met het oog van de compensatie
  o.schets(zv(-160, 'Plane achterblok'), (s) => s.rrect(-320, 460, -130, 760, 40));
  o.extrude('boss', 320, { naam: 'Achterblok' });
  // lagerhuis A2 aan de buitenkant van de rechterwang
  cilZ(o, a1, d1, 236, 260, 300, 'Lagerhuis A2');
  // ophangpunt van de gewichtscompensatie (achteraan)
  cilZ(o, -230, 610, 70, -150, 150, 'Oog compensatie');
  return met(o.doc(), asLabel('A1', 120).decal('dc1', 'A1', [80, 600, 260], { normaal: [0, 0, 1] }), waarschuwing('W001', 90).decal('dc2', 'Waarschuwing', [-200, 690, 260], { normaal: [0, 0, 1] }));
}
export function reductorA2() {
  const o = deel('Cycloïdale reductor A2 Nabtesco RV-320C (Ø440, holle as)', ANTRACIET);
  cilZ(o, 0, 0, 220, 300, 401, 'Reductor');
  return o.doc();
}
export function motorA2() {
  const o = deel('Servomotor A2 (2,9 kW, rem)', MOTOR);
  cilZ(o, 0, 0, 105, 401, 741, 'Motor');
  cilZ(o, 0, 0, 80, 741, 781, 'Encoderkap');
  return o.doc();
}
/** bovenarm (A2 -> A3): zijplaten met een taps profiel, kop om A2 (r 235) en om A3 (r 190), breedte 300 */
export function bovenarm() {
  const { a2 } = M, o = deel('Bovenarm (A2-A3)', ROBOT);
  const yv2 = a2 - 230, xv2 = 200 - (30 * yv2) / a2; // tot hier de volle romp, daarboven de vork om de elleboog
  profielZ(o, [[-200, 0], { boog: [0, 0], naar: [200, 0] }, [xv2, yv2], [-xv2, yv2], [-200, 0]], 300, 'Bovenarm');
  for (const z of [-150, 90]) {
    o.schets(zv(z, 'Plane vork'), (s) => s.pad([[-xv2, yv2 - 5], [xv2, yv2 - 5], [170, a2], { boog: [0, a2], naar: [-170, a2] }, [-xv2, yv2 - 5]]));
    o.extrude('boss', 60, { naam: 'Vorkwang' });
  }
  // lagerdeksels A3 aan de buitenkant van de vork, naaf A2 tussen de schouderwangen
  cilZ(o, 0, a2, 150, -175, -150, 'Lagerdeksel A3');
  cilZ(o, 0, a2, 150, 150, 175, 'Lagerdeksel A3');
  cilZ(o, 0, 0, 180, -155, 155, 'Naaf A2');
  cilZ(o, -175, 430, 60, -140, 140, 'Oog compensatie');
  return met(o.doc(), ...typenaam(a2, 300), asLabel('A2').decal('dc3', 'A2', [0, 300, 150], { normaal: [0, 0, 1] }), asLabel('A3').decal('dc4', 'A3', [0, a2 - 300, 150], { normaal: [0, 0, 1] }));
}
/** gewichtscompensatie: hydropneumatische cilinder (huis en zuigerstang), langs +X in eigen assen */
export function compHuis(l) {
  const o = deel('Gewichtscompensatie (cilinder)', ANTRACIET);
  draaiX(o, [[0, 0], [0, 70], [l * 0.62, 70], [l * 0.62, 55], [l * 0.66, 55], [l * 0.66, 0]], 'Cilinder');
  return o.doc();
}
export function compStang(l) {
  const o = deel('Gewichtscompensatie (zuigerstang)', CHROOM);
  draaiX(o, [[l * 0.55, 0], [l * 0.55, 25], [l, 25], [l, 0]], 'Stang');
  return o.doc();
}
/** elleboog (A3): huis om A3 met achteraan de drie polsmotoren als tegengewicht; de onderarm-as op y = a3 */
export function elleboog() {
  const { a3 } = M, o = deel('Elleboog (A3)', ROBOT);
  o.schets(zv(-85, 'Plane ellebooghuis'), (s) => s.rrect(-520, a3 - 150, 260, a3 + 150, 60));
  o.extrude('boss', 170, { naam: 'Ellebooghuis' });
  cilZ(o, 0, 0, 165, -85, 85, 'Naaf A3');
  o._decals = [waarschuwing('W024', 80).decal('dc1', 'Knelgevaar', [-260, a3 + 40, 85], { normaal: [0, 0, 1] }), asLabel('A4', 90).decal('dc2', 'A4', [-120, a3 + 40, 85], { normaal: [0, 0, 1] })];
  // A4-lagerhuis vooraan
  draaiX(o, [[255, 0], [255, 165], [300, 165], [300, 0]], 'Lagerhuis A4');
  return met(o.doc(), ...o._decals);
}
export function motorA3() {
  const o = deel('Servomotor A3 (4,4 kW, rem) op Nabtesco RV-320C', MOTOR);
  cilZ(o, 0, 0, 220, 175, 276, 'Reductor A3 RV-320C (Ø440)');
  cilZ(o, 0, 0, 95, 276, 586, 'Motor');
  return o.doc();
}
/** de drie polsmotoren achteraan (A4, A5, A6), parallel aan de onderarm */
export function polsMotoren() {
  const o = deel('Servomotoren A4-A6 (1,3 kW)', MOTOR), y = M.a3;
  o.schets(xv(-520, 'Plane motoren'), (s) => { for (const [dy, dz] of [[60, -95], [60, 95], [-70, 0]]) s.cirkelW([-520, y + dy, dz], 62); });
  o.extrude('boss', 300, { omkeren: true, naam: 'Motoren' });
  return o.doc();
}
/** onderarm (A4 draait om de eigen X-as): buis van Ø300 naar Ø220, met de vork om het polsmidden op x = d4 */
export function onderarm() {
  const { d4 } = M, o = deel('Onderarm (A4)', ROBOT);
  draaiX(o, [[300, 0], [300, 160], [360, 150], [d4 - 260, 112], [d4 - 230, 112], [d4 - 230, 0]], 'Buis');
  // vork: twee wangen om A5 (z ±115), afgerond om het polsmidden
  for (const z of [-170, 115]) {
    o.schets(zv(z, 'Plane vork'), (s) => s.pad([[d4 - 260, -135], [d4, -135], { boog: [d4, 0], naar: [d4, 135] }, [d4 - 260, 135], [d4 - 260, -135]]));
    o.extrude('boss', 55, { naam: 'Vorkwang' });
  }
  return o.doc();
}
/** pols (A5 om Z in het polsmidden): bol huis met de neus naar de flens */
export function pols() {
  const { d6 } = M, o = deel('Pols (A5)', ROBOT);
  cilZ(o, 0, 0, 126, -114, 114, 'Polshuis (RV-100C voor A5)');
  draaiX(o, [[0, 0], [0, 113], [d6 - 70, 113], [d6 - 25, 112], [d6 - 25, 0]], 'Neus (RV-50C voor A6)');
  return o.doc();
}
/** toolflens ISO 9409-1-A125 (A6): Ø160, 6 gaten M10 op Ø125, centreerboring Ø80 */
export function flens() {
  const F = M.flens, o = deel('Toolflens ISO 9409-1-A125 (A6)', STAAL);
  draaiX(o, [[-25, 0], [-25, F.d / 2], [0, F.d / 2], [0, 0]], 'Flens');
  o.schets(xv(0, 'Plane flensgaten'), (s) => {
    for (let i = 0; i < F.gaten; i++) { const a = (i / F.gaten) * 2 * Math.PI; s.cirkelW([0, (F.pcd / 2) * Math.cos(a), (F.pcd / 2) * Math.sin(a)], 5); }
    s.cirkelW([0, 0, 0], F.centr / 2);
  });
  o.extrude('cut', 12, { omkeren: true, naam: 'Gaten M10 en centrering' });
  return o.doc();
}

// ---------------------------------------------------------------- vlakgrijper (in de assen van de flens: +X = van de flens weg)
// Universeel voor deuren, panelen, plinten en kleine planken (Ian): drie balken naast elkaar, elk een zone met eigen
// vacuüm. Buiten: 2 x Schmalz FA-M (1972 x 130, 3 rijen zuigcellen op 18 mm, schuim 20 mm, zelfsluitende SW-ventielen,
// FA-Mc met ingebouwde ventielen voor vacuüm aan/uit en afblazen); midden: Schmalz FMP-60 (1972 x 60, 1 rij) voor plinten
// en smalle stukken. Een onbedekte cel sluit zichzelf (SW): een klein stuk onder één balk houdt toch vast.
export const BALKEN = [
  { naam: 'FA-M 1972 x 130 (zone 1)', y: -185, b: 130, rijen: 3 },
  { naam: 'FMP-60 1972 x 60 (zone 2)', y: 0, b: 60, rijen: 1 },
  { naam: 'FA-M 1972 x 130 (zone 3)', y: 185, b: 130, rijen: 3 },
];
const VG = { lang: 1972, body: 90, schuim: 20, x0: 60 }; // balk van x0 tot x0 + body, schuim eronder
export const TOOL = VG.x0 + VG.body + VG.schuim; // van de flens tot het schuim (zuigvlak)
export function grijperRaam() {
  const o = deel('Grijperraam (adapter ISO 9409-1-A125, profiel 80 x 40)', ALU);
  draaiX(o, [[0, 0], [0, 100], [20, 100], [20, 0]], 'Adapterplaat');
  // een langsligger (Z) en twee dwarsliggers (Y) waaraan de balken hangen; 0,5 overlap, geen samenvallende vlakken
  o.schets(xv(20, 'Plane langsligger'), (s) => s.rrectW([20, -40, -900], [20, 40, 900], 4));
  o.extrude('boss', 40, { terug: 0.5, naam: 'Langsligger' });
  o.schets(xv(20.3, 'Plane dwarsliggers'), (s) => [-700, 700].forEach((z) => s.rrectW([20.3, -260, z - 40], [20.3, 260, z + 40], 4)));
  o.extrude('boss', VG.x0 - 20.3, { naam: 'Dwarsliggers' });
  return o.doc();
}
export function vlakBalken() {
  const o = deel('Vlakgrijper: 2 x Schmalz FA-M + 1 x FMP-60 (aluminium)', { name: 'aluminium, blank', density: 2700, color: '#b9bec4' });
  o.schets(xv(VG.x0, 'Plane balken'), (s) => BALKEN.forEach((k) => s.rrectW([VG.x0, k.y - k.b / 2, -VG.lang / 2], [VG.x0, k.y + k.b / 2, VG.lang / 2], 6)));
  o.extrude('boss', VG.body, { naam: 'Balken' });
  return o.doc();
}
/** het schuim met de zuigcellen (decal: de gaten op 18 mm, 3 rijen of 1 rij) */
export function schuim() {
  const o = deel('Schuimplaat 20 mm, open cel (zuigvlak)', { name: 'schuim, zwart', density: 120, color: '#1c1d1f' });
  o.schets(xv(VG.x0 + VG.body, 'Plane schuim'), (s) => BALKEN.forEach((k) => s.rrectW([0, k.y - k.b / 2 + 2, -VG.lang / 2 + 2], [0, k.y + k.b / 2 - 2, VG.lang / 2 - 2], 4)));
  o.extrude('boss', VG.schuim, { naam: 'Schuim' });
  // decal op de onderkant (normaal +X): beeld-x langs -Z van het onderdeel, beeld-y langs ... (zie bodyScene): we tekenen
  // symmetrisch, de richting maakt niet uit
  const W = VG.lang, H = 520, p = new Plaat(W, H, { masker: 'geen', ppm: 3 });
  for (const k of BALKEN) for (let r = 0; r < k.rijen; r++) for (let i = 0; i < Math.floor((W - 30) / 18); i++) {
    const v = H / 2 + k.y + (r - (k.rijen - 1) / 2) * 36;
    p.eigen(`<circle cx="${(15 + i * 18).toFixed(1)}" cy="${v.toFixed(1)}" r="4.5" fill="#050505"/>`);
  }
  return met(o.doc(), p.decal('dc1', 'Zuigcellen', [TOOL, 0, 0], { normaal: [1, 0, 0] }));
}
/** 5 meertraps-ejectors Schmalz SBPL 100 HV (870 l/min elk): 2 per FA-M, 1 voor de FMP-60; met verdeelblok en schakelaar */
export function ejectors() {
  const o = deel('Ejectors 5 x Schmalz SBPL 100 HV', { name: 'aluminium, blauw geanodiseerd', density: 2700, color: '#2d63b5' });
  o.schets(xv(-40, 'Plane ejectors'), (s) => [[-500, -185], [-300, 0], [500, -185], [-500, 185], [500, 185]].forEach(([z, y]) => s.rrectW([-40, y - 30, z - 90], [-40, y + 30, z + 90], 6)));
  o.extrude('boss', 59.4, { naam: 'Ejectors' }); // tot 0,6 onder het raam (geen samenvallende vlakken)
  return o.doc();
}

// ---------------------------------------------------------------- kabels en slangen (zoals bij een industriële robot)
// Motor- en encoderkabels lopen binnenin, door de holle assen van de RV-C-reductoren; buiten zichtbaar zijn het
// aansluitpaneel op de voet (Harting Han-stekkers), het slangenpakket over de onderarm naar de grijper (perslucht, 24 V,
// signaal, in een geribde beschermslang met klemmen) en de kabelbrug over de vloer naar de schakelkast.
const KABEL = { name: 'PA6 geribde beschermslang, zwart', density: 1100, color: '#121314' };
/** rechte buis langs +X van lengte l, straal r (een stuk slang of kabel) */
export function buis(naam, l, r, mat = KABEL) {
  const o = deel(naam, mat);
  draaiX(o, [[0, 0], [0, r], [l, r], [l, 0]], 'Buis');
  return o.doc();
}
export function aansluitpaneel() {
  const o = deel('Aansluitpaneel voet: 3 x Harting Han (motoren, encoders, perslucht)', { name: 'aluminium, gelakt RAL 7016', density: 2700, color: '#3a3f44' });
  // tegen de achterkant van de motoruitbouw A1 (x = -470), naar -X
  o.schets(xv(-470, 'Plane paneel'), (s) => s.rrectW([-470, 60, -230], [-470, 115, 230], 6));
  o.extrude('boss', 25, { omkeren: true, naam: 'Paneel' });
  o.schets(xv(-495, 'Plane stekkers'), (s) => [-150, 0, 150].forEach((z) => s.rrectW([-495, 70, z - 55], [-495, 108, z + 55], 4)));
  o.extrude('boss', 45, { omkeren: true, naam: 'Stekkers' });
  return o.doc();
}
export function slangklem() {
  const o = deel('Klem slangenpakket (PA, zwart)', KABEL);
  draaiX(o, [[0, 0], [0, 38], [30, 38], [30, 0]], 'Klem');
  return o.doc();
}
/** kabelbrug over de vloer (stalen goot 200 x 50 met afgeschuinde zijkanten), langs +X, lengte l */
export function kabelbrug(l) {
  const o = deel(`Kabelbrug vloer 200 x 50 (${Math.round(l)} mm)`, { name: 'staal, geel-zwart gelakt', density: 7850, color: '#e0b000' });
  o.schets(zv(-100, 'Plane brug'), (s) => s.lus([[0, 0], [l, 0], [l, 50], [0, 50]]));
  o.extrude('boss', 200, { naam: 'Brug' });
  return o.doc();
}

// ---------------------------------------------------------------- camera boven de band (herkennen van elk stuk)
// Portaal uit aluminium profiel 80 x 80 over de band, 2200 boven de rollen: Basler ace 2 a2A2448-23gmBAS (5 MP, GigE)
// met een lens van 6 mm (beeld ±3,1 x 2,6 m, ±1,3 mm per pixel), 2 ledbalken, een laserafstandsmeter voor de dikte en
// een reflectiefotocel die het stuk meldt.
export function portaal(h, b) {
  const o = deel('Cameraportaal (profiel 80 x 80)', ALU);
  for (const x of [-b / 2, b / 2]) blok(o, [x - 40, 0, -40, x + 40, h, 40], 'Staander');
  blok(o, [-b / 2 - 40, h - 0.5, -40, b / 2 + 40, h + 80, 40], 'Ligger');
  return o.doc();
}
export function camera() {
  const o = deel('Camera Basler ace 2 GigE + lens 6 mm', { name: 'aluminium, zwart', density: 2700, color: '#1a1b1d' });
  blok(o, [-15, -60, -15, 15, 0, 15], 'Camera');
  draaiY(o, [[0, -110], [16, -110], [16, -60], [0, -60]], 'Lens');
  return o.doc();
}
export function ledbalk(l) {
  const o = deel(`Ledbalk ${l} mm (wit, diffuus)`, { name: 'aluminium, zilver met witte diffusor', density: 2700, color: '#e9ecef' });
  blok(o, [-l / 2, -40, -25, l / 2, 0, 25], 'Balk');
  return o.doc();
}
export function laser() {
  const o = deel('Laserafstandsmeter (dikte)', { name: 'zinkspuitgiet, blauw', density: 6000, color: '#2b5aa6' });
  blok(o, [-30, -90, -25, 30, 0, 25], 'Laser');
  return o.doc();
}
export function fotocel() {
  const o = deel('Reflectiefotocel ifm O5P500 op beugel', { name: 'kunststof, grijs', density: 1300, color: '#5d6166' });
  blok(o, [-20, 0, -20, 20, 60, 20], 'Fotocel');
  return o.doc();
}
/** pneumatische stopper Festo DFST-50 tussen de rollen (kop omhoog = stuk staat stil op de grijpplaats) */
export function stopper() {
  const o = deel('Stopper Festo DFST-50-30', { name: 'aluminium, blank', density: 2700, color: '#c3c7cc' });
  draaiY(o, [[0, -120], [30, -120], [30, 30], [0, 30]], 'Huis en kop');
  return o.doc();
}

// ---------------------------------------------------------------- cel: rollenbaan en deur
export function rollenbaan() {
  const B = M.band, o = deel('Rollenbaan (frame)', BAND);
  const h = B.hoogte - 60;
  // 2 zijliggers (koker 120 x 60) en 4 paar poten (koker 60 x 60)
  for (const x of [-B.breed / 2 - 60, B.breed / 2]) blok(o, [x, h - 120, -B.lang / 2, x + 60, h, B.lang / 2], 'Zijligger');
  const poten = [];
  for (const z of [-B.lang / 2 + 100, -B.lang / 6, B.lang / 6, B.lang / 2 - 160]) for (const x of [-B.breed / 2 - 60, B.breed / 2]) poten.push([x, 0, z, x + 60, h - 120, z + 60]);
  o.schets(yv(0, 'Plane poten'), (s) => poten.forEach(([x0, , z0, x1, , z1]) => s.rrectW([x0, 0, z0], [x1, 0, z1])));
  o.extrude('boss', h - 120, { naam: 'Poten' });
  return o.doc();
}
export function rollen() {
  const B = M.band, o = deel('Rollen Ø60 (steek 150)', ROL), y = B.hoogte - 30;
  const n = Math.floor(B.lang / 150);
  // alle rollen in één schets en één extrusie (snel voor de mesh-kern)
  o.schets(xv(-B.breed / 2, 'Plane rollen'), (s) => { for (let i = 0; i < n; i++) s.cirkelW([-B.breed / 2, y, -B.lang / 2 + 75 + i * 150], 30); });
  o.extrude('boss', B.breed, { naam: 'Rollen' });
  return o.doc();
}
export function deur() {
  const D = M.deur, o = deel('Deur 2115 x 1015 x 54 (60 kg)', DEUR);
  blok(o, [-D.b / 2, 0, -D.l / 2, D.b / 2, D.d, D.l / 2], 'Deurblad', 2);
  return o.doc();
}

// ---------------------------------------------------------------- veiligheid: hek, lichtschermen, kast, noodstop
const GEEL = { name: 'S235, gepoedercoat (RAL 1003 signaalgeel)', density: 7850, color: '#f2b705' };
const GAAS = { name: 'staaldraadgaas 50 x 20, gepoedercoat (RAL 9005 zwart)', density: 1200, color: '#2a2c2f' };
export function hekpaal(h) {
  const o = deel('Hekpaal 60 x 60 met voetplaat', GEEL);
  blok(o, [-75, 0, -75, 75, 8, 75], 'Voetplaat');
  blok(o, [-30, 8, -30, 30, h + 100, 30], 'Paal');
  return o.doc();
}
/** gaaspaneel b breed (langs X), hoogte h, 100 boven de vloer; kader 20 x 20 en het gaas als dunne plaat */
export function hekpaneel(b, h) {
  const o = deel(`Gaaspaneel ${b} x ${h}`, GAAS);
  o.schets(zv(-10, 'Plane kader'), (s) => { s.rrect(-b / 2, 100, b / 2, 100 + h, 0); s.rrect(-b / 2 + 20, 120, b / 2 - 20, 80 + h, 0); });
  o.extrude('boss', 20, { naam: 'Kader' });
  o.schets(zv(-1, 'Plane gaas'), (s) => s.rrect(-b / 2 + 19, 119, b / 2 - 19, 81 + h, 0));
  o.extrude('boss', 2, { naam: 'Gaas' });
  return o.doc();
}
/** lichtscherm (zender of ontvanger): kolom 50 x 50, hoogte h, op een voet */
export function lichtscherm(h) {
  const o = deel('Lichtscherm type 4 (EN 61496), kolom', { name: 'aluminium, geel gelakt', density: 2700, color: '#f2b705' });
  blok(o, [-100, 0, -100, 100, 10, 100], 'Voet');
  blok(o, [-25, 10, -25, 25, h, 25], 'Kolom');
  return o.doc();
}
export function schakelkast() {
  const o = deel('Schakelkast 1200 x 600 x 2000 (robotbesturing)', { name: 'staalplaat, RAL 7035 lichtgrijs', density: 7850, color: '#cfd1cb' });
  blok(o, [-600, 100, -300, 600, 2100, 300], 'Kast', 6);
  blok(o, [-580, 0, -280, 580, 100.5, 280], 'Sokkel');
  return met(o.doc(), waarschuwing('W001', 120).decal('dc1', 'Waarschuwing', [0, 1700, 300], { normaal: [0, 0, 1] }));
}
export function bedienpaneel() {
  const o = deel('Bedienpaneel met noodstop (EN ISO 13850)', { name: 'aluminium, RAL 7035', density: 2700, color: '#cfd1cb' });
  blok(o, [-60, 0, -60, 60, 1100.5, 60], 'Zuil');
  blok(o, [-180, 1100, -100, 180, 1350, 100], 'Paneel', 10);
  return o.doc();
}
export function noodstopknop() {
  const o = deel('Noodstop (rood op geel)', { name: 'PA, rood', density: 1100, color: '#d01818' });
  cilZ(o, 0, 0, 30, 0, 40, 'Paddestoel');
  return o.doc();
}

// ---------------------------------------------------------------- kinematica (4x4, kolomvectoren)
const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const mul = (A, B) => { const C = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) C[r * 4 + c] += A[r * 4 + k] * B[k * 4 + c]; return C; };
const T = (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
const rad = (d) => (d * Math.PI) / 180;
const RX = (d) => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]; };
const RY = (d) => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1]; };
const RZ = (d) => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; };
function quat(m) {
  const [a, b, c, , d, e, f, , g, h, i] = m, t = a + e + i;
  let x, y, z, w;
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; w = s / 4; x = (h - f) / s; y = (c - g) / s; z = (d - b) / s; }
  else if (a > e && a > i) { const s = Math.sqrt(1 + a - e - i) * 2; w = (h - f) / s; x = s / 4; y = (b + d) / s; z = (c + g) / s; }
  else if (e > i) { const s = Math.sqrt(1 + e - a - i) * 2; w = (c - g) / s; x = (b + d) / s; y = s / 4; z = (f + h) / s; }
  else { const s = Math.sqrt(1 + i - a - e) * 2; w = (d - b) / s; x = (c + g) / s; y = (f + h) / s; z = s / 4; }
  return [x, y, z, w];
}
const pos = (m) => [m[3], m[7], m[11]];
/** frame in a met de X-as naar b (voor een buis of slang tussen twee punten) */
function richt(a, b) {
  const x = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...x);
  x.forEach((v, i) => { x[i] = v / l; });
  const hulp = Math.abs(x[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const z = [x[1] * hulp[2] - x[2] * hulp[1], x[2] * hulp[0] - x[0] * hulp[2], x[0] * hulp[1] - x[1] * hulp[0]], lz = Math.hypot(...z);
  z.forEach((v, i) => { z[i] = v / lz; });
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  return [x[0], y[0], z[0], a[0], x[1], y[1], z[1], a[1], x[2], y[2], z[2], a[2], 0, 0, 0, 1];
}
/** de frames van alle assen voor de hoeken q1..q6 (graden) */
export function frames(q) {
  const F0 = RY(q[0]);
  const F2 = mul(mul(F0, T(M.a1, M.d1, 0)), RZ(q[1]));
  const F3 = mul(mul(F2, T(0, M.a2, 0)), RZ(q[2]));
  const F4 = mul(mul(F3, T(0, M.a3, 0)), RX(q[3]));
  const F5 = mul(mul(F4, T(M.d4, 0, 0)), RZ(q[4]));
  const F6 = mul(mul(F5, T(M.d6, 0, 0)), RX(q[5]));
  return { F0, F2, F3, F4, F5, F6 };
}
/** inverse kinematica in het vlak (A1 = 0, A4 = A6 = 0): polsmidden op (x, y), de flens recht naar beneden */
export function ikNaarBeneden(x, y) {
  const ax = M.a1, ay = M.d1, L1 = M.a2, L2 = Math.hypot(M.d4, M.a3), dl = Math.atan2(M.a3, M.d4);
  const dx = x - ax, dy = y - ay, d = Math.hypot(dx, dy);
  if (d > L1 + L2) throw new Error('buiten bereik');
  // hoek van de bovenarm (vanaf +X) met de elleboog boven
  const g = Math.atan2(dy, dx), b = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
  const a = g + b, A3 = [ax + L1 * Math.cos(a), ay + L1 * Math.sin(a)];
  const f = Math.atan2(y - A3[1], x - A3[0]);
  const q2 = (a * 180) / Math.PI - 90, q3 = ((f - dl) * 180) / Math.PI - q2;
  return [0, q2, q3, 0, -90 - q2 - q3, 0];
}

// ---------------------------------------------------------------- de cel
export function cel() {
  const B = M.band, D = M.deur, comps = [];
  const at = (id, naam, doc, m) => comps.push(component(id, naam, doc, pos(m), { rotation: quat(m) }));
  // de grijper ligt op de deur: het schuim op de bovenkant van de deur
  const boven = B.hoogte + D.d;
  const q = ikNaarBeneden(B.x, boven + TOOL + M.d6);
  const { F0, F2, F3, F4, F5, F6 } = frames(q);
  at('r1', 'Voet<1>', voet(), I());
  at('r2', 'Servomotor A1<1>', motorA1(), T(0, 225, 0));
  at('r3', 'Draaistuk<1>', draaistuk(), F0);
  const A2 = mul(F0, T(M.a1, M.d1, 0));
  at('r4', 'Reductor A2<1>', reductorA2(), A2);
  at('r5', 'Servomotor A2<1>', motorA2(), A2);
  at('r6', 'Bovenarm<1>', bovenarm(), F2);
  // gewichtscompensatie: van het oog op het draaistuk naar het oog op de bovenarm
  const p0 = pos(mul(F0, T(-230, 610, 0))), p1 = pos(mul(F2, T(-175, 430, 0)));
  const v = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], l = Math.hypot(...v), hoek = (Math.atan2(v[1], v[0]) * 180) / Math.PI;
  const C = mul(T(...p0), RZ(hoek));
  at('r7', 'Gewichtscompensatie cilinder<1>', compHuis(l), C);
  at('r8', 'Gewichtscompensatie stang<1>', compStang(l), C);
  at('r9', 'Elleboog<1>', elleboog(), F3);
  at('r10', 'Servomotor A3<1>', motorA3(), F3);
  at('r11', 'Servomotoren A4-A6<1>', polsMotoren(), F3);
  at('r12', 'Onderarm<1>', onderarm(), F4);
  at('r13', 'Pols<1>', pols(), F5);
  at('r14', 'Toolflens<1>', flens(), F6);
  at('g1', 'Grijperraam<1>', grijperRaam(), F6);
  at('g2', 'Vlakgrijper balken<1>', vlakBalken(), F6);
  at('g3', 'Schuimplaat<1>', schuim(), F6);
  at('g4', 'Ejectors<1>', ejectors(), F6);
  // kabels: aansluitpaneel op de voet, slangenpakket over de onderarm, kabelbrug naar de kast
  at('c1', 'Aansluitpaneel<1>', aansluitpaneel(), I());
  const P = (F, x, y, z) => pos(mul(F, T(x, y, z)));
  // langs de bovenkant van de onderarm, dan opzij van de pols (z 250: vrij van de vork) naar de bovenkant van de grijper
  const pad = [P(F3, -230, M.a3 + 190, 0), P(F4, 320, 205, 0), P(F4, M.d4 - 300, 180, 0), P(F4, M.d4 - 200, 180, 250), P(F6, -70, 0, 250)];
  for (let i = 0; i < pad.length - 1; i++) {
    const [a, b] = [pad[i], pad[i + 1]], l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    at(`s${i + 1}`, `Slangenpakket ${i + 1}<1>`, buis(`Slangenpakket Ø70 (perslucht, 24 V, signaal) ${i + 1}`, l, 35), richt(a, b));
  }
  const klem = slangklem();
  [P(F4, 320, 205, 0), P(F4, (M.d4 - 300 + 320) / 2, 192, 0), P(F4, M.d4 - 300, 180, 0)].forEach((p, i) => at(`s${10 + i}`, `Klem slangenpakket<${i + 1}>`, klem, mul(T(...p), RZ(0))));
  const xK = M.hek.x0 - 700;
  at('c2', 'Kabelbrug 1<1>', kabelbrug(740), mul(T(-560, 0, 0), RY(180)));
  at('c3', 'Kabelbrug 2<1>', kabelbrug(1400), mul(T(-1300, 0, -100), RY(90)));
  at('c4', 'Kabelbrug 3<1>', kabelbrug(-1400 - (xK + 300)), mul(T(-1400, 0, -1500), RY(180)));
  // camera-portaal boven de band, stroomopwaarts van de grijpplaats; fotocel aan de ingang; stopper op de grijpplaats
  const zc = -2600, hc = 3000;
  at('v1', 'Cameraportaal<1>', portaal(hc, 1600), T(B.x, 0, zc));
  at('v2', 'Camera<1>', camera(), T(B.x, hc - 0.6, zc));
  const led = ledbalk(560);
  at('v3', 'Ledbalk<1>', led, T(B.x - 450, hc - 0.6, zc));
  at('v4', 'Ledbalk<2>', led, T(B.x + 450, hc - 0.6, zc));
  at('v5', 'Laserafstandsmeter<1>', laser(), T(B.x + 100, hc - 0.6, zc));
  at('v6', 'Fotocel ingang<1>', fotocel(), T(B.x - B.breed / 2 - 120, B.hoogte, -3150));
  at('v7', 'Stopper<1>', stopper(), T(B.x, B.hoogte, M.stopZ));
  const band = T(B.x, 0, 0);
  at('b1', 'Rollenbaan<1>', rollenbaan(), band);
  at('b2', 'Rollen<1>', rollen(), band);
  at('b3', 'Deur<1>', deur(), T(B.x, B.hoogte, M.stopZ - 30.5 - D.l / 2)); // tegen de stopper
  // hek: palen om het veld, panelen ertussen; openingen voor de band (voor- en achterzijde) en een deur achteraan
  const H = M.hek, paal = hekpaal(H.h), lijn = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
  const transparant = [], panelen = new Map();
  let nh = 0;
  /** een zijde met palen op de gegeven plaatsen; tussen twee palen een paneel, behalve waar `open` waar is */
  const zijde = (vast, langs, ps, open = () => false, hoeken = true) => {
    ps.forEach((p, i) => { if (!hoeken && (i === 0 || i === ps.length - 1)) return; nh++; at(`hp${nh}`, `Hekpaal<${nh}>`, paal, langs === 'x' ? T(p, 0, vast) : T(vast, 0, p)); });
    for (let i = 0; i < ps.length - 1; i++) {
      const m = (ps[i] + ps[i + 1]) / 2, w = Math.round(ps[i + 1] - ps[i] - 60);
      if (open(m)) continue;
      if (!panelen.has(w)) panelen.set(w, hekpaneel(w, H.h));
      const id = `hg${++nh}`;
      at(id, `Gaaspaneel<${nh}>`, panelen.get(w), langs === 'x' ? T(m, 0, vast) : mul(T(vast, 0, m), RY(90)));
      transparant.push(id);
    }
  };
  // voor- en achterzijde: de band loopt tussen twee palen door (opening 1500 breed, met lichtschermen)
  const bandL = B.x - B.breed / 2 - 150, bandR = B.x + B.breed / 2 + 150;
  const langsBand = [...lijn(H.x0, bandL, Math.max(1, Math.round((bandL - H.x0) / H.veld))), ...lijn(bandR, H.x1, Math.max(1, Math.round((H.x1 - bandR) / H.veld)))];
  const isBand = (m) => m > bandL && m < bandR;
  zijde(H.z0, 'x', langsBand, isBand);
  zijde(H.z1, 'x', langsBand, isBand);
  const dwars = lijn(H.z0, H.z1, Math.round((H.z1 - H.z0) / H.veld)).slice(1, -1);
  zijde(H.x0, 'z', [H.z0, ...dwars, H.z1], (m) => Math.abs(m) < H.veld / 2, false); // toegangsdeur achteraan; de hoekpalen staan er al
  zijde(H.x1, 'z', [H.z0, ...dwars, H.z1], undefined, false);
  // lichtschermen aan beide kanten van de band, aan elke opening
  const ls = lichtscherm(1800);
  [H.z0, H.z1].forEach((z, k) => [-1, 1].forEach((s, j) => at(`ls${k * 2 + j + 1}`, `Lichtscherm<${k * 2 + j + 1}>`, ls, T(B.x + s * (B.breed / 2 + 160), 0, z + (k ? 220 : -220)))));
  at('k1', 'Schakelkast<1>', schakelkast(), mul(T(H.x0 - 700, 0, -1500), RY(90)));
  at('k2', 'Bedienpaneel<1>', bedienpaneel(), T(H.x0 - 400, 0, 1500));
  at('k3', 'Noodstop<1>', noodstopknop(), T(H.x0 - 400, 1260, 1600));
  comps.transparant = transparant;

  return { doc: { format: 'phlippo-cad', version: 1, name: 'Robotcel deuren', units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components: comps, mates: [], transparentBodies: comps.transparant }, q };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(HERE, { recursive: true });
  const { doc, q } = cel();
  writeFileSync(join(HERE, 'Robotcel.kcad'), JSON.stringify(doc, null, 1) + '\n');
  console.log('geschreven; ashoeken', q.map((x) => x.toFixed(1)).join(' '));
}
