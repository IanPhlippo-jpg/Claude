/**
 * A fitness machine of bibliotheek/fitness as a Phlippo CAD part for the fabrication oracle tests (docs/36 LF5, PP8):
 * every steel piece of the generator's model (`toestel(id).delen`) one body, drawn as it is built: a tube hollow with
 * its wall, a plate with its holes, a contour plate with true arcs, a triangle as a triangle. The generator itself draws
 * boxes for its 3D view only; no .kcad of a machine exists. Not supported, and refused with a message: mitres, bent
 * tubes, holes in tubes, slots and folded plates (the tests pick machines without them).
 */
// @ts-expect-error: the sketch helpers are plain JavaScript
import { Onderdeel, vlak, opVlak } from '../../voorbeelden/lib/schets.mjs';
import { parseDocument } from '../core/document/persistence';
import type { Document } from '../core/document/types';

type V3 = [number, number, number];
/* eslint-disable @typescript-eslint/no-explicit-any */
type Deel = any;
type Schets = { lusW(p: V3[]): Schets; cirkelW(c: V3, r: number): Schets; pad(items: unknown[]): Schets; plane: { u: V3; v: V3; n: V3; origin: V3 } };

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const axis = (i: number): V3 => [0, 1, 2].map((k) => (k === i ? 1 : 0)) as V3;
export const STAAL = { name: 'S235JR', density: 7850, color: '#24272a' };

/** a closed loop of segments { x, y, bulge } (bibliotheek/fitness/vorm.mjs afronden) in the plane, with true arcs */
function bulgeLoop(s: Schets, segs: { x: number; y: number; bulge: number }[], to3: (x: number, y: number) => V3) {
  const p2 = (x: number, y: number) => opVlak(s.plane, to3(x, y)) as [number, number];
  // the map local -> sketch may mirror: then an arc turning left in the plate turns right in the sketch
  const [o, ex, ey] = [p2(0, 0), p2(1, 0), p2(0, 1)];
  const mirror = (ex[0] - o[0]) * (ey[1] - o[1]) - (ex[1] - o[1]) * (ey[0] - o[0]) < 0;
  const items: unknown[] = [p2(segs[0].x, segs[0].y)];
  segs.forEach((a, i) => {
    const b = segs[(i + 1) % segs.length], q = p2(b.x, b.y);
    if (!a.bulge) { items.push(q); return; }
    // the centre of the arc from a to b with bulge tan(θ/4): on the perpendicular of the chord
    const th = 4 * Math.atan(a.bulge), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, c = Math.hypot(dx, dy);
    const h = c / 2 / Math.tan(th / 2), cx = mx - (dy / c) * h, cy = my + (dx / c) * h;
    items.push({ boog: p2(cx, cy), naar: q, ccw: (a.bulge > 0) !== mirror });
  });
  s.pad(items);
}

/** one tube, bar or strip of the generator from a to b: the section from its profile, hollow where the profile is */
function staaf(ond: any, d: Deel, i: number) {
  if (d.buig || d.pad) throw new Error(`${d.naam}: een gebogen buis wordt niet getekend`);
  if ((d.verstek ?? [0, 0]).some((x: number) => Math.abs(x) > 0.05)) throw new Error(`${d.naam}: een verstek wordt niet getekend`);
  if (d.gaten.length) throw new Error(`${d.naam}: gaten in een staaf worden niet getekend`);
  const g = d.geo[0], P = d.P;
  const plane = vlak(`f${i}`, `Plane ${d.naam} ${d.id}`, d.a, d.u, 'reference');
  const rect = (bw: number, bh: number): V3[] => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => add(add(d.a, mul(g.v, (p * bw) / 2)), mul(g.w, (q * bh) / 2)));
  ond.schets(plane, (s: Schets) => {
    if (P.vorm === 'koker') s.lusW(rect(g.bw, g.bh)).lusW(rect(g.bw - 2 * P.t, g.bh - 2 * P.t));
    else if (P.vorm === 'buis') s.cirkelW(d.a, P.b / 2).cirkelW(d.a, P.b / 2 - P.t);
    else if (P.vorm === 'rond') s.cirkelW(d.a, P.b / 2);
    else if (P.vorm === 'strip') s.lusW(rect(g.bw, g.bh));
    else throw new Error(`${d.naam}: profielvorm ${P.vorm} wordt niet getekend`);
  });
  ond.extrude('boss', d.L, { naam: d.naam });
}

/** one laser plate: a box with its holes, a triangle, a disc, or a free contour with arcs and cut-outs */
function plaat(ond: any, d: Deel, i: number) {
  if (d.vorm === 'gezet') throw new Error(`${d.naam}: een gezette plaat wordt niet getekend`);
  if (d.gaten.some((g: any) => g.sleuf)) throw new Error(`${d.naam}: een sleufgat wordt niet getekend`);
  if (d.contour) {
    const c = d.contour, P3 = (x: number, y: number): V3 => add(add(add(c.o, mul(c.ex, x)), mul(c.ey, y)), mul(c.n, -c.t / 2));
    ond.schets(vlak(`f${i}`, `Plane ${d.naam} ${d.id}`, P3(0, 0), c.n, 'reference'), (s: Schets) => {
      bulgeLoop(s, c.segmenten, P3);
      for (const u of c.uitsparingen) bulgeLoop(s, u.segmenten, P3);
      for (const h of d.gaten) s.cirkelW(h.p, h.d / 2);
    });
    ond.extrude('boss', c.t, { naam: d.naam });
    return;
  }
  const { t: ti, b: bi, l: li } = d.as, at = (l: number, b: number): V3 => { const p = [0, 0, 0] as V3; p[ti] = d.mn[ti]; p[li] = l; p[bi] = b; return p; };
  const [l0, l1, b0, b1] = [d.mn[li], d.mx[li], d.mn[bi], d.mx[bi]];
  ond.schets(vlak(`f${i}`, `Plane ${d.naam} ${d.id}`, at(l0, b0), axis(ti), 'reference'), (s: Schets) => {
    if (d.rond) s.cirkelW(at((l0 + l1) / 2, (b0 + b1) / 2), (l1 - l0) / 2);
    // the triangle of bibliotheek/fitness/dxf.mjs plaatDxf: (0, 0), (l, 0), (0, b)
    else if (d.vorm === 'driehoek') s.lusW([at(l0, b0), at(l1, b0), at(l0, b1)]);
    else s.lusW([at(l0, b0), at(l1, b0), at(l1, b1), at(l0, b1)]);
    for (const h of d.gaten) s.cirkelW(h.p, h.d / 2);
  });
  ond.extrude('boss', d.mx[ti] - d.mn[ti], { naam: d.naam });
}

/** the machine as one part, a body per piece; `alleen: 'laser'` keeps the laser plates only (PP8) */
export function fitnessDocument(o: any, naam: string, opts: { alleen?: 'laser' } = {}): Document {
  const ond = new Onderdeel(naam, STAAL);
  let i = 0;
  for (const d of o.delen) {
    if (d.deelVan || (opts.alleen === 'laser' && (d.soort !== 'plaat' || d.laser === false))) continue;
    if (d.soort === 'staaf') staaf(ond, d, ++i);
    else if (d.soort === 'plaat') plaat(ond, d, ++i);
  }
  for (const g of o.gezet ?? []) if (!opts.alleen || g.laser) throw new Error(`${g.naam}: een gezette plaat wordt niet getekend`);
  return parseDocument(JSON.stringify({ ...ond.doc(), kind: 'part' }));
}
