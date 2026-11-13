/**
 * Bouwdocumenten van de kabeldoos, versie 4 (kant-en-klare modules, 2026-11-13), uit voorbeelden/treinverlichting/opbouw.mjs:
 *  - TRN-10: montageblad "moduleplaat: modules en bedrading" (A3, 1:1): de plaat van boven met elke module, zijn gaten
 *    en klemmen, de draden tussen de modules (W-nummers, in hun kleur), de stijgruimte vooraan, en de tabellen met de
 *    modules (schroeven, gaten, AANNAME) en de groepen (welke klem, welke polyfuse);
 *  - TRN-14: de interne draadlijst (van, naar, doorsnede, kleur, lengte uit het 3D-model);
 *  - TRN-20: ingebruikname- en meetblad (A4); TRN-21: invulblad voor de namen van groepen en ingangen (A4).
 * Opgemaakt volgens ISO 5457 (kader), ISO 7200 (titelblok) en ISO 128 (lijnen); gebruikt door tekeningenTrein.test.ts.
 */
import { Blad, kader, getal, esc, type P, type Project } from './werktekening';
// @ts-expect-error: plain JavaScript
import { MODULES, PLAATSING, DRADEN, IN_KLEMMEN, GROEPEN, voetafdruk, gatenDoos, klem, naarDoos } from '../../voorbeelden/treinverlichting/opbouw.mjs';
// @ts-expect-error: plain JavaScript
import { M, plaatOmtrek, wagoHouders, plaatPalen } from '../../voorbeelden/treinverlichting/maak-kabeldoos.mjs';

type Eind = [string, string];
type Draad = { nr: string; van: Eind; naar: Eind; net: string; mm2: number; kleur: string; wat: string };
type Module = { naam: string; kort: string; l: number; b: number; h: number; gaten: [number, number][]; gat: number; schroef?: string; aanname?: string; wago?: boolean; klemmen: { naam: string; label: string; x: number; z: number; soort: string }[] };
const MOD = MODULES as Record<string, Module>;
const DR = DRADEN as Draad[];
export const OPBOUW: { sleutel: string; nr: string }[] = [{ sleutel: 'moduleplaat', nr: 'TRN-10' }];
const KLEUR: Record<string, string> = { rood: '#c8202f', zwart: '#111111', oranje: '#e07a10', geel: '#c9a400', groen: '#2e9e4f', blauw: '#1f4fa3', wit: '#8a8d91', grijs: '#6b6f74' };

// ---------------------------------------------------------------- de plaats van een eind (voor de lengte en de tekening)
const VAST: Record<string, (k: string) => [number, number, number]> = {
  '-X5': () => [-(M.doos.binnen / 2), M.dcbus.y, 92 + M.dcbus.dz],
  '-F1': (k) => [-95, M.plaat.y0 + M.plaat.dik + 3, k === 'in' ? 98 : 80],
};
/** de plaats in de doos (x, y, z) van een eind van een draad */
export function plaats(e: Eind): [number, number, number] {
  if (VAST[e[0]]) return VAST[e[0]](e[1]);
  const k = klem(e[0], e[1]);
  return [k.x, k.y, k.z];
}
/** lengte in mm: langs de assen (zoals een draad over de plaat loopt) plus 60 mm (strippen, lusje en de lus om de plaat
 *  op te tillen), op 10 afgerond */
export const lengte = (d: Draad) => { const a = plaats(d.van), b = plaats(d.naar); return Math.ceil((Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + 60) / 10) * 10; };
const eindTekst = (e: Eind) => {
  if (e[0] === '-X5') return `DC-bus ${e[1] === '+' ? 'pen (+)' : 'huls (−)'}`;
  if (e[0] === '-F1') return `-F1 zekeringhouder (${e[1]})`;
  const m = /^(-X[12])([ab])$/.exec(e[0]);
  if (m) return `${m[1]}:${(m[2] === 'b' ? 5 : 0) + +e[1]} (WAGO)`;
  const k = klem(e[0], e[1]);
  return `${e[0]}:${e[0] === '-X6' ? `${e[1]} (${k.label})` : e[1].replace(/^[LR]:/, '')}`;
};

// ---------------------------------------------------------------- TRN-10: de moduleplaat met modules en bedrading
/** een A3-blad (1:1): de moduleplaat van boven (het deksel eraf), de voorkant van de doos onderaan */
export function montageBlad(nr: string, blad: string, project: Project): string {
  const b = new Blad(), ox = 140, oy = 158; // het midden van de doos op het blad
  const to = (x: number, z: number): P => [ox + x, oy - z];
  const poly = (pts: [number, number][], w = 0.35, extra = '') => b.el.push(`<polygon points="${pts.map(([x, z]) => { const p = to(x, z); return `${p[0].toFixed(2)},${b.y(p[1]).toFixed(2)}`; }).join(' ')}" fill="none" stroke="#111" stroke-width="${w}" ${extra}/>`);
  const r = M.doos.binnen / 2;
  b.tekst([30, 280], 'Moduleplaat: modules en bedrading (1:1, van boven gezien, het deksel eraf; vooraan = onder)', 3.5, 'start', { vet: true });
  poly([[-r, -r], [r, -r], [r, r], [-r, r]], 0.25, 'stroke-dasharray="3 1.5"');
  poly(plaatOmtrek(), 0.5);
  for (const h of wagoHouders()) poly(h, 0.25);
  // de stijgruimte vooraan, de DC-bus, de USB-opening, de palen
  b.tekst(to(0, (M.plaat.voor + r) / 2 - 1.2), 'stijgruimte: de draden van de bordjes en de kabelinvoeren gaan hier naar boven', 2.4, 'middle');
  b.tekst(to(-r + 2, 95 + 4), 'DC-bus -X5', 2.2, 'start', { vet: true });
  b.el.push(`<rect x="${to(-r - 2.4, 0)[0].toFixed(2)}" y="${b.y(to(0, 95 + 6.25)[1]).toFixed(2)}" width="2.4" height="12.5" fill="#111"/>`);
  for (const [x, z] of plaatPalen() as [number, number][]) { b.cirkel(to(x, z), 3.1, 0.35); b.cirkel(to(x, z), 1.7, 0.25); b.tekst(to(x, z - 7), 'schroef 3 x 10', 1.8, 'middle'); }
  const usb = naarDoos('-X6', M.esp.x / 2 + 0.8, 0);
  b.el.push(`<rect x="${to(r, 0)[0].toFixed(2)}" y="${b.y(to(0, usb[1] + 12)[1]).toFixed(2)}" width="2.4" height="24" fill="#111"/>`);
  b.tekst(to(r + 4, usb[1]), 'USB', 2.2, 'start', { hoek: 90 });
  // de modules: omtrek, gaten, klemmen (vierkantje met de naam) en de aanduiding
  for (const ref of Object.keys(MOD)) {
    const m = MOD[ref], [x0, z0, x1, z1] = voetafdruk(ref) as number[];
    poly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], 0.35);
    for (const [x, z] of gatenDoos(ref) as [number, number][]) { b.cirkel(to(x, z), m.gat / 2, 0.25); b.cirkel(to(x, z), M.plaat.paal.r, 0.18); }
    for (const k of m.klemmen) {
      const [x, z] = naarDoos(ref, k.x, k.z), s = k.soort === 'pin' ? 0.9 : 1.6, p = to(x, z);
      b.el.push(`<rect x="${(p[0] - s / 2).toFixed(2)}" y="${(b.y(p[1]) - s / 2).toFixed(2)}" width="${s}" height="${s}" fill="#fff" stroke="#111" stroke-width="0.18"/>`);
    }
    const c = to((x0 + x1) / 2, (z0 + z1) / 2), kl = m.wago ? 1.9 : 2.6;
    b.tekst([c[0], c[1] + (m.wago ? -1 : 1.5)], ref.replace(/[ab]$/, (q) => (q === 'a' ? ' (1-5)' : ' (6-10)')), kl, 'middle', { vet: true });
    if (!m.wago) b.tekst([c[0], c[1] - 2.2], m.kort, 2.0, 'middle');
  }
  // de klemmen van de modules met hun naam (alleen die met een draad: anders wordt het onleesbaar)
  const gebruikt = new Set<string>();
  for (const d of DR) for (const e of [d.van, d.naar]) if (MOD[e[0]]) gebruikt.add(e.join(' '));
  for (const x of IN_KLEMMEN as { a: Eind; b: Eind }[]) for (const e of [x.a, x.b]) gebruikt.add(e.join(' '));
  // de draden: rechte lijn in hun kleur, het W-nummer in het midden
  DR.forEach((d, i) => {
    if (!MOD[d.van[0]] || !MOD[d.naar[0]]) return;
    const a = plaats(d.van), q = plaats(d.naar), pa = to(a[0], a[2]), pb = to(q[0], q[2]);
    b.el.push(`<line x1="${pa[0].toFixed(2)}" y1="${b.y(pa[1]).toFixed(2)}" x2="${pb[0].toFixed(2)}" y2="${b.y(pb[1]).toFixed(2)}" stroke="${KLEUR[d.kleur] ?? '#111'}" stroke-width="${d.mm2 >= 0.5 ? 0.6 : 0.3}" stroke-opacity="0.85"/>`);
    const t = 0.35 + (i % 5) * 0.07, m: P = [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t];
    b.tekst([m[0], m[1] + 0.5], d.nr.slice(1), 1.5, 'middle', { kleur: KLEUR[d.kleur] === '#8a8d91' ? '#555' : KLEUR[d.kleur] });
  });
  // de elementen in de klemmen (weerstand, diode, polyfuse)
  for (const x of IN_KLEMMEN as { ref: string; a: Eind; b: Eind }[]) {
    const a = plaats(x.a), q = plaats(x.b), pa = to(a[0], a[2]), pb = to(q[0], q[2]);
    b.el.push(`<line x1="${pa[0].toFixed(2)}" y1="${b.y(pa[1]).toFixed(2)}" x2="${pb[0].toFixed(2)}" y2="${b.y(pb[1]).toFixed(2)}" stroke="#111" stroke-width="0.9" stroke-dasharray="1.2 0.8"/>`);
    b.tekst([(pa[0] + pb[0]) / 2 + 1.5, (pa[1] + pb[1]) / 2], x.ref, 2.0, 'start', { vet: true });
  }
  // rechts: de modules en hoe ze vastzitten, de groepen
  let y = 272;
  const x0 = 262;
  b.tekst([x0, y], 'Modules (vastschroeven op de paaltjes, geen solderen)', 2.8, 'start', { vet: true });
  y -= 4.5;
  for (const ref of Object.keys(MOD).filter((q) => !/[b]$/.test(q))) {
    const m = MOD[ref], gat = m.gaten.length ? `${m.gaten.length} x ${m.schroef} op ${getal(Math.max(...m.gaten.map((g) => g[0])) * 2, 1)} x ${getal(Math.max(...m.gaten.map((g) => g[1])) * 2, 1)}` : 'in de klikhouder';
    b.tekst([x0, y], `${ref.replace(/a$/, '')} ${m.kort}${m.wago ? (ref === '-X1a' || ref === '-X2a' ? ' (2 x)' : '') : ''}: ${getal(m.l, 1)} x ${getal(m.b, 1)}, ${gat}${m.aanname ? ' *' : ''}`, 2.1);
    y -= 3.6;
  }
  b.tekst([x0, y - 0.5], '* AANNAME (maat of gaten niet gepubliceerd): eerst nameten, dan maten in opbouw.mjs', 2.0);
  b.tekst([x0, y - 3.8], '   aanpassen en de plaat opnieuw maken (de bak blijft).', 2.0);
  y -= 10;
  b.tekst([x0, y], 'Groepen: + en − van elk bordje', 2.8, 'start', { vet: true });
  y -= 4.5;
  for (const g of GROEPEN as { groep: number; plus: Eind; min: Eind; ptc: string; wago: string }[]) {
    b.tekst([x0, y], `G${String(g.groep).padStart(2, '0')}+ aan ${g.plus[0]}:${g.plus[1]}   G${String(g.groep).padStart(2, '0')}− aan ${g.min[0]}:${g.min[1]} via ${g.ptc} en ${g.wago}`, 2.0);
    y -= 3.3;
  }
  y -= 2;
  for (const t of [
    'Volgorde: 1 plaat printen, 2 de modules op hun paaltjes (plaatschroef 2,5 x 6 / 3 x 8),',
    '3 de WAGO-klemmen in hun klikhouders, 4 de draden W01..W61 volgens TRN-14 (dupont',
    'op de pinnen van -K2, -Q1, -Q2), 5 -R1, -R2 en -F18 met hun pootjes in de klemmen,',
    '6 proefopstelling op tafel (TRN-20), 7 de plaat in de doos: achteraan onder de richel,',
    'vooraan 2 schroeven 3 x 10. Enige soldeerwerk: de 2 lippen van de DC-bus.',
  ]) { b.tekst([x0, y], t, 2.0); y -= 3.3; }
  kader(b, { nr, naam: 'Moduleplaat: modules en bedrading', materiaal: 'PETG (plaat), kant-en-klare modules', maken: 'schroeven, klemmen', massa: '—', schaal: '1:1', blad, soort: 'Montagetekening' }, project);
  return b.svg();
}

/** de interne draadlijst (A3) */
export function draadlijstBlad(nr: string, blad: string, project: Project): string {
  const b = new Blad(), k = [['Nr', 11], ['Van', 70], ['Naar', 70], ['Wat', 130], ['mm²', 13], ['Kleur', 16], ['Lengte', 16]] as [string, number][];
  b.tekst([30, 280], 'Interne draadlijst: draden tussen de modules op de moduleplaat', 4, 'start', { vet: true });
  b.tekst([30, 274.5], 'De draden naar de bordjes (G01+ .. G16+, G01− .. G16−) en de ingangen (IN01 .. IN16) staan in de README (Draden labelen) en op TRN-10. Lengte uit het 3D-model + 60 mm.', 2.3);
  let y = 268;
  const rijH = 3.42;
  let x = 30;
  for (const [t, w] of k) { b.tekst([x + 1, y - 2.8], t, 2.3, 'start', { vet: true }); x += w; }
  b.lijn([30, y - 3.8], [30 + k.reduce((a, q) => a + q[1], 0), y - 3.8], 0.35);
  y -= 3.8;
  for (const d of DR) {
    const cel = [d.nr, eindTekst(d.van), eindTekst(d.naar), d.wat, getal(d.mm2, 2), d.kleur, `${lengte(d)} mm`];
    x = 30;
    cel.forEach((t, i) => { b.tekst([x + 1, y - 2.75], t.length > (i === 3 ? 92 : 50) ? t.slice(0, i === 3 ? 90 : 48) + '…' : t, 1.95, 'start', { vet: i === 0 }); x += k[i][1]; });
    y -= rijH;
    b.lijn([30, y], [30 + k.reduce((a, q) => a + q[1], 0), y], 0.1);
  }
  b.tekst([30, y - 4.5], 'Doorsnede: 0,75 mm² (H05V-K) voor 12 V en 0 V naar de MOSFET-modules (tot 2,6 A per module); 0,5 mm² voor de regelaar; 0,25 mm² voor S12; 0,14 mm² of dupontkabels voor signalen.', 2.2);
  b.tekst([30, y - 8], 'Dupont: female-female op de pinnen van -K2 en -Q1/-Q2; female-male waar het andere eind in een schroefklem of WAGO-klem gaat. Een schroefklem neemt hoogstens 2 draden.', 2.2);
  kader(b, { nr, naam: 'Interne draadlijst', materiaal: 'montagedraad, dupontkabels', maken: 'knippen, strippen, labelen', massa: '—', schaal: '—', blad, soort: 'Draadlijst' }, project);
  return b.svg();
}

// ---------------------------------------------------------------- A4-bladen (meetblad, invulblad)
class BladA4 extends Blad {
  svg() {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">\n<rect x="0" y="0" width="210" height="297" fill="#fff"/>\n${this.el.join('\n')}\n</svg>\n`;
  }
}
/** kader A4 staand (ISO 5457: 20 mm archiefrand, 10 rondom, centreermerken) en titelblok (ISO 7200) van 180 x 24 */
function kaderA4(b: BladA4, t: { nr: string; naam: string; soort: string; blad: string }, project: Project) {
  b.rect(20, 10, 180, 277, 0.7);
  b.lijn([105, 0], [105, 15], 0.7); b.lijn([105, 297], [105, 282], 0.7); b.lijn([0, 148.5], [25, 148.5], 0.7); b.lijn([210, 148.5], [195, 148.5], 0.7);
  const x0 = 20, y0 = 10, rh = 8;
  b.rect(x0, y0, 180, rh * 3, 0.5);
  for (let n = 1; n < 3; n++) b.lijn([x0, y0 + rh * n], [x0 + 180, y0 + rh * n], 0.25);
  const veld = (xa: number, rij: number, label: string, waarde: string, h2 = 2.6, vet = false) => {
    const y = y0 + rh * rij;
    if (xa > x0) b.lijn([xa, y], [xa, y + rh], 0.25);
    b.tekst([xa + 1.2, y + rh - 2.2], label, 1.7, 'start', { kleur: '#555' });
    b.tekst([xa + 1.2, y + 1.6], waarde, h2, 'start', { vet });
  };
  veld(x0, 2, 'Eigenaar', `Phlippo CAD · ${project.eigenaar ?? 'Ian'}`, 2.4); veld(x0 + 70, 2, 'Project', project.naam, 2.6, true); veld(x0 + 140, 2, 'Taal', 'nl', 2.4);
  veld(x0, 1, 'Titel', t.naam, 3, true); veld(x0 + 110, 1, 'Documentsoort', t.soort, 2.4);
  veld(x0, 0, 'Tekeningnummer', t.nr, 3, true); veld(x0 + 45, 0, 'Rev.', project.revisie ?? '0', 2.4); veld(x0 + 60, 0, 'Uitgifte', project.datum, 2.4);
  veld(x0 + 90, 0, 'Opgesteld', 'Phlippo CAD', 2.2); veld(x0 + 125, 0, 'Goedgekeurd', project.goedgekeurd ?? 'Ian', 2.2); veld(x0 + 155, 0, 'Blad', t.blad, 2.4);
}
/** een tabel met lege vakjes om in te vullen; kolommen [kop, breedte]; rijen: de vaste tekst per rij */
function invulTabel(b: Blad, x: number, y: number, kol: [string, number][], rijen: string[][], rh: number) {
  const bt = kol.reduce((a, q) => a + q[1], 0), n = rijen.length;
  b.rect(x, y - rh * (n + 1), bt, rh * (n + 1), 0.35);
  let xx = x;
  kol.forEach(([t, w], i) => { b.tekst([xx + 1, y - rh + 1.4], t, 2.1, 'start', { vet: true }); if (i) b.lijn([xx, y], [xx, y - rh * (n + 1)], 0.18); xx += w; });
  for (let j = 0; j <= n; j++) b.lijn([x, y - rh * (j + 1)], [x + bt, y - rh * (j + 1)], j ? 0.13 : 0.35);
  rijen.forEach((r, j) => { let xc = x; r.forEach((t, i) => { if (t) b.tekst([xc + 1, y - rh * (j + 2) + 1.4], t, 2.1); xc += kol[i][1]; }); });
}

/** ingebruikname- en meetblad (A4) */
export function meetBlad(nr: string, blad: string, project: Project): string {
  const b = new BladA4();
  b.tekst([25, 280], 'Ingebruikname en metingen', 5, 'start', { vet: true });
  b.tekst([25, 274.5], 'Multimeter, het dashboard (Instellingen › Testmodus). Vul de gemeten waarden in; alles binnen de grenzen = goed.', 2.4);
  const stappen = [
    ['0', 'Proefopstelling: de moduleplaat op tafel, 1 bordje op groep 1, 1 knop op IN01.', ''],
    ['1', 'Zonder adapter: weerstand -X1 (rood snoer) – -X2 (L+ – 0 V)', '> 1 kΩ'],
    ['2', 'Adapter in de DC-bus: spanning -X1 – -X2 (L+)', '11,6 .. 12,4 V'],
    ['3', 'Regelaar -T2: VOUT – GND', '4,9 .. 5,2 V'],
    ['4', 'ESP 3V3 – G (-X6 J1:1 – J1:22)', '3,25 .. 3,35 V'],
    ['5', 'OE (PCA9685) – 0 V terwijl RESET ingedrukt is', '≥ 2,5 V'],
    ['6', 'OE – 0 V tijdens bedrijf (groen lampje)', '< 0,4 V'],
    ['7', '+12 V ingangen: -X3 – -X2 (S12, na -F18)', '11,4 .. 12,4 V'],
    ['8', 'Groep 1 "uit" in het dashboard: het bordje is uit*', 'uit'],
    ['9', 'IN01 los: het dashboard toont "rust"*', 'rust'],
    ['10', 'Firmware: versie op het dashboard (Instellingen)', '1.2.0 of hoger'],
    ['11', 'Wifi-wachtwoord gewijzigd; BOOT 5 s zet het terug (proef)', 'gedaan'],
  ];
  invulTabel(b, 25, 270, [['Nr', 8], ['Meting of controle', 107], ['Grens', 26], ['Gemeten', 25], ['OK', 9]], stappen, 5.2);
  const yg = 270 - 5.2 * (stappen.length + 1) - 6;
  b.tekst([25, yg + 2], 'Per groep (testmodus "groep vast", vol licht): stroom in de − van het bordje, spanning n− – VIN− op de MOSFET-module', 2.4, 'start', { vet: true });
  const groepen = Array.from({ length: 16 }, (_, k) => [String(k + 1), '', '', '']);
  invulTabel(b, 25, yg, [['Groep', 11], ['Stroom (≤ 0,32 A)', 32], ['U n−/VIN− (< 0,1 V)', 30], ['OK', 9]], groepen, 5.8);
  b.tekst([114, yg - 2], 'Per ingang: knop of sensor bedienen,', 2.3, 'start', { vet: true });
  b.tekst([114, yg - 5.4], 'het dashboard toont "actief" (Ingangen).', 2.3);
  const ingangen = Array.from({ length: 16 }, (_, k) => [String(k + 1), '', '', '']);
  invulTabel(b, 114, yg - 8, [['IN', 9], ['Soort', 25], ['Actief gezien', 27], ['OK', 9]], ingangen, 5.4);
  b.tekst([25, 44.5], '* Andersom (bordje aan bij "uit", of ingang "actief" in rust): de module schakelt met de andere polariteit; firmware bouwen met', 2.1);
  b.tekst([25, 41], '   -DTREIN_UITGANG_ACTIEF_HOOG of -DTREIN_INGANG_ACTIEF_HOOG (firmware/README.md), of de jumper op de optocouplerprint omzetten.', 2.1);
  b.tekst([25, 37.5], 'Een groep die niet aangaat: polyfuse -F(n+1) warm (gesprongen)? Dupont van PWM n op IN n? Testmodus "looplicht": elk bordje op zijn plaats?', 2.1);
  kaderA4(b, { nr, naam: 'Ingebruikname en metingen', soort: 'Meetblad', blad }, project);
  return b.svg();
}

/** invulblad voor de namen van de groepen en de ingangen (A4, om bij de baan te hangen) */
export function invulBlad(nr: string, blad: string, project: Project): string {
  const b = new BladA4();
  b.tekst([25, 280], 'Groepen en ingangen van de treinbaan', 5, 'start', { vet: true });
  b.tekst([25, 274.5], 'Hang dit blad bij de baan. Dezelfde namen in het dashboard (Instellingen) en op de labels van de draden (G01+, G01−, IN01).', 2.4);
  const g = Array.from({ length: 16 }, (_, k) => [`G${String(k + 1).padStart(2, '0')}`, '', '', '']);
  b.tekst([25, 268], 'Lichtgroepen (één bordje per groep)', 2.8, 'start', { vet: true });
  invulTabel(b, 25, 265, [['Groep', 14], ['Naam (dashboard)', 62], ['Plaats op de baan', 64], ['Bordje (1K / 0 Ω)', 30]], g, 6.3);
  const yi = 265 - 6.3 * 17 - 8;
  b.tekst([25, yi + 3], 'Ingangen (knoppen en sensoren)', 2.8, 'start', { vet: true });
  const i = Array.from({ length: 16 }, (_, k) => [`IN${String(k + 1).padStart(2, '0')}`, '', '', `-K${k < 8 ? 3 : 4}:IN${(k % 8) + 1}`, '']);
  invulTabel(b, 25, yi, [['Ingang', 14], ['Naam', 50], ['Soort (knop, schakelaar, reed, NPN)', 50], ['Klem', 20], ['Start functie', 36]], i, 6.3);
  b.tekst([25, 37.5], 'Elke ingang: de knop of sensor tussen IN en 0 V (-X2). Een sensor krijgt +12 V van -X3. Geen sensor die zelf 12 V geeft (PNP).', 2.2);
  kaderA4(b, { nr, naam: 'Namen van groepen en ingangen', soort: 'Invulblad', blad }, project);
  return b.svg();
}
export { esc };
