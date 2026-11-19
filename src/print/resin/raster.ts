/**
 * A layer region (grid units, plate coordinates) to the pixel mask of the LCD, written straight into the run-length
 * code of a .goo layer: a scan line per pixel row with an active edge list, no full bitmap (docs/34 2.10: a 12K screen
 * has almost 60 million pixels per layer). Anti-aliasing: the exact covered share of each pixel from the edges (an
 * accumulation buffer, only the cells an edge passes), in the grey levels of aa x aa super-sampling.
 *
 * Image orientation: row 0 is the back (+Y) edge of the LCD (the top of the image), column 0 the left edge; no mirroring
 * unless the database says so per printer (resin.mirror; the file's mirror flags follow). To be checked: nog te printen.
 */
import { UNITS, type Paths } from '../geom/polygons';
import type { ResinMachine } from './types';

/** the run-length writer of the GOO image data (spec V1.2: 0x55, chunks, 8-bit checksum) */
export class GooRle {
  private buf = new Uint8Array(4096);
  private n = 1;
  private val = -1;
  private len = 0;
  constructor() { this.buf[0] = 0x55; }
  private byte(b: number) {
    if (this.n >= this.buf.length) { const nb = new Uint8Array(this.buf.length * 2); nb.set(this.buf); this.buf = nb; }
    this.buf[this.n++] = b;
  }
  private chunk(v: number, L: number) {
    const type = v === 0 ? 0 : v === 255 ? 3 : 1;
    while (L > 0) {
      const l = Math.min(L, 0xfffffff);
      const size = l < 0x10 ? 0 : l < 0x1000 ? 1 : l < 0x100000 ? 2 : 3;
      this.byte((type << 6) | (size << 4) | (l & 0xf));
      if (type === 1) this.byte(v);
      if (size === 3) this.byte((l >> 20) & 0xff);
      if (size >= 2) this.byte((l >> 12) & 0xff);
      if (size >= 1) this.byte((l >> 4) & 0xff);
      L -= l;
    }
  }
  /** `count` pixels of grey value `v` */
  push(v: number, count: number) {
    if (count <= 0) return;
    if (v === this.val) { this.len += count; return; }
    if (this.len) this.chunk(this.val, this.len);
    this.val = v; this.len = count;
  }
  /** the encoded layer: 0x55, the chunks, the checksum (one's complement of the byte sum after 0x55; to verify) */
  finish(): Uint8Array {
    if (this.len) this.chunk(this.val, this.len);
    this.len = 0;
    let sum = 0;
    for (let i = 1; i < this.n; i++) sum = (sum + this.buf[i]) & 0xff;
    this.byte(~sum & 0xff);
    return this.buf.slice(0, this.n);
  }
}

interface Edge { y0: number; y1: number; x0: number; dxdy: number; w: number }

/**
 * The pixel position of a plate point (fractional pixels: x to the right, y down from the top row). The plate of the
 * 3D Print tab has its origin at the front left corner of the LCD for every printer; the .goo image covers the whole LCD,
 * so the "center" origin of the database only says where the printer's own coordinates start.
 */
export function toPixel(m: ResinMachine, xmm: number, ymm: number): [number, number] {
  // mirrored per printer (database resin.mirror, docs/35 R-2): X mirror = column 0 at the right, Y mirror = row 0 at the front
  return [(m.mirror[0] ? m.size[0] - xmm : xmm) / m.pitch[0], (m.mirror[1] ? ymm : m.size[1] - ymm) / m.pitch[1]];
}

export interface RasterResult { data: Uint8Array; /** exposed area in mm² (grey pixels by value) */ area: number; /** exposed pixels outside the LCD */ clipped: number }

/** the edges of a region in pixel coordinates, y0 < y1, sorted by y0; w: the winding (image y grows downwards) */
function pixelEdges(region: Paths, m: ResinMachine): { edges: Edge[]; outside: number } {
  const [W, H] = m.resolution;
  const edges: Edge[] = [];
  let outside = 0;
  for (const p of region) {
    for (let i = 0; i < p.length; i += 2) {
      const j = (i + 2) % p.length;
      const [ax, ay] = toPixel(m, p[i] / UNITS, p[i + 1] / UNITS), [bx, by] = toPixel(m, p[j] / UNITS, p[j + 1] / UNITS);
      if (ax < 0 || ax > W || ay < 0 || ay > H) outside++;
      if (ay === by) continue;
      // an edge going up in the plate goes down in the image; the winding sign flips
      const up = by > ay;
      const [y0, y1, x0, x1] = up ? [ay, by, ax, bx] : [by, ay, bx, ax];
      edges.push({ y0, y1, x0, dxdy: (x1 - x0) / (y1 - y0), w: up ? -1 : 1 });
    }
  }
  edges.sort((a, b) => a.y0 - b.y0);
  return { edges, outside };
}

/**
 * The mask of a layer. aa = 1: a pixel is lit when its centre lies inside. aa = 2, 4, 8 (anti-aliasing): the grey value
 * is the covered share of the pixel, computed exactly from the edges and given in the aa x aa levels of that
 * super-sampling (docs/35 R-3); `levels` overrides the number of levels (the tests use 255 for the exact share).
 */
export function rasterLayer(region: Paths, m: ResinMachine, aa: number = 1, levels?: number): RasterResult {
  if (aa > 1) return coverageLayer(region, m, levels ?? aa * aa);
  const [W, H] = m.resolution;
  const { edges } = pixelEdges(region, m);
  const rle = new GooRle();
  let next = 0, exposed = 0, clipped = 0;
  // the active edge table: edge numbers kept sorted by their crossing with the scan line; from one row to the next the
  // order hardly changes, so an insertion sort is close to linear. No allocation per row.
  const E = edges.length;
  const ey0 = new Float64Array(E), ey1 = new Float64Array(E), ex0 = new Float64Array(E), edx = new Float64Array(E), ew = new Int8Array(E);
  edges.forEach((e, i) => { ey0[i] = e.y0; ey1[i] = e.y1; ex0[i] = e.x0; edx[i] = e.dxdy; ew[i] = e.w; });
  const act = new Int32Array(E), cx = new Float64Array(E);
  let nAct = 0;
  for (let r = 0; r < H; r++) {
    const y = r + 0.5;
    while (next < E && ey0[next] <= y) act[nAct++] = next++;
    let n = 0;
    for (let k = 0; k < nAct; k++) { const e = act[k]; if (ey1[e] > y) act[n++] = e; }
    nAct = n;
    for (let k = 0; k < nAct; k++) { const e = act[k]; cx[k] = ex0[e] + (y - ey0[e]) * edx[e]; }
    for (let k = 1; k < nAct; k++) {
      const e = act[k], x = cx[k];
      let j = k - 1;
      while (j >= 0 && cx[j] > x) { act[j + 1] = act[j]; cx[j + 1] = cx[j]; j--; }
      act[j + 1] = e; cx[j + 1] = x;
    }
    // non-zero rule: the region is a union, holes run the other way round; a pixel is lit when its centre is in a span
    let wind = 0, start = 0, pos = 0;
    for (let k = 0; k < nAct; k++) {
      const before = wind;
      wind += ew[act[k]];
      if (before === 0 && wind !== 0) { start = cx[k]; continue; }
      if (before === 0 || wind !== 0) continue;
      const a = start, b = cx[k];
      if (Math.ceil(a - 0.5) < 0 || Math.ceil(b - 0.5) > W) clipped++;
      const i0 = Math.max(pos, Math.ceil(a - 0.5)), i1 = Math.min(W, Math.ceil(b - 0.5));
      if (i1 <= i0) continue;
      rle.push(0, i0 - pos); rle.push(255, i1 - i0); exposed += i1 - i0; pos = i1;
    }
    rle.push(0, W - pos);
  }
  return { data: rle.finish(), area: exposed * m.pitch[0] * m.pitch[1], clipped };
}

/**
 * Anti-aliasing by exact coverage (docs/35 R-3): every edge adds, per pixel row it crosses, its signed area to the few
 * cells it passes (the accumulation buffer of a scan-line font rasterizer); the running sum along the row is the
 * coverage. Only the touched cells are visited; between them the sum is constant and goes out as one run.
 */
function coverageLayer(region: Paths, m: ResinMachine, levels: number): RasterResult {
  const [W, H] = m.resolution;
  const { edges, outside } = pixelEdges(region, m);
  const rle = new GooRle();
  const E = edges.length;
  const acc = new Float64Array(W + 2), mark = new Uint8Array(W + 2);
  let touched = new Int32Array(Math.max(1024, 4 * W)), nT = 0;
  const add = (i: number, v: number) => {
    if (!mark[i]) { mark[i] = 1; if (nT >= touched.length) { const nb = new Int32Array(touched.length * 2); nb.set(touched); touched = nb; } touched[nT++] = i; }
    acc[i] += v;
  };
  const clampX = (x: number) => (x < 0 ? 0 : x > W ? W : x);
  const act: number[] = [];
  let next = 0, exposed = 0;
  const grey = (a: number) => { const c = a < 0 ? -a : a; return Math.round((Math.round((c > 1 ? 1 : c) * levels) * 255) / levels); };
  for (let r = 0; r < H; r++) {
    while (next < E && edges[next].y0 < r + 1) act.push(next++);
    let n = 0;
    for (let k = 0; k < act.length; k++) if (edges[act[k]].y1 > r) act[n++] = act[k];
    act.length = n;
    nT = 0;
    for (const ei of act) {
      const e = edges[ei];
      const ya = e.y0 > r ? e.y0 : r, yb = e.y1 < r + 1 ? e.y1 : r + 1;
      if (yb <= ya) continue;
      const d = (yb - ya) * e.w;
      const xa = clampX(e.x0 + (ya - e.y0) * e.dxdy), xb = clampX(e.x0 + (yb - e.y0) * e.dxdy);
      const x0 = xa < xb ? xa : xb, x1 = xa < xb ? xb : xa;
      const x0f = Math.floor(x0), x0i = x0f, x1i = Math.ceil(x1);
      if (x1i <= x0i + 1) {
        // within one cell: the part right of the mean x goes to the next cell
        const xm = 0.5 * (xa + xb) - x0f;
        add(x0i, d - d * xm);
        add(x0i + 1, d * xm);
        continue;
      }
      const s = 1 / (x1 - x0), f0 = x0 - x0f, a0 = 0.5 * s * (1 - f0) * (1 - f0), f1 = x1 - x1i + 1, am = 0.5 * s * f1 * f1;
      add(x0i, d * a0);
      if (x1i === x0i + 2) add(x0i + 1, d * (1 - a0 - am));
      else {
        const a1 = s * (1.5 - f0);
        add(x0i + 1, d * (a1 - a0));
        for (let xi = x0i + 2; xi < x1i - 1; xi++) add(xi, d * s);
        const a2 = a1 + (x1i - x0i - 3) * s;
        add(x1i - 1, d * (1 - a2 - am));
      }
      add(x1i, d * am);
    }
    if (!nT) { rle.push(0, W); continue; }
    const ts = touched.subarray(0, nT).sort();
    let p = 0, sum = 0;
    for (let t = 0; t < nT; t++) {
      const k = ts[t];
      if (k >= W) { acc[k] = 0; mark[k] = 0; continue; }
      if (k > p) { const g = grey(sum); rle.push(g, k - p); exposed += (g * (k - p)) / 255; }
      sum += acc[k];
      const g = grey(sum);
      rle.push(g, 1); exposed += g / 255;
      acc[k] = 0; mark[k] = 0; p = k + 1;
    }
    if (p < W) { const g = grey(sum); rle.push(g, W - p); exposed += (g * (W - p)) / 255; }
  }
  return { data: rle.finish(), area: exposed * m.pitch[0] * m.pitch[1], clipped: outside };
}
