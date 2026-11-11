// Gedeelde hulpjes van de kabeldoos (maak-kabeldoos.mjs, goten.mjs, verbinding.mjs): materialen, vlakken en de korte
// schrijfwijzen voor blokken, sneden en cirkels.
import { Onderdeel, vlak } from '../lib/schets.mjs';

// ---------------------------------------------------------------- materialen
export const PETG = { name: 'PETG, zwart', density: 1270, color: '#2b2d31' };
export const PETG_DEKSEL = { name: 'PETG, grijs', density: 1270, color: '#9aa0a6' };
export const PETG_GOOT = { name: 'PETG, grijs', density: 1270, color: '#8d939a' };
export const PCB_ROOD = { name: 'FR4, rode soldeermasker', density: 1850, color: '#c8202f' };
export const PCB_ZWART = { name: 'FR4, zwart soldeermasker', density: 1850, color: '#1d1f22' };
export const PCB_BLAUW = { name: 'FR4, blauw soldeermasker', density: 1850, color: '#1f4fa3' };
export const PCB_BRUIN = { name: 'FR2, gaatjesprint', density: 1400, color: '#b98a4b' };
export const KLEM_GROEN = { name: 'PA66, groen', density: 1140, color: '#2e9e4f' };
export const KLEM_BLAUW = { name: 'PA66, blauw', density: 1140, color: '#2c6fd1' };
export const ZWART = { name: 'epoxy, zwart (IC)', density: 1900, color: '#151617' };
export const METAAL = { name: 'vertind staal', density: 7800, color: '#c9ccd1' };
export const GOUD = { name: 'messing, verguld', density: 8500, color: '#d4af37' };
export const WIT = { name: 'siliconen, wit', density: 1100, color: '#f2f2ee' };

// ---------------------------------------------------------------- vlakken
let tel = 0;
/** een vlak evenwijdig aan de bodem (normaal +Y) op hoogte y */
export const yv = (y, naam) => vlak(`y${++tel}`, naam ?? `Plane ${tel}`, [0, y, 0], [0, 1, 0], 'reference');
/** een staand vlak met normaal +X (k = 1) of -X (k = -1) op x */
export const xv = (x, naam, k = 1) => vlak(`x${++tel}`, naam ?? `Plane ${tel}`, [x, 0, 0], [k, 0, 0], 'reference');
/** een staand vlak met normaal +Z (k = 1) of -Z (k = -1) op z */
export const zv = (z, naam, k = 1) => vlak(`z${++tel}`, naam ?? `Plane ${tel}`, [0, 0, z], [0, 0, k], 'reference');

// ---------------------------------------------------------------- bouwstenen
export const deel = (naam, mat) => new Onderdeel(naam, mat);
/** het document van een onderdeel met zijn decals (opdruk, banen, opschrift: printjes.mjs) */
export const met = (doc, ...decals) => ({ ...doc, decals });

/** blokken (x0,y0,z0,x1,y1,z1) als boss op één onderdeel; mag uit losse lichamen bestaan (een rij pinnen) */
export function blokken(o, lijst, naam) {
  // per hoogte één schets: alle rechthoeken met dezelfde y0 en hoogte samen
  const groepen = new Map();
  for (const [x0, y0, z0, x1, y1, z1, r = 0] of lijst) {
    const k = `${y0.toFixed(3)}|${(y1 - y0).toFixed(3)}`;
    if (!groepen.has(k)) groepen.set(k, []);
    groepen.get(k).push([x0, z0, x1, z1, r]);
  }
  for (const [k, rs] of groepen) {
    const [y0, h] = k.split('|').map(Number);
    o.schets(yv(y0, `Plane ${naam} ${y0}`), (s) => rs.forEach(([x0, z0, x1, z1, r]) => s.rrectW([x0, y0, z0], [x1, y0, z1], r)));
    o.extrude('boss', h, { naam: `${naam} ${o.features.length}` });
  }
  return o;
}
/** snede van rechthoeken van bovenaf (y = boven, diepte d) */
export function snede(o, y, d, rs, naam) {
  o.schets(yv(y, `Plane ${naam}`), (s) => rs.forEach(([x0, z0, x1, z1, r = 0]) => s.rrectW([x0, y, z0], [x1, y, z1], r)));
  o.extrude('cut', d, { omkeren: true, naam });
  return o;
}
export function cirkels(o, y, h, cs, naam, op = 'boss') {
  o.schets(yv(y, `Plane ${naam}`), (s) => cs.forEach(([x, z, r]) => s.cirkelW([x, y, z], r)));
  o.extrude(op, h, { omkeren: op === 'cut', naam });
  return o;
}
/** veelhoeken [[x, z], ...] op hoogte y, als boss omhoog (h) of als snede omlaag */
export function veelhoeken(o, y, h, polys, naam, op = 'boss') {
  o.schets(yv(y, `Plane ${naam}`), (s) => polys.forEach((p) => s.lusW(p.map(([x, z]) => [x, y, z]))));
  o.extrude(op, h, { omkeren: op === 'cut', naam });
  return o;
}

/** rechthoek x0..x1, z0..z1 met per hoek een eigen straal (r: [linksachter, rechtsachter, rechtsvoor, linksvoor]; 0 = scherp)
 *  in een schets op een Y-vlak: de buitenhoeken van de doos rond, de hoeken aan een verbinding scherp */
export function hoekRechthoek(s, x0, z0, x1, z1, r) {
  const [la, ra, rv, lv] = r, uit = [];
  // achter (z0) van links naar rechts, dan rechts, voor, links; het eerste punt herhalen sluit de lus
  if (la > 0) uit.push([x0, z0 + la], { boog: [x0 + la, z0 + la], naar: [x0 + la, z0] }); else uit.push([x0, z0]);
  if (ra > 0) uit.push([x1 - ra, z0], { boog: [x1 - ra, z0 + ra], naar: [x1, z0 + ra] }); else uit.push([x1, z0]);
  if (rv > 0) uit.push([x1, z1 - rv], { boog: [x1 - rv, z1 - rv], naar: [x1 - rv, z1] }); else uit.push([x1, z1]);
  if (lv > 0) uit.push([x0 + lv, z1], { boog: [x0 + lv, z1 - lv], naar: [x0, z1 - lv] }); else uit.push([x0, z1]);
  uit.push(uit[0]);
  return s.padW(uit);
}
