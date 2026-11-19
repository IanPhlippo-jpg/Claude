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
import { arcPoints, circle3, fitArcs, loopAreaB, loopLen, segLength, segSweep } from './loops';
export { arcPoints, circle3, fitArcs, loopAreaB, loopLen, segLength, segSweep };
import { flatByUnfolding } from './flatMesh';
import { sheetMapping } from '../core/features/unfold';
import { sketchChains } from '../core/features/thin';
import { resolvePlaneDef } from '../core/features/planes';

/** a loop segment from `a` to the next segment's `a`; bulge = tan(sweep / 4), > 0 counter-clockwise */
export type { Seg, Loop } from './loops';
import type { Loop } from './loops';
/** a bend line of a flat: its number along the base flange chain, angle, inner radius, direction seen from the top of the flat */
export interface Bend { a: P2; b: P2; hoek: number; r: number; richting: 'op' | 'neer'; k: number; id?: number }

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
  /** every body of this position (identical plates are one position) */
  keys?: string[];
  /** the model names no material: priced as S235, said on the cost line (docs/37 B-9) */
  materiaalAanname?: boolean;
  /** which K-factor the flat used (sheet metal) */
  kBron?: string;
}

// ---- loops with arcs: in loops.ts (no CAD core, so the nest worker stays small)

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
  // arcs where the model has them; a coarse polygon the model draws on purpose (8 chords for R34, docs/37 N-14) stays a
  // polygon: when the fitted loop lies on average more than 0.05 mm from the polygon (area difference / perimeter),
  // the polygon is what is cut. A tessellated circle of a CAD lies far closer (Ø30 in 64 chords: 0.012 mm)
  const fit = (p0: P2[]): ReturnType<typeof fitArcs> => {
    const p = p0.map(place), f = fitArcs(p);
    const polyA = Math.abs(area(p)), fitA = 'circle' in f ? Math.PI * f.circle.r ** 2 : Math.abs(loopAreaB(f.loop));
    const perim = p.reduce((t, q, i) => t + Math.hypot(p[(i + 1) % p.length].x - q.x, p[(i + 1) % p.length].y - q.y), 0);
    if (Math.abs(fitA - polyA) / Math.max(perim, 1e-9) <= 0.05) return f;
    return { loop: p.map((a) => ({ a, bulge: 0 })) };
  };
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
  if (b.warning) return { ...empty, betrouwbaar: 'geen', fout: `geen uitslag: ${b.warning}` };
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
  const kType = sm.allowanceType ?? 'kFactor';
  const k = kBron === 'din6935' && kType === 'kFactor' ? din6935K(sm.bendRadius, sm.thickness) : sm.kFactor;
  // the label says what the flat was made with (docs/37 B-11): DIN 6935, the K of the model, or its allowance / deduction
  const label = kType !== 'kFactor' ? `model, ${kType === 'bendDeduction' ? 'buigaftrek' : kType === 'bendAllowance' ? 'buigtoeslag' : 'buigtabel'} ${sm.allowanceValue ?? ''}`.trim()
    : kBron === 'din6935' ? `DIN 6935, K = ${k.toFixed(3)}` : `model, K = ${k.toFixed(3)}`;
  // W4: the core unfolds cuts and holes only when every bend comes from the base flange (sheetMetalBuild.ts bentOnly);
  // these features switch that off and the flat falls back to the developed sketch chain without the cut-outs
  // a part whose rebuild failed has no geometry that is the model: no flat at all (docs/37 N-11)
  if (folded.warning) {
    return { key: folded.key, naam, n, materiaal, t: sm.thickness, dichtheid: folded.dichtheid, buiten: [], binnen: [], gaten: [], plooien: [], bbox: { l: 0, b: 0, draai: 0 },
      oppervlak: 0, snijlengte: { buiten: 0, binnen: 0 }, insteken: 0, kg: 0, kBron: label, betrouwbaar: 'geen', fout: `geen uitslag: ${folded.warning}` };
  }
  const notFromBase = doc.features.filter((f) => !f.suppressed && NOT_FROM_BASE.has(f.type));
  // those parts go through the general unfolder of the mesh (docs/37 ch. 9, P1.4); it works with a K-factor
  if (notFromBase.length) {
    // K per bend: DIN 6935 for the radius measured on that bend, or the K of the model
    const din = kBron === 'din6935' || kType !== 'kFactor';
    const kU = din ? (rIn: number) => din6935K(rIn, sm.thickness) : sm.kFactor;
    return flatByUnfolding(folded, naam, n, materiaal, sm.thickness, sm.bendRadius, kU, din ? 'DIN 6935 per plooi' : label);
  }
  const has = doc.features.some((f) => f.type === 'flatPattern');
  const features: Feature[] = has ? doc.features.map((f) => (f.type === 'flatPattern' ? { ...f, suppressed: false } : f)) : [...doc.features, { id: 'fab-flat', type: 'flatPattern',
    name: 'Flat-Pattern', suppressed: false } as Feature];
  const flatDoc: Document = { ...doc, sheetMetal: { ...sm, kFactor: k }, features };
  const r = rebuildDocument(flatDoc);
  const base = { key: folded.key, naam, n, materiaal, t: sm.thickness, dichtheid: folded.dichtheid, buiten: [], binnen: [], gaten: [], plooien: [], bbox: { l: 0, b: 0, draai: 0 }, oppervlak: 0,
    snijlengte: { buiten: 0, binnen: 0 }, insteken: 0, kg: 0, kBron: label };
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
  // bend lines (Flat-Pattern ▸ Bend-Lines) in the frame of the outline, each with its number, angle and direction from
  // the base flange chain (docs/37 B-2, B-3): ONE source for the DXF layers, the nest, the bend table and the bend sheet
  const pl = plateAnalysis(fb);
  const plooien: Bend[] = [];
  if ('t' in pl && !fout) {
    const o = plateOutline(fb.soup, pl.n, pl.hi, pl.t);
    if (!('fout' in o)) {
      const cs = Math.cos(o.rot), sn = Math.sin(o.rot);
      const to2 = (p: { x: number; y: number; z: number }): P2 => { const x = p.x * o.u[0] + p.y * o.u[1] + p.z * o.u[2],
        y = p.x * o.v[0] + p.y * o.v[1] + p.z * o.v[2]; return { x: x * cs - y * sn - o.origin.x, y: x * sn + y * cs - o.origin.y }; };
      const chainInfo = baseChain(doc);
      const map = chainInfo ? sheetMapping(chainInfo.chain, chainInfo.plane, { ...sm, kFactor: k }, chainInfo.reverse) : null;
      const turns = chainInfo ? chainTurns(chainInfo.chain) : [];
      // "up" is toward the viewer of the flat (the DXF looks from +n): the side the first segment's left normal points to
      let up = 1;
      if (chainInfo) {
        const [p0, p1] = chainInfo.chain, L = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1;
        const nl = { x: -(p1.y - p0.y) / L, y: (p1.x - p0.x) / L }, P = chainInfo.plane;
        const w = [0, 1, 2].map((i) => P.u[i] * nl.x + P.v[i] * nl.y);
        up = w[0] * pl.n[0] + w[1] * pl.n[1] + w[2] * pl.n[2] >= 0 ? 1 : -1;
      }
      const mids = map ? map.bends.map(([b0, b1]) => to2(map.flatAt((b0 + b1) / 2, sm.thickness / 2, 0))) : [];
      for (const c of r.curves ?? []) {
        if (c.name !== 'Bend-Lines' || c.points.length < 2) continue;
        const a = to2(c.points[0]), b = to2(c.points[c.points.length - 1]);
        const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const off = (m: P2) => Math.abs(((m.x - a.x) * (b.y - a.y) - (m.y - a.y) * (b.x - a.x)) / L);
        const i = mids.length ? mids.reduce((best, m, j) => (off(m) < off(mids[best]) ? j : best), 0) : -1;
        const turn = i >= 0 ? turns[i] ?? 0 : Math.PI / 2;
        plooien.push({ a, b, hoek: Math.round((Math.abs(turn) * 1800) / Math.PI) / 10, r: sm.bendRadius, richting: Math.sign(turn) * up > 0 ? 'op' : 'neer', k, ...(i >= 0 ? { id: i + 1 } : {}) });
      }
      plooien.sort((x, y) => (x.id ?? 0) - (y.id ?? 0));
    }
  }
  return { ...flat, kBron: base.kBron, plooien, betrouwbaar: fout ? 'geen' : 'exact', fout };
}

/** the open sketch chain of the base flange (its connected points, not the drawing order), plane and material side */
export function baseChain(doc: Document): { chain: P2[]; plane: ReturnType<typeof resolvePlaneDef>; reverse: boolean } | null {
  const bf = doc.features.find((f) => f.type === 'baseFlange' && !f.suppressed) as { sketchId?: string; reverse?: boolean } | undefined;
  const sk = bf?.sketchId ? doc.sketches[bf.sketchId] : undefined;
  if (!sk) return null;
  const open = sketchChains(sk).find((c) => !c.closed && c.points.length >= 2);
  return open ? { chain: open.points, plane: resolvePlaneDef(doc, sk.plane), reverse: !!bf!.reverse } : null;
}

/** the signed turn at each inner corner of a chain (radians, > 0 to the left) */
export function chainTurns(chain: P2[]): number[] {
  const seg = chain.slice(1).map((p, i) => ({ dx: p.x - chain[i].x, dy: p.y - chain[i].y }));
  return seg.slice(1).map((d, i) => Math.atan2(seg[i].dx * d.dy - seg[i].dy * d.dx, seg[i].dx * d.dx + seg[i].dy * d.dy));
}
