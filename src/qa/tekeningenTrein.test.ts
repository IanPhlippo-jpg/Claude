/**
 * Werktekeningen van de kabeldoos (voorbeelden/treinverlichting/tekeningen): TREIN_TEKENINGEN=1 VOORBEELDEN=1 npx vitest
 * run src/qa/tekeningenTrein.test.ts. A3 liggend, Europese projectie: de boormal op ware grootte (de 4 schroeven onder de
 * baan), de bak en het deksel met doorsnede, hoofdmaten, maattabel en titelblok (zie werktekening.ts).
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Blad, onderdeelBlad, kaderSmal, getal, type Deel, type P } from './werktekening';
// @ts-expect-error: het generatorscript is plain JavaScript
import { M, indeling, bevestigingsGaten } from '../../voorbeelden/treinverlichting/maak-kabeldoos.mjs';

const DIR = 'voorbeelden/treinverlichting';
const UIT = `${DIR}/tekeningen`;
const datum = /\((\d{4}-\d{2}-\d{2})\)/.exec(readFileSync(`${DIR}/README.md`, 'utf8'))?.[1] ?? '';
const PROJECT = { naam: 'Kabeldoos treinverlichting', datum, revisie: '1' };
const m = M as Record<string, any>;
const { rijen, binnenX, binnenZ } = indeling() as { rijen: unknown[]; binnenX: number; binnenZ: number };
const D = m.doos, BX = binnenX + 2 * D.wand, BZ = binnenZ + 2 * D.wand, HOOG = D.bodem + D.h + D.deksel;
const PET = 1.27;

const DELEN: Deel[] = [
  { f: 'Kabeldoos-bak.kcad', nr: 'TRN-01', naam: 'Bak', materiaal: 'PETG (zwart)', maken: '3D-print rechtop, de bodem op het bed, zonder support', snede: true, schaal: [1, 2.5], dichtheid: PET, maten: [
    `Buitenmaat ${getal(BX)} x ${getal(BZ)} x ${getal(D.bodem + D.h)}, wand ${getal(D.wand)}, bodem ${getal(D.bodem)}, hoeken R${D.r}`,
    `4 sleutelgaten: kop Ø${getal(D.sleutelgat.kop)}, sleuf ${getal(D.sleutelgat.schacht)} breed, sleuf ${D.sleutelgat.slag} mm (boormal TRN-00)`,
    `Per rij bordjes een kader: uitsparing ${getal(m.bordje.x + 2 * m.kader.speling)} x ${getal(m.bordje.z + 2 * m.kader.speling)}, ${getal(m.kader.h)} hoog, lip ${getal(m.kader.lip.b)} over de draadgang`,
    `Steunrail onder elk bordje (${m.voet} hoog); drukribben in het deksel houden de bordjes vast`,
    `Kabelgoot links en rechts: tussenwand ${getal(D.goot.dik)} op ${D.goot.x} van de wand, ${D.goot.h} hoog, opening ${D.goot.open} bij elke draadgang`,
    `Kabelinvoer ${D.invoer.b} breed, ${D.invoer.diep} diep vanaf de rand (4 wanden); 2 binderspleten 1,8 x 3 per invoer`,
    `Draadsleuven ${D.sleuf.b} x ${D.sleuf.l} in de bodem, tussen de rijen en langs de achterwand`,
    'Printpaaltjes Ø6, gat Ø2,2 (2,5 x 6); 6 dekselbussen Ø8, gat Ø2,6 (3 x 12)',
    'Links gat Ø12,2 (wartel M12 x 1,5); rechts opening voor de 2 USB-poorten',
  ] },
  { f: 'Kabeldoos-deksel.kcad', nr: 'TRN-02', naam: 'Deksel', materiaal: 'PETG (grijs)', maken: '3D-print plat, de buitenkant op het bed', snede: true, schaal: [1, 2.5], dichtheid: PET, maten: [
    `Plaat ${getal(BX)} x ${getal(BZ)} x ${getal(D.deksel)}, hoeken R${D.r}`,
    'Centreerrand 2 breed en 1,55 hoog, valt met 0,3 speling in de bak',
    `Drukribben 4 breed tot ${getal(m.voet + m.bordje.h + 0.3)} boven de bodem (0,3 boven de eindklemmen)`,
    '6 gaten Ø3,2 met verzinking 90° Ø6,2 (plaatschroef 3 x 12)',
  ] },
];

/** boormal 1:1: de buitenmaat van de doos en de 4 schroeven onder de baan (van onderen gezien, het deksel naar je toe) */
function boormalBlad(blad: string): string {
  const b = new Blad();
  const c: P = [156, 148.5]; // midden van de doos op het blad (op ware grootte: 249 x 241 binnen het kader van 390 x 277, ISO 5457)
  const to = (x: number, z: number): P => [c[0] + x, c[1] - z];
  const lo = to(-BX / 2, BZ / 2), hi = to(BX / 2, -BZ / 2);
  b.rect(lo[0], lo[1], BX, BZ, 0.5);
  const SG = D.sleutelgat;
  // de schroef staat aan het eind van de sleuf (vergrendeld); de kop gaat door het grote gat op x - slag
  const gaten = (bevestigingsGaten(rijen, binnenX) as [number, number][]).map(([x, z]) => [x + SG.slag, z] as [number, number]);
  for (const [x, z] of gaten) {
    const p = to(x, z);
    b.cirkel(p, 2, 0.35);
    b.lijn([p[0] - 6, p[1]], [p[0] + 6, p[1]], 0.25);
    b.lijn([p[0], p[1] - 6], [p[0], p[1] + 6], 0.25);
    const k = to(x - SG.slag, z);
    b.el.push(`<circle cx="${k[0].toFixed(2)}" cy="${b.y(k[1]).toFixed(2)}" r="${(SG.kop / 2).toFixed(2)}" fill="none" stroke="#777" stroke-width="0.2" stroke-dasharray="1.5 1"/>`);
  }
  // maten vanaf de linker- en de achterrand van de doos
  const xs = [...new Set(gaten.map(([x]) => x))].sort((a, q) => a - q), zs = [...new Set(gaten.map(([, z]) => z))].sort((a, q) => a - q);
  xs.forEach((x, i) => b.maatH(lo[0], to(x, 0)[0], hi[1], hi[1] + 6 + i * 7, getal(x + BX / 2)));
  zs.forEach((z, i) => b.maatV(to(0, z)[1], hi[1], hi[0], hi[0] + 6 + i * 7, getal(z + BZ / 2)));
  b.maatH(lo[0], hi[0], lo[1], lo[1] - 7, `${getal(BX)} (buitenmaat)`);
  b.maatV(lo[1], hi[1], lo[0], lo[0] - 7, `${getal(BZ)} (buitenmaat)`);
  const t = (x: number, z: number, s: string, h: number, anker: 'start' | 'middle' | 'end', opts = {}) => b.tekst(to(x, z), s, h, anker, opts);
  t(0, -BZ / 2 + 10, 'ACHTER (rij 1)', 3, 'middle', { vet: true });
  t(0, BZ / 2 - 8, 'VOOR (ESP, ingangen)', 3, 'middle', { vet: true });
  t(-BX / 2 + 5, 30, 'wartel 12 V', 2.6, 'start', { hoek: 90 });
  t(BX / 2 - 3, 60, 'USB', 2.6, 'start', { hoek: 90 });
  // controlemaat
  b.lijn([302, 72], [402, 72], 0.5); b.lijn([302, 69], [302, 75], 0.5); b.lijn([402, 69], [402, 75], 0.5);
  b.tekst([352, 76], 'controle: 100 mm (afdrukken op 100 %)', 2.8, 'middle');
  const regels = [
    'Boormal op ware grootte, van onderen gezien',
    '(het deksel naar je toe, de bodem tegen de baan).',
    '',
    '1  Mal onder de baan plakken (tape), de 4 kruisjes',
    '    voorboren Ø2,5.',
    '2  4 bolkopschroeven 4 x 20 indraaien tot de kop',
    '    4 mm onder de baan staat.',
    '3  De doos met de grote gaten (stippellijn) over de',
    `    koppen houden en ${SG.slag} mm naar links schuiven:`,
    '    de schroef zit dan op het kruisje, aan het eind',
    '    van de sleuf.',
    '4  De schroeven aandraaien tot de doos vastzit.',
    '',
    `Doos ${getal(BX)} x ${getal(BZ)} x ${getal(HOOG)} (met het deksel).`,
    'Laat links en rechts 60 mm vrij voor de kabels.',
  ];
  let ty = 270;
  for (const r of regels) { b.tekst([300, ty], r, 2.6, 'start', { vet: ty === 270 }); ty -= 5; }
  // kader (ISO 5457) en een smal titelblok rechtsonder (ISO 7200): de doos neemt op ware grootte bijna het hele blad
  kaderSmal(b, { nr: 'TRN-00', naam: 'Boormal onder de baan', schaal: '1:1 (A3)', blad, soort: 'Boormal (mal 1:1)' }, PROJECT);
  return b.svg();
}

describe('tekeningen kabeldoos', () => {
  it.skipIf(!process.env.TREIN_TEKENINGEN)('boormal, bak en deksel', () => {
    mkdirSync(UIT, { recursive: true });
    const totaal = DELEN.length + 1;
    writeFileSync(`${UIT}/TRN-00-boormal.svg`, boormalBlad(`1 / ${totaal}`));
    DELEN.forEach((d, i) => writeFileSync(`${UIT}/${d.nr}-${d.naam.toLowerCase()}.svg`, onderdeelBlad(d, `${i + 2} / ${totaal}`, DIR, PROJECT)));
    expect(BX).toBeLessThanOrEqual(250);
  }, 1800000);
});
