/**
 * Gedeelde hulp voor werktekeningen volgens de Europese normen: A3 liggend met kader, centreermerken en rasterverwijzing
 * (ISO 5457), titelblok met de velden van ISO 7200, Europese projectie met symbool (ISO 5456-2, eerste hoek), lijnen
 * volgens ISO 128 (zichtbare omtrek 0,35, maat- en hulplijnen 0,18, hartlijnen streep-punt 0,13), maten in mm volgens
 * ISO 129-1, algemene toleranties ISO 2768-m, letters volgens ISO 3098 (Arial). Aanzichten uit de tekenmodule (HLR) met
 * hartlijnen en arcering, en een werktekening per onderdeel. Gebruikt door tekeningenAfzuiging en tekeningenTrein.
 */
import { readFileSync } from 'node:fs';
import type * as THREE from 'three';
import { parseDocument } from '../core/document/persistence';
import type { Document, DrawingViewType } from '../core/document/types';
import { projectedView, sectionGeometry, type ViewGeo } from '../core/drawing/sheet';
import { hatchLines } from '../core/drawing/export2d';
import { rebuildDocument } from './rebuildStreng';
import { meshVolume } from '../core/features/solid';

export const W = 420, H = 297; // A3 liggend
export type P = [number, number];
/** project, datum van uitgifte en revisie in het titelblok (ISO 7200) */
export interface Project { naam: string; datum: string; revisie?: string; eigenaar?: string; goedgekeurd?: string }
export const open = (f: string): Document => parseDocument(readFileSync(f, 'utf8'));
export const getal = (v: number, dec = 1) => (Math.round(v * 10 ** dec) / 10 ** dec).toString().replace('.', ',');
export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** één blad: alles in mm met y omhoog; svg() zet het om (y omlaag) */
export class Blad {
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

/** het kader (ISO 5457): archiefrand 20 mm links, 10 mm rondom, centreermerken en rasterverwijzing 1..8 / A..F */
export const KADER = { x0: 20, y0: 10, x1: W - 10, y1: H - 10 };
export function iso5457(b: Blad) {
  const k = KADER;
  b.rect(k.x0, k.y0, k.x1 - k.x0, k.y1 - k.y0, 0.7);
  // centreermerken: midden van elke zijde, van de bladrand tot 5 mm in het tekenvlak
  b.lijn([W / 2, 0], [W / 2, k.y0 + 5], 0.7); b.lijn([W / 2, H], [W / 2, k.y1 - 5], 0.7);
  b.lijn([0, H / 2], [k.x0 + 5, H / 2], 0.7); b.lijn([W, H / 2], [k.x1 - 5, H / 2], 0.7);
  // rasterverwijzing: velden van 50 mm vanaf de centreermerken, cijfers van links naar rechts, letters van boven naar onder
  const nx = 8, ny = 6;
  for (let i = 1; i < nx; i++) { const x = W / 2 + (i - nx / 2) * 50; b.lijn([x, k.y0 - 5], [x, k.y0], 0.35); b.lijn([x, k.y1], [x, k.y1 + 5], 0.35); }
  for (let j = 1; j < ny; j++) { const y = H / 2 + (j - ny / 2) * 50; b.lijn([k.x0 - 5, y], [k.x0, y], 0.35); b.lijn([k.x1, y], [k.x1 + 5, y], 0.35); }
  for (let i = 0; i < nx; i++) {
    const xa = Math.max(k.x0, W / 2 + (i - nx / 2) * 50), xb = Math.min(k.x1, W / 2 + (i + 1 - nx / 2) * 50);
    b.tekst([(xa + xb) / 2, k.y0 - 4], String(i + 1), 2.5, 'middle'); b.tekst([(xa + xb) / 2, k.y1 + 2], String(i + 1), 2.5, 'middle');
  }
  for (let j = 0; j < ny; j++) {
    const ya = Math.max(k.y0, H / 2 + (j - ny / 2) * 50), yb = Math.min(k.y1, H / 2 + (j + 1 - ny / 2) * 50);
    const letter = 'FEDCBA'[j]; // A bovenaan
    b.tekst([k.x0 - 2.5, (ya + yb) / 2 - 1], letter, 2.5, 'middle'); b.tekst([k.x1 + 2.5, (ya + yb) / 2 - 1], letter, 2.5, 'middle');
  }
}

/** projectiesymbool Europese projectie (ISO 5456-2, eerste hoek): afgeknotte kegel links, cirkels rechts */
export function projectieSymbool(b: Blad, sx: number, sy: number) {
  b.lijn([sx, sy - 3], [sx + 9, sy - 1.5], 0.3); b.lijn([sx, sy + 3], [sx + 9, sy + 1.5], 0.3); b.lijn([sx, sy - 3], [sx, sy + 3], 0.3); b.lijn([sx + 9, sy - 1.5], [sx + 9, sy + 1.5], 0.3);
  b.lijn([sx - 1.5, sy], [sx + 10.5, sy], 0.13, 'stroke-dasharray="3 0.8 0.6 0.8"');
  b.cirkel([sx + 17, sy], 3, 0.3); b.cirkel([sx + 17, sy], 1.5, 0.3);
}

export interface Titel { nr: string; naam: string; materiaal: string; maken: string; massa: string; schaal: string; blad: string; soort?: string }
/**
 * kader en titelblok rechtsonder, 180 x 40 mm met de velden van ISO 7200: eigenaar, project, titel, documentsoort,
 * tekeningnummer, revisie, datum van uitgifte, taal, schaal, blad, opgesteld door, goedgekeurd door, massa, toleranties en
 * het projectiesymbool
 */
export function kader(b: Blad, t: Titel, project: Project) {
  iso5457(b);
  const x0 = KADER.x1 - 180, y0 = KADER.y0, rh = 8;
  b.rect(x0, y0, 180, rh * 5, 0.5);
  for (let n = 1; n < 5; n++) b.lijn([x0, y0 + rh * n], [x0 + 180, y0 + rh * n], 0.25);
  const veld = (xa: number, rij: number, label: string, waarde: string, h2 = 2.6, vet = false) => {
    const y = y0 + rh * rij;
    if (xa > x0) b.lijn([xa, y], [xa, y + rh], 0.25);
    b.tekst([xa + 1.2, y + rh - 2.2], label, 1.7, 'start', { kleur: '#555' });
    b.tekst([xa + 1.2, y + 1.6], waarde, h2, 'start', { vet });
  };
  const X = (d: number) => x0 + d;
  veld(X(0), 4, 'Eigenaar', `Phlippo CAD · ${project.eigenaar ?? 'Ian'}`, 2.6);
  veld(X(70), 4, 'Project', project.naam, 2.8, true);
  veld(X(0), 3, 'Titel', t.naam, 3.2, true);
  veld(X(120), 3, 'Documentsoort', t.soort ?? 'Werktekening', 2.6);
  veld(X(0), 2, 'Materiaal', t.materiaal, 2.4);
  veld(X(70), 2, 'Maken', t.maken, 2.2);
  veld(X(0), 1, 'Tekeningnummer', t.nr, 3.2, true);
  veld(X(60), 1, 'Rev.', project.revisie ?? '0', 2.6);
  veld(X(75), 1, 'Uitgifte', project.datum, 2.4);
  veld(X(105), 1, 'Taal', 'nl', 2.6);
  veld(X(120), 1, 'Schaal', t.schaal, 2.6);
  veld(X(150), 1, 'Blad', t.blad, 2.6);
  veld(X(0), 0, 'Opgesteld', 'Phlippo CAD', 2.3);
  veld(X(35), 0, 'Goedgekeurd', project.goedgekeurd ?? 'Ian', 2.3);
  veld(X(60), 0, 'Massa', t.massa, 2.3);
  veld(X(105), 0, 'Maten en toleranties', 'mm · ISO 2768-m', 2.3);
  b.lijn([X(150), y0], [X(150), y0 + rh], 0.25);
  projectieSymbool(b, X(154), y0 + 4.4);
}

/** smal titelblok (112 x 48 mm) met dezelfde velden van ISO 7200, voor een blad dat op ware grootte bijna vol staat (boormal) */
export function kaderSmal(b: Blad, t: Omit<Titel, 'massa' | 'materiaal' | 'maken'>, project: Project) {
  iso5457(b);
  const x0 = KADER.x1 - 112, y0 = KADER.y0, rh = 8, w = 112;
  b.rect(x0, y0, w, rh * 6, 0.5);
  for (let n = 1; n < 6; n++) b.lijn([x0, y0 + rh * n], [x0 + w, y0 + rh * n], 0.25);
  const veld = (xa: number, rij: number, label: string, waarde: string, h2 = 2.6, vet = false) => {
    const y = y0 + rh * rij;
    if (xa > x0) b.lijn([xa, y], [xa, y + rh], 0.25);
    b.tekst([xa + 1.2, y + rh - 2.2], label, 1.7, 'start', { kleur: '#555' });
    b.tekst([xa + 1.2, y + 1.6], waarde, h2, 'start', { vet });
  };
  const X = (d: number) => x0 + d;
  veld(X(0), 5, 'Eigenaar', `Phlippo CAD · ${project.eigenaar ?? 'Ian'}`, 2.4);
  veld(X(56), 5, 'Project', project.naam, 2.4, true);
  veld(X(0), 4, 'Titel', t.naam, 3, true);
  veld(X(0), 3, 'Documentsoort', t.soort ?? 'Werktekening', 2.4);
  veld(X(56), 3, 'Taal', 'nl', 2.4);
  veld(X(76), 3, 'Schaal', t.schaal, 2.4);
  veld(X(0), 2, 'Tekeningnummer', t.nr, 3, true);
  veld(X(40), 2, 'Rev.', project.revisie ?? '0', 2.4);
  veld(X(56), 2, 'Uitgifte', project.datum, 2.4);
  veld(X(86), 2, 'Blad', t.blad, 2.4);
  veld(X(0), 1, 'Opgesteld', 'Phlippo CAD', 2.3);
  veld(X(40), 1, 'Goedgekeurd', project.goedgekeurd ?? 'Ian', 2.3);
  veld(X(76), 1, 'Maten', 'mm', 2.3);
  veld(X(0), 0, 'Normen', 'ISO 5457 · ISO 7200 · ISO 128 · ISO 129-1', 2.1);
}

/** een aanzicht op het blad: lijnen, cirkels met hartlijnen, arcering; geeft het kader op het blad terug */
export type Rechthoek = { x0: number; y0: number; x1: number; y1: number };
/** het deel van a-b binnen de rechthoek (Liang-Barsky), of null */
export function knip(a: P, b: P, k: Rechthoek): [P, P] | null {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  for (const [p, q] of [[-dx, a[0] - k.x0], [dx, k.x1 - a[0]], [-dy, a[1] - k.y0], [dy, k.y1 - a[1]]]) {
    if (Math.abs(p) < 1e-12) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return null; if (t > t0) t0 = t; } else { if (t < t0) return null; if (t < t1) t1 = t; }
  }
  return [[a[0] + t0 * dx, a[1] + t0 * dy], [a[0] + t1 * dx, a[1] + t1 * dy]];
}

export function teken(b: Blad, g: ViewGeo, s: number, c: P, opts: { hartlijnen?: boolean; mid?: P; knip?: Rechthoek } = {}) {
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

export const SCHALEN: [number, number][] = [[5, 1], [2, 1], [1, 1], [1, 2], [1, 5], [1, 10]];
export const schaalTekst = ([a, c]: [number, number]) => `${a}:${c}`.replace(".", ",");

export interface Deel {
  f: string; nr: string; naam: string; materiaal: string; maken: string;
  snede?: boolean; aanzichten?: DrawingViewType[]; maten: string[]; dichtheid: number;
  /** vaste schaal (anders de grootste uit SCHALEN die past) */
  schaal?: [number, number];
}

/** werktekening van één onderdeel: vooraanzicht (of doorsnede A-A), bovenaanzicht eronder, linkeraanzicht rechts, isometrie en maattabel */
export function onderdeelBlad(d: Deel, blad: string, dir: string, project: Project): string {
  const model = open(`${dir}/${d.f}`);
  const sec = { parentId: 't', parentType: 'top' as DrawingViewType, axis: 'h' as const, at: 0, flip: true, label: 'A' };
  const voor = d.snede ? sectionGeometry(model, sec) : projectedView(model, 'front');
  const boven = projectedView(model, 'top'), links = projectedView(model, 'left');
  const iso = projectedView(model, 'isometric');
  const w = (g: ViewGeo) => g.max[0] - g.min[0], h = (g: ViewGeo) => g.max[1] - g.min[1];
  // grootste schaal waarbij de drie aanzichten (met 30 mm voor maten) in 255 x 230 mm passen
  const schaal = d.schaal ?? SCHALEN.find(([a, c]) => { const k = a / c; return (w(voor) + w(links)) * k + 52 <= 266 && (h(voor) + h(boven)) * k + 50 <= 255; }) ?? SCHALEN[SCHALEN.length - 1];
  const s = schaal[0] / schaal[1];
  const b = new Blad();
  const gx = 24, gy = 287 - 6; // linkerbovenhoek van het gebied voor de aanzichten (binnen het kader, ISO 5457)
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
  kader(b, { nr: d.nr, naam: d.naam, materiaal: d.materiaal, maken: d.maken, massa: `${getal(massa, 0)} g (massief)`, schaal: schaalTekst(schaal), blad }, project);
  return b.svg();
}

