/**
 * Bouwdocumenten van de kabeldoos, versie 5 (één laag, 2 helften, 2026-11-15), uit voorbeelden/treinverlichting/opbouw.mjs:
 *  - TRN-10: montageblad "rechterhelft: modules en bedrading" (A3, 1:1): de rechterhelft van boven met elke module op
 *    haar palen, haar gaten en klemmen, de draden tussen de modules (W-nummers, in hun kleur), de draden van de bordjes
 *    aan de naad, en de tabellen met de modules (schroeven, gaten, AANNAME) en de groepen (welke klem, welke polyfuse);
 *  - TRN-14: de interne draadlijst (van, naar, doorsnede, kleur, lengte uit het 3D-model);
 *  - TRN-20: ingebruikname- en meetblad (A4); TRN-21: invulblad voor de namen van groepen en ingangen (A4).
 * Opgemaakt volgens ISO 5457 (kader), ISO 7200 (titelblok) en ISO 128 (lijnen); gebruikt door tekeningenTrein.test.ts.
 */
import { Blad, kader, getal, esc, type P, type Project } from './werktekening';
// @ts-expect-error: plain JavaScript
import { MODULES, PLAATSING, DRADEN, IN_KLEMMEN, GROEPEN, voetafdruk, gatenDoos, klem, naarDoos, helft } from '../../voorbeelden/treinverlichting/opbouw.mjs';
// @ts-expect-error: plain JavaScript
import { M, wagoHouders, rechts, indeling, tsmpHouder } from '../../voorbeelden/treinverlichting/maak-kabeldoos.mjs';

type Eind = [string, string];
type Draad = { nr: string; van: Eind; naar: Eind; net: string; mm2: number; kleur: string; wat: string; veld?: boolean };
type Module = { naam: string; kort: string; l: number; b: number; h: number; gaten: [number, number][]; gat: number; schroef?: string; aanname?: string; wago?: boolean; klem?: boolean; optioneel?: boolean; klemmen: { naam: string; label: string; x: number; z: number; soort: string }[] };
const MOD = MODULES as Record<string, Module>;
const DR = DRADEN as Draad[];
export const OPBOUW: { sleutel: string; nr: string; helft: 'rechts' | 'links' }[] = [{ sleutel: 'modules', nr: 'TRN-10', helft: 'rechts' }, { sleutel: 'ir-driver', nr: 'TRN-11', helft: 'links' }];
const KLEUR: Record<string, string> = { rood: '#c8202f', zwart: '#111111', oranje: '#e07a10', geel: '#c9a400', groen: '#2e9e4f', blauw: '#1f4fa3', wit: '#8a8d91', grijs: '#6b6f74' };

// ---------------------------------------------------------------- de plaats van een eind (voor de lengte en de tekening)
// de DC-bus in de achterwand van de rechterhelft, de zekeringhouder -F1 (met draden) ervoor op de bodem
const VAST: Record<string, (k: string) => [number, number, number]> = {
  '-X5': () => [M.dcbus.x, M.dcbus.y, -(M.doos.binnen / 2)],
  // Fable 5.2 D9: de zekeringhouders in de achterwand naast de DC-bus (de vlaksteeklippen ± 26 binnen de wand)
  '-F1': () => [M.zekering.x[0], M.zekering.y, -(M.doos.binnen / 2) + 26],
  // versie 6 fase B: de zekeringhouder van de servo's (met draden) naast de regelaar, de leerontvanger in zijn houder
  '-F19': () => [M.zekering.x[1], M.zekering.y, -(M.doos.binnen / 2) + 26],
  '-B1': () => [M.tsmp.x, M.tsmp.y + 10, M.doos.binnen / 2 - 3],
  // Fable 5.2 EN2: de losse WAGO-klemmen in de doos (bij de ESP en bij -K5) en de veldeinden (onder de baan: ± 3 m,
  // in de draadlijst als "veld"; hier bij de tule waar ze binnenkomen)
  '-X14': () => [240, 8, 18], '-X15': () => [-60, 8, 76],
  '-X17': () => [M.rechts.x1 + 3000, 0, 0], '-X18': () => [M.rechts.x1 + 3000, 0, 0],
  ...Object.fromEntries(['-B2', '-B3', '-B4', '-B5', '-B6', '-B7', '-B8'].map((b) => [b, () => [M.rechts.x1 + 3000, 0, 0] as [number, number, number]])),
};
/** de plaats in de doos (x, y, z) van een eind van een draad */
export function plaats(e: Eind): [number, number, number] {
  if (VAST[e[0]]) return VAST[e[0]](e[1]);
  const k = klem(e[0], e[1]);
  return [k.x, k.y, k.z];
}
/** lengte in mm: langs de assen (zoals een draad over de bodem loopt) plus 60 mm (strippen en een lusje), op 10 afgerond */
export const lengte = (d: Draad) => { const a = plaats(d.van), b = plaats(d.naar); return Math.ceil((Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + 60) / 10) * 10; };
const eindTekst = (e: Eind) => {
  if (e[0] === '-X5') return `DC-bus ${e[1] === '+' ? 'pen (+)' : 'huls (−)'}`;
  if (e[0] === '-F1') return `-F1 zekering T 8 A (${e[1]})`;
  if (e[0] === '-F19') return `-F19 zekering T 3,15 A (${e[1]})`;
  if (e[0] === '-B1') return `-B1 TSMP58000 (${e[1]})`;
  if (VAST[e[0]]) return `${e[0]}:${e[1]}${/^-X1[45]$/.test(e[0]) ? ' (WAGO 221-2411)' : /^-X1[78]$/.test(e[0]) ? ' (onder de baan)' : ''}`;
  const m = /^(-X[12])([ab])$/.exec(e[0]);
  if (m) return `${m[1]}:${(m[2] === 'b' ? 5 : 0) + +e[1]} (WAGO)`;
  const k = klem(e[0], e[1]);
  return `${e[0]}:${e[0] === '-X6' ? `${e[1]} (${k.label})` : e[1].replace(/^[LR]:/, '')}`;
};

// ---------------------------------------------------------------- TRN-10: de rechterhelft met modules en bedrading
/** een A3-blad (1:1): de rechterhelft (of de linkerhelft, versie 6 fase B: de IR-driver en de MCP23017) van boven (het
 *  deksel eraf), de voorkant van de doos onderaan */
export function montageBlad(nr: string, blad: string, project: Project, kant: 'rechts' | 'links' = 'rechts'): string {
  if (kant === 'links') return montageLinks(nr, blad, project);
  const P = rechts() as { xs: number; XR: number; XRB: number; Z: number; ZB: number; pilaren: number[][]; bussen: [number, number][]; haken: { prof: [number, number][] }[]; tules: { wand: string; c: number }[]; sleutelgaten: [number, number][]; usb: { x0: number; x1: number } };
  const b = new Blad(), xm = (P.xs + P.XRB) / 2, ox = 144, oy = 170; // het midden van de rechterhelft op het blad (boven het titelblok)
  const to = (x: number, z: number): P => [ox + x - xm, oy - z];
  const poly = (pts: [number, number][], w = 0.35, extra = '') => b.el.push(`<polygon points="${pts.map(([x, z]) => { const p = to(x, z); return `${p[0].toFixed(2)},${b.y(p[1]).toFixed(2)}`; }).join(' ')}" fill="none" stroke="#111" stroke-width="${w}" ${extra}/>`);
  const rh = (x0: number, z0: number, x1: number, z1: number, w = 0.35, extra = '') => poly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], w, extra);
  const { xs, XR, XRB, Z, ZB } = P;
  b.tekst([262, 281], 'Rechterhelft: modules en bedrading (1:1)', 3.5, 'start', { vet: true });
  b.tekst([262, 276.5], 'Van boven gezien, het deksel eraf; vooraan = onder, de naad links.', 2.2);
  // de wanden (buiten en binnen), aan de naad open; de naad als stippellijn
  poly([[xs, -ZB], [XRB, -ZB], [XRB, ZB], [xs, ZB], [xs, Z], [XR, Z], [XR, -Z], [xs, -Z]], 0.5);
  b.lijn(to(xs, -ZB - 4), to(xs, ZB + 4), 0.3, 'stroke-dasharray="6 1.5 1 1.5"');
  b.tekst(to(xs - 1.5, ZB + 5), 'naad', 2.4, 'end', { vet: true });
  // pilaren, klikhaken (stippel: in de linkerhelft), bussen, sleutelgaten
  for (const [x0, z0, x1, z1] of P.pilaren) rh(x0, z0, x1, z1, 0.3);
  b.tekst(to(xs + 5, -60), 'van links: draden van de bordjes G01..G16 (+ en −)', 2.2, 'start', { hoek: 90 });
  for (const h of P.haken) { const zz = h === P.haken[0] ? -Z + 1 : Z - 1; rh(h.prof[2][0], zz - 0.8, xs, zz + 0.8, 0.25, 'stroke-dasharray="1.2 0.8"'); }
  for (const [x, z] of P.bussen) { b.cirkel(to(x, z), M.doos.bus.r, 0.3); b.cirkel(to(x, z), 1.3, 0.2); }
  for (const [x, z] of P.sleutelgaten) { b.cirkel(to(x, z), M.doos.sleutelgat.kop / 2, 0.3); b.tekst(to(x, z - 7), 'sleutelgat', 1.7, 'middle'); }
  // tules (de gaten in de wand), de DC-bus, de opening voor de USB
  for (const t of P.tules) {
    const r = M.doos.invoer.gat / 2;
    if (t.wand === 'voor') rh(t.c - r, Z, t.c + r, ZB, 0.2, 'fill="#999"');
    else if (t.wand === 'achter') rh(t.c - r, -ZB, t.c + r, -Z, 0.2, 'fill="#999"');
    else rh(XR, t.c - r, XRB, t.c + r, 0.2, 'fill="#999"');
  }
  b.tekst(to(XRB + 3, 0), 'tules: knoppen, sensoren (IN)', 2.2, 'middle', { hoek: 90 });
  rh(M.dcbus.x - M.dcbus.gat / 2, -ZB, M.dcbus.x + M.dcbus.gat / 2, -Z, 0.2, 'fill="#111"');
  b.tekst(to(M.dcbus.x + M.dcbus.gat / 2 + 1.5, -Z + 2.6), 'DC-bus -X5 (12 V in, in de achterwand)', 1.8, 'start', { vet: true });
  rh(P.usb.x0, Z, P.usb.x1, ZB, 0.2, 'fill="#111"');
  b.tekst(to((P.usb.x0 + P.usb.x1) / 2, ZB + 4.5), 'USB (ESP)', 2.2, 'middle', { vet: true });
  for (const h of wagoHouders()) poly(h, 0.25);
  // de IR-leerontvanger in zijn houder achter het venstertje (versie 6 fase B)
  const th = tsmpHouder();
  rh(th.blok[0], th.blok[1], th.blok[2], th.blok[3], 0.3);
  rh(th.vak[0], th.vak[1], th.vak[2], th.vak[3], 0.2, 'fill="#111"');
  b.tekst(to(M.tsmp.x, ZB + 4.5), 'venster IR', 2.0, 'middle', { vet: true });
  b.tekst(to(M.tsmp.x - 6, Z - 9), '-B1', 2.0, 'end', { vet: true });
  // de modules: omtrek, gaten, klemmen (vierkantje met de naam) en de aanduiding
  for (const ref of Object.keys(MOD).filter((q) => helft(q) === 'rechts')) {
    const m = MOD[ref], [x0, z0, x1, z1] = voetafdruk(ref) as number[];
    poly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], 0.35);
    for (const [x, z] of gatenDoos(ref) as [number, number][]) { b.cirkel(to(x, z), m.gat / 2, 0.25); b.cirkel(to(x, z), M.rechts.modulePaal.r, 0.18); }
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
    const ha = helft(d.van[0]), hb = helft(d.naar[0]);
    if (ha === 'links' && hb === 'links') return;
    // een draad over de naad: tot aan de naad, met het andere eind erbij
    if (ha !== hb) {
      const e = ha === 'rechts' ? d.van : d.naar, a = plaats(e), pa = to(a[0], a[2]), pb = to(xs + 0.5, a[2]);
      b.el.push(`<line x1="${pa[0].toFixed(2)}" y1="${b.y(pa[1]).toFixed(2)}" x2="${pb[0].toFixed(2)}" y2="${b.y(pb[1]).toFixed(2)}" stroke="${KLEUR[d.kleur] ?? '#111'}" stroke-width="0.3" stroke-dasharray="2 1" stroke-opacity="0.85"/>`);
      return;
    }
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
  let y = 268;
  const x0 = 262;
  b.tekst([x0, y], 'Modules (vastschroeven op de palen in de bodem, geen solderen)', 2.8, 'start', { vet: true });
  y -= 4.5;
  for (const ref of Object.keys(MOD).filter((q) => !/[b]$/.test(q) && helft(q) === 'rechts')) {
    const m = MOD[ref], gat = m.gaten.length ? `${m.gaten.length} x ${m.schroef} op ${getal(Math.max(...m.gaten.map((g) => g[0])) * 2, 1)} x ${getal(Math.max(...m.gaten.map((g) => g[1])) * 2, 1)}` : 'in de klikhouder';
    b.tekst([x0, y], `${ref.replace(/a$/, '')} ${m.kort}${m.wago ? (ref === '-X1a' || ref === '-X2a' ? ' (2 x)' : '') : ''}: ${getal(m.l, 1)} x ${getal(m.b, 1)}, ${gat}${m.aanname ? ' *' : ''}`, 2.1);
    y -= 3.6;
  }
  b.tekst([x0, y - 0.5], '* AANNAME (maat of gaten niet gepubliceerd): eerst de modules kopen en nameten, dan', 2.0);
  b.tekst([x0, y - 3.8], '   de maten in opbouw.mjs aanpassen en pas dan de rechterhelft printen.', 2.0);
  y -= 10;
  b.tekst([x0, y], 'Groepen: + en − van elk bordje', 2.8, 'start', { vet: true });
  y -= 4.5;
  for (const g of GROEPEN as { groep: number; plus: Eind; min: Eind; ptc: string; wago: string }[]) {
    b.tekst([x0, y], `G${String(g.groep).padStart(2, '0')}+ aan ${g.plus[0]}:${g.plus[1]}   G${String(g.groep).padStart(2, '0')}− aan ${g.min[0]}:${g.min[1]} via ${g.ptc} en ${g.wago}`, 2.0);
    y -= 3.3;
  }
  y -= 2;
  for (const t of [
    'Volgorde: 1 de rechterhelft printen, 2 de modules op hun palen (plaatschroef 2,5 x 6 /',
    `3 x 8), 3 de WAGO-klemmen in hun klikhouders, 4 de draden W01..W${DR.length} volgens TRN-14/15`,
    '(dupont op de pinnen van -K2, -K7, -Q1, -Q2), 5 -R1, -R2, -F18 en -C5 met hun pootjes in',
    'de klemmen, -B1 in zijn vakje (lens naar het venster), 6 proefopstelling op tafel (TRN-20),',
    '7 de helften in elkaar klikken (TRN-06). Streepjes: draden over de naad (TRN-11).',
  ]) { b.tekst([x0, y], t, 2.0); y -= 3.3; }
  kader(b, { nr, naam: 'Rechterhelft: modules en bedrading', materiaal: 'kant-en-klare modules op de palen', maken: 'schroeven, klemmen', massa: '—', schaal: '1:1', blad, soort: 'Montagetekening' }, project);
  return b.svg();
}

/** TRN-11 (versie 6 fase B): de linkerhelft van boven met de IR-driver (-Q4, -Q3) en de MCP23017 (-K5, plaats voor -K8)
 *  naast bordje 16, hun draden en de draden over de naad */
function montageLinks(nr: string, blad: string, project: Project): string {
  type Bordje = { soort: string; nr: number; cx: number; cz: number };
  const L = indeling() as { X: number; Z: number; rijen: Bordje[][]; paaltjes: { x: number; z: number }[]; bodem: number[][]; tules: { wand: string; c: number }[]; sleutelgaten: [number, number][]; bussen: [number, number][] };
  const b = new Blad(), D = M.doos, B = M.bordje, w = D.wand, X = L.X, Z = L.Z, XB = X + w, ZB = Z + w, xn = M.naad.x, xm = (-XB + xn) / 2, ox = 144, oy = 170;
  const to = (x: number, z: number): P => [ox + x - xm, oy - z];
  const poly = (pts: [number, number][], sw = 0.35, extra = '') => b.el.push(`<polygon points="${pts.map(([x, z]) => { const p = to(x, z); return `${p[0].toFixed(2)},${b.y(p[1]).toFixed(2)}`; }).join(' ')}" fill="none" stroke="#111" stroke-width="${sw}" ${extra}/>`);
  const rh = (x0: number, z0: number, x1: number, z1: number, sw = 0.35, extra = '') => poly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], sw, extra);
  b.tekst([262, 281], 'Linkerhelft: IR-driver en MCP23017 (1:1)', 3.5, 'start', { vet: true });
  b.tekst([262, 276.5], 'Van boven gezien, het deksel eraf; vooraan = onder, de naad rechts.', 2.2);
  poly([[xn, -ZB], [-XB, -ZB], [-XB, ZB], [xn, ZB], [xn, Z], [-X, Z], [-X, -Z], [xn, -Z]], 0.5);
  b.lijn(to(xn, -ZB - 4), to(xn, ZB + 4), 0.3, 'stroke-dasharray="6 1.5 1 1.5"');
  b.tekst(to(xn + 1.5, ZB + 5), 'naad', 2.4, 'start', { vet: true });
  // de bordjes (grijs gestippeld, ter oriëntatie), hun paaltjes en de draadsleuven
  for (const d of L.rijen.flat().filter((q) => q.soort === 'bordje')) {
    rh(d.cx - B.x / 2, d.cz - B.z / 2, d.cx + B.x / 2, d.cz + B.z / 2, 0.25, 'stroke-dasharray="1.5 1" fill="#eee"');
    b.tekst(to(d.cx, d.cz - 1), `bordje ${d.nr}`, 2.0, 'middle', { kleur: '#666' });
  }
  for (const p of L.paaltjes) b.cirkel(to(p.x, p.z), 0.8, 0.15);
  for (const [x0, z0, x1, z1] of L.bodem) rh(x0, z0, x1, z1, 0.15, 'fill="#bbb"');
  const r = D.invoer.gat / 2;
  for (const t of L.tules) if (t.wand === 'voor') rh(t.c - r, Z, t.c + r, ZB, 0.2, 'fill="#999"'); else rh(-XB, t.c - r, -X, t.c + r, 0.2, 'fill="#999"');
  b.tekst(to(-24, ZB + 4.5), 'tules vooraan: IR-leds en leddraden', 2.2, 'middle', { vet: true });
  for (const [x, z] of L.bussen) { b.cirkel(to(x, z), D.bus.r, 0.3); b.cirkel(to(x, z), 1.3, 0.2); }
  for (const [x, z] of L.sleutelgaten) b.cirkel(to(x, z), D.sleutelgat.kop / 2, 0.3);
  // de modules
  const links = Object.keys(MOD).filter((q) => helft(q) === 'links');
  for (const ref of links) {
    const m = MOD[ref], [x0, z0, x1, z1] = voetafdruk(ref) as number[];
    poly([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], m.optioneel ? 0.25 : 0.4, m.optioneel ? 'stroke-dasharray="2 1"' : '');
    for (const [x, z] of gatenDoos(ref) as [number, number][]) { b.cirkel(to(x, z), m.gat / 2, 0.25); b.cirkel(to(x, z), M.rechts.modulePaal.r, 0.18); if (m.klem) b.cirkel(to(x, z), 4, 0.15); }
    for (const k of m.klemmen) {
      const [x, z] = naarDoos(ref, k.x, k.z), s2 = k.soort === 'pin' ? 0.9 : 1.6, p = to(x, z);
      b.el.push(`<rect x="${(p[0] - s2 / 2).toFixed(2)}" y="${(b.y(p[1]) - s2 / 2).toFixed(2)}" width="${s2}" height="${s2}" fill="#fff" stroke="#111" stroke-width="0.18"/>`);
    }
    const c = to((x0 + x1) / 2, (z0 + z1) / 2);
    b.tekst([c[0], c[1] + 1.5], ref, 2.6, 'middle', { vet: true });
    b.tekst([c[0], c[1] - 2.2], m.optioneel ? `${m.kort} (optioneel)` : m.kort, 2.0, 'middle');
  }
  // de draden in de linkerhelft en die over de naad (streepjes tot de naad, met het eind in de rechterhelft)
  let n = 0;
  DR.forEach((d) => {
    if (!MOD[d.van[0]] || !MOD[d.naar[0]]) return;
    const ha = helft(d.van[0]), hb = helft(d.naar[0]);
    if (ha === 'rechts' && hb === 'rechts') return;
    if (ha === hb) {
      const a = plaats(d.van), q = plaats(d.naar), pa = to(a[0], a[2]), pb = to(q[0], q[2]);
      b.el.push(`<line x1="${pa[0].toFixed(2)}" y1="${b.y(pa[1]).toFixed(2)}" x2="${pb[0].toFixed(2)}" y2="${b.y(pb[1]).toFixed(2)}" stroke="${KLEUR[d.kleur] ?? '#111'}" stroke-width="${d.mm2 >= 0.5 ? 0.6 : 0.3}" stroke-opacity="0.85"/>`);
      b.tekst([(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2 + 0.5], d.nr.slice(1), 1.5, 'middle', { kleur: KLEUR[d.kleur] === '#8a8d91' ? '#555' : KLEUR[d.kleur] });
      return;
    }
    const e = ha === 'links' ? d.van : d.naar, ander = ha === 'links' ? d.naar : d.van, a = plaats(e), pa = to(a[0], a[2]), zz = 40 - (n++) * 6.2, pb = to(xn - 1, zz);
    b.el.push(`<polyline points="${pa[0].toFixed(2)},${b.y(pa[1]).toFixed(2)} ${pa[0].toFixed(2)},${b.y(pb[1]).toFixed(2)} ${pb[0].toFixed(2)},${b.y(pb[1]).toFixed(2)}" fill="none" stroke="${KLEUR[d.kleur] ?? '#111'}" stroke-width="${d.mm2 >= 0.5 ? 0.6 : 0.3}" stroke-dasharray="2 1"/>`);
    b.tekst([pb[0] + 2, pb[1] + 0.5], `${d.nr} ${eindTekst(ander)}`, 1.7, 'start', { kleur: KLEUR[d.kleur] === '#8a8d91' ? '#555' : KLEUR[d.kleur] });
  });
  let y = 268;
  const x0 = 262;
  b.tekst([x0, y], 'Modules (op palen in de bodem, geen solderen)', 2.8, 'start', { vet: true });
  y -= 4.5;
  for (const ref of links) {
    const m = MOD[ref], gat = m.klem ? `2 klempaaltjes, ${m.schroef}` : `${m.gaten.length} x ${m.schroef}`;
    b.tekst([x0, y], `${ref} ${m.kort}${m.optioneel ? ' (optioneel, alleen de palen)' : ''}: ${getal(m.l, 1)} x ${getal(m.b, 1)}, ${gat}${m.aanname ? ' *' : ''}`, 2.1);
    y -= 3.6;
  }
  b.tekst([x0, y - 0.5], '* AANNAME: eerst de modules kopen en nameten, dan opbouw.mjs aanpassen.', 2.0);
  y -= 8;
  for (const t of [
    'IR-leds: per led de draad van de klem n+ van -Q4 door een weerstand -R10..-R17',
    '(120 Ω 0,5 W, met één pootje in de klem n+ en het andere in een WAGO 221-2411 -X9',
    'samen met de draad naar de anode), de kathode terug in de klem n− van -Q4. De draden',
    'naar de IR-leds door de tules vooraan.',
    'De MCP23017 kiest de IR-led (GPA0..7 naar IN1..8 van -Q4), de AOD4184 (-Q3) moduleert',
    'met de draaggolf van GPIO47 alle IR-leds samen (VIN− van -Q4 naar OUT− van -Q3).',
    'MCP23017 zonder gaten: 2 paaltjes aan de korte kanten, plaatschroef 2,5 x 8 met een',
    'sluitring Ø8 die de rand van de print klemt. -K8 (0x21, ingangen 25-40): later.',
    'Draden over de naad (streepjes): dupont 30 cm (I2C: 2 aan elkaar) of montagedraad (TRN-15).',
  ]) { b.tekst([x0, y], t, 2.0); y -= 3.3; }
  kader(b, { nr, naam: 'Linkerhelft: IR-driver en MCP23017', materiaal: 'kant-en-klare modules op de palen', maken: 'schroeven, klemmen', massa: '—', schaal: '1:1', blad, soort: 'Montagetekening' }, project);
  return b.svg();
}

/** de interne draadlijst (A3) */
export function draadlijstBlad(nr: string, blad: string, project: Project, van = 0, tot = 61): string {
  const b = new Blad(), k = [['Nr', 11], ['Van', 70], ['Naar', 70], ['Wat', 130], ['mm²', 13], ['Kleur', 16], ['Lengte', 16]] as [string, number][];
  b.tekst([30, 280], van ? `Interne draadlijst (vervolg): de uitbreiding van versie 6 (W${String(van + 1).padStart(2, '0')}..W${Math.min(tot, DR.length)})` : 'Interne draadlijst: draden tussen de modules', 4, 'start', { vet: true });
  b.tekst([30, 274.5], 'De draden naar de bordjes (G01+ .. G16+, G01− .. G16−) en de ingangen (IN01 .. IN16) staan in de README (Draden labelen) en op TRN-10. Lengte uit het 3D-model + 60 mm.', 2.3);
  let y = 268;
  const rijH = 3.42;
  let x = 30;
  for (const [t, w] of k) { b.tekst([x + 1, y - 2.8], t, 2.3, 'start', { vet: true }); x += w; }
  b.lijn([30, y - 3.8], [30 + k.reduce((a, q) => a + q[1], 0), y - 3.8], 0.35);
  y -= 3.8;
  for (const d of DR.slice(van, tot)) {
    const cel = [d.nr, eindTekst(d.van), eindTekst(d.naar), d.wat, getal(d.mm2, 2), d.kleur, d.veld ? 'veld' : `${lengte(d)} mm`];
    x = 30;
    cel.forEach((t, i) => { b.tekst([x + 1, y - 2.75], t.length > (i === 3 ? 92 : 50) ? t.slice(0, i === 3 ? 90 : 48) + '…' : t, 1.95, 'start', { vet: i === 0 }); x += k[i][1]; });
    y -= rijH;
    b.lijn([30, y], [30 + k.reduce((a, q) => a + q[1], 0), y], 0.1);
  }
  b.tekst([30, y - 4.5], 'Doorsnede: 0,75 mm² (H05V-K) voor 12 V en 0 V naar de MOSFET-modules (tot 2,6 A per module); 0,5 mm² voor de regelaar; 0,25 mm² voor S12; 0,14 mm² of dupontkabels voor signalen.', 2.2);
  b.tekst([30, y - 8], 'Dupont: female-female op de pinnen van -K2 en -Q1/-Q2; female-male waar het andere eind in een schroefklem of WAGO-klem gaat. Een schroefklem neemt hoogstens 2 draden.', 2.2);
  kader(b, { nr, naam: van ? 'Interne draadlijst (vervolg)' : 'Interne draadlijst', materiaal: 'montagedraad, dupontkabels', maken: 'knippen, strippen, labelen', massa: '—', schaal: '—', blad, soort: 'Draadlijst' }, project);
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
    ['0', 'Proefopstelling: de rechterhelft op tafel, 1 bordje op groep 1, 1 knop op IN01.', ''],
    ['1', 'Zonder adapter: weerstand -X1 (rood snoer) – -X2 (L+ – 0 V)', '> 1 kΩ'],
    ['2', 'Adapter in de DC-bus: spanning -X1 – -X2 (L+)', '11,6 .. 12,4 V'],
    ['3', 'Regelaar -T2: VOUT – GND', '4,9 .. 5,2 V'],
    ['4', 'ESP 3V3 – G (-X6 J1:1 – J1:22)', '3,25 .. 3,35 V'],
    ['5', 'OE (PCA9685) – 0 V terwijl RESET ingedrukt is', '≥ 2,5 V'],
    ['6', 'OE – 0 V tijdens bedrijf (groen lampje)', '< 0,4 V'],
    ['7', '+12 V ingangen: -X3 – -X2 (S12, na -F18)', '11,4 .. 12,4 V'],
    ['8', 'Groep 1 "uit" in het dashboard: het bordje is uit*', 'uit'],
    ['9', 'IN01 los: het dashboard toont "rust"*', 'rust'],
    ['10', 'Firmware: versie op het dashboard (Instellingen); versie 6: ook TRN-22', '2.1.0 of hoger'],
    ['11', 'Wifi-wachtwoord gewijzigd; BOOT 5 s zet het terug (proef)', 'gedaan'],
    ['12', 'Hallsensor op IN n ("Hallsensor (korte puls)"): magneet 10 x snel langs**', 'teller +10'],
  ];
  invulTabel(b, 25, 270, [['Nr', 8], ['Meting of controle', 107], ['Grens', 26], ['Gemeten', 25], ['OK', 9]], stappen, 5.2);
  const yg = 270 - 5.2 * (stappen.length + 1) - 6;
  b.tekst([25, yg + 2], 'Per groep (testmodus "groep vast", aan): stroom in de − van het bordje, spanning n− – VIN− op de MOSFET-module', 2.4, 'start', { vet: true });
  const groepen = Array.from({ length: 16 }, (_, k) => [String(k + 1), '', '', '']);
  invulTabel(b, 25, yg, [['Groep', 11], ['Stroom (≤ 0,32 A)', 32], ['U n−/VIN− (< 0,1 V)', 30], ['OK', 9]], groepen, 5.8);
  b.tekst([114, yg - 2], 'Per ingang: knop of sensor bedienen,', 2.3, 'start', { vet: true });
  b.tekst([114, yg - 5.4], 'het dashboard toont "actief" (Ingangen).', 2.3);
  const ingangen = Array.from({ length: 16 }, (_, k) => [String(k + 1), '', '', '']);
  invulTabel(b, 114, yg - 8, [['IN', 9], ['Soort', 25], ['Actief gezien', 27], ['OK', 9]], ingangen, 5.4);
  b.tekst([25, 49], '* Andersom (bordje aan bij "uit", of ingang "actief" in rust): de module schakelt met de andere polariteit; firmware bouwen met', 2.1);
  b.tekst([25, 45.5], '   -DTREIN_UITGANG_ACTIEF_HOOG of -DTREIN_INGANG_ACTIEF_HOOG (firmware/README.md), of de jumper op de optocouplerprint omzetten.', 2.1);
  b.tekst([25, 42], '** Bij elke doorgang: het bolletje van de ingang (dashboard, Ingangen) even groen, toestand "puls", de led op de PC817-print knippert kort.', 2.1);
  b.tekst([25, 38.5], 'Een groep die niet aangaat: polyfuse -F(n+1) warm (gesprongen)? Dupont van kanaal n op IN n? Testmodus "looplicht": elk bordje op zijn plaats?', 2.1);
  kaderA4(b, { nr, naam: 'Ingebruikname en metingen', soort: 'Meetblad', blad }, project);
  return b.svg();
}

/** TRN-22 (A4, Fable 5.2 T1, E1, E3, E4, E5, E9, E11, E16, E18, F1): eerst één stuk van elke module kopen en op tafel
 *  meten, en de stappen van versie 6. De metingen beslissen welke variant (printSoort, polariteit, IR-duty) je kiest. */
export function meetBlad6(nr: string, blad: string, project: Project): string {
  const b = new BladA4();
  b.tekst([25, 280], 'Versie 6: eerst kopen en meten, dan bedraden', 5, 'start', { vet: true });
  b.tekst([25, 274.5], 'Eén stuk van elke module op tafel (± € 24 tot € 37), vóór je print of bedradt. De uitkomst kies je in het dashboard (Instellingen › Hardware).', 2.3);
  const stappen = [
    ['A', '-K3/-K4 optocouplerprint (Fable 5.2 TN1: geen diodetest, die leest door de serieweerstand vaak "open"): 5 V (USB-lader of -T2) in serie met de multimeter op mA, + aan de ene klem, − aan de andere, beide richtingen. Stroom van "VCC" naar IN1: "vcc"; van IN1 naar "G/GND": "gnd"; geen gemeenschappelijke klem, wel stroom tussen IN1+ en IN1−: "apart" (5 V blijft onder de 6 V die de led andersom verdraagt)', 'vcc / gnd / apart'],
    ['B', '-K3 stroom in één ingang: 12 V (S12 van -X3) door een mA-meter op de ingang zoals bij A gevonden (vcc: IN naar 0 V; gnd: IN naar 12 V)', '3 .. 15 mA'],
    ['C', '-Q1 (en -Q2, -Q4) polariteit: VCC 3,3 V, VIN+ 12 V, een led met 1 kΩ op kanaal 1. IN1 naar GND: led aan = actief laag (standaard). Anders actief hoog: -DTREIN_UITGANG_ACTIEF_HOOG en "IR-led actief laag" uit', 'laag / hoog'],
    ['D', 'Gevolg van C (Fable 5.2 TN2, geen aparte meting): "actief laag" betekent dat bij elk inschakelen alle groepen ± 1 s branden, en blijvend als de ESP niet start. Zien: de hele proefopstelling, RESET van de ESP ingedrukt houden en dan de 12 V aan', 'gezien'],
    ['E', '-T3 XL4015 zonder -K7: 12 V aan IN, OUT+ – OUT− met de potmeter op 5,5 V zetten, een druppel lak erop; de elco -C5 is 25 V of meer', '5,4 .. 5,6 V'],
    ['F', '-Q4 en -Q3: IR-led 1 gekozen in het dashboard: alleen kanaal 1 geleidt (n− – VIN− < 0,1 V), de andere 7 niet', 'alleen 1'],
    ['G', 'IR-zelftest (-B1 TSMP58000, -Q3, -Q4): IR-led 1 voor het venster, knop "IR-zelftest": draaggolf en dezelfde code terug. Niet: duty op 50 %', '37 .. 39 kHz'],
    ['H', 'Stopplaats van Ian (Fable 5.2 TN3): houd zijn stopled voor het venster en kies IR leren. Leert de doos een code: gemoduleerd (120 Ω). Ziet de gsm-camera licht maar leert de doos niets: continu (of een draaggolf buiten 20-60 kHz): codesoort "continu" en de IR-leds met 470 Ω 0,5 W (EN1). Zeker zijn: een TCRT5000 op GPIO11, het niveau staat in het dashboard', 'code / continu'],
    ['I', 'Zelftest (Instellingen › Zelftest): I2C -K5 0x20, -K2 0x40, -K7 0x42 gevonden; -X6 bord "v1.1" opgedrukt (GPIO48)', '3 gevonden'],
    ['J', '-K7: één servo van a naar b; bij een herstart gaan de servo\'s één voor één naar hun stand', 'gedaan'],
    ['K', '-X12 – -X13: 3,3 V naar de baan (B3V3, na -F20 MF-R030 0,3 A, van -X7), met de 4 reflexsensoren aan; een draadje -X12 naar 0 V: de ESP blijft draaien', '3,1 .. 3,35 V'],
    ['L', 'OE met beide PCA9685 (-K2 en -K7) aangesloten, RESET ingedrukt (-X1/-X2 12 V aan, -T2 levert 5 V)', '≥ 2,5 V'],
    ['M', 'Reflexsensor (TCRT5000) op ingang 17 (-K5 GPB0, 1 kΩ in serie): hand erboven = "actief", weg = "rust"', 'actief/rust'],
  ];
  // de tabel met afgebroken regels (de controles zijn lang): kolommen stap, meting, grens, gemeten, OK
  const kol = [6, 112, 24, 24, 9], x0 = 25, bt = kol.reduce((q, w) => q + w, 0), lh = 3.0, breek = (t: string, n: number) => {
    const uit: string[] = [];
    let r = '';
    for (const w of t.split(' ')) { if ((r + ' ' + w).trim().length > n) { uit.push(r.trim()); r = w; } else r += ' ' + w; }
    if (r.trim()) uit.push(r.trim());
    return uit;
  };
  let yt = 268;
  b.rect(x0, yt - 6, bt, 6, 0.35);
  ['', 'Meting of controle', 'Grens', 'Gemeten', 'OK'].reduce((xx, t, k) => { b.tekst([xx + 1, yt - 4.4], t, 2.1, 'start', { vet: true }); return xx + kol[k]; }, x0);
  yt -= 6;
  for (const [nrS, wat, grens] of stappen) {
    const rg = breek(wat, 92), rg2 = breek(grens, 18), h = Math.max(rg.length, rg2.length) * lh + 2.2;
    b.rect(x0, yt - h, bt, h, 0.2);
    let xx = x0;
    for (const w of kol.slice(0, -1)) { xx += w; b.lijn([xx, yt], [xx, yt - h], 0.18); }
    b.tekst([x0 + 1, yt - 3.2], nrS, 2.1, 'start', { vet: true });
    rg.forEach((t, k) => b.tekst([x0 + kol[0] + 1, yt - 3.2 - k * lh], t, 2.0));
    rg2.forEach((t, k) => b.tekst([x0 + kol[0] + kol[1] + 1, yt - 3.2 - k * lh], t, 2.0));
    yt -= h;
  }
  const y = yt - 6;
  const regels = [
    'Na A: Instellingen › Hardware › print 1..3: de gemeten variant. "gnd": per NPN-sensor of open-collector-hallsensor een weerstand',
    '2,2 kΩ van IN naar S12 (-X3); de firmware keert die ingang om. "apart": per ingang NPN of PNP. PNP kan niet op een print "vcc".',
    'Na C: bouwvlag en "IR-led actief laag" gelijk aan wat je mat (firmware/README.md). Na G niet goed: 1 Ω in de 0 V van -Q3 en een scoop.',
    'Eerst kopen (één stuk): optocouplerprint (-K3), 8-kanaals MOSFET-module (-Q1), AOD4184 (-Q3), MCP23017 (-K5), XL4015 (-T3),',
    'TSMP58000 (-B1), een IR-led en een TCRT5000: ± € 24 tot € 37 (bestellijst). Print pas daarna het proefstuk (TRN-08) en de helften.',
  ];
  regels.forEach((t, i) => b.tekst([25, y - i * 3.6], t, 2.1));
  kaderA4(b, { nr, naam: 'Versie 6: eerst kopen en meten', soort: 'Meetblad', blad }, project);
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
  b.tekst([25, 37.5], 'Elke ingang: de knop of sensor tussen IN en 0 V (-X2), +12 V van -X3. PNP alleen op een print "gnd" of "apart" (TRN-22 stap A).', 2.2);
  kaderA4(b, { nr, naam: 'Namen van groepen en ingangen', soort: 'Invulblad', blad }, project);
  return b.svg();
}
export { esc };
