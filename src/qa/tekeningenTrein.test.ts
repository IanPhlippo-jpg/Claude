/**
 * Werktekeningen van de kabeldoos, versie 5 (voorbeelden/treinverlichting/tekeningen): TREIN_TEKENINGEN=1 VOORBEELDEN=1
 * npx vitest run src/qa/tekeningenTrein.test.ts. A3 liggend, Europese projectie: de boormal op ware grootte over 2 bladen
 * met uitlijnkruisen (de 4 schroeven onder de baan, van onderen gezien), per helft de bak en het deksel,
 * de hulpstukken, het detail van de naad (klikhaken, bodemlippen, lijmvoeg, lip van het deksel), de bevestiging van de
 * bordjes (4 schroeven op 4 paaltjes), het montageblad van de
 * rechterhelft, de draadlijst, het meetblad en het invulblad (zie werktekening.ts en opbouwTrein.ts).
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { Blad, onderdeelBlad, kader, kaderSmal, getal, type Deel, type P } from './werktekening';
// @ts-expect-error: het generatorscript is plain JavaScript
import { M, indeling, rechts, haakKlik, dekselKlik, bevestigingsGaten } from '../../voorbeelden/treinverlichting/maak-kabeldoos.mjs';
// @ts-expect-error: plain JavaScript
import { controleerAlles, DRADEN, MODULES, GROEPEN } from '../../voorbeelden/treinverlichting/opbouw.mjs';
// @ts-expect-error: plain JavaScript
import { STUKLIJST, KLEMMEN } from '../../voorbeelden/treinverlichting/schema/maak-schema.mjs';
// @ts-expect-error: plain JavaScript
import { HAAK, SPATEL } from '../../voorbeelden/treinverlichting/hulpstukken.mjs';
import { OPBOUW, montageBlad, draadlijstBlad, meetBlad, invulBlad, lengte } from './opbouwTrein';

const DIR = 'voorbeelden/treinverlichting';
const UIT = `${DIR}/tekeningen`;
const datum = /\((\d{4}-\d{2}-\d{2})\)/.exec(readFileSync(`${DIR}/README.md`, 'utf8'))?.[1] ?? '';
const PROJECT = { naam: 'Kabeldoos treinverlichting', datum, revisie: '5' };
const m = M as Record<string, any>;
const L = indeling() as { X: number; Z: number; xr: number; xn: number; sleutelgaten: [number, number][]; tules: { wand: string }[] };
const D = m.doos, G = m.raster, BZ = 2 * (L.Z + D.wand), HOOG = D.bodem + D.h + D.deksel, PET = 1.27;
const g1 = (v: number) => getal(v, 1), g2 = (v: number) => getal(v, 2);
const N = m.naad, R = m.rechts, P5 = rechts() as any, HK = haakKlik() as any, DK = dekselKlik() as any;
const LANG = P5.XRB + L.X + D.wand, BXL = N.x + L.X + D.wand, BXR = P5.XRB - (P5.xs - N.haak.l), HBAK = D.bodem + D.h;
const pct = (v: number) => `${getal(v * 100, 2)} %`;

const DELEN: Deel[] = [
  { f: 'Kabeldoos-bak-links.kcad', nr: 'TRN-01', naam: 'Bak links (bordjes)', materiaal: 'PETG (zwart)', maken: '3D-print rechtop, de bodem op het bed, zonder support', snede: true, schaal: [1, 2.5], dichtheid: PET, maten: [
    `Buitenmaat ${g1(BXL)} x ${g1(BZ)} x ${g1(HBAK)}, wand ${g1(D.wand)}, bodem ${g1(D.bodem)}; aan de naad (x = ${g1(N.x)}) open`,
    `Geen kabelgoten: 6 rijen bordjes, ${g1(G.b + 2 * G.wand + 2 * G.speling)} vrij tussen de rijen (draden en schroevendraaier)`,
    `Steunrail ${m.voet} hoog onder elk bordje; per bordje 4 schroefpaaltjes Ø${g1(m.schroefpaal.d)} x ${m.voet}, voorgat Ø${g1(m.schroefpaal.voorgat)} (TRN-07)`,
    `Paaltjes onder de gaten van de print: hart ${g1(m.schroefpaal.rand)} van beide randen; schroef ${m.schroefpaal.schroef.d.toFixed(1).replace(".", ",")} x ${m.schroefpaal.schroef.l} zelftappend`,
    `Naad: 5 uitsparingen ${g1(N.lip.l)} x ${g1(N.lip.b + 2 * N.spleet)} in de bodem, 2 kuiltjes ${g1(N.haak.kuil)} diep in de wand (TRN-06)`,
    `${L.tules.length} kabelinvoeren Ø${g1(D.invoer.gat)} op ${g1(D.invoer.y)} (5 links, 4 vooraan); draadsleuven tussen de rijen`,
    `2 sleutelgaten links: kop Ø${g1(D.sleutelgat.kop)}, sleuf ${g1(D.sleutelgat.schacht)} x ${D.sleutelgat.slag} naar voren (TRN-00)`,
    '2 schroefbussen Ø7 in de linkerhoeken, gat Ø2,6 (deksel)',
  ] },
  { f: 'Kabeldoos-bak-rechts.kcad', nr: 'TRN-02', naam: 'Bak rechts (modules)', materiaal: 'PETG (zwart)', maken: '3D-print rechtop, de bodem op het bed, zonder support', snede: true, schaal: [1, 2.5], dichtheid: PET, maten: [
    `Buitenmaat ${g1(P5.XRB - P5.xs)} x ${g1(BZ)} x ${g1(HBAK)}, met de klikhaken ${g1(BXR)} lang; aan de naad open`,
    `Palen Ø${g1(2 * R.modulePaal.r)} x ${g1(R.modulePaal.h)} onder elk gat van een module, gat achthoek Ø2,6 (3 mm) of Ø2,2 (PCA9685)`,
    '2 klikhouders (U 1,2 x 5 hoog) voor telkens 3 WAGO 221-415',
    `Naad: 2 pilaren ${g1(N.pilaar.l)} x ${g1(N.pilaar.d)} met bus, 2 klikhaken ${g1(N.haak.l)} x ${g1(N.haak.t)} (45° eronder), 5 bodemlippen (TRN-06)`,
    `${P5.tules.length} kabelinvoeren Ø${g1(D.invoer.gat)}: 3 vooraan, 2 achteraan, 4 rechts (ingangen)`,
    `DC-bus: gat Ø${g1(m.dcbus.gat)} in de achterwand op x ${g1(m.dcbus.x)}, ${g1(m.dcbus.y)} hoog; opening USB vooraan`,
    `2 sleutelgaten (x ${g1(R.sleutelgatX)}), 4 schroefbussen Ø7 (2 in de pilaren, 2 in de rechterhoeken)`,
    'Plaats van de modules: TRN-10. Eerst de modules nameten (AANNAME), dan printen',
  ] },
  { f: 'Hulpstukken.kcad', nr: 'TRN-03', naam: 'Hulpstukken', materiaal: 'PETG (grijs)', maken: '3D-print plat op het bed (één plaat)', dichtheid: PET, maten: [
    `2 werkhaken ${HAAK.l} x ${HAAK.b} x ${g1(HAAK.dik)} (rib ${g1(HAAK.rib)}): sleutelgat Ø${g1(HAAK.gat)} met sleuf ${g1(HAAK.sleuf)} (hangt aan een schroef onder de baan)`,
    `Knop Ø${g1(HAAK.knop.kop)} (45° eronder) op een hals Ø${g1(HAAK.knop.hals)} x ${g1(HAAK.knop.halsL)}: gaat in een sleutelgat van de doos`,
    `Spatel ${SPATEL.l} x ${SPATEL.b} x ${g1(SPATEL.dik)}, blad ${g1(SPATEL.blad)} dik over ${SPATEL.bladL}, haakje ${g1(SPATEL.haak)} x ${g1(SPATEL.haak)}`,
    'Aan de 2 voorste schroeven: de doos hangt verticaal 12 cm lager',
  ] },
  { f: 'Kabeldoos-deksel-links.kcad', nr: 'TRN-04', naam: 'Deksel links', materiaal: 'PETG (grijs)', maken: '3D-print plat, de buitenkant op het bed', snede: true, schaal: [1, 2.5], dichtheid: PET, maten: [
    `Plaat ${g1(N.deksel.x + L.X + D.wand)} x ${g1(BZ)} x ${g1(D.deksel)}, links hoeken R${D.r}`,
    'Centreerrand 2 breed en 1,55 hoog langs links, achter en voor (0,3 speling in de bak)',
    `Sponning aan de naad: ${g1(N.deksel.lap + N.spleet)} breed, daar ${g1(N.deksel.buiten)} dik; 4 groeven ${g1(N.deksel.groef)} diep voor de nokken`,
    '2 gaten Ø3,2 met verzinking 90° Ø6,2 (plaatschroef 3 x 12)',
  ] },
  { f: 'Kabeldoos-deksel-rechts.kcad', nr: 'TRN-05', naam: 'Deksel rechts', materiaal: 'PETG (grijs)', maken: '3D-print plat, de BINNENKANT op het bed (de lip op het bed)', snede: true, schaal: [1, 2.5], dichtheid: PET, maten: [
    `Plaat ${g1(P5.XRB - N.deksel.x)} x ${g1(BZ)} x ${g1(D.deksel)} met een lip ${g1(N.deksel.lap)} x ${g1(N.deksel.lip)} aan de naad (${g1(P5.XRB - N.deksel.x + N.deksel.lap)} lang)`,
    `Lip in vingers (sleuven ${g1(N.deksel.sleuf)}), per vinger een nok ${g1(N.deksel.nok.h)} hoog, ${N.deksel.nok.b} breed (rek ${pct(DK.rek)})`,
    'Geen centreerrand: de 4 verzonken schroeven en de lip houden het op zijn plaats',
    '4 gaten Ø3,2 met verzinking 90° Ø6,2 (plaatschroef 3 x 12)',
  ] },
];

/** boormal op ware grootte, van onderen gezien (het deksel naar je toe, de bodem tegen de baan), over 2 A3-bladen met
 *  een overlap van 30 mm en 2 uitlijnkruisen: blad 1 de rechterhelft van de doos (op de mal links), blad 2 de linkerhelft */
function boormalBlad(deel: 1 | 2, blad: string): string {
  const b = new Blad(), SG = D.sleutelgat, xl = -(L.X + D.wand), xr = P5.XRB;
  // het stuk van de doos (doosmaat x) op dit blad, met 30 mm overlap rond x = 110 (de naad)
  const [xa, xe] = deel === 1 ? [95, xr] : [xl, 125];
  const c: P = [28 + (xe - xa) / 2, 152]; // de mal links op het blad, de uitleg rechts ervan
  const mid = (xa + xe) / 2;
  const to = (x: number, z: number): P => [c[0] - (x - mid), c[1] - z];
  const ZB = BZ / 2;
  // de omtrek: boven- en onderrand, het eind van de doos als het op dit blad ligt, de rand van het blad (stippel)
  b.lijn(to(xa, -ZB), to(xe, -ZB), 0.5); b.lijn(to(xa, ZB), to(xe, ZB), 0.5);
  if (deel === 1) b.lijn(to(xr, -ZB), to(xr, ZB), 0.5); else b.lijn(to(xl, -ZB), to(xl, ZB), 0.5);
  const xk = deel === 1 ? xa : xe;
  b.lijn(to(xk, -ZB - 8), to(xk, ZB + 8), 0.3, 'stroke-dasharray="4 2"');
  b.tekst(to(xk, ZB + 10), deel === 1 ? 'blad 2 hier over leggen' : 'hier knippen', 2.6, 'middle', { vet: true });
  b.lijn(to(N.x, -ZB), to(N.x, ZB), 0.18, 'stroke-dasharray="1 1"');
  b.tekst(to(N.x, -ZB + 4), 'naad', 2.2, 'middle');
  // 2 uitlijnkruisen in de overlap (op beide bladen op dezelfde plaats)
  for (const [z, t] of [[-60, 'A'], [60, 'B']] as [number, string][]) {
    const p = to(110, z);
    b.cirkel(p, 4, 0.3); b.lijn([p[0] - 7, p[1]], [p[0] + 7, p[1]], 0.3); b.lijn([p[0], p[1] - 7], [p[0], p[1] + 7], 0.3);
    b.tekst([p[0] + 6, p[1] + 2], t, 3, 'start', { vet: true });
  }
  // de sleutelgaten op dit blad: de schroef aan het eind van de sleuf (vergrendeld), het grote gat gestippeld
  const gaten = (bevestigingsGaten() as [number, number][]).filter(([x]) => x > xa && x < xe).map(([x, z]) => [x, z + SG.slag] as [number, number]);
  for (const [x, z] of gaten) {
    const p = to(x, z);
    b.cirkel(p, 2, 0.35);
    b.lijn([p[0] - 6, p[1]], [p[0] + 6, p[1]], 0.25);
    b.lijn([p[0], p[1] - 6], [p[0], p[1] + 6], 0.25);
    const k = to(x, z - SG.slag);
    b.el.push(`<circle cx="${k[0].toFixed(2)}" cy="${b.y(k[1]).toFixed(2)}" r="${(SG.kop / 2).toFixed(2)}" fill="none" stroke="#777" stroke-width="0.2" stroke-dasharray="1.5 1"/>`);
    // maat vanaf het uiteinde van de doos op dit blad en vanaf de achterwand
    const xEind = deel === 1 ? xr : xl, hi = to(0, -ZB)[1];
    b.maatH(to(xEind, 0)[0], p[0], hi, hi + 6 + (z > 0 ? 7 : 0), g1(Math.abs(xEind - x)));
    b.maatV(p[1], hi, to(xEind, 0)[0], to(xEind, 0)[0] + (deel === 1 ? -1 : 1) * (6 + (z > 0 ? 7 : 0)), g1(z + ZB));
  }
  b.tekst(to(0.5 * (xa + xe), -ZB + 10), 'ACHTER', 3, 'middle', { vet: true });
  b.tekst(to(0.5 * (xa + xe), ZB - 8), deel === 1 ? 'VOOR (USB, modules)' : 'VOOR (bordjes)', 3, 'middle', { vet: true });
  if (deel === 1) b.tekst(to(xr - 6, 0), 'ingangen (tules)', 2.6, 'middle', { hoek: 90 });
  else b.tekst(to(xl + 7, 0), 'tules links', 2.6, 'middle', { hoek: 90 });
  // controlemaat en de uitleg rechts
  const tx = 278;
  b.lijn([tx, 72], [tx + 100, 72], 0.5); b.lijn([tx, 69], [tx, 75], 0.5); b.lijn([tx + 100, 69], [tx + 100, 75], 0.5);
  b.tekst([tx + 50, 76], 'controle: 100 mm (afdrukken op 100 %)', 2.8, 'middle');
  const regels = deel === 1 ? [
    `Boormal 1:1, blad 1 van 2 (rechterhelft van de doos)`,
    'Van onderen gezien (het deksel naar je toe, de bodem',
    'tegen de baan): de modules links, de bordjes rechts.',
    '',
    '1  Beide bladen afdrukken op A3 op 100 %, de 100 mm',
    '    nameten.',
    '2  Blad 2 langs "hier knippen" afknippen en over blad 1',
    '    leggen tot de kruisen A en B samenvallen; tapen.',
    '3  De mal onder de baan plakken, de 4 kruisjes voorboren',
    '    Ø2,5; 4 bolkopschroeven 4 x 20 indraaien tot de kop',
    '    4 mm onder de baan staat.',
    `4  De doos met de grote gaten over de koppen houden en`,
    `    ${SG.slag} mm naar achteren schuiven, dan aandraaien.`,
    '',
    `Doos ${g1(LANG)} x ${g1(BZ)} x ${g1(HOOG)} (met het deksel).`,
    'Laat rondom 60 mm vrij voor de kabels.',
  ] : [
    'Boormal 1:1, blad 2 van 2 (linkerhelft van de doos)',
    'Van onderen gezien: de bordjes rechts op de mal.',
    '',
    'Langs de stippellijn "hier knippen" afknippen en over',
    'blad 1 leggen tot de kruisen A en B samenvallen.',
    'Verder zoals op blad 1.',
  ];
  let ty = 272;
  for (const r of regels) { b.tekst([tx, ty], r, 2.6, 'start', { vet: ty === 272 }); ty -= 5; }
  kaderSmal(b, { nr: `TRN-00${deel === 1 ? 'a' : 'b'}`, naam: `Boormal onder de baan (${deel}/2)`, schaal: '1:1 (A3)', blad, soort: 'Boormal (mal 1:1)' }, PROJECT);
  return b.svg();
}

/** TRN-06: de naad tussen de 2 helften (klikhaken, bodemlippen, lijmvoeg, lip van het deksel), met de klikberekening */
function naadBlad(blad: string): string {
  const b = new Blad(), H = N.haak, Z = L.Z, xs = P5.xs, sp = N.spleet, tip = xs - H.l, Nd = N.deksel;
  const poly = (to: (x: number, y: number) => P, pts: [number, number][], w = 0.35, vul = 'none', extra = '') => b.el.push(`<polygon points="${pts.map(([x, y]) => { const p = to(x, y); return `${p[0].toFixed(2)},${b.y(p[1]).toFixed(2)}`; }).join(' ')}" fill="${vul}" stroke="#111" stroke-width="${w}" ${extra}/>`);
  const ARC = 'fill-opacity="0.18"';
  b.tekst([30, 280], 'Naad tussen de helften: klikhaken, bodemlippen, lijmvoeg en de lip van het deksel', 3.6, 'start', { vet: true });
  // 1. bovenaanzicht van de hoek achteraan (5:1): de wand van links met het kuiltje, de pilaar, de haak met de nok
  {
    const s = 5, o: P = [40, 252], x0 = tip - 3, z0 = -Z - D.wand - 1;
    const to = (x: number, z: number): P => [o[0] + (x - x0) * s, o[1] - (z - z0) * s];
    b.tekst([o[0], 268], '1  Bovenaanzicht achteraan op 20 hoog (5:1)', 2.8, 'start', { vet: true });
    poly(to, [[x0, -Z - D.wand], [N.x, -Z - D.wand], [N.x, -Z], [tip + H.nok.l + 0.3, -Z], [tip + H.nok.l + 0.3, -Z - H.kuil], [tip - 0.3, -Z - H.kuil], [tip - 0.3, -Z], [x0, -Z]], 0.4, '#555', ARC);
    poly(to, [[xs, -Z - D.wand], [xs + N.pilaar.l, -Z - D.wand], [xs + N.pilaar.l, -Z + N.pilaar.d], [xs, -Z + N.pilaar.d]], 0.4, '#555', ARC);
    poly(to, [[tip, -Z + sp + H.t], [xs, -Z + sp + H.t], [xs, -Z + sp], [tip + H.nok.l, -Z + sp], [tip + H.nok.l, -Z - H.nok.d + sp], [tip + H.nok.ramp, -Z - H.nok.d + sp], [tip, -Z + sp]], 0.4, '#1f4fa3', ARC);
    b.tekst(to(x0 + 0.5, -Z - D.wand + 0.7), 'achterwand links', 2.2, 'start');
    b.tekst(to(xs + N.pilaar.l / 2, -Z + 3.6), 'pilaar', 2.2, 'middle');
    b.tekst(to((tip + xs) / 2, -Z + 7.5), `klikhaak ${g1(H.l)} x ${g1(H.t)} (rechterhelft)`, 2.2, 'middle', { kleur: '#1f4fa3' });
    b.tekst(to(tip + 1.5, -Z - D.wand - 1.2), `nok ${g1(H.nok.d)} in kuiltje ${g1(H.kuil)}`, 2.0, 'middle');
    b.maatH(to(tip, 0)[0], to(xs, 0)[0], to(0, -Z + sp + H.t)[1], to(0, -Z + 4.4)[1], g1(H.l));
    b.tekst(to(N.x + 0.1, -Z - D.wand - 1.3), `lijmspleet ${g2(sp)}`, 2.0, 'middle');
    b.lijn(to(N.x, -Z - D.wand - 0.9), to(N.x + 0.1, -Z - D.wand + 0.4), 0.18);
  }
  // 2. zijaanzicht van de haak (doorsnede z = -111,5; 3:1): de 45°-onderkant, de nok, de bodem van beide helften
  {
    const s = 2.5, o: P = [40, 58], x0 = tip - 6, y0 = -D.bodem;
    const to = (x: number, y: number): P => [o[0] + (x - x0) * s, o[1] + (y - y0) * s];
    b.tekst([o[0], 172], '2  Doorsnede door de klikhaak (2,5:1), van voren gezien', 2.8, 'start', { vet: true });
    poly(to, [[x0, -D.bodem], [N.x, -D.bodem], [N.x, 0], [x0, 0]], 0.4, '#555', ARC);
    poly(to, [[xs, -D.bodem], [xs + 12, -D.bodem], [xs + 12, H.top + 6], [xs, H.top + 6]], 0.4, '#555', ARC); // de pilaar loopt verder tot het deksel
    poly(to, P5.haken[0].prof as [number, number][], 0.45, '#1f4fa3', ARC);
    poly(to, [[tip, H.nok.y0], [tip + H.nok.l, H.nok.y0], [tip + H.nok.l, H.nok.y1], [tip, H.nok.y1]], 0.3, 'none', 'stroke-dasharray="1 0.8"');
    b.tekst(to(x0 + 2, 1.2), 'bodem links', 2.0, 'start');
    b.tekst(to(xs + 6, (H.top + 6) / 2), `pilaar (tot ${g1(D.h)})`, 2.2, 'middle', { hoek: 90 });
    b.tekst(to(tip + 2, H.top + 1.5), `haak, top ${g1(H.top)}`, 2.2, 'start', { kleur: '#1f4fa3' });
    b.tekst(to(tip + H.nok.l + 1, (H.nok.y0 + H.nok.y1) / 2), `nok ${g1(H.nok.y0)}..${g1(H.nok.y1)}`, 2.0, 'start');
    b.tekst(to(x0 + 1, -D.bodem - 4.5), 'onderkant 45°: print zonder support', 2.2, 'start', { vet: true });
    b.maatV(to(0, 0)[1], to(0, H.top)[1], to(xs + 12, 0)[0], to(xs + 12, 0)[0] + 7, g1(H.top));
  }
  // 3. doorsnede door het deksel aan de naad (6:1): de linkerhelft (sponning, groef), de lip met de nok
  {
    const s = 6, o: P = [200, 214], x0 = Nd.x - Nd.lap - 4, y0 = D.h;
    const to = (x: number, y: number): P => [o[0] + (x - x0) * s, o[1] + (y - y0) * s];
    const xt = Nd.x - Nd.lap, yb = y0 + D.deksel - Nd.buiten, yl = y0 + Nd.lip;
    b.tekst([o[0], 268], '3  Doorsnede door een nok van het deksel (6:1)', 2.8, 'start', { vet: true });
    poly(to, [[x0, y0], [xt - sp, y0], [xt - sp, yb], [xt, yb], [xt, yb + Nd.groef], [xt + 0.2 + Nd.nok.l + 0.3, yb + Nd.groef], [xt + 0.2 + Nd.nok.l + 0.3, yb], [Nd.x, yb], [Nd.x, y0 + D.deksel], [x0, y0 + D.deksel]], 0.4, '#777', ARC);
    poly(to, [[xt, y0], [Nd.x + 6, y0], [Nd.x + 6, y0 + D.deksel], [Nd.x + sp, y0 + D.deksel], [Nd.x + sp, yl], [xt + 0.2 + Nd.nok.l, yl], [xt + 0.2 + Nd.nok.l, yl + Nd.nok.h], [xt + 0.2 + Nd.nok.ramp, yl + Nd.nok.h], [xt + 0.2, yl], [xt, yl]], 0.4, '#1f4fa3', ARC);
    b.tekst(to(x0 + 1, y0 + D.deksel + 1.2), 'deksel links (buitenkant op het bed)', 2.0, 'start');
    b.tekst(to(Nd.x + 1, y0 - 1.5), 'deksel rechts (binnenkant op het bed)', 2.0, 'start', { kleur: '#1f4fa3' });
    b.tekst(to(xt + 3, y0 - 1.5), `lip ${g1(Nd.lap)} x ${g1(Nd.lip)}`, 2.0, 'middle', { kleur: '#1f4fa3' });
    b.maatV(to(0, y0)[1], to(0, y0 + D.deksel)[1], to(x0, 0)[0], to(x0, 0)[0] - 6, g1(D.deksel));
  }
  // 4. de bodem aan de naad van boven (1:2): de 5 bodemlippen
  {
    const s = 0.5, o: P = [210, 120];
    const to = (x: number, z: number): P => [o[0] + (x - N.x) * s, o[1] - z * s];
    b.tekst([o[0] - 10, 186], '4  Bodem aan de naad (1:2): 5 lippen', 2.8, 'start', { vet: true });
    b.lijn(to(N.x - 40, -Z - D.wand), to(N.x + 40, -Z - D.wand), 0.4); b.lijn(to(N.x - 40, Z + D.wand), to(N.x + 40, Z + D.wand), 0.4);
    const zz = [-Z - D.wand, ...N.lip.z.flatMap((z: number) => [z - N.lip.b / 2, z + N.lip.b / 2]), Z + D.wand];
    for (let i = 0; i < zz.length - 1; i += 2) b.lijn(to(N.x, zz[i]), to(N.x, zz[i + 1]), 0.4);
    for (const z of N.lip.z) poly(to, [[N.x, z - N.lip.b / 2], [N.x - N.lip.l, z - N.lip.b / 2], [N.x - N.lip.l, z + N.lip.b / 2], [N.x, z + N.lip.b / 2]], 0.4, '#1f4fa3', ARC);
    b.tekst(to(N.x - 20, Z - 10), 'links', 2.4, 'middle'); b.tekst(to(N.x + 20, Z - 10), 'rechts', 2.4, 'middle');
    b.tekst(to(N.x + 4, N.lip.z[0]), `lip ${g1(N.lip.b)} x ${g1(N.lip.l)}, ${g1(sp)} rondom`, 2.0, 'start');
  }
  // de berekening en de werkwijze
  let y = 160;
  const x0 = 262;
  const rg = (t: string, vet = false) => { b.tekst([x0, y], t, 2.3, 'start', { vet }); y -= 4.1; };
  rg('Klikberekening (PETG, E = 2100 MPa, rek ≤ 2 %)', true);
  rg(`Haak: l ${g1(HK.l)}, t ${g1(HK.t)}, hoogte ${g1(HK.b0)} (punt) tot ${g1(HK.bVoet)} (voet), nok ${g1(HK.d)}`);
  rg(`J = ∫x²/(b0+x)dx; F = d·E·t³/(12 J) = ${g1(HK.F)} N; rek = 6 F l/(b t² E) = ${pct(HK.rek)}`);
  rg(`Inklikken over ${g1(HK.hoek)}° (µ 0,3): ${g1(HK.inklik)} N per haak, 2 haken ${g1(2 * HK.inklik)} N`);
  rg(`Lip deksel: 4 vingers ${g1(DK.vingers[0])} breed, t ${g1(DK.t)}, l ${g1(DK.l)}, doorbuiging ${g2(DK.d)}`);
  rg(`rek 1,5 t d / l² = ${pct(DK.rek)}; inklikken samen ${g1(DK.inklik)} N`);
  y -= 2;
  rg('Verbinden', true);
  rg('1  Droog passen: de helften op een vlakke tafel tegen elkaar schuiven,');
  rg('    de bodemlippen in hun uitsparingen, tot beide haken klikken.');
  rg('2  Lijmen (eventueel): uit elkaar (de punt van elke haak met een kleine');
  rg('    schroevendraaier van de wand weg trekken), 2K-epoxy op de stootvlakken,');
  rg('    de lippen en de buitenkant van de haken; opnieuw inklikken; 24 u laten');
  rg(`    uitharden op de tafel. Lijmspleet overal ${g2(sp)}.`);
  rg('3  Deksel: de rechterhelft met de lip onder de linkerhelft schuiven tot de');
  rg('    4 nokken klikken (eventueel lijm in de sponning), dan 6 schroeven.');
  kader(b, { nr: 'TRN-06', naam: 'Naad: klikhaken en lijmvoeg', materiaal: 'PETG (zwart en grijs)', maken: 'inklikken, eventueel lijmen', massa: '—', schaal: '5:1, 2,5:1, 6:1, 1:2', blad, soort: 'Detailtekening' }, PROJECT);
  return b.svg();
}


/** TRN-07: de bevestiging van de bordjes (Ian, 2026-11-15: "ik wil ze geschroefd hebben. Gaten zitten op 2mm op 2mm van
 *  de hoeken van het bordje"): een bordje van boven (3:1) met de 4 schroefpaaltjes, een doorsnede door een paaltje (8:1)
 *  met de schroef, en de tabel met de plaats van elk bordje */
function bevestigingBlad(blad: string): string {
  const Lg = indeling() as unknown as { paaltjes: { nr: number; x: number; z: number }[]; rijen: { soort: string; nr: number; cx: number; cz: number }[][]; X: number; Z: number };
  const b = new Blad(), B = m.bordje, SP = m.schroefpaal, S = SP.schroef, sd = getal(SP.schroef.d, 1).includes(',') ? getal(SP.schroef.d, 1) : `${getal(SP.schroef.d, 1)},0`;
  b.tekst([30, 280], 'Bevestiging van de bordjes: 4 schroeven per bordje op 4 paaltjes in de bodem (64 in totaal)', 3.6, 'start', { vet: true });
  // 1. een bordje van boven, 3:1
  const s = 3, o: P = [62, 180];
  const to = (x: number, z: number): P => [o[0] + (x + B.x / 2) * s, o[1] + (B.z / 2 - z) * s];
  b.tekst([32, 266], '1  Bordje van boven (3:1), z naar voren = omlaag', 2.8, 'start', { vet: true });
  const rh = (x0: number, z0: number, x1: number, z1: number, w = 0.35, vul = 'none', extra = '') => {
    const p = to(x0, z1), q = to(x1, z0); // z1 (achter) ligt lager op het blad dan z0
    b.el.push(`<rect x="${p[0].toFixed(2)}" y="${b.y(q[1]).toFixed(2)}" width="${(q[0] - p[0]).toFixed(2)}" height="${(q[1] - p[1]).toFixed(2)}" fill="${vul}" stroke="#111" stroke-width="${w}" ${extra}/>`);
  };
  rh(-B.x / 2, -B.z / 2, B.x / 2, B.z / 2, 0.6);
  const kl = (B.klem.n * B.klem.steek) / 2;
  rh(-kl, B.z / 2 - 0.2 - B.klem.diep, kl, B.z / 2 - 0.2, 0.3, '#2f7d32', 'fill-opacity="0.25"');
  rh(-kl, -B.z / 2 + 0.2, kl, -B.z / 2 + 0.2 + B.klem.diep, 0.3, '#2f7d32', 'fill-opacity="0.25"');
  rh(-B.x / 2 + 0.2, -B.eind.steek, -B.x / 2 + 0.2 + B.eind.diep, B.eind.steek, 0.3, '#2f7d32', 'fill-opacity="0.25"');
  rh(B.x / 2 - 0.2 - B.eind.diep, -B.eind.steek, B.x / 2 - 0.2, B.eind.steek, 0.3, '#2f7d32', 'fill-opacity="0.25"');
  b.tekst(to(0, B.z / 2 - 4.4), 'klemstrook voor (16 klemmen)', 2.2, 'middle');
  b.tekst(to(0, -B.z / 2 + 2.6), 'klemstrook achter (16 klemmen)', 2.2, 'middle');
  b.tekst(to(-B.x / 2 + 4, -0.7), 'eindklem', 2, 'middle');
  b.tekst(to(B.x / 2 - 4, -0.7), 'eindklem', 2, 'middle');
  const hoeken: [number, number][] = [];
  for (const kx of [-1, 1]) for (const kz of [-1, 1]) hoeken.push([kx * (B.x / 2 - SP.rand), kz * (B.z / 2 - SP.rand)]);
  for (const [x, z] of hoeken) {
    b.cirkel(to(x, z), (S.kop / 2) * s, 0.5); // de schroefkop
    b.cirkel(to(x, z), (SP.d / 2) * s, 0.2); // het paaltje (onder de print)
    b.el.push(`<circle cx="${to(x, z)[0].toFixed(2)}" cy="${b.y(to(x, z)[1]).toFixed(2)}" r="${(2.5 * s).toFixed(2)}" fill="none" stroke="#c8202f" stroke-width="0.2" stroke-dasharray="1.2 0.8"/>`);
    b.lijn([to(x, z)[0] - 1.5, to(x, z)[1]], [to(x, z)[0] + 1.5, to(x, z)[1]], 0.2); b.lijn([to(x, z)[0], to(x, z)[1] - 1.5], [to(x, z)[0], to(x, z)[1] + 1.5], 0.2);
  }
  // maten: 61,1 x 20,9, hart gat 2,0 van beide randen, 57,1 en 16,9 tussen de gaten
  const [xa, xb] = [to(-B.x / 2, 0)[0], to(B.x / 2, 0)[0]], [ya, yb] = [to(0, B.z / 2)[1], to(0, -B.z / 2)[1]];
  b.maatH(xa, xb, ya, ya - 10, g1(B.x));
  b.maatH(to(hoeken[0][0], 0)[0], to(hoeken[2][0], 0)[0], yb, yb + 6, g1(B.x - 2 * SP.rand));
  b.maatH(xa, to(hoeken[0][0], 0)[0], yb, yb + 12, g1(SP.rand));
  b.maatV(ya, yb, xb, xb + 10, g1(B.z));
  b.maatV(to(0, hoeken[1][1])[1], to(0, hoeken[0][1])[1], xa, xa - 8, g1(B.z - 2 * SP.rand));
  b.maatV(ya, to(0, hoeken[1][1])[1], xa, xa - 15, g1(SP.rand));
  b.tekst([o[0], ya - 18], `Ø${g1(S.kop)} schroefkop, Ø${g1(SP.d)} paaltje, rood gestreept: schacht van de schroevendraaier PH1 (Ø4,5 + 0,25 lucht)`, 2.1);
  b.tekst([o[0], ya - 21.5], 'Vrij tot de eindklem 1,45 en tot de klemstrook 8,2: de schroevendraaier raakt geen klem en geen draad.', 2.1);
  // 2. doorsnede door een paaltje, 8:1 (y omhoog: onderkant bodem -2,4, bovenkant bodem 0)
  const k = 8, c: P = [345, 170];
  const tp = (r: number, y: number): P => [c[0] + r * k, c[1] + y * k];
  b.tekst([270, 266], '2  Doorsnede door een paaltje (8:1)', 2.8, 'start', { vet: true });
  const bod = m.doos.bodem, voet = m.voet, pcb = B.pcb;
  const vlak = (r0: number, y0: number, r1: number, y1: number, vul: string, w = 0.4) => {
    const p = tp(r0, y1), q = tp(r1, y0);
    b.el.push(`<rect x="${p[0].toFixed(2)}" y="${b.y(p[1]).toFixed(2)}" width="${(q[0] - p[0]).toFixed(2)}" height="${(p[1] - q[1]).toFixed(2)}" fill="${vul}" stroke="#111" stroke-width="${w}"/>`);
  };
  const ar = '#9a9a9a';
  // de bodem (gearceerd grijs) met het paaltje, het voorgat open
  vlak(-5, -bod, -SP.voorgat / 2, 0, ar); vlak(SP.voorgat / 2, -bod, 5, 0, ar);
  vlak(-SP.voorgat / 2, -bod, SP.voorgat / 2, -bod + 0.4, ar);
  vlak(-SP.d / 2, 0, -SP.voorgat / 2, voet, ar); vlak(SP.voorgat / 2, 0, SP.d / 2, voet, ar);
  // de print (groen) met het gat
  vlak(-4.5, voet, -SP.gat / 2, voet + pcb, '#2f7d32'); vlak(SP.gat / 2, voet, 4.5, voet + pcb, '#2f7d32');
  // de schroef: kop, schacht (buitendiameter) tot de punt
  const punt = voet + pcb - S.l;
  vlak(-S.kop / 2, voet + pcb, S.kop / 2, voet + pcb + S.kopH, '#d9d9d9', 0.5);
  vlak(-S.d / 2, punt + 0.5, S.d / 2, voet + pcb, 'none', 0.45);
  b.el.push(`<polygon points="${[tp(-S.d / 2, punt + 0.5), tp(S.d / 2, punt + 0.5), tp(0, punt)].map((p) => `${p[0].toFixed(2)},${b.y(p[1]).toFixed(2)}`).join(' ')}" fill="none" stroke="#111" stroke-width="0.45"/>`);
  for (let y = punt + 0.8; y < voet + pcb; y += 0.8) b.lijn(tp(-S.d / 2, y), tp(S.d / 2, y - 0.3), 0.15);
  b.lijn(tp(0, -bod - 1), tp(0, voet + pcb + S.kopH + 1.5), 0.18, 'stroke-dasharray="3 1 0.6 1"');
  b.tekst(tp(-4.8, -bod / 2 - 0.3), 'bodem', 2.2); b.tekst(tp(-4.9, voet / 2 - 0.3), 'paaltje', 2.2); b.tekst(tp(-4.5, voet + pcb + 0.4), 'print', 2.2);
  b.tekst(tp(0, voet + pcb + S.kopH + 3.6), `schroef ${sd} x ${S.l}, bolkop`, 2.2, 'middle');
  // maten
  b.maatH(tp(-SP.d / 2, 0)[0], tp(SP.d / 2, 0)[0], tp(0, -bod)[1], tp(0, -bod)[1] - 10, `Ø${g1(SP.d)}`);
  b.maatH(tp(-SP.voorgat / 2, 0)[0], tp(SP.voorgat / 2, 0)[0], tp(0, -bod)[1], tp(0, -bod)[1] - 18, `Ø${g1(SP.voorgat)}`);
  b.maatH(tp(-S.kop / 2, 0)[0], tp(S.kop / 2, 0)[0], tp(0, voet + pcb + S.kopH)[1], tp(0, voet + pcb + S.kopH)[1] + 8, `Ø${g1(S.kop)}`);
  const xl = tp(-5, 0)[0];
  b.maatV(tp(0, 0)[1], tp(0, voet)[1], xl, xl - 8, g1(voet));
  b.maatV(tp(0, -bod)[1], tp(0, 0)[1], xl, xl - 8, g1(bod));
  b.maatV(tp(0, -bod)[1], tp(0, -bod + 0.4)[1], xl, xl - 16, '0,4');
  const xr = tp(S.kop / 2, 0)[0];
  b.maatV(tp(0, punt)[1], tp(0, voet + pcb)[1], xr, xr + 22, `${S.l}`);
  b.maatV(tp(0, punt)[1], tp(0, voet)[1], xr, xr + 12, g1(S.l - pcb));
  // 3. de schroef en het printen
  let y = 116;
  const r = (t: string, vet = false) => { b.tekst([262, y], t, 2.3, 'start', { vet }); y -= 3.8; };
  r('Schroef', true);
  r(`Plaatschroef voor kunststof ${sd} x ${S.l}, bolkop Ø${g1(S.kop)} x ${g1(S.kopH)}, kruiskop PH1,`);
  r('verzinkt (64 stuks + 6 reserve, bestellijst). Zelftappend: geen draad');
  r('tappen, geen insert.');
  r('Gat in de print', true);
  r(`Ø${g1(SP.gat)} (AANNAME, na te meten met een schuifmaat): de schroef van ${sd}`);
  r(`gaat er vrij door. Een schroef van 2,2 past NIET.`);
  r('Paaltje', true);
  r(`Ø${g1(SP.d)}, ${g1(voet)} hoog op de bodem (draagt de print, zoals de steunrail),`);
  r(`voorgat Ø${g1(SP.voorgat)} (0,8 x d) tot 0,4 boven de onderkant: wand ${g1((SP.d - SP.voorgat) / 2)} (4 lijnen),`);
  r(`de schroef grijpt ${g1(S.l - pcb)} diep in PETG. Rechtop geprint: geen support.`);
  r('Vastdraaien', true);
  r('Met de hand tot de kop de print raakt, dan nog 1/8 slag. Niet');
  r('doordraaien: dan breekt de draad in het paaltje uit.');
  // 4. de tabel: plaats van elk bordje en zijn 4 gaten
  const bordjes = Lg.rijen.flat().filter((d) => d.soort === 'bordje').sort((p, q) => p.nr - q.nr);
  y = 116;
  const x1 = 32;
  b.tekst([x1, y], 'Plaats van de paaltjes (hart, vanaf de binnenkant van de linkerwand en de achterwand)', 2.8, 'start', { vet: true });
  y -= 4.5;
  const kol = [x1 + 8, x1 + 30, x1 + 52, x1 + 74, x1 + 96]; // rechts uitgelijnd
  ['Bordje', 'x links', 'x rechts', 'z achter', 'z voor'].forEach((t, i) => b.tekst([kol[i], y], t, 2.1, 'end', { vet: true }));
  y -= 3.6;
  for (const d of bordjes) {
    const ps = Lg.paaltjes.filter((p) => p.nr === d.nr), xs = [...new Set(ps.map((p) => p.x))].sort((p, q) => p - q), zs = [...new Set(ps.map((p) => p.z))].sort((p, q) => p - q);
    [String(d.nr), getal(xs[0] + Lg.X, 2), getal(xs[1] + Lg.X, 2), getal(zs[0] + Lg.Z, 2), getal(zs[1] + Lg.Z, 2)].forEach((t, i) => b.tekst([kol[i], y], t, 2.1, 'end'));
    y -= 3.15;
  }
  kader(b, { nr: 'TRN-07', naam: 'Bevestiging van de bordjes', materiaal: 'PETG (zwart), bak links', maken: 'mee geprint; schroeven 2,0 x 6', massa: '—', schaal: '3:1, 8:1', blad, soort: 'Detailtekening' }, PROJECT);
  return b.svg();
}

describe('modules en bedrading (opbouw.mjs, versie 5)', () => {
  it('elke draad op een bestaande klem met het juiste net, modules in de rechterhelft, vrij en niet over elkaar, gaten vrij', () => {
    expect(controleerAlles()).toEqual([]);
  });
  it('elke module, zekering en klemmenstrook van het schema staat in opbouw.mjs', () => {
    const refs = new Set<string>(Object.keys(MODULES).map((r) => r.replace(/[ab]$/, '')));
    if (refs.has('-X6')) refs.add('-K1'); // de ESP zit in haar schroefklemadapter -X6
    const uitSchema = (STUKLIJST as string[][]).map((r) => r[0]).flatMap((a) => a.split(', ')).filter((a) => /^-(K|Q|T2|X[1-37])\d*$/.test(a));
    expect(uitSchema.length).toBeGreaterThan(8);
    expect(uitSchema.filter((a) => !refs.has(a))).toEqual([]);
  });
  it('de klemmen in het klemmenplan bestaan op hun module', () => {
    for (const [strook, [, rijen]] of Object.entries(KLEMMEN as Record<string, [string, { klem: string; bron?: [string, string] }[]]>)) {
      for (const r of rijen) if (r.bron) expect(MODULES[r.bron[0]].klemmen.some((k: { naam: string }) => k.naam === r.bron![1]), `${strook}:${r.klem}`).toBe(true);
    }
  });
  it('de draadlijst: 16 PWM-draden en 16 ingangen, de 0 V-retour per module 0,75 mm², elke draad een lengte', () => {
    const d = DRADEN as { nr: string; net: string; mm2: number; wat: string }[];
    expect(d.filter((q) => /^PWM\d+$/.test(q.net)).length).toBe(16);
    expect(d.filter((q) => /^IN\d+$/.test(q.net)).length).toBe(16);
    expect(d.filter((q) => /retour/.test(q.wat)).every((q) => q.mm2 >= 0.75)).toBe(true);
    for (const q of d) expect(lengte(q as never), q.nr).toBeGreaterThan(60);
    expect((GROEPEN as unknown[]).length).toBe(16);
  });
});

describe('tekeningen kabeldoos', () => {
  it('elke helft past in 230 x 230 en de doos is hoogstens 80 hoog', () => {
    expect(Math.max(BXL, BZ)).toBeLessThanOrEqual(m.bed.max);
    expect(Math.max(BXR, BZ)).toBeLessThanOrEqual(m.bed.max);
    expect(HOOG).toBeLessThanOrEqual(m.bed.hoog);
    expect(LANG).toBeGreaterThan(m.bed.max);
  });
  it.skipIf(!process.env.TREIN_TEKENINGEN)('boormal, bak, deksel, hulpstukken, naad en de bouwbladen', () => {
    mkdirSync(UIT, { recursive: true });
    for (const f of readdirSync(UIT).filter((f) => f.endsWith('.svg'))) unlinkSync(`${UIT}/${f}`);
    const totaal = DELEN.length + 4 + OPBOUW.length + 3;
    let n = 0;
    const blad = () => `${++n} / ${totaal}`;
    writeFileSync(`${UIT}/TRN-00a-boormal.svg`, boormalBlad(1, blad()));
    writeFileSync(`${UIT}/TRN-00b-boormal.svg`, boormalBlad(2, blad()));
    const bestand = (d: Deel) => `${d.nr}-${d.naam.toLowerCase().replace(/ \(.*\)$/, '').replace(/ /g, '-')}.svg`;
    DELEN.forEach((d) => writeFileSync(`${UIT}/${bestand(d)}`, onderdeelBlad(d, blad(), DIR, PROJECT)));
    writeFileSync(`${UIT}/TRN-06-naad.svg`, naadBlad(blad()));
    writeFileSync(`${UIT}/TRN-07-bevestiging-bordjes.svg`, bevestigingBlad(blad()));
    for (const o of OPBOUW) writeFileSync(`${UIT}/${o.nr}-${o.sleutel}.svg`, montageBlad(o.nr, blad(), PROJECT));
    writeFileSync(`${UIT}/TRN-14-draadlijst.svg`, draadlijstBlad('TRN-14', blad(), PROJECT));
    writeFileSync(`${UIT}/TRN-20-meetblad.svg`, meetBlad('TRN-20', blad(), PROJECT));
    writeFileSync(`${UIT}/TRN-21-invulblad.svg`, invulBlad('TRN-21', blad(), PROJECT));
  }, 1800000);
});
