/**
 * Werktekeningen van de afzuiging (voorbeelden/afzuiging/tekeningen): AFZUIGING_TEKENINGEN=1 npx vitest run
 * src/qa/tekeningenAfzuiging.test.ts. Elk blad is A3 liggend in Europese projectie (ISO E): aanzichten met verborgen
 * lijnen weggewerkt uit de tekenmodule van Phlippo CAD (HLR), een doorsnede met arcering waar het binnenwerk telt,
 * hoofdmaten, een tabel met de belangrijke maten en het titelblok. Daarnaast de samenstellingstekening met ballonnen
 * en stuklijst, en de bewerkingen in het tafelblad.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { parseDocument } from '../core/document/persistence';
import type { Component, Document, DrawingViewType } from '../core/document/types';
import { projectedView, sectionGeometry, modelBodies, type ViewGeo } from '../core/drawing/sheet';
import { hatchLines } from '../core/drawing/export2d';
import { viewFrame } from '../core/drawing/hlr';
import { visibleAnchors, layoutBalloons } from '../core/drawing/balloons';
import { rebuildDocument } from '../core/features/rebuild';
import { rebuildAssembly } from '../core/assembly/assembly';
import { meshVolume } from '../core/features/solid';
// @ts-expect-error: het generatorscript is plain JavaScript
import { M } from '../../voorbeelden/afzuiging/maak-afzuiging.mjs';
import { REVISIE } from '../../voorbeelden/afzuiging/revisie.mjs';

const DIR = 'voorbeelden/afzuiging';
const UIT = `${DIR}/tekeningen`;
const W = 420, H = 297; // A3 liggend
const DATUM = REVISIE.datum;
type P = [number, number];

const open = (f: string): Document => parseDocument(readFileSync(f, 'utf8'));
const getal = (v: number, dec = 1) => (Math.round(v * 10 ** dec) / 10 ** dec).toString().replace('.', ',');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** één blad: alles in mm met y omhoog; svg() zet het om (y omlaag) */
class Blad {
  el: string[] = [];
  y = (v: number) => H - v;
  lijn(a: P, b: P, w = 0.35, extra = '') { this.el.push(`<line x1="${a[0].toFixed(2)}" y1="${this.y(a[1]).toFixed(2)}" x2="${b[0].toFixed(2)}" y2="${this.y(b[1]).toFixed(2)}" stroke="#111" stroke-width="${w}" stroke-linecap="round" ${extra}/>`); }
  cirkel(c: P, r: number, w = 0.35) { this.el.push(`<circle cx="${c[0].toFixed(2)}" cy="${this.y(c[1]).toFixed(2)}" r="${r.toFixed(2)}" fill="none" stroke="#111" stroke-width="${w}"/>`); }
  rect(x: number, y: number, w: number, h: number, sw = 0.35, vul = 'none') { this.el.push(`<rect x="${x}" y="${this.y(y + h)}" width="${w}" height="${h}" fill="${vul}" stroke="#111" stroke-width="${sw}"/>`); }
  tekst(p: P, s: string, h = 3, anker: 'start' | 'middle' | 'end' = 'start', opts: { vet?: boolean; hoek?: number; kleur?: string } = {}) {
    const rot = opts.hoek ? ` transform="rotate(${-opts.hoek} ${p[0].toFixed(2)} ${this.y(p[1]).toFixed(2)})"` : '';
    this.el.push(`<text x="${p[0].toFixed(2)}" y="${this.y(p[1]).toFixed(2)}" font-size="${h}" text-anchor="${anker}" font-family="Arial, Helvetica, sans-serif"${opts.vet ? ' font-weight="bold"' : ''} fill="${opts.kleur ?? '#111'}"${rot}>${esc(s)}</text>`);
  }
  pijl(tip: P, richting: P) {
    const l = Math.hypot(richting[0], richting[1]), d: P = [richting[0] / l, richting[1] / l], n: P = [-d[1], d[0]];
    const a: P = [tip[0] - d[0] * 2.5 + n[0] * 0.6, tip[1] - d[1] * 2.5 + n[1] * 0.6], b: P = [tip[0] - d[0] * 2.5 - n[0] * 0.6, tip[1] - d[1] * 2.5 - n[1] * 0.6];
    this.el.push(`<polygon points="${tip[0].toFixed(2)},${this.y(tip[1]).toFixed(2)} ${a[0].toFixed(2)},${this.y(a[1]).toFixed(2)} ${b[0].toFixed(2)},${this.y(b[1]).toFixed(2)}" fill="#111"/>`);
  }
  /** horizontale maat tussen x1 en x2, maatlijn op hoogte y, hulplijnen vanaf y0 */
  maatH(x1: number, x2: number, y0: number, y: number, s: string) {
    const r = y > y0 ? 1 : -1;
    this.lijn([x1, y0 + r * 1], [x1, y + r * 1.5], 0.18); this.lijn([x2, y0 + r * 1], [x2, y + r * 1.5], 0.18);
    this.lijn([x1, y], [x2, y], 0.18); this.pijl([x1, y], [x1 - x2, 0]); this.pijl([x2, y], [x2 - x1, 0]);
    this.tekst([(x1 + x2) / 2, y + 1], s, 3, 'middle');
  }
  /** verticale maat tussen y1 en y2, maatlijn op x, hulplijnen vanaf x0 */
  maatV(y1: number, y2: number, x0: number, x: number, s: string) {
    const r = x > x0 ? 1 : -1;
    this.lijn([x0 + r * 1, y1], [x + r * 1.5, y1], 0.18); this.lijn([x0 + r * 1, y2], [x + r * 1.5, y2], 0.18);
    this.lijn([x, y1], [x, y2], 0.18); this.pijl([x, y1], [0, y1 - y2]); this.pijl([x, y2], [0, y2 - y1]);
    this.tekst([x - 1, (y1 + y2) / 2], s, 3, 'middle', { hoek: 90 });
  }
  svg() {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">\n<rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>\n${this.el.join('\n')}\n</svg>\n`;
  }
}

/** kader, projectiesymbool en titelblok */
function kader(b: Blad, t: { nr: string; naam: string; materiaal: string; maken: string; massa: string; schaal: string; blad: string }) {
  b.rect(10, 10, W - 20, H - 20, 0.7);
  const x0 = W - 10 - 190, y0 = 10, h = 40;
  b.rect(x0, y0, 190, h, 0.5);
  const kol = [x0, x0 + 95, x0 + 140, x0 + 190], rij = [y0, y0 + 10, y0 + 20, y0 + 30, y0 + 40];
  for (const y of rij.slice(1, 4)) b.lijn([x0, y], [x0 + 190, y], 0.25);
  b.lijn([kol[1], y0], [kol[1], y0 + h], 0.25); b.lijn([kol[2], y0], [kol[2], y0 + 30], 0.25);
  const veld = (x: number, y: number, label: string, waarde: string, h2 = 3.2, vet = false) => { b.tekst([x + 1.5, y + 7.3], label, 1.8, 'start', { kleur: '#666' }); b.tekst([x + 1.5, y + 2.8], waarde, h2, 'start', { vet }); };
  veld(kol[0], rij[3], 'Project', `Afzuiging Lush Beauty (versie ${REVISIE.versie})`, 3.4, true);
  veld(kol[1], rij[3], 'Benaming', t.naam, 3.4, true);
  veld(kol[0], rij[2], 'Materiaal', t.materiaal);
  veld(kol[0], rij[1], 'Maken', t.maken, 2.6);
  veld(kol[0], rij[0], 'Getekend', `Phlippo CAD · ${DATUM}`);
  veld(kol[1], rij[2], 'Tekeningnummer', t.nr, 3.4, true);
  veld(kol[2], rij[2], 'Blad', t.blad);
  veld(kol[1], rij[1], 'Schaal', t.schaal);
  veld(kol[2], rij[1], 'Massa', t.massa);
  veld(kol[1], rij[0], 'Maten en toleranties', 'mm · ISO 2768-m');
  // projectiesymbool Europese projectie (ISO E): kegel links, cirkels rechts
  const sx = kol[2] + 8, sy = rij[0] + 5;
  b.lijn([sx, sy - 3], [sx + 9, sy - 1.5], 0.3); b.lijn([sx, sy + 3], [sx + 9, sy + 1.5], 0.3); b.lijn([sx, sy - 3], [sx, sy + 3], 0.3); b.lijn([sx + 9, sy - 1.5], [sx + 9, sy + 1.5], 0.3);
  b.cirkel([sx + 17, sy], 3, 0.3); b.cirkel([sx + 17, sy], 1.5, 0.3);
  b.tekst([sx + 24, sy - 1], 'ISO E', 2.2);
}

/** een aanzicht op het blad: lijnen, cirkels met hartlijnen, arcering; geeft het kader op het blad terug */
type Rechthoek = { x0: number; y0: number; x1: number; y1: number };
/** het deel van a-b binnen de rechthoek (Liang-Barsky), of null */
function knip(a: P, b: P, k: Rechthoek): [P, P] | null {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - k.x0], [dx, k.x1 - a[0]], [-dy, a[1] - k.y0], [dy, k.y1 - a[1]]]) {
    if (Math.abs(p) < 1e-12) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
  }
  return [[a[0] + t0 * dx, a[1] + t0 * dy], [a[0] + t1 * dx, a[1] + t1 * dy]];
}

function teken(b: Blad, g: ViewGeo, s: number, c: P, opts: { hartlijnen?: boolean; mid?: P; knip?: Rechthoek } = {}) {
  const mid: P = opts.mid ?? [(g.min[0] + g.max[0]) / 2, (g.min[1] + g.max[1]) / 2];
  const to = (p: P): P => [c[0] + (p[0] - mid[0]) * s, c[1] + (p[1] - mid[1]) * s];
  const lijn = (a: P, q: P, w: number, extra = '') => {
    if (!opts.knip) { b.lijn(a, q, w, extra); return; }
    const k = knip(a, q, opts.knip);
    if (k) b.lijn(k[0], k[1], w, extra);
  };
  for (const l of g.lines) {
    if (l.hidden) continue;
    if (l.cosmetic) lijn(to(l.a), to(l.b), 0.18, 'stroke-dasharray="6 1.5 1 1.5"');
    else lijn(to(l.a), to(l.b), 0.35);
  }
  for (const k of g.circles) {
    if (k.hidden) continue;
    const m = to(k.c), r = k.r * s;
    if (opts.knip && (m[0] - r < opts.knip.x0 || m[0] + r > opts.knip.x1 || m[1] - r < opts.knip.y0 || m[1] + r > opts.knip.y1)) continue;
    b.cirkel(m, r, 0.35);
    if (opts.hartlijnen !== false && r > 1.2) {
      const e = r + 1.5;
      b.lijn([m[0] - e, m[1]], [m[0] + e, m[1]], 0.13, 'stroke-dasharray="4 1 0.8 1"');
      b.lijn([m[0], m[1] - e], [m[0], m[1] + e], 0.13, 'stroke-dasharray="4 1 0.8 1"');
    }
  }
  // arcering: per lichaam een andere richting of steek (hatchVar), zodat aangrenzende delen te onderscheiden zijn
  const soorten: [number, number][] = [[45, 2], [135, 2], [45, 1.2]];
  for (let v = 0; v < 3; v++) {
    const lussen = (g.hatch ?? []).filter((_, i) => (g.hatchVar?.[i] ?? 0) === v).map((l) => l.map(to));
    if (lussen.length) for (const [a, q] of hatchLines(lussen, soorten[v][0], soorten[v][1])) b.lijn(a, q, 0.13);
  }
  const lo = to(g.min), hi = to(g.max);
  return { x0: lo[0], y0: lo[1], x1: hi[0], y1: hi[1], to };
}

const SCHALEN: [number, number][] = [[5, 1], [2, 1], [1, 1], [1, 2], [1, 5], [1, 10]];
const schaalTekst = ([a, c]: [number, number]) => `${a}:${c}`;

interface Deel {
  f: string; nr: string; naam: string; materiaal: string; maken: string;
  snede?: boolean; aanzichten?: DrawingViewType[]; maten: string[]; dichtheid: number;
}

/** werktekening van één onderdeel: vooraanzicht (of doorsnede A-A), bovenaanzicht eronder, linkeraanzicht rechts, isometrie en maattabel */
function onderdeelBlad(d: Deel, blad: string): string {
  const model = open(`${DIR}/${d.f}`);
  const sec = { parentId: 't', parentType: 'top' as DrawingViewType, axis: 'h' as const, at: 0, flip: true, label: 'A' };
  const voor = d.snede ? sectionGeometry(model, sec) : projectedView(model, 'front');
  const boven = projectedView(model, 'top'), links = projectedView(model, 'left');
  const iso = projectedView(model, 'isometric');
  const w = (g: ViewGeo) => g.max[0] - g.min[0], h = (g: ViewGeo) => g.max[1] - g.min[1];
  // grootste schaal waarbij de drie aanzichten (met 30 mm voor maten) in 255 x 230 mm passen
  const schaal = SCHALEN.find(([a, c]) => { const k = a / c; return (w(voor) + w(links)) * k + 52 <= 276 && (h(voor) + h(boven)) * k + 50 <= 255; }) ?? SCHALEN[SCHALEN.length - 1];
  const s = schaal[0] / schaal[1];
  const b = new Blad();
  const gx = 14, gy = 287 - 6; // linkerbovenhoek van het gebied voor de aanzichten
  const fv: P = [gx + 22 + (w(voor) * s) / 2, gy - 18 - (h(voor) * s) / 2];
  const F = teken(b, voor, s, fv);
  const T = teken(b, boven, s, [fv[0], F.y0 - 26 - (h(boven) * s) / 2]);
  const L = teken(b, links, s, [F.x1 + 20 + (w(links) * s) / 2, fv[1]]);
  // hoofdmaten
  b.maatH(F.x0, F.x1, F.y1, F.y1 + 8, getal(w(voor)));
  b.maatV(F.y0, F.y1, F.x0, F.x0 - 8, getal(h(voor)));
  b.maatV(T.y0, T.y1, T.x0, T.x0 - 8, getal(h(boven)));
  b.maatH(L.x0, L.x1, L.y1, L.y1 + 8, getal(w(links)));
  // benamingen van de aanzichten
  b.tekst([(F.x0 + F.x1) / 2, F.y1 + 14], d.snede ? 'Doorsnede A-A' : 'Vooraanzicht', 3.2, 'middle', { vet: true });
  b.tekst([(T.x0 + T.x1) / 2, T.y0 - 6], 'Bovenaanzicht', 3.2, 'middle', { vet: true });
  b.tekst([(L.x0 + L.x1) / 2, L.y1 + 14], 'Linkeraanzicht', 3.2, 'middle', { vet: true });
  if (d.snede) {
    // snijlijn A-A in het bovenaanzicht (z = 0), de pijlen wijzen in de kijkrichting (naar achteren = omhoog)
    const ya = T.to([0, 0])[1];
    b.lijn([T.x0 - 6, ya], [T.x1 + 6, ya], 0.25, 'stroke-dasharray="8 1.5 1.5 1.5"');
    for (const x of [T.x0 - 6, T.x1 + 6]) { b.lijn([x, ya], [x, ya + 5], 0.35); b.pijl([x, ya + 6], [0, 1]); b.tekst([x, ya + 8], 'A', 3.5, 'middle', { vet: true }); }
  }
  // isometrie rechtsboven
  const ki = Math.min(105 / w(iso), 90 / h(iso));
  teken(b, iso, ki, [352, 222], { hartlijnen: false });
  b.tekst([352, 278], 'Isometrie (schaal vrij)', 3, 'middle', { vet: true });
  // maattabel
  let ty = 160;
  b.tekst([292, ty], 'Belangrijke maten en bewerkingen', 3.2, 'start', { vet: true });
  for (const r of d.maten) { ty -= 5.2; b.tekst([292, ty], r, 2.5); }
  // massa uit het volume
  const r = rebuildDocument(model) as unknown as { bodies: { geometry: THREE.BufferGeometry }[] };
  const massa = meshVolume(r.bodies[0].geometry) * d.dichtheid * 1e-3; // mm³ -> cm³ -> g
  kader(b, { nr: d.nr, naam: d.naam, materiaal: d.materiaal, maken: d.maken, massa: `${getal(massa, 0)} g (massief)`, schaal: schaalTekst(schaal), blad });
  return b.svg();
}

const PET = 1.27, RVS = 7.9;
const m = M as Record<string, any>;
const DELEN: Deel[] = [
  { f: 'Romp.kcad', nr: 'AFZ-01', naam: 'Romp', materiaal: 'PETG (wit)', maken: '3D-print rechtop, 5 wanden, 40 % gyroid, zonder support', snede: true, dichtheid: PET, maten: [
    `Buitenmaat ${m.romp.b} x ${m.romp.d} x ${-m.romp.onder}, wand ${m.romp.wand}, hoeken R${m.romp.r}`,
    `4 torens met klauwkanaal, as op x ±${getal(m.klauw.x)} en z ±${m.klauw.z}`,
    `Gaten M5: Ø5,8 x 67 diep vanaf de bovenkant (in de torens)`,
    `Klauwkanaal ${2 * (m.klauw.naaf + 0.5)} x ${2 * (m.klauw.naaf + 0.5)} van ${m.toren.top} tot ${m.toren.bodem} (Y)`,
    `Richel cassette: binnen ${2 * m.richel.x} x ${2 * m.richel.z}, ${m.richel.dikte} dik bovenaan`,
    `Richel instroomplaat: 3 treden van 1 mm onder Y ${m.inlaat.top - m.inlaat.dikte}`,
    `8 gaten Ø2,5 x 12 van onderen (M3, bodemplaat)`,
    `Achterwand: Ø10,2 (M8-bus binder 718, M10 x 0,75) en Ø3,1 (messingbuisje)`,
    'Binnen tegen de achterwand: 2 ringen Ø5,6 (slangetje) en 1 ring Ø7 (draden ventilator)',
  ] },
  { f: 'Bovenframe.kcad', nr: 'AFZ-02', naam: 'Bovenframe', materiaal: 'PETG (wit)', maken: '3D-print plat, 5 wanden, 6 lagen boven/onder', dichtheid: PET, maten: [
    `Buitenmaat ${m.frame.b} x ${m.frame.d} x ${m.frame.dikte}, hoeken R${m.frame.r}`,
    `Opening ${2 * m.frame.opening.x} x ${2 * m.frame.opening.z}, hoeken R${m.frame.opening.r}`,
    `4 lippen boven de torens, met verzinking 90° Ø10,4 x 2 en gat Ø6 (M5)`,
    `4 magneetgaten Ø${getal(m.magneten.d + 0.2)} x ${getal(m.magneten.h + 0.1)} op x ±${getal(m.magneten.plaats[0][0], 2)}, z ±${m.magneten.plaats[0][1]}`,
    'Op de romp gelijmd (tweecomponentenlijm, rondom luchtdicht)',
  ] },
  { f: 'Rooster-LB.kcad', nr: 'AFZ-03', naam: 'RVS-plaat met LB-rooster', materiaal: 'RVS 430 (magnetisch), 1,5 mm, geborsteld', maken: 'Lasersnijden volgens laser/rooster.dxf', dichtheid: RVS, maten: [
    `Plaat ${m.frame.b} x ${m.frame.d} x 1,5, hoeken R${m.frame.r}`,
    'Rand 11 mm zonder gaten; LB-monogram 75 mm hoog',
    'Sleuven 3,5 mm, stegen 3 mm, nergens smaller dan 1,5 mm',
    'Eén stuk staal, geen losse eilanden (zie het laserrapport)',
    'Snijden volgens laser/rooster.dxf (laag SNIJDEN)',
  ] },
  { f: 'Filtercassette.kcad', nr: 'AFZ-04', naam: 'Filtercassette (bak)', materiaal: 'PETG (wit)', maken: '3D-print rechtop, de roosterbodem op het bed', snede: true, dichtheid: PET, maten: [
    `Buitenmaat ${2 * m.cassette.x} x ${2 * m.cassette.z} x ${-m.cassette.onder}, wand ${m.cassette.wand}, bodem ${m.cassette.bodem}`,
    'Roosterbodem: vakken 18 x 18, ribben 3 mm',
    `Binnenmaat ${2 * (m.cassette.x - m.cassette.wand)} x ${2 * (m.cassette.z - m.cassette.wand)}: één standaardmat Rittal SK 3171.100 (173 x 173 x 17, 1 mm aangedrukt)`,
    'De rand (AFZ-05) wordt op de wandbovenkant gelijmd',
  ] },
  { f: 'Cassetterand.kcad', nr: 'AFZ-05', naam: 'Rand van de filtercassette', materiaal: 'PETG (wit)', maken: '3D-print plat', dichtheid: PET, maten: [
    `Buitenmaat ${2 * m.cassette.rand.x} x ${2 * m.cassette.rand.z} x ${m.cassette.rand.dikte}, hoeken R${m.frame.opening.r}`,
    `Opening ${2 * (m.cassette.x - m.cassette.wand)} x ${2 * (m.cassette.z - m.cassette.wand)}`,
    'Uitsparingen voor de 4 lippen van het frame, 2 met greep',
    'Rondom gelijmd op de bak (AFZ-04)',
  ] },
  { f: 'Instroomplaat.kcad', nr: 'AFZ-06', naam: 'Instroomplaat', materiaal: 'PETG (wit)', maken: '3D-print plat, de trechter naar boven', dichtheid: PET, maten: [
    `Plaat ${m.inlaat.dikte} dik, past tussen de torens in de romp (0,3 speling)`,
    `Trechter: Ø${2 * m.inlaat.kraag} - Ø${2 * (m.inlaat.kraag + m.inlaat.gat) / 2} - Ø${2 * m.inlaat.gat} (treden van 1 mm)`,
    `Gat Ø3,1 voor het messingbuisje op x ${m.achter.meet[0]}, z ${m.achter.meet[1]}`,
    'Op de getrapte richel van de romp gelijmd',
  ] },
  { f: 'Bodemplaat.kcad', nr: 'AFZ-07', naam: 'Bodemplaat', materiaal: 'PETG (wit)', maken: '3D-print plat, de lamellen onder 45°', dichtheid: PET, maten: [
    `Buitenmaat ${m.romp.b} x ${m.romp.d} x ${m.uitblaas.dikte}, hoeken R${m.romp.r}`,
    `Lamellen 2 mm, steek ${m.uitblaas.steek}, onder 45° naar achteren`,
    `Schijf Ø${2 * m.uitblaas.schijf} onder de motor`,
    `4 x M4 verzonken 90° (Ø8,2) op Ø${2 * m.fan.gat}, onder 45°`,
    '8 x M3 verzonken 90° (Ø6,2) in de torens en de wandbussen',
  ] },
  { f: 'Voedingsbox.kcad', nr: 'AFZ-08', naam: 'Voedingsbox', materiaal: 'PETG (wit)', maken: '3D-print rechtop, de bodem op het bed', snede: true, dichtheid: PET, maten: [
    `Bak ${m.box.b} x ${m.box.d} x ${m.box.boven - m.box.onder}, wand ${m.box.wand}; rand ${m.box.b + 2 * m.box.flens.x} x ${m.box.d + 2 * m.box.flens.z} x ${m.box.flensDik} met een schuine kant van 45°`,
    `De bovenste ${m.box.boven} mm zit in de uitsparing van ${m.box.frees.b} x ${m.box.frees.d} x ${m.box.frees.diep}, los deksel bovenin (AFZ-14)`,
    '4 gaten Ø4,5 in de rand, van onderen zitting Ø9 en verzinking 90° (M4 x 30 in pluggen voor holle deuren)',
    '4 paaltjes Ø10,4 in de hoeken met een gat Ø2,5 x 10 (M3 x 8, deksel)',
    'Ventilatie: sleuven 2,5 breed in de bodem en 2,5 x 12 achteraan (18 tot 30 onder het blad)',
    'Schuine kant uitgespaard voor C13, M8 en schakelaar (rand als brug)',
    'Aan/uit-schakelaar verzonken in de voorwand (kom 25 x 19 x 6, inbouwgat 19 x 13)',
    `2 paaltjes ${m.box.klem.b} x ${m.box.klem.d} tot de bovenkant van de adapter, gat Ø2,5 (M3, adapterklemmen)`,
    'Ring Ø5,6 tegen de voorwand voor het slangetje naar de drukmeter',
    'Opening C13 32 x 24 (links), M8 Ø10,2 (M10 x 0,75) en buisje Ø3,1 (voor)',
    'USB-C 9,8 x 4 (knop) en 9,4 x 3,6 (ESP32-C3) (rechts)',
  ] },
  { f: 'Knophouder.kcad', nr: 'AFZ-09', naam: 'Knophouder', materiaal: 'PETG (zwart)', maken: '3D-print ondersteboven, de plaat op het bed', snede: true, dichtheid: PET, maten: [
    `Plaat Ø${m.dial.d} x ${m.dial.plaat}, buis Ø${2 * m.dial.buis} tot ${m.dial.onder} (in een gat Ø${m.dial.gat})`,
    `Kom voor de naaf: Ø${2 * m.dial.naaf[0][0]} x ${m.dial.naaf[0][1]} en Ø${2 * m.dial.naaf[1][0]} x ${m.dial.naaf[1][1]}`,
    '2 x M2,5 verzonken van onderen (Ø2,8) en 2 pennen Ø1,7 in de vloer, sleuf voor de FPC',
    `2 klauwkanalen op x ±${getal(m.dial.klauw.x)}, M4 verzonken 90° (Ø8,4) in de plaat`,
    'Groeven voor de adapterprint, 2 bussen (M2,5) voor het deksel diagonaal',
    `Opening USB-C ${m.dial.usb.gat.b} x ${getal(m.dial.usb.gat.y[1] - m.dial.usb.gat.y[0])} in de achterwand (kant van de sleuf), onderkant op Y ${getal(m.dial.usb.gat.y[0])}`,
    `2 palen Ø5 met gat Ø1,6 x 6 (M2) voor het USB-C-printje, x ±${getal(m.dial.usb.paal.x)}`,
  ] },
  { f: 'Knopdeksel.kcad', nr: 'AFZ-10', naam: 'Deksel van de knophouder', materiaal: 'PETG (zwart)', maken: '3D-print plat', dichtheid: PET, maten: [
    `Schijf Ø${2 * m.dial.buis} x ${m.dial.deksel}`,
    `2 x M2,5 verzonken 90° (Ø5,2) op (${m.dial.bus[0].join(', ')}) en (${m.dial.bus[1].join(', ')})`,
    'Dicht: de USB-C zit in de wand van de houder',
    `2 gaatjes Ø4 op x ±${getal(m.dial.klauw.x)} voor de punten van de M4 x 65`,
  ] },
  { f: 'Klauw.kcad', nr: 'AFZ-11', naam: 'Klauw (module)', materiaal: 'PETG (wit), 100 % vulling', maken: '3D-print plat, de moerkamer op het bed', snede: true, dichtheid: PET, maten: [
    `Naaf R${m.klauw.naaf}, arm ${m.klauw.arm} x ${m.klauw.breed}, dikte ${m.klauw.dik}`,
    `Gat Ø5,5; van onderen zeskantkamer SW ${getal(m.klauw.moer.s + m.klauw.moer.speling)} x ${getal(m.klauw.moer.m + 0.2)} voor een M5-moer (DIN 934)`,
    'De moer van onderen inpersen: ze draait niet mee, de klauw draait met de schroef',
    'Aantal: 4',
  ] },
  { f: 'Knopklauw.kcad', nr: 'AFZ-12', naam: 'Klauw (knophouder)', materiaal: 'PETG (zwart), 100 % vulling', maken: '3D-print plat, de moerkamer op het bed', snede: true, dichtheid: PET, maten: [
    `Naaf R${m.dial.klauw.naaf}, arm ${m.dial.klauw.arm} x ${m.dial.klauw.breed}, dikte ${m.dial.klauw.dik}`,
    `Gat Ø4,5; van onderen zeskantkamer SW ${getal(m.dial.klauw.moer.s + m.dial.klauw.moer.speling)} x ${getal(m.dial.klauw.moer.m + 0.2)} voor een M4-moer (DIN 934)`,
    'Aantal: 2',
  ] },
  { f: 'Deksel-voedingsbox.kcad', nr: 'AFZ-14', naam: 'Deksel van de voedingsbox', materiaal: 'PETG (wit)', maken: '3D-print plat', dichtheid: PET, maten: [
    `${getal(m.box.b - 2 * m.box.wand - 0.4)} x ${getal(m.box.d - 2 * m.box.wand - 0.4)} x ${m.box.deksel}, hoeken R1,8`,
    'Valt bovenin de bak op de 4 paaltjes; 4 x M3 verzonken 90° (Ø6,4)',
    'Zit mee in de uitsparing van het blad (1 mm onder het plafond)',
  ] },
  { f: 'Adapterklem.kcad', nr: 'AFZ-13', naam: 'Klem van de netadapter', materiaal: 'PETG (wit)', maken: '3D-print plat', dichtheid: PET, maten: [
    `${m.box.klem.b} x ${m.box.klem.d + 8.5} x 3, lip van 8 mm over de adapter`,
    'M3 verzonken 90° (Ø6,4) in het paaltje van de box (M3 x 10)',
    'Aantal: 2',
  ] },
];

/** bewerkingen in het tafelblad: bovenaanzicht (uitsparing, knopgat) en onderaanzicht (box, sleuven) met maten vanaf de randen */
function tafelbladBlad(blad: string): string {
  const model = open('voorbeelden/bureau/LAGKAPTEN-tafelblad.kcad');
  const b = new Blad();
  const u = m.uitsparing, d = m.dial, B = m.box, F = B.frees, K = m.sleuven;
  const boven = projectedView(model, 'top'), onder = projectedView(model, 'bottom');
  // in het bovenaanzicht is v = -z; in het onderaanzicht zoeken we de richting op aan het knopgat (z > 0)
  const knopO = onder.circles.find((k) => Math.abs(k.r - d.gat / 2) < 0.5)!;
  const kz = Math.sign(knopO.c[1]) || 1; // v = kz * z in het onderaanzicht
  const kx = Math.sign(knopO.c[0]) || 1; // u = kx * x
  // bovenaanzicht 1:10 linksboven
  const s = 0.1;
  const T = teken(b, boven, s, [100, 222], { mid: [0, 0] });
  b.tekst([100, T.y1 + 15], 'Bovenaanzicht (1:10, voorkant onderaan)', 3.2, 'middle', { vet: true });
  b.maatH(T.x0, T.x1, T.y1, T.y1 + 8, '1400');
  b.maatV(T.y0, T.y1, T.x0, T.x0 - 8, '600');
  const p = (x: number, z: number) => T.to([x, -z]);
  const ul = p(-u.b / 2, u.d / 2), k = p(d.x, d.z);
  b.maatH(T.x0, ul[0], T.y0, T.y0 - 7, getal(700 - u.b / 2));
  b.maatH(T.x0, k[0], T.y0, T.y0 - 14, getal(700 + d.x));
  b.maatV(T.y0, ul[1], T.x1, T.x1 + 7, getal(300 - u.d / 2));
  b.maatV(T.y0, k[1], T.x1, T.x1 + 15, getal(300 - d.z));
  // onderaanzicht 1:10 linksonder (blad omgedraaid over de lange rand: de voorkant ligt nu boven)
  const O = teken(b, onder, s, [100, 108], { mid: [0, 0] });
  b.tekst([100, O.y1 + 6], 'Onderaanzicht (1:10, blad omgedraaid, voorkant boven)', 3.2, 'middle', { vet: true });
  const q = (x: number, z: number) => O.to([kx * x, kz * z]);
  const bx = q(B.x - F.b / 2, B.z), bv = q(B.x, B.z + kz * 0 + (kz > 0 ? -F.d / 2 : F.d / 2));
  b.maatH(O.x0, Math.min(bx[0], q(B.x + F.b / 2, B.z)[0]), O.y0, O.y0 - 7, getal(700 - F.b / 2));
  const voorO = kz > 0 ? O.y1 : O.y0; // de voorrand in het onderaanzicht
  b.maatV(voorO, q(0, B.z)[1], O.x1, O.x1 + 7, getal(300 - B.z));
  void bv;
  // detail van de onderkant 1:5: uitsparing, box, sleuven en knopgat
  const sd = 0.2;
  const zc = (B.z + d.z) / 2, xc = (d.x - 120) / 2 + 10;
  const vak = { x0: 188, y0: 150, x1: 285, y1: 262 };
  const cD: P = [(vak.x0 + vak.x1) / 2, (vak.y0 + vak.y1) / 2];
  const D = teken(b, onder, sd, cD, { mid: [kx * xc, kz * zc], knip: vak });
  b.rect(vak.x0, vak.y0, vak.x1 - vak.x0, vak.y1 - vak.y0, 0.25);
  b.tekst([cD[0], vak.y1 + 3], 'Detail onderkant (1:5)', 3.2, 'middle', { vet: true });
  const r2 = (x: number, z: number) => D.to([kx * x, kz * z]);
  // maten van de box en de sleuven
  const b0 = r2(B.x - F.b / 2, B.z), b1 = r2(B.x + F.b / 2, B.z);
  const xl = Math.min(b0[0], b1[0]), xr = Math.max(b0[0], b1[0]);
  const yb = (z: number) => r2(0, z)[1];
  const by0 = Math.min(yb(B.z - F.d / 2), yb(B.z + F.d / 2)), by1 = Math.max(yb(B.z - F.d / 2), yb(B.z + F.d / 2));
  if (xl > vak.x0 && xr < vak.x1) b.maatH(xl, xr, kz > 0 ? by0 : by1, kz > 0 ? by0 - 6 : by1 + 6, `${F.b}`);
  b.maatV(by0, by1, xl, xl - 7, `${F.d}`);
  const uy = kz > 0 ? yb(-u.d / 2) : yb(-u.d / 2);
  const bnear = kz > 0 ? by1 : by0;
  b.maatV(Math.min(uy, bnear), Math.max(uy, bnear), xr - 30, xr - 30, getal(-B.z - F.d / 2 - u.d / 2));
  const ms = r2((K.module.x[0] + K.module.x[1]) / 2, (B.z + -u.d / 2) / 2);
  b.tekst([ms[0] - 4.5, ms[1] + 2.5], `sleuf ${K.module.x[1] - K.module.x[0]} x ${K.module.diep}`, 2.4, 'end');
  const ks = r2(d.x - 40, (B.z + d.z) / 2 + 60);
  b.tekst([ks[0] + 2, ks[1]], `sleuf ${K.knop.breed} x ${K.knop.diep}`, 2.4);
  const bc = r2(B.x, B.z);
  b.tekst([bc[0], bc[1] - 1], `${F.diep} diep, R${F.r}`, 2.4, 'middle');
  // bewerkingen
  const regels = [
    'Bovenkant (doorgaand):',
    `- uitsparing ${u.b} x ${u.d}, hoeken R${u.r} (frees Ø10), midden van het blad`,
    `- gat Ø${d.gat} (gatzaag), ${700 + d.x} van links, ${300 - d.z} van voor`,
    'Onderkant (niet doorgaand):',
    `- uitsparing voedingsbox ${F.b} x ${F.d} x ${F.diep} diep, R${F.r},`,
    `  midden ${700 + B.x} van links, ${300 - B.z} van voor`,
    `- 4 gaten Ø${B.plug.gat} x ${B.plug.diep} voor pluggen (holle deur), ${2 * B.plug.x} x ${2 * B.plug.z} hart op hart rond de box`,
    `- sleuf naar de afzuiging ${K.module.x[1] - K.module.x[0]} breed x ${K.module.diep} diep,`,
    `  ${700 + K.module.x[0]} tot ${700 + K.module.x[1]} van links (box tot uitsparing)`,
    `- sleuf naar de knop ${K.knop.breed} x ${K.knop.diep}, van de box naar het knopgat`,
    'Maten vanaf de linkerrand en de voorrand (waar je zit).',
    'LAGKAPTEN is vanbinnen een honingraat: frees',
    'rustig en in twee gangen, onderhuid ca. 3 mm.',
  ];
  let ty = 272;
  b.tekst([292, ty], 'Bewerkingen', 3.4, 'start', { vet: true });
  for (const r of regels) { ty -= 5.2; b.tekst([292, ty], r, 2.45); }
  kader(b, { nr: 'AFZ-20', naam: 'Tafelblad LAGKAPTEN: bewerkingen', materiaal: 'LAGKAPTEN 1400 x 600 x 34 (IKEA)', maken: 'Bovenfrees Ø10 en Ø5, gatzaag Ø44', massa: '—', schaal: '1:10 en 1:5', blad });
  return b.svg();
}

/** samenstelling: opengewerkte isometrie met ballonnen en de stuklijst */
function samenstellingBlad(blad: string): { svg: string; stuklijst: string[][] } {
  const asm = open(`${DIR}/Afzuiging.kcad`) as Document & { components: Component[] };
  // opengewerkt: rooster, cassette en filters omhoog, bodemplaat met ventilator omlaag, de box en de knop uit elkaar
  const op = (c: Component): [number, number, number] => {
    const [x, y, z] = c.position;
    const id = c.id;
    if (id === 'a2') return [x, y + 190, z];
    if (/^a3|^af\d/.test(id)) return [x, y + 120, z];
    if (['a4', 'a5'].includes(id) || /^as3\d|^as4\d/.test(id)) return [x, y - 120, z];
    if (id === 'a9' || id === 'a18') return [x, y + 60, z];
    if (/^a2\d|^as25|^as2\d$|^asa\d$|^asbd?\d$/.test(id)) return [x, y - 60, z - 40];
    if (/^a(7|8|12|14|15|dk\d|dn\d|sd\d|sk\d|sdk\d|su\d)$/.test(id)) return [x, y + 40, z - 250];
    if (/^as5\d/.test(id)) return [x, y + 60, z];
    return [x, y, z];
  };
  const comps = asm.components.map((c) => ({ ...c, position: op(c) }));
  const doc = { ...asm, components: comps } as Document;
  const g = projectedView(doc, 'isometric');
  const b = new Blad();
  const s = Math.min(235 / (g.max[0] - g.min[0]), 200 / (g.max[1] - g.min[1]));
  const c: P = [148, 162];
  const T = teken(b, g, s, c, { hartlijnen: false });
  // stuklijst: één regel per onderdeel (naam zonder <n>), aantal
  const naamVan = (c2: Component) => c2.name.replace(/<\d+>$/, '');
  const groepen = new Map<string, Component[]>();
  for (const c2 of comps) { const n = naamVan(c2); groepen.set(n, [...(groepen.get(n) ?? []), c2]); }
  const tekeningVan: Record<string, string> = Object.fromEntries(DELEN.map((dd) => [open(`${DIR}/${dd.f}`).name, dd.nr]));
  const rijen = [...groepen.entries()].map(([naam, cs], i) => {
    const doc2 = cs[0].part as Document;
    const mat = (doc2.material?.name ?? '—');
    const nr = tekeningVan[doc2.name] ?? (/^M[\d,]+ x |DIN|zelftappend|cilinderkop/.test(naam) ? 'norm' : 'koop');
    return { pos: i + 1, naam, aantal: cs.length, mat, nr, ids: cs.map((x) => x.id) };
  });
  // ballonnen bij een zichtbaar punt van het eerste exemplaar
  const bodies = modelBodies(doc);
  const fr = viewFrame('isometric');
  const anchors = visibleAnchors(bodies.map((x) => ({ id: x.id, geometry: x.geometry })), fr);
  const ankers = rijen.map((r) => anchors.get(r.ids[0]) ?? anchors.get(r.ids.find((id) => anchors.has(id)) ?? '') ?? [0, 0]).map((a) => T.to(a));
  const lay = layoutBalloons(ankers, { x: T.x0 - 6, y: T.y0 - 6, w: T.x1 - T.x0 + 12, h: T.y1 - T.y0 + 12 }, 'square', { offset: 8, gap: 7.5 });
  lay.positions.forEach((p, i) => {
    b.lijn(ankers[i], p, 0.18); b.cirkel(ankers[i], 0.5, 0.5);
    b.el.push(`<circle cx="${p[0].toFixed(2)}" cy="${(H - p[1]).toFixed(2)}" r="3.2" fill="#fff" stroke="#111" stroke-width="0.35"/>`);
    b.tekst([p[0], p[1] - 1.1], String(rijen[i].pos), 3, 'middle', { vet: true });
  });
  // stuklijst rechts
  const x0 = 285, kol = [x0, x0 + 9, x0 + 18, x0 + 78, x0 + 112];
  let y = 280;
  b.tekst([x0, y], 'Stuklijst', 3.4, 'start', { vet: true });
  y -= 5;
  const kop = ['Pos', 'Aant.', 'Benaming', 'Materiaal / type', 'Tek.'];
  kop.forEach((t, i) => b.tekst([kol[i], y], t, 2.3, 'start', { vet: true }));
  b.lijn([x0, y - 1.2], [x0 + 125, y - 1.2], 0.25);
  const h2 = Math.min(4.2, (y - 58) / rijen.length);
  for (const r of rijen) {
    y -= h2;
    const kort = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
    [String(r.pos), String(r.aantal), kort(r.naam, 34), kort(r.mat, 20), r.nr].forEach((t, i) => b.tekst([kol[i], y], t, 2.1));
  }
  b.tekst([16, 280], 'Opengewerkte isometrie (schaal vrij)', 3.2, 'start', { vet: true });
  kader(b, { nr: 'AFZ-00', naam: 'Samenstelling afzuiging met voedingsbox en knop', materiaal: 'zie stuklijst', maken: 'Montage volgens het bouwschema', massa: '—', schaal: 'vrij', blad });
  return { svg: b.svg(), stuklijst: rijen.map((r) => [String(r.pos), String(r.aantal), r.naam, r.mat, r.nr]) };
}

/** samenstelling in doorsnede (vlak z = 0, van voren gezien): hoe alles in elkaar zit */
function doorsnedeBlad(blad: string): string {
  const asm = open(`${DIR}/Afzuiging.kcad`) as Document & { components: Component[] };
  const doc = { ...asm, components: asm.components.filter((c) => !/^a(7|8|12|14|15|dk\d|dn\d|sd\d|sk\d|sdk\d|su\d)$/.test(c.id) && !/^a2\d|^as25|^as2\d$|^asa\d$|^asbd?\d$/.test(c.id)) } as Document;
  const sec = { parentId: 't', parentType: 'top' as DrawingViewType, axis: 'h' as const, at: 0, flip: true, label: 'B', autoHatch: true };
  const alles = sectionGeometry(doc, sec);
  const koop = /^(a5|af\d|a10|a18|a19|as\d.*)$/;
  const eigen = sectionGeometry({ ...doc, components: (doc as Document & { components: Component[] }).components.filter((c) => !koop.test(c.id)) } as Document, sec);
  const g: ViewGeo = { ...alles, hatch: eigen.hatch, hatchVar: eigen.hatchVar };
  const b = new Blad();
  const s = 1;
  const T = teken(b, g, s, [175, 165]);
  b.maatH(T.x0, T.x1, T.y1, T.y1 + 10, getal(g.max[0] - g.min[0]));
  b.maatV(T.y0, T.y1, T.x0, T.x0 - 10, getal(g.max[1] - g.min[1]));
  // het blad (34 mm) als dunne lijnen ter oriëntatie
  const yb = T.to([0, 0])[1], yo = T.to([0, -m.blad])[1];
  for (const [x1, x2] of [[T.x0 - 30, T.to([-m.uitsparing.b / 2, 0])[0]], [T.to([m.uitsparing.b / 2, 0])[0], T.x1 + 30]]) {
    b.lijn([x1, yb], [x2, yb], 0.25, 'stroke-dasharray="3 1.5"'); b.lijn([x1, yo], [x2, yo], 0.25, 'stroke-dasharray="3 1.5"');
  }
  b.tekst([T.x0 - 28, yb + 2], 'blad 34 mm', 2.6);
  b.maatV(yo, T.y0, T.x1, T.x1 + 10, getal(-m.blad - (m.romp.onder - m.uitblaas.dikte)));
  b.tekst([T.x1 + 13, (yo + T.y0) / 2 - 18], 'onder het blad', 2.4, 'start', { hoek: 90 });
  b.tekst([150, T.y1 + 18], 'Doorsnede B-B door het midden (van voren gezien)', 3.4, 'middle', { vet: true });
  const regels = [
    'Van boven naar onder:',
    '1  RVS-plaat met LB-rooster op het bovenframe (magneten)',
    '2  bovenframe met de koppen van de M5-schroeven',
    '3  filtercassette met één standaardmat Rittal SK 3171.100 (173 x 173 x 17)',
    '4  instroomplaat met trechter boven de waaier',
    '5  radiale ventilator San Ace C175',
    '6  bodemplaat met lamellen, M4 en M3 verzonken',
    'Klauwen in de vier hoeken klemmen onder het blad.',
  ];
  let ty = 120;
  regels.push('Koopdelen (ventilator, filters) niet gearceerd.');
  for (const r of regels) { b.tekst([312, ty], r, 2.7); ty -= 5.5; }
  kader(b, { nr: 'AFZ-00', naam: 'Samenstelling in doorsnede', materiaal: 'zie stuklijst', maken: 'Montage volgens het bouwschema', massa: '—', schaal: '1:1', blad });
  return b.svg();
}

describe('tekeningen', () => {
  it.skipIf(!process.env.AFZUIGING_TEKENINGEN)('werktekeningen, samenstelling en tafelblad', () => {
    mkdirSync(UIT, { recursive: true });
    const totaal = DELEN.length + 3;
    const sam = samenstellingBlad(`1 / ${totaal}`);
    writeFileSync(`${UIT}/AFZ-00-samenstelling.svg`, sam.svg);
    writeFileSync(`${UIT}/AFZ-00-doorsnede.svg`, doorsnedeBlad(`2 / ${totaal}`));
    const csv = (v: string) => (/[;"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const regels = [['Pos', 'Aantal', 'Benaming', 'Materiaal / type', 'Tekening'], ...sam.stuklijst].map((r) => r.map(csv).join(';'));
    writeFileSync(`${UIT}/stuklijst.csv`, `﻿${regels.join('\r\n')}\r\n`); // met BOM en CRLF: Excel opent het meteen goed
    DELEN.forEach((d, i) => writeFileSync(`${UIT}/${d.nr}-${d.naam.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}.svg`, onderdeelBlad(d, `${i + 3} / ${totaal}`)));
    writeFileSync(`${UIT}/AFZ-20-tafelblad.svg`, tafelbladBlad(`${totaal} / ${totaal}`));
    expect(sam.stuklijst.length).toBeGreaterThan(20);
  }, 1800000);
});
