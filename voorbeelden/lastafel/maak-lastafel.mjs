// Lastafel 2400 x 1200 op een elektrohydraulische schaarheftafel, zoals in Ians video (DCT BV, 2026-11-09; eisen in
// EISEN.md). Maten van de lift uit DCT's productpagina en hun 3D-model (onderframe 1190 x 2390, bovenkant 370 tot 1425
// mm zonder blad, 4000 kg), de lastafel volgens hun specificatie (Ø28, raster 100, DG, blad 25 mm, wanden 200 hoog).
// Assen: +Y omhoog, X over de breedte (1190), Z over de lengte (2390); de vloer op y = 0, het midden op x = z = 0.
// Schaar: één schaar met twee armparen. Het buitenste paar A draait onderaan vast (z = -1000) en rolt bovenaan; het
// binnenste paar B draait bovenaan vast en rolt onderaan. Twee cilinders Ø100 duwen op een buis van paar B.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Onderdeel, component, vlak } from '../lib/schets.mjs';
import { Plaat } from '../lib/printplaat.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- maten (mm)
export const M = {
  B: 1190, L: 2390, // onderframe en bovenframe (breed x lang)
  arm: 2080, // afstand tussen de twee eindscharnieren van een arm
  z0: -1000, // vaste scharnieren (onder voor A, boven voor B)
  yb: 75, // hart van de onderste scharnieren en rollen boven de vloer
  dt: 75, // hart van de bovenste scharnieren en rollen onder de bovenkant
  hMin: 370, hMax: 1425, // bovenkant lift (zonder blad), zoals DCT
  ah: 116, // hoogte van een arm (stadion, r 58)
  A: [490, 535], Bx: [440, 485], // x van het buitenste en het binnenste armpaar (rechts; links gespiegeld)
  cil: { x: 250, p0: [60, -850], s: 775, n: 90, boring: 100, stang: 56 }, // voetscharnier (y, z) en ophangpunt op B
  tafel: { l: 2400, b: 1200, h: 200, blad: 25, wand: 12, gat: 28, raster: 100 },
};

// ---------------------------------------------------------------- materialen (kleuren gemeten in DCT's 3D-model)
const POED = { name: 'S355, gepoedercoat zwart mat (RAL 9005)', density: 7850, color: '#262628' };
const ZWART = { name: 'staal, zwart', density: 7850, color: '#2e2f31' };
const VERZINKT = { name: 'staal, sendzimir verzinkt', density: 7850, color: '#a7a9ac' };
const GEFREESD = { name: 'S355, CNC-gefreesd blank (geolied)', density: 7850, color: '#bcbec1' };
const GEEL = { name: 'staal, gepoedercoat geel (RAL 1032 bremgeel)', density: 7850, color: '#e2a92c' };
const CHROOM = { name: 'staal, hardverchroomd', density: 7850, color: '#dfe3e6' };
const MOTOR = { name: 'motor en aggregaat (zwart)', density: 4000, color: '#141618' };
const KAST = { name: 'staalplaat, gepoedercoat RAL 7035 lichtgrijs', density: 7850, color: '#cdd0cb' };
const RUBBER = { name: 'NBR, zwart', density: 1200, color: '#18191b' };
const SLANG = { name: 'hydraulische slang 2SN DN10', density: 1500, color: '#232426' };
const ROL = { name: 'staal, geslepen (rol met naaldlager)', density: 7850, color: '#6b6e71' };
const TAFEL = { name: 'S690QL, CNC-gefreesd en gasgenitreerd (800 HV)', density: 7850, color: '#aeb1b3' };
const ROOD = { name: 'PA, rood (noodstop)', density: 1100, color: '#c8191e' };

// ---------------------------------------------------------------- hulpjes
let tel = 0;
const zv = (z, naam) => vlak(`z${++tel}`, naam ?? `Plane ${tel}`, [0, 0, z], [0, 0, 1], 'reference');
const xv = (x, naam) => vlak(`x${++tel}`, naam ?? `Plane ${tel}`, [x, 0, 0], [1, 0, 0], 'reference');
const yv = (y, naam) => vlak(`y${++tel}`, naam ?? `Plane ${tel}`, [0, y, 0], [0, 1, 0], 'reference');
const deel = (naam, mat) => new Onderdeel(naam, mat);
const met = (doc, ...decals) => ({ ...doc, decals });
/** blok (x0,y0,z0)-(x1,y1,z1) */
function blok(o, [x0, y0, z0, x1, y1, z1], naam, r = 0) {
  o.schets(yv(y0, `Plane ${naam}`), (s) => s.rrectW([x0, y0, z0], [x1, y0, z1], r));
  o.extrude('boss', y1 - y0, { naam });
  return o;
}
/** profiel (punten [y, z]) op het vlak x = x0, geëxtrudeerd tot x1 */
function profX(o, x0, x1, yz, naam, op = 'boss') {
  o.schets(xv(Math.min(x0, x1), `Plane ${naam}`), (s) => s.lusW(yz.map(([y, z]) => [Math.min(x0, x1), y, z])));
  o.extrude(op, Math.abs(x1 - x0), { naam });
  return o;
}
/** profiel (punten [x, y]) op het vlak z = z0, geëxtrudeerd tot z1 */
function profZ(o, z0, z1, xy, naam, op = 'boss') {
  o.schets(zv(Math.min(z0, z1), `Plane ${naam}`), (s) => s.lus(xy));
  o.extrude(op, Math.abs(z1 - z0), { naam });
  return o;
}
/** cilinder langs X op (y, z), van x0 tot x1 */
function cilX(o, y, z, r, x0, x1, naam, op = 'boss') {
  o.schets(xv(Math.min(x0, x1), `Plane ${naam}`), (s) => s.cirkelW([Math.min(x0, x1), y, z], r));
  o.extrude(op, Math.abs(x1 - x0), { naam });
  return o;
}
/** cilinder langs Y op (x, z), van y0 tot y1 */
function cilY(o, x, z, r, y0, y1, naam, op = 'boss') {
  o.schets(yv(y0, `Plane ${naam}`), (s) => s.cirkelW([x, y0, z], r));
  o.extrude(op, y1 - y0, { naam });
  return o;
}
/** cilinder langs Z op (x, y), van z0 tot z1 */
function cilZ(o, x, y, r, z0, z1, naam, op = 'boss') {
  o.schets(zv(z0, `Plane ${naam}`), (s) => s.cirkel(x, y, r));
  o.extrude(op, z1 - z0, { naam });
  return o;
}
/** ring om een as langs X door (y0, z0): binnen- en buitenstraal, van x0 tot x1 (omwenteling) */
function ringX(o, y0, z0, ri, ru, x0, x1, naam) {
  o.schets(zv(z0, `Plane ${naam}`), (s) => { s.lus([[x0, y0 + ri], [x1, y0 + ri], [x1, y0 + ru], [x0, y0 + ru]]); o._as = s.as(x0 - 10, y0, x1 + 10, y0); });
  o.revolve('boss', o._as, 360, { naam });
  return o;
}
/** ring om de Z-as (x = y = 0): van z0 tot z1 */
function ringZ(o, ri, ru, z0, z1, naam) {
  o.schets(xv(0, `Plane ${naam}`), (s) => { s.lusW([[0, ri, z0], [0, ri, z1], [0, ru, z1], [0, ru, z0]]); o._as = s.as(-z0 + 10, 0, -z1 - 10, 0); });
  o.revolve('boss', o._as, 360, { naam });
  return o;
}
/** zeskant met sleutelwijdte sw langs X op (y, z), van x0 tot x1 */
function zeskantX(o, y, z, sw, x0, x1, naam) {
  const r = sw / Math.sqrt(3);
  o.schets(xv(Math.min(x0, x1), `Plane ${naam}`), (s) => s.lusW([...Array(6)].map((_, i) => [Math.min(x0, x1), y + r * Math.sin((i * Math.PI) / 3), z + r * Math.cos((i * Math.PI) / 3)])));
  o.extrude('boss', Math.abs(x1 - x0), { naam });
  return o;
}

// ---------------------------------------------------------------- kinematica (4x4, kolomvectoren)
const mul = (A, B) => { const C = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) C[r * 4 + c] += A[r * 4 + k] * B[k * 4 + c]; return C; };
const T = (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
const RX = (r) => { const c = Math.cos(r), s = Math.sin(r); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1]; };
const RY180 = [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1];
const pt = (m, [x, y, z]) => [m[0] * x + m[1] * y + m[2] * z + m[3], m[4] * x + m[5] * y + m[6] * z + m[7], m[8] * x + m[9] * y + m[10] * z + m[11]];
function quat(m) {
  const [a, b, c, , d, e, f, , g, h, i] = m, t = a + e + i;
  let x, y, z, w;
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; w = s / 4; x = (h - f) / s; y = (c - g) / s; z = (d - b) / s; }
  else if (a > e && a > i) { const s = Math.sqrt(1 + a - e - i) * 2; w = (h - f) / s; x = s / 4; y = (b + d) / s; z = (c + g) / s; }
  else if (e > i) { const s = Math.sqrt(1 + e - a - i) * 2; w = (c - g) / s; x = (b + d) / s; y = s / 4; z = (f + h) / s; }
  else { const s = Math.sqrt(1 + i - a - e) * 2; w = (d - b) / s; x = (c + g) / s; y = (f + h) / s; z = s / 4; }
  return [x, y, z, w];
}
/** frame in a met de X-as naar b (voor een slang tussen twee punten) */
function richt(a, b) {
  const x = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l = Math.hypot(...x);
  x.forEach((v, i) => { x[i] = v / l; });
  const hulp = Math.abs(x[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const z = [x[1] * hulp[2] - x[2] * hulp[1], x[2] * hulp[0] - x[0] * hulp[2], x[0] * hulp[1] - x[1] * hulp[0]], lz = Math.hypot(...z);
  z.forEach((v, i) => { z[i] = v / lz; });
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  return [x[0], y[0], z[0], a[0], x[1], y[1], z[1], a[1], x[2], y[2], z[2], a[2], 0, 0, 0, 1];
}

/** de stand van de schaar bij bovenkant H: armhoek, frames van de armparen, cilinderlengte en -hoek */
export function stand(H) {
  const { arm, z0, yb, dt, cil } = M;
  const th = Math.asin((H - yb - dt) / arm);
  const FA = mul(T(0, yb, z0), RX(-th)); // A: lokaal +Z stijgt naar de rol bovenaan
  const FB = mul(T(0, H - dt, z0), RX(th)); // B: lokaal +Z daalt naar de rol onderaan
  const p1 = pt(FB, [0, cil.n, cil.s]);
  const dy = p1[1] - cil.p0[0], dz = p1[2] - cil.p0[1];
  return { H, th, FA, FB, d: Math.hypot(dy, dz), phi: Math.atan2(dy, dz), midden: pt(FA, [0, 0, arm / 2]) };
}

// ---------------------------------------------------------------- onderbouw (vast)
export function vloerplaat() {
  const o = deel('Vloerplaat 10 mm', POED);
  blok(o, [-M.B / 2, 0, -M.L / 2, M.B / 2, 10, M.L / 2], 'Vloerplaat');
  o.schets(yv(10, 'Plane ankergaten'), (s) => { for (const x of [-560, 560]) for (const z of [-1165, -400, 400, 1165]) s.cirkelW([x, 10, z], 9); });
  o.extrude('cut', 10, { omkeren: true, naam: 'Ankergaten Ø18' });
  return o.doc();
}
/** U-profielen 100 x 50 (open naar buiten), rolbanen, scharnierbokken, cilinderbokken, hijsogen en aanslagpennen */
export function onderframe() {
  const o = deel('Onderframe (UNP 100, gelast)', POED);
  const U = (x0, s) => [[x0, 10], [x0 + s * 50, 10], [x0 + s * 50, 20], [x0 + s * 8, 20], [x0 + s * 8, 100], [x0 + s * 50, 100], [x0 + s * 50, 110], [x0, 110]];
  for (const s of [1, -1]) profZ(o, -M.L / 2, M.L / 2, U(s * 545, s), 'Langsligger');
  // kopse U-profielen tussen de langsliggers, open naar buiten (±Z)
  for (const s of [1, -1]) {
    const zi = s * 1135, za = s * 1195;
    profX(o, -550, 550, [[10.5, zi], [10.5, za], [20, za], [20, zi + s * 8], [100, zi + s * 8], [100, za], [109.5, za], [109.5, zi]], 'Kopligger');
  }
  // rolbanen voor de rollen van paar B (onderaan, z 400 tot de kopligger)
  for (const s of [1, -1]) blok(o, [s > 0 ? 486 : -526, 10, 400, s > 0 ? 526 : -486, 30, 1137], 'Rolbaan onder');
  // scharnierbokken van paar A (z = -1000), tegen het lijf van de langsligger
  for (const s of [1, -1]) {
    const x0 = s > 0 ? 537 : -545.5;
    o.schets(xv(x0, 'Plane scharnierbok'), (sk) => sk.lusW([[x0, 10, -1060], [x0, 10, -940], [x0, 140, -940], [x0, 140, -1060]]));
    o.extrude('boss', 8.5, { naam: 'Scharnierbok A' });
    cilX(o, M.yb, M.z0, 22, s > 0 ? 545 : -545, s > 0 ? 535.5 : -535.5, 'Scharnierpen A');
  }
  // hijsogen op de bovenflens
  for (const s of [1, -1]) for (const z of [-800, 800]) {
    const x0 = s > 0 ? 562 : -578;
    o.schets(xv(x0, 'Plane hijsoog'), (sk) => sk.pad([[-z + 40, 109.5], [-z - 40, 109.5], [-z - 40, 140], { boog: [-z, 140], naar: [-z + 40, 140], ccw: false }]));
    o.extrude('boss', 16, { naam: 'Hijsoog' });
    cilX(o, 142, z, 15, x0, x0 + 16, 'Gat hijsoog', 'cut');
  }
  return o.doc();
}
/** cilinderbok: dwarsplaat op de vloerplaat met twee platen per cilinder en de pen op (y 60, z -850) */
export function cilinderbok() {
  const o = deel('Cilinderbok (dwarsplaat 18 + 4 lipplaten 12, pennen Ø40)', POED);
  const [yc, zc] = M.cil.p0;
  blok(o, [-310, 10, zc - 50, 310, 18, zc + 50], 'Dwarsplaat');
  for (const xs of [M.cil.x, -M.cil.x]) for (const [a, b] of [[-44, -32], [32, 44]]) {
    profX(o, xs + a, xs + b, [[17.5, zc - 40], [17.5, zc + 40], [yc, zc + 40], [yc + 28, zc + 28], [yc + 40, zc], [yc + 28, zc - 28], [yc, zc - 40]], 'Lipplaat');
  }
  for (const xs of [M.cil.x, -M.cil.x]) cilX(o, yc, zc, 19.5, xs - 46, xs + 46, 'Cilinderpen Ø40');
  return o.doc();
}
/** aanslagpennen M20 met dop: het bovenframe rust er in de laagste stand op */
export function aanslagpennen() {
  const o = deel('Aanslagpennen M20 met dopmoer (6 x)', VERZINKT);
  for (const s of [1, -1]) for (const z of [-1100, 0, 1100]) {
    cilY(o, s * 575, z, 10, 110, 236.5, 'Draadeind M20');
    o.schets(yv(236, 'Plane dopmoer'), (sk) => sk.lusW([...Array(6)].map((_, i) => [s * 575 + 17.3 * Math.cos((i * Math.PI) / 3), 236, z + 17.3 * Math.sin((i * Math.PI) / 3)])));
    o.extrude('boss', 14, { naam: 'Dopmoer M20' });
  }
  return o.doc();
}

// ---------------------------------------------------------------- bovenbouw (lokaal: de bovenkant op y = 0)
export function bovenframe() {
  const o = deel('Bovenframe (koker 110 x 50, gelast)', POED);
  for (const s of [1, -1]) blok(o, [s > 0 ? 545 : -595, -120, -M.L / 2, s > 0 ? 595 : -545, -10, M.L / 2], 'Langsligger boven', 0);
  for (const s of [1, -1]) blok(o, [-546, -119.5, s > 0 ? 1135 : -1195, 546, -10.5, s > 0 ? 1195 : -1135], 'Kopligger boven');
  // rolbanen voor de rollen van paar A (boven, open naar onder)
  for (const s of [1, -1]) blok(o, [s > 0 ? 449 : -489, -30, 450, s > 0 ? 489 : -449, -20, 1136], 'Rolbaan boven');
  for (const s of [1, -1]) blok(o, [s > 0 ? 455 : -483, -20.5, 450, s > 0 ? 483 : -455, -13, 1136], 'Ophanging rolbaan');
  // scharnierblokken van paar B (z = -1000), tegen de langsligger
  for (const s of [1, -1]) {
    blok(o, [s > 0 ? 487 : -545.5, -140, -1060, s > 0 ? 545.5 : -487, -13, -940], 'Scharnierblok B');
  }
  return o.doc();
}
export function opvanglade() {
  const o = deel('Opvanglade (verzinkt, 4 vakken)', VERZINKT);
  blok(o, [-545, -13, -1135, 545, -10, 1135], 'Bodem');
  for (const z of [-600, 0, 600]) blok(o, [-490, -10.5, z - 20, 490, -7, z + 20], 'Tussenstrip');
  for (const s of [1, -1]) blok(o, [-490, -10.5, s > 0 ? 1124.5 : -1134.5, 490, -4, s > 0 ? 1134.5 : -1124.5], 'Opstaande rand');
  return o.doc();
}
export function steunvlakken() {
  const o = deel('Steunvlakken (6 x, CNC-gefreesd)', GEFREESD);
  const P = [];
  for (const s of [1, -1]) for (const z of [-1145, 0, 1145]) P.push([s * 545, z]);
  for (const [x, z] of P) blok(o, [x - 50, -10, z - 50, x + 50, 0, z + 50], 'Steunvlak', 3);
  o.schets(yv(0, 'Plane boringen'), (s) => P.forEach(([x, z]) => s.cirkelW([x, 0, z], 8.5)));
  o.extrude('cut', 10, { omkeren: true, naam: 'Boring M16' });
  return o.doc();
}

// ---------------------------------------------------------------- schaar (lokaal: vast scharnier in de oorsprong, +Z langs de arm)
function armplaten(o, [xa, xb], naam) {
  const { arm, ah } = M, r = ah / 2;
  for (const s of [1, -1]) {
    const x0 = s > 0 ? xa : -xb;
    // koker 116 hoog aan de scharnieren, 160 in het midden (zoals DCT); schetscoördinaten (u, v) = (-z, y)
    o.schets(xv(x0, `Plane ${naam}`), (sk) => sk.pad([[0, -r], [-arm / 2, -80], [-arm, -r], { boog: [-arm, 0], naar: [-arm, r], ccw: false }, [-arm / 2, 80], [0, r], { boog: [0, 0], naar: [0, -r], ccw: false }]));
    o.extrude('boss', xb - xa, { naam });
  }
  cilX(o, 0, arm / 2, 15.5, -xb - 1, xb + 1, 'Boring middenpen Ø31', 'cut');
}
/** buitenste armpaar A: onder vast, boven op rollen; buizen Ø80 aan beide uiteinden */
export function armpaarA() {
  const o = deel('Schaararmen buiten (paar A, koker 116-160 x 45)', POED);
  armplaten(o, M.A, 'Arm A');
  cilX(o, 0, 0, 40, -M.A[0] - 2, M.A[0] + 2, 'Buis onder Ø80');
  cilX(o, 0, M.arm, 40, -M.A[0] - 2, M.A[0] + 2, 'Buis boven Ø80');
  return o.doc();
}
/** binnenste armpaar B: boven vast, onder op rollen; cilinderbuis Ø90 met ogen op s = 775 */
export function armpaarB() {
  const { cil } = M, o = deel('Schaararmen binnen (paar B, koker 116-160 x 45)', POED);
  armplaten(o, M.Bx, 'Arm B');
  cilX(o, 0, 0, 40, -M.Bx[0] - 2, M.Bx[0] + 2, 'Buis boven Ø80');
  cilX(o, 0, M.arm, 40, -M.Bx[0] - 2, M.Bx[0] + 2, 'Buis onder Ø80');
  for (const s of [1, -1]) cilX(o, 0, M.arm, 20, s * (M.Bx[1] - 1), s * 524, 'Astap rol Ø40');
  cilX(o, 0, cil.s, 45, -M.Bx[0] - 2, M.Bx[0] + 2, 'Cilinderbuis Ø90');
  for (const xs of [cil.x, -cil.x]) for (const [a, b] of [[-38, -26], [26, 38]]) {
    profX(o, xs + a, xs + b, [[0, cil.s - 40], [cil.n, cil.s - 34], [cil.n + 34, cil.s], [cil.n, cil.s + 34], [0, cil.s + 40], [-30, cil.s]], 'Oog cilinder');
  }
  for (const xs of [cil.x, -cil.x]) cilX(o, cil.n, cil.s, 19.5, xs - 40, xs + 40, 'Pen stangoog Ø40');
  return o.doc();
}
export function rolA() {
  const o = deel('Rol Ø90 x 38 (op buis Ø80)', ROL);
  ringX(o, 0, 0, 40, 45, 0, 38, 'Rol');
  return o.doc();
}
export function rolB() {
  const o = deel('Rol Ø90 x 38 (naaldlager op astap Ø40)', ROL);
  ringX(o, 0, 0, 20, 45, 0, 38, 'Rol');
  return o.doc();
}
/** middenpen M30 (rechts; links gedraaid): kop buiten paar A, moer binnen paar B */
export function middenbout() {
  const o = deel('Middenpen M30 x 140 met moer en sluitring', ZWART);
  cilX(o, 0, 0, 15, M.Bx[0] - 18, M.A[1] + 2, 'Schacht');
  zeskantX(o, 0, 0, 46, M.A[1] + 1, M.A[1] + 20, 'Kop');
  ringX(o, 0, 0, 15, 28, M.A[1] + 19.5, M.A[1] + 24, 'Kopje');
  zeskantX(o, 0, 0, 46, M.Bx[0] - 22, M.Bx[0] - 1, 'Moer');
  return o.doc();
}

// ---------------------------------------------------------------- cilinders (lokaal: voetscharnier in de oorsprong, +Z naar het stangoog)
export function cilinderhuis() {
  const o = deel('Hydraulische cilinder Ø100/56 slag 360 (huis)', ZWART);
  ringX(o, 0, 0, 20, 40, -30, 30, 'Voetoog');
  blok(o, [-28, -35, 30, 28, 35, 125], 'Hals');
  blok(o, [-70, -70, 120, 70, 70, 540], 'Koker', 6);
  blok(o, [-30, -90, 150, 30, -69.5, 200], 'Aansluitblok met leidingbreukventiel');
  // palplaat (valbeveiliging), in het vlak van de gele kapzijde: scharniert achteraan op een tussenblok, een veer drukt
  // ze omhoog in de tanden van de kap; bij het zakken trekt de ontgrendeling ze 15 mm weg (zo getekend, vrij)
  const pal = [[-80, 150]]; for (let z = 150; z < 510; z += 30) pal.push([-54, z], [-42, z + 30]);
  pal.push([-54, 510], [-80, 510]);
  for (const s of [1, -1]) {
    profX(o, s * 69.5, s * 76.5, [[-80, 150], [-80, 185], [-56, 185], [-56, 150]], 'Tussenblok pal');
    profX(o, s * 76, s * 84, pal, 'Palplaat');
    cilX(o, -68, 165, 8, s * 84, s * 88, 'Scharnierbout pal');
  }
  return o.doc();
}
/** zuigerstang Ø56 met stangoog; d = afstand tussen de oogharten */
export function zuigerstang(d) {
  const o = deel('Zuigerstang Ø56 met stangoog', CHROOM);
  cilZ(o, 0, 0, 28, 540, d - 38, 'Stang');
  ringX(o, 0, d, 20, 40, -25, 25, 'Stangoog');
  return o.doc();
}
/** gele kap met zaagtand: zit aan de stang en schuift over de koker */
export function kap(d) {
  const o = deel('Valbeveiliging: kap met zaagtand (zijden 8 mm S355)', GEEL);
  const za = d - 600, zb = d - 100;
  blok(o, [-81, 82, za, 81, 88, zb + 3], 'Kapdak');
  // zijkant met zaagtand onderaan (steek 30, diepte 14); de tanden lopen van de kopplaat tot het einde
  const rand = [[87.5, za], [87.5, zb + 3], [-26, zb + 3], [-26, zb]];
  for (let z = zb; z > za + 29; z -= 30) rand.push([-40, z - 30], [-26, z - 30]);
  if (rand[rand.length - 1][1] !== za) rand.push([-26, za]);
  for (const s of [1, -1]) profX(o, s * 76, s * 84, rand, 'Kapzijde');
  o.schets(zv(zb, 'Plane kopplaat'), (s) => { s.rrect(-81, -25.5, 81, 85, 0); });
  o.extrude('boss', 6, { naam: 'Kopplaat' });
  cilZ(o, 0, 0, 28.5, zb - 1, zb + 7, 'Doorvoer stang', 'cut');
  ringZ(o, 28, 45, zb + 5.5, zb + 30, 'Klembus');
  return o.doc();
}
export function ontgrendeling(d) {
  const o = deel('Ontgrendeling valbeveiliging (2 x)', ZWART);
  for (const z of [d - 430, d - 300]) blok(o, [-18, 88, z, 18, 122, z + 34], 'Ontgrendelblok', 3);
  return o.doc();
}

// ---------------------------------------------------------------- aggregaat, kast, bediening
export function aggregaat() {
  const o = deel('Hydraulisch aggregaat 230 V 2,2 kW, 7 l/min (motor, pomp, tank 12 l, ventielblok)', MOTOR);
  cilZ(o, 0, 95, 70, -10, 20.5, 'Ventilatorkap');
  cilZ(o, 0, 95, 75, 20, 320, 'Motor');
  blok(o, [-60, 10, 60, 60, 22, 280], 'Motorvoet');
  cilZ(o, 0, 95, 62, 319.5, 360.5, 'Pomplantaarn');
  blok(o, [-150, 15, 360, 150, 185, 560], 'Tank', 8);
  blok(o, [-60, 184.5, 380, 60, 215, 470], 'Ventielblok');
  for (const x of [-35, 35]) cilY(o, x, 425, 16, 214.5, 232, 'Spoel');
  cilY(o, 95, 520, 18, 184.5, 205, 'Vuldop met ontluchting');
  return o.doc();
}
export function bedienkast() {
  const o = deel('Bedienkast 265 x 135 x 85 (RAL 7035)', KAST);
  blok(o, [-345, 10, -1130, -80, 145, -1045], 'Kast', 4);
  return o.doc();
}
export function wartels() {
  const o = deel('Wartels M20 (2 x)', RUBBER);
  for (const x of [-290, -200]) { cilY(o, x, -1088, 14, 145, 153, 'Wartelmoer'); cilY(o, x, -1088, 11, 152.5, 165, 'Wartelkop'); }
  return o.doc();
}
/** dubbele voetschakelaar met beschermkap en noodstop, los op de vloer (lokaal: voorkant naar -Z) */
export function voetpedaal() {
  const o = deel('Voetschakelaar dubbel (op / neer) met beschermkap en noodstop', { name: 'aluminium spuitgiet, geel gelakt', density: 2700, color: '#e2a92c' });
  blok(o, [-170, 0, -130, 170, 12, 130], 'Voetplaat', 10);
  for (const x of [-85, 85]) blok(o, [x - 70, 11.5, -90, x + 70, 60, 120], 'Pedaalhuis', 8);
  for (const x of [-160, 150]) blok(o, [x, 11.5, -129, x + 10, 190.5, -100], 'Kapstijl');
  blok(o, [-159, 190, -129.5, 159, 202, 110], 'Kap', 6);
  return o.doc();
}
export function noodstop() {
  const o = deel('Noodstop (rood op geel)', ROOD);
  cilY(o, 0, 0, 20, 0, 22, 'Paddenstoel');
  return o.doc();
}
export function pedaalblad() {
  const o = deel('Pedaalbladen (2 x, zwart rubber)', RUBBER);
  for (const x of [-85, 85]) blok(o, [x - 60, 60, -80, x + 60, 66, 110], 'Pedaalblad', 6);
  return o.doc();
}
export function slang(naam, l, r = 8, mat = SLANG) {
  const o = deel(naam, mat);
  o.schets(xv(0, 'Plane slang'), (s) => s.cirkelW([0, 0, 0], r));
  o.extrude('boss', l, { naam: 'Slang' });
  return o.doc();
}

// ---------------------------------------------------------------- de lastafel (lokaal: onderkant op y = 0)
const RASTER = (() => {
  const { l, b, raster: p } = M.tafel, g = [], d = [];
  for (let x = -b / 2 + p / 2; x < b / 2; x += p) for (let z = -l / 2 + p / 2; z < l / 2; z += p) g.push([x, z]);
  for (let x = -b / 2 + p; x < b / 2 - 1; x += p) for (let z = -l / 2 + p; z < l / 2 - 1; z += p) d.push([x, z]);
  return { g, d };
})();
export const TAFELGATEN = RASTER;
function badge() {
  const p = new Plaat(46, 46, { masker: 'geen', ppm: 14 });
  p.eigen('<circle cx="23" cy="23" r="22.5" fill="#1b1b1b"/><circle cx="23" cy="23" r="20.5" fill="#d9a21f"/><circle cx="23" cy="23" r="17" fill="none" stroke="#1b1b1b" stroke-width="0.7"/>');
  p.tekst(23, 20.5, 'PHLIPPO', { h: 4.3, vet: true, kleur: '#1b1b1b' });
  p.lijn([[11, 25.5], [35, 25.5]], 0.9, '#1b1b1b');
  p.tekst(23, 29.5, 'Ø28', { h: 3.2, vet: true, kleur: '#1b1b1b' });
  return p;
}
function liniaal(l) {
  const p = new Plaat(l, 20, { masker: 'geen', ppm: 4 });
  let s = '';
  for (let k = 0; k <= l; k += 10) {
    const h = k % 100 === 0 ? 9 : k % 50 === 0 ? 6 : 3.5;
    s += `<rect x="${Math.min(l - 0.5, Math.max(0, k - 0.25))}" y="0" width="0.5" height="${h}" fill="#3b3d3f"/>`;
    if (k % 100 === 0 && k > 0 && k < l) s += `<text x="${k}" y="15.5" font-family="Arial" font-size="5.5" text-anchor="middle" fill="#3b3d3f">${k / 10}</text>`;
  }
  p.eigen(s);
  return p;
}
// De tafel is een lasconstructie: blad, 4 wanden en ribben. Elk deel tekent zijn gaten als binnencontouren in de schets
// van de extrusie (zoals een lasersnijbestand): één extrusie, geen booleaanse bewerking per gat (541 gaten in ± 14 s).
const GAT = M.tafel.gat / 2;
/** gaten in een wand: twee rijen op het raster (50 en 150 onder de bovenkant van de tafel), één diagonale rij (100) */
const wandgaten = (n, p0) => { const h = M.tafel.h, g = []; for (let i = 0; i < n; i++) g.push([p0 + i * 100, h - 50], [p0 + i * 100, h - 150]); for (let i = 0; i < n - 1; i++) g.push([p0 + 50 + i * 100, h - 100]); return g; };
export function tafelblad() {
  const { l, b, h, blad } = M.tafel, o = deel(`Tafelblad Ø28 ${l} x ${b} x ${blad} DG`, TAFEL);
  o.schets(yv(h - blad, 'Plane blad'), (s) => { s.rrectW([-b / 2, h - blad, -l / 2], [b / 2, h - blad, l / 2]); [...RASTER.g, ...RASTER.d].forEach(([x, z]) => s.cirkelW([x, h - blad, z], GAT)); });
  o.extrude('boss', blad, { naam: 'Blad met 541 gaten Ø28' });
  return met(o.doc(),
    liniaal(l).decal('dc1', 'Liniaal lengte', [-b / 2 + 14, h, 0], { draai: 90 }),
    liniaal(b).decal('dc2', 'Liniaal breedte', [0, h, l / 2 - 14]));
}
/** langswand (rechts, x 588 tot 600); de linker is dezelfde, 180° gedraaid */
export function langswand() {
  const { l, b, h, blad, wand } = M.tafel, o = deel(`Langswand ${l} x ${h - blad} x ${wand} (71 gaten Ø28)`, TAFEL);
  const x0 = b / 2 - wand;
  o.schets(xv(x0, 'Plane langswand'), (s) => { s.rrectW([x0, 0, -l / 2], [x0, h - blad, l / 2]); wandgaten(l / 100, -l / 2 + 50).forEach(([z, y]) => s.cirkelW([x0, y, z], GAT)); });
  o.extrude('boss', wand, { naam: 'Wand met gaten Ø28' });
  return met(o.doc(), badge().decal('dc1', 'Badge', [b / 2, h - 50, -100], { normaal: [1, 0, 0] }));
}
/** kopwand (achter, z 1188 tot 1200), tussen de langswanden; de voorste is dezelfde, 180° gedraaid */
export function kopwand() {
  const { l, b, h, blad, wand } = M.tafel, o = deel(`Kopwand ${b - 2 * wand} x ${h - blad} x ${wand} (35 gaten Ø28)`, TAFEL);
  const z0 = l / 2 - wand;
  o.schets(zv(z0, 'Plane kopwand'), (s) => { s.rrect(-b / 2 + wand, 0, b / 2 - wand, h - blad); wandgaten(b / 100, -b / 2 + 50).forEach(([x, y]) => s.cirkel(x, y, GAT)); });
  o.extrude('boss', wand, { naam: 'Wand met gaten Ø28' });
  return o.doc();
}
/** ribben tussen de gatenrijen: langs op x ±525, dwars op z ±575 (in stukken tussen de langsribben en de wanden) */
export function tafelribben() {
  const { l, b, h, blad, wand } = M.tafel, o = deel('Ribben tafel (plaat 12 mm)', TAFEL);
  for (const s of [1, -1]) blok(o, [s * 525 - 6, 0.5, -l / 2 + wand, s * 525 + 6, h - blad, l / 2 - wand], 'Langsrib');
  for (const z of [-575, 575]) for (const [x0, x1] of [[-519.5, 519.5], [530.5, b / 2 - wand], [-b / 2 + wand, -530.5]]) blok(o, [x0, 1, z - 6, x1, h - blad - 0.5, z + 6], 'Dwarsrib');
  return o.doc();
}

// ---------------------------------------------------------------- de samenstelling
/** de lift (en de tafel) bij bovenkant H */
export function samenstelling(H, { tafel = true, naam } = {}) {
  const S = stand(H), comps = [], { cil } = M;
  const at = (id, nm, doc, m) => comps.push(component(id, nm, doc, [m[3], m[7], m[11]], { rotation: quat(m) }));
  const I = T(0, 0, 0);
  at('o1', 'Vloerplaat<1>', vloerplaat(), I);
  at('o2', 'Onderframe<1>', onderframe(), I);
  at('o3', 'Aanslagpennen<1>', aanslagpennen(), I);
  at('o7', 'Cilinderbok<1>', cilinderbok(), I);
  at('o4', 'Aggregaat<1>', aggregaat(), I);
  at('o5', 'Bedienkast<1>', bedienkast(), I);
  at('o6', 'Wartels<1>', wartels(), I);
  const top = T(0, H, 0);
  at('b1', 'Bovenframe<1>', bovenframe(), top);
  at('b2', 'Opvanglade<1>', opvanglade(), top);
  at('b3', 'Steunvlakken<1>', steunvlakken(), top);
  at('s1', 'Armpaar A<1>', armpaarA(), S.FA);
  at('s2', 'Armpaar B<1>', armpaarB(), S.FB);
  const ra = rolA(), rb = rolB();
  at('s3', 'Rol A<1>', ra, mul(S.FA, T(M.A[0] - 39, 0, M.arm)));
  at('s4', 'Rol A<2>', ra, mul(S.FA, T(-M.A[0] + 1, 0, M.arm)));
  at('s5', 'Rol B<1>', rb, mul(S.FB, T(M.Bx[1] + 1, 0, M.arm)));
  at('s6', 'Rol B<2>', rb, mul(S.FB, T(-M.Bx[1] - 39, 0, M.arm)));
  const mb = middenbout();
  at('s7', 'Middenpen<1>', mb, T(...S.midden));
  at('s8', 'Middenpen<2>', mb, mul(T(...S.midden), RY180));
  const huis = cilinderhuis(), stang = zuigerstang(S.d), kp = kap(S.d), og = ontgrendeling(S.d);
  [cil.x, -cil.x].forEach((x, i) => {
    const F = mul(T(x, cil.p0[0], cil.p0[1]), RX(-S.phi));
    at(`c${i * 4 + 1}`, `Cilinderhuis<${i + 1}>`, huis, F);
    at(`c${i * 4 + 2}`, `Zuigerstang<${i + 1}>`, stang, F);
    at(`c${i * 4 + 3}`, `Valbeveiliging<${i + 1}>`, kp, F);
    at(`c${i * 4 + 4}`, `Ontgrendeling<${i + 1}>`, og, F);
    // slang van het aansluitblok langs de vloer naar het ventielblok
    const poort = pt(F, [0, -90, 175]), a = [Math.sign(x) * 240, 24, -560], b = [Math.sign(x) * 120, 24, 352];
    const p0 = [poort[0], poort[1] - 1, poort[2]];
    [[p0, a], [a, b]].forEach(([u, v], k) => at(`h${i * 2 + k + 1}`, `Slang ${i + 1}.${k + 1}<1>`, slang(`Hydraulische slang DN10 (${i ? 'links' : 'rechts'})`, Math.hypot(v[0] - u[0], v[1] - u[1], v[2] - u[2])), richt(u, v)));
  });
  // voetpedaal los op de vloer voor de kopse kant, met kabel naar de bedienkast
  const ped = T(-700, 0, -1550);
  at('p1', 'Voetpedaal<1>', voetpedaal(), ped);
  at('p2', 'Pedaalbladen<1>', pedaalblad(), ped);
  at('p3', 'Noodstop<1>', noodstop(), T(-700, 202, -1550));
  const k0 = [-700, 6, -1420], k1 = [-560, 6, -1201];
  at('p4', 'Kabel voetpedaal<1>', slang('Kabel voetpedaal 7 x 0,75 mm²', Math.hypot(k1[0] - k0[0], k1[2] - k0[2]), 5, RUBBER), richt(k0, k1));
  if (tafel) {
    const tt = T(0, H, 0), lw = langswand(), kw = kopwand();
    at('t1', 'Tafelblad<1>', tafelblad(), tt);
    at('t2', 'Langswand<1>', lw, tt);
    at('t3', 'Langswand<2>', lw, mul(tt, RY180));
    at('t4', 'Kopwand<1>', kw, tt);
    at('t5', 'Kopwand<2>', kw, mul(tt, RY180));
    at('t6', 'Ribben tafel<1>', tafelribben(), tt);
  }
  const name = naam ?? `${tafel ? 'Lastafel 2400 x 1200 op heftafel' : 'Heftafel 4 t'} (bovenkant lift ${H} mm)`;
  return { format: 'phlippo-cad', version: 1, name, units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components: comps, mates: [] };
}

export const STANDEN = { laag: M.hMin, midden: 825, hoog: M.hMax };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const schrijf = (f, d) => writeFileSync(join(HERE, f), JSON.stringify(d, null, 1) + '\n');
  schrijf('Lastafel.kcad', samenstelling(STANDEN.midden));
  schrijf('Lastafel-laag.kcad', samenstelling(STANDEN.laag));
  schrijf('Lastafel-hoog.kcad', samenstelling(STANDEN.hoog));
  schrijf('Heftafel.kcad', samenstelling(STANDEN.midden, { tafel: false }));
  // losse lasdelen voor de werktekeningen (src/qa/tekeningenLastafel.test.ts)
  mkdirSync(join(HERE, 'delen'), { recursive: true });
  const d = stand(STANDEN.midden).d;
  for (const [f, doc] of [['Armpaar-A', armpaarA()], ['Armpaar-B', armpaarB()], ['Bovenframe', bovenframe()], ['Onderframe', onderframe()], ['Valbeveiliging-kap', kap(d)], ['Cilinderbok', cilinderbok()], ['Opvanglade', opvanglade()]]) schrijf(`delen/${f}.kcad`, doc);
  for (const H of Object.values(STANDEN)) { const s = stand(H); console.log(`H ${H}: armhoek ${(s.th * 180 / Math.PI).toFixed(1)}°, cilinder ${s.d.toFixed(0)} mm onder ${(s.phi * 180 / Math.PI).toFixed(1)}°`); }
  console.log('tafelgaten', RASTER.g.length + RASTER.d.length);
}
