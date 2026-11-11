/**
 * Werktekeningen van de kabeldoos, versie 2 (voorbeelden/treinverlichting/tekeningen): TREIN_TEKENINGEN=1 VOORBEELDEN=1
 * npx vitest run src/qa/tekeningenTrein.test.ts. A3 liggend, Europese projectie: de boormal op ware grootte (de 4
 * schroeven onder de baan, van onderen gezien), de bak, het deksel en een gootdeksel met doorsnede, hoofdmaten,
 * maattabel en titelblok (zie werktekening.ts).
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { Blad, onderdeelBlad, kaderSmal, getal, type Deel, type P } from './werktekening';
// @ts-expect-error: het generatorscript is plain JavaScript
import { M, indeling, gootDeksels, vulgraad } from '../../voorbeelden/treinverlichting/maak-kabeldoos.mjs';

const DIR = 'voorbeelden/treinverlichting';
const UIT = `${DIR}/tekeningen`;
const datum = /\((\d{4}-\d{2}-\d{2})\)/.exec(readFileSync(`${DIR}/README.md`, 'utf8'))?.[1] ?? '';
const PROJECT = { naam: 'Kabeldoos treinverlichting', datum, revisie: '2' };
const m = M as Record<string, any>;
const L = indeling() as { X: number; Z: number; sleutelgaten: [number, number][]; tules: { wand: string }[] };
const D = m.doos, G = m.goot, BX = 2 * (L.X + D.wand), BZ = 2 * (L.Z + D.wand), HOOG = D.bodem + D.h + D.deksel, PET = 1.27;
const g1 = (v: number) => getal(v, 1), g2 = (v: number) => getal(v, 2);
const deksels = gootDeksels() as { soort: string; l: number }[];
const v = vulgraad() as { pErgst: number };
const lengtes = [...new Set(deksels.map((d) => `${d.soort === 'rand' ? 'rand ' : ''}${g1(d.l)}`))].map((k) => `${deksels.filter((d) => `${d.soort === 'rand' ? 'rand ' : ''}${g1(d.l)}` === k).length} x ${k}`).join(', ');

const DELEN: Deel[] = [
  { f: 'Kabeldoos-bak.kcad', nr: 'TRN-01', naam: 'Bak', materiaal: 'PETG (zwart)', maken: '3D-print rechtop, de bodem op het bed, zonder support', snede: true, schaal: [1, 2.5], dichtheid: PET, maten: [
    `Buitenmaat ${g1(BX)} x ${g1(BZ)} x ${g1(D.bodem + D.h)}, wand ${g1(D.wand)}, bodem ${g1(D.bodem)}, hoeken R${D.r}`,
    `Rij 1 tot 6 in een ring: voet ${g1(G.wand)} tot ${g1(G.sleufBodem)}, ${g1(G.speling)} speling rond de bordjes; vingers ${g1(G.vingerDik)} tot ${g1(G.top)}`,
    `Goten binnen ${g1(G.b)} (tussen de rijen), ${g1(G.achter)} (achter), ${g1(G.zij)} (zijkanten); sleuven tot ${g1(G.sleufBodem)}`,
    'Voor een klemmenrij een sleuf 3,24 per 2 klemmen; elders sleuven 4, vingers ≥ 5',
    `Klikgroef 45° x ${g2(G.groef.diep)} op ${g1(G.groef.y)} in de klikvingers (x = ±34,5); groef ${g1(G.neus.diep)} in de buitenwanden`,
    `Palen tussen de bordjes ${g1(m.kader.h)} hoog, steunrails ${m.voet} hoog; printpaaltjes Ø6, gat Ø2,2 (2,5 x 6)`,
    `${L.tules.length} kabelinvoeren Ø${g1(D.invoer.gat)} op ${g1(D.invoer.y)} (membraantule EMT 16); draadsleuven ${D.sleuf.b} x ${D.sleuf.l} onder de goten`,
    `4 sleutelgaten in de zijgoten: kop Ø${g1(D.sleutelgat.kop)}, sleuf ${g1(D.sleutelgat.schacht)} breed en ${D.sleutelgat.slag} lang naar voren (boormal TRN-00)`,
    'Links gat Ø12,2 (wartel M12); rechts opening USB; 4 dekselbussen Ø7, gat Ø2,6',
  ] },
  { f: 'Kabeldoos-deksel.kcad', nr: 'TRN-02', naam: 'Deksel', materiaal: 'PETG (grijs)', maken: '3D-print plat, de buitenkant op het bed', snede: true, schaal: [1, 2.5], dichtheid: PET, maten: [
    `Plaat ${g1(BX)} x ${g1(BZ)} x ${g1(D.deksel)}, hoeken R${D.r}`,
    'Centreerrand 2 breed en 1,55 hoog, valt met 0,3 speling in de bak (uitgespaard rond de 4 bussen)',
    `32 drukribben 4 x 10 op de eindklemmen, tot ${g1(m.voet + m.bordje.h + 0.3)} boven de bodem (0,3 boven de klemmen)`,
    '4 gaten Ø3,2 met verzinking 90° Ø6,2 (plaatschroef 3 x 12)',
  ] },
  { f: 'Gootdeksel.kcad', nr: 'TRN-03', naam: 'Gootdeksel', materiaal: 'PETG (grijs)', maken: '3D-print met de vlakke kant op het bed (één plaat)', snede: true, dichtheid: PET, maten: [
    `U-profiel: plaat ${g1(G.deksel.dik)}, benen ${g1(G.deksel.been)} buiten de vingers (${g1(G.deksel.speling)} speling)`,
    `Nokken 45° van ${g2(G.deksel.nok)} x ${G.deksel.nokLang} lang op ±34,5 van het midden: klikken in de groef op ${g1(G.groef.y)}`,
    'Randdeksel (achter, zijkanten): één been; aan de andere kant een neus in de groef van de buitenwand',
    `Alle deksels: ${lengtes}`,
    `Vulgraad van een goot tussen twee rijen hoogstens ${Math.round(v.pErgst * 100)} % (rekenblad, hoofdstuk 6)`,
  ] },
];

/** boormal 1:1, van onderen gezien (het deksel naar je toe, de bodem tegen de baan): x gespiegeld, achter boven */
function boormalBlad(blad: string): string {
  const b = new Blad();
  const c: P = [162, 152];
  const to = (x: number, z: number): P => [c[0] - x, c[1] - z];
  const lo = to(BX / 2, BZ / 2), hi = to(-BX / 2, -BZ / 2);
  b.rect(lo[0], lo[1], BX, BZ, 0.5);
  const SG = D.sleutelgat;
  // de schroef staat aan het eind van de sleuf (vergrendeld, de sleuf loopt naar voren); de kop gaat door het grote gat
  const gaten = L.sleutelgaten.map(([x, z]) => [x, z + SG.slag] as [number, number]);
  for (const [x, z] of gaten) {
    const p = to(x, z);
    b.cirkel(p, 2, 0.35);
    b.lijn([p[0] - 6, p[1]], [p[0] + 6, p[1]], 0.25);
    b.lijn([p[0], p[1] - 6], [p[0], p[1] + 6], 0.25);
    const k = to(x, z - SG.slag);
    b.el.push(`<circle cx="${k[0].toFixed(2)}" cy="${b.y(k[1]).toFixed(2)}" r="${(SG.kop / 2).toFixed(2)}" fill="none" stroke="#777" stroke-width="0.2" stroke-dasharray="1.5 1"/>`);
  }
  // maten vanaf de linker- en de bovenrand van de mal (de rechterwand en de achterwand van de doos)
  const xs = [...new Set(gaten.map(([x]) => x))].sort((a, q) => q - a), zs = [...new Set(gaten.map(([, z]) => z))].sort((a, q) => a - q);
  xs.forEach((x, i) => b.maatH(lo[0], to(x, 0)[0], hi[1], hi[1] + 6 + i * 7, g1(BX / 2 - x)));
  zs.forEach((z, i) => b.maatV(to(0, z)[1], hi[1], lo[0], lo[0] - 6 - i * 7, g1(z + BZ / 2)));
  b.maatH(lo[0], hi[0], lo[1], lo[1] - 7, `${g1(BX)} (buitenmaat)`);
  b.maatV(lo[1], hi[1], hi[0], hi[0] + 7, `${g1(BZ)} (buitenmaat)`);
  const t = (x: number, z: number, s: string, h: number, anker: 'start' | 'middle' | 'end', opts = {}) => b.tekst(to(x, z), s, h, anker, opts);
  t(0, -BZ / 2 + 10, 'ACHTER', 3, 'middle', { vet: true });
  t(0, BZ / 2 - 8, 'VOOR (ESP, ingangen)', 3, 'middle', { vet: true });
  t(BX / 2 - 5, 50, 'USB', 2.6, 'start', { hoek: 90 });
  t(-BX / 2 + 7, 50, 'wartel 12 V', 2.6, 'start', { hoek: 90 });
  // controlemaat
  b.lijn([302, 72], [402, 72], 0.5); b.lijn([302, 69], [302, 75], 0.5); b.lijn([402, 69], [402, 75], 0.5);
  b.tekst([352, 76], 'controle: 100 mm (afdrukken op 100 %)', 2.8, 'middle');
  const regels = [
    'Boormal op ware grootte, van onderen gezien',
    '(het deksel naar je toe, de bodem tegen de baan):',
    'de USB links, de wartel rechts.',
    '',
    '1  Mal onder de baan plakken (tape), de 4 kruisjes',
    '    voorboren Ø2,5.',
    '2  4 bolkopschroeven 4 x 20 indraaien tot de kop',
    '    4 mm onder de baan staat.',
    '3  De doos met de grote gaten (stippellijn) over de',
    `    koppen houden en ${SG.slag} mm naar achteren schuiven`,
    '    (op de mal naar boven): de schroef zit dan op het',
    '    kruisje, aan het eind van de sleuf.',
    '4  De schroeven aandraaien tot de doos vastzit.',
    '',
    `Doos ${g1(BX)} x ${g1(BZ)} x ${g1(HOOG)} (met het deksel).`,
    'Laat links en rechts 60 mm vrij voor de kabels.',
  ];
  let ty = 272;
  for (const r of regels) { b.tekst([300, ty], r, 2.6, 'start', { vet: ty === 272 }); ty -= 5; }
  kaderSmal(b, { nr: 'TRN-00', naam: 'Boormal onder de baan', schaal: '1:1 (A3)', blad, soort: 'Boormal (mal 1:1)' }, PROJECT);
  return b.svg();
}

describe('tekeningen kabeldoos', () => {
  it('de doos past in 230 x 230 en is hoogstens 80 hoog', () => {
    expect(Math.max(BX, BZ)).toBeLessThanOrEqual(m.bed.max);
    expect(HOOG).toBeLessThanOrEqual(m.bed.hoog);
  });
  it.skipIf(!process.env.TREIN_TEKENINGEN)('boormal, bak, deksel en gootdeksel', () => {
    mkdirSync(UIT, { recursive: true });
    for (const f of readdirSync(UIT).filter((f) => f.endsWith('.svg'))) unlinkSync(`${UIT}/${f}`);
    const totaal = DELEN.length + 1;
    writeFileSync(`${UIT}/TRN-00-boormal.svg`, boormalBlad(`1 / ${totaal}`));
    DELEN.forEach((d, i) => writeFileSync(`${UIT}/${d.nr}-${d.naam.toLowerCase()}.svg`, onderdeelBlad(d, `${i + 2} / ${totaal}`, DIR, PROJECT)));
  }, 1800000);
});
