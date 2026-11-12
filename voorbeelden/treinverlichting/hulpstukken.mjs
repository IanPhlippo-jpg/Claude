// Klemlippen voor de bordjes en de geprinte hulpstukken (advies Fable 5.2, 2026-11-12).
//
// Klemlippen: de bordjes lagen los in hun ring en werden alleen door de ribben van het deksel vastgedrukt; de doos hangt
// ondersteboven (het deksel onderaan), dus met het deksel eraf vielen ze eruit. Nu houdt elk bordje 4 PETG-lippen aan
// zijn korte kanten (in de hoeken, 8 tot 10 mm van het midden, vrij van de eindklemmen en de palen): een tong van 0,8 x 2,0
// die in een kuiltje in de bodem begint (veerlengte 6,5) met bovenaan een haak die 0,75 over de rand van de print grijpt
// (0,15 speling, dus 0,6 grip) en een schuine kant van 45° waarop de print de lip opzij duwt bij het inleggen. Uitnemen:
// de lip met de spatel (hieronder) naar buiten duwen.
//
// Hulpstukken (één printplaat): 2 werkhaken om de doos voor het bedraden op werkhoogte te laten hangen en een spatel met
// haakje voor de smalle goten (5,4 mm: geen plaats voor een vinger) en de klemlippen.
//  - Werkhaak: een strip van 140 met bovenaan een sleutelgat (zoals in de bodem van de doos: hangt aan een van de
//    bolkopschroeven onder de baan) en onderaan een knop met de maat van een schroefkop (Ø8,5 op een hals Ø4,2): die gaat
//    door het grote gat van een sleutelgat van de doos en schuift in de sleuf. Twee haken aan de voorste schroeven (rij 6):
//    de doos hangt dan verticaal, de voorkant boven, 12 cm onder de baan, de open kant naar je toe.
//  - Spatel: 100 lang, 10 breed, aan het ene eind een blad van 1,0 (gootdeksel optillen, klemlip openduwen), aan het
//    andere eind een haakje (draden uit een goot trekken).
import { M } from './maten.mjs';
import { yv, deel, snede, cirkels, PETG_GOOT } from './hulp.mjs';

const r3 = (v) => Math.round(v * 1000) / 1000;

/**
 * De klemlippen van alle bordjes: per lip het profiel [[x, y]] (in een vlak met normaal +Z), de z waar hij begint en het
 * kuiltje [x0, z0, x1, z1] in de bodem. rijen: de rijen uit indeling(); bordjes hebben { cx, cz }.
 */
export function klemlippen(rijen) {
  const B = M.bordje, P = M.lip, y0 = M.voet + B.pcb + P.boven, top = y0 + P.haak, uit = [];
  for (const rij of rijen) for (const d of rij) {
    if (d.soort !== 'bordje') continue;
    for (const k of [-1, 1]) {
      const f = d.cx + k * (B.x / 2 + P.speling), b = f + k * P.t;
      // doorsnede in het xy-vlak (midden van de lip): tong, haak met de schuine kant naar de print
      const prof = [[f, -P.kuil], [b, -P.kuil], [b, y0], [b - k * P.haak, top], [f, top], [f - k * P.haak, y0], [f, y0]].map(([x, y]) => [r3(x), r3(y)]);
      for (const s of [-1, 1]) {
        const z0 = s > 0 ? d.cz + P.z0 : d.cz - P.z0 - P.b;
        const kx = [f - k * P.rondom, b + k * P.achter];
        uit.push({ nr: d.nr, k, s, f, b, z0, z1: z0 + P.b, prof, kuil: [Math.min(...kx), z0 - P.rondom, Math.max(...kx), z0 + P.b + P.rondom] });
      }
    }
  }
  return uit;
}

/** de klemlippen op de bak in 3 features (weinig features: de bak blijft binnen het rebuildbudget): de kuiltjes, de
 *  tongen (tot de onderkant van de haak) en de haken (0,75 hoog met 45° naar binnen: de schuine kant boven de print) */
export function lippenOpBak(o, rijen) {
  const L = klemlippen(rijen), P = M.lip, y0 = M.voet + M.bordje.pcb + P.boven;
  snede(o, 0.01, P.kuil + 0.01, L.map((l) => l.kuil), 'Kuiltjes klemlippen'); // rechte hoeken: minder driehoeken
  o.schets(yv(-P.kuil, 'Plane tongen klemlippen'), (s) => L.forEach((l) => s.rrectW([Math.min(l.f, l.b), 0, l.z0], [Math.max(l.f, l.b), 0, l.z1])));
  o.extrude('boss', P.kuil + y0, { naam: 'Tongen klemlippen' });
  o.schets(yv(y0 - 0.001, 'Plane haken klemlippen'), (s) => L.forEach((l) => { const h = l.f - l.k * P.haak; s.rrectW([Math.min(h, l.b), 0, l.z0], [Math.max(h, l.b), 0, l.z1]); }));
  o.extrude('boss', P.haak, { naam: 'Haken klemlippen (45°)', draft: 45 });
  return L;
}

/** rek in de tong bij het inklikken: de print duwt de haak (0,75 - 0,15 speling) opzij; veerlengte van de bodem van het
 *  kuiltje tot de haak */
export const lipRek = () => { const P = M.lip, L = P.kuil + M.voet + M.bordje.pcb + P.boven; return { rek: (1.5 * P.t * (P.haak - P.speling)) / L ** 2, L, d: P.haak - P.speling }; };
/** de kracht om één lip helemaal open te duwen (balk: F = 3 E I d / L³, PETG E = 2100 MPa) */
export const lipKracht = () => { const P = M.lip, { L, d } = lipRek(), I = (P.b * P.t ** 3) / 12; return (3 * 2100 * I * d) / L ** 3; };

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
