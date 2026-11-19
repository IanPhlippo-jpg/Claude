/**
 * Flat parts for the laser (docs/36 P-1, P-2, 4.3): the outline of a plate or of the flat pattern of a sheet metal part
 * as closed loops of lines and true arcs (bulge segments), holes as circles (W5: the mesh is a polygon, the arcs are
 * found back with a circle fit within 0.005 mm), bend lines, and the plate data (bounding rectangle, net area, cut
 * length, pierces, weight).
 *
 * Reliability (W4, P1.4): the flat pattern of the model unfolds cuts and holes only when every bend comes from the
 * base flange; otherwise the core falls back to the developed strip of the sketch chain, without the cuts in the
 * flanges. Every flat pattern is therefore checked: area x thickness against the folded volume (0.5 %) and the number
 * of through holes (genus) of the folded body against the holes of the flat. A flat that fails is 'geen': an error on
 * the part, no DXF.
 */
import type { Document, Feature } from '../core/document/types';
import { rebuildDocument } from '../core/features/rebuild';
import type { FabBody } from './bodies';
import { chain, frameOf, minRect, section, soup, triCount, volume, type P2, type V3 } from './geom';
import { plateAnalysis } from './recognize';
import { din6935K } from './bend';

/** a loop segment from `a` to the next segment's `a`; bulge = tan(sweep / 4), > 0 counter-clockwise */
export interface Seg { a: P2; bulge: number }
export type Loop = Seg[];
export interface Bend { a: P2; b: P2; hoek: number; r: number; richting: 'op' | 'neer'; k: number }

export interface FlatPart {
  key: string;
  naam: string;
  n: number;
  materiaal: string;
  t: number;
  dichtheid: number;
  buiten: Loop;
  binnen: Loop[];
  gaten: { c: P2; r: number }[];
  plooien: Bend[];
  bbox: { l: number; b: number; draai: number };
  oppervlak: number;
  snijlengte: { buiten: number; binnen: number };
  insteken: number;
  kg: number;
  betrouwbaar: 'exact' | 'benaderd' | 'geen';
  fout?: string;
  /** which K-factor the flat used (sheet metal) */
  kBron?: string;
}

// ---- loops with arcs

export const segSweep = (s: Seg) => 4 * Math.atan(s.bulge);
/** length of a segment from a to b */
export function segLength(a: P2, b: P2, bulge: number): number {
  const c = Math.hypot(b.x - a.x, b.y - a.y);
  if (Math.abs(bulge) < 1e-12) return c;
  const th = Math.abs(4 * Math.atan(bulge));
  return (c / (2 * Math.sin(th / 2))) * th;
}
export const loopLen = (l: Loop) => l.reduce((s, sg, i) => s + segLength(sg.a, l[(i + 1) % l.length].a, sg.bulge), 0);
/** signed area of a loop of lines and arcs (counter-clockwise positive) */
export function loopAreaB(l: Loop): number {
  let A = 0;
  l.forEach((sg, i) => {
    const b = l[(i + 1) % l.length].a;
    A += (sg.a.x * b.y - b.x * sg.a.y) / 2;
    if (Math.abs(sg.bulge) > 1e-12) {
      const th = 4 * Math.atan(sg.bulge);
      const c = Math.hypot(b.x - sg.a.x, b.y - sg.a.y), r = c / (2 * Math.sin(Math.abs(th) / 2));
      A += (r * r / 2) * (th - Math.sin(th));
    }
  });
  return A;
}

/** the circle through three points */
export function circle3(a: P2, b: P2, c: P2): { c: P2; r: number } | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-12) return null;
  const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  const x = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d, y = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  return { c: { x, y }, r: Math.hypot(a.x - x, a.y - y) };
}

const turn = (a: P2, b: P2, c: P2) => Math.atan2((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x), (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y));

/**
 * Lines and arcs from a polygon whose arcs are chords (W5): runs of at least three short segments that turn the same
 * way by less than 30 degrees each and lie on one circle within `tol` become one arc. A loop that is one circle is
 * returned as such.
 */
export function fitArcs(pts0: P2[], tol = 0.005): { loop: Loop } | { circle: { c: P2; r: number } } {
  const n = pts0.length;
  if (n >= 8) {
    const c = circle3(pts0[0], pts0[Math.floor(n / 3)], pts0[Math.floor((2 * n) / 3)]);
    if (c && pts0.every((p) => Math.abs(Math.hypot(p.x - c.c.x, p.y - c.c.y) - c.r) <= tol)) return { circle: c };
  }
  // start after the longest segment (a line, or the joint of two arcs), so no arc is cut in two
  let start = 0, best = -1;
  pts0.forEach((p, i) => { const q = pts0[(i + 1) % n]; const l = Math.hypot(q.x - p.x, q.y - p.y); if (l > best) { best = l; start = (i + 1) % n; } });
  const pts = [...pts0.slice(start), ...pts0.slice(0, start)];
  const at = (i: number) => pts[i % n];
  const loop: Loop = [];
  let i = 0;
  while (i < n) {
    let j = i + 3, okJ = -1, okC: { c: P2; r: number } | null = null;
    const sgn = Math.sign(turn(at(i), at(i + 1), at(i + 2)));
    while (j <= n) {
      const c = circle3(at(i), at(Math.floor((i + j) / 2)), at(j));
      if (!c) break;
      let good = true;
      for (let k = i; k <= j && good; k++) if (Math.abs(Math.hypot(at(k).x - c.c.x, at(k).y - c.c.y) - c.r) > tol) good = false;
      for (let k = i + 1; k < j && good; k++) { const tr = turn(at(k - 1), at(k), at(k + 1)); if (Math.sign(tr) !== sgn || Math.abs(tr) > Math.PI / 6) good = false; }
      if (!good) break;
      okJ = j; okC = c;
      j++;
    }
    if (okJ > 0 && okC) {
      let sweep = 0;
      for (let k = i; k < okJ; k++) {
        const a0 = Math.atan2(at(k).y - okC.c.y, at(k).x - okC.c.x), a1 = Math.atan2(at(k + 1).y - okC.c.y, at(k + 1).x - okC.c.x);
        let dA = a1 - a0;
        while (dA > Math.PI) dA -= 2 * Math.PI;
        while (dA < -Math.PI) dA += 2 * Math.PI;
        sweep += dA;
      }
      loop.push({ a: at(i), bulge: Math.tan(sweep / 4) });
      i = okJ;
    } else {
      loop.push({ a: at(i), bulge: 0 });
      i++;
    }
  }
  return { loop };
}

// ---- the outline of a plate

/** consecutive collinear points merged (a straight side wall cut by several triangles) */
function dropCollinear(l: P2[]): P2[] {
  let pts = l;
  for (let pass = 0; pass < 2; pass++) {
    const out: P2[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
      const cr = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      const lab = Math.hypot(b.x - a.x, b.y - a.y), lbc = Math.hypot(c.x - b.x, c.y - b.y);
      if (lab < 1e-6 || (Math.abs(cr) < 2e-4 * lab * lbc && (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y) > 0)) continue;
      out.push(b);
    }
    pts = out;
  }
  return pts;
}

export interface Outline { buiten: Loop; binnen: Loop[]; gaten: { c: P2; r: number }[]; u: V3; v: V3; origin: P2; rot: number }

/** outer loop, inner loops and round holes of a plate body (in its own frame, bounding rectangle along X from 0,0) */
export function plateOutline(s: Float64Array, n: V3, hi: number, thickness: number): Outline | { fout: string } {
  // the contour from the section at mid thickness: every side wall crosses it, so no top face triangle can be missed
  const { u, v } = frameOf(n);
  const sec = section(s, n, hi - thickness / 2, { u, v });
  const polys = chain(sec.segs, 1e-4).map(dropCollinear).filter((p) => p.length >= 3);
  const area = (p: P2[]) => p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + (q.x * r.y - r.x * q.y) / 2; }, 0);
  const outers = polys.filter((p) => area(p) > 0), inners = polys.filter((p) => area(p) < 0);
  if (outers.length !== 1) return { fout: outers.length ? `${outers.length} losse stukken in één vlak` : 'geen buitencontour' };
  const r = minRect(outers[0]);
  const cs = Math.cos(-r.angle), sn = Math.sin(-r.angle);
  const rot = (p: P2): P2 => ({ x: p.x * cs - p.y * sn, y: p.x * sn + p.y * cs });
  const all = [...outers[0], ...inners.flat()].map(rot);
  const x0 = Math.min(...all.map((p) => p.x)), y0 = Math.min(...all.map((p) => p.y));
  const place = (p: P2): P2 => { const q = rot(p); return { x: q.x - x0, y: q.y - y0 }; };
  const fit = (p: P2[]) => fitArcs(p.map(place));
  const o = fit(outers[0]);
  const buiten: Loop = 'loop' in o ? o.loop : circleLoop(o.circle);
  const binnen: Loop[] = [], gaten: { c: P2; r: number }[] = [];
  for (const h of inners) {
    const f = fit(h);
    if ('circle' in f) gaten.push(f.circle); else binnen.push(f.loop);
  }
  return { buiten, binnen, gaten, u, v, origin: { x: x0, y: y0 }, rot: -r.angle };
}

/** a full circle as two half arcs (counter-clockwise) */
export const circleLoop = (c: { c: P2; r: number }): Loop => [{ a: { x: c.c.x + c.r, y: c.c.y }, bulge: 1 }, { a: { x: c.c.x - c.r, y: c.c.y }, bulge: 1 }];

/** plate data from the loops (P-1) */
export function plateData(buiten: Loop, binnen: Loop[], gaten: { c: P2; r: number }[], t: number, dichtheid: number) {
  const holesArea = binnen.reduce((s, l) => s + Math.abs(loopAreaB(l)), 0) + gaten.reduce((s, g) => s + Math.PI * g.r * g.r, 0);
  const oppervlak = Math.abs(loopAreaB(buiten)) - holesArea;
  const pts = buiten.map((s) => s.a);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  // arcs may bulge beyond their end points: sample them for the box
  buiten.forEach((sg, i) => { if (sg.bulge) for (const q of arcPoints(sg.a, buiten[(i + 1) % buiten.length].a, sg.bulge, 16)) { xs.push(q.x); ys.push(q.y); } });
  return {
    bbox: { l: Math.max(...xs) - Math.min(...xs), b: Math.max(...ys) - Math.min(...ys), draai: 0 },
    oppervlak,
    snijlengte: { buiten: loopLen(buiten), binnen: binnen.reduce((s, l) => s + loopLen(l), 0) + gaten.reduce((s, g) => s + 2 * Math.PI * g.r, 0) },
    insteken: 1 + binnen.length + gaten.length,
    kg: oppervlak * t * dichtheid * 1e-9,
  };
}

/** points along an arc segment (for drawing and for the nesting, which approximates arcs outward) */
export function arcPoints(a: P2, b: P2, bulge: number, steps: number): P2[] {
  const th = 4 * Math.atan(bulge);
  const c = Math.hypot(b.x - a.x, b.y - a.y), r = c / (2 * Math.sin(Math.abs(th) / 2));
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, h = Math.sqrt(Math.max(0, r * r - (c / 2) ** 2));
  const nx = -(b.y - a.y) / c, ny = (b.x - a.x) / c;
  const sgn = (bulge > 0 ? 1 : -1) * (Math.abs(th) > Math.PI ? -1 : 1);
  const cx = mx + sgn * nx * h, cy = my + sgn * ny * h;
  const a0 = Math.atan2(a.y - cy, a.x - cx);
  return Array.from({ length: steps + 1 }, (_, k) => ({ x: cx + r * Math.cos(a0 + (th * k) / steps), y: cy + r * Math.sin(a0 + (th * k) / steps) }));
}

// ---- through holes of a closed mesh (genus), the independent check of a flat pattern

/** genus of a closed triangle mesh: (2 - V + E - F) / 2 with vertices welded at 1 µm; null when the mesh is not closed */
export function genus(s: Float64Array): number | null {
  const key = (i: number) => `${Math.round(s[i] * 1000)},${Math.round(s[i + 1] * 1000)},${Math.round(s[i + 2] * 1000)}`;
  const vid = new Map<string, number>();
  const id = (i: number) => { const k = key(i); let x = vid.get(k); if (x === undefined) { x = vid.size; vid.set(k, x); } return x; };
  const edges = new Map<string, number>();
  let F = 0;
  for (let t = 0; t < triCount(s); t++) {
    const a = id(t * 9), b = id(t * 9 + 3), c = id(t * 9 + 6);
    if (a === b || b === c || a === c) continue;
    F++;
    for (const [p, q] of [[a, b], [b, c], [c, a]]) { const k = p < q ? `${p}_${q}` : `${q}_${p}`; edges.set(k, (edges.get(k) ?? 0) + 1); }
  }
  for (const n of edges.values()) if (n !== 2) return null;
  const chi = vid.size - edges.size + F;
  return (2 - chi) / 2;
}

// ---- flat parts of recognized bodies

/** bend features after which the core flat pattern is the developed chain (sheetMetalBuild.ts sets bentOnly = false) */
const NOT_FROM_BASE = new Set(['edgeFlange', 'hem', 'miterFlange', 'jog', 'sketchedBend', 'sweptFlange', 'loftedBend']);

/** a flat plate body (recognized plaat) */
export function flatOfPlate(b: FabBody, naam: string, n: number, materiaal: string): FlatPart {
  const pl = plateAnalysis(b);
  const empty = { key: b.key, naam, n, materiaal, t: 0, dichtheid: b.dichtheid, buiten: [], binnen: [], gaten: [], plooien: [], bbox: { l: 0, b: 0, draai: 0 }, oppervlak: 0,
    snijlengte: { buiten: 0, binnen: 0 }, insteken: 0, kg: 0 };
  if (!('t' in pl)) return { ...empty, betrouwbaar: 'geen', fout: pl.reason };
  const o = plateOutline(b.soup, pl.n, pl.hi, pl.t);
  if ('fout' in o) return { ...empty, t: pl.t, betrouwbaar: 'geen', fout: o.fout };
  const data = plateData(o.buiten, o.binnen, o.gaten, pl.t, b.dichtheid);
  const vol = volume(b.soup);
  const fout = Math.abs(data.oppervlak * pl.t - vol) > 0.005 * vol ? `oppervlak x dikte wijkt ${((100 * (data.oppervlak * pl.t - vol)) / vol).toFixed(2)} % af van het volume` : undefined;
  return { ...empty, t: pl.t, buiten: o.buiten, binnen: o.binnen, gaten: o.gaten, ...data, betrouwbaar: fout ? 'geen' : 'exact', fout };
}

/**
 * The flat pattern of a sheet metal part: the model's own Flat-Pattern (unsuppressed on a copy, added when the part
 * has none), with K from DIN 6935 or the model, checked against the folded body (volume and through holes).
 */
export function flatOfSheet(doc: Document, folded: FabBody, naam: string, n: number, materiaal: string, kBron: 'model' | 'din6935' = 'din6935'): FlatPart {
  const sm = doc.sheetMetal ?? { thickness: 3, bendRadius: 3, kFactor: 0.5 };
  const k = kBron === 'din6935' && (sm.allowanceType ?? 'kFactor') === 'kFactor' ? din6935K(sm.bendRadius, sm.thickness) : sm.kFactor;
  // W4: the core unfolds cuts and holes only when every bend comes from the base flange (sheetMetalBuild.ts bentOnly);
  // these features switch that off and the flat falls back to the developed sketch chain without the cut-outs
  const notFromBase = doc.features.filter((f) => !f.suppressed && NOT_FROM_BASE.has(f.type));
  const has = doc.features.some((f) => f.type === 'flatPattern');
  const features: Feature[] = has ? doc.features.map((f) => (f.type === 'flatPattern' ? { ...f, suppressed: false } : f)) : [...doc.features, { id: 'fab-flat', type: 'flatPattern',
    name: 'Flat-Pattern', suppressed: false } as Feature];
  const flatDoc: Document = { ...doc, sheetMetal: { ...sm, kFactor: k }, features };
  const r = rebuildDocument(flatDoc);
  const base = { key: folded.key, naam, n, materiaal, t: sm.thickness, dichtheid: folded.dichtheid, buiten: [], binnen: [], gaten: [], plooien: [], bbox: { l: 0, b: 0, draai: 0 }, oppervlak: 0,
    snijlengte: { buiten: 0, binnen: 0 }, insteken: 0, kg: 0, kBron: kBron === 'din6935' ? `DIN 6935, K = ${k.toFixed(3)}` : `model, K = ${k.toFixed(3)}` };
  const errs = Object.values(r.errors);
  if (errs.length || r.bodies.length !== 1) return { ...base, betrouwbaar: 'geen', fout: errs[0] ?? 'de uitslag gaf geen enkel lichaam' };
  const fb = { ...folded, soup: soup(r.bodies[0].geometry), faces: r.bodies[0].faces };
  const flat = flatOfPlate(fb, naam, n, materiaal);
  if (flat.betrouwbaar === 'geen') return { ...base, betrouwbaar: 'geen', fout: `uitslag: ${flat.fout}` };
  // the independent checks: the volume (the bend zones stretch, so not exact) and every hole of the folded part
  // the volume check runs on a flat with K = 0.5 (neutral line = mid surface, so area x t = folded volume exactly but
  // for the chords); with another K the flat is legitimately shorter or longer than the folded volume says
  let vFlat = flat.oppervlak * sm.thickness;
  if (Math.abs(k - 0.5) > 1e-9 || (sm.allowanceType ?? 'kFactor') !== 'kFactor') {
    const r5 = rebuildDocument({ ...flatDoc, sheetMetal: { ...sm, allowanceType: 'kFactor', kFactor: 0.5 } });
    const f5 = r5.bodies.length === 1 ? flatOfPlate({ ...folded, soup: soup(r5.bodies[0].geometry), faces: r5.bodies[0].faces }, naam, n, materiaal) : null;
    vFlat = f5 && f5.betrouwbaar !== 'geen' ? f5.oppervlak * sm.thickness : NaN;
  }
  const vFold = volume(folded.soup);
  const gFold = genus(folded.soup), holesFlat = flat.binnen.length + flat.gaten.length;
  let fout: string | undefined;
  if (notFromBase.length) fout = `${notFromBase.map((f) => f.name).join(', ')}: plooien die niet uit de basisflens komen; de uitslag van het model laat dan uitsparingen weg (docs/36 W4)`;
  else if (!Number.isFinite(vFlat) || Math.abs(vFlat - vFold) > 0.005 * vFold) fout = `het volume van de uitslag wijkt ${((100 * (vFlat - vFold)) / vFold).toFixed(2)} % af van het gezette stuk`;
  else if (gFold !== null && gFold !== holesFlat) fout = `het gezette stuk heeft ${gFold} gat${gFold === 1 ? '' : 'en'}, de uitslag ${holesFlat}: de uitslag mist uitsparingen (plooien die` +
    ` niet uit de basisflens komen)`;
  // bend lines (Flat-Pattern ▸ Bend-Lines) in the frame of the outline
  const pl = plateAnalysis(fb);
  const plooien: Bend[] = [];
  if ('t' in pl && !fout) {
    const o = plateOutline(fb.soup, pl.n, pl.hi, pl.t);
    if (!('fout' in o)) {
      const cs = Math.cos(o.rot), sn = Math.sin(o.rot);
      const to2 = (p: { x: number; y: number; z: number }): P2 => { const x = p.x * o.u[0] + p.y * o.u[1] + p.z * o.u[2],
        y = p.x * o.v[0] + p.y * o.v[1] + p.z * o.v[2]; return { x: x * cs - y * sn - o.origin.x, y: x * sn + y * cs - o.origin.y }; };
      for (const c of r.curves ?? []) if (c.name === 'Bend-Lines' && c.points.length >= 2) plooien.push({ a: to2(c.points[0]), b: to2(c.points[c.points.length - 1]), hoek: 90, r: sm.bendRadius,
        richting: 'op', k });
    }
  }
  return { ...flat, kBron: base.kBron, plooien, betrouwbaar: fout ? 'geen' : 'exact', fout };
}
