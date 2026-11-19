/**
 * Layer analysis for resin printing, on the regions of the layers (grid units):
 *   - islands: a piece of a layer that rests on nothing in the layer below; it cures against the film and is torn off
 *   - suction cups: an empty space closed in XY and closed towards the plate; it holds a vacuum against the film
 *     when the plate lifts
 *   - cavities: such a space also closed above; it traps uncured resin (hollow parts need a drain hole)
 *   - hollowing: an inner region of each layer, `wall` from the surface in XY and in Z
 */
import { area as pathArea } from '../geom/boolean';
import { poly, UNITS, type Path, type Paths } from '../geom/polygons';
import type { ResinIssue } from './types';

interface Box { x0: number; y0: number; x1: number; y1: number }
const boxOf = (p: Path): Box => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); }
  return { x0, y0, x1, y1 };
};
const hit = (a: Box, b: Box) => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
/**
 * A point inside a loop (mm): the middle of its box when that lies inside, else the middle of the widest span of the
 * loop on the line through the middle of its box (a crescent or a ring has no material in its middle).
 */
export function insidePoint(p: Path): [number, number] {
  const b = boxOf(p), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2 + 0.5;
  if (poly.contains([p], cx, cy)) return [cx / UNITS, cy / UNITS];
  const xs: number[] = [];
  for (let i = 0; i < p.length; i += 2) {
    const j = (i + 2) % p.length, y0 = p[i + 1], y1 = p[j + 1];
    if ((y0 <= cy) !== (y1 <= cy)) xs.push(p[i] + ((cy - y0) / (y1 - y0)) * (p[j] - p[i]));
  }
  xs.sort((a, c) => a - c);
  let best = cx, w = -1;
  for (let k = 0; k + 1 < xs.length; k += 2) if (xs[k + 1] - xs[k] > w) { w = xs[k + 1] - xs[k]; best = (xs[k] + xs[k + 1]) / 2; }
  return [best / UNITS, cy / UNITS];
}
const reversed = (p: Path): Path => { const o: number[] = []; for (let i = p.length - 2; i >= 0; i -= 2) o.push(p[i], p[i + 1]); return o; };
/** the least overlap that counts as resting on the layer below: 0.01 mm² */
const MIN_OVERLAP = 0.01 * UNITS * UNITS;

/**
 * Islands: the outer loops of layer i (with the holes inside them) that do not overlap layer i - 1. Layer `first` rests
 * on the plate. Returns per island its layer, its centre and its area (mm²).
 */
export function findIslands(layers: Paths[], zOf: (i: number) => number, first = 0): ResinIssue[] {
  const out: ResinIssue[] = [];
  for (let i = first + 1; i < layers.length; i++) {
    const below = layers[i - 1];
    const outers = layers[i].filter((p) => pathArea(p) > 0);
    if (!outers.length) continue;
    const bb = below.map(boxOf);
    for (const o of outers) {
      const b = boxOf(o);
      const near = below.filter((_, k) => hit(b, bb[k]));
      // fast path: the middle of the loop lies inside it and on material below
      const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
      const quick = near.length && poly.contains([o], cx, cy) && poly.contains(near, cx, cy);
      const rests = quick || (near.length && Math.abs(poly.area(poly.intersection([o], poly.union(near)))) >= MIN_OVERLAP);
      if (rests) continue;
      const [x, y] = insidePoint(o);
      const a = pathArea(o) / UNITS / UNITS;
      out.push({ kind: 'island', z: zOf(i), x, y, area: a, text: `Island at Z ${zOf(i).toFixed(2)} mm (${x.toFixed(1)}, ${y.toFixed(1)}), ${a.toFixed(2)} mm²: it rests on nothing below.` });
    }
  }
  return out;
}

/**
 * Suction cups and cavities: the holes of every layer, joined into spaces where they overlap from layer to layer. A
 * space whose lowest hole is covered by material below (or lies on the plate) is closed towards the plate; one whose
 * highest hole is covered above as well is a closed cavity.
 */
export function findCups(layers: Paths[], zOf: (i: number) => number, first = 0): ResinIssue[] {
  interface Hole { layer: number; path: Path; box: Box; id: number }
  const holes: Hole[][] = layers.map((ps, i) => ps.filter((p) => pathArea(p) < 0).map((p) => ({ layer: i, path: reversed(p), box: boxOf(p), id: -1 })));
  const parent: number[] = [];
  const find = (a: number): number => (parent[a] === a ? a : (parent[a] = find(parent[a])));
  const all: Hole[] = [];
  for (const hs of holes) for (const h of hs) { h.id = all.length; parent.push(h.id); all.push(h); }
  const overlap = (a: Hole, b: Hole) => hit(a.box, b.box) && Math.abs(poly.area(poly.intersection([a.path], [b.path]))) >= MIN_OVERLAP;
  for (let i = 1; i < holes.length; i++) for (const h of holes[i]) for (const g of holes[i - 1]) if (overlap(h, g)) parent[find(h.id)] = find(g.id);
  const spaces = new Map<number, Hole[]>();
  for (const h of all) { const r = find(h.id); const l = spaces.get(r); if (l) l.push(h); else spaces.set(r, [h]); }
  // a hole is closed on a side when the layer there covers it (all but 1 % of it is material), or it is the plate
  const covered = (h: Hole, k: number) => {
    if (k < first) return true;
    if (k >= layers.length) return false;
    const a = Math.abs(pathArea(h.path));
    return Math.abs(poly.area(poly.difference([h.path], layers[k]))) <= a * 0.01;
  };
  const out: ResinIssue[] = [];
  for (const hs of spaces.values()) {
    const lo = Math.min(...hs.map((h) => h.layer)), hi = Math.max(...hs.map((h) => h.layer));
    const bottom = hs.filter((h) => h.layer === lo), top = hs.filter((h) => h.layer === hi);
    // open towards the plate where a lowest hole is not covered below: resin flows in, no vacuum
    if (!bottom.every((h) => covered(h, lo - 1))) continue;
    const closedTop = top.every((h) => covered(h, hi + 1));
    const big = hs.reduce((m, h) => (Math.abs(pathArea(h.path)) > Math.abs(pathArea(m.path)) ? h : m), hs[0]);
    const [x, y] = insidePoint(big.path);
    const a = Math.abs(pathArea(big.path)) / UNITS / UNITS;
    if (a < 0.05) continue;
    const z0 = zOf(lo), z1 = zOf(hi);
    const where = `from Z ${z0.toFixed(2)} to ${z1.toFixed(2)} mm at (${x.toFixed(1)}, ${y.toFixed(1)})`;
    out.push(closedTop
      ? { kind: 'cavity', z: z0, x, y, area: a, text: `Closed cavity ${where}: it traps resin; add a drain hole.` }
      : { kind: 'suction', z: z0, x, y, area: a, text: `Suction cup ${where}, ${a.toFixed(1)} mm²: open towards the film, closed towards the plate.` });
  }
  return out;
}

/**
 * Hollowing: the inner region of layer i is the intersection of the layers i - k .. i + k shrunk by the wall
 * (k = wall / layer height), so the wall is as thick at the top and the bottom as at the sides. The window
 * intersection uses prefix and suffix intersections per block (three intersections per layer, not 2k + 1).
 */
export function hollowLayers(layers: Paths[], wall: number, layerHeight: number): Paths[] {
  const n = layers.length, k = Math.max(1, Math.ceil(wall / layerHeight - 1e-9)), w = 2 * k + 1;
  const eroded = layers.map((l) => (l.length ? poly.offset(l, -wall * UNITS) : []));
  const inter = (a: Paths, b: Paths) => (!a.length || !b.length ? [] : poly.intersection(a, b));
  const get = (i: number) => (i < 0 || i >= n ? [] : eroded[i]);
  // prefix intersections from the start of each block, suffix intersections to its end
  const pre: Paths[] = new Array(n + 2 * k), suf: Paths[] = new Array(n + 2 * k);
  const N = n + 2 * k;
  for (let i = 0; i < N; i++) pre[i] = i % w === 0 ? get(i - k) : inter(pre[i - 1], get(i - k));
  for (let i = N - 1; i >= 0; i--) suf[i] = i % w === w - 1 || i === N - 1 ? get(i - k) : inter(suf[i + 1], get(i - k));
  return layers.map((l, i) => {
    // window i - k .. i + k is the index range i .. i + 2k of the shifted arrays
    const a = i, b = i + 2 * k;
    const cavity = a % w === 0 ? pre[b] : inter(suf[a], pre[b]);
    return cavity.length ? poly.difference(l, cavity) : l;
  });
}

/** a disc as a path (grid units), counter-clockwise */
export function disc(x: number, y: number, r: number, n = 24): Path {
  const p: number[] = [];
  for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n; p.push(Math.round((x + r * Math.cos(a)) * UNITS), Math.round((y + r * Math.sin(a)) * UNITS)); }
  return p;
}

/**
 * Drain holes: each disc is cut through the layers from the bottom of the part up to the first layer where the
 * cavity is under it (one layer more, so the hole opens into it).
 */
export function drillDrains(solid: Paths[], hollow: Paths[], holes: { x: number; y: number; r: number }[]): Paths[] {
  const out = hollow.slice();
  for (const h of holes) {
    const d = [disc(h.x, h.y, h.r)];
    for (let i = 0; i < out.length; i++) {
      if (!solid[i].length) continue;
      // the cavity of this layer under the hole: material of the solid layer that the hollow layer lacks
      const cavity = poly.difference(poly.intersection(solid[i], d), out[i]);
      out[i] = poly.difference(out[i], d);
      if (Math.abs(poly.area(cavity)) > 0) break;
    }
  }
  return out;
}
