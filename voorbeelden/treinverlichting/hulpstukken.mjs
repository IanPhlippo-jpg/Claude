// De geprinte hulpstukken (advies Fable 5.2, 2026-11-12). Versie 5 (Ian, 2026-11-15): de bordjes zijn vastgeschroefd op 4
// paaltjes (maak-kabeldoos.mjs, M.schroefpaal); de klemlippen van versie 3 en 4 zijn weg.
//
// Hulpstukken (één printplaat): 2 werkhaken om de doos voor het bedraden op werkhoogte te laten hangen en een spatel met
// haakje voor de draden tussen de bordjes (geen plaats voor een vinger).
//  - Werkhaak: een strip van 140 met bovenaan een sleutelgat (zoals in de bodem van de doos: hangt aan een van de
//    bolkopschroeven onder de baan) en onderaan een knop met de maat van een schroefkop (Ø8,5 op een hals Ø4,2): die gaat
//    door het grote gat van een sleutelgat van de doos en schuift in de sleuf. Twee haken aan de voorste schroeven (rij 6):
//    de doos hangt dan verticaal, de voorkant boven, 12 cm onder de baan, de open kant naar je toe.
//  - Spatel: 100 lang, 10 breed, aan het ene eind een blad van 1,0 (een draad in een smalle plaats duwen), aan het andere
//    eind een haakje (een draad tussen de bordjes uittrekken).
import { yv, deel, snede, cirkels, PETG_GOOT } from './hulp.mjs';

// ---------------------------------------------------------------- hulpstukken
export const HAAK = { l: 140, b: 12, dik: 2.4, rib: 2.6, ribVrij: 24, gat: 9.2, sleuf: 4.6, slag: 6, knop: { hals: 4.2, halsL: 3.0, kop: 8.5, kopH: 2.15, kopRecht: 1.2 }, vanEind: 10 };
export const SPATEL = { l: 100, b: 10, dik: 2.4, blad: 1.0, bladL: 18, haak: 3.0 };

/** de printplaat met 2 werkhaken en de spatel, plat op het bed (y = 0), langs X */
export function hulpstukkenPlaat() {
  const o = deel('Hulpstukken (2 werkhaken, spatel)', PETG_GOOT), H = HAAK, S = SPATEL, x0 = -H.l / 2;
  const zs = [-H.b - 3, 0 + 3]; // de twee haken naast elkaar (z = hun linkerrand), de spatel erachter
  const zsp = zs[1] + H.b + 6;
  // de platte strips
  o.schets(yv(0, 'Plane hulpstukken'), (s) => {
    for (const z of zs) s.rrectW([x0, 0, z], [x0 + H.l, 0, z + H.b], 2);
    // spatel: een strip; aan het rechter eind een tand van 2 met een inkeping van 3 x 3 ervoor (het haakje)
    const xs = x0 + 8, xe = xs + S.l, zb = zsp + S.b, n = S.haak;
    s.lusW([[xs, zsp], [xe, zsp], [xe, zb], [xe - 2, zb], [xe - 2, zb - n], [xe - 2 - n, zb - n], [xe - 2 - n, zb], [xs, zb]].map(([x, z]) => [x, 0, z]));
  });
  o.extrude('boss', H.dik, { naam: 'Strips' });
  // de rib op de werkhaken (stijver), niet op het eind met het sleutelgat (dat moet tussen de baan en de schroefkop)
  o.schets(yv(H.dik - 0.01, 'Plane ribben'), (s) => zs.forEach((z) => s.rrectW([x0 + H.ribVrij, 0, z + 3], [x0 + H.l - 2, 0, z + H.b - 3], 1)));
  o.extrude('boss', H.rib + 0.01, { naam: 'Ribben' });
  // sleutelgat bovenaan (links): groot gat en de sleuf naar het eind toe
  const xg = x0 + H.vanEind + H.slag;
  cirkels(o, H.dik + 0.01, H.dik + 0.02, zs.map((z) => [xg, z + H.b / 2, H.gat / 2]), 'Sleutelgaten haken', 'cut');
  snede(o, H.dik + 0.01, H.dik + 0.02, zs.map((z) => [xg - H.slag, z + H.b / 2 - H.sleuf / 2, xg, z + H.b / 2 + H.sleuf / 2, H.sleuf / 2 - 0.01]), 'Sleuven haken');
  // de knop onderaan (rechts): hals en kop met 45° eronder (print zonder support)
  const K = H.knop, xk = x0 + H.l - H.vanEind, top = H.dik + H.rib;
  cirkels(o, top - 0.01, K.halsL + 0.31, zs.map((z) => [xk, z + H.b / 2, K.hals / 2]), 'Hals knop'); // 0,3 in de kegel: één lichaam
  o.schets(yv(top + K.halsL + K.kopH, 'Plane kop knop'), (s) => zs.forEach((z) => s.cirkelW([xk, 0, z + H.b / 2], K.kop / 2)));
  o.extrude('boss', K.kopH, { omkeren: true, naam: 'Kop knop (45°)', draft: 45 });
  cirkels(o, top + K.halsL + K.kopH - 0.01, K.kopRecht + 0.01, zs.map((z) => [xk, z + H.b / 2, K.kop / 2]), 'Kop knop');
  // het blad van de spatel (links): dunner tot S.blad
  snede(o, H.dik + 0.01, H.dik - S.blad + 0.01, [[x0 + 7, zsp - 1, x0 + 8 + S.bladL, zsp + S.b + 1]], 'Blad spatel');
  return o.doc();
}
