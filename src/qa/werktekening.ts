/**
 * Gedeelde hulp voor werktekeningen (A3 liggend, Europese projectie): een blad in mm, het titelblok, aanzichten uit de
 * tekenmodule (HLR) met hartlijnen en arcering, en een werktekening per onderdeel. Gebruikt door tekeningenAfzuiging en
 * tekeningenTrein.
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
/** project en datum in het titelblok */
export interface Project { naam: string; datum: string }
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

/** kader, projectiesymbool en titelblok */
export function kader(b: Blad, t: { nr: string; naam: string; materiaal: string; maken: string; massa: string; schaal: string; blad: string }, project: Project) {
  b.rect(10, 10, W - 20, H - 20, 0.7);
  const x0 = W - 10 - 190, y0 = 10, h = 40;
  b.rect(x0, y0, 190, h, 0.5);
  const kol = [x0, x0 + 95, x0 + 140, x0 + 190], rij = [y0, y0 + 10, y0 + 20, y0 + 30, y0 + 40];
  for (const y of rij.slice(1, 4)) b.lijn([x0, y], [x0 + 190, y], 0.25);
  b.lijn([kol[1], y0], [kol[1], y0 + h], 0.25); b.lijn([kol[2], y0], [kol[2], y0 + 30], 0.25);
  const veld = (x: number, y: number, label: string, waarde: string, h2 = 3.2, vet = false) => { b.tekst([x + 1.5, y + 7.3], label, 1.8, 'start', { kleur: '#666' }); b.tekst([x + 1.5, y + 2.8], waarde, h2, 'start', { vet }); };
  veld(kol[0], rij[3], 'Project', project.naam, 3.4, true);
  veld(kol[1], rij[3], 'Benaming', t.naam, 3.4, true);
  veld(kol[0], rij[2], 'Materiaal', t.materiaal);
  veld(kol[0], rij[1], 'Maken', t.maken, 2.6);
  veld(kol[0], rij[0], 'Getekend', `Phlippo CAD · ${project.datum}`);
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
  const schaal = d.schaal ?? SCHALEN.find(([a, c]) => { const k = a / c; return (w(voor) + w(links)) * k + 52 <= 276 && (h(voor) + h(boven)) * k + 50 <= 255; }) ?? SCHALEN[SCHALEN.length - 1];
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
  kader(b, { nr: d.nr, naam: d.naam, materiaal: d.materiaal, maken: d.maken, massa: `${getal(massa, 0)} g (massief)`, schaal: schaalTekst(schaal), blad }, project);
  return b.svg();
}

