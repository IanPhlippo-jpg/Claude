// Proefstuk van de kabeldoos (Fable 5.2 D1, 2026-11-16): PETG krimpt 0,3 tot 0,5 %, over de 57,1 mm tussen de gaten van
// een bordje is dat 0,17 tot 0,28 en over een helft van 230 mm tot 1 mm. Eerst dit proefstuk van ± 20 minuten printen en
// de krimp in de slicer compenseren, pas dan de helften van 10 uur. Twee stukjes, rechtop geprint (de bodem op het bed,
// zonder support), op hun plaats in de doos maar het rechterstuk 20 mm naar rechts geschoven (ze raken elkaar niet op het
// bed):
//  - A (uit de linkerhelft, de hoek achteraan bij de naad): de bordplaats van bordje 3 met zijn 4 schroefpaaltjes en de
//    steunrail, de uitsparing van de achterste bodemlip en een stuk achterwand met het kuiltje van de klikhaak;
//  - B (uit de rechterhelft): ± 35 mm naad met de pilaar, de klikhaak met zijn nok en de achterste bodemlip.
// Proef: een bordje vastschroeven (de 4 schroeven gaan erin zonder te forceren), B 20 mm naar links schuiven tot de haak
// klikt (de lip valt in zijn uitsparing, 0,3 rondom). Gebruik: maak-kabeldoos.mjs schrijft Proefstuk.kcad.
import { M } from './maten.mjs';
import { deel, snede, cirkels, veelhoeken, yv, zv, PETG } from './hulp.mjs';
import { indeling, rechts } from './maak-kabeldoos.mjs';

/** de maten van het proefstuk: de stukken A en B (doosmaat), de verschuiving van B, de hoogte van de wandjes */
export function proefMaten() {
  const L = indeling(), P = rechts(), N = M.naad, D = M.doos, B = M.bordje, Z = L.Z, ZB = Z + D.wand;
  const b3 = L.rijen[0].find((d) => d.nr === 3), lip = P.lippen[0], uit = P.uitsparingen[0];
  const zEind = lip[3] + 4; // ± 35 mm naad: van de buitenkant van de achterwand tot 4 voorbij de lip
  return {
    dx: 20, hw: N.haak.top + 2, bordje: b3, lip, uitsparing: uit, haak: P.haken[0],
    A: [b3.cx - B.x / 2 - 4, -ZB, N.x, zEind], wandA: [P.haken[0].kuil[0] - 6, -ZB, N.x, -Z],
    B: [P.xs, -ZB, P.xs + N.pilaar.l + 6, zEind], wandB: [P.xs, -ZB, P.xs + N.pilaar.l + 6, -Z],
    paaltjes: L.paaltjes.filter((p) => p.nr === 3),
  };
}
const acht = (x, z, r) => Array.from({ length: 8 }, (_, i) => { const a = Math.PI / 8 + (i * Math.PI) / 4, R = r / Math.cos(Math.PI / 8); return [x + R * Math.cos(a), z + R * Math.sin(a)]; });
const rh = (s, y, [x0, z0, x1, z1], dx = 0) => s.rrectW([x0 + dx, y, z0], [x1 + dx, y, z1]);

/** het proefstuk: 2 lichamen (A links, B 20 mm naar rechts) */
export function proefstuk() {
  const Q = proefMaten(), D = M.doos, N = M.naad, H = N.haak, B = M.bordje, SP = M.schroefpaal, P = rechts(), dx = Q.dx;
  const o = deel('Proefstuk naad en bordplaats', PETG);
  // de bodems van A en B (2,4) en de wandjes (de achterwand van A met het kuiltje, die van B met de pilaar)
  o.schets(yv(-D.bodem, 'Plane bodem'), (s) => { rh(s, -D.bodem, Q.A); rh(s, -D.bodem, Q.B, dx); });
  o.extrude('boss', D.bodem, { naam: 'Bodems' });
  o.schets(yv(-0.5, 'Plane wanden'), (s) => { rh(s, -0.5, Q.wandA); rh(s, -0.5, Q.wandB, dx); rh(s, -0.5, P.pilaren[0], dx); });
  o.extrude('boss', Q.hw + 0.5, { naam: 'Achterwanden en pilaar' });
  // A: het kuiltje van de klikhaak in de wand, de uitsparing van de lip in de bodem (0,3 rondom)
  snede(o, H.nok.y1 + 0.4, H.nok.y1 - H.nok.y0 + 0.8, [Q.haak.kuil], 'Kuiltje klikhaak');
  snede(o, 0.01, D.bodem + 1, [Q.uitsparing], 'Uitsparing bodemlip');
  // A: de steunrail en de 4 schroefpaaltjes van bordje 3 met hun voorgat (achthoek, tot 0,4 boven de onderkant)
  const b3 = Q.bordje;
  o.schets(yv(-0.5, 'Plane steunrail'), (s) => s.rrectW([b3.cx - B.x / 2 + 1, 0, b3.cz - 3], [b3.cx + B.x / 2 - 1, 0, b3.cz + 3], 1));
  o.extrude('boss', M.voet + 0.5, { naam: 'Steunrail' });
  cirkels(o, -0.5, M.voet + 0.5, Q.paaltjes.map((p) => [p.x, p.z, SP.d / 2]), 'Schroefpaaltjes');
  veelhoeken(o, M.voet, M.voet + D.bodem - 0.4, Q.paaltjes.map((p) => acht(p.x, p.z, SP.voorgat / 2)), 'Voorgaten', 'cut');
  // B: de bodemlip (op het bed), de klikhaak (45° eronder) met de nok
  o.schets(yv(-D.bodem, 'Plane bodemlip'), (s) => rh(s, -D.bodem, Q.lip, dx));
  o.extrude('boss', D.bodem, { naam: 'Bodemlip' });
  const h = Q.haak;
  o.schets(zv(h.z0, 'Plane klikhaak'), (s) => s.lusW(h.prof.map(([x, y]) => [x + dx, y, h.z0])));
  o.extrude('boss', H.t, { naam: 'Klikhaak' });
  o.schets(yv(H.nok.y0, 'Plane nok'), (s) => s.lusW(h.nok.map(([x, z]) => [x + dx, H.nok.y0, z])));
  o.extrude('boss', H.nok.y1 - H.nok.y0, { naam: 'Nok klikhaak' });
  return o.doc();
}
