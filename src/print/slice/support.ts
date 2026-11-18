/**
 * Support from overhang detection (docs/34 2.5).
 *
 * Normal: the overhang of layer i is the part of it farther out than h / tan(threshold) from layer i-1. It is carried
 * down layer by layer until it stands on the bed or on the model, keeps an XY gap to the model and a Z gap of whole
 * layers below the overhang and above a model surface it stands on. The top layers of each column are interface.
 *
 * Tree: the overhang is sampled into points (2.5 mm); every point sinks a layer at a time and may move sideways by at
 * most h x tan(branch angle) towards the middle of its neighbours, away from the model; points that come close merge.
 * A branch ends on the bed or where it meets the model. Each layer the branches become circles that grow downwards.
 */
import { poly, RegionIndex, UNITS, type Paths } from '../geom/polygons';

export interface SupportInput {
  /** model region per layer (all parts), grid units */
  regions: Paths[];
  heights: number[];
  thresholdDeg: number;
  zGapLayers: number;
  xyGap: number;
  lineWidth: number;
  interfaceLayers: number;
}

export interface SupportLayers {
  /** sparse support area per layer */
  base: Paths[];
  /** dense interface area per layer (top layers under the model) */
  interface: Paths[];
}

const U = UNITS;

/** the overhang areas per layer (grid units): what layer i holds beyond the reach of layer i-1 */
export function overhangs(regions: Paths[], heights: number[], thresholdDeg: number, lineWidth: number): Paths[] {
  const out: Paths[] = regions.map(() => []);
  const t = Math.tan((Math.max(1, Math.min(89, thresholdDeg)) * Math.PI) / 180);
  for (let i = 1; i < regions.length; i++) {
    if (!regions[i].length) continue;
    const reach = (heights[i] * U) / t;
    const below = poly.offset(regions[i - 1], reach);
    // the part beyond the reach is only a sliver under a 20 to 28 degree slope (docs/35 P2-2): it marks where the slope
    // is too shallow, and the whole new area of the layer around it needs support, so the strips of the layers above
    // one another join into the area under the slope
    const beyond = poly.opening(poly.difference(regions[i], below), 0.005 * U);
    if (!beyond.length) continue;
    const added = poly.difference(regions[i], regions[i - 1]);
    out[i] = added.length ? poly.union(beyond, poly.intersection(added, poly.offset(beyond, reach + lineWidth))) : beyond;
  }
  return out;
}

export function normalSupport(inp: SupportInput): SupportLayers {
  const n = inp.regions.length;
  const ov = overhangs(inp.regions, inp.heights, inp.thresholdDeg, inp.lineWidth);
  const base: Paths[] = Array.from({ length: n }, () => []);
  const iface: Paths[] = Array.from({ length: n }, () => []);
  const grownModel = inp.regions.map((r) => (r.length ? poly.offset(r, inp.xyGap * U) : []));
  let carry: Paths = [];
  // the support under layer j starts zGap layers below the overhang
  for (let j = n - 1; j >= 0; j--) {
    const src = j + 1 + inp.zGapLayers < n ? ov[j + 1 + inp.zGapLayers] : [];
    let col = src.length ? poly.union(carry, src) : carry;
    if (!col.length) { carry = []; continue; }
    col = poly.difference(col, grownModel[j]);
    carry = col;
    // a Z gap above a model surface the column stands on
    let out = col;
    for (let k = 1; k <= inp.zGapLayers && j - k >= 0 && out.length; k++) out = poly.difference(out, inp.regions[j - k]);
    if (!out.length) continue;
    // interface: the part of this layer that is within interfaceLayers below the model
    let near: Paths = [];
    for (let k = 1; k <= inp.interfaceLayers + inp.zGapLayers && j + k < n; k++) if (inp.regions[j + k].length) near = near.length ? poly.union(near, inp.regions[j + k]) : inp.regions[j + k];
    const top = near.length ? poly.intersection(out, poly.offset(near, inp.lineWidth)) : [];
    // islands smaller than two line widths square are not worth a support line
    const keep = (a: Paths) => a.filter((p) => Math.abs(poly.area([p])) >= (2 * inp.lineWidth) ** 2 || poly.area([p]) < 0);
    iface[j] = keep(top);
    base[j] = keep(top.length ? poly.difference(out, top) : out);
  }
  return { base, interface: iface };
}

/** tree support: circles per layer (grid units), each a closed loop to print as a wall, plus the tips as interface */
export function treeSupport(inp: SupportInput, branchAngleDeg = 40, spacingMm = 2.5): SupportLayers {
  const n = inp.regions.length;
  const ov = overhangs(inp.regions, inp.heights, inp.thresholdDeg, inp.lineWidth);
  const base: Paths[] = Array.from({ length: n }, () => []);
  const iface: Paths[] = Array.from({ length: n }, () => []);
  const tipR = 0.6 * U, gap = inp.xyGap * U;
  interface Tip { x: number; y: number; r: number }
  let tips: Tip[] = [];
  const step = spacingMm * U;
  for (let j = n - 1; j >= 0; j--) {
    // new tips under the overhangs of the layer zGap above
    const src = j + 1 + inp.zGapLayers < n ? ov[j + 1 + inp.zGapLayers] : [];
    if (src.length) {
      const idx = new RegionIndex(src);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const p of src) for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); }
      let added = 0;
      for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) if (idx.contains(x, y)) { tips.push({ x, y, r: tipR }); added++; }
      // a small overhang between the grid points still gets one tip at its first vertex
      if (!added) for (const p of src) tips.push({ x: p[0], y: p[1], r: tipR });
    }
    if (!tips.length) continue;
    const model = inp.regions[j];
    const avoid = model.length ? new RegionIndex(poly.offset(model, gap + tipR)) : null;
    const move = (inp.heights[j] * U) * Math.tan((branchAngleDeg * Math.PI) / 180);
    // move towards the mean of the tips (they gather into trunks), not into the model
    const mx = tips.reduce((s, t) => s + t.x, 0) / tips.length, my = tips.reduce((s, t) => s + t.y, 0) / tips.length;
    const next: Tip[] = [];
    for (const t of tips) {
      const dx = mx - t.x, dy = my - t.y, L = Math.hypot(dx, dy);
      const k = L > move ? move / L : L > 0 ? 1 : 0;
      let x = t.x + dx * k, y = t.y + dy * k;
      if (avoid && avoid.contains(x, y)) { x = t.x; y = t.y; }
      // a branch ends where it meets the model (it stands on it)
      if (model.length && poly.contains(model, x, y)) continue;
      next.push({ x, y, r: Math.min(t.r + move * 0.25, 4 * U) });
    }
    // merge tips that touch
    const merged: Tip[] = [];
    for (const t of next) {
      const m = merged.find((o) => Math.hypot(o.x - t.x, o.y - t.y) < Math.max(o.r, t.r) * 0.6);
      if (m) { m.x = (m.x + t.x) / 2; m.y = (m.y + t.y) / 2; m.r = Math.min(Math.hypot(m.r, t.r), 5 * U); } else merged.push({ ...t });
    }
    tips = merged;
    const circles: Paths = tips.map((t) => {
      const p: number[] = [];
      const seg = Math.max(8, Math.min(32, Math.round(t.r / (0.25 * U))));
      for (let s = 0; s < seg; s++) p.push(Math.round(t.x + Math.cos((2 * Math.PI * s) / seg) * t.r), Math.round(t.y + Math.sin((2 * Math.PI * s) / seg) * t.r));
      return p;
    });
    let area = poly.union(circles);
    if (model.length) area = poly.difference(area, poly.offset(model, gap));
    if (src.length) iface[j] = poly.intersection(area, poly.offset(src, inp.lineWidth));
    base[j] = iface[j].length ? poly.difference(area, iface[j]) : area;
  }
  return { base, interface: iface };
}
