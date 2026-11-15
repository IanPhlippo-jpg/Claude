/**
 * Werktekeningen van de kabeldoos, versie 5 (voorbeelden/treinverlichting/tekeningen): TREIN_TEKENINGEN=1 VOORBEELDEN=1
 * npx vitest run src/qa/tekeningenTrein.test.ts. A3 liggend, Europese projectie: de boormal op ware grootte over 2 bladen
 * met uitlijnkruisen (de 4 schroeven onder de baan, van onderen gezien), per helft de bak en het deksel,
 * de hulpstukken, het detail van de naad (klikhaken, bodemlippen, lijmvoeg, lip van het deksel), het montageblad van de
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
const D = m.doos, G = m.raster, A = m.aanslag, BZ = 2 * (L.Z + D.wand), HOOG = D.bodem + D.h + D.deksel, PET = 1.27;
const g1 = (v: number) => getal(v, 1), g2 = (v: number) => getal(v, 2);
const N = m.naad, R = m.rechts, P5 = rechts() as any, HK = haakKlik() as any, DK = dekselKlik() as any;
const LANG = P5.XRB + L.X + D.wand, BXL = N.x + L.X + D.wand, BXR = P5.XRB - (P5.xs - N.haak.l), HBAK = D.bodem + D.h;
const pct = (v: number) => `${getal(v * 100, 2)} %`;

const DELEN: Deel[] = [
  { f: 'Kabeldoos-bak-links.kcad', nr: 'TRN-01', naam: 'Bak links (bordjes)', materiaal: 'PETG (zwart)', maken: '3D-print rechtop, de bodem op het bed, zonder support', snede: true, schaal: [1, 2.5], dichtheid: PET, maten: [
    `Buitenmaat ${g1(BXL)} x ${g1(BZ)} x ${g1(HBAK)}, wand ${g1(D.wand)}, bodem ${g1(D.bodem)}; aan de naad (x = ${g1(N.x)}) open`,
    `Geen kabelgoten: 6 rijen bordjes, ${g1(G.b + 2 * G.wand + 2 * G.speling)} vrij tussen de rijen (draden en schroevendraaier)`,
    `Steunrail ${m.voet} hoog onder elk bordje; palen ${g1(m.kader.h)} hoog tussen de bordjes (X), ${g1(m.rij.paal)} speling`,
    `Per bordje 4 aanslagen ${A.l} x ${g1(A.t)} x ${g1(m.kader.h)} langs de lange kanten (Z), ${g1(G.speling)} speling`,
    `Per bordje 4 klemlippen ${g1(m.lip.t)} x ${g1(m.lip.b)}, haak ${g2(m.lip.haak)} met 45°, in een kuiltje ${g1(m.lip.kuil)} diep (rek 1,7 %)`,
    `Naad: 5 uitsparingen ${g1(N.lip.l)} x ${g1(N.lip.b + 2 * N.spleet)} in de bodem, 2 kuiltjes ${g1(N.haak.kuil)} diep in de wand (TRN-06)`,
    `${L.tules.length} kabelinvoeren Ø${g1(D.invoer.gat)} op ${g1(D.invoer.y)} (5 links, 4 vooraan); 512 gaatjes 2 x 2 voor de leddraden (TRN-07)`,
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


/** TRN-07: de gaatjes van 2 x 2 voor de leddraden in de bodem van de linkerhelft: een detail (4:1) van een strook tussen
 *  2 rijen bordjes en de tabel met elke gatenrij (z vanaf de achterwand, x van het eerste gaatje vanaf de linkerwand) */
function gaatjesBlad(blad: string): string {
  type Gat = { nr: number; kant: string; klem: number; x: number; z: number; strook: number; cx: number; rect: number[] };
  const Lg = indeling() as unknown as { gaatjes: Gat[]; eilandjes: number[][]; rijen: { soort: string; nr: number; cx: number; cz: number }[][]; X: number; Z: number };
  const b = new Blad(), B = m.bordje, GT = m.gaatje, A = m.aanslag;
  b.tekst([30, 280], 'Gaatjes 2 x 2 voor de leddraden in de bodem van de linkerhelft (per klem één)', 3.6, 'start', { vet: true });
  // 1. detail 4:1: bordje 4 (rij 2, midden) voor en bordje 7 (rij 3, midden) achter, de strook ertussen
  const d1 = Lg.rijen[1][1], d2 = Lg.rijen[2][1], s = 4, W = 54, x0 = d1.cx - W / 2, zA = d1.cz + B.z / 2 - 4, zB = d2.cz - B.z / 2 + 4;
  const o: P = [32, 250];
  const to = (x: number, z: number): P => [o[0] + (x - x0) * s, o[1] - (z - zA) * s];
  const rh = (r: number[], w = 0.3, vul = 'none', extra = '') => { const p = to(r[0], r[1]), q = to(r[2], r[3]); b.el.push(`<rect x="${Math.min(p[0], q[0]).toFixed(2)}" y="${b.y(Math.max(p[1], q[1])).toFixed(2)}" width="${Math.abs(q[0] - p[0]).toFixed(2)}" height="${Math.abs(q[1] - p[1]).toFixed(2)}" fill="${vul}" stroke="#111" stroke-width="${w}" ${extra}/>`); };
  b.tekst([o[0], 258], '1  Detail tussen rij 2 en rij 3 (bordje 5 en 8), van boven (4:1)', 2.8, 'start', { vet: true });
  rh([x0, zA, x0 + W, d1.cz + B.z / 2], 0.4, '#c8202f', 'fill-opacity="0.15"');
  rh([x0, d2.cz - B.z / 2, x0 + W, zB], 0.4, '#c8202f', 'fill-opacity="0.15"');
  b.tekst(to(d1.cx, zA + 1.2), `bordje ${d1.nr}: klemstrook voor (16 klemmen, steek 2,54)`, 2.2, 'middle');
  b.tekst(to(d2.cx, zB - 2.6), `bordje ${d2.nr}: klemstrook achter`, 2.2, 'middle');
  for (const e of Lg.eilandjes.filter((e) => e[0] > x0 - 1 && e[2] < x0 + W + 1 && e[1] > zA && e[3] < zB)) rh(e, 0.25, 'none', 'stroke-dasharray="1.5 1"');
  for (const g of Lg.gaatjes.filter((g) => g.x > x0 && g.x < x0 + W && g.z > zA && g.z < zB)) rh(g.rect, 0.3, '#111', 'fill-opacity="0.85"');
  for (const d of [d1, d2]) for (const kx of [-1, 1]) {
    const kz = d === d1 ? 1 : -1, xa = d.cx + kx * A.x - A.l / 2, za = kz > 0 ? d.cz + B.z / 2 + m.kader.speling : d.cz - B.z / 2 - m.kader.speling - A.t;
    rh([xa, za, xa + A.l, za + A.t], 0.3, '#888', 'fill-opacity="0.5"');
  }
  b.tekst(to(d1.cx + A.x, d1.cz + B.z / 2 + 2.6), 'aanslag', 2, 'middle');
  // maten: steek 2,54 (2 naburige klemmen), 5,08 in een rij, 2 x 2, afstand tot de rand 0,3 en 2,5, strook 9,2
  const g0 = Lg.gaatjes.filter((g) => g.nr === d1.nr && g.kant === 'voor').sort((p, q) => p.x - q.x);
  const rand1 = d1.cz + B.z / 2, rand2 = d2.cz - B.z / 2;
  const gEven = g0[0], gOneven = g0[1], gEven2 = g0[2];
  b.maatH(to(gEven.x, 0)[0], to(gOneven.x, 0)[0], to(0, rand1)[1], to(0, rand1)[1] + 7, '2,54');
  b.maatH(to(gEven.x, 0)[0], to(gEven2.x, 0)[0], to(0, zB)[1], to(0, zB)[1] + 6, '5,08');
  b.maatH(to(gEven.rect[0], 0)[0], to(gEven.rect[2], 0)[0], to(0, zA)[1], to(0, zA)[1] - 6, '2');
  const xm = to(x0 + 1, 0)[0];
  b.maatV(to(0, rand1)[1], to(0, rand2)[1], xm, xm - 9, getal(rand2 - rand1, 1));
  b.maatV(to(0, rand1)[1], to(0, gEven.rect[1])[1], to(gEven.rect[0], 0)[0], to(gEven.rect[0], 0)[0] - 4, getal(GT.rij[0], 1));
  b.maatV(to(0, rand1)[1], to(0, gOneven.rect[1])[1], to(gOneven.rect[2], 0)[0], to(gOneven.rect[2], 0)[0] + 4, getal(GT.rij[1], 1));
  b.tekst([o[0], 150], 'Elke draad door zijn eigen gaatje, recht omhoog in zijn klem. Om en om in 2 rijen: de klemmen staan op 2,54 en een', 2.3);
  b.tekst([o[0], 146], `gaatje van 2 liet in één rij maar 0,54 vlees. Rij 1 op ${getal(GT.rij[0], 1)}, rij 2 op ${getal(GT.rij[1], 1)} van de rand van het bordje; voor de even klemmen`, 2.3);
  b.tekst([o[0], 142], 'vooraan en de oneven achteraan: in een strook van 9,2 liggen 4 rijen om en om. Vlees: 3,08 in een rij, 2,4 tussen 2', 2.3);
  b.tekst([o[0], 138], `rijen, 0,58 schuin tussen 2 hoekpunten. Rond de gaatjes een eilandje van ${getal(GT.hoog, 1)} hoog (${getal(GT.rand, 0)} rand). Printen met de bodem op het`, 2.3);
  b.tekst([o[0], 134], 'bed: de gaatjes zijn staande vierkante kokers door de bodem van 2,4 (+0,4): geen support nodig.', 2.3);
  // 2. de tabel: elke gatenrij (band) met z vanaf de binnenkant van de achterwand en x van het eerste gaatje vanaf de
  // binnenkant van de linkerwand, per bordje
  const banden = new Map<string, Gat[]>();
  for (const g of Lg.gaatjes) { const k = getal(g.z, 2); banden.set(k, [...(banden.get(k) ?? []), g]); }
  const lijst = [...banden.values()].sort((p, q) => p[0].z - q[0].z);
  let y = 124; // de tabel onder het detail (de onderste helft van het blad), vrij van het titelblok
  const x1 = 32;
  b.tekst([x1, y], `Gatenrijen (${Lg.gaatjes.length} gaatjes 2 x 2, ${lijst.length} rijen)`, 2.8, 'start', { vet: true });
  y -= 4.5;
  b.tekst([x1, y], 'z: hart vanaf de achterwand (binnen); x: hart van het eerste gaatje vanaf de linkerwand', 1.9);
  y -= 3.6;
  b.tekst([x1, y], 'Nr   z        bordje: x eerste gaatje (8 per bordje, steek 5,08)', 2.0, 'start', { vet: true });
  y -= 3.3;
  lijst.forEach((g, i) => {
    const per = [...new Set(g.map((q) => q.nr))].sort((p, q) => p - q).map((nr) => `${nr}: ${getal(Math.min(...g.filter((q) => q.nr === nr).map((q) => q.x)) + Lg.X, 2)}`);
    b.tekst([x1, y], `${String(i + 1).padStart(2, ' ')}   ${getal(g[0].z + Lg.Z, 2)}   ${per.join('  ')}`, 2.0);
    y -= 3.15;
  });
  kader(b, { nr: 'TRN-07', naam: 'Gaatjes voor de leddraden', materiaal: 'PETG (zwart), bak links', maken: 'mee geprint (bodem op het bed)', massa: '—', schaal: '4:1', blad }, PROJECT);
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
    writeFileSync(`${UIT}/TRN-07-gaatjes.svg`, gaatjesBlad(blad()));
    for (const o of OPBOUW) writeFileSync(`${UIT}/${o.nr}-${o.sleutel}.svg`, montageBlad(o.nr, blad(), PROJECT));
    writeFileSync(`${UIT}/TRN-14-draadlijst.svg`, draadlijstBlad('TRN-14', blad(), PROJECT));
    writeFileSync(`${UIT}/TRN-20-meetblad.svg`, meetBlad('TRN-20', blad(), PROJECT));
    writeFileSync(`${UIT}/TRN-21-invulblad.svg`, invulBlad('TRN-21', blad(), PROJECT));
  }, 1800000);
});
