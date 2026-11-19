/**
 * A layer region (grid units, plate coordinates) to the pixel mask of the LCD, written straight into the run-length
 * code of a .goo layer: a scan line per pixel row with an active edge list, no full bitmap (docs/34 2.10: a 12K screen
 * has almost 60 million pixels per layer). Anti-aliasing: sub-rows per pixel row and the exact horizontal coverage of
 * each span; the grey value is the covered share (0..255).
 *
 * Image orientation: row 0 is the back (+Y) edge of the LCD (the top of the image), column 0 the left edge; no mirroring
 * (the X and Y mirror flags of the file are 0). To be checked on a printer: nog te printen.
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
  return [xmm / m.pitch[0], (m.size[1] - ymm) / m.pitch[1]];
}

export interface RasterResult { data: Uint8Array; /** exposed area in mm² (grey pixels by value) */ area: number; /** exposed pixels outside the LCD */ clipped: number }

export function rasterLayer(region: Paths, m: ResinMachine, aa: number = 1): RasterResult {
  const [W, H] = m.resolution;
  const edges: Edge[] = [];
  for (const p of region) {
    for (let i = 0; i < p.length; i += 2) {
      const j = (i + 2) % p.length;
      const [ax, ay] = toPixel(m, p[i] / UNITS, p[i + 1] / UNITS), [bx, by] = toPixel(m, p[j] / UNITS, p[j + 1] / UNITS);
      if (ay === by) continue;
      // image y grows downwards: an edge going up in the plate goes down in the image; the winding sign flips
      const up = by > ay;
      const [y0, y1, x0, x1] = up ? [ay, by, ax, bx] : [by, ay, bx, ax];
      edges.push({ y0, y1, x0, dxdy: (x1 - x0) / (y1 - y0), w: up ? -1 : 1 });
    }
  }
  edges.sort((a, b) => a.y0 - b.y0);
  const rle = new GooRle();
  const cov = aa > 1 ? new Float32Array(W) : null;
  let next = 0, active: Edge[] = [], exposed = 0, clipped = 0;
  const xs: { x: number; w: number }[] = [];
  const spans = (y: number, add: (a: number, b: number) => void) => {
    while (next < edges.length && edges[next].y0 <= y) active.push(edges[next++]);
    active = active.filter((e) => e.y1 > y);
    xs.length = 0;
    for (const e of active) if (e.y0 <= y) xs.push({ x: e.x0 + (y - e.y0) * e.dxdy, w: e.w });
    xs.sort((a, b) => a.x - b.x);
    // non-zero rule: the region is a union, holes run the other way round
    let wind = 0;
    for (let k = 0; k < xs.length; k++) {
      const before = wind;
      wind += xs[k].w;
      if (before === 0 && wind !== 0) {
        let e = k + 1, w2 = wind;
        while (e < xs.length) { w2 += xs[e].w; if (w2 === 0) break; e++; }
        if (e < xs.length) { add(xs[k].x, xs[e].x); wind = 0; k = e; }
      }
    }
  };
  for (let r = 0; r < H; r++) {
    if (!cov) {
      // one sample per pixel: a pixel is lit when its centre lies in a span
      let pos = 0;
      spans(r + 0.5, (a, b) => {
        const i0 = Math.max(pos, Math.ceil(a - 0.5)), i1 = Math.min(W, Math.ceil(b - 0.5));
        if (Math.ceil(a - 0.5) < 0 || Math.ceil(b - 0.5) > W) clipped++;
        if (i1 <= i0) return;
        rle.push(0, i0 - pos); rle.push(255, i1 - i0); exposed += i1 - i0; pos = i1;
      });
      rle.push(0, W - pos);
      continue;
    }
    // anti-aliasing: aa sub-rows, exact coverage of every span along the row
    let lo = W, hi = -1;
    for (let sub = 0; sub < aa; sub++) {
      spans(r + (sub + 0.5) / aa, (a, b) => {
        if (a < 0 || b > W) clipped++;
        const xa = Math.max(0, a), xb = Math.min(W, b);
        if (xb <= xa) return;
        const ia = Math.floor(xa), ib = Math.min(W - 1, Math.floor(xb));
        lo = Math.min(lo, ia); hi = Math.max(hi, ib);
        if (ia === ib) { cov[ia] += xb - xa; return; }
        cov[ia] += ia + 1 - xa;
        for (let i = ia + 1; i < ib; i++) cov[i] += 1;
        cov[ib] += xb - ib;
      });
    }
    if (hi < lo) { rle.push(0, W); continue; }
    rle.push(0, lo);
    let runV = -1, runN = 0, sum = 0;
    const k = 255 / aa;
    for (let i = lo; i <= hi; i++) {
      let g = Math.round(cov[i] * k);
      g = g < 0 ? 0 : g > 255 ? 255 : g;
      cov[i] = 0;
      sum += g;
      if (g === runV) { runN++; continue; }
      rle.push(runV, runN);
      runV = g; runN = 1;
    }
    rle.push(runV, runN);
    exposed += sum / 255;
    rle.push(0, W - hi - 1);
  }
  return { data: rle.finish(), area: exposed * m.pitch[0] * m.pitch[1], clipped };
}
